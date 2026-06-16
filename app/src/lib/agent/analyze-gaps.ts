import { AGENT_CONFIG } from "@/lib/agent/config";
import {
  AGENT_SCHEMA_VERSION,
  ASSERTION_CATALOG,
  GAP_SEVERITY_LEVELS,
  type AssertionId,
  type AssertionMappingOutput,
  type EvidenceClassificationOutput,
  type GapItem,
  type GapAnalysisOutput,
  type MetadataExtractionOutput,
  type SourceConfidenceOutput,
  getAssertionIdByLabel,
  getAssertionLabel,
  isAssertionMappingOutput,
  isEvidenceClassificationOutput,
  isMetadataExtractionOutput,
  isSourceConfidenceOutput,
} from "@/lib/agent/schemas";
import {
  AgentInputError,
  type DocumentContextInput,
  isRecord,
  parseOptionalStringArray,
  parseDocumentContext,
  readOptionalString,
  readRequiredString,
} from "@/lib/agent/common";
import { retrieveGapAnalysisChunks } from "@/lib/agent/document-retrieval";

export interface GapAnalysisDocumentInput {
  document_id: string;
  filename: string;
  document_text?: string;
  context?: DocumentContextInput;
  classification?: EvidenceClassificationOutput;
  metadata?: MetadataExtractionOutput;
  assertion_mapping?: AssertionMappingOutput;
  source_confidence?: SourceConfidenceOutput;
  notes?: string[];
}

export interface GapAnalysisToolInput {
  pack_id: string;
  engagement_name: string;
  audit_area?: string;
  stage?: string;
  documents: GapAnalysisDocumentInput[];
  pack_notes?: string[];
}

interface GroqGapItemDraft {
  title: string | null;
  severity: string | null;
  related_assertion_labels: string[] | null;
  rationale: string | null;
  suggested_evidence: string[] | null;
}

interface GroqGapAnalysisDraft {
  schema_name: "gap_analysis";
  schema_version: string;
  covered_labels: string[] | null;
  missing_labels: string[] | null;
  readiness_score: number | null;
  recommendations: string[] | null;
  gaps: GroqGapItemDraft[] | null;
}

const ASSERTION_IDS = ASSERTION_CATALOG.map((item) => item.id);

export const groqGapAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema_name: { type: "string", const: "gap_analysis" },
    schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
    covered_labels: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    missing_labels: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    readiness_score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    recommendations: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    gaps: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: ["string", "null"] },
          severity: { type: ["string", "null"] },
          related_assertion_labels: {
            type: ["array", "null"],
            items: { type: "string" },
          },
          rationale: { type: ["string", "null"] },
          suggested_evidence: {
            type: ["array", "null"],
            items: { type: "string" },
          },
        },
        required: [
          "title",
          "severity",
          "related_assertion_labels",
          "rationale",
          "suggested_evidence",
        ],
      },
    },
  },
  required: [
    "schema_name",
    "schema_version",
    "covered_labels",
    "missing_labels",
    "readiness_score",
    "recommendations",
    "gaps",
  ],
} as const;

export function parseGapAnalysisToolInput(value: unknown): GapAnalysisToolInput {
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

  const documents = documentsValue.map(parseGapDocument);

  return {
    pack_id: readRequiredString(value.pack_id, "pack_id"),
    engagement_name: readRequiredString(value.engagement_name, "engagement_name"),
    audit_area: readOptionalString(value.audit_area, "audit_area"),
    stage: readOptionalString(value.stage, "stage"),
    documents,
    pack_notes: parseOptionalStringArray(value.pack_notes, "pack_notes"),
  };
}

