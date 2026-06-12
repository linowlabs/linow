import { NextResponse } from "next/server";
import { resolveAgentOrchestrationInput, runAgentOrchestration } from "@/lib/agent/orchestrate";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = await resolveAgentOrchestrationInput(body);
    const result = await runAgentOrchestration(input);

    return NextResponse.json(result);
  } catch (error) {
    return toAgentErrorResponse(error, "Agent orchestration failed.");
  }
}
