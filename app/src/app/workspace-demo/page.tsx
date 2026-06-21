"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  createRegisterEvidenceFlow,
  createAttestationFlow,
  createEmitAgentActionFlow,
  type AssertionId,
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

  // Supabase Sync state
  const [engagementId, setEngagementId] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<string>("Not connected to Supabase");

  // Dynamic folder paths
  const [folders, setFolders] = useState<string[]>([
    "contracts",
    "demo",
    "demo/PBC_list",
    "demo/PBC_list/agent_test_scripts",
    "demo/PBC_list/audit_docs",
    "demo/PBC_list/evidence_initial",
    "demo/PBC_list/evidence_initial/01_financial_reports",
    "demo/PBC_list/evidence_initial/02_contracts_invoices",
    "demo/PBC_list/evidence_initial/03_delivery_cutoff",
    "demo/PBC_list/evidence_initial/04_bank_cash_receipts",
  ]);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);

  // Company PBC List
  const [pbcList, setPbcList] = useState<PbcItem[]>(DEFAULT_COMPANY_PBC);
  const [selectedPbcId, setSelectedPbcId] = useState("pbc-orion-contract");
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

  // Panel sizing & expand state
  const [isPbcExpanded, setIsPbcExpanded] = useState(true);
  const [isAgentExpanded, setIsAgentExpanded] = useState(true);
  const [pbcWidth, setPbcWidth] = useState(300);
  const [agentWidth, setAgentWidth] = useState(340);

  // Chat & Sandbox Activity state
  const [agentStep, setAgentStep] = useState(0); 
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    { title: "Coverage check", desc: "4 of 7 required docs found", status: "done" },
    { title: "Classifying contract", desc: "Matching ISA assertions", status: "running" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<ChatLogItem[]>([
    { sender: "agent", text: "Welcome to Linow Agent Sandbox. I am ready to help classify your documents for the Q2 2026 engagement." }
  ]);

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
  const [permissionSubmitted, setPermissionSubmitted] = useState(false);

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

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput("");
    setChatLog(prev => [...prev, { sender: "user", text }]);

    setTimeout(() => {
      let reply = "I am currently analyzing your input. Please continue verifying the documents in your file directory.";
      if (text.toLowerCase().includes("register") || text.toLowerCase().includes("sui")) {
        reply = "To permanently register this document to Sui & Walrus, please click the down arrow button on your screen to open the Web3 Registry panel.";
      } else if (text.toLowerCase().includes("kontrak") || text.toLowerCase().includes("orion") || text.toLowerCase().includes("sales")) {
        reply = "Contract 09_customer_contract_orion_C-ORION-2026-019.pdf has a total transaction value of IDR 855,000,000 and is ready to be registered with Occurrence & Accuracy assertions.";
      }
      setChatLog(prev => [...prev, { sender: "agent", text: reply }]);
    }, 1000);
  };

  const handleRegisterWeb3ForFile = async (fileId: string, docType: string, assertions: string[]) => {
    if (!wallet.address) {
      alert("Please connect your wallet first.");
      return;
    }
    setIsRegistering(true);
    setRegisterResult(null);

    try {
      const activeFile = pbcList.find(p => p.id === fileId);
      if (!activeFile) throw new Error("No active file selected");

      const dummyFile = new File(["dummy sales contract evidence content"], activeFile.name, {
        type: activeFile.name.endsWith(".pdf") ? "application/pdf" : activeFile.name.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv"
      });

      // Build the file content as an ArrayBuffer for the SDK
      const fileContent = await dummyFile.arrayBuffer();

      const flow = createRegisterEvidenceFlow({
        packageId: process.env.NEXT_PUBLIC_LINOW_PACKAGE_ID || "0x-mock-package",
        signerAddress: wallet.address || "0x-mock-signer",
        signTransaction: wallet.signTransaction as any,
        encryptionKey: await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]),
        tatumApiKey: process.env.TATUM_API_KEY,
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
        auditPackId: auditPackId || undefined,
        signerAddress: wallet.address || undefined,
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
          audit_pack_id: auditPackId || null,
          registered_by_wallet: wallet.address,
          status: "registered",
        });
        setSyncStatus("Registered evidence successfully synced to Supabase demo store.");
      }

      alert(`Evidence ${activeFile.name} successfully registered on Sui & Walrus!`);
      setSelectedReviewFile(null);
    } catch (err) {
      console.error(err);
      alert(`Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterBatch = async (fileIds: string[]) => {
    if (!wallet.address) {
      alert("Please connect your wallet first.");
      return;
    }
    setIsRegistering(true);
    let successCount = 0;

    try {
      const flow = createRegisterEvidenceFlow({
        packageId: process.env.NEXT_PUBLIC_LINOW_PACKAGE_ID || "0x-mock-package",
        signerAddress: wallet.address || "0x-mock-signer",
        signTransaction: wallet.signTransaction as any,
        encryptionKey: await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]),
        tatumApiKey: process.env.TATUM_API_KEY,
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
          auditPackId: auditPackId || undefined,
          signerAddress: wallet.address || undefined,
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
            audit_pack_id: auditPackId || null,
            registered_by_wallet: wallet.address,
            status: "registered",
          });
        }
        successCount++;
      }

      alert(`Successfully registered ${successCount} files in batch on Sui & Walrus!`);
    } catch (err) {
      console.error(err);
      alert(`Batch registration failed: ${err instanceof Error ? err.message : String(err)}`);
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

  const handleInitializeWorkspace = (folderName: string, isZip: boolean) => {
    if (!onboardingSelections) return;
    const result = onboardingSelections;
    
    // Select matching PBC files list and paths
    let customList = DEFAULT_COMPANY_PBC;
    let initialPbcId = "pbc-orion-contract";

    if (result.goal === "Financial") {
      // Scenario 3: Manufacturing
      customList = MANUFACTURING_PBC;
      initialPbcId = "pbc-mf-1";
    } else if (result.industry === "Healthcare") {
      // Scenario 1: Healthcare
      customList = HEALTHCARE_PBC;
      initialPbcId = "pbc-hc-1";
    } else if (result.industry === "Fintech") {
      // Scenario 2: Fintech
      customList = FINTECH_PBC;
      initialPbcId = "pbc-ft-1";
    } else if (result.industry === "E-commerce") {
      // Scenario 4: E-Commerce
      customList = ECOMMERCE_PBC;
      initialPbcId = "pbc-ec-1";
    }

    const targetFolder = `demo/PBC_list/evidence_initial/${folderName}`;
    const mappedList = customList.map(item => ({
      ...item,
      folder: targetFolder
    }));

    const initialFolders = [
      "contracts",
      "demo",
      "demo/PBC_list",
      "demo/PBC_list/agent_test_scripts",
      "demo/PBC_list/audit_docs",
      "demo/PBC_list/evidence_initial",
      targetFolder
    ];
    mappedList.forEach(item => {
      if (item.folder && !initialFolders.includes(item.folder)) {
        initialFolders.push(item.folder);
      }
    });
    setFolders(initialFolders);

    setPbcList(mappedList);
    setSelectedFolder(targetFolder);
    setSelectedPbcId(initialPbcId);

    setOpenFolders({
      "contracts": false,
      "demo": true,
      "demo/PBC_list": true,
      "demo/PBC_list/evidence_initial": true,
      [targetFolder]: true
    });

    setIsUploadOverlayOpen(false);

    // Trigger AI Agent scanning sequencing
    setActivityLogs([
      { title: "Extracting evidence", desc: isZip ? "Extracting uploaded archive..." : "Loading folder metadata...", status: "running" },
      { title: "Coverage check", desc: "Analyzing files matching compliance goals", status: "queued" }
    ]);

    setTimeout(() => {
      setActivityLogs([
        { title: "Extracting evidence", desc: isZip ? "Extracted uploaded ZIP: 3 files found." : "Metadata loaded: 3 files found.", status: "done" },
        { title: "Coverage check", desc: "Running compliance coverage test...", status: "running" },
        { title: "Classifying contracts", desc: "Matching controls on Walrus & Sui...", status: "queued" }
      ]);
      setChatLog(prev => [
        ...prev,
        { sender: "agent", text: `I have completed extraction of your uploaded files inside the **${folderName}** folder. Starting coverage scans for ${result.industry} frameworks.` }
      ]);

      setTimeout(() => {
        setActivityLogs([
          { title: "Extracting evidence", desc: isZip ? "Extracted uploaded ZIP: 3 files found." : "Metadata loaded: 3 files found.", status: "done" },
          { title: "Coverage check", desc: "All core files detected in sandbox.", status: "done" },
          { title: "Classifying contracts", desc: "Classified 3 assets with assertions", status: "done" }
        ]);
        setChatLog(prev => [
          ...prev,
          { sender: "agent", text: `Scans complete. The folder **${folderName}** is fully synchronized. I have classified all documents and matched them with audit assertions (**Occurrence & Accuracy**). Open the **Registry** tab to register the batch on-chain.` }
        ]);
      }, 2500);
    }, 2000);
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
          setFolders([
            "contracts",
            "demo",
            "demo/PBC_list",
            "demo/PBC_list/evidence_initial"
          ]);
          setSelectedFolder("");
          setSelectedPbcId("");
          setOpenFolders({
            "contracts": false,
            "demo": true,
            "demo/PBC_list": true,
            "demo/PBC_list/evidence_initial": true
          });

          // Reset agent activity to idle/waiting
          setActivityLogs([
            { title: "Compliance sandbox", desc: "Waiting for folder initialization...", status: "queued" }
          ]);
          setChatLog([
            { sender: "agent", text: `Welcome to Linow Workspace, ${result.orgName}. Please complete the folder setup and upload your compliance documents to begin audit verification.` }
          ]);
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
                pbcList={pbcList}
                setPbcList={setPbcList}
                startResizeRight={startResizeRight}
                onGoToRegistry={() => setActiveTab("registry")}
              />
            </main>
          ) : activeTab === "registry" ? (
            <RegistryWorkspace
              pbcList={pbcList}
              pbcRegisteredData={pbcRegisteredData}
              registerResult={registerResult}
              setSelectedReviewFile={setSelectedReviewFile}
              setReviewDocType={setReviewDocType}
              setReviewAssertions={setReviewAssertions}
              handleRegisterBatch={handleRegisterBatch}
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
              setSelectedReviewFile={setSelectedReviewFile}
              pbcRegisteredData={pbcRegisteredData}
              registerResult={registerResult}
              reviewDocType={reviewDocType}
              setReviewDocType={setReviewDocType}
              reviewAssertions={reviewAssertions}
              setReviewAssertions={setReviewAssertions}
              isRegistering={isRegistering}
              handleRegisterWeb3ForFile={handleRegisterWeb3ForFile}
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
            folders={folders.filter(f => f.includes("evidence_initial"))}
            defaultFolder={selectedFolder || (folders.find(f => f.includes("evidence_initial")) || "")}
            onClose={() => setIsAddDocumentModalOpen(false)}
            onAdd={(name, folder, size) => {
              const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() : "";
              const type = ext === "xlsx" || ext === "xls" ? "excel" : ext === "csv" ? "csv" : "pdf";
              
              const newFileId = `pbc-${Math.random().toString(36).substring(2) + Date.now().toString(36)}`;
              const newDoc: PbcItem = {
                id: newFileId,
                name: name,
                size: size,
                status: "unregistered",
                type: type as any,
                folder: folder,
                analyzed: false
              };
              setPbcList(prev => [...prev, newDoc]);
              setSelectedPbcId(newFileId);
              setSelectedFolder(folder);
              setOpenFolders(prev => ({ ...prev, [folder]: true }));
              
              // Trigger AI Agent scanning sequencing for this document
              setActivityLogs(prev => [
                ...prev,
                { title: "Analyzing upload", desc: `Reading ${name}...`, status: "running" }
              ]);

              setTimeout(() => {
                setActivityLogs(prev =>
                  prev.map(log =>
                    log.title === "Analyzing upload" && log.desc.includes(name)
                      ? { ...log, desc: `Document ${name} successfully analyzed.`, status: "done" }
                      : log
                  )
                );

                setPbcList(currentList =>
                  currentList.map(item =>
                    item.id === newFileId ? { ...item, analyzed: true } : item
                  )
                );
              }, 2000);

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
