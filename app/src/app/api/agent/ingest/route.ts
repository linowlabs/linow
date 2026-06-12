import { NextResponse } from "next/server";
import { buildIngestionSummary, readRequiredString } from "@/lib/agent/common";
import { ingestEvidenceFile } from "@/lib/agent/ingest";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const filePath = readRequiredString(body.filePath, "filePath");
    const ingested = await ingestEvidenceFile(filePath);

    return NextResponse.json({
      ingestion: buildIngestionSummary(ingested),
      text_preview: ingested.text.slice(0, 2000),
      extracted_characters: ingested.text.length,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Evidence ingestion failed.");
  }
}
