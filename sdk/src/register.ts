import { Transaction } from "@mysten/sui/transactions";
import { createLinowClient, type LinowClient } from "./client.js";
import {
  encryptFile,
  encryptMetadata,
  exportEncryptionKey,
  hashFile,
  type EncryptedPayload,
  deserializeEncryptedPayload,
  serializeEncryptedPayload,
  type SerializedEncryptedPayload,
} from "./crypto.js";

export type { SerializedEncryptedPayload };
export { serializeEncryptedPayload };

import type {
  AssertionId,
  CommitmentHex,
  EvidenceRecord,
  RegisterEvidenceInput,
  RegisterEvidenceResult,
  WalletAddress,
} from "./types.js";
import { createTatumSuiClient, type TatumSuiClient, type TatumSuiNetwork } from "./tatum.js";
import type { WalrusClient, WalrusUploadResult } from "./walrus.js";
import { createWalrusClient, type WalrusNetwork } from "./walrus.js";

export interface RegisterEvidenceChainInput {
  commitment: CommitmentHex;
  commitmentBytes: Uint8Array;
  walrusBlobId: string;
  walrusBlobIdBytes: Uint8Array;
  encryptedMetadata: Uint8Array;
  assertions: AssertionId[];
  auditPackId?: string;
  signerAddress?: WalletAddress;
}

export interface RegisterEvidenceChainResult {
  evidenceId: string;
  transactionDigest?: string;
  packageId?: string;
  registrantAddress?: WalletAddress;
  registeredAt?: string;
}

export interface BatchRegisterEvidenceChainInput {
  items: RegisterEvidenceChainInput[];
  signerAddress?: WalletAddress;
}

export interface BatchRegisterEvidenceChainResult {
  items: RegisterEvidenceChainResult[];
  transactionDigest?: string;
}

export interface CreateRegisterEvidenceHandlerConfig {
  encryptionKey: CryptoKey;
  walrus: Pick<WalrusClient, "uploadEncryptedBlob">;
  registerOnChain: (input: RegisterEvidenceChainInput) => Promise<RegisterEvidenceChainResult>;
  walrusEpochs?: number;
  walrusDeletable?: boolean;
  exportEncryptionKey?: boolean;
}

export interface CreateSuiRegisterOnChainHandlerConfig {
  packageId: string;
  signerAddress: WalletAddress;
  tatum: Pick<TatumSuiClient, "executeTransactionBlock">;
  signTransaction: SignRegisterEvidenceTransaction;
  network?: TatumSuiNetwork;
  clockObjectId?: string;
}

export interface CreateRegisterEvidenceFlowConfig {
  packageId: string;
  signerAddress: WalletAddress;
  signTransaction: SignRegisterEvidenceTransaction;
  encryptionKey: CryptoKey;
  tatumApiKey?: string;
  tatum?: Pick<TatumSuiClient, "executeTransactionBlock">;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
  walrus?: Pick<WalrusClient, "uploadEncryptedBlob">;
  walrusNetwork?: WalrusNetwork;
  walrusPublisherUrl?: string;
  walrusAggregatorUrl?: string;
  walrusEpochs?: number;
  walrusDeletable?: boolean;
  exportEncryptionKey?: boolean;
  clockObjectId?: string;
  fetchFn?: typeof fetch;
}

export interface RegisterEvidenceEnvironment {
  LINOW_PACKAGE_ID?: string;
  NEXT_PUBLIC_LINOW_PACKAGE_ID?: string;
  TATUM_API_KEY?: string;
  TATUM_SUI_NETWORK?: string;
  TATUM_SUI_ENDPOINT?: string;
  WALRUS_NETWORK?: string;
  WALRUS_PUBLISHER_URL?: string;
  WALRUS_AGGREGATOR_URL?: string;
}

export interface CreateRegisterEvidenceFlowFromEnvConfig
  extends Omit<
    CreateRegisterEvidenceFlowConfig,
    | "packageId"
    | "tatumApiKey"
    | "tatumNetwork"
    | "tatumEndpoint"
    | "walrusNetwork"
    | "walrusPublisherUrl"
    | "walrusAggregatorUrl"
  > {
  env: RegisterEvidenceEnvironment;
  packageId?: string;
  tatumApiKey?: string;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
  walrusNetwork?: WalrusNetwork;
  walrusPublisherUrl?: string;
  walrusAggregatorUrl?: string;
}

