import { AGENT_SCHEMA_VERSION } from "@/lib/agent/schemas";
import type {
  AgentMemoryDocumentRecord,
  AgentMemoryPayload,
  AgentRecallSummary,
  RecalledAgentMemoryItem,
} from "@/lib/agent/orchestration-contract";

interface AgentMemoryPayloadSource {
  pack_id: string;
  engagement_name: string;
  audit_area?: string;
  stage?: string;
  documents: AgentMemoryDocumentRecord[];
  gap_analysis: AgentMemoryPayload["gap_analysis"];
  findings: AgentMemoryPayload["findings"];
  audit_pack_summary: AgentMemoryPayload["audit_pack_summary"];
  artifact_catalog: AgentMemoryPayload["artifact_catalog"];
  review_bundle: AgentMemoryPayload["review_bundle"];
  persistence: {
    memory_namespace: string;
  };
  flow: AgentMemoryPayload["flow"];
}

export function buildAgentMemoryPayload(result: AgentMemoryPayloadSource): AgentMemoryPayload {
  return {
    schema_name: "agent_memory_payload",
    schema_version: AGENT_SCHEMA_VERSION,
    pack_id: result.pack_id,
    engagement_name: result.engagement_name,
    audit_area: result.audit_area,
    stage: result.stage,
    memory_namespace: result.persistence.memory_namespace,
    created_at: new Date().toISOString(),
    documents: result.documents.map((document) => buildAgentMemoryDocumentRecord(document)),
    gap_analysis: result.gap_analysis,
    findings: result.findings,
    audit_pack_summary: result.audit_pack_summary,
    artifact_catalog: result.artifact_catalog,
    output_hashes: result.review_bundle.output_hashes,
    review_bundle: result.review_bundle,
    flow: result.flow,
  };
}

export function buildAgentRecallSummary(
  packId: string,
  recalledMemories: Array<{ text: string; distance: number }>,
  limit: number,
): AgentRecallSummary {
  const items = recalledMemories.slice(0, limit).map((memory) => summarizeRecalledMemory(memory));
  const notes = items
    .map((item) => item.summary)
    .filter((note, index, values) => note.length > 0 && values.indexOf(note) === index);

  return {
    schema_name: "agent_recall_summary",
    schema_version: AGENT_SCHEMA_VERSION,
    pack_id: packId,
    recalled_count: recalledMemories.length,
    notes,
    items,
  };
}

function buildAgentMemoryDocumentRecord(
  document: AgentMemoryDocumentRecord,
): AgentMemoryDocumentRecord {
  return {
    document_id: document.document_id,
    filename: document.filename,
    evidence_ref: document.evidence_ref,
    analysis_source: document.analysis_source,
    cache_key: document.cache_key,
    classification: document.classification,
    metadata: document.metadata,
    assertion_mapping: document.assertion_mapping,
    source_confidence: document.source_confidence,
    hashes: document.hashes,
  };
}

function summarizeRecalledMemory(memory: { text: string; distance: number }): RecalledAgentMemoryItem {
  try {
    const parsed = JSON.parse(memory.text) as Record<string, unknown>;
    const schemaName = typeof parsed.schema_name === "string" ? parsed.schema_name : undefined;

    return {
      schema_name: schemaName,
      summary: buildRecallSummaryText(schemaName, parsed),
      distance: memory.distance,
    };
  } catch {
    return {
      summary: compactNote(`Prior memory: ${memory.text}`),
      distance: memory.distance,
    };
  }
}

function buildRecallSummaryText(schemaName: string | undefined, parsed: Record<string, unknown>): string {
  if (schemaName === "audit_pack_summary") {
    return compactNote(
      `Prior summary: readiness ${stringValue(parsed.readiness_score)}, findings ${countValue(parsed.finding_ids)}, missing ${countValue(parsed.missing_assertions)}.`,
    );
  }

  if (schemaName === "gap_analysis") {
    return compactNote(
      `Prior gap analysis: readiness ${stringValue(parsed.readiness_score)}, open gaps ${countValue(parsed.gaps)}.`,
    );
  }

  if (schemaName === "ccer_finding") {
    return compactNote(
      `Prior finding ${stringValue(parsed.finding_id)}: ${stringValue(parsed.title)} severity ${stringValue(parsed.severity)}.`,
    );
  }

  if (schemaName === "evidence_classification") {
    return compactNote(
      `Prior classification ${stringValue(parsed.filename)}: ${stringValue(parsed.document_type)} at ${stringValue(parsed.source_confidence)}.`,
    );
  }

  if (schemaName === "source_confidence") {
    return compactNote(
      `Prior source confidence ${stringValue(parsed.filename)}: ${stringValue(parsed.source_confidence)}.`,
    );
  }

  return compactNote(`Prior memory: ${JSON.stringify(parsed)}`);
}

function compactNote(value: string): string {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > 220 ? `${compacted.slice(0, 217)}...` : compacted;
}

function countValue(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "unknown";
}
