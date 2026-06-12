import {
  AGENT_SCHEMA_VERSION,
  ASSERTION_CATALOG,
  type AssertionMappingOutput,
  type SourceConfidenceOutput,
  assertionMappingSchema,
  isAssertionMappingOutput,
  isSourceConfidenceOutput,
  sourceConfidenceSchema,
  getAssertionLabel,
} from "@/lib/agent/schemas";
import {
  buildDocumentContextLines,
  type AgentDocumentInput,
  AgentInputError,
  isRecord,
  parseAgentDocumentInput,
} from "@/lib/agent/common";

export interface AssertionMappingToolInput extends AgentDocumentInput {
  frameworkReference?: string;
  classificationSummary?: string;
  metadataSummary?: string;
}

export interface AssertionMappingBundle {
  assertion_mapping: AssertionMappingOutput;
  source_confidence: SourceConfidenceOutput;
}

export const groqAssertionMappingBundleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assertion_mapping: assertionMappingSchema,
    source_confidence: sourceConfidenceSchema,
  },
  required: ["assertion_mapping", "source_confidence"],
} as const;

export function parseAssertionMappingToolInput(value: unknown): AssertionMappingToolInput {
  if (!isRecord(value)) {
    throw new AgentInputError("Request body must be a JSON object.");
  }

  const parsedBase = parseAgentDocumentInput(value);

  return {
    ...parsedBase,
    frameworkReference:
      typeof value.frameworkReference === "string" && value.frameworkReference.trim().length > 0
        ? value.frameworkReference.trim()
        : "ISA 500 evidence readiness",
    classificationSummary:
      typeof value.classificationSummary === "string" && value.classificationSummary.trim().length > 0
        ? value.classificationSummary.trim()
        : undefined,
    metadataSummary:
      typeof value.metadataSummary === "string" && value.metadataSummary.trim().length > 0
        ? value.metadataSummary.trim()
        : undefined,
  };
}

export function buildAssertionMappingMessages(input: AssertionMappingToolInput) {
  const contextLines = buildDocumentContextLines(input);

  return [
    {
      role: "system" as const,
      content: [
        "You are Linow's audit assertion mapping agent.",
        `Return JSON that matches schema_version ${AGENT_SCHEMA_VERSION} exactly.`,
        "Map the current document to ISA-style audit assertions and assign source confidence L0-L5.",
        "Do not overclaim source verification. Company-uploaded evidence without connector proof is usually L2.",
        "Use 'primary', 'supporting', or 'not_supported' for assertion coverage.",
        "Return both assertion_mapping and source_confidence objects.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Document id: ${input.documentId}`,
        `Document name: ${input.documentName}`,
        `Framework reference: ${input.frameworkReference ?? "ISA 500 evidence readiness"}`,
        ...(contextLines.length > 0 ? contextLines : []),
        input.classificationSummary ? `Classification summary: ${input.classificationSummary}` : null,
        input.metadataSummary ? `Metadata summary: ${input.metadataSummary}` : null,
        "Canonical assertions:",
        ...ASSERTION_CATALOG.map((item) => `- ${item.id}: ${item.label}`),
        "Task:",
        "- Map supported assertions with rationale and confidence.",
        "- Keep unsupported assertions in the output when relevant to explain limitations.",
        "- Decide source confidence and explain why.",
        "- Include upgrade path and caveats.",
        "Document text:",
        input.documentText,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
    },
  ];
}

export function isAssertionMappingBundle(value: unknown): value is AssertionMappingBundle {
  return (
    isRecord(value) &&
    isAssertionMappingOutput(value.assertion_mapping) &&
    isSourceConfidenceOutput(value.source_confidence)
  );
}

export function normalizeAssertionMappingBundle(
  input: AssertionMappingToolInput,
  value: AssertionMappingBundle,
): AssertionMappingBundle {
  return {
    assertion_mapping: {
      ...value.assertion_mapping,
      schema_name: "assertion_mapping",
      schema_version: AGENT_SCHEMA_VERSION,
      document_id: input.documentId,
      filename: input.documentName,
      framework_reference: input.frameworkReference ?? value.assertion_mapping.framework_reference,
      mapped_assertions: value.assertion_mapping.mapped_assertions.map((item) => ({
        ...item,
        assertion_label: item.assertion_label || getAssertionLabel(item.assertion_id),
      })),
    },
    source_confidence: {
      ...value.source_confidence,
      schema_name: "source_confidence",
      schema_version: AGENT_SCHEMA_VERSION,
      document_id: input.documentId,
      filename: input.documentName,
    },
  };
}
