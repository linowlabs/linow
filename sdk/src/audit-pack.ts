import { Transaction } from "@mysten/sui/transactions";
import { createLinowClient, type LinowClient } from "./client.js";
import { createTatumSuiClient, type TatumSuiClient, type TatumSuiNetwork } from "./tatum.js";
import type { JsonValue } from "./tatum.js";
import type {
  AssertionId,
  AuditPack,
  AuditPackStatus,
  BlobId,
  EvidenceId,
  IsoTimestamp,
  WalletAddress,
} from "./types.js";

export interface CreateAuditPackChainInput {
  encryptedDetails: Uint8Array;
  signerAddress?: WalletAddress;
}

export interface CreateAuditPackChainResult {
  packId: string;
  transactionDigest?: string;
  packageId?: string;
  owner?: WalletAddress;
  createdAt?: string;
}

export interface CreateSuiCreateAuditPackHandlerConfig {
  packageId: string;
  signerAddress: WalletAddress;
  tatum: Pick<TatumSuiClient, "executeTransactionBlock">;
  signTransaction: SignAuditPackTransaction;
  network?: TatumSuiNetwork;
  clockObjectId?: string;
}

export interface CreateAuditPackFlowConfig {
  packageId: string;
  signerAddress: WalletAddress;
  signTransaction: SignAuditPackTransaction;
  tatumApiKey?: string;
  tatum?: Pick<TatumSuiClient, "executeTransactionBlock">;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
  clockObjectId?: string;
  fetchFn?: typeof fetch;
}

export interface AuditPackEnvironment {
  LINOW_PACKAGE_ID?: string;
  NEXT_PUBLIC_LINOW_PACKAGE_ID?: string;
  TATUM_API_KEY?: string;
  TATUM_SUI_NETWORK?: string;
  TATUM_SUI_ENDPOINT?: string;
}

export interface CreateAuditPackFlowFromEnvConfig
  extends Omit<
    CreateAuditPackFlowConfig,
    "packageId" | "tatumApiKey" | "tatumNetwork" | "tatumEndpoint"
  > {
  env: AuditPackEnvironment;
  packageId?: string;
  tatumApiKey?: string;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
}

export interface SignAuditPackTransactionInput {
  transaction: Transaction;
  chain: "sui:mainnet" | "sui:testnet" | "sui:devnet";
}

export interface SignAuditPackTransactionResult {
  bytes: string;
  signature: string | string[];
}

export type SignAuditPackTransaction = (
  input: SignAuditPackTransactionInput
) => Promise<SignAuditPackTransactionResult>;

export interface CreateAuditPackResult {
  pack: AuditPack;
  transactionDigest?: string;
  warnings: string[];
}

export interface GetAuditPackInput {
  packId: string;
}

export interface GetAuditPackResult {
  pack: AuditPack | null;
  fetchedAt: IsoTimestamp;
}

export interface CreateSuiGetAuditPackHandlerConfig {
  tatum: Pick<TatumSuiClient, "getObject">;
  packageId?: string;
}

export function createAuditPackFlow(
  config: CreateAuditPackFlowConfig
): (input: CreateAuditPackChainInput) => Promise<CreateAuditPackResult> {
  const tatum =
    config.tatum ??
    createTatumSuiClient({
      apiKey: required(config.tatumApiKey, "TATUM_API_KEY"),
      network: config.tatumNetwork ?? "testnet",
      endpoint: config.tatumEndpoint,
      fetchFn: config.fetchFn,
    });

  const createOnChain = createSuiCreateAuditPackHandler({
    packageId: config.packageId,
    signerAddress: config.signerAddress,
    tatum,
    signTransaction: config.signTransaction,
    network: config.tatumNetwork ?? "testnet",
    clockObjectId: config.clockObjectId,
  });

  return async function create(input) {
    const chain = await createOnChain(input);

    const pack: AuditPack = {
      id: chain.packId,
      owner: chain.owner ?? config.signerAddress,
      evidenceIds: [],
      findingHashes: [],
      memoryBlobId: undefined,
      assertionsCovered: [],
      status: 0,
      createdAt: chain.createdAt ?? new Date().toISOString(),
    };

    return {
      pack,
      transactionDigest: chain.transactionDigest,
      warnings: [
        "Audit pack creation is on-chain only. Memory and evidence links must be added separately.",
      ],
    };
  };
}

export function createAuditPackFlowFromEnv(
  config: CreateAuditPackFlowFromEnvConfig
) {
  return createAuditPackFlow({
    ...config,
    packageId:
      config.packageId ??
      required(
        config.env.LINOW_PACKAGE_ID ?? config.env.NEXT_PUBLIC_LINOW_PACKAGE_ID,
        "LINOW_PACKAGE_ID or NEXT_PUBLIC_LINOW_PACKAGE_ID"
      ),
    tatumApiKey: config.tatumApiKey ?? config.env.TATUM_API_KEY,
    tatumNetwork:
      config.tatumNetwork ?? parseTatumNetwork(config.env.TATUM_SUI_NETWORK),
    tatumEndpoint: config.tatumEndpoint ?? config.env.TATUM_SUI_ENDPOINT,
  });
}

export function createAuditPackClient(
  config: CreateAuditPackFlowConfig
): LinowClient {
  return createLinowClient({
    createAuditPack: createAuditPackFlow(config),
  });
}

