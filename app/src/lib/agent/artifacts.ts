import { createHash } from "node:crypto";
import type {
  AgentSchemaName,
  AssertionMappingOutput,
  AuditPackSummaryOutput,
  CcerFindingOutput,
  EvidenceClassificationOutput,
  GapAnalysisOutput,
  MetadataExtractionOutput,
  SourceConfidenceOutput,
} from "@/lib/agent/schemas";
import {
  isAssertionMappingOutput,
  isAuditPackSummaryOutput,
  isCcerFindingOutput,
  isEvidenceClassificationOutput,
  isGapAnalysisOutput,
  isMetadataExtractionOutput,
  isSourceConfidenceOutput,
} from "@/lib/agent/schemas";
import { AgentInputError, isRecord, readOptionalString } from "@/lib/agent/common";

export type ValidatedAgentArtifact =
  | EvidenceClassificationOutput
  | MetadataExtractionOutput
  | AssertionMappingOutput
  | SourceConfidenceOutput
  | CcerFindingOutput
  | GapAnalysisOutput
  | AuditPackSummaryOutput;

export interface AgentArtifactHashRecord {
  label: string;
  schema_name: AgentSchemaName;
  schema_version: string;
  sha256: string;
  byte_length: number;
}

export interface AgentArtifactEnvelope {
  label: string;
  payload: ValidatedAgentArtifact;
}

export function parseAgentArtifactEnvelopes(value: unknown): AgentArtifactEnvelope[] {
  if (!isRecord(value)) {
    throw new AgentInputError("Request body must be a JSON object.");
  }

  if (Array.isArray(value.artifacts)) {
    if (value.artifacts.length === 0) {
      throw new AgentInputError("artifacts must be a non-empty array.");
    }

    return value.artifacts.map((item, index) => parseAgentArtifactEnvelope(item, `artifacts[${index}]`));
  }

  return [parseAgentArtifactEnvelope(value, "artifact")];
}

export function validateAgentArtifact(value: unknown): ValidatedAgentArtifact {
  if (!isRecord(value) || typeof value.schema_name !== "string") {
    throw new AgentInputError("Artifact payload must include a schema_name.");
  }

  switch (value.schema_name) {
    case "evidence_classification":
      ensureGuard(value, isEvidenceClassificationOutput, value.schema_name);
      return value;
    case "metadata_extraction":
      ensureGuard(value, isMetadataExtractionOutput, value.schema_name);
      return value;
    case "assertion_mapping":
      ensureGuard(value, isAssertionMappingOutput, value.schema_name);
      return value;
    case "source_confidence":
      ensureGuard(value, isSourceConfidenceOutput, value.schema_name);
      return value;
    case "ccer_finding":
      ensureGuard(value, isCcerFindingOutput, value.schema_name);
      return value;
    case "gap_analysis":
      ensureGuard(value, isGapAnalysisOutput, value.schema_name);
      return value;
    case "audit_pack_summary":
      ensureGuard(value, isAuditPackSummaryOutput, value.schema_name);
      return value;
    default:
      throw new AgentInputError(`Unsupported artifact schema_name: ${String(value.schema_name)}`);
  }
}

export function hashAgentArtifact(value: ValidatedAgentArtifact, label = defaultArtifactLabel(value)): AgentArtifactHashRecord {
  const canonicalJson = stableStringify(value);
  const digest = createHash("sha256").update(canonicalJson, "utf8").digest("hex");

  return {
    label,
    schema_name: value.schema_name,
    schema_version: value.schema_version,
    sha256: digest,
    byte_length: Buffer.byteLength(canonicalJson, "utf8"),
  };
}

export function validateAndHashAgentArtifact(value: unknown, label?: string): AgentArtifactHashRecord {
  return hashAgentArtifact(validateAgentArtifact(value), label);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function parseAgentArtifactEnvelope(value: unknown, fieldName: string): AgentArtifactEnvelope {
  if (!isRecord(value)) {
    throw new AgentInputError(`${fieldName} must be an object.`);
  }

  const payload = "payload" in value ? value.payload : value;
  const validatedPayload = validateAgentArtifact(payload);
  const label =
    readOptionalString(value.label, `${fieldName}.label`) ??
    defaultArtifactLabel(validatedPayload);

  return {
    label,
    payload: validatedPayload,
  };
}

function defaultArtifactLabel(value: ValidatedAgentArtifact): string {
  switch (value.schema_name) {
    case "evidence_classification":
      return `${value.schema_name}:${value.document_id}`;
    case "metadata_extraction":
      return `${value.schema_name}:${value.document_id}`;
    case "assertion_mapping":
      return `${value.schema_name}:${value.document_id}`;
    case "source_confidence":
      return `${value.schema_name}:${value.document_id}`;
    case "ccer_finding":
      return `${value.schema_name}:${value.finding_id}`;
    case "gap_analysis":
      return `${value.schema_name}:${value.pack_id}`;
    case "audit_pack_summary":
      return `${value.schema_name}:${value.pack_id}`;
    default:
      return "artifact";
  }
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (value && typeof value === "object") {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]);

    return Object.fromEntries(sortedEntries);
  }

  return value;
}

function ensureGuard<T>(
  value: unknown,
  guard: (candidate: unknown) => candidate is T,
  schemaName: string,
): asserts value is T {
  if (!guard(value)) {
    throw new AgentInputError(`Artifact payload did not match the ${schemaName} schema.`);
  }
}
