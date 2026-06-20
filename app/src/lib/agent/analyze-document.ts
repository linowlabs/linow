import {
  AGENT_SCHEMA_VERSION,
  ASSERTION_CATALOG,
  type MetadataExtractionOutput,
  type EvidenceClassificationOutput,
} from "@/lib/agent/schemas";
import {
  isAgentClassificationResult,
  normalizeClassificationResult,
  type ClassifyDocumentInput,
} from "@/lib/agent/classify";
import { buildDocumentTypePromptBlock } from "@/lib/agent/document-taxonomy";
import {
  buildDocumentContextLines,
  isRecord,
  type AgentDocumentInput,
} from "@/lib/agent/common";
import {
  normalizeAssertionMappingBundle,
  type AssertionMappingBundle,
  type AssertionMappingToolInput,
} from "@/lib/agent/map-assertions";
import { normalizeMetadataExtractionResult } from "@/lib/agent/extract-metadata";

interface GroqDocumentAnalysisBundle {
  classification: Parameters<typeof normalizeClassificationResult>[1];
  metadata: MetadataExtractionOutput;
  assertion_bundle: AssertionMappingBundle;
}

export const groqDocumentAnalysisBundleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    classification: {
      type: "object",
      additionalProperties: false,
      properties: {
        schema_name: { type: "string", const: "evidence_classification" },
        schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
        document_id: { type: "string", minLength: 1 },
        filename: { type: "string", minLength: 1 },
        document_type: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        rationale: { type: "string" },
        limitations: { type: "array", items: { type: "string" } },
        assertions: {
          type: "array",
          items: { type: ["integer", "string"] },
        },
        assertion_labels: {
          type: "array",
          items: { type: "string" },
        },
        source_confidence: { type: "string" },
        source_confidence_reason: { type: "string" },
      },
      required: [
        "schema_name",
        "schema_version",
        "document_id",
        "filename",
        "document_type",
        "confidence",
        "rationale",
        "limitations",
        "assertions",
        "assertion_labels",
        "source_confidence",
        "source_confidence_reason",
      ],
    },
    metadata: {
      type: "object",
      additionalProperties: false,
      properties: {
        schema_name: { type: "string", const: "metadata_extraction" },
        schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
        document_id: { type: "string", minLength: 1 },
        filename: { type: "string", minLength: 1 },
        document_date: { type: ["string", "null"] },
        period_start: { type: ["string", "null"] },
        period_end: { type: ["string", "null"] },
        document_reference: { type: ["string", "null"] },
        parties: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["name", "role", "confidence"],
          },
        },
        key_dates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["label", "value", "confidence"],
          },
        },
        key_amounts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              amount: { type: "number" },
              currency: { type: ["string", "null"] },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["label", "amount", "currency", "confidence"],
          },
        },
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
        limitations: { type: "array", items: { type: "string" } },
      },
      required: [
        "schema_name",
        "schema_version",
        "document_id",
        "filename",
        "document_date",
        "period_start",
        "period_end",
        "document_reference",
        "parties",
        "key_dates",
        "key_amounts",
        "citations",
        "limitations",
      ],
    },
    assertion_bundle: {
      type: "object",
      additionalProperties: false,
      properties: {
        assertion_mapping: {
          type: "object",
          additionalProperties: false,
          properties: {
            schema_name: { type: "string", const: "assertion_mapping" },
            schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
            document_id: { type: "string", minLength: 1 },
            filename: { type: "string", minLength: 1 },
            framework_reference: { type: "string" },
            mapped_assertions: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  assertion_id: { type: ["integer", "string"] },
                  assertion_label: { type: "string" },
                  coverage: { type: "string" },
                  rationale: { type: "string" },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                },
                required: ["assertion_id", "assertion_label", "coverage", "rationale", "confidence"],
              },
            },
            overall_rationale: { type: "string" },
            limitations: { type: "array", items: { type: "string" } },
          },
          required: [
            "schema_name",
            "schema_version",
            "document_id",
            "filename",
            "framework_reference",
            "mapped_assertions",
            "overall_rationale",
            "limitations",
          ],
        },
        source_confidence: {
          type: "object",
          additionalProperties: false,
          properties: {
            schema_name: { type: "string", const: "source_confidence" },
            schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
            document_id: { type: "string", minLength: 1 },
            filename: { type: "string", minLength: 1 },
            source_confidence: { type: "string" },
            source_confidence_reason: { type: "string" },
            evidence_basis: { type: "array", items: { type: "string" } },
            upgrade_path: { type: "array", items: { type: "string" } },
            caveats: { type: "array", items: { type: "string" } },
          },
          required: [
            "schema_name",
            "schema_version",
            "document_id",
            "filename",
            "source_confidence",
            "source_confidence_reason",
            "evidence_basis",
            "upgrade_path",
            "caveats",
          ],
        },
      },
      required: ["assertion_mapping", "source_confidence"],
    },
  },
  required: ["classification", "metadata", "assertion_bundle"],
} as const;

