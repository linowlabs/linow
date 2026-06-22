"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  createRegisterEvidenceFlow,
  createAttestationFlow,
  createEmitAgentActionFlow,
  type AssertionId,
  type ExecuteTransactionBlockInput,
  type JsonValue,
} from "@linow/sdk";
import {
  createDemoEngagement,
  isDemoStoreConfigured,
  loadDemoEngagement,
  upsertDemoEvidence,
  insertDemoAttestation,
} from "@/lib/demo-store";
import { useWalletBridge } from "@/lib/wallet-context";
import { Icons } from "./icons";
import "./demo.css";

// Types
import { PbcItem, Finding, ActivityLog, ChatLogItem, RegisterResult } from "./types";

// Constants
import { 
  DEFAULT_COMPANY_PBC, 
  generateId,
  HEALTHCARE_PBC,
  FINTECH_PBC,
  MANUFACTURING_PBC,
  ECOMMERCE_PBC
} from "./constants";

// Sub-components
import LoginGateway from "./components/LoginGateway";
import WorkspaceHeader from "./components/WorkspaceHeader";
import FileExplorer from "./components/FileExplorer";
import PreviewPane from "./components/PreviewPane";
import AgentSandbox from "./components/AgentSandbox";
import RegistryWorkspace from "./components/RegistryWorkspace";
import AuditorFindings from "./components/AuditorFindings";
import DetailsModal from "./components/DetailsModal";
import VerifierWorkspace from "./components/VerifierWorkspace";
import CompanyOnboarding, { OnboardingResult } from "./components/CompanyOnboarding";
import WorkspaceUploadOverlay from "./components/WorkspaceUploadOverlay";
import UploadDocumentModal from "./components/UploadDocumentModal";

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : response.statusText,
    );
  }
  return payload as TResponse;
}

const serverTatumExecute = {
  executeTransactionBlock(input: ExecuteTransactionBlockInput) {
    return postJson<JsonValue>("/api/sui/execute", input);
  },
};

const LIVE_PACKAGE_ID =
  process.env.NEXT_PUBLIC_LINOW_PACKAGE_ID ??
  "0x8460a046d70e0e0940d556d9526c48ee683ca8672390ff6480e937dc9a69d6aa";

const isLiveSuiObjectId = (value?: string | null) =>
  Boolean(value && /^0x[0-9a-fA-F]{64}$/.test(value));

type RegisterNotice = {
  tone: "success" | "error" | "info";
  title: string;
  message?: string;
};

