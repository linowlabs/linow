import { Transaction } from "@mysten/sui/transactions";
import { createLinowClient, type LinowClient } from "./client.js";
import { encryptJson } from "./crypto.js";
import { serializeEncryptedPayload, type SerializedEncryptedPayload } from "./crypto.js";
import { createTatumSuiClient, type TatumSuiClient, type TatumSuiNetwork } from "./tatum.js";
import type {
  AttestationId,
  AttestationType,
  AttestEvidenceInput,
  AttestEvidenceResult,
  SourceConfidenceLevel,
  WalletAddress,
} from "./types.js";

export interface AttestationChainInput {
  targetId: string;
  attestationType: AttestationType;
  attestationTypeCode: number;
  sourceConfidence: SourceConfidenceLevel;
  sourceConfidenceCode: number;
  encryptedNotes: Uint8Array;
  reviewerAddress?: WalletAddress;
}

export interface AttestationChainResult {
  attestationId: AttestationId;
  transactionDigest?: string;
  packageId?: string;
  reviewerAddress?: WalletAddress;
  createdAt?: string;
}

export interface CreateAttestEvidenceHandlerConfig {
  encryptionKey: CryptoKey;
  attestOnChain: (input: AttestationChainInput) => Promise<AttestationChainResult>;
}

export interface CreateSuiAttestationHandlerConfig {
  packageId: string;
  signerAddress: WalletAddress;
  tatum: Pick<TatumSuiClient, "executeTransactionBlock">;
  signTransaction: SignAttestationTransaction;
  network?: TatumSuiNetwork;
  clockObjectId?: string;
}

export interface CreateAttestationFlowConfig {
  packageId: string;
  signerAddress: WalletAddress;
  signTransaction: SignAttestationTransaction;
  encryptionKey: CryptoKey;
  tatumApiKey?: string;
  tatum?: Pick<TatumSuiClient, "executeTransactionBlock">;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
  clockObjectId?: string;
  fetchFn?: typeof fetch;
}

export interface AttestationEnvironment {
  LINOW_PACKAGE_ID?: string;
  NEXT_PUBLIC_LINOW_PACKAGE_ID?: string;
  TATUM_API_KEY?: string;
  TATUM_SUI_NETWORK?: string;
  TATUM_SUI_ENDPOINT?: string;
}

export interface CreateAttestationFlowFromEnvConfig
  extends Omit<CreateAttestationFlowConfig, "packageId" | "tatumApiKey" | "tatumNetwork" | "tatumEndpoint"> {
  env: AttestationEnvironment;
  packageId?: string;
  tatumApiKey?: string;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
}

export interface SignAttestationTransactionInput {
  transaction: Transaction;
  chain: "sui:mainnet" | "sui:testnet" | "sui:devnet";
}

export interface SignAttestationTransactionResult {
  bytes: string;
  signature: string | string[];
}

export type SignAttestationTransaction = (
  input: SignAttestationTransactionInput,
) => Promise<SignAttestationTransactionResult>;

export interface AttestationPreparedArtifacts {
  encryptedNotes: SerializedEncryptedPayload;
}

export interface AttestEvidenceWithArtifactsResult extends AttestEvidenceResult {
  artifacts: AttestationPreparedArtifacts;
}

export function createAttestEvidenceHandler(
  config: CreateAttestEvidenceHandlerConfig,
): (input: AttestEvidenceInput) => Promise<AttestEvidenceWithArtifactsResult> {
  return async function attest(input) {
    const attestationType = input.attestationType ?? "hashConfirmed";
    const sourceConfidence = input.sourceConfidence ?? "L3";
    const encryptedNotesPayload = await encryptJson(
      {
        note: input.note ?? "",
        evidenceId: input.evidenceId,
        attestationType,
        sourceConfidence,
      },
      config.encryptionKey,
    );
    const encryptedNotes = serializeEncryptedPayload(encryptedNotesPayload);
    const chain = await config.attestOnChain({
      targetId: input.evidenceId,
      attestationType,
      attestationTypeCode: attestationTypeToCode(attestationType),
      sourceConfidence,
      sourceConfidenceCode: sourceConfidenceToCode(sourceConfidence),
      encryptedNotes: textEncoder.encode(JSON.stringify(encryptedNotes)),
      reviewerAddress: input.reviewerAddress,
    });

    return {
      attestation: {
        id: chain.attestationId,
        evidenceId: input.evidenceId,
        reviewerAddress: chain.reviewerAddress ?? input.reviewerAddress,
        attestationType,
        sourceConfidence,
        createdAt: chain.createdAt ?? new Date().toISOString(),
        note: input.note,
        transactionDigest: chain.transactionDigest,
      },
      warnings: [
        "Reviewer notes are encrypted before being registered on-chain.",
        "An attestation records reviewer action and source confidence; it does not make the underlying document automatically true or audit-sufficient.",
      ],
      artifacts: {
        encryptedNotes,
      },
    };
  };
}

export function createAttestationFlow(
  config: CreateAttestationFlowConfig,
): (input: AttestEvidenceInput) => Promise<AttestEvidenceWithArtifactsResult> {
  const tatum =
    config.tatum ??
    createTatumSuiClient({
      apiKey: required(config.tatumApiKey, "TATUM_API_KEY"),
      network: config.tatumNetwork ?? "testnet",
      endpoint: config.tatumEndpoint,
      fetchFn: config.fetchFn,
    });
  const attestOnChain = createSuiAttestationHandler({
    packageId: config.packageId,
    signerAddress: config.signerAddress,
    tatum,
    signTransaction: config.signTransaction,
    network: config.tatumNetwork ?? "testnet",
    clockObjectId: config.clockObjectId,
  });

  return createAttestEvidenceHandler({
    encryptionKey: config.encryptionKey,
    attestOnChain,
  });
}

