"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  createAttestationFlow,
  createAuditPackFlow,
  createBatchRegisterEvidenceFlow,
  createRegisterEvidenceFlow,
  createVerifyEvidenceFlow,
  encryptJson,
  generateEncryptionKey,
  serializeEncryptedPayload,
  type AssertionId,
  type AttestationType,
  type ExecuteTransactionBlockInput,
  type JsonValue,
  type SourceConfidenceLevel,
  type SuiObjectReadOptions,
} from "@linow/sdk";
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
  updatedAt: string;
}

interface AgentFindingSummary {
  id: string;
  title: string;
  severity: string;
  status: "draft" | "approved" | "logged" | "blocked";
}

interface AgentActionCandidate {
  actionType: string;
  outputHash: string;
  targetKind?: string;
  targetId?: string;
  requiresHumanApproval: boolean;
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

  const updateLocalDocumentDraft = (documentId: string, patch: Partial<Pick<LocalDocument, "documentType" | "source" | "description" | "assertions">>) => {
    setLocalDocuments((prev) =>
      prev.map((document) => document.id === documentId ? { ...document, ...patch } : document),
    );
  };

  const handleSaveDraft = (documentId: string) => {
    updateLocalDocumentDraft(documentId, {
      documentType: regDocType,
      source: regSource,
      description: regDesc,
      assertions: regAssertions,
    });
    setDraftSaveMessage("Draft saved for batch registration.");
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
        profile: "sui_overflow_demo",
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
      const persistence = isRecord(root.persistence_result) ? root.persistence_result : {};
      const memwal = isRecord(persistence.memwal) ? persistence.memwal : {};
      const walrus = isRecord(persistence.walrus) ? persistence.walrus : {};
      const sui = isRecord(persistence.sui) ? persistence.sui : {};
      const reviewBundle = isRecord(root.review_bundle) ? root.review_bundle : {};

      const actionCandidates = readArray(sui.action_candidates).map((candidate) => {
        const row = isRecord(candidate) ? candidate : {};
        return {
          actionType: readString(row.action_type) ?? "agent_action",
          outputHash: readString(row.agent_output_hash) ?? "hash unavailable",
          targetKind: readString(row.target_kind),
          targetId: readString(row.target_id),
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
          gap_analysis: root.gap_analysis,
          audit_pack_summary: root.audit_pack_summary,
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
            disabled={role !== "company" || isRegistering || !signerAddress || regAssertions.length === 0}
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
              disabled={role === "company" || isAttesting || !signerAddress || !selectedRecordVerified}
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
      <div className="ide-folder-grid">
        {agentRun.findings.length > 0 ? (
          agentRun.findings.map((finding) => (
            <div key={finding.id} className="ide-finding-row">
              {renderStatusDot(finding.status === "blocked" ? "tampered" : finding.status === "approved" ? "attested-record" : "registering")}
              <div>
                <strong>{finding.title}</strong>
                <span>{finding.severity} / {finding.status}</span>
              </div>
            </div>
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
            </div>
          )}
          {bottomTab === "chain" && (
            <div className="ide-status-line">
              <span>Package {truncateValue(PACKAGE_ID, 28)}</span>
              <span>Pack {auditPack.id ? truncateValue(auditPack.id, 20) : "not created"}</span>
              <span>Pack evidence links: {registry.filter((record) => record.auditPackId === auditPack.id).length}</span>
              <span>Tx {proofSnapshot?.txDigest ? truncateValue(proofSnapshot.txDigest, 24) : "pending"}</span>
              <span>Attestation {proofSnapshot?.attestationId ? truncateValue(proofSnapshot.attestationId, 18) : "pending"}</span>
            </div>
          )}
          {bottomTab === "memory" && (
            <div className="ide-status-line">
              <span>{agentRun.memoryStatus ?? "No memory write has been observed in this workspace session."}</span>
              <span>AgentAction event proof return is not fully wired in SDK yet.</span>
            </div>
          )}
          {bottomTab === "agent" && (
            <div className="ide-status-line">
              <span>{agentRun.message}</span>
              <span>Readable docs: {readableEvidenceCount}</span>
              <span>Action candidates: {agentRun.actionCandidates.length}</span>
            </div>
          )}
          {bottomTab === "privacy" && (
            <div className="ide-status-line">
              <span>Source files stay in browser memory.</span>
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
          <strong>{agentRun.documentsAnalyzed ?? 0}</strong>
          <span>Readiness</span>
          <strong>{agentRun.readinessScore ?? "n/a"}</strong>
          <span>Memory</span>
          <strong>{agentRun.memoryStatus ?? "pending"}</strong>
        </div>
      </div>

      <div className="ide-agent-section">
        <div className="card-section-title">Approval Queue</div>
        {agentRun.actionCandidates.length > 0 ? (
          agentRun.actionCandidates.slice(0, 5).map((candidate, index) => (
            <div key={`${candidate.outputHash}-${index}`} className="ide-action-candidate">
              <span>{candidate.actionType}</span>
              <code>{truncateValue(candidate.outputHash, 18)}</code>
              <small>human approval required</small>
            </div>
          ))
        ) : (
          <p className="ide-muted">No action candidates yet. AgentAction submission is intentionally not faked; SDK proof return needs hardening before this panel can show event details.</p>
        )}
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