export interface SignRegisterEvidenceTransactionInput {
  transaction: Transaction;
  chain: "sui:mainnet" | "sui:testnet" | "sui:devnet";
}

export interface SignRegisterEvidenceTransactionResult {
  bytes: string;
  signature: string | string[];
}

export type SignRegisterEvidenceTransaction = (
  input: SignRegisterEvidenceTransactionInput,
) => Promise<SignRegisterEvidenceTransactionResult>;

export interface RegisterEvidencePreparedArtifacts {
  commitment: CommitmentHex;
  encryptedFile: SerializedEncryptedPayload;
  encryptedMetadata: SerializedEncryptedPayload;
  walrus: WalrusUploadResult;
  encryptionKey?: Uint8Array;
}

export interface RegisterEvidenceWithArtifactsResult extends RegisterEvidenceResult {
  artifacts: RegisterEvidencePreparedArtifacts;
}

export interface BatchRegisterEvidenceItemInput extends RegisterEvidenceInput {
  clientId?: string;
}

export interface BatchRegisterEvidenceInput {
  items: BatchRegisterEvidenceItemInput[];
  auditPackId?: string;
  signerAddress?: WalletAddress;
}

export interface BatchRegisterEvidenceItemResult extends RegisterEvidenceWithArtifactsResult {
  clientId?: string;
}

export interface BatchRegisterEvidenceWithArtifactsResult {
  items: BatchRegisterEvidenceItemResult[];
  transactionDigest?: string;
  warnings: string[];
}



export function createRegisterEvidenceHandler(
  config: CreateRegisterEvidenceHandlerConfig,
): (input: RegisterEvidenceInput) => Promise<RegisterEvidenceWithArtifactsResult> {
  return async function register(input) {
    const commitment = await hashFile(input.content);
    const encryptedFile = await encryptFile(input.content, config.encryptionKey);
    const encryptedMetadata = await encryptMetadata(input.metadata, config.encryptionKey);
    const serializedFile = serializeEncryptedPayload(encryptedFile);
    const serializedMetadata = serializeEncryptedPayload(encryptedMetadata);
    const encryptedFileBytes = textEncoder.encode(JSON.stringify(serializedFile));
    const encryptedMetadataBytes = textEncoder.encode(JSON.stringify(serializedMetadata));

    const walrus = await config.walrus.uploadEncryptedBlob({
      encryptedContent: encryptedFileBytes,
      epochs: config.walrusEpochs,
      deletable: config.walrusDeletable,
      sendObjectTo: input.signerAddress,
    });

    const chain = await config.registerOnChain({
      commitment,
      commitmentBytes: hexToBytes(commitment),
      walrusBlobId: walrus.blobId,
      walrusBlobIdBytes: textEncoder.encode(walrus.blobId),
      encryptedMetadata: encryptedMetadataBytes,
      assertions: input.assertions,
      auditPackId: input.auditPackId,
      signerAddress: input.signerAddress,
    });

    const evidence: EvidenceRecord = {
      id: chain.evidenceId,
      commitment,
      status: "registered",
      assertions: input.assertions,
      metadata: input.metadata,
      blobId: walrus.blobId,
      auditPackId: input.auditPackId,
      registrantAddress: chain.registrantAddress ?? input.signerAddress,
      registeredAt: chain.registeredAt,
      proof: {
        evidenceId: chain.evidenceId,
        packageId: chain.packageId,
        transactionDigest: chain.transactionDigest,
        walrusBlobId: walrus.blobId,
        auditPackId: input.auditPackId,
      },
    };

    return {
      evidence,
      transactionDigest: chain.transactionDigest,
      warnings: [
        "Walrus stores public blobs; only encrypted file and metadata payloads were uploaded or registered.",
        "Verification proves integrity against the commitment, not document truth or audit sufficiency.",
      ],
      artifacts: {
        commitment,
        encryptedFile: serializedFile,
        encryptedMetadata: serializedMetadata,
        walrus,
        encryptionKey: config.exportEncryptionKey ? await exportEncryptionKey(config.encryptionKey) : undefined,
      },
    };
  };
}