export default function WorkspaceDemo() {
  const realWallet = useWalletBridge();
  const [mockAddress, setMockAddress] = useState<string | undefined>(undefined);

  const wallet = useMemo(() => {
    return {
      ...realWallet,
      address: mockAddress || realWallet.address,
    };
  }, [realWallet, mockAddress]);

  // Authentication and Roles state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingSelections, setOnboardingSelections] = useState<OnboardingResult | null>(null);
  const [isUploadOverlayOpen, setIsUploadOverlayOpen] = useState(false);
  const [customFolder, setCustomFolder] = useState("");
  const [selectedRole, setSelectedRole] = useState<"company" | "auditor">("company");
  const [activeTab, setActiveTab] = useState<"agent" | "registry" | "verifier">("agent");

  // Web3 state
  const [auditPackId, setAuditPackId] = useState<string>("");
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerNotice, setRegisterNotice] = useState<RegisterNotice | null>(null);

  // Supabase Sync state
  const [engagementId, setEngagementId] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<string>("Not connected to Supabase");

  // Dynamic folder paths
  const [folders, setFolders] = useState<string[]>([]);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);

  // Company PBC List
  const [pbcList, setPbcList] = useState<PbcItem[]>([]);
  const [selectedPbcId, setSelectedPbcId] = useState("");
  const [pbcRegisteredData, setPbcRegisteredData] = useState<Record<string, RegisterResult>>({
    "pbc-invoice-batch": {
      objectId: "0x9ac2849e7dd55a12b234d98a7c1b52a30f9e41f0",
      txDigest: "18 Jun, 14:02",
      blobId: "walrus-blob-invoice-batch",
      commitment: "commitment-invoice-batch"
    },
    "pbc-orion-contract": {
      objectId: "0x892a7e2b10fc7d93ea8b19280d8591c2849e7dd",
      txDigest: "17 Jun, 10:15",
      blobId: "walrus-blob-orion-contract",
      commitment: "commitment-orion-contract"
    },
    "pbc-pdf-june": {
      objectId: "0x12b234d98a7c1b52a30f9e41f0892a7e2b10fc7d",
      txDigest: "16 Jun, 11:30",
      blobId: "walrus-blob-june-report",
      commitment: "commitment-june-report"
    }
  });

  // Review Details Modal State
  const [selectedReviewFile, setSelectedReviewFile] = useState<PbcItem | null>(null);
  const [reviewDocType, setReviewDocType] = useState<string>("");
  const [reviewAssertions, setReviewAssertions] = useState<string[]>([]);

  const handleSelectReviewFile = (file: PbcItem | null) => {
    setSelectedReviewFile(file);
    setRegisterNotice(null);
  };

  // Folder tree open states
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const [selectedFolder, setSelectedFolder] = useState<string>("");

  // Panel sizing & expand state
  const [isPbcExpanded, setIsPbcExpanded] = useState(true);
  const [isAgentExpanded, setIsAgentExpanded] = useState(true);
  const [pbcWidth, setPbcWidth] = useState(300);
  const [agentWidth, setAgentWidth] = useState(340);

  // Chat & Sandbox Activity state
  const [agentStep, setAgentStep] = useState(0); 
  const [activityLogsState, setActivityLogsState] = useState<ActivityLog[]>([]);
  
  const updateInlineActivityLogs = (logs: ActivityLog[]) => {
    if (logs.length === 0) return;
    setChatLog(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.sender === "activity") {
        return prev.map((msg, index) => {
          if (index === prev.length - 1) {
            return { ...msg, activityLogs: logs };
          }
          return msg;
        });
      } else {
        return [...prev, { id: generateId(), sender: "activity", text: "", activityLogs: logs }];
      }
    });
  };

  const setActivityLogs = (val: React.SetStateAction<ActivityLog[]>) => {
    setActivityLogsState(prev => {
      const nextLogs = typeof val === "function" ? val(prev) : val;
      updateInlineActivityLogs(nextLogs);
      return nextLogs;
    });
  };

  const activityLogs = activityLogsState;
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<ChatLogItem[]>([
    { sender: "agent", text: "Welcome to Linow Agent Sandbox! I am your AI compliance assistant. To begin, click \"+ Add document\" or create a folder in the File Directory panel to upload your compliance evidence. Once uploaded, I will automatically scan and verify your documents on Walrus and Sui." }
  ]);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auditor Findings State
  const [auditorFindings, setAuditorFindings] = useState<Finding[]>([
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

  // Agent permission dialog state
  const [permissionChoice, setPermissionChoice] = useState<"allow" | "always" | "no">("allow");
  const [permissionSubmitted, setPermissionSubmitted] = useState(true);
  const [permissionFileName, setPermissionFileName] = useState("");

  const registeredCount = useMemo(() => {
    return pbcList.filter(p => p.status === "registered" || pbcRegisteredData[p.id]).length;
  }, [pbcList, pbcRegisteredData]);

  const totalCount = pbcList.length;

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

  const streamChatResponse = (text: string, callback?: () => void) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    setIsAgentThinking(false);
    
    const bubbleId = generateId();
    // Add empty bubble for streaming response
    setChatLog(prev => [...prev, { id: bubbleId, sender: "agent", text: "" }]);
    
    const words = text.split(" ");
    let wordIndex = 0;
    
    streamIntervalRef.current = setInterval(() => {
      if (wordIndex >= words.length) {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
        if (callback) callback();
        return;
      }
      
      const nextWord = words[wordIndex];
      setChatLog(prev => {
        return prev.map((msg) => {
          if (msg.id === bubbleId) {
            return {
              ...msg,
              text: msg.text ? msg.text + " " + nextWord : nextWord
            };
          }
          return msg;
        });
      });
      
      wordIndex++;
    }, 90);
  };

  // Cleanup stream intervals on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  // Listen for permission submission in Phase 3
  useEffect(() => {
    if (agentStep === 3 && permissionSubmitted) {
      // User submitted the permission!
      setIsAgentThinking(true);

      setActivityLogs([
        { title: "Updating checklist matrix", desc: "Syncing verified assertions...", status: "running" }
      ]);

      const t1 = setTimeout(() => {
        setActivityLogs([
          { title: "Updating checklist matrix", desc: "Syncing verified assertions...", status: "done" },
          { title: "Ledger commit", desc: "Writing transaction to Sui ledger...", status: "running" }
        ]);

        const t2 = setTimeout(() => {
          setActivityLogs([
            { title: "Updating checklist matrix", desc: "Syncing verified assertions...", status: "done" },
            { title: "Ledger commit", desc: "Writing transaction to Sui ledger...", status: "done" },
            { title: "Attestation check", desc: "Awaiting Walrus attestation confirmation...", status: "running" }
          ]);

          const t3 = setTimeout(() => {
            setActivityLogs([
              { title: "Updating checklist matrix", desc: "Syncing verified assertions...", status: "done" },
              { title: "Ledger commit", desc: "Writing transaction to Sui ledger...", status: "done" },
              { title: "Attestation check", desc: "Walrus attestation confirmed.", status: "done" },
              { title: "Matrix status update", desc: "100% completeness updated.", status: "done" }
            ]);

            // Register the contract file in the PBC list
            setPbcList(currentList =>
              currentList.map(item => {
                if (item.name.toLowerCase().includes("contract_04") || item.name.toLowerCase().includes("contract-04")) {
                  return { ...item, status: "registered" as const, analyzed: true, agentTag: "Verified Revenue Evidence" };
                }
                return item;
              })
            );

            const replyText = `Action completed. I have updated your matrix and the completeness status for this revenue stream is now 100% green.

However, while reading the commercial terms in that same contract, I detected another specific clause: **'Contracts above IDR 750,000,000 require Commercial Committee approval before revenue recognition.'**

Since this contract is IDR 855,000,000, we need the signed committee approval sheet to prevent a potential valuation risk. Do I have your permission to create a new pending task in your workspace to track this specific document?`;

            setTimeout(() => {
              streamChatResponse(replyText, () => {
                setAgentStep(4);
              });
            }, 500);
          }, 2400); // 2400ms
        }, 2300); // 2300ms
      }, 2300); // 2300ms

      return () => {
        clearTimeout(t1);
      };
    }
  }, [permissionSubmitted, agentStep]);

  // Listen for bank reconciliation permission submission in Step 6
  useEffect(() => {
    if (agentStep === 6 && permissionSubmitted) {
      setIsAgentThinking(true);

      setActivityLogs([
        { title: "Registering on-chain proof", desc: "Generating Zero-Knowledge statement proof...", status: "running" }
      ]);

      const t1 = setTimeout(() => {
        setActivityLogs([
          { title: "Registering on-chain proof", desc: "Generating Zero-Knowledge statement proof...", status: "done" },
          { title: "Ledger commit", desc: "Writing bank reconciliation to Sui registry...", status: "running" }
        ]);

        const t2 = setTimeout(() => {
          setActivityLogs([
            { title: "Registering on-chain proof", desc: "Generating Zero-Knowledge statement proof...", status: "done" },
            { title: "Ledger commit", desc: "Writing bank reconciliation to Sui registry...", status: "done" },
            { title: "Awaiting Walrus attestation", desc: "Storing reconciliation proof...", status: "running" }
          ]);

          const t3 = setTimeout(() => {
            setActivityLogs([
              { title: "Registering on-chain proof", desc: "Generating ZK proof...", status: "done" },
              { title: "Ledger commit", desc: "Bank reconciliation registered on Sui.", status: "done" },
              { title: "Awaiting Walrus attestation", desc: "Walrus attestation confirmed.", status: "done" }
            ]);

            // Register bank statements in PBC list
            setPbcList(currentList =>
              currentList.map(item => {
                if (item.name === "Bank_statement_Q2.pdf" || item.name === "Bank_reconciliation_June.xlsx") {
                  return { ...item, status: "registered" as const, analyzed: true, agentTag: "Reconciliation Evidence" };
                }
                return item;
              })
            );

            const replyText = `Reconciliation evidence registered. The registry has been updated. Is there anything else you'd like me to summarize?`;

            setTimeout(() => {
              streamChatResponse(replyText, () => {
                setAgentStep(7);
              });
            }, 500);
          }, 2400);
        }, 2300);
      }, 2300);

      return () => {
        clearTimeout(t1);
      };
    }
  }, [permissionSubmitted, agentStep]);

  const loadSyncEngagement = async (id: string) => {
    try {
      setSyncStatus("Loading Supabase engagement...");
      const bundle = await loadDemoEngagement(id);
      if (bundle.engagement.audit_pack_id) {
        setAuditPackId(bundle.engagement.audit_pack_id);
      }
      if (bundle.evidence.length > 0) {
        setPbcList(currentList => {
          const loadedPbc = currentList.map(item => {
            const match = bundle.evidence.find(ev => ev.file_name === item.name);
            if (match) {
              return {
                ...item,
                status: (match.evidence_id ? "registered" : "unregistered") as PbcItem["status"],
                analyzed: true
              };
            }
            return item;
          });

          const pbcRegMap: Record<string, RegisterResult> = {};
          bundle.evidence.forEach(ev => {
            if (ev.evidence_id) {
              const pbcItem = loadedPbc.find(p => p.name === ev.file_name);
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

          return loadedPbc;
        });
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

  const handleLogin = (role: "company" | "auditor") => {
    setSelectedRole(role);
    if (role === "company") {
      setIsOnboarding(true);
    } else {
      setIsLoggedIn(true);
    }
  };

  const handleAgentConfirm = () => {
    setAgentStep(1);
    setActivityLogs([
      { title: "Coverage check", desc: "10 of 16 required docs found", status: "done" },
      { title: "Classifying contract", desc: "Document classified as customer_contract", status: "done" },
    ]);
    setChatLog(prev => [
      ...prev,
      { sender: "agent", text: "Thank you for the confirmation. 09_customer_contract_orion_C-ORION-2026-019.pdf has been classified with assertions: **Occurrence & Accuracy**. You can open the Web3 Registry menu below to register it on-chain." }
    ]);
  };

  const handleAddDocument = () => {
    setIsAddDocumentModalOpen(true);
  };

  const triggerStep1Scan = () => {
    // If workspace is empty, populate mock files to make sure the user can run the scenario successfully!
    if (pbcList.length === 0) {
      const defaultDocs: PbcItem[] = [
        { id: "pbc-1", name: "General_Ledger_2026.xlsx", folder: "", size: "1.2 MB", status: "unregistered", type: "excel", analyzed: false },
        { id: "pbc-2", name: "Balance_Sheet_Q2.pdf", folder: "", size: "450 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-3", name: "Sales_contract_01.pdf", folder: "", size: "820 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-4", name: "Sales_contract_02.pdf", folder: "", size: "680 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-5", name: "Sales_contract_03.pdf", folder: "", size: "710 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-6", name: "Sales_invoice_INV-2026-001.pdf", folder: "", size: "120 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-7", name: "Sales_invoice_INV-2026-002.pdf", folder: "", size: "140 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-8", name: "Sales_invoice_INV-2026-003.pdf", folder: "", size: "115 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-9", name: "Sales_invoice_INV-2026-004.pdf", folder: "", size: "130 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-10", name: "Bank_statement_Q2.pdf", folder: "", size: "980 KB", status: "unregistered", type: "pdf", analyzed: false },
        { id: "pbc-11", name: "Bank_reconciliation_June.xlsx", folder: "", size: "320 KB", status: "unregistered", type: "excel", analyzed: false }
      ];
      setPbcList(defaultDocs);
    }

    setIsAgentThinking(true);

    setTimeout(() => {
      streamChatResponse("Sure, I can do that for you right away. Let me look through the files in the directory.", () => {
        // T0: Start scanning
        setActivityLogs([
          { title: "Processing financial files", desc: "Reading directories...", status: "running" },
          { title: "Categorizing taxonomy", desc: "Matching file headers...", status: "queued" },
          { title: "Structuring folder directory", desc: "Organizing workspace...", status: "queued" }
        ]);

        // T1: 4000ms
        setTimeout(() => {
          setActivityLogs([
            { title: "Processing financial files", desc: "Successfully read all uploaded files.", status: "done" },
            {
              title: "Categorizing taxonomy",
              desc: "Classifying documents...",
              status: "running",
              subCards: [
                { title: "Read metadata & headers", status: "done" },
                { title: "Classify document types", status: "running" }
              ]
            },
            { title: "Structuring folder directory", desc: "Organizing workspace...", status: "queued" }
          ]);

          // T2: 8000ms
          setTimeout(() => {
            setActivityLogs([
              { title: "Processing financial files", desc: "Successfully read all uploaded files.", status: "done" },
              {
                title: "Categorizing taxonomy",
                desc: "All files successfully classified.",
                status: "done",
                subCards: [
                  { title: "Read metadata & headers", status: "done" },
                  { title: "Classify document types", status: "done" }
                ]
              },
              {
                title: "Structuring folder directory",
                desc: "Creating folder groups...",
                status: "running",
                subCards: [
                  { title: "Create directories", status: "running" }
                ]
              }
            ]);

            // T3: 12500ms
            setTimeout(() => {
              // Actually create folders and move files!
              const newFolders = ["01_financial_reports", "02_customer_contracts", "03_bank_statements"];
              setFolders(newFolders);
              setPbcList(currentList => currentList.map(item => {
                const name = item.name.toLowerCase();
                let targetFolder = "";
                let tag = "General";
                if (name.includes("ledger") || name.includes("balance") || name.includes("report") || name.includes("sheet") || name.includes("financial")) {
                  targetFolder = "01_financial_reports";
                  tag = "Financial Report";
                } else if (name.includes("contract") || name.includes("invoice") || name.includes("sales") || name.includes("orion") || name.includes("agreement")) {
                  targetFolder = "02_customer_contracts";
                  tag = "Sales & Customer";
                } else if (name.includes("bank") || name.includes("statement") || name.includes("reconciliation") || name.includes("rec")) {
                  targetFolder = "03_bank_statements";
                  tag = "Reconciliation";
                } else {
                  targetFolder = "01_financial_reports";
                  tag = "Financial Report";
                }
                return {
                  ...item,
                  folder: targetFolder,
                  analyzed: true,
                  agentTag: tag,
                  agentAssertions: tag === "Sales & Customer" ? ["Occurrence", "Accuracy"] : ["Completeness"]
                };
              }));

              setOpenFolders({
                "01_financial_reports": true,
                "02_customer_contracts": true,
                "03_bank_statements": true
              });

              setActivityLogs([
                { title: "Processing financial files", desc: "Successfully read all uploaded files.", status: "done" },
                {
                  title: "Categorizing taxonomy",
                  desc: "All files successfully classified.",
                  status: "done",
                  subCards: [
                    { title: "Read metadata & headers", status: "done" },
                    { title: "Classify document types", status: "done" }
                  ]
                },
                {
                  title: "Structuring folder directory",
                  desc: "Folders created and sorted.",
                  status: "done",
                  subCards: [
                    { title: "Create directories", status: "done" },
                    { title: "Move files to target folders", status: "done" }
                  ]
                }
              ]);

              const replyText = `All done. I found 3 main groups of documents in your file and organized them into your directory:
• **01_financial_reports**: Mapped your Year-End Balance Sheets and General Ledger.
• **02_customer_contracts**: Sorted 5 customer contracts and their corresponding sales invoices.
• **03_bank_statements**: Organized your bank statements and monthly reconciliation files.

Where should we go next? I can start analyzing these files if you want.`;

              setTimeout(() => {
                streamChatResponse(replyText, () => {
                  setAgentStep(1);
                });
              }, 500);
            }, 4500);
          }, 4000);
        }, 4000);
      });
    }, 800);
  };

  const triggerStep2Find = () => {
    setIsAgentThinking(true);
    setTimeout(() => {
      streamChatResponse("Let me check the `02_customer_contracts` folder to review contracts vs sales invoices.", () => {
        // T0: Start analysis
        setActivityLogs([
          {
            title: "Analyzing contracts and invoices",
            desc: "Checking invoice-to-contract matches...",
            status: "running",
            subCards: [
              { title: "Verify Sales Invoice 1 vs Contract 1", status: "running" },
              { title: "Verify Sales Invoice 2 vs Contract 2", status: "queued" },
              { title: "Verify Sales Invoice 3 vs Contract 3", status: "queued" },
              { title: "Verify Sales Invoice 4 vs Contract 4", status: "queued" }
            ]
          }
        ]);

        // T1: 4000ms
        setTimeout(() => {
          setActivityLogs([
            {
              title: "Analyzing contracts and invoices",
              desc: "Checking invoice-to-contract matches...",
              status: "running",
              subCards: [
                { title: "Verify Sales Invoice 1 vs Contract 1", status: "done" },
                { title: "Verify Sales Invoice 2 vs Contract 2", status: "done" },
                { title: "Verify Sales Invoice 3 vs Contract 3", status: "running" },
                { title: "Verify Sales Invoice 4 vs Contract 4", status: "queued" }
              ]
            }
          ]);

          // T2: 8000ms
          setTimeout(() => {
            setActivityLogs([
              {
                title: "Analyzing contracts and invoices",
                desc: "Checking invoice-to-contract matches...",
                status: "running",
                subCards: [
                  { title: "Verify Sales Invoice 1 vs Contract 1", status: "done" },
                  { title: "Verify Sales Invoice 2 vs Contract 2", status: "done" },
                  { title: "Verify Sales Invoice 3 vs Contract 3", status: "done" },
                  { title: "Verify Sales Invoice 4 vs Contract 4", status: "running" }
                ]
              }
            ]);

            // T3: 12500ms
            setTimeout(() => {
              setActivityLogs([
                {
                  title: "Analyzing contracts and invoices",
                  desc: "Gap detected: INV-2026-004 has no contract.",
                  status: "done",
                  subCards: [
                    { title: "Verify Sales Invoice 1 vs Contract 1", status: "done" },
                    { title: "Verify Sales Invoice 2 vs Contract 2", status: "done" },
                    { title: "Verify Sales Invoice 3 vs Contract 3", status: "done" },
                    { title: "Verify Sales Invoice 4 vs Contract 4: Missing Contract Gap", status: "running" }
                  ]
                }
              ]);

              const replyText = `I just finished reviewing the files in the **02_customer_contracts** folder. I noticed that you have 4 major sales invoices listed, but I can only find 3 corresponding signed customer contracts in the directory.

Based on standard audit compliance, this creates a gap in your Completeness check, because every recognized revenue invoice should have a matching contract as supporting Evidence. Please upload the missing contract (\`Sales_contract_04.pdf\`).`;

              setTimeout(() => {
                streamChatResponse(replyText, () => {
                  setAgentStep(2);
                });
              }, 500);
            }, 4500);
          }, 4000);
        }, 4000);
      });
    }, 800);
  };

  const triggerContractUploadAndAnalysis = (uploadedFileName?: string) => {
    const fileName = uploadedFileName || "Sales_contract_04.pdf";

    // Add Sales_contract_04.pdf if it doesn't exist in pbcList
    setPbcList(currentList => {
      const exists = currentList.some(p => p.name === fileName);
      if (exists) return currentList;

      return [
        ...currentList,
        {
          id: `pbc-contract-04-${Math.random().toString(36).substring(2)}`,
          name: fileName,
          size: "850 KB",
          status: "unregistered",
          type: "pdf",
          folder: "02_customer_contracts",
          analyzed: false
        }
      ];
    });

    setIsAgentThinking(true);

    streamChatResponse(`Got it, I see the new file. Let me analyze the contents of **${fileName}** real quick to make sure it matches our missing gap.`, () => {
      // T0: Start analysis
      setActivityLogs([
        { title: "Re-scanning folder content", desc: "Checking file system...", status: "running" }
      ]);

      // T1: 4000ms
      setTimeout(() => {
        setActivityLogs([
          { title: "Re-scanning folder content", desc: "File folder scan completed.", status: "done" },
          {
            title: "Extracting clauses & cross-referencing",
            desc: "Reading document clauses...",
            status: "running",
            subCards: [
              { title: "Read commercial terms", status: "running" },
              { title: "Verify PT Orion Mart Tbk match", status: "queued" },
              { title: "Confirm contract value IDR 855,000,000", status: "queued" }
            ]
          }
        ]);

        // T2: 8000ms
        setTimeout(() => {
          setActivityLogs([
            { title: "Re-scanning folder content", desc: "File folder scan completed.", status: "done" },
            {
              title: "Extracting clauses & cross-referencing",
              desc: "Reading document clauses...",
              status: "running",
              subCards: [
                { title: "Read commercial terms", status: "done" },
                { title: "Verify PT Orion Mart Tbk match", status: "running" },
                { title: "Confirm contract value IDR 855,000,000", status: "queued" }
              ]
            }
          ]);

          // T3: 12500ms
          setTimeout(() => {
            setActivityLogs([
              { title: "Re-scanning folder content", desc: "File folder scan completed.", status: "done" },
              {
                title: "Extracting clauses & cross-referencing",
                desc: "Extraction and matching complete.",
                status: "done",
                subCards: [
                  { title: "Read commercial terms", status: "done" },
                  { title: "Verify PT Orion Mart Tbk match", status: "done" },
                  { title: "Confirm contract value IDR 855,000,000", status: "done" }
                ]
              }
            ]);

            const replyText = `I have finished reading the clauses inside **${fileName}**. Here is what I found:
1. The document is a signed agreement with PT Orion Mart Tbk dated March 28, 2026.
2. The total contract value is exactly IDR 855,000,000.

When I cross-referenced this with your invoice folder, the numbers and dates perfectly matched your 4th invoice (INV-2026-004). Mathematically and legally, this fulfills the Accuracy and Occurrence requirements.

Since this completes the missing link for your revenue check, I need your permission to take the next action. Would you like me to officially tag this file as verified Evidence and link it directly to your Completeness compliance checklist?`;

            setTimeout(() => {
              streamChatResponse(replyText, () => {
                // Trigger permission popup
                setPermissionFileName(fileName);
                setPermissionChoice("allow");
                setPermissionSubmitted(false);

                setAgentStep(3);
              });
            }, 500);
          }, 4500);
        }, 4000);
      }, 4000);
    });
  };

  const triggerStep5Good = () => {
    setIsAgentThinking(true);
    streamChatResponse("Understood. I will proceed with generating the recommendation and drafting the board task...", () => {
      // T0: Start analysis
      setActivityLogs([
        { title: "Generating task details", desc: "Analyzing commercial clause threshold...", status: "running" }
      ]);

      // T1: 4000ms
      setTimeout(() => {
        setActivityLogs([
          { title: "Generating task details", desc: "Analyzing commercial clause threshold...", status: "done" },
          { title: "Drafting recommendation", desc: "Drafting recommendation action items...", status: "running" }
        ]);

        // T2: 8000ms
        setTimeout(() => {
          setActivityLogs([
            { title: "Generating task details", desc: "Analyzing commercial clause threshold...", status: "done" },
            { title: "Drafting recommendation", desc: "Drafting recommendation action items...", status: "done" },
            { title: "Registering ticket", desc: "Registering compliance board ticket...", status: "running" }
          ]);

          // T3: 12500ms
          setTimeout(() => {
            setActivityLogs([
              { title: "Generating task details", desc: "Analyzing commercial clause threshold...", status: "done" },
              { title: "Drafting recommendation", desc: "Drafting recommendation action items...", status: "done" },
              { title: "Registering ticket", desc: "Task registered successfully.", status: "done" }
            ]);

            // Add f-2 to auditorFindings
            const newTask: Finding = {
              id: "f-2",
              title: "Commercial Committee Approval Sheet Required (Valuation Risk)",
              severity: "high",
              condition: "Sales Contract Sales_contract_04.pdf with PT Orion Mart Tbk is IDR 855,000,000 (exceeding the IDR 750,000,000 threshold requirement). No signed Commercial Committee approval sheet found.",
              criteria: "Contracts above IDR 750,000,000 require Commercial Committee approval before revenue recognition.",
              recommendation: "Upload signed Commercial Committee approval sheet.",
              status: "draft",
              txDigest: ""
            };
            setAuditorFindings(prev => [...prev, newTask]);

            setTimeout(() => {
              streamChatResponse("Done. The task is now live on your board. We are all set for this section. Let me know if you want me to scan the bank statements next.", () => {
                setAgentStep(5);
              });
            }, 500);
          }, 4500);
        }, 4000);
      }, 4000);
    });
  };

  const triggerStep6Bank = () => {
    setIsAgentThinking(true);
    streamChatResponse("Sure, let me check the bank statements folder and perform a reconciliation check with your General Ledger...", () => {
      // T0: Start analysis
      setActivityLogs([
        { title: "Checking bank statements folder", desc: "Reading directories...", status: "running" },
        { title: "Comparing bank statement transactions with General Ledger", desc: "Matching data entries...", status: "queued" },
        { title: "Verifying reconciliation matches", desc: "Checking balances...", status: "queued" }
      ]);

      // T1: 4000ms
      setTimeout(() => {
        setActivityLogs([
          { title: "Checking bank statements folder", desc: "Successfully read all statement files.", status: "done" },
          { title: "Comparing bank statement transactions with General Ledger", desc: "Matching data entries...", status: "running" },
          { title: "Verifying reconciliation matches", desc: "Checking balances...", status: "queued" }
        ]);

        // T2: 8000ms
        setTimeout(() => {
          setActivityLogs([
            { title: "Checking bank statements folder", desc: "Successfully read all statement files.", status: "done" },
            { title: "Comparing bank statement transactions with General Ledger", desc: "All transactions successfully compared.", status: "done" },
            { title: "Verifying reconciliation matches", desc: "Checking balances...", status: "running" }
          ]);

          // T3: 12500ms
          setTimeout(() => {
            setActivityLogs([
              { title: "Checking bank statements folder", desc: "Successfully read all statement files.", status: "done" },
              { title: "Comparing bank statement transactions with General Ledger", desc: "All transactions successfully compared.", status: "done" },
              { title: "Verifying reconciliation matches", desc: "Reconciliation verified successfully.", status: "done" }
            ]);

            const replyText = `I have cross-referenced the Bank Statements with the General Ledger. All transaction records match, but I need your permission to register the bank reconciliation evidence on-chain. Shall I proceed?`;
            
            setTimeout(() => {
              streamChatResponse(replyText, () => {
                setPermissionFileName("Bank_statement_Q2.pdf");
                setPermissionChoice("allow");
                setPermissionSubmitted(false);
                setAgentStep(6);
              });
            }, 500);
          }, 4500);
        }, 4000);
      }, 4000);
    });
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput("");
    setChatLog(prev => [...prev, { id: generateId(), sender: "user", text }]);

    const lower = text.toLowerCase();

    // Check for explicit keywords to manually trigger/jump steps
    if (lower.includes("analyze")) {
      triggerStep1Scan();
      return;
    }
    if (lower.includes("find")) {
      triggerStep2Find();
      return;
    }
    if (lower.includes("missing")) {
      triggerContractUploadAndAnalysis();
      return;
    }
    if (lower.includes("yes") && agentStep === 3) {
      setPermissionChoice("allow");
      setPermissionSubmitted(true);
      return;
    }
    if (lower.includes("good")) {
      triggerStep5Good();
      return;
    }
    if (lower.includes("bank statement") || lower.includes("bank")) {
      triggerStep6Bank();
      return;
    }
    if (lower.includes("yes") && agentStep === 6) {
      setPermissionChoice("allow");
      setPermissionSubmitted(true);
      return;
    }
    if (lower.includes("summarize") || lower.includes("summary")) {
      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("I already organized and tagged your files to be prepared and ready for audit. We have checked:\n1. Customer contracts and invoices (matched, missing gap resolved)\n2. Bank reconciliation (100% matched and registered on-chain).\n\nYour workspace is now fully prepared.", () => {
          setAgentStep(8);
        });
      }, 800);
      return;
    }
    if (lower.includes("thank you") || lower.includes("review")) {
      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("Yes, please review at the registry workspace and you can verify to on-chain. Let me know if you need anything else!", () => {
          setAgentStep(9);
        });
      }, 800);
      return;
    }

    // Normal Step Fallbacks if keywords are not used
    // -------------------------------------------------------------------------
    // Phase 0: Welcome / Idle -> Scanning & Organizing Files (Step 1: analyze)
    // -------------------------------------------------------------------------
    if (agentStep === 0) {
      const isScanRequest = ["scan", "analisis", "check", "verify", "validate", "run", "proses", "mulai", "start", "cek", "periksa", "sort", "organize"].some(kw => lower.includes(kw));

      if (isScanRequest) {
        triggerStep1Scan();
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("I'm ready. Ask me to **scan** or **sort** the uploaded files (or type **analyze**) to organize your directory.");
      }, 1500);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 1: Sort Complete -> Review/Check Contracts folder (Step 2: find)
    // -------------------------------------------------------------------------
    if (agentStep === 1) {
      const isReviewFolderRequest = ["look", "review", "check", "folder", "contracts", "invoices", "lihat", "periksa", "orion"].some(kw => lower.includes(kw));

      if (isReviewFolderRequest) {
        triggerStep2Find();
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("Please tell me to **check** or **review** the customer contracts folder (or type **find**) to continue the analysis.");
      }, 1500);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 2: Gap Found -> Upload Missing Contract (Step 3: missing)
    // -------------------------------------------------------------------------
    if (agentStep === 2) {
      const isUploadMention = ["upload", "drop", "added", "new file", "masuk", "contract", "contract_04", "contract-04", "orion", "sales_contract_04"].some(kw => lower.includes(kw));

      if (isUploadMention) {
        triggerContractUploadAndAnalysis();
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("Please upload the missing contract file (**Sales_contract_04.pdf**) or type **missing** / mention that you uploaded it in the chat.");
      }, 1500);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 3: Contract Uploaded -> Waiting for Permission (Step 4: yes)
    // -------------------------------------------------------------------------
    if (agentStep === 3) {
      const isPermissionRequest = ["yes", "allow", "approve", "allow this time", "setuju", "boleh", "ya"].some(kw => lower.includes(kw));
      if (isPermissionRequest) {
        setPermissionChoice("allow");
        setPermissionSubmitted(true);
        return;
      }
      
      const isDenyRequest = ["no", "deny", "cancel", "tidak", "jangan"].some(kw => lower.includes(kw));
      if (isDenyRequest) {
        setPermissionChoice("no");
        setPermissionSubmitted(true);
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("Please allow or deny the transaction by choosing an option in the sandbox permission request or typing **yes** / **no**.");
      }, 1500);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 4: Proposing a New Task -> Create Board Task (Step 5: good)
    // -------------------------------------------------------------------------
    if (agentStep === 4) {
      const isConfirm = ["yes", "create", "catch", "boards", "buat", "tambahkan", "sure", "ok", "boleh", "silahkan"].some(kw => lower.includes(kw));

      if (isConfirm) {
        triggerStep5Good();
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("Do I have your permission to create a new pending task on your board to track the Commercial Committee approval? Please type **good** or **yes**.");
      }, 1500);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 5: Task Created -> Prompt to scan Bank Statements (Step 6: bank)
    // -------------------------------------------------------------------------
    if (agentStep === 5) {
      const isBankRequest = ["bank", "statement", "reconciliation", "scan", "check"].some(kw => lower.includes(kw));
      if (isBankRequest) {
        triggerStep6Bank();
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("We are all set for this section. Let me know if you want me to scan the bank statements next (or type **bank**).");
      }, 1500);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 6: Bank Statement Scan Complete -> Waiting for permission (Step 7: yes)
    // -------------------------------------------------------------------------
    if (agentStep === 6) {
      const isPermissionRequest = ["yes", "allow", "approve", "allow this time", "setuju", "boleh", "ya"].some(kw => lower.includes(kw));
      if (isPermissionRequest) {
        setPermissionChoice("allow");
        setPermissionSubmitted(true);
        return;
      }
      
      const isDenyRequest = ["no", "deny", "cancel", "tidak", "jangan"].some(kw => lower.includes(kw));
      if (isDenyRequest) {
        setPermissionChoice("no");
        setPermissionSubmitted(true);
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("Please allow or deny the transaction by choosing an option in the sandbox permission request or typing **yes** / **no**.");
      }, 1500);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 7: Reconciliation registered -> Awaiting summary (Step 8: summarize)
    // -------------------------------------------------------------------------
    if (agentStep === 7) {
      const isSummaryRequest = ["summarize", "summary", "please", "recap", "singkat"].some(kw => lower.includes(kw));
      if (isSummaryRequest) {
        setIsAgentThinking(true);
        setTimeout(() => {
          streamChatResponse("I already organized and tagged your files to be prepared and ready for audit. We have checked:\n1. Customer contracts and invoices (matched, missing gap resolved)\n2. Bank reconciliation (100% matched and registered on-chain).\n\nYour workspace is now fully prepared.", () => {
            setAgentStep(8);
          });
        }, 800);
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("Reconciliation evidence registered. Would you like me to summarize the workspace status? (Please type **please summarize**).");
      }, 1500);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 8: Summary sent -> Awaiting review confirmation (Step 9: thank you let me review)
    // -------------------------------------------------------------------------
    if (agentStep === 8) {
      const isReviewRequest = ["thank", "review", "ok", "good", "great", "terima kasih"].some(kw => lower.includes(kw));
      if (isReviewRequest) {
        setIsAgentThinking(true);
        setTimeout(() => {
          streamChatResponse("Yes, please review at the registry workspace and you can verify to on-chain. Let me know if you need anything else!", () => {
            setAgentStep(9);
          });
        }, 800);
        return;
      }

      setIsAgentThinking(true);
      setTimeout(() => {
        streamChatResponse("Your workspace is ready. You can type **thank you let me review** or just **review** to complete this flow.");
      }, 1500);
      return;
    }

    // Phase 9: Done / Idle
    setIsAgentThinking(true);
    setTimeout(() => {
      streamChatResponse("Compliance session complete. Everything is verified and tagged. You can review all records in the Registry and Verifier workspaces.");
    }, 1500);
  };

  const handleRegisterWeb3ForFile = async (fileId: string, docType: string, assertions: string[]) => {
    if (!realWallet.address) {
      setRegisterNotice({
        tone: "error",
        title: "Wallet required",
        message: "Connect a real Sui wallet before registering evidence on-chain.",
      });
      return;
    }
    setIsRegistering(true);
    setRegisterResult(null);

    try {
      const activeFile = pbcList.find(p => p.id === fileId);
      if (!activeFile) throw new Error("No active file selected");
      const activeAuditPackId = isLiveSuiObjectId(auditPackId) ? auditPackId : undefined;

      const dummyFile = new File(["dummy sales contract evidence content"], activeFile.name, {
        type: activeFile.name.endsWith(".pdf") ? "application/pdf" : activeFile.name.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv"
      });

      // Build the file content as an ArrayBuffer for the SDK
      const fileContent = await dummyFile.arrayBuffer();

      const flow = createRegisterEvidenceFlow({
        packageId: LIVE_PACKAGE_ID,
        signerAddress: realWallet.address,
        signTransaction: realWallet.signTransaction,
        encryptionKey: await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]),
        tatum: serverTatumExecute,
      });

      // Map string assertion names to numeric AssertionId values
      const assertionNameToId: Record<string, AssertionId> = {
        "Existence": 0, "Completeness": 1, "Valuation & Allocation": 2,
        "Rights & Obligations": 3, "Cut-off": 4, "Classification": 5,
        "Occurrence": 6, "Accuracy": 7,
      };
      const numericAssertions: AssertionId[] = assertions
        .map(a => assertionNameToId[a])
        .filter((id): id is AssertionId => id !== undefined);

      const result = await flow({
        content: fileContent,
        metadata: {
          fileName: activeFile.name,
          documentType: docType,
          claimedSource: "Company Upload (L2)",
          description: `Demo registered: ${activeFile.name}`,
        },
        assertions: numericAssertions,
        auditPackId: activeAuditPackId,
        signerAddress: realWallet.address,
      });

      const regInfo: RegisterResult = {
        objectId: result.evidence.id,
        txDigest: result.transactionDigest,
        blobId: result.artifacts.walrus.blobId,
        commitment: result.artifacts.commitment,
      };

      setRegisterResult(regInfo);

      const updatedPbc = pbcList.map(item =>
        item.id === fileId ? { ...item, status: "registered" as const, type: docType as any } : item
      );
      setPbcList(updatedPbc);

      const newPbcRegData = { ...pbcRegisteredData, [fileId]: regInfo };
      setPbcRegisteredData(newPbcRegData);

      if (engagementId && isDemoStoreConfigured()) {
        await upsertDemoEvidence({
          id: generateId(),
          engagement_id: engagementId,
          evidence_id: result.evidence.id,
          file_name: activeFile.name,
          file_size: dummyFile.size,
          document_type: docType,
          source: "Company Upload (L2)",
          description: `Demo registered: ${activeFile.name}`,
          assertions: assertions,
          commitment: result.artifacts.commitment,
          walrus_blob_id: result.artifacts.walrus.blobId,
          audit_pack_id: activeAuditPackId || null,
          registered_by_wallet: realWallet.address,
          status: "registered",
        });
        setSyncStatus("Registered evidence successfully synced to Supabase demo store.");
      }

      setRegisterNotice({
        tone: "success",
        title: "Evidence registered",
        message: `${activeFile.name} was successfully registered on Sui and Walrus.`,
      });
    } catch (err) {
      console.error(err);
      setRegisterNotice({
        tone: "error",
        title: "Registration failed",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterBatch = async (fileIds: string[]) => {
    if (!realWallet.address) {
      setRegisterNotice({
        tone: "error",
        title: "Wallet required",
        message: "Connect a real Sui wallet before registering evidence on-chain.",
      });
      return;
    }
    setIsRegistering(true);
    setRegisterNotice({
      tone: "info",
      title: "Batch registration in progress",
      message: `Preparing ${fileIds.length} evidence file(s) for Sui and Walrus registration.`,
    });
    let successCount = 0;

    try {
      const activeAuditPackId = isLiveSuiObjectId(auditPackId) ? auditPackId : undefined;
      const flow = createRegisterEvidenceFlow({
        packageId: LIVE_PACKAGE_ID,
        signerAddress: realWallet.address,
        signTransaction: realWallet.signTransaction,
        encryptionKey: await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]),
        tatum: serverTatumExecute,
      });

      for (const fileId of fileIds) {
        const activeFile = pbcList.find(p => p.id === fileId);
        if (!activeFile) continue;

        const dummyFile = new File(["dummy sales contract evidence content"], activeFile.name, {
          type: activeFile.name.endsWith(".pdf") ? "application/pdf" : activeFile.name.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv"
        });
        const fileContent = await dummyFile.arrayBuffer();

        const assertions = activeFile.agentAssertions || ["Occurrence", "Accuracy"];
        const docType = activeFile.type;

        const assertionNameToId: Record<string, AssertionId> = {
          "Existence": 0, "Completeness": 1, "Valuation & Allocation": 2,
          "Rights & Obligations": 3, "Cut-off": 4, "Classification": 5,
          "Occurrence": 6, "Accuracy": 7,
        };
        const numericAssertions: AssertionId[] = assertions
          .map(a => assertionNameToId[a])
          .filter((id): id is AssertionId => id !== undefined);

        const result = await flow({
          content: fileContent,
          metadata: {
            fileName: activeFile.name,
            documentType: docType,
            claimedSource: "Company Upload (L2)",
            description: `Batch registered: ${activeFile.name}`,
          },
          assertions: numericAssertions,
          auditPackId: activeAuditPackId,
          signerAddress: realWallet.address,
        });

        const regInfo: RegisterResult = {
          objectId: result.evidence.id,
          txDigest: result.transactionDigest,
          blobId: result.artifacts.walrus.blobId,
          commitment: result.artifacts.commitment,
        };

        setPbcList(currentList =>
          currentList.map(item =>
            item.id === fileId ? { ...item, status: "registered" as const } : item
          )
        );

        setPbcRegisteredData(currentData => ({
          ...currentData,
          [fileId]: regInfo
        }));

        if (engagementId && isDemoStoreConfigured()) {
          await upsertDemoEvidence({
            id: generateId(),
            engagement_id: engagementId,
            evidence_id: result.evidence.id,
            file_name: activeFile.name,
            file_size: dummyFile.size,
            document_type: docType,
            source: "Company Upload (L2)",
            description: `Batch registered: ${activeFile.name}`,
            assertions: assertions,
            commitment: result.artifacts.commitment,
            walrus_blob_id: result.artifacts.walrus.blobId,
            audit_pack_id: activeAuditPackId || null,
            registered_by_wallet: realWallet.address,
            status: "registered",
          });
        }
        successCount++;
      }

      setRegisterNotice({
        tone: "success",
        title: "Batch registered",
        message: `${successCount} evidence file(s) were successfully registered on Sui and Walrus.`,
      });
    } catch (err) {
      console.error(err);
      setRegisterNotice({
        tone: "error",
        title: "Batch registration failed",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAuditorAttest = async (findingId: string) => {
    if (!wallet.address) {
      alert("Connect wallet before attesting.");
      return;
    }
    setIsAttesting(true);
    try {
      const activeFile = pbcList.find(p => p.name === "09_customer_contract_orion_C-ORION-2026-019.pdf");
      const targetId = pbcRegisteredData[activeFile?.id || ""]?.objectId || "0x-mock-target-id";

      const actionFlow = createEmitAgentActionFlow({
        packageId: process.env.NEXT_PUBLIC_LINOW_PACKAGE_ID || "0x-mock-package",
        signerAddress: wallet.address || "0x-mock-signer",
        signTransaction: wallet.signTransaction as any,
        tatumApiKey: process.env.TATUM_API_KEY,
      });

      await actionFlow({
        packId: auditPackId || "0x-mock-pack-id",
        evidenceId: targetId,
        actionType: "ccer_finding",
        agentOutputHash: "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715a1a1e8a1a1e8a1a1e8",
      });

      const attestFlow = createAttestationFlow({
        packageId: process.env.NEXT_PUBLIC_LINOW_PACKAGE_ID || "0x-mock-package",
        signerAddress: wallet.address || "0x-mock-signer",
        signTransaction: wallet.signTransaction as any,
        encryptionKey: await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]),
        tatumApiKey: process.env.TATUM_API_KEY,
      });

      const attestResult = await attestFlow({
        evidenceId: targetId,
        reviewerAddress: wallet.address || "0x-mock-reviewer",
        attestationType: "evidenceVerified",
        sourceConfidence: "L3",
        note: "Auditor reviewed 09_customer_contract_orion_C-ORION-2026-019.pdf and confirmed matching IDR 855,000,000 transaction.",
      });

      const updatedFindings = auditorFindings.map(f =>
        f.id === findingId ? { ...f, status: "confirmed", txDigest: attestResult.attestation.transactionDigest || "" } : f
      );
      setAuditorFindings(updatedFindings);

      if (engagementId && isDemoStoreConfigured()) {
        await insertDemoAttestation({
          id: generateId(),
          engagement_id: engagementId,
          evidence_id: targetId,
          attestation_id: attestResult.attestation.id,
          tx_digest: attestResult.attestation.transactionDigest || "",
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

  const handleInitializeWorkspace = (folderName?: string, isZip?: boolean) => {
    if (!onboardingSelections) return;
    const result = onboardingSelections;

    // Reset everything to empty for a brand new user
    setPbcList([]);
    setFolders([]);
    setSelectedFolder("");
    setSelectedPbcId("");
    setOpenFolders({});

    setIsUploadOverlayOpen(false);

    // Initial state for activity log: waiting/introduce state
    setActivityLogs([]);

    // Initial agent welcome chat log
    setChatLog([
      { 
        sender: "agent", 
        text: `Hi **${result.orgName}**, welcome to Linow Workspace. Let's get your audit ready. Where should we start?` 
      }
    ]);

    // Hide permission dialog by default
    setPermissionSubmitted(true);
    setPermissionFileName("");
    setAgentStep(0);
  };

  // ----------------------------------------------------
  // RENDER GATEWAY: IF NOT LOGGED IN AND NOT ONBOARDING
  // ----------------------------------------------------
  if (!isLoggedIn && !isOnboarding) {
    return (
      <LoginGateway
        wallet={wallet}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        handleLogin={handleLogin}
        onConnectDemoWallet={() => setMockAddress("0x789c2b10fc7d93ea8b19280d8591c2849e7dd12")}
      />
    );
  }

  // ----------------------------------------------------
  // RENDER ONBOARDING SETUP FLOW
  // ----------------------------------------------------
  if (isOnboarding) {
    return (
      <CompanyOnboarding
        onComplete={(result) => {
          setIsOnboarding(false);
          setIsLoggedIn(true);
          setOnboardingSelections(result);
          setIsUploadOverlayOpen(true);

          // Clear files list and select empty state in background workspace
          setPbcList([]);
          setFolders([]);
          setSelectedFolder("");
          setSelectedPbcId("");
          setOpenFolders({});

          // Reset agent activity to idle/waiting
          setActivityLogs([]);
          setChatLog([
            { sender: "agent", text: `Hi **${result.orgName}**, welcome to Linow Workspace. Let's get your audit ready. Where should we start?` }
          ]);
          setPermissionSubmitted(true);
          setPermissionFileName("");
          setAgentStep(0);
        }}
      />
    );
  }

  // ----------------------------------------------------
  // RENDER DASHBOARD: FOR COMPANY ROLE
  // ----------------------------------------------------
  if (selectedRole === "company") {
    return (
      <div className="demo-wrapper">
        <WorkspaceHeader
          registeredCount={registeredCount}
          totalCount={totalCount}
          wallet={wallet}
          onboardingSelections={onboardingSelections}
        />

        {/* Workspace Body / Main workspace container */}
        <div className="app-layout">
          {/* Sidebar Navigation Rail */}
          <aside className="nav-rail">
            <div className={`nav-item ${activeTab === "agent" ? "active" : ""}`} onClick={() => setActiveTab("agent")}>
              <Icons.Sparkles />
              <span className="nav-label">Agent</span>
              <span className="nav-tooltip">Agent Sandbox</span>
            </div>
            <div className={`nav-item ${activeTab === "registry" ? "active" : ""}`} onClick={() => setActiveTab("registry")}>
              <Icons.BoxChain />
              <span className="nav-label">Registry</span>
              <span className="nav-tooltip">Web3 Registry</span>
            </div>
            <div className={`nav-item ${activeTab === "verifier" ? "active" : ""}`} onClick={() => setActiveTab("verifier")}>
              <Icons.ShieldCheck />
              <span className="nav-label">Verify</span>
              <span className="nav-tooltip">Verifier Check</span>
            </div>
          </aside>

          {activeTab === "agent" ? (
            <main className="workspace-container">
              <FileExplorer
                role="company"
                pbcList={pbcList}
                setPbcList={setPbcList}
                folders={folders}
                setFolders={setFolders}
                pbcRegisteredData={pbcRegisteredData}
                isPbcExpanded={isPbcExpanded}
                setIsPbcExpanded={setIsPbcExpanded}
                pbcWidth={pbcWidth}
                selectedPbcId={selectedPbcId}
                setSelectedPbcId={setSelectedPbcId}
                selectedFolder={selectedFolder}
                setSelectedFolder={setSelectedFolder}
                openFolders={openFolders}
                setOpenFolders={setOpenFolders}
                handleAddDocument={handleAddDocument}
                startResizeLeft={startResizeLeft}
              />

              <PreviewPane
                selectedPbcId={selectedPbcId}
                pbcList={pbcList}
                selectedFolder={selectedFolder}
              />

              <AgentSandbox
                isAgentExpanded={isAgentExpanded}
                setIsAgentExpanded={setIsAgentExpanded}
                agentWidth={agentWidth}
                activityLogs={activityLogs}
                setActivityLogs={setActivityLogs}
                chatLog={chatLog}
                setChatLog={setChatLog}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendChatMessage={handleSendChatMessage}
                permissionChoice={permissionChoice}
                setPermissionChoice={setPermissionChoice}
                permissionSubmitted={permissionSubmitted}
                setPermissionSubmitted={setPermissionSubmitted}
                permissionFileName={permissionFileName}
                pbcList={pbcList}
                setPbcList={setPbcList}
                startResizeRight={startResizeRight}
                onGoToRegistry={() => setActiveTab("registry")}
                isAgentThinking={isAgentThinking}
              />
            </main>
          ) : activeTab === "registry" ? (
            <RegistryWorkspace
              pbcList={pbcList}
              pbcRegisteredData={pbcRegisteredData}
              registerResult={registerResult}
              setSelectedReviewFile={handleSelectReviewFile}
              setReviewDocType={setReviewDocType}
              setReviewAssertions={setReviewAssertions}
              handleRegisterBatch={handleRegisterBatch}
              registerNotice={registerNotice}
            />
          ) : activeTab === "verifier" ? (
            <VerifierWorkspace
              pbcList={pbcList}
              pbcRegisteredData={pbcRegisteredData}
              auditorFindings={auditorFindings}
            />
          ) : null}

          {/* Details modal overlay triggers */}
          {selectedReviewFile && (
            <DetailsModal
              selectedReviewFile={selectedReviewFile}
              setSelectedReviewFile={handleSelectReviewFile}
              pbcRegisteredData={pbcRegisteredData}
              registerResult={registerResult}
              reviewDocType={reviewDocType}
              setReviewDocType={setReviewDocType}
              reviewAssertions={reviewAssertions}
              setReviewAssertions={setReviewAssertions}
              isRegistering={isRegistering}
              handleRegisterWeb3ForFile={handleRegisterWeb3ForFile}
              registerNotice={registerNotice}
            />
          )}
        </div>

        {isUploadOverlayOpen && (
          <WorkspaceUploadOverlay
            companyName={onboardingSelections?.orgName || "Acme Corp"}
            onInitialize={handleInitializeWorkspace}
          />
        )}

        {isAddDocumentModalOpen && (
          <UploadDocumentModal
            folders={folders}
            defaultFolder=""
            onClose={() => setIsAddDocumentModalOpen(false)}
            onAdd={(files, folder) => {
              // Intercept upload in Phase 2 to trigger analysis of the contract!
              if (agentStep === 2 && files.length > 0) {
                setIsAddDocumentModalOpen(false);
                triggerContractUploadAndAnalysis(files[0].name);
                return;
              }

              // Normal Phase 0/1 file addition
              const containsZip = files.some(f => f.name.toLowerCase().endsWith(".zip"));
              let filesToProcess = [...files];

              // If a zip is uploaded or if the user uploads any file when workspace is empty, populate the scenario set!
              if (containsZip || (pbcList.length === 0 && files.length === 1)) {
                filesToProcess = [
                  { name: "General_Ledger_2026.xlsx", size: "1.2 MB" },
                  { name: "Balance_Sheet_Q2.pdf", size: "450 KB" },
                  { name: "Sales_contract_01.pdf", size: "820 KB" },
                  { name: "Sales_contract_02.pdf", size: "680 KB" },
                  { name: "Sales_contract_03.pdf", size: "710 KB" },
                  { name: "Sales_invoice_INV-2026-001.pdf", size: "120 KB" },
                  { name: "Sales_invoice_INV-2026-002.pdf", size: "140 KB" },
                  { name: "Sales_invoice_INV-2026-003.pdf", size: "115 KB" },
                  { name: "Sales_invoice_INV-2026-004.pdf", size: "130 KB" },
                  { name: "Bank_statement_Q2.pdf", size: "980 KB" },
                  { name: "Bank_reconciliation_June.xlsx", size: "320 KB" }
                ];
              }

              const newDocs: PbcItem[] = filesToProcess.map((f) => {
                const ext = f.name.includes(".") ? f.name.split(".").pop()?.toLowerCase() : "";
                const type = ext === "xlsx" || ext === "xls" ? "excel" : ext === "csv" ? "csv" : "pdf";
                const newFileId = `pbc-${Math.random().toString(36).substring(2) + Date.now().toString(36)}`;
                return {
                  id: newFileId,
                  name: f.name,
                  size: f.size,
                  status: "unregistered",
                  type: type as any,
                  folder: folder,
                  analyzed: false
                };
              });

              setPbcList(prev => [...prev, ...newDocs]);
              
              if (newDocs.length > 0) {
                setSelectedPbcId(newDocs[0].id);
              }
              setSelectedFolder(folder);
              if (folder) {
                setOpenFolders(prev => ({ 
                  ...prev, 
                  [folder]: true
                }));
                if (!folders.includes(folder)) {
                  setFolders(prev => [...prev, folder]);
                }
              }

              // Just acknowledge files were added
              setChatLog(prev => [
                ...prev,
                { sender: "agent", text: `**${newDocs.length}** new file${newDocs.length > 1 ? "s" : ""} added to your file directory${containsZip ? " (unpacked ZIP archive)" : ""}. When you're ready, ask me to **scan** or **analyze** them to start compliance validation.` }
              ]);

              setIsAddDocumentModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER DASHBOARD: FOR AUDITOR ROLE
  // ----------------------------------------------------
  return (
    <div className="demo-wrapper">
      <WorkspaceHeader
        registeredCount={registeredCount}
        totalCount={totalCount}
        wallet={wallet}
        onboardingSelections={onboardingSelections}
      />

      {/* Auditor Layout */}
      <div className="app-layout">
        <aside className="nav-rail">
          <div className={`nav-item ${activeTab === "agent" ? "active" : ""}`} onClick={() => setActiveTab("agent")}>
            <Icons.Shield />
            <span className="nav-label">Audit</span>
            <span className="nav-tooltip">Audit Findings</span>
          </div>
          <div className={`nav-item ${activeTab === "verifier" ? "active" : ""}`} onClick={() => setActiveTab("verifier")}>
            <Icons.ShieldCheck />
            <span className="nav-label">Verify</span>
            <span className="nav-tooltip">Verifier Check</span>
          </div>
        </aside>

        {activeTab === "agent" ? (
          <main className="workspace-container">
            <FileExplorer
              role="auditor"
              pbcList={pbcList}
              setPbcList={setPbcList}
              folders={folders}
              setFolders={setFolders}
              pbcRegisteredData={pbcRegisteredData}
              isPbcExpanded={isPbcExpanded}
              setIsPbcExpanded={setIsPbcExpanded}
              pbcWidth={pbcWidth}
              selectedPbcId={selectedPbcId}
              setSelectedPbcId={setSelectedPbcId}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              openFolders={openFolders}
              setOpenFolders={setOpenFolders}
              engagementId={engagementId}
              setEngagementId={setEngagementId}
              syncStatus={syncStatus}
              loadSyncEngagement={loadSyncEngagement}
              startResizeLeft={startResizeLeft}
            />

            <PreviewPane
              selectedPbcId={selectedPbcId}
              pbcList={pbcList}
              selectedFolder={selectedFolder}
            />

            <AuditorFindings
              isAgentExpanded={isAgentExpanded}
              setIsAgentExpanded={setIsAgentExpanded}
              agentWidth={agentWidth}
              auditorFindings={auditorFindings}
              isAttesting={isAttesting}
              handleAuditorAttest={handleAuditorAttest}
              startResizeRight={startResizeRight}
            />
          </main>
        ) : activeTab === "verifier" ? (
          <VerifierWorkspace
            pbcList={pbcList}
            pbcRegisteredData={pbcRegisteredData}
            auditorFindings={auditorFindings}
          />
        ) : null}
      </div>
    </div>
  );
}
