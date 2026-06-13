## 2026-06-06 - Bootstrap Move Package Scaffold

### Change
- Files touched:
  - `contracts/Linow/Move.toml`
  - `contracts/Linow/sources/evidence.move`
  - `.gitignore`
  - `README.md`
  - `docs/DEVLOG-WEB3.md`
- Summary:
  - Replaced the empty `contracts/` placeholder with a real `Linow` Move package scaffold.
  - Added an initial `evidence.move` module with the core `EvidenceRecord` and `Attestation` structs plus shared status and source-confidence constants.
  - Added an ignore rule for Move build artifacts and updated the README repo layout to include the new contracts workspace.

### Reasoning
- Why this approach was chosen:
  - `J6-01` and `J6-03` only need the A-side foundation, so the safest path is to establish package structure without pulling the app into partial chain integration early.
  - The struct fields mirror `MASTER.md` and the shared SDK boundary so later `J6-04` through `J6-06` work can wire behavior onto a stable shape.
  - Keeping the scaffold minimal avoids risking the existing B-side demo path before `J6-18`.

### Tech Debt
- Known shortcuts:
  - The package is scaffolded but not yet validated with `sui move build` because the local Sui CLI is not installed in this environment.
  - `register_evidence` and `create_attestation` entry functions are intentionally deferred to the next contract tasks.
- Follow-up needed:
  - Install or use a local Sui CLI and run a Move build before starting `J6-04`.
  - Implement object constructors and entry functions for evidence registration and attestation creation.

## 2026-06-06 - Silence Scaffold Field Warnings

### Change
- Files touched:
  - `contracts/Linow/sources/evidence.move`
  - `docs/DEVLOG-WEB3.md`
- Summary:
  - Added `#[allow(unused_field)]` to the scaffold-only `EvidenceRecord` and `Attestation` structs.
  - Kept the initial contract shapes intact while removing noisy build warnings from fields that are defined ahead of their constructor and accessor logic.

### Reasoning
- Why this approach was chosen:
  - The current contract task is still setup-only, so writing placeholder readers just to satisfy the compiler would add fake complexity and blur the next real contract steps.
  - The warning suppression is narrow, explicit, and easy to remove once `register_evidence`, `create_attestation`, and field accessors land.

### Tech Debt
- Known shortcuts:
  - The structs still rely on warning suppression until the next contract tasks start using their fields.
- Follow-up needed:
  - Remove the suppression once the module implements real constructors, updates, and reads for these objects.

## 2026-06-06 - Implement EvidenceRecord Registration

### Change
- Files touched:
  - `contracts/Linow/Move.toml`
  - `contracts/Linow/sources/evidence.move`
  - `docs/DEVLOG-WEB3.md`
- Summary:
  - Added `register_evidence` to create and return an `EvidenceRecord` with commitment, encrypted blob pointer, encrypted metadata, ISA assertions, lifecycle status, registrant, timestamp, and optional audit pack link.
  - Added an `EvidenceRegistered` event with the evidence ID, registrant, and timestamp for later Tatum/RPC parsing.
  - Added read helpers for the `EvidenceRecord` fields and removed the unused-field suppression from that struct.
  - Removed the explicit Sui framework dependency from `Move.toml` because the installed Sui CLI now injects the standard Sui dependencies automatically.

### Reasoning
- Why this approach was chosen:
  - `J6-04` needs the on-chain evidence object creation path, while hashing, encryption, Walrus upload, and transaction submission stay outside the Move module.
  - The function initializes `status` as `Registered` and does not introduce a `Verified` state, keeping verification tied to later reviewer attestations.
  - Returning the object keeps the function composable for PTBs, while the event gives the SDK/Tatum layer a simple way to find the created object without storing plaintext evidence or metadata on-chain.

### Tech Debt
- Known shortcuts:
  - Validation is intentionally minimal: only the SHA-256 commitment length is enforced for the hackathon path.
  - The returned object must be transferred or otherwise handled by the caller's PTB and is not yet linked into an `AuditPack`.
- Follow-up needed:
  - Implement `create_attestation` for `J6-05`.
  - Decide whether later integration needs stronger validation for assertion IDs, blob pointer encoding, or metadata schema versioning.

## 2026-06-06 - Implement Attestation Creation

### Change
- Files touched:
  - `contracts/Linow/sources/evidence.move`
  - `docs/DEVLOG-WEB3.md`
