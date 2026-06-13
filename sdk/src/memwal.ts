import { MemWal } from "@mysten-incubation/memwal";
import { generateDelegateKey } from "@mysten-incubation/memwal/account";

/**
 * Staging relayer URL for MemWal (as per quickstart and docs).
 * For production would use self-hosted or managed.
 */
export const MEMWAL_STAGING_RELAYER = "https://relayer.memwal.ai";

/**
 * Timeboxed spike: create delegate key (local).
 * For full account: use createAccount + addDelegateKey from /account
 * with the memwal on-chain packageId/registryId (requires @mysten/sui signer).
 * See package README for self-hosting flow.
 */
export async function createDelegateKeyFlow() {
  const delegate = await generateDelegateKey();
  return {
    privateKey: delegate.privateKey, // hex - store securely, never commit
    publicKey: delegate.publicKey,
    suiAddress: delegate.suiAddress,
    note: "Use this privateKey + an accountId (from playground or createAccount) with MemWal.create",
  };
}

/**
 * Create configured MemWal client for staging.
 * Requires a valid accountId (MemWalAccount object ID on Sui) and delegate private key.
 */
export function createStagingMemWalClient(params: {
  privateKey: string | Uint8Array;
  accountId: string;
  namespace?: string;
}) {
  return MemWal.create({
    key: params.privateKey,
    accountId: params.accountId,
    serverUrl: MEMWAL_STAGING_RELAYER,
    namespace: params.namespace ?? "linow-demo",
  });
}

/**
 * Validate core operations: health (public), remember/recall (require valid setup).
 * Returns health always; remember/recall wrapped for graceful failure in spike.
 */
export async function validateMemWalCore(memwal: MemWal) {
  const health = await memwal.health();

  let rememberRecall: any = { skipped: true, reason: "requires valid accountId + delegate key with on-chain MemWalAccount setup" };
  try {
    // Use remember (fire and forget for spike)
    const accepted = await memwal.remember("Linow SDK memwal spike test memory: prefers 2026 timeline and direct Walrus fallback for hackathon.");

    // Recall to validate
    const results = await memwal.recall({
      query: "Linow SDK memwal spike",
      limit: 5,
    });

    rememberRecall = { accepted, results };
  } catch (err: any) {
    rememberRecall = { error: err.message || String(err) };
  }

  return { health, rememberRecall };
}