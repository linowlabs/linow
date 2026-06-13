## 2026-06-05 - Define Shared Client Boundary

### Change
- Files touched:
  - `sdk/package.json`
  - `sdk/tsconfig.json`
  - `sdk/src/client.ts`
  - `sdk/src/index.ts`
  - `sdk/src/types.ts`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added a framework-agnostic `@linow/sdk` package scaffold.
  - Defined product-facing types and the public `LinowClient` contract for `register`, `verify`, `attest`, and `getEvidence`.
  - Added an injectable `createLinowClient` helper so UI work can proceed before chain and storage handlers are implemented.
  - Kept evidence lifecycle status separate from review and attestation outcomes so attestation remains its own object, not an `EvidenceRecord.status`.
  - Split retention into its own model so Walrus availability states do not leak into `EvidenceRecord.status`.

### Reasoning
- Why this approach was chosen:
  - The UI and contract work can move in parallel if both sides share stable input and output shapes early.
  - The public API stays product-friendly and avoids leaking raw Move or RPC response shapes into the app.
  - The interface follows project rules around evidence status, source confidence, and not overclaiming verification.
  - Retention and evidence lifecycle are separate product concepts in the docs, so the SDK now models them separately.

### Tech Debt
- Known shortcuts:
  - The package is intentionally type-first and does not include the real Sui, Walrus, crypto, or Tatum implementations yet.
  - Some fields such as package IDs, blob references, and timestamps are optional until A finalizes chain return values.
  - Retention timestamps and renewal semantics are still provisional until Walrus-side integration is defined.
- Follow-up needed:
  - Align final return payloads with A once the contracts and RPC wrapper exist.
  - Add implementation adapters and usage examples from the Next.js app once the shared SDK wiring begins.

## 2026-06-05 - Build Crypto Utilities

### Change
- Files touched:
  - `sdk/src/crypto.ts`
  - `sdk/src/index.ts`
  - `sdk/package.json`
  - `sdk/tsconfig.json`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added Web Crypto utilities for `SHA-256` hashing, `AES-256-GCM` file encryption/decryption, and metadata encryption helpers.
  - Exported key generation, key import/export, and encrypted payload types through the public SDK surface.
  - Kept the crypto API browser-friendly and aligned with the project doc's randomized IV requirement for Walrus uploads.

### Reasoning
- Why this approach was chosen:
  - The June 6 flow needs client-side hashing and encryption before Walrus or Sui integration can work.
  - Web Crypto is built-in, modern, and already matches the project architecture in `MASTER.md`.
  - Returning binary payloads keeps the helpers reusable for both Walrus upload code and future adapter layers.

### Tech Debt
- Known shortcuts:
  - The current helpers use raw `SHA-256(file)` for the hackathon path and do not yet implement the production salted commitment scheme.
  - Metadata encryption currently serializes JSON directly and does not include schema versioning yet.
- Follow-up needed:
  - Add commitment helpers for the post-hackathon salted model once the product path needs it.
  - Wire these utilities into `register` and `verify` flows after the UI shell and Walrus integration are ready.

## 2026-06-06 - Emit SDK Package Build

### Change
- Files touched:
  - `sdk/package.json`
  - `sdk/tsconfig.json`
  - `sdk/dist/*`
  - `docs/DEVLOG-SDK.md`

## 2026-06-13 — Define Walrus Memory Manifest Schema and Sui AuditPack/AgentAction Models

### Change
- Files touched:
  - `docs/AGENT_SCHEMAS.md`
  - `sdk/src/types.ts`
  - `sdk/src/index.ts`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added the `memory_manifest` entry to the shared agent schemas doc, describing the Walrus-stored artifact bundle (evidence refs, agent output hashes, finding hashes, audit pack metadata, timestamps, schema version).
  - Added minimal TS model definitions in the SDK for `WalrusMemoryManifest`, `AuditPack`, `AgentAction`, and supporting `AUDIT_PACK_STATUSES`.
  - Re-exported the new const and types from the SDK public surface so future memwal/audit-pack/agent-action modules and app surfaces can import them directly.
  - Changes are pure type + doc definitions (no behavior, no app/agent code touched).

