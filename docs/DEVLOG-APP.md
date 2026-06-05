## 2026-06-05 - Build Minimal Web App Shell

### Change
- Files touched:
  - `app/src/app/layout.tsx`
  - `app/src/app/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Replaced the default Next starter with a usable Linow workspace shell.
  - Added the June 6 MVP sections for upload evidence, verify evidence, and create attestation.
  - Reserved a proof surface for evidence IDs, commitments, blob references, package IDs, and attestation outputs.

### Reasoning
- Why this approach was chosen:
  - The task only needed a minimal shell, so the layout stays structure-first and avoids premature product logic.
  - The core demo path stays visible from the start: upload, verify, attest, and show proof artifacts.
  - Copy stays aligned with project rules by avoiding overclaims and keeping attestation separate from evidence status.

### Tech Debt
- Known shortcuts:
  - The shell is static and does not call the shared SDK yet.
  - Result cards and proof values are placeholders until the real flows are wired in.
- Follow-up needed:
  - Connect the shell to the shared client boundary and crypto helpers.

## 2026-06-05 - Align Shell With Design Tone

### Change
- Files touched:
  - `app/src/app/layout.tsx`
  - `app/src/app/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Aligned the shell to `docs/DESIGN.md` with a cool blue glass look, DM Sans typography, and a proof-focused workspace layout.
  - Used the June 6 layout pattern from the design doc: top bar, left sidebar, and main workspace without a right inspector.
  - Tuned UI copy and status cards to feel calm, precise, and business-ready.

### Reasoning
- Why this approach was chosen:
  - The design doc is the UI source of truth, and its tone is a better fit for auditors and finance teams than the earlier draft styles.
  - Matching the documented layout now reduces churn before the flow gets wired to real SDK and chain outputs.
  - The shell reads more credible when proof outputs, sidebar labels, and buttons all share the same restrained visual language.

### Tech Debt
- Known shortcuts:
  - Sidebar navigation is presentational only and does not switch flows yet.
  - Proof cards still show placeholders until register, verify, and attestation are connected.
- Follow-up needed:
  - Wire in the real SDK outputs and live state once the product flows are ready.

## 2026-06-05 - Build Upload/Register Flow

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Wired the register view to the shared crypto helpers so the shell now performs real local hashing and encryption before showing proof artifacts.
  - Added file upload, metadata capture, assertion selection, progress states, and registration result output that seeds the in-session evidence registry.
  - Split lifecycle from attestation in the local product model so evidence stays `Registered` while reviewer actions are represented separately.

### Reasoning
- Why this approach was chosen:
  - `J6-14` can be completed without waiting on live Walrus or Sui integration by preparing truthful local proof artifacts and mock external references.
  - Using the shared SDK crypto helpers now reduces rework when `J6-18` swaps the shell over to the real client.
  - Keeping attestation separate from evidence lifecycle aligns the app with `AGENTS.md` and the shared SDK model instead of baking in a known boundary mistake.

### Tech Debt
- Known shortcuts:
  - Walrus blob IDs and Sui transaction outputs are still shell placeholders derived locally.
  - The register flow writes only to in-memory state and resets on refresh.
- Follow-up needed:
  - Replace mock blob and transaction outputs with real SDK calls during `J6-18`.
  - Persist registry state once the real backend path is available.

## 2026-06-06 - Fix Register Flow Crypto Import

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/lib/crypto.ts`
  - `app/next.config.ts`
  - `app/tsconfig.json`
  - `app/package.json`
  - `app/package-lock.json`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Replaced the direct cross-project SDK source import with an app-local browser crypto helper.
  - Removed the temporary local `@linow/sdk` app dependency and Turbopack alias after Next could not bundle external source modules on Windows.
  - Kept the upload/register flow behavior intact: local SHA-256 hashing, AES-256-GCM encryption, and honest mock proof outputs.

### Reasoning
- Why this approach was chosen:
  - Next 16 with Turbopack on Windows compiled the app only after the client bundle stopped importing source files from outside the app project.
  - The app-local helper keeps the demo path working now, while the shared SDK can still be packaged properly during the later integration task.
  - The browser helper mirrors the SDK crypto behavior without changing the product-facing flow.

### Tech Debt
- Known shortcuts:
  - Crypto helper code now exists in both `sdk/src/crypto.ts` and `app/src/lib/crypto.ts`.
- Follow-up needed:
  - Replace the app-local helper with a properly built SDK package once the monorepo/package setup is ready for `J6-18`.

## 2026-06-06 - Restore SDK Package Import

### Change
- Files touched:
  - `app/package.json`
  - `app/next.config.ts`
  - `app/src/app/page.tsx`
  - `app/node_modules` metadata via `npm install`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Switched the app back to importing crypto helpers from the shared `@linow/sdk` package.
  - Added a package build step for the SDK and changed the app scripts to use webpack so the linked local package resolves cleanly on Windows.
  - Removed the temporary app-local crypto helper, so the register flow now reads from the shared source of truth again.

### Reasoning
- Why this approach was chosen:
  - The temporary app-local helper unblocked the demo path, but it duplicated crypto logic and was not a good steady state.
  - Building the SDK into `dist/` and consuming the package from the app preserves the shared boundary the project is aiming for.
  - Switching the app build/dev scripts to webpack avoids the Turbopack workspace resolution problem that blocked the package import.

### Tech Debt
- Known shortcuts:
  - The SDK build must run before the app build/dev flow.
- Follow-up needed:
  - Keep the prebuild hook in place or add a repo-level workspace command so SDK changes stay in sync automatically.
