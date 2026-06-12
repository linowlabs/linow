import { NextResponse } from "next/server";
import { parseAgentDocumentInput } from "@/lib/agent/common";
import {
  buildMetadataExtractionMessages,
  groqMetadataExtractionSchema,
  isAgentMetadataExtractionResult,
  normalizeMetadataExtractionResult,
} from "@/lib/agent/extract-metadata";
import { AGENT_CONFIG } from "@/lib/agent/config";
import { runGroqJsonCompletion } from "@/lib/agent/groq";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = parseAgentDocumentInput(body);
    const result = await runGroqJsonCompletion({
      schemaName: AGENT_CONFIG.schemaNames.metadataExtraction,
      schema: groqMetadataExtractionSchema,
      messages: buildMetadataExtractionMessages(input),
      validate: isAgentMetadataExtractionResult,
    });

    return NextResponse.json({
      provider: "groq",
      model: result.model,
      metadata: normalizeMetadataExtractionResult(input, result.result),
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Metadata extraction failed.");
  }
}
