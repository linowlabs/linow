import type { AgentOrchestrationResult } from "@/lib/agent/orchestration-contract";
import type { AgentWeb3PersistenceResult } from "@/lib/agent/web3-persistence";

export type AgentOrchestrateResponseMode = "full" | "compact_p1" | "compact_p2" | "workspace" | "memory";

export function resolveOrchestrateResponseMode(value: unknown): AgentOrchestrateResponseMode {
  return value === "compact_p1" || value === "compact_p2" || value === "workspace" || value === "memory"
    ? value
    : "full";
}

export function buildOrchestrateApiResponse(input: {
  mode: AgentOrchestrateResponseMode;
  result: AgentOrchestrationResult;
  persistenceResult: AgentWeb3PersistenceResult;
}) {
  if (input.mode === "compact_p1") {
    return buildCompactP1Response(input.result, input.persistenceResult);
  }

  if (input.mode === "compact_p2") {
    return buildCompactP2Response(input.result, input.persistenceResult);
  }

  if (input.mode === "workspace") {
    return buildWorkspaceResponse(input.result, input.persistenceResult);
  }

  if (input.mode === "memory") {
    return buildMemoryResponse(input.result, input.persistenceResult);
  }

  return {
    ...input.result,
    persistence_result: input.persistenceResult,
  };
}

function buildCompactP1Response(
  result: AgentOrchestrationResult,
  persistenceResult: AgentWeb3PersistenceResult,
) {
  const actionCandidates = persistenceResult.sui.action_candidates;
  const evidenceBackedActions = actionCandidates.filter((candidate) => candidate.evidence_id);

  return {
    provider: result.provider,
    model: result.model,
    profile: result.profile,
    pack_id: result.pack_id,
    engagement_name: result.engagement_name,
    audit_area: result.audit_area,
    stage: result.stage,
    documents: result.documents.map((document) => ({
      document_id: document.document_id,
      filename: document.filename,
      has_evidence_ref: Boolean(document.evidence_ref),
      evidence_ref: document.evidence_ref ?? null,
    })),
    findings: result.findings.map((finding) => ({
      finding_id: finding.finding_id,
      title: finding.title,
      severity: finding.severity,
      citations: finding.citations,
      missing_assertions: finding.missing_assertions,
      missing_assertion_labels: finding.missing_assertion_labels,
      status: finding.status,
    })),
    audit_pack_summary: result.audit_pack_summary,
    usage: result.usage,
    point_one_check: {
      finding_count: result.findings.length,
      findings_with_citations: result.findings.filter((finding) => finding.citations.length > 0).length,
      linked_documents: persistenceResult.manifest.linked_documents,
      complete_evidence_refs: persistenceResult.manifest.complete_evidence_refs,
      manifest_evidence_ref_count: persistenceResult.manifest.manifest.evidenceRefs.length,
      action_candidates_with_evidence_id: evidenceBackedActions.length,
    },
    persistence_result: {
      memory_namespace: persistenceResult.memory_namespace,
      manifest: {
        total_documents: persistenceResult.manifest.total_documents,
        linked_documents: persistenceResult.manifest.linked_documents,
        complete_evidence_refs: persistenceResult.manifest.complete_evidence_refs,
        evidence_refs: persistenceResult.manifest.manifest.evidenceRefs,
      },
      memwal: persistenceResult.memwal,
      walrus: persistenceResult.walrus,
      sui: {
        status: persistenceResult.sui.status,
        requires_human_approval: persistenceResult.sui.requires_human_approval,
        action_candidate_count: actionCandidates.length,
        evidence_backed_action_count: evidenceBackedActions.length,
        action_candidates: actionCandidates,
      },
    },
  };
}

function buildCompactP2Response(
  result: AgentOrchestrationResult,
  persistenceResult: AgentWeb3PersistenceResult,
) {
  return {
    provider: result.provider,
    model: result.model,
    profile: result.profile,
    pack_id: result.pack_id,
    engagement_name: result.engagement_name,
    audit_area: result.audit_area,
    stage: result.stage,
    gap_analysis: result.gap_analysis,
    findings: result.findings,
    audit_pack_summary: result.audit_pack_summary,
    flow: result.flow,
    recalled_prior_memory_count: result.recalled_prior_memory_count,
    cached_document_count: result.cached_document_count,
    usage: result.usage,
    point_two_check: {
      skipped_draft_finding: true,
    },
    persistence_result: {
      memory_namespace: persistenceResult.memory_namespace,
      memwal: persistenceResult.memwal,
      walrus: persistenceResult.walrus,
      sui: {
        status: persistenceResult.sui.status,
        requires_human_approval: persistenceResult.sui.requires_human_approval,
        action_candidate_count: persistenceResult.sui.action_candidates.length,
      },
      manifest: {
        total_documents: persistenceResult.manifest.total_documents,
        linked_documents: persistenceResult.manifest.linked_documents,
        complete_evidence_refs: persistenceResult.manifest.complete_evidence_refs,
      },
    },
  };
}

