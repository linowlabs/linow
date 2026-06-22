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
  getAssertionIdByLabel,
  SOURCE_CONFIDENCE_LEVELS,
  type AssertionCoverageLevel,
  type AssertionId,
  type SourceConfidenceLevel,
} from "@/lib/agent/schemas";
import {
  buildDocumentContextLines,
  type AgentDocumentInput,
  AgentInputError,
  isRecord,
  parseAgentDocumentInput,
  resolveAgentDocumentInput,
  type ResolvedAgentDocumentInput,
} from "@/lib/agent/common";
import { retrieveAssertionMappingChunks } from "@/lib/agent/document-retrieval";

export interface AssertionMappingToolInput extends AgentDocumentInput {
  frameworkReference?: string;
  classificationSummary?: string;
  metadataSummary?: string;
}

export interface ResolvedAssertionMappingToolInput extends AssertionMappingToolInput, ResolvedAgentDocumentInput {}

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

export async function resolveAssertionMappingToolInput(value: unknown): Promise<ResolvedAssertionMappingToolInput> {
  if (!isRecord(value)) {
    throw new AgentInputError("Request body must be a JSON object.");
  }

  const parsedBase = await resolveAgentDocumentInput(value);

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
  const retrievedChunks = retrieveAssertionMappingChunks(input);

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
        "Retrieved evidence excerpts:",
        ...retrievedChunks.map((chunk) =>
          [
            `${chunk.chunk_id} [chars ${chunk.char_start}-${chunk.char_end}]`,
            `Context: ${chunk.contextual_summary}`,
            `Matched terms: ${chunk.matched_terms.join(", ") || "none"}`,
            `Excerpt: ${chunk.text}`,
          ].join("\n"),
        ),
        "Task:",
        "- Map supported assertions with rationale and confidence.",
        "- Keep unsupported assertions in the output when relevant to explain limitations.",
        "- Decide source confidence and explain why.",
        "- Include upgrade path and caveats.",
        "- Base your answer primarily on the retrieved evidence excerpts above.",
        "- If the excerpts are incomplete, stay conservative in your coverage and limitations.",
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
  value: Partial<AssertionMappingBundle>,
): AssertionMappingBundle {
  const assertionMapping: Record<string, unknown> = isRecord(value.assertion_mapping) ? value.assertion_mapping : {};
  const sourceConfidence: Record<string, unknown> = isRecord(value.source_confidence) ? value.source_confidence : {};

  return {
    assertion_mapping: {
      ...assertionMapping,
      schema_name: "assertion_mapping",
      schema_version: AGENT_SCHEMA_VERSION,
      document_id: input.documentId,
      filename: input.documentName,
      framework_reference:
        input.frameworkReference ??
        (typeof assertionMapping.framework_reference === "string"
          ? assertionMapping.framework_reference
          : "ISA 500 evidence readiness"),
      mapped_assertions: normalizeMappedAssertions(assertionMapping.mapped_assertions),
      overall_rationale:
        typeof assertionMapping.overall_rationale === "string" && assertionMapping.overall_rationale.trim().length > 0
          ? assertionMapping.overall_rationale.trim()
          : "Assertion mapping normalized from provider draft output.",
      limitations: normalizeStringArray(assertionMapping.limitations),
    },
    source_confidence: {
      ...sourceConfidence,
      schema_name: "source_confidence",
      schema_version: AGENT_SCHEMA_VERSION,
      document_id: input.documentId,
      filename: input.documentName,
      source_confidence: normalizeSourceConfidenceLevel(sourceConfidence.source_confidence),
      source_confidence_reason:
        typeof sourceConfidence.source_confidence_reason === "string" &&
        sourceConfidence.source_confidence_reason.trim().length > 0
          ? sourceConfidence.source_confidence_reason.trim()
          : "Source confidence normalized conservatively from provider draft output.",
      evidence_basis: normalizeStringArray(sourceConfidence.evidence_basis),
      upgrade_path: normalizeStringArray(sourceConfidence.upgrade_path),
      caveats: normalizeStringArray(sourceConfidence.caveats),
    },
  };
}

function normalizeMappedAssertions(value: unknown): AssertionMappingBundle["assertion_mapping"]["mapped_assertions"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const assertionId = normalizeAssertionId(item.assertion_id, item.assertion_label);

    if (assertionId === undefined) {
      return [];
    }

    return [
      {
        assertion_id: assertionId,
        assertion_label: getAssertionLabel(assertionId),
        coverage: normalizeCoverage(item.coverage),
        rationale:
          typeof item.rationale === "string" && item.rationale.trim().length > 0
            ? item.rationale.trim()
            : "Provider draft did not include a specific rationale.",
        confidence: normalizeConfidence(item.confidence),
      },
    ];
  });
}

function normalizeAssertionId(idValue: unknown, labelValue: unknown): AssertionId | undefined {
  if (typeof idValue === "number" && Number.isInteger(idValue) && idValue >= 0 && idValue <= 7) {
    return idValue as AssertionId;
  }

  if (typeof idValue === "string") {
    const parsed = Number(idValue);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 7) {
      return parsed as AssertionId;
    }
  }

  if (typeof labelValue === "string") {
    return getAssertionIdByLabel(labelValue);
  }

  return undefined;
}

function normalizeCoverage(value: unknown): AssertionCoverageLevel {
  return value === "primary" || value === "supporting" || value === "not_supported" ? value : "supporting";
}

function normalizeSourceConfidenceLevel(value: unknown): SourceConfidenceLevel {
  if (typeof value === "string") {
    const explicit = SOURCE_CONFIDENCE_LEVELS.find((level) => value.toUpperCase().includes(level));

    if (explicit) {
      return explicit;
    }
  }

  return "L2";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
}
