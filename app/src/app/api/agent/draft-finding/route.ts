import { NextResponse } from "next/server";
import {
  buildCcerFindingMessages,
  groqCcerFindingSchema,
  isAgentCcerFindingResult,
  normalizeCcerFindingResult,
  parseCcerFindingToolInput,
} from "@/lib/agent/draft-finding";
import { AGENT_CONFIG } from "@/lib/agent/config";
import { runGroqJsonCompletion } from "@/lib/agent/groq";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = parseCcerFindingToolInput(body);
    const result = await runGroqJsonCompletion({
      schemaName: AGENT_CONFIG.schemaNames.ccerFinding,
      schema: groqCcerFindingSchema,
      messages: buildCcerFindingMessages(input),
      validate: isAgentCcerFindingResult,
    });

    return NextResponse.json({
      provider: "groq",
      model: result.model,
      finding: normalizeCcerFindingResult(input, result.result),
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Finding drafting failed.");
  }
}
