import {
  createStagingMemWalClient,
  createWalrusClient,
  importEncryptionKey,
  storeAgentOutputsInMemWal,
  uploadEncryptedAgentArtifact,
  uploadEncryptedMemoryManifest,
  type WalrusMemoryManifest,
  type WalrusNetwork,
} from "@linow/sdk";
import type {
  AgentDocumentProofReference,
  AgentOrchestrationResult,
  OrchestrationArtifactReference,
} from "@/lib/agent/orchestration-contract";
import { getServerEnv } from "@/lib/server-env";

const MEMORY_BUNDLE_SCHEMA_VERSION = "1.0.0";
const FALLBACK_PACK_OWNER = "pending_owner_link";

export interface PreparedAgentActionCandidate {
  pack_id: string;
  evidence_id?: string;
  action_type: string;
  agent_output_hash: string;
  target_kind: OrchestrationArtifactReference["target_kind"];
  target_id: string;
  document_id?: string;
  finding_id?: string;
  requires_human_approval: true;
}

export interface AgentWeb3PersistenceResult {
  memory_namespace: string;
  manifest: {
    manifest: WalrusMemoryManifest;
    total_documents: number;
    linked_documents: number;
    complete_evidence_refs: number;
  };
  memwal: {
    status: "stored" | "skipped" | "failed";
    namespace: string;
    reason?: string;
    error?: string;
  };
  walrus: {
    status: "stored" | "skipped" | "failed";
    encrypted: true;
    network?: WalrusNetwork;
    manifest_blob_id?: string;
    artifact_blob_id?: string;
    reason?: string;
    error?: string;
  };
  sui: {
    status: "prepared";
    requires_human_approval: true;
    action_candidates: PreparedAgentActionCandidate[];
  };
}

interface WalrusAgentMemoryBundle {
  schema_name: "agent_memory_bundle";
  schema_version: string;
  pack_id: string;
  created_at: string;
  review_bundle: AgentOrchestrationResult["review_bundle"];
  artifact_catalog: AgentOrchestrationResult["artifact_catalog"];
  documents: AgentOrchestrationResult["documents"];
  gap_analysis: AgentOrchestrationResult["gap_analysis"];
  findings: AgentOrchestrationResult["findings"];
  audit_pack_summary: AgentOrchestrationResult["audit_pack_summary"];
  flow: AgentOrchestrationResult["flow"];
}

export async function persistAgentOutputsForWeb3(
  result: AgentOrchestrationResult,
): Promise<AgentWeb3PersistenceResult> {
  const manifest = buildWalrusMemoryManifest(result);
  const memoryNamespace = result.persistence.memory_namespace;
  const memwal = await persistToMemWal(result, memoryNamespace);
  const walrus = await persistToWalrus(result, manifest);

  return {
    memory_namespace: memoryNamespace,
    manifest: {
      manifest,
      total_documents: result.documents.length,
      linked_documents: countLinkedDocuments(result.documents.map((document) => document.evidence_ref)),
      complete_evidence_refs: manifest.evidenceRefs.length,
    },
    memwal,
    walrus,
    sui: {
      status: "prepared",
      requires_human_approval: true,
      action_candidates: buildAgentActionCandidates(result),
    },
  };
}

export function buildWalrusMemoryManifest(result: AgentOrchestrationResult): WalrusMemoryManifest {
  return {
    schemaName: "memory_manifest",
    schemaVersion: "1.0.0",
    packId: result.pack_id,
    createdAt: new Date().toISOString(),
    evidenceRefs: result.documents
      .map((document) => document.evidence_ref)
      .filter(hasCompleteEvidenceRef)
      .map((evidenceRef) => ({
        evidenceId: evidenceRef.evidence_id,
        walrusBlobId: evidenceRef.walrus_blob_id,
        commitment: evidenceRef.commitment,
      })),
    agentOutputHashes: result.artifact_catalog.map((artifact) => ({
      schemaName: artifact.schema_name,
      schemaVersion: artifact.schema_version,
      outputHash: artifact.sha256,
    })),
    findingHashes: result.artifact_catalog
      .filter((artifact) => artifact.target_kind === "finding")
      .map((artifact) => artifact.sha256),
    auditPackMeta: {
      owner: result.pack_owner_address ?? FALLBACK_PACK_OWNER,
      auditor: result.auditor_address,
    },
  };
}

function buildAgentActionCandidates(result: AgentOrchestrationResult): PreparedAgentActionCandidate[] {
  const evidenceIdByDocumentId = new Map(
    result.documents
      .filter((document) => document.evidence_ref?.evidence_id)
      .map((document) => [document.document_id, document.evidence_ref?.evidence_id]),
  );

  return result.artifact_catalog.map((artifact) => ({
    pack_id: result.pack_id,
    evidence_id: artifact.document_id ? evidenceIdByDocumentId.get(artifact.document_id) : undefined,
    action_type: artifact.action_type,
    agent_output_hash: artifact.sha256,
    target_kind: artifact.target_kind,
    target_id: artifact.target_id,
    document_id: artifact.document_id,
    finding_id: artifact.finding_id,
    requires_human_approval: true,
  }));
}

