import { NextResponse } from "next/server";
import {
  buildGapAnalysisMessages,
  groqGapAnalysisSchema,
  isAgentGapAnalysisResult,
  normalizeGapAnalysisResult,
  parseGapAnalysisToolInput,
} from "@/lib/agent/analyze-gaps";
import { AGENT_CONFIG } from "@/lib/agent/config";
import { runGroqJsonCompletion } from "@/lib/agent/groq";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = parseGapAnalysisToolInput(body);
    const result = await runGroqJsonCompletion({
      schemaName: AGENT_CONFIG.schemaNames.gapAnalysis,
      schema: groqGapAnalysisSchema,
      messages: buildGapAnalysisMessages(input),
      validate: isAgentGapAnalysisResult,
    });

    return NextResponse.json({
      provider: "groq",
      model: result.model,
      gap_analysis: normalizeGapAnalysisResult(input, result.result),
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Gap analysis failed.");
  }
}
