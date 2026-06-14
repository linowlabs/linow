import { AGENT_CONFIG } from "@/lib/agent/config";
import { classifyDocumentWithGroq, runGroqJsonCompletion } from "@/lib/agent/groq";
import {
  AGENT_SCHEMA_VERSION,
  ASSERTION_CATALOG,
  type AssertionId,
  type AuditPackSummaryOutput,
  type CcerFindingOutput,
  type EvidenceClassificationOutput,
  type GapAnalysisOutput,
  type MetadataExtractionOutput,
  type SourceConfidenceDistributionItem,
} from "@/lib/agent/schemas";
import {
  buildAgentPersistencePlan,
  buildAgentReviewBundle,
  createArtifactCollector,
  type AgentDocumentProofReference,
  type AgentOrchestrationResult,
  type DocumentAnalysisResult,
  type GroqUsageStats,
} from "@/lib/agent/orchestration-contract";
import {
  AgentInputError,
  isRecord,
  parseOptionalStringArray,
  readOptionalString,
  readRequiredString,
  resolveAgentDocumentInput,
  type AgentDocumentInput,
} from "@/lib/agent/common";
import {
  buildMetadataExtractionMessages,
  groqMetadataExtractionSchema,
  isAgentMetadataExtractionResult,
  normalizeMetadataExtractionResult,
} from "@/lib/agent/extract-metadata";
import {
  buildAssertionMappingMessages,
  groqAssertionMappingBundleSchema,
  isAssertionMappingBundle,
  normalizeAssertionMappingBundle,
} from "@/lib/agent/map-assertions";
import {
  buildGapAnalysisMessages,
  groqGapAnalysisSchema,
  isAgentGapAnalysisResult,
  normalizeGapAnalysisResult,
  type GapAnalysisDocumentInput,
  type GapAnalysisToolInput,
} from "@/lib/agent/analyze-gaps";
import {
  buildCcerFindingMessages,
  groqCcerFindingSchema,
  isAgentCcerFindingResult,
  normalizeCcerFindingResult,
  type CcerFindingToolInput,
} from "@/lib/agent/draft-finding";
import { hashAgentArtifact } from "@/lib/agent/artifacts";

export interface OrchestrationDocumentInput extends AgentDocumentInput {
  notes?: string[];
  evidence_ref?: AgentDocumentProofReference;
}

export interface AgentOrchestrationInput {
  pack_id: string;
  engagement_name: string;
  audit_area?: string;
  stage?: string;
  pack_owner_address?: string;
  auditor_address?: string;
  documents: OrchestrationDocumentInput[];
  pack_notes?: string[];
}

export async function resolveAgentOrchestrationInput(value: unknown): Promise<AgentOrchestrationInput> {
  if (!isRecord(value)) {
    throw new AgentInputError("Request body must be a JSON object.");
  }

  const documentsValue = value.documents;

  if (!Array.isArray(documentsValue) || documentsValue.length === 0) {
    throw new AgentInputError("documents must be a non-empty array.");
  }

  if (documentsValue.length > AGENT_CONFIG.limits.maxPackDocuments) {
    throw new AgentInputError(`documents must contain at most ${AGENT_CONFIG.limits.maxPackDocuments} items.`);
  }

  return {
    pack_id: readRequiredString(value.pack_id, "pack_id"),
    engagement_name: readRequiredString(value.engagement_name, "engagement_name"),
    audit_area: readOptionalString(value.audit_area, "audit_area"),
    stage: readOptionalString(value.stage, "stage"),
    pack_owner_address: readOptionalString(value.pack_owner_address, "pack_owner_address"),
    auditor_address: readOptionalString(value.auditor_address, "auditor_address"),
    documents: await Promise.all(documentsValue.map((document, index) => parseOrchestrationDocumentInput(document, index))),
    pack_notes: parseOptionalStringArray(value.pack_notes, "pack_notes"),
  };
}

