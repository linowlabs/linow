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

## 2026-06-14 — Harden Draft Finding Prompt Against Assertion Schema Failures

### Change
- Files touched:
  - `app/src/lib/agent/draft-finding.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Tightened the draft-finding prompt so `missing_assertions` must be returned as numeric assertion IDs and `missing_assertion_labels` must be copied exactly from the provided gap input.
  - Added a fallback so the finding prompt still includes document summaries even when the initial assertion-mapping filter yields no "relevant" documents.
  - Extracted a small document-summary helper to keep the prompt builder easier to read.

### Reasoning
- Why this approach was chosen:
  - The CLI smoke run failed before normalization because the provider rejected a schema-invalid generation, so the fix needed to happen at prompt construction time rather than only in post-processing.
  - Making the assertion arrays explicit and copy-only reduces one of the highest-risk schema fields without changing the overall CCCER contract.
  - Falling back to all provided document summaries keeps the drafting step resilient when earlier mapping output is sparse or synthetic.

### Tech Debt
- Known shortcuts:
  - The route still depends on provider-side structured output rather than a local repair pass when a response is close but invalid.
  - The prompt now biases the model to copy assertion arrays directly, which is correct for this workflow but less flexible for future finding taxonomies.
- Follow-up needed:
  - Re-run the `draft-finding` smoke test against a real provider session and capture whether the schema rejection is fully resolved.
  - Consider a secondary repair/retry path for other schema-heavy tools if provider-side strict JSON continues to be brittle under rate pressure.

## 2026-06-14 — Split Draft Finding Provider Schema From Canonical Output

### Change
- Files touched:
  - `app/src/lib/agent/draft-finding.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/app/api/agent/draft-finding/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Replaced the draft-finding route's direct use of the strict canonical `ccer_finding` schema with a provider-facing Groq schema that tolerates `missing_assertions` as either integers or strings.
  - Added a dedicated Groq response guard plus normalization helpers to coerce assertion IDs, deduplicate them, and fall back to the gap input when the provider returns unusable values.
  - Updated both the standalone draft-finding route and orchestration flow to validate against the provider-facing schema before normalizing into the canonical `CcerFindingOutput`.

### Reasoning
- Why this approach was chosen:
  - The failure was happening inside provider-side structured generation before our existing normalizer had any chance to repair the result.
  - Separating provider schema from canonical schema keeps the app contract strict while making the LLM integration boundary resilient to common JSON-output quirks.
  - This is a cleaner long-term pattern for other schema-heavy tools too: tolerate at the provider edge, normalize before the rest of the system touches the result.

### Tech Debt
- Known shortcuts:
  - The provider-facing schema is still Groq-specific in naming and lives in the same module as the canonical finding logic.
  - Assertion coercion currently handles integers and numeric strings, but not natural-language assertion phrases.
- Follow-up needed:
  - Re-run the smoke test to confirm this resolves the provider-side schema rejection in practice.
  - If other tools show the same pattern, extract a reusable provider-response normalization boundary shared across agent modules.

## 2026-06-14 — Loosen Provider Assertion Array Parsing For Draft Finding

### Change
- Files touched:
  - `app/src/lib/agent/draft-finding.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Simplified the Groq-facing `missing_assertions` schema from an `anyOf` with enum constraints to a plain `integer|string` item type so provider-side structured output has less room to fail before normalization.
  - Extended assertion-ID normalization to accept canonical labels such as `Rights & Obligations` in addition to integers and numeric strings.

### Reasoning
- Why this approach was chosen:
  - The remaining provider error was still coming from Groq's schema enforcement layer, so the provider contract needed to be even more permissive while keeping the internal output strict.
  - Accepting label text at the provider edge makes the normalization step more resilient to the exact failure mode we are seeing in smoke testing.

### Tech Debt
- Known shortcuts:
  - The provider schema is now intentionally looser than the canonical contract and depends on normalization for safety.
- Follow-up needed:
  - Re-run `npm run agent:smoke -- draft-finding` and confirm whether the next blocker, if any, has moved beyond `missing_assertions`.

## 2026-06-14 — Add Reusable Document Analysis Artifact Cache

### Change
- Files touched:
  - `.gitignore`
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/document-analysis-cache.ts`
  - `app/src/lib/agent/orchestration-contract.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `docs/CLI_AGENT_TESTING.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a file-backed document-analysis cache keyed by normalized document input, orchestration mode (`compact` vs `multi_pass`), cache version, and schema version.
  - Updated orchestration to read cached `classification + metadata + assertion_bundle` artifacts before calling the model, then persist live results back to cache for future runs.
  - Preserved the existing profile system, compact one-pass document analysis, and retry behavior while shifting the main efficiency strategy toward artifact reuse rather than provider-key rotation.
  - Exposed `analysis_source`, `cache_key`, and aggregate `cached_document_count` in orchestration results so cache reuse is visible during CLI or API testing.
  - Ignored `app/.cache/` and documented cache reuse in the CLI testing guide.

### Reasoning
- Why this approach was chosen:
  - The earlier efficiency changes reduced live token burn per run, but they still re-analyzed the same document on every repeat execution.
  - Reusing structured artifacts is closer to the original architecture goal: process evidence once, then build later reasoning steps on top of stable typed results.
  - Keeping `profile`, one-pass analysis, and retry means we retain the good operational wins while moving the core architecture back toward durable reuse.

### Tech Debt
- Known shortcuts:
  - The cache is currently local file-backed storage under `app/.cache/`, not yet backed by Walrus/MemWal or a shared production store.
  - Cache invalidation is version-based and input-based, but not yet aware of prompt micro-variants beyond the explicit cache version string.
- Follow-up needed:
  - Consider promoting approved cached artifacts into durable Walrus/MemWal-backed retrieval so reuse works across machines or deployments.
  - Add similar cache/reuse boundaries for pack-level `gap_analysis` and `draft_finding` once their invalidation rules are clearly defined.

## 2026-06-14 — Loosen One-Pass Document Analysis Provider Schema