- Summary:
  - Added `create_attestation` to create and return a reviewer-signed `Attestation` linked to a target evidence ID.
  - Added minimal validation for attestation type and source confidence enum ranges.
  - Added an `AttestationCreated` event and read helpers for attestation fields.
  - Removed the unused-field suppression from the `Attestation` struct now that its fields are used by helper functions.

### Reasoning
- Why this approach was chosen:
  - `J6-05` needs attestation as its own trust object, not a mutation of `EvidenceRecord.status`.
  - The function uses the transaction sender as the reviewer wallet and records timestamped encrypted notes, matching the June 6 schema without storing plaintext review notes.
  - Returning the object keeps the function composable for PTBs, while the event gives Tatum/SDK integration a clear proof artifact to parse later.

### Tech Debt
- Known shortcuts:
  - The function accepts a target `ID` directly and does not yet prove that the ID belongs to an `EvidenceRecord`.
  - It does not prevent the original registrant from self-attesting because role/access policy is outside the current June 6 contract scope.
- Follow-up needed:
  - Decide during SDK/Tatum integration whether `create_attestation` should borrow an `EvidenceRecord` to enforce target type.
  - Add reviewer role checks later if an `AccessGrant` or audit engagement model lands.

## 2026-06-06 - Publish Move Package

### Change
- Files touched:
  - `contracts/Linow/Move.toml`
  - `docs/DEVLOG-WEB3.md`
- Summary:
  - Published the `Linow` Move package to Sui testnet and recorded the resulting package ID in `Move.toml`.
  - Kept the package metadata aligned with the on-chain deployment so later SDK/Tatum work can reference a single source of truth.

### Reasoning
- Why this approach was chosen:
  - `J6-06` is the deployment checkpoint for the June 6 flow, so the package ID belongs in the package manifest where the build and integration code can find it.
  - Recording the package ID in the repo makes the contract side reproducible for the next steps without exposing any sensitive wallet material.

### Tech Debt
- Known shortcuts:
  - The package is deployed, but the later Tatum/RPC integration still needs to read and call it directly.
- Follow-up needed:
  - Use the recorded package ID when wiring `J6-07` and later client calls.

## 2026-06-13 — Implement minimal AuditPack on Sui

### Change
- Files touched:
  - `contracts/Linow/sources/audit_pack.move`
  - `docs/DEVLOG-WEB3.md`
- Summary:
  - Added new module `linow::audit_pack` with the AuditPack struct (key, store), creation function, and minimal linking functions for evidence_ids, finding_hashes, and memory_blob_id.
  - Included status constants and transition helpers (draft/submitted/under_review/complete), relevant events (AuditPackCreated, EvidenceAdded, FindingAdded, MemoryBlobSet), and field accessors.
  - Follows the exact struct layout and status model from the project master spec.
  - Uses the same code style, imports, and patterns as the existing evidence.move (clock + ctx for creation, returned objects, vector<u8> handling, Option for optional fields, events on mutations).
  - The existing EvidenceRecord.audit_pack_id support in evidence.move now has a matching object to link to.

### Reasoning
- Why this approach was chosen:
  - The task asked for *minimal* creation + evidence/finding/memory-linking functions or events.
  - Creating a dedicated module keeps concerns separate (as planned in project structure) while keeping the implementation small and focused on the deliverable ("AuditPack package builds locally").
  - Returning the object from create (instead of auto-transfer) matches the pattern already established in evidence.move so PTBs remain composable.
  - Status transitions are provided as simple functions to support the workflow described in the master without over-engineering.
  - No changes to evidence.move itself — it already forward-declared the pack id field.

### Tech Debt
- Known shortcuts:
  - memory_blob_id uses String per the spec (with proper import); other blob fields in the package use vector<u8> — we can normalize later if needed.
  - No access control (e.g. only owner can add evidence) yet — minimal scope for now.
  - No direct cross-module enforcement between AuditPack and EvidenceRecord (IDs are untyped).
- Follow-up needed:
  - Implement the companion AgentAction event module.
  - Wire the SDK side (audit-pack.ts etc.) to call the new entry functions from PTBs.
  - Add tests or build verification once the full package (including AgentAction) is in.
  - Update Published.toml / Move.toml after the next deploy.

## 2026-06-13 — Implement AgentAction log on Sui

### Change
- Files touched:
  - `contracts/Linow/sources/agent_action.move`
  - `docs/DEVLOG-WEB3.md`
