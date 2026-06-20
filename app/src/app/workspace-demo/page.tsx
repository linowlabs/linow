"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  createRegisterEvidenceFlow,
  createAttestationFlow,
  createEmitAgentActionFlow,
  type AssertionId,
  type AttestationType,
  type SourceConfidenceLevel,
} from "@linow/sdk";
import {
  createDemoEngagement,
  insertDemoAgentAction,
  insertDemoAttestation,
  isDemoStoreConfigured,
  loadDemoEngagement,
  upsertDemoEvidence,
  type DemoEvidenceRow,
} from "@/lib/demo-store";
import { useWalletBridge } from "@/lib/wallet-context";
import "./demo.css";

// SVG Icons helper object to keep the code modular and dependencies clean
const Icons = {
  Robot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  ),
  Chain: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  ChevronDown: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  ChevronUp: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  ChevronLeft: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  ChevronRight: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  ChevronRightTiny: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  ChevronDownTiny: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  FolderClosed: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="folderClosedBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2b047" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#c2912b" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="folderClosedFront" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
          <stop offset="100%" stopColor="rgba(245, 230, 200, 0.5)" />
        </linearGradient>
      </defs>
      <path d="M2 5a2 2 0 0 1 2-2h4.5c.82 0 1.58.4 2.05 1.07L12.5 7H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="url(#folderClosedBack)" />
      <path d="M2 8.5h20V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.5z" fill="url(#folderClosedFront)" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.2" />
      <line x1="5" y1="12" x2="11" y2="12" stroke="rgba(194, 145, 43, 0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="15" x2="9" y2="15" stroke="rgba(194, 145, 43, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  FolderOpen: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="folderOpenBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2b047" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c2912b" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="folderOpenFront" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
          <stop offset="100%" stopColor="rgba(245, 230, 200, 0.6)" />
        </linearGradient>
      </defs>
      <path d="M2 5a2 2 0 0 1 2-2h4.5c.82 0 1.58.4 2.05 1.07L12.5 7H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="url(#folderOpenBack)" />
      <path d="M1.5 9.5h21L20 21H4L1.5 9.5z" fill="url(#folderOpenFront)" stroke="rgba(255, 255, 255, 0.95)" strokeWidth="1.2" />
      <path d="M6 6h8v6H6V6z" fill="rgba(255, 255, 255, 0.9)" stroke="rgba(0, 0, 0, 0.05)" strokeWidth="0.5" transform="rotate(-5 10 9)" />
    </svg>
  ),
  FilePdf: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#e05e5e" }}>
      <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
      <path d="M4.5 8h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0 2h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0 2h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1z" />
    </svg>
  ),
  FileExcel: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#3fa76a" }}>
      <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
      <path d="M5.5 6h5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5zM5 8v1h2V8H5zm3 0v1h2V8H8zm-3-1v.5h2V7H5zm3 0v.5h2V7H8z" />
    </svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 3Q11 10 4 10Q11 10 11 17Q11 10 18 10Q11 10 11 3Z" />
      <path d="M17 1Q17 5 13 5Q17 5 17 9Q17 5 21 5Q17 5 17 1Z" />
      <path d="M18 10Q18 14 14 14Q18 14 18 18Q18 14 22 14Q18 14 18 10Z" />
      <path d="M6 4Q6 7 3 7Q6 7 6 10Q6 7 9 7Q6 7 6 4Z" />
    </svg>
  ),
  BoxChain: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="6" x2="6" y2="12" />
      <line x1="12" y1="6" x2="18" y2="12" />
      <line x1="12" y1="18" x2="6" y2="12" />
      <line x1="12" y1="18" x2="18" y2="12" />
      <path d="M 12 3 L 15 4.5 L 12 6 L 9 4.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 9 4.5 L 12 6 L 12 9 L 9 7.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 15 4.5 L 12 6 L 12 9 L 15 7.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 6 9 L 9 10.5 L 6 12 L 3 10.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 3 10.5 L 6 12 L 6 15 L 3 13.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 9 10.5 L 6 12 L 6 15 L 9 13.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 18 9 L 21 10.5 L 18 12 L 15 10.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 15 10.5 L 18 12 L 18 15 L 15 13.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 21 10.5 L 18 12 L 18 15 L 21 13.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 12 15 L 15 16.5 L 12 18 L 9 16.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 9 16.5 L 12 18 L 12 21 L 9 19.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 15 16.5 L 12 18 L 12 21 L 15 19.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 11 2 2 4-4" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const ISA_ASSERTIONS = [
  "Existence",
  "Completeness",
  "Valuation & Allocation",
  "Rights & Obligations",
  "Cut-off",
  "Classification",
  "Occurrence",
  "Accuracy",
];

const DEFAULT_COMPANY_PBC = [
  // 01_financial_reports
  { id: "pbc-xlsx-pack", name: "01_q2_2026_financial_reporting_pack.xlsx", folder: "demo/PBC_list/evidence_initial/01_financial_reports", size: "11.4 KB", status: "unregistered", type: "excel", analyzed: false },
  { id: "pbc-csv-aging", name: "07_ar_aging_q2_2026.csv", folder: "demo/PBC_list/evidence_initial/01_financial_reports", size: "437 B", status: "unregistered", type: "csv", analyzed: false },
  { id: "pbc-pdf-april", name: "08_management_report_april_2026.pdf", folder: "demo/PBC_list/evidence_initial/01_financial_reports", size: "3.0 KB", status: "unregistered", type: "pdf", analyzed: false },
  { id: "pbc-pdf-may", name: "08_management_report_may_2026.pdf", folder: "demo/PBC_list/evidence_initial/01_financial_reports", size: "3.0 KB", status: "unregistered", type: "pdf", analyzed: false },
  { id: "pbc-pdf-june", name: "08_management_report_june_2026.pdf", folder: "demo/PBC_list/evidence_initial/01_financial_reports", size: "3.0 KB", status: "registered", type: "pdf", analyzed: true },

  // 02_contracts_invoices
  { id: "pbc-orion-contract", name: "09_customer_contract_orion_C-ORION-2026-019.pdf", folder: "demo/PBC_list/evidence_initial/02_contracts_invoices", size: "2.8 KB", status: "registered", type: "pdf", analyzed: true },
  { id: "pbc-invoice-0411", name: "10_invoice_INV-2026-0411.pdf", folder: "demo/PBC_list/evidence_initial/02_contracts_invoices", size: "2.5 KB", status: "unregistered", type: "pdf", analyzed: false },
  { id: "pbc-invoice-0517", name: "10_invoice_INV-2026-0517.pdf", folder: "demo/PBC_list/evidence_initial/02_contracts_invoices", size: "2.5 KB", status: "unregistered", type: "pdf", analyzed: false },
  { id: "pbc-invoice-0630", name: "10_invoice_INV-2026-0630.pdf", folder: "demo/PBC_list/evidence_initial/02_contracts_invoices", size: "2.5 KB", status: "unregistered", type: "pdf", analyzed: false },
  { id: "pbc-invoice-megalogis", name: "11_invoice_INV-2026-0528_megalogis.pdf", folder: "demo/PBC_list/evidence_initial/02_contracts_invoices", size: "2.5 KB", status: "unregistered", type: "pdf", analyzed: false },

  // 03_delivery_cutoff
  { id: "pbc-csv-cutoff", name: "05_service_delivery_cutoff_log.csv", folder: "demo/PBC_list/evidence_initial/03_delivery_cutoff", size: "744 B", status: "unregistered", type: "csv", analyzed: false },
  { id: "pbc-pdf-acceptance", name: "12_service_acceptance_orion_uat_2026_06_25.pdf", folder: "demo/PBC_list/evidence_initial/03_delivery_cutoff", size: "2.8 KB", status: "unregistered", type: "pdf", analyzed: false },

  // 04_bank_cash_receipts
  { id: "pbc-csv-transactions", name: "03_bank_transactions_apr_jul_2026.csv", folder: "demo/PBC_list/evidence_initial/04_bank_cash_receipts", size: "1.6 KB", status: "unregistered", type: "csv", analyzed: false },
  { id: "pbc-pdf-bank-april", name: "13_bank_statement_april_2026.pdf", folder: "demo/PBC_list/evidence_initial/04_bank_cash_receipts", size: "2.7 KB", status: "unregistered", type: "pdf", analyzed: false },
  { id: "pbc-pdf-bank-may", name: "13_bank_statement_may_2026.pdf", folder: "demo/PBC_list/evidence_initial/04_bank_cash_receipts", size: "2.7 KB", status: "unregistered", type: "pdf", analyzed: false },
  { id: "pbc-pdf-bank-june", name: "13_bank_statement_june_2026.pdf", folder: "demo/PBC_list/evidence_initial/04_bank_cash_receipts", size: "2.7 KB", status: "unregistered", type: "pdf", analyzed: false },
];

