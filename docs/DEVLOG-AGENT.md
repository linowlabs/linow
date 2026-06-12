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