async function persistToMemWal(
  result: AgentOrchestrationResult,
  memoryNamespace: string,
): Promise<AgentWeb3PersistenceResult["memwal"]> {
  const privateKey = getServerEnv("MEMWAL_PRIVATE_KEY");
  const accountId = getServerEnv("MEMWAL_ACCOUNT_ID");

  if (!privateKey || !accountId) {
    return {
      status: "skipped",
      namespace: memoryNamespace,
      reason: "MEMWAL_PRIVATE_KEY or MEMWAL_ACCOUNT_ID is not configured.",
    };
  }

  try {
    const memwal = createStagingMemWalClient({
      privateKey,
      accountId,
      namespace: memoryNamespace,
    });
    await storeAgentOutputsInMemWal(memwal, result, result.pack_id);

    return {
      status: "stored",
      namespace: memoryNamespace,
    };
  } catch (error) {
    return {
      status: "failed",
      namespace: memoryNamespace,
      error: toErrorMessage(error),
    };
  }
}

async function persistToWalrus(
  result: AgentOrchestrationResult,
  manifest: WalrusMemoryManifest,
): Promise<AgentWeb3PersistenceResult["walrus"]> {
  const rawKey = getServerEnv("LINOW_AGENT_MEMORY_ENCRYPTION_KEY");

  if (!rawKey) {
    return {
      status: "skipped",
      encrypted: true,
      reason: "LINOW_AGENT_MEMORY_ENCRYPTION_KEY is not configured.",
    };
  }

  try {
    const walrusNetwork = parseWalrusNetwork(getServerEnv("WALRUS_NETWORK"));
    const walrus = createWalrusClient({
      network: walrusNetwork,
      publisherUrl: getServerEnv("WALRUS_PUBLISHER_URL"),
      aggregatorUrl: getServerEnv("WALRUS_AGGREGATOR_URL"),
    });
    const encryptionKey = await importEncryptionKey(parseEncodedKeyMaterial(rawKey));
    const manifestUpload = await uploadEncryptedMemoryManifest(walrus, manifest, encryptionKey);
    const artifactUpload = await uploadEncryptedAgentArtifact(
      walrus,
      buildWalrusAgentMemoryBundle(result, manifest.createdAt),
      encryptionKey,
    );

    return {
      status: "stored",
      encrypted: true,
      network: walrusNetwork,
      manifest_blob_id: manifestUpload.blobId,
      artifact_blob_id: artifactUpload.blobId,
    };
  } catch (error) {
    return {
      status: "failed",
      encrypted: true,
      network: parseWalrusNetwork(getServerEnv("WALRUS_NETWORK")),
      error: toErrorMessage(error),
    };
  }
}

function buildWalrusAgentMemoryBundle(
  result: AgentOrchestrationResult,
  createdAt: string,
): WalrusAgentMemoryBundle {
  return {
    schema_name: "agent_memory_bundle",
    schema_version: MEMORY_BUNDLE_SCHEMA_VERSION,
    pack_id: result.pack_id,
    created_at: createdAt,
    review_bundle: result.review_bundle,
    artifact_catalog: result.artifact_catalog,
    documents: result.documents,
    gap_analysis: result.gap_analysis,
    findings: result.findings,
    audit_pack_summary: result.audit_pack_summary,
    flow: result.flow,
  };
}

function hasCompleteEvidenceRef(
  value: AgentDocumentProofReference | undefined,
): value is Required<AgentDocumentProofReference> {
  return Boolean(value?.evidence_id && value.walrus_blob_id && value.commitment);
}

function countLinkedDocuments(evidenceRefs: Array<AgentDocumentProofReference | undefined>): number {
  return evidenceRefs.filter((value) => value?.evidence_id || value?.walrus_blob_id || value?.commitment).length;
}

function parseWalrusNetwork(value: string | undefined): WalrusNetwork {
  return value === "mainnet" ? "mainnet" : "testnet";
}

function parseEncodedKeyMaterial(value: string): Uint8Array {
  const trimmed = value.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return hexToBytes(trimmed);
  }

  return base64ToBytes(trimmed);
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }

  return bytes;
}

function base64ToBytes(value: string): Uint8Array {
  const bufferApi = globalThis as typeof globalThis & {
    Buffer?: {
      from(input: string, encoding: "base64"): Uint8Array;
    };
  };

  if (!bufferApi.Buffer) {
    throw new Error("No base64 decoder is available in this runtime.");
  }

  return new Uint8Array(bufferApi.Buffer.from(value, "base64"));
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
