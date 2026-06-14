## 2026-06-12 — Groq Cheap-Mode Agent Foundation

### Change
- Files touched:
  - `.env.example`
  - `app/src/lib/agent/classify.ts`
  - `app/src/lib/agent/groq.ts`
  - `app/src/app/api/agent/classify/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a minimal server-side agent setup for cheap-mode experimentation with Groq.
  - Defined a strict JSON schema for audit evidence classification outputs.
  - Added a `POST /api/agent/classify` route that accepts document text and returns structured, unsigned agent proposals only.

### Reasoning
- Why this approach was chosen:
  - The current repo is already TypeScript-first, so a thin Next.js route keeps the setup small and avoids introducing a Python service too early.
  - Groq's OpenAI-compatible chat completions plus strict JSON schema mode provide a low-cost way to get deterministic structured outputs.
  - The route is intentionally scoped to classification and recommendations so it stays inside Linow's agent boundaries and does not encroach on signing or transaction submission.

### Tech Debt
- Known shortcuts:
  - No UI has been wired to the new agent route yet.
  - The current route works on extracted text input and does not yet handle file parsing, OCR, or persistent memory.
- Follow-up needed:
  - Add richer agent tools for metadata extraction, assertion mapping, and gap analysis.
  - Connect approved outputs to hashing, Walrus memory storage, and later Sui `AgentAction` logging.

## 2026-06-12 — Complete SO-06 Versioned Agent Schemas

### Change
- Files touched:
  - `app/src/lib/agent/schemas.ts`
  - `app/src/lib/agent/classify.ts`
  - `app/src/lib/agent/groq.ts`
  - `docs/AGENT_SCHEMAS.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Defined the full versioned output schema set for Sui Overflow agent artifacts.
  - Added runtime validators and canonical assertion metadata for classification, metadata extraction, assertion mapping, source confidence, C-C-C-E-R findings, gap analysis, and audit pack summaries.
  - Tightened the classification route to use the new official `evidence_classification` schema instead of a mixed proto-schema.

### Reasoning
- Why this approach was chosen:
  - `SO-06` is a contract-design task, so the most useful deliverable is one central module that future tools can import for validation and hashing.
  - Splitting gap analysis and findings out of classification makes the agent pipeline cleaner and lines up with the orchestration in `MASTER_SUI.md`.
  - Keeping schema version and schema name inside every artifact gives us a stable handle for later Walrus storage and chain logging.

### Tech Debt
- Known shortcuts:
  - Only the classification route actively uses the new schemas today.
  - The metadata, mapping, finding, gap, and pack summary schemas do not yet have dedicated routes or UI surfaces.
- Follow-up needed:
  - Add route handlers and tool prompts for the remaining schema types.
  - Hash validated artifacts before any Walrus or Sui persistence step in `SO-19`.

## 2026-06-12 — Build SO-14 to SO-17 Agent Tool Chain