export async function runAgentOrchestration(input: AgentOrchestrationInput): Promise<AgentOrchestrationResult> {
  const documents: DocumentAnalysisResult[] = [];
  const artifacts = createArtifactCollector(input.pack_id);
  const documentNotesById = createDocumentNotesLookup(input.documents);
  const usage = createUsageAccumulator();
  let model: string = AGENT_CONFIG.groq.defaultModel;

  for (const document of input.documents) {
    const classificationResult = await classifyDocumentWithGroq(document);
    model = classificationResult.model;
    addUsage(usage, classificationResult.usage);
    const classificationHash = hashAgentArtifact(
      classificationResult.result,
      `classification:${classificationResult.result.document_id}`,
    );

    const metadataCompletion = await runGroqJsonCompletion({
      schemaName: AGENT_CONFIG.schemaNames.metadataExtraction,
      schema: groqMetadataExtractionSchema,
      messages: buildMetadataExtractionMessages(document),
      validate: isAgentMetadataExtractionResult,
    });
    addUsage(usage, metadataCompletion.usage);
    const metadata = normalizeMetadataExtractionResult(document, metadataCompletion.result);
    const metadataHash = hashAgentArtifact(metadata, `metadata:${metadata.document_id}`);

    const assertionMappingCompletion = await runGroqJsonCompletion({
      schemaName: AGENT_CONFIG.schemaNames.assertionMappingBundle,
      schema: groqAssertionMappingBundleSchema,
      messages: buildAssertionMappingMessages({
        ...document,
        frameworkReference: "ISA 500 evidence readiness",
        classificationSummary: buildClassificationSummary(classificationResult.result),
        metadataSummary: buildMetadataSummary(metadata),
      }),
      validate: isAssertionMappingBundle,
    });
    addUsage(usage, assertionMappingCompletion.usage);
    const assertionBundle = normalizeAssertionMappingBundle(
      {
        ...document,
        frameworkReference: "ISA 500 evidence readiness",
        classificationSummary: buildClassificationSummary(classificationResult.result),
        metadataSummary: buildMetadataSummary(metadata),
      },
      assertionMappingCompletion.result,
    );
    const assertionMappingHash = hashAgentArtifact(
      assertionBundle.assertion_mapping,
      `assertion_mapping:${assertionBundle.assertion_mapping.document_id}`,
    );
    const sourceConfidenceHash = hashAgentArtifact(
      assertionBundle.source_confidence,
      `source_confidence:${assertionBundle.source_confidence.document_id}`,
    );

    artifacts.add({
      hash: classificationHash,
      actionType: "classify",
      targetKind: "document",
      targetId: document.documentId,
      documentId: document.documentId,
    });
    artifacts.add({
      hash: metadataHash,
      actionType: "extract",
      targetKind: "document",
      targetId: document.documentId,
      documentId: document.documentId,
    });
    artifacts.add({
      hash: assertionMappingHash,
      actionType: "map_assert",
      targetKind: "document",
      targetId: document.documentId,
      documentId: document.documentId,
    });
    artifacts.add({
      hash: sourceConfidenceHash,
      actionType: "map_assert",
      targetKind: "document",
      targetId: document.documentId,
      documentId: document.documentId,
    });
    documents.push({
      document_id: document.documentId,
      filename: document.documentName,
      evidence_ref: document.evidence_ref,
      classification: classificationResult.result,
      metadata,
      assertion_mapping: assertionBundle.assertion_mapping,
      source_confidence: assertionBundle.source_confidence,
      hashes: {
        classification: classificationHash,
        metadata: metadataHash,
        assertion_mapping: assertionMappingHash,
        source_confidence: sourceConfidenceHash,
      },
      usage: {
        classification: classificationResult.usage ?? null,
        metadata: metadataCompletion.usage ?? null,
        assertion_mapping: assertionMappingCompletion.usage ?? null,
      },
    });
  }

  const gapInput = buildGapInput(input, documents);
  const gapCompletion = await runGroqJsonCompletion({
    schemaName: AGENT_CONFIG.schemaNames.gapAnalysis,
    schema: groqGapAnalysisSchema,
    messages: buildGapAnalysisMessages(gapInput),
    validate: isAgentGapAnalysisResult,
  });
  addUsage(usage, gapCompletion.usage);
  const gapAnalysis = normalizeGapAnalysisResult(gapInput, gapCompletion.result);
  const gapHash = hashAgentArtifact(gapAnalysis, `gap_analysis:${gapAnalysis.pack_id}`);
  artifacts.add({
    hash: gapHash,
    actionType: "find_gaps",
    targetKind: "pack",
    targetId: input.pack_id,
  });

  const findings: CcerFindingOutput[] = [];

  for (const [index, gap] of gapAnalysis.gaps.slice(0, AGENT_CONFIG.limits.maxFindingsPerPack).entries()) {
    const findingInput: CcerFindingToolInput = {
      pack_id: input.pack_id,
      engagement_name: input.engagement_name,
      audit_area: input.audit_area,
      stage: input.stage,
      finding_id: `FND-${String(index + 1).padStart(3, "0")}`,
      gap,
      gap_analysis: gapAnalysis,
      documents: documents.map((document) => ({
        document_id: document.document_id,
        filename: document.filename,
        classification: document.classification,
        metadata: document.metadata,
        assertion_mapping: document.assertion_mapping,
        source_confidence: document.source_confidence,
        notes: documentNotesById.get(document.document_id),
      })),
      pack_notes: input.pack_notes,
    };

    const findingCompletion = await runGroqJsonCompletion({
      schemaName: AGENT_CONFIG.schemaNames.ccerFinding,
      schema: groqCcerFindingSchema,
      messages: buildCcerFindingMessages(findingInput),
      validate: isAgentCcerFindingResult,
    });
    addUsage(usage, findingCompletion.usage);
    const finding = normalizeCcerFindingResult(findingInput, findingCompletion.result);
    findings.push(finding);
    artifacts.add({
      hash: hashAgentArtifact(finding, `ccer_finding:${finding.finding_id}`),
      actionType: "draft_ccer",
      targetKind: "finding",
      targetId: finding.finding_id,
      findingId: finding.finding_id,
    });
  }

  const auditPackSummary = buildAuditPackSummary(input, documents, gapAnalysis, findings);
  const summaryHash = hashAgentArtifact(auditPackSummary, `audit_pack_summary:${auditPackSummary.pack_id}`);
  artifacts.add({
    hash: summaryHash,
    actionType: "summarize_pack",
    targetKind: "pack",
    targetId: input.pack_id,
  });

  const reviewBundle = buildAgentReviewBundle(input.pack_id, artifacts.hashes);

  return {
    provider: "groq",
    model,
    pack_id: input.pack_id,
    engagement_name: input.engagement_name,
    audit_area: input.audit_area,
    stage: input.stage,
    pack_owner_address: input.pack_owner_address,
    auditor_address: input.auditor_address,
    documents,
    gap_analysis: gapAnalysis,
    findings,
    audit_pack_summary: auditPackSummary,
    hashes: artifacts.hashes,
    artifact_catalog: artifacts.artifactCatalog,
    review_bundle: reviewBundle,
    persistence: buildAgentPersistencePlan({
      packId: input.pack_id,
      evidenceCount: documents.length,
      findingCount: findings.length,
      artifactCatalog: artifacts.artifactCatalog,
    }),
    proposed_action: reviewBundle,
    flow: [
      {
        step: "classify_extract_map",
        artifact_count: documents.length * 4,
        schema_names: ["evidence_classification", "metadata_extraction", "assertion_mapping", "source_confidence"],
      },
      {
        step: "analyze_gaps",
        artifact_count: 1,
        schema_names: ["gap_analysis"],
      },
      {
        step: "draft_findings",
        artifact_count: findings.length,
        schema_names: ["ccer_finding"],
      },
      {
        step: "build_summary_and_hashes",
        artifact_count: 1 + artifacts.hashes.length,
        schema_names: ["audit_pack_summary"],
      },
    ],
    usage,
  };
}

