# LINOW-ISA500-Q2REV-2026-ACC - Complex ISA 500 Demo Pack

## Client
PT Arunika Cloud Commerce

## Period
Q2 2026, covering April, May, and June 2026.

## Audit Area
Revenue recognition and cash receipts.

## Business Story
PT Arunika Cloud Commerce is a B2B SaaS company serving retail businesses. In Q2 2026, the company signed and started delivering a large enterprise contract with PT Orion Mart Tbk. The contract is material because it is worth IDR 855,000,000 and includes both SaaS subscription revenue and implementation milestone revenue.

The demo pack is designed to test whether Linow can follow a realistic evidence trail across:
- Monthly management reports
- Financial reporting workbook
- Sales register
- Customer contracts
- Invoices
- Service acceptance evidence
- Cut-off logs
- Bank statements
- Bank transaction exports
- GL ledger
- Revenue policy
- Manual journal adjustment notes
- Remediation documents

## Intentional Gaps
GAP-01: The initial evidence pack does not include Commercial Committee minutes for contract C-ORION-2026-019, even though the contract exceeds the approval threshold.

GAP-02: The initial evidence pack does not include CFO approval for manual revenue adjustment JRN-2026-06-117.

GAP-03: Cut-off risk exists because Orion UAT was signed on 2026-06-25, but production go-live is recorded on 2026-07-02 while revenue was recognized on 2026-06-30.

## Expected Agent Behavior
The agent should not simply say "all evidence complete." It should:
1. Classify each document.
2. Map each document to ISA-style assertions.
3. Assign source confidence L2 for company-uploaded evidence.
4. Detect missing approval evidence.
5. Detect cut-off risk.
6. Draft C-C-C-E-R findings.
7. Recommend remediation evidence.
8. After remediation files are uploaded, update the gap status.
9. Refuse to overclaim that the documents are true or independently issued.
