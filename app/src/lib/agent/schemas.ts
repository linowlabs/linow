export const AGENT_SCHEMA_VERSION = "1.0.0";

export const SOURCE_CONFIDENCE_LEVELS = ["L0", "L1", "L2", "L3", "L4", "L5"] as const;
export const ASSERTION_COVERAGE_LEVELS = ["primary", "supporting", "not_supported"] as const;
export const FINDING_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const FINDING_STATUSES = ["DRAFT", "CONFIRMED", "EDITED", "REJECTED"] as const;
export const GAP_SEVERITY_LEVELS = ["low", "medium", "high"] as const;

export type SourceConfidenceLevel = (typeof SOURCE_CONFIDENCE_LEVELS)[number];
export type AssertionCoverageLevel = (typeof ASSERTION_COVERAGE_LEVELS)[number];
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
export type FindingStatus = (typeof FINDING_STATUSES)[number];
export type GapSeverity = (typeof GAP_SEVERITY_LEVELS)[number];
export type AssertionId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type AgentSchemaName =
  | "evidence_classification"
  | "metadata_extraction"
  | "assertion_mapping"
  | "source_confidence"
  | "ccer_finding"
  | "gap_analysis"
  | "audit_pack_summary";

export interface AgentSchemaBase {
  schema_name: AgentSchemaName;
  schema_version: string;
}

export interface AgentCitation {
  document_id: string;
  filename: string;
  reference: string;
  page?: number | null;
  confidence: number;
}

export interface EvidenceClassificationOutput extends AgentSchemaBase {
  schema_name: "evidence_classification";
  document_id: string;
  filename: string;
  document_type: string;
  confidence: number;
  rationale: string;
  limitations: string[];
  assertions: AssertionId[];
  assertion_labels: string[];
  source_confidence: SourceConfidenceLevel;
  source_confidence_reason: string;
}

export interface ExtractedParty {
  name: string;
  role: string;
  confidence: number;
}

export interface ExtractedDate {
  label: string;
  value: string;
  confidence: number;
}

export interface ExtractedAmount {
  label: string;
  amount: number;
  currency?: string | null;
  confidence: number;
}

export interface MetadataExtractionOutput extends AgentSchemaBase {
  schema_name: "metadata_extraction";
  document_id: string;
  filename: string;
  document_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  document_reference?: string | null;
  parties: ExtractedParty[];
  key_dates: ExtractedDate[];
  key_amounts: ExtractedAmount[];
  citations: AgentCitation[];
  limitations: string[];
}

export interface AssertionMappingItem {
  assertion_id: AssertionId;
  assertion_label: string;
  coverage: AssertionCoverageLevel;
  rationale: string;
  confidence: number;
}

export interface AssertionMappingOutput extends AgentSchemaBase {
  schema_name: "assertion_mapping";
  document_id: string;
  filename: string;
  framework_reference: string;
  mapped_assertions: AssertionMappingItem[];
  overall_rationale: string;
  limitations: string[];
}

export interface SourceConfidenceOutput extends AgentSchemaBase {
  schema_name: "source_confidence";
  document_id: string;
  filename: string;
  source_confidence: SourceConfidenceLevel;
  source_confidence_reason: string;
  evidence_basis: string[];
  upgrade_path: string[];
  caveats: string[];
}

export interface CcerFindingOutput extends AgentSchemaBase {
  schema_name: "ccer_finding";
  finding_id: string;
  pack_id: string;
  severity: FindingSeverity;
  title: string;
  condition: string;
  criteria: string;
  cause: string;
  effect: string;
  recommendation: string;
  citations: AgentCitation[];
  missing_assertions: AssertionId[];
  missing_assertion_labels: string[];
  status: FindingStatus;
}

export interface GapItem {
  title: string;
  severity: GapSeverity;
  related_assertions: AssertionId[];
  related_assertion_labels: string[];
  rationale: string;
  suggested_evidence: string[];
}