### Change
- Files touched:
  - `app/src/lib/agent/common.ts`
  - `app/src/lib/agent/classify.ts`
  - `app/src/lib/agent/extract-metadata.ts`
  - `app/src/lib/agent/map-assertions.ts`
  - `app/src/lib/agent/analyze-gaps.ts`
  - `app/src/lib/agent/groq.ts`
  - `app/src/lib/agent/harness.ts`
  - `app/src/app/api/agent/classify/route.ts`
  - `app/src/app/api/agent/extract-metadata/route.ts`
  - `app/src/app/api/agent/map-assertions/route.ts`
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `app/src/app/api/agent/harness/isa-q2/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Built clean, schema-backed tool modules for classification, metadata extraction, assertion/source-confidence mapping, and pack-level gap analysis.
  - Added a shared Groq JSON runner so each tool can reuse the same strict schema path.
  - Added an ISA Q2 harness evaluator route that compares candidate outputs against the demo pack oracle files.

### Reasoning
- Why this approach was chosen:
  - The tasks from SO-14 to SO-17 are easier to maintain and test when each tool has its own module and route rather than one oversized prompt surface.
  - The harness route gives the demo pack a direct evaluation hook, which helps us iterate without relying on gut feel.
  - Shared input parsing keeps the tools aligned with Linow's guardrails and avoids inconsistent validation across routes.

### Tech Debt
- Known shortcuts:
  - The harness currently evaluates classification coverage, source-confidence guardrails, and gap titles, not full semantic parity.
  - There is still no UI surface for the new routes yet.
- Follow-up needed:
  - Add C-C-C-E-R finding generation on top of the same tool runner for SO-18.
  - Build orchestration and UI integration once the tool responses are stable.

## 2026-06-12 — Harden Agent Routes And Remove More Hardcoding

### Change
- Files touched:
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/http.ts`
  - `app/src/lib/agent/common.ts`
  - `app/src/lib/agent/groq.ts`
  - `app/src/lib/agent/analyze-gaps.ts`
  - `app/src/lib/agent/harness.ts`
  - `app/src/app/api/agent/classify/route.ts`
  - `app/src/app/api/agent/extract-metadata/route.ts`
  - `app/src/app/api/agent/map-assertions/route.ts`
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `app/src/app/api/agent/harness/isa-q2/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Centralized Groq, schema-name, limit, and harness-pack configuration.
  - Added shared JSON request parsing and error response helpers for all agent routes.
  - Hardened gap-analysis input validation and moved harness expected-file paths behind a pack registry instead of hardcoded inline paths.

### Reasoning
- Why this approach was chosen:
  - The first working version was fine for momentum, but it still repeated route plumbing and mixed configuration with business logic.
  - A small config and HTTP helper layer reduces hardcoded literals without over-abstracting the hackathon codebase.
  - Stricter nested validation improves safety before the outputs are later hashed or persisted.

### Tech Debt
- Known shortcuts:
  - The harness route is still pack-specific at the API path level even though the underlying loader now supports a pack registry.
  - We still trust schema-valid arrays passed into the harness route without a full deep parse because this endpoint is internal evaluation glue.
- Follow-up needed:
  - Add a generic harness route once more than one engagement pack is actively used.
  - Add request-level authentication or internal-only gating if these agent routes are exposed beyond local development.

## 2026-06-12 — Normalize Classification Taxonomy And Add Assertion Calibration

### Change
- Files touched:
  - `app/src/lib/agent/document-taxonomy.ts`
  - `app/src/lib/agent/classify.ts`
  - `app/src/lib/agent/harness.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a shared document taxonomy module with canonical `document_type` values, aliases, filename hints, and baseline assertion guidance.
  - Updated the classification prompt to steer the model toward Linow's lowercase snake_case document vocabulary.
  - Normalized model-produced document types before returning them from the API and added a narrow assertion calibration pass for bank statements and bank transaction exports.
  - Hardened the harness classification check so it compares normalized document types instead of raw surface wording.

### Reasoning
- Why this approach was chosen:
  - The biggest quality gap in current classification was not model availability, but inconsistency between natural-language labels like `Bank Statement` and pack/oracle values like `bank_statement`.
  - A shared taxonomy keeps the system stable across API responses, harness checks, and future orchestration without forcing every prompt to solve naming perfectly.
  - The assertion calibration stays intentionally narrow so we improve expected bank evidence behavior without over-automating domain conclusions.

### Tech Debt
- Known shortcuts:
  - Assertion calibration is still heuristic and currently targeted only at high-confidence cash evidence types.
  - The taxonomy catalog is hand-maintained and not yet derived from engagement-pack manifests.
- Follow-up needed:
  - Extend harness checks to compare expected primary assertions once the taxonomy stabilizes across more files.
  - Consider exposing canonical document types in docs or UI copy so developers can reason about the vocabulary without opening source files.

## 2026-06-12 — Build SO-18 to SO-20 Finding, Hashing, And Orchestration Flow

### Change
- Files touched:
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/draft-finding.ts`
  - `app/src/lib/agent/artifacts.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/app/api/agent/draft-finding/route.ts`
  - `app/src/app/api/agent/validate-hash/route.ts`
  - `app/src/app/api/agent/orchestrate/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a C-C-C-E-R finding tool and route that turns a gap plus supporting document summaries into a structured draft finding with citations.
  - Added deterministic agent artifact validation and SHA-256 hashing helpers so schema-valid outputs can be hashed before later Walrus storage or Sui logging.
  - Added a one-click orchestration flow that runs classification, metadata extraction, assertion mapping, gap analysis, draft finding generation, and local audit pack summary creation in one pass.
  - Kept the final orchestration output behind a human review gate by returning a `review_agent_outputs` proposed action instead of any signed or submitted transaction behavior.

### Reasoning
- Why this approach was chosen:
  - SO-18, SO-19, and SO-20 naturally stack on top of the existing toolchain, so the safest path was to compose the tools we already trust rather than invent a separate orchestration runtime.
  - Hashing is implemented locally and deterministically so the same approved artifact can later be reused for Walrus manifests and on-chain AgentAction logs.
  - The orchestration route stays inside Linow's boundary: the agent analyzes and proposes, while any persistence or chain action still waits for explicit human approval.

