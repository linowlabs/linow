"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  createAttestationFlow,
  createAuditPackFlow,
  createBatchRegisterEvidenceFlow,
  createEmitAgentActionFlow,
  createRegisterEvidenceFlow,
  createVerifyEvidenceFlow,
  encryptJson,
  generateEncryptionKey,
  serializeEncryptedPayload,
  type AssertionId,
  type AttestationType,
  type AgentActionEventProof,
  type ExecuteTransactionBlockInput,
  type JsonValue,
  type SourceConfidenceLevel,
  type SuiObjectReadOptions,
} from "@linow/sdk";
import {
  createDemoEngagement,
  downloadDemoEvidenceFile,
  insertDemoAgentAction,
  insertDemoAttestation,
  isDemoStoreConfigured,
  loadDemoEngagement,
  updateDemoEngagement,
  uploadDemoEvidenceFile,
  upsertDemoEvidence,
  type DemoEvidenceRow,
} from "@/lib/demo-store";
import { useWalletBridge } from "@/lib/wallet-context";

type WorkspaceRole = "company" | "auditor" | "verifier";
type RailPanel = "explorer" | "settings";
type BottomTab = "details" | "chain" | "memory" | "agent" | "privacy" | "raw";
type OperationType = "register" | "batch" | "verify" | "attest" | "agent";
type RecordStatus = "Registered" | "Superseded";
type LocalDocumentStatus = "local" | "queued" | "registering" | "registered" | "flagged";

interface AttestationSummary {
  id: string;
  action: string;
  reviewer: string;
  note: string;
  txDigest: string;
  createdAt: string;
}

interface EvidenceRecord {
  id: string;
  date: string;
  type: string;
  source: string;
  commitment: string;
  status: RecordStatus;
  blobId: string;
  assertions: string[];
  reviewer: string;
  notes: string;
  fileSize?: string;
  fileName?: string;
  sourceFile?: File;
  auditPackId?: string;
  latestAttestation?: AttestationSummary;
  demoEvidenceRowId?: string;
  demoStoragePath?: string;
}

interface LocalDocument {
  id: string;
  file: File;
  fileName: string;
  fileSize: string;
  addedAt: string;
  documentType: string;
  source: string;
  description: string;
  assertions: string[];
  status: LocalDocumentStatus;
  evidenceId?: string;
  warning?: string;
  demoEvidenceRowId?: string;
  demoStoragePath?: string;
}

interface AuditPackDraft {
  id?: string;
  txDigest?: string;
  owner?: string;
  createdAt?: string;
  status: "not-created" | "created";
}

interface ProgressStep {
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
}

interface RegisterResult {
  objectId: string;
  txDigest: string;
  blobId: string;
  commitment: string;
  encryptedFileSize: string;
  encryptedMetadataSize: string;
  sourceConfidence: string;
}

interface VerificationSession {
  evidenceId: string;
  status: "success" | "tampered";
  checkedFileLabel: string;
  checkedAt: string;
}

interface ProofArtifactsSnapshot {
  auditPackId?: string;
  evidenceId?: string;
  txDigest?: string;
  packageId?: string;
  commitment?: string;
  blobReference?: string;
  attestationId?: string;
  verificationStatus?: "success" | "tampered";
  checkedFileLabel?: string;
  memoryStatus?: string;
  agentActionTxDigest?: string;
  agentActionEventType?: string;
  agentActionEventSeq?: string;
  agentActionOutputHash?: string;
  updatedAt: string;
}

interface AgentFindingSummary {
  id: string;
  title: string;
  severity: string;
  status: "draft" | "approved" | "logged" | "blocked";
}

interface AgentActionCandidate {
  packId?: string;
  actionType: string;
  outputHash: string;
  targetKind?: string;
  targetId?: string;
  evidenceId?: string;
  documentId?: string;
  findingId?: string;
  requiresHumanApproval: boolean;
}

interface LoggedAgentAction {
  key: string;
  packId: string;
  evidenceId?: string;
  actionType: string;
  outputHash: string;
  targetKind?: string;
  targetId?: string;
  signer: string;
  txDigest?: string;
  packageId?: string;
  eventCount: number;
  objectChangeCount: number;
  event?: AgentActionEventProof;
  loggedAt: string;
}

interface AgentActionLogState {
  status: "idle" | "signing" | "success" | "error";
  message: string;
  activeKey?: string;
  logs: LoggedAgentAction[];
}

interface AgentDocumentReview {
  id: string;
  filename: string;
  evidenceId?: string;
  documentType: string;
  confidence?: number;
  classificationRationale?: string;
  classificationLimitations: string[];
  sourceConfidence?: string;
  sourceReason?: string;
  sourceCaveats: string[];
  mappedAssertions: Array<{
    label: string;
    coverage: string;
    confidence?: number;
    rationale?: string;
  }>;
  metadataSummary: string[];
}

interface AgentFindingReview {
  id: string;
  title: string;
  severity: string;
  status: string;
  condition?: string;
  criteria?: string;
  cause?: string;
  effect?: string;
  recommendation?: string;
  missingAssertions: string[];
  citationCount: number;
}

interface AgentWorkspaceReview {
  documents: AgentDocumentReview[];
  findings: AgentFindingReview[];
  gapSummary: {
    readinessScore?: number;
    coveredLabels: string[];
    missingLabels: string[];
    recommendations: string[];
  };
  approval: {
    requiresHumanApproval: boolean;
    chainWriteReady: boolean;
    outputHashes: string[];
    nextSteps: string[];
  };
  persistence: {
    memoryNamespace?: string;
    memwalStatus?: string;
    walrusStatus?: string;
    manifestBlobId?: string;
    artifactBlobId?: string;
    linkedDocuments?: number;
    totalDocuments?: number;
  };
}

interface WalrusMemoryReloadResult {
  status: "reloaded";
  encrypted: true;
  network: string;
  manifestBlobId: string;
  artifactBlobId: string;
  manifest: {
    schemaName?: string;
    schemaVersion?: string;
    packId?: string;
    createdAt?: string;
    evidenceRefCount: number;
    agentOutputHashCount: number;
    findingHashCount: number;
    owner?: string;
    auditor?: string;
  };
  artifact: {
    schemaName?: string;
    schemaVersion?: string;
    packId?: string;
    createdAt?: string;
    documentCount: number;
    outputHashCount: number;
    artifactCount: number;
    findingCount: number;
    recalledCount: number;
    recallNoteCount: number;
    recallItemCount: number;
  };
}

interface WalrusMemoryReloadState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  result?: WalrusMemoryReloadResult;
}

interface AgentRunState {
  status: "idle" | "running" | "success" | "error";
  message: string;
  recalledPriorCount?: number;
  readinessScore?: number;
  documentsAnalyzed?: number;
  findings: AgentFindingSummary[];
  actionCandidates: AgentActionCandidate[];
  memoryStatus?: string;
  raw?: unknown;
}

interface RegisterDraftOverride {
  file: File;
  documentType: string;
  source: string;
  description: string;
  assertions: string[];
  localDocumentId?: string;
}

interface RegisterEvidenceDraft {
  file: File;
  documentType: string;
  source: string;
  description: string;
  assertions: string[];
  localDocumentId?: string;
}

interface RegisteredEvidenceArtifacts {
  record: EvidenceRecord;
  result: RegisterResult;
  localDocumentId?: string;
}

interface BatchRegistrationSummary {
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  lastError?: string;
}

interface CreatedAuditPackArtifacts {
  id: string;
  txDigest?: string;
  owner: string;
  createdAt: string;
}

interface DemoEngagementState {
  id?: string;
  companyWallet?: string;
  auditorWallet?: string;
  status: "disabled" | "idle" | "loading" | "ready" | "error";
  message: string;
}

const ISA_ASSERTIONS = [
  "Existence",
  "Completeness",
  "Valuation",
  "Rights & Obligations",
  "Cut-off",
  "Classification",
  "Occurrence",
  "Accuracy",
];

const PACKAGE_ID =
  process.env.NEXT_PUBLIC_LINOW_PACKAGE_ID ??
  "0x8460a046d70e0e0940d556d9526c48ee683ca8672390ff6480e937dc9a69d6aa";

const TEXT_AGENT_EXTENSIONS = new Set([
  "csv",
  "json",
  "md",
  "markdown",
  "txt",
  "tsv",
  "log",
  "xml",
  "yaml",
  "yml",
]);

const DEFAULT_AGENT_STATE: AgentRunState = {
  status: "idle",
  message: "Select evidence or a folder, then run analysis when the pack has readable text evidence.",
  findings: [],
  actionCandidates: [],
};

const DEFAULT_MEMORY_RELOAD_STATE: WalrusMemoryReloadState = {
  status: "idle",
  message: "Run agent analysis with Walrus fallback configured, then reload the encrypted memory artifact.",
};

const DEFAULT_AGENT_ACTION_LOG_STATE: AgentActionLogState = {
  status: "idle",
  message: "Approve an agent action candidate to log its output hash on Sui.",
  logs: [],
};

