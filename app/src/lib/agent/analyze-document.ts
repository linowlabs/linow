import {
  AGENT_SCHEMA_VERSION,
  ASSERTION_CATALOG,
  metadataExtractionSchema,
  type MetadataExtractionOutput,
  type EvidenceClassificationOutput,
} from "@/lib/agent/schemas";
import {
  groqClassificationSchema,
  isAgentClassificationResult,
  normalizeClassificationResult,
  type ClassifyDocumentInput,
} from "@/lib/agent/classify";
import { buildDocumentTypePromptBlock } from "@/lib/agent/document-taxonomy";
import {
  buildDocumentContextLines,
  type AgentDocumentInput,
} from "@/lib/agent/common";
import {
  groqAssertionMappingBundleSchema,
  isAssertionMappingBundle,
  normalizeAssertionMappingBundle,
  type AssertionMappingBundle,
  type AssertionMappingToolInput,
} from "@/lib/agent/map-assertions";
import {
  isAgentMetadataExtractionResult,
  normalizeMetadataExtractionResult,
} from "@/lib/agent/extract-metadata";

interface GroqDocumentAnalysisBundle {
  classification: Parameters<typeof normalizeClassificationResult>[1];
  metadata: MetadataExtractionOutput;
  assertion_bundle: AssertionMappingBundle;
}

export const groqDocumentAnalysisBundleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    classification: groqClassificationSchema,
    metadata: metadataExtractionSchema,
    assertion_bundle: groqAssertionMappingBundleSchema,
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
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isAgentClassificationResult(candidate.classification) &&
    isAgentMetadataExtractionResult(candidate.metadata) &&
    isAssertionMappingBundle(candidate.assertion_bundle)
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
