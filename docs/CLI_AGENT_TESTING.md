# CLI Agent Testing

This guide lets you test the Linow agent routes from the terminal before any UI integration.

The current CLI flow supports two paths:

- **Synthetic smoke payloads** aligned to `demo/isa_q2_engagement`
- **Real file ingestion** from local paths inside the repository workspace

The ingestion layer currently supports:

- `.txt`
- `.md`
- `.csv`
- `.tsv`
- `.json`
- `.log`
- `.xml`
- `.html`
- `.yml` / `.yaml`
- `.pdf`
- `.xlsx`
- `.xls`
- `.xlsm`
- `.xlsb`
- `.docx`
- common image files (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.tif`, `.tiff`) when the Gemini provider is used

PDF, spreadsheet, DOCX, and text-like files still use local extraction first. When `AGENT_PROVIDER=gemini`, scanned PDFs or image evidence can be sent to Gemini as inline attachments for OCR/visual understanding. XLSX/XLS files are intentionally converted locally into sheet text/tables before model analysis.

## Gemini demo mode

For the Sui Overflow demo path, use Gemini as the full agent provider:

```bash
export AGENT_PROVIDER=gemini
export GEMINI_API_KEY=your_key_here
export GEMINI_MODEL=gemini-3.5-flash
```

Optional PDF behavior:

```bash
export GEMINI_PDF_MODE=auto
```

Modes:
- `auto` = attach PDFs only when local extraction is weak or image-like.
- `always` = attach every PDF for Gemini native document understanding.
- `off` = text-only processing.

Groq remains available by setting `AGENT_PROVIDER=groq` or by sending `"provider":"groq"` in a request body.

## 1. Start the app server

From the repo root:

```bash
cd app
npm run dev
```

The agent routes default to:

```txt
http://127.0.0.1:3000
```

If your server uses another port, set:

```bash
export AGENT_BASE_URL=http://127.0.0.1:3001
```

## 2. Run the smoke script

From `app/`:

### Single document happy path

```bash
npm run agent:smoke -- single-doc
```

This calls:
- `POST /api/agent/classify`
- `POST /api/agent/extract-metadata`
- `POST /api/agent/map-assertions`

for a synthetic June 2026 bank statement sample.

### Negative document classification

```bash
npm run agent:smoke -- negative-doc
```

This checks how the classifier reacts to a marketing brochure style input that should have low audit value.

### Draft finding

```bash
npm run agent:smoke -- draft-finding
```

This calls:
- `POST /api/agent/draft-finding`

using a seeded approval-gap scenario aligned to the ISA Q2 engagement story.

### Validate and hash artifacts

```bash
npm run agent:smoke -- validate-hash
```

This calls:
- `POST /api/agent/validate-hash`

to validate a schema-shaped artifact and return a deterministic SHA-256 hash.

### Full orchestration

```bash
npm run agent:smoke -- orchestrate
```

This calls:
- `POST /api/agent/orchestrate`

and runs the full visible agent flow:
- classify
- extract metadata
- map assertions
- analyze gaps
- draft findings
- build summary
- hash outputs

The result still stops at:

```txt
proposed_action.action_type = review_agent_outputs
```

That is intentional. The agent proposes, but a human still reviews before any Walrus or Sui write.

Repeated orchestration runs with the same normalized document input now reuse cached per-document analysis artifacts from `app/.cache/agent/document-analysis/` before calling the model again.

The orchestration route now supports a `profile` field:

- `cheap` = default for Groq free-tier style budgets. Uses one compact document-analysis pass, smaller per-doc text budget, and drafts fewer findings.
- `balanced` = keeps the compact pass but allows larger inputs and more findings.
- `full` = restores the older multi-pass per-document flow for higher-budget runs.

With `AGENT_PROVIDER=gemini`, the compact document-analysis pass is enabled by default so one model call can classify, extract metadata, map assertions, and assign source confidence for each evidence item.

### Full orchestration from real file paths

```bash
npm run agent:smoke -- orchestrate-files \
  demo/00_engagement_brief_linow_isa500_q2_revenue.pdf \
  demo/tamperable_audit_sample.csv
```

If your `demo/isa_q2_engagement` folder already contains real evidence files, you can point to them directly too:

```bash
npm run agent:smoke -- orchestrate-files \
  demo/isa_q2_engagement/evidence_initial/04_bank_cash_receipts/13_bank_statement_june_2026.pdf \
  demo/isa_q2_engagement/evidence_initial/02_contracts_invoices/09_customer_contract_orion_C-ORION-2026-019.pdf \
  demo/isa_q2_engagement/evidence_initial/03_delivery_cutoff/05_service_delivery_cutoff_log.csv \
  demo/isa_q2_engagement/evidence_initial/05_gl_exports_and_policies/15_manual_adjustment_note_JRN-2026-06-117.txt
```

This calls:
- `POST /api/agent/orchestrate`

and each document is ingested from `filePath` before the agent runs classification, extraction, mapping, gap analysis, and finding drafting.

### Full ISA Q2 engagement smoke

If `demo/isa_q2_engagement` contains evidence files, the smoke runner can auto-discover the pack:

```bash
npm run agent:smoke -- isa-q2-engagement
```

To point the same smoke at the richer PBC list pack:

```bash
ISA_Q2_PACK_ROOT=demo/PBC_list npm run agent:smoke -- isa-q2-engagement
```

By default, this scans:

```txt
demo/isa_q2_engagement/evidence_initial
```

and posts the discovered evidence files to `POST /api/agent/orchestrate` with:

- `provider` from `AGENT_PROVIDER`, defaulting to `gemini`
- `response_mode` from `ISA_Q2_RESPONSE_MODE`, defaulting to `workspace`
- `profile` from `ISA_Q2_PROFILE`, defaulting to `cheap`
- stable `pack_id` from `ISA_Q2_PACK_ID`, defaulting to `pack_linow_isa_q2_demo`

Optional remediation-stage run:

```bash
npm run agent:smoke -- isa-q2-engagement after
```

This scans:

```txt
demo/isa_q2_engagement/evidence_remediation
```

Optional document cap:

```bash
ISA_Q2_MAX_DOCS=6 npm run agent:smoke -- isa-q2-engagement
```

The default cap is 24 documents so the full `demo/PBC_list/evidence_initial` story can run without dropping the bank, GL, policy, or manual-adjustment evidence.

The smoke client waits up to 10 minutes by default. Override when running a heavier pack:

```bash
AGENT_SMOKE_TIMEOUT_MS=900000 ISA_Q2_PACK_ROOT=demo/PBC_list npm run agent:smoke -- isa-q2-engagement
```

The server logs progress with `[linow-agent]` messages while it reads evidence, analyzes each document, runs gap analysis, and builds summaries. Set `AGENT_PROGRESS_LOGS=off` to silence these logs.

### Ingest a real local file

```bash
npm run agent:smoke -- ingest-file demo/00_engagement_brief_linow_isa500_q2_revenue.pdf
```

This calls:
- `POST /api/agent/ingest`

and returns:
- ingestion metadata
- extraction warnings
- text preview

### Classify a real local file

```bash
npm run agent:smoke -- classify-file demo/00_engagement_brief_linow_isa500_q2_revenue.pdf
```

This calls:
- `POST /api/agent/classify`

and lets the route ingest the file content directly from `filePath`.

## 3. Direct curl examples

### Ingest a real local PDF

```bash
curl -s -X POST http://127.0.0.1:3000/api/agent/ingest \
  -H 'content-type: application/json' \
  -d '{
    "filePath":"demo/00_engagement_brief_linow_isa500_q2_revenue.pdf"
  }' | jq
