import { AGENT_CONFIG } from "@/lib/agent/config";
import { getServerEnv } from "@/lib/server-env";
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

interface GroqJsonCompletionConfig<T> {
  model?: string;
  schemaName: string;
  schema: unknown;
  messages: Array<{ role: "system" | "user"; content: string }>;
  validate: (value: unknown) => value is T;
}

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

export async function runGroqJsonCompletion<T>(config: GroqJsonCompletionConfig<T>): Promise<{
  model: string;
  result: T;
  usage?: GroqChatCompletionResponse["usage"];
}> {
  const apiKey = getServerEnv("GROQ_API_KEY");

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const model = config.model || getServerEnv("GROQ_MODEL") || AGENT_CONFIG.groq.defaultModel;
  const response = await fetch(`${AGENT_CONFIG.groq.baseUrl}/chat/completions`, {
    signal: AbortSignal.timeout(AGENT_CONFIG.groq.requestTimeoutMs),
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: AGENT_CONFIG.groq.defaultTemperature,
      messages: config.messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: config.schemaName,
          strict: true,
          schema: config.schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq completion failed with HTTP ${response.status}: ${truncateError(errorBody)}`);
  }

  const payload = (await response.json()) as GroqChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq completion response did not include message content.");
  }

  const parsed = JSON.parse(content) as unknown;

  if (!config.validate(parsed)) {
    throw new Error(`Groq completion response did not match the expected ${config.schemaName} schema.`);
  }

  return {
    model,
    result: parsed,
    usage: payload.usage,
  };
}

function truncateError(value: string): string {
  return value.length > 280 ? `${value.slice(0, 277)}...` : value;
}
