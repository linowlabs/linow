"use client";

import React, { useState } from "react";

/* ================================================================
   Types
   ================================================================ */

interface EvidenceRecord {
  id: string;
  date: string;
  type: string;
  source: string;
  commitment: string;
  status: "Registered" | "UnderReview" | "Attested";
  blobId: string;
  assertions: string[];
  reviewer: string;
  notes: string;
  fileSize?: string;
  fileName?: string;
}

interface ProgressStep {
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
}

type ViewId = "register" | "verify" | "attest" | "records";

/* ================================================================
   Constants
   ================================================================ */

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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ================================================================
   Component
   ================================================================ */

export default function Home() {
  /* ---------- Navigation ---------- */
  const [activeView, setActiveView] = useState<ViewId>("register");

  /* ---------- Registry (mock database) ---------- */
  const [registry, setRegistry] = useState<EvidenceRecord[]>([
    {
      id: "0x8df025a1768c34fde90184b2c15ea7728a01bf9e",
      date: "2026-06-05 14:15",
      type: "Bank Statement",
      source: "Company Upload (L2)",
      commitment:
        "4e82df4bc89f64e2a15998a12c15e882a0e98a12c15e882a0e98a12c15e882a0",
      status: "Attested",
      blobId: "walrus::blob-a48df21b0e9d9e48f88c8e142e01df",
      assertions: ["Existence", "Completeness", "Accuracy"],
      reviewer: "0xa482e185c74fb90172bf4215e982c7104b28d2",
      notes: "Verified Q2 bank reconcile balances. Matches ERP ledger export.",
      fileSize: "1.4 MB",
      fileName: "Q2_Bank_Reconcile_ABC.pdf",
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
      notes: "Executed contract with Acme Corp for Cloud Services.",
      fileSize: "2.8 MB",
      fileName: "Acme_Services_Agreement_Signed.pdf",
    },
  ]);

  /* ---------- Register form ---------- */
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regDocType, setRegDocType] = useState("Bank Statement");
  const [regSource, setRegSource] = useState("Company Upload (L2)");
  const [regDesc, setRegDesc] = useState("");
  const [regAssertions, setRegAssertions] = useState<string[]>(["Existence"]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<{
    objectId: string;
    txDigest: string;
    blobId: string;
    commitment: string;
  } | null>(null);

  /* ---------- Verify form ---------- */
  const [verifyRecordId, setVerifyRecordId] = useState(
    registry[0]?.id || ""
  );
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyTamperSim, setVerifyTamperSim] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: "idle" | "success" | "tampered";
    message: string;
    computedHash?: string;
    expectedHash?: string;
  }>({ status: "idle", message: "" });

  /* ---------- Attest form ---------- */
  const [attestRecordId, setAttestRecordId] = useState(
    registry[1]?.id || ""
  );
  const [attestReviewer, setAttestReviewer] = useState(
    "0xa482e185c74fb90172bf4215e982c7104b28d2"
  );
  const [attestNotes, setAttestNotes] = useState("");
  const [attestType, setAttestType] = useState("EvidenceVerified (0)");
  const [isAttesting, setIsAttesting] = useState(false);
  const [attestResult, setAttestResult] = useState<{
    attestationId: string;
    txDigest: string;
  } | null>(null);

  /* ---------- Inline progress ---------- */
  const [operationProgress, setOperationProgress] = useState<{
    type: ViewId;
    steps: ProgressStep[];
  } | null>(null);

  /* ================================================================
     Handlers
     ================================================================ */

  const handleToggleAssertion = (assertion: string) => {
    setRegAssertions((prev) =>
      prev.includes(assertion)
        ? prev.filter((a) => a !== assertion)
        : [...prev, assertion]
    );
  };

  const handleRegister = async () => {
    if (isRegistering) return;
    setIsRegistering(true);
    setRegisterResult(null);

    const fName = regFile ? regFile.name : "unnamed_document.pdf";
    const fSize = regFile
      ? `${(regFile.size / (1024 * 1024)).toFixed(1)} MB`
      : "1.2 MB";

    const steps: ProgressStep[] = [
      { label: "Computing SHA-256 hash", status: "pending" },
      { label: "Encrypting with AES-256-GCM", status: "pending" },
      { label: "Uploading encrypted blob to Walrus", status: "pending" },
      { label: "Registering commitment on Sui via Tatum", status: "pending" },
    ];

    steps[0].status = "running";
    setOperationProgress({ type: "register", steps: [...steps] });
    await delay(700);
    const mockHash =
      Math.random().toString(16).substring(2, 18) +
      "4e82df4bc89f64e2a15998a12c15e882a0e98a12c15e882a0e98a12c15e882a0".substring(
        16
      );
    steps[0] = {
      ...steps[0],
      status: "done",
      detail: mockHash.substring(0, 16) + "…",
    };

    steps[1].status = "running";
    setOperationProgress({ type: "register", steps: [...steps] });
    await delay(800);
    steps[1] = { ...steps[1], status: "done" };

    steps[2].status = "running";
    setOperationProgress({ type: "register", steps: [...steps] });
    await delay(900);
    const mockBlobId = `walrus::blob-${Math.random()
      .toString(36)
      .substring(2, 15)}${Math.random().toString(36).substring(2, 10)}`;
    steps[2] = {
      ...steps[2],
      status: "done",
      detail: mockBlobId.substring(0, 22) + "…",
    };

    steps[3].status = "running";
    setOperationProgress({ type: "register", steps: [...steps] });
    await delay(1000);
    const mockTxDigest =
      "SuiTx" + Math.random().toString(36).substring(2, 12).toUpperCase();
    const mockObjectId =
      "0x" +
      Math.random().toString(16).substring(2, 18) +
      Math.random().toString(16).substring(2, 24);
    steps[3] = { ...steps[3], status: "done", detail: mockTxDigest };
    setOperationProgress({ type: "register", steps: [...steps] });

    const newRecord: EvidenceRecord = {
      id: mockObjectId,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      type: regDocType,
      source: regSource,
      commitment: mockHash,
      status: "Registered",
      blobId: mockBlobId,
      assertions: regAssertions,
      reviewer: "n/a",
      notes: regDesc || "No description provided.",
      fileName: fName,
      fileSize: fSize,
    };
    setRegistry((prev) => [newRecord, ...prev]);

    setRegisterResult({
      objectId: mockObjectId,
      txDigest: mockTxDigest,
      blobId: mockBlobId,
      commitment: mockHash,
    });
    setIsRegistering(false);
  };

  const handleVerify = async () => {
    if (!verifyRecordId) return;
    setIsVerifying(true);
    setVerificationResult({ status: "idle", message: "" });

    const record = registry.find((r) => r.id === verifyRecordId);
    if (!record) {
      setIsVerifying(false);
      return;
    }

    const steps: ProgressStep[] = [
      { label: "Fetching EvidenceRecord from Sui", status: "pending" },
      { label: "Downloading encrypted blob from Walrus", status: "pending" },
      { label: "Decrypting and computing SHA-256 hash", status: "pending" },
    ];

    steps[0].status = "running";
    setOperationProgress({ type: "verify", steps: [...steps] });
    await delay(600);
    steps[0] = {
      ...steps[0],
      status: "done",
      detail: record.id.substring(0, 14) + "…",
    };

    steps[1].status = "running";
    setOperationProgress({ type: "verify", steps: [...steps] });
    await delay(700);
    steps[1] = { ...steps[1], status: "done", detail: record.fileSize };

    steps[2].status = "running";
    setOperationProgress({ type: "verify", steps: [...steps] });
    await delay(800);

    if (verifyTamperSim) {
      const computedHash =
        "f2a8d9e2b10a9c8f" + record.commitment.substring(16);
      steps[2] = { ...steps[2], status: "error", detail: "Mismatch" };
      setOperationProgress({ type: "verify", steps: [...steps] });
      setVerificationResult({
        status: "tampered",
        message:
          "Document hash does not match the blockchain commitment. The file has been modified since registration.",
        computedHash,
        expectedHash: record.commitment,
      });
    } else {
      steps[2] = { ...steps[2], status: "done", detail: "Match confirmed" };
      setOperationProgress({ type: "verify", steps: [...steps] });
      setVerificationResult({
        status: "success",
        message:
          "Document hash matches the on-chain commitment exactly. The file is authentic and unchanged.",
        computedHash: record.commitment,
        expectedHash: record.commitment,
      });
    }
    setIsVerifying(false);
  };

  const handleAttest = async () => {
    if (!attestRecordId) return;
    setIsAttesting(true);
    setAttestResult(null);

    const record = registry.find((r) => r.id === attestRecordId);
    if (!record) {
      setIsAttesting(false);
      return;
    }

    const steps: ProgressStep[] = [
      { label: "Preparing attestation parameters", status: "pending" },
      { label: "Executing PTB on Sui via Tatum", status: "pending" },
    ];

    steps[0].status = "running";
    setOperationProgress({ type: "attest", steps: [...steps] });
    await delay(800);
    steps[0] = { ...steps[0], status: "done" };

    steps[1].status = "running";
    setOperationProgress({ type: "attest", steps: [...steps] });
    await delay(600);
    const mockTxDigest =
      "AttTx" + Math.random().toString(36).substring(2, 12).toUpperCase();
    const mockAttId =
      "0x" + Math.random().toString(16).substring(2, 22) + "attest";
    steps[1] = { ...steps[1], status: "done", detail: mockTxDigest };
    setOperationProgress({ type: "attest", steps: [...steps] });

    setRegistry((prev) =>
      prev.map((r) =>
        r.id === attestRecordId
          ? {
              ...r,
              status: "Attested" as const,
              reviewer: attestReviewer,
              notes: attestNotes || "Attested via Linow Workspace.",
            }
          : r
      )
    );

    setAttestResult({ attestationId: mockAttId, txDigest: mockTxDigest });
    setIsAttesting(false);
  };

  /* ================================================================
     Render helpers
     ================================================================ */

  const renderSteps = (viewType: ViewId) => {
    if (!operationProgress || operationProgress.type !== viewType) return null;
    return (
      <div className="progress-card">
        <div className="progress-title">Operation Progress</div>
        <div className="progress-steps">
          {operationProgress.steps.map((step, i) => (
            <div key={i} className="step">
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

  /* ================================================================
     View configs
     ================================================================ */

  const views: {
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
      desc: "Upload a document to hash, encrypt, store on Walrus, and register a tamper-proof commitment on Sui.",
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
      desc: "Compare a file against its Sui blockchain commitment. Detects any modification since registration.",
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
      desc: "Independent reviewers attest to evidence by issuing a signed Attestation object on Sui.",
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
      desc: "All registered evidence records from this session.",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
    },
  ];

  const currentView = views.find((v) => v.id === activeView)!;

  /* ================================================================
     JSX
     ================================================================ */

  return (
    <main className="app-container">
      {/* ==================== TOP BAR ==================== */}
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
            <span>Sui Testnet Connected</span>
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

      {/* ==================== BODY ==================== */}
      <div className="app-body">
        {/* ---------- Sidebar ---------- */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Evidence Flows</div>
            <nav className="sidebar-nav">
              {views.map((v) => (
                <div
                  key={v.id}
                  className={`nav-item${activeView === v.id ? " active" : ""}`}
                  onClick={() => setActiveView(v.id)}
                >
                  {v.icon}
                  <span>{v.label}</span>
                  {v.id === "records" && (
                    <span className="nav-count">{registry.length}</span>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="guardrails-title">Guardrails</div>
            <ul className="guardrails-list">
              <li>Commitments are SHA-256 hashes of plaintext</li>
              <li>Sui stores commitments, not raw evidence</li>
              <li>Walrus blobs are encrypted client-side</li>
              <li>Verification requires independent attester wallet</li>
            </ul>
          </div>
        </aside>

        {/* ---------- Workspace ---------- */}
        <section className="workspace">
          <div className="workspace-header">
            <div className="workspace-eyebrow">{currentView.eyebrow}</div>
            <h1 className="workspace-title">{currentView.title}</h1>
            <p className="workspace-desc">{currentView.desc}</p>
          </div>

          <div className="workspace-content">
            {/* ============ REGISTER VIEW ============ */}
            {activeView === "register" && (
              <>
                <div className="card">
                  <div className="form-grid">
                    {/* File upload */}
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
                          onChange={(e) => {
                            if (e.target.files?.[0]) setRegFile(e.target.files[0]);
                          }}
                        />
                      </div>
                    </div>

                    {/* Doc type + source */}
                    <div className="field">
                      <label className="field-label">Document Type</label>
                      <select
                        className="field-select"
                        value={regDocType}
                        onChange={(e) => setRegDocType(e.target.value)}
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
                        onChange={(e) => setRegSource(e.target.value)}
                        placeholder="e.g. Acme Corp Bank ERP"
                      />
                    </div>

                    {/* Description — full width */}
                    <div className="field form-full">
                      <label className="field-label">Description / Audit Objective</label>
                      <textarea
                        className="field-textarea"
                        rows={2}
                        value={regDesc}
                        onChange={(e) => setRegDesc(e.target.value)}
                        placeholder="e.g. Verification of Q2 bank reconciliation to satisfy bank existence audit."
                      />
                    </div>

                    {/* ISA Assertions — full width */}
                    <div className="field form-full">
                      <label className="field-label">ISA Assertions Covered</label>
                      <div className="assertions-grid">
                        {ISA_ASSERTIONS.map((a) => (
                          <div
                            key={a}
                            className={`assertion-chip${regAssertions.includes(a) ? " selected" : ""}`}
                            onClick={() => handleToggleAssertion(a)}
                          >
                            {a}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="btn-actions">
                    <button
                      className="btn-primary"
                      disabled={isRegistering}
                      onClick={handleRegister}
                    >
                      {isRegistering ? (
                        <>
                          <span className="spinner" />
                          <span>Registering…</span>
                        </>
                      ) : (
                        "Upload & Register Evidence"
                      )}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setRegFile(null);
                        setRegDesc("");
                        setRegAssertions(["Existence"]);
                        setRegisterResult(null);
                        setOperationProgress(null);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Progress steps */}
                {renderSteps("register")}

                {/* Result card */}
                {registerResult && (
                  <div className="result-card success">
                    <div className="result-header">
                      <svg className="result-icon success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="result-title success">Evidence Registered</span>
                    </div>
                    <p className="result-message">
                      Document has been hashed, encrypted, stored on Walrus, and registered on Sui blockchain.
                    </p>
                    <div className="proof-grid">
                      <div className="proof-row">
                        <span className="proof-label">Evidence ID</span>
                        <span className="proof-value">{registerResult.objectId.substring(0, 28)}…</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Tx Digest</span>
                        <span className="proof-value">{registerResult.txDigest}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Walrus Blob</span>
                        <span className="proof-value">{registerResult.blobId.substring(0, 28)}…</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Commitment</span>
                        <span className="proof-value">{registerResult.commitment.substring(0, 28)}…</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ============ VERIFY VIEW ============ */}
            {activeView === "verify" && (
              <>
                <div className="card">
                  <div className="form-grid">
                    <div className="field">
                      <label className="field-label">Select Evidence Record</label>
                      <select
                        className="field-select"
                        value={verifyRecordId}
                        onChange={(e) => setVerifyRecordId(e.target.value)}
                      >
                        <option value="">-- Choose registered record --</option>
                        {registry.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.type} — {r.id.substring(0, 10)}… ({r.date})
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
                            {verifyFile ? verifyFile.name : "Click to load test file"}
                          </div>
                          <div className="file-upload-hint">
                            {verifyFile
                              ? `${(verifyFile.size / 1024).toFixed(1)} KB`
                              : "Load file to verify against chain"}
                          </div>
                        </div>
                        <input
                          type="file"
                          className="file-upload-input"
                          onChange={(e) => {
                            if (e.target.files?.[0]) setVerifyFile(e.target.files[0]);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tamper toggle */}
                  <div className={`tamper-toggle${verifyTamperSim ? " active" : ""}`}>
                    <div className="tamper-info">
                      <div className="tamper-title">Simulate File Tampering</div>
                      <div className="tamper-desc">
                        Modify a byte before verification to trigger a hash mismatch.
                      </div>
                    </div>
                    <button
                      className={`tamper-btn${verifyTamperSim ? " active" : ""}`}
                      onClick={() => setVerifyTamperSim(!verifyTamperSim)}
                    >
                      {verifyTamperSim ? "Tampering Active" : "Simulate Tamper"}
                    </button>
                  </div>

                  <div className="btn-actions">
                    <button
                      className="btn-primary"
                      disabled={isVerifying || !verifyRecordId}
                      onClick={handleVerify}
                    >
                      {isVerifying ? (
                        <>
                          <span className="spinner" />
                          <span>Verifying…</span>
                        </>
                      ) : (
                        "Run Verification"
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress steps */}
                {renderSteps("verify")}

                {/* Verification result */}
                {verificationResult.status !== "idle" && (
                  <div
                    className={`result-card ${
                      verificationResult.status === "success" ? "success" : "error"
                    }`}
                  >
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
                      <span
                        className={`result-title ${
                          verificationResult.status === "success" ? "success" : "error"
                        }`}
                      >
                        {verificationResult.status === "success"
                          ? "Integrity Verified"
                          : "Tamper Detected"}
                      </span>
                    </div>
                    <p className="result-message">{verificationResult.message}</p>
                    <div className="proof-grid">
                      <div className="proof-row">
                        <span className="proof-label">On-Chain Commitment</span>
                        <span className="proof-value">
                          {verificationResult.expectedHash?.substring(0, 28)}…
                        </span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Computed Hash</span>
                        <span
                          className={`proof-value ${
                            verificationResult.status === "success" ? "success" : "error"
                          }`}
                        >
                          {verificationResult.computedHash?.substring(0, 28)}…
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ============ ATTEST VIEW ============ */}
            {activeView === "attest" && (
              <>
                <div className="card">
                  <div className="form-grid">
                    <div className="field">
                      <label className="field-label">Target Evidence Record</label>
                      <select
                        className="field-select"
                        value={attestRecordId}
                        onChange={(e) => setAttestRecordId(e.target.value)}
                      >
                        <option value="">-- Choose record to attest --</option>
                        {registry.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.type} — {r.id.substring(0, 10)}… ({r.status})
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
                        onChange={(e) => setAttestReviewer(e.target.value)}
                        placeholder="0x…"
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Attestation Type</label>
                      <select
                        className="field-select"
                        value={attestType}
                        onChange={(e) => setAttestType(e.target.value)}
                      >
                        <option value="EvidenceVerified (0)">
                          EvidenceVerified (0) — Verification complete
                        </option>
                        <option value="HashConfirmed (2)">
                          HashConfirmed (2) — Integrity match only
                        </option>
                        <option value="Rejected (3)">
                          Rejected (3) — Audit issue flagged
                        </option>
                      </select>
                    </div>

                    <div className="field">
                      <label className="field-label">Source Confidence</label>
                      <input
                        type="text"
                        className="field-input"
                        disabled
                        value={
                          registry.find((r) => r.id === attestRecordId)?.source ===
                          "Company Upload (L2)"
                            ? "L3 — Reviewer Wallet Attested"
                            : "L0 — Integrity Proof"
                        }
                      />
                    </div>

                    <div className="field form-full">
                      <label className="field-label">Reviewer Notes</label>
                      <textarea
                        className="field-textarea"
                        rows={3}
                        value={attestNotes}
                        onChange={(e) => setAttestNotes(e.target.value)}
                        placeholder="e.g. Checked bank ledger reconciliation against client records. Balance matches with zero variance."
                      />
                    </div>
                  </div>

                  <div className="btn-actions">
                    <button
                      className="btn-primary"
                      disabled={isAttesting || !attestRecordId}
                      onClick={handleAttest}
                    >
                      {isAttesting ? (
                        <>
                          <span className="spinner" />
                          <span>Executing…</span>
                        </>
                      ) : (
                        "Sign & Record Attestation"
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress steps */}
                {renderSteps("attest")}

                {/* Attest result */}
                {attestResult && (
                  <div className="result-card success">
                    <div className="result-header">
                      <svg className="result-icon success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="result-title success">Attestation Recorded</span>
                    </div>
                    <p className="result-message">
                      Reviewer attestation has been signed and registered on Sui blockchain.
                    </p>
                    <div className="proof-grid">
                      <div className="proof-row">
                        <span className="proof-label">Attestation ID</span>
                        <span className="proof-value">
                          {attestResult.attestationId.substring(0, 28)}…
                        </span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-label">Tx Digest</span>
                        <span className="proof-value">{attestResult.txDigest}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ============ RECORDS VIEW ============ */}
            {activeView === "records" && (
              <>
                <div className="table-header-row">
                  <span />
                  <span className="record-count-badge">
                    {registry.length} Records
                  </span>
                </div>

                <div className="table-wrapper">
                  <table className="registry-table">
                    <thead>
                      <tr>
                        <th>Record ID / Date</th>
                        <th>Type</th>
                        <th>Assertions</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registry.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty-state">
                            No evidence registered yet. Go to Upload Evidence to start.
                          </td>
                        </tr>
                      ) : (
                        registry.map((record) => (
                          <tr key={record.id}>
                            <td>
                              <div className="record-id">
                                {record.id.substring(0, 16)}…
                              </div>
                              <div className="record-meta">{record.date}</div>
                            </td>
                            <td>
                              <span>{record.type}</span>
                              <div className="record-meta">
                                {record.fileName || "file_upload"}
                              </div>
                            </td>
                            <td>
                              <div className="assertion-tags">
                                {record.assertions.map((a) => (
                                  <span key={a} className="assertion-tag">
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  record.status === "Attested"
                                    ? "attested"
                                    : record.status === "UnderReview"
                                    ? "review"
                                    : "registered"
                                }`}
                              >
                                {record.status}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="table-action"
                                  onClick={() => {
                                    setVerifyRecordId(record.id);
                                    setVerificationResult({
                                      status: "idle",
                                      message: "",
                                    });
                                    setOperationProgress(null);
                                    setActiveView("verify");
                                  }}
                                >
                                  Verify
                                </button>
                                {record.status !== "Attested" && (
                                  <button
                                    className="table-action warn"
                                    onClick={() => {
                                      setAttestRecordId(record.id);
                                      setAttestResult(null);
                                      setOperationProgress(null);
                                      setActiveView("attest");
                                    }}
                                  >
                                    Attest
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
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