export function createBatchRegisterEvidenceHandler(
  config: Omit<CreateRegisterEvidenceHandlerConfig, "registerOnChain"> & {
    registerOnChain: (input: BatchRegisterEvidenceChainInput) => Promise<BatchRegisterEvidenceChainResult>;
  },
): (input: BatchRegisterEvidenceInput) => Promise<BatchRegisterEvidenceWithArtifactsResult> {
  return async function batchRegister(input) {
    if (input.items.length === 0) {
      throw new Error("At least one evidence item is required for batch registration.");
    }

    const preparedItems = [];

    for (const item of input.items) {
      const signerAddress = item.signerAddress ?? input.signerAddress;
      const auditPackId = item.auditPackId ?? input.auditPackId;
      const commitment = await hashFile(item.content);
      const encryptedFile = await encryptFile(item.content, config.encryptionKey);
      const encryptedMetadata = await encryptMetadata(item.metadata, config.encryptionKey);
      const serializedFile = serializeEncryptedPayload(encryptedFile);
      const serializedMetadata = serializeEncryptedPayload(encryptedMetadata);
      const encryptedFileBytes = textEncoder.encode(JSON.stringify(serializedFile));
      const encryptedMetadataBytes = textEncoder.encode(JSON.stringify(serializedMetadata));

      const walrus = await config.walrus.uploadEncryptedBlob({
        encryptedContent: encryptedFileBytes,
        epochs: config.walrusEpochs,
        deletable: config.walrusDeletable,
        sendObjectTo: signerAddress,
      });

      preparedItems.push({
        item,
        signerAddress,
        auditPackId,
        commitment,
        encryptedFile: serializedFile,
        encryptedMetadata: serializedMetadata,
        encryptedMetadataBytes,
        walrus,
      });
    }

    const chain = await config.registerOnChain({
      signerAddress: input.signerAddress,
      items: preparedItems.map((prepared) => ({
        commitment: prepared.commitment,
        commitmentBytes: hexToBytes(prepared.commitment),
        walrusBlobId: prepared.walrus.blobId,
        walrusBlobIdBytes: textEncoder.encode(prepared.walrus.blobId),
        encryptedMetadata: prepared.encryptedMetadataBytes,
        assertions: prepared.item.assertions,
        auditPackId: prepared.auditPackId,
        signerAddress: prepared.signerAddress,
      })),
    });

    return {
      transactionDigest: chain.transactionDigest,
      warnings: [
        "Walrus stores public blobs; only encrypted file and metadata payloads were uploaded or registered.",
        "Verification proves integrity against the commitment, not document truth or audit sufficiency.",
      ],
      items: preparedItems.map((prepared, index) => {
        const chainItem = chain.items[index];
        const evidence: EvidenceRecord = {
          id: chainItem.evidenceId,
          commitment: prepared.commitment,
          status: "registered",
          assertions: prepared.item.assertions,
          metadata: prepared.item.metadata,
          blobId: prepared.walrus.blobId,
          auditPackId: prepared.auditPackId,
          registrantAddress: chainItem.registrantAddress ?? prepared.signerAddress,
          registeredAt: chainItem.registeredAt,
          proof: {
            evidenceId: chainItem.evidenceId,
            packageId: chainItem.packageId,
            transactionDigest: chainItem.transactionDigest,
            walrusBlobId: prepared.walrus.blobId,
            auditPackId: prepared.auditPackId,
          },
        };

        return {
          clientId: prepared.item.clientId,
          evidence,
          transactionDigest: chainItem.transactionDigest,
          warnings: [],
          artifacts: {
            commitment: prepared.commitment,
            encryptedFile: prepared.encryptedFile,
            encryptedMetadata: prepared.encryptedMetadata,
            walrus: prepared.walrus,
          },
        };
      }),
    };
  };
}

export function createRegisterEvidenceFlow(
  config: CreateRegisterEvidenceFlowConfig,
): (input: RegisterEvidenceInput) => Promise<RegisterEvidenceWithArtifactsResult> {
  const tatum =
    config.tatum ??
    createTatumSuiClient({
      apiKey: required(config.tatumApiKey, "TATUM_API_KEY"),
      network: config.tatumNetwork ?? "testnet",
      endpoint: config.tatumEndpoint,
      fetchFn: config.fetchFn,
    });
  const walrus =
    config.walrus ??
    createWalrusClient({
      network: config.walrusNetwork ?? "testnet",
      publisherUrl: config.walrusPublisherUrl,
      aggregatorUrl: config.walrusAggregatorUrl,
      fetchFn: config.fetchFn,
    });
  const registerOnChain = createSuiRegisterOnChainHandler({
    packageId: config.packageId,
    signerAddress: config.signerAddress,
    tatum,
    signTransaction: config.signTransaction,
    network: config.tatumNetwork ?? "testnet",
    clockObjectId: config.clockObjectId,
  });

  return createRegisterEvidenceHandler({
    encryptionKey: config.encryptionKey,
    walrus,
    registerOnChain,
    walrusEpochs: config.walrusEpochs,
    walrusDeletable: config.walrusDeletable,
    exportEncryptionKey: config.exportEncryptionKey,
  });
}

