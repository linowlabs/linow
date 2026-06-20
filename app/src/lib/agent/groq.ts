import { AGENT_CONFIG } from "@/lib/agent/config";
import { getServerEnv } from "@/lib/server-env";
import {
  recordGroqRateLimit,
  recordGroqTokenUsage,
  waitForGroqTokenBudget,
} from "@/lib/agent/groq-rate-budget";
import type {
  AgentJsonCompletionConfig,
  AgentJsonCompletionResult,
} from "@/lib/agent/provider-types";
import {
  buildClassificationMessages,
  groqClassificationSchema,
  isAgentClassificationResult,
  normalizeClassificationResult,
  type ClassifyDocumentInput,
} from "@/lib/agent/classify";
import type { EvidenceClassificationOutput } from "@/lib/agent/schemas";

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

let groqKeyCursor = 0;

export async function classifyDocumentWithGroq(input: ClassifyDocumentInput): Promise<{
  provider: "groq";
  model: string;
  result: EvidenceClassificationOutput;
  usage?: GroqChatCompletionResponse["usage"];
}> {
  const completion = await runGroqJsonCompletion({
    schemaName: AGENT_CONFIG.schemaNames.classification,
    schema: groqClassificationSchema,
    messages: buildClassificationMessages(input),
    validate: isAgentClassificationResult,
  });

  return {
    provider: "groq",
    model: completion.model,
    result: normalizeClassificationResult(input, completion.result),
    usage: completion.usage,
  };
}

export async function runGroqJsonCompletion<T>(
  config: AgentJsonCompletionConfig<T>,
): Promise<AgentJsonCompletionResult<T>> {
  const apiKeys = getGroqApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("GROQ_API_KEY or GROQ_API_KEYS is not configured on the server.");
  }

  if (config.attachments && config.attachments.length > 0) {
    throw new Error("Groq provider does not support inline evidence attachments in this agent path.");
  }

  const model = config.model || getServerEnv("GROQ_MODEL") || AGENT_CONFIG.groq.defaultModel;
  const responseMode = config.responseMode ?? "json_schema";
  const requestBody = JSON.stringify({
    model,
    temperature: AGENT_CONFIG.groq.defaultTemperature,
    messages: config.messages,
    response_format:
      responseMode === "json_schema"
        ? {
            type: "json_schema",
            json_schema: {
              name: config.schemaName,
              strict: true,
              schema: config.schema,
            },
          }
        : {
            type: "json_object",
          },
  });
  const maxAttempts = Math.max(1, AGENT_CONFIG.groq.maxAttemptsPerRequest);
  const attemptErrors: string[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const estimatedTokens = await waitForGroqTokenBudget(requestBody);
    const orderedKeys = rotateGroqKeys(apiKeys);
    let retryDelayMs = 0;

    for (const apiKey of orderedKeys) {
      const response = await fetch(`${AGENT_CONFIG.groq.baseUrl}/chat/completions`, {
        signal: AbortSignal.timeout(AGENT_CONFIG.groq.requestTimeoutMs),
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: requestBody,
      });

      if (response.ok) {
        const payload = (await response.json()) as GroqChatCompletionResponse;
        const content = payload.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("Groq completion response did not include message content.");
        }

        const parsed = parseGroqJsonContent(content) as unknown;

        if (!config.validate(parsed)) {
          throw new Error(`Groq completion response did not match the expected ${config.schemaName} schema.`);
        }

        recordGroqTokenUsage(payload.usage?.total_tokens, estimatedTokens);

        return {
          provider: "groq",
          model,
          result: parsed,
          usage: payload.usage,
        };
      }

      const errorBody = await response.text();
      const compactError = `[${config.schemaName}] HTTP ${response.status}: ${truncateError(errorBody)}`;
      attemptErrors.push(compactError);

      if (response.status === 429) {
        retryDelayMs = Math.max(retryDelayMs, getRetryDelayMs(response.headers.get("retry-after"), errorBody));
        recordGroqRateLimit(retryDelayMs);
        continue;
      }

      throw new Error(`Groq completion failed with ${compactError}`);
    }

    if (retryDelayMs > 0 && attempt < maxAttempts - 1) {
      await sleep(retryDelayMs);
    }
  }

  throw new Error(`Groq completion failed after retries: ${truncateError(attemptErrors.join(" | "))}`);
}

function truncateError(value: string): string {
  return value.length > 280 ? `${value.slice(0, 277)}...` : value;
}

function getGroqApiKeys(): string[] {
  const singleKey = getServerEnv("GROQ_API_KEY");
  const pooledKeys = getServerEnv("GROQ_API_KEYS");

  return [singleKey, pooledKeys]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/[\n,]+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function rotateGroqKeys(keys: string[]): string[] {
  if (keys.length <= 1) {
    return keys;
  }

  const startIndex = groqKeyCursor % keys.length;
  groqKeyCursor = (groqKeyCursor + 1) % keys.length;

  return [...keys.slice(startIndex), ...keys.slice(0, startIndex)];
}

function getRetryDelayMs(retryAfterHeader: string | null, errorBody: string): number {
  const fromHeader = parseRetryAfterHeader(retryAfterHeader);
  const fromBody = parseRetryAfterBody(errorBody);
  const delay = Math.max(fromHeader, fromBody, 0);

  return Math.min(delay, AGENT_CONFIG.groq.maxRetryAfterMs);
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
  const match = value.match(/try again in ([0-9]+(?:\.[0-9]+)?)s/i);

  if (!match) {
    return 0;
  }

  return Math.ceil(Number(match[1]) * 1000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGroqJsonContent(content: string): unknown {
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

    throw new Error("Groq completion response did not contain valid JSON content.");
  }
}