export function buildGapAnalysisMessages(input: GapAnalysisToolInput) {
  const summarizedDocuments = input.documents.map((document) => ({
    document_id: document.document_id,
    filename: document.filename,
    document_type: document.classification?.document_type ?? null,
    assertions:
      document.assertion_mapping?.mapped_assertions
        .filter((item) => item.coverage !== "not_supported")
        .map((item) => `${item.assertion_label} (${item.coverage})`) ?? [],
    source_confidence: document.source_confidence?.source_confidence ?? document.classification?.source_confidence ?? null,
    notes: document.notes ?? [],
    extracted_signals: {
      document_date: document.metadata?.document_date ?? null,
      period_end: document.metadata?.period_end ?? null,
      reference: document.metadata?.document_reference ?? null,
      parties: document.metadata?.parties.map((item) => `${item.role}: ${item.name}`) ?? [],
      amounts: document.metadata?.key_amounts.map((item) => `${item.label}: ${item.amount}${item.currency ? ` ${item.currency}` : ""}`) ?? [],
    },
  }));
  const retrievedChunks = retrieveGapAnalysisChunks({
    packId: input.pack_id,
    engagementName: input.engagement_name,
    auditArea: input.audit_area,
    stage: input.stage,
    packNotes: input.pack_notes,
    documents: input.documents
      .filter((document): document is GapAnalysisDocumentInput & { document_text: string } => Boolean(document.document_text))
      .map((document) => ({
        documentId: document.document_id,
        documentName: document.filename,
        documentText: document.document_text,
        context: document.context,
        classificationSummary: document.classification
          ? `Classified as ${document.classification.document_type}.`
          : undefined,
        metadataSummary: document.metadata
          ? [
              document.metadata.document_date ? `Date ${document.metadata.document_date}` : null,
              document.metadata.document_reference ? `Ref ${document.metadata.document_reference}` : null,
            ]
              .filter((value): value is string => Boolean(value))
              .join(". ")
          : undefined,
        notes: document.notes,
        supportedAssertions:
          document.assertion_mapping?.mapped_assertions
            .filter((item) => item.coverage !== "not_supported")
            .map((item) => `${item.assertion_label} (${item.coverage})`) ?? [],
        sourceConfidence:
          document.source_confidence?.source_confidence ?? document.classification?.source_confidence ?? null,
      })),
  });
  const compactDocumentCards = summarizedDocuments.map((document) =>
    [
      `${document.document_id} (${document.filename})`,
      `type=${document.document_type ?? "unknown"}`,
      `assertions=${document.assertions.join(", ") || "none"}`,
      `source_confidence=${document.source_confidence ?? "unknown"}`,
      `signals=${[
        document.extracted_signals.document_date,
        document.extracted_signals.period_end,
        document.extracted_signals.reference,
      ]
        .filter((value): value is string => Boolean(value))
        .join(", ") || "none"}`,
      document.notes.length > 0 ? `notes=${document.notes.join(" | ")}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" | "),
  );

  return [
    {
      role: "system" as const,
      content: [
        "You are Linow's audit gap analysis agent.",
        `Return JSON that matches schema_version ${AGENT_SCHEMA_VERSION} exactly.`,
        "Review the pack as an evidence-readiness assessment, not an audit opinion.",
        "Detect missing evidence, partial coverage, and cut-off or approval issues.",
        "Do not claim the underlying transactions are proven true.",
        "Use a readiness score from 0 to 100.",
        "Keep gaps conservative when support is incomplete.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Pack id: ${input.pack_id}`,
        `Engagement name: ${input.engagement_name}`,
        input.audit_area ? `Audit area: ${input.audit_area}` : null,
        input.stage ? `Stage: ${input.stage}` : null,
        input.pack_notes && input.pack_notes.length > 0 ? `Pack notes: ${input.pack_notes.join(" | ")}` : null,
        "Compact document coverage cards:",
        ...compactDocumentCards,
        retrievedChunks.length > 0 ? "Retrieved evidence excerpts:" : null,
        ...retrievedChunks.map((chunk) =>
          [
            `${chunk.document_name} :: ${chunk.chunk_id} [chars ${chunk.char_start}-${chunk.char_end}]`,
            chunk.text,
          ].join("\n"),
        ),
        "Task:",
        "- Aggregate assertion coverage across the pack.",
        "- Identify open gaps, partial support, and unresolved review items.",
        "- Recommend concrete next evidence uploads or review actions.",
        "- Base recommendations on the compact cards and retrieved excerpts only.",
        "- If evidence remains partial, explain the limitation rather than assuming support.",
        "- Return covered_labels and missing_labels using canonical assertion labels only.",
        "- For each gap, return related_assertion_labels using canonical assertion labels only.",
        "- Always return every field, using empty arrays when needed.",
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
    },
  ];
}

