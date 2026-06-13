import { createLinowClient, type LinowClient } from "./client.js";
import { hashFile } from "./crypto.js";
import { createTatumSuiClient, type JsonValue, type TatumSuiClient, type TatumSuiNetwork } from "./tatum.js";
import type {
  AssertionId,
  CommitmentHex,
  EvidenceId,
  EvidenceRecord,
  EvidenceStatus,
  GetEvidenceInput,
  GetEvidenceResult,
  VerificationResult,
  VerifyEvidenceInput,
} from "./types.js";

export interface CreateVerifyEvidenceHandlerConfig {
  getEvidence: (input: GetEvidenceInput) => Promise<GetEvidenceResult>;
}

export interface CreateSuiGetEvidenceHandlerConfig {
  tatum: Pick<TatumSuiClient, "getObject">;
  packageId?: string;
}

export interface CreateVerifyEvidenceFlowConfig {
  tatumApiKey?: string;
  tatum?: Pick<TatumSuiClient, "getObject">;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
  packageId?: string;
  fetchFn?: typeof fetch;
}

export interface VerifyEvidenceEnvironment {
  LINOW_PACKAGE_ID?: string;
  NEXT_PUBLIC_LINOW_PACKAGE_ID?: string;
  TATUM_API_KEY?: string;
  TATUM_SUI_NETWORK?: string;
  TATUM_SUI_ENDPOINT?: string;
}

export interface CreateVerifyEvidenceFlowFromEnvConfig
  extends Omit<CreateVerifyEvidenceFlowConfig, "tatumApiKey" | "tatumNetwork" | "tatumEndpoint" | "packageId"> {
  env: VerifyEvidenceEnvironment;
  tatumApiKey?: string;
  tatumNetwork?: TatumSuiNetwork;
  tatumEndpoint?: string;
  packageId?: string;
}

export function createVerifyEvidenceHandler(
  config: CreateVerifyEvidenceHandlerConfig,
): (input: VerifyEvidenceInput) => Promise<VerificationResult> {
  return async function verify(input) {
    const fetched = await config.getEvidence({ evidenceId: input.evidenceId });

    if (!fetched.evidence) {
      throw new Error(`EvidenceRecord ${input.evidenceId} was not found on Sui.`);
    }

    const actualCommitment = await hashFile(input.content);
    const expectedCommitment = fetched.evidence.commitment;
    const isMatch = actualCommitment === expectedCommitment;

    return {
      evidenceId: input.evidenceId,
      status: isMatch ? "match" : "mismatch",
      isMatch,
      tamperDetected: !isMatch,
      expectedCommitment,
      actualCommitment,
      checkedAt: new Date().toISOString(),
      evidence: fetched.evidence,
      limitations: [
        "Verification compares the supplied file hash against the on-chain commitment.",
        "A match proves integrity against the registered bytes, not document truth, source authenticity, or audit sufficiency.",
        "Encrypted Walrus content and encrypted metadata are not decrypted by this verification check.",
      ],
    };
  };
}

export function createSuiGetEvidenceHandler(
  config: CreateSuiGetEvidenceHandlerConfig,
): (input: GetEvidenceInput) => Promise<GetEvidenceResult> {
  return async function getEvidence(input) {
    const object = await config.tatum.getObject(input.evidenceId, {
      showContent: true,
      showOwner: true,
      showPreviousTransaction: true,
      showType: true,
    });

    return {
      evidence: parseEvidenceRecordObject(object, input.evidenceId, config.packageId),
      fetchedAt: new Date().toISOString(),
    };
  };
}

export function createVerifyEvidenceFlow(
  config: CreateVerifyEvidenceFlowConfig,
): (input: VerifyEvidenceInput) => Promise<VerificationResult> {
  const tatum =
    config.tatum ??
    createTatumSuiClient({
      apiKey: required(config.tatumApiKey, "TATUM_API_KEY"),
      network: config.tatumNetwork ?? "testnet",
      endpoint: config.tatumEndpoint,
      fetchFn: config.fetchFn,
    });
  const getEvidence = createSuiGetEvidenceHandler({
    tatum,
    packageId: config.packageId,
  });

  return createVerifyEvidenceHandler({ getEvidence });
}

