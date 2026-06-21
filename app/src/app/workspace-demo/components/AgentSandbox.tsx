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
  permissionFileName?: string;
  pbcList: PbcItem[];
  setPbcList: React.Dispatch<React.SetStateAction<PbcItem[]>>;
  startResizeRight: (e: React.MouseEvent) => void;
  onGoToRegistry: () => void;
  isAgentThinking: boolean;
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
  permissionFileName = "",
  pbcList,
  setPbcList,
  startResizeRight,
  onGoToRegistry,
  isAgentThinking,
}: AgentSandboxProps) {
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog, isAgentThinking]);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [chatInput]);

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
            <div className="agent-activity-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
              <h3 className="agent-activity-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icons.Sparkles size={14} style={{ color: 'var(--accent-color)' }} />
                <span>Agent Sandbox</span>
              </h3>
              <button className="pane-toggle-btn" onClick={() => setIsAgentExpanded(false)} title="Collapse Agent Panel">
                <Icons.ChevronRight />
              </button>
            </div>

            {/* Chat sandbox box with inline activity logs */}
            <div className="agent-chat-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: 'none', paddingTop: 0, marginTop: 0 }}>
              <div className="chat-log-box" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', marginBottom: '8px' }}>
                {chatLog.map((chat, idx) => {
                  if (chat.sender === "activity") {
                    return (
                      <div key={idx} className="activity-in-chat-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '2px 0', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.3)', border: '1px solid rgba(255, 255, 255, 0.5)', borderRadius: '12px', boxShadow: 'var(--shadow-item)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                          <span className="onboarding-spin" style={{ display: 'inline-flex', animation: 'onboarding-rotate 1.5s linear infinite' }}>
                            <Icons.Sparkles size={10} style={{ color: 'var(--accent-color)' }} />
                          </span>
                          <span>AI Agent Activity Logs</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {chat.activityLogs?.map((log, lIdx) => {
                            const hasSubCards = log.subCards && log.subCards.length > 0;
                            return (
                              <div key={lIdx} className="activity-card-inline" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: '4px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span className={`activity-status-dot ${log.status}`} style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, backgroundColor: log.status === 'done' ? 'var(--success-color)' : log.status === 'running' ? 'var(--accent-color)' : 'var(--text-muted)', boxShadow: log.status === 'running' ? '0 0 4px rgba(37,99,235,0.5)' : undefined }} />
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{log.title}</span>
                                    </div>
                                    {log.desc && (
                                      <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', paddingLeft: '9px', wordBreak: 'break-word' }}>{log.desc}</span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: log.status === 'done' ? 'var(--success-color)' : log.status === 'running' ? 'var(--accent-color)' : 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}>
                                    {log.status === "done" ? "Done" : log.status === "running" ? "Running" : "Queued"}
                                  </span>
                                </div>
                                {hasSubCards && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '8px' }}>
                                    {log.subCards!.map((sub, sIdx) => (
                                      <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.4)', border: '1px solid rgba(255, 255, 255, 0.6)', borderRadius: '6px', padding: '3px 6px', fontSize: '9px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                                          <Icons.Robot />
                                          <span>{sub.title}</span>
                                        </div>
                                        <span style={{ fontWeight: 700, color: sub.status === 'done' ? 'var(--success-color)' : sub.status === 'running' ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                                          {sub.status === 'done' ? 'Completed' : sub.status === 'running' ? 'Running...' : 'Queued'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className={`chat-bubble ${chat.sender === "user" ? 'user' : 'agent'}`}>
                      {chat.sender === "agent" && (
                        <span style={{ fontWeight: 800, color: '#96948e', flexShrink: 0, marginTop: '2px', marginRight: '4px' }}>::</span>
                      )}
                      <div>{renderChatText(chat.text)}</div>
                    </div>
                  );
                })}
                {isAgentThinking && (
                  <div className="chat-bubble agent thinking" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="onboarding-spin" style={{ color: 'var(--accent-color)', display: 'inline-flex', animation: 'onboarding-rotate 1.5s linear infinite' }}>
                      <Icons.Sparkles size={14} />
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Linow is thinking...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
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
                      sui_execute_transaction --module evidence --action register --file {permissionFileName || "09_customer_contract_orion_C-ORION-2026-019.pdf"} --assertions ["Occurrence", "Accuracy"]
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
                        // Automatically update status for the target file to registered
                        const targetItem = pbcList.find(p => p.name === (permissionFileName || "09_customer_contract_orion_C-ORION-2026-019.pdf"));
                        if (targetItem) {
                          setPbcList(prev => prev.map(item =>
                            item.id === targetItem.id ? { ...item, status: "registered" as const } : item
                          ));
                        }
                      }
                    }}>
                      Submit ↵
                    </button>
                  </div>
                </div>
              )}

              {permissionSubmitted && permissionFileName && (
                <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Resolved: {permissionChoice === "allow" ? "Approved" : "Denied"}
                  </span>
                  <button className="btn-secondary text-xxs" style={{ padding: '2px 8px' }} onClick={() => setPermissionSubmitted(false)}>
                    Re-trigger Permission
                  </button>
                </div>
              )}

              <form onSubmit={handleSendChatMessage} className="agent-chat-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '6px 8px 6px 12px' }}>
                <textarea
                  ref={textareaRef}
                  className="agent-chat-input"
                  placeholder="Ask agent..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  rows={1}
                  style={{
                    resize: 'none',
                    minHeight: '20px',
                    maxHeight: '120px',
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    padding: '6px 36px 6px 0',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    lineHeight: '1.4',
                    outline: 'none',
                    overflowY: 'auto'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage(e);
                    }
                  }}
                />
                <button type="submit" className="agent-chat-send" style={{ position: 'absolute', right: '6px', bottom: '6px', top: 'auto', transform: 'none' }}>
                  <Icons.Send />
                </button>
              </form>
            </div>


          </>
        )}
      </section>
    </>
  );
}