export function createSuiCreateAuditPackHandler(
  config: CreateSuiCreateAuditPackHandlerConfig
): (input: CreateAuditPackChainInput) => Promise<CreateAuditPackChainResult> {
  return async function createOnChain(input) {
    const signerAddress = input.signerAddress ?? config.signerAddress;
    const transaction = new Transaction();
    transaction.setSender(signerAddress);

    const [pack] = transaction.moveCall({
      target: `${config.packageId}::audit_pack::create_audit_pack`,
      arguments: [
        transaction.pure.vector("u8", Array.from(input.encryptedDetails)),
        transaction.object(config.clockObjectId ?? SUI_CLOCK_OBJECT_ID),
      ],
    });

    transaction.transferObjects([pack], signerAddress);

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
      packId: extractPackId(execution),
      transactionDigest: extractTransactionDigest(execution),
      packageId: config.packageId,
      owner: signerAddress,
      createdAt: new Date().toISOString(),
    };
  };
}

export function createSuiGetAuditPackHandler(
  config: CreateSuiGetAuditPackHandlerConfig
): (input: GetAuditPackInput) => Promise<GetAuditPackResult> {
  return async function getPack(input) {
    const object = await config.tatum.getObject(input.packId, {
      showContent: true,
      showOwner: true,
      showPreviousTransaction: true,
      showType: true,
    });

    return {
      pack: parseAuditPackObject(object, input.packId, config.packageId),
      fetchedAt: new Date().toISOString(),
    };
  };
}

export function parseAuditPackObject(
  object: JsonValue,
  fallbackPackId: string,
  packageId?: string
): AuditPack | null {
  const root = asRecord(object);
  const data = asRecord(root?.data) ?? root;
  const content = asRecord(data?.content);

  if (asRecord(data?.error)) {
    return null;
  }

  const objectType = getString(data?.type) ?? getString(content?.type);
  if (!objectType?.endsWith("::audit_pack::AuditPack")) {
    return null;
  }

  if (packageId && !objectType.startsWith(`${packageId}::`)) {
    throw new Error(`Sui object ${fallbackPackId} is not from package ${packageId}.`);
  }

  const fields = asRecord(content?.fields);
  if (!fields) {
    throw new Error(`Sui object ${fallbackPackId} did not include Move object fields.`);
  }

  const id = getString(data?.objectId) ?? getObjectId(fields.id) ?? fallbackPackId;
  const owner = getString(fields.owner);
  const auditor = getString(fields.auditor);
  const status = Number(fields.status);
  const createdAt = parseTimestampMs(fields.created_at);
  const evidenceIds = parseIdVector(fields.evidence_ids);
  const findingHashes = parseHashVector(fields.finding_hashes);
  const memoryBlobId = getString(fields.memory_blob_id);
  const assertionsCovered = parseAssertionVector(fields.assertions_covered);

  return {
    id,
    owner: owner ?? "",
    auditor: auditor ?? undefined,
    evidenceIds,
    findingHashes,
    memoryBlobId: memoryBlobId ?? undefined,
    assertionsCovered,
    status,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required to create the audit pack flow.`);
  }
  return value;
}

function parseTatumNetwork(value: string | undefined): TatumSuiNetwork | undefined {
  if (!value) return undefined;
  if (value === "mainnet" || value === "testnet" || value === "devnet") return value;
  throw new Error(`Unsupported Tatum Sui network: ${value}`);
}

function toSuiChain(network: TatumSuiNetwork): SignAuditPackTransactionInput["chain"] {
  if (network === "mainnet") return "sui:mainnet";
  if (network === "devnet") return "sui:devnet";
  return "sui:testnet";
}

function extractPackId(execution: unknown): string {
  const objectChanges = getObjectChanges(execution);
  const created = objectChanges.find(
    (c) =>
      c &&
      typeof c === "object" &&
      "objectType" in c &&
      typeof c.objectType === "string" &&
      c.objectType.endsWith("::audit_pack::AuditPack") &&
      "objectId" in c &&
      typeof c.objectId === "string"
  );
  if (created && "objectId" in created && typeof created.objectId === "string") {
    return created.objectId;
  }
  throw new Error("Could not find created AuditPack ID in execution result.");
}

function extractTransactionDigest(execution: unknown): string | undefined {
  if (execution && typeof execution === "object" && "digest" in execution && typeof execution.digest === "string") {
    return execution.digest;
  }
  return undefined;
}

function getObjectChanges(execution: unknown): Array<Record<string, unknown>> {
  if (execution && typeof execution === "object" && "objectChanges" in execution && Array.isArray(execution.objectChanges)) {
    return execution.objectChanges.filter((c): c is Record<string, unknown> => typeof c === "object");
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getObjectId(value: unknown): string | undefined {
  const r = asRecord(value);
  return getString(r?.id);
}

function parseTimestampMs(value: unknown): string | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(n).toISOString();
}

function parseIdVector(value: unknown): EvidenceId[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v : getString(asRecord(v)?.id)))
    .filter((v): v is string => !!v);
}

function parseHashVector(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (Array.isArray(v)) {
        return v.map((b) => Number(b).toString(16).padStart(2, "0")).join("");
      }
      return typeof v === "string" ? v : undefined;
    })
    .filter((v): v is string => !!v);
}

function parseAssertionVector(value: unknown): AssertionId[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => Number(v))
    .filter((n): n is AssertionId => Number.isInteger(n) && n >= 0 && n <= 7);
}

const SUI_CLOCK_OBJECT_ID = "0x6";