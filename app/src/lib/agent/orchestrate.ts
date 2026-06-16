import { AGENT_CONFIG, type AgentOrchestrationProfile } from "@/lib/agent/config";
import { classifyDocumentWithGroq, runGroqJsonCompletion } from "@/lib/agent/groq";
import {
  readCachedDocumentAnalysis,
  writeCachedDocumentAnalysis,
} from "@/lib/agent/document-analysis-cache";
import {
  buildDocumentAnalysisMessages,
  groqDocumentAnalysisBundleSchema,
  isGroqDocumentAnalysisBundle,
  normalizeDocumentAnalysisBundle,
} from "@/lib/agent/analyze-document";
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
  isGroqGapAnalysisEnvelope,
  normalizeGapAnalysisResult,
  type GapAnalysisDocumentInput,
  type GapAnalysisToolInput,
} from "@/lib/agent/analyze-gaps";
import {
  buildCcerFindingMessages,
  groqCcerFindingSchema,
  isGroqDraftFindingResult,
  normalizeCcerFindingResult,
  type CcerFindingToolInput,
} from "@/lib/agent/draft-finding";
import { hashAgentArtifact } from "@/lib/agent/artifacts";
import { recallPriorAuditMemory } from "@linow/sdk/memwal";

export interface OrchestrationDocumentInput extends AgentDocumentInput {
  notes?: string[];
  evidence_ref?: AgentDocumentProofReference;
}

export interface AgentOrchestrationInput {
  profile: AgentOrchestrationProfile;
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

  const profile = resolveOrchestrationProfile(value.profile);
  const profileConfig = AGENT_CONFIG.orchestrationProfiles[profile];

  return {
    profile,
    pack_id: readRequiredString(value.pack_id, "pack_id"),
    engagement_name: readRequiredString(value.engagement_name, "engagement_name"),
    audit_area: readOptionalString(value.audit_area, "audit_area"),
    stage: readOptionalString(value.stage, "stage"),
    pack_owner_address: readOptionalString(value.pack_owner_address, "pack_owner_address"),
    auditor_address: readOptionalString(value.auditor_address, "auditor_address"),
    documents: await Promise.all(
      documentsValue.map((document, index) =>
        parseOrchestrationDocumentInput(document, index, profileConfig.maxDocumentChars),
      ),
    ),
    pack_notes: parseOptionalStringArray(value.pack_notes, "pack_notes"),
  };
}

