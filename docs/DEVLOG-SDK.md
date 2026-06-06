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
