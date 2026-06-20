import type { AgentArtifactHashRecord } from "@/lib/agent/artifacts";
import type { AgentOrchestrationProfile } from "@/lib/agent/config";
import type { AssertionMappingBundle } from "@/lib/agent/map-assertions";
import type { AgentProviderName, AgentUsageStats } from "@/lib/agent/provider-types";
import type {
  AgentSchemaName,
  AuditPackSummaryOutput,
  CcerFindingOutput,
  EvidenceClassificationOutput,
  GapAnalysisOutput,
  MetadataExtractionOutput,
} from "@/lib/agent/schemas";

export interface AgentDocumentProofReference {
  evidence_id?: string;
  walrus_blob_id?: string;
  commitment?: string;
}

export interface DocumentAnalysisResult {
  document_id: string;
  filename: string;
  evidence_ref?: AgentDocumentProofReference;
  analysis_source: "live" | "cache";
  cache_key?: string;
  classification: EvidenceClassificationOutput;
  metadata: MetadataExtractionOutput;
  assertion_mapping: AssertionMappingBundle["assertion_mapping"];
  source_confidence: AssertionMappingBundle["source_confidence"];
  hashes: {
    classification: AgentArtifactHashRecord;
    metadata: AgentArtifactHashRecord;
    assertion_mapping: AgentArtifactHashRecord;
    source_confidence: AgentArtifactHashRecord;
  };
  usage: {
    classification: AgentUsageStats | null;
    metadata: AgentUsageStats | null;
    assertion_mapping: AgentUsageStats | null;
    document_analysis_bundle?: AgentUsageStats | null;
  };
}

export interface AgentMemoryDocumentRecord {
  document_id: string;
  filename: string;
  evidence_ref?: AgentDocumentProofReference;
  analysis_source: DocumentAnalysisResult["analysis_source"];
  cache_key?: string;
  classification: DocumentAnalysisResult["classification"];
  metadata: DocumentAnalysisResult["metadata"];
  assertion_mapping: DocumentAnalysisResult["assertion_mapping"];
  source_confidence: DocumentAnalysisResult["source_confidence"];
  hashes: DocumentAnalysisResult["hashes"];
}

export type OrchestrationArtifactActionType =
  | "classify"
  | "extract"
  | "map_assert"
  | "find_gaps"
  | "draft_ccer"
  | "summarize_pack";

export type OrchestrationArtifactTargetKind = "document" | "pack" | "finding";

export interface OrchestrationArtifactReference extends AgentArtifactHashRecord {
  pack_id: string;
  action_type: OrchestrationArtifactActionType;
  target_kind: OrchestrationArtifactTargetKind;
  target_id: string;
  document_id?: string;
  finding_id?: string;
}

export interface AgentReviewBundle {
  status: "pending_human_review";
  action_type: "review_agent_outputs";
  target_pack_id: string;
  requires_human_approval: true;
  chain_write_ready: false;
  output_hashes: string[];
  rationale: string;
  next_steps: string[];
}

export interface AgentPersistencePlan {
  memory_namespace: string;
  memory_manifest_candidate: {
    pack_id: string;
    evidence_count: number;
    finding_count: number;
    artifact_count: number;
  };
}

export interface AgentMemoryPayload {
  schema_name: "agent_memory_payload";
  schema_version: string;
  pack_id: string;
  engagement_name: string;
  audit_area?: string;
  stage?: string;
  memory_namespace: string;
  created_at: string;
  documents: AgentMemoryDocumentRecord[];
  gap_analysis: GapAnalysisOutput;
  findings: CcerFindingOutput[];
  audit_pack_summary: AuditPackSummaryOutput;
  artifact_catalog: OrchestrationArtifactReference[];
  output_hashes: string[];
  review_bundle: AgentReviewBundle;
  flow: OrchestrationFlowStep[];
}

export interface RecalledAgentMemoryItem {
  schema_name?: string;
  summary: string;
  distance: number;
}

