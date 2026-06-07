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

## 2026-06-06 - Build Verify Tamper Flow

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Refined the verify workspace into an explicit two-path demo: verify original file and verify modified file.
  - Added clearer verification result details, including the checked file label and a reset path for repeated demos.
  - Kept the verify flow honest to the product model by comparing against the recorded commitment without introducing a fake `Verified` evidence status.

### Reasoning
- Why this approach was chosen:
  - `J6-15` asks for evidence lookup, original-file verification, modified-file verification, and a visible mismatch state, so the UI now maps directly to that deliverable.
  - Separate actions are easier for judges and collaborators to understand quickly than a generic tamper toggle.
  - The flow stays mock-friendly while still using the real shared hashing helper for supplied verification files.

### Tech Debt
- Known shortcuts:
  - Modified-file verification is still simulated in the shell by forcing a mismatch rather than loading a real mutated asset.
- Follow-up needed:
  - Replace the forced mismatch path with real SDK-backed verification inputs during `J6-18`.

## 2026-06-06 - Silence Hydration Noise

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/layout.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added `suppressHydrationWarning` to the interactive form controls that browser extensions were decorating with extra attributes.
  - Kept the root layout hydration guard in place so the page shell and its controls stay stable on first paint.

### Reasoning
- Why this approach was chosen:
  - The mismatch was coming from browser-injected attributes like `fdprocessedid`, not from app state or rendering logic.
  - Suppressing hydration warnings at the exact controls keeps the fix narrow and avoids changing the verify/register UI behavior.

### Tech Debt
- Known shortcuts:
  - The warning can still appear in extension-heavy browsers, but it will no longer surface as a React hydration mismatch from our markup.
- Follow-up needed:
  - None for the current demo path unless a browser-specific regression appears.

## 2026-06-06 - Build Attestation Flow

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Refined the attestation workspace so reviewer attestation is explicitly gated by a successful verification for the selected evidence item.
  - Added a continuation path from successful verification into attestation, plus clearer attestation proof output details for the selected record, reviewer, action, and timestamp.
  - Kept attestation as its own object in the shell model instead of leaking verification into `EvidenceRecord.status`.

### Reasoning
- Why this approach was chosen:
  - `J6-16` calls for reviewer attestation after verification, so the UI now reflects that dependency directly rather than presenting attestation as a standalone form.
  - The reviewer flow is easier to demo when a successful verify action hands off into attestation with visible prerequisite messaging.
  - This stays aligned with `AGENTS.md`: humans sign, attestation is separate from lifecycle status, and the product does not overclaim verification.

### Tech Debt
- Known shortcuts:
  - Verification-to-attestation handoff is still in-memory session state and resets on refresh.
  - Attestation IDs and transaction digests remain mock outputs until `J6-18`.
- Follow-up needed:
  - Replace the session-gated prerequisite with real SDK-backed verification and attestation state during integration.

## 2026-06-06 - Display Proof Outputs

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a unified proof-output surface that shows the latest evidence ID, tx digest, package ID, commitment, blob reference, attestation ID, and verification state.
  - Extended the register and attestation result cards to include the demo package ID so proof artifacts are visible both locally and in the consolidated surface.

### Reasoning
- Why this approach was chosen:
  - `J6-17` is demo-facing, so the most important thing is a judge-readable proof view rather than scattering artifacts across multiple flow cards.
  - A single proof surface makes the shell easier to narrate during the hackathon demo while staying honest that some values are still mock-linked until integration.

### Tech Debt
- Known shortcuts:
  - The package ID is a shell placeholder until A finalizes the deployed contract/package values.
  - The unified proof surface tracks only the latest action in session state.
- Follow-up needed:
  - Replace placeholder package and transaction outputs with real chain values during `J6-18`.

## 2026-06-06 - Integrate Real SDK Flows Into UI