### Change
- Files touched:
  - `app/src/lib/agent/analyze-document.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Replaced the one-pass Groq `documentAnalysisBundle` schema composition with a provider-facing schema that is still structured but less strict than the canonical nested schemas.
  - Kept the existing validation and normalization path intact so the app still accepts only canonical typed outputs after the provider response is parsed.

### Reasoning
- Why this approach was chosen:
  - The orchestration failure under the `cheap` profile was most likely happening at provider-side JSON validation inside the one-pass bundle, before our local normalizers could fix anything.
  - This follows the same proven pattern as the draft-finding fix: tolerate more at the provider edge, then normalize into strict internal contracts.

### Tech Debt
- Known shortcuts:
  - The provider-facing bundle schema is broader than the canonical nested schemas and still lives alongside the normalizer in one module.
- Follow-up needed:
  - Re-run orchestration to confirm the provider-side JSON validation error is resolved or identify the next strict field if Groq still rejects the bundle.

## 2026-06-14 — Fix Nested Object Strictness In Document Analysis Provider Schema

### Change
- Files touched:
  - `app/src/lib/agent/analyze-document.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added explicit nested object schemas with `additionalProperties: false` for `metadata.parties`, `metadata.key_dates`, `metadata.key_amounts`, `metadata.citations`, and `assertion_mapping.mapped_assertions` inside the Groq-facing one-pass document analysis schema.

### Reasoning
- Why this approach was chosen:
  - Groq rejected the request before generation because its JSON schema validator requires `additionalProperties: false` on every object item nested inside arrays.
  - Making the nested structures explicit keeps the one-pass bundle valid for provider-side structured output while preserving the later normalization boundary.

### Tech Debt
- Known shortcuts:
  - The provider-facing schema remains verbose because the nested object contracts are spelled out inline rather than shared through a small schema helper layer.
- Follow-up needed:
  - Re-run `npm run agent:smoke -- orchestrate` and capture the next failure point if Groq surfaces another provider-side schema rule.

## 2026-06-14 — Fallback Cheap Orchestration From One-Pass To Multi-Pass Analysis

### Change
- Files touched:
  - `app/src/lib/agent/groq.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added schema-name tagging to Groq HTTP error messages so provider failures identify which structured-output contract failed.
  - Added a recovery path in orchestration: when the `linow_agent_document_analysis_bundle` one-pass schema fails provider-side validation, the `cheap` profile now falls back to the safer multi-pass analysis flow instead of failing the whole pack immediately.

### Reasoning
- Why this approach was chosen:
  - The compact one-pass bundle is still the most token-efficient happy path, but provider-side schema brittleness should not block the whole demo or dev loop.
  - Falling back only for the compact bundle keeps the original efficiency goal while making orchestration robust enough to continue with the older, more proven multi-pass route when needed.

### Tech Debt
- Known shortcuts:
  - The fallback condition currently depends on matching known provider error strings for the compact bundle schema.
- Follow-up needed:
  - Observe whether orchestration now succeeds via fallback and decide later whether to keep iterating on the one-pass schema or treat multi-pass as the stable default for some providers.

## 2026-06-14 — Stop Forcing One-Pass Document Bundle On Groq

### Change
- Files touched:
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added an explicit Groq capability flag for `documentAnalysisBundle` and disabled it by default.
  - Updated orchestration so `cheap` and `balanced/full` profiles keep their other efficiency controls, but only use the one-pass document bundle when the active provider explicitly enables it.

### Reasoning
- Why this approach was chosen:
  - Groq's structured JSON path proved too brittle for the nested one-pass bundle, and repeatedly debugging provider-specific schema failures was getting in the way of a stable agent loop.
  - The original architecture goal is efficiency through reusable artifacts, not forcing every provider through the same bundled response shape.
  - This keeps the good parts of the recent work: cache reuse, compact prior-memory injection, limited findings, and retry/backoff, while falling back to the more reliable multi-pass flow for Groq.

### Tech Debt
- Known shortcuts:
  - Provider capability is still represented as a Groq-specific config flag rather than a fuller provider adapter abstraction.
- Follow-up needed:
  - When a future provider proves stable for bundled structured output, enable the capability there instead of reopening the orchestration core.

## 2026-06-14 — Add Contextual Chunk Retrieval For Assertion Mapping

### Change
- Files touched:
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/document-retrieval.ts`
  - `app/src/lib/agent/map-assertions.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a local chunking and contextual retrieval module that splits long document text into stable chunks, generates lightweight contextual summaries, scores chunks lexically against an assertion-mapping query, and returns the highest-signal excerpts.
  - Updated the assertion-mapping prompt to use retrieved evidence excerpts instead of sending the full raw document text every time.
  - Bumped the document-analysis cache version so future cached artifacts align with the new assertion-mapping prompt strategy.

### Reasoning
- Why this approach was chosen:
  - Assertion mapping was one of the heaviest repeated prompts in the multi-pass flow, so it was the best first target for retrieval-based token reduction.
  - This follows the intended architecture more closely than relying on provider-specific one-pass bundles: the model still works from document-derived evidence, but only the most relevant chunks are passed into the prompt.
  - The retrieval path is local and deterministic, so it reduces token cost without adding another model call or another vendor dependency.

### Tech Debt
- Known shortcuts:
  - The first version uses lexical retrieval and heuristic reranking rather than embeddings or a learned reranker.
  - Retrieval is currently applied only to assertion mapping, not yet to pack-level gap analysis or finding drafting.
- Follow-up needed:
  - Extend chunk retrieval to `gap_analysis` and `draft_finding` once we validate the signal quality on assertion mapping.
  - Consider persisting chunk manifests and retrieval traces into memory/proof artifacts if the demo needs explainable chunk provenance.

## 2026-06-14 — Expand Hybrid Retrieval Across Agent Tools

### Change
- Files touched:
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/document-retrieval.ts`
  - `app/src/lib/agent/extract-metadata.ts`
  - `app/src/lib/agent/analyze-gaps.ts`
  - `app/src/lib/agent/draft-finding.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Replaced the first lexical-only retrieval helper with a broader hybrid retrieval module that combines chunking, contextual summaries, lexical scoring, and local hashed-vector cosine scoring.
  - Applied retrieved evidence excerpts to `metadata_extraction`, `gap_analysis`, and `draft_finding`, while keeping canonical output schemas unchanged.
  - Wired orchestration to pass raw document text and context into pack-level tools so gap and finding prompts can retrieve evidence excerpts without replaying full document bodies.
  - Bumped the document-analysis cache version to align cached outputs with the new retrieval-driven prompt strategy.

### Reasoning
- Why this approach was chosen:
  - The rate-limit bottleneck had moved from assertion mapping into metadata extraction, so retrieval only at the assertion layer was no longer enough to materially reduce prompt volume.
  - A local hybrid scorer gives us denser relevance signals than lexical matching alone without introducing another provider dependency or another paid model call.
  - Gap analysis and finding drafting now receive compact coverage cards plus retrieved excerpts, which improves evidence precision while keeping the agent conservative about unresolved support.

### Tech Debt
- Known shortcuts:
  - The "embedding" path is a local hashed-vector approximation rather than a dedicated model embedding service.
  - Classification still reads the full document text and remains a likely next token hotspot on larger packs.
- Follow-up needed:
  - Measure prompt-token reduction and hit rate on the orchestration smoke path after live runs.
  - If retrieval quality is strong enough, consider adding chunk-manifest persistence for explainable Walrus/MemWal memory.

## 2026-06-15 — Trim Metadata Prompt Verbosity

### Change
- Files touched:
  - `app/src/lib/agent/extract-metadata.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Kept the same retrieved evidence chunks for metadata extraction, but removed extra prompt verbosity such as per-chunk contextual summaries and matched-term annotations.
  - Shortened the metadata extraction instruction wording while preserving the same conservative extraction behavior.

