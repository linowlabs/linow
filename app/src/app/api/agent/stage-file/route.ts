import { NextResponse } from "next/server";
import { buildIngestionSummary } from "@/lib/agent/common";
import { stageBrowserEvidenceFile } from "@/lib/agent/ingest";
import { toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file must be provided as multipart form data." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const ingested = await stageBrowserEvidenceFile({
      filename: file.name,
      bytes,
    });

    return NextResponse.json({
      filePath: ingested.absolutePath,
      ingestion: buildIngestionSummary(ingested),
      extracted_characters: ingested.text.length,
      warnings: ingested.warnings,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Browser evidence staging failed.");
  }
}