```

### Classify a real local PDF or spreadsheet by file path

```bash
curl -s -X POST http://127.0.0.1:3000/api/agent/classify \
  -H 'content-type: application/json' \
  -d '{
    "provider":"gemini",
    "filePath":"demo/00_engagement_brief_linow_isa500_q2_revenue.pdf",
    "context":{
      "engagementName":"LINOW-ISA500-Q2REV-2026-ACC",
      "uploaderLabel":"Company Upload (L2)",
      "auditArea":"Revenue recognition and cash receipts"
    }
  }' | jq
```

### Draft finding

```bash
curl -s -X POST http://127.0.0.1:3000/api/agent/draft-finding \
  -H 'content-type: application/json' \
  -d '{
    "pack_id":"pack_linow_isa_q2_demo",
    "engagement_name":"LINOW-ISA500-Q2REV-2026-ACC",
    "audit_area":"Revenue recognition and cash receipts",
    "stage":"before_remediation",
    "gap":{
      "title":"Missing CFO approval for manual revenue adjustment",
      "severity":"high",
      "related_assertions":[3,5,7],
      "related_assertion_labels":["Rights & Obligations","Classification","Accuracy"],
      "rationale":"Manual revenue acceleration is documented, but approval evidence from the CFO is absent from the current pack.",
      "suggested_evidence":["Upload CFO approval memo","Upload approval workflow screenshot"]
    },
    "documents":[
      {
        "document_id":"doc_15_manual_adjustment_note_jrn_2026_06_1",
        "filename":"15_manual_adjustment_note_JRN-2026-06-117.txt",
        "notes":["Synthetic CLI fixture"],
        "classification":{
          "schema_name":"evidence_classification",
          "schema_version":"1.0.0",
          "document_id":"doc_15_manual_adjustment_note_jrn_2026_06_1",
          "filename":"15_manual_adjustment_note_JRN-2026-06-117.txt",
          "document_type":"manual_adjustment_note",
          "confidence":0.8,
          "rationale":"Seed classification for finding drafting.",
          "limitations":["Synthetic CLI fixture"],
          "assertions":[2,5,7],
          "assertion_labels":["Valuation & Allocation","Classification","Accuracy"],
          "source_confidence":"L2",
          "source_confidence_reason":"Company-uploaded evidence fixture."
        },
        "metadata":{
          "schema_name":"metadata_extraction",
          "schema_version":"1.0.0",
          "document_id":"doc_15_manual_adjustment_note_jrn_2026_06_1",
          "filename":"15_manual_adjustment_note_JRN-2026-06-117.txt",
          "document_date":null,
          "period_start":null,
          "period_end":"2026-06-30",
          "document_reference":null,
          "parties":[],
          "key_dates":[],
          "key_amounts":[],
          "citations":[
            {
              "document_id":"doc_15_manual_adjustment_note_jrn_2026_06_1",
              "filename":"15_manual_adjustment_note_JRN-2026-06-117.txt",
              "page":null,
              "reference":"Manual adjustment note JRN-2026-06-117. Revenue accelerated by IDR 84,500,000 on 2026-06-30.",
              "confidence":0.8
            }
          ],
          "limitations":["Synthetic CLI fixture"]
        },
        "assertion_mapping":{
          "schema_name":"assertion_mapping",
          "schema_version":"1.0.0",
          "document_id":"doc_15_manual_adjustment_note_jrn_2026_06_1",
          "filename":"15_manual_adjustment_note_JRN-2026-06-117.txt",
          "framework_reference":"ISA 500 evidence readiness",
          "mapped_assertions":[],
          "overall_rationale":"Synthetic CLI fixture",
          "limitations":["Synthetic CLI fixture"]
        },
        "source_confidence":{
          "schema_name":"source_confidence",
          "schema_version":"1.0.0",
          "document_id":"doc_15_manual_adjustment_note_jrn_2026_06_1",
          "filename":"15_manual_adjustment_note_JRN-2026-06-117.txt",
          "source_confidence":"L2",
          "source_confidence_reason":"Company-uploaded evidence fixture.",
          "evidence_basis":["Company upload"],
          "upgrade_path":["Upload independent approval proof"],
          "caveats":["Not connector verified"]
        }
      }
    ]
  }' | jq