### Change
- Files touched:
  - `app/package.json`
  - `app/package-lock.json`
  - `app/src/app/api/sui/execute/route.ts`
  - `app/src/app/api/sui/object/route.ts`
  - `app/src/app/layout.tsx`
  - `app/src/app/page.tsx`
  - `app/src/app/providers.tsx`
  - `app/src/app/wallet-provider.tsx`
  - `app/src/lib/dapp-kit.ts`
  - `app/src/lib/wallet-context.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added the current Mysten dApp Kit React wallet provider and a small app wallet bridge for signing SDK-prepared transactions.
  - Added server-side Sui API routes so Tatum object reads and signed transaction submissions use server `TATUM_API_KEY` instead of exposing it to the browser.
  - Replaced mock register, verify, and attest handlers with the real SDK flows from `@linow/sdk`.
  - Preserved the existing UI structure while feeding proof cards real evidence IDs, tx digests, Walrus blob IDs, commitments, and attestation IDs.
  - Kept attestation gated behind successful verification and kept reviewer notes encrypted before on-chain submission.

### Reasoning
- Why this approach was chosen:
  - `J6-18` asks for live infrastructure wiring, not a redesign, so the existing demo shell stayed intact while the plumbing became real.
  - Server-side Tatum routes protect the API key while still allowing browser wallets to sign transactions.
  - The wallet bridge keeps the app aligned with "Agent proposes, human signs, chain proves": the SDK prepares transactions, the connected wallet signs, and Tatum submits.

### Tech Debt
- Known shortcuts:
  - Registered files are kept in browser session state so the verify-original flow can reuse them; this resets on refresh.
  - The app currently targets Sui testnet only.
- Follow-up needed:
  - Run a live browser smoke test with a funded testnet wallet and real Tatum key.
  - Add fuller user-facing guidance if wallet network mismatch or missing testnet funds becomes a common demo issue.

## 2026-06-06 - Swap Header Mascot Asset

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Replaced the header shield SVG with the user-provided mascot image.
  - Kept the brand lockup and version badge intact, while sizing the mascot to fit the existing icon slot.

### Reasoning
- Why this approach was chosen:
  - The mascot belongs in the top-left brand mark where the shield icon already lived.
  - Using the file directly keeps the current UI structure steady while giving the header a stronger brand signal.

### Tech Debt
- Known shortcuts:
  - The mascot asset is still stored under the app route folder rather than a shared static `public/` folder.
- Follow-up needed:
  - If we want broader reuse later, move the image into `app/public/` and reference it from a stable public URL.

## 2026-06-06 - Use Mascot As App Icon

### Change
- Files touched:
  - `app/public/mascot.png`
  - `app/src/app/layout.tsx`
  - `app/src/app/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Copied the mascot asset into the app public folder.
  - Pointed the header brand mark and Next metadata icons at the same public mascot file so the browser tab icon matches the top-left logo.

### Reasoning
- Why this approach was chosen:
  - Next metadata icons work best from `public/`, and the browser tab should share the same visual asset as the header mark.
  - Keeping one public copy avoids confusion about which file powers the app icon.

### Tech Debt
- Known shortcuts:
  - The old route-local mascot copy was removed, but the asset is still a large PNG, so it may be heavier than a tiny favicon would normally be.
- Follow-up needed:
  - If load time or crispness becomes an issue, generate a smaller favicon-sized variant from the same mascot art later.

## 2026-06-06 - Replace App Router Favicon

### Change
- Files touched:
  - `app/src/app/icon.png`
  - `app/src/app/favicon.ico`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Replaced the old App Router `.ico` favicon with the mascot image as `icon.png`.
  - Removed the legacy `favicon.ico` so Next serves the mascot from the icon route.

### Reasoning
- Why this approach was chosen:
  - In the App Router, a lingering `favicon.ico` can keep winning over metadata changes, so the icon asset itself needed to move.
  - `icon.png` is the cleaner long-term choice for this mascot art.

### Tech Debt
- Known shortcuts:
  - Browsers can cache favicons aggressively, so the first refresh may still show the old icon.