### Reasoning
- Why this approach was chosen:
  - The latest live bottleneck was still `metadata_extraction`, and we only needed a small additional reduction to get closer to the 8K TPM ceiling.
  - The model needs the evidence text itself for metadata extraction, not the retrieval scoring explanation, so trimming that framing is a low-risk way to save tokens without reducing analytical coverage.

### Tech Debt
- Known shortcuts:
  - This is still prompt-level optimization rather than a deeper classification-stage reduction.
- Follow-up needed:
  - Re-measure live metadata prompt usage after this trim.
  - If TPM remains too tight, the next target should be compacting classification while preserving first-pass document understanding.

## 2026-06-15 — Loosen Provider Boundary For Classification

### Change
- Files touched:
  - `app/src/lib/agent/classify.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Relaxed the Groq-facing classification schema so the provider is no longer required to emit every structured field before the response can reach Linow.
  - Kept Linow's internal classification contract strict by normalizing missing fields conservatively after the provider response is parsed.
  - Added conservative fallbacks for missing `assertion_labels`, `source_confidence`, and `source_confidence_reason`, including uploader-context-based source-confidence inference.

### Reasoning
- Why this approach was chosen:
  - The latest classification failure happened at the provider schema boundary, not in Linow's business logic, so the safest fix was to make the provider contract more tolerant while preserving strict internal outputs.
  - This follows the same pattern that stabilized draft finding: tolerate partial provider structure at the edge, then normalize into a clean canonical result inside the app.
  - Source confidence fallback remains conservative and does not overclaim verification.

### Tech Debt
- Known shortcuts:
  - Fallback source-confidence inference still relies on uploader-label heuristics when the model omits the field entirely.
- Follow-up needed:
  - Re-run classification and orchestration smoke tests to confirm the provider no longer fails on omitted structured fields.
  - If Groq still omits too many fields frequently, consider splitting the classification prompt into an even smaller provider-facing draft contract.

## 2026-06-15 — Make Classification Schema Groq-Strict Compatible

### Change
- Files touched:
  - `app/src/lib/agent/classify.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Updated the Groq-facing classification schema to use `required + nullable` fields instead of omitting keys from `required`.
  - Preserved conservative normalization by treating `null` provider values as missing fields inside Linow.

### Reasoning
- Why this approach was chosen:
  - Groq strict JSON schema rejected the previous relaxed schema because every property must also appear in `required`.
  - Using `null`-permitted fields keeps the schema valid for Groq while still letting Linow recover from partial structured outputs.

### Tech Debt
- Known shortcuts:
  - Provider fallback still depends on Groq returning a full object shape, even if some values are `null`.
- Follow-up needed:
  - Re-run orchestration to confirm the classification step now clears both schema validation layers: provider-side and Linow-side.

## 2026-06-15 — Add Groq TPM Budget Guard

### Change
- Files touched:
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/groq-rate-budget.ts`
  - `app/src/lib/agent/groq.ts`
  - `.env.example`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a process-local Groq TPM budget guard that tracks recent token usage in a rolling one-minute window and waits before sending the next request when the estimated budget would exceed the configured TPM limit.
  - Added a provider block timer so 429 retry delays also feed back into the scheduler.
  - Added configurable env knobs for TPM limit, window size, safety buffer, request token estimation, and completion reserve.

### Reasoning
- Why this approach was chosen:
  - The main failure mode had shifted from schema incompatibility to crossing Groq's 8K TPM window during multi-step orchestration.
  - Pacing requests is safer than shrinking evidence context because it preserves analytical coverage while reducing avoidable 429 failures.
  - Centralizing the budget guard in the Groq layer lets every tool benefit without scattering rate-limit logic across classification, metadata, gap, and finding code.

### Tech Debt
- Known shortcuts:
  - Request token estimation is heuristic and based on request-body size plus a completion reserve rather than a provider-native tokenizer.
  - The budget window is process-local, so it coordinates requests within one app process but not across multiple separate server processes.
- Follow-up needed:
  - Measure whether the default pacing is conservative enough to eliminate most 429s without adding too much idle wait.
  - If needed later, surface lightweight debug counters so we can observe how often the scheduler waits and how close requests come to the budget ceiling.

## 2026-06-15 — Loosen Provider Boundary For Gap Analysis

### Change
- Files touched:
  - `app/src/lib/agent/analyze-gaps.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Replaced the direct canonical `gapAnalysisSchema` at the Groq boundary with a provider-facing schema that keeps all top-level keys required but allows nullable and more permissive array item values.
  - Added normalization logic that reconstructs canonical assertion IDs, labels, gap severities, readiness score, recommendation fallbacks, and evidence/finding counts before returning Linow's strict internal `GapAnalysisOutput`.
  - Tightened the gap-analysis prompt to explicitly remind the model to return every top-level field and to stay conservative when evidence is partial.

### Reasoning
- Why this approach was chosen:
  - The provider was failing at structured JSON generation before Linow could validate or repair the result, similar to the earlier classification and draft-finding issues.
  - A tolerant provider-facing schema with strict internal normalization preserves the downstream audit contract while reducing brittle Groq-side failures.

### Tech Debt
- Known shortcuts:
  - Some normalized defaults, such as derived readiness score and fallback recommendations, are heuristic when the provider omits fields.
- Follow-up needed:
  - Re-run the orchestration smoke path to verify `gap_analysis` now clears provider validation.
  - If provider omissions remain frequent, consider further shrinking the gap prompt cards while preserving the same evidence coverage.