export interface GapAnalysisOutput extends AgentSchemaBase {
  schema_name: "gap_analysis";
  pack_id: string;
  total_assertions: number;
  covered_assertions: AssertionId[];
  covered_labels: string[];
  missing_assertions: AssertionId[];
  missing_labels: string[];
  readiness_score: number;
  recommendations: string[];
  gaps: GapItem[];
  evidence_count: number;
  finding_count: number;
}

export interface SourceConfidenceDistributionItem {
  level: SourceConfidenceLevel;
  count: number;
}

export interface AuditPackSummaryOutput extends AgentSchemaBase {
  schema_name: "audit_pack_summary";
  pack_id: string;
  engagement_name: string;
  summary: string;
  evidence_count: number;
  document_types: string[];
  readiness_score: number;
  source_confidence_distribution: SourceConfidenceDistributionItem[];
  covered_assertions: AssertionId[];
  covered_labels: string[];
  missing_assertions: AssertionId[];
  missing_labels: string[];
  finding_ids: string[];
  next_actions: string[];
}

export const ASSERTION_CATALOG: ReadonlyArray<{ id: AssertionId; label: string }> = [
  { id: 0, label: "Existence" },
  { id: 1, label: "Completeness" },
  { id: 2, label: "Valuation & Allocation" },
  { id: 3, label: "Rights & Obligations" },
  { id: 4, label: "Cut-off" },
  { id: 5, label: "Classification" },
  { id: 6, label: "Occurrence" },
  { id: 7, label: "Accuracy" },
] as const;

const ASSERTION_IDS = ASSERTION_CATALOG.map((item) => item.id);

const schemaBaseProperties = (schemaName: AgentSchemaName) => ({
  schema_name: { type: "string", const: schemaName },
  schema_version: { type: "string", const: AGENT_SCHEMA_VERSION },
});

const idStringSchema = { type: "string", minLength: 1 } as const;
const confidenceNumberSchema = { type: "number", minimum: 0, maximum: 1 } as const;
const assertionIdsSchema = {
  type: "array",
  items: { type: "integer", enum: ASSERTION_IDS },
} as const;
const stringArraySchema = {
  type: "array",
  items: { type: "string" },
} as const;

const citationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    document_id: idStringSchema,
    filename: idStringSchema,
    reference: { type: "string" },
    page: { type: ["integer", "null"], minimum: 1 },
    confidence: confidenceNumberSchema,
  },
  required: ["document_id", "filename", "reference", "confidence"],
} as const;

export const evidenceClassificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...schemaBaseProperties("evidence_classification"),
    document_id: idStringSchema,
    filename: idStringSchema,
    document_type: { type: "string" },
    confidence: confidenceNumberSchema,
    rationale: { type: "string" },
    limitations: stringArraySchema,
    assertions: assertionIdsSchema,
    assertion_labels: stringArraySchema,
    source_confidence: { type: "string", enum: [...SOURCE_CONFIDENCE_LEVELS] },
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
} as const;

export const metadataExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...schemaBaseProperties("metadata_extraction"),
    document_id: idStringSchema,
    filename: idStringSchema,
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
          confidence: confidenceNumberSchema,
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
          confidence: confidenceNumberSchema,
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
          confidence: confidenceNumberSchema,
        },
        required: ["label", "amount", "confidence"],
      },
    },
    citations: {
      type: "array",
      items: citationSchema,
    },
    limitations: stringArraySchema,
  },
  required: [
    "schema_name",
    "schema_version",
    "document_id",
    "filename",
    "parties",
    "key_dates",
    "key_amounts",
    "citations",
    "limitations",
  ],
} as const;

export const assertionMappingSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...schemaBaseProperties("assertion_mapping"),
    document_id: idStringSchema,
    filename: idStringSchema,
    framework_reference: { type: "string" },
    mapped_assertions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          assertion_id: { type: "integer", enum: ASSERTION_IDS },
          assertion_label: { type: "string" },
          coverage: { type: "string", enum: [...ASSERTION_COVERAGE_LEVELS] },
          rationale: { type: "string" },
          confidence: confidenceNumberSchema,
        },
        required: ["assertion_id", "assertion_label", "coverage", "rationale", "confidence"],
      },
    },
    overall_rationale: { type: "string" },
    limitations: stringArraySchema,
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
} as const;

