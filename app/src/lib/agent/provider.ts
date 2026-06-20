import { AGENT_CONFIG } from "@/lib/agent/config";
import { AgentInputError } from "@/lib/agent/common";
import {
  buildClassificationMessages,
  groqClassificationSchema,
  isAgentClassificationResult,
  normalizeClassificationResult,
  type ClassifyDocumentInput,
} from "@/lib/agent/classify";
import { buildGeminiEvidenceAttachments } from "@/lib/agent/evidence-attachments";
import { runGeminiJsonCompletion } from "@/lib/agent/gemini";
import { runGroqJsonCompletion } from "@/lib/agent/groq";
import { getServerEnv } from "@/lib/server-env";
import type { EvidenceClassificationOutput } from "@/lib/agent/schemas";
import type {
  AgentJsonCompletionConfig,
  AgentJsonCompletionResult,
  AgentProviderName,
} from "@/lib/agent/provider-types";

export function resolveAgentProvider(value?: unknown): AgentProviderName {
  const requested = typeof value === "string" && value.trim().length > 0 ? value.trim().toLowerCase() : undefined;
  const configured = getServerEnv("AGENT_PROVIDER")?.trim().toLowerCase();
  const provider = requested ?? configured ?? "groq";

  if (provider === "groq" || provider === "gemini") {
    return provider;
  }

  throw new AgentInputError("provider must be one of: groq, gemini.");
}

export async function classifyDocumentWithAgent(
  input: ClassifyDocumentInput,
  provider = resolveAgentProvider(),
): Promise<{
  provider: AgentProviderName;
  model: string;
  result: EvidenceClassificationOutput;
  usage?: AgentJsonCompletionResult<unknown>["usage"];
}> {
  const completion = await runAgentJsonCompletion({
    provider,
    schemaName: AGENT_CONFIG.schemaNames.classification,
    schema: groqClassificationSchema,
    messages: buildClassificationMessages(input),
    validate: isAgentClassificationResult,
    attachments: provider === "gemini" ? await buildGeminiEvidenceAttachments(input) : undefined,
  });

  return {
    provider: completion.provider,
    model: completion.model,
    result: normalizeClassificationResult(input, completion.result),
    usage: completion.usage,
  };
}

export async function runAgentJsonCompletion<T>(
  config: AgentJsonCompletionConfig<T>,
): Promise<AgentJsonCompletionResult<T>> {
  const provider = config.provider ?? resolveAgentProvider();

  if (provider === "gemini") {
    return runGeminiJsonCompletion({ ...config, provider });
  }

  return runGroqJsonCompletion({ ...config, provider });
}

export function shouldUseDocumentAnalysisBundle(provider: AgentProviderName, profileWantsBundle: boolean): boolean {
  if (!profileWantsBundle) {
    return false;
  }

  if (provider === "gemini") {
    return AGENT_CONFIG.gemini.enableDocumentAnalysisBundle;
  }

  return AGENT_CONFIG.groq.enableDocumentAnalysisBundle;
}
