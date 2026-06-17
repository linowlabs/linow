import { NextResponse } from "next/server";
import { resolveAgentOrchestrationInput, runAgentOrchestration } from "@/lib/agent/orchestrate";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";
import { buildOrchestrateApiResponse, resolveOrchestrateResponseMode } from "@/lib/agent/orchestrate-response";
import { persistAgentOutputsForWeb3 } from "@/lib/agent/web3-persistence";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const responseMode = resolveOrchestrateResponseMode(body.response_mode);
    const input = await resolveAgentOrchestrationInput(body);
    const result = await runAgentOrchestration(input, {
      skipFindingDrafting: responseMode === "compact_p2" || responseMode === "memory",
    });
    const persistence_result = await persistAgentOutputsForWeb3(result);

    return NextResponse.json(
      buildOrchestrateApiResponse({
        mode: responseMode,
        result,
        persistenceResult: persistence_result,
      }),
    );
  } catch (error) {
    return toAgentErrorResponse(error, "Agent orchestration failed.");
  }
}