const DEFAULT_DEMO_ENGAGEMENT_STATE: DemoEngagementState = {
  status: isDemoStoreConfigured() ? "idle" : "disabled",
  message: isDemoStoreConfigured()
    ? "Create or load a shared demo engagement to sync across browsers."
    : "Supabase demo persistence is not configured.",
};

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed with HTTP ${response.status}.`,
    );
  }

  return payload as TResponse;
}

const serverTatumExecute = {
  executeTransactionBlock(input: ExecuteTransactionBlockInput) {
    return postJson<JsonValue>("/api/sui/execute", input);
  },
};

const serverTatumRead = {
  getObject(objectId: string, options?: SuiObjectReadOptions) {
    return postJson<JsonValue>("/api/sui/object", { objectId, options });
  },
};

function truncateValue(value: string, visible = 18): string {
  return value.length > visible ? `${value.substring(0, visible)}...` : value;
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toSourceLabel(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "Company Upload (L2)";
  return trimmed.includes("(L") ? trimmed : `${trimmed} (L2)`;
}

function toAssertionId(assertion: string): AssertionId {
  const index = ISA_ASSERTIONS.indexOf(assertion);
  if (index < 0) throw new Error(`Unsupported ISA assertion: ${assertion}`);
  return index as AssertionId;
}

function toAttestationType(action: string): AttestationType {
  if (action === "IssueFlagged") return "rejected";
  if (action === "EvidenceReviewed") return "evidenceVerified";
  return "hashConfirmed";
}

function toAttestationLabel(value: AttestationType): string {
  const labels: Record<AttestationType, string> = {
    evidenceVerified: "Evidence reviewed",
    packReviewed: "Pack reviewed",
    hashConfirmed: "Hash confirmed",
    rejected: "Issue flagged",
  };

  return labels[value];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function nowLabel(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 16);
}

function createLocalDocument(file: File): LocalDocument {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    fileName: file.name,
    fileSize: formatMegabytes(file.size),
    addedAt: nowLabel(),
    documentType: inferDocumentType(file.name),
    source: "Company Upload (L2)",
    description: "",
    assertions: ["Existence"],
    status: "local",
  };
}

function createLocalDocumentFromDemoEvidence(row: DemoEvidenceRow, file: File): LocalDocument {
  return {
    id: row.id,
    file,
    fileName: row.file_name,
    fileSize: formatMegabytes(row.file_size ?? file.size),
    addedAt: row.created_at?.replace("T", " ").substring(0, 16) ?? nowLabel(),
    documentType: row.document_type ?? inferDocumentType(row.file_name),
    source: row.source ?? "Company Upload (L2)",
    description: row.description ?? "",
    assertions: Array.isArray(row.assertions) ? row.assertions : ["Existence"],
    status: row.evidence_id ? "registered" : "local",
    evidenceId: row.evidence_id ?? undefined,
    demoEvidenceRowId: row.id,
    demoStoragePath: row.storage_path ?? undefined,
  };
}

function createEvidenceRecordFromDemoEvidence(
  row: DemoEvidenceRow,
  sourceFile?: File,
  attestation?: AttestationSummary,
): EvidenceRecord | undefined {
  if (!row.evidence_id || !row.commitment || !row.walrus_blob_id) return undefined;

  return {
    id: row.evidence_id,
    date: row.updated_at?.replace("T", " ").substring(0, 16) ?? row.created_at?.replace("T", " ").substring(0, 16) ?? nowLabel(),
    type: row.document_type ?? inferDocumentType(row.file_name),
    source: row.source ?? "Company Upload (L2)",
    commitment: row.commitment,
    status: "Registered",
    blobId: row.walrus_blob_id,
    assertions: Array.isArray(row.assertions) ? row.assertions : [],
    reviewer: attestation?.reviewer ?? "n/a",
    notes: attestation?.note ?? row.description ?? "Loaded from shared demo engagement.",
    fileSize: row.file_size ? formatMegabytes(row.file_size) : undefined,
    fileName: row.file_name,
    sourceFile,
    auditPackId: row.audit_pack_id ?? undefined,
    latestAttestation: attestation,
    demoEvidenceRowId: row.id,
    demoStoragePath: row.storage_path ?? undefined,
  };
}

function toDemoEvidenceRow(input: {
  engagementId: string;
  document: LocalDocument;
  bucket?: string;
  path?: string;
  record?: EvidenceRecord;
  signerAddress?: string;
}): DemoEvidenceRow {
  return {
    id: input.document.demoEvidenceRowId ?? input.document.id,
    engagement_id: input.engagementId,
    evidence_id: input.record?.id ?? input.document.evidenceId ?? null,
    file_name: input.document.fileName,
    file_mime: input.document.file.type || "application/octet-stream",
    file_size: input.document.file.size,
    storage_bucket: input.bucket ?? "demo-evidence",
    storage_path: input.path ?? input.document.demoStoragePath ?? null,
    document_type: input.record?.type ?? input.document.documentType,
    source: input.record?.source ?? input.document.source,
    description: input.record?.notes ?? input.document.description,
    assertions: input.record?.assertions ?? input.document.assertions,
    commitment: input.record?.commitment ?? null,
    walrus_blob_id: input.record?.blobId ?? null,
    audit_pack_id: input.record?.auditPackId ?? null,
    registered_by_wallet: input.record ? input.signerAddress ?? null : null,
    status: input.record ? "registered" : input.document.status,
  };
}

function isLocalDocumentReady(document: LocalDocument): boolean {
  return Boolean(
    document.documentType.trim() &&
    document.source.trim() &&
    document.description.trim() &&
    document.assertions.length > 0,
  );
}

function inferDocumentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("bank")) return "Bank Statement";
  if (lower.includes("invoice")) return "Sales Invoice";
  if (lower.includes("contract")) return "Vendor Contract";
  if (lower.includes("ledger")) return "ERP Ledger Export";
  if (lower.includes("board")) return "Board Resolution";
  return "Audit Evidence";
}

function getFileExtension(fileName: string): string {
  return fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : "";
}

function isSuiObjectId(value: string | undefined): value is string {
  return Boolean(value && /^0x[0-9a-fA-F]{2,}$/.test(value));
}

async function readAgentText(file: File): Promise<{ text?: string; warning?: string }> {
  const extension = getFileExtension(file.name);
  const isTextLike = file.type.startsWith("text/") || TEXT_AGENT_EXTENSIONS.has(extension);

  if (!isTextLike) {
    return {
      warning:
        "Browser workspace can analyze text-like files now. PDF, DOCX, and XLSX need upload ingestion wiring before agent analysis can read their contents.",
    };
  }

  const text = (await file.text()).trim();
  if (!text) {
    return { warning: "This file has no readable text for the agent." };
  }

  return { text };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return readArray(value).map(readString).filter((item): item is string => Boolean(item));
}

function formatPercent(value: number | undefined): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "n/a";
}

function buildMetadataSummary(metadata: Record<string, unknown>): string[] {
  const summary = [
    readString(metadata.document_date) ? `Date ${readString(metadata.document_date)}` : null,
    readString(metadata.period_start) && readString(metadata.period_end)
      ? `Period ${readString(metadata.period_start)} to ${readString(metadata.period_end)}`
      : null,
    readString(metadata.document_reference) ? `Ref ${readString(metadata.document_reference)}` : null,
  ].filter((item): item is string => Boolean(item));

  const parties = readArray(metadata.parties)
    .map((party) => {
      const row = isRecord(party) ? party : {};
      const name = readString(row.name);
      const role = readString(row.role);
      return name ? `${name}${role ? ` (${role})` : ""}` : undefined;
    })
    .filter((item): item is string => Boolean(item));

  if (parties.length > 0) summary.push(`Parties ${parties.slice(0, 2).join(", ")}`);

  return summary;
}

function parseAgentWorkspaceReview(raw: unknown): AgentWorkspaceReview {
  const root = isRecord(raw) ? raw : {};
  const gap = isRecord(root.gap_analysis) ? root.gap_analysis : {};
  const approvalControls = isRecord(root.approval_controls) ? root.approval_controls : {};
  const persistence = isRecord(root.persistence_result) ? root.persistence_result : {};
  const manifest = isRecord(persistence.manifest) ? persistence.manifest : {};
  const memwal = isRecord(persistence.memwal) ? persistence.memwal : {};
  const walrus = isRecord(persistence.walrus) ? persistence.walrus : {};

  const documents = readArray(root.documents).map((document, index): AgentDocumentReview => {
    const row = isRecord(document) ? document : {};
    const classification = isRecord(row.classification) ? row.classification : {};
    const metadata = isRecord(row.metadata) ? row.metadata : {};
    const mapping = isRecord(row.assertion_mapping) ? row.assertion_mapping : {};
    const sourceConfidence = isRecord(row.source_confidence) ? row.source_confidence : {};
    const evidenceRef = isRecord(row.evidence_ref) ? row.evidence_ref : {};

    return {
      id: readString(row.document_id) ?? `document-${index + 1}`,
      filename: readString(row.filename) ?? readString(classification.filename) ?? `Document ${index + 1}`,
      evidenceId: readString(evidenceRef.evidence_id),
      documentType: readString(classification.document_type) ?? "unclassified",
      confidence: readNumber(classification.confidence),
      classificationRationale: readString(classification.rationale),
      classificationLimitations: readStringArray(classification.limitations),
      sourceConfidence: readString(sourceConfidence.source_confidence) ?? readString(classification.source_confidence),
      sourceReason: readString(sourceConfidence.source_confidence_reason) ?? readString(classification.source_confidence_reason),
      sourceCaveats: [
        ...readStringArray(sourceConfidence.caveats),
        ...readStringArray(sourceConfidence.upgrade_path).map((item) => `Upgrade: ${item}`),
      ],
      mappedAssertions: readArray(mapping.mapped_assertions).map((assertion) => {
        const item = isRecord(assertion) ? assertion : {};
        return {
          label: readString(item.assertion_label) ?? "Assertion",
          coverage: readString(item.coverage) ?? "unknown",
          confidence: readNumber(item.confidence),
          rationale: readString(item.rationale),
        };
      }),
      metadataSummary: buildMetadataSummary(metadata),
    };
  });

  const findings = readArray(root.findings).map((finding, index): AgentFindingReview => {
    const row = isRecord(finding) ? finding : {};
    return {
      id: readString(row.finding_id) ?? `finding-${index + 1}`,
      title: readString(row.title) ?? readString(row.condition) ?? `Draft finding ${index + 1}`,
      severity: readString(row.severity) ?? "unrated",
      status: readString(row.status) ?? "draft",
      condition: readString(row.condition),
      criteria: readString(row.criteria),
      cause: readString(row.cause),
      effect: readString(row.effect),
      recommendation: readString(row.recommendation),
      missingAssertions: readStringArray(row.missing_assertion_labels),
      citationCount: readArray(row.citations).length,
    };
  });

  return {
    documents,
    findings,
    gapSummary: {
      readinessScore: readNumber(gap.readiness_score),
      coveredLabels: readStringArray(gap.covered_labels),
      missingLabels: readStringArray(gap.missing_labels),
      recommendations: readStringArray(gap.recommendations),
    },
    approval: {
      requiresHumanApproval: readBoolean(approvalControls.requires_human_approval) ?? true,
      chainWriteReady: readBoolean(approvalControls.chain_write_ready) ?? false,
      outputHashes: readStringArray(approvalControls.output_hashes),
      nextSteps: readStringArray(approvalControls.next_steps),
    },
    persistence: {
      memoryNamespace: readString(persistence.memory_namespace),
      memwalStatus: readString(memwal.status),
      walrusStatus: readString(walrus.status),
      manifestBlobId: readString(walrus.manifest_blob_id),
      artifactBlobId: readString(walrus.artifact_blob_id),
      linkedDocuments: readNumber(manifest.linked_documents),
      totalDocuments: readNumber(manifest.total_documents),
    },
  };
}

export default function WorkspacePage() {
  const wallet = useWalletBridge();
  const addDocumentInputRef = useRef<HTMLInputElement | null>(null);

  const [role, setRole] = useState<WorkspaceRole>("company");
  const [activeRailPanel, setActiveRailPanel] = useState<RailPanel>("explorer");
  const [activeItemId, setActiveItemId] = useState("folder:evidence");
  const [bottomTab, setBottomTab] = useState<BottomTab>("details");
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [auditPack, setAuditPack] = useState<AuditPackDraft>({ status: "not-created" });
  const [localDocuments, setLocalDocuments] = useState<LocalDocument[]>([]);
  const [registry, setRegistry] = useState<EvidenceRecord[]>([]);
  const [selectedLocalDocumentIds, setSelectedLocalDocumentIds] = useState<string[]>([]);

  const [regFile, setRegFile] = useState<File | null>(null);
  const [regDocType, setRegDocType] = useState("Bank Statement");
  const [regSource, setRegSource] = useState("Company Upload (L2)");
  const [regDesc, setRegDesc] = useState("");
  const [regAssertions, setRegAssertions] = useState<string[]>(["Existence"]);
  const [activeLocalDocumentId, setActiveLocalDocumentId] = useState<string | undefined>();
  const [draftSaveMessage, setDraftSaveMessage] = useState<string | null>(null);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isBatchRegistering, setIsBatchRegistering] = useState(false);
  const [batchSummary, setBatchSummary] = useState<BatchRegistrationSummary | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);

  const [verifyRecordId, setVerifyRecordId] = useState("");
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: "idle" | "success" | "tampered";
    message: string;
    computedHash?: string;
    expectedHash?: string;
    checkedFileLabel?: string;
  }>({ status: "idle", message: "" });
  const [lastVerificationSession, setLastVerificationSession] =
    useState<VerificationSession | null>(null);

  const [attestRecordId, setAttestRecordId] = useState("");
  const [attestNotes, setAttestNotes] = useState("");
  const [attestType, setAttestType] = useState("HashConfirmed");
  const [isAttesting, setIsAttesting] = useState(false);
  const [attestError, setAttestError] = useState<string | null>(null);
  const [attestResult, setAttestResult] = useState<{
    attestationId: string;
    txDigest: string;
    evidenceId: string;
    reviewer: string;
    action: string;
    createdAt: string;
  } | null>(null);

  const [operationProgress, setOperationProgress] = useState<{
    type: OperationType;
    steps: ProgressStep[];
  } | null>(null);
  const [proofSnapshot, setProofSnapshot] = useState<ProofArtifactsSnapshot | null>(null);
  const [agentRun, setAgentRun] = useState<AgentRunState>(DEFAULT_AGENT_STATE);
  const [agentInstruction, setAgentInstruction] = useState("");
  const [memoryReload, setMemoryReload] = useState<WalrusMemoryReloadState>(DEFAULT_MEMORY_RELOAD_STATE);
  const [agentActionLog, setAgentActionLog] = useState<AgentActionLogState>(DEFAULT_AGENT_ACTION_LOG_STATE);
  const [demoEngagement, setDemoEngagement] = useState<DemoEngagementState>(DEFAULT_DEMO_ENGAGEMENT_STATE);
  const [engagementInput, setEngagementInput] = useState("");

  const signerAddress = wallet.address ?? "";
  const signTransaction = wallet.signTransaction;

  const selectedLocalDocument = useMemo(
    () => activeItemId.startsWith("local:")
      ? localDocuments.find((item) => item.id === activeItemId.replace("local:", ""))
      : undefined,
    [activeItemId, localDocuments],
  );

  const selectedRecord = useMemo(
    () => activeItemId.startsWith("record:")
      ? registry.find((item) => item.id === activeItemId.replace("record:", ""))
      : undefined,
    [activeItemId, registry],
  );

  const selectedRecordVerified =
    lastVerificationSession?.evidenceId === attestRecordId &&
    lastVerificationSession.status === "success";
  const selectedRecordTampered =
    lastVerificationSession?.evidenceId === attestRecordId &&
    lastVerificationSession.status === "tampered";

  const visibleLocalDocuments = useMemo(
    () => localDocuments.filter((document) => document.status !== "registered" || !document.evidenceId),
    [localDocuments],
  );

  const readableEvidenceCount = useMemo(
    () =>
      [
        ...visibleLocalDocuments.map((item) => item.file),
        ...registry.map((item) => item.sourceFile).filter((file): file is File => Boolean(file)),
      ].filter((file) => file.type.startsWith("text/") || TEXT_AGENT_EXTENSIONS.has(getFileExtension(file.name))).length,
    [registry, visibleLocalDocuments],
  );

  const selectableLocalDocuments = useMemo(
    () => localDocuments.filter((document) => document.status !== "registered" && !document.evidenceId),
    [localDocuments],
  );

  const selectedBatchDocuments = useMemo(
    () => selectableLocalDocuments.filter((document) => selectedLocalDocumentIds.includes(document.id)),
    [selectableLocalDocuments, selectedLocalDocumentIds],
  );

  const incompleteSelectedBatchDocuments = useMemo(
    () => selectedBatchDocuments.filter((document) => !isLocalDocumentReady(document)),
    [selectedBatchDocuments],
  );

  const selectedBatchReady =
    selectedBatchDocuments.length > 0 && incompleteSelectedBatchDocuments.length === 0;

  const agentReview = useMemo(
    () => parseAgentWorkspaceReview(agentRun.raw),
    [agentRun.raw],
  );

  const companyWalletMatches = !demoEngagement.companyWallet || signerAddress === demoEngagement.companyWallet;
  const auditorWalletMatches = !demoEngagement.auditorWallet || signerAddress === demoEngagement.auditorWallet;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1100px)");

    const syncSidebar = (matchesCompact: boolean) => {
      setIsCompactViewport(matchesCompact);
      setIsSidebarOpen(!matchesCompact);
    };

    syncSidebar(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => syncSidebar(event.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const persistDemoEvidenceDocument = async (document: LocalDocument) => {
    if (!demoEngagement.id || !isDemoStoreConfigured()) return;

    try {
      const rowId = document.demoEvidenceRowId ?? document.id;
      const upload = document.demoStoragePath
        ? { bucket: "demo-evidence", path: document.demoStoragePath }
        : await uploadDemoEvidenceFile({
          engagementId: demoEngagement.id,
          evidenceRowId: rowId,
          file: document.file,
        });
      const row = await upsertDemoEvidence(
        toDemoEvidenceRow({
          engagementId: demoEngagement.id,
          document: { ...document, demoEvidenceRowId: rowId, demoStoragePath: upload.path },
          bucket: upload.bucket,
          path: upload.path,
        }),
      );

      setLocalDocuments((prev) =>
        prev.map((item) =>
          item.id === document.id
            ? { ...item, demoEvidenceRowId: row.id, demoStoragePath: row.storage_path ?? upload.path }
            : item,
        ),
      );
      setDemoEngagement((prev) => ({
        ...prev,
        status: "ready",
        message: `Synced ${document.fileName} to shared demo engagement.`,
      }));
    } catch (error) {
      setDemoEngagement((prev) => ({
        ...prev,
        status: "error",
        message: getErrorMessage(error, `Could not sync ${document.fileName} to Supabase demo storage.`),
      }));
    }
  };

  const persistRegisteredDemoEvidence = async (
    artifacts: RegisteredEvidenceArtifacts[],
    engagementId = demoEngagement.id,
  ) => {
    if (!engagementId || !isDemoStoreConfigured()) return;

    const documentsById = new Map(localDocuments.map((document) => [document.id, document]));

    try {
      await Promise.all(
        artifacts.map((artifact) => {
          const document = artifact.localDocumentId ? documentsById.get(artifact.localDocumentId) : undefined;
          if (!document) return Promise.resolve(undefined);

          return upsertDemoEvidence(
            toDemoEvidenceRow({
              engagementId,
              document,
              record: artifact.record,
              signerAddress,
            }),
          );
        }),
      );
      setDemoEngagement((prev) => ({
        ...prev,
        status: "ready",
        message: "Registered evidence metadata synced to shared demo engagement.",
      }));
    } catch (error) {
      setDemoEngagement((prev) => ({
        ...prev,
        status: "error",
        message: getErrorMessage(error, "Registered evidence was created locally but could not be synced to Supabase."),
      }));
    }
  };

  const applyLoadedDemoEngagement = async (engagementId: string) => {
    if (!isDemoStoreConfigured()) return;

    setDemoEngagement((prev) => ({
      ...prev,
      id: engagementId,
      status: "loading",
      message: "Loading shared demo engagement.",
    }));

    try {
      const bundle = await loadDemoEngagement(engagementId);
      const filesByRowId = new Map<string, File>();

      await Promise.all(
        bundle.evidence.map(async (row) => {
          try {
            const file = await downloadDemoEvidenceFile(row);
            if (file) filesByRowId.set(row.id, file);
          } catch {
            // Metadata should still load if a demo file is missing or inaccessible.
          }
        }),
      );

      const latestAttestationByEvidenceId = new Map<string, AttestationSummary>();
      for (const row of bundle.attestations) {
        latestAttestationByEvidenceId.set(row.evidence_id, {
          id: row.attestation_id,
          action: row.action,
          reviewer: row.reviewer_wallet,
          note: row.note ?? "",
          txDigest: row.tx_digest ?? "n/a",
          createdAt: row.created_at?.replace("T", " ").substring(0, 16) ?? nowLabel(),
        });
      }

      const loadedLocalDocuments = bundle.evidence
        .map((row) => {
          const file = filesByRowId.get(row.id);
          return file ? createLocalDocumentFromDemoEvidence(row, file) : undefined;
        })
        .filter((document): document is LocalDocument => Boolean(document));
      const loadedRegistry = bundle.evidence
        .map((row) =>
          createEvidenceRecordFromDemoEvidence(
            row,
            filesByRowId.get(row.id),
            row.evidence_id ? latestAttestationByEvidenceId.get(row.evidence_id) : undefined,
          ),
        )
        .filter((record): record is EvidenceRecord => Boolean(record));

      setLocalDocuments(loadedLocalDocuments);
      setSelectedLocalDocumentIds(loadedLocalDocuments.filter((document) => !document.evidenceId).map((document) => document.id));
      setRegistry(loadedRegistry);
      setAuditPack((prev) => ({
        ...prev,
        id: bundle.engagement.audit_pack_id ?? prev.id,
        owner: bundle.engagement.company_wallet ?? prev.owner,
        status: bundle.engagement.audit_pack_id ? "created" : prev.status,
      }));
      setAgentActionLog((prev) => ({
        ...prev,
        logs: bundle.agentActions.map((action) => ({
          key: [
            action.pack_id,
            "loaded",
            action.evidence_id ?? "no-evidence",
            action.action_type,
            action.output_hash,
          ].join("|"),
          packId: action.pack_id,
          evidenceId: action.evidence_id ?? undefined,
          actionType: action.action_type,
          outputHash: action.output_hash,
          signer: action.signer_wallet,
          txDigest: action.tx_digest ?? undefined,
          eventCount: action.event_type ? 1 : 0,
          objectChangeCount: 0,
          event: action.event_type
            ? {
              type: action.event_type,
              id: { eventSeq: action.event_seq ?? undefined },
            }
            : undefined,
          loggedAt: action.created_at?.replace("T", " ").substring(0, 16) ?? nowLabel(),
        })),
      }));
      setEngagementInput(engagementId);
      setDemoEngagement({
        id: bundle.engagement.id,
        companyWallet: bundle.engagement.company_wallet ?? undefined,
        auditorWallet: bundle.engagement.auditor_wallet ?? undefined,
        status: "ready",
        message: `Loaded shared demo engagement with ${bundle.evidence.length} evidence file(s).`,
      });
      if (bundle.engagement.audit_pack_id || loadedRegistry[0]) {
        setProofSnapshot((prev) => ({
          auditPackId: bundle.engagement.audit_pack_id ?? loadedRegistry[0]?.auditPackId ?? prev?.auditPackId,
          evidenceId: loadedRegistry[0]?.id ?? prev?.evidenceId,
          txDigest: prev?.txDigest,
          packageId: PACKAGE_ID,
          commitment: loadedRegistry[0]?.commitment ?? prev?.commitment,
          blobReference: loadedRegistry[0]?.blobId ?? prev?.blobReference,
          attestationId: loadedRegistry[0]?.latestAttestation?.id ?? prev?.attestationId,
          verificationStatus: prev?.verificationStatus,
          checkedFileLabel: prev?.checkedFileLabel,
          memoryStatus: prev?.memoryStatus,
          agentActionTxDigest: bundle.agentActions[0]?.tx_digest ?? prev?.agentActionTxDigest,
          agentActionEventType: bundle.agentActions[0]?.event_type ?? prev?.agentActionEventType,
          agentActionEventSeq: bundle.agentActions[0]?.event_seq ?? prev?.agentActionEventSeq,
          agentActionOutputHash: bundle.agentActions[0]?.output_hash ?? prev?.agentActionOutputHash,
          updatedAt: nowLabel(),
        }));
      }
      setActiveItemId("folder:evidence");
    } catch (error) {
      setDemoEngagement((prev) => ({
        ...prev,
        status: "error",
        message: getErrorMessage(error, "Could not load shared demo engagement."),
      }));
    }
  };

  useEffect(() => {
    if (!isDemoStoreConfigured()) return;
    const engagementId = new URLSearchParams(window.location.search).get("engagement");
    if (engagementId) void applyLoadedDemoEngagement(engagementId);
  }, []);

  const updateLocalDocumentDraft = (documentId: string, patch: Partial<Pick<LocalDocument, "documentType" | "source" | "description" | "assertions">>) => {
    setLocalDocuments((prev) =>
      prev.map((document) => document.id === documentId ? { ...document, ...patch } : document),
    );
  };

  const handleSaveDraft = (documentId: string) => {
    const patch = {
      documentType: regDocType,
      source: regSource,
      description: regDesc,
      assertions: regAssertions,
    };
    updateLocalDocumentDraft(documentId, patch);
    setDraftSaveMessage("Draft saved for batch registration.");
    const document = localDocuments.find((item) => item.id === documentId);
    if (document) void persistDemoEvidenceDocument({ ...document, ...patch });
  };

  const handleToggleAssertion = (assertion: string) => {
    setRegAssertions((prev) => {
      const next = prev.includes(assertion)
        ? prev.filter((item) => item !== assertion)
        : [...prev, assertion];

      if (activeLocalDocumentId) {
        updateLocalDocumentDraft(activeLocalDocumentId, { assertions: next });
      }

      return next;
    });
  };

  const handleAddDocuments = (files: FileList | null) => {
    if (!files?.length) return;

    const nextDocuments = Array.from(files).map(createLocalDocument);
    setLocalDocuments((prev) => [...prev, ...nextDocuments]);
    setSelectedLocalDocumentIds((prev) => [...prev, ...nextDocuments.map((document) => document.id)]);
    setActiveItemId("folder:evidence");
    setActiveLocalDocumentId(undefined);
    void Promise.all(nextDocuments.map(persistDemoEvidenceDocument));
  };

  const toggleBatchSelection = (documentId: string) => {
    setSelectedLocalDocumentIds((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId],
    );
  };

  const selectAllBatchDocuments = () => {
    setSelectedLocalDocumentIds(selectableLocalDocuments.map((document) => document.id));
  };

  const clearBatchSelection = () => {
    setSelectedLocalDocumentIds([]);
  };

  const handleCreateDemoEngagement = async () => {
    if (!isDemoStoreConfigured()) return;

    setDemoEngagement((prev) => ({
      ...prev,
      status: "loading",
      message: "Creating shared demo engagement.",
    }));

    try {
      const engagement = await createDemoEngagement({
        audit_pack_id: auditPack.id ?? null,
        company_wallet: signerAddress || undefined,
      });

      setDemoEngagement({
        id: engagement.id,
        companyWallet: engagement.company_wallet ?? undefined,
        auditorWallet: engagement.auditor_wallet ?? undefined,
        status: "ready",
        message: "Shared demo engagement created. Open this link in the auditor browser.",
      });
      setEngagementInput(engagement.id);
      window.history.replaceState(null, "", `/workspace?engagement=${engagement.id}`);
    } catch (error) {
      setDemoEngagement((prev) => ({
        ...prev,
        status: "error",
        message: getErrorMessage(error, "Could not create shared demo engagement."),
      }));
    }
  };

  const handleLoadDemoEngagement = async () => {
    const id = engagementInput.trim();
    if (!id) return;
    window.history.replaceState(null, "", `/workspace?engagement=${id}`);
    await applyLoadedDemoEngagement(id);
  };

  const handleAssignDemoWallet = async (kind: "company" | "auditor") => {
    if (!demoEngagement.id || !signerAddress || !isDemoStoreConfigured()) return;

    const patch = kind === "company"
      ? { company_wallet: signerAddress }
      : { auditor_wallet: signerAddress };

    try {
      const updated = await updateDemoEngagement(demoEngagement.id, patch);
      setDemoEngagement((prev) => ({
        ...prev,
        companyWallet: updated.company_wallet ?? prev.companyWallet,
        auditorWallet: updated.auditor_wallet ?? prev.auditorWallet,
        status: "ready",
        message: `${kind === "company" ? "Company" : "Auditor"} wallet assigned for this demo engagement.`,
      }));
    } catch (error) {
      setDemoEngagement((prev) => ({
        ...prev,
        status: "error",
        message: getErrorMessage(error, "Could not assign wallet in shared demo engagement."),
      }));
    }
  };

  const prepareLocalDocument = (document: LocalDocument) => {
    setActiveItemId(`local:${document.id}`);
    setActiveLocalDocumentId(document.id);
    setRegFile(document.file);
    setRegDocType(document.documentType);
    setRegSource(document.source);
    setRegDesc(document.description);
    setRegAssertions(document.assertions);
    setRegisterError(null);
    setRegisterResult(null);
    setDraftSaveMessage(null);
    if (isCompactViewport) setIsSidebarOpen(false);
  };

  const createAuditPackDraft = async (): Promise<CreatedAuditPackArtifacts> => {
    const encryptionKey = await generateEncryptionKey();
    const encryptedDetails = await encryptJson(
      {
        engagementName: "Q2 2026 Audit Readiness",
        createdBy: signerAddress,
        purpose: "Sui Overflow demo AuditPack",
        note: "Encrypted client-side before on-chain registration.",
      },
      encryptionKey,
    );
    const encryptedBytes = new TextEncoder().encode(JSON.stringify(serializeEncryptedPayload(encryptedDetails)));

    const createAuditPack = createAuditPackFlow({
      packageId: PACKAGE_ID,
      signerAddress,
      signTransaction,
      tatum: serverTatumExecute,
    });
    const result = await createAuditPack({
      encryptedDetails: encryptedBytes,
      signerAddress,
    });

    return {
      id: result.pack.id,
      txDigest: result.transactionDigest,
      owner: result.pack.owner,
      createdAt: result.pack.createdAt,
    };
  };

  const applyCreatedAuditPack = (createdPack: CreatedAuditPackArtifacts) => {
    const createdAtLabel = createdPack.createdAt.replace("T", " ").substring(0, 16);
    setAuditPack({
      id: createdPack.id,
      txDigest: createdPack.txDigest,
      owner: createdPack.owner,
      createdAt: createdAtLabel,
      status: "created",
    });
    setProofSnapshot({
      auditPackId: createdPack.id,
      txDigest: createdPack.txDigest,
      packageId: PACKAGE_ID,
      updatedAt: createdAtLabel,
    });
    setActiveItemId("folder:evidence");
    if (demoEngagement.id && isDemoStoreConfigured()) {
      void updateDemoEngagement(demoEngagement.id, {
        audit_pack_id: createdPack.id,
        company_wallet: createdPack.owner,
      }).then((updated) => {
        setDemoEngagement((prev) => ({
          ...prev,
          companyWallet: updated.company_wallet ?? prev.companyWallet,
          status: "ready",
          message: "AuditPack linked to shared demo engagement.",
        }));
      }).catch((error) => {
        setDemoEngagement((prev) => ({
          ...prev,
          status: "error",
          message: getErrorMessage(error, "AuditPack was created but could not be synced to Supabase."),
        }));
      });
    }
  };

  const registerEvidenceDraft = async (
    draft: RegisterEvidenceDraft,
    auditPackIdOverride?: string,
  ): Promise<RegisteredEvidenceArtifacts> => {
    const sourceLabel = toSourceLabel(draft.source);
    const activeAuditPackId = auditPackIdOverride ?? auditPack.id;
    const metadata = {
      fileName: draft.file.name,
      mediaType: draft.file.type || "application/octet-stream",
      documentType: draft.documentType,
      description: draft.description || undefined,
      claimedSource: sourceLabel,
    };

    const encryptionKey = await generateEncryptionKey();
    const registerEvidence = createRegisterEvidenceFlow({
      packageId: PACKAGE_ID,
      signerAddress,
      signTransaction,
      encryptionKey,
      tatum: serverTatumExecute,
      walrusNetwork: "testnet",
      walrusPublisherUrl: process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL,
      walrusAggregatorUrl: process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL,
    });

    const result = await registerEvidence({
      content: draft.file,
      metadata,
      assertions: draft.assertions.map(toAssertionId),
      signerAddress,
      auditPackId: activeAuditPackId,
    });
    const commitment = result.evidence.commitment;
    const blobId = result.evidence.blobId ?? result.evidence.proof?.walrusBlobId ?? "n/a";
    const objectId = result.evidence.id;
    const txDigest = result.transactionDigest ?? result.evidence.proof?.transactionDigest ?? "n/a";
    const registeredAt = result.evidence.registeredAt ?? new Date().toISOString();
    const registeredAtLabel = registeredAt.replace("T", " ").substring(0, 16);

    return {
      localDocumentId: draft.localDocumentId,
      record: {
        id: objectId,
        date: registeredAtLabel,
        type: draft.documentType,
        source: sourceLabel,
        commitment,
        status: "Registered",
        blobId,
        assertions: draft.assertions,
        reviewer: "n/a",
        notes: draft.description || "No description provided.",
        fileName: draft.file.name,
        fileSize: formatMegabytes(draft.file.size),
        sourceFile: draft.file,
        auditPackId: activeAuditPackId,
      },
      result: {
        objectId,
        txDigest,
        blobId,
        commitment,
        encryptedFileSize: `${result.artifacts.encryptedFile.ciphertext.length} B`,
        encryptedMetadataSize: `${result.artifacts.encryptedMetadata.ciphertext.length} B`,
        sourceConfidence: "L2 - Company Upload",
      },
    };
  };

  const registerEvidenceBatchDrafts = async (
    drafts: RegisterEvidenceDraft[],
    auditPackIdOverride: string,
  ): Promise<RegisteredEvidenceArtifacts[]> => {
    const draftsById = new Map(drafts.map((draft) => [draft.localDocumentId ?? draft.file.name, draft]));
    const encryptionKey = await generateEncryptionKey();
    const registerEvidenceBatch = createBatchRegisterEvidenceFlow({
      packageId: PACKAGE_ID,
      signerAddress,
      signTransaction,
      encryptionKey,
      tatum: serverTatumExecute,
      walrusNetwork: "testnet",
      walrusPublisherUrl: process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL,
      walrusAggregatorUrl: process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL,
    });

    const result = await registerEvidenceBatch({
      auditPackId: auditPackIdOverride,
      signerAddress,
      items: drafts.map((draft) => {
        const sourceLabel = toSourceLabel(draft.source);
        return {
          clientId: draft.localDocumentId ?? draft.file.name,
          content: draft.file,
          metadata: {
            fileName: draft.file.name,
            mediaType: draft.file.type || "application/octet-stream",
            documentType: draft.documentType,
            description: draft.description || undefined,
            claimedSource: sourceLabel,
          },
          assertions: draft.assertions.map(toAssertionId),
          signerAddress,
        };
      }),
    });

    return result.items.map((item) => {
      const draft = draftsById.get(item.clientId ?? "");
      if (!draft) {
        throw new Error("Batch registration result did not match a selected local document.");
      }

      const sourceLabel = toSourceLabel(draft.source);
      const commitment = item.evidence.commitment;
      const blobId = item.evidence.blobId ?? item.evidence.proof?.walrusBlobId ?? "n/a";
      const objectId = item.evidence.id;
      const txDigest = item.transactionDigest ?? result.transactionDigest ?? item.evidence.proof?.transactionDigest ?? "n/a";
      const registeredAt = item.evidence.registeredAt ?? new Date().toISOString();
      const registeredAtLabel = registeredAt.replace("T", " ").substring(0, 16);

      return {
        localDocumentId: draft.localDocumentId,
        record: {
          id: objectId,
          date: registeredAtLabel,
          type: draft.documentType,
          source: sourceLabel,
          commitment,
          status: "Registered",
          blobId,
          assertions: draft.assertions,
          reviewer: "n/a",
          notes: draft.description || "No description provided.",
          fileName: draft.file.name,
          fileSize: formatMegabytes(draft.file.size),
          sourceFile: draft.file,
          auditPackId: auditPackIdOverride,
        },
        result: {
          objectId,
          txDigest,
          blobId,
          commitment,
          encryptedFileSize: `${item.artifacts.encryptedFile.ciphertext.length} B`,
          encryptedMetadataSize: `${item.artifacts.encryptedMetadata.ciphertext.length} B`,
          sourceConfidence: "L2 - Company Upload",
        },
      };
    });
  };

  const handleRegister = async (override?: RegisterDraftOverride) => {
    if (isRegistering) return;

    const draft: RegisterEvidenceDraft = {
      file: override?.file ?? regFile as File,
      documentType: override?.documentType ?? regDocType,
      source: override?.source ?? regSource,
      description: override?.description ?? regDesc,
      assertions: override?.assertions ?? regAssertions,
      localDocumentId: override?.localDocumentId ?? activeLocalDocumentId,
    };

    if (role !== "company") {
      setRegisterError("Switch to the Company role before registering uploaded evidence.");
      return;
    }
    if (!signerAddress) {
      setRegisterError("Connect a Sui wallet before registering evidence.");
      return;
    }
    if (!companyWalletMatches) {
      setRegisterError("Connect the assigned company wallet before registering evidence in this shared engagement.");
      return;
    }
    if (!draft.file) {
      setRegisterError("Select a document before preparing the registration flow.");
      return;
    }
    if (draft.assertions.length === 0) {
      setRegisterError("Select at least one ISA assertion for this evidence item.");
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    setRegisterResult(null);
    let activeAuditPackId = auditPack.id;
    if (draft.localDocumentId) {
      setLocalDocuments((prev) =>
        prev.map((item) => item.id === draft.localDocumentId ? { ...item, status: "registering" } : item),
      );
    }

    const steps: ProgressStep[] = [
      {
        label: activeAuditPackId ? "Reuse AuditPack" : "Create AuditPack",
        status: "pending",
        detail: activeAuditPackId ? truncateValue(activeAuditPackId, 18) : "Needed for evidence link",
      },
      { label: "Computing SHA-256 hash", status: "pending" },
      { label: "Encrypting file and metadata", status: "pending" },
      { label: "Uploading encrypted blob to Walrus", status: "pending" },
      { label: "Signing and submitting Sui registration", status: "pending" },
    ];

    try {
      if (!activeAuditPackId) {
        steps[0].status = "running";
        setOperationProgress({ type: "register", steps: [...steps] });
        const createdPack = await createAuditPackDraft();
        activeAuditPackId = createdPack.id;
        applyCreatedAuditPack(createdPack);
        steps[0] = {
          ...steps[0],
          status: "done",
          detail: truncateValue(createdPack.id, 18),
        };
      } else {
        steps[0].status = "done";
      }

      steps[1].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      steps[1] = { ...steps[1], status: "done", detail: "Prepared locally" };
      steps[2].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      steps[2] = { ...steps[2], status: "done", detail: "AES-GCM ready" };

      steps[3].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      const { record, result } = await registerEvidenceDraft(draft, activeAuditPackId);

      steps[3] = { ...steps[3], status: "done", detail: truncateValue(result.blobId, 22) };
      steps[4].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      steps[4] = { ...steps[4], status: "done", detail: result.txDigest };
      setOperationProgress({ type: "register", steps: [...steps] });

      setRegistry((prev) => [record, ...prev]);
      setVerifyRecordId(record.id);
      setAttestRecordId(record.id);
      setActiveItemId(`record:${record.id}`);

      if (draft.localDocumentId) {
        setLocalDocuments((prev) =>
          prev.map((item) =>
            item.id === draft.localDocumentId
              ? { ...item, status: "registered", evidenceId: record.id, warning: undefined }
              : item,
          ),
        );
        setSelectedLocalDocumentIds((prev) => prev.filter((id) => id !== draft.localDocumentId));
      }

      setRegisterResult(result);
      void persistRegisteredDemoEvidence([{ record, result, localDocumentId: draft.localDocumentId }]);
      setProofSnapshot({
        auditPackId: activeAuditPackId,
        evidenceId: record.id,
        txDigest: result.txDigest,
        packageId: PACKAGE_ID,
        commitment: result.commitment,
        blobReference: result.blobId,
        updatedAt: record.date,
      });
      setBottomTab("chain");
    } catch (error) {
      const message = getErrorMessage(error, "Registration failed while calling live infrastructure.");
      setRegisterError(message);
      setOperationProgress(null);
      if (draft.localDocumentId) {
        setLocalDocuments((prev) =>
          prev.map((item) =>
            item.id === draft.localDocumentId ? { ...item, status: "flagged", warning: message } : item,
          ),
        );
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleBatchRegister = async () => {
    if (isBatchRegistering || isRegistering) return;
    if (role !== "company") {
      setRegisterError("Switch to the Company role before registering selected evidence.");
      return;
    }
    if (!signerAddress) {
      setRegisterError("Connect a Sui wallet before registering evidence.");
      return;
    }
    if (!companyWalletMatches) {
      setRegisterError("Connect the assigned company wallet before registering selected evidence in this shared engagement.");
      return;
    }
    if (selectedBatchDocuments.length === 0) {
      setRegisterError("Select at least one local file that has not been registered.");
      return;
    }
    if (incompleteSelectedBatchDocuments.length > 0) {
      setRegisterError(
        `Complete type, source, description, and assertions for: ${incompleteSelectedBatchDocuments
          .map((document) => document.fileName)
          .join(", ")}`,
      );
      return;
    }

    const totalDocuments = selectedBatchDocuments.length;
    let activeAuditPackId = auditPack.id;

    setIsBatchRegistering(true);
    setRegisterError(null);
    setBatchSummary({
      total: totalDocuments,
      completed: 0,
      failed: 0,
    });
    setLocalDocuments((prev) =>
      prev.map((document) =>
        selectedLocalDocumentIds.includes(document.id) && document.status !== "registered"
          ? { ...document, status: "queued", warning: undefined }
          : document,
      ),
    );

    const steps: ProgressStep[] = [
      {
        label: activeAuditPackId ? "Reuse AuditPack" : "Create AuditPack",
        status: "pending",
        detail: activeAuditPackId ? truncateValue(activeAuditPackId, 18) : "Needed for batch link",
      },
      { label: "Validate selected evidence drafts", status: "pending", detail: `${totalDocuments} ready` },
      { label: "Encrypt and upload selected files", status: "pending" },
      { label: "Sign one Sui batch registration", status: "pending" },
      {
        label: "Link each record to AuditPack",
        status: "pending",
        detail: activeAuditPackId ? truncateValue(activeAuditPackId, 18) : "Pending",
      },
    ];

    try {
      if (!activeAuditPackId) {
        steps[0].status = "running";
        setOperationProgress({ type: "batch", steps: [...steps] });
        const createdPack = await createAuditPackDraft();
        activeAuditPackId = createdPack.id;
        applyCreatedAuditPack(createdPack);
        steps[0] = {
          ...steps[0],
          status: "done",
          detail: truncateValue(createdPack.id, 18),
        };
      } else {
        steps[0].status = "done";
      }
    } catch (error) {
      setRegisterError(getErrorMessage(error, "AuditPack creation failed before batch registration."));
      setOperationProgress(null);
      setIsBatchRegistering(false);
      return;
    }

    steps[1].status = "done";
    steps[4].detail = truncateValue(activeAuditPackId, 18);
    setOperationProgress({ type: "batch", steps: [...steps] });

    try {
      const drafts = selectedBatchDocuments.map((document) => ({
        file: document.file,
        documentType: document.documentType,
        source: document.source,
        description: document.description,
        assertions: document.assertions,
        localDocumentId: document.id,
      }));
      setBatchSummary({
        total: totalDocuments,
        completed: 0,
        failed: 0,
        currentFile: `${totalDocuments} selected file(s)`,
      });
      setLocalDocuments((prev) =>
        prev.map((item) =>
          selectedLocalDocumentIds.includes(item.id) ? { ...item, status: "registering", warning: undefined } : item,
        ),
      );

      steps[2].status = "running";
      setOperationProgress({ type: "batch", steps: [...steps] });
      const registeredArtifacts = await registerEvidenceBatchDrafts(drafts, activeAuditPackId);
      steps[2] = {
        ...steps[2],
        status: "done",
        detail: `${registeredArtifacts.length} blob(s) uploaded`,
      };
      steps[3].status = "done";
      steps[3].detail = truncateValue(registeredArtifacts[0]?.result.txDigest ?? "tx pending", 22);
      steps[4].status = "done";
      steps[4].detail = `${registeredArtifacts.length} linked`;
      setOperationProgress({ type: "batch", steps: [...steps] });

      const createdRecords = registeredArtifacts.map((artifact) => artifact.record);
      const latestResult = registeredArtifacts[0]?.result ?? null;
      setRegistry((prev) => [...createdRecords, ...prev]);
      setLocalDocuments((prev) =>
        prev.map((item) => {
          const artifact = registeredArtifacts.find((registered) => registered.localDocumentId === item.id);
          return artifact
            ? { ...item, status: "registered", evidenceId: artifact.record.id, warning: undefined }
            : item;
        }),
      );
      setSelectedLocalDocumentIds((prev) =>
        prev.filter((id) => !selectedBatchDocuments.some((document) => document.id === id)),
      );
      setBatchSummary({
        total: totalDocuments,
        completed: registeredArtifacts.length,
        failed: 0,
      });
      void persistRegisteredDemoEvidence(registeredArtifacts, demoEngagement.id);

      if (latestResult && createdRecords[0]) {
        setRegisterResult(latestResult);
        setVerifyRecordId(createdRecords[0].id);
        setAttestRecordId(createdRecords[0].id);
        setActiveItemId(`record:${createdRecords[0].id}`);
        setProofSnapshot({
          auditPackId: activeAuditPackId,
          evidenceId: createdRecords[0].id,
          txDigest: latestResult.txDigest,
          packageId: PACKAGE_ID,
          commitment: latestResult.commitment,
          blobReference: latestResult.blobId,
          updatedAt: createdRecords[0].date,
        });
        setBottomTab("chain");
      }
    } catch (error) {
      const message = getErrorMessage(error, "Batch registration failed while calling live infrastructure.");
      steps[2].status = steps[2].status === "done" ? "done" : "error";
      steps[3].status = "error";
      steps[4].status = "error";
      setOperationProgress({ type: "batch", steps: [...steps] });
      setRegisterError(message);
      setBatchSummary({
        total: totalDocuments,
        completed: 0,
        failed: totalDocuments,
        lastError: message,
      });
      setLocalDocuments((prev) =>
        prev.map((item) =>
          selectedLocalDocumentIds.includes(item.id) ? { ...item, status: "flagged", warning: message } : item,
        ),
      );
    } finally {
      setIsBatchRegistering(false);
    }
  };

  const handleVerify = async (recordId = verifyRecordId) => {
    if (!recordId || isVerifying) return;

    setIsVerifying(true);
    setVerificationResult({ status: "idle", message: "" });

    const record = registry.find((item) => item.id === recordId);
    if (!record) {
      setIsVerifying(false);
      return;
    }

    const sourceContent = verifyFile ?? record.sourceFile;
    if (!sourceContent) {
      setVerificationResult({
        status: "tampered",
        message: "Load the original evidence file before running live verification for this record.",
      });
      setIsVerifying(false);
      return;
    }

    const steps: ProgressStep[] = [
      { label: "Fetching on-chain EvidenceRecord", status: "pending" },
      { label: "Preparing verification file", status: "pending" },
      { label: "Computing comparison hash", status: "pending" },
    ];

    try {
      steps[0].status = "running";
      setOperationProgress({ type: "verify", steps: [...steps] });
      const verifyEvidence = createVerifyEvidenceFlow({
        tatum: serverTatumRead,
        packageId: PACKAGE_ID,
      });

      steps[0] = { ...steps[0], status: "done", detail: truncateValue(record.id, 14) };
      steps[1].status = "running";
      setOperationProgress({ type: "verify", steps: [...steps] });
      const checkedFileLabel = sourceContent.name || record.fileName || "Evidence file";
      steps[1] = { ...steps[1], status: "done", detail: checkedFileLabel };

      steps[2].status = "running";
      setOperationProgress({ type: "verify", steps: [...steps] });
      const result = await verifyEvidence({
        evidenceId: recordId,
        content: sourceContent,
      });
      const checkedAt = result.checkedAt.replace("T", " ").substring(0, 16);

      if (result.isMatch) {
        steps[2] = { ...steps[2], status: "done", detail: "Hash matches" };
        setOperationProgress({ type: "verify", steps: [...steps] });
        setVerificationResult({
          status: "success",
          message: "Hash matches the recorded Sui commitment. This proves integrity, not source truth.",
          computedHash: result.actualCommitment,
          expectedHash: result.expectedCommitment,
          checkedFileLabel,
        });
        setLastVerificationSession({
          evidenceId: recordId,
          status: "success",
          checkedFileLabel,
          checkedAt,
        });
        setProofSnapshot((prev) => ({
          auditPackId: record.auditPackId ?? prev?.auditPackId,
          evidenceId: recordId,
          txDigest: prev?.txDigest,
          packageId: PACKAGE_ID,
          commitment: result.expectedCommitment,
          blobReference: result.evidence?.blobId ?? record.blobId,
          attestationId: prev?.attestationId,
          verificationStatus: "success",
          checkedFileLabel,
          memoryStatus: prev?.memoryStatus,
          updatedAt: checkedAt,
        }));
        setAttestRecordId(recordId);
      } else {
        steps[2] = { ...steps[2], status: "error", detail: "Tamper detected" };
        setOperationProgress({ type: "verify", steps: [...steps] });
        setVerificationResult({
          status: "tampered",
          message: "Tamper detected. The supplied file does not match the recorded Sui commitment.",
          computedHash: result.actualCommitment,
          expectedHash: result.expectedCommitment,
          checkedFileLabel,
        });
        setLastVerificationSession({
          evidenceId: recordId,
          status: "tampered",
          checkedFileLabel,
          checkedAt,
        });
        setProofSnapshot((prev) => ({
          auditPackId: record.auditPackId ?? prev?.auditPackId,
          evidenceId: recordId,
          txDigest: prev?.txDigest,
          packageId: PACKAGE_ID,
          commitment: result.expectedCommitment,
          blobReference: result.evidence?.blobId ?? record.blobId,
          attestationId: prev?.attestationId,
          verificationStatus: "tampered",
          checkedFileLabel,
          memoryStatus: prev?.memoryStatus,
          updatedAt: checkedAt,
        }));
      }
      setBottomTab("chain");
    } catch (error) {
      steps[2] = { ...steps[2], status: "error", detail: "Verification failed" };
      setOperationProgress({ type: "verify", steps: [...steps] });
      setVerificationResult({
        status: "tampered",
        message: getErrorMessage(error, "Verification failed while calling live infrastructure."),
        expectedHash: record.commitment,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAttest = async (recordId = attestRecordId) => {
    if (!recordId || isAttesting) return;
    if (!signerAddress) {
      setAttestError("Connect a Sui wallet before creating an attestation.");
      return;
    }
    if (!auditorWalletMatches) {
      setAttestError("Connect the assigned auditor wallet before creating a reviewer attestation.");
      return;
    }
    if (
      !lastVerificationSession ||
      lastVerificationSession.evidenceId !== recordId ||
      lastVerificationSession.status !== "success"
    ) {
      setAttestError("Run a successful verification for this evidence item before attesting.");
      return;
    }

    setIsAttesting(true);
    setAttestError(null);
    setAttestResult(null);

    const steps: ProgressStep[] = [
      { label: "Preparing reviewer statement", status: "pending" },
      { label: "Signing attestation proof", status: "pending" },
    ];

    try {
      steps[0].status = "running";
      setOperationProgress({ type: "attest", steps: [...steps] });
      const encryptionKey = await generateEncryptionKey();
      const createAttestation = createAttestationFlow({
        packageId: PACKAGE_ID,
        signerAddress,
        signTransaction,
        encryptionKey,
        tatum: serverTatumExecute,
      });
      const attestationType = toAttestationType(attestType);
      steps[0] = { ...steps[0], status: "done", detail: toAttestationLabel(attestationType) };

      steps[1].status = "running";
      setOperationProgress({ type: "attest", steps: [...steps] });
      const result = await createAttestation({
        evidenceId: recordId,
        reviewerAddress: signerAddress,
        attestationType,
        sourceConfidence: "L3" satisfies SourceConfidenceLevel,
        note: attestNotes || "Attested via Linow Workspace.",
      });
      const attestationId = result.attestation.id;
      const txDigest = result.attestation.transactionDigest ?? "n/a";
      const createdAt = result.attestation.createdAt.replace("T", " ").substring(0, 16);

      steps[1] = { ...steps[1], status: "done", detail: txDigest };
      setOperationProgress({ type: "attest", steps: [...steps] });

      setRegistry((prev) =>
        prev.map((record) =>
          record.id === recordId
            ? {
              ...record,
              reviewer: signerAddress,
              notes: attestNotes || "Attested via Linow Workspace.",
              latestAttestation: {
                id: attestationId,
                action: toAttestationLabel(attestationType),
                reviewer: signerAddress,
                note: attestNotes || "Attested via Linow Workspace.",
                txDigest,
                createdAt,
              },
            }
            : record,
        ),
      );

      setAttestResult({
        attestationId,
        txDigest,
        evidenceId: recordId,
        reviewer: signerAddress,
        action: toAttestationLabel(attestationType),
        createdAt,
      });
      if (demoEngagement.id && isDemoStoreConfigured()) {
        void insertDemoAttestation({
          id: `${recordId}-${attestationId}`,
          engagement_id: demoEngagement.id,
          evidence_id: recordId,
          attestation_id: attestationId,
          tx_digest: txDigest,
          reviewer_wallet: signerAddress,
          action: toAttestationLabel(attestationType),
          note: attestNotes || "Attested via Linow Workspace.",
        }).then(() => {
          setDemoEngagement((prev) => ({
            ...prev,
            status: "ready",
            message: "Reviewer attestation synced to shared demo engagement.",
          }));
        }).catch((error) => {
          setDemoEngagement((prev) => ({
            ...prev,
            status: "error",
            message: getErrorMessage(error, "Attestation recorded on-chain but could not be synced to Supabase."),
          }));
        });
      }
      const attestedRecord = registry.find((record) => record.id === recordId);
      setProofSnapshot((prev) => ({
        auditPackId: attestedRecord?.auditPackId ?? prev?.auditPackId,
        evidenceId: recordId,
        txDigest,
        packageId: PACKAGE_ID,
        commitment: attestedRecord?.commitment || prev?.commitment,
        blobReference: attestedRecord?.blobId || prev?.blobReference,
        attestationId,
        verificationStatus: prev?.verificationStatus,
        checkedFileLabel: prev?.checkedFileLabel,
        memoryStatus: prev?.memoryStatus,
        updatedAt: createdAt,
      }));
      setBottomTab("chain");
    } catch (error) {
      setAttestError(getErrorMessage(error, "Attestation failed while calling live infrastructure."));
      setOperationProgress(null);
    } finally {
      setIsAttesting(false);
    }
  };

  const handleRunAgent = async () => {
    if (agentRun.status === "running") return;

    const packId = auditPack.id ?? "local-demo-pack";
    setAgentRun({
      ...DEFAULT_AGENT_STATE,
      status: "running",
      message: "Reading text-like local evidence and calling the agent orchestration route.",
    });

    const steps: ProgressStep[] = [
      { label: "Preparing document text", status: "pending" },
      { label: "Running agent orchestration", status: "pending" },
      { label: "Persisting memory when configured", status: "pending" },
    ];

    try {
      steps[0].status = "running";
      setOperationProgress({ type: "agent", steps: [...steps] });

      const documents: Array<Record<string, unknown>> = [];
      const warnings: string[] = [];
      const sourceDocuments = [
        ...visibleLocalDocuments.map((document) => ({
          id: document.id,
          file: document.file,
          fileName: document.fileName,
          documentType: document.documentType,
          source: document.source,
          evidenceRef: undefined as EvidenceRecord | undefined,
        })),
        ...registry.map((record) => ({
          id: record.id,
          file: record.sourceFile,
          fileName: record.fileName ?? record.id,
          documentType: record.type,
          source: record.source,
          evidenceRef: record,
        })),
      ];

      for (const item of sourceDocuments) {
        if (!item.file) continue;
        const { text, warning } = await readAgentText(item.file);
        if (warning) warnings.push(`${item.fileName}: ${warning}`);
        if (!text) continue;

        documents.push({
          documentId: item.id,
          documentName: item.fileName,
          documentText: text,
          notes: item.evidenceRef
            ? [`Registered evidence ${item.evidenceRef.id}`, `Source confidence ${item.source}`]
            : [`Local session file. ${item.source}`],
          context: {
            engagementName: "Q2 2026 Audit Readiness",
            documentTypeHint: item.documentType,
            uploaderLabel: item.source,
            auditArea: "Audit readiness",
          },
          evidence_ref: item.evidenceRef
            ? {
              evidence_id: item.evidenceRef.id,
              walrus_blob_id: item.evidenceRef.blobId,
              commitment: item.evidenceRef.commitment,
            }
            : undefined,
        });
      }

      if (documents.length === 0) {
        throw new Error(
          warnings[0] ??
          "No readable text-like local evidence is available. Add a CSV, TXT, JSON, MD, or TSV file for the web agent panel.",
        );
      }

      steps[0] = { ...steps[0], status: "done", detail: `${documents.length} readable` };
      steps[1].status = "running";
      setOperationProgress({ type: "agent", steps: [...steps] });

      const packNotes = [
        auditPack.id
          ? "AuditPack exists on Sui testnet. Evidence may include on-chain proof references."
          : "No AuditPack has been created yet; this is a local workspace analysis run.",
        agentInstruction.trim()
          ? `User audit instruction: ${agentInstruction.trim()}`
          : undefined,
      ].filter((note): note is string => Boolean(note));

      const result = await postJson<unknown>("/api/agent/orchestrate", {
        response_mode: "workspace",
        profile: "balanced",
        pack_id: packId,
        engagement_name: "Q2 2026 Audit Readiness",
        audit_area: "Audit readiness",
        stage: "fieldwork",
        pack_owner_address: auditPack.owner ?? signerAddress,
        documents,
        pack_notes: packNotes,
      });

      const root = isRecord(result) ? result : {};
      const gap = isRecord(root.gap_analysis) ? root.gap_analysis : {};
      const summary = isRecord(root.audit_pack_summary) ? root.audit_pack_summary : {};
      const approvalControls = isRecord(root.approval_controls) ? root.approval_controls : {};
      const persistence = isRecord(root.persistence_result) ? root.persistence_result : {};
      const memwal = isRecord(persistence.memwal) ? persistence.memwal : {};
      const walrus = isRecord(persistence.walrus) ? persistence.walrus : {};
      const sui = isRecord(persistence.sui) ? persistence.sui : {};
      const reviewBundle = isRecord(root.review_bundle) ? root.review_bundle : {};

      const actionCandidates = readArray(
        readArray(approvalControls.action_candidates).length > 0 ? approvalControls.action_candidates : sui.action_candidates,
      ).map((candidate) => {
        const row = isRecord(candidate) ? candidate : {};
        return {
          packId: readString(row.pack_id),
          actionType: readString(row.action_type) ?? "agent_action",
          outputHash: readString(row.agent_output_hash) ?? "hash unavailable",
          targetKind: readString(row.target_kind),
          targetId: readString(row.target_id),
          evidenceId: readString(row.evidence_id),
          documentId: readString(row.document_id),
          findingId: readString(row.finding_id),
          requiresHumanApproval: row.requires_human_approval !== false,
        };
      });

      const findings = readArray(root.findings).map((finding, index) => {
        const row = isRecord(finding) ? finding : {};
        return {
          id: readString(row.finding_id) ?? `finding-${index + 1}`,
          title: readString(row.title) ?? readString(row.condition) ?? `Draft finding ${index + 1}`,
          severity: readString(row.severity) ?? "Unrated",
          status: "draft" as const,
        };
      });

      steps[1] = { ...steps[1], status: "done", detail: `${findings.length} findings` };
      steps[2] = {
        ...steps[2],
        status: "done",
        detail: readString(memwal.status) ?? readString(walrus.status) ?? "checked",
      };
      setOperationProgress({ type: "agent", steps: [...steps] });

      const memoryStatus = [
        readString(memwal.status) ? `MemWal ${readString(memwal.status)}` : null,
        readString(walrus.status) ? `Walrus ${readString(walrus.status)}` : null,
      ].filter(Boolean).join(" / ") || "memory status unavailable";

      setAgentRun({
        status: "success",
        message:
          warnings.length > 0
            ? `Agent run completed with ${warnings.length} web-ingestion limitation(s).`
            : "Agent run completed. Outputs still require human approval before any chain action.",
        recalledPriorCount: readNumber(root.recalled_prior_memory_count),
        readinessScore: readNumber(gap.readiness_score) ?? readNumber(summary.readiness_score),
        documentsAnalyzed: readNumber(summary.evidence_count) ?? documents.length,
        findings,
        actionCandidates,
        memoryStatus,
        raw: {
          documents: root.documents,
          gap_analysis: root.gap_analysis,
          findings: root.findings,
          audit_pack_summary: root.audit_pack_summary,
          approval_controls: root.approval_controls,
          review_bundle: reviewBundle,
          persistence_result: root.persistence_result,
          pack_notes: packNotes,
          warnings,
        },
      });
      setProofSnapshot((prev) => ({
        auditPackId: auditPack.id ?? prev?.auditPackId,
        evidenceId: prev?.evidenceId,
        txDigest: prev?.txDigest,
        packageId: PACKAGE_ID,
        commitment: prev?.commitment,
        blobReference: prev?.blobReference,
        attestationId: prev?.attestationId,
        verificationStatus: prev?.verificationStatus,
        checkedFileLabel: prev?.checkedFileLabel,
        memoryStatus,
        updatedAt: nowLabel(),
      }));
      setBottomTab("agent");
    } catch (error) {
      steps[0].status = steps[0].status === "running" ? "error" : steps[0].status;
      steps[1].status = steps[1].status === "running" ? "error" : steps[1].status;
      setOperationProgress({ type: "agent", steps: [...steps] });
      setAgentRun({
        ...DEFAULT_AGENT_STATE,
        status: "error",
        message: getErrorMessage(error, "Agent orchestration failed."),
      });
    }
  };

  const getAgentActionCandidateKey = (candidate: AgentActionCandidate) =>
    [
      candidate.packId ?? auditPack.id ?? "no-pack",
      candidate.targetKind ?? "target",
      candidate.targetId ?? "no-target",
      candidate.actionType,
      candidate.outputHash,
    ].join("|");

  const isAgentActionLogged = (candidate: AgentActionCandidate) => {
    const key = getAgentActionCandidateKey(candidate);
    return agentActionLog.logs.some((log) => log.key === key);
  };

  const handleApproveAgentAction = async (candidate: AgentActionCandidate) => {
    const key = getAgentActionCandidateKey(candidate);
    const packId = candidate.packId ?? auditPack.id;

    if (!signerAddress) {
      setAgentActionLog((prev) => ({
        ...prev,
        status: "error",
        activeKey: key,
        message: "Connect a Sui wallet before approving an AgentAction.",
      }));
      return;
    }

    if (!auditorWalletMatches) {
      setAgentActionLog((prev) => ({
        ...prev,
        status: "error",
        activeKey: key,
        message: "Connect the assigned auditor wallet before approving an AgentAction.",
      }));
      return;
    }

    if (!isSuiObjectId(packId)) {
      setAgentActionLog((prev) => ({
        ...prev,
        status: "error",
        activeKey: key,
        message: "AgentAction approval needs a real Sui AuditPack object ID. Create the AuditPack before logging agent actions.",
      }));
      return;
    }

    if (!/^[0-9a-fA-F]+$/.test(candidate.outputHash) || candidate.outputHash === "hash unavailable") {
      setAgentActionLog((prev) => ({
        ...prev,
        status: "error",
        activeKey: key,
        message: "AgentAction approval needs a valid hex output hash.",
      }));
      return;
    }

    setAgentActionLog((prev) => ({
      ...prev,
      status: "signing",
      activeKey: key,
      message: "Waiting for wallet approval to log the AgentAction hash on Sui.",
    }));

    try {
      const emitAgentAction = createEmitAgentActionFlow({
        packageId: PACKAGE_ID,
        signerAddress,
        signTransaction,
        tatum: serverTatumExecute,
        tatumNetwork: "testnet",
      });
      const result = await emitAgentAction({
        packId,
        evidenceId: candidate.evidenceId,
        actionType: candidate.actionType,
        agentOutputHash: candidate.outputHash,
      });
      const loggedAt = nowLabel();
      const loggedAction: LoggedAgentAction = {
        key,
        packId,
        evidenceId: candidate.evidenceId,
        actionType: candidate.actionType,
        outputHash: candidate.outputHash,
        targetKind: candidate.targetKind,
        targetId: candidate.targetId,
        signer: signerAddress,
        txDigest: result.transactionDigest,
        packageId: result.packageId,
        eventCount: result.eventCount,
        objectChangeCount: result.objectChangeCount,
        event: result.agentActionEvent,
        loggedAt,
      };

      setAgentActionLog((prev) => ({
        status: "success",
        activeKey: key,
        message: "AgentAction logged on Sui. Only the approved output hash and lifecycle event were written.",
        logs: [loggedAction, ...prev.logs.filter((log) => log.key !== key)],
      }));
      if (candidate.findingId) {
        setAgentRun((prev) => ({
          ...prev,
          findings: prev.findings.map((finding) =>
            finding.id === candidate.findingId ? { ...finding, status: "logged" } : finding,
          ),
        }));
      }
      setProofSnapshot((prev) => ({
        auditPackId: packId,
        evidenceId: candidate.evidenceId ?? prev?.evidenceId,
        txDigest: result.transactionDigest ?? prev?.txDigest,
        packageId: result.packageId ?? PACKAGE_ID,
        commitment: prev?.commitment,
        blobReference: prev?.blobReference,
        attestationId: prev?.attestationId,
        verificationStatus: prev?.verificationStatus,
        checkedFileLabel: prev?.checkedFileLabel,
        memoryStatus: prev?.memoryStatus,
        agentActionTxDigest: result.transactionDigest,
        agentActionEventType: result.agentActionEvent?.type,
        agentActionEventSeq: result.agentActionEvent?.id?.eventSeq,
        agentActionOutputHash: candidate.outputHash,
        updatedAt: loggedAt,
      }));
      if (demoEngagement.id && isDemoStoreConfigured()) {
        void insertDemoAgentAction({
          id: `${key}-${result.transactionDigest ?? loggedAt}`.replace(/[^\w.-]+/g, "_"),
          engagement_id: demoEngagement.id,
          pack_id: packId,
          evidence_id: candidate.evidenceId ?? null,
          action_type: candidate.actionType,
          output_hash: candidate.outputHash,
          tx_digest: result.transactionDigest ?? null,
          event_type: result.agentActionEvent?.type ?? null,
          event_seq: result.agentActionEvent?.id?.eventSeq ?? null,
          signer_wallet: signerAddress,
        }).then(() => {
          setDemoEngagement((prev) => ({
            ...prev,
            status: "ready",
            message: "AgentAction proof synced to shared demo engagement.",
          }));
        }).catch((error) => {
          setDemoEngagement((prev) => ({
            ...prev,
            status: "error",
            message: getErrorMessage(error, "AgentAction logged on-chain but could not be synced to Supabase."),
          }));
        });
      }
      setBottomTab("chain");
    } catch (error) {
      setAgentActionLog((prev) => ({
        ...prev,
        status: "error",
        activeKey: key,
        message: getErrorMessage(error, "AgentAction logging failed."),
      }));
    }
  };

  const handleReloadWalrusMemory = async () => {
    const manifestBlobId = agentReview.persistence.manifestBlobId;
    const artifactBlobId = agentReview.persistence.artifactBlobId;

    if (!manifestBlobId || !artifactBlobId) {
      setMemoryReload({
        status: "error",
        message: "No direct Walrus memory artifact is available yet. Run agent analysis with LINOW_AGENT_MEMORY_ENCRYPTION_KEY configured.",
      });
      setBottomTab("memory");
      return;
    }

    setMemoryReload({
      status: "loading",
      message: "Reloading encrypted Walrus memory manifest and agent artifact.",
    });

    try {
      const result = await postJson<WalrusMemoryReloadResult>("/api/walrus/memory/reload", {
        manifestBlobId,
        artifactBlobId,
      });

      setMemoryReload({
        status: "success",
        message: "Encrypted Walrus memory artifact reloaded and decrypted server-side.",
        result,
      });
      setProofSnapshot((prev) => ({
        auditPackId: auditPack.id ?? result.manifest.packId ?? prev?.auditPackId,
        evidenceId: prev?.evidenceId,
        txDigest: prev?.txDigest,
        packageId: PACKAGE_ID,
        commitment: prev?.commitment,
        blobReference: result.artifactBlobId,
        attestationId: prev?.attestationId,
        verificationStatus: prev?.verificationStatus,
        checkedFileLabel: prev?.checkedFileLabel,
        memoryStatus: `Walrus memory reloaded (${result.network})`,
        updatedAt: nowLabel(),
      }));
      setBottomTab("memory");
    } catch (error) {
      setMemoryReload({
        status: "error",
        message: getErrorMessage(error, "Walrus memory reload failed."),
      });
      setBottomTab("memory");
    }
  };

  const renderSteps = (type: OperationType) => {
    if (!operationProgress || operationProgress.type !== type) return null;

    return (
      <div className="ide-progress">
        {operationProgress.steps.map((step, index) => (
          <div key={`${step.label}-${index}`} className="ide-progress-step">
            <span className={`ide-progress-dot ${step.status}`} />
            <span>{step.label}</span>
            {step.detail && <code>{step.detail}</code>}
          </div>
        ))}
      </div>
    );
  };

  const renderStatusDot = (status: LocalDocumentStatus | "registered-record" | "attested-record" | "tampered") => {
    const className =
      status === "local"
        ? "status-local"
        : status === "queued" || status === "registering"
          ? "status-pending"
          : status === "registered" || status === "registered-record"
            ? "status-registered"
            : status === "attested-record"
              ? "status-approved"
              : "status-flagged";

    return <span className={`tree-status ${className}`} />;
  };

  const findAgentDocumentReview = (input: { fileName?: string; evidenceId?: string; localId?: string }) =>
    agentReview.documents.find((document) =>
      (input.evidenceId && document.evidenceId === input.evidenceId) ||
      (input.localId && document.id === input.localId) ||
      (input.fileName && document.filename === input.fileName),
    );

  const renderAgentDocumentReview = (review?: AgentDocumentReview) => (
    <div className="card">
      <div className="card-section-title">Agent Document Review</div>
      {review ? (
        <div className="agent-review-card">
          <div className="agent-review-head">
            <div>
              <strong>{review.documentType}</strong>
              <span>{review.filename}</span>
            </div>
            <code>{review.sourceConfidence ?? "L?"}</code>
          </div>
          <p>{review.classificationRationale ?? "No classification rationale returned."}</p>
          <div className="agent-review-grid">
            <div>
              <span>Classification confidence</span>
              <strong>{formatPercent(review.confidence)}</strong>
            </div>
            <div>
              <span>Evidence proof</span>
              <strong>{review.evidenceId ? "linked" : "local only"}</strong>
            </div>
          </div>
          {review.metadataSummary.length > 0 && (
            <div className="agent-chip-row">
              {review.metadataSummary.map((item) => <span key={item}>{item}</span>)}
            </div>
          )}
          {review.mappedAssertions.length > 0 && (
            <div className="agent-assertion-list">
              {review.mappedAssertions.slice(0, 6).map((assertion) => (
                <div key={`${assertion.label}-${assertion.coverage}`}>
                  <strong>{assertion.label}</strong>
                  <span>{assertion.coverage}{assertion.confidence !== undefined ? ` / ${formatPercent(assertion.confidence)}` : ""}</span>
                </div>
              ))}
            </div>
          )}
          {(review.sourceReason || review.sourceCaveats.length > 0 || review.classificationLimitations.length > 0) && (
            <p className="ide-muted">
              {[
                review.sourceReason,
                ...review.sourceCaveats,
                ...review.classificationLimitations,
              ].filter(Boolean).slice(0, 3).join(" ")}
            </p>
          )}
        </div>
      ) : (
        <p className="ide-muted">Run the agent to populate classification, source confidence, metadata, and assertion mapping for this evidence.</p>
      )}
    </div>
  );

  const renderMainContent = () => {
    if (activeRailPanel === "settings" || activeItemId === "settings") {
      return renderSettingsPanel();
    }

    if (selectedLocalDocument) {
      return renderLocalDocument(selectedLocalDocument);
    }

    if (selectedRecord) {
      return renderRegisteredRecord(selectedRecord);
    }

    if (activeItemId === "folder:findings") {
      return renderFindingsFolder();
    }

    if (activeItemId === "folder:proof") {
      return renderProofFolder();
    }

    return renderEvidenceFolder();
  };

  const renderEvidenceFolder = () => (
    <div className="ide-main-stack">
      <div className="ide-panel-header">
        <div>
          <span className="workspace-eyebrow">Explorer</span>
          <h1 className="workspace-title">Q2 AuditPack Evidence</h1>
          <p className="workspace-desc">
            Local session files are prepared here, then registered through the live SDK path. Registered evidence can be verified and attested by the reviewer wallet.
          </p>
        </div>
        <div className="ide-panel-actions">
          <button className="btn-secondary" type="button" onClick={() => addDocumentInputRef.current?.click()}>
            Add document
          </button>
          <div className={`ide-auditpack-status${auditPack.id ? " ready" : ""}`} title={auditPack.id ?? "No AuditPack created"}>
            {auditPack.id ? `AuditPack ready: ${truncateValue(auditPack.id, 18)}` : "No AuditPack created"}
          </div>
          <button
            className="btn-primary"
            type="button"
            disabled={
              role !== "company" ||
              isBatchRegistering ||
              isRegistering ||
              !signerAddress ||
              !companyWalletMatches ||
              selectedBatchDocuments.length === 0
            }
            onClick={handleBatchRegister}
          >
            {isBatchRegistering ? "Registering batch..." : `Register selected (${selectedBatchDocuments.length})`}
          </button>
        </div>
      </div>

      <div className="ide-evidence-section">
        <div className="ide-batch-toolbar">
        <div>
          <strong>{selectedBatchDocuments.length}</strong>
          <span> local file(s) selected for this AuditPack</span>
          {selectedBatchDocuments.length > 0 && (
            <span> - {selectedBatchReady ? "all ready" : `${selectedBatchDocuments.length - incompleteSelectedBatchDocuments.length}/${selectedBatchDocuments.length} ready`}</span>
          )}
        </div>
        <div className="ide-batch-actions">
          <button className="btn-secondary" type="button" disabled={selectableLocalDocuments.length === 0 || isBatchRegistering} onClick={selectAllBatchDocuments}>
            Select all local
          </button>
          <button className="btn-secondary" type="button" disabled={selectedLocalDocumentIds.length === 0 || isBatchRegistering} onClick={clearBatchSelection}>
            Clear selection
          </button>
        </div>
      </div>

      {registerError && (
        <div className="result-card error">
          <div className="result-title error">Registration blocked</div>
          <p className="result-message">{registerError}</p>
        </div>
      )}

      {incompleteSelectedBatchDocuments.length > 0 && (
        <p className="ide-section-note warning">
          Complete type, source, description, and assertions for: {incompleteSelectedBatchDocuments.map((document) => document.fileName).join(", ")}.
        </p>
      )}

      {!auditPack.id && selectableLocalDocuments.length > 0 && (
        <p className="ide-section-note warning">
          Batch registration will create an AuditPack first, then register each selected evidence record against that active `auditPackId`.
        </p>
      )}

      {batchSummary && (
        <div className={`ide-batch-summary ${batchSummary.failed > 0 ? "error" : "success"}`}>
          <div className="ide-batch-summary-title">Batch registration {isBatchRegistering ? "running" : "finished"}</div>
          <p>
            {batchSummary.completed}/{batchSummary.total} registered
            {batchSummary.failed > 0 ? `, ${batchSummary.failed} failed` : ""}
            {batchSummary.currentFile ? ` - current: ${batchSummary.currentFile}` : ""}
          </p>
          {batchSummary.lastError && <p>{batchSummary.lastError}</p>}
        </div>
      )}

      {renderSteps("batch")}

      <div className="ide-folder-grid">
        {[...visibleLocalDocuments, ...registry].length === 0 ? (
          <div className="ide-empty">
            <div className="empty-state-title">No documents in local memory yet</div>
            <p>Add a document from the explorer sidebar. The web workspace keeps the source file in browser memory for this session.</p>
          </div>
        ) : (
          <>
            {visibleLocalDocuments.map((document) => (
              <div
                key={document.id}
                className="ide-file-row"
                onClick={() => prepareLocalDocument(document)}
              >
                <input
                  type="checkbox"
                  className="ide-file-checkbox"
                  checked={selectedLocalDocumentIds.includes(document.id)}
                  disabled={document.status === "registered" || isBatchRegistering}
                  aria-label={`Select ${document.fileName} for batch registration`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => toggleBatchSelection(document.id)}
                />
                <span className="ide-file-name">{document.fileName}</span>
                <span className="ide-file-meta">{document.fileSize}</span>
                <span className="ide-file-state">
                  {renderStatusDot(document.status)}
                  {document.status === "registered"
                    ? "Registered"
                    : document.status === "flagged"
                      ? "Failed"
                      : document.status === "queued"
                        ? "Queued"
                        : selectedLocalDocumentIds.includes(document.id) && !isLocalDocumentReady(document)
                          ? "Needs details"
                          : "Local session"}
                </span>
              </div>
            ))}
            {registry.map((record) => (
              <button
                key={record.id}
                className="ide-file-row"
                type="button"
                onClick={() => {
                  setActiveItemId(`record:${record.id}`);
                  setVerifyRecordId(record.id);
                  setAttestRecordId(record.id);
                }}
              >
                {renderStatusDot(record.latestAttestation ? "attested-record" : "registered-record")}
                <span className="ide-file-name">{record.fileName ?? record.id}</span>
                <span className="ide-file-meta">{truncateValue(record.id, 14)}</span>
                <span className="ide-file-state">{record.latestAttestation ? "Attested" : "Registered"}</span>
              </button>
            ))}
          </>
        )}
      </div>

        <p className="ide-section-note">
          Batch registration runs sequentially through the same hash, encrypt, Walrus upload, wallet signature, and Sui submission path as single-file registration. Partial failures stay visible as red local files.
        </p>
      </div>
    </div>
  );

  const renderLocalDocument = (document: LocalDocument) => (
    <div className="ide-main-stack">
      <div className="ide-panel-header">
        <div>
          <span className="workspace-eyebrow">Local Session File</span>
          <h1 className="workspace-title">{document.fileName}</h1>
          <p className="workspace-desc">
            This file is local to the browser session until you register it. Registration hashes locally, encrypts before Walrus, and writes only commitments to Sui.
          </p>
        </div>
        <span className="ide-state-pill">{document.status}</span>
      </div>

      <div className="card">
        <div className="draft-section-header">
          <div className="card-section-title">Registration Draft</div>
          <button
            className="draft-save-button"
            type="button"
            onClick={() => handleSaveDraft(document.id)}
          >
            Save draft
          </button>
        </div>
        {draftSaveMessage && <p className="draft-save-message">{draftSaveMessage}</p>}
        <div className="form-grid">
          <div className="field">
            <label className="field-label">Document Type</label>
            <select
              className="field-select"
              value={regDocType}
              onChange={(event) => {
                const value = event.target.value;
                setRegDocType(value);
                updateLocalDocumentDraft(document.id, { documentType: value });
              }}
            >
              <option>Audit Evidence</option>
              <option>Bank Statement</option>
              <option>Vendor Contract</option>
              <option>Sales Invoice</option>
              <option>ERP Ledger Export</option>
              <option>Board Resolution</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Claimed Source</label>
            <input
              className="field-input"
              value={regSource}
              onChange={(event) => {
                const value = event.target.value;
                setRegSource(value);
                updateLocalDocumentDraft(document.id, { source: value });
              }}
            />
          </div>
          <div className="field form-full">
            <label className="field-label">Description / Audit Objective</label>
            <textarea
              className="field-textarea"
              rows={3}
              value={regDesc}
              onChange={(event) => {
                const value = event.target.value;
                setRegDesc(value);
                updateLocalDocumentDraft(document.id, { description: value });
              }}
              placeholder="Describe the audit purpose or scope limitation."
            />
          </div>
          <div className="field form-full">
            <label className="field-label">ISA Assertions Covered</label>
            <div className="assertions-grid">
              {ISA_ASSERTIONS.map((assertion) => (
                <button
                  key={assertion}
                  type="button"
                  className={`assertion-chip${regAssertions.includes(assertion) ? " selected" : ""}`}
                  onClick={() => handleToggleAssertion(assertion)}
                >
                  {assertion}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="btn-actions">
          <button
            className="btn-primary"
            disabled={role !== "company" || isRegistering || !signerAddress || !companyWalletMatches || regAssertions.length === 0}
            onClick={() =>
              handleRegister({
                file: document.file,
                documentType: regDocType,
                source: regSource,
                description: regDesc,
                assertions: regAssertions,
                localDocumentId: document.id,
              })
            }
          >
            {isRegistering ? "Registering..." : auditPack.id ? "Register into AuditPack" : "Register Evidence"}
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => setActiveItemId("folder:evidence")}
          >
            Back to folder
          </button>
        </div>
      </div>

      {registerError && (
        <div className="result-card error">
          <div className="result-title error">Registration blocked</div>
          <p className="result-message">{registerError}</p>
        </div>
      )}
      {renderAgentDocumentReview(findAgentDocumentReview({ localId: document.id, fileName: document.fileName }))}
      {renderSteps("register")}
      {registerResult && renderRegisterResult()}
    </div>
  );

  const renderRegisteredRecord = (record: EvidenceRecord) => (
    <div className="ide-main-stack">
      <div className="ide-panel-header">
        <div>
          <span className="workspace-eyebrow">Registered Evidence</span>
          <h1 className="workspace-title">{record.fileName ?? record.type}</h1>
          <p className="workspace-desc">
            Registered evidence can be re-checked against its Sui commitment. Attestation remains a separate reviewer action.
          </p>
        </div>
        <span className="ide-state-pill">{record.latestAttestation ? "attested" : "registered"}</span>
      </div>

      <div className="ide-record-grid">
        <section className="card">
          <div className="card-section-title">Integrity Check</div>
          <div className="proof-grid">
            <div className="proof-row">
              <span className="proof-label">Evidence ID</span>
              <span className="proof-value">{truncateValue(record.id, 32)}</span>
            </div>
            <div className="proof-row">
              <span className="proof-label">Commitment</span>
              <span className="proof-value">{truncateValue(record.commitment, 32)}</span>
            </div>
            <div className="proof-row">
              <span className="proof-label">Walrus Blob</span>
              <span className="proof-value">{truncateValue(record.blobId, 32)}</span>
            </div>
            <div className="proof-row">
              <span className="proof-label">AuditPack</span>
              <span className="proof-value">{record.auditPackId ? truncateValue(record.auditPackId, 32) : "not linked"}</span>
            </div>
          </div>

          <div className="field" style={{ marginTop: "1rem" }}>
            <label className="field-label">Comparison File</label>
            <div className={`file-upload${verifyFile ? " has-file" : ""}`}>
              <div className="file-upload-text">
                <div className="file-upload-name">{verifyFile ? verifyFile.name : "Use session file or load a comparison file"}</div>
                <div className="file-upload-hint">Use a tampered copy to prove mismatch detection.</div>
              </div>
              <input
                type="file"
                className="file-upload-input"
                onChange={(event) => {
                  if (event.target.files?.[0]) setVerifyFile(event.target.files[0]);
                }}
              />
            </div>
          </div>

          <div className="btn-actions">
            <button
              className="btn-primary"
              disabled={isVerifying}
              onClick={() => {
                setVerifyRecordId(record.id);
                handleVerify(record.id);
              }}
            >
              {isVerifying ? "Verifying..." : "Verify hash"}
            </button>
          </div>

          {renderSteps("verify")}
          {verificationResult.status !== "idle" && record.id === (verifyRecordId || record.id) && (
            <div className={`result-card ${verificationResult.status === "success" ? "success" : "error"}`}>
              <div className={`result-title ${verificationResult.status === "success" ? "success" : "error"}`}>
                {verificationResult.status === "success" ? "Hash matches" : "Tamper detected"}
              </div>
              <p className="result-message">{verificationResult.message}</p>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-section-title">Reviewer Attestation</div>
          <div className="tamper-toggle">
            <div className="tamper-info">
              <div className="tamper-title">Human reviewer gate</div>
              <div className="tamper-desc">
                {selectedRecordVerified
                  ? `Ready to attest. ${lastVerificationSession?.checkedFileLabel ?? "Selected file"} matched the commitment.`
                  : selectedRecordTampered
                    ? "Attestation is blocked because the latest verification detected tampering."
                    : "Run a successful verification before creating a reviewer attestation."}
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Reviewer Wallet</label>
              <div className="field-input mono field-display">{signerAddress ? truncateValue(signerAddress, 34) : "Connect wallet"}</div>
            </div>
            <div className="field">
              <label className="field-label">Action</label>
              <select className="field-select" value={attestType} onChange={(event) => setAttestType(event.target.value)}>
                <option value="HashConfirmed">Hash confirmed</option>
                <option value="EvidenceReviewed">Evidence reviewed</option>
                <option value="IssueFlagged">Issue flagged</option>
              </select>
            </div>
            <div className="field form-full">
              <label className="field-label">Reviewer Notes</label>
              <textarea
                className="field-textarea"
                rows={3}
                value={attestNotes}
                onChange={(event) => setAttestNotes(event.target.value)}
                placeholder="Optional reviewer note or limitation."
              />
            </div>
          </div>

          <div className="btn-actions">
            <button
              className="btn-primary"
              disabled={role === "company" || isAttesting || !signerAddress || !auditorWalletMatches || !selectedRecordVerified}
              onClick={() => {
                setAttestRecordId(record.id);
                handleAttest(record.id);
              }}
            >
              {isAttesting ? "Signing..." : "Review and sign"}
            </button>
          </div>

          {attestError && (
            <div className="result-card error">
              <div className="result-title error">Attestation blocked</div>
              <p className="result-message">{attestError}</p>
            </div>
          )}
          {renderSteps("attest")}
          {attestResult && attestResult.evidenceId === record.id && (
            <div className="result-card success">
              <div className="result-title success">Attestation recorded</div>
              <p className="result-message">Reviewer action was signed by the active wallet and submitted through the live SDK flow.</p>
            </div>
          )}
        </section>
      </div>
      {renderAgentDocumentReview(findAgentDocumentReview({ evidenceId: record.id, fileName: record.fileName }))}
    </div>
  );

  const renderFindingsFolder = () => (
    <div className="ide-main-stack">
      <div className="ide-panel-header">
        <div>
          <span className="workspace-eyebrow">Findings</span>
          <h1 className="workspace-title">Agent Draft Findings</h1>
          <p className="workspace-desc">
            Findings are draft work products until a human approves or edits them. No private finding text is stored on-chain.
          </p>
        </div>
        <button className="btn-primary" type="button" disabled={agentRun.status === "running"} onClick={handleRunAgent}>
          {agentRun.status === "running" ? "Running..." : "Run agent"}
        </button>
      </div>
      {renderSteps("agent")}
      <div className="agent-gap-card">
        <div className="agent-gap-metrics">
          <div>
            <span>Readiness</span>
            <strong>
              {agentReview.gapSummary.readinessScore !== undefined
                ? `${agentReview.gapSummary.readinessScore}/100`
                : agentRun.readinessScore !== undefined
                  ? `${agentRun.readinessScore}/100`
                  : "n/a"}
            </strong>
          </div>
          <div>
            <span>Covered</span>
            <strong>{agentReview.gapSummary.coveredLabels.length}</strong>
          </div>
          <div>
            <span>Missing</span>
            <strong>{agentReview.gapSummary.missingLabels.length}</strong>
          </div>
        </div>
        <div className="agent-chip-row">
          {agentReview.gapSummary.coveredLabels.slice(0, 6).map((label) => (
            <span key={`covered-${label}`} className="covered">{label}</span>
          ))}
          {agentReview.gapSummary.missingLabels.slice(0, 6).map((label) => (
            <span key={`missing-${label}`} className="missing">{label}</span>
          ))}
          {agentReview.gapSummary.coveredLabels.length === 0 && agentReview.gapSummary.missingLabels.length === 0 && (
            <span>No assertion coverage returned yet</span>
          )}
        </div>
        {agentReview.gapSummary.recommendations.length > 0 && (
          <div className="agent-recommendations">
            {agentReview.gapSummary.recommendations.slice(0, 3).map((recommendation) => (
              <p key={recommendation}>{recommendation}</p>
            ))}
          </div>
        )}
      </div>
      <div className="ide-folder-grid">
        {agentReview.findings.length > 0 ? (
          agentReview.findings.map((finding) => (
            <article key={finding.id} className="agent-finding-card">
              <div className="agent-finding-head">
                {renderStatusDot(finding.status === "blocked" ? "tampered" : finding.status === "approved" ? "attested-record" : "registering")}
                <div>
                  <strong>{finding.title}</strong>
                  <span>{finding.severity} / {finding.status} / {finding.citationCount} citation(s)</span>
                </div>
              </div>
              <div className="agent-finding-body">
                {finding.condition && (
                  <div>
                    <span>Condition</span>
                    <p>{finding.condition}</p>
                  </div>
                )}
                {finding.criteria && (
                  <div>
                    <span>Criteria</span>
                    <p>{finding.criteria}</p>
                  </div>
                )}
                {finding.cause && (
                  <div>
                    <span>Cause</span>
                    <p>{finding.cause}</p>
                  </div>
                )}
                {finding.effect && (
                  <div>
                    <span>Effect</span>
                    <p>{finding.effect}</p>
                  </div>
                )}
                {finding.recommendation && (
                  <div>
                    <span>Recommendation</span>
                    <p>{finding.recommendation}</p>
                  </div>
                )}
              </div>
              {finding.missingAssertions.length > 0 && (
                <div className="agent-chip-row">
                  {finding.missingAssertions.map((assertion) => (
                    <span key={`${finding.id}-${assertion}`} className="missing">{assertion}</span>
                  ))}
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="ide-empty">
            <div className="empty-state-title">No agent findings yet</div>
            <p>Run the agent after adding readable evidence. PDF/DOCX/XLSX browser extraction is not wired yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderProofFolder = () => (
    <div className="ide-main-stack">
      <div className="ide-panel-header">
        <div>
          <span className="workspace-eyebrow">Proof</span>
          <h1 className="workspace-title">Proof Dashboard</h1>
          <p className="workspace-desc">
            Judge-facing trail for package, AuditPack, evidence, Walrus, memory, and attestations. This proves integrity and lifecycle actions, not document truth.
          </p>
        </div>
      </div>
      {proofSnapshot ? renderProofSnapshot() : (
        <div className="ide-empty">
          <div className="empty-state-title">No proof action has run yet</div>
          <p>Create an AuditPack, register evidence, verify a hash, or run agent memory to populate this dashboard.</p>
        </div>
      )}
      <div className="card">
        <div className="card-section-title">AuditPack Evidence Links</div>
        {registry.length > 0 ? (
          <div className="ide-proof-list">
            {registry.map((record) => (
              <div key={record.id} className="ide-proof-item">
                <div>
                  <strong>{record.fileName ?? record.type}</strong>
                  <span>{record.auditPackId ? `Linked to ${truncateValue(record.auditPackId, 18)}` : "No AuditPack link"}</span>
                </div>
                <code>{truncateValue(record.id, 22)}</code>
              </div>
            ))}
          </div>
        ) : (
          <p className="ide-muted">No registered evidence records yet.</p>
        )}
      </div>
    </div>
  );

  const renderSettingsPanel = () => (
    <div className="ide-main-stack">
      <div className="ide-panel-header">
        <div>
          <span className="workspace-eyebrow">Settings</span>
          <h1 className="workspace-title">Workspace Runtime</h1>
          <p className="workspace-desc">Minimal hackathon settings for role, package, and infrastructure status.</p>
        </div>
      </div>
      <div className="card">
        <div className="card-section-title">Shared Demo Engagement</div>
        <div className="demo-engagement-panel">
          <div className={`demo-engagement-status ${demoEngagement.status}`}>
            <strong>{demoEngagement.id ? truncateValue(demoEngagement.id, 28) : "No shared engagement loaded"}</strong>
            <span>{demoEngagement.message}</span>
          </div>
          <div className="form-grid">
            <div className="field form-full">
              <label className="field-label">Engagement ID</label>
              <input
                className="field-input mono"
                value={engagementInput}
                onChange={(event) => setEngagementInput(event.target.value)}
                placeholder="Paste shared engagement ID"
                disabled={!isDemoStoreConfigured()}
              />
            </div>
          </div>
          <div className="btn-actions">
            <button
              className="btn-secondary"
              type="button"
              disabled={!isDemoStoreConfigured() || demoEngagement.status === "loading"}
              onClick={handleCreateDemoEngagement}
            >
              Create engagement
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={!isDemoStoreConfigured() || demoEngagement.status === "loading" || !engagementInput.trim()}
              onClick={handleLoadDemoEngagement}
            >
              Load engagement
            </button>
          </div>
          <div className="demo-wallet-grid">
            <div>
              <span>Company wallet</span>
              <code>{demoEngagement.companyWallet ? truncateValue(demoEngagement.companyWallet, 28) : "unassigned"}</code>
              <button
                className="btn-secondary"
                type="button"
                disabled={!demoEngagement.id || !signerAddress}
                onClick={() => handleAssignDemoWallet("company")}
              >
                Use current wallet
              </button>
            </div>
            <div>
              <span>Auditor wallet</span>
              <code>{demoEngagement.auditorWallet ? truncateValue(demoEngagement.auditorWallet, 28) : "unassigned"}</code>
              <button
                className="btn-secondary"
                type="button"
                disabled={!demoEngagement.id || !signerAddress}
                onClick={() => handleAssignDemoWallet("auditor")}
              >
                Use current wallet
              </button>
            </div>
          </div>
          {demoEngagement.id && (
            <p className="ide-section-note">
              Shared link: `/workspace?engagement={demoEngagement.id}`. This stores synthetic demo files and proof metadata for the web PoC.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-section-title">Role</div>
        <div className="ide-role-grid">
          {(["company", "auditor", "verifier"] as WorkspaceRole[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`ide-role-option${role === item ? " active" : ""}`}
              onClick={() => setRole(item)}
            >
              <strong>{item}</strong>
              <span>
                {item === "company"
                  ? "Upload, register, run agent"
                  : item === "auditor"
                    ? "Verify and attest"
                    : "Read proof only"}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-section-title">Infrastructure</div>
        <div className="proof-grid">
          <div className="proof-row">
            <span className="proof-label">Package ID</span>
            <span className="proof-value">{truncateValue(PACKAGE_ID, 42)}</span>
          </div>
          <div className="proof-row">
            <span className="proof-label">Wallet</span>
            <span className="proof-value">{signerAddress ? truncateValue(signerAddress, 42) : "not connected"}</span>
          </div>
          <div className="proof-row">
            <span className="proof-label">Walrus</span>
            <span className="proof-value">encrypted upload via SDK</span>
          </div>
          <div className="proof-row">
            <span className="proof-label">MemWal</span>
            <span className="proof-value">{agentRun.memoryStatus ?? "configured server-side when env is present"}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRegisterResult = () => registerResult && (
    <div className="result-card success">
      <div className="result-title success">Evidence registered</div>
      <p className="result-message">File hashing, encryption, Walrus storage, and Sui registration completed through the live SDK flow.</p>
      <div className="proof-grid">
        <div className="proof-row">
          <span className="proof-label">Evidence ID</span>
          <span className="proof-value">{truncateValue(registerResult.objectId, 28)}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Tx Digest</span>
          <span className="proof-value">{registerResult.txDigest}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Walrus Blob</span>
          <span className="proof-value">{truncateValue(registerResult.blobId, 28)}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Commitment</span>
          <span className="proof-value">{truncateValue(registerResult.commitment, 28)}</span>
        </div>
      </div>
    </div>
  );

  const renderProofSnapshot = () => proofSnapshot && (
    <div className="card">
      <div className="card-section-title">Latest Proof Snapshot</div>
      <div className="proof-grid">
        <div className="proof-row">
          <span className="proof-label">AuditPack ID</span>
          <span className="proof-value">{proofSnapshot.auditPackId ? truncateValue(proofSnapshot.auditPackId, 34) : "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Evidence ID</span>
          <span className="proof-value">{proofSnapshot.evidenceId ? truncateValue(proofSnapshot.evidenceId, 34) : "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Tx Digest</span>
          <span className="proof-value">{proofSnapshot.txDigest ?? "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Package ID</span>
          <span className="proof-value">{truncateValue(proofSnapshot.packageId ?? PACKAGE_ID, 34)}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Commitment</span>
          <span className="proof-value">{proofSnapshot.commitment ? truncateValue(proofSnapshot.commitment, 34) : "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Blob</span>
          <span className="proof-value">{proofSnapshot.blobReference ? truncateValue(proofSnapshot.blobReference, 34) : "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Attestation</span>
          <span className="proof-value">{proofSnapshot.attestationId ? truncateValue(proofSnapshot.attestationId, 34) : "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Memory</span>
          <span className="proof-value">{proofSnapshot.memoryStatus ?? "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">AgentAction Tx</span>
          <span className="proof-value">{proofSnapshot.agentActionTxDigest ? truncateValue(proofSnapshot.agentActionTxDigest, 34) : "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">AgentAction Event</span>
          <span className="proof-value">{proofSnapshot.agentActionEventType ? truncateValue(proofSnapshot.agentActionEventType, 34) : "pending"}</span>
        </div>
        <div className="proof-row">
          <span className="proof-label">Agent Output Hash</span>
          <span className="proof-value">{proofSnapshot.agentActionOutputHash ? truncateValue(proofSnapshot.agentActionOutputHash, 34) : "pending"}</span>
        </div>
      </div>
    </div>
  );

  const renderBottomPanel = () => {
    const rawPayload = {
      auditPack,
      selected: activeItemId,
      proofSnapshot,
      registerResult,
      batchSummary,
      verificationResult,
      attestResult,
      memoryReload,
      agentActionLog,
      agentRun: agentRun.raw ?? {
        status: agentRun.status,
        message: agentRun.message,
      },
      agentInstruction: agentInstruction.trim() || undefined,
    };

    return (
      <section className="ide-bottom-panel">
        <div className="ide-bottom-tabs">
          {(["details", "chain", "memory", "agent", "privacy", "raw"] as BottomTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={bottomTab === tab ? "active" : ""}
              onClick={() => setBottomTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="ide-bottom-content">
          {bottomTab === "details" && (
            <div className="ide-status-line">
              <span>Selected: {selectedLocalDocument?.fileName ?? selectedRecord?.fileName ?? activeItemId}</span>
              <span>Role: {role}</span>
              <span>Local docs: {localDocuments.length}</span>
              <span>Selected for batch: {selectedBatchDocuments.length}</span>
              <span>Registered: {registry.length}</span>
              <span>Engagement: {demoEngagement.id ? truncateValue(demoEngagement.id, 18) : "local only"}</span>
              <span>Wallet role: {demoEngagement.companyWallet === signerAddress ? "company" : demoEngagement.auditorWallet === signerAddress ? "auditor" : "unassigned"}</span>
            </div>
          )}
          {bottomTab === "chain" && (
            <div className="ide-chain-panel">
              <div className="ide-status-line">
                <span>Package {truncateValue(PACKAGE_ID, 28)}</span>
                <span>Pack {auditPack.id ? truncateValue(auditPack.id, 20) : "not created"}</span>
                <span>Pack evidence links: {registry.filter((record) => record.auditPackId === auditPack.id).length}</span>
                <span>Tx {proofSnapshot?.txDigest ? truncateValue(proofSnapshot.txDigest, 24) : "pending"}</span>
                <span>Attestation {proofSnapshot?.attestationId ? truncateValue(proofSnapshot.attestationId, 18) : "pending"}</span>
              </div>
              <div className={`ide-memory-result ${agentActionLog.status === "error" ? "error" : agentActionLog.status === "success" ? "success" : "idle"}`}>
                <strong>AgentAction log</strong>
                <p>{agentActionLog.message}</p>
                {agentActionLog.logs[0] && (
                  <div className="ide-memory-grid">
                    <span>Tx</span>
                    <code>{agentActionLog.logs[0].txDigest ? truncateValue(agentActionLog.logs[0].txDigest, 18) : "pending"}</code>
                    <span>Event</span>
                    <code>{agentActionLog.logs[0].event?.type ? truncateValue(agentActionLog.logs[0].event.type, 18) : "pending"}</code>
                    <span>Seq</span>
                    <code>{agentActionLog.logs[0].event?.id?.eventSeq ?? "pending"}</code>
                    <span>Events/Objects</span>
                    <code>{agentActionLog.logs[0].eventCount}/{agentActionLog.logs[0].objectChangeCount}</code>
                    <span>Output hash</span>
                    <code>{truncateValue(agentActionLog.logs[0].outputHash, 18)}</code>
                    <span>Signer</span>
                    <code>{truncateValue(agentActionLog.logs[0].signer, 18)}</code>
                  </div>
                )}
              </div>
            </div>
          )}
          {bottomTab === "memory" && (
            <div className="ide-memory-panel">
              <div className="ide-status-line">
                <span>{agentRun.memoryStatus ?? "No memory write has been observed in this workspace session."}</span>
                <span>Namespace: {agentReview.persistence.memoryNamespace ?? "pending"}</span>
                <span>MemWal: {agentReview.persistence.memwalStatus ?? "pending"}</span>
                <span>Walrus: {agentReview.persistence.walrusStatus ?? "pending"}</span>
                <span>Manifest: {agentReview.persistence.manifestBlobId ? truncateValue(agentReview.persistence.manifestBlobId, 18) : "pending"}</span>
                <span>Artifact: {agentReview.persistence.artifactBlobId ? truncateValue(agentReview.persistence.artifactBlobId, 18) : "pending"}</span>
              </div>
              <div className="ide-memory-actions">
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={
                    memoryReload.status === "loading" ||
                    !agentReview.persistence.manifestBlobId ||
                    !agentReview.persistence.artifactBlobId
                  }
                  onClick={handleReloadWalrusMemory}
                >
                  {memoryReload.status === "loading" ? "Reloading..." : "Reload Walrus memory"}
                </button>
                <span>
                  {agentReview.persistence.manifestBlobId && agentReview.persistence.artifactBlobId
                    ? "Reads encrypted direct Walrus fallback artifacts and returns a safe summary."
                    : "Direct Walrus reload needs stored manifest and artifact blob IDs."}
                </span>
              </div>
              <div className={`ide-memory-result ${memoryReload.status}`}>
                <strong>
                  {memoryReload.status === "success"
                    ? "Memory reload proof"
                    : memoryReload.status === "error"
                      ? "Memory reload blocked"
                      : "Memory reload"}
                </strong>
                <p>{memoryReload.message}</p>
                {memoryReload.result && (
                  <div className="ide-memory-grid">
                    <span>Pack</span>
                    <code>{truncateValue(memoryReload.result.manifest.packId ?? "pending", 20)}</code>
                    <span>Network</span>
                    <code>{memoryReload.result.network}</code>
                    <span>Evidence refs</span>
                    <code>{memoryReload.result.manifest.evidenceRefCount}</code>
                    <span>Output hashes</span>
                    <code>{memoryReload.result.manifest.agentOutputHashCount}</code>
                    <span>Finding hashes</span>
                    <code>{memoryReload.result.manifest.findingHashCount}</code>
                    <span>Bundle docs/findings</span>
                    <code>{memoryReload.result.artifact.documentCount}/{memoryReload.result.artifact.findingCount}</code>
                  </div>
                )}
              </div>
              <p className="ide-section-note">
                This reload proves encrypted Walrus artifact availability and decryptability. It does not prove document truth or replace reviewer judgment.
              </p>
            </div>
          )}
          {bottomTab === "agent" && (
            <div className="ide-status-line">
              <span>{agentRun.message}</span>
              <span>Readable docs: {readableEvidenceCount}</span>
              <span>Reviewed docs: {agentReview.documents.length}</span>
              <span>Findings: {agentReview.findings.length}</span>
              <span>Action candidates: {agentRun.actionCandidates.length}</span>
              <span>Chain write: {agentReview.approval.chainWriteReady ? "ready after approval" : "not submitted"}</span>
            </div>
          )}
          {bottomTab === "privacy" && (
            <div className="ide-status-line">
              <span>{demoEngagement.id ? "Synthetic demo files sync through Supabase for web PoC review." : "Source files stay in browser memory."}</span>
              <span>Walrus receives encrypted bytes.</span>
              <span>Sui stores commitments and lifecycle objects, not raw evidence.</span>
            </div>
          )}
          {bottomTab === "raw" && (
            <pre className="ide-raw">{JSON.stringify(rawPayload, null, 2)}</pre>
          )}
        </div>
      </section>
    );
  };

  const renderAgentPanel = () => (
    <aside className="ide-agent-panel">
      <div className="ide-agent-header">
        <div>
          <span className="workspace-eyebrow">Agent</span>
          <h2>Context Panel</h2>
        </div>
        <span className={`ide-agent-state ${agentRun.status}`}>{agentRun.status}</span>
      </div>

      <div className="ide-agent-section">
        <div className="card-section-title">Active Context</div>
        <p>{selectedLocalDocument?.fileName ?? selectedRecord?.fileName ?? "Q2 AuditPack"}</p>
        <p className="ide-muted">Role: {role}. Agent proposes only; the wallet signs proof actions.</p>
      </div>

      <div className="ide-agent-section">
        <div className="card-section-title">Run</div>
        <label className="field-label" htmlFor="agent-instruction">
          Additional audit instruction
        </label>
        <textarea
          id="agent-instruction"
          className="field-textarea ide-agent-instruction"
          rows={4}
          value={agentInstruction}
          onChange={(event) => setAgentInstruction(event.target.value)}
          placeholder="e.g. Focus on revenue cutoff, missing approval evidence, and any reviewer caveats."
        />
        <button className="btn-primary full-width" type="button" disabled={agentRun.status === "running"} onClick={handleRunAgent}>
          {agentRun.status === "running" ? "Analyzing..." : "Run analysis"}
        </button>
        {renderSteps("agent")}
      </div>

      <div className="ide-agent-section">
        <div className="card-section-title">Output</div>
        <p>{agentRun.message}</p>
        <div className="ide-mini-grid">
          <span>Docs</span>
          <strong>{agentReview.documents.length || agentRun.documentsAnalyzed || 0}</strong>
          <span>Readiness</span>
          <strong>
            {agentReview.gapSummary.readinessScore !== undefined
              ? `${agentReview.gapSummary.readinessScore}/100`
              : agentRun.readinessScore !== undefined
                ? `${agentRun.readinessScore}/100`
                : "n/a"}
          </strong>
          <span>Findings</span>
          <strong>{agentReview.findings.length}</strong>
          <span>Memory</span>
          <strong>{agentRun.memoryStatus ?? "pending"}</strong>
        </div>
        {agentReview.approval.nextSteps.length > 0 && (
          <div className="agent-next-steps">
            {agentReview.approval.nextSteps.slice(0, 3).map((step) => (
              <p key={step}>{step}</p>
            ))}
          </div>
        )}
      </div>

      <div className="ide-agent-section">
        <div className="card-section-title">Approval Queue</div>
        {agentRun.actionCandidates.length > 0 ? (
          agentRun.actionCandidates.slice(0, 5).map((candidate, index) => {
            const key = getAgentActionCandidateKey(candidate);
            const logged = isAgentActionLogged(candidate);
            const signing = agentActionLog.status === "signing" && agentActionLog.activeKey === key;
            const hasPackObject = isSuiObjectId(candidate.packId ?? auditPack.id);

            return (
              <div key={`${candidate.outputHash}-${index}`} className="ide-action-candidate">
                <span>{candidate.actionType}</span>
                <small>
                  {[
                    candidate.targetKind,
                    candidate.targetId ? truncateValue(candidate.targetId, 16) : undefined,
                    candidate.evidenceId ? `evidence ${truncateValue(candidate.evidenceId, 14)}` : undefined,
                    candidate.findingId ? `finding ${candidate.findingId}` : undefined,
                  ].filter(Boolean).join(" / ") || "workspace action"}
                </small>
                <code>{truncateValue(candidate.outputHash, 18)}</code>
                <small>
                  {logged
                    ? "logged on Sui"
                    : !hasPackObject
                      ? "create AuditPack before logging"
                      : candidate.requiresHumanApproval
                        ? "prepared; human approval required"
                        : "prepared; approval status returned false"}
                </small>
                <button
                  className="btn-secondary full-width"
                  type="button"
                  disabled={signing || logged || !signerAddress || !auditorWalletMatches || !hasPackObject}
                  onClick={() => handleApproveAgentAction(candidate)}
                >
                  {signing ? "Signing..." : logged ? "Logged" : "Approve & log"}
                </button>
              </div>
            );
          })
        ) : (
          <p className="ide-muted">No action candidates yet. Run analysis after adding readable evidence to prepare hash-only AgentAction candidates.</p>
        )}
        <p className="ide-muted">
          {agentActionLog.status === "success"
            ? "Latest approved AgentAction was signed by the connected wallet and emitted as a Sui event."
            : agentActionLog.status === "error"
              ? agentActionLog.message
              : agentReview.approval.outputHashes.length > 0
                ? "Output hashes are ready. Approving logs only the hash/event metadata, never private agent text."
                : "AgentAction logging appears after a workspace analysis run prepares output hashes."}
        </p>
      </div>
    </aside>
  );

  return (
    <main className="app-container">
      <header className="topbar">
        <div className="topbar-left">
          <Image className="topbar-logo" src="/mascot.png" alt="Linow mascot" width={22} height={22} priority />
          <div className="topbar-brand-block">
            <span className="topbar-brand">Linow</span>
            <span className="topbar-badge">AUDIT IDE</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="ide-role-switcher" aria-label="Workspace role">
            {(["company", "auditor", "verifier"] as WorkspaceRole[]).map((item) => (
              <button
                key={item}
                type="button"
                className={role === item ? "active" : ""}
                onClick={() => setRole(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="topbar-status">
            <span className="status-dot" />
            <span>{signerAddress ? `Connected ${truncateValue(signerAddress, 14)}` : "Connect wallet for live Sui proofs"}</span>
          </div>
          <div className="topbar-wallet">{wallet.connectButton}</div>
        </div>
      </header>

      <div className={`ide-body${isCompactViewport ? " is-compact" : ""}${isSidebarOpen ? " sidebar-open" : " sidebar-collapsed"}`}>
        {isCompactViewport && isSidebarOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <nav className="workspace-rail" aria-label="Workspace rail">
          <button
            type="button"
            className={activeRailPanel === "explorer" ? "active" : ""}
            title="Explorer"
            aria-label="Explorer"
            onClick={() => {
              setActiveRailPanel("explorer");
              setActiveItemId("folder:evidence");
              setIsSidebarOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
          </button>
          <button
            type="button"
            className={activeRailPanel === "settings" ? "active" : ""}
            title="Settings"
            aria-label="Settings"
            onClick={() => {
              setActiveRailPanel("settings");
              setActiveItemId("settings");
              setIsSidebarOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.51 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.3.2.6.5.6 1h1a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
            </svg>
          </button>
        </nav>

        <aside className="workspace-sidebar">
          {activeRailPanel === "explorer" ? (
            <>
              <div className="sidebar-section">
                <div className="sidebar-section-label">Q2 AuditPack</div>

                <div className="sidebar-folder-group">
                  <button className={`tree-item folder${activeItemId === "folder:evidence" ? " active" : ""}`} type="button" onClick={() => setActiveItemId("folder:evidence")}>
                    <span>Evidence</span>
                    <small>{visibleLocalDocuments.length + registry.length}</small>
                  </button>
                  {visibleLocalDocuments.length + registry.length > 0 && (
                    <div className="tree-group">
                      {visibleLocalDocuments.map((document) => (
                        <button
                          key={document.id}
                          className={`tree-item${activeItemId === `local:${document.id}` ? " active" : ""}`}
                          type="button"
                          onClick={() => prepareLocalDocument(document)}
                        >
                          {renderStatusDot(document.status)}
                          <span>{document.fileName}</span>
                        </button>
                      ))}
                      {registry.map((record) => (
                        <button
                          key={record.id}
                          className={`tree-item${activeItemId === `record:${record.id}` ? " active" : ""}`}
                          type="button"
                          onClick={() => {
                            setActiveItemId(`record:${record.id}`);
                            setVerifyRecordId(record.id);
                            setAttestRecordId(record.id);
                          }}
                        >
                          {renderStatusDot(record.latestAttestation ? "attested-record" : "registered-record")}
                          <span>{record.fileName ?? truncateValue(record.id, 12)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sidebar-folder-group">
                  <button className={`tree-item folder${activeItemId === "folder:findings" ? " active" : ""}`} type="button" onClick={() => setActiveItemId("folder:findings")}>
                    <span>Findings</span>
                    <small>{agentRun.findings.length}</small>
                  </button>
                </div>

                <div className="sidebar-folder-group">
                  <button className={`tree-item folder${activeItemId === "folder:proof" ? " active" : ""}`} type="button" onClick={() => setActiveItemId("folder:proof")}>
                    <span>Proof</span>
                    <small>{proofSnapshot ? "1" : "0"}</small>
                  </button>
                </div>
              </div>

              <div className="sidebar-footer">
                <input
                  ref={addDocumentInputRef}
                  type="file"
                  multiple
                  className="visually-hidden"
                  onChange={(event) => {
                    handleAddDocuments(event.target.files);
                    event.target.value = "";
                  }}
                />
                <button className="btn-primary full-width" type="button" onClick={() => addDocumentInputRef.current?.click()}>
                  Add document
                </button>
                <div className="guardrails-block">
                  <div className="guardrails-title">Status colors</div>
                  <ul className="guardrails-list">
                    <li>Gray: local only.</li>
                    <li>Blue: registered on Sui.</li>
                    <li>Yellow: pending human approval.</li>
                    <li>Green: attested by reviewer.</li>
                    <li>Red: mismatch or blocked.</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Settings</div>
              <button className="tree-item active" type="button" onClick={() => setActiveItemId("settings")}>
                <span>Runtime</span>
              </button>
            </div>
          )}
        </aside>

        <section className="ide-workspace">
          <div className="ide-main-content">{renderMainContent()}</div>
          {renderBottomPanel()}
        </section>

        {renderAgentPanel()}
      </div>
    </main>
  );
}
