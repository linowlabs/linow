"use client";

import React, { useState } from "react";
import {
  encryptFile,
  encryptMetadata,
  generateEncryptionKey,
  hashFile,
} from "@linow/sdk";

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

const DEMO_PACKAGE_ID = "0x1a0f4c9e72b84f16c5e8127b4d90aa36linowpkg";

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

function toMockDigest(seed: string): string {
  return `SuiTx${seed.substring(0, 10).toUpperCase()}`;
}

function toMockObjectId(seed: string): string {
  return `0x${seed.substring(0, 40)}`;
}

function toMockAttestationId(seed: string): string {
  return `0xattest${seed.substring(0, 34)}`;
}

function toSourceLabel(source: string): string {
  const trimmed = source.trim();

  if (!trimmed) {
    return "Company Upload (L2)";
  }

  return trimmed.includes("(L") ? trimmed : `${trimmed} (L2)`;
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewId>("register");

  const [registry, setRegistry] = useState<EvidenceRecord[]>([
    {
      id: "0x8df025a1768c34fde90184b2c15ea7728a01bf9e",
      date: "2026-06-05 14:15",
      type: "Bank Statement",
      source: "Company Upload (L2)",
      commitment:
        "4e82df4bc89f64e2a15998a12c15e882a0e98a12c15e882a0e98a12c15e882a0",
      status: "Registered",
      blobId: "walrus::blob-a48df21b0e9d9e48f88c8e142e01df",
      assertions: ["Existence", "Completeness", "Accuracy"],
      reviewer: "0xa482e185c74fb90172bf4215e982c7104b28d2",
      notes: "Reviewer attested the evidence after checking ledger reconciliation support.",
      fileSize: "1.40 MB",
      fileName: "Q2_Bank_Reconcile_ABC.pdf",
      latestAttestation: {
        id: "0xattesta48df21b0e9d9e48f88c8e14",
        action: "EvidenceReviewed",
        reviewer: "0xa482e185c74fb90172bf4215e982c7104b28d2",
        note: "Reviewer attested the evidence after checking ledger reconciliation support.",
        txDigest: "AttTxREVIEWA48D",
        createdAt: "2026-06-05 15:02",
      },
    },
    {
      id: "0x15fa9d832e185c74fb90172bf4215e982c7104b2",
      date: "2026-06-05 18:30",
      type: "Vendor Contract",
      source: "Company Upload (L2)",
      commitment:
        "a93b8e72c019d5c58a649d8e78a6ff62fb16e882c15e882c15e882c15e882a0e",
      status: "Registered",
      blobId: "walrus::blob-948f2191cf8e9d3d39fa10df8e76a1",
      assertions: ["Rights & Obligations", "Classification"],
      reviewer: "n/a",
      notes: "Executed contract with Acme Corp for cloud services.",
      fileSize: "2.80 MB",
      fileName: "Acme_Services_Agreement_Signed.pdf",
    },
  ]);

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
  const [attestReviewer, setAttestReviewer] = useState(
    "0xa482e185c74fb90172bf4215e982c7104b28d2",
  );
  const [attestNotes, setAttestNotes] = useState("");
  const [attestType, setAttestType] = useState("EvidenceReviewed");
  const [isAttesting, setIsAttesting] = useState(false);
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
      { label: "Preparing Walrus blob reference", status: "pending" },
      { label: "Preparing Sui registration proof", status: "pending" },
    ];

    try {
      steps[0].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      const commitment = await hashFile(regFile);
      await delay(200);
      steps[0] = {
        ...steps[0],
        status: "done",
        detail: truncateValue(commitment),
      };

      steps[1].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      const encryptionKey = await generateEncryptionKey();
      const encryptedFile = await encryptFile(regFile, encryptionKey);
      const encryptedMetadata = await encryptMetadata(metadata, encryptionKey);
      await delay(200);
      steps[1] = {
        ...steps[1],
        status: "done",
        detail: `${formatMegabytes(encryptedFile.ciphertext.byteLength)} encrypted`,
      };

      steps[2].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      const blobSeed = await hashFile(encryptedFile.ciphertext);
      const blobId = `walrus::blob-${blobSeed.substring(0, 28)}`;
      await delay(150);
      steps[2] = {
        ...steps[2],
        status: "done",
        detail: truncateValue(blobId, 22),
      };

      steps[3].status = "running";
      setOperationProgress({ type: "register", steps: [...steps] });
      const txDigest = toMockDigest(commitment);
      const objectId = toMockObjectId(blobSeed);
      await delay(150);
      steps[3] = {
        ...steps[3],
        status: "done",
        detail: txDigest,
      };
      setOperationProgress({ type: "register", steps: [...steps] });

      const registeredAt = new Date().toISOString().replace("T", " ").substring(0, 16);
      const newRecord: EvidenceRecord = {
        id: objectId,
        date: registeredAt,
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
        encryptedFileSize: formatMegabytes(encryptedFile.ciphertext.byteLength),
        encryptedMetadataSize: `${encryptedMetadata.ciphertext.byteLength} B`,
        sourceConfidence: "L2 - Company Upload",
      });
      setProofSnapshot({
        evidenceId: objectId,
        txDigest,
        packageId: DEMO_PACKAGE_ID,
        commitment,
        blobReference: blobId,
        updatedAt: registeredAt,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Registration flow failed while preparing local proof artifacts.";
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
    setAttestType("EvidenceReviewed");
    setAttestResult(null);
    setOperationProgress((prev) => (prev?.type === "attest" ? null : prev));
  };

  const handleVerify = async (simulateTamper: boolean) => {
    if (!verifyRecordId || isVerifying) return;

    setIsVerifying(true);
    setVerificationResult({ status: "idle", message: "" });

    const record = registry.find((item) => item.id === verifyRecordId);
    if (!record) {
      setIsVerifying(false);
      return;
    }

    const steps: ProgressStep[] = [
      { label: "Fetching recorded commitment", status: "pending" },
      { label: "Preparing verification file", status: "pending" },
      { label: "Computing comparison hash", status: "pending" },
    ];

    steps[0].status = "running";
    setOperationProgress({ type: "verify", steps: [...steps] });
    await delay(250);
    steps[0] = {
      ...steps[0],
      status: "done",
      detail: truncateValue(record.id, 14),
    };

    steps[1].status = "running";
    setOperationProgress({ type: "verify", steps: [...steps] });
    await delay(250);
    const checkedFileLabel = verifyFile ? verifyFile.name : record.fileName || "Shell sample";
    steps[1] = {
      ...steps[1],
      status: "done",
      detail: checkedFileLabel,
    };

    steps[2].status = "running";
    setOperationProgress({ type: "verify", steps: [...steps] });

    let computedHash = record.commitment;

    if (verifyFile) {
      computedHash = await hashFile(verifyFile);
    }
    if (simulateTamper) {
      computedHash = `f2a8d9e2b10a9c8f${record.commitment.substring(16)}`;
    }

    await delay(250);

    if (computedHash === record.commitment) {
      const checkedAt = new Date().toISOString().replace("T", " ").substring(0, 16);
      steps[2] = {
        ...steps[2],
        status: "done",
        detail: "Hash matches",
      };
      setOperationProgress({ type: "verify", steps: [...steps] });
      setVerificationResult({
        status: "success",
        message:
          "Hash matches the recorded commitment. The supplied file is consistent with the evidence record.",
        computedHash,
        expectedHash: record.commitment,
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
        packageId: DEMO_PACKAGE_ID,
        commitment: record.commitment,
        blobReference: record.blobId,
        attestationId: prev?.attestationId,
        verificationStatus: "success",
        checkedFileLabel,
        updatedAt: checkedAt,
      }));
      setAttestRecordId(verifyRecordId);
    } else {
      const checkedAt = new Date().toISOString().replace("T", " ").substring(0, 16);
      steps[2] = {
        ...steps[2],
        status: "error",
        detail: "Tamper detected",
      };
      setOperationProgress({ type: "verify", steps: [...steps] });
      setVerificationResult({
        status: "tampered",
        message:
          "Tamper detected. The supplied file does not match the recorded commitment for this evidence item.",
        computedHash,
        expectedHash: record.commitment,
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
        packageId: DEMO_PACKAGE_ID,
        commitment: record.commitment,
        blobReference: record.blobId,
        attestationId: prev?.attestationId,
        verificationStatus: "tampered",
        checkedFileLabel,
        updatedAt: checkedAt,
      }));
    }

    setIsVerifying(false);
  };

  const handleAttest = async () => {
    if (!attestRecordId || isAttesting) return;
    if (
      !lastVerificationSession ||
      lastVerificationSession.evidenceId !== attestRecordId ||
      lastVerificationSession.status !== "success"
    ) {
      return;
    }

    setIsAttesting(true);
    setAttestResult(null);

    const steps: ProgressStep[] = [
      { label: "Preparing reviewer statement", status: "pending" },
      { label: "Preparing attestation proof", status: "pending" },
    ];

    steps[0].status = "running";
    setOperationProgress({ type: "attest", steps: [...steps] });
    await delay(300);
    steps[0] = {
      ...steps[0],
      status: "done",
      detail: attestType,
    };

    steps[1].status = "running";
    setOperationProgress({ type: "attest", steps: [...steps] });
    await delay(300);

    const attestationId = `0x${Math.random().toString(16).substring(2, 24)}attest`;
    const txDigest = `AttTx${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const createdAt = new Date().toISOString().replace("T", " ").substring(0, 16);

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
              reviewer: attestReviewer,
              notes: attestNotes || "Attested via Linow Workspace.",
              latestAttestation: {
                id: toMockAttestationId(attestationId),
                action: attestType,
                reviewer: attestReviewer,
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
      reviewer: attestReviewer,
      action: attestType,
      createdAt,
    });
    const attestedRecord = registry.find((record) => record.id === attestRecordId);
    setProofSnapshot((prev) => ({
      evidenceId: attestRecordId,
      txDigest,
      packageId: DEMO_PACKAGE_ID,
      commitment: attestedRecord?.commitment || prev?.commitment,
      blobReference: attestedRecord?.blobId || prev?.blobReference,
      attestationId,
      verificationStatus: prev?.verificationStatus,
      checkedFileLabel: prev?.checkedFileLabel,
      updatedAt: createdAt,
    }));
    setIsAttesting(false);
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

  return (
    <main className="app-container">
      <header className="topbar">
        <div className="topbar-left">
          <svg className="topbar-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span className="topbar-brand">Linow</span>
          <span className="topbar-badge">TESTNET v0.2</span>
        </div>
        <div className="topbar-right">
          <div className="topbar-status">
            <span className="status-dot" />
            <span>Sui Proof Path Pending Live Integration</span>
          </div>
          <div className="topbar-divider" />
          <div className="topbar-encryption">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>AES-256-GCM</span>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Evidence Flows</div>
            <nav className="sidebar-nav">
              {VIEWS.map((view) => (
                <div
                  key={view.id}
                  className={`nav-item${activeView === view.id ? " active" : ""}`}
                  onClick={() => setActiveView(view.id)}
                >
                  {view.icon}
                  <span>{view.label}</span>
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
                <li>Shell outputs are product placeholders until live integration lands.</li>
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
            {proofSnapshot && (
              <div className="result-card success">
                <div className="result-header">
                  <svg className="result-icon success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="result-title success">Proof Output Surface</span>
                </div>
                <p className="result-message">
                  Judge-facing artifacts from the latest shell action. These stay mock-linked until live integration lands.
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
                      disabled={isRegistering || !regFile || regAssertions.length === 0}
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
                      Local hashing and encryption completed. Mock Walrus and Sui references were generated for the shell while live integration is still pending.
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
                        <span className="proof-value">{truncateValue(DEMO_PACKAGE_ID, 28)}</span>
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
                      <div className="tamper-title">Verification Modes</div>
                      <div className="tamper-desc">
                        Run a clean comparison against the recorded commitment or force a modified-file mismatch for the demo.
                      </div>
                    </div>
                  </div>

                  <div className="btn-actions">
                    <button
                      className="btn-primary"
                      disabled={isVerifying || !verifyRecordId}
                      suppressHydrationWarning
                      onClick={() => handleVerify(false)}
                    >
                      {isVerifying ? (
                        <>
                          <span className="spinner" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        "Verify Original File"
                      )}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={isVerifying || !verifyRecordId}
                      suppressHydrationWarning
                      onClick={() => handleVerify(true)}
                    >
                      Verify Modified File
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
                      <input
                        type="text"
                        className="field-input mono"
                        value={attestReviewer}
                        suppressHydrationWarning
                        onChange={(event) => setAttestReviewer(event.target.value)}
                        placeholder="0x..."
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Attestation Action</label>
                      <select
                        className="field-select"
                        value={attestType}
                        suppressHydrationWarning
                        onChange={(event) => setAttestType(event.target.value)}
                      >
                        <option value="EvidenceReviewed">Evidence reviewed</option>
                        <option value="HashConfirmed">Hash confirmed</option>
                        <option value="IssueFlagged">Issue flagged</option>
                      </select>
                    </div>

                    <div className="field">
                      <label className="field-label">Source Confidence</label>
                      <input
                        type="text"
                        className="field-input"
                        disabled
                        suppressHydrationWarning
                        value="L3 - Reviewer Wallet Attested"
                      />
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
                      disabled={isAttesting || !attestRecordId || !selectedRecordVerified}
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
                        <span className="proof-value">{truncateValue(DEMO_PACKAGE_ID, 28)}</span>
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
                      {registry.map((record) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