- Follow-up needed:
  - Hard refresh or open a fresh tab/incognito if the browser keeps showing the stale favicon.

## 2026-06-06 - Resolve Wallet Transaction Before Signing

### Change
- Files touched:
  - `app/src/app/wallet-provider.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Updated the wallet signing bridge to resolve Sui gas and object inputs with the active dApp Kit client before asking the connected wallet to sign.
  - Kept the resolved transaction on the DApp Kit transaction-object path so Slush extension wallets can use the legacy `signTransactionBlock` fallback.
  - Kept the SDK signer callback contract unchanged, so register and attestation flows both benefit from the app-level fix.

### Reasoning
- Why this approach was chosen:
  - Slush was receiving an unresolved transaction with null gas fields during the register evidence flow.
  - Resolving the transaction in the app sets sender, gas price, budget, payment, and object inputs before human signing, while preserving the "Agent proposes, human signs, chain proves" boundary.

### Tech Debt
- Known shortcuts:
  - This still depends on the connected wallet account having testnet SUI gas available.
- Follow-up needed:
  - Add a preflight balance/network check if missing testnet funds remains a common demo blocker.

## 2026-06-06 - Load Root Env For App API Routes

### Change
- Files touched:
  - `app/src/lib/server-env.ts`
  - `app/src/app/api/sui/execute/route.ts`
  - `app/src/app/api/sui/object/route.ts`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a server-only env helper that loads the repository root `.env` for the Next app.
  - Updated Sui execute/read API routes to use the helper when creating the server-side Tatum client.

### Reasoning
- Why this approach was chosen:
  - During local monorepo runs, `next dev` starts inside `app/`, while the configured `.env` lives at the repository root.
  - Loading the root env keeps `TATUM_API_KEY` server-side and avoids duplicating secrets into `app/.env`.

### Tech Debt
- Known shortcuts:
  - The helper assumes the app package lives one directory below the repository root.
- Follow-up needed:
  - If the monorepo layout changes, update the root path resolution or move to a shared env package.

## 2026-06-06 - Make Proof Output Dismissible

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Scoped the proof output surface away from the records table view.
  - Added a dismiss button so users can hide the latest proof output after capturing it.

### Reasoning
- Why this approach was chosen:
  - The proof panel is useful for the live demo, but showing it in every workspace section made the UI feel noisy after a successful flow.
  - Clearing the snapshot keeps the existing state model simple and lets the next live action repopulate fresh proof artifacts.

### Tech Debt
- Known shortcuts:
  - Dismissing the proof panel only clears the in-session proof snapshot; it does not affect the registered record or attestation data.
- Follow-up needed:
  - Consider a dedicated proof/details drawer if the demo grows beyond one active evidence record.

## 2026-06-06 - Install SDK Dependencies During App Build

### Change
- Files touched:
  - `app/package.json`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Updated the app `predev` and `prebuild` scripts to install SDK dependencies before building the sibling SDK package.

### Reasoning
- Why this approach was chosen:
  - Vercel installs dependencies inside `app/`, but the app build also compiles the sibling `sdk/` package.
  - Without an explicit SDK install step, the SDK TypeScript build cannot resolve `@mysten/sui` during deployment.

### Tech Debt
- Known shortcuts:
  - This adds a little extra install time before app builds in exchange for reliable monorepo deployment.
- Follow-up needed:
  - Revisit with npm workspaces or a root package manager setup if the monorepo grows.

## 2026-06-07 - Improve Responsive Workspace Shell

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a sidebar toggle that works across desktop and mobile viewports.
  - Turned the sidebar into an overlay drawer on compact screens, while preserving a collapsed rail mode on wider screens.
  - Reworked the top bar and workspace header spacing so the shell wraps cleanly on phones and uses less vertical space on short landscape screens.

### Reasoning
- Why this approach was chosen:
  - The user asked specifically for responsive fixes without disturbing the product logic, so the patch stays at the shell/layout layer.
  - A shared toggle keeps navigation consistent across viewport sizes instead of introducing separate mobile-only controls.
  - Slimming the header on short screens protects the live demo path by keeping more room available for the actual register, verify, and attest forms.

### Tech Debt
- Known shortcuts:
  - Sidebar state currently resets to open on desktop and closed on compact screens whenever the viewport crosses the breakpoint.
- Follow-up needed:
  - If we want stronger persistence later, store the user’s sidebar preference in local storage without affecting the evidence workflow state.

## 2026-06-07 - Make Wallet Overlay Responsive

### Change
- Files touched:
  - `app/src/app/wallet-provider.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Wrapped the Mysten connect button with a small responsive enhancer.
  - Injected mobile-safe shadow-root styles into the connected-account menu and connect modal so the wallet overlay respects phone widths and short landscape heights.
  - Kept the existing wallet connect and signing logic unchanged.