### Tech Debt
- Known shortcuts:
  - The orchestration flow is currently sequential, which is cheaper to reason about but not optimized for latency.
  - Audit pack summary text is generated locally from downstream outputs rather than through a dedicated summarization model pass.
  - Finding generation is limited by the configured maximum findings per pack and assumes the gap-analysis order is already meaningful enough for drafting.
- Follow-up needed:
  - Add CLI or script-level smoke runners so the full orchestration route can be replayed against a stable demo pack with less manual JSON assembly.
  - Connect approved artifact hashes to Walrus memory manifests and Sui AgentAction logging once SO-24 and SO-25 are wired.

## 2026-06-12 — Add CLI Smoke Runner For Agent Routes

### Change
- Files touched:
  - `app/package.json`
  - `app/scripts/agent-cli-smoke.mjs`
  - `docs/CLI_AGENT_TESTING.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added `npm run agent:smoke -- <mode>` for CLI-first testing of the agent routes without a UI.
  - Added smoke modes for single-document analysis, negative classification, draft finding, artifact hashing, and full orchestration.
  - Documented direct usage and curl examples in a dedicated CLI testing guide.

### Reasoning
- Why this approach was chosen:
  - The user needs a low-friction way to exercise the new routes from the terminal before UI integration and before building a full ingestion pipeline for the engagement pack files.
  - A payload-driven smoke runner is enough to validate agent behavior and demo logic right now without introducing OCR or spreadsheet parsing complexity.

### Tech Debt
- Known shortcuts:
  - The smoke runner uses synthetic sample payloads aligned to `isa_q2_engagement` rather than extracting text from the real pack files.
  - The runner assumes the local Next.js dev server is already running.
- Follow-up needed:
  - Add file-based ingestion helpers once we decide how to handle PDF/XLSX extraction in cheap mode.
  - Consider a pack manifest of pre-extracted snippets if we want repeatable CLI tests without full OCR/parsing.

## 2026-06-12 — Add Multi-Format Evidence Ingestion For Agent Routes

### Change
- Files touched:
  - `app/package.json`
  - `app/package-lock.json`
  - `app/next.config.ts`
  - `app/src/lib/agent/common.ts`
  - `app/src/lib/agent/ingest.ts`
  - `app/src/lib/agent/map-assertions.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/app/api/agent/classify/route.ts`
  - `app/src/app/api/agent/extract-metadata/route.ts`
  - `app/src/app/api/agent/map-assertions/route.ts`
  - `app/src/app/api/agent/orchestrate/route.ts`
  - `app/src/app/api/agent/ingest/route.ts`
  - `app/scripts/agent-cli-smoke.mjs`
  - `docs/CLI_AGENT_TESTING.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a shared evidence-ingestion module that reads plain text formats, PDF, XLSX/XLS/XLSM/XLSB, and DOCX files from local paths.
  - Added async document-resolution helpers so agent routes can accept `filePath` instead of requiring raw `documentText`.
  - Added an `/api/agent/ingest` route for parser-level verification and updated the CLI smoke runner to support real-file ingestion and classification by path.
  - Marked heavy parser packages as server externals in Next.js so the server routes can use them reliably.

### Reasoning
- Why this approach was chosen:
  - The agent needs to work on realistic audit evidence formats like PDFs and spreadsheets, not just pre-extracted text fixtures.
  - A shared ingestion layer keeps parsing concerns separate from classification, extraction, mapping, and orchestration logic.
  - Exposing ingestion as its own route makes debugging calmer: we can tell the difference between a parser problem and an LLM analysis problem immediately.
  - Lazy-loading the PDF parser avoids breaking non-PDF routes during server module evaluation.

### Tech Debt
- Known shortcuts:
  - OCR for image-only files is still not enabled.
  - Scanned PDFs may produce low or empty text output if they have no embedded text layer.
  - Local file-path access is intentionally constrained to the repository workspace and temp directories instead of arbitrary filesystem access.
- Follow-up needed:
  - Add OCR or pre-processing for image-heavy evidence if the demo pack later includes scans or screenshots as first-class evidence.
  - Consider a stable pre-extracted text manifest for the engagement pack so orchestration tests stay reproducible across environments.

## 2026-06-12 — Add Real-File Orchestration Smoke Mode