export const sourceConfidenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...schemaBaseProperties("source_confidence"),
    document_id: idStringSchema,
    filename: idStringSchema,
    source_confidence: { type: "string", enum: [...SOURCE_CONFIDENCE_LEVELS] },
    source_confidence_reason: { type: "string" },
    evidence_basis: stringArraySchema,
    upgrade_path: stringArraySchema,
    caveats: stringArraySchema,
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
} as const;

export const ccerFindingSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...schemaBaseProperties("ccer_finding"),
    finding_id: idStringSchema,
    pack_id: idStringSchema,
    severity: { type: "string", enum: [...FINDING_SEVERITIES] },
    title: { type: "string" },
    condition: { type: "string" },
    criteria: { type: "string" },
    cause: { type: "string" },
    effect: { type: "string" },
    recommendation: { type: "string" },
    citations: {
      type: "array",
      items: citationSchema,
    },
    missing_assertions: assertionIdsSchema,
    missing_assertion_labels: stringArraySchema,
    status: { type: "string", enum: [...FINDING_STATUSES] },
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

export const gapAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...schemaBaseProperties("gap_analysis"),
    pack_id: idStringSchema,
    total_assertions: { type: "integer", minimum: 0 },
    covered_assertions: assertionIdsSchema,
    covered_labels: stringArraySchema,
    missing_assertions: assertionIdsSchema,
    missing_labels: stringArraySchema,
    readiness_score: { type: "integer", minimum: 0, maximum: 100 },
    recommendations: stringArraySchema,
    gaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          severity: { type: "string", enum: [...GAP_SEVERITY_LEVELS] },
          related_assertions: assertionIdsSchema,
          related_assertion_labels: stringArraySchema,
          rationale: { type: "string" },
          suggested_evidence: stringArraySchema,
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
    evidence_count: { type: "integer", minimum: 0 },
    finding_count: { type: "integer", minimum: 0 },
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

export const auditPackSummarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...schemaBaseProperties("audit_pack_summary"),
    pack_id: idStringSchema,
    engagement_name: { type: "string" },
    summary: { type: "string" },
    evidence_count: { type: "integer", minimum: 0 },
    document_types: stringArraySchema,
    readiness_score: { type: "integer", minimum: 0, maximum: 100 },
    source_confidence_distribution: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          level: { type: "string", enum: [...SOURCE_CONFIDENCE_LEVELS] },
          count: { type: "integer", minimum: 0 },
        },
        required: ["level", "count"],
      },
    },
    covered_assertions: assertionIdsSchema,
    covered_labels: stringArraySchema,
    missing_assertions: assertionIdsSchema,
    missing_labels: stringArraySchema,
    finding_ids: stringArraySchema,
    next_actions: stringArraySchema,
  },
  required: [
    "schema_name",
    "schema_version",
    "pack_id",
    "engagement_name",
    "summary",
    "evidence_count",
    "document_types",
    "readiness_score",
    "source_confidence_distribution",
    "covered_assertions",
    "covered_labels",
    "missing_assertions",
    "missing_labels",
    "finding_ids",
    "next_actions",
  ],
} as const;

export const AGENT_OUTPUT_SCHEMAS = {
  evidence_classification: evidenceClassificationSchema,
  metadata_extraction: metadataExtractionSchema,
  assertion_mapping: assertionMappingSchema,
  source_confidence: sourceConfidenceSchema,
  ccer_finding: ccerFindingSchema,
  gap_analysis: gapAnalysisSchema,
  audit_pack_summary: auditPackSummarySchema,
} as const;

export function getAssertionLabel(assertionId: AssertionId): string {
  return ASSERTION_CATALOG.find((item) => item.id === assertionId)?.label ?? `Unknown (${assertionId})`;
}

