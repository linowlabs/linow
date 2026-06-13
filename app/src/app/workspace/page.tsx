"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  createAttestationFlow,
  createRegisterEvidenceFlow,
  createVerifyEvidenceFlow,
  generateEncryptionKey,
  type AssertionId,
  type AttestationType,
  type ExecuteTransactionBlockInput,
  type JsonValue,
  type SourceConfidenceLevel,
  type SuiObjectReadOptions,
} from "@linow/sdk";
import { useWalletBridge } from "@/lib/wallet-context";

type RecordStatus = "Registered" | "Superseded";
type ViewId = "register" | "verify" | "attest" | "records";

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
  latestAttestation?: AttestationSummary;
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
  evidenceId?: string;
  txDigest?: string;
  packageId?: string;
  commitment?: string;
  blobReference?: string;
  attestationId?: string;
  verificationStatus?: "success" | "tampered";
  checkedFileLabel?: string;
  updatedAt: string;
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
  "0x6b800d28cc87423198e6b35516885f9c6155a680424ac28aa47f59eabd2994d5";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const VIEWS: {
  id: ViewId;
  label: string;
  eyebrow: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "register",
    label: "Upload Evidence",
    eyebrow: "Company Portal",
    title: "Register Audit Evidence",
    desc: "Upload a document, hash it locally, encrypt it client-side, and prepare proof outputs for the chain flow.",
    icon: (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    id: "verify",
    label: "Verify Evidence",
    eyebrow: "Verification Engine",
    title: "Verify Evidence & Detect Tampering",
    desc: "Compare a supplied file against the recorded commitment and surface tamper results clearly.",
    icon: (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    id: "attest",
    label: "Create Attestation",
    eyebrow: "Auditor Workspace",
    title: "Review & Attest Evidence",
    desc: "Prepare a reviewer action after integrity checks are complete and record a separate attestation result.",
    icon: (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    id: "records",
    label: "Evidence Records",
    eyebrow: "Registry",
    title: "Evidence Registry",
    desc: "Review the in-session evidence records and move directly into verification or attestation flows.",
    icon: (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
];

function truncateValue(value: string, visible = 18): string {
  return value.length > visible ? `${value.substring(0, visible)}...` : value;
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toSourceLabel(source: string): string {
  const trimmed = source.trim();

  if (!trimmed) {
    return "Company Upload (L2)";
  }

  return trimmed.includes("(L") ? trimmed : `${trimmed} (L2)`;
}

function toAssertionId(assertion: string): AssertionId {
  const index = ISA_ASSERTIONS.indexOf(assertion);

  if (index < 0) {
    throw new Error(`Unsupported ISA assertion: ${assertion}`);
  }

  return index as AssertionId;
}

function toAttestationType(action: string): AttestationType {
  if (action === "IssueFlagged") {
    return "rejected";
  }

  if (action === "EvidenceReviewed") {
    return "evidenceVerified";
  }

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

export default function Home() {
  const wallet = useWalletBridge();
  const [activeView, setActiveView] = useState<ViewId>("register");
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [registry, setRegistry] = useState<EvidenceRecord[]>([]);

  const [regFile, setRegFile] = useState<File | null>(null);
  const [regDocType, setRegDocType] = useState("Bank Statement");
  const [regSource, setRegSource] = useState("Company Upload (L2)");
  const [regDesc, setRegDesc] = useState("");
  const [regAssertions, setRegAssertions] = useState<string[]>(["Existence"]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);

  const [verifyRecordId, setVerifyRecordId] = useState(registry[0]?.id || "");
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

  const [attestRecordId, setAttestRecordId] = useState(registry[1]?.id || "");
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
    type: ViewId;
    steps: ProgressStep[];
  } | null>(null);
  const [proofSnapshot, setProofSnapshot] = useState<ProofArtifactsSnapshot | null>(null);
  const signerAddress = wallet.address ?? "";

  const signTransaction = wallet.signTransaction;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 960px)");

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

  const handleSelectView = (viewId: ViewId) => {
    setActiveView(viewId);

    if (isCompactViewport) {
      setIsSidebarOpen(false);
    }
  };

  const handleToggleAssertion = (assertion: string) => {
    setRegAssertions((prev) =>
      prev.includes(assertion)
        ? prev.filter((item) => item !== assertion)
        : [...prev, assertion],
    );
  };

  const resetRegisterDraft = () => {
    setRegFile(null);
    setRegDocType("Bank Statement");
    setRegSource("Company Upload (L2)");
    setRegDesc("");
    setRegAssertions(["Existence"]);
    setRegisterError(null);
    setRegisterResult(null);
    setOperationProgress((prev) => (prev?.type === "register" ? null : prev));
  };

  const handleRegister = async () => {
    if (isRegistering) return;
    if (!signerAddress) {
      setRegisterError("Connect a Sui wallet before registering evidence.");
      return;
    }
    if (!regFile) {
      setRegisterError("Select a document before preparing the registration flow.");
      return;
    }
    if (regAssertions.length === 0) {
      setRegisterError("Select at least one ISA assertion for this evidence item.");
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    setRegisterResult(null);

    const sourceLabel = toSourceLabel(regSource);
    const metadata = {
      fileName: regFile.name,
      mediaType: regFile.type || "application/octet-stream",
      documentType: regDocType,
      description: regDesc || undefined,
      claimedSource: sourceLabel,
    };

    const steps: ProgressStep[] = [
      { label: "Computing SHA-256 hash", status: "pending" },
      { label: "Encrypting file and metadata", status: "pending" },
      { label: "Uploading encrypted blob to Walrus", status: "pending" },
      { label: "Signing and submitting Sui registration", status: "pending" },
    ];

    try {
      steps[0].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
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

      steps[0] = {
        ...steps[0],
        status: "done",
        detail: "Prepared locally",
      };

      steps[1].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      steps[1] = {
        ...steps[1],
        status: "done",
        detail: "AES-GCM ready",
      };

      steps[2].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      const result = await registerEvidence({
        content: regFile,
        metadata,
        assertions: regAssertions.map(toAssertionId),
        signerAddress,
      });
      const commitment = result.evidence.commitment;
      const blobId = result.evidence.blobId ?? result.evidence.proof?.walrusBlobId ?? "n/a";
      const objectId = result.evidence.id;
      const txDigest = result.transactionDigest ?? result.evidence.proof?.transactionDigest ?? "n/a";
      const registeredAt = result.evidence.registeredAt ?? new Date().toISOString();

      steps[2] = {
        ...steps[2],
        status: "done",
        detail: truncateValue(blobId, 22),
      };

      steps[3].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      steps[3] = {
        ...steps[3],
        status: "done",
        detail: txDigest,
      };
      setOperationProgress({ type: "register", steps: [...steps] });

      const registeredAtLabel = registeredAt.replace("T", " ").substring(0, 16);
      const newRecord: EvidenceRecord = {
        id: objectId,
        date: registeredAtLabel,
        type: regDocType,
        source: sourceLabel,
        commitment,
        status: "Registered",
        blobId,
        assertions: regAssertions,
        reviewer: "n/a",
        notes: regDesc || "No description provided.",
        fileName: regFile.name,
        fileSize: formatMegabytes(regFile.size),
        sourceFile: regFile,
      };

      setRegistry((prev) => [
        newRecord,
        ...prev,
      ]);
      setVerifyRecordId(objectId);
      setAttestRecordId(objectId);

      setRegisterResult({
        objectId,
        txDigest,
        blobId,
        commitment,
        encryptedFileSize: `${result.artifacts.encryptedFile.ciphertext.length} B`,
        encryptedMetadataSize: `${result.artifacts.encryptedMetadata.ciphertext.length} B`,
        sourceConfidence: "L2 - Company Upload",
      });
      setProofSnapshot({
        evidenceId: objectId,
        txDigest,
        packageId: PACKAGE_ID,
        commitment,
        blobReference: blobId,
        updatedAt: registeredAtLabel,
      });
    } catch (error) {
      const message = getErrorMessage(error, "Registration failed while calling live infrastructure.");
      setRegisterError(message);
      setOperationProgress(null);
    } finally {
      setIsRegistering(false);
    }
  };

  const resetVerifyDraft = () => {
    setVerifyFile(null);
    setVerificationResult({ status: "idle", message: "" });
    setOperationProgress((prev) => (prev?.type === "verify" ? null : prev));
  };

  const resetAttestDraft = () => {
    setAttestNotes("");
    setAttestType("HashConfirmed");
    setAttestError(null);
    setAttestResult(null);
    setOperationProgress((prev) => (prev?.type === "attest" ? null : prev));
  };

  const handleVerify = async () => {
    if (!verifyRecordId || isVerifying) return;

    setIsVerifying(true);
    setVerificationResult({ status: "idle", message: "" });

    const record = registry.find((item) => item.id === verifyRecordId);
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

      steps[0] = {
        ...steps[0],
        status: "done",
        detail: truncateValue(record.id, 14),
      };

      steps[1].status = "running";
      setOperationProgress({ type: "verify", steps: [...steps] });
      const checkedFileLabel = sourceContent.name || record.fileName || "Evidence file";
      steps[1] = {
        ...steps[1],
        status: "done",
        detail: checkedFileLabel,
      };

      steps[2].status = "running";
      setOperationProgress({ type: "verify", steps: [...steps] });
      const result = await verifyEvidence({
        evidenceId: verifyRecordId,
        content: sourceContent,
      });
      const checkedAt = result.checkedAt.replace("T", " ").substring(0, 16);

      if (result.isMatch) {
        steps[2] = {
          ...steps[2],
          status: "done",
          detail: "Hash matches",
        };
        setOperationProgress({ type: "verify", steps: [...steps] });
        setVerificationResult({
          status: "success",
          message:
            "Hash matches the recorded Sui commitment. The supplied file is consistent with the evidence record.",
          computedHash: result.actualCommitment,
          expectedHash: result.expectedCommitment,
          checkedFileLabel,
        });
        setLastVerificationSession({
          evidenceId: verifyRecordId,
          status: "success",
          checkedFileLabel,
          checkedAt,
        });
        setProofSnapshot((prev) => ({
          evidenceId: verifyRecordId,
          txDigest: prev?.txDigest,
          packageId: PACKAGE_ID,
          commitment: result.expectedCommitment,
          blobReference: result.evidence?.blobId ?? record.blobId,
          attestationId: prev?.attestationId,
          verificationStatus: "success",
          checkedFileLabel,
          updatedAt: checkedAt,
        }));
        setAttestRecordId(verifyRecordId);
      } else {
        const checkedAt = result.checkedAt.replace("T", " ").substring(0, 16);
        steps[2] = {
          ...steps[2],
          status: "error",
          detail: "Tamper detected",
        };
        setOperationProgress({ type: "verify", steps: [...steps] });
        setVerificationResult({
          status: "tampered",
          message:
            "Tamper detected. The supplied file does not match the recorded Sui commitment for this evidence item.",
          computedHash: result.actualCommitment,
          expectedHash: result.expectedCommitment,
          checkedFileLabel,
        });
        setLastVerificationSession({
          evidenceId: verifyRecordId,
          status: "tampered",
          checkedFileLabel,
          checkedAt,
        });
        setProofSnapshot((prev) => ({
          evidenceId: verifyRecordId,
          txDigest: prev?.txDigest,
          packageId: PACKAGE_ID,
          commitment: result.expectedCommitment,
          blobReference: result.evidence?.blobId ?? record.blobId,
          attestationId: prev?.attestationId,
          verificationStatus: "tampered",
          checkedFileLabel,
          updatedAt: checkedAt,
        }));
      }
    } catch (error) {
      steps[2] = {
        ...steps[2],
        status: "error",
        detail: "Verification failed",
      };
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

  const handleAttest = async () => {
    if (!attestRecordId || isAttesting) return;
    if (!signerAddress) {
      setAttestError("Connect a Sui wallet before creating an attestation.");
      return;
    }
    if (
      !lastVerificationSession ||
      lastVerificationSession.evidenceId !== attestRecordId ||
      lastVerificationSession.status !== "success"
    ) {
      return;
    }

    setIsAttesting(true);
    setAttestError(null);
    setAttestResult(null);

    const steps: ProgressStep[] = [
      { label: "Preparing reviewer statement", status: "pending" },
      { label: "Preparing attestation proof", status: "pending" },
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
      steps[0] = {
        ...steps[0],
        status: "done",
        detail: toAttestationLabel(attestationType),
      };

      steps[1].status = "running";
      setOperationProgress({ type: "attest", steps: [...steps] });
      const result = await createAttestation({
        evidenceId: attestRecordId,
        reviewerAddress: signerAddress,
        attestationType,
        sourceConfidence: "L3" satisfies SourceConfidenceLevel,
        note: attestNotes || "Attested via Linow Workspace.",
      });
      const attestationId = result.attestation.id;
      const txDigest = result.attestation.transactionDigest ?? "n/a";
      const createdAt = result.attestation.createdAt.replace("T", " ").substring(0, 16);

      steps[1] = {
        ...steps[1],
        status: "done",
        detail: txDigest,
      };
      setOperationProgress({ type: "attest", steps: [...steps] });

      setRegistry((prev) =>
        prev.map((record) =>
          record.id === attestRecordId
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
        evidenceId: attestRecordId,
        reviewer: signerAddress,
        action: toAttestationLabel(attestationType),
        createdAt,
      });
      const attestedRecord = registry.find((record) => record.id === attestRecordId);
      setProofSnapshot((prev) => ({
        evidenceId: attestRecordId,
        txDigest,
        packageId: PACKAGE_ID,
        commitment: attestedRecord?.commitment || prev?.commitment,
        blobReference: attestedRecord?.blobId || prev?.blobReference,
        attestationId,
        verificationStatus: prev?.verificationStatus,
        checkedFileLabel: prev?.checkedFileLabel,
        updatedAt: createdAt,
      }));
    } catch (error) {
      setAttestError(getErrorMessage(error, "Attestation failed while calling live infrastructure."));
      setOperationProgress(null);
    } finally {
      setIsAttesting(false);
    }
  };

  const renderSteps = (viewType: ViewId) => {
    if (!operationProgress || operationProgress.type !== viewType) return null;

    return (
      <div className="progress-card">
        <div className="progress-title">Operation Progress</div>
        <div className="progress-steps">
          {operationProgress.steps.map((step, index) => (
            <div key={`${step.label}-${index}`} className="step">
              <div className={`step-icon ${step.status}`}>
                {step.status === "done" && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {step.status === "running" && <div className="spinner" />}
                {step.status === "pending" && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                )}
                {step.status === "error" && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <span className="step-label">{step.label}</span>
              {step.detail && <span className="step-detail">{step.detail}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const currentView = VIEWS.find((view) => view.id === activeView) ?? VIEWS[0];
  const selectedRecordVerified =
    lastVerificationSession?.evidenceId === attestRecordId &&
    lastVerificationSession.status === "success";
  const selectedRecordTampered =
    lastVerificationSession?.evidenceId === attestRecordId &&
    lastVerificationSession.status === "tampered";
  const showProofSnapshot = proofSnapshot && activeView !== "records";

  return (
    <main className="app-container">
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={isSidebarOpen ? "Collapse navigation" : "Expand navigation"}
            aria-expanded={isSidebarOpen}
            suppressHydrationWarning
            onClick={() => setIsSidebarOpen((prev) => !prev)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="topbar-logo-wrap">
            <Image className="topbar-logo" src="/mascot.png" alt="Linow mascot" width={22} height={22} priority />
          </div>
          <div className="topbar-brand-block">
            <span className="topbar-brand">Linow</span>
            <span className="topbar-badge">TESTNET v0.1</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-status">
            <span className="status-dot" />
            <span>{signerAddress ? `Connected ${truncateValue(signerAddress, 14)}` : "Connect wallet for live Sui proofs"}</span>
          </div>
          <div className="topbar-divider" />
          <div className="topbar-encryption">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>AES-256-GCM</span>
          </div>
          <div className="topbar-wallet">{wallet.connectButton}</div>
        </div>
      </header>

      <div
        className={`app-body${isCompactViewport ? " is-compact" : ""}${isSidebarOpen ? " sidebar-open" : " sidebar-collapsed"}`}
      >
        {isCompactViewport && isSidebarOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close navigation"
            suppressHydrationWarning
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Evidence Flows</div>
            <nav className="sidebar-nav">
              {VIEWS.map((view) => (
                <div
                  key={view.id}
                  className={`nav-item${activeView === view.id ? " active" : ""}`}
                  onClick={() => handleSelectView(view.id)}
                >
                  {view.icon}
                  <span className="nav-text">{view.label}</span>
                  {view.id === "records" && <span className="nav-count">{registry.length}</span>}
                </div>
              ))}
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="guardrails-block">
              <div className="guardrails-title">Guardrails</div>
              <ul className="guardrails-list">
                <li>Commitments come from SHA-256 of the plaintext file.</li>
                <li>Sui stores commitments and attestations, not raw evidence.</li>
                <li>Walrus blobs must stay encrypted before storage.</li>
                <li>Live proof outputs come from the SDK, Tatum, Walrus, and Sui testnet.</li>
              </ul>
            </div>
          </div>
        </aside>

        <section className="workspace">
          <div className="workspace-header">
            <div className="workspace-eyebrow">{currentView.eyebrow}</div>
            <h1 className="workspace-title">{currentView.title}</h1>
            <p className="workspace-desc">{currentView.desc}</p>
          </div>

          <div className="workspace-content">
            {showProofSnapshot && proofSnapshot && (
              <div className="result-card success">
                <div className="result-header">
                  <div className="result-heading">
                    <svg className="result-icon success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="result-title success">Proof Output Surface</span>
                  </div>
                  <button
                    className="result-dismiss"
                    type="button"
                    suppressHydrationWarning
                    aria-label="Dismiss proof output"
                    onClick={() => setProofSnapshot(null)}
                  >
                    x
                  </button>
                </div>
                <p className="result-message">
                  Judge-facing artifacts from the latest live SDK action.
                </p>
                <div className="proof-grid">
                  <div className="proof-row">
                    <span className="proof-label">Evidence ID</span>
                    <span className="proof-value">{truncateValue(proofSnapshot.evidenceId || "n/a", 28)}</span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-label">Tx Digest</span>
                    <span className="proof-value">{proofSnapshot.txDigest || "n/a"}</span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-label">Package ID</span>
                    <span className="proof-value">{truncateValue(proofSnapshot.packageId || "n/a", 28)}</span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-label">Commitment</span>
                    <span className="proof-value">{truncateValue(proofSnapshot.commitment || "n/a", 28)}</span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-label">Blob Reference</span>
                    <span className="proof-value">{truncateValue(proofSnapshot.blobReference || "n/a", 28)}</span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-label">Attestation ID</span>
                    <span className="proof-value">{truncateValue(proofSnapshot.attestationId || "pending", 28)}</span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-label">Verification</span>
                    <span className={`proof-value ${proofSnapshot.verificationStatus === "tampered" ? "error" : "success"}`}>
                      {proofSnapshot.verificationStatus || "pending"}
                    </span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-label">Updated At</span>
                    <span className="proof-value">{proofSnapshot.updatedAt}</span>
                  </div>
                </div>
              </div>
            )}
            {activeView === "register" && (
              <>
                <div className="card">
                  <div className="card-section-title">Prepare Evidence Registration</div>
                  <div className="form-grid">
                    <div className="field">
                      <label className="field-label">Select File</label>
                      <div className={`file-upload${regFile ? " has-file" : ""}`}>
                        <svg className="file-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div className="file-upload-text">
                          <div className="file-upload-name">
                            {regFile ? regFile.name : "Click to select document"}
                          </div>
                          <div className="file-upload-hint">
                            {regFile
                              ? `${(regFile.size / 1024).toFixed(1)} KB`
                              : "Supports PDF, CSV, PNG, DOCX"}
                          </div>
                        </div>
                        <input
                          type="file"
                          className="file-upload-input"
                          suppressHydrationWarning
                          onChange={(event) => {
                            if (event.target.files?.[0]) {
                              setRegFile(event.target.files[0]);
                              setRegisterError(null);
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-label">Document Type</label>
                      <select
                        className="field-select"
                        value={regDocType}
                        suppressHydrationWarning
                        onChange={(event) => setRegDocType(event.target.value)}
                      >
                        <option>Bank Statement</option>
                        <option>Vendor Contract</option>
                        <option>Sales Invoice</option>
                        <option>ERP Ledger Export</option>
                        <option>Board Resolution</option>
                      </select>

                      <label className="field-label" style={{ marginTop: "0.75rem" }}>
                        Claimed Source
                      </label>
                      <input
                        type="text"
                        className="field-input"
                        value={regSource}
                        suppressHydrationWarning
                        onChange={(event) => setRegSource(event.target.value)}
                        placeholder="e.g. Company Upload (L2)"
                      />
                    </div>

                    <div className="field form-full">
                      <label className="field-label">Description / Audit Objective</label>
                      <textarea
                        className="field-textarea"
                        rows={2}
                        value={regDesc}
                        suppressHydrationWarning
                        onChange={(event) => setRegDesc(event.target.value)}
                        placeholder="e.g. Verification of Q2 bank reconciliation to support existence and accuracy."
                      />
                    </div>

                    <div className="field form-full">
                      <label className="field-label">ISA Assertions Covered</label>
                      <div className="assertions-grid">
                        {ISA_ASSERTIONS.map((assertion) => (
                          <div
                            key={assertion}
                            className={`assertion-chip${regAssertions.includes(assertion) ? " selected" : ""}`}
                            onClick={() => handleToggleAssertion(assertion)}
                          >
                            {assertion}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="btn-actions">
                    <button
                      className="btn-primary"
                      disabled={isRegistering || !signerAddress || !regFile || regAssertions.length === 0}
                      suppressHydrationWarning
                      onClick={handleRegister}
                    >
                      {isRegistering ? (
                        <>
                          <span className="spinner" />
                          <span>Preparing Proof...</span>
                        </>
                      ) : (
                        "Upload & Register Evidence"
                      )}
                    </button>
                    <button className="btn-secondary" suppressHydrationWarning onClick={resetRegisterDraft}>
                      Clear
                    </button>
                  </div>
                </div>

                {registerError && (
                  <div className="result-card error">
                    <div className="result-header">
                      <svg className="result-icon error" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="result-title error">Registration Blocked</span>
                    </div>
                    <p className="result-message">{registerError}</p>
                  </div>
                )}

                {renderSteps("register")}

                {registerResult && (
                  <div className="result-card success">
                    <div className="result-header">
                      <svg className="result-icon success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="result-title success">Registration Flow Prepared</span>
                    </div>
                    <p className="result-message">
                      File hashing, encryption, Walrus storage, and Sui registration completed through the live SDK flow.
                    </p>
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
                        <span className="proof-label">Package ID</span>
                        <span className="proof-value">{truncateValue(PACKAGE_ID, 28)}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Walrus Blob</span>
                        <span className="proof-value">{truncateValue(registerResult.blobId, 28)}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Commitment</span>
                        <span className="proof-value">{truncateValue(registerResult.commitment, 28)}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Encrypted File</span>
                        <span className="proof-value">{registerResult.encryptedFileSize}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Encrypted Metadata</span>
                        <span className="proof-value">{registerResult.encryptedMetadataSize}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Source Confidence</span>
                        <span className="proof-value">{registerResult.sourceConfidence}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeView === "verify" && (
              <>
                <div className="card">
                  <div className="card-section-title">Verify Evidence Integrity</div>
                  <div className="form-grid">
                    <div className="field">
                      <label className="field-label">Select Evidence Record</label>
                      <select
                        className="field-select"
                        value={verifyRecordId}
                        suppressHydrationWarning
                        onChange={(event) => setVerifyRecordId(event.target.value)}
                      >
                        <option value="">-- Choose registered record --</option>
                        {registry.map((record) => (
                          <option key={record.id} value={record.id}>
                            {record.type} - {truncateValue(record.id, 10)} ({record.date})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="field-label">Verification File</label>
                      <div className={`file-upload${verifyFile ? " has-file" : ""}`}>
                        <svg className="file-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="file-upload-text">
                          <div className="file-upload-name">
                            {verifyFile ? verifyFile.name : "Click to load comparison file"}
                          </div>
                          <div className="file-upload-hint">
                            {verifyFile
                              ? `${(verifyFile.size / 1024).toFixed(1)} KB`
                              : "Optional for shell verification"}
                          </div>
                        </div>
                        <input
                          type="file"
                          className="file-upload-input"
                          suppressHydrationWarning
                          onChange={(event) => {
                            if (event.target.files?.[0]) {
                              setVerifyFile(event.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="tamper-toggle">
                    <div className="tamper-info">
                      <div className="tamper-title">File comparison</div>
                      <div className="tamper-desc">
                        Verify the selected file against the recorded commitment. Use the original CSV to confirm a match, or upload your edited copy to confirm tamper detection.
                      </div>
                    </div>
                  </div>

                  <div className="btn-actions">
                    <button
                      className="btn-primary"
                      disabled={isVerifying || !verifyRecordId}
                      suppressHydrationWarning
                      onClick={handleVerify}
                    >
                      {isVerifying ? (
                        <>
                          <span className="spinner" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        "Verify"
                      )}
                    </button>
                    <button className="btn-secondary" suppressHydrationWarning onClick={resetVerifyDraft}>
                      Clear
                    </button>
                  </div>
                </div>

                {renderSteps("verify")}

                {verificationResult.status !== "idle" && (
                  <div className={`result-card ${verificationResult.status === "success" ? "success" : "error"}`}>
                    <div className="result-header">
                      {verificationResult.status === "success" ? (
                        <svg className="result-icon success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="result-icon error" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <span className={`result-title ${verificationResult.status === "success" ? "success" : "error"}`}>
                        {verificationResult.status === "success" ? "Hash Matches" : "Tamper Detected"}
                      </span>
                    </div>
                    <p className="result-message">{verificationResult.message}</p>
                    <div className="proof-grid">
                      <div className="proof-row">
                        <span className="proof-label">Checked File</span>
                        <span className="proof-value">
                          {verificationResult.checkedFileLabel || "Shell sample"}
                        </span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Recorded Commitment</span>
                        <span className="proof-value">{truncateValue(verificationResult.expectedHash || "", 28)}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Computed Hash</span>
                        <span className={`proof-value ${verificationResult.status === "success" ? "success" : "error"}`}>
                          {truncateValue(verificationResult.computedHash || "", 28)}
                        </span>
                      </div>
                    </div>
                    {verificationResult.status === "success" && (
                      <div className="btn-actions">
                        <button
                          className="btn-secondary"
                          suppressHydrationWarning
                          onClick={() => {
                            setAttestRecordId(verifyRecordId);
                            setAttestResult(null);
                            setOperationProgress(null);
                            setActiveView("attest");
                          }}
                        >
                          Continue to Attestation
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeView === "attest" && (
              <>
                <div className="card">
                  <div className="card-section-title">Prepare Reviewer Attestation</div>
                  <div className="tamper-toggle">
                    <div className="tamper-info">
                      <div className="tamper-title">Verification Prerequisite</div>
                      <div className="tamper-desc">
                        {selectedRecordVerified
                          ? `Ready to attest. ${lastVerificationSession?.checkedFileLabel || "Selected file"} matched the recorded commitment at ${lastVerificationSession?.checkedAt}.`
                          : selectedRecordTampered
                            ? "Attestation is blocked because the latest verification for this record detected tampering."
                            : "Run a successful verification for this evidence item before creating a reviewer attestation."}
                      </div>
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label className="field-label">Target Evidence Record</label>
                      <select
                        className="field-select"
                        value={attestRecordId}
                        suppressHydrationWarning
                        onChange={(event) => setAttestRecordId(event.target.value)}
                      >
                        <option value="">-- Choose record to attest --</option>
                        {registry.map((record) => (
                          <option key={record.id} value={record.id}>
                            {record.type} - {truncateValue(record.id, 10)} ({record.latestAttestation ? "Attestation on file" : record.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="field-label">Reviewer Wallet Address</label>
                      <div className="field-input mono field-display">
                        {signerAddress ? truncateValue(signerAddress, 34) : "Connect your wallet"}
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-label">Attestation Action</label>
                      <select
                        className="field-select"
                        value={attestType}
                        suppressHydrationWarning
                        onChange={(event) => setAttestType(event.target.value)}
                      >
                        <option value="HashConfirmed">Hash confirmed</option>
                        <option value="EvidenceReviewed">Evidence reviewed</option>
                        <option value="IssueFlagged">Issue flagged</option>
                      </select>
                    </div>

                    <div className="field">
                      <label className="field-label">Source Confidence</label>
                      <div className="field-input mono field-display" suppressHydrationWarning>
                        L3 - Reviewer Wallet Attested
                      </div>
                    </div>

                    <div className="field form-full">
                      <label className="field-label">Reviewer Notes</label>
                      <textarea
                        className="field-textarea"
                        rows={3}
                        value={attestNotes}
                        suppressHydrationWarning
                        onChange={(event) => setAttestNotes(event.target.value)}
                        placeholder="Optional reviewer note or scope limitation."
                      />
                    </div>
                  </div>

                  <div className="btn-actions">
                    <button
                      className="btn-primary"
                      disabled={isAttesting || !signerAddress || !attestRecordId || !selectedRecordVerified}
                      suppressHydrationWarning
                      onClick={handleAttest}
                    >
                      {isAttesting ? (
                        <>
                          <span className="spinner" />
                          <span>Preparing...</span>
                        </>
                      ) : (
                        "Review and Sign"
                      )}
                    </button>
                    <button
                      className="btn-secondary"
                      suppressHydrationWarning
                      onClick={resetAttestDraft}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {attestError && (
                  <div className="result-card error">
                    <div className="result-header">
                      <svg className="result-icon error" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="result-title error">Attestation Blocked</span>
                    </div>
                    <p className="result-message">{attestError}</p>
                  </div>
                )}

                {renderSteps("attest")}

                {attestResult && (
                  <div className="result-card success">
                    <div className="result-header">
                      <svg className="result-icon success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="result-title success">Attestation Prepared</span>
                    </div>
                    <p className="result-message">
                      Reviewer action captured in the shell and ready to map to a live attestation object later.
                    </p>
                    <div className="proof-grid">
                      <div className="proof-row">
                        <span className="proof-label">Evidence ID</span>
                        <span className="proof-value">{truncateValue(attestResult.evidenceId, 28)}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Attestation ID</span>
                        <span className="proof-value">{truncateValue(attestResult.attestationId, 28)}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Tx Digest</span>
                        <span className="proof-value">{attestResult.txDigest}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Package ID</span>
                        <span className="proof-value">{truncateValue(PACKAGE_ID, 28)}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Reviewer</span>
                        <span className="proof-value">{truncateValue(attestResult.reviewer, 28)}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Action</span>
                        <span className="proof-value">{attestResult.action}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Created At</span>
                        <span className="proof-value">{attestResult.createdAt}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeView === "records" && (
              <>
                <div className="table-header-row">
                  <span />
                  <span className="record-count-badge">{registry.length} Records</span>
                </div>

                <div className="table-wrapper">
                  <table className="registry-table">
                    <thead>
                      <tr>
                        <th>Record ID / Date</th>
                        <th>Type</th>
                        <th>Assertions</th>
                        <th>Lifecycle</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registry.length > 0 ? (
                        registry.map((record) => (
                          <tr key={record.id}>
                            <td>
                              <div className="record-id">{truncateValue(record.id, 16)}</div>
                              <div className="record-meta">{record.date}</div>
                            </td>
                            <td>
                              <span>{record.type}</span>
                              <div className="record-meta">{record.fileName || "file_upload"}</div>
                            </td>
                            <td>
                              <div className="assertion-tags">
                                {record.assertions.map((assertion) => (
                                  <span key={assertion} className="assertion-tag">
                                    {assertion}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`badge ${record.status === "Superseded" ? "review" : "registered"}`}
                              >
                                {record.status}
                              </span>
                              {record.latestAttestation && (
                                <div className="record-meta">
                                  Attested by {truncateValue(record.latestAttestation.reviewer, 14)}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="table-action"
                                  suppressHydrationWarning
                                  onClick={() => {
                                    setVerifyRecordId(record.id);
                                    setVerificationResult({ status: "idle", message: "" });
                                    setOperationProgress(null);
                                    setActiveView("verify");
                                  }}
                                >
                                  Verify
                                </button>
                                <button
                                  className="table-action warn"
                                  suppressHydrationWarning
                                  onClick={() => {
                                    setAttestRecordId(record.id);
                                    setAttestResult(null);
                                    setOperationProgress(null);
                                    setActiveView("attest");
                                  }}
                                >
                                  {record.latestAttestation ? "Re-attest" : "Attest"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5}>
                            <div className="empty-state">
                              <div className="empty-state-title">No evidence records yet</div>
                              <div className="record-meta">
                                Register a file first, then it will appear here for verification and attestation.
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* B-side demo button for persistent memory proof (recall after refresh/new session to continue gap).
                    After store via orchestrate (or agent), refresh, click: calls gap route which does recallPrior + injects to input for continued gap analysis.
                    Shows count >0 proving MemWal persistence. */}
                <div style={{ marginTop: 8, padding: 6, border: '1px dashed #666', fontSize: 12 }}>
                  <button
                    onClick={async () => {
                      try {
                        const pid = attestRecordId || verifyRecordId || (registry[0]?.id ?? 'demo-pack');
                        const body = {
                          pack_id: pid,
                          engagement_name: 'Q2 2026 Demo',
                          documents: [{ document_id: 'd1', filename: 'demo.pdf' }],
                        };
                        const res = await fetch('/api/agent/analyze-gaps', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(body),
                        });
                        const data = await res.json();
                        alert(`Recalled prior count (MemWal persistence proof): ${data.recalled_prior_count ?? 0}\nGap continued from previous session memory.`);
                      } catch (e) {
                        alert('Demo recall error: ' + ((e as Error).message || e));
                      }
                    }}
                  >
                    Demo Recall Prior for Gap (after refresh)
                  </button>
                  <span style={{ marginLeft: 8, color: '#666' }}>
                    (proves cross-session: stores persist in MemWal → recall injects to gap input)
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
