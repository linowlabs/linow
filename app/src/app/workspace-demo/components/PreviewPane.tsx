import React from "react";
import { PbcItem } from "../types";
import { FOLDER_METADATA } from "../constants";

interface PreviewPaneProps {
  selectedPbcId: string;
  pbcList: PbcItem[];
  selectedFolder?: string;
}

export default function PreviewPane({ selectedPbcId, pbcList, selectedFolder }: PreviewPaneProps) {
  const activeFile = pbcList.find(p => p.id === selectedPbcId);
  const folderMeta = selectedFolder
    ? (FOLDER_METADATA[selectedFolder] || (selectedFolder.includes("evidence_initial/") ? {
        displayName: selectedFolder.substring(selectedFolder.lastIndexOf("/") + 1),
        description: "Custom compliance evidence folder compiled for your organization profile objectives.",
        aiValidation: "Memeriksa keaslian dokumen, mencocokkan hash data di Walrus, dan mengklasifikasikan asersi kepatuhan secara otomatis."
      } : null))
    : null;

  if (!activeFile && folderMeta) {
    return (
      <section className="preview-pane liquid-glass">
        <div className="preview-header">
          <h3 className="preview-title">Smart PBC Folder</h3>
          <span className="preview-subtitle">Overview</span>
        </div>
        
        <div className="pdf-viewer-container" style={{ padding: "28px", boxSizing: "border-box", overflowY: "auto", height: "100%" }}>
          <div className="folder-detail-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="folder-meta-header" style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "16px" }}>
              <span style={{ fontSize: "28px" }}>📁</span>
              <div>
                <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{folderMeta.displayName}</h4>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Requirement Folder</p>
              </div>
            </div>

            <div className="folder-meta-section">
              <h5 style={{ fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                PBC Requirement Description
              </h5>
              <div className="glass-card-sunken" style={{ background: "rgba(0,0,0,0.015)", border: "1px solid rgba(0,0,0,0.03)", padding: "14px", borderRadius: "10px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                {folderMeta.description}
              </div>
            </div>

            <div className="folder-meta-section">
              <h5 style={{ fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                AI Agent Validation Rules
              </h5>
              <div className="glass-card-sunken" style={{ background: "rgba(37,99,235,0.02)", border: "1px solid rgba(37,99,235,0.05)", padding: "14px", borderRadius: "10px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "16px", color: "var(--accent-color)" }}>⚡</span>
                <div>
                  <span style={{ fontWeight: "700", color: "var(--accent-color)", display: "block", marginBottom: "3px" }}>Auto-Validation Rules:</span>
                  {folderMeta.aiValidation}
                </div>
              </div>
            </div>

            <div className="folder-meta-section">
              <h5 style={{ fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                Evidence Files in this Folder
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {pbcList.filter(f => f.folder === selectedFolder).map(file => (
                  <div key={file.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.65)", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{file.type === "pdf" ? "📄" : "📊"}</span>
                      <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{file.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className={`pbc-badge ${file.status === "registered" ? "registered" : "unregistered"}`} style={{ fontSize: "9.5px", padding: "1px 6px", borderRadius: "4px" }}>
                        {file.status}
                      </span>
                    </div>
                  </div>
                ))}
                {pbcList.filter(f => f.folder === selectedFolder).length === 0 && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No files in this folder.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Helper to render customized details inside the main preview sheet depending on selection
  const renderPreviewCanvas = () => {
    if (!activeFile) {
      return (
        <div className="pdf-page empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', padding: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '32px' }}>📄</span>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>You have not chosen any file to preview</p>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', maxWidth: '280px', margin: 0 }}>Please select a document from the File Directory or upload new evidence to inspect details.</p>
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
      } else if (activeFile.id === "pbc-payroll-register") {
        headers = ["Employee Name", "Department", "Base Salary", "Overtime", "Tax Deductions", "Net Pay"];
        rows = [
          ["Adrian Santoso", "Engineering", "IDR 24,000,000", "IDR 1,500,000", "IDR 2,550,000", "IDR 22,950,000"],
          ["Maya Putri", "Marketing", "IDR 18,000,000", "IDR 0", "IDR 1,800,000", "IDR 16,200,000"],
          ["Budi Setiawan", "Operations", "IDR 15,000,000", "IDR 800,000", "IDR 1,580,000", "IDR 14,220,000"]
        ];
      } else if (activeFile.id === "pbc-invoice-batch") {
        headers = ["Invoice No", "Customer", "Invoice Date", "Due Date", "Tax Amount", "Total Amount"];
        rows = [
          ["INV-2026-081", "PT Orion Mart Tbk", "2026-06-01", "2026-06-15", "IDR 17,100,000", "IDR 188,100,000"],
          ["INV-2026-082", "PT Mega Logis", "2026-06-05", "2026-06-19", "IDR 9,820,000", "IDR 108,020,000"]
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

    if (activeFile.id === "pbc-orion-contract" || activeFile.id === "pbc-sales-contract-01") {
      const isOrion = activeFile.id === "pbc-orion-contract";
      const title = isOrion ? "Customer Contract - PT Orion Mart Tbk" : "Sales Contract - Global Tech Solutions Inc.";
      const ref = isOrion ? "C-ORION-2026-019" : "SC-2026-04921-Q2";
      const customer = isOrion ? "PT Orion Mart Tbk" : "Global Tech Solutions Inc.";
      const date = isOrion ? "2026-03-28" : "2026-05-12";
      const summary = isOrion 
        ? "Total contract value: IDR 855,000,000 excluding VAT. Components: implementation services IDR 342,000,000 and SaaS subscription IDR 513,000,000."
        : "Total Contract Value: USD 142,500.00. Scope: Delivery of 500 units of Enterprise Suite Licenses.";

      return (
        <div className="pdf-page">
          <div className="pdf-contract-sheet">
            <h1 className="pdf-contract-title">{title}</h1>
            <p className="pdf-contract-subtitle text-xs text-muted" style={{ marginBottom: 12 }}>
              PT Arunika Cloud Commerce | Q2 2026 | Generated demo evidence for Linow ISA 500 testing
            </p>
            <hr className="pdf-divider" />
            
            <div className="pdf-meta-block">
              <p><strong>Contract Reference:</strong> {ref}</p>
              <p><strong>Customer:</strong> {customer}</p>
              <p><strong>Vendor:</strong> PT Arunika Cloud Commerce</p>
              <p><strong>Effective Date:</strong> {date}</p>
              <p><strong>Contract Term:</strong> 12 months from production launch</p>
            </div>

            <div className="pdf-contract-section">
              <h3>Contract Summary</h3>
              <p>{summary}</p>
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
                  <span>{isOrion ? "14 days from invoice date unless otherwise stated in SOW" : "Net 30 days from invoice receipt"}</span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Milestone 1</span>
                  <span>
                    <span className="highlight-yellow">{isOrion ? "50% of implementation fee upon UAT sign-off" : "100% License activation fee"}</span>
                  </span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Milestone 2</span>
                  <span>{isOrion ? "50% of implementation fee upon readiness confirmation" : "Monthly support/maintenance SLA setup"}</span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Subscription</span>
                  <span>{isOrion ? "Monthly recognition once platform access is available" : "Enterprise Suite annual recurring licenses"}</span>
                </div>
                <div className="pdf-table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                  <span>Approval requirement</span>
                  <span>
                    <span className="highlight-blue">{isOrion ? "Contracts above IDR 750,000,000 require Commercial Committee approval before revenue recognition" : "Requires Executive CFO authorization signature"}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pdf-contract-section" style={{ marginTop: 12 }}>
              <h3>Signatures</h3>
              <p className="text-xxs text-muted">
                {isOrion ? (
                  <>
                    Signed for PT Orion Mart Tbk by: Adrian Pradipta, Procurement Director, 2026-03-28.<br />
                    Signed for PT Arunika Cloud Commerce by: Maya Santoso, Chief Commercial Officer, 2026-03-28.
                  </>
                ) : (
                  <>
                    Signed for Global Tech Solutions Inc. by: John Smith, CEO, 2026-05-12.<br />
                    Signed for PT Arunika Cloud Commerce by: Jane Doe, Chief Financial Officer, 2026-05-12.
                  </>
                )}
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

  return (
    <section className="workspace-pane pane-preview" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="preview-title-bar" style={{ padding: '16px 20px 12px', marginBottom: 0 }}>
        <h3 className="preview-title">Preview</h3>
        <span className="preview-subtitle">
          {activeFile?.name || ""} — Reviewer View
        </span>
      </div>
      
      {/* PDF Viewer Interface */}
      <div className="pdf-viewer-container">
        {/* PDF Toolbar */}
        <div className="pdf-toolbar">
          <div className="pdf-toolbar-left">
            <button className="pdf-tool-btn" title="Toggle Sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
            </button>
            <button className="pdf-tool-btn" title="Search document">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <div className="pdf-page-navigation">
              <button className="pdf-tool-btn" title="Previous page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <input type="text" className="pdf-page-input" defaultValue="1" readOnly />
              <span className="pdf-page-count">of 1</span>
              <button className="pdf-tool-btn" title="Next page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </div>
          </div>
          <div className="pdf-toolbar-right">
            <button className="pdf-tool-btn" title="Zoom Out">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
            </button>
            <button className="pdf-tool-btn" title="Zoom In">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
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
  );
}
