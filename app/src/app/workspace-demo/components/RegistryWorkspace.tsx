import React, { useState } from "react";
import { Icons } from "../icons";
import { PbcItem, RegisterResult } from "../types";

interface RegistryWorkspaceProps {
  pbcList: PbcItem[];
  pbcRegisteredData: Record<string, RegisterResult>;
  registerResult: RegisterResult | null;
  setSelectedReviewFile: (file: PbcItem | null) => void;
  setReviewDocType: (type: string) => void;
  setReviewAssertions: (assertions: string[]) => void;
  handleRegisterBatch: (fileIds: string[]) => Promise<void>;
  registerNotice: {
    tone: "success" | "error" | "info";
    title: string;
    message?: string;
  } | null;
}

export default function RegistryWorkspace({
  pbcList,
  pbcRegisteredData,
  registerResult,
  setSelectedReviewFile,
  setReviewDocType,
  setReviewAssertions,
  handleRegisterBatch,
  registerNotice,
}: RegistryWorkspaceProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const draftItems = pbcList.filter(
    (p) => p.status !== "registered" && !pbcRegisteredData[p.id]
  );

  const handleToggleSelectFile = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === draftItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draftItems.map((item) => item.id)));
    }
  };

  const isAllSelected =
    draftItems.length > 0 && selectedIds.size === draftItems.length;

  const handleRegisterBatchClick = async () => {
    if (selectedIds.size === 0) return;
    await handleRegisterBatch(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <main className="workspace-container registry-workspace">
      <div className="registry-header-bar">
        <div className="registry-title-section">
          <div className="registry-breadcrumb">
            <span className="breadcrumb-main">Acme Corp</span>
            <span className="breadcrumb-arrow">/</span>
            <span className="breadcrumb-sub">Q2 2026 Audit</span>
            <span className="breadcrumb-arrow">/</span>
            <span className="breadcrumb-mode">Registry Workspace</span>
          </div>
        </div>
      </div>

      {registerNotice && (
        <div className={`register-notice registry-register-notice ${registerNotice.tone}`}>
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

      {/* Kanban Board Container */}
      <div className="registry-kanban-board">
        {/* Column 1: Draft */}
        <div className="kanban-column">
          <div
            className="kanban-column-header"
            style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span className="kanban-column-title">Draft</span>
              <span className="kanban-column-count">{draftItems.length}</span>
            </div>
            {draftItems.length > 0 && (
              <div
                className="batch-actions-bar"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0 2px",
                  borderTop: "1px solid rgba(0, 0, 0, 0.05)",
                }}
              >
                <div
                  className="batch-select-label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={handleToggleSelectAll}
                >
                  <div className={`glass-checkbox ${isAllSelected ? "checked" : ""}`}>
                    {isAllSelected && <Icons.Check size={9} />}
                  </div>
                  <span>Select All</span>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    className="btn-register"
                    style={{
                      padding: "4px 10px",
                      fontSize: "10px",
                      borderRadius: "6px",
                    }}
                    onClick={handleRegisterBatchClick}
                  >
                    Register Batch ({selectedIds.size})
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="kanban-cards-list">
            {draftItems.map((item) => (
              <div
                key={item.id}
                className="kanban-card draft-card compact-card"
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  className={`glass-checkbox ${
                    selectedIds.has(item.id) ? "checked" : ""
                  }`}
                  onClick={() => handleToggleSelectFile(item.id)}
                >
                  {selectedIds.has(item.id) && <Icons.Check size={9} />}
                </div>
                <div className="compact-card-left">
                  <div className="compact-card-row-top">
                    <span className="kanban-card-filename">{item.name}</span>
                    <span className="kanban-card-type">{item.type.toUpperCase()}</span>
                  </div>
                  <div className="compact-card-row-bottom">
                    <span className="kanban-card-hash-status negative inset-badge">
                      Not hashed
                    </span>
                    {item.agentTag && (
                      <span className="kanban-card-agent-tag glass-tag-badge">
                        <Icons.Sparkles
                          size={9}
                          style={{
                            marginRight: "3.5px",
                            display: "inline-block",
                            verticalAlign: "middle",
                          }}
                        />
                        <span style={{ verticalAlign: "middle" }}>
                          {item.agentTag}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="compact-card-right">
                  <button
                    className="btn-register"
                    onClick={() => {
                      setSelectedReviewFile(item);
                      setReviewDocType(item.type);
                      setReviewAssertions(
                        item.agentAssertions || ["Occurrence", "Accuracy"]
                      );
                    }}
                  >
                    Register
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Registered */}
        <div className="kanban-column">
          <div className="kanban-column-header">
            <span className="kanban-column-title">Registered</span>
            <span className="kanban-column-count">
              {pbcList.filter(
                (p) => p.status === "registered" || pbcRegisteredData[p.id]
              ).length}
            </span>
          </div>
          <div className="kanban-cards-list">
            {pbcList
              .filter((p) => p.status === "registered" || pbcRegisteredData[p.id])
              .map((item) => {
                const regData = pbcRegisteredData[item.id] || registerResult;
                const displayHash = regData?.objectId
                  ? `${regData.objectId.substring(
                      0,
                      6
                    )}...${regData.objectId.substring(
                      regData.objectId.length - 4
                    )}`
                  : "0x9ac2...41f0";
                const displayDate = regData?.txDigest || "18 Jun, 14:02";

                return (
                  <div
                    key={item.id}
                    className="kanban-card registered-card compact-card"
                  >
                    <div className="compact-card-left">
                      <div className="compact-card-row-top">
                        <span className="kanban-card-filename">{item.name}</span>
                        <span className="kanban-card-type">
                          {item.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="compact-card-row-bottom">
                        <span className="kanban-card-hash-status positive">
                          {displayHash}
                        </span>
                        {item.agentTag && (
                          <span className="kanban-card-agent-tag glass-tag-badge">
                            <Icons.Sparkles
                              size={9}
                              style={{
                                marginRight: "3.5px",
                                display: "inline-block",
                                verticalAlign: "middle",
                              }}
                            />
                            <span style={{ verticalAlign: "middle" }}>
                              {item.agentTag}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="compact-card-right"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        justifyContent: "center",
                      }}
                    >
                      <span className="kanban-card-date">{displayDate}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Review Queue */}
      <div className="registry-review-section">
        <div className="registry-review-header">
          <h4 className="registry-review-title">Agent Sorted & Ready to Registry</h4>
          <p className="registry-review-subtitle">
            Review and confirm classification tags and ISA assertions proposed by AI
            agent before committing on-chain.
          </p>
        </div>
        <div className="review-queue-container">
          <table className="review-queue-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Agent Proposed Tag</th>
                <th>Evidence Type</th>
                <th>Assertions</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pbcList.map((item) => {
                const isRegistered =
                  item.status === "registered" || !!pbcRegisteredData[item.id];
                const agentTag =
                  item.agentTag ||
                  (item.analyzed ? "Classified Document" : "Pending Analysis");
                const assertions =
                  item.agentAssertions || ["Occurrence", "Accuracy"];

                return (
                  <tr
                    key={item.id}
                    className={isRegistered ? "row-registered" : "row-draft"}
                  >
                    <td className="col-filename">
                      <span className="file-icon-bullet">📄</span>
                      {item.name}
                    </td>
                    <td className="col-tag">
                      <span className="tag-badge glass-tag-badge">
                        <Icons.Sparkles
                          size={9}
                          style={{
                            marginRight: "4px",
                            display: "inline-block",
                            verticalAlign: "middle",
                          }}
                        />
                        <span style={{ verticalAlign: "middle" }}>
                          {agentTag}
                        </span>
                      </span>
                    </td>
                    <td className="col-type">{item.type.toUpperCase()}</td>
                    <td className="col-assertions">
                      <div className="assertions-list">
                        {assertions.map((a) => (
                          <span key={a} className="assertion-chip">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="col-status">
                      <span
                        className={`status-dot-badge ${
                          isRegistered ? "registered" : "draft"
                        }`}
                      >
                        <span className="status-dot"></span>
                        {isRegistered ? "Registered" : "Draft"}
                      </span>
                    </td>
                    <td className="col-actions" style={{ textAlign: "right" }}>
                      <button
                        className="btn-secondary text-xxs"
                        style={{ padding: "6px 12px" }}
                        onClick={() => {
                          setSelectedReviewFile(item);
                          setReviewDocType(item.type);
                          setReviewAssertions(
                            item.agentAssertions || ["Occurrence", "Accuracy"]
                          );
                        }}
                      >
                        {isRegistered ? "Details (View)" : "Details (Review)"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
