import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableStringify } from "@/lib/agent/artifacts";
import { AGENT_CONFIG } from "@/lib/agent/config";
import type { OrchestrationDocumentInput } from "@/lib/agent/orchestrate";
import type { AssertionMappingBundle } from "@/lib/agent/map-assertions";
import type {
  EvidenceClassificationOutput,
  MetadataExtractionOutput,
} from "@/lib/agent/schemas";
import {
  AGENT_SCHEMA_VERSION,
  isEvidenceClassificationOutput,
  isMetadataExtractionOutput,
} from "@/lib/agent/schemas";
import { isAssertionMappingBundle } from "@/lib/agent/map-assertions";
import type { AgentProviderName } from "@/lib/agent/provider-types";

interface CachedDocumentAnalysisRecord {
  cache_version: string;
  schema_version: string;
  stored_at: string;
  cache_key: string;
  provider: AgentProviderName;
  mode: "compact" | "multi_pass";
  classification: EvidenceClassificationOutput;
  metadata: MetadataExtractionOutput;
  assertion_bundle: AssertionMappingBundle;
}

export interface CachedDocumentAnalysisBundle {
  cacheKey: string;
  classification: EvidenceClassificationOutput;
  metadata: MetadataExtractionOutput;
  assertionBundle: AssertionMappingBundle;
}

export async function readCachedDocumentAnalysis(input: {
  provider: AgentProviderName;
  document: OrchestrationDocumentInput;
  mode: "compact" | "multi_pass";
}): Promise<CachedDocumentAnalysisBundle | null> {
  if (!AGENT_CONFIG.cache.enableDocumentAnalysisReuse) {
    return null;
  }

  const cacheKey = buildDocumentAnalysisCacheKey(input);
  const cachePath = getDocumentAnalysisCachePath(cacheKey);

  try {
    const raw = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isCachedDocumentAnalysisRecord(parsed, cacheKey, input.mode)) {
      return null;
    }

    return {
      cacheKey,
      classification: parsed.classification,
      metadata: parsed.metadata,
      assertionBundle: parsed.assertion_bundle,
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    return null;
  }
}

export async function writeCachedDocumentAnalysis(input: {
  provider: AgentProviderName;
  document: OrchestrationDocumentInput;
  mode: "compact" | "multi_pass";
  classification: EvidenceClassificationOutput;
  metadata: MetadataExtractionOutput;
  assertionBundle: AssertionMappingBundle;
}): Promise<string> {
  const cacheKey = buildDocumentAnalysisCacheKey(input);

  if (!AGENT_CONFIG.cache.enableDocumentAnalysisReuse) {
    return cacheKey;
  }

  const cachePath = getDocumentAnalysisCachePath(cacheKey);
  const payload: CachedDocumentAnalysisRecord = {
    cache_version: AGENT_CONFIG.cache.documentAnalysisVersion,
    schema_version: AGENT_SCHEMA_VERSION,
    stored_at: new Date().toISOString(),
    cache_key: cacheKey,
    provider: input.provider,
    mode: input.mode,
    classification: input.classification,
    metadata: input.metadata,
    assertion_bundle: input.assertionBundle,
  };

  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(payload, null, 2), "utf8");

  return cacheKey;
}

function buildDocumentAnalysisCacheKey(input: {
  provider: AgentProviderName;
  document: OrchestrationDocumentInput;
  mode: "compact" | "multi_pass";
}): string {
  const fingerprint = stableStringify({
    cache_version: AGENT_CONFIG.cache.documentAnalysisVersion,
    schema_version: AGENT_SCHEMA_VERSION,
    provider: input.provider,
    mode: input.mode,
    document_id: input.document.documentId,
    document_name: input.document.documentName,
    document_text: input.document.documentText,
    context: input.document.context ?? null,
  });

  return createHash("sha256").update(fingerprint, "utf8").digest("hex");
}

function getDocumentAnalysisCachePath(cacheKey: string): string {
  return path.resolve(process.cwd(), AGENT_CONFIG.cache.documentAnalysisDir, `${cacheKey}.json`);
}

function isCachedDocumentAnalysisRecord(
  value: unknown,
  expectedCacheKey: string,
  expectedMode: "compact" | "multi_pass",
): value is CachedDocumentAnalysisRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.cache_version === AGENT_CONFIG.cache.documentAnalysisVersion &&
    candidate.schema_version === AGENT_SCHEMA_VERSION &&
    candidate.cache_key === expectedCacheKey &&
    (candidate.provider === "groq" || candidate.provider === "gemini") &&
    candidate.mode === expectedMode &&
    isEvidenceClassificationOutput(candidate.classification) &&
    isMetadataExtractionOutput(candidate.metadata) &&
    isAssertionMappingBundle(candidate.assertion_bundle)
  );
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
