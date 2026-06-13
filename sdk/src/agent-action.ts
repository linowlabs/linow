import { Transaction } from "@mysten/sui/transactions";
import { createLinowClient, type LinowClient } from "./client.js";
import { createTatumSuiClient, type TatumSuiClient, type TatumSuiNetwork } from "./tatum.js";
import type {
  AgentAction,
  EvidenceId,
  IsoTimestamp,
  WalletAddress,
} from "./types.js";

export interface EmitAgentActionChainInput {
  packId: string;
  evidenceId?: EvidenceId;
  actionType: string;
  agentOutputHash: string;
  signerAddress?: WalletAddress;
}

export interface EmitAgentActionChainResult {
  transactionDigest?: string;
  packageId?: string;
}

export interface CreateSuiEmitAgentActionHandlerConfig {
  packageId: string;
  signerAddress: WalletAddress;
  tatum: Pick<TatumSuiClient, "executeTransactionBlock">;
  signTransaction: SignAgentActionTransaction;
  network?: TatumSuiNetwork;
  clockObjectId?: string;
}

export interface EmitAgentActionFlowConfig {
  packageId: string;
  signerAddress: WalletAddress;
  signTransaction: SignAgentActionTransaction;
  tatumApiKey?: string;
  tatum?: Pick<TatumSuiClient, "executeTransactionBlock">;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
  clockObjectId?: string;
  fetchFn?: typeof fetch;
}

export interface AgentActionEnvironment {
  LINOW_PACKAGE_ID?: string;
  NEXT_PUBLIC_LINOW_PACKAGE_ID?: string;
  TATUM_API_KEY?: string;
  TATUM_SUI_NETWORK?: string;
  TATUM_SUI_ENDPOINT?: string;
}

export interface EmitAgentActionFlowFromEnvConfig
  extends Omit<
    EmitAgentActionFlowConfig,
    "packageId" | "tatumApiKey" | "tatumNetwork" | "tatumEndpoint"
  > {
  env: AgentActionEnvironment;
  packageId?: string;
  tatumApiKey?: string;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
}

export interface SignAgentActionTransactionInput {
  transaction: Transaction;
  chain: "sui:mainnet" | "sui:testnet" | "sui:devnet";
}

export interface SignAgentActionTransactionResult {
  bytes: string;
  signature: string | string[];
}

export type SignAgentActionTransaction = (
  input: SignAgentActionTransactionInput
) => Promise<SignAgentActionTransactionResult>;

export interface EmitAgentActionResult {
  transactionDigest?: string;
  warnings: string[];
}

export interface EmitAgentActionInput {
  packId: string;
  evidenceId?: EvidenceId;
  actionType: string;
  agentOutputHash: string;
}

export function createEmitAgentActionFlow(
  config: EmitAgentActionFlowConfig
): (input: EmitAgentActionInput) => Promise<EmitAgentActionResult> {
  const tatum =
    config.tatum ??
    createTatumSuiClient({
      apiKey: required(config.tatumApiKey, "TATUM_API_KEY"),
      network: config.tatumNetwork ?? "testnet",
      endpoint: config.tatumEndpoint,
      fetchFn: config.fetchFn,
    });

  const emitOnChain = createSuiEmitAgentActionHandler({
    packageId: config.packageId,
    signerAddress: config.signerAddress,
    tatum,
    signTransaction: config.signTransaction,
    network: config.tatumNetwork ?? "testnet",
    clockObjectId: config.clockObjectId,
  });

  return async function emit(input) {
    await emitOnChain({
      packId: input.packId,
      evidenceId: input.evidenceId,
      actionType: input.actionType,
      agentOutputHash: input.agentOutputHash,
    });

    return {
      warnings: [
        "Agent action logged on-chain as event only. No private data is stored.",
      ],
    };
  };
}

export function createEmitAgentActionFlowFromEnv(
  config: EmitAgentActionFlowFromEnvConfig
) {
  return createEmitAgentActionFlow({
    ...config,
    packageId:
      config.packageId ??
      required(
        config.env.LINOW_PACKAGE_ID ?? config.env.NEXT_PUBLIC_LINOW_PACKAGE_ID,
        "LINOW_PACKAGE_ID or NEXT_PUBLIC_LINOW_PACKAGE_ID"
      ),
    tatumApiKey: config.tatumApiKey ?? config.env.TATUM_API_KEY,
    tatumNetwork: config.tatumNetwork ?? parseTatumNetwork(config.env.TATUM_SUI_NETWORK),
    tatumEndpoint: config.tatumEndpoint ?? config.env.TATUM_SUI_ENDPOINT,
  });
}

export function createAgentActionClient(config: EmitAgentActionFlowConfig): LinowClient {
  return createLinowClient({
    emitAgentAction: createEmitAgentActionFlow(config),
  });
}

export function createSuiEmitAgentActionHandler(
  config: CreateSuiEmitAgentActionHandlerConfig
): (input: EmitAgentActionChainInput) => Promise<EmitAgentActionChainResult> {
  return async function emitOnChain(input) {
    const signerAddress = input.signerAddress ?? config.signerAddress;
    const transaction = new Transaction();
    transaction.setSender(signerAddress);

    transaction.moveCall({
      target: `${config.packageId}::agent_action::emit_agent_action`,
      arguments: [
        transaction.pure.id(input.packId),
        transaction.pure.option("id", input.evidenceId ?? null),
        transaction.pure.vector("u8", Array.from(new TextEncoder().encode(input.actionType))),
        transaction.pure.vector("u8", Array.from(hexToBytes(input.agentOutputHash))),
        transaction.object(config.clockObjectId ?? SUI_CLOCK_OBJECT_ID),
      ],
    });

    const signed = await config.signTransaction({
      transaction,
      chain: toSuiChain(config.network ?? "testnet"),
    });

    const execution = await config.tatum.executeTransactionBlock({
      transactionBlock: signed.bytes,
      signature: signed.signature,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
      requestType: "WaitForLocalExecution",
    });

    return {
      transactionDigest: extractTransactionDigest(execution),
      packageId: config.packageId,
    };
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required to create the agent action flow.`);
  }
  return value;
}

function parseTatumNetwork(value: string | undefined): TatumSuiNetwork | undefined {
  if (!value) return undefined;
  if (value === "mainnet" || value === "testnet" || value === "devnet") return value;
  throw new Error(`Unsupported Tatum Sui network: ${value}`);
}

function toSuiChain(network: TatumSuiNetwork): SignAgentActionTransactionInput["chain"] {
  if (network === "mainnet") return "sui:mainnet";
  if (network === "devnet") return "sui:devnet";
  return "sui:testnet";
}

function extractTransactionDigest(execution: unknown): string | undefined {
  if (execution && typeof execution === "object" && "digest" in execution && typeof execution.digest === "string") {
    return execution.digest;
  }
  return undefined;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

const SUI_CLOCK_OBJECT_ID = "0x6";