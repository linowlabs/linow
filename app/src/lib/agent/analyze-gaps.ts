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
  related_assertions: Array<number | string> | null;
  related_assertion_labels: string[] | null;
  rationale: string | null;
  suggested_evidence: string[] | null;
}

interface GroqGapAnalysisDraft {
  schema_name: "gap_analysis";
  schema_version: string;
  pack_id: string;
  total_assertions: number | null;
  covered_assertions: Array<number | string> | null;
  covered_labels: string[] | null;
  missing_assertions: Array<number | string> | null;
  missing_labels: string[] | null;
  readiness_score: number | null;
  recommendations: string[] | null;
  gaps: GroqGapItemDraft[] | null;
  evidence_count: number | null;
  finding_count: number | null;
}

const ASSERTION_IDS = ASSERTION_CATALOG.map((item) => item.id);

export const groqGapAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema_name: { type: "string", const: "gap_analysis" },
    schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
    pack_id: { type: "string", minLength: 1 },
    total_assertions: { type: ["integer", "null"], minimum: 0 },
    covered_assertions: {
      type: ["array", "null"],
      items: { type: ["integer", "string"] },
    },
    covered_labels: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    missing_assertions: {
      type: ["array", "null"],
      items: { type: ["integer", "string"] },
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
          related_assertions: {
            type: ["array", "null"],
            items: { type: ["integer", "string"] },
          },
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
          "related_assertions",
          "related_assertion_labels",
          "rationale",
          "suggested_evidence",
        ],
      },
    },
    evidence_count: { type: ["integer", "null"], minimum: 0 },
    finding_count: { type: ["integer", "null"], minimum: 0 },
  },
  required: [
    "schema_name",
    "schema_version",
    "pack_id",
    "total_assertions",
    "covered_assertions",
    "covered_labels",
    "missing_assertions",
    "missing_labels",
    "readiness_score",
    "recommendations",
    "gaps",
    "evidence_count",
    "finding_count",
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
            `Context: ${chunk.contextual_summary}`,
            `Matched terms: ${chunk.matched_terms.join(", ") || "none"}`,
            `Excerpt: ${chunk.text}`,
          ].join("\n"),
        ),
        "Task:",
        "- Aggregate assertion coverage across the pack.",
        "- Identify open gaps, partial support, and unresolved review items.",
        "- Recommend concrete next evidence uploads or review actions.",
        "- Keep finding_count equal to the number of gap items that would likely become findings.",
        "- Base recommendations on the compact cards and retrieved excerpts only.",
        "- If evidence remains partial, explain the limitation rather than assuming support.",
        "- Always return every top-level field, using empty arrays when needed.",
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
    },
  ];
}

export function isGroqGapAnalysisResult(value: unknown): value is GroqGapAnalysisDraft {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schema_name === "gap_analysis" &&
    value.schema_version === AGENT_SCHEMA_VERSION &&
    typeof value.pack_id === "string" &&
    (value.total_assertions === null || Number.isInteger(value.total_assertions)) &&
    (value.covered_assertions === null ||
      (Array.isArray(value.covered_assertions) &&
        value.covered_assertions.every((item) => Number.isInteger(item) || typeof item === "string"))) &&
    (value.covered_labels === null ||
      (Array.isArray(value.covered_labels) && value.covered_labels.every((item) => typeof item === "string"))) &&
    (value.missing_assertions === null ||
      (Array.isArray(value.missing_assertions) &&
        value.missing_assertions.every((item) => Number.isInteger(item) || typeof item === "string"))) &&
    (value.missing_labels === null ||
      (Array.isArray(value.missing_labels) && value.missing_labels.every((item) => typeof item === "string"))) &&
    (value.readiness_score === null || Number.isInteger(value.readiness_score)) &&
    (value.recommendations === null ||
      (Array.isArray(value.recommendations) && value.recommendations.every((item) => typeof item === "string"))) &&
    (value.gaps === null || (Array.isArray(value.gaps) && value.gaps.every(isGroqGapItemDraft))) &&
    (value.evidence_count === null || Number.isInteger(value.evidence_count)) &&
    (value.finding_count === null || Number.isInteger(value.finding_count))
  );
}