### Reasoning
- Why this approach was chosen:
  - The wallet UI is rendered through web components, so normal app CSS cannot reach the overlay internals directly.
  - A targeted shadow-root style injection lets us fix the overlay sizing without replacing the Mysten connection flow or forking the wallet UI.
  - This keeps the responsiveness task scoped to presentation, as requested, while protecting the live demo path.

### Tech Debt
- Known shortcuts:
  - The responsive overlay patch depends on the current Mysten component structure and shadow roots remaining compatible.
- Follow-up needed:
  - If dApp Kit later exposes richer styling hooks or parts for the account menu and modal, replace the injection approach with the official API.

## 2026-06-07 - Clamp Mobile Wallet Account Menu

### Change
- Files touched:
  - `app/src/app/wallet-provider.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a mobile viewport clamp for the Mysten connected-account dropdown after the wallet package computes its floating position.
  - Forced the open account menu to use fixed positioning on narrow portrait screens so it stays inside the visible viewport.

### Reasoning
- Why this approach was chosen:
  - Resizing the dropdown alone did not fix portrait mode because the wallet package still positioned it from the topbar trigger.
  - Clamping after placement keeps the existing wallet UI and account switching behavior intact while preventing horizontal overflow.

### Tech Debt
- Known shortcuts:
  - The clamp watches the current shadow-root menu structure from dApp Kit.
- Follow-up needed:
  - Prefer a first-party placement option if Mysten exposes one in a future dApp Kit release.

## 2026-06-07 - Wrap Mobile Progress Details

### Change
- Files touched:
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Changed operation progress rows to use a grid layout so long labels and proof details can wrap.
  - Added a mobile portrait-friendly layout that moves progress details below the step label instead of squeezing them into the same row.

### Reasoning
- Why this approach was chosen:
  - Register progress can include long Walrus blob IDs and Sui digests, which should remain visible without breaking the card width.
  - Keeping the icon column fixed while allowing text columns to wrap preserves the existing progress structure and avoids touching flow logic.

### Tech Debt
- Known shortcuts:
  - Long values are still displayed inline rather than opening a copy/details drawer.
- Follow-up needed:
  - Consider adding copy buttons for full digests if the proof surface needs more mobile polish later.

## 2026-06-07 - Remove Shell-Level Mobile Horizontal Overflow

### Change
- Files touched:
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Changed the main app shell from `width: 100vw` to `width: 100%`.
  - Clipped horizontal overflow on the mobile shell containers so the off-canvas sidebar no longer widens the whole page.

### Reasoning
- Why this approach was chosen:
  - The horizontal scroll was coming from the shell itself, not only from inner content like the records table.
  - On mobile, `100vw` plus a translated sidebar drawer is enough to make the page wider than the visible viewport.

### Tech Debt
- Known shortcuts:
  - The records table still has its own independent horizontal scroll surface by design.
- Follow-up needed:
  - Revisit the records presentation later if we want to replace the table with a mobile-specific stacked layout.
