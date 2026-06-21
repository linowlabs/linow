import React from "react";
import { Icons } from "../icons";
import { ActivityLog, ChatLogItem, PbcItem } from "../types";
import { renderChatText } from "../constants";

interface AgentSandboxProps {
  isAgentExpanded: boolean;
  setIsAgentExpanded: (expanded: boolean) => void;
  agentWidth: number;
  activityLogs: ActivityLog[];
  setActivityLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  chatLog: ChatLogItem[];
  setChatLog: React.Dispatch<React.SetStateAction<ChatLogItem[]>>;
  chatInput: string;
  setChatInput: (input: string) => void;
  handleSendChatMessage: (e: React.FormEvent) => void;
  permissionChoice: "allow" | "always" | "no";
  setPermissionChoice: (choice: "allow" | "always" | "no") => void;
  permissionSubmitted: boolean;
  setPermissionSubmitted: (submitted: boolean) => void;
  pbcList: PbcItem[];
  setPbcList: React.Dispatch<React.SetStateAction<PbcItem[]>>;
  startResizeRight: (e: React.MouseEvent) => void;
  onGoToRegistry: () => void;
}

export default function AgentSandbox({
  isAgentExpanded,
  setIsAgentExpanded,
  agentWidth,
  activityLogs,
  setActivityLogs,
  chatLog,
  setChatLog,
  chatInput,
  setChatInput,
  handleSendChatMessage,
  permissionChoice,
  setPermissionChoice,
  permissionSubmitted,
  setPermissionSubmitted,
  pbcList,
  setPbcList,
  startResizeRight,
  onGoToRegistry,
}: AgentSandboxProps) {
  return (
    <>
      {isAgentExpanded ? (
        <div className="resize-handle" onMouseDown={startResizeRight} />
      ) : (
        <div className="pane-gap-divider" />
      )}

      <section 
        className={`workspace-pane pane-agent ${!isAgentExpanded ? 'collapsed' : ''}`}
        style={{ width: isAgentExpanded ? `${agentWidth}px` : '52px' }}
      >
        {!isAgentExpanded ? (
          <>
            <button className="pane-toggle-btn" onClick={() => setIsAgentExpanded(true)} title="Expand Agent Panel">
              <Icons.ChevronLeft />
            </button>
            <div className="pane-collapsed-indicator">Agent Activity</div>
          </>
        ) : (
          <>
            <div className="agent-activity-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="agent-activity-title">Agent activity</h3>
              <button className="pane-toggle-btn" onClick={() => setIsAgentExpanded(false)} title="Collapse Agent Panel">
                <Icons.ChevronRight />
              </button>
            </div>

            <div className="agent-activity-feed">
              {activityLogs.map((log, idx) => (
                <div key={idx} className="activity-card">
                  <div className="activity-card-left">
                    <span className={`activity-status-dot ${log.status}`} />
                    <span className="activity-card-name" style={{ marginRight: 4 }}>{log.title}</span>
                    <span className="activity-card-desc">{log.desc}</span>
                  </div>
                  <span className={`activity-status-badge ${log.status}`}>
                    {log.status === "done" ? "Done" : log.status === "running" ? "Running" : "Queued"}
                  </span>
                </div>
              ))}
            </div>

            {/* Chat sandbox box with prompt-anchored permission popup */}
            <div className="agent-chat-container">
              <div className="chat-log-box">
                {chatLog.map((chat, idx) => (
                  <div key={idx} className={`chat-bubble ${chat.sender === "user" ? 'user' : 'agent'}`}>
                    {chat.sender === "agent" && (
                      <span style={{ fontWeight: 800, color: '#96948e', flexShrink: 0, marginTop: '2px', marginRight: '4px' }}>::</span>
                    )}
                    <div>{renderChatText(chat.text)}</div>
                  </div>
                ))}
              </div>

              {/* Sandbox Prompt-Anchored Permission Sheet */}
              {!permissionSubmitted && (
                <div className="permission-popup-sheet">
                  <div className="permission-popup-header">
                    <span className="terminal-icon">$_</span>
                    <span>Allow running this command?</span>
                  </div>

                  <div className="permission-command-box">
                    <code>
                      sui_execute_transaction --module evidence --action register --file 09_customer_contract_orion_C-ORION-2026-019.pdf --assertions ["Occurrence", "Accuracy"]
                    </code>
                  </div>

                  <div className="permission-options-list">
                    {[
                      { id: "allow", title: "1. Yes, allow this time", desc: "Allow single execution" },
                      { id: "no", title: "2. No (cancel transaction)", desc: "Deny execution request" }
                    ].map(opt => (
                      <div
                        key={opt.id}
                        className={`permission-option-row ${permissionChoice === opt.id ? "active" : ""}`}
                        onClick={() => setPermissionChoice(opt.id as any)}
                      >
                        <span>{opt.title}</span>
                        <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: 400 }}>{opt.desc}</span>
                      </div>
                    ))}
                  </div>

                  <div className="permission-popup-actions">
                    <button type="button" className="permission-btn-skip" onClick={() => alert("Skipped permission step")}>
                      Skip
                    </button>
                    <button type="button" className="permission-btn-submit" onClick={() => {
                      setPermissionSubmitted(true);
                      setActivityLogs(prev => [
                        ...prev,
                        { title: "Verifying rule", desc: `Sandbox permission resolved: ${permissionChoice}`, status: "done" }
                      ]);
                      if (permissionChoice === "no") {
                        setChatLog(prev => [...prev, { sender: "agent", text: "Transaction execution **denied** by user. Tatum RPC aborted." }]);
                      } else {
                        setChatLog(prev => [
                          ...prev,
                          { sender: "agent", text: `Transaction execution **approved** via sandbox (allow this time). sui_execute_transaction completed.` }
                        ]);
                        // Automatically update status for 09_customer_contract_orion_C-ORION-2026-019.pdf to registered
                        const updatedPbc = pbcList.map(item =>
                          item.id === "pbc-orion-contract" ? { ...item, status: "registered" as const } : item
                        );
                        setPbcList(updatedPbc);
                      }
                    }}>
                      Submit ↵
                    </button>
                  </div>
                </div>
              )}

              {permissionSubmitted && (
                <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Resolved: {permissionChoice === "allow" ? "Approved" : "Denied"}
                  </span>
                  <button className="btn-secondary text-xxs" style={{ padding: '2px 8px' }} onClick={() => setPermissionSubmitted(false)}>
                    Re-trigger Permission
                  </button>
                </div>
              )}

              <form onSubmit={handleSendChatMessage} className="agent-chat-input-wrapper">
                <input
                  type="text"
                  className="agent-chat-input"
                  placeholder="Ask agent..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="agent-chat-send">
                  <Icons.Send />
                </button>
              </form>
            </div>

            {/* Scroll down trigger for Web3 registry */}
            <div className="workspace-footer">
              <button className="scroll-down-btn" onClick={onGoToRegistry} title="Go to Web3 Registry">
                <Icons.ChevronDown />
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
