import React from "react";
import { Icons } from "../icons";
import { Finding } from "../types";

interface AuditorFindingsProps {
  isAgentExpanded: boolean;
  setIsAgentExpanded: (expanded: boolean) => void;
  agentWidth: number;
  auditorFindings: Finding[];
  isAttesting: boolean;
  handleAuditorAttest: (findingId: string) => void;
  startResizeRight: (e: React.MouseEvent) => void;
}

export default function AuditorFindings({
  isAgentExpanded,
  setIsAgentExpanded,
  agentWidth,
  auditorFindings,
  isAttesting,
  handleAuditorAttest,
  startResizeRight,
}: AuditorFindingsProps) {
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
            <button className="pane-toggle-btn" onClick={() => setIsAgentExpanded(true)} title="Expand Findings Panel">
              <Icons.ChevronLeft />
            </button>
            <div className="pane-collapsed-indicator">Findings</div>
          </>
        ) : (
          <>
            <div className="agent-activity-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="agent-activity-title">Agent Findings (ISA 500)</h3>
              <button className="pane-toggle-btn" onClick={() => setIsAgentExpanded(false)} title="Collapse Findings Panel">
                <Icons.ChevronRight />
              </button>
            </div>
            <div className="auditor-findings-panel">
              {auditorFindings.map(finding => (
                <div key={finding.id} className="finding-card severity-medium">
                  <div className="finding-header">
                    <span className="finding-title">{finding.title}</span>
                    <span className="finding-badge medium">{finding.severity}</span>
                  </div>
                  <div className="finding-body">
                    <div className="finding-element">
                      <span className="finding-element-label">Condition:</span>
                      <div>{finding.condition}</div>
                    </div>
                    <div className="finding-element">
                      <span className="finding-element-label">Criteria:</span>
                      <div>{finding.criteria}</div>
                    </div>
                    <div className="finding-element">
                      <span className="finding-element-label">Recommendation:</span>
                      <div>{finding.recommendation}</div>
                    </div>
                  </div>
                  <div className="finding-actions">
                    {finding.status === "draft" ? (
                      <button
                        className="btn-primary text-xxs"
                        disabled={isAttesting}
                        onClick={() => handleAuditorAttest(finding.id)}
                      >
                        {isAttesting ? "Processing Attestation..." : "Approve & Attest to Sui"}
                      </button>
                    ) : (
                      <div className="attestation-committed-box">
                        <span className="attestation-success-tag">
                          <Icons.Check /> Attestation Committed
                        </span>
                        <div className="attestation-digest-block">
                          Tx Digest: {finding.txDigest}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