export interface AgentRecallSummary {
  schema_name: "agent_recall_summary";
  schema_version: string;
  pack_id: string;
  recalled_count: number;
  notes: string[];
  items: RecalledAgentMemoryItem[];
}

export interface OrchestrationFlowStep {
  step: string;
  artifact_count: number;
  schema_names: AgentSchemaName[];
}

export interface AgentOrchestrationResult {
  provider: AgentProviderName;
  model: string;
  profile: AgentOrchestrationProfile;
  pack_id: string;
  engagement_name: string;
  audit_area?: string;
  stage?: string;
  pack_owner_address?: string;
  auditor_address?: string;
  documents: DocumentAnalysisResult[];
  gap_analysis: GapAnalysisOutput;
  findings: CcerFindingOutput[];
  audit_pack_summary: AuditPackSummaryOutput;
  hashes: AgentArtifactHashRecord[];
  artifact_catalog: OrchestrationArtifactReference[];
  agent_memory_payload: AgentMemoryPayload;
  recall_summary: AgentRecallSummary;
  review_bundle: AgentReviewBundle;
  persistence: AgentPersistencePlan;
  proposed_action: AgentReviewBundle;
  flow: OrchestrationFlowStep[];
  recalled_prior_memory_count: number;
  cached_document_count: number;
  usage: AgentUsageStats;
}

interface CreateArtifactCatalogEntryInput {
  packId: string;
  hash: AgentArtifactHashRecord;
  actionType: OrchestrationArtifactActionType;
  targetKind: OrchestrationArtifactTargetKind;
  targetId: string;
  documentId?: string;
  findingId?: string;
}

type ArtifactCollectorAddInput = Omit<CreateArtifactCatalogEntryInput, "packId">;

export interface ArtifactCollector {
  hashes: AgentArtifactHashRecord[];
  artifactCatalog: OrchestrationArtifactReference[];
  add(input: ArtifactCollectorAddInput): void;
}

export function createArtifactCollector(packId: string): ArtifactCollector {
  const hashes: AgentArtifactHashRecord[] = [];
  const artifactCatalog: OrchestrationArtifactReference[] = [];

  return {
    hashes,
    artifactCatalog,
    add(input) {
      hashes.push(input.hash);
      artifactCatalog.push(
        createArtifactCatalogEntry({
          packId,
          hash: input.hash,
          actionType: input.actionType,
          targetKind: input.targetKind,
          targetId: input.targetId,
          documentId: input.documentId,
          findingId: input.findingId,
        }),
      );
    },
  };
}

export function createArtifactCatalogEntry(
  input: CreateArtifactCatalogEntryInput,
): OrchestrationArtifactReference {
  return {
    ...input.hash,
    pack_id: input.packId,
    action_type: input.actionType,
    target_kind: input.targetKind,
    target_id: input.targetId,
    document_id: input.documentId,
    finding_id: input.findingId,
  };
}

export function buildAgentReviewBundle(
  packId: string,
  hashes: AgentArtifactHashRecord[],
): AgentReviewBundle {
  return {
    status: "pending_human_review",
    action_type: "review_agent_outputs",
    target_pack_id: packId,
    requires_human_approval: true,
    chain_write_ready: false,
    output_hashes: hashes.map((item) => item.sha256),
    rationale:
      "The agent analysis is complete for this pack, but every classification, gap, and finding still requires human review before any Walrus or Sui write.",
    next_steps: [
      "Review classifications and source confidence per document.",
      "Review gap analysis and draft findings.",
      "Approve or edit outputs before hashing for Walrus persistence or Sui AgentAction logging.",
    ],
  };
}

export function buildAgentPersistencePlan(input: {
  packId: string;
  evidenceCount: number;
  findingCount: number;
  artifactCatalog: OrchestrationArtifactReference[];
}): AgentPersistencePlan {
  return {
    memory_namespace: `engagement-${input.packId}`,
    memory_manifest_candidate: {
      pack_id: input.packId,
      evidence_count: input.evidenceCount,
      finding_count: input.findingCount,
      artifact_count: input.artifactCatalog.length,
    },
  };
}
