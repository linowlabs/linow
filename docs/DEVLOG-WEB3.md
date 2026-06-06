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
