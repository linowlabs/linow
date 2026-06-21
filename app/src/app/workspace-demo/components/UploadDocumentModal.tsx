import React, { useState, useEffect, useRef } from "react";
import { Icons } from "../icons";

interface UploadDocumentModalProps {
  folders: string[];
  defaultFolder: string;
  onClose: () => void;
  onAdd: (name: string, folder: string, size: string) => void;
}

export default function UploadDocumentModal({
  folders,
  defaultFolder,
  onClose,
  onAdd,
}: UploadDocumentModalProps) {
  const [docName, setDocName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(defaultFolder || "");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileSizeStr, setFileSizeStr] = useState("1.2 MB");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-sync select target folder if defaultFolder changes
  useEffect(() => {
    if (defaultFolder) {
      setSelectedFolder(defaultFolder);
    }
  }, [defaultFolder]);

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

  const startMockUpload = (file: File) => {
    setUploadedFile(file.name);
    // Auto-fill document name if empty
    if (!docName.trim()) {
      setDocName(file.name);
    }
    
    // Pretty format size
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = parseFloat(sizeMB) > 0.1 ? `${sizeMB} MB` : `${(file.size / 1024).toFixed(0)} KB`;
    setFileSizeStr(sizeStr);

    setIsUploading(true);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      startMockUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startMockUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (docName.trim() && selectedFolder && uploadedFile && !isUploading) {
      onAdd(docName.trim(), selectedFolder, fileSizeStr);
    }
  };

  // Helper to format folder path for friendly dropdown display
  const getFolderLabel = (path: string) => {
    const parts = path.split("/");
    const lastPart = parts[parts.length - 1];
    // Pretty up display names
    if (lastPart === "01_financial_reports") return "01_financial_reports";
    if (lastPart === "02_contracts_invoices") return "02_contracts_invoices";
    if (lastPart === "03_delivery_cutoff") return "03_delivery_cutoff";
    if (lastPart === "04_bank_cash_receipts") return "04_bank_cash_receipts";
    return lastPart;
  };

  return (
    <div className="workspace-upload-overlay" style={{ zIndex: 11000 }}>
      <div className="upload-overlay-card">
        
        {/* CLOSE BUTTON */}
        <button 
          onClick={onClose}
          className="modal-close-btn"
          style={{ position: "absolute", top: "18px", right: "18px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
        >
          <Icons.X size={18} />
        </button>

        {/* LOGO BOX */}
        <div className="upload-logo-box" style={{ color: "var(--accent-color)" }}>
          <Icons.Upload size={20} />
        </div>

        <h2 className="upload-overlay-title">
          Add Compliance Document
        </h2>
        <p className="upload-overlay-desc" style={{ marginBottom: "4px" }}>
          Select a compliance file to upload and choose the target directory folder inside your workspace tree.
        </p>

        <form onSubmit={handleSubmit} className="upload-input-group" style={{ gap: "14px" }}>
          
          {/* FILE DROPZONE */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept=".pdf,.xlsx,.csv,.docx"
          />

          {!uploadedFile ? (
            <div
              className="upload-dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              style={{ padding: "20px 14px", minHeight: "120px" }}
            >
              <div className="upload-dropzone-icon" style={{ width: "32px", height: "32px" }}>
                <Icons.Upload size={16} />
              </div>
              <div className="upload-dropzone-text" style={{ fontSize: "12px" }}>
                Drop PDF, Excel, or CSV files here
              </div>
              <div className="upload-dropzone-subtext" style={{ fontSize: "10.5px" }}>
                or click to browse local files
              </div>
            </div>
          ) : (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="upload-file-row" style={{ padding: "8px 12px", borderRadius: "10px" }}>
                <div className="upload-file-info" style={{ gap: "8px" }}>
                  <Icons.FileText />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {uploadedFile}
                    </span>
                    <span className="upload-file-size" style={{ fontSize: "10px" }}>{fileSizeStr}</span>
                  </div>
                </div>

                <div className="upload-file-status" style={{ fontSize: "11px" }}>
                  {isUploading ? (
                    <span className="onboarding-spin" style={{ color: "var(--accent-color)" }}>
                      <Icons.Sparkles size={11} />
                    </span>
                  ) : (
                    <>
                      <Icons.Check size={10} />
                      <span>Ready</span>
                    </>
                  )}
                </div>
              </div>

              {isUploading && (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div className="upload-progress-container" style={{ height: "4px" }}>
                    <div
                      className="upload-progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>
                    <span>Processing file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENT NAME */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label className="upload-input-label">Document Display Name</label>
            <input
              type="text"
              className="upload-overlay-input"
              placeholder="e.g. HR_contract_Q2.pdf"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              disabled={isUploading}
            />
          </div>

          {/* TARGET FOLDER */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label className="upload-input-label">Select Target Folder</label>
            <select
              className="upload-overlay-input"
              style={{ appearance: "none", backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23666\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "14px", paddingRight: "36px" }}
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              disabled={isUploading}
            >
              {folders.map((path) => (
                <option key={path} value={path}>
                  /{getFolderLabel(path)}
                </option>
              ))}
            </select>
          </div>

          {/* BUTTON ACTIONS */}
          <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "6px" }}>
            <button
              type="button"
              className="upload-action-btn"
              onClick={onClose}
              style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="upload-action-btn"
              disabled={!uploadedFile || isUploading || !docName.trim() || !selectedFolder}
            >
              Add Document
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
