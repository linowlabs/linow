import React from "react";
import { PbcItem } from "./types";

export const ISA_ASSERTIONS = [
  "Existence",
  "Completeness",
  "Valuation & Allocation",
  "Rights & Obligations",
  "Cut-off",
  "Classification",
  "Occurrence",
  "Accuracy",
];

export const DOC_TYPES = [
  { value: "pdf", label: "PDF Document" },
  { value: "excel", label: "Excel Spreadsheet" },
  { value: "csv", label: "CSV Dataset" },
  { value: "contract", label: "Sales Contract" },
  { value: "invoice", label: "Customer Invoice" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "payroll", label: "Payroll Data" },
];

export const DEFAULT_COMPANY_PBC: PbcItem[] = [
  // Wireframe mock files
  { id: "pbc-payroll-register", name: "Payroll_register.csv", folder: "demo/PBC_list/evidence_initial/01_financial_reports", size: "4.2 KB", status: "unregistered", type: "csv", analyzed: true, agentTag: "Payroll Data", agentAssertions: ["Occurrence", "Accuracy"] },
  { id: "pbc-invoice-batch", name: "Invoice_batch.xlsx", folder: "demo/PBC_list/evidence_initial/02_contracts_invoices", size: "18.5 KB", status: "registered", type: "excel", analyzed: true, agentTag: "Invoice Batch", agentAssertions: ["Existence", "Completeness"] },
  { id: "pbc-sales-contract-01", name: "Sales_contract_01.pdf", folder: "demo/PBC_list/evidence_initial/02_contracts_invoices", size: "3.2 KB", status: "unregistered", type: "pdf", analyzed: true, agentTag: "Sales Contract", agentAssertions: ["Occurrence", "Accuracy", "Rights & Obligations"] },
  { id: "pbc-bank-statement-q2", name: "Bank_statement_Q2.pdf", folder: "demo/PBC_list/evidence_initial/04_bank_cash_receipts", size: "8.7 KB", status: "unregistered", type: "pdf", analyzed: true, agentTag: "Bank Statement", agentAssertions: ["Completeness", "Cut-off"] },

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

export const PREVIEW_CONTENT_SALES = [
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
export const generateId = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Helper to render bold text in chat logs safely without dangerouslySetInnerHTML
export const renderChatText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export const HEALTHCARE_PBC: PbcItem[] = [
  { id: "pbc-hc-1", name: "patient_record_encryption_policy.pdf", folder: "demo/PBC_list/evidence_initial/01_medical_records", size: "3.5 KB", status: "unregistered", type: "pdf", analyzed: true, agentTag: "Encryption Architecture", agentAssertions: ["Existence", "Accuracy"] },
  { id: "pbc-hc-2", name: "database_encryption_keys_log.xlsx", folder: "demo/PBC_list/evidence_initial/01_medical_records", size: "12.8 KB", status: "registered", type: "excel", analyzed: true, agentTag: "Key Management Log", agentAssertions: ["Completeness", "Classification"] },
  { id: "pbc-hc-3", name: "employee_access_matrix.csv", folder: "demo/PBC_list/evidence_initial/02_access_control", size: "1.2 KB", status: "unregistered", type: "csv", analyzed: true, agentTag: "User Access Matrix", agentAssertions: ["Classification", "Rights & Obligations"] },
];

export const FINTECH_PBC: PbcItem[] = [
  { id: "pbc-ft-1", name: "payment_token_encryption.pdf", folder: "demo/PBC_list/evidence_initial/01_transaction_security", size: "4.8 KB", status: "unregistered", type: "pdf", analyzed: true, agentTag: "Gateway Logs", agentAssertions: ["Existence", "Accuracy"] },
  { id: "pbc-ft-2", name: "firewall_architecture_q2.xlsx", folder: "demo/PBC_list/evidence_initial/01_transaction_security", size: "15.2 KB", status: "registered", type: "excel", analyzed: true, agentTag: "Firewall Configuration", agentAssertions: ["Completeness", "Classification"] },
  { id: "pbc-ft-3", name: "penetration_testing_report.pdf", folder: "demo/PBC_list/evidence_initial/02_vulnerability_management", size: "8.4 KB", status: "unregistered", type: "pdf", analyzed: true, agentTag: "Pen-Test Audit", agentAssertions: ["Valuation & Allocation", "Rights & Obligations"] },
];

export const MANUFACTURING_PBC: PbcItem[] = [
  { id: "pbc-mf-1", name: "stock_opname_minutes.pdf", folder: "demo/PBC_list/evidence_initial/01_inventory_valuation", size: "5.1 KB", status: "unregistered", type: "pdf", analyzed: true, agentTag: "Stock Count Minutes", agentAssertions: ["Existence", "Accuracy"] },
  { id: "pbc-mf-2", name: "cogs_calculation_sheet.xlsx", folder: "demo/PBC_list/evidence_initial/01_inventory_valuation", size: "22.4 KB", status: "registered", type: "excel", analyzed: true, agentTag: "COGS Sheet", agentAssertions: ["Completeness", "Valuation & Allocation"] },
  { id: "pbc-mf-3", name: "fixed_assets_depreciation.csv", folder: "demo/PBC_list/evidence_initial/02_fixed_assets", size: "3.7 KB", status: "unregistered", type: "csv", analyzed: true, agentTag: "Asset Registry", agentAssertions: ["Valuation & Allocation", "Rights & Obligations"] },
];

export const ECOMMERCE_PBC: PbcItem[] = [
  { id: "pbc-ec-1", name: "privacy_policy_consent.pdf", folder: "demo/PBC_list/evidence_initial/01_privacy_compliance", size: "3.1 KB", status: "unregistered", type: "pdf", analyzed: true, agentTag: "Privacy Policy", agentAssertions: ["Classification", "Rights & Obligations"] },
  { id: "pbc-ec-2", name: "daily_sales_revenue_q2.xlsx", folder: "demo/PBC_list/evidence_initial/02_revenue_recognition", size: "48.2 KB", status: "registered", type: "excel", analyzed: true, agentTag: "Sales Sheet", agentAssertions: ["Completeness", "Occurrence"] },
  { id: "pbc-ec-3", name: "payment_gateway_audit.pdf", folder: "demo/PBC_list/evidence_initial/03_data_security", size: "9.2 KB", status: "unregistered", type: "pdf", analyzed: true, agentTag: "ISO Audit Log", agentAssertions: ["Existence", "Accuracy"] },
];

export const FOLDER_METADATA: Record<string, { displayName: string; description: string; aiValidation: string }> = {
  // Default SaaS Folders
  "demo/PBC_list/evidence_initial/01_financial_reports": {
    displayName: "01_financial_reports",
    description: "Upload financial reports including June management reports, aging files, and financial reporting packs.",
    aiValidation: "Verify accounting periods, matching transaction ranges, and classification consistency."
  },
  "demo/PBC_list/evidence_initial/02_contracts_invoices": {
    displayName: "02_contracts_invoices",
    description: "Upload sales contracts, vendor agreements, and active customer invoices.",
    aiValidation: "Match invoice details with signed customer agreements, confirming transaction value and contract numbers."
  },
  "demo/PBC_list/evidence_initial/03_delivery_cutoff": {
    displayName: "03_delivery_cutoff",
    description: "Upload service delivery logs, acceptance certificates (UAT), and cutoff records.",
    aiValidation: "Check delivery dates against accounting periods to ensure correct cut-off and accrual timing."
  },
  "demo/PBC_list/evidence_initial/04_bank_cash_receipts": {
    displayName: "04_bank_cash_receipts",
    description: "Upload monthly bank statements and cash receipts logs.",
    aiValidation: "Verify bank statement deposits against general ledger records and matching invoices."
  },

  // Healthcare
  "demo/PBC_list/evidence_initial/01_medical_records": {
    displayName: "01_Rekam Medis & Enkripsi Data (Protected Health Information)",
    description: "Unggah arsitektur penyimpanan data dan log enkripsi database pasien.",
    aiValidation: "Memeriksa apakah data medis pasien dienkripsi saat disimpan (at rest) dan saat dikirim (in transit)."
  },
  "demo/PBC_list/evidence_initial/02_access_control": {
    displayName: "02_Kontrol Akses Pengguna (Access Control Policy)",
    description: "Unggah daftar peran karyawan dan hak akses mereka terhadap sistem rekam medis.",
    aiValidation: "Memastikan hanya tenaga medis berwenang yang memiliki akses ke data pasien pasien tertentu (mencegah kebocoran data)."
  },

  // Fintech
  "demo/PBC_list/evidence_initial/01_transaction_security": {
    displayName: "01_Keamanan Transaksi (Payment Gateway Logs)",
    description: "Unggah sampel log enkripsi token transaksi dan arsitektur firewall.",
    aiValidation: "Memastikan nomor kartu atau PIN nasabah tidak tersimpan dalam bentuk teks biasa (plain text) di dalam sistem."
  },
  "demo/PBC_list/evidence_initial/02_vulnerability_management": {
    displayName: "02_Manajemen Kerentanan (Vulnerability Assessment)",
    description: "Unggah laporan hasil Penetration Testing (uji retas) terakhir dari vendor eksternal.",
    aiValidation: "Memindai apakah ada celah keamanan kategori Critical atau High yang belum diperbaiki oleh tim developer."
  },

  // Manufacturing
  "demo/PBC_list/evidence_initial/01_inventory_valuation": {
    displayName: "01_Penilaian Persediaan (Inventory Valuation)",
    description: "Unggah berita acara Stock Opname akhir tahun dan daftar harga pokok produksi (HPP).",
    aiValidation: "Menghitung ulang metode penilaian persediaan (FIFO/Average) untuk memastikan tidak ada penggelembungan nilai aset persediaan (Valuation assertion)."
  },
  "demo/PBC_list/evidence_initial/02_fixed_assets": {
    displayName: "02_Register Aset Pabrik (Fixed Assets Register)",
    description: "Unggah daftar mesin pabrik, nilai perolehan, dan dokumen bukti kepemilikan aset.",
    aiValidation: "Memeriksa akurasi biaya penyusutan tahunan dan mencocokkan hak kepemilikan hukum perusahaan atas mesin tersebut (Rights assertion)."
  },

  // E-Commerce
  "demo/PBC_list/evidence_initial/01_privacy_compliance": {
    displayName: "01_Regional Data Privacy Bundle (UU PDP / Singapore PDPA)",
    description: "Unggah kebijakan privasi data konsumen dan formulir persetujuan (consent form).",
    aiValidation: "Memastikan kepatuhan penanganan data pribadi konsumen sesuai undang-undang perlindungan data regional."
  },
  "demo/PBC_list/evidence_initial/02_revenue_recognition": {
    displayName: "02_Revenue Recognition Framework (IFRS 15 / PSAK 72)",
    description: "Unggah sampel data transaksi harian dan kebijakan pengakuan pendapatan penjualan barang.",
    aiValidation: "Memverifikasi akurasi pengakuan pendapatan harian dari volume transaksi e-commerce yang masif."
  },
  "demo/PBC_list/evidence_initial/03_data_security": {
    displayName: "03_ISO/IEC 27001 (Consumer Data Security Core)",
    description: "Unggah sertifikasi keamanan sistem pembayaran dan log audit server.",
    aiValidation: "Memastikan infrastruktur keamanan data sensitif pelanggan terlindungi secara konsisten."
  }
};

