import { NextResponse } from "next/server";
import {
  buildAssertionMappingMessages,
  groqAssertionMappingBundleSchema,
  isAssertionMappingBundle,
  normalizeAssertionMappingBundle,
  resolveAssertionMappingToolInput,
} from "@/lib/agent/map-assertions";
import { AGENT_CONFIG } from "@/lib/agent/config";
import { buildIngestionSummary } from "@/lib/agent/common";
import { buildGeminiEvidenceAttachments } from "@/lib/agent/evidence-attachments";
import { resolveAgentProvider, runAgentJsonCompletion } from "@/lib/agent/provider";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const provider = resolveAgentProvider(body.provider);
    const input = await resolveAssertionMappingToolInput(body);
    const result = await runAgentJsonCompletion({
      provider,
      schemaName: AGENT_CONFIG.schemaNames.assertionMappingBundle,
      schema: groqAssertionMappingBundleSchema,
      messages: buildAssertionMappingMessages(input),
      validate: isAssertionMappingBundle,
      attachments: provider === "gemini" ? await buildGeminiEvidenceAttachments(input) : undefined,
    });

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      ...normalizeAssertionMappingBundle(input, result.result),
      ingestion: buildIngestionSummary(input.ingested_file),
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Assertion mapping failed.");
  }
}