export function isEvidenceClassificationOutput(value: unknown): value is EvidenceClassificationOutput {
  return (
    hasSchemaBase(value, "evidence_classification") &&
    hasString(value.document_id) &&
    hasString(value.filename) &&
    hasString(value.document_type) &&
    isConfidence(value.confidence) &&
    hasString(value.rationale) &&
    isStringArray(value.limitations) &&
    isAssertionIdArray(value.assertions) &&
    isStringArray(value.assertion_labels) &&
    isSourceConfidenceLevel(value.source_confidence) &&
    hasString(value.source_confidence_reason)
  );
}

export function isMetadataExtractionOutput(value: unknown): value is MetadataExtractionOutput {
  return (
    hasSchemaBase(value, "metadata_extraction") &&
    hasString(value.document_id) &&
    hasString(value.filename) &&
    isOptionalString(value.document_date) &&
    isOptionalString(value.period_start) &&
    isOptionalString(value.period_end) &&
    isOptionalString(value.document_reference) &&
    Array.isArray(value.parties) &&
    value.parties.every(isExtractedParty) &&
    Array.isArray(value.key_dates) &&
    value.key_dates.every(isExtractedDate) &&
    Array.isArray(value.key_amounts) &&
    value.key_amounts.every(isExtractedAmount) &&
    Array.isArray(value.citations) &&
    value.citations.every(isAgentCitation) &&
    isStringArray(value.limitations)
  );
}

export function isAssertionMappingOutput(value: unknown): value is AssertionMappingOutput {
  return (
    hasSchemaBase(value, "assertion_mapping") &&
    hasString(value.document_id) &&
    hasString(value.filename) &&
    hasString(value.framework_reference) &&
    Array.isArray(value.mapped_assertions) &&
    value.mapped_assertions.every(isAssertionMappingItem) &&
    hasString(value.overall_rationale) &&
    isStringArray(value.limitations)
  );
}

export function isSourceConfidenceOutput(value: unknown): value is SourceConfidenceOutput {
  return (
    hasSchemaBase(value, "source_confidence") &&
    hasString(value.document_id) &&
    hasString(value.filename) &&
    isSourceConfidenceLevel(value.source_confidence) &&
    hasString(value.source_confidence_reason) &&
    isStringArray(value.evidence_basis) &&
    isStringArray(value.upgrade_path) &&
    isStringArray(value.caveats)
  );
}

export function isCcerFindingOutput(value: unknown): value is CcerFindingOutput {
  return (
    hasSchemaBase(value, "ccer_finding") &&
    hasString(value.finding_id) &&
    hasString(value.pack_id) &&
    isFindingSeverity(value.severity) &&
    hasString(value.title) &&
    hasString(value.condition) &&
    hasString(value.criteria) &&
    hasString(value.cause) &&
    hasString(value.effect) &&
    hasString(value.recommendation) &&
    Array.isArray(value.citations) &&
    value.citations.every(isAgentCitation) &&
    isAssertionIdArray(value.missing_assertions) &&
    isStringArray(value.missing_assertion_labels) &&
    isFindingStatus(value.status)
  );
}

export function isGapAnalysisOutput(value: unknown): value is GapAnalysisOutput {
  return (
    hasSchemaBase(value, "gap_analysis") &&
    hasString(value.pack_id) &&
    isNonNegativeInteger(value.total_assertions) &&
    isAssertionIdArray(value.covered_assertions) &&
    isStringArray(value.covered_labels) &&
    isAssertionIdArray(value.missing_assertions) &&
    isStringArray(value.missing_labels) &&
    isReadinessScore(value.readiness_score) &&
    isStringArray(value.recommendations) &&
    Array.isArray(value.gaps) &&
    value.gaps.every(isGapItem) &&
    isNonNegativeInteger(value.evidence_count) &&
    isNonNegativeInteger(value.finding_count)
  );
}