export function normalizeGapAnalysisResult(
  input: GapAnalysisToolInput,
  value: GroqGapAnalysisDraft,
): GapAnalysisOutput {
  const coveredAssertions = normalizeAssertionIds(value.covered_assertions);
  const coveredLabels = normalizeLabels(value.covered_labels, coveredAssertions);
  const missingAssertions = normalizeAssertionIds(value.missing_assertions);
  const effectiveMissingAssertions =
    missingAssertions.length > 0 ? missingAssertions : deriveMissingAssertions(coveredAssertions);
  const gaps = normalizeGapItems(value.gaps);
  const recommendations =
    value.recommendations && value.recommendations.length > 0
      ? value.recommendations
      : deriveRecommendations(gaps);

  return {
    schema_name: "gap_analysis",
    schema_version: AGENT_SCHEMA_VERSION,
    pack_id: input.pack_id,
    total_assertions: isNonNegativeInteger(value.total_assertions) ? value.total_assertions : ASSERTION_IDS.length,
    covered_assertions: coveredAssertions,
    covered_labels: coveredLabels,
    missing_assertions: effectiveMissingAssertions,
    missing_labels: normalizeLabels(value.missing_labels, effectiveMissingAssertions),
    readiness_score: normalizeReadinessScore(value.readiness_score, coveredAssertions, effectiveMissingAssertions, gaps),
    recommendations,
    gaps,
    evidence_count: isNonNegativeInteger(value.evidence_count) ? value.evidence_count : input.documents.length,
    finding_count: isNonNegativeInteger(value.finding_count) ? value.finding_count : gaps.length,
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

function isGroqGapItemDraft(value: unknown): value is GroqGapItemDraft {
  return (
    isRecord(value) &&
    (value.title === null || typeof value.title === "string") &&
    (value.severity === null || typeof value.severity === "string") &&
    (value.related_assertions === null ||
      (Array.isArray(value.related_assertions) &&
        value.related_assertions.every((item) => Number.isInteger(item) || typeof item === "string"))) &&
    (value.related_assertion_labels === null ||
      (Array.isArray(value.related_assertion_labels) &&
        value.related_assertion_labels.every((item) => typeof item === "string"))) &&
    (value.rationale === null || typeof value.rationale === "string") &&
    (value.suggested_evidence === null ||
      (Array.isArray(value.suggested_evidence) && value.suggested_evidence.every((item) => typeof item === "string")))
  );
}

function normalizeGapItems(value: GroqGapItemDraft[] | null): GapItem[] {
  if (!value || value.length === 0) {
    return [];
  }

  return value
    .map((item) => {
      const relatedAssertions = normalizeAssertionIds(item.related_assertions);
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

function normalizeAssertionIds(value: Array<number | string> | null | undefined): AssertionId[] {
  if (!value || value.length === 0) {
    return [];
  }

  const normalized = value
    .map((item) => normalizeAssertionId(item))
    .filter((item): item is AssertionId => item !== null);

  return Array.from(new Set(normalized)) as AssertionId[];
}

function normalizeAssertionId(value: number | string): AssertionId | null {
  if (Number.isInteger(value) && ASSERTION_IDS.includes(value as AssertionId)) {
    return value as AssertionId;
  }

  if (typeof value === "string") {
    const numeric = Number.parseInt(value, 10);
    if (Number.isInteger(numeric) && ASSERTION_IDS.includes(numeric as AssertionId)) {
      return numeric as AssertionId;
    }

    const mapped = getAssertionIdByLabel(value);
    return mapped ?? null;
  }

  return null;
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
