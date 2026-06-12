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
import { runGroqJsonCompletion } from "@/lib/agent/groq";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = await resolveAssertionMappingToolInput(body);
    const result = await runGroqJsonCompletion({
      schemaName: AGENT_CONFIG.schemaNames.assertionMappingBundle,
      schema: groqAssertionMappingBundleSchema,
      messages: buildAssertionMappingMessages(input),
      validate: isAssertionMappingBundle,
    });

    return NextResponse.json({
      provider: "groq",
      model: result.model,
      ...normalizeAssertionMappingBundle(input, result.result),
      ingestion: buildIngestionSummary(input.ingested_file),
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Assertion mapping failed.");
  }
}