export function createBatchRegisterEvidenceFlow(
  config: CreateRegisterEvidenceFlowConfig,
): (input: BatchRegisterEvidenceInput) => Promise<BatchRegisterEvidenceWithArtifactsResult> {
  const tatum =
    config.tatum ??
    createTatumSuiClient({
      apiKey: required(config.tatumApiKey, "TATUM_API_KEY"),
      network: config.tatumNetwork ?? "testnet",
      endpoint: config.tatumEndpoint,
      fetchFn: config.fetchFn,
    });
  const walrus =
    config.walrus ??
    createWalrusClient({
      network: config.walrusNetwork ?? "testnet",
      publisherUrl: config.walrusPublisherUrl,
      aggregatorUrl: config.walrusAggregatorUrl,
      fetchFn: config.fetchFn,
    });
  const registerOnChain = createSuiBatchRegisterOnChainHandler({
    packageId: config.packageId,
    signerAddress: config.signerAddress,
    tatum,
    signTransaction: config.signTransaction,
    network: config.tatumNetwork ?? "testnet",
    clockObjectId: config.clockObjectId,
  });

  return createBatchRegisterEvidenceHandler({
    encryptionKey: config.encryptionKey,
    walrus,
    registerOnChain,
    walrusEpochs: config.walrusEpochs,
    walrusDeletable: config.walrusDeletable,
    exportEncryptionKey: config.exportEncryptionKey,
  });
}

export function createRegisterEvidenceFlowFromEnv(
  config: CreateRegisterEvidenceFlowFromEnvConfig,
): (input: RegisterEvidenceInput) => Promise<RegisterEvidenceWithArtifactsResult> {
  return createRegisterEvidenceFlow({
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
    walrusNetwork: config.walrusNetwork ?? parseWalrusNetwork(config.env.WALRUS_NETWORK),
    walrusPublisherUrl: config.walrusPublisherUrl ?? config.env.WALRUS_PUBLISHER_URL,
    walrusAggregatorUrl: config.walrusAggregatorUrl ?? config.env.WALRUS_AGGREGATOR_URL,
  });
}

export function createRegisterEvidenceClient(config: CreateRegisterEvidenceFlowConfig): LinowClient {
  return createLinowClient({
    register: createRegisterEvidenceFlow(config),
  });
}

export function createSuiRegisterOnChainHandler(
  config: CreateSuiRegisterOnChainHandlerConfig,
): (input: RegisterEvidenceChainInput) => Promise<RegisterEvidenceChainResult> {
  return async function registerOnChain(input) {
    const signerAddress = input.signerAddress ?? config.signerAddress;
    const transaction = new Transaction();
    transaction.setSender(signerAddress);

    const [record] = transaction.moveCall({
      target: `${config.packageId}::evidence::register_evidence`,
      arguments: [
        transaction.pure.vector("u8", Array.from(input.commitmentBytes)),
        transaction.pure.vector("u8", Array.from(input.walrusBlobIdBytes)),
        transaction.pure.vector("u8", Array.from(input.encryptedMetadata)),
        transaction.pure.vector("u8", Array.from(input.assertions)),
        transaction.pure.option("id", input.auditPackId ?? null),
        transaction.object(config.clockObjectId ?? SUI_CLOCK_OBJECT_ID),
      ],
    });

    transaction.transferObjects([record], signerAddress);

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
      evidenceId: extractEvidenceId(execution),
      transactionDigest: extractTransactionDigest(execution),
      packageId: config.packageId,
      registrantAddress: signerAddress,
      registeredAt: new Date().toISOString(),
    };
  };
}

