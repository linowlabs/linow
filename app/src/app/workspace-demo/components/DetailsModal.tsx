import React from "react";
import { Icons } from "../icons";
import { PbcItem, RegisterResult } from "../types";
import { ISA_ASSERTIONS, DOC_TYPES } from "../constants";

interface DetailsModalProps {
  selectedReviewFile: PbcItem;
  setSelectedReviewFile: (file: PbcItem | null) => void;
  pbcRegisteredData: Record<string, RegisterResult>;
  registerResult: RegisterResult | null;
  reviewDocType: string;
  setReviewDocType: (type: string) => void;
  reviewAssertions: string[];
  setReviewAssertions: React.Dispatch<React.SetStateAction<string[]>>;
  isRegistering: boolean;
  handleRegisterWeb3ForFile: (fileId: string, docType: string, assertions: string[]) => void;
  registerNotice: {
    tone: "success" | "error" | "info";
    title: string;
    message?: string;
  } | null;
}

export default function DetailsModal({
  selectedReviewFile,
  setSelectedReviewFile,
  pbcRegisteredData,
  registerResult,
  reviewDocType,
  setReviewDocType,
  reviewAssertions,
  setReviewAssertions,
  isRegistering,
  handleRegisterWeb3ForFile,
  registerNotice,
}: DetailsModalProps) {
  const isRegistered = selectedReviewFile.status === "registered" || !!pbcRegisteredData[selectedReviewFile.id];

  return (
    <div className="details-modal-overlay" onClick={() => setSelectedReviewFile(null)}>
      <div className="details-modal-content liquid-glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isRegistered ? "Registry Evidence Receipt" : "Review & Register Evidence"}
          </h3>
          <button className="modal-close-btn" onClick={() => setSelectedReviewFile(null)}>&times;</button>
        </div>

        <div className="modal-body">
          {registerNotice && (
            <div className={`register-notice ${registerNotice.tone}`}>
              <div className="register-notice-icon">
                {registerNotice.tone === "success" ? (
                  <Icons.Check size={13} />
                ) : registerNotice.tone === "error" ? (
                  <span>!</span>
                ) : (
                  <span>...</span>
                )}
              </div>
              <div>
                <strong>{registerNotice.title}</strong>
                {registerNotice.message && <p>{registerNotice.message}</p>}
              </div>
            </div>
          )}
          <div className="modal-section-grid">
            <div className="modal-form-side">
              <div className="modal-form-group">
                <label className="modal-label">Filename</label>
                <div className="modal-value-static font-semibold">{selectedReviewFile.name}</div>
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Agent Proposed Tag</label>
                <div className="modal-value-static glass-tag-badge" style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>
                  <Icons.Sparkles size={11} style={{ marginRight: '6px' }} />
                  <span>{selectedReviewFile.agentTag || "Classified Document"}</span>
                </div>
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Select Document Type</label>
                <select
                  className="form-input w-full"
                  value={reviewDocType}
                  disabled={isRegistered}
                  onChange={(e) => setReviewDocType(e.target.value)}
                >
                  {DOC_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="modal-form-group">
                <label className="modal-label">ISA Assertions (Audit-readiness Proposal)</label>
                <div className="assertions-checkbox-grid">
                  {ISA_ASSERTIONS.map(assertion => {
                    const isChecked = reviewAssertions.includes(assertion);
                    const isDisabled = isRegistered;
                    return (
                      <label key={assertion} className={`checkbox-chip-label ${isChecked ? "checked" : ""} ${isDisabled ? "disabled" : ""}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReviewAssertions(prev => [...prev, assertion]);
                            } else {
                              setReviewAssertions(prev => prev.filter(a => a !== assertion));
                            }
                          }}
                        />
                        <span>{assertion}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-receipt-side">
              <label className="modal-label">Sui & Walrus Artifacts</label>
              {isRegistered ? (
                <div className="receipt-console-details">
                  <div className="proof-console-row">
                    <span className="proof-console-label">Sui Object ID</span>
                    <span className="proof-console-value text-accent font-mono font-semibold" style={{ wordBreak: 'break-all' }}>
                      {pbcRegisteredData[selectedReviewFile.id]?.objectId || registerResult?.objectId || "0x9ac2849e7dd55a12b234d98a7c1b52a30f9e41f0"}
                    </span>
                  </div>
                  <div className="proof-console-row">
                    <span className="proof-console-label">Walrus Blob reference</span>
                    <span className="proof-console-value">
                      {pbcRegisteredData[selectedReviewFile.id]?.blobId || registerResult?.blobId || "walrus-blob-reference"}
                    </span>
                  </div>
                  <div className="proof-console-row">
                    <span className="proof-console-label">Evidence Commitment hash</span>
                    <span className="proof-console-value">
                      {pbcRegisteredData[selectedReviewFile.id]?.commitment || registerResult?.commitment || "commitment-hash"}
                    </span>
                  </div>
                  <div className="proof-console-row">
                    <span className="proof-console-label">Transaction digest</span>
                    <span className="proof-console-value">
                      {pbcRegisteredData[selectedReviewFile.id]?.txDigest || registerResult?.txDigest || "18 Jun, 14:02"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="receipt-console-empty">
                  <p className="text-xs text-muted text-center">
                    Confirm assertions and submit the transaction block to register on-chain and generate Sui artifacts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setSelectedReviewFile(null)}>
            {isRegistered ? "Close" : "Cancel"}
          </button>
          {!isRegistered && (
            <button
              className="btn-register"
              disabled={isRegistering}
              onClick={() => handleRegisterWeb3ForFile(selectedReviewFile.id, reviewDocType, reviewAssertions)}
            >
              {isRegistering ? "Registering..." : "Register to Sui & Walrus"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
