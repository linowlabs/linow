export interface PbcItem {
  id: string;
  name: string;
  folder: string;
  size: string;
  status: "registered" | "unregistered";
  type: "pdf" | "excel" | "csv";
  analyzed: boolean;
  agentTag?: string;
  agentAssertions?: string[];
}

export interface Finding {
  id: string;
  title: string;
  severity: string;
  condition: string;
  criteria: string;
  recommendation: string;
  status: string;
  txDigest: string;
}

export interface ActivityLog {
  title: string;
  desc: string;
  status: "done" | "running" | "queued";
}

export interface ChatLogItem {
  sender: "user" | "agent";
  text: string;
}

export interface ExplorerNode {
  id: string;
  name: string;
  type: "folder" | "file" | "virtual_input";
  fileType?: "pdf" | "excel" | "csv";
  path: string;
  depth: number;
}

export interface RegisterResult {
  objectId?: string;
  txDigest?: string;
  blobId?: string;
  commitment?: string;
}