```

### Validate and hash

```bash
curl -s -X POST http://127.0.0.1:3000/api/agent/validate-hash \
  -H 'content-type: application/json' \
  -d '{
    "artifacts":[
      {
        "label":"sample-classification",
        "payload":{
          "schema_name":"evidence_classification",
          "schema_version":"1.0.0",
          "document_id":"doc_13_bank_statement_june_2026_pdf",
          "filename":"13_bank_statement_june_2026.pdf",
          "document_type":"bank_statement",
          "confidence":0.8,
          "rationale":"Smoke-test classification artifact.",
          "limitations":["Synthetic CLI fixture"],
          "assertions":[0,1,2,7],
          "assertion_labels":["Existence","Completeness","Valuation & Allocation","Accuracy"],
          "source_confidence":"L2",
          "source_confidence_reason":"Company-uploaded evidence fixture."
        }
      }
    ]
  }' | jq
```

## 4. Expected behavior

- `classify` should normalize document types like `Bank Statement` into `bank_statement`
- `negative-doc` should move toward `irrelevant_document` or otherwise low-evidence behavior
- `ingest-file` should show parser format plus a non-empty preview for text-based PDF/XLSX/DOCX/TXT files
- `draft-finding` should return a `ccer_finding` payload with `status = DRAFT`
- `validate-hash` should return a stable `sha256`
- `orchestrate` should return:
  - per-document results
  - one pack-level `gap_analysis`
  - one or more `findings`
  - one `audit_pack_summary`
  - a `proposed_action` that still requires human approval

## 5. Current limitations

- OCR for image-only files is not enabled yet
- Scanned PDFs with no extractable text may return a warning and a thin preview
- The orchestration smoke mode still uses a synthetic pack fixture by default, even though the single-file routes can now ingest real local files directly