## 2026-06-15 — Simplify Gap Analysis Provider Schema

### Change
- Files touched:
  - `app/src/lib/agent/analyze-gaps.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Reduced the Groq-facing `gap_analysis` schema so the model now only has to return:
    - `covered_labels`
    - `missing_labels`
    - `readiness_score`
    - `recommendations`
    - `gaps` with label-based assertion links
  - Moved deterministic fields such as `pack_id`, `total_assertions`, `evidence_count`, `finding_count`, and assertion-ID reconstruction fully into Linow normalization logic.
  - Trimmed retrieved excerpt formatting in the gap-analysis prompt to lower structured-output burden without removing evidence content.

### Reasoning
- Why this approach was chosen:
  - Groq was still failing `gap_analysis` JSON validation even after a more tolerant schema, which suggested the output shape itself was still too heavy for reliable strict generation.
  - The model is better suited to reasoning in labels and narrative gaps than to reconstructing every deterministic numeric and ID field. Those deterministic fields are safer to rebuild locally.

### Tech Debt
- Known shortcuts:
  - When the model omits related assertion labels, Linow now infers assertion IDs from nearby text heuristically.
- Follow-up needed:
  - Re-run orchestration to confirm the simplified schema eliminates `gap_analysis` provider-validation failures.
  - If needed later, apply the same “provider-draft + local normalization” pattern to any remaining brittle structured-output steps.

## 2026-06-15 — Move Gap Analysis Off Strict Provider Schema

### Change
- Files touched:
  - `app/src/lib/agent/groq.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a `responseMode` option to the Groq completion helper so specific tools can request `json_object` instead of strict `json_schema`.
  - Added tolerant JSON parsing in the Groq helper to recover JSON from plain responses, fenced JSON blocks, or surrounding prose.
  - Switched `gap_analysis` to use `json_object` mode while keeping Linow-side validation and normalization unchanged.

### Reasoning
- Why this approach was chosen:
  - The remaining blocker was Groq provider-side validation itself, not Linow's internal schema or reasoning logic.
  - `gap_analysis` had become a good candidate for provider-tolerant JSON mode because we already normalize its result heavily on the app side.
  - This keeps strict canonical validation in Linow while avoiding repeated provider-side `json_validate_failed` failures.

### Tech Debt
- Known shortcuts:
  - `json_object` mode is less structurally enforced by the provider than strict schema mode, so Linow validation becomes the primary guardrail.
- Follow-up needed:
  - Re-run orchestration to confirm `gap_analysis` now clears provider generation.
  - If successful, consider whether other brittle pack-level steps should also use `json_object` mode selectively rather than globally.

## 2026-06-16 — Make Gap Analysis Draft Parsing Fully Tolerant

### Change
- Files touched:
  - `app/src/lib/agent/analyze-gaps.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Replaced the remaining shape-based `gap_analysis` draft validator with a broad envelope check that only requires the model to return a JSON object.
  - Added coercion helpers that sanitize optional strings, arrays, integers, and gap items before normalization.
  - Moved `gap_analysis` draft handling to a clearer three-stage flow:
    1. provider returns a loose JSON object
    2. Linow coerces it into a draft shape
    3. Linow normalizes it into canonical `GapAnalysisOutput`

### Reasoning
- Why this approach was chosen:
  - The recurring failure mode was no longer provider schema mode alone, but the repeated assumption that the model would preserve an exact draft shape across runs.
  - In practice, the model often returns near-correct JSON with omitted or malformed optional fields. Rejecting the whole result at the draft-validation layer caused repeated orchestration failures.
  - By making draft parsing tolerant and keeping strictness only at the final canonical output layer, the system becomes much more resilient without weakening downstream audit contracts.

### Tech Debt
- Known shortcuts:
  - Gap draft coercion still relies on label text for some assertion-ID reconstruction when the model omits structured links.
- Follow-up needed:
  - Re-run orchestration to confirm the recurrent `gap_analysis` draft-shape failure is eliminated.
  - If this pattern proves stable, consider applying the same coercion-first contract to other fragile provider-facing steps.
  - Guard against empty or weak `gap_analysis` drafts being normalized into false full-coverage results when no covered labels or mappable gap assertions are returned.
  - Align `readiness_score` fallback math with the final inferred covered/missing assertion sets so normalized outputs remain internally consistent.
  - Canonicalize provider-supplied assertion labels before hashing/output so label arrays always stay in sync with canonical assertion IDs.

## 2026-06-16 — Harden Gap Analysis Canonical Fallbacks

### Change
- Files touched:
  - `app/src/lib/agent/analyze-gaps.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Reworked `gap_analysis` normalization so final covered/missing assertions are resolved through one conservative helper instead of several loosely-coupled fallbacks.
  - Stopped deriving "covered" assertions from empty gap output alone, which could previously make malformed drafts look fully covered.
  - Added deterministic fallback coverage from existing per-document `assertion_mapping` artifacts when provider labels are absent.
  - Canonicalized final `covered_labels`, `missing_labels`, and gap `related_assertion_labels` from canonical assertion IDs instead of trusting provider label strings.
  - Aligned `readiness_score` fallback math with the final resolved covered/missing assertion sets.

### Reasoning
- Why this approach was chosen:
  - The tolerant provider boundary is still the right design, but the app-side normalization needed stronger guardrails so malformed draft output could not silently become overconfident audit output.
  - Reusing document assertion-mapping artifacts is more conservative and more trustworthy than inferring full coverage from the absence of gaps.
  - Canonical labels should be generated from canonical IDs so downstream hashing, UI display, and proof surfaces remain internally consistent.

### Tech Debt
- Known shortcuts:
  - Fallback coverage currently trusts existing `assertion_mapping` artifacts only; if those are absent, the result stays conservative rather than trying to recover more aggressively from classification output.
- Follow-up needed:
  - Re-run orchestration and confirm weak `gap_analysis` drafts now degrade safely instead of implying full coverage.
  - Fix the unrelated workspace TypeScript errors (`createBatchRegisterEvidenceFlow` export mismatch and an implicit `any` in `app/src/app/workspace/page.tsx`) before treating full repo `tsc --noEmit` as green again.

## 2026-06-16 — Synthesize Conservative Gap Items From Missing Assertions

