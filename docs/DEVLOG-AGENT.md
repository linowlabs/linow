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