### Change
- Files touched:
  - `app/scripts/agent-cli-smoke.mjs`
  - `docs/CLI_AGENT_TESTING.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added `orchestrate-files` mode to the CLI smoke runner so orchestration can ingest a list of real file paths instead of relying only on synthetic sample payloads.
  - Documented example commands for direct orchestration against engagement-pack file paths.

### Reasoning
- Why this approach was chosen:
  - The user wants to test the orchestration flow against real evidence files from the demo pack, not just text fixtures.
  - Accepting file paths in the smoke runner keeps the workflow simple while reusing the new ingestion layer already wired into the agent routes.

### Tech Debt
- Known shortcuts:
  - The runner still depends on the local dev server already being up.
  - The script assumes a shared engagement context for all listed files instead of reading context from a manifest.
- Follow-up needed:
  - Optionally add a manifest-driven pack mode that reads engagement metadata and a default file list from the demo pack itself.

## 2026-06-13 — Refine Agent Orchestration Output Contract

### Change
- Files touched:
  - `app/src/lib/agent/orchestration-contract.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Extracted the orchestration response contract into a dedicated `orchestration-contract.ts` module so execution logic and response shape are no longer mixed in one file.
  - Added explicit `artifact_catalog`, `review_bundle`, and `persistence` sections to the orchestration result while preserving the existing top-level fields (`documents`, `gap_analysis`, `findings`, `audit_pack_summary`, `hashes`, `proposed_action`) for compatibility with the current route and demo path.
  - Introduced an artifact collector helper that records each hash together with the action type and target scope (`document`, `pack`, `finding`), making later Walrus/Sui wiring more deterministic.
  - Replaced repeated document-note lookups with a small lookup map helper to keep orchestration assembly cleaner and easier to extend.

### Reasoning
- Why this approach was chosen:
  - The next Web3 step needs a cleaner machine-readable contract than a single flat `hashes` array, especially for deciding what gets persisted to Walrus/MemWal and what gets logged to Sui `AgentAction`.
  - Pulling the contract into its own module keeps the core orchestrator focused on sequencing agent tools rather than also defining every response detail inline.
  - Preserving the old fields protects the hackathon demo path while giving us a cleaner contract to build on incrementally.

### Tech Debt
- Known shortcuts:
  - `proposed_action` is still returned as a compatibility alias to `review_bundle`; we can remove the duplication once downstream consumers switch to the new field.
  - The new `persistence` section prepares memory-manifest metadata but does not yet build or upload the actual Walrus manifest.
- Follow-up needed:
  - Wire `artifact_catalog` and `persistence.memory_namespace` into the next Web3 integration step for MemWal/Walrus persistence.
  - Add a small orchestration response fixture or smoke assertion once we decide where to keep contract-level agent tests.

## 2026-06-13 — Integrate Agent Orchestration With MemWal And Walrus Persistence

### Change
- Files touched:
  - `.env.example`
  - `app/src/lib/agent/orchestration-contract.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/lib/agent/web3-persistence.ts`
  - `app/src/app/api/agent/orchestrate/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Extended the orchestration contract to carry optional document-level proof references (`evidence_id`, `walrus_blob_id`, `commitment`) plus optional pack owner and auditor addresses.
  - Added a dedicated `web3-persistence.ts` helper that builds a `WalrusMemoryManifest`, attempts MemWal storage, uploads an encrypted Walrus manifest plus encrypted agent-memory bundle when a server key is configured, and prepares unsigned Sui `AgentAction` candidates for human review.
  - Updated the orchestration route to return a `persistence_result` payload instead of doing an inline MemWal-only side effect with dummy credentials.
  - Added `LINOW_AGENT_MEMORY_ENCRYPTION_KEY` to `.env.example` for private Walrus fallback.

### Reasoning
- Why this approach was chosen:
  - The Web3 logic now lives behind one small boundary instead of spreading MemWal and Walrus details inside the route handler.
  - Optional proof references let the agent preserve evidence linkage when upstream registration data already exists, without breaking the current cheap-mode orchestration path.
  - Returning structured persistence and Sui-preparation status makes the demo story clearer: the agent can persist private memory and prepare chain-proof candidates while still respecting "agent proposes, human signs, chain proves."

### Tech Debt
- Known shortcuts:
  - The Walrus fallback currently uploads a single encrypted manifest and one encrypted memory bundle, not a fully segmented artifact set.
  - Pack owner and auditor addresses are optional inputs today, so the manifest may still carry a placeholder owner when wallet context is missing.
  - The route prepares `AgentAction` candidates but does not yet submit them through a dedicated approval/signing flow.
- Follow-up needed:
  - Feed real `evidence_id/blob_id/commitment` values from the workspace upload/register flow so the manifest is fully linked.
  - Add a reviewed-action route or UI approval step that turns prepared `action_candidates` into real Sui `AgentAction` writes.
  - Decide whether Walrus reload should restore the encrypted memory bundle directly when MemWal is unavailable, completing the SO-24 fallback path end-to-end.
