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