const PREVIEW_CONTENT_SALES = [
  { text: "SALES AGREEMENT & CONTRACT", highlight: "" },
  { text: "--------------------------------------------------", highlight: "" },
  { text: "CONTRACT NO: SC-2026-04921-Q2", highlight: "" },
  { text: "DATE OF AGREEMENT: May 12, 2026", highlight: "" },
  { text: "", highlight: "" },
  { text: "SELLER: Acme Corporation (represented by Jane Doe, CFO)", highlight: "read" },
  { text: "BUYER: Global Tech Solutions Inc. (represented by John Smith, CEO)", highlight: "read" },
  { text: "", highlight: "" },
  { text: "SECTION 1: PURPOSE OF AGREEMENT", highlight: "" },
  { text: "This Agreement governs the acquisition of enterprise licensing.", highlight: "" },
  { text: "", highlight: "" },
  { text: "SECTION 3: SCOPE & DELIVERABLES", highlight: "" },
  { text: "The Seller agrees to deliver 500 units of Enterprise Suite Licenses.", highlight: "cross" },
  { text: "Total Agreement Value is USD 142,500.00.", highlight: "cross" },
  { text: "", highlight: "" },
  { text: "SECTION 4: PAYMENT TERMS & SCHEDULE", highlight: "" },
  { text: "Payment shall be made in full within 30 days of the invoice date.", highlight: "" },
  { text: "All transactions are recorded in the general accounts of Acme.", highlight: "" },
];

