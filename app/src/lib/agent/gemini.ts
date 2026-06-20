import { AGENT_CONFIG } from "@/lib/agent/config";
import { getServerEnv } from "@/lib/server-env";
import {
  recordGeminiRateLimit,
  recordGeminiTokenUsage,
  waitForGeminiTokenBudget,
} from "@/lib/agent/gemini-rate-budget";
import type {
  AgentChatMessage,
  AgentJsonCompletionConfig,
  AgentJsonCompletionResult,
  AgentUsageStats,
} from "@/lib/agent/provider-types";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

let geminiKeyCursor = 0;

export async function runGeminiJsonCompletion<T>(
  config: AgentJsonCompletionConfig<T>,
): Promise<AgentJsonCompletionResult<T>> {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY or GEMINI_API_KEYS is not configured on the server.");
  }

  const model = config.model || getServerEnv("GEMINI_MODEL") || AGENT_CONFIG.gemini.defaultModel;
  const requestBody = JSON.stringify(buildGeminiRequestBody(config, "current"));
  const fallbackRequestBody = JSON.stringify(buildGeminiRequestBody(config, "legacy"));
  const maxAttempts = Math.max(1, AGENT_CONFIG.gemini.maxAttemptsPerRequest);
  const attemptErrors: string[] = [];
  let useLegacyFormat = false;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const activeBody = useLegacyFormat ? fallbackRequestBody : requestBody;
    const estimatedTokens = await waitForGeminiTokenBudget(activeBody);
    const orderedKeys = rotateGeminiKeys(apiKeys);
    let retryDelayMs = 0;

    for (const apiKey of orderedKeys) {
      const response = await fetch(`${AGENT_CONFIG.gemini.baseUrl}/models/${model}:generateContent`, {
        signal: AbortSignal.timeout(getGeminiRequestTimeoutMs()),
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: activeBody,
      }).catch((error) => {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Gemini completion request timed out or failed for ${config.schemaName} with model ${model}: ${reason}`,
        );
      });

      if (response.ok) {
        const payload = (await response.json()) as GeminiGenerateContentResponse;
        const content = readGeminiText(payload);
        const parsed = parseGeminiJsonContent(content) as unknown;

        if (!config.validate(parsed)) {
          throw new Error(`Gemini completion response did not match the expected ${config.schemaName} schema.`);
        }

        const usage = mapGeminiUsage(payload.usageMetadata);
        recordGeminiTokenUsage(usage?.total_tokens, estimatedTokens);

        return {
          provider: "gemini",
          model,
          result: parsed,
          usage,
        };
      }

      const errorBody = await response.text();
      const compactError = `[${config.schemaName}] HTTP ${response.status}: ${truncateError(errorBody)}`;
      attemptErrors.push(compactError);

      if (response.status === 400 && !useLegacyFormat && looksLikeResponseFormatError(errorBody)) {
        useLegacyFormat = true;
        continue;
      }

      if (response.status === 429) {
        retryDelayMs = Math.max(retryDelayMs, getRetryDelayMs(response.headers.get("retry-after"), errorBody));
        recordGeminiRateLimit(retryDelayMs);
        continue;
      }

      throw new Error(`Gemini completion failed with ${compactError}`);
    }

    if (retryDelayMs > 0 && attempt < maxAttempts - 1) {
      await sleep(retryDelayMs);
    }
  }

  throw new Error(`Gemini completion failed after retries: ${truncateError(attemptErrors.join(" | "))}`);
}

function buildGeminiRequestBody<T>(
  config: AgentJsonCompletionConfig<T>,
  schemaFormat: "current" | "legacy",
) {
  const { systemText, userText } = splitMessages(config.messages);
  const parts = [
    ...(config.attachments?.map((attachment) => ({
      inline_data: {
        mime_type: attachment.mimeType,
        data: attachment.dataBase64,
      },
    })) ?? []),
    { text: userText },
  ];

  return {
    systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig:
      schemaFormat === "current"
        ? {
            temperature: AGENT_CONFIG.gemini.defaultTemperature,
            responseFormat: {
              text: {
                mimeType: "application/json",
                schema: normalizeSchemaForGemini(config.schema),
              },
            },
          }
        : {
            temperature: AGENT_CONFIG.gemini.defaultTemperature,
            responseMimeType: "application/json",
            responseSchema: normalizeSchemaForGemini(config.schema),
          },
  };
}

function splitMessages(messages: AgentChatMessage[]): { systemText: string; userText: string } {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");

  return { systemText, userText };
}

function normalizeSchemaForGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => normalizeSchemaForGemini(item));
  }

  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const source = schema as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (key === "$schema" || key === "additionalProperties" || key === "minLength") {
      continue;
    }

    if (key === "const") {
      normalized.enum = [value];
      continue;
    }

    if (key === "type" && Array.isArray(value)) {
      const types = value.filter((item): item is string => typeof item === "string");
      const nullable = types.includes("null");
      const nonNullTypes = types.filter((item) => item !== "null");

      if (nullable) {
        normalized.nullable = true;
      }

      if (nonNullTypes.length === 1) {
        normalized.type = nonNullTypes[0];
      } else if (nonNullTypes.includes("string")) {
        normalized.type = "string";
      } else if (nonNullTypes.length > 0) {
        normalized.type = nonNullTypes[0];
      }

      continue;
    }

    normalized[key] = normalizeSchemaForGemini(value);
  }

  return normalized;
}

function readGeminiText(payload: GeminiGenerateContentResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text).filter((value): value is string => Boolean(value)).join("");

  if (!text) {
    throw new Error("Gemini completion response did not include text content.");
  }

  return text;
}

function parseGeminiJsonContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const fencedMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch) {
      return JSON.parse(fencedMatch[1]);
    }

    const objectStart = content.indexOf("{");
    const objectEnd = content.lastIndexOf("}");

    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(content.slice(objectStart, objectEnd + 1));
    }

    throw new Error("Gemini completion response did not contain valid JSON content.");
  }
}

function mapGeminiUsage(usage: GeminiGenerateContentResponse["usageMetadata"]): AgentUsageStats | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    prompt_tokens: usage.promptTokenCount,
    completion_tokens: usage.candidatesTokenCount,
    total_tokens: usage.totalTokenCount,
  };
}

function getGeminiApiKeys(): string[] {
  const singleKey = getServerEnv("GEMINI_API_KEY") || getServerEnv("GOOGLE_API_KEY");
  const pooledKeys = getServerEnv("GEMINI_API_KEYS");

  return [singleKey, pooledKeys]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/[\n,]+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function getGeminiRequestTimeoutMs(): number {
  const raw = getServerEnv("GEMINI_REQUEST_TIMEOUT_MS");
  const parsed = raw ? Number(raw) : NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : AGENT_CONFIG.gemini.requestTimeoutMs;
}

function rotateGeminiKeys(keys: string[]): string[] {
  if (keys.length <= 1) {
    return keys;
  }

  const startIndex = geminiKeyCursor % keys.length;
  geminiKeyCursor = (geminiKeyCursor + 1) % keys.length;

  return [...keys.slice(startIndex), ...keys.slice(0, startIndex)];
}

function getRetryDelayMs(retryAfterHeader: string | null, errorBody: string): number {
  const fromHeader = parseRetryAfterHeader(retryAfterHeader);
  const fromBody = parseRetryAfterBody(errorBody);
  const delay = Math.max(fromHeader, fromBody, 0);

  return Math.min(delay, AGENT_CONFIG.gemini.maxRetryAfterMs);
}

function parseRetryAfterHeader(value: string | null): number {
  if (!value) {
    return 0;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }

  const dateMs = Date.parse(value);

  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return 0;
}

function parseRetryAfterBody(value: string): number {
  const match = value.match(/(?:retry|try again) in ([0-9]+(?:\.[0-9]+)?)s/i);

  if (!match) {
    return 0;
  }

  return Math.ceil(Number(match[1]) * 1000);
}

function looksLikeResponseFormatError(value: string): boolean {
  return /responseFormat|responseMimeType|responseSchema|generationConfig|unknown field/i.test(value);
}

function truncateError(value: string): string {
  return value.length > 280 ? `${value.slice(0, 277)}...` : value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