### Change
- Files touched:
  - `app/src/lib/agent/analyze-gaps.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a conservative fallback that synthesizes minimal `gap_analysis.gaps` entries when the provider returns no concrete gaps but canonical normalization still resolves missing assertions.
  - The fallback now builds one gap per missing assertion using existing document artifacts, especially `assertion_mapping` items marked `not_supported`, plus matching limitations/caveats/notes from other document outputs.
  - Added assertion-specific suggested-evidence hints for common audit assertions such as Rights & Obligations, Classification, Cut-off, Accuracy, and Completeness.

### Reasoning
- Why this approach was chosen:
  - The smoke orchestrator proved that document-level tools (`classify`, `extract`, `map_assert`) could succeed while `gap_analysis` still returned an empty gap list, which left the pack summary contradictory: missing assertions existed but no gaps or findings could be drafted.
  - The orchestrator depends on `gap_analysis.gaps` to drive downstream finding drafting, so a conservative app-side fallback is safer than letting missing assertions disappear from the actionable flow.
  - Reusing existing document artifacts keeps the fallback deterministic and avoids adding new provider-schema burden.

### Tech Debt
- Known shortcuts:
  - Fallback gap narratives are intentionally generic and conservative; they are not a replacement for richer provider-authored gap rationales when those are available.
- Follow-up needed:
  - Re-run orchestration and confirm packs with missing assertions now also emit minimal actionable gaps and can reach `draft_finding`.

## 2026-06-16 — Make Draft Finding Provider Parsing Tolerant

### Change
- Files touched:
  - `app/src/lib/agent/draft-finding.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/app/api/agent/draft-finding/route.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Switched `ccer_finding` generation to provider-tolerant `json_object` mode in both the standalone route and orchestration flow.
  - Replaced the remaining strict provider-shape assumption with a coercion-first normalization path for draft findings.
  - Added a conservative fallback finding draft so malformed or partial provider output still normalizes into a stable internal `CcerFindingOutput`.
  - Compressed retrieved finding excerpts in the prompt by removing extra contextual wrapper lines that were inflating the response-validation burden.

### Reasoning
- Why this approach was chosen:
  - After gap fallback synthesis began producing actionable gaps again, the next brittle step shifted to `draft_finding`, where Groq was failing to complete a strict valid JSON document before hitting completion limits.
  - The same pattern that stabilized gap analysis applies here too: let the provider return a looser JSON object, then keep Linow strict at the normalization boundary.
  - Reducing prompt verbosity helps without dropping evidence content or weakening the audit-oriented output contract.

### Tech Debt
- Known shortcuts:
  - The fallback finding draft is intentionally conservative and may produce minimal citations when the provider omits them.
- Follow-up needed:
  - Re-run orchestration and confirm a pack with synthesized gaps can now reach at least one normalized draft finding without provider-side JSON failure.

## 2026-06-16 — Add Compact Orchestrate Response For Point-2 Verification

### Change
- Files touched:
  - `app/src/app/api/agent/orchestrate/route.ts`
  - `app/scripts/agent-cli-smoke.mjs`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added optional `response_mode: "compact_p2"` to the orchestrate API route.
  - Added CLI smoke mode `orchestrate-p2` that exercises the same synthetic orchestration payload as `orchestrate` but requests the compact response.
  - The compact response preserves the key fields needed to verify point 2:
    - `gap_analysis`
    - `findings`
    - `audit_pack_summary`
    - `flow`
    - `usage`
    - compact persistence proof status

### Reasoning
- Why this approach was chosen:
  - The full orchestrate response can succeed server-side but still fail client-side transport because the payload is large and the run is slow.
  - We need a deterministic way to verify gap/finding correctness without guessing from partial logs or shrinking the production response for everyone.
  - Keeping the compact mode opt-in preserves the full product/debug payload while giving us a reliable test harness for point-2 validation.

### Tech Debt
- Known shortcuts:
  - Compact mode is currently purpose-built for point-2 verification rather than a generalized response-shaping feature.
- Follow-up needed:
  - If this proves useful beyond debugging, consider formalizing response views (`full`, `compact`, `proof`) at the route contract level.

## 2026-06-16 — Strengthen Finding Citations And Evidence Linkage

### Change
- Files touched:
  - `app/src/lib/agent/draft-finding.ts`
  - `app/src/lib/agent/web3-persistence.ts`
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added deterministic fallback finding citations that reuse existing document metadata citations first, then synthesize a minimal document-backed citation only when the provider omits them.
  - Canonicalized `missing_assertion_labels` in finding outputs directly from final normalized assertion IDs instead of trusting provider text.
  - Stabilized Walrus manifest evidence-ref ordering and prepared Sui action candidate ordering so proof-oriented outputs are more deterministic across runs.
  - Fixed the workspace agent panel to read prepared action candidates from `persistence_result.sui.action_candidates`, which is the actual backend response shape.

### Reasoning
- Why this approach was chosen:
  - Empty finding citations make the audit output much less convincing even when the finding text itself is reasonable.
  - Reusing existing metadata citations keeps the fallback honest and traceable to real document artifacts rather than inventing unsupported references.
  - Deterministic ordering helps proof surfaces and hash-oriented review stay stable when the underlying meaning has not changed.
  - The UI should surface the proof/action linkage the backend already computes instead of silently dropping it at the parsing boundary.

### Tech Debt
- Known shortcuts:
  - Synthetic fallback citations are intentionally minimal and should still be treated as a safety net behind richer provider-generated citations.
- Follow-up needed:
  - Re-run full orchestration and confirm draft findings now contain citations consistently.
  - Re-test the workspace agent panel with registered evidence so linked action candidates and manifest linkage counts are visible end-to-end.

## 2026-06-16 — Clamp Gap Readiness to Canonical Evidence State

