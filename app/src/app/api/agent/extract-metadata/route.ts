import { NextResponse } from "next/server";
import { buildIngestionSummary, resolveAgentDocumentInput } from "@/lib/agent/common";
import {
  buildMetadataExtractionMessages,
  groqMetadataExtractionSchema,
  isAgentMetadataExtractionResult,
  normalizeMetadataExtractionResult,
} from "@/lib/agent/extract-metadata";
import { AGENT_CONFIG } from "@/lib/agent/config";
import { buildGeminiEvidenceAttachments } from "@/lib/agent/evidence-attachments";
import { resolveAgentProvider, runAgentJsonCompletion } from "@/lib/agent/provider";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const provider = resolveAgentProvider(body.provider);
    const input = await resolveAgentDocumentInput(body);
    const result = await runAgentJsonCompletion({
      provider,
      schemaName: AGENT_CONFIG.schemaNames.metadataExtraction,
      schema: groqMetadataExtractionSchema,
      messages: buildMetadataExtractionMessages(input),
      validate: isAgentMetadataExtractionResult,
      attachments: provider === "gemini" ? await buildGeminiEvidenceAttachments(input) : undefined,
    });

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      metadata: normalizeMetadataExtractionResult(input, result.result),
      ingestion: buildIngestionSummary(input.ingested_file),
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Metadata extraction failed.");
  }
}