export function createVerifyEvidenceFlowFromEnv(
  config: CreateVerifyEvidenceFlowFromEnvConfig,
): (input: VerifyEvidenceInput) => Promise<VerificationResult> {
  return createVerifyEvidenceFlow({
    ...config,
    packageId:
      config.packageId ?? config.env.LINOW_PACKAGE_ID ?? config.env.NEXT_PUBLIC_LINOW_PACKAGE_ID,
    tatumApiKey: config.tatumApiKey ?? config.env.TATUM_API_KEY,
    tatumNetwork: config.tatumNetwork ?? parseTatumNetwork(config.env.TATUM_SUI_NETWORK),
    tatumEndpoint: config.tatumEndpoint ?? config.env.TATUM_SUI_ENDPOINT,
  });
}

export function createVerifyEvidenceClient(config: CreateVerifyEvidenceFlowConfig): LinowClient {
  const getEvidence = createSuiGetEvidenceHandler({
    tatum:
      config.tatum ??
      createTatumSuiClient({
        apiKey: required(config.tatumApiKey, "TATUM_API_KEY"),
        network: config.tatumNetwork ?? "testnet",
        endpoint: config.tatumEndpoint,
        fetchFn: config.fetchFn,
      }),
    packageId: config.packageId,
  });

  return createLinowClient({
    getEvidence,
    verify: createVerifyEvidenceHandler({ getEvidence }),
  });
}

export function parseEvidenceRecordObject(
  object: JsonValue,
  fallbackEvidenceId: EvidenceId,
  packageId?: string,
): EvidenceRecord | null {
  const root = asRecord(object);
  const data = asRecord(root?.data) ?? root;
  const content = asRecord(data?.content);

  if (asRecord(data?.error)) {
    return null;
  }

  const objectType = getString(data?.type) ?? getString(content?.type);
  if (!objectType?.endsWith("::evidence::EvidenceRecord")) {
    return null;
  }

  if (packageId && !objectType.startsWith(`${packageId}::`)) {
    throw new Error(`Sui object ${fallbackEvidenceId} is not from package ${packageId}.`);
  }

  const fields = asRecord(content?.fields);
  if (!fields) {
    throw new Error(`Sui object ${fallbackEvidenceId} did not include Move object fields.`);
  }

  const id = getString(data?.objectId) ?? getObjectId(fields.id) ?? fallbackEvidenceId;
  const commitmentBytes = getByteVector(fields.evidence_commitment, "evidence_commitment");
  const walrusBlobIdBytes = getByteVector(fields.walrus_blob_id, "walrus_blob_id");
  const assertions = parseAssertionIds(getByteVector(fields.isa_assertions, "isa_assertions"));
  const status = parseEvidenceStatus(fields.status);
  const registeredAt = parseTimestampMs(fields.registered_at);
  const auditPackId = parseOptionalObjectId(fields.audit_pack_id);

  return {
    id,
    commitment: bytesToHex(commitmentBytes),
    status,
    assertions,
    metadata: {
      fileName: "Encrypted metadata on Sui",
      description: "Metadata is stored encrypted and is not decrypted during integrity verification.",
    },
    blobId: bytesToText(walrusBlobIdBytes),
    auditPackId,
    registrantAddress: getString(fields.registrant),
    registeredAt,
    proof: {
      evidenceId: id,
      packageId,
      walrusBlobId: bytesToText(walrusBlobIdBytes),
      auditPackId,
    },
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required to create the verify evidence flow.`);
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

function parseEvidenceStatus(value: unknown): EvidenceStatus {
  const status = Number(value);

  if (status === 2) {
    return "superseded";
  }

  if (status === 1) {
    return "underReview";
  }

  return "registered";
}

function parseAssertionIds(bytes: Uint8Array): AssertionId[] {
  return Array.from(bytes, (byte) => {
    if (byte >= 0 && byte <= 7) {
      return byte as AssertionId;
    }

    throw new Error(`Sui EvidenceRecord assertion ${byte} is not supported by the SDK.`);
  });
}

function parseTimestampMs(value: unknown): string | undefined {
  const timestamp = Number(value);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

function getByteVector(value: unknown, fieldName: string): Uint8Array {
  if (!Array.isArray(value) || !value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    throw new Error(`Sui EvidenceRecord field ${fieldName} was not a vector<u8>.`);
  }

  return Uint8Array.from(value);
}

function getObjectId(value: unknown): string | undefined {
  const record = asRecord(value);
  return getString(record?.id);
}

function parseOptionalObjectId(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  const record = asRecord(value);
  const fields = asRecord(record?.fields);
  const vec = fields?.vec;

  if (!Array.isArray(vec) || vec.length === 0) {
    return undefined;
  }

  return typeof vec[0] === "string" ? vec[0] : getObjectId(vec[0]);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function bytesToHex(bytes: Uint8Array): CommitmentHex {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToText(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

const textDecoder = new TextDecoder();