### Change
- Files touched:
  - `app/src/lib/agent/analyze-gaps.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Fixed assertion-label normalization so unknown provider labels no longer leak through as `undefined`/`null` assertion IDs.
  - Updated readiness scoring to derive the canonical score from final covered/missing assertions and gaps, then clamp any provider-supplied score to that derived ceiling.

### Reasoning
- Why this approach was chosen:
  - The prior run still showed `missing_assertions: [null]` and `missing_labels: ["Unknown (undefined)"]`, which meant the tolerant parsing path was still letting malformed provider labels contaminate canonical output.
  - Provider readiness can contain useful conservatism, but it should not be able to overstate audit readiness relative to Linow's final canonical evidence state.
  - Clamping the model score to the app-derived score keeps the result conservative and internally consistent without making the provider schema any stricter.

### Tech Debt
- Known shortcuts:
  - Gap summaries can still end up with zero explicit gap rows while recommendations remain populated if the provider returns advisory text but no structured gaps.
- Follow-up needed:
  - Re-run orchestration and confirm missing assertions now resolve to canonical IDs/labels rather than `null` placeholders.
  - Decide whether empty `gaps` plus non-empty recommendations should later synthesize a generic unresolved-gap item for better UX consistency.

## 2026-06-14 — Add Budget-Aware Agent Orchestration Profiles

### Change
- Files touched:
  - `.env.example`
  - `app/src/lib/agent/analyze-document.ts`
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/groq.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/lib/agent/orchestration-contract.ts`
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `app/scripts/agent-cli-smoke.mjs`
  - `docs/CLI_AGENT_TESTING.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added orchestration profiles (`cheap`, `balanced`, `full`) so the main agent flow can scale from Groq free-tier budgets to higher-budget paid runs without changing the external route shape.
  - Added a compact one-pass document-analysis bundle that combines classification, metadata extraction, assertion mapping, and source-confidence drafting into one Groq completion per document.
  - Added Groq multi-key failover and bounded retry handling for 429 responses using `GROQ_API_KEYS` in addition to the single-key path.
  - Pulled prior MemWal recall into orchestration and compacted recalled memory notes before injecting them into prompts to reduce token overhead.

### Reasoning
- Why this approach was chosen:
  - The prior orchestration path spent three model calls per document before pack-level gap/finding work, which is expensive under an 8K TPM ceiling.
  - Profile-driven orchestration keeps the free-tier path lean now while preserving a richer `full` path for later paid-model evaluations.
  - Rotating across multiple Groq keys is a pragmatic reliability improvement for demo environments where rate limits fail before model quality does.
  - Summarizing recalled memory instead of replaying raw MemWal JSON keeps Walrus-backed continuity useful without turning recall into another prompt-bloat source.

### Tech Debt
- Known shortcuts:
  - The compact document-analysis bundle still relies on one large prompt per document, so very long OCR-heavy files will still need pre-extraction or chunking if used later.
  - Multi-key Groq failover assumes the provided keys are valid and beneficially distributed; if they belong to the same capped org, the win may be limited.
  - Orchestration now recalls prior memory, but direct Walrus artifact reload is still not used as a structured fallback restore path.
- Follow-up needed:
  - Re-run the orchestration smoke path against live Groq credentials and compare `cheap` vs `balanced` usage totals on the same evidence pack.
  - Add a cache/reuse layer keyed by evidence commitment or document hash so already-analyzed documents can skip repeated LLM passes entirely.
  - Consider direct Walrus manifest restore for structured replay when MemWal is unavailable or when deterministic artifact reuse is preferred over semantic recall.

## 2026-06-17 — Add Workspace Agent Runner Contract For SO-23

### Change
- Files touched:
  - `app/src/lib/agent/orchestrate-response.ts`
  - `app/src/app/api/agent/orchestrate/route.ts`
  - `app/scripts/agent-cli-smoke.mjs`
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a dedicated `response_mode: "workspace"` contract for `/api/agent/orchestrate` so the workspace can consume a stable, smaller backend payload instead of parsing the full orchestration object directly.
  - Moved orchestrate response shaping into a new `orchestrate-response` helper to keep route logic modular and avoid duplicating compact response builders.
  - Included the A-side outputs needed by SO-23 in the workspace contract:
    - per-document analysis artifacts (`classification`, `source_confidence`, `metadata`, `assertion_mapping`)
    - `gap_analysis`
    - `findings`
    - `review_bundle`
    - approval-control output (`action_candidates`, `requires_human_approval`, `chain_write_ready`)
    - persistence and memory summary for Walrus and MemWal
  - Updated the workspace runner to request `response_mode: "workspace"` and preserve the new contract in `agentRun.raw` without changing the UI rendering layer owned by person B.
  - Added CLI smoke mode `orchestrate-workspace` to verify the SO-23 person-A contract independently of the browser UI.

### Reasoning
- Why this approach was chosen:
  - SO-23 is split between two people, and person A’s responsibility is to provide the analysis runner and output contract, not to build the rendering layer.
  - The workspace previously depended on the full orchestration payload shape, which was heavy and coupled the UI parser to low-level backend internals.
  - A dedicated workspace response mode gives person B a clearer, more stable contract for rendering classifications, source confidence, gaps, findings, and approval controls later.

### Tech Debt
- Known shortcuts:
  - The workspace still stores the response under `agentRun.raw`; no new dedicated frontend types or richer rendering components were introduced here because those belong to person B’s scope.
- Follow-up needed:
  - Run `npm run agent:smoke -- orchestrate-workspace` against the dev server and capture the resulting contract for handoff to person B.
  - When person B starts rendering, consider moving the ad hoc workspace parsing helpers into typed frontend adapters so the contract stays explicit on the UI side too.

## 2026-06-17 — Formalize Agent Memory Contract For SO-24 Person A

### Change
- Files touched:
  - `app/src/lib/agent/orchestration-contract.ts`
  - `app/src/lib/agent/agent-memory.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/lib/agent/orchestrate-response.ts`
  - `app/src/lib/agent/web3-persistence.ts`
  - `app/scripts/agent-cli-smoke.mjs`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added explicit A-side contracts for `agent_memory_payload` and `recall_summary` so orchestration no longer leaves the persisted/recalled memory shape implicit.
  - Replaced free-form recalled-memory note construction inside `orchestrate.ts` with a structured recall-summary builder that still feeds compact notes into prompts.
  - Wired orchestration output to include both the canonical memory payload and the canonical recall summary.
  - Updated the Walrus memory bundle to persist the explicit A-side contracts instead of reassembling ad hoc slices of orchestration output.
  - Added `response_mode: "memory"` plus CLI smoke mode `orchestrate-memory` to verify the SO-24 person-A contract without stepping into UI or persistence-availability ownership.

### Reasoning
- Why this approach was chosen:
  - SO-24 person A owns the content and structure of agent memory, not the app’s decision-making around when MemWal or Walrus should be invoked.
  - Making the memory payload and recall summary explicit reduces backend ambiguity for person B and keeps future persistence/reload flows from depending on loosely coupled orchestration internals.
  - Reusing the same structured recall summary for both prompt notes and response output keeps the implementation DRY while still protecting token budgets.

### Tech Debt
- Known shortcuts:
  - `created_at` values for the memory payload and Walrus manifest are generated independently, so they may differ slightly within the same orchestration run.
  - MemWal persistence still stores the broader orchestration result through the existing SDK boundary; this change formalizes the A-side contract without refactoring the B-side storage call.
- Follow-up needed:
  - Run `npm run agent:smoke -- orchestrate-memory` against the dev server and capture the response for handoff to person B.
  - If person B later needs a single shared timestamp across the payload, manifest, and Walrus artifact bundle, thread that value through from orchestration instead of generating it in separate layers.

## 2026-06-17 — Isolate SO-24 Memory Smoke From Draft Finding Failures

### Change
- Files touched:
  - `app/src/app/api/agent/orchestrate/route.ts`
  - `app/src/lib/agent/orchestrate-response.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Updated `response_mode: "memory"` so the SO-24 person-A smoke path skips `draft_finding`, matching its purpose as a memory-contract verifier rather than a full finding-generation test.
  - Added an explicit `skipped_draft_finding` marker to the compact memory response.

