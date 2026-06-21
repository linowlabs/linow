import React, { useState } from "react";
import { Icons } from "../icons";
import { PbcItem, RegisterResult, ExplorerNode } from "../types";
import { FOLDER_METADATA } from "../constants";

interface FileExplorerProps {
  role: "company" | "auditor";
  pbcList: PbcItem[];
  setPbcList: React.Dispatch<React.SetStateAction<PbcItem[]>>;
  folders: string[];
  setFolders: React.Dispatch<React.SetStateAction<string[]>>;
  pbcRegisteredData: Record<string, RegisterResult>;
  isPbcExpanded: boolean;
  setIsPbcExpanded: (expanded: boolean) => void;
  pbcWidth: number;
  selectedPbcId: string;
  setSelectedPbcId: (id: string) => void;
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  openFolders: Record<string, boolean>;
  setOpenFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleAddDocument?: () => void;
  engagementId?: string;
  setEngagementId?: (id: string) => void;
  syncStatus?: string;
  loadSyncEngagement?: (id: string) => void;
  startResizeLeft: (e: React.MouseEvent) => void;
}

export default function FileExplorer({
  role,
  pbcList,
  setPbcList,
  folders,
  setFolders,
  pbcRegisteredData,
  isPbcExpanded,
  setIsPbcExpanded,
  pbcWidth,
  selectedPbcId,
  setSelectedPbcId,
  selectedFolder,
  setSelectedFolder,
  openFolders,
  setOpenFolders,
  handleAddDocument,
  engagementId = "",
  setEngagementId,
  syncStatus = "",
  loadSyncEngagement,
  startResizeLeft,
}: FileExplorerProps) {
  // Inline Creation State
  const [isCreatingNode, setIsCreatingNode] = useState<"file" | "folder" | null>(null);
  const [createNodeParentPath, setCreateNodeParentPath] = useState<string>("");
  const [newInputName, setNewInputName] = useState<string>("");
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null);

  const handleStartCreateNode = (type: "file" | "folder") => {
    let parentPath = "";
    if (selectedFolder) {
      parentPath = selectedFolder;
    } else if (selectedPbcId) {
      const file = pbcList.find(p => p.id === selectedPbcId);
      if (file && file.folder) {
        parentPath = file.folder;
      }
    }

    setCreateNodeParentPath(parentPath);
    setIsCreatingNode(type);
    setNewInputName("");

    // Make sure the parent folder is expanded
    if (parentPath) {
      setOpenFolders(prev => ({ ...prev, [parentPath]: true }));
    }
  };

  const handleCancelVirtualNode = () => {
    setIsCreatingNode(null);
    setCreateNodeParentPath("");
    setNewInputName("");
  };

  const handleSaveVirtualNode = () => {
    if (!newInputName.trim()) {
      handleCancelVirtualNode();
      return;
    }

    const name = newInputName.trim();
    if (isCreatingNode === "folder") {
      const newFolder = createNodeParentPath ? `${createNodeParentPath}/${name}` : name;
      setFolders(prev => {
        if (prev.includes(newFolder)) return prev;
        return [...prev, newFolder];
      });
      setOpenFolders(prev => ({ ...prev, [newFolder]: true }));
      setSelectedFolder(newFolder);
      setSelectedPbcId("");
    } else if (isCreatingNode === "file") {
      const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() : "";
      const type = ext === "xlsx" || ext === "xls" ? "excel" : ext === "csv" ? "csv" : "pdf";

      const newFileId = `pbc-${Math.random().toString(36).substring(2) + Date.now().toString(36)}`;
      const newDoc: PbcItem = {
        id: newFileId,
        name,
        size: "0 KB",
        status: "unregistered",
        type: type as any,
        folder: createNodeParentPath,
        analyzed: false
      };

      setPbcList(prev => [...prev, newDoc]);
      setSelectedPbcId(newFileId);
      setSelectedFolder(createNodeParentPath);
    }

    handleCancelVirtualNode();
  };

  const handleDeleteNode = (e: React.MouseEvent, nodeType: "folder" | "file", nodeId: string, nodePath: string) => {
    e.stopPropagation();

    if (nodeType === "folder") {
      // Remove this folder and all sub-folders
      setFolders(prev => prev.filter(f => f !== nodePath && !f.startsWith(nodePath + "/")));
      // Move files inside this folder (and sub-folders) to root
      setPbcList(prev => prev.map(file => {
        if (file.folder === nodePath || file.folder.startsWith(nodePath + "/")) {
          return { ...file, folder: "" };
        }
        return file;
      }));
      // Clean up open state
      setOpenFolders(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key === nodePath || key.startsWith(nodePath + "/")) {
            delete next[key];
          }
        });
        return next;
      });
      if (selectedFolder === nodePath || selectedFolder.startsWith(nodePath + "/")) {
        setSelectedFolder("");
      }
    } else {
      // Remove file from list
      setPbcList(prev => prev.filter(file => file.id !== nodeId));
      if (selectedPbcId === nodeId) {
        setSelectedPbcId("");
      }
    }
  };

  // Helper to generate dynamic file explorer nodes from the pbcList
  const getExplorerNodes = (): ExplorerNode[] => {
    const folderPaths = new Set<string>(folders);

    pbcList.forEach(item => {
      if (item.folder) {
        folderPaths.add(item.folder);
        // Add all parents
        const parts = item.folder.split("/");
        for (let i = 1; i <= parts.length; i++) {
          folderPaths.add(parts.slice(0, i).join("/"));
        }
      }
    });

    // Rename local list variable to folderNodes to avoid clashing with folders prop
    const folderNodes: ExplorerNode[] = Array.from(folderPaths).map(path => {
      const parts = path.split("/");
      const name = parts[parts.length - 1];
      const depth = parts.length - 1;

      // Determine pretty display name
      let displayName = name;
      if (FOLDER_METADATA[path]) {
        displayName = FOLDER_METADATA[path].displayName;
      }

      return {
        id: `dir-${path.replace(/\//g, "-")}`,
        name: displayName,
        type: "folder" as const,
        path,
        depth
      };
    });

    const files = pbcList.map(item => {
      const folderPath = item.folder || "";
      const depth = folderPath ? folderPath.split("/").length : 0;
      return {
        id: item.id,
        name: item.name,
        type: "file" as const,
        fileType: item.type as "pdf" | "excel" | "csv",
        path: folderPath ? `${folderPath}/${item.name}` : item.name,
        depth
      };
    });

    const allNodes = [...folderNodes, ...files];

    // Append virtual input row if creating a node
    if (isCreatingNode && createNodeParentPath !== null && createNodeParentPath !== undefined) {
      const depth = createNodeParentPath ? createNodeParentPath.split("/").length : 0;
      allNodes.push({
        id: "virtual-temp-input",
        name: "",
        type: "virtual_input",
        path: createNodeParentPath ? `${createNodeParentPath}/!_virtual_temp_input` : "!_virtual_temp_input", // '!' sorts first among sibling names
        depth
      } as any);
    }

    allNodes.sort((a, b) => {
      if (a.path.startsWith(b.path + "/")) return 1;
      if (b.path.startsWith(a.path + "/")) return -1;
      return a.path.localeCompare(b.path);
    });

    return allNodes;
  };

  // Helper to determine if an explorer node should be visible in the collapsible tree
  const isNodeVisible = (path: string) => {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join("/");
      if (!openFolders[parentPath]) {
        return false;
      }
    }
    return true;
  };

  const registeredCount = pbcList.filter(p => p.status === "registered" || pbcRegisteredData[p.id]).length;
  const totalCount = pbcList.length;

  return (
    <>
      <section
        className={`workspace-pane pane-pbc ${!isPbcExpanded ? 'collapsed' : ''}`}
        style={{ width: isPbcExpanded ? `${pbcWidth}px` : '52px' }}
      >
        {!isPbcExpanded ? (
          <>
            <button className="pane-toggle-btn" onClick={() => setIsPbcExpanded(true)} title="Expand File Directory">
              <Icons.ChevronRight />
            </button>
            <div className="pane-collapsed-indicator">File Directory</div>
          </>
        ) : (
          <>
            <div className="pbc-header">
              <h3 className="pbc-title">File Directory</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {role === "company" && (
                  <>
                    <button
                      className="ide-action-btn"
                      onClick={() => handleStartCreateNode("folder")}
                      title="New Folder"
                      style={{ padding: "4px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <Icons.NewFolder size={15} />
                    </button>
                    <span className="pbc-counter" style={{ marginLeft: "4px" }}>
                      {registeredCount}/{totalCount}
                    </span>
                  </>
                )}
                <button className="pane-toggle-btn" onClick={() => setIsPbcExpanded(false)} title="Collapse File Directory" style={{ marginLeft: "2px" }}>
                  <Icons.ChevronLeft />
                </button>
              </div>
            </div>
            <div className="pbc-list-container" style={{ gap: 0, padding: 0 }}>
              <div className="ide-file-tree">
                {(() => {
                  let explorerNodes = getExplorerNodes();

                  // Filter logic for Auditor role: only show directories/files that have registered items
                  if (role === "auditor") {
                    explorerNodes = explorerNodes.filter(node => {
                      if (node.type === "file") {
                        const pbcItem = pbcList.find(p => p.id === node.id);
                        return pbcItem?.status === "registered" || pbcRegisteredData[node.id];
                      }
                      const hasVisibleDescendant = getExplorerNodes().some(desc => {
                        if (desc.type !== "file") return false;
                        if (!desc.path.startsWith(node.path + "/")) return false;
                        const pbcItem = pbcList.find(p => p.id === desc.id);
                        return pbcItem?.status === "registered" || pbcRegisteredData[desc.id];
                      });
                      return hasVisibleDescendant;
                    });
                  }

                  const visibleNodes = explorerNodes.filter(node => isNodeVisible(node.path));

                  if (role === "auditor" && visibleNodes.filter(n => n.type === "file").length === 0) {
                    return (
                      <p className="text-xs text-muted text-center w-full" style={{ padding: '20px 10px' }}>
                        No evidence files registered by the Company yet. Go to Company Mode to register files first.
                      </p>
                    );
                  }

                  if (role === "company" && pbcList.length === 0 && folders.length === 0 && !isCreatingNode) {
                    return (
                      <div className="file-tree-empty-state" style={{ padding: "20px 14px", textAlign: "center", color: "var(--text-secondary)", fontSize: "12px", border: "1px dashed rgba(0,0,0,0.08)", borderRadius: "12px", margin: "14px 10px", background: "rgba(255,255,255,0.2)" }}>
                        <span style={{ fontSize: "22px", display: "block", marginBottom: "6px" }}>📂</span>
                        <span style={{ fontWeight: 600, display: "block", marginBottom: "4px", color: "var(--text-primary)" }}>Empty Directory</span>
                        Create a folder or drop your files here to let Linow organize everything for you.
                      </div>
                    );
                  }

                  return visibleNodes.map(node => {
                    if (node.type === "virtual_input") {
                      return (
                        <div
                          key="virtual-temp-input"
                          className="tree-row-wrapper"
                          style={{ paddingLeft: `${node.depth * 14}px` }}
                        >
                          <div
                            className="tree-row file-row virtual-input-row"
                            style={{ gap: 6, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.25)", borderRadius: "6px", padding: "3px 6px" }}
                          >
                            <span className="tree-chevron-wrapper"></span>
                            <span className="tree-icon-wrapper" style={{ display: "flex", alignItems: "center" }}>
                              {isCreatingNode === "folder" ? <Icons.FolderClosed /> : <Icons.FileText />}
                            </span>
                            <input
                              type="text"
                              className="tree-inline-input"
                              placeholder={isCreatingNode === "folder" ? "New folder..." : "New file..."}
                              value={newInputName}
                              onChange={(e) => setNewInputName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveVirtualNode();
                                } else if (e.key === "Escape") {
                                  handleCancelVirtualNode();
                                }
                              }}
                              autoFocus
                              onBlur={handleCancelVirtualNode}
                            />
                          </div>
                        </div>
                      );
                    }

                    const isFolder = node.type === "folder";
                    const isOpen = openFolders[node.path];
                    const isSelectedFile = !isFolder && selectedPbcId === node.id;
                    const isSelectedFolder = isFolder && selectedFolder === node.path;

                    let FileIcon = Icons.FileText;
                    if (node.fileType === "pdf") FileIcon = Icons.FilePdf;
                    else if (node.fileType === "excel" || node.fileType === "csv") FileIcon = Icons.FileExcel;

                    return (
                      <div
                        key={node.id}
                        className="tree-row-wrapper"
                        style={{ paddingLeft: `${node.depth * 14}px` }}
                      >
                        <div
                          className={`tree-row ${isFolder ? "folder-row" : "file-row"} ${isSelectedFile ? "active" : ""} ${isSelectedFolder ? "active-folder" : ""}`}
                          style={isFolder && dragOverFolderPath === node.path ? {
                            background: "rgba(37, 99, 235, 0.08)",
                            border: "1px dashed rgba(37, 99, 235, 0.4)",
                            borderRadius: "6px"
                          } : {}}
                          draggable={!isFolder && role === "company"}
                          onDragStart={!isFolder && role === "company" ? (e) => {
                            e.dataTransfer.setData("text/plain", node.id);
                          } : undefined}
                          onDragEnter={isFolder && role === "company" ? (e) => {
                            e.preventDefault();
                            setDragOverFolderPath(node.path);
                          } : undefined}
                          onDragOver={isFolder && role === "company" ? (e) => {
                            e.preventDefault();
                          } : undefined}
                          onDragLeave={isFolder && role === "company" ? () => {
                            setDragOverFolderPath(null);
                          } : undefined}
                          onDrop={isFolder && role === "company" ? (e) => {
                            e.preventDefault();
                            setDragOverFolderPath(null);
                            const fileId = e.dataTransfer.getData("text/plain");
                            if (fileId) {
                              setPbcList(prev => prev.map(file => {
                                if (file.id === fileId) {
                                  return { ...file, folder: node.path };
                                }
                                return file;
                              }));
                              setSelectedPbcId(fileId);
                              setSelectedFolder(node.path);
                            }
                          } : undefined}
                          onClick={() => {
                            if (isFolder) {
                              setOpenFolders(prev => ({ ...prev, [node.path]: !prev[node.path] }));
                              setSelectedFolder(node.path);
                              setSelectedPbcId("");
                            } else {
                              setSelectedPbcId(node.id);
                              const parentPath = node.path.substring(0, node.path.lastIndexOf("/"));
                              setSelectedFolder(parentPath);
                            }
                          }}
                        >
                          <span className="tree-chevron-wrapper">
                            {isFolder ? (
                              isOpen ? (
                                <Icons.ChevronDownTiny className="tree-chevron" />
                              ) : (
                                <Icons.ChevronRightTiny className="tree-chevron" />
                              )
                            ) : null}
                          </span>

                          <span className="tree-icon-wrapper">
                            {isFolder ? (
                              isOpen ? <Icons.FolderOpen /> : <Icons.FolderClosed />
                            ) : (
                              <FileIcon />
                            )}
                          </span>

                          <span className="tree-node-name">{node.name}</span>

                          {role === "company" && (
                            <button
                              className="tree-delete-btn"
                              title={isFolder ? "Delete folder" : "Delete file"}
                              onClick={(e) => handleDeleteNode(e, isFolder ? "folder" : "file", node.id, node.path)}
                            >
                              <Icons.Trash size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Drop-to-root zone: allows dragging files back to root */}
                {role === "company" && (
                  <div
                    className={`tree-drop-root-zone ${dragOverFolderPath === "__root__" ? "drop-active" : ""}`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverFolderPath("__root__");
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={() => setDragOverFolderPath(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverFolderPath(null);
                      const fileId = e.dataTransfer.getData("text/plain");
                      if (fileId) {
                        setPbcList(prev => prev.map(file => {
                          if (file.id === fileId) {
                            return { ...file, folder: "" };
                          }
                          return file;
                        }));
                        setSelectedPbcId(fileId);
                        setSelectedFolder("");
                      }
                    }}
                  >
                    <span style={{ fontSize: "11px", opacity: 0.5 }}>⤴ Drop here to move to root</span>
                  </div>
                )}
              </div>

              {role === "company" && handleAddDocument && (
                <button className="pbc-add-btn" onClick={handleAddDocument} style={{ margin: '12px 10px 8px', width: 'calc(100% - 20px)' }}>
                  <Icons.Plus />
                  Add document
                </button>
              )}
            </div>

            {role === "auditor" && loadSyncEngagement && setEngagementId && (
              <div className="liquid-glass sync-card">
                <div className="sync-card-title">Supabase Sync Console</div>
                <div className="form-group margin-bottom-sm">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Engagement ID to sync"
                    value={engagementId}
                    onChange={(e) => setEngagementId(e.target.value)}
                  />
                </div>
                <button className="btn-secondary text-xxs w-full" onClick={() => loadSyncEngagement(engagementId)}>
                  Sync Engagement
                </button>
                <div className="sync-status-text">{syncStatus}</div>
              </div>
            )}
          </>
        )}
      </section>

      {isPbcExpanded ? (
        <div className="resize-handle" onMouseDown={startResizeLeft} />
      ) : (
        <div className="pane-gap-divider" />
      )}
    </>
  );
}
