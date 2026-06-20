import { NextResponse } from "next/server";
import {
  buildCcerFindingMessages,
  groqCcerFindingSchema,
  isGroqDraftFindingResult,
  normalizeCcerFindingResult,
  parseCcerFindingToolInput,
} from "@/lib/agent/draft-finding";
import { AGENT_CONFIG } from "@/lib/agent/config";
import { resolveAgentProvider, runAgentJsonCompletion } from "@/lib/agent/provider";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const provider = resolveAgentProvider(body.provider);
    const input = parseCcerFindingToolInput(body);
    const result = await runAgentJsonCompletion({
      provider,
      schemaName: AGENT_CONFIG.schemaNames.ccerFinding,
      schema: groqCcerFindingSchema,
      messages: buildCcerFindingMessages(input),
      validate: isGroqDraftFindingResult,
      responseMode: "json_object",
    });

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      finding: normalizeCcerFindingResult(input, result.result),
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Finding drafting failed.");
  }
}
