import { NextResponse } from "next/server";
import { resolveAgentOrchestrationInput, runAgentOrchestration } from "@/lib/agent/orchestrate";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";
import { persistAgentOutputsForWeb3 } from "@/lib/agent/web3-persistence";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const responseMode = typeof body.response_mode === "string" ? body.response_mode : "full";
    const input = await resolveAgentOrchestrationInput(body);
    const result = await runAgentOrchestration(input, {
      skipFindingDrafting: responseMode === "compact_p2",
    });
    const persistence_result = await persistAgentOutputsForWeb3(result);

    if (responseMode === "compact_p1") {
      return NextResponse.json(buildCompactP1Response(result, persistence_result));
    }

    if (responseMode === "compact_p2") {
      return NextResponse.json(buildCompactP2Response(result, persistence_result));
    }

    return NextResponse.json({
      ...result,
      persistence_result,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Agent orchestration failed.");
  }
}

function buildCompactP1Response(
  result: Awaited<ReturnType<typeof runAgentOrchestration>>,
  persistence_result: Awaited<ReturnType<typeof persistAgentOutputsForWeb3>>,
) {
  const actionCandidates = persistence_result.sui.action_candidates;
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
      linked_documents: persistence_result.manifest.linked_documents,
      complete_evidence_refs: persistence_result.manifest.complete_evidence_refs,
      manifest_evidence_ref_count: persistence_result.manifest.manifest.evidenceRefs.length,
      action_candidates_with_evidence_id: evidenceBackedActions.length,
    },
    persistence_result: {
      memory_namespace: persistence_result.memory_namespace,
      manifest: {
        total_documents: persistence_result.manifest.total_documents,
        linked_documents: persistence_result.manifest.linked_documents,
        complete_evidence_refs: persistence_result.manifest.complete_evidence_refs,
        evidence_refs: persistence_result.manifest.manifest.evidenceRefs,
      },
      memwal: persistence_result.memwal,
      walrus: persistence_result.walrus,
      sui: {
        status: persistence_result.sui.status,
        requires_human_approval: persistence_result.sui.requires_human_approval,
        action_candidate_count: actionCandidates.length,
        evidence_backed_action_count: evidenceBackedActions.length,
        action_candidates: actionCandidates,
      },
    },
  };
}

function buildCompactP2Response(
  result: Awaited<ReturnType<typeof runAgentOrchestration>>,
  persistence_result: Awaited<ReturnType<typeof persistAgentOutputsForWeb3>>,
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
      memory_namespace: persistence_result.memory_namespace,
      memwal: persistence_result.memwal,
      walrus: persistence_result.walrus,
      sui: {
        status: persistence_result.sui.status,
        requires_human_approval: persistence_result.sui.requires_human_approval,
        action_candidate_count: persistence_result.sui.action_candidates.length,
      },
      manifest: {
        total_documents: persistence_result.manifest.total_documents,
        linked_documents: persistence_result.manifest.linked_documents,
        complete_evidence_refs: persistence_result.manifest.complete_evidence_refs,
      },
    },
  };
}
