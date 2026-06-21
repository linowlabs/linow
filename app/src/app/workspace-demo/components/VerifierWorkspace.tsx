import React, { useState, useRef } from "react";
import { Icons } from "../icons";
import { PbcItem, RegisterResult, Finding } from "../types";

interface VerifierWorkspaceProps {
  pbcList: PbcItem[];
  pbcRegisteredData: Record<string, RegisterResult>;
  auditorFindings: Finding[];
}

interface VerificationMatch {
  status: "success" | "error";
  fileName: string;
  hash: string;
  registeredBy: string;
  registeredDate: string;
  attestedBy: string;
}

export default function VerifierWorkspace({
  pbcList,
  pbcRegisteredData,
  auditorFindings,
}: VerifierWorkspaceProps) {
  const [dragActive, setDragActive] = useState(false);
  const [verifyHash, setVerifyHash] = useState("");
  const [result, setResult] = useState<VerificationMatch | null>(null);
  const [searched, setSearched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download logic for mock files
  const handleDownloadFile = (item: PbcItem) => {
    const fileContent = `Linow Proof-of-Evidence Document\n===============================\nFile Name: ${item.name}\nSize: ${item.size}\nClassified Tag: ${item.agentTag || "General Document"}\nTarget Assertions: ${item.agentAssertions?.join(", ") || "None"}\nReference ID: ${item.id}\nRegistered: ${item.status === "registered" || pbcRegisteredData[item.id] ? "Yes" : "No"}`;
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Run matching logic based on filename or hash value
  const handleVerifyFileByName = (fileName: string) => {
    setSearched(true);
    // Find item matching filename
    const matchItem = pbcList.find(
      (p) => p.name.toLowerCase() === fileName.toLowerCase()
    );

    if (!matchItem) {
      setResult({
        status: "error",
        fileName,
        hash: "N/A",
        registeredBy: "",
        registeredDate: "",
        attestedBy: "",
      });
      return;
    }

    const regData = pbcRegisteredData[matchItem.id];
    const isRegistered = matchItem.status === "registered" || !!regData;

    if (!isRegistered) {
      setResult({
        status: "error",
        fileName: matchItem.name,
        hash: "Not registered on-chain yet",
        registeredBy: "",
        registeredDate: "",
        attestedBy: "",
      });
      return;
    }

    // Determine registration and attestation parameters
    const onChainHash = regData?.objectId || "0x9ac2849e7dd55a12b234d98a7c1b52a30f9e41f0";
    const regDate = regData?.txDigest || "17 Jun 2026, 10:15";
    
    // Check if the auditor has attested to this document.
    // In our demo, f-1 maps to 09_customer_contract_orion_C-ORION-2026-019.pdf.
    // Bank_statement_Q2.pdf is attested by default in the wireframe mockup.
    let attestedSigner = "Pending Auditor Review";
    if (matchItem.name.includes("Bank_statement_Q2.pdf") || matchItem.id === "pbc-bank-statement-q2") {
      attestedSigner = "0x4f1a...22c0 (Auditor)";
    } else if (matchItem.name.includes("09_customer_contract_orion") || matchItem.id === "pbc-orion-contract") {
      const contractFinding = auditorFindings.find(f => f.id === "f-1");
      if (contractFinding && contractFinding.status === "confirmed") {
        attestedSigner = contractFinding.txDigest 
          ? `${contractFinding.txDigest.substring(0, 6)}...${contractFinding.txDigest.substring(contractFinding.txDigest.length - 4)} (Auditor)`
          : "0x4f1a...22c0 (Auditor)";
      }
    }

    setResult({
      status: "success",
      fileName: matchItem.name,
      hash: onChainHash,
      registeredBy: "Acme Corp",
      registeredDate: regDate,
      attestedBy: attestedSigner,
    });
  };

  const handleVerifyByHash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyHash.trim()) return;
    setSearched(true);

    // Look for matched hash in pbcRegisteredData or hardcoded values
    let foundFileId = "";

    Object.entries(pbcRegisteredData).forEach(([fileId, val]) => {
      if (
        val.objectId?.toLowerCase() === verifyHash.trim().toLowerCase() ||
        val.commitment?.toLowerCase() === verifyHash.trim().toLowerCase()
      ) {
        foundFileId = fileId;
      }
    });

    // Support partial match for demo convenience
    if (!foundFileId && verifyHash.trim().startsWith("0x")) {
      const partial = verifyHash.trim().toLowerCase();
      Object.entries(pbcRegisteredData).forEach(([fileId, val]) => {
        if (val.objectId?.toLowerCase().includes(partial)) {
          foundFileId = fileId;
        }
      });
    }

    if (!foundFileId) {
      // Mock lookup matching wireframe "0x2e91"
      if (verifyHash.toLowerCase().includes("0x2e91")) {
        const item = pbcList.find(p => p.id === "pbc-bank-statement-q2");
        if (item) {
          setResult({
            status: "success",
            fileName: item.name,
            hash: "0x2e91849e7dd55a12b234d98a7c1b52a30f9e41f0",
            registeredBy: "Acme Corp",
            registeredDate: "17 Jun 2026, 10:15",
            attestedBy: "0x4f1a...22c0 (Auditor)",
          });
          return;
        }
      }

      setResult({
        status: "error",
        fileName: "Unknown File",
        hash: verifyHash,
        registeredBy: "",
        registeredDate: "",
        attestedBy: "",
      });
      return;
    }

    const item = pbcList.find((p) => p.id === foundFileId);
    if (!item) {
      setResult({
        status: "error",
        fileName: "Unknown File",
        hash: verifyHash,
        registeredBy: "",
        registeredDate: "",
        attestedBy: "",
      });
      return;
    }

    let attestedSigner = "Pending Auditor Review";
    if (item.id === "pbc-bank-statement-q2" || item.name.includes("Bank_statement_Q2")) {
      attestedSigner = "0x4f1a...22c0 (Auditor)";
    } else if (item.id === "pbc-orion-contract" || item.name.includes("09_customer_contract_orion")) {
      const contractFinding = auditorFindings.find(f => f.id === "f-1");
      if (contractFinding && contractFinding.status === "confirmed") {
        attestedSigner = "0x4f1a...22c0 (Auditor)";
      }
    }

    const matchedRegData = pbcRegisteredData[foundFileId];

    setResult({
      status: "success",
      fileName: item.name,
      hash: matchedRegData?.objectId || verifyHash,
      registeredBy: "Acme Corp",
      registeredDate: matchedRegData?.txDigest || "17 Jun 2026, 10:15",
      attestedBy: attestedSigner,
    });
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleVerifyFileByName(file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleVerifyFileByName(e.target.files[0].name);
    }
  };

  return (
    <main className="workspace-container verifier-workspace">
      <div className="verifier-columns-layout">

        {/* Left Column: Download PBC Files Panel */}
        <div className="verifier-panel-col">
          <div className="liquid-glass download-card">
            <h3 className="download-panel-title">Previous files</h3>
            <p className="download-panel-desc">
              Download mock documents from the checklist below to test verification by dragging them into the verification console.
            </p>

            <div className="download-files-list">
              {pbcList.map((item) => (
                <div key={item.id} className="download-file-item">
                  <div className="file-item-left">
                    <div className="file-item-name-row">
                      <span className="file-item-name">{item.name}</span>
                      <span className="file-item-size">{item.size}</span>
                    </div>
                    <div className="file-item-meta-row">
                      <span className="file-item-tag">{item.agentTag || "General Doc"}</span>
                      {item.status === "registered" || pbcRegisteredData[item.id] ? (
                        <span className="file-item-status-tag registered">Registered</span>
                      ) : (
                        <span className="file-item-status-tag unregistered">Unregistered</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="file-download-btn"
                    onClick={() => handleDownloadFile(item)}
                    title={`Download ${item.name}`}
                  >
                    <Icons.Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column: Verification Console */}
        <div className="verifier-panel-col">
          <div className="liquid-glass verifier-card">
            <div className="verifier-card-header">
              <div className="verifier-icon-wrapper">
                <Icons.ShieldCheck className="verifier-header-icon" />
              </div>
              <h2 className="verifier-title">Verify a document</h2>
              <p className="verifier-subtitle">
                Upload a file to match it with the hash recorded on Sui, or paste a document hash manually.
              </p>
            </div>

            {/* Drag & Drop File Zone */}
            <div
              className={`drag-drop-zone ${dragActive ? "drag-active" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Icons.Upload className="drag-upload-icon" />
              <p className="drag-drop-text">Drag file or click to upload</p>
            </div>

            <div className="verifier-separator">
              <span className="separator-line"></span>
              <span className="separator-text">or</span>
              <span className="separator-line"></span>
            </div>

            {/* Hash Paste Form */}
            <form onSubmit={handleVerifyByHash} className="hash-paste-form">
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Paste document hash (0x...)"
                  value={verifyHash}
                  onChange={(e) => setVerifyHash(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-secondary w-full" style={{ padding: '8px 16px' }}>
                Verify
              </button>
            </form>

            {/* Result Box Rendering */}
            {searched && result && (
              <div className={`verify-result-box ${result.status}`}>
                {result.status === "success" ? (
                  <>
                    <div className="result-header">
                      <Icons.Check className="result-check-icon" />
                      <span className="result-verdict">Hash matches on-chain data</span>
                    </div>
                    <div className="result-details">
                      <div className="result-detail-row">
                        <span className="detail-label">Document:</span>
                        <span className="detail-value">{result.fileName}</span>
                      </div>
                      <div className="result-detail-row">
                        <span className="detail-label">Hash:</span>
                        <span className="detail-value font-mono">{result.hash}</span>
                      </div>
                      <div className="result-detail-row">
                        <span className="detail-label">Registered:</span>
                        <span className="detail-value">
                          {result.registeredDate} by {result.registeredBy}
                        </span>
                      </div>
                      <div className="result-detail-row">
                        <span className="detail-label">Attested:</span>
                        <span className="detail-value font-semibold">{result.attestedBy}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="result-header">
                      <Icons.X className="result-error-icon" />
                      <span className="result-verdict">Verification failed</span>
                    </div>
                    <div className="result-details">
                      <p className="text-xs text-muted" style={{ paddingLeft: '24px' }}>
                        No registered proof matching "{result.fileName}" was found on-chain.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
