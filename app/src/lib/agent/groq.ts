import { getServerEnv } from "@/lib/server-env";
import {
  buildClassificationMessages,
  groqClassificationSchema,
  isAgentClassificationResult,
  normalizeClassificationResult,
  type ClassifyDocumentInput,
} from "@/lib/agent/classify";
import type { EvidenceClassificationOutput } from "@/lib/agent/schemas";

const GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

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

export async function classifyDocumentWithGroq(input: ClassifyDocumentInput): Promise<{
  provider: "groq";
  model: string;
  result: EvidenceClassificationOutput;
  usage?: GroqChatCompletionResponse["usage"];
}> {
  const apiKey = getServerEnv("GROQ_API_KEY");

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const model = getServerEnv("GROQ_MODEL") || DEFAULT_GROQ_MODEL;
  const response = await fetch(`${GROQ_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: buildClassificationMessages(input),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "linow_agent_classification",
          strict: true,
          schema: groqClassificationSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq classification failed with HTTP ${response.status}: ${truncateError(errorBody)}`);
  }

  const payload = (await response.json()) as GroqChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq classification response did not include message content.");
  }

  const parsed = JSON.parse(content) as unknown;

  if (!isAgentClassificationResult(parsed)) {
    throw new Error("Groq classification response did not match the expected Linow schema.");
  }

  return {
    provider: "groq",
    model,
    result: normalizeClassificationResult(input, parsed),
    usage: payload.usage,
  };
}

function truncateError(value: string): string {
  return value.length > 280 ? `${value.slice(0, 277)}...` : value;
}
