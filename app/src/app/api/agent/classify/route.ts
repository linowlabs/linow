import { NextResponse } from "next/server";
import { buildIngestionSummary, resolveAgentDocumentInput } from "@/lib/agent/common";
import { classifyDocumentWithGroq } from "@/lib/agent/groq";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = await resolveAgentDocumentInput(body);
    const result = await classifyDocumentWithGroq(input);

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      classification: result.result,
      ingestion: buildIngestionSummary(input.ingested_file),
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Agent classification failed.");
  }
}