- Summary:
  - Added new module `linow::agent_action` containing only the `AgentAction` event struct (copy, drop) and an `emit_agent_action` entry function.
  - The function emits the event with: pack_id (ID), optional evidence_id (Option<ID>), action_type (vector<u8>), agent_output_hash (vector<u8>), and timestamp (from Clock).
  - Added small convenience helpers (action_classify, action_extract, action_gap, action_ccer, action_recommend) returning the standard vector<u8> values for common action types.
  - Explicitly does not store any private agent data — only the hash of the approved output is logged on-chain for meta-auditability.

### Reasoning
- Why this approach was chosen:
  - The task requires emitting events (not storing objects) with exactly the listed fields and "Do not store private agent text on-chain."
  - Using a dedicated module mirrors the structure we just used for audit_pack.move and keeps the evidence module focused.
  - The emit function is the minimal public surface needed for PTBs (callable from SDK transaction building).
  - Convenience action_* helpers make usage ergonomic in the SDK and PTBs without hardcoding byte strings everywhere, while still allowing arbitrary action_types if needed later.
  - Timestamp comes from the Clock object (consistent with all other time-based objects/events in the package).

### Tech Debt
- Known shortcuts:
  - Action type values are simple byte strings for now (matching the spec and prior planning).
  - No validation that the pack_id or evidence_id actually exist (that can be handled at higher layers or with object borrowing if desired later).
- Follow-up needed:
  - Expose the emit in the SDK (agent-action.ts) so the agent orchestration can log approved outputs after human review.
  - Update the proof surface / demo to surface AgentAction events alongside AuditPack and EvidenceRecords.
  - Add the module to any build/test harness and re-deploy the package when ready.

## 2026-06-13 — Deploy updated Sui package to testnet

### Change
- Files touched:
  - `contracts/Linow/Move.toml`
  - `contracts/Linow/Published.toml`
  - `docs/DEVLOG-WEB3.md`
- Summary:
  - Published the full updated Linow package (modules: evidence, audit_pack, agent_action) to Sui testnet as a fresh package.
  - New package ID: 0x8460a046d70e0e0940d556d9526c48ee683ca8672390ff6480e937dc9a69d6aa
  - New upgrade capability: 0xb7b08f75206123bc3c4d022f04970094a0da3958a7d1955ed90c2879f11a8786
  - Updated Move.toml published-at to the new package ID.
  - Published.toml was populated (or regenerated) by the publish command with full metadata (chain-id, original-id, version=1, toolchain, build-config, upgrade-capability).
  - The package now includes all three modules and is ready for the demo (AuditPack + AgentAction events).

### Explorer links (testnet)
- Package: https://suiscan.xyz/testnet/package/0x8460a046d70e0e0940d556d9526c48ee683ca8672390ff6480e937dc9a69d6aa
- Suivision: https://suivision.xyz/object/0x8460a046d70e0e0940d556d9526c48ee683ca8672390ff6480e937dc9a69d6aa?network=testnet
- Upgrade Cap: https://suiscan.xyz/testnet/object/0xb7b08f75206123bc3c4d022f04970094a0da3958a7d1955ed90c2879f11a8786

### Reasoning
- Why this approach was chosen:
  - The task explicitly asks to "Publish updated package to Sui testnet" and deliver an "Updated package ID ready for demo."
  - Since new modules were added on this branch, a fresh publish (new package ID) is appropriate and matches how the initial evidence-only package was recorded.
  - The previous ID (0x6b8...) was the evidence baseline; the new ID represents the complete on-chain implementation for Sui Overflow.
  - Recorded exactly like the evidence deployment: published-at in Move.toml + full [published.testnet] section in Published.toml.
  - Explorer links added to the devlog for easy access during demo and judging.

### Tech Debt
- Known shortcuts:
  - Fresh publish instead of in-place upgrade (new ID and new upgrade cap). This is fine for the hackathon submission and demo.
  - The old Published.toml entry was cleared before publish to avoid the "already published" error.
- Follow-up needed:
  - Use the new package ID in the SDK (sdk/src/ types, register/attest flows that reference package ID).
  - Update any example calls, tests, or the demo harness with the new ID and the new module entry points (linow::audit_pack, linow::agent_action).
  - Record the explorer links in the main README or submission materials.
  - Consider an upgrade path post-hackathon if we want to preserve the original package ID for continuity.