export function createAttestationFlowFromEnv(
  config: CreateAttestationFlowFromEnvConfig,
): (input: AttestEvidenceInput) => Promise<AttestEvidenceWithArtifactsResult> {
  return createAttestationFlow({
    ...config,
    packageId:
      config.packageId ??
      required(
        config.env.LINOW_PACKAGE_ID ?? config.env.NEXT_PUBLIC_LINOW_PACKAGE_ID,
        "LINOW_PACKAGE_ID or NEXT_PUBLIC_LINOW_PACKAGE_ID",
      ),
    tatumApiKey: config.tatumApiKey ?? config.env.TATUM_API_KEY,
    tatumNetwork: config.tatumNetwork ?? parseTatumNetwork(config.env.TATUM_SUI_NETWORK),
    tatumEndpoint: config.tatumEndpoint ?? config.env.TATUM_SUI_ENDPOINT,
  });
}

export function createAttestationClient(config: CreateAttestationFlowConfig): LinowClient {
  return createLinowClient({
    attest: createAttestationFlow(config),
  });
}

export function createSuiAttestationHandler(
  config: CreateSuiAttestationHandlerConfig,
): (input: AttestationChainInput) => Promise<AttestationChainResult> {
  return async function attestOnChain(input) {
    const signerAddress = input.reviewerAddress ?? config.signerAddress;
    const transaction = new Transaction();
    transaction.setSender(signerAddress);

    const [attestation] = transaction.moveCall({
      target: `${config.packageId}::evidence::create_attestation`,
      arguments: [
        transaction.pure("id", input.targetId),
        transaction.pure("u8", input.attestationTypeCode),
        transaction.pure("u8", input.sourceConfidenceCode),
        transaction.pure.vector("u8", Array.from(input.encryptedNotes)),
        transaction.object(config.clockObjectId ?? SUI_CLOCK_OBJECT_ID),
      ],
    });

    transaction.transferObjects([attestation], signerAddress);

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
      attestationId: extractAttestationId(execution),
      transactionDigest: extractTransactionDigest(execution),
      packageId: config.packageId,
      reviewerAddress: signerAddress,
      createdAt: new Date().toISOString(),
    };
  };
}

function attestationTypeToCode(value: AttestationType): number {
  const codes: Record<AttestationType, number> = {
    evidenceVerified: 0,
    packReviewed: 1,
    hashConfirmed: 2,
    rejected: 3,
  };

  return codes[value];
}

function sourceConfidenceToCode(value: SourceConfidenceLevel): number {
  return Number(value.slice(1));
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required to create the attestation flow.`);
  }

  return value;
}

function parseTatumNetwork(value: string | undefined): TatumSuiNetwork | undefined {
  if (!value) {
    return undefined;
  }

  if (value === "mainnet" || value === "testnet" || value === "devnet") {
    return value;
  }

  throw new Error(`Unsupported Tatum Sui network: ${value}`);
}

function toSuiChain(network: TatumSuiNetwork): SignAttestationTransactionInput["chain"] {
  if (network === "mainnet") {
    return "sui:mainnet";
  }

  if (network === "devnet") {
    return "sui:devnet";
  }

  return "sui:testnet";
}

function extractAttestationId(execution: unknown): string {
  const objectChanges = getObjectChanges(execution);
  const createdAttestation = objectChanges.find(
    (change) =>
      change &&
      typeof change === "object" &&
      "objectType" in change &&
      typeof change.objectType === "string" &&
      change.objectType.endsWith("::evidence::Attestation") &&
      "objectId" in change &&
      typeof change.objectId === "string",
  );

  if (
    createdAttestation &&
    "objectId" in createdAttestation &&
    typeof createdAttestation.objectId === "string"
  ) {
    return createdAttestation.objectId;
  }

  const events = getEvents(execution);
  const attestationEvent = events.find(
    (event) =>
      event &&
      typeof event === "object" &&
      "type" in event &&
      typeof event.type === "string" &&
      event.type.endsWith("::evidence::AttestationCreated"),
  );

  if (
    attestationEvent &&
    "parsedJson" in attestationEvent &&
    attestationEvent.parsedJson &&
    typeof attestationEvent.parsedJson === "object" &&
    "attestation_id" in attestationEvent.parsedJson &&
    typeof attestationEvent.parsedJson.attestation_id === "string"
  ) {
    return attestationEvent.parsedJson.attestation_id;
  }

  throw new Error("Could not find created Attestation ID in Sui execution result.");
}

function extractTransactionDigest(execution: unknown): string | undefined {
  if (execution && typeof execution === "object" && "digest" in execution && typeof execution.digest === "string") {
    return execution.digest;
  }

  return undefined;
}

function getObjectChanges(execution: unknown): Array<Record<string, unknown>> {
  if (
    execution &&
    typeof execution === "object" &&
    "objectChanges" in execution &&
    Array.isArray(execution.objectChanges)
  ) {
    return execution.objectChanges.filter((change): change is Record<string, unknown> => typeof change === "object");
  }

  return [];
}

function getEvents(execution: unknown): Array<Record<string, unknown>> {
  if (execution && typeof execution === "object" && "events" in execution && Array.isArray(execution.events)) {
    return execution.events.filter((event): event is Record<string, unknown> => typeof event === "object");
  }

  return [];
}

const SUI_CLOCK_OBJECT_ID = "0x6";
const textEncoder = new TextEncoder();