### Reasoning
- Why this approach was chosen:
  - Directly fulfills the two scoped definition tasks on this sdk/feat branch.
  - Reuses existing patterns from types.ts (const arrays + derived types, ID aliases) and the agent artifact hashing story already documented in DEVLOG-AGENT.
  - Puts descriptive "what the bundle contains" in the shared schemas doc (per project preference for docs over inline code comments).
  - Keeps code self-documenting via clear type and field names; detailed rationale stays in this DEVLOG entry.
  - Avoids touching any agent-side implementation (app/src/lib/agent/*) as required.

### Tech Debt
- Known shortcuts:
  - Field shapes are the minimal viable set from the task description and MASTER on-chain spec; full optional fields (e.g. encrypted details) can be added when the concrete manifest builder lands.
  - Action types are string for now (matching how the SDK already passes strings that become vector<u8> on chain); a const union can be added later if needed.
  - No runtime helpers (createManifest, pack PTB builders, event parsers) yet — those belong in later dedicated modules.
- Follow-up needed:
  - Implement the actual Walrus upload path for a MemoryManifest and the AuditPack/AgentAction SDK flows (memwal.ts, audit-pack.ts, agent-action.ts) once the Move contracts are defined.
  - Wire the manifest creation from approved agent artifacts (using the existing hashAgentArtifact output) when the orchestration + review gate is integrated.
  - Update the client interface and register flow once AuditPack linking becomes first-class.
- Summary:
  - Switched the SDK from declaration-only output to a real JavaScript package build.
  - Exported the public API from `dist/` so the app can consume the SDK as a normal local package instead of importing source files directly.

### Reasoning
- Why this approach was chosen:
  - The app client bundle could not reliably consume raw SDK source from outside the app project on Windows with Next 16.
  - Emitting a real package build keeps a single source of truth for the shared crypto helpers and client boundary.
  - The built package is easier for the app bundler to resolve than a cross-project source import.

### Tech Debt
- Known shortcuts:
  - `dist/` is generated locally and should stay untracked.
- Follow-up needed:
  - Keep the SDK build step in the app workflow so the package stays fresh during development.

## 2026-06-06 - Fix SDK ESM Package Resolution

### Change
- Files touched:
  - `.gitignore`
  - `sdk/package.json`
  - `sdk/package-lock.json`
  - `sdk/src/index.ts`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added TypeScript as an SDK dev dependency so the SDK build script works from any workspace context.
  - Updated SDK root exports to use `.js` specifiers so the emitted ESM package resolves correctly through Node and Next.
  - Added ignore rules for generated `node_modules`, `dist`, and Next build output.

### Reasoning
- Why this approach was chosen:
  - The app could import `@linow/sdk` only after the built SDK root file stopped emitting extensionless ESM imports.
  - Making the SDK build self-contained avoids relying on another package's local `tsc` binary.
  - Ignoring generated output keeps the branch focused on source and package metadata.

### Tech Debt
- Known shortcuts:
  - The app currently uses webpack for local package resolution because Turbopack was not resolving the linked SDK cleanly on Windows.
- Follow-up needed:
  - Revisit Turbopack after the repo has a fuller workspace setup or once Next's linked-package behavior is more predictable.

## 2026-06-06 - Add Tatum Sui RPC Adapter

### Change
- Files touched:
  - `sdk/src/tatum.ts`
  - `sdk/src/index.ts`
  - `sdk/package.json`
  - `.env.example`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added a dependency-free Tatum Sui JSON-RPC adapter with `getObject`, `executeTransactionBlock`, and generic `call` helpers.
  - Exported the adapter through the SDK root and `@linow/sdk/tatum` subpath.
  - Documented the required Tatum environment variables in `.env.example`.

### Reasoning
- Why this approach was chosen:
  - `J6-07` needs a thin Tatum transport boundary before the real register, verify, and attest SDK flows can be wired.
  - The adapter stays signer-agnostic: it can submit signed transaction bytes, but it does not hold private keys, mnemonics, or raw evidence.
  - Keeping the wrapper on raw JSON-RPC avoids adding a Sui SDK dependency until the integration flow proves it needs one.

### Tech Debt
- Known shortcuts:
  - The adapter is transport-only and does not yet build PTBs for `register_evidence` or `create_attestation`.
  - Live Tatum calls still require a real `TATUM_API_KEY`.
- Follow-up needed:
  - Use this adapter in `J6-10` through `J6-12` after the Walrus wrapper and transaction-building path are ready.

## 2026-06-06 - Add Walrus HTTP Adapter

### Change
- Files touched:
  - `sdk/src/walrus.ts`
  - `sdk/src/index.ts`
  - `sdk/package.json`
  - `.env.example`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added a dependency-free Walrus HTTP adapter with `uploadEncryptedBlob` and `readEncryptedBlob` helpers.
  - Exported the adapter through the SDK root and `@linow/sdk/walrus` subpath.
  - Documented the default Walrus testnet publisher and aggregator URLs in `.env.example`.

### Reasoning
- Why this approach was chosen:
  - `J6-09` needs encrypted blob upload/download before the SDK can replace app-side mock storage references.
  - The adapter API is intentionally named around encrypted blobs so callers do not accidentally treat Walrus as private storage.
  - Using the public Walrus HTTP publisher and aggregator keeps the hackathon path light while still using real Walrus infrastructure.

### Tech Debt
- Known shortcuts:
  - The adapter does not encrypt content itself; callers must use the existing crypto helpers before upload.
  - Public publisher availability and retention are testnet-dependent, so production will likely need a managed publisher or direct SDK flow.
- Follow-up needed:
  - Wire `uploadEncryptedBlob` and `readEncryptedBlob` into `J6-10` and `J6-11`.
  - Consider adding blob-status checks once the demo flow has the core register and verify path working.

## 2026-06-06 - Compose Register Evidence Flow

### Change
- Files touched:
  - `sdk/src/register.ts`
  - `sdk/src/index.ts`
  - `sdk/package.json`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added `createRegisterEvidenceHandler` to compose local hashing, AES-GCM encryption, Walrus encrypted blob upload, and an injected on-chain registration function.
  - Added encrypted payload serialization so the IV and ciphertext can be stored together without exposing plaintext.
  - Exported the register flow through the SDK root and `@linow/sdk/register` subpath.

### Reasoning
- Why this approach was chosen:
  - `J6-10` needs the register pipeline to use real crypto and Walrus storage before the app replaces mock registration outputs.
  - The SDK still respects "Agent proposes, human signs, chain proves" by requiring an injected `registerOnChain` handler instead of holding keys or signing internally.
  - Keeping encryption key ownership outside the helper avoids silently creating evidence that cannot be decrypted later.

### Tech Debt
- Known shortcuts:
  - The chain step is injected and not yet backed by a concrete PTB builder/signer.
  - The helper can export the AES key only when explicitly requested for demo plumbing.
- Follow-up needed:
  - Wire `registerOnChain` to the wallet/Tatum transaction path.
  - Feed this handler into the app registration flow during `J6-18`.

## 2026-06-06 - Add Register Evidence PTB Handler

### Change
- Files touched:
  - `sdk/package.json`
  - `sdk/package-lock.json`
  - `sdk/src/register.ts`
  - `sdk/src/index.ts`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added the official `@mysten/sui` TypeScript SDK dependency for PTB construction.
  - Added `createSuiRegisterOnChainHandler` to build a `register_evidence` transaction, transfer the returned `EvidenceRecord` to the signer, request an injected wallet signature, and submit signed bytes through Tatum.
  - Added execution parsing for the created `EvidenceRecord` ID and transaction digest.

### Reasoning
- Why this approach was chosen:
  - `J6-10` needs the on-chain half of registration without letting the SDK own signing keys.
  - The handler preserves the project boundary: the SDK prepares the transaction, the user wallet signs it, and Tatum submits the signed transaction.
  - Returning and transferring the `EvidenceRecord` in the PTB keeps the Move function composable while producing an owned object for later reads.

### Tech Debt
- Known shortcuts:
  - The handler currently assumes testnet for wallet signing.
  - `registeredAt` is reported from the client timestamp until the integration layer maps the chain event timestamp directly.
- Follow-up needed:
  - Wire this handler into the app wallet flow during `J6-18`.
  - Add a small integration smoke test once a browser wallet signing path is present.

## 2026-06-06 - Finish End-to-End Register Evidence SDK Flow

### Change
- Files touched:
  - `.env.example`
  - `sdk/src/register.ts`
  - `sdk/src/index.ts`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added `createRegisterEvidenceFlow` to compose Tatum, Walrus, encryption, and Sui registration into one runnable SDK register handler.
  - Added `createRegisterEvidenceFlowFromEnv` so package ID, Tatum, and Walrus settings can be sourced from the project's environment variables.
  - Added `createRegisterEvidenceClient` for wiring the real register handler into the shared `LinowClient` shape.
  - Made the Sui signing chain configurable from the selected Tatum network instead of assuming testnet internally.
  - Documented `LINOW_PACKAGE_ID`, `NEXT_PUBLIC_LINOW_PACKAGE_ID`, and optional endpoint overrides in `.env.example`.

### Reasoning
- Why this approach was chosen:
  - `J6-10` needs a real upload -> encrypt -> Walrus -> wallet-signed Sui registration path without forcing the app UI work from `J6-18` into this branch.
  - Keeping `signTransaction` injected preserves the project boundary: the SDK prepares and submits, while a human-controlled wallet signs.
  - Environment-driven construction keeps the demo setup simple while still allowing tests or app code to inject mock Tatum/Walrus clients.

### Tech Debt
- Known shortcuts:
  - The SDK still needs a browser wallet adapter from the app layer before the UI can call this flow directly.
  - The client timestamp is still used as `registeredAt` until `J6-11`/`J6-18` map chain timestamps cleanly.
- Follow-up needed:
  - In `J6-18`, pass the connected wallet's signing function into `createRegisterEvidenceFlowFromEnv`.
  - Run a live testnet smoke test once the wallet bridge is available.

## 2026-06-06 - Add Verify Evidence SDK Flow

### Change
- Files touched:
  - `sdk/src/verify.ts`
  - `sdk/src/index.ts`
  - `sdk/src/types.ts`
  - `sdk/src/crypto.ts`
  - `sdk/package.json`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added `createVerifyEvidenceHandler` to hash a supplied file and compare it against the on-chain evidence commitment.
  - Added `createSuiGetEvidenceHandler` to fetch and parse `EvidenceRecord` Move objects through Tatum `sui_getObject`.
  - Added env-driven and client-shaped helpers for SDK consumers: `createVerifyEvidenceFlow`, `createVerifyEvidenceFlowFromEnv`, and `createVerifyEvidenceClient`.
  - Exported the verification API through the SDK root and `@linow/sdk/verify` subpath.
  - Updated `BinaryContent` to accept browser `Blob`/`File` inputs and represented the contract's under-review status without adding a verified evidence status.

### Reasoning
- Why this approach was chosen:
  - `J6-11` is a read-only integrity check, so it only needs Tatum object reads and local SHA-256 hashing.
  - The verification result stays honest: a hash match proves consistency with the registered commitment, not document truth, source authenticity, or audit sufficiency.
  - Keeping object parsing in the SDK gives the app a stable product result instead of exposing raw Sui JSON-RPC response shapes.

### Tech Debt
- Known shortcuts:
  - Encrypted metadata is not decrypted during verification, so fetched evidence snapshots include a placeholder metadata description.
  - Walrus encrypted blob retrieval is not required for hash comparison yet and remains a follow-up for richer proof display.
- Follow-up needed:
  - Wire this handler into the app during `J6-18`.
  - Add a live testnet smoke test with a real registered evidence ID after the wallet registration path is available.

## 2026-06-06 - Add Attestation SDK Flow

### Change
- Files touched:
  - `sdk/src/attest.ts`
  - `sdk/src/index.ts`
  - `sdk/src/types.ts`
  - `sdk/package.json`
  - `docs/DEVLOG-SDK.md`
- Summary:
  - Added `createAttestEvidenceHandler` to encrypt reviewer notes and prepare a product-shaped attestation result.
  - Added `createSuiAttestationHandler` to build a `create_attestation` PTB, request an injected wallet signature, submit signed bytes through Tatum, and parse the created `Attestation` object ID.
  - Added env-driven and client-shaped helpers: `createAttestationFlow`, `createAttestationFlowFromEnv`, and `createAttestationClient`.
  - Exported the attestation API through the SDK root and `@linow/sdk/attest` subpath.
  - Added typed attestation actions and optional source confidence fields to the shared SDK model.

### Reasoning
- Why this approach was chosen:
  - `J6-12` needs reviewer attestations to be signed by a human wallet while the SDK prepares and submits the transaction through existing Tatum infrastructure.
  - Reviewer notes are encrypted before being sent on-chain so private review context is not stored as plaintext.
  - The default attestation action is `hashConfirmed`, which fits the project boundary better than implying document truth or audit sufficiency.

### Tech Debt
- Known shortcuts:
  - The SDK does not yet enforce that an attestation follows a successful verification result; the app should gate that flow during `J6-18`.
  - `createdAt` is still derived from the client after transaction submission until the integration layer maps chain event timestamps.
- Follow-up needed:
  - Wire this handler into the app wallet flow during `J6-18`.
  - Run a live testnet smoke test after the browser wallet signing bridge is available.