export function isAuditPackSummaryOutput(value: unknown): value is AuditPackSummaryOutput {
  return (
    hasSchemaBase(value, "audit_pack_summary") &&
    hasString(value.pack_id) &&
    hasString(value.engagement_name) &&
    hasString(value.summary) &&
    isNonNegativeInteger(value.evidence_count) &&
    isStringArray(value.document_types) &&
    isReadinessScore(value.readiness_score) &&
    Array.isArray(value.source_confidence_distribution) &&
    value.source_confidence_distribution.every(isSourceConfidenceDistributionItem) &&
    isAssertionIdArray(value.covered_assertions) &&
    isStringArray(value.covered_labels) &&
    isAssertionIdArray(value.missing_assertions) &&
    isStringArray(value.missing_labels) &&
    isStringArray(value.finding_ids) &&
    isStringArray(value.next_actions)
  );
}

function hasSchemaBase(value: unknown, schemaName: AgentSchemaName): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.schema_name === schemaName &&
    value.schema_version === AGENT_SCHEMA_VERSION
  );
}

function isAgentCitation(value: unknown): value is AgentCitation {
  return (
    isRecord(value) &&
    hasString(value.document_id) &&
    hasString(value.filename) &&
    hasString(value.reference) &&
    isOptionalPage(value.page) &&
    isConfidence(value.confidence)
  );
}

function isExtractedParty(value: unknown): value is ExtractedParty {
  return isRecord(value) && hasString(value.name) && hasString(value.role) && isConfidence(value.confidence);
}

function isExtractedDate(value: unknown): value is ExtractedDate {
  return isRecord(value) && hasString(value.label) && hasString(value.value) && isConfidence(value.confidence);
}

function isExtractedAmount(value: unknown): value is ExtractedAmount {
  return (
    isRecord(value) &&
    hasString(value.label) &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    isOptionalString(value.currency) &&
    isConfidence(value.confidence)
  );
}

function isAssertionMappingItem(value: unknown): value is AssertionMappingItem {
  return (
    isRecord(value) &&
    isAssertionId(value.assertion_id) &&
    hasString(value.assertion_label) &&
    isAssertionCoverageLevel(value.coverage) &&
    hasString(value.rationale) &&
    isConfidence(value.confidence)
  );
}

function isGapItem(value: unknown): value is GapItem {
  return (
    isRecord(value) &&
    hasString(value.title) &&
    isGapSeverity(value.severity) &&
    isAssertionIdArray(value.related_assertions) &&
    isStringArray(value.related_assertion_labels) &&
    hasString(value.rationale) &&
    isStringArray(value.suggested_evidence)
  );
}

function isSourceConfidenceDistributionItem(value: unknown): value is SourceConfidenceDistributionItem {
  return isRecord(value) && isSourceConfidenceLevel(value.level) && isNonNegativeInteger(value.count);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isConfidence(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isReadinessScore(value: unknown): value is number {
  return isNonNegativeInteger(value) && value <= 100;
}

function isOptionalPage(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || (typeof value === "number" && Number.isInteger(value) && value >= 1);
}

function isAssertionId(value: unknown): value is AssertionId {
  return typeof value === "number" && ASSERTION_IDS.includes(value as AssertionId);
}

function isAssertionIdArray(value: unknown): value is AssertionId[] {
  return Array.isArray(value) && value.every((item) => isAssertionId(item));
}

function isSourceConfidenceLevel(value: unknown): value is SourceConfidenceLevel {
  return typeof value === "string" && SOURCE_CONFIDENCE_LEVELS.includes(value as SourceConfidenceLevel);
}

function isAssertionCoverageLevel(value: unknown): value is AssertionCoverageLevel {
  return typeof value === "string" && ASSERTION_COVERAGE_LEVELS.includes(value as AssertionCoverageLevel);
}

function isFindingSeverity(value: unknown): value is FindingSeverity {
  return typeof value === "string" && FINDING_SEVERITIES.includes(value as FindingSeverity);
}

function isFindingStatus(value: unknown): value is FindingStatus {
  return typeof value === "string" && FINDING_STATUSES.includes(value as FindingStatus);
}

function isGapSeverity(value: unknown): value is GapSeverity {
  return typeof value === "string" && GAP_SEVERITY_LEVELS.includes(value as GapSeverity);
}
