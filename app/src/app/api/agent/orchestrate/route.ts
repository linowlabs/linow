import { NextResponse } from "next/server";
import { resolveAgentOrchestrationInput, runAgentOrchestration } from "@/lib/agent/orchestrate";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";
import { storeAgentOutputsInMemWal, createStagingMemWalClient } from "@linow/sdk/memwal";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = await resolveAgentOrchestrationInput(body);
    const result = await runAgentOrchestration(input);

    // B side: store agent outputs as MemWal entries under engagement namespace.
    // Do not fail the response if storage fails (demo path protection).
    try {
      const memwal = createStagingMemWalClient({
        privateKey: process.env.MEMWAL_PRIVATE_KEY || "0".repeat(64),
        accountId: process.env.MEMWAL_ACCOUNT_ID || "0x" + "0".repeat(64),
      });
      await storeAgentOutputsInMemWal(memwal, result, input.pack_id);
    } catch (storeErr) {
      // Expected in spike without real keys; log only.
      console.warn("[MemWal store] skipped or failed (demo):", (storeErr as Error)?.message || storeErr);
    }

    return NextResponse.json(result);
  } catch (error) {
    return toAgentErrorResponse(error, "Agent orchestration failed.");
  }
}
