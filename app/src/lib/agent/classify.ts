import {
  AGENT_SCHEMA_VERSION,
  SOURCE_CONFIDENCE_LEVELS,
  getAssertionIdByLabel,
  getAssertionLabel,
  type EvidenceClassificationOutput,
} from "@/lib/agent/schemas";
import {
  buildDocumentTypePromptBlock,
  calibrateClassificationAssertions,
  normalizeDocumentType,
} from "@/lib/agent/document-taxonomy";
import {
  buildDocumentContextLines,
  parseAgentDocumentInput,
  type AgentDocumentInput,
} from "@/lib/agent/common";

export type ClassifyDocumentInput = AgentDocumentInput;

interface GroqClassificationDraft {
  schema_name: "evidence_classification";
  schema_version: string;
  document_type: string;
  confidence: number | null;
  rationale: string | null;
  limitations: string[] | null;
  assertion_labels: string[] | null;
  source_confidence: string | null;
  source_confidence_reason: string | null;
}

export const groqClassificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema_name: { type: "string", const: "evidence_classification" },
    schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
    document_type: { type: "string" },
    confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
    rationale: { type: ["string", "null"] },
    limitations: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    assertion_labels: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    source_confidence: { type: ["string", "null"] },
    source_confidence_reason: { type: ["string", "null"] },
  },
  required: [
    "schema_name",
    "schema_version",
    "document_type",
    "confidence",
    "rationale",
    "limitations",
    "assertion_labels",
    "source_confidence",
    "source_confidence_reason",
  ],
} as const;

export function parseClassifyDocumentInput(value: unknown): ClassifyDocumentInput {
  return parseAgentDocumentInput(value);
}

export function buildClassificationMessages(input: ClassifyDocumentInput) {
  const contextLines = buildDocumentContextLines(input);

  return [
    {
      role: "system" as const,
      content: [
        "You are Linow's audit evidence classification agent.",
        `Return JSON that matches schema_version ${AGENT_SCHEMA_VERSION} exactly.`,
        "Classify the document into an audit-relevant type and map likely ISA 500 assertions.",
        "You must not claim that evidence is source-verified unless the input explicitly proves it.",
        "Use source confidence language L0-L5 exactly.",
        "Keep the output limited to classification fields only.",
        "Return assertion_labels only, using canonical labels exactly as listed by the user prompt.",
        "Prefer canonical lowercase_snake_case document_type values for known audit evidence categories.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Document id: ${input.documentId}`,
        `Document name: ${input.documentName}`,
        ...(contextLines.length > 0 ? contextLines : []),
        "Task:",
        "- Classify the document into an audit-relevant type.",
        "- Provide one confidence score between 0 and 1.",
        "- Explain the rationale briefly.",
        "- Return limitations as an array of caveats.",
        "- Return assertion_labels using only these exact values when applicable:",
        "- Existence",
        "- Completeness",
        "- Valuation & Allocation",
        "- Rights & Obligations",
        "- Cut-off",
        "- Classification",
        "- Occurrence",
        "- Accuracy",
        buildDocumentTypePromptBlock(),
        "- Assign source confidence with caveats.",
        "Document text:",
        input.documentText,
      ].join("\n"),
    },
  ];
}

export function isAgentClassificationResult(value: unknown): value is GroqClassificationDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.schema_name === "evidence_classification" &&
    candidate.schema_version === AGENT_SCHEMA_VERSION &&
    typeof candidate.document_type === "string" &&
    (candidate.confidence === null ||
      (typeof candidate.confidence === "number" && candidate.confidence >= 0 && candidate.confidence <= 1)) &&
    (candidate.rationale === null || typeof candidate.rationale === "string") &&
    (candidate.limitations === null ||
      (Array.isArray(candidate.limitations) && candidate.limitations.every((item) => typeof item === "string"))) &&
    (candidate.assertion_labels === null ||
      (Array.isArray(candidate.assertion_labels) && candidate.assertion_labels.every((item) => typeof item === "string"))) &&
    (candidate.source_confidence === null || typeof candidate.source_confidence === "string") &&
    (candidate.source_confidence_reason === null || typeof candidate.source_confidence_reason === "string")
  );
}

export function normalizeClassificationResult(
  input: ClassifyDocumentInput,
  value: GroqClassificationDraft,
): EvidenceClassificationOutput {
  const modelAssertionIds = (value.assertion_labels ?? []).reduce<Array<EvidenceClassificationOutput["assertions"][number]>>(
    (accumulator, label) => {
      const assertionId = getAssertionIdByLabel(label);

      if (assertionId === undefined || accumulator.includes(assertionId)) {
        return accumulator;
      }

      accumulator.push(assertionId);
      return accumulator;
    },
    [],
  );
  const documentType = normalizeDocumentType(value.document_type, input.documentName);
  const uniqueAssertionIds = calibrateClassificationAssertions(documentType, modelAssertionIds, input.documentText);
  const fallbackApplied =
    value.confidence === null ||
    value.rationale === null ||
    value.limitations === null ||
    value.assertion_labels === null ||
    value.source_confidence === null ||
    value.source_confidence_reason === null;
  const normalizedSourceConfidence = normalizeSourceConfidence(input, value.source_confidence);
  const limitations = value.limitations ?? [];

  return {
    schema_name: "evidence_classification",
    schema_version: AGENT_SCHEMA_VERSION,
    document_id: input.documentId,
    filename: input.documentName,
    document_type: documentType,
    confidence: typeof value.confidence === "number" ? value.confidence : 0.6,
    rationale:
      value.rationale ??
      "Classification generated from the visible document text with conservative fallback normalization.",
    limitations: fallbackApplied
      ? dedupeStrings([
          ...limitations,
          "Provider classification response omitted some structured fields; conservative fallback normalization applied.",
        ])
      : limitations,
    assertions: uniqueAssertionIds,
    assertion_labels: uniqueAssertionIds.map((assertionId) => getAssertionLabel(assertionId)),
    source_confidence: normalizedSourceConfidence,
    source_confidence_reason:
      value.source_confidence_reason ?? buildFallbackSourceConfidenceReason(input, normalizedSourceConfidence),
  };
}

function normalizeSourceConfidence(
  input: ClassifyDocumentInput,
  value: unknown,
): (typeof SOURCE_CONFIDENCE_LEVELS)[number] {
  if (typeof value === "string" && SOURCE_CONFIDENCE_LEVELS.includes(value as (typeof SOURCE_CONFIDENCE_LEVELS)[number])) {
    return value as (typeof SOURCE_CONFIDENCE_LEVELS)[number];
  }

  const uploaderLabel = input.context?.uploaderLabel?.toUpperCase() ?? "";
  const explicitLevel = SOURCE_CONFIDENCE_LEVELS.find((level) => uploaderLabel.includes(level));

  if (explicitLevel) {
    return explicitLevel;
  }

  if (uploaderLabel.includes("COMPANY UPLOAD")) {
    return "L2";
  }

  if (uploaderLabel.includes("CONNECTOR") || uploaderLabel.includes("SYSTEM")) {
    return "L3";
  }

  return "L1";
}

function buildFallbackSourceConfidenceReason(
  input: ClassifyDocumentInput,
  level: (typeof SOURCE_CONFIDENCE_LEVELS)[number],
): string {
  const uploaderLabel = input.context?.uploaderLabel?.trim();

  if (uploaderLabel) {
    return `Source confidence ${level} inferred conservatively from uploader context: ${uploaderLabel}.`;
  }

  return `Source confidence ${level} inferred conservatively because the provider response omitted an explicit source-confidence rationale.`;
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