async function parseOrchestrationDocumentInput(value: unknown, index: number): Promise<OrchestrationDocumentInput> {
  if (!isRecord(value)) {
    throw new AgentInputError(`documents[${index}] must be an object.`);
  }

  const parsedBase = await resolveAgentDocumentInput(value);

  return {
    ...parsedBase,
    notes: parseOptionalStringArray(value.notes, `documents[${index}].notes`),
    evidence_ref: parseDocumentProofReference(value.evidence_ref, `documents[${index}].evidence_ref`),
  };
}

function parseDocumentProofReference(
  value: unknown,
  fieldName: string,
): AgentDocumentProofReference | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new AgentInputError(`${fieldName} must be an object when provided.`);
  }

  return {
    evidence_id: readOptionalString(value.evidence_id, `${fieldName}.evidence_id`),
    walrus_blob_id: readOptionalString(value.walrus_blob_id, `${fieldName}.walrus_blob_id`),
    commitment: readOptionalString(value.commitment, `${fieldName}.commitment`),
  };
}

function buildGapInput(input: AgentOrchestrationInput, documents: DocumentAnalysisResult[]): GapAnalysisToolInput {
  const documentNotesById = createDocumentNotesLookup(input.documents);
  const gapDocuments: GapAnalysisDocumentInput[] = documents.map((document) => ({
    document_id: document.document_id,
    filename: document.filename,
    classification: document.classification,
    metadata: document.metadata,
    assertion_mapping: document.assertion_mapping,
    source_confidence: document.source_confidence,
    notes: documentNotesById.get(document.document_id),
  }));

  return {
    pack_id: input.pack_id,
    engagement_name: input.engagement_name,
    audit_area: input.audit_area,
    stage: input.stage,
    documents: gapDocuments,
    pack_notes: input.pack_notes,
  };
}