### Reasoning
- Why this approach was chosen:
  - The SO-24 person-A smoke should verify the canonical memory and recall contracts without being blocked by unrelated provider fragility in `ccer_finding`.
  - Full orchestration behavior remains unchanged; only the dedicated memory smoke harness is isolated.

### Tech Debt
- Known shortcuts:
  - The memory smoke now verifies the persistence-ready contract with zero drafted findings in this mode, so finding generation still needs to be validated through the full orchestration or point-1 flows.
- Follow-up needed:
  - Re-run `npm run agent:smoke -- orchestrate-memory` and confirm the compact response returns the expected recall and memory payload fields.

## 2026-06-20 — Add Gemini Demo Provider Path

### Change
- Files touched:
  - `.env.example`
  - `app/src/app/api/agent/classify/route.ts`
  - `app/src/app/api/agent/extract-metadata/route.ts`
  - `app/src/app/api/agent/map-assertions/route.ts`
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `app/src/app/api/agent/draft-finding/route.ts`
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/document-analysis-cache.ts`
  - `app/src/lib/agent/evidence-attachments.ts`
  - `app/src/lib/agent/gemini.ts`
  - `app/src/lib/agent/gemini-rate-budget.ts`
  - `app/src/lib/agent/groq.ts`
  - `app/src/lib/agent/ingest.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `app/src/lib/agent/orchestration-contract.ts`
  - `app/src/lib/agent/provider.ts`
  - `app/src/lib/agent/provider-types.ts`
  - `docs/CLI_AGENT_TESTING.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added a modular agent provider layer with `groq` and `gemini` as selectable providers via `AGENT_PROVIDER` or request-level `provider`.
  - Added a Gemini REST JSON runner, Gemini token-budget pacing, and provider-neutral completion types while keeping the existing Groq path intact.
  - Wired classification, metadata extraction, assertion mapping, gap analysis, draft finding, and full orchestration through the provider-neutral runner.
  - Enabled Gemini compact document-analysis bundles by default so demo runs can classify, extract metadata, map assertions, and assign source confidence in one model call per evidence item.
  - Added Gemini evidence attachments for scanned/weak-extraction PDFs and image evidence, while keeping XLSX/XLS local table extraction for deterministic spreadsheet handling.
  - Made document-analysis cache keys provider-aware to avoid reusing Groq artifacts during Gemini demo runs.

### Reasoning
- Why this approach was chosen:
  - The Groq implementation already contains useful prompts, validators, hashing, and human-review boundaries, so adding a provider abstraction preserves that work instead of replacing the agent stack.
  - Gemini is the better demo provider for core evidence reasoning because the larger token budget and native PDF/image understanding reduce the current Groq free-tier TPM pain.
  - Provider-level selection keeps latency predictable: a run uses Gemini or Groq, not both, unless a caller explicitly changes providers between requests.

### Tech Debt
- Known shortcuts:
  - Gemini PDF file reuse currently uses inline attachments, not the Gemini Files API, so large repeated PDFs may still pay upload bandwidth per request.
  - The Gemini structured-output request includes a fallback body shape, but real key/model validation still needs to be tested against the configured AI Studio project.
  - Image OCR is available only through Gemini attachments; Groq remains text-only in this path.
- Follow-up needed:
  - Run `npm run agent:smoke -- orchestrate-files ...` with `AGENT_PROVIDER=gemini` and a real Gemini key.
  - Consider adding Gemini Files API caching for larger PDF packs if repeated demo runs become slow.
  - Add UI/provider status copy so demo users understand that Gemini mode sends plaintext synthetic evidence to Google for MVP purposes.

## 2026-06-20 — Add ISA Q2 Engagement Smoke Mode

### Change
- Files touched:
  - `app/scripts/agent-cli-smoke.mjs`
  - `docs/CLI_AGENT_TESTING.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added `npm run agent:smoke -- isa-q2-engagement` to auto-discover supported evidence files under `demo/isa_q2_engagement/evidence_initial`.
  - Added an optional `after` argument to scan `demo/isa_q2_engagement/evidence_remediation`.
  - Added env controls for `ISA_Q2_PACK_ROOT`, `ISA_Q2_MAX_DOCS`, `ISA_Q2_PROFILE`, and `ISA_Q2_RESPONSE_MODE`.
  - Set the default discovery cap to 24 documents so the richer `demo/PBC_list` pack can include the full initial evidence story.
  - Kept `pack_id` stable across before/after remediation smoke runs, with optional override through `ISA_Q2_PACK_ID`, so recall/persistence can connect both stages.
  - Kept the smoke path provider-aware, defaulting request-level provider to `AGENT_PROVIDER` or Gemini.

### Reasoning
- Why this approach was chosen:
  - The demo pack should be easy to run without manually listing many evidence paths during judging prep.
  - Auto-discovery keeps the smoke runner useful as the pack contents change, while the document cap protects free-tier demo runs from accidental oversized batches.
  - The mode uses the existing orchestration route so it exercises the same agent boundary: agent proposes, human reviews, no autonomous chain write.

### Tech Debt
- Known shortcuts:
  - Discovery is filename/extension based and does not yet read a formal engagement manifest.
  - The current workspace checkout has the ISA Q2 folders but no discovered evidence files under `evidence_initial`, so the smoke currently exits before calling the server.
- Follow-up needed:
  - Add or restore the ISA Q2 evidence files, then run `npm run agent:smoke -- isa-q2-engagement` with the local app server running and `GEMINI_API_KEY` configured.

## 2026-06-20 — Sanitize Gemini Response Schemas

