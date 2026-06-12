import { AGENT_CONFIG } from "@/lib/agent/config";
import {
  AGENT_SCHEMA_VERSION,
  type AssertionMappingOutput,
  type EvidenceClassificationOutput,
  type GapAnalysisOutput,
  type MetadataExtractionOutput,
  type SourceConfidenceOutput,
  gapAnalysisSchema,
  isGapAnalysisOutput,
  isAssertionMappingOutput,
  isEvidenceClassificationOutput,
  isMetadataExtractionOutput,
  isSourceConfidenceOutput,
} from "@/lib/agent/schemas";
import {
  AgentInputError,
  isRecord,
  parseOptionalStringArray,
  readOptionalString,
  readRequiredString,
} from "@/lib/agent/common";

export interface GapAnalysisDocumentInput {
  document_id: string;
  filename: string;
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

export const groqGapAnalysisSchema = gapAnalysisSchema;

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
        "Document summaries:",
        JSON.stringify(summarizedDocuments, null, 2),
        "Task:",
        "- Aggregate assertion coverage across the pack.",
        "- Identify open gaps, partial support, and unresolved review items.",
        "- Recommend concrete next evidence uploads or review actions.",
        "- Keep finding_count equal to the number of gap items that would likely become findings.",
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
    },
  ];
}

export function isAgentGapAnalysisResult(value: unknown): value is GapAnalysisOutput {
  return isGapAnalysisOutput(value);
}

export function normalizeGapAnalysisResult(input: GapAnalysisToolInput, value: GapAnalysisOutput): GapAnalysisOutput {
  return {
    ...value,
    schema_name: "gap_analysis",
    schema_version: AGENT_SCHEMA_VERSION,
    pack_id: input.pack_id,
  };
}

function parseGapDocument(value: unknown): GapAnalysisDocumentInput {
  if (!isRecord(value)) {
    throw new AgentInputError("Each document must be an object.");
  }

  return {
    document_id: readRequiredString(value.document_id, "documents[].document_id"),
    filename: readRequiredString(value.filename, "documents[].filename"),
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