// Safe ID generator to prevent build-time SSR issues with crypto.randomUUID
const generateId = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Helper to render bold text in chat logs safely without dangerouslySetInnerHTML
const renderChatText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export default function WorkspaceDemo() {
  const wallet = useWalletBridge();

  // Authentication and Roles state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"company" | "auditor">("company");
  const [activeTab, setActiveTab] = useState<"agent" | "registry" | "verifier">("agent");

  // Web3 state
  const [auditPackId, setAuditPackId] = useState<string>("");
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);
  const [registerResult, setRegisterResult] = useState<{
    objectId?: string;
    txDigest?: string;
    blobId?: string;
    commitment?: string;
  } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Supabase Sync state
  const [engagementId, setEngagementId] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<string>("Not connected to Supabase");

  // Company PBC List
  const [pbcList, setPbcList] = useState(DEFAULT_COMPANY_PBC);
  const [selectedPbcId, setSelectedPbcId] = useState("pbc-orion-contract");
  const [pbcRegisteredData, setPbcRegisteredData] = useState<Record<string, typeof registerResult>>({});

  const registeredCount = useMemo(() => {
    return pbcList.filter(p => p.status === "registered" || pbcRegisteredData[p.id]).length;
  }, [pbcList, pbcRegisteredData]);

  const totalCount = pbcList.length;

  // Folder tree open states
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    "contracts": false,
    "demo": true,
    "demo/PBC_list": true,
    "demo/PBC_list/agent_test_scripts": false,
    "demo/PBC_list/audit_docs": false,
    "demo/PBC_list/evidence_initial": true,
    "demo/PBC_list/evidence_initial/01_financial_reports": false,
    "demo/PBC_list/evidence_initial/02_contracts_invoices": true,
    "demo/PBC_list/evidence_initial/03_delivery_cutoff": false,
    "demo/PBC_list/evidence_initial/04_bank_cash_receipts": false,
  });

  const [selectedFolder, setSelectedFolder] = useState<string>("demo/PBC_list/evidence_initial/02_contracts_invoices");

  // Interactive mock agent state
  const [agentActiveTab, setAgentActiveTab] = useState<string>("Home");
  const [permissionChoice, setPermissionChoice] = useState<"allow" | "always" | "no">("allow");
  const [permissionSubmitted, setPermissionSubmitted] = useState(false);
  const [isPbcExpanded, setIsPbcExpanded] = useState(true);
  const [isAgentExpanded, setIsAgentExpanded] = useState(true);
  const [pbcWidth, setPbcWidth] = useState(300);
  const [agentWidth, setAgentWidth] = useState(340);

  // Helper to generate dynamic file explorer nodes from the pbcList
  const getExplorerNodes = () => {
    const folders = [
      { id: "dir-contracts", name: "contracts", type: "folder", path: "contracts", depth: 0 },
      { id: "dir-demo", name: "demo", type: "folder", path: "demo", depth: 0 },
      { id: "dir-pbc", name: "file directory", type: "folder", path: "demo/PBC_list", depth: 1 },
      { id: "dir-scripts", name: "agent_test_scripts", type: "folder", path: "demo/PBC_list/agent_test_scripts", depth: 2 },
      { id: "dir-docs", name: "audit_docs", type: "folder", path: "demo/PBC_list/audit_docs", depth: 2 },
      { id: "dir-evidence", name: "evidence_initial", type: "folder", path: "demo/PBC_list/evidence_initial", depth: 2 },
      { id: "dir-fin", name: "01_financial_reports", type: "folder", path: "demo/PBC_list/evidence_initial/01_financial_reports", depth: 3 },
      { id: "dir-contract", name: "02_contracts_invoices", type: "folder", path: "demo/PBC_list/evidence_initial/02_contracts_invoices", depth: 3 },
      { id: "dir-cutoff", name: "03_delivery_cutoff", type: "folder", path: "demo/PBC_list/evidence_initial/03_delivery_cutoff", depth: 3 },
      { id: "dir-bank", name: "04_bank_cash_receipts", type: "folder", path: "demo/PBC_list/evidence_initial/04_bank_cash_receipts", depth: 3 }
    ];

    const files = pbcList.map(item => {
      const folderPath = item.folder || "demo/PBC_list/evidence_initial/02_contracts_invoices";
      const depth = folderPath.split("/").length;
      return {
        id: item.id,
        name: item.name,
        type: "file" as const,
        fileType: item.type as "pdf" | "excel" | "csv",
        path: `${folderPath}/${item.name}`,
        depth
      };
    });

    const allNodes = [...folders, ...files];
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

  // Helper to render customized details inside the main preview sheet depending on selection
  const renderPreviewCanvas = () => {
    const activeFile = pbcList.find(p => p.id === selectedPbcId);
    if (!activeFile) {
      return (
        <div className="pdf-page empty-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <p className="text-sm text-muted">Select a file from the explorer to preview</p>
        </div>
      );
    }

    if (activeFile.type === "excel" || activeFile.type === "csv") {
      let headers: string[] = [];
      let rows: string[][] = [];
      let title = activeFile.name;

      if (activeFile.id === "pbc-xlsx-pack") {
        headers = ["Account Code", "Account Name", "April 2026", "May 2026", "June 2026", "Q2 Total"];
        rows = [
          ["4100", "Revenue - SaaS Subscriptions", "IDR 171,000,000", "IDR 171,000,000", "IDR 171,000,000", "IDR 513,000,000"],
          ["4200", "Revenue - Implementation Services", "IDR 114,000,000", "IDR 114,000,000", "IDR 114,000,000", "IDR 342,000,000"],
          ["5100", "Cost of Sales", "-IDR 38,000,000", "-IDR 39,500,000", "-IDR 39,500,000", "-IDR 117,000,000"],
          ["Gross Profit", "", "IDR 247,000,000", "IDR 245,500,000", "IDR 245,500,000", "IDR 738,000,000"]
        ];
      } else if (activeFile.id === "pbc-csv-aging") {
        headers = ["Customer Name", "Invoice Ref", "0-30 Days", "31-60 Days", "61-90 Days", "Over 90", "Total Due"];
        rows = [
          ["PT Orion Mart Tbk", "INV-2026-0630", "IDR 142,500,000", "IDR 0", "IDR 0", "IDR 0", "IDR 142,500,000"],
          ["Mega Logis PT", "INV-2026-0528", "IDR 0", "IDR 98,200,000", "IDR 0", "IDR 0", "IDR 98,200,000"],
          ["Arunika Cloud Corp", "INV-2026-0411", "IDR 0", "IDR 0", "IDR 45,000,000", "IDR 0", "IDR 45,000,000"]
        ];
      } else if (activeFile.id === "pbc-csv-cutoff") {
        headers = ["Delivery ID", "Customer", "Contract Ref", "Delivery Date", "UAT Date", "Value IDR", "Status"];
        rows = [
          ["DEL-2026-048", "PT Orion Mart Tbk", "C-ORION-2026-019", "2026-06-20", "2026-06-25", "342,000,000", "Delivered & Signed"],
          ["DEL-2026-042", "Mega Logis PT", "C-MEGA-2026-004", "2026-05-24", "2026-05-28", "198,000,000", "Delivered & Signed"]
        ];
      } else if (activeFile.id === "pbc-csv-transactions") {
        headers = ["Transaction Date", "Description", "Reference", "Debit (Withdrawal)", "Credit (Deposit)", "Balance"];
        rows = [
          ["2026-05-14", "Deposit Global Tech Solutions", "SC-04921", "", "+IDR 142,500,000", "IDR 482,401,500"],
          ["2026-06-02", "Rent NY Inc.", "RENT-NY-092", "-IDR 12,000,000", "", "IDR 470,401,500"],
          ["2026-06-25", "PT Orion Mart Tbk Milestone 1", "C-ORION-2026-019", "", "+IDR 171,000,000", "IDR 641,401,500"]
        ];
      } else {
        headers = ["A", "B", "C", "D", "E"];
        rows = [
          ["Row 1 Col A", "Row 1 Col B", "Row 1 Col C", "Row 1 Col D", "Row 1 Col E"],
          ["Row 2 Col A", "Row 2 Col B", "Row 2 Col C", "Row 2 Col D", "Row 2 Col E"],
          ["Row 3 Col A", "Row 3 Col B", "Row 3 Col C", "Row 3 Col D", "Row 3 Col E"]
        ];
      }

      return (
        <div className="pdf-page spreadsheet-view">
          <div className="spreadsheet-title-row">
            <span className="spreadsheet-icon">📊</span>
            <span className="spreadsheet-filename">{title}</span>
          </div>
          <div className="spreadsheet-grid-container">
            <table className="spreadsheet-grid-table">
              <thead>
                <tr>
                  <th></th>
                  {headers.map((h, idx) => (
                    <th key={idx}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="row-num-cell">{rowIdx + 1}</td>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pdf-page-footer">Sheet1 — Page 1 of 1</div>
        </div>
      );
    }

    if (activeFile.id === "pbc-orion-contract") {
      return (
        <div className="pdf-page">
          <div className="pdf-contract-sheet">
            <h1 className="pdf-contract-title">Customer Contract - PT Orion Mart Tbk</h1>
            <p className="pdf-contract-subtitle text-xs text-muted" style={{ marginBottom: 12 }}>
              PT Arunika Cloud Commerce | Q2 2026 | Generated demo evidence for Linow ISA 500 testing
            </p>
            <hr className="pdf-divider" />

            <div className="pdf-meta-block">
              <p><strong>Contract Reference:</strong> C-ORION-2026-019</p>
              <p><strong>Customer:</strong> PT Orion Mart Tbk</p>
              <p><strong>Vendor:</strong> PT Arunika Cloud Commerce</p>
              <p><strong>Effective Date:</strong> 2026-03-28</p>
              <p><strong>Contract Term:</strong> 12 months from production launch</p>
            </div>

            <div className="pdf-contract-section">
              <h3>Contract Summary</h3>
              <p>Total contract value: IDR 855,000,000 excluding VAT. Components: implementation services IDR 342,000,000 and SaaS subscription IDR 513,000,000.</p>
            </div>

            <div className="pdf-contract-section">
              <h3>Commercial Terms</h3>
              <div className="pdf-statement-table">
                <div className="pdf-statement-header-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Clause</span>
                  <span>Term</span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Payment terms</span>
                  <span>14 days from invoice date unless otherwise stated in SOW</span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Milestone 1</span>
                  <span>
                    <span className="highlight-yellow">50% of implementation fee upon UAT sign-off</span>
                  </span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Milestone 2</span>
                  <span>50% of implementation fee upon readiness confirmation</span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Subscription</span>
                  <span>Monthly recognition once platform access is available</span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Approval requirement</span>
                  <span>
                    <span className="highlight-blue">Contracts above IDR 750,000,000 require Commercial Committee approval before revenue recognition</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pdf-contract-section" style={{ marginTop: 12 }}>
              <h3>Signatures</h3>
              <p className="text-xxs text-muted">
                Signed for PT Orion Mart Tbk by: Adrian Pradipta, Procurement Director, 2026-03-28.<br />
                Signed for PT Arunika Cloud Commerce by: Maya Santoso, Chief Commercial Officer, 2026-03-28.
              </p>
            </div>
          </div>
          <div className="pdf-page-footer">Page 1 of 1</div>
        </div>
      );
    }

    if (activeFile.name.includes("invoice") || activeFile.name.includes("INV")) {
      const invNum = activeFile.name.match(/INV-\d+-\d+|INV-\d+/)?.[0] || "INV-2026-0630";
      const isMega = activeFile.name.includes("megalogis");
      const clientName = isMega ? "PT Mega Logis" : "PT Orion Mart Tbk";
      const amountStr = isMega ? "IDR 98,200,000" : "IDR 171,000,000";
      const desc = isMega ? "Logistics Integration SaaS - Q2 License" : "Cloud Commerce Platform Milestone 1 (50% Implementation Fee)";
      return (
        <div className="pdf-page">
          <div className="pdf-contract-sheet">
            <h1 className="pdf-contract-title" style={{ fontSize: 20 }}>INVOICE</h1>
            <hr className="pdf-divider" />

            <div className="pdf-meta-block" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p><strong>Invoice Number:</strong> {invNum}</p>
                <p><strong>Date:</strong> May 28, 2026</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p><strong>From:</strong> PT Arunika Cloud Commerce</p>
                <p><strong>To:</strong> {clientName}</p>
              </div>
            </div>

            <div className="pdf-contract-section" style={{ marginTop: 20 }}>
              <div className="pdf-statement-table">
                <div className="pdf-statement-header-row" style={{ gridTemplateColumns: '3fr 1fr 1fr' }}>
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Amount</span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '3fr 1fr 1fr' }}>
                  <span>
                    <span className="highlight-yellow">{desc}</span>
                  </span>
                  <span>1</span>
                  <span>{amountStr}</span>
                </div>
                <div className="pdf-table-row total-row" style={{ gridTemplateColumns: '3fr 1fr 1fr', fontWeight: 'bold' }}>
                  <span>Total Due</span>
                  <span></span>
                  <span>{amountStr}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pdf-page-footer">Page 1 of 1</div>
        </div>
      );
    }

    if (activeFile.name.includes("acceptance") || activeFile.name.includes("uat")) {
      return (
        <div className="pdf-page">
          <div className="pdf-contract-sheet">
            <h1 className="pdf-contract-title" style={{ fontSize: 18 }}>USER ACCEPTANCE CERTIFICATE</h1>
            <hr className="pdf-divider" />

            <div className="pdf-meta-block">
              <p><strong>Project Name:</strong> PT Orion Mart Cloud Commerce Integration</p>
              <p><strong>UAT Date:</strong> June 25, 2026</p>
              <p><strong>Client:</strong> PT Orion Mart Tbk</p>
              <p><strong>Vendor:</strong> PT Arunika Cloud Commerce</p>
            </div>

            <div className="pdf-contract-section" style={{ marginTop: 20 }}>
              <h3>Statement of Acceptance</h3>
              <p>
                <span className="highlight-yellow">This is to certify that PT Orion Mart Tbk has completed user acceptance testing of the implementation services deliverable according to Contract C-ORION-2026-019.</span>
              </p>
              <p>All test cases have passed successfully, and the system is approved for production deployment.</p>
            </div>

            <div className="pdf-contract-section" style={{ marginTop: 30 }}>
              <p><strong>Signatures:</strong></p>
              <p className="text-xxs text-muted">
                Client UAT Lead: Adrian Pradipta, Procurement Director<br />
                Vendor Delivery Lead: Maya Santoso, CCO
              </p>
            </div>
          </div>
          <div className="pdf-page-footer">Page 1 of 1</div>
        </div>
      );
    }

    const isJune = activeFile.name.includes("june");
    const isMay = activeFile.name.includes("may");
    const periodStr = isJune ? "JUN 1, 2026 - JUN 30, 2026" : isMay ? "MAY 1, 2026 - MAY 31, 2026" : "APR 1, 2026 - APR 30, 2026";
    const endingBalStr = isJune ? "IDR 641,401,500" : isMay ? "IDR 482,401,500" : "IDR 340,000,000";

    return (
      <div className="pdf-page">
        <div className="pdf-statement-sheet">
          <h1 className="pdf-statement-title" style={{ fontSize: 14 }}>PT ARUNIKA CLOUD COMMERCE STATEMENT</h1>
          <p className="pdf-statement-subtitle">BANK OF CENTRAL INDONESIA</p>
          <p className="pdf-statement-meta">PERIOD: {periodStr}</p>
          <hr className="pdf-divider" />

          <h3>TRANSACTION LOGS</h3>
          <div className="pdf-statement-table">
            <div className="pdf-statement-header-row">
              <span>Date</span>
              <span>Description</span>
              <span>Amount</span>
            </div>
            {isJune ? (
              <>
                <div className="pdf-table-row">
                  <span>Jun 02, 2026</span>
                  <span>Office Rent NY Inc.</span>
                  <span className="amount withdrawal">-IDR 12,000,000</span>
                </div>
                <div className="pdf-table-row">
                  <span>Jun 25, 2026</span>
                  <span>
                    <span className="highlight-yellow">DEPOSIT - PT Orion Mart Tbk (Milestone 1)</span>
                  </span>
                  <span className="amount deposit">+IDR 171,000,000</span>
                </div>
              </>
            ) : isMay ? (
              <div className="pdf-table-row">
                <span>May 14, 2026</span>
                <span>
                  <span className="highlight-yellow">DEPOSIT - Global Tech Solutions (REF: SC-04921)</span>
                </span>
                <span className="amount deposit">+IDR 142,500,000</span>
              </div>
            ) : (
              <div className="pdf-table-row">
                <span>Apr 12, 2026</span>
                <span>Internet & Cloud Hosting Fees</span>
                <span className="amount withdrawal">-IDR 3,500,000</span>
              </div>
            )}
            <div className="pdf-table-row total-row">
              <span>
                <span className="highlight-blue">Ending Balance</span>
              </span>
              <span></span>
              <span className="amount total">{endingBalStr}</span>
            </div>
          </div>
        </div>
        <div className="pdf-page-footer">Page 1 of 1</div>
      </div>
    );
  };

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = pbcWidth;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(500, startWidth + (moveEvent.clientX - startX)));
      setPbcWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = agentWidth;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(600, startWidth - (moveEvent.clientX - startX)));
      setAgentWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };
  const [agentStep, setAgentStep] = useState(0); // 0: Question, 1: Success Confirmed
  const [activityLogs, setActivityLogs] = useState<Array<{ title: string; desc: string; status: "done" | "running" | "queued" }>>([
    { title: "Coverage check", desc: "4 of 7 required docs found", status: "done" },
    { title: "Classifying contract", desc: "Matching ISA assertions", status: "running" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ sender: "user" | "agent"; text: string }>>([
    { sender: "agent", text: "Selamat datang di Linow Agent Sandbox. Saya siap membantu mengklasifikasi dokumen Anda untuk engagement Q2 2026." }
  ]);

  // Auditor State
  const [auditorFindings, setAuditorFindings] = useState([
    {
      id: "f-1",
      title: "Missing authorization log for Q1 revenue recognition",
      severity: "medium",
      condition: "No board approval or authorization log found for Q1 2026 revenue transactions totaling $142,500.",
      criteria: "ISA 500 requires appropriate audit evidence for Rights & Obligations.",
      recommendation: "Upload board minutes or authorization matrix.",
      status: "draft",
      txDigest: ""
    }
  ]);
  const [isAttesting, setIsAttesting] = useState(false);

  // Synchronize or load shared supabase engagement if present in query parameter
  useEffect(() => {
    if (!isDemoStoreConfigured()) return;
    const params = new URLSearchParams(window.location.search);
    const paramEngId = params.get("engagement");
    if (paramEngId) {
      setEngagementId(paramEngId);
      loadSyncEngagement(paramEngId);
    }
  }, []);

  const loadSyncEngagement = async (id: string) => {
    try {
      setSyncStatus("Loading Supabase engagement...");
      const bundle = await loadDemoEngagement(id);
      if (bundle.engagement.audit_pack_id) {
        setAuditPackId(bundle.engagement.audit_pack_id);
      }
      // Populate state from db if existing rows found
      if (bundle.evidence.length > 0) {
        const loadedPbc = pbcList.map(item => {
          const match = bundle.evidence.find(ev => ev.file_name === item.name);
          if (match) {
            return {
              ...item,
              status: match.evidence_id ? "registered" : "unregistered",
              analyzed: true
            };
          }
          return item;
        });
        setPbcList(loadedPbc);

        // Store registered metadata mappings
        const pbcRegMap: Record<string, typeof registerResult> = {};
        bundle.evidence.forEach(ev => {
          if (ev.evidence_id) {
            const pbcItem = pbcList.find(p => p.name === ev.file_name);
            if (pbcItem) {
              pbcRegMap[pbcItem.id] = {
                objectId: ev.evidence_id,
                txDigest: ev.created_at || "Loaded from DB",
                blobId: ev.walrus_blob_id || "",
                commitment: ev.commitment || "",
              };
            }
          }
        });
        setPbcRegisteredData(pbcRegMap);
      }
      setSyncStatus(`Successfully synchronized: Q2 Engagement`);
    } catch (e) {
      setSyncStatus(`Error loading supabase: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleCreateEngagement = async () => {
    if (!isDemoStoreConfigured()) {
      alert("Supabase demo persistence is not configured.");
      return;
    }
    try {
      setSyncStatus("Creating Supabase engagement...");
      const eng = await createDemoEngagement({
        company_wallet: wallet.address || "0x-mock-wallet",
        audit_pack_id: auditPackId || "0x-mock-audit-pack",
      });
      setEngagementId(eng.id);
      window.history.replaceState(null, "", `/workspace-demo?engagement=${eng.id}`);
      setSyncStatus(`Engagement created. ID: ${eng.id}`);
    } catch (e) {
      setSyncStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Connect Wallet & Login Trigger
  const handleLogin = (role: "company" | "auditor") => {
    setSelectedRole(role);
    setIsLoggedIn(true);
  };

  // Mock Agent sandbox interaction
  const handleAgentConfirm = () => {
    setAgentStep(1);
    setActivityLogs([
      { title: "Coverage check", desc: "10 of 16 required docs found", status: "done" },
      { title: "Classifying contract", desc: "Document classified as customer_contract", status: "done" },
    ]);
    setChatLog(prev => [
      ...prev,
      { sender: "agent", text: "Terima kasih atas konfirmasinya. 09_customer_contract_orion_C-ORION-2026-019.pdf telah diklasifikasikan dengan asersi: **Occurrence & Accuracy**. Anda dapat membuka menu Web3 Registry di bawah untuk melakukan pendaftaran secara on-chain." }
    ]);
  };

  // Dynamic document upload simulation to make PBC Checklist interactive
  const handleAddDocument = () => {
    const docName = prompt("Masukkan nama dokumen PBC baru untuk diunggah:", "HR_contract_Q2.pdf");
    if (!docName) return;

    const newDoc = {
      id: `pbc-${pbcList.length + 1}`,
      name: docName,
      size: "1.2 MB",
      status: "unregistered" as const,
      type: docName.toLowerCase().endsWith(".xlsx") ? ("excel" as const) : docName.toLowerCase().endsWith(".csv") ? ("csv" as const) : ("pdf" as const),
      folder: "demo/PBC_list/evidence_initial/02_contracts_invoices",
      analyzed: false
    };

    setPbcList(prev => [...prev, newDoc]);

    // Simulate agent activity analysis trigger
    setActivityLogs(prev => [
      ...prev,
      { title: "Analyzing upload", desc: `Membaca ${docName}...`, status: "running" }
    ]);

    setTimeout(() => {
      setActivityLogs(prev =>
        prev.map(log =>
          log.title === "Analyzing upload" && log.desc.includes(docName)
            ? { ...log, desc: `Dokumen ${docName} berhasil dianalisis.`, status: "done" }
            : log
        )
      );

      setPbcList(currentList =>
        currentList.map(item =>
          item.name === docName ? { ...item, analyzed: true } : item
        )
      );
    }, 2000);
  };


  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput("");
    setChatLog(prev => [...prev, { sender: "user", text }]);

    setTimeout(() => {
      let reply = "Saya sedang menganalisis masukan Anda. Silakan lanjutkan verifikasi dokumen pada file directory Anda.";
      if (text.toLowerCase().includes("register") || text.toLowerCase().includes("sui")) {
        reply = "Untuk mendaftarkan dokumen ini ke Sui & Walrus secara permanen, silakan klik tombol panah bawah di layar Anda untuk membuka Web3 Registry panel.";
      } else if (text.toLowerCase().includes("kontrak") || text.toLowerCase().includes("orion") || text.toLowerCase().includes("sales")) {
        reply = "Kontrak 09_customer_contract_orion_C-ORION-2026-019.pdf memiliki total transaksi senilai IDR 855,000,000 dan siap didaftarkan dengan asersi Occurrence & Accuracy.";
      }
      setChatLog(prev => [...prev, { sender: "agent", text: reply }]);
    }, 1000);
  };

  // Real SUI / Walrus SDK Batch Registration Flow
  const handleRegisterWeb3 = async () => {
    if (!wallet.address) {
      alert("Harap hubungkan wallet Anda terlebih dahulu.");
      return;
    }
    setIsRegistering(true);
    setRegisterResult(null);

    try {
      const activeFile = pbcList.find(p => p.id === selectedPbcId);
      if (!activeFile) throw new Error("No active file selected");

      // Generate dummy file payload for demo wire purposes
      const dummyFile = new File(["dummy sales contract evidence content"], activeFile.name, {
        type: "application/pdf"
      });

      const flow = createRegisterEvidenceFlow({
        signTransaction: wallet.signTransaction,
        executeTransactionBlock: async (input) => {
          // Send to server executing Tatum Sui RPC endpoint
          const response = await fetch("/api/sui/execute", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "RPC submission failed");
          return payload;
        }
      });

      const result = await flow({
        file: dummyFile,
        documentType: activeFile.type,
        source: "Company Upload (L2)",
        description: `Demo registered: ${activeFile.name}`,
        assertions: ["Occurrence", "Accuracy"],
      });

      const regInfo = {
        objectId: result.objectId,
        txDigest: result.txDigest,
        blobId: result.blobId,
        commitment: result.commitment,
      };

      setRegisterResult(regInfo);

      // Update PBC List state
      const updatedPbc = pbcList.map(item =>
        item.id === selectedPbcId ? { ...item, status: "registered" as const } : item
      );
      setPbcList(updatedPbc);

      // Save registry details
      const newPbcRegData = { ...pbcRegisteredData, [selectedPbcId]: regInfo };
      setPbcRegisteredData(newPbcRegData);

      // Sync with Supabase if configured
      if (engagementId && isDemoStoreConfigured()) {
        await upsertDemoEvidence({
          id: generateId(),
          engagement_id: engagementId,
          evidence_id: result.objectId,
          file_name: activeFile.name,
          file_size: dummyFile.size,
          document_type: activeFile.type,
          source: "Company Upload (L2)",
          description: `Demo registered: ${activeFile.name}`,
          assertions: ["Occurrence", "Accuracy"],
          commitment: result.commitment,
          walrus_blob_id: result.blobId,
          audit_pack_id: auditPackId || null,
          registered_by_wallet: wallet.address,
          status: "registered",
        });
        setSyncStatus("Registered evidence successfully synced to Supabase demo store.");
      }

      alert("Evidence successfully registered on Sui & Walrus!");
    } catch (err) {
      console.error(err);
      alert(`Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // Real Auditor Attestation Flow
  const handleAuditorAttest = async (findingId: string) => {
    if (!wallet.address) {
      alert("Connect wallet before attesting.");
      return;
    }
    setIsAttesting(true);
    try {
      const activeFile = pbcList.find(p => p.name === "09_customer_contract_orion_C-ORION-2026-019.pdf");
      const targetId = pbcRegisteredData[activeFile?.id || ""]?.objectId || "0x-mock-target-id";

      // 1. Log AgentAction to Sui (emit event)
      const actionFlow = createEmitAgentActionFlow({
        signTransaction: wallet.signTransaction,
        executeTransactionBlock: async (input) => {
          const response = await fetch("/api/sui/execute", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Agent action log failed");
          return payload;
        }
      });

      const actionResult = await actionFlow({
        packId: auditPackId || "0x-mock-pack-id",
        evidenceId: targetId,
        actionType: "ccer_finding",
        outputHash: "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715a1a1e8a1a1e8a1a1e8", // mock hash of finding schema
      });

      // 2. Submit reviewer attestation to Sui
      const attestFlow = createAttestationFlow({
        signTransaction: wallet.signTransaction,
        executeTransactionBlock: async (input) => {
          const response = await fetch("/api/sui/execute", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Attestation failed");
          return payload;
        }
      });

      const attestResult = await attestFlow({
        targetId,
        attestationType: "evidenceVerified",
        sourceConfidence: "L3",
        notes: "Auditor reviewed 09_customer_contract_orion_C-ORION-2026-019.pdf and confirmed matching IDR 855,000,000 transaction.",
      });

      // Update finding status
      const updatedFindings = auditorFindings.map(f =>
        f.id === findingId ? { ...f, status: "confirmed", txDigest: attestResult.txDigest } : f
      );
      setAuditorFindings(updatedFindings);

      // Sync attestation to Supabase if configured
      if (engagementId && isDemoStoreConfigured()) {
        await insertDemoAttestation({
          id: generateId(),
          engagement_id: engagementId,
          evidence_id: targetId,
          attestation_id: attestResult.attestationId,
          tx_digest: attestResult.txDigest,
          reviewer_wallet: wallet.address,
          action: "evidenceVerified",
          note: "Auditor reviewed 09_customer_contract_orion_C-ORION-2026-019.pdf.",
        });
        setSyncStatus("Reviewer attestation synced to Supabase.");
      }

      alert("Reviewer attestation and AgentAction successfully committed to Sui!");
    } catch (err) {
      console.error(err);
      alert(`Attestation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAttesting(false);
    }
  };

  // ----------------------------------------------------
  // RENDER GATEWAY: IF NOT LOGGED IN
  // ----------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="demo-wrapper">
        <div className="login-container">
          <div className="liquid-glass login-card">
            <div className="login-logo">
              <Image src="/mascot.png" alt="Linow Mascot" width={48} height={48} />
            </div>
            <h1 className="login-title">Linow Workspace</h1>
            <p className="login-subtitle">Persistent Audit Memory for AI Agents on Walrus + Sui</p>

            <div className="role-selector">
              <div
                className={`role-option ${selectedRole === "company" ? "active" : ""}`}
                onClick={() => setSelectedRole("company")}
              >
                <div className="role-icon">
                  <Icons.Robot />
                </div>
                <div className="role-name">Company</div>
                <div className="role-desc">Prepare File Directory</div>
              </div>
              <div
                className={`role-option ${selectedRole === "auditor" ? "active" : ""}`}
                onClick={() => setSelectedRole("auditor")}
              >
                <div className="role-icon">
                  <Icons.Shield />
                </div>
                <div className="role-name">Auditor</div>
                <div className="role-desc">Review & Attest Findings</div>
              </div>
            </div>

            <div className="login-wallet-section">
              {wallet.address ? (
                <div>
                  <p className="text-xs text-secondary margin-bottom-md">
                    Connected Wallet: <span className="font-mono font-semibold">{wallet.address.substring(0, 10)}...</span>
                  </p>
                  <button className="btn-primary w-full" onClick={() => handleLogin(selectedRole)}>
                    Enter Workspace
                  </button>
                </div>
              ) : (
                <div className="flex-center">
                  {wallet.connectButton}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER DASHBOARD: FOR COMPANY ROLE
  // ----------------------------------------------------
  if (selectedRole === "company") {
    return (
      <div className="demo-wrapper">
        {/* Top Navbar */}
        <header className="app-header">
          <div className="header-brand">
            <div className="header-dropdown-pill">
              <Image src="/linow-logo.svg" alt="Linow Logo" width={20} height={20} style={{ objectFit: 'contain', marginRight: 4 }} />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.1px', marginRight: 2 }}>Linow Workspace</span>
              <Icons.ChevronDown className="opacity-half" />
              <span className="header-zoom-pill">Z 100%</span>
            </div>
            <div className="header-dropdown-pill" style={{ marginLeft: 6 }}>
              <div className="header-profile-avatar">AC</div>
              <span>Acme Corp / Q2 2026 Audit / Fieldwork / {registeredCount}/{totalCount} Files / Active</span>
              <span className="role-badge company" style={{ marginLeft: 6 }}>Company</span>
            </div>
          </div>
          <div className="header-actions">
            <span className="text-xxs text-muted font-mono">
              {wallet.address ? `${wallet.address.substring(0, 8)}...${wallet.address.slice(-6)}` : "No Wallet"}
            </span>
            <button className="btn-secondary text-xxs" onClick={() => setIsLoggedIn(false)}>
              Switch Role
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="app-layout">
          {/* Navigation Rail */}
          <aside className="nav-rail">
            <div className={`nav-item ${activeTab === "agent" ? "active" : ""}`} onClick={() => setActiveTab("agent")}>
              <Icons.Sparkles />
              <span className="nav-tooltip">Agent Sandbox</span>
            </div>
            <div className={`nav-item ${activeTab === "registry" ? "active" : ""}`} onClick={() => setIsRegistryOpen(!isRegistryOpen)}>
              <Icons.BoxChain />
              <span className="nav-tooltip">Web3 Registry</span>
            </div>
            <div className={`nav-item`} onClick={() => alert("Verification portal is available in primary workspace.")}>
              <Icons.ShieldCheck />
              <span className="nav-tooltip">Verifier Check</span>
            </div>
          </aside>

          {/* 3-Pane Layout container */}
          <main className="workspace-container">
            {/* 1. Left Pane: PBC Checklist */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="pbc-counter">
                        {pbcList.filter(p => p.status === "registered" || pbcRegisteredData[p.id]).length}/{pbcList.length}
                      </span>
                      <button className="pane-toggle-btn" onClick={() => setIsPbcExpanded(false)} title="Collapse File Directory">
                        <Icons.ChevronLeft />
                      </button>
                    </div>
                  </div>
                  <div className="pbc-list-container" style={{ gap: 0, padding: 0 }}>
                    <div className="ide-file-tree">
                      {getExplorerNodes().filter(node => isNodeVisible(node.path)).map(node => {
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
                              onClick={() => {
                                if (isFolder) {
                                  setOpenFolders(prev => ({ ...prev, [node.path]: !prev[node.path] }));
                                  setSelectedFolder(node.path);
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
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button className="pbc-add-btn" onClick={handleAddDocument} style={{ margin: '12px 10px 8px', width: 'calc(100% - 20px)' }}>
                      <Icons.Plus />
                      Add document
                    </button>
                  </div>
                </>
              )}
            </section>

            {isPbcExpanded ? (
              <div className="resize-handle" onMouseDown={startResizeLeft} />
            ) : (
              <div className="pane-gap-divider" />
            )}

            {/* 2. Center Pane: Document Preview */}
            <section className="workspace-pane pane-preview" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="preview-title-bar" style={{ padding: '16px 20px 12px', marginBottom: 0 }}>
                <h3 className="preview-title">Preview</h3>
                <span className="preview-subtitle">
                  {pbcList.find(p => p.id === selectedPbcId)?.name || ""} — page 1 of 1
                </span>
              </div>

              {/* PDF Viewer Interface */}
              <div className="pdf-viewer-container">
                {/* PDF Toolbar */}
                <div className="pdf-toolbar">
                  <div className="pdf-toolbar-left">
                    <button className="pdf-tool-btn" title="Toggle Sidebar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
                    </button>
                    <button className="pdf-tool-btn" title="Search document">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </button>
                    <div className="pdf-page-navigation">
                      <button className="pdf-tool-btn" title="Previous page">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg>
                      </button>
                      <input type="text" className="pdf-page-input" defaultValue="1" readOnly />
                      <span className="pdf-page-count">of 1</span>
                      <button className="pdf-tool-btn" title="Next page">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="pdf-toolbar-right">
                    <button className="pdf-tool-btn" title="Zoom Out">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
                    </button>
                    <button className="pdf-tool-btn" title="Zoom In">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                    </button>
                    <select className="pdf-zoom-select" defaultValue="auto">
                      <option value="auto">Automatic Zoom</option>
                      <option value="50">50%</option>
                      <option value="100">100%</option>
                      <option value="150">150%</option>
                    </select>
                  </div>
                </div>

                {/* PDF Canvas Container (Dark gray background) */}
                <div className="pdf-canvas">
                  {renderPreviewCanvas()}
                </div>
              </div>

              <div className="preview-legend" style={{ padding: '10px 20px' }}>
                <div className="legend-item">
                  <span className="legend-dot read"></span>
                  <span>sedang dibaca</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot cross"></span>
                  <span>cross-ref</span>
                </div>
              </div>
            </section>

            {isAgentExpanded ? (
              <div className="resize-handle" onMouseDown={startResizeRight} />
            ) : (
              <div className="pane-gap-divider" />
            )}

            {/* 3. Right Pane: Agent activity sandbox */}
            <section
              className={`workspace-pane pane-agent ${!isAgentExpanded ? 'collapsed' : ''}`}
              style={{ width: isAgentExpanded ? `${agentWidth}px` : '52px' }}
            >
              {!isAgentExpanded ? (
                <>
                  <button className="pane-toggle-btn" onClick={() => setIsAgentExpanded(true)} title="Expand Agent Panel">
                    <Icons.ChevronLeft />
                  </button>
                  <div className="pane-collapsed-indicator">Agent Activity</div>
                </>
              ) : (
                <>
                  <div className="agent-activity-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="agent-activity-title">Agent activity</h3>
                    <button className="pane-toggle-btn" onClick={() => setIsAgentExpanded(false)} title="Collapse Agent Panel">
                      <Icons.ChevronRight />
                    </button>
                  </div>

                  <div className="agent-activity-feed">
                    {activityLogs.map((log, idx) => (
                      <div key={idx} className="activity-card">
                        <div className="activity-card-left">
                          <span className={`activity-status-dot ${log.status}`} />
                          <span className="activity-card-name" style={{ marginRight: 4 }}>{log.title}</span>
                          <span className="activity-card-desc">{log.desc}</span>
                        </div>
                        <span className={`activity-status-badge ${log.status}`}>
                          {log.status === "done" ? "Done" : log.status === "running" ? "Running" : "Queued"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Chat sandbox box with prompt-anchored permission popup */}
                  <div className="agent-chat-container">
                    <div className="chat-log-box">
                      {chatLog.map((chat, idx) => (
                        <div key={idx} className={`chat-bubble ${chat.sender === "user" ? 'user' : 'agent'}`}>
                          {chat.sender === "agent" && (
                            <span style={{ fontWeight: 800, color: '#96948e', flexShrink: 0, marginTop: '2px', marginRight: '4px' }}>::</span>
                          )}
                          <div>{renderChatText(chat.text)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Sandbox Prompt-Anchored Permission Sheet */}
                    {!permissionSubmitted && (
                      <div className="permission-popup-sheet">
                        <div className="permission-popup-header">
                          <span className="terminal-icon">$_</span>
                          <span>Allow running this command?</span>
                        </div>

                        <div className="permission-command-box">
                          <code>
                            sui_execute_transaction --module evidence --action register --file 09_customer_contract_orion_C-ORION-2026-019.pdf --assertions ["Occurrence", "Accuracy"]
                          </code>
                        </div>

                        <div className="permission-options-list">
                          {[
                            { id: "allow", title: "1. Yes, allow this time", desc: "Allow single execution" },
                            { id: "no", title: "2. No (cancel transaction)", desc: "Deny execution request" }
                          ].map(opt => (
                            <div
                              key={opt.id}
                              className={`permission-option-row ${permissionChoice === opt.id ? "active" : ""}`}
                              onClick={() => setPermissionChoice(opt.id as any)}
                            >
                              <span>{opt.title}</span>
                              <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: 400 }}>{opt.desc}</span>
                            </div>
                          ))}
                        </div>

                        <div className="permission-popup-actions">
                          <button type="button" className="permission-btn-skip" onClick={() => alert("Skipped permission step")}>
                            Skip
                          </button>
                          <button type="button" className="permission-btn-submit" onClick={() => {
                            setPermissionSubmitted(true);
                            setActivityLogs(prev => [
                              ...prev,
                              { title: "Verifying rule", desc: `Sandbox permission resolved: ${permissionChoice}`, status: "done" }
                            ]);
                            if (permissionChoice === "no") {
                              setChatLog(prev => [...prev, { sender: "agent", text: "Transaction execution **denied** by user. Tatum RPC aborted." }]);
                            } else {
                              setChatLog(prev => [
                                ...prev,
                                { sender: "agent", text: `Transaction execution **approved** via sandbox (allow this time). sui_execute_transaction completed.` }
                              ]);
                              // Automatically update status for 09_customer_contract_orion_C-ORION-2026-019.pdf to registered
                              const updatedPbc = pbcList.map(item =>
                                item.id === "pbc-orion-contract" ? { ...item, status: "registered" as const } : item
                              );
                              setPbcList(updatedPbc);
                            }
                          }}>
                            Submit ↵
                          </button>
                        </div>
                      </div>
                    )}

                    {permissionSubmitted && (
                      <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Resolved: {permissionChoice === "allow" ? "Approved" : "Denied"}
                        </span>
                        <button className="btn-secondary text-xxs" style={{ padding: '2px 8px' }} onClick={() => setPermissionSubmitted(false)}>
                          Re-trigger Permission
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendChatMessage} className="agent-chat-input-wrapper">
                      <input
                        type="text"
                        className="agent-chat-input"
                        placeholder="Tanya agent..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                      />
                      <button type="submit" className="agent-chat-send">
                        <Icons.Send />
                      </button>
                    </form>
                  </div>

                  {/* Scroll down trigger for Web3 registry */}
                  <div className="workspace-footer">
                    <button className="scroll-down-btn" onClick={() => setIsRegistryOpen(!isRegistryOpen)}>
                      {isRegistryOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </button>
                  </div>
                </>
              )}
            </section>
          </main>

          {/* Web3 Slide-Up Registry Drawer */}
          <div className={`web3-drawer ${isRegistryOpen ? "open" : ""}`} style={{ height: "450px" }}>
            <div className="drawer-toggle-bar" onClick={() => setIsRegistryOpen(false)}>
              <span className="drawer-title">
                <Icons.Chain /> Web3 Document Registry (Active Sui & Walrus Integration)
              </span>
              <Icons.ChevronDown className="drawer-arrow" />
            </div>

            <div className="drawer-content">
              {/* Form Input fields */}
              <div className="registry-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Engagement ID / Supabase sync</label>
                    <input
                      type="text"
                      className="form-input"
                      value={engagementId}
                      placeholder="Supabase Engagement UUID"
                      onChange={(e) => setEngagementId(e.target.value)}
                    />
                    <button className="btn-secondary text-xxs margin-top-sm" onClick={handleCreateEngagement}>
                      Create / Sync Engagement
                    </button>
                    <span className="text-xxs text-muted">{syncStatus}</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audit Pack Object ID (Sui)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Sui Object ID: 0x..."
                      value={auditPackId}
                      onChange={(e) => setAuditPackId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Document Name</label>
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value={pbcList.find(p => p.id === selectedPbcId)?.name || ""}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Evidence Type</label>
                    <input
                      type="text"
                      className="form-input"
                      value={pbcList.find(p => p.id === selectedPbcId)?.type || ""}
                      readOnly
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmed ISA Assertions (Audit-readiness Proposal)</label>
                  <div className="checkbox-group">
                    {ISA_ASSERTIONS.map(assertion => (
                      <label key={assertion} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={assertion === "Occurrence" || assertion === "Accuracy"}
                          readOnly
                        />
                        <span>{assertion}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="margin-top-sm">
                  <button
                    className="btn-primary"
                    disabled={isRegistering || pbcList.find(p => p.id === selectedPbcId)?.status === "registered"}
                    onClick={handleRegisterWeb3}
                  >
                    {isRegistering ? "Registering..." : pbcList.find(p => p.id === selectedPbcId)?.status === "registered" ? "Already Registered" : "Register to Sui & Walrus"}
                  </button>
                </div>
              </div>

              {/* Web3 Proof Console */}
              <div className="web3-proof-console">
                <span className="proof-console-title">Sui Proof Artifact Console</span>
                {pbcRegisteredData[selectedPbcId] || registerResult ? (
                  <>
                    <div className="proof-console-row">
                      <span className="proof-console-label">Evidence Record ID</span>
                      <span className="proof-console-value">
                        {pbcRegisteredData[selectedPbcId]?.objectId || registerResult?.objectId}
                      </span>
                    </div>
                    <div className="proof-console-row">
                      <span className="proof-console-label">Walrus Blob reference</span>
                      <span className="proof-console-value">
                        {pbcRegisteredData[selectedPbcId]?.blobId || registerResult?.blobId}
                      </span>
                    </div>
                    <div className="proof-console-row">
                      <span className="proof-console-label">Evidence Commitment hash</span>
                      <span className="proof-console-value">
                        {pbcRegisteredData[selectedPbcId]?.commitment || registerResult?.commitment}
                      </span>
                    </div>
                    <div className="proof-console-row">
                      <span className="proof-console-label">Transaction digest</span>
                      <span className="proof-console-value">
                        {pbcRegisteredData[selectedPbcId]?.txDigest || registerResult?.txDigest}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted text-center w-full">
                    Select an unregistered document, confirm assertions, and submit to populate proof console.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER DASHBOARD: FOR AUDITOR ROLE
  // ----------------------------------------------------
  return (
    <div className="demo-wrapper">
      {/* Top Navbar */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-dropdown-pill">
            <Image src="/linow-logo.svg" alt="Linow Logo" width={20} height={20} style={{ objectFit: 'contain', marginRight: 4 }} />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.1px', marginRight: 2 }}>Linow Workspace</span>
            <Icons.ChevronDown className="opacity-half" />
            <span className="header-zoom-pill">Z 100%</span>
          </div>
          <div className="header-dropdown-pill" style={{ marginLeft: 6 }}>
            <div className="header-profile-avatar">AC</div>
            <span>Acme Corp / Q2 2026 Audit / Fieldwork / {registeredCount}/{totalCount} Files / Active</span>
            <span className="role-badge auditor" style={{ marginLeft: 6 }}>Auditor</span>
          </div>
        </div>
        <div className="header-actions">
          <span className="text-xxs text-muted font-mono">
            {wallet.address ? `${wallet.address.substring(0, 8)}...${wallet.address.slice(-6)}` : "No Wallet"}
          </span>
          <button className="btn-secondary text-xxs" onClick={() => setIsLoggedIn(false)}>
            Switch Role
          </button>
        </div>
      </header>

      {/* Auditor Layout */}
      <div className="app-layout">
        <aside className="nav-rail">
          <div className={`nav-item active`}>
            <Icons.ShieldCheck />
            <span className="nav-tooltip">Audit Findings</span>
          </div>
        </aside>

        <main className="workspace-container">
          {/* Left column: Registered Evidence Checklist */}
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
                  <button className="pane-toggle-btn" onClick={() => setIsPbcExpanded(false)} title="Collapse File Directory">
                    <Icons.ChevronLeft />
                  </button>
                </div>
                <div className="pbc-list-container" style={{ gap: 0, padding: 0 }}>
                  <div className="ide-file-tree">
                    {(() => {
                      const filteredNodes = getExplorerNodes().filter(node => {
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

                      const visibleNodes = filteredNodes.filter(node => isNodeVisible(node.path));

                      if (visibleNodes.filter(n => n.type === "file").length === 0) {
                        return (
                          <p className="text-xs text-muted text-center w-full" style={{ padding: '20px 10px' }}>
                            No evidence files registered by the Company yet. Go to Company Mode to register files first.
                          </p>
                        );
                      }

                      return visibleNodes.map(node => {
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
                              onClick={() => {
                                if (isFolder) {
                                  setOpenFolders(prev => ({ ...prev, [node.path]: !prev[node.path] }));
                                  setSelectedFolder(node.path);
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
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Supabase Sync console */}
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
              </>
            )}
          </section>

          {isPbcExpanded ? (
            <div className="resize-handle" onMouseDown={startResizeLeft} />
          ) : (
            <div className="pane-gap-divider" />
          )}

          {/* Center Column: Document Preview */}
          <section className="workspace-pane pane-preview" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="preview-title-bar" style={{ padding: '16px 20px 12px', marginBottom: 0 }}>
              <h3 className="preview-title">Preview</h3>
              <span className="preview-subtitle">
                {pbcList.find(p => p.id === selectedPbcId)?.name || ""} — Reviewer View
              </span>
            </div>

            {/* PDF Viewer Interface */}
            <div className="pdf-viewer-container">
              {/* PDF Toolbar */}
              <div className="pdf-toolbar">
                <div className="pdf-toolbar-left">
                  <button className="pdf-tool-btn" title="Toggle Sidebar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
                  </button>
                  <button className="pdf-tool-btn" title="Search document">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  </button>
                  <div className="pdf-page-navigation">
                    <button className="pdf-tool-btn" title="Previous page">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg>
                    </button>
                    <input type="text" className="pdf-page-input" defaultValue="1" readOnly />
                    <span className="pdf-page-count">of 1</span>
                    <button className="pdf-tool-btn" title="Next page">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>
                </div>
                <div className="pdf-toolbar-right">
                  <button className="pdf-tool-btn" title="Zoom Out">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
                  </button>
                  <button className="pdf-tool-btn" title="Zoom In">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                  </button>
                  <select className="pdf-zoom-select" defaultValue="auto">
                    <option value="auto">Automatic Zoom</option>
                    <option value="50">50%</option>
                    <option value="100">100%</option>
                    <option value="150">150%</option>
                  </select>
                </div>
              </div>

              {/* PDF Canvas Container */}
              <div className="pdf-canvas">
                {renderPreviewCanvas()}
              </div>
            </div>
          </section>

          {isAgentExpanded ? (
            <div className="resize-handle" onMouseDown={startResizeRight} />
          ) : (
            <div className="pane-gap-divider" />
          )}

          {/* Right Column: Findings and Attestation Actions */}
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
        </main>
      </div>
    </div>
  );
}
