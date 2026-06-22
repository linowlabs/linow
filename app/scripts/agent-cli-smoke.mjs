import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.AGENT_BASE_URL || "http://127.0.0.1:3000";
const agentSmokeTimeoutMs = readPositiveIntegerEnv("AGENT_SMOKE_TIMEOUT_MS") ?? 10 * 60 * 1000;
const mode = process.argv[2] || "orchestrate";
const fileArg = process.argv[3];
const fileArgs = process.argv.slice(3);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const isaQ2PackRoot = process.env.ISA_Q2_PACK_ROOT || "demo/isa_q2_engagement";
const supportedEvidenceExtensions = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".log",
  ".xml",
  ".html",
  ".htm",
  ".yml",
  ".yaml",
  ".pdf",
  ".xlsx",
  ".xls",
  ".xlsm",
  ".xlsb",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
]);

const bankStatementDoc = {
  documentName: "13_bank_statement_june_2026.pdf",
  documentText:
    "Bank statement for June 2026. Account holder PT Arunika Cloud Commerce. Statement period 2026-06-01 to 2026-06-30. Ending balance IDR 1,245,000,000. Transfers from PT Orion Mart Tbk for INV-2026-0517 and from PT MegaLogis Indonesia were received during June 2026.",
  context: {
    engagementName: "LINOW-ISA500-Q2REV-2026-ACC",
    uploaderLabel: "Company Upload (L2)",
    auditArea: "Revenue recognition and cash receipts",
    filePath: "demo/isa_q2_engagement/evidence_initial/04_bank_cash_receipts/13_bank_statement_june_2026.pdf",
  },
};

const contractDoc = {
  documentName: "09_customer_contract_orion_C-ORION-2026-019.pdf",
  documentText:
    "Customer contract C-ORION-2026-019 between PT Arunika Cloud Commerce and PT Orion Mart Tbk. Contract value IDR 237,262,500. Revenue recognition depends on milestone completion and customer acceptance. Contracts above IDR 200,000,000 require Commercial Committee approval before recognition.",
  context: {
    engagementName: "LINOW-ISA500-Q2REV-2026-ACC",
    uploaderLabel: "Company Upload (L2)",
    auditArea: "Revenue recognition and cash receipts",
    filePath: "demo/isa_q2_engagement/evidence_initial/02_contracts_invoices/09_customer_contract_orion_C-ORION-2026-019.pdf",
  },
};

const cutoffLogDoc = {
  documentName: "05_service_delivery_cutoff_log.csv",
  documentText:
    "Service delivery cutoff log for Q2 2026. Orion implementation milestone 2 recorded as revenue on 2026-06-30. User acceptance testing signed on 2026-06-25. Production go-live completed on 2026-07-02. Reviewer note: cut-off exception requires follow-up.",
  context: {
    engagementName: "LINOW-ISA500-Q2REV-2026-ACC",
    uploaderLabel: "Company Upload (L2)",
    auditArea: "Revenue recognition and cash receipts",
    filePath: "demo/isa_q2_engagement/evidence_initial/03_delivery_cutoff/05_service_delivery_cutoff_log.csv",
  },
};

const adjustmentDoc = {
  documentName: "15_manual_adjustment_note_JRN-2026-06-117.txt",
  documentText:
    "Manual adjustment note JRN-2026-06-117. Revenue accelerated by IDR 84,500,000 on 2026-06-30 to align with quarter-end management target. Prepared by finance manager. CFO approval attachment pending and not included in this evidence pack.",
  context: {
    engagementName: "LINOW-ISA500-Q2REV-2026-ACC",
    uploaderLabel: "Company Upload (L2)",
    auditArea: "Revenue recognition and cash receipts",
    filePath: "demo/isa_q2_engagement/evidence_initial/05_gl_exports_and_policies/15_manual_adjustment_note_JRN-2026-06-117.txt",
  },
};

const negativeDoc = {
  documentName: "N02_wrong_document_marketing_brochure.txt",
  documentText:
    "Summer marketing brochure for retail expansion. Includes campaign tagline options, customer testimonials, visual direction, and product branding notes. No accounting records, approvals, balances, or transaction evidence are included.",
  context: {
    engagementName: "LINOW-ISA500-Q2REV-2026-ACC",
    uploaderLabel: "Company Upload (L2)",
    auditArea: "Revenue recognition and cash receipts",
    filePath: "demo/isa_q2_engagement/negative_cases/N02_wrong_document_marketing_brochure.txt",
  },
};

