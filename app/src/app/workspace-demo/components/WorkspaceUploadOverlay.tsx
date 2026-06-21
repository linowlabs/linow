import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Icons } from "../icons";

interface WorkspaceUploadOverlayProps {
  companyName: string;
  onInitialize: (folderName: string, isZip: boolean) => void;
}

export default function WorkspaceUploadOverlay({
  companyName,
  onInitialize,
}: WorkspaceUploadOverlayProps) {
  const [step, setStep] = useState(1);
  const [folderName, setFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulated upload progress timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading) {
      interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      setStep(2);
    }
  };

  const startMockUpload = (fileName: string) => {
    setUploadedFile(fileName);
    setIsUploading(true);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      startMockUpload(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      startMockUpload(file.name);
    } else {
      // Fallback fallback mock file
      startMockUpload("linow_compliance_pack.zip");
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInitialize = () => {
    if (uploadedFile && folderName.trim()) {
      const isZip = uploadedFile.toLowerCase().endsWith(".zip");
      onInitialize(folderName.trim(), isZip);
    }
  };

  return (
    <div className="workspace-upload-overlay">
      <div className="upload-overlay-card">
        
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

        {/* STEP 1: CREATE COMPLIANCE FOLDER */}
        {step === 1 && (
          <>
            <h2 className="upload-overlay-title">
              Welcome to Linow Workspace, <strong>{companyName}</strong>
            </h2>
            <p className="upload-overlay-desc">
              Let's start by setting up your first folder. Choose a name that fits your compliance goals, and you will be ready to upload your files into your secure sandbox.
            </p>

            <form onSubmit={handleCreateFolder} className="upload-input-group">
              <label className="upload-input-label">Folder Name</label>
              <input
                type="text"
                className="upload-overlay-input"
                placeholder="e.g. Financial Reports, IT Security Policies"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
              />
              
              <button
                type="submit"
                className="upload-action-btn"
                style={{ marginTop: "12px" }}
                disabled={!folderName.trim()}
              >
                Create Folder
              </button>
            </form>
          </>
        )}

        {/* STEP 2: UPLOAD DOCUMENTS / ZIP */}
        {step === 2 && (
          <>
            <h2 className="upload-overlay-title">
              Upload files to <strong>{folderName}</strong>
            </h2>
            <p className="upload-overlay-desc">
              Drag and drop your documents here. You can upload individual files or a compressed archive like a ZIP file. Your data will be securely processed and stored using Walrus and Sui.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept=".pdf,.xlsx,.csv,.docx,.zip"
            />

            {/* DRAG AND DROP ZONE */}
            {!uploadedFile ? (
              <div
                className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
              >
                <div className="upload-dropzone-icon">
                  <Icons.Upload size={20} />
                </div>
                <div className="upload-dropzone-text">
                  Drop PDF, Excel, Word, or ZIP files here
                </div>
                <div className="upload-dropzone-subtext">
                  or click to select files from your computer
                </div>
              </div>
            ) : (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                
                {/* FILE UPLOAD CARD */}
                <div className="upload-file-row">
                  <div className="upload-file-info">
                    {uploadedFile.toLowerCase().endsWith(".zip") ? (
                      <Icons.BoxChain />
                    ) : (
                      <Icons.Robot />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{uploadedFile}</span>
                      <span className="upload-file-size">1.4 MB</span>
                    </div>
                  </div>

                  <div className="upload-file-status">
                    {isUploading ? (
                      <span className="onboarding-spin" style={{ color: "var(--accent-color)" }}>
                        <Icons.Sparkles size={12} />
                      </span>
                    ) : (
                      <>
                        <Icons.Check size={11} />
                        <span>Ready</span>
                      </>
                    )}
                  </div>
                </div>

                {/* PROGRESS TRACKER */}
                {isUploading && (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div className="upload-progress-container">
                      <div
                        className="upload-progress-bar"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>
                      <span>Uploading compliance evidence...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                  </div>
                )}

                {/* BYPASS SHORTCUT TO MOCK OTHER FILE */}
                {!isUploading && (
                  <div 
                    onClick={triggerFileSelect}
                    style={{ fontSize: "11px", color: "var(--accent-color)", cursor: "pointer", fontWeight: 700, textDecoration: "underline", textAlign: "right" }}
                  >
                    Select different file
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="upload-action-btn"
              onClick={handleInitialize}
              disabled={!uploadedFile || isUploading}
              style={{ marginTop: "12px" }}
            >
              Upload and Initialize Workspace
            </button>
          </>
        )}

      </div>
    </div>
  );
}