export async function runAgentOrchestration(input: AgentOrchestrationInput): Promise<AgentOrchestrationResult> {
  const documents: DocumentAnalysisResult[] = [];
  const artifacts = createArtifactCollector(input.pack_id);
  const documentNotesById = createDocumentNotesLookup(input.documents);
  const usage = createUsageAccumulator();
  const profileConfig = AGENT_CONFIG.orchestrationProfiles[input.profile];
  const useDocumentAnalysisBundle = profileConfig.combineDocumentPasses && AGENT_CONFIG.groq.enableDocumentAnalysisBundle;
  const priorMemoryNotes = profileConfig.recallPriorMemory ? await recallPriorMemoryNotes(input.pack_id, profileConfig.maxPriorMemoryNotes) : [];
  const effectivePackNotes = mergePackNotes(input.pack_notes, priorMemoryNotes);
  let cachedDocumentCount = 0;
  let model: string = AGENT_CONFIG.groq.defaultModel;

  for (const document of input.documents) {
    const analysisMode = useDocumentAnalysisBundle ? "compact" : "multi_pass";
    const analysis = await resolveDocumentAnalysis(document, analysisMode);

    if (analysis.analysisSource === "live") {
      model = analysis.model;
    }
    addUsage(usage, analysis.usage);
    if (analysis.analysisSource === "cache") {
      cachedDocumentCount += 1;
    }
    const classificationHash = hashAgentArtifact(
      analysis.classification,
      `classification:${analysis.classification.document_id}`,
    );
    const metadataHash = hashAgentArtifact(analysis.metadata, `metadata:${analysis.metadata.document_id}`);
    const assertionMappingHash = hashAgentArtifact(
      analysis.assertionBundle.assertion_mapping,
      `assertion_mapping:${analysis.assertionBundle.assertion_mapping.document_id}`,
    );
    const sourceConfidenceHash = hashAgentArtifact(
      analysis.assertionBundle.source_confidence,
      `source_confidence:${analysis.assertionBundle.source_confidence.document_id}`,
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
      analysis_source: analysis.analysisSource,
      cache_key: analysis.cacheKey,
      classification: analysis.classification,
      metadata: analysis.metadata,
      assertion_mapping: analysis.assertionBundle.assertion_mapping,
      source_confidence: analysis.assertionBundle.source_confidence,
      hashes: {
        classification: classificationHash,
        metadata: metadataHash,
        assertion_mapping: assertionMappingHash,
        source_confidence: sourceConfidenceHash,
      },
      usage: {
        classification: analysis.usageBreakdown.classification ?? null,
        metadata: analysis.usageBreakdown.metadata ?? null,
        assertion_mapping: analysis.usageBreakdown.assertion_mapping ?? null,
        document_analysis_bundle: analysis.usageBreakdown.document_analysis_bundle ?? null,
      },
    });
  }

  const gapInput = buildGapInput(input, documents, effectivePackNotes);
  const gapCompletion = await runGroqJsonCompletion({
    schemaName: AGENT_CONFIG.schemaNames.gapAnalysis,
    schema: groqGapAnalysisSchema,
    messages: buildGapAnalysisMessages(gapInput),
    validate: isGroqGapAnalysisEnvelope,
    responseMode: "json_object",
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
  const maxFindings = Math.min(profileConfig.maxFindingsPerPack, AGENT_CONFIG.limits.maxFindingsPerPack);

  for (const [index, gap] of gapAnalysis.gaps.slice(0, maxFindings).entries()) {
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
        document_text: input.documents.find((item) => item.documentId === document.document_id)?.documentText,
        context: input.documents.find((item) => item.documentId === document.document_id)?.context,
        classification: document.classification,
        metadata: document.metadata,
        assertion_mapping: document.assertion_mapping,
        source_confidence: document.source_confidence,
        notes: documentNotesById.get(document.document_id),
      })),
      pack_notes: effectivePackNotes,
    };

    const findingCompletion = await runGroqJsonCompletion({
      schemaName: AGENT_CONFIG.schemaNames.ccerFinding,
      schema: groqCcerFindingSchema,
      messages: buildCcerFindingMessages(findingInput),
      validate: isGroqDraftFindingResult,
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
    profile: input.profile,
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
        step: useDocumentAnalysisBundle ? "analyze_document_bundle" : "classify_extract_map",
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
    recalled_prior_memory_count: priorMemoryNotes.length,
    cached_document_count: cachedDocumentCount,
    usage,
  };
}