async function main() {
  switch (mode) {
    case "single-doc":
      await runSingleDocument();
      return;
    case "negative-doc":
      await runNegativeDocument();
      return;
    case "draft-finding":
      await runDraftFinding();
      return;
    case "validate-hash":
      await runValidateHash();
      return;
    case "ingest-file":
      await runIngestFile();
      return;
    case "classify-file":
      await runClassifyFile();
      return;
    case "orchestrate-files":
      await runOrchestrateFiles();
      return;
    case "isa-q2-engagement":
      await runIsaQ2Engagement();
      return;
    case "orchestrate-p2":
      await runOrchestratePointTwo();
      return;
    case "orchestrate-p1":
      await runOrchestratePointOne();
      return;
    case "orchestrate-workspace":
      await runOrchestrateWorkspace();
      return;
    case "orchestrate-memory":
      await runOrchestrateMemory();
      return;
    case "orchestrate":
      await runOrchestrate();
      return;
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
}

async function runSingleDocument() {
  const classification = await postJson("/api/agent/classify", bankStatementDoc);
  const metadata = await postJson("/api/agent/extract-metadata", bankStatementDoc);
  const mapping = await postJson("/api/agent/map-assertions", {
    ...bankStatementDoc,
    classificationSummary:
      "Classified as bank_statement with support for existence, completeness, valuation and accuracy.",
    metadataSummary:
      "Statement period June 2026, account holder PT Arunika Cloud Commerce, ending balance IDR 1,245,000,000.",
  });

  print("single-doc.classify", classification);
  print("single-doc.extract-metadata", metadata);
  print("single-doc.map-assertions", mapping);
}

async function runNegativeDocument() {
  const classification = await postJson("/api/agent/classify", negativeDoc);
  print("negative-doc.classify", classification);
}

async function runDraftFinding() {
  const payload = {
    profile: "cheap",
    pack_id: "pack_linow_isa_q2_demo",
    engagement_name: "LINOW-ISA500-Q2REV-2026-ACC",
    audit_area: "Revenue recognition and cash receipts",
    stage: "before_remediation",
    gap: {
      title: "Missing CFO approval for manual revenue adjustment",
      severity: "high",
      related_assertions: [3, 5, 7],
      related_assertion_labels: ["Rights & Obligations", "Classification", "Accuracy"],
      rationale:
        "Manual revenue acceleration is documented, but approval evidence from the CFO is absent from the current pack.",
      suggested_evidence: ["Upload CFO approval memo", "Upload approval workflow screenshot"],
    },
    documents: [adjustmentDoc, contractDoc].map((document) => ({
      document_id: slugId(document.documentName),
      filename: document.documentName,
      notes: [`Source file ${document.context.filePath}`],
      classification: {
        schema_name: "evidence_classification",
        schema_version: "1.0.0",
        document_id: slugId(document.documentName),
        filename: document.documentName,
        document_type: document.documentName.includes("adjustment") ? "manual_adjustment_note" : "customer_contract",
        confidence: 0.8,
        rationale: "Seed classification for draft finding smoke test.",
        limitations: ["Synthetic CLI fixture"],
        assertions: document.documentName.includes("adjustment") ? [2, 5, 7] : [0, 3, 4, 5],
        assertion_labels: document.documentName.includes("adjustment")
          ? ["Valuation & Allocation", "Classification", "Accuracy"]
          : ["Existence", "Rights & Obligations", "Cut-off", "Classification"],
        source_confidence: "L2",
        source_confidence_reason: "Company-uploaded evidence fixture.",
      },
      metadata: {
        schema_name: "metadata_extraction",
        schema_version: "1.0.0",
        document_id: slugId(document.documentName),
        filename: document.documentName,
        document_date: null,
        period_start: null,
        period_end: "2026-06-30",
        document_reference: null,
        parties: [],
        key_dates: [],
        key_amounts: [],
        citations: [
          {
            document_id: slugId(document.documentName),
            filename: document.documentName,
            page: null,
            reference: document.documentText.slice(0, 160),
            confidence: 0.8,
          },
        ],
        limitations: ["Synthetic CLI fixture"],
      },
      assertion_mapping: {
        schema_name: "assertion_mapping",
        schema_version: "1.0.0",
        document_id: slugId(document.documentName),
        filename: document.documentName,
        framework_reference: "ISA 500 evidence readiness",
        mapped_assertions: [],
        overall_rationale: "Synthetic CLI fixture",
        limitations: ["Synthetic CLI fixture"],
      },
      source_confidence: {
        schema_name: "source_confidence",
        schema_version: "1.0.0",
        document_id: slugId(document.documentName),
        filename: document.documentName,
        source_confidence: "L2",
        source_confidence_reason: "Company-uploaded evidence fixture.",
        evidence_basis: ["Company upload"],
        upgrade_path: ["Upload independent approval proof"],
        caveats: ["Not connector verified"],
      },
    })),
    pack_notes: ["Synthetic CLI smoke test for SO-18 draft finding"],
  };

  const result = await postJson("/api/agent/draft-finding", payload);
  print("draft-finding", result);
}

async function runValidateHash() {
  const payload = {
    artifacts: [
      {
        label: "sample-classification",
        payload: {
          schema_name: "evidence_classification",
          schema_version: "1.0.0",
          document_id: "doc_13_bank_statement_june_2026_pdf",
          filename: "13_bank_statement_june_2026.pdf",
          document_type: "bank_statement",
          confidence: 0.8,
          rationale: "Smoke-test classification artifact.",
          limitations: ["Synthetic CLI fixture"],
          assertions: [0, 1, 2, 7],
          assertion_labels: ["Existence", "Completeness", "Valuation & Allocation", "Accuracy"],
          source_confidence: "L2",
          source_confidence_reason: "Company-uploaded evidence fixture.",
        },
      },
    ],
  };

  const result = await postJson("/api/agent/validate-hash", payload);
  print("validate-hash", result);
}

async function runIngestFile() {
  ensureFileArg("ingest-file");
  const result = await postJson("/api/agent/ingest", {
    filePath: fileArg,
  });
  print("ingest-file", result);
}

async function runClassifyFile() {
  ensureFileArg("classify-file");
  const result = await postJson("/api/agent/classify", {
    filePath: fileArg,
    context: {
      engagementName: "LINOW-ISA500-Q2REV-2026-ACC",
      uploaderLabel: "Company Upload (L2)",
      auditArea: "Revenue recognition and cash receipts",
    },
  });
  print("classify-file", result);
}

async function runOrchestrate() {
  const payload = {
    pack_id: "pack_linow_isa_q2_demo",
    engagement_name: "LINOW-ISA500-Q2REV-2026-ACC",
    audit_area: "Revenue recognition and cash receipts",
    stage: "before_remediation",
    pack_notes: [
      "Synthetic CLI smoke test aligned to isa_q2_engagement",
      "Expect approval and cut-off issues before remediation",
    ],
    documents: [bankStatementDoc, contractDoc, cutoffLogDoc, adjustmentDoc].map((document) => ({
      ...document,
      notes: [`Seeded from ${document.context.filePath}`],
    })),
  };

  const result = await postJson("/api/agent/orchestrate", payload);
  print("orchestrate", result);
}

async function runOrchestratePointTwo() {
  const payload = {
    response_mode: "compact_p2",
    pack_id: "pack_linow_isa_q2_demo",
    engagement_name: "LINOW-ISA500-Q2REV-2026-ACC",
    audit_area: "Revenue recognition and cash receipts",
    stage: "before_remediation",
    pack_notes: [
      "Synthetic CLI smoke test aligned to isa_q2_engagement",
      "Expect approval and cut-off issues before remediation",
    ],
    documents: [bankStatementDoc, contractDoc, cutoffLogDoc, adjustmentDoc].map((document) => ({
      ...document,
      notes: [`Seeded from ${document.context.filePath}`],
    })),
  };

  const result = await postJson("/api/agent/orchestrate", payload);
  print("orchestrate-p2", result);
}

async function runOrchestratePointOne() {
  const payload = {
    response_mode: "compact_p1",
    pack_id: "pack_linow_isa_q2_demo",
    engagement_name: "LINOW-ISA500-Q2REV-2026-ACC",
    audit_area: "Revenue recognition and cash receipts",
    stage: "before_remediation",
    pack_notes: [
      "Synthetic CLI smoke test aligned to isa_q2_engagement",
      "Point 1 verification with seeded evidence references",
    ],
    documents: [bankStatementDoc, contractDoc, cutoffLogDoc, adjustmentDoc].map((document, index) => ({
      ...document,
      notes: [`Seeded from ${document.context.filePath}`],
      evidence_ref: buildSyntheticEvidenceRef(document, index),
    })),
  };

  const result = await postJson("/api/agent/orchestrate", payload);
  print("orchestrate-p1", result);
}

async function runOrchestrateWorkspace() {
  const payload = {
    response_mode: "workspace",
    profile: "sui_overflow_demo",
    pack_id: "pack_linow_isa_q2_demo",
    engagement_name: "LINOW-ISA500-Q2REV-2026-ACC",
    audit_area: "Revenue recognition and cash receipts",
    stage: "fieldwork",
    pack_owner_address: "0xworkspace_demo_owner",
    pack_notes: [
      "Synthetic CLI smoke test aligned to the workspace contract",
      "Verify stable runner/output payload for SO-23 person A",
    ],
    documents: [bankStatementDoc, contractDoc, cutoffLogDoc, adjustmentDoc].map((document, index) => ({
      ...document,
      notes: [`Seeded from ${document.context.filePath}`],
      evidence_ref: buildSyntheticEvidenceRef(document, index),
    })),
  };

  const result = await postJson("/api/agent/orchestrate", payload);
  print("orchestrate-workspace", result);
}

async function runOrchestrateMemory() {
  const payload = {
    response_mode: "memory",
    profile: "cheap",
    pack_id: "pack_linow_isa_q2_memory",
    engagement_name: "LINOW-ISA500-Q2REV-2026-ACC",
    audit_area: "Revenue recognition and cash receipts",
    stage: "fieldwork",
    pack_notes: [
      "Synthetic CLI smoke test for SO-24 person A",
      "Verify canonical agent memory payload and recall summary contracts",
    ],
    documents: [bankStatementDoc, contractDoc, cutoffLogDoc, adjustmentDoc].map((document, index) => ({
      ...document,
      notes: [`Seeded from ${document.context.filePath}`],
      evidence_ref: buildSyntheticEvidenceRef(document, index),
    })),
  };

  const result = await postJson("/api/agent/orchestrate", payload);
  print("orchestrate-memory", result);
}

async function runOrchestrateFiles() {
  ensureFileArgs("orchestrate-files");

  const documents = fileArgs.map((pathValue) => ({
    filePath: pathValue,
    notes: [`CLI orchestration source ${pathValue}`],
    context: {
      engagementName: "LINOW-ISA500-Q2REV-2026-ACC",
      uploaderLabel: "Company Upload (L2)",
      auditArea: "Revenue recognition and cash receipts",
      filePath: pathValue,
    },
  }));

  const payload = {
    profile: "cheap",
    pack_id: "pack_linow_isa_q2_files",
    engagement_name: "LINOW-ISA500-Q2REV-2026-ACC",
    audit_area: "Revenue recognition and cash receipts",
    stage: "before_remediation",
    pack_notes: [
      "CLI real-file orchestration run",
      "Each document is ingested from filePath before agent analysis",
    ],
    documents,
  };

  const result = await postJson("/api/agent/orchestrate", payload);
  print("orchestrate-files", result);
}

async function runIsaQ2Engagement() {
  const stage = resolveIsaQ2Stage(fileArg);
  const sourceRoot = stage === "after_remediation" ? "evidence_remediation" : "evidence_initial";
  const rootPath = `${isaQ2PackRoot}/${sourceRoot}`;
  const discoveredFiles = await discoverEvidenceFiles(rootPath);
  const maxDocs = readPositiveIntegerEnv("ISA_Q2_MAX_DOCS") ?? 24;
  const selectedFiles = discoveredFiles.slice(0, maxDocs);

  if (selectedFiles.length === 0) {
    throw new Error(
      [
        `No supported evidence files found under ${rootPath}.`,
        "Add PDF/XLSX/DOCX/TXT/CSV/image evidence files to the pack, or use:",
        "npm run agent:smoke -- orchestrate-files <path> [path...]",
      ].join(" "),
    );
  }

  const documents = selectedFiles.map((filePath) => ({
    filePath,
    notes: [`ISA Q2 engagement evidence source ${filePath}`],
    context: {
      engagementName: "LINOW-ISA500-Q2REV-2026-ACC",
      uploaderLabel: "Company Upload (L2)",
      auditArea: "Revenue recognition and cash receipts",
      filePath,
    },
  }));

  const payload = {
    provider: process.env.AGENT_PROVIDER || "gemini",
    response_mode: process.env.ISA_Q2_RESPONSE_MODE || "compact_p2",
    profile: process.env.ISA_Q2_PROFILE || "cheap",
    pack_id: process.env.ISA_Q2_PACK_ID || "pack_linow_isa_q2_demo",
    engagement_name: "LINOW-ISA500-Q2REV-2026-ACC",
    audit_area: "Revenue recognition and cash receipts",
    stage,
    pack_notes: [
      `Auto-discovered ${selectedFiles.length} evidence file(s) from ${rootPath}.`,
      "ISA Q2 smoke expects cut-off, approval, source-confidence, and revenue evidence coverage to be assessed conservatively.",
      "Agent proposes analysis outputs only; human review is required before any chain write.",
    ],
    documents,
  };

  print("isa-q2-engagement.discovery", {
    provider: payload.provider,
    profile: payload.profile,
    response_mode: payload.response_mode,
    stage,
    source_root: rootPath,
    selected_file_count: selectedFiles.length,
    total_discovered_file_count: discoveredFiles.length,
    selected_files: selectedFiles,
  });

  const result = await postJson("/api/agent/orchestrate", payload);
  print("isa-q2-engagement", result);
}

async function postJson(path, payload) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(agentSmokeTimeoutMs),
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((error) => {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        `Could not reach agent API at ${url}: ${reason}.`,
        `Current smoke timeout is ${agentSmokeTimeoutMs}ms.`,
        "Start the app server with `cd app && npm run dev`,",
        "or set AGENT_BASE_URL if Next.js is running on another port.",
      ].join(" "),
    );
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${path} failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

function print(label, value) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(value, null, 2));
}

