import {
  AGENT_SCHEMA_VERSION,
  ASSERTION_CATALOG,
  FINDING_SEVERITIES,
  type AssertionMappingOutput,
  type CcerFindingOutput,
  type EvidenceClassificationOutput,
  type GapAnalysisOutput,
  type GapItem,
  type MetadataExtractionOutput,
  type SourceConfidenceOutput,
  getAssertionLabel,
  isAssertionMappingOutput,
  isEvidenceClassificationOutput,
  isGapAnalysisOutput,
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
import { retrieveFindingChunks } from "@/lib/agent/document-retrieval";

export interface CcerFindingDocumentInput {
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

export interface CcerFindingToolInput {
  pack_id: string;
  engagement_name: string;
  audit_area?: string;
  stage?: string;
  finding_id?: string;
  gap: GapItem;
  gap_analysis?: GapAnalysisOutput;
  documents: CcerFindingDocumentInput[];
  pack_notes?: string[];
}

const ASSERTION_IDS = ASSERTION_CATALOG.map((item) => item.id);

interface GroqDraftFindingCitation {
  document_id: string;
  filename: string;
  reference: string;
  page?: number | null;
  confidence: number;
}

interface GroqDraftFindingResult {
  schema_name: "ccer_finding";
  schema_version: string;
  finding_id: string;
  pack_id: string;
  severity: string;
  title: string;
  condition: string;
  criteria: string;
  cause: string;
  effect: string;
  recommendation: string;
  citations: GroqDraftFindingCitation[];
  missing_assertions: Array<number | string>;
  missing_assertion_labels: string[];
  status: string;
}

export const groqCcerFindingSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema_name: { type: "string", const: "ccer_finding" },
    schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
    finding_id: { type: "string", minLength: 1 },
    pack_id: { type: "string", minLength: 1 },
    severity: { type: "string" },
    title: { type: "string" },
    condition: { type: "string" },
    criteria: { type: "string" },
    cause: { type: "string" },
    effect: { type: "string" },
    recommendation: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          document_id: { type: "string", minLength: 1 },
          filename: { type: "string", minLength: 1 },
          reference: { type: "string" },
          page: { type: ["integer", "null"], minimum: 1 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["document_id", "filename", "reference", "page", "confidence"],
      },
    },
    missing_assertions: {
      type: "array",
      items: {
        type: ["integer", "string"],
      },
    },
    missing_assertion_labels: {
      type: "array",
      items: { type: "string" },
    },
    status: { type: "string" },
  },
  required: [
    "schema_name",
    "schema_version",
    "finding_id",
    "pack_id",
    "severity",
    "title",
    "condition",
    "criteria",
    "cause",
    "effect",
    "recommendation",
    "citations",
    "missing_assertions",
    "missing_assertion_labels",
    "status",
  ],
} as const;

export function parseCcerFindingToolInput(value: unknown): CcerFindingToolInput {
  if (!isRecord(value)) {
    throw new AgentInputError("Request body must be a JSON object.");
  }

  const documentsValue = value.documents;

  if (!Array.isArray(documentsValue) || documentsValue.length === 0) {
    throw new AgentInputError("documents must be a non-empty array.");
  }

  const gap = parseGapItem(value.gap, "gap");
  const documents = documentsValue.map(parseFindingDocument);

  return {
    pack_id: readRequiredString(value.pack_id, "pack_id"),
    engagement_name: readRequiredString(value.engagement_name, "engagement_name"),
    audit_area: readOptionalString(value.audit_area, "audit_area"),
    stage: readOptionalString(value.stage, "stage"),
    finding_id: readOptionalString(value.finding_id, "finding_id"),
    gap,
    gap_analysis: parseOptionalNested(value.gap_analysis, "gap_analysis", isGapAnalysisOutput),
    documents,
    pack_notes: parseOptionalStringArray(value.pack_notes, "pack_notes"),
  };
}