function buildWorkspaceResponse(
  result: AgentOrchestrationResult,
  persistenceResult: AgentWeb3PersistenceResult,
) {
  return {
    provider: result.provider,
    model: result.model,
    profile: result.profile,
    pack_id: result.pack_id,
    engagement_name: result.engagement_name,
    audit_area: result.audit_area,
    stage: result.stage,
    documents: result.documents.map((document) => ({
      document_id: document.document_id,
      filename: document.filename,
      evidence_ref: document.evidence_ref ?? null,
      analysis_source: document.analysis_source,
      cache_key: document.cache_key,
      classification: document.classification,
      metadata: document.metadata,
      assertion_mapping: document.assertion_mapping,
      source_confidence: document.source_confidence,
      hashes: document.hashes,
      usage: document.usage,
    })),
    gap_analysis: result.gap_analysis,
    findings: result.findings,
    audit_pack_summary: result.audit_pack_summary,
    flow: result.flow,
    usage: result.usage,
    recalled_prior_memory_count: result.recalled_prior_memory_count,
    recall_summary: result.recall_summary,
    agent_memory_payload: result.agent_memory_payload,
    cached_document_count: result.cached_document_count,
    review_bundle: result.review_bundle,
    approval_controls: {
      requires_human_approval: persistenceResult.sui.requires_human_approval,
      chain_write_ready: result.review_bundle.chain_write_ready,
      action_candidates: persistenceResult.sui.action_candidates,
      output_hashes: result.review_bundle.output_hashes,
      next_steps: result.review_bundle.next_steps,
    },
    persistence_result: {
      memory_namespace: persistenceResult.memory_namespace,
      manifest: {
        total_documents: persistenceResult.manifest.total_documents,
        linked_documents: persistenceResult.manifest.linked_documents,
        complete_evidence_refs: persistenceResult.manifest.complete_evidence_refs,
        evidence_refs: persistenceResult.manifest.manifest.evidenceRefs,
      },
      memwal: persistenceResult.memwal,
      walrus: persistenceResult.walrus,
      sui: {
        status: persistenceResult.sui.status,
        requires_human_approval: persistenceResult.sui.requires_human_approval,
        action_candidate_count: persistenceResult.sui.action_candidates.length,
        action_candidates: persistenceResult.sui.action_candidates,
      },
    },
  };
}

function buildMemoryResponse(
  result: AgentOrchestrationResult,
  persistenceResult: AgentWeb3PersistenceResult,
) {
  return {
    provider: result.provider,
    model: result.model,
    profile: result.profile,
    pack_id: result.pack_id,
    engagement_name: result.engagement_name,
    audit_area: result.audit_area,
    stage: result.stage,
    recall_summary: result.recall_summary,
    agent_memory_payload: result.agent_memory_payload,
    recalled_prior_memory_count: result.recalled_prior_memory_count,
    cached_document_count: result.cached_document_count,
    usage: result.usage,
    point_so24_a_check: {
      skipped_draft_finding: true,
      recalled_memory_notes_count: result.recall_summary.notes.length,
      recalled_memory_item_count: result.recall_summary.items.length,
      memory_document_count: result.agent_memory_payload.documents.length,
      memory_output_hash_count: result.agent_memory_payload.output_hashes.length,
      memory_artifact_count: result.agent_memory_payload.artifact_catalog.length,
      memory_finding_count: result.agent_memory_payload.findings.length,
    },
    persistence_result: {
      memory_namespace: persistenceResult.memory_namespace,
      memwal: persistenceResult.memwal,
      walrus: persistenceResult.walrus,
      manifest: {
        total_documents: persistenceResult.manifest.total_documents,
        linked_documents: persistenceResult.manifest.linked_documents,
        complete_evidence_refs: persistenceResult.manifest.complete_evidence_refs,
      },
    },
  };
}
