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
import { recallPriorAuditMemory } from "@linow/sdk/memwal";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = parseGapAnalysisToolInput(body);

    // B side: recall prior audit memory (evidence/finding etc.) persisted in MemWal
    // from previous session/refresh, and inject into input so gap analysis continues from it.
    // (Core agent prompt/build in lib/agent uses pack_notes and document notes.)
    const priorMemories = await recallPriorAuditMemory(input.pack_id);
    const priorNotes = priorMemories
      .slice(0, 4)
      .map((memory) => summarizePriorMemory(memory.text));
    if (!input.pack_notes) input.pack_notes = [];
    input.pack_notes.push(...priorNotes);

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
      recalled_prior_count: priorMemories.length, // to prove in demo
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Gap analysis failed.");
  }
}

function summarizePriorMemory(value: string): string {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > 220 ? `Prior memory: ${compacted.slice(0, 203)}...` : `Prior memory: ${compacted}`;
}
