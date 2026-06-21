import React from "react";
import Image from "next/image";
import { Icons } from "../icons";

interface LoginGatewayProps {
  wallet: {
    address?: string;
    connectButton: React.ReactNode;
  };
  selectedRole: "company" | "auditor";
  setSelectedRole: (role: "company" | "auditor") => void;
  handleLogin: (role: "company" | "auditor") => void;
  onConnectDemoWallet?: () => void;
}

export default function LoginGateway({
  wallet,
  selectedRole,
  setSelectedRole,
  handleLogin,
  onConnectDemoWallet,
}: LoginGatewayProps) {
  return (
    <div className="demo-wrapper login-gateway-bg">
      <div className="login-container">

        {/* Left Branding Side (Outside Panel) */}
        <div className="login-branding-side">
          <div className="branding-logo-box">
            <Image
              src="/linow-logo.svg"
              alt="Linow Logo"
              width={60}
              height={60}
              style={{ objectFit: "contain" }}
            />
          </div>
          <h1 className="branding-title">Linow Workspace</h1>
          <p className="branding-subtitle">
            Persistent Audit Memory for AI Agents on Walrus + Sui
          </p>
        </div>

        {/* Right Auth Card Side */}
        <div className="login-card-side">
          <div className="liquid-glass login-card">
            <h2 className="login-panel-title">Select Your Workspace Role</h2>
            <p className="login-panel-subtitle">Select how you would like to enter the workspace</p>

            <div className="role-selector">
              <div
                className={`role-option ${selectedRole === "company" ? "active" : ""}`}
                onClick={() => setSelectedRole("company")}
              >
                <div className="role-icon">
                  <Icons.Robot />
                </div>
                <div className="role-name">Company</div>
                <div className="role-desc">Prepare Data & Manage Compliance</div>
              </div>
              <div
                className={`role-option ${selectedRole === "auditor" ? "active" : ""}`}
                onClick={() => setSelectedRole("auditor")}
              >
                <div className="role-icon">
                  <Icons.Shield />
                </div>
                <div className="role-name">Auditor</div>
                <div className="role-desc">Verify Evidence & Issue Attestation</div>
              </div>
            </div>

            <div className="login-wallet-section">
              {wallet.address ? (
                <div>
                  <p className="text-xs text-secondary" style={{ marginBottom: "14px" }}>
                    Connected Wallet: <span className="font-mono font-semibold">{wallet.address.substring(0, 10)}...</span>
                  </p>
                  <button className="btn-primary w-full" onClick={() => handleLogin(selectedRole)}>
                    Enter Workspace
                  </button>
                </div>
              ) : (
                <div className="flex-center" style={{ flexDirection: "column", gap: "10px" }}>
                  {wallet.connectButton}
                  {onConnectDemoWallet && (
                    <button
                      type="button"
                      className="btn-secondary w-full"
                      style={{
                        fontSize: "11px",
                        padding: "8px 12px",
                        background: "rgba(255, 255, 255, 0.25)",
                        border: "1px dashed rgba(0, 0, 0, 0.15)",
                        fontWeight: "600",
                        marginTop: "4px"
                      }}
                      onClick={onConnectDemoWallet}
                    >
                      Use Demo Wallet (Bypass)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
