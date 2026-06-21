import React, { useState, useEffect, useRef } from "react";
import { Icons } from "../icons";

interface UploadDocumentModalProps {
  folders: string[];
  defaultFolder: string;
  onClose: () => void;
  onAdd: (files: { name: string; size: string }[], folder: string) => void;
}

interface UploadedFileItem {
  name: string;
  size: string;
  progress: number;
}

export default function UploadDocumentModal({
  folders,
  defaultFolder,
  onClose,
  onAdd,
}: UploadDocumentModalProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(defaultFolder || "");
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-sync select target folder if defaultFolder changes
  useEffect(() => {
    if (defaultFolder) {
      setSelectedFolder(defaultFolder);
    }
  }, [defaultFolder]);

  // Simulated upload progress timer for multiple files
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading) {
      interval = setInterval(() => {
        setUploadedFiles((prev) => {
          const updated = prev.map((f) => {
            if (f.progress < 100) {
              return { ...f, progress: Math.min(100, f.progress + 15) };
            }
            return f;
          });
          const allDone = updated.every((f) => f.progress >= 100);
          if (allDone) {
            clearInterval(interval);
            setIsUploading(false);
          }
          return updated;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  const handleFilesAdded = (filesList: FileList) => {
    const newItems: UploadedFileItem[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      // Format file size
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = parseFloat(sizeMB) > 0.1 ? `${sizeMB} MB` : `${(file.size / 1024).toFixed(0)} KB`;
      
      newItems.push({
        name: file.name,
        size: sizeStr,
        progress: 0,
      });
    }

    setUploadedFiles((prev) => [...prev, ...newItems]);
    setIsUploading(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filesReady = uploadedFiles.length > 0 && uploadedFiles.every((f) => f.progress >= 100);

    if (filesReady && !isUploading) {
      onAdd(
        uploadedFiles.map((f) => ({ name: f.name, size: f.size })),
        ""
      );
    }
  };

  // Helper to format folder path for friendly dropdown display
  const getFolderLabel = (path: string) => {
    if (!path) return "/ (root)";
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const isFormValid =
    uploadedFiles.length > 0 &&
    uploadedFiles.every((f) => f.progress >= 100);

  return (
    <div className="workspace-upload-overlay" style={{ zIndex: 11000 }}>
      <div className="upload-overlay-card" style={{ maxWidth: "500px", padding: "32px" }}>
        
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
          Upload Compliance Documents
        </h2>
        <p className="upload-overlay-desc" style={{ marginBottom: "8px" }}>
          Select or drag multiple files to upload, and choose the target directory folder to save them in.
        </p>

        <form onSubmit={handleSubmit} className="upload-input-group" style={{ gap: "12px" }}>
          
          {/* FILE DROPZONE */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept=".pdf,.xlsx,.csv,.docx"
            multiple
          />

          <div
            className="upload-dropzone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            style={{ padding: "16px 14px", minHeight: "100px" }}
          >
            <div className="upload-dropzone-icon" style={{ width: "30px", height: "30px" }}>
              <Icons.Upload size={14} />
            </div>
            <div className="upload-dropzone-text" style={{ fontSize: "11.5px" }}>
              Drop PDF, Excel, Word, or ZIP files here
            </div>
            <div className="upload-dropzone-subtext" style={{ fontSize: "10px" }}>
              or click to browse local files (multiple allowed)
            </div>
          </div>

          {/* UPLOADED FILES LIST CONTAINER */}
          {uploadedFiles.length > 0 && (
            <div 
              style={{ 
                maxHeight: "120px", 
                overflowY: "auto", 
                width: "100%", 
                display: "flex", 
                flexDirection: "column", 
                gap: "6px",
                border: "1px solid rgba(0,0,0,0.05)",
                borderRadius: "10px",
                padding: "8px",
                background: "rgba(0,0,0,0.01)" 
              }}
            >
              {uploadedFiles.map((f, index) => (
                <div key={index} style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
                  <div className="upload-file-row" style={{ padding: "6px 10px", borderRadius: "8px", boxShadow: "none", border: "1px solid rgba(0,0,0,0.03)" }}>
                    <div className="upload-file-info" style={{ gap: "6px" }}>
                      <span>📄</span>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name}
                        </span>
                        <span style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>{f.size}</span>
                      </div>
                    </div>

                    <div className="upload-file-status" style={{ fontSize: "10.5px" }}>
                      {f.progress < 100 ? (
                        <span className="onboarding-spin" style={{ color: "var(--accent-color)" }}>
                          <Icons.Sparkles size={10} />
                        </span>
                      ) : (
                        <>
                          <Icons.Check size={9} />
                          <span>Ready</span>
                        </>
                      )}
                    </div>
                  </div>

                  {f.progress < 100 && (
                    <div className="upload-progress-container" style={{ height: "3px", marginTop: "2px" }}>
                      <div
                        className="upload-progress-bar"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}



          {/* BUTTON ACTIONS */}
          <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "4px" }}>
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
              disabled={!isFormValid || isUploading}
            >
              Add Documents {uploadedFiles.length > 0 ? `(${uploadedFiles.length})` : ""}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