### Change
- Files touched:
  - `app/src/lib/agent/gemini.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Updated Gemini schema normalization to strip OpenAI/Groq-oriented JSON Schema fields that Gemini rejects, including `additionalProperties`.
  - Converted simple nullable union types such as `["string", "null"]` into Gemini-style `nullable: true` plus a single concrete type.
  - Added conservative handling for multi-type fields by choosing a supported concrete type while keeping local runtime validators as the final contract gate.

### Reasoning
- Why this approach was chosen:
  - The PBC smoke reached the app server but Gemini rejected the request before model execution because the response schema still included unsupported JSON Schema keywords.
  - Keeping a sanitized Gemini schema preserves structured-output guidance while the existing validators continue protecting Linow artifact contracts.

### Tech Debt
- Known shortcuts:
  - Gemini still receives a reduced subset of the full schema rather than every strict JSON Schema constraint used by Groq.
  - End-to-end validation needs to be rerun from the user's active dev server with a real Gemini key.
- Follow-up needed:
  - Re-run `ISA_Q2_PACK_ROOT=demo/PBC_list ISA_Q2_MAX_DOCS=1 npm --prefix app run agent:smoke -- isa-q2-engagement` and inspect the next provider response.

## 2026-06-20 — Relax Gemini Compact Bundle Draft Normalization

### Change
- Files touched:
  - `app/src/lib/agent/analyze-document.ts`
  - `app/src/lib/agent/extract-metadata.ts`
  - `app/src/lib/agent/map-assertions.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Relaxed compact document-analysis bundle validation so Gemini draft output can omit provider-fillable fields like `document_id` and `filename`.
  - Hardened metadata normalization to fill canonical schema fields, default missing arrays, normalize citations to the current document, and coerce simple amount/confidence shapes.
  - Hardened assertion/source-confidence normalization to canonicalize assertion IDs, labels, coverage, source confidence levels, and missing rationale/array fields.

### Reasoning
- Why this approach was chosen:
  - The Gemini compact bundle request was accepted, but the returned JSON failed Linow's pre-normalization validator.
  - Fields such as `document_id`, `filename`, and canonical schema metadata should be controlled by Linow, not trusted from the model, so accepting a looser draft and producing a strict normalized artifact is safer and more provider-portable.

### Tech Debt
- Known shortcuts:
  - The compact bundle path now accepts looser provider drafts than the single-tool routes, relying on normalization plus downstream artifact validation.
  - Some malformed optional model details are dropped rather than surfaced as warnings in the response.
- Follow-up needed:
  - Re-run the PBC smoke with `ISA_Q2_MAX_DOCS=3`; if another validator fails, add a targeted diagnostic or normalizer for that artifact type.

## 2026-06-20 — Increase Gemini Request Timeout For PBC Evidence

### Change
- Files touched:
  - `.env.example`
  - `app/src/lib/agent/config.ts`
  - `app/src/lib/agent/gemini.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Increased the default Gemini request timeout from 45 seconds to 120 seconds for heavier PDF/XLSX evidence analysis.
  - Added `GEMINI_REQUEST_TIMEOUT_MS` so local demo runs can tune provider timeout without code changes.
  - Wrapped Gemini fetch failures with schema/model context so future timeout errors identify the agent step more clearly.

### Reasoning
- Why this approach was chosen:
  - The PBC smoke reached Gemini and then failed after roughly 88 seconds because sequential document analysis plus a 45-second provider timeout was too aggressive for the first XLSX/PDF-heavy batch.
  - Longer provider timeouts are acceptable for local demo smoke runs because the bottleneck is model/document processing, not Next.js routing.

### Tech Debt
- Known shortcuts:
  - Orchestration is still sequential, so a full 22-document PBC run can take several minutes even with a higher timeout.
- Follow-up needed:
  - Add bounded concurrency for per-document Gemini compact analysis once provider behavior is stable.

## 2026-06-20 — Add Agent Progress Logs For Smoke Runs

### Change
- Files touched:
  - `app/src/lib/agent/orchestrate.ts`
  - `app/scripts/agent-cli-smoke.mjs`
  - `docs/CLI_AGENT_TESTING.md`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added `[linow-agent]` progress logs while orchestration reads evidence, analyzes each document, runs gap analysis, drafts findings, and builds summaries.
  - Added `AGENT_PROGRESS_LOGS=off` to silence server progress logs when needed.
  - Added an explicit smoke client timeout with `AGENT_SMOKE_TIMEOUT_MS`, defaulting to 10 minutes for heavier Gemini document runs.
  - Changed the ISA Q2/PBC smoke default `response_mode` to `compact_p2` so debugging skips finding drafting unless explicitly requested.

### Reasoning
- Why this approach was chosen:
  - The PBC smoke can take minutes because document analysis is sequential and Gemini may spend significant time on XLSX/PDF evidence.
  - Progress logs make long-running local demo runs observable without introducing SSE or a streaming API yet.
  - Skipping finding drafting by default keeps early smoke tests focused on ingestion, document analysis, and gap analysis before the full workspace response is exercised.

### Tech Debt
- Known shortcuts:
  - Progress logs are server-console logs, not streamed back to the CLI or UI.
  - Per-document Gemini analysis is still sequential.
- Follow-up needed:
  - Add bounded concurrency for document analysis and a proper event stream if the UI needs live progress.

## 2026-06-20 — Add Timed Agent Progress Diagnostics

### Change
- Files touched:
  - `app/src/app/api/agent/orchestrate/route.ts`
  - `app/src/lib/agent/orchestrate.ts`
  - `docs/DEVLOG-AGENT.md`
- Summary:
  - Added `step_ms` and `total_ms` timing fields to orchestration progress logs.
  - Added ingestion duration logging for each resolved evidence file.
  - Added logs after audit-pack summary hashing, review/persistence-plan building, web3 persistence preparation, and API response shaping.

### Reasoning
- Why this approach was chosen:
  - The PBC smoke appeared to stop at summary/hash logging, but the route may still be spending time in persistence preparation or response shaping.
  - Timed progress diagnostics make it easier to separate slow model calls, hashing, persistence fallback, and response serialization before introducing a streaming progress API.

### Tech Debt
- Known shortcuts:
  - Timings are console diagnostics only and are not returned to the CLI response.
- Follow-up needed:
  - Use the timed logs from the next PBC run to decide whether to optimize gap analysis, persistence, response size, or document-analysis concurrency first.
