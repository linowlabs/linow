# Linow Agent Output Schemas

Version source of truth for `SO-06`.

- `schema_version`: `1.0.0`
- Scope: Sui Overflow 2026 single-agent workflow
- Purpose: define stable JSON outputs before hashing, Walrus storage, or Sui logging

## Included Schemas

1. `evidence_classification`
   - doc type, confidence, assertion IDs and labels, source confidence, limitations
2. `metadata_extraction`
   - dates, parties, amounts, citations, extracted references
3. `assertion_mapping`
   - ISA 500 assertion coverage with rationale and confidence
4. `source_confidence`
   - L0-L5 decision, basis, caveats, and upgrade path
5. `ccer_finding`
   - Condition, Criteria, Cause, Effect, Recommendation with citations
6. `gap_analysis`
   - readiness score, covered vs missing assertions, gaps, recommendations
7. `audit_pack_summary`
   - pack-level summary, document types, finding IDs, confidence distribution, next actions

8. `memory_manifest`
   - The artifact bundle stored on Walrus (via MemWal or raw blob) that aggregates an AuditPack's persistent agent memory and proof data.
   - Purpose: long-term agent recall/restore across sessions, meta-audit of agent reasoning, and third-party verification of the full evidence + findings trail.
   - Contains: evidence refs (IDs, Walrus blob IDs, commitments), agent outputs (or their schema + hash references to the versioned outputs from other schemas), finding hashes, audit pack metadata (id, status, owner/auditor wallets, encrypted details summary), timestamps, and schema version.
   - Design: every entry includes `schema_name: "memory_manifest"` and `schema_version`. Agent output entries inside should reference the existing classification / ccer_finding / gap_analysis / etc. schemas (by name + version + output_hash from the hashing layer). This keeps the manifest as a lightweight index/bundle rather than duplicating full content.

## Code Location

The versioned schema objects, TypeScript interfaces, and runtime validators live in:

- [app/src/lib/agent/schemas.ts](/Users/tri/Documents/code/linow/app/src/lib/agent/schemas.ts:1)

## Design Rules

- Every output must include `schema_name` and `schema_version`.
- Assertion coverage uses canonical IDs `0-7`.
- Source confidence uses `L0-L5` only.
- Findings stay human-reviewable with `DRAFT | CONFIRMED | EDITED | REJECTED`.
- These schemas describe unsigned agent proposals only. They do not authorize autonomous writes.