function buildAuditPackSummary(
  input: AgentOrchestrationInput,
  documents: DocumentAnalysisResult[],
  gapAnalysis: GapAnalysisOutput,
  findings: CcerFindingOutput[],
): AuditPackSummaryOutput {
  const documentTypes = Array.from(new Set(documents.map((document) => document.classification.document_type))).sort();
  const confidenceDistributionMap = new Map<string, number>();

  for (const document of documents) {
    const level = document.source_confidence.source_confidence;
    confidenceDistributionMap.set(level, (confidenceDistributionMap.get(level) ?? 0) + 1);
  }

  const sourceConfidenceDistribution: SourceConfidenceDistributionItem[] = Array.from(confidenceDistributionMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([level, count]) => ({ level: level as SourceConfidenceDistributionItem["level"], count }));

  const missingLabels =
    gapAnalysis.missing_labels.length > 0
      ? gapAnalysis.missing_labels
      : gapAnalysis.missing_assertions.map((assertionId) => getAssertionLabel(assertionId));

  return {
    schema_name: "audit_pack_summary",
    schema_version: AGENT_SCHEMA_VERSION,
    pack_id: input.pack_id,
    engagement_name: input.engagement_name,
    summary: buildPackSummaryText(input, documents, gapAnalysis, findings),
    evidence_count: documents.length,
    document_types: documentTypes,
    readiness_score: gapAnalysis.readiness_score,
    source_confidence_distribution: sourceConfidenceDistribution,
    covered_assertions: [...gapAnalysis.covered_assertions],
    covered_labels: [...gapAnalysis.covered_labels],
    missing_assertions: [...gapAnalysis.missing_assertions],
    missing_labels: missingLabels,
    finding_ids: findings.map((finding) => finding.finding_id),
    next_actions:
      gapAnalysis.recommendations.length > 0
        ? [...gapAnalysis.recommendations]
        : [
            "Review draft findings and approve any artifact that should be hashed for downstream proof logging.",
          ],
  };
}

function buildPackSummaryText(
  input: AgentOrchestrationInput,
  documents: DocumentAnalysisResult[],
  gapAnalysis: GapAnalysisOutput,
  findings: CcerFindingOutput[],
): string {
  const documentTypes = Array.from(new Set(documents.map((document) => document.classification.document_type))).sort();
  const highestSeverityFinding = findings[0]?.severity;

  return [
    `${input.engagement_name} currently includes ${documents.length} analyzed evidence items across ${documentTypes.length} document types.`,
    `Readiness is ${gapAnalysis.readiness_score}/100 with ${gapAnalysis.gaps.length} open gap(s) and ${findings.length} draft finding(s).`,
    highestSeverityFinding ? `Highest draft finding severity: ${highestSeverityFinding}.` : "No draft findings were generated.",
  ].join(" ");
}

function buildClassificationSummary(classification: EvidenceClassificationOutput): string {
  return [
    `Classified as ${classification.document_type}.`,
    `Supported assertions: ${classification.assertion_labels.join(", ") || "none"}.`,
    `Source confidence: ${classification.source_confidence}.`,
  ].join(" ");
}

function buildMetadataSummary(metadata: MetadataExtractionOutput): string {
  const fragments = [
    metadata.document_date ? `Document date ${metadata.document_date}` : null,
    metadata.period_start && metadata.period_end ? `Period ${metadata.period_start} to ${metadata.period_end}` : null,
    metadata.parties.length > 0 ? `Parties ${metadata.parties.map((item) => item.name).join(", ")}` : null,
    metadata.key_amounts.length > 0
      ? `Amounts ${metadata.key_amounts.map((item) => `${item.label}: ${item.amount}${item.currency ? ` ${item.currency}` : ""}`).join("; ")}`
      : null,
  ].filter((item): item is string => Boolean(item));

  return fragments.join(". ");
}

function createDocumentNotesLookup(
  documents: OrchestrationDocumentInput[],
): Map<string, string[] | undefined> {
  return new Map(
    documents.map((document) => [document.documentId, document.notes] as const),
  );
}

function createUsageAccumulator(): GroqUsageStats {
  return {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
}

function addUsage(accumulator: GroqUsageStats, usage?: GroqUsageStats) {
  if (!usage) {
    return;
  }

  accumulator.prompt_tokens = (accumulator.prompt_tokens ?? 0) + (usage.prompt_tokens ?? 0);
  accumulator.completion_tokens = (accumulator.completion_tokens ?? 0) + (usage.completion_tokens ?? 0);
  accumulator.total_tokens = (accumulator.total_tokens ?? 0) + (usage.total_tokens ?? 0);
}

function getAssertionLabel(assertionId: AssertionId): string {
  return ASSERTION_CATALOG.find((item) => item.id === assertionId)?.label ?? `Unknown (${assertionId})`;
}
