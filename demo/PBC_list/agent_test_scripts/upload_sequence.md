# Recommended Upload Sequence for Linow Demo

## Step 1 - Register initial pack
Upload the full `evidence_initial/` folder.

Expected:
- Agent classifies 21 initial evidence files.
- Source confidence should be L2 for company-uploaded evidence.
- Gap analysis should identify GAP-01, GAP-02, and GAP-03.
- Agent should draft three C-C-C-E-R findings.

## Step 2 - Store memory
Agent should remember:
- Classification summary
- Evidence assertion coverage
- Gap analysis before remediation
- C-C-C-E-R findings

## Step 3 - Remediate
Upload the full `evidence_remediation/` folder.

Expected:
- GAP-01 resolved by R01.
- GAP-02 resolved by R02.
- GAP-03 remains open as cut-off review item.

## Step 4 - Auditor wallet attestation
Switch to reviewer wallet and attest selected evidence or the pack.

Expected:
- Source confidence can move from L2 to L3 for attested items.
- Agent should not move to L4 or L5 because connector proof is not provided.

## Step 5 - Negative tests
Upload files in `negative_cases/`.

Expected:
- Tampered PDFs/CSVs fail registered commitment verification.
- Marketing brochure is rejected as irrelevant audit evidence.