export function isGroqGapAnalysisEnvelope(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}

export function normalizeGapAnalysisResult(
  input: GapAnalysisToolInput,
  value: unknown,
): GapAnalysisOutput {
  const draft = coerceGroqGapAnalysisDraft(value);
  const gaps = normalizeGapItems(draft.gaps);
  const coveredAssertions = normalizeAssertionIdsFromLabels(draft.covered_labels);
  const inferredCoveredAssertions =
    coveredAssertions.length > 0 ? coveredAssertions : deriveCoveredAssertionsFromGaps(gaps);
  const coveredLabels = normalizeLabels(draft.covered_labels, inferredCoveredAssertions);
  const missingAssertions = normalizeAssertionIdsFromLabels(draft.missing_labels);
  const effectiveMissingAssertions =
    missingAssertions.length > 0 ? missingAssertions : deriveMissingAssertions(inferredCoveredAssertions);
  const recommendations =
    draft.recommendations && draft.recommendations.length > 0
      ? draft.recommendations
      : deriveRecommendations(gaps);

  return {
    schema_name: "gap_analysis",
    schema_version: AGENT_SCHEMA_VERSION,
    pack_id: input.pack_id,
    total_assertions: ASSERTION_IDS.length,
    covered_assertions: inferredCoveredAssertions,
    covered_labels: coveredLabels,
    missing_assertions: effectiveMissingAssertions,
    missing_labels: normalizeLabels(draft.missing_labels, effectiveMissingAssertions),
    readiness_score: normalizeReadinessScore(draft.readiness_score, coveredAssertions, effectiveMissingAssertions, gaps),
    recommendations,
    gaps,
    evidence_count: input.documents.length,
    finding_count: gaps.length,
  };
}

function parseGapDocument(value: unknown): GapAnalysisDocumentInput {
  if (!isRecord(value)) {
    throw new AgentInputError("Each document must be an object.");
  }

  return {
    document_id: readRequiredString(value.document_id, "documents[].document_id"),
    filename: readRequiredString(value.filename, "documents[].filename"),
    document_text: readOptionalString(value.document_text, "documents[].document_text"),
    context: parseDocumentContext(value.context),
    classification: parseOptionalNested(value.classification, "documents[].classification", isEvidenceClassificationOutput),
    metadata: parseOptionalNested(value.metadata, "documents[].metadata", isMetadataExtractionOutput),
    assertion_mapping: parseOptionalNested(value.assertion_mapping, "documents[].assertion_mapping", isAssertionMappingOutput),
    source_confidence: parseOptionalNested(value.source_confidence, "documents[].source_confidence", isSourceConfidenceOutput),
    notes: parseOptionalStringArray(value.notes, "documents[].notes"),
  };
}

function parseOptionalNested<T>(
  value: unknown,
  fieldName: string,
  guard: (candidate: unknown) => candidate is T,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!guard(value)) {
    throw new AgentInputError(`${fieldName} must match the expected schema when provided.`);
  }

  return value;
}

function coerceGroqGapAnalysisDraft(value: unknown): GroqGapAnalysisDraft {
  if (!isRecord(value)) {
    return createEmptyGapAnalysisDraft();
  }

  return {
    schema_name: "gap_analysis",
    schema_version: AGENT_SCHEMA_VERSION,
    covered_labels: coerceOptionalStringArray(value.covered_labels),
    missing_labels: coerceOptionalStringArray(value.missing_labels),
    readiness_score: coerceOptionalInteger(value.readiness_score),
    recommendations: coerceOptionalStringArray(value.recommendations),
    gaps: coerceOptionalGapItemDrafts(value.gaps),
  };
}

function normalizeGapItems(value: GroqGapItemDraft[] | null): GapItem[] {
  if (!value || value.length === 0) {
    return [];
  }

  return value
    .map((item) => {
      const relatedAssertions =
        normalizeAssertionIdsFromLabels(item.related_assertion_labels).length > 0
          ? normalizeAssertionIdsFromLabels(item.related_assertion_labels)
          : inferAssertionIdsFromText([item.title, item.rationale]);
      const relatedAssertionLabels = normalizeLabels(item.related_assertion_labels, relatedAssertions);
      const severity = normalizeGapSeverity(item.severity);

      if (!item.title || !item.rationale) {
        return null;
      }

      return {
        title: item.title,
        severity,
        related_assertions: relatedAssertions,
        related_assertion_labels: relatedAssertionLabels,
        rationale: item.rationale,
        suggested_evidence: item.suggested_evidence ?? [],
      } satisfies GapItem;
    })
    .filter((item): item is GapItem => item !== null);
}

function normalizeAssertionIdsFromLabels(value: string[] | null | undefined): AssertionId[] {
  if (!value || value.length === 0) {
    return [];
  }

  const normalized = value
    .map((item) => getAssertionIdByLabel(item))
    .filter((item): item is AssertionId => item !== null);

  return Array.from(new Set(normalized)) as AssertionId[];
}

function normalizeLabels(value: string[] | null | undefined, assertionIds: AssertionId[]): string[] {
  if (value && value.length > 0) {
    return value;
  }

  return assertionIds.map((assertionId) => getAssertionLabel(assertionId));
}

function deriveMissingAssertions(coveredAssertions: AssertionId[]): AssertionId[] {
  return ASSERTION_IDS.filter((assertionId) => !coveredAssertions.includes(assertionId)) as AssertionId[];
}

function deriveCoveredAssertionsFromGaps(gaps: GapItem[]): AssertionId[] {
  const missing = new Set(gaps.flatMap((gap) => gap.related_assertions));
  return ASSERTION_IDS.filter((assertionId) => !missing.has(assertionId)) as AssertionId[];
}

function normalizeReadinessScore(
  value: number | null,
  coveredAssertions: AssertionId[],
  missingAssertions: AssertionId[],
  gaps: GapItem[],
): number {
  if (isNonNegativeInteger(value)) {
    return Math.max(0, Math.min(100, value));
  }

  const coverageScore = Math.round((coveredAssertions.length / ASSERTION_IDS.length) * 100);
  const gapPenalty = Math.min(40, gaps.length * 10 + missingAssertions.length * 4);
  return Math.max(0, Math.min(100, coverageScore - gapPenalty));
}

function deriveRecommendations(gaps: GapItem[]): string[] {
  const suggested = gaps.flatMap((gap) => gap.suggested_evidence);
  if (suggested.length > 0) {
    return Array.from(new Set(suggested)).slice(0, 6);
  }

  return [
    "Upload additional independent supporting evidence for unresolved assertions.",
    "Review approval, cut-off, and rights documentation for open gaps.",
  ];
}

function normalizeGapSeverity(value: string | null): GapItem["severity"] {
  return GAP_SEVERITY_LEVELS.includes(value as GapItem["severity"])
    ? (value as GapItem["severity"])
    : "medium";
}

function inferAssertionIdsFromText(values: Array<string | null>): AssertionId[] {
  const combined = values.filter((value): value is string => Boolean(value)).join(" ").toLowerCase();
  const matched = ASSERTION_CATALOG.filter((item) => combined.includes(item.label.toLowerCase())).map((item) => item.id);
  return Array.from(new Set(matched)) as AssertionId[];
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function createEmptyGapAnalysisDraft(): GroqGapAnalysisDraft {
  return {
    schema_name: "gap_analysis",
    schema_version: AGENT_SCHEMA_VERSION,
    covered_labels: null,
    missing_labels: null,
    readiness_score: null,
    recommendations: null,
    gaps: null,
  };
}

function coerceOptionalGapItemDrafts(value: unknown): GroqGapItemDraft[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((item) => coerceGapItemDraft(item))
    .filter((item): item is GroqGapItemDraft => item !== null);

  return items.length > 0 ? items : [];
}

function coerceGapItemDraft(value: unknown): GroqGapItemDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: coerceOptionalString(value.title),
    severity: coerceOptionalString(value.severity),
    related_assertion_labels: coerceOptionalStringArray(value.related_assertion_labels),
    rationale: coerceOptionalString(value.rationale),
    suggested_evidence: coerceOptionalStringArray(value.suggested_evidence),
  };
}

function coerceOptionalStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : [];
}

function coerceOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceOptionalInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
