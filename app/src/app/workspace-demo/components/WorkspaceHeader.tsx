import React, { useState, useEffect } from "react";
import Image from "next/image";

export interface OnboardingResult {
  industry: string;
  regions: string[];
  goal: "B2B" | "Regulation" | "Financial";
  frameworks: string[];
  orgName: string;
}

interface WorkspaceHeaderProps {
  registeredCount: number;
  totalCount: number;
  wallet: {
    address?: string;
    connectButton: React.ReactNode;
  };
  onboardingSelections?: OnboardingResult | null;
}

export default function WorkspaceHeader({
  registeredCount,
  totalCount,
  wallet,
  onboardingSelections,
}: WorkspaceHeaderProps) {
  const [zoom, setZoom] = useState(100);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    const scale = zoom / 100;
    document.documentElement.style.setProperty("--workspace-zoom", scale.toString());
  }, [zoom]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setIsZoomOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const handleZoomSelect = (level: number) => {
    setZoom(level);
    setIsZoomOpen(false);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "AC";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const companyName = onboardingSelections?.orgName || "Acme Corp";
  const initials = getInitials(companyName);

  const getGoalLabel = (goal?: string) => {
    switch (goal) {
      case "B2B":
        return "B2B Readiness";
      case "Regulation":
        return "Regulatory Compliance";
      case "Financial":
        return "Financial Audit";
      default:
        return "Q2 2026 Audit";
    }
  };

  const displayEngagement = `${companyName} / ${getGoalLabel(onboardingSelections?.goal)}`;

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-dropdown-pill">
          <Image
            src="/linow-logo.svg"
            alt="Linow Logo"
            width={20}
            height={20}
            style={{ objectFit: "contain", marginRight: 4 }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.1px",
              marginRight: 2,
            }}
          >
            Linow Workspace
          </span>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <span
              className="header-zoom-pill"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomOpen(!isZoomOpen);
              }}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              Z {zoom}%
            </span>
            {isZoomOpen && (
              <div className="zoom-dropdown">
                <div
                  className={`zoom-option ${zoom === 100 ? "active" : ""}`}
                  onClick={() => handleZoomSelect(100)}
                >
                  100%
                </div>
                <div
                  className={`zoom-option ${zoom === 75 ? "active" : ""}`}
                  onClick={() => handleZoomSelect(75)}
                >
                  75%
                </div>
                <div
                  className={`zoom-option ${zoom === 50 ? "active" : ""}`}
                  onClick={() => handleZoomSelect(50)}
                >
                  50%
                </div>
                <div
                  className={`zoom-option ${zoom === 25 ? "active" : ""}`}
                  onClick={() => handleZoomSelect(25)}
                >
                  25%
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="header-dropdown-pill" style={{ marginLeft: 6 }}>
          <div className="header-profile-avatar">{initials}</div>
          <span>{displayEngagement}</span>
        </div>
      </div>
      <div className="header-actions">
        {wallet.address && (
          <div className="wallet-connected-status">
            <span className="wallet-status-dot"></span>
            <span>Connected</span>
          </div>
        )}
        <div className="wallet-connect-shell">{wallet.connectButton}</div>
      </div>
    </header>
  );
}
