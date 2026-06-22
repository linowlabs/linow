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

export interface SubCard {
  title: string;
  status: "done" | "running" | "queued";
}

export interface ActivityLog {
  title: string;
  desc: string;
  status: "done" | "running" | "queued";
  subCards?: SubCard[];
}

export interface ChatLogItem {
  id?: string;
  sender: "user" | "agent" | "activity";
  text: string;
  activityLogs?: ActivityLog[];
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