export function createSuiBatchRegisterOnChainHandler(
  config: CreateSuiRegisterOnChainHandlerConfig,
): (input: BatchRegisterEvidenceChainInput) => Promise<BatchRegisterEvidenceChainResult> {
  return async function batchRegisterOnChain(input) {
    if (input.items.length === 0) {
      throw new Error("At least one evidence item is required for batch registration.");
    }

    const signerAddress = input.signerAddress ?? input.items[0]?.signerAddress ?? config.signerAddress;
    const transaction = new Transaction();
    transaction.setSender(signerAddress);

    const records = input.items.map((item) =>
      transaction.moveCall({
        target: `${config.packageId}::evidence::register_evidence`,
        arguments: [
          transaction.pure.vector("u8", Array.from(item.commitmentBytes)),
          transaction.pure.vector("u8", Array.from(item.walrusBlobIdBytes)),
          transaction.pure.vector("u8", Array.from(item.encryptedMetadata)),
          transaction.pure.vector("u8", Array.from(item.assertions)),
          transaction.pure.option("id", item.auditPackId ?? null),
          transaction.object(config.clockObjectId ?? SUI_CLOCK_OBJECT_ID),
        ],
      }),
    );

    transaction.transferObjects(records, signerAddress);

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

    const transactionDigest = extractTransactionDigest(execution);
    const evidenceIds = extractEvidenceIds(execution, input.items.length);
    const registeredAt = new Date().toISOString();

    return {
      transactionDigest,
      items: evidenceIds.map((evidenceId) => ({
        evidenceId,
        transactionDigest,
        packageId: config.packageId,
        registrantAddress: signerAddress,
        registeredAt,
      })),
    };
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required to create the register evidence flow.`);
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

function parseWalrusNetwork(value: string | undefined): WalrusNetwork | undefined {
  if (!value) {
    return undefined;
  }

  if (value === "mainnet" || value === "testnet") {
    return value;
  }

  throw new Error(`Unsupported Walrus network: ${value}`);
}

function toSuiChain(network: TatumSuiNetwork): SignRegisterEvidenceTransactionInput["chain"] {
  if (network === "mainnet") {
    return "sui:mainnet";
  }

  if (network === "devnet") {
    return "sui:devnet";
  }

  return "sui:testnet";
}

function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 !== 0) {
    throw new Error("Hex string must have an even length.");
  }

  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }

  return bytes;
}

function extractEvidenceId(execution: unknown): string {
  const objectChanges = getObjectChanges(execution);
  const createdEvidence = objectChanges.find(
    (change) =>
      change &&
      typeof change === "object" &&
      "objectType" in change &&
      typeof change.objectType === "string" &&
      change.objectType.endsWith("::evidence::EvidenceRecord") &&
      "objectId" in change &&
      typeof change.objectId === "string",
  );

  if (createdEvidence && "objectId" in createdEvidence && typeof createdEvidence.objectId === "string") {
    return createdEvidence.objectId;
  }

  const events = getEvents(execution);
  const registrationEvent = events.find(
    (event) =>
      event &&
      typeof event === "object" &&
      "type" in event &&
      typeof event.type === "string" &&
      event.type.endsWith("::evidence::EvidenceRegistered"),
  );

  if (
    registrationEvent &&
    "parsedJson" in registrationEvent &&
    registrationEvent.parsedJson &&
    typeof registrationEvent.parsedJson === "object" &&
    "evidence_id" in registrationEvent.parsedJson &&
    typeof registrationEvent.parsedJson.evidence_id === "string"
  ) {
    return registrationEvent.parsedJson.evidence_id;
  }

  throw new Error("Could not find created EvidenceRecord ID in Sui execution result.");
}

function extractEvidenceIds(execution: unknown, expectedCount: number): string[] {
  const objectChangeIds = getObjectChanges(execution)
    .filter(
      (change) =>
        "objectType" in change &&
        typeof change.objectType === "string" &&
        change.objectType.endsWith("::evidence::EvidenceRecord") &&
        "objectId" in change &&
        typeof change.objectId === "string",
    )
    .map((change) => change.objectId as string);

  if (objectChangeIds.length >= expectedCount) {
    return objectChangeIds.slice(0, expectedCount);
  }

  const eventIds = getEvents(execution)
    .filter(
      (event) =>
        "type" in event &&
        typeof event.type === "string" &&
        event.type.endsWith("::evidence::EvidenceRegistered") &&
        "parsedJson" in event &&
        event.parsedJson &&
        typeof event.parsedJson === "object" &&
        "evidence_id" in event.parsedJson &&
        typeof event.parsedJson.evidence_id === "string",
    )
    .map((event) => (event.parsedJson as { evidence_id: string }).evidence_id);

  if (eventIds.length >= expectedCount) {
    return eventIds.slice(0, expectedCount);
  }

  throw new Error(`Could not find ${expectedCount} created EvidenceRecord IDs in Sui execution result.`);
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
