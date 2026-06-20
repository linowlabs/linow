import { NextResponse } from "next/server";
import { logAgentProgress, resolveAgentOrchestrationInput, runAgentOrchestration } from "@/lib/agent/orchestrate";
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
    const persistenceStartedAt = Date.now();
    logAgentProgress("Persisting/preparing web3 outputs", {
      pack_id: result.pack_id,
      response_mode: responseMode,
      hashes: result.hashes.length,
    });
    const persistence_result = await persistAgentOutputsForWeb3(result);
    logAgentProgress("Web3 persistence preparation complete", {
      pack_id: result.pack_id,
      duration_ms: Date.now() - persistenceStartedAt,
      memwal_status: persistence_result.memwal.status,
      walrus_status: persistence_result.walrus.status,
      action_candidates: persistence_result.sui.action_candidates.length,
    });

    const responseStartedAt = Date.now();
    logAgentProgress("Building orchestrate API response", {
      pack_id: result.pack_id,
      response_mode: responseMode,
    });
    const responseBody = buildOrchestrateApiResponse({
      mode: responseMode,
      result,
      persistenceResult: persistence_result,
    });
    logAgentProgress("Orchestrate API response ready", {
      pack_id: result.pack_id,
      duration_ms: Date.now() - responseStartedAt,
      response_mode: responseMode,
    });
    return NextResponse.json(
      responseBody,
    );
  } catch (error) {
    return toAgentErrorResponse(error, "Agent orchestration failed.");
  }
}