export function buildCcerFindingMessages(input: CcerFindingToolInput) {
  const relevantDocuments = input.documents
    .filter((document) => {
      const mappedAssertionIds =
        document.assertion_mapping?.mapped_assertions
          .filter((item) => item.coverage !== "not_supported")
          .map((item) => item.assertion_id) ?? [];

      return input.gap.related_assertions.some((assertionId) => mappedAssertionIds.includes(assertionId));
    })
    .map((document) => summarizeFindingDocument(document));
  const sourceDocuments = relevantDocuments.length > 0
    ? input.documents.filter((document) =>
        relevantDocuments.some((summary) => summary.document_id === document.document_id),
      )
    : input.documents;
  const documentSummaries = relevantDocuments.length > 0
    ? relevantDocuments
    : sourceDocuments.map((document) => summarizeFindingDocument(document));
  const missingAssertions = [...input.gap.related_assertions];
  const missingAssertionLabels =
    input.gap.related_assertion_labels.length > 0
      ? [...input.gap.related_assertion_labels]
      : input.gap.related_assertions.map((assertionId) => getAssertionLabel(assertionId));
  const retrievedChunks = retrieveFindingChunks({
    packId: input.pack_id,
    engagementName: input.engagement_name,
    auditArea: input.audit_area,
    stage: input.stage,
    gapTitle: input.gap.title,
    gapRationale: input.gap.rationale,
    relatedAssertions: input.gap.related_assertions,
    relatedAssertionLabels: missingAssertionLabels,
    packNotes: input.pack_notes,
    documents: sourceDocuments
      .filter((document): document is CcerFindingDocumentInput & { document_text: string } => Boolean(document.document_text))
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
              document.metadata.document_reference ? `Ref ${document.metadata.document_reference}` : null,
              document.metadata.document_date ? `Date ${document.metadata.document_date}` : null,
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

  return [
    {
      role: "system" as const,
      content: [
        "You are Linow's audit finding drafting agent.",
        `Return JSON that matches schema_version ${AGENT_SCHEMA_VERSION} exactly.`,
        "Draft one structured C-C-C-E-R finding from the provided gap.",
        "This is an audit-readiness aid, not an audit opinion.",
        "Use only the provided document summaries and citations.",
        "Keep status as DRAFT and do not propose chain submission.",
        "When returning missing_assertions, use only numeric assertion IDs from 0 to 7.",
        "Do not output assertion labels, strings, or objects inside missing_assertions.",
        "Copy missing_assertions and missing_assertion_labels exactly from the task instructions.",
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
        "Gap to convert into a finding:",
        JSON.stringify(
          {
            title: input.gap.title,
            severity: input.gap.severity,
            related_assertions: input.gap.related_assertions,
            related_assertion_labels: input.gap.related_assertion_labels,
            rationale: input.gap.rationale,
            suggested_evidence: input.gap.suggested_evidence,
          },
          null,
          2,
        ),
        input.gap_analysis
          ? `Gap analysis context: readiness ${input.gap_analysis.readiness_score}, findings ${input.gap_analysis.finding_count}.`
          : null,
        "Relevant document cards:",
        ...documentSummaries.map((document) =>
          [
            `${document.document_id} (${document.filename})`,
            `type=${document.document_type ?? "unknown"}`,
            `source_confidence=${document.source_confidence ?? "unknown"}`,
            `supported_assertions=${document.supported_assertions.join(", ") || "none"}`,
            `citations=${document.citations.map((citation) => citation.reference).join(" | ") || "none"}`,
            document.notes.length > 0 ? `notes=${document.notes.join(" | ")}` : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(" | "),
        ),
        retrievedChunks.length > 0 ? "Retrieved evidence excerpts:" : null,
        ...retrievedChunks.map((chunk) =>
          [
            `${chunk.document_name} :: ${chunk.chunk_id} [chars ${chunk.char_start}-${chunk.char_end}]`,
            chunk.text,
          ].join("\n"),
        ),
        "Task:",
        "- Produce a Condition, Criteria, Cause, Effect, and Recommendation finding.",
        "- Use citations only from the provided relevant document cards and retrieved excerpts.",
        "- Keep severity aligned with the input gap severity.",
        `- Set missing_assertions exactly to: ${JSON.stringify(missingAssertions)}.`,
        `- Set missing_assertion_labels exactly to: ${JSON.stringify(missingAssertionLabels)}.`,
        "- Keep finding_id stable if one is already provided.",
        "- If the excerpts are incomplete, keep the finding conservative and let the gap remain unresolved.",
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
    },
  ];
}

export function isGroqDraftFindingResult(value: unknown): value is GroqDraftFindingResult {
  return isRecord(value);
}

export function normalizeCcerFindingResult(
  input: CcerFindingToolInput,
  value: unknown,
): CcerFindingOutput {
  const draft = coerceGroqDraftFindingResult(value, input);
  const fallbackFindingId = input.finding_id ?? buildFindingId(input);
  const allowedDocuments = new Set(input.documents.map((document) => `${document.document_id}::${document.filename}`));
  const normalizedCitations = draft.citations.filter((citation) =>
    allowedDocuments.has(`${citation.document_id}::${citation.filename}`),
  );
  const fallbackCitations = deriveFallbackFindingCitations(input);
  const normalizedMissingAssertions = normalizeMissingAssertions(draft.missing_assertions, input.gap.related_assertions);
  const normalizedMissingAssertionLabels = buildAssertionLabelsFromIds(normalizedMissingAssertions);

  return {
    schema_name: "ccer_finding",
    schema_version: AGENT_SCHEMA_VERSION,
    finding_id: fallbackFindingId,
    pack_id: input.pack_id,
    severity: normalizeFindingSeverity(draft.severity, input.gap.severity),
    title: draft.title,
    condition: draft.condition,
    criteria: draft.criteria,
    cause: draft.cause,
    effect: draft.effect,
    recommendation: draft.recommendation,
    citations: normalizedCitations.length > 0 ? normalizedCitations : fallbackCitations,
    missing_assertions: normalizedMissingAssertions,
    missing_assertion_labels: normalizedMissingAssertionLabels,
    status: "DRAFT",
  };
}

function coerceGroqDraftFindingResult(value: unknown, input: CcerFindingToolInput): GroqDraftFindingResult {
  if (!isRecord(value)) {
    return createFallbackDraftFinding(input);
  }

  return (
    {
      schema_name: "ccer_finding",
      schema_version: AGENT_SCHEMA_VERSION,
      finding_id: coerceOptionalString(value.finding_id) ?? input.finding_id ?? buildFindingId(input),
      pack_id: input.pack_id,
      severity: coerceOptionalString(value.severity) ?? input.gap.severity,
      title: coerceOptionalString(value.title) ?? input.gap.title,
      condition: coerceOptionalString(value.condition) ?? input.gap.rationale,
      criteria:
        coerceOptionalString(value.criteria) ??
        "Sufficient and appropriate audit evidence should support the relevant assertion before reliance or approval.",
      cause: coerceOptionalString(value.cause) ?? "Supporting evidence for the identified assertion gap is incomplete.",
      effect: coerceOptionalString(value.effect) ?? "The evidence pack remains unresolved for the affected assertion.",
      recommendation:
        coerceOptionalString(value.recommendation) ??
        (input.gap.suggested_evidence[0] ??
          "Upload additional independent supporting evidence and complete reviewer follow-up."),
      citations: coerceDraftFindingCitations(value.citations),
      missing_assertions: coerceMissingAssertions(value.missing_assertions),
      missing_assertion_labels: coerceOptionalStringArray(value.missing_assertion_labels) ?? [],
      status: coerceOptionalString(value.status) ?? "DRAFT",
    } satisfies GroqDraftFindingResult
  );
}

function parseFindingDocument(value: unknown): CcerFindingDocumentInput {
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

function parseGapItem(value: unknown, fieldName: string): GapItem {
  if (!isRecord(value)) {
    throw new AgentInputError(`${fieldName} must be an object.`);
  }

  const severity = value.severity;

  if (severity !== "low" && severity !== "medium" && severity !== "high") {
    throw new AgentInputError(`${fieldName}.severity must be low, medium, or high.`);
  }

  const relatedAssertions = value.related_assertions;

  if (!Array.isArray(relatedAssertions) || !relatedAssertions.every((item) => Number.isInteger(item))) {
    throw new AgentInputError(`${fieldName}.related_assertions must be an array of assertion IDs.`);
  }

  const relatedAssertionLabels = parseOptionalStringArray(
    value.related_assertion_labels,
    `${fieldName}.related_assertion_labels`,
  ) ?? relatedAssertions.map((assertionId) => getAssertionLabel(assertionId as never));

  return {
    title: readRequiredString(value.title, `${fieldName}.title`),
    severity,
    related_assertions: relatedAssertions as GapItem["related_assertions"],
    related_assertion_labels: relatedAssertionLabels,
    rationale: readRequiredString(value.rationale, `${fieldName}.rationale`),
    suggested_evidence: parseOptionalStringArray(value.suggested_evidence, `${fieldName}.suggested_evidence`) ?? [],
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

function buildFindingId(input: CcerFindingToolInput): string {
  const suffix = input.gap.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return suffix.length > 0 ? `FND-${suffix}` : "FND-generated";
}

function normalizeFindingSeverity(
  value: string,
  gapSeverity: GapItem["severity"],
): CcerFindingOutput["severity"] {
  if (isFindingSeverityText(value)) {
    return value;
  }

  const fallbackMap = {
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
  } as const;

  return fallbackMap[gapSeverity];
}

function normalizeMissingAssertions(
  value: Array<number | string>,
  fallback: GapItem["related_assertions"],
): GapItem["related_assertions"] {
  const normalized = value
    .map((item) => normalizeAssertionId(item))
    .filter((item): item is GapItem["related_assertions"][number] => item !== null);

  return normalized.length > 0 ? dedupeAssertionIds(normalized) : [...fallback];
}

function normalizeAssertionId(value: number | string): GapItem["related_assertions"][number] | null {
  if (Number.isInteger(value) && ASSERTION_IDS.includes(value as (typeof ASSERTION_IDS)[number])) {
    return value as GapItem["related_assertions"][number];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const normalized = Number.parseInt(trimmed, 10);
    if (Number.isInteger(normalized) && ASSERTION_IDS.includes(normalized as (typeof ASSERTION_IDS)[number])) {
      return normalized as GapItem["related_assertions"][number];
    }

    const matchedAssertion = ASSERTION_CATALOG.find(
      (item) => normalizeAssertionLabel(item.label) === normalizeAssertionLabel(trimmed),
    );
    if (matchedAssertion) {
      return matchedAssertion.id;
    }
  }

  return null;
}

function dedupeAssertionIds(values: GapItem["related_assertions"]): GapItem["related_assertions"] {
  return Array.from(new Set(values)) as GapItem["related_assertions"];
}

function buildAssertionLabelsFromIds(assertionIds: GapItem["related_assertions"]): string[] {
  return assertionIds.map((assertionId) => getAssertionLabel(assertionId));
}

function isFindingSeverityText(value: string): value is CcerFindingOutput["severity"] {
  return FINDING_SEVERITIES.includes(value as CcerFindingOutput["severity"]);
}

function isGroqDraftFindingCitation(value: unknown): value is GroqDraftFindingCitation {
  return (
    isRecord(value) &&
    typeof value.document_id === "string" &&
    typeof value.filename === "string" &&
    typeof value.reference === "string" &&
    (value.page === null || value.page === undefined || Number.isInteger(value.page)) &&
    typeof value.confidence === "number"
  );
}

function normalizeAssertionLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function createFallbackDraftFinding(input: CcerFindingToolInput): GroqDraftFindingResult {
  return {
    schema_name: "ccer_finding",
    schema_version: AGENT_SCHEMA_VERSION,
    finding_id: input.finding_id ?? buildFindingId(input),
    pack_id: input.pack_id,
    severity: input.gap.severity,
    title: input.gap.title,
    condition: input.gap.rationale,
    criteria: "Sufficient and appropriate audit evidence should support the relevant assertion before reliance or approval.",
    cause: "Supporting evidence for the identified assertion gap is incomplete.",
    effect: "The evidence pack remains unresolved for the affected assertion.",
    recommendation:
      input.gap.suggested_evidence[0] ??
      "Upload additional independent supporting evidence and complete reviewer follow-up.",
    citations: deriveFallbackFindingCitations(input),
    missing_assertions: [...input.gap.related_assertions],
    missing_assertion_labels:
      buildAssertionLabelsFromIds(input.gap.related_assertions),
    status: "DRAFT",
  };
}

function coerceOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function coerceDraftFindingCitations(value: unknown): GroqDraftFindingCitation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isGroqDraftFindingCitation);
}

function coerceMissingAssertions(value: unknown): Array<number | string> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is number | string => typeof item === "string" || Number.isInteger(item));
}

function summarizeFindingDocument(document: CcerFindingDocumentInput) {
  return {
    document_id: document.document_id,
    filename: document.filename,
    document_type: document.classification?.document_type ?? null,
    source_confidence:
      document.source_confidence?.source_confidence ?? document.classification?.source_confidence ?? null,
    supported_assertions:
      document.assertion_mapping?.mapped_assertions
        .filter((item) => item.coverage !== "not_supported")
        .map((item) => `${item.assertion_label} (${item.coverage})`) ?? [],
    parties: document.metadata?.parties.map((item) => `${item.role}: ${item.name}`) ?? [],
    citations:
      document.metadata?.citations.map((citation) => ({
        document_id: citation.document_id,
        filename: citation.filename,
        page: citation.page ?? null,
        reference: citation.reference,
      })) ?? [],
    notes: document.notes ?? [],
  };
}

function deriveFallbackFindingCitations(input: CcerFindingToolInput): GroqDraftFindingCitation[] {
  const relevantDocuments = selectRelevantFindingDocuments(input);
  const metadataCitations = relevantDocuments.flatMap((document) =>
    (document.metadata?.citations ?? []).map((citation) => ({
      document_id: citation.document_id,
      filename: citation.filename,
      reference: citation.reference,
      page: citation.page ?? null,
      confidence: citation.confidence,
    })),
  );

  const dedupedMetadataCitations = dedupeFindingCitations(metadataCitations);
  if (dedupedMetadataCitations.length > 0) {
    return dedupedMetadataCitations.slice(0, 3);
  }

  const syntheticCitations = relevantDocuments
    .map((document) => buildSyntheticFindingCitation(document))
    .filter((citation): citation is GroqDraftFindingCitation => citation !== null);

  return dedupeFindingCitations(syntheticCitations).slice(0, 3);
}

function selectRelevantFindingDocuments(input: CcerFindingToolInput): CcerFindingDocumentInput[] {
  const directlyRelevant = input.documents.filter((document) => {
    const mappedAssertionIds =
      document.assertion_mapping?.mapped_assertions
        .filter((item) => item.coverage !== "not_supported")
        .map((item) => item.assertion_id) ?? [];

    return input.gap.related_assertions.some((assertionId) => mappedAssertionIds.includes(assertionId));
  });

  return directlyRelevant.length > 0 ? directlyRelevant : input.documents;
}

function buildSyntheticFindingCitation(document: CcerFindingDocumentInput): GroqDraftFindingCitation | null {
  const reference =
    document.metadata?.document_reference ??
    document.document_text?.slice(0, 180).replace(/\s+/g, " ").trim() ??
    document.notes?.[0];

  if (!reference) {
    return null;
  }

  return {
    document_id: document.document_id,
    filename: document.filename,
    reference,
    page: null,
    confidence: 0.6,
  };
}

function dedupeFindingCitations(citations: GroqDraftFindingCitation[]): GroqDraftFindingCitation[] {
  const seen = new Set<string>();
  const deduped: GroqDraftFindingCitation[] = [];

  for (const citation of citations) {
    const key = `${citation.document_id}::${citation.filename}::${citation.reference}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(citation);
  }

  return deduped;
}