export function buildDocumentAnalysisMessages(input: AgentDocumentInput) {
  const contextLines = buildDocumentContextLines(input);

  return [
    {
      role: "system" as const,
      content: [
        "You are Linow's compact audit evidence analysis agent.",
        `Return JSON that matches schema_version ${AGENT_SCHEMA_VERSION} exactly.`,
        "In one pass, classify the evidence, extract supported metadata, map audit assertions, and assign source confidence L0-L5.",
        "Do not overclaim source verification.",
        "Company-uploaded evidence without connector proof is usually L2.",
        "Use only evidence visible in the current document text.",
        "Keep rationales concise and limitations explicit.",
        "Return assertion labels only from the canonical list provided by the user prompt.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Document id: ${input.documentId}`,
        `Document name: ${input.documentName}`,
        ...(contextLines.length > 0 ? contextLines : []),
        "Canonical assertions:",
        ...ASSERTION_CATALOG.map((item) => `- ${item.id}: ${item.label}`),
        "Document type guidance:",
        buildDocumentTypePromptBlock(),
        "Tasks:",
        "- classification: classify the document, provide confidence, rationale, limitations, canonical assertion_labels, and source_confidence.",
        "- metadata: extract only supported dates, periods, reference IDs, parties, amounts, citations, and limitations.",
        "- assertion_bundle.assertion_mapping: map supported assertions using primary, supporting, or not_supported.",
        "- assertion_bundle.source_confidence: explain the source confidence, basis, upgrade path, and caveats.",
        "Document text:",
        input.documentText,
      ].join("\n"),
    },
  ];
}

export function isGroqDocumentAnalysisBundle(value: unknown): value is GroqDocumentAnalysisBundle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isAgentClassificationResult(value.classification) &&
    isMetadataDraft(value.metadata) &&
    isAssertionBundleDraft(value.assertion_bundle)
  );
}

export function normalizeDocumentAnalysisBundle(
  input: ClassifyDocumentInput & Pick<AssertionMappingToolInput, "frameworkReference">,
  value: GroqDocumentAnalysisBundle,
): {
  classification: EvidenceClassificationOutput;
  metadata: MetadataExtractionOutput;
  assertion_bundle: AssertionMappingBundle;
} {
  const classification = normalizeClassificationResult(input, value.classification);
  const metadata = normalizeMetadataExtractionResult(input, value.metadata);
  const assertionBundle = normalizeAssertionMappingBundle(
    {
      ...input,
      frameworkReference: input.frameworkReference ?? "ISA 500 evidence readiness",
      classificationSummary: [
        `Classified as ${classification.document_type}.`,
        `Supported assertions: ${classification.assertion_labels.join(", ") || "none"}.`,
        `Source confidence: ${classification.source_confidence}.`,
      ].join(" "),
      metadataSummary: buildMetadataSummary(metadata),
    },
    value.assertion_bundle,
  );

  return {
    classification,
    metadata,
    assertion_bundle: assertionBundle,
  };
}

function isMetadataDraft(value: unknown): value is MetadataExtractionOutput {
  return isRecord(value) && value.schema_name === "metadata_extraction";
}

function isAssertionBundleDraft(value: unknown): value is AssertionMappingBundle {
  return (
    isRecord(value) &&
    isRecord(value.assertion_mapping) &&
    isRecord(value.source_confidence) &&
    value.assertion_mapping.schema_name === "assertion_mapping" &&
    value.source_confidence.schema_name === "source_confidence"
  );
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

export type DocumentAnalysisBundle = ReturnType<typeof normalizeDocumentAnalysisBundle>;
