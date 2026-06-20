import { NextResponse } from "next/server";
import { buildIngestionSummary, resolveAgentDocumentInput } from "@/lib/agent/common";
import { classifyDocumentWithAgent, resolveAgentProvider } from "@/lib/agent/provider";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const provider = resolveAgentProvider(body.provider);
    const input = await resolveAgentDocumentInput(body);
    const result = await classifyDocumentWithAgent(input, provider);

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
