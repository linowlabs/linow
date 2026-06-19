import { NextResponse } from "next/server";
import {
  createWalrusClient,
  importEncryptionKey,
  readEncryptedAgentArtifact,
  readEncryptedMemoryManifest,
  type WalrusMemoryManifest,
  type WalrusNetwork,
} from "@linow/sdk";
import { getServerEnv } from "@/lib/server-env";

interface AgentMemoryBundleLike {
  schema_name?: string;
  schema_version?: string;
  pack_id?: string;
  created_at?: string;
  memory_payload?: {
    documents?: unknown[];
    output_hashes?: unknown[];
    artifact_catalog?: unknown[];
    findings?: unknown[];
  };
  recall_summary?: {
    recalled_count?: number;
    notes?: unknown[];
    items?: unknown[];
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      manifestBlobId?: string;
      artifactBlobId?: string;
      network?: WalrusNetwork;
    };

    if (!body.manifestBlobId || !body.artifactBlobId) {
      return NextResponse.json(
        { error: "manifestBlobId and artifactBlobId are required." },
        { status: 400 },
      );
    }

    const rawKey = getServerEnv("LINOW_AGENT_MEMORY_ENCRYPTION_KEY");
    if (!rawKey) {
      return NextResponse.json(
        { error: "LINOW_AGENT_MEMORY_ENCRYPTION_KEY is not configured on the server." },
        { status: 400 },
      );
    }

    const network = parseWalrusNetwork(body.network ?? getServerEnv("WALRUS_NETWORK"));
    const walrus = createWalrusClient({
      network,
      publisherUrl: getServerEnv("WALRUS_PUBLISHER_URL"),
      aggregatorUrl: getServerEnv("WALRUS_AGGREGATOR_URL"),
    });
    const encryptionKey = await importEncryptionKey(parseEncodedKeyMaterial(rawKey));
    const manifest = await readEncryptedMemoryManifest(walrus, body.manifestBlobId, encryptionKey);
    const artifact = await readEncryptedAgentArtifact<AgentMemoryBundleLike>(
      walrus,
      body.artifactBlobId,
      encryptionKey,
    );

    return NextResponse.json({
      status: "reloaded",
      encrypted: true,
      network,
      manifestBlobId: body.manifestBlobId,
      artifactBlobId: body.artifactBlobId,
      manifest: summarizeManifest(manifest),
      artifact: summarizeArtifact(artifact),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Walrus memory reload failed." },
      { status: 500 },
    );
  }
}

function summarizeManifest(manifest: WalrusMemoryManifest) {
  return {
    schemaName: manifest.schemaName,
    schemaVersion: manifest.schemaVersion,
    packId: manifest.packId,
    createdAt: manifest.createdAt,
    evidenceRefCount: manifest.evidenceRefs.length,
    agentOutputHashCount: manifest.agentOutputHashes.length,
    findingHashCount: manifest.findingHashes.length,
    owner: manifest.auditPackMeta.owner,
    auditor: manifest.auditPackMeta.auditor,
  };
}

function summarizeArtifact(artifact: AgentMemoryBundleLike) {
  const memoryPayload = artifact.memory_payload ?? {};
  const recallSummary = artifact.recall_summary ?? {};

  return {
    schemaName: artifact.schema_name,
    schemaVersion: artifact.schema_version,
    packId: artifact.pack_id,
    createdAt: artifact.created_at,
    documentCount: Array.isArray(memoryPayload.documents) ? memoryPayload.documents.length : 0,
    outputHashCount: Array.isArray(memoryPayload.output_hashes) ? memoryPayload.output_hashes.length : 0,
    artifactCount: Array.isArray(memoryPayload.artifact_catalog) ? memoryPayload.artifact_catalog.length : 0,
    findingCount: Array.isArray(memoryPayload.findings) ? memoryPayload.findings.length : 0,
    recalledCount: typeof recallSummary.recalled_count === "number" ? recallSummary.recalled_count : 0,
    recallNoteCount: Array.isArray(recallSummary.notes) ? recallSummary.notes.length : 0,
    recallItemCount: Array.isArray(recallSummary.items) ? recallSummary.items.length : 0,
  };
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
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
