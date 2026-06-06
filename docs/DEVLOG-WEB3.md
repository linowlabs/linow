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