async function parseOrchestrationDocumentInput(
  value: unknown,
  index: number,
  maxDocumentChars: number,
): Promise<OrchestrationDocumentInput> {
  if (!isRecord(value)) {
    throw new AgentInputError(`documents[${index}] must be an object.`);
  }

  const parsedBase = await resolveAgentDocumentInput(value, maxDocumentChars);

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

function buildGapInput(
  input: AgentOrchestrationInput,
  documents: DocumentAnalysisResult[],
  packNotes: string[] | undefined,
): GapAnalysisToolInput {
  const documentNotesById = createDocumentNotesLookup(input.documents);
  const gapDocuments: GapAnalysisDocumentInput[] = documents.map((document) => ({
    document_id: document.document_id,
    filename: document.filename,
    document_text: input.documents.find((item) => item.documentId === document.document_id)?.documentText,
    context: input.documents.find((item) => item.documentId === document.document_id)?.context,
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
    pack_notes: packNotes,
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

async function runCompactDocumentAnalysis(document: OrchestrationDocumentInput) {
  const completion = await runGroqJsonCompletion({
    schemaName: AGENT_CONFIG.schemaNames.documentAnalysisBundle,
    schema: groqDocumentAnalysisBundleSchema,
    messages: buildDocumentAnalysisMessages(document),
    validate: isGroqDocumentAnalysisBundle,
  });
  const normalized = normalizeDocumentAnalysisBundle(
    {
      ...document,
      frameworkReference: "ISA 500 evidence readiness",
    },
    completion.result,
  );

  return {
    model: completion.model,
    usage: completion.usage,
    classification: normalized.classification,
    metadata: normalized.metadata,
    assertionBundle: normalized.assertion_bundle,
    usageBreakdown: {
      classification: null,
      metadata: null,
      assertion_mapping: null,
      document_analysis_bundle: completion.usage ?? null,
    },
  };
}

async function runMultiPassDocumentAnalysis(document: OrchestrationDocumentInput) {
  const classificationResult = await classifyDocumentWithGroq(document);
  const metadataCompletion = await runGroqJsonCompletion({
    schemaName: AGENT_CONFIG.schemaNames.metadataExtraction,
    schema: groqMetadataExtractionSchema,
    messages: buildMetadataExtractionMessages({
      ...document,
      classificationSummary: buildClassificationSummary(classificationResult.result),
    }),
    validate: isAgentMetadataExtractionResult,
  });
  const metadata = normalizeMetadataExtractionResult(document, metadataCompletion.result);
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
  const assertionBundle = normalizeAssertionMappingBundle(
    {
      ...document,
      frameworkReference: "ISA 500 evidence readiness",
      classificationSummary: buildClassificationSummary(classificationResult.result),
      metadataSummary: buildMetadataSummary(metadata),
    },
    assertionMappingCompletion.result,
  );

  return {
    model: classificationResult.model,
    usage: sumUsage(classificationResult.usage, metadataCompletion.usage, assertionMappingCompletion.usage),
    classification: classificationResult.result,
    metadata,
    assertionBundle,
    usageBreakdown: {
      classification: classificationResult.usage ?? null,
      metadata: metadataCompletion.usage ?? null,
      assertion_mapping: assertionMappingCompletion.usage ?? null,
      document_analysis_bundle: null,
    },
  };
}

async function resolveDocumentAnalysis(
  document: OrchestrationDocumentInput,
  mode: "compact" | "multi_pass",
) {
  const cached = await readCachedDocumentAnalysis({ document, mode });

  if (cached) {
    return {
      model: "cache",
      usage: undefined,
      classification: cached.classification,
      metadata: cached.metadata,
      assertionBundle: cached.assertionBundle,
      usageBreakdown: {
        classification: null,
        metadata: null,
        assertion_mapping: null,
        document_analysis_bundle: null,
      },
      analysisSource: "cache" as const,
      cacheKey: cached.cacheKey,
    };
  }

  const analysis = await runPreferredDocumentAnalysis(document, mode);

  const cacheKey = await writeCachedDocumentAnalysis({
    document,
    mode,
    classification: analysis.classification,
    metadata: analysis.metadata,
    assertionBundle: analysis.assertionBundle,
  });

  return {
    ...analysis,
    analysisSource: "live" as const,
    cacheKey,
  };
}

async function runPreferredDocumentAnalysis(
  document: OrchestrationDocumentInput,
  mode: "compact" | "multi_pass",
) {
  if (mode === "multi_pass") {
    return runMultiPassDocumentAnalysis(document);
  }

  try {
    return await runCompactDocumentAnalysis(document);
  } catch (error) {
    if (!isRecoverableCompactAnalysisError(error)) {
      throw error;
    }

    return runMultiPassDocumentAnalysis(document);
  }
}

async function recallPriorMemoryNotes(packId: string, limit: number): Promise<string[]> {
  const priorMemories = await recallPriorAuditMemory(packId);
  return priorMemories
    .slice(0, limit)
    .map((memory) => summarizePriorMemory(memory.text))
    .filter((note, index, notes) => note.length > 0 && notes.indexOf(note) === index);
}

function summarizePriorMemory(value: string): string {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const schemaName = typeof parsed.schema_name === "string" ? parsed.schema_name : undefined;

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
  } catch {
    return compactNote(`Prior memory: ${value}`);
  }

  return compactNote(`Prior memory: ${value}`);
}

function compactNote(value: string): string {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > 220 ? `${compacted.slice(0, 217)}...` : compacted;
}

function mergePackNotes(packNotes: string[] | undefined, priorMemoryNotes: string[]): string[] | undefined {
  const merged = [...(packNotes ?? []), ...priorMemoryNotes];
  return merged.length > 0 ? merged : undefined;
}

function resolveOrchestrationProfile(value: unknown): AgentOrchestrationProfile {
  if (value === undefined) {
    return "cheap";
  }

  if (value === "cheap" || value === "balanced" || value === "full") {
    return value;
  }

  throw new AgentInputError("profile must be one of: cheap, balanced, full.");
}

function sumUsage(...usageItems: Array<GroqUsageStats | undefined>): GroqUsageStats {
  const total = createUsageAccumulator();

  for (const usage of usageItems) {
    addUsage(total, usage);
  }

  return total;
}

function countValue(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "unknown";
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

function isRecoverableCompactAnalysisError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("linow_agent_document_analysis_bundle") &&
    (
      error.message.includes("json_validate_failed") ||
      error.message.includes("invalid JSON schema for response_format") ||
      error.message.includes("Failed to validate JSON")
    )
  );
}
