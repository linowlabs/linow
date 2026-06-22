import React from "react";
import Image from "next/image";

interface WorkspaceUploadOverlayProps {
  companyName: string;
  onInitialize: (folderName: string, isZip: boolean) => void;
}

export default function WorkspaceUploadOverlay({
  companyName,
  onInitialize,
}: WorkspaceUploadOverlayProps) {
  const handleEnterWorkspace = () => {
    // Call with dummy arguments to maintain prop types compatibility
    onInitialize("", false);
  };

  return (
    <div className="workspace-upload-overlay">
      <div className="upload-overlay-card" style={{ padding: "36px 32px", maxWidth: "440px" }}>
        
        {/* LOGO BOX */}
        <div className="upload-logo-box">
          <Image
            src="/linow-logo.svg"
            alt="Linow Logo"
            width={24}
            height={24}
            style={{ objectFit: "contain" }}
          />
        </div>

        <h2 className="upload-overlay-title" style={{ fontSize: "21px" }}>
          Welcome to Linow Workspace, <strong>{companyName}</strong>
        </h2>
        
        <p className="upload-overlay-desc" style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)", margin: "8px 0 12px" }}>
          Your secure sandbox workspace has been successfully initialized. You are ready to configure your folders, upload audit evidence documents, and run active compliance validation scans.
        </p>

        <button
          type="button"
          className="upload-action-btn"
          onClick={handleEnterWorkspace}
          style={{ marginTop: "8px" }}
        >
          Enter Workspace
        </button>

      </div>
    </div>
  );
}