function slugId(filename) {
  return `doc_${filename.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40)}`;
}

function buildSyntheticEvidenceRef(document, index) {
  const slug = slugId(document.documentName).replace(/^doc_/, "");
  const hexSeed = Buffer.from(`linow-${slug}-${index}`).toString("hex").slice(0, 64).padEnd(64, "0");

  return {
    evidence_id: `evidence_${slug}`,
    walrus_blob_id: `walrus_blob_${slug}`,
    commitment: `0x${hexSeed}`,
  };
}

function ensureFileArg(currentMode) {
  if (!fileArg) {
    throw new Error(`${currentMode} requires a file path argument.`);
  }
}

function ensureFileArgs(currentMode) {
  if (fileArgs.length === 0) {
    throw new Error(`${currentMode} requires one or more file path arguments.`);
  }
}

async function discoverEvidenceFiles(rootPath) {
  const absoluteRoot = path.resolve(repoRoot, rootPath);
  const files = await walkFiles(absoluteRoot).catch((error) => {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  });

  return files
    .map((absolutePath) => path.relative(repoRoot, absolutePath))
    .filter((relativePath) => supportedEvidenceExtensions.has(path.extname(relativePath).toLowerCase()))
    .filter((relativePath) => !relativePath.includes(`${path.sep}expected_outputs${path.sep}`))
    .filter((relativePath) => !relativePath.includes(`${path.sep}agent_test_scripts${path.sep}`))
    .sort((left, right) => left.localeCompare(right));
}

async function walkFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkFiles(absolutePath));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function resolveIsaQ2Stage(value) {
  if (value === "after" || value === "after_remediation" || value === "remediation") {
    return "after_remediation";
  }

  return "before_remediation";
}

function readPositiveIntegerEnv(name) {
  const value = process.env[name];

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
