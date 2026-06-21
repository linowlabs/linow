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

## 2026-06-07 — Add Light-Mode Landing Page with Web3 Scroll

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Created a new light-mode glassmorphic landing page at the root route `/` using the existing mascot image `/mascot.png`.
  - Moved the original dark-mode evidence workspace dashboard to a dedicated route `/workspace`.
  - Integrated a premium Web3 scroll container driven by a high-performance, scroll-progress-driven animation handler.
  - Implemented card stacking transitions (scale, translateY, opacity, blur) for the 4 key evidence lifecycle steps, with the mascot scaling, tilting, and translating dynamically to guide the user.
  - Aligned all landing page copywriting and trust definitions directly with `README.md` and `docs/DESIGN.md` (e.g. "Hash. Prove.", "Agent proposes, human signs, chain proves").
  - Restricted CTAs to the top navigation bar and the bottom page section, keeping the Hero text-only.

### Reasoning
- Why this approach was chosen:
  - Scoping the landing page styling to `.landing-wrapper` and `landing.css` keeps it entirely separate from the dark-mode dashboard workspace, avoiding visual leakage.
  - Moving the dashboard code to `/workspace/page.tsx` is clean, maintains full compatibility with browser wallet context provider, and avoids monolithic component bloat.
  - Using direct CSS inline manipulations inside the `onScroll` handler via `requestAnimationFrame` achieves buttery smooth scroll-driven card stacking and mascot movement without standard React layout thrashing.

### Tech Debt
- Known shortcuts:
  - Mobile viewports fallback to a standard card stream layout rather than pinning scroll, which is safer for small portrait screens.
- Follow-up needed:
  - None. Both pages compile, render, and link perfectly.

## 2026-06-11 — Add Section Title to Stack UI Intro State

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added an introductory section title panel (`.stack-pane-intro`) with "How Linow Works" heading, description, and an animated bouncing scroll indicator to the right-side pane of the Stack UI.
  - Programmed the scroll-progress-driven animation handler (`animateCards`) to dynamically fade out, translate up, and apply a Gaussian blur to the intro panel as the user scrolls past the initial viewport stage (`progress` 0.05 to 0.22), seamlessly handing over to the first architecture layer card.

### Reasoning
- Why this approach was chosen:
  - The right-side pane of the scroll animation was empty when first scrolling into view (activeLayer = 0). Adding an introductory title informs the user of what they are looking at and prompts them to scroll down.
  - Applying custom CSS transforms and opacity in the high-performance `requestAnimationFrame` loop ensures that the title replaces the subsequent cards with high frame rate and zero layout thrashing.

### Tech Debt
- Known shortcuts:
  - The transition boundaries are hardcoded in the progress tracking loop.
- Follow-up needed:
  - None. Both compile and transition states are verified to function correctly in the browser.

## 2026-06-12 — Redesign Landing Page

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Completely redesigned the landing page with premium dark glassmorphism.
  - Replaced the SVG server rack scenes in the hero with a full-bleed scenic backdrop placeholder (`/hero_bg.png`).
  - Added a detailed mock workspace browser preview inside the hero header.
  - Redesigned the 3D isometric stack to utilize clean, thin-bordered glassmorphism (no neon glows).
  - Created a multi-column Source Confidence Roadmap board mapping L0 to L5 levels (Integrity & Time, Attestation Trail, Automated Continuous Proof).
  - Built a comparative grid comparing Legacy Shared Drives, Stateless AI Agents, and the Linow Workspace.
  - Cleaned up explicit scroll instructions for a cleaner, implicit flow.

### Reasoning
- Why this approach was chosen:
  - Dark-mode glassmorphism matches the main workspace design system, making the app feel unified and professional.
  - Creative layouts inspired by `getmodern.ai` and other modern reference designs improve readability and help show the product value at a glance.
  - Thin border detailing provides a high-end, high-precision technical feel without relying on distracting colors.

### Tech Debt
- Known shortcuts:
  - The background image references a placeholder `/hero_bg.png` that the user will drop into the `public/` directory.
- Follow-up needed:
  - None. Both compile and transition states are stable.

## 2026-06-12 — Light Mode Theme and Font Selection

### Change
- Files touched:
  - `app/src/app/layout.tsx`
  - `app/src/app/globals.css`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Transitioned the landing page styling to a warm, clean light-mode canvas (`#faf9f6`), aligning with getmodern.ai and other modern reference layouts.
  - Configured the background placeholder to point to the newly added `/hero.png` asset.
  - Imported and integrated Google's Geist Sans (`Geist`) font as the primary sans-serif font family of the application.
  - Overhauled styles for the mock browser preview, isometric 3D scroll layers, Source Confidence columns, and comparative grids to utilize light glassmorphism and high-contrast dark slate typography.

### Reasoning
- Why this approach was chosen:
  - Light mode matches the premium, clean, illustrative look requested.
  - Geist Sans provides a sleek, modern, and highly legible typeface choice that elevates the design system.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - Verify that the layout hot-reloads cleanly.

## 2026-06-12 — Refine Hero Gradient, Navbar Glass Buttons, and Layout

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Squeezed and optimized the bottom gradient overlay on the hero section to prevent the background image from being washed out with white (gradient mask starts fading into off-white only at 82%).
  - Formatted the transparent navbar to include premium glassmorphic rounded rectangle buttons (`border-radius: 8px`, `backdrop-filter: blur(12px)`, subtle shadows, thin white borders, and vertical separator divider lines) matching the user reference design.
  - Grouped the right-hand actions and added a dedicated glass "Log in" button next to "Launch Workspace".
  - Configured scrolled navbar transitions to morph glass buttons into solid or text counterparts (solid dark slate button for "Launch Workspace", clean plain text link for "Log in") over a clean solid white scrolled header background.
  - Placed the mock browser preview in the dedicated "Meet Linow" section with the exact requested copy.

### Reasoning
- Why this approach was chosen:
  - Restricting the white gradient overlay to the bottom edge keeps the `/hero.png` background image crisp and vibrant, matching the layout style of the design references.
  - Glass buttons inside the transparent navbar provide both design contrast and text legibility on the scenic background.
  - Transitioning the glass buttons into simple text links and solid buttons on scroll maintains high readability without cluttered containers on the solid white navbar.

### Tech Debt
- Known shortcuts:
  - Programmatic scroll position scrolling in browser testing scripts does not fire standard window scroll triggers; however, manual mouse wheel and swipe interactions trigger the transitions cleanly.
- Follow-up needed:
  - None. Both pages compile, render, and link perfectly.

## 2026-06-12 — Remove Lift-on-Hover, Scrolled Navbar Shadow, and Section Divider Line

### Change
- Files touched:
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Removed the bottom box shadow from the scrolled navigation bar state, replacing it with a clean, thin, modern `border-bottom: 1px solid rgba(0, 0, 0, 0.06)` line.
  - Removed the thin grey section divider line (`border-top: 1px solid rgba(0, 0, 0, 0.02)`) between the bottom of the hero backdrop and the top of the "Meet Linow" section, making the layout flow seamlessly.
  - Disabled all lift-on-hover translation styles (`transform: translateY(...)`) across all buttons, navigation links, roadmap cards, and comparative cards.

### Reasoning
- Why this approach was chosen:
  - Shadows on scrolled elements can look dated; replacing them with a crisp thin line matches modern flat-glass web designs.
  - Removing section divider lines allows full-bleed hero assets to flow more naturally into the layout canvas.
  - Disabling physical translation lifts on hover results in a cleaner, more stable, and less "AI-generated template" feeling.

## 2026-06-13 — Recall prior audit memory for gap analysis (B side only)

### Change
- Files touched:
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `docs/DEVLOG-APP.md`
- Summary:
  - In the B-side gap analysis route, call recallPriorAuditMemory (from @linow/sdk/memwal) for the pack_id before running the groq gap tool.
  - Inject recalled prior texts into input.pack_notes (prior memories become part of the gap analysis input/prompt).
  - Return recalled_prior_count in the response (for demo UI to display "used X prior from previous session").
  - This makes gap analysis continue from persisted MemWal memory even after page refresh or new session.
  - Storage was already wired in orchestrate route (previous); this adds the recall+use for gap specifically.
  - No edits to lib/agent/ (A side untouched).

### Reasoning
- Why this approach was chosen:
  - Fulfills "Recall previous evidence/finding memory and use it to continue gap analysis after refresh or new session" on B side.
  - The gap route is the B entrypoint for standalone gap calls (and used in flows).
  - Injecting to pack_notes ensures the prior is passed into the analysis without touching core prompt builders.
  - Proves persistence: MemWal recall works across sessions because memories are in Walrus (portable).

### Tech Debt
- Known shortcuts:
  - Relies on pack_notes being included in the gap prompt (per GapAnalysisToolInput usage).
  - Dummy keys return no prior (graceful).
- Follow-up needed:
  - Real keys + UI display of recalled count in gap results or activity feed.
  - Verify in full orchestrate flow that gap sees prior.

## 2026-06-13 — Recall prior for gap + UI demo button (B side)

### Change
- Files touched:
  - `app/src/app/api/agent/analyze-gaps/route.ts`
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - In gap route: recall prior, inject to pack_notes before tool call, return recalled count.
  - Added demo button in workspace records view: after store+refresh, click calls gap API (which recalls), alerts count >0 proving persistence and use in gap analysis.
  - UI change is small patch in existing records section.

### Reasoning
- Why this approach was chosen:
  - Makes the "after refresh or new session" recall+use visible in the workspace (B) for the demo.
  - Button triggers the flow that exercises the recall in gap route.
  - Proves deliverable without A changes or big UI rewrite.

### Tech Debt
- Known shortcuts:
  - Button is demo-only; real integration would be automatic in gap calls and show in results.
- Follow-up needed:
  - Real keys to make count >0 in live demo.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None. Clean interactions verified.

## 2026-06-12 — Redesign 3D Architecture Stack & Cards (Hyperliquid Inspired)

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Completely overhauled the 3D isometric stack architecture in the scroll panel. Replaced the single plate slabs with a side-by-side intermediate block structure (Crypto Core & TX Builder) and 4 tall vertical skyscraper towers representing User Applications and Attestation (Workspace UI, MemWal, Signer, Walrus Portal).
  - Placed rotated monospace text labels along the left side face of the skyscrapers (e.g. "WORKSPACE UI", "MEMWAL INDEXER", etc.) that automatically light up in blue (`#2563eb`) when active.
  - Programmed active layers to float upward along the Z-axis (Consensus & Storage base floats to `~8px`, Middle blocks float to `~24px`, and skyscrapers float to `~48px`) creating a separated floating plate space animation.
  - Added monospace technical metadata tags (`Commitment: SHA-256`, `Encryption: AES-256-GCM`, `Contract: EvidenceRecord.move`, etc.) to the bottom of the scroll cards that display only when active.

### Reasoning
- Why this approach was chosen:
  - A side-by-side and vertical skyscraper composition makes the architecture stack feel complex, structured, and realistic, drawing direct inspiration from high-fidelity tech stacks like Hyperliquid.
  - Vertical monospace labels along the faces of the skyscraper towers fit the technical engineering tone of audit commitments.
  - Monospace tech metadata specs at the bottom of active scroll cards align the copy with the verifiable audit agent theme and make the scrolling step cards feel like a cohesive technical spec sheet.

### Tech Debt
- Known shortcuts:
  - Sibling blocks and towers are grouped inside container divs that hold the React refs, keeping the scrolling script intact without changing ref selection hooks.
- Follow-up needed:
  - None. Both pages compile, render, and link perfectly.
## 2026-06-12 — Overhaul Scrolling Stack to 3-Level Vertical Layout & Fix Mobile Responsiveness

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Redesigned the scrolling system architecture section from a two-column grid into a unified single-column, 3-level vertical layout: Level 1 (Section Header), Level 2 (3D Stack Display), and Level 3 (Explanation Cards).
  - Simplified scroll explanation cards by removing all coordination telemetry, terminal borders, CAD ticks, and dot-leader grid rules to focus purely on "point & description" text.
  - Centered cards horizontally and aligned all levels matching the "Meet Linow" style.
  - Fixed mobile responsive layout below 768px in `landing.css` by updating selectors (`.sticky-layout-vertical`, `.stack-display-pane`, and `.stack-explanations-pane`) to resolve mismatched classes.
  - Collapsed and hid the 3D stack dynamically on mobile while rendering the intro description and explanation cards statically in sequence.

### Reasoning
- Why this approach was chosen:
  - Stacking Level 2 and Level 3 vertically in a single column simplifies the layout, improves readability, and makes scroll transitions feel unified.
  - Updating the responsive media queries prevents layout overlaps and broken column flows on smaller viewport devices.
  - Making cards and the intro pane static on mobile ensures they display correctly without relying on scroll-triggered transforms that would fail on auto-height layouts.

### Tech Debt
- Known shortcuts:
  - Left/right centering of cards uses absolute horizontal positioning over custom js translations since JS dynamically overrides transforms on active cards.
- Follow-up needed:
  - None. Clean interactions and vertical alignment verified on mobile and desktop.

## 2026-06-13 — Store agent outputs in MemWal (B side only)

### Change
- Files touched:
  - `app/src/app/api/agent/orchestrate/route.ts`
  - `docs/DEVLOG-APP.md`
- Summary:
  - In the B-side (app) orchestrate API route, after obtaining the agent orchestration result, call storeAgentOutputsInMemWal from @linow/sdk/memwal (imported via the subpath).
    Uses staging client (env keys or dummy) and stores under engagement namespace.
    Wrapped in try/catch to protect the demo response path.
  - Did not edit any files under app/src/lib/agent/ (A side / agent work untouched).
  - Added corresponding DEVLOG-APP.md entry.

### Reasoning
- Why this approach was chosen:
  - Fulfills "Store agent outputs in MemWal" on B side (app/sdk/web3) per user instruction.
  - The route is the natural post-orchestration point where full result (documents with classification/source_confidence, findings, audit_pack_summary, gap_analysis) is available.
  - Uses the store helper added in SDK memwal.ts.
  - Namespace per pack_id as "one engagement namespace".
  - Outputs become portable Walrus Memory entries via MemWal.
  - Error handling ensures main agent API still succeeds even if MemWal storage is not configured.

### Tech Debt
- Known shortcuts:
  - Dummy keys mean storage is best-effort in current spike/demo (will warn on 401).
  - Stores raw JSON of outputs; future could hash or summarize.
- Follow-up needed:
  - Set real MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID in env for working demo storage.
  - In workspace UI, add recall of these memories to show "agent remembered" in the activity feed (as per DEMO.md).
  - Once working, integrate namespace with actual AuditPack for cross-linking.

## 2026-06-13 — Update Workspace Package Default

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Updated the workspace fallback Sui package ID from the old evidence-only package to the latest deployed package containing `evidence`, `audit_pack`, and `agent_action`.

### Reasoning
- Why this approach was chosen:
  - If `NEXT_PUBLIC_LINOW_PACKAGE_ID` is not set, the app should still target the package that matches the current SDK and Move surface.
  - This keeps the live register/verify/attest flow from silently calling stale testnet code.

### Tech Debt
- Known shortcuts:
  - The workspace still needs a first-class AuditPack UI rather than only using the latest package for the legacy register/verify/attest flow.
- Follow-up needed:
  - Wire pack creation and batch evidence registration in the workspace branch.

## 2026-06-15 — Redesign Workspace to Light Glassmorphism Style

### Change
- Files touched:
  - `app/src/app/globals.css`
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Redesigned the entire workspace dashboard UI (`/workspace`) to use the light warm glassmorphism style of the landing page.
  - Replaced the dark background with the warm off-white canvas `#faf9f6` accompanied by grid lines and subtle radial gradients.
  - Refactored UI variables to support high-contrast dark slate typography and clean borders.
  - Updated panels, cards, inputs, selects, tables, buttons, and status badges to match the wireframe & light glassmorphic aesthetic.
  - Removed hover translation lift (`translateY`) to ensure stable visual components.

### Reasoning
- Why this approach was chosen:
  - Light mode matches the clean, high-fidelity premium design tone established on the landing page.
  - Glassmorphic panels with subtle blur and thin borders feel precise and professional for audit workflows.
  - Patched files incrementally without modifying any application logic or routing.

### Tech Debt
- Known shortcuts:
  - None. Both local build and integration verify cleanly.
- Follow-up needed:
  - None. Redesign fully aligned.

## 2026-06-16 — Remodel Workspace as Audit IDE Shell

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Rebuilt `/workspace` around the IDE-style shell from `docs/IMPROVED_WORKSPACE_MODEL.md`: left rail, explorer/settings sidebar, central selected-object content, bottom details/status panel, and right contextual agent panel.
  - Added local-memory document explorer with status colors for local-only, registering, registered, attested, and blocked/mismatch states.
  - Wired existing SDK flows into the new shell: AuditPack creation, single evidence registration with optional `auditPackId`, verification, and reviewer attestation.
  - Wired the agent panel to the existing `/api/agent/orchestrate` route for browser-readable text-like files and displays memory/action candidate output honestly.

### Reasoning
- Why this approach was chosen:
  - The Sui Overflow workspace needs to present AuditPack, evidence, agent output, memory, and proof artifacts as one coherent workbench rather than separate upload/verify/attest tabs.
  - The remodel preserves the current light wireframe/glassmorphism design system while making the product feel closer to the long-term local audit IDE direction.
  - Existing SDK and agent logic were reused without changing SDK or agent internals.

### Tech Debt
- Known shortcuts:
  - Batch evidence registration is prepared in the explorer/state model but still submits one selected file at a time.
  - Browser agent analysis reads text-like files via `File.text()`; PDF, DOCX, and XLSX browser extraction still need upload/ingestion wiring.
  - AgentAction candidates are displayed for human approval, but on-chain AgentAction submission is not wired into the UI because the current public SDK flow does not return full tx/event proof detail.
- Follow-up needed:
  - Add a reliable batch registration loop that registers selected local files with the active `auditPackId`.
  - Add browser upload ingestion or extraction support for non-text evidence before claiming full document agent analysis.
  - Harden SDK AgentAction return shape before showing event-level proof in the bottom panel.

## 2026-06-16 — Add Agent Instruction Context

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added an "Additional audit instruction" textarea to the workspace agent panel.
  - Passed the instruction into `/api/agent/orchestrate` as `pack_notes` so the existing structured workflow can use custom audit context.
  - Labeled the control as workflow context rather than chat to avoid overstating current agent capabilities.

### Reasoning
- Why this approach was chosen:
  - The current agent orchestration accepts pack/document context, so a guided instruction field is useful without requiring a new chat route.
  - This preserves the "agent proposes, human signs, chain proves" boundary and avoids implying open-ended autonomous behavior.

### Tech Debt
- Known shortcuts:
  - This is not a conversational chatbot; it is custom context for a structured analysis run.
- Follow-up needed:
  - Add a real pack-aware chat route later if the product needs conversational Q&A over evidence and memory.

## 2026-06-16 — Workspace Redesign Visual Tweaks and Header Cleanup

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Removed the unused sidebar collapse button from the topbar.
  - Linked workspace rail button click actions to auto-expand the sidebar, improving mobile/tablet navigation.
  - Added a vertical margin between the "Add document" button and the "Status colors" block in the sidebar footer.
  - Aligned spacing between the main folders (Evidence, Findings, Proof) by adding flex gaps to the sidebar section and reducing nested tree-group vertical margins.
  - Cleaned up dead CSS rules related to `.sidebar-toggle`.

### Reasoning
- Why this approach was chosen:
  - The collapse button is redundant in the remodeled IDE design where rail panel toggle behavior dominates.
  - Adding flex layout gaps ensures consistent vertical spacing whether folders contain children or not.
  - Follows the boy scout rule by immediately purging dead toggle CSS rules.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.

## 2026-06-16 -- Gate Batch Register On Complete Evidence Drafts

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added selected-evidence readiness checks for type, source, description, and assertions before enabling `Register selected`.
  - Persisted local document draft edits from the individual evidence form back onto the selected local file.
  - Rewired `Register selected` to use the SDK batch registration flow, producing one Sui transaction/signature for the selected evidence batch.

### Reasoning
- Why this approach was chosen:
  - Batch registration should only run once every selected evidence item has enough metadata for the audit record.
  - The old UI showed edited fields, but batch registration still read the original local document state for some fields.
  - One batch transaction matches the expected wallet UX better than asking the user to sign one registration per selected file.

### Tech Debt
- Known shortcuts:
  - Batch registration is now all-or-nothing at the Sui transaction step; failed batches mark all selected local items as failed.
- Follow-up needed:
  - Consider showing per-file preflight status for Walrus upload progress if demo files become larger.

## 2026-06-16 -- Make AuditPack Status Informational

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Removed the manual `Create AuditPack` button from the Evidence header.
  - Added a read-only AuditPack status indicator that shows either `No AuditPack created` or the active pack id.
  - Kept AuditPack creation inside the first individual or batch registration flow, then reused the pack for later registrations in the same workspace session.

### Reasoning
- Why this approach was chosen:
  - AuditPack behaves like the current audit workspace/session container, so creating an empty pack before evidence exists is not useful in the demo flow.
  - Registration is the natural point where a pack becomes necessary, and the existing reuse logic already supports later evidence additions.

### Tech Debt
- Known shortcuts:
  - There is still no explicit `New AuditPack`/`Start new engagement` action for intentionally changing sessions.
- Follow-up needed:
  - Add an explicit new-engagement control when role/account-backed workspaces and persistence are introduced.

## 2026-06-16 -- Clarify Batch Register Readiness

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Changed `Register selected` so incomplete selected metadata no longer silently disables the button.
  - Added a selected evidence readiness count beside the batch selection count.
  - Marked selected local rows with missing draft info as `Needs details`.

### Reasoning
- Why this approach was chosen:
  - Wallet connection is only one requirement; selected evidence also needs complete type, source, description, and assertions before batch registration.
  - Letting the button click reach the existing guard makes the blocker visible instead of making the UI look broken.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.

## 2026-06-16 -- Add Registration Draft Save Action

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a compact `Save draft` button to the Registration Draft header.
  - Added a saved-state message confirming that the visible draft fields are stored for batch registration.

### Reasoning
- Why this approach was chosen:
  - Batch registration reads per-file local draft state, so users need an explicit way to confirm the current file's type, source, description, and assertions are saved.
  - The form still auto-syncs edits, but the button makes the workflow clearer during demo prep.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.

## 2026-06-16 -- Consolidate AuditPack Evidence Explorer Section

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Wrapped the batch selection toolbar, prerequisite copy, batch status, file list, and batch registration note inside one evidence explorer section.
  - Replaced separate dashed note/card treatment with inline section notes and a compact batch summary style.

### Reasoning
- Why this approach was chosen:
  - The AuditPack evidence explorer should read as one file list surface instead of multiple stacked sections.
  - Keeping file rows as individual selectable list items preserves the explorer behavior while reducing visual fragmentation.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.

## 2026-06-16 -- Unblock Batch Register From Explorer

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Batch register now auto-creates an AuditPack when the explorer has selected files but no pack yet.
  - Surfaced `registerError` directly inside the evidence explorer so failed clicks no longer look silent.
  - Passed the active AuditPack id explicitly through the batch register helper so newly created packs are linked immediately during the same action.

### Reasoning
- Why this approach was chosen:
  - The register action should work from the explorer flow without forcing a separate manual pack-creation step first.
  - React state for `auditPack.id` can lag right after creation, so the batch path should use the created id directly instead of relying on a later re-render.

### Tech Debt
- Known shortcuts:
  - Batch registration still submits evidence sequentially, so the user will sign multiple transactions in a row during the demo path.
- Follow-up needed:
  - Consider whether single-file register should also auto-create a pack when the workspace is explicitly in AuditPack mode.

## 2026-06-16 -- Unblock Single Evidence Register Button

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Updated the local document `Register Evidence` button flow to create an AuditPack automatically when one does not exist.
  - Passed the active AuditPack id directly into `registerEvidenceDraft` so the newly created pack is linked during the same click.
  - Added the AuditPack creation step to single-file registration progress.

### Reasoning
- Why this approach was chosen:
  - The workspace is now pack-centric, so single-file registration from an uploaded local file should not depend on a separate manual pack creation step.
  - Using the local `activeAuditPackId` avoids waiting on React state after pack creation before the evidence registration transaction is prepared.

### Tech Debt
- Known shortcuts:
  - Single-file registration still uses the current local document draft fields rather than a per-file persisted draft editor.
- Follow-up needed:
  - Persist edited per-file draft fields back onto the local document list before registration if reviewers need file-by-file metadata edits in the explorer.

## 2026-06-16 -- Make Single Register Guard Visible

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Changed the local document `Register Evidence` button so it is disabled only while registration is already running.
  - Moved role and wallet checks into `handleRegister` so blocked registration attempts show an explicit error message.

### Reasoning
- Why this approach was chosen:
  - The form can be complete while the button is still disabled by wallet or role state, which makes the UI look broken.
  - Keeping guards in the handler preserves the company-owned registration rule while making the reason visible to the user.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.

## 2026-06-16 -- Restore Single Register Disabled State

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Restored the local document `Register Evidence` button disabled state for disconnected wallet, non-company role, empty assertions, and in-flight registration.

### Reasoning
- Why this approach was chosen:
  - The disabled button was expected behavior when no Sui wallet is connected.
  - The handler-level guards remain as a backup, but the UI should still communicate unavailable actions before signing is possible.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.

## 2026-06-16 -- Hide Promoted Local Evidence Rows

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a `visibleLocalDocuments` view that hides local upload rows once they have been registered and linked to an evidence object.
  - Updated the Evidence tab, sidebar evidence tree, readable evidence count, and agent source list to use the promoted-record view.

### Reasoning
- Why this approach was chosen:
  - A registered upload should behave as one evidence entity in the workspace, with the registered record becoming the canonical row.
  - Keeping the local file in memory still supports verification, but rendering both the local row and registered metadata row made the evidence list look duplicated.

### Tech Debt
- Known shortcuts:
  - The registered record is still session-local UI state, so a page refresh will not restore the promoted record until persistence/history loading is wired.
- Follow-up needed:
  - Load existing AuditPack evidence from chain/API history when entering the workspace.

## 2026-06-16 -- Keep Evidence Folder After Upload

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Changed local document upload behavior so adding files keeps the main workspace on the Evidence folder instead of opening the first uploaded file.
  - New uploads are still selected for batch registration automatically.

### Reasoning
- Why this approach was chosen:
  - Batch evidence upload should make the newly added local document set visible immediately.
  - Opening the first uploaded file hid the rest of the selected batch and made multi-file registration feel less clear.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.

## 2026-06-16 — Add AuditPack Batch Evidence Registration

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added selectable local evidence rows in the AuditPack evidence explorer.
  - Added batch controls for selecting all local files, clearing selection, and registering selected files.
  - Refactored the single-file registration path into a shared helper so both single and batch registration use the same SDK hash/encrypt/Walrus/Sui flow.
  - Batch registration now runs sequentially and passes the active `auditPackId` into every `createRegisterEvidenceFlow` call.
  - Added batch progress, partial failure status, per-file failure marking, and proof view listing for AuditPack-linked evidence records.

### Reasoning
- Why this approach was chosen:
  - AuditPack represents one pack/engagement containing many evidence records, so batch registration should create many `EvidenceRecord`s linked back to the same pack.
  - Sequential registration is safer for wallet signing and easier to demo/debug than parallel transaction submission.
  - Reusing the existing registration helper protects the proven single-file demo path while extending it to batches.

### Tech Debt
- Known shortcuts:
  - Batch registration requires an already-created AuditPack rather than auto-creating one inside the batch action.
  - If one file fails, the batch continues and marks that file red; there is no retry queue beyond reselecting the failed file.
  - The pack link is currently through `registerEvidence({ auditPackId })`; the UI does not call extra `audit_pack::add_evidence` mutation helpers.
- Follow-up needed:
  - Add retry affordances for failed batch items if demo testing shows wallet/network flakiness.
  - Consider exposing explicit AuditPack mutation helpers later if the proof model needs on-chain pack-side evidence vectors updated separately.

## 2026-06-16 — Fix Sidebar Folder Spacing Consistency

### Change
- Files touched:
  - `app/src/app/globals.css`
- Summary:
  - Defined the `.sidebar-folder-group` CSS class with flex column layout and a 2px gap to correctly layout the folder button and its children list.
  - Reset `.tree-group` vertical margins to 0 (changing margin from `2px 0 2px 0.65rem` to `0 0 0 0.65rem`).

### Reasoning
- Why this approach was chosen:
  - Previously, `.tree-group` had vertical margins (`margin: 2px 0 2px 0.65rem`) and `.sidebar-folder-group` lacked visual layout styles (making it behave as a block element). This resulted in an extra bottom margin pushing down the sidebar folder groups when expanded, causing an inconsistent gap (12px vs 10px) between folders.
  - Removing these vertical margins and letting the layout gap be managed entirely by the flexbox layout of `.sidebar-folder-group` (2px internally between folder button and children list) and `.sidebar-section` (10px gap between folders) ensures mathematically consistent y-axis spacing.

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.

## 2026-06-17 -- Render Workspace Agent Outputs

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Parsed the agent orchestration `response_mode: "workspace"` payload into a UI-facing review model.
  - Added per-document agent review panels for classification, source confidence, metadata hints, and assertion mapping.
  - Upgraded the Findings workspace into an audit-readiness review surface with readiness score, covered/missing assertions, recommendations, and C-C-C-E-R finding fields.
  - Expanded the right agent panel and bottom status tabs to show reviewed documents, findings, memory artifact IDs, and prepared approval candidates without claiming on-chain submission.

### Reasoning
- Why this approach was chosen:
  - The app-side workspace task is to consume the agent workspace contract already provided by the route, so the app should render the structured response instead of adding new agent or SDK behavior.
  - The copy keeps Linow's boundary clear: the agent proposes and prepares output hashes, but a human still has to approve/sign before the chain proves anything.

### Tech Debt
- Known shortcuts:
  - AgentAction signing/logging is still not wired from this approval queue; it remains a prepared-only UI until the approval logging feature.
  - Memory fallback/proof UX is only surfaced from the returned status fields; the dedicated memory proof flow still needs to be wired into the workspace.
- Follow-up needed:
  - Add explicit approve/log controls once the AgentAction proof return is hardened.
  - Add a clearer memory fallback panel when the memory proof flow moves into the workspace.

## 2026-06-17 -- Fix Workspace Agent Profile

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Changed the workspace agent orchestration request from the old `sui_overflow_demo` profile to the supported `balanced` profile.

### Reasoning
- Why this approach was chosen:
  - The agent route validates `profile` against `cheap`, `balanced`, and `full`; using `balanced` keeps the judge-facing workspace on the normal rich analysis path without triggering a 400.

### Tech Debt
- Known shortcuts:
  - The workspace does not yet expose a runtime profile picker.
- Follow-up needed:
  - Consider adding a small settings control for `cheap`/`balanced`/`full` if demo iteration needs faster runs.

## 2026-06-19 -- Add Walrus Memory Reload Proof

### Change
- Files touched:
  - `app/src/app/api/walrus/memory/reload/route.ts`
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added an app-owned Walrus memory reload API that reads encrypted memory manifest and agent artifact blobs through the SDK read helpers.
  - The route decrypts server-side with `LINOW_AGENT_MEMORY_ENCRYPTION_KEY` and returns only safe summary counts instead of raw agent memory content.
  - Added a workspace Memory tab action to reload the direct Walrus fallback artifact and display pack, evidence-ref, output-hash, finding-hash, document, and finding counts.
  - Added explicit copy that the reload proves encrypted Walrus artifact availability/decryptability, not document truth.

### Reasoning
- Why this approach was chosen:
  - The memory proof flow needs a demo-visible save/reload path without changing agent logic.
  - The SDK already had encrypted Walrus read helpers, so the app only needed a server-side route to protect the memory key and a small workspace proof surface.

### Tech Debt
- Known shortcuts:
  - The reload button proves direct Walrus fallback artifacts, while MemWal semantic recall remains represented by the existing orchestration recall status.
  - The route returns counts and identifiers only; a richer memory inspector can be added later if reviewers need per-artifact drilldown.
- Follow-up needed:
  - Connect this memory reload result into the larger proof dashboard/export surface.

## 2026-06-19 -- Wire AgentAction Approval Logging

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added workspace state for approved/logged AgentAction candidates.
  - Added `Approve & log` controls to the agent Approval Queue.
  - Wired the controls to `createEmitAgentActionFlow`, using the connected wallet for signing and the existing server Tatum execute route for submission.
  - Added chain/proof display for AgentAction tx digest, event type, event sequence, output hash, signer, and event/object counts.

### Reasoning
- Why this approach was chosen:
  - AgentAction logging belongs at the human approval boundary: the agent prepares hash-only candidates, then the connected user explicitly signs the on-chain event.
  - The UI preserves Linow's boundary by logging only approved output hashes and event metadata, never private agent text.

### Tech Debt
- Known shortcuts:
  - The workspace currently shows the latest logged AgentAction in the chain panel; the proof dashboard can turn the log list into a fuller evidence trail.
  - Role separation is still light-touch until the company/auditor two-wallet flow is formalized.
- Follow-up needed:
  - Rehearse with a live wallet after a fresh agent run to confirm the emitted event shape from testnet matches the displayed summary.

## 2026-06-19 -- Add Shared Demo Engagement Persistence

### Change
- Files touched:
  - `app/src/lib/demo-store.ts`
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/supabase_shared_demo_schema.sql`
  - `.env.example`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added optional Supabase REST/Storage helpers for shared web PoC engagements without adding a new package dependency.
  - Added a Supabase schema for demo engagements, evidence files, attestations, and AgentAction proof metadata.
  - Added Settings controls to create/load a shared engagement, assign company/auditor wallets, and open the same engagement across browsers.
  - Synced synthetic demo evidence files to Supabase Storage and proof metadata to Supabase tables after registration, attestation, and AgentAction logging.
  - Added light role guardrails so company wallet actions and auditor wallet actions are visibly separated in the shared demo flow.

### Reasoning
- Why this approach was chosen:
  - The shared reviewer demo needs a two-browser/two-wallet flow, which session-local state cannot support.
  - Supabase is scoped as web PoC persistence for synthetic demo files and proof metadata; the production direction remains desktop/local-first.

### Tech Debt
- Known shortcuts:
  - The Supabase policies in `docs/supabase_shared_demo_schema.sql` are permissive PoC policies for synthetic demo data only.
  - The workspace rehydrates enough file/evidence state for the demo, not a full production engagement model.
- Follow-up needed:
  - Use the export and proof-dashboard work to make the loaded engagement surfaces more complete and judge-facing.

## 2026-06-19 -- Add Verifier Export Rail

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a dedicated workspace rail for verifier export instead of burying the flow inside the proof panel.
  - Generated a portable JSON proof summary with engagement wallets, AuditPack/package refs, evidence commitments, Walrus blob refs, attestation summaries, memory artifact refs, AgentAction logs, and current verification status.
  - Added copy/download actions plus an explicit limitations panel so the export does not imply document truth or audit sufficiency.
  - Kept raw evidence bytes out of the export.

### Reasoning
- Why this approach was chosen:
  - A separate verifier/export rail makes the judge and third-party review story easier to demo without changing the core evidence workspace.
  - JSON is the smallest useful compliance-export shape for the web PoC because it can travel outside the app while preserving chain and storage references.

### Tech Debt
- Known shortcuts:
  - The export is generated client-side from the current loaded workspace state.
  - The export is not yet cryptographically signed as a report artifact.
- Follow-up needed:
  - Add a verifier import/check path and consider storing signed export manifests as durable artifacts once the proof dashboard stabilizes.

## 2026-06-19 -- Add Judge-Facing Proof Dashboard

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a Proof Dashboard view inside the verifier/export rail.
  - Displayed chain anchors, AuditPack refs, EvidenceRecord IDs, commitments, Walrus blob IDs, attestation refs, AgentAction tx/event refs, and memory artifact refs in a readable inspector surface.
  - Added explicit per-evidence labels for commitment match, mismatch, or not checked in this browser session.
  - Added dashboard copy that preserves Linow's limits: integrity and lifecycle proof, not document truth or audit sufficiency.

### Reasoning
- Why this approach was chosen:
  - Judges and external reviewers need a quick proof surface before inspecting the raw JSON export.
  - The dashboard uses existing workspace state only, so it does not change the SDK, agent, or on-chain behavior.

### Tech Debt
- Known shortcuts:
  - Verification status is based on the latest browser-session verification result, not a persisted per-record verification history.
  - The dashboard is read-only and generated from loaded workspace state.
- Follow-up needed:
  - Add persisted verification history if the shared reviewer flow needs a durable record of every local hash check.

## 2026-06-19 -- Surface Seal Privacy Decision (SO-29)

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a "Privacy & Access" card to the proof dashboard showing live privacy status and the Seal access-gating roadmap.
  - Shows three active protections (AES-256-GCM evidence encryption, MemWal/Seal agent memory encryption, no plaintext on-chain) and one roadmap item (Seal `seal_approve` policy for owner/auditor access-gated decryption).
  - Includes an explicit deferral note explaining why full Seal integration is not in the current demo: SDK maturity, key server config, package redeploy risk.
  - Added CSS for `.privacy-status-list` and `.privacy-status-row` with active (turquoise tint) and roadmap (amber tint) visual states.

### Reasoning
- Why this approach was chosen:
  - SO-29 says "Seal implemented or explicitly deferred." After assessing Seal's SDK maturity, key server requirements, and wallet session signing complexity, full integration was deferred.
  - A visible privacy card in the proof dashboard makes the deferral explicit and judges can see what privacy protections are active vs planned.
  - The card does not overclaim: it clearly labels AES as the current mechanism and Seal as roadmap.
  - This avoids half-integrating Seal and accidentally breaking the demo path 2 days before the deadline.

### Tech Debt
- Known shortcuts:
  - The privacy card is static display; it does not query Seal status dynamically because Seal is not integrated.
- Follow-up needed:
  - When Seal SDK stabilizes, replace the roadmap row with a live Seal status indicator and add the Move `seal_approve_audit_pack` policy.

## 2026-06-19 -- Add Walrus Retention Status Display (SO-30)

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/globals.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Added a "Walrus Storage & Retention" card to the proof dashboard.
  - Shows network (Walrus Testnet), retention model (epoch-based), evidence blob count, and memory artifact count.
  - Includes a clear testnet retention disclaimer: epoch-based retention is not guaranteed for production.

### Reasoning
- Why this approach was chosen:
  - SO-30 says "retention awareness visible but not overbuilt." The card shows just enough for judges to understand the storage model without adding API calls or complex retention tracking.
  - Blob counts are derived from existing workspace state (registry and agent persistence refs), so no new data fetching is needed.
  - The testnet disclaimer is important per AGENTS.md: do not overclaim.

### Tech Debt
- Known shortcuts:
  - Retention metadata is static ("epoch-based") rather than queried from Walrus. Testnet does not expose per-blob expiry timestamps.
- Follow-up needed:
  - When Walrus production provides retention metadata APIs, replace static labels with live blob retention/expiry data.

## 2026-06-19 -- Fix Workspace Chat Panel Build

### Change
- Files touched:
  - `app/src/app/workspace/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Restored the missing function close after the proof dashboard renderer so the workspace page parses again.
  - Removed stale commented registration code that duplicated the live registration helpers.
  - Preserved the updated chat-style AI Co-Auditor panel and fixed the batch registration result shape by restoring source confidence.

### Reasoning
- Why this approach was chosen:
  - The build failure was caused by a missing renderer boundary, not by the chat panel behavior itself.
  - Removing dead commented code keeps the file easier to parse and matches the project hygiene rule.

### Tech Debt
- Known shortcuts:
  - The chat panel still uses inline style objects in the new UI blocks.
- Follow-up needed:
  - Move the chat panel styling into `globals.css` when polishing the workspace layout.

## 2026-06-20 — Landing Page Copywriting Polish

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Polished landing page copywriting to align with professional auditing standards (ISA 500), the Company vs. Auditor dual-role workflow, and cryptographic evidence registry concepts.
  - Replaced marketing buzzwords and AI-slop terminology with precise technical terms.
  - Updated the main Hero title to a focused one-liner: "AI Audit Agent with Verifiable Walrus Memory".

### Reasoning
- Why this approach was chosen:
  - Aligning copywriting with real-world auditor vocabulary ensures domain credibility and trust for professional users.
  - Setting expectations for the Company/Auditor split views directly on the landing page matches the workspace's functional changes.

### Tech Debt
- Known shortcuts:
  - None. Text replacements are direct JSX content updates.
- Follow-up needed:
  - Implement role-based workspace login controls and styling polish for the landing page next.

## 2026-06-20 — Landing Page Visual Redesign & Modernization

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
- Summary:
  - Redesigned the landing page with morning-dew style glassmorphism (15px blur, 15-20% white overlay, 1px rgba border, soft shadows) applied to CTA cards, header, and key navigation buttons.
  - Replaced the hero background color gradient and added a footer background gradient to enhance visual depth.
  - Modernized the overall layout, including the interactive benefits network card, and simplified the main agent simulation view using a minimalist macOS window theme with custom message bubbles.

### Reasoning
- Why this approach was chosen:
  - Visual excellence and premium glassmorphism styling are essential to provide a professional, modern look that builds user confidence.
  - Incorporating a dual-role benefit network switcher visually communicates the distinct value of the evidence workflow for companies versus auditors.

### Tech Debt
- Known shortcuts:
  - Static mockup elements are used for the chatbot interactive simulation.
- Follow-up needed:
  - Implement full interactivity in the co-auditor question-answering console mockup.


## 2026-06-20 — Build Rebuilt Workspace for Demo (workspace-demo)

### Change
- Files touched:
  - `app/src/app/workspace-demo/page.tsx`
  - `app/src/app/workspace-demo/demo.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Rebuilt the workspace demo layout under the new isolated path `/workspace-demo`.
  - Implemented a cream iOS liquid glass theme with off-white canvas and translucent high-blur panels.
  - Implemented Login selection for role gating (Company vs. Auditor) with SUI Connect Wallet.
  - Built the Company Agent Workspace with a 3-column modular design (PBC List, Document Preview with highlights, and Agent Activity sandbox) and slide-down chevron trigger.
  - Built the Auditor findings review (ISA 500) and attestation pane.
  - Wired the active Web3 & SDK pipelines (Sui registration, attestation, and AgentAction logs) and Supabase demo-store sync.

### Reasoning
- Why this approach was chosen:
  - The existing layout was not MVP-ready. Rebuilding it in an isolated directory avoids code pollution and demo path breaks.
  - Mocking the AI Agent's 2-way live responses handles the incomplete agent client library, while the active SUI and Walrus SDK pipelines ensure the product stays on-chain.
  - A clean light-cream theme captures the visual style from the user references.

### Tech Debt
- Known shortcuts:
  - Document parser upload triggers are mock-handled in this demo page.
- Follow-up needed:
  - Refine document upload form to allow feeding custom files into the mock list if needed.

## 2026-06-20 — Animated Workspace Showcase Simulation

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Replaced the static, skeleton workspace mockup container on the landing page with an animated simulation mirroring the new `/workspace-demo` page.
  - Implemented 3-column + sidebar nav rail structure matching `/workspace-demo` (File Directory, Document Preview, and Agent Activities).
  - Wired a `useEffect` loop cycling through 3 mock steps (File Selection, Agent Assertion Mapping with text highlighting, and Sui Registry Commit with transaction receipt display).
  - Styled all simulated panes, item highlight animations, and modal overlays in `landing.css`.

### Reasoning
- Why this approach was chosen:
  - Standardizing the landing page mockup representation around the actual `/workspace-demo` layout ensures consistency and prevents user confusion.
  - A looping step-by-step animation makes the "propose, sign, prove" lifecycle concrete and engaging without requiring complex user input on first landing.

### Tech Debt
- Known shortcuts:
  - The browser mockup simulation relies on state intervals rather than actual file directory hooks.
- Follow-up needed:
  - None.

## 2026-06-20 — Co-Auditor Simulator Panel Adjustment

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Adjusted the landing page Co-Auditor simulator loop card to match the `/workspace-demo` Agent Sandbox.
  - Implemented simulated activity logs with Done/Running/Queued card badges.
  - Implemented Command Approval prompt mockup (`sui_execute_transaction`) inside Phase 1 of the simulation loop.
  - Replaced message styles with double-colon (`::`) translucent chat bubbles matching the workspace theme.
  - Guaranteed a persistent status bar sticking directly above the input box across all phases.

### Reasoning
- Why this approach was chosen:
  - Aligning the landing page visual showcase with the actual workspace-demo Agent activities ensures design continuity and sets correct expectations.
  - Rendering the Command Approval prompt highlights Linow's core design constraint: "agent proposes, human signs".

### Tech Debt
- Known shortcuts:
  - None.
- Follow-up needed:
  - None.
## 2026-06-21 — Landing Page Copywriting Update

### Change
- Files touched:
  - `app/src/app/page.tsx`
- Summary:
  - Overhauled all landing page copywriting to eliminate generic AI jargon and adopt a punchy, active, pain-point-driven tone inspired by modern SaaS landings.
  - Updated the Hero Title to "Linow lets you run continuous pre-audits with co-auditor agents".
  - Updated the Hero Subtitle to emphasize client key control, local browser co-auditor processing, and on-chain verification.
  - Rewrote the Meet Section headline to address real-world frustrations: "Stop hunting down bank statements and contract PDFs...".
  - Simplified the Pipeline step-by-step description and column/card titles to focus on clear, concrete actions (Local Mapping, Secure Storage, Ledger Anchor, Auditor Review).
  - Rewrote the Autonomous Compliance Loop copy and Hexagonal Trust Web benefits to focus on user-centric value and direct benefits.
  - Strictly followed `AGENTS.md` guidelines, ensuring the "Agent proposes, human signs, chain proves" framing remains intact.

### Reasoning
- Why this approach was chosen:
  - The previous copywriting sounded like clinical "AI slop" filled with abstract Web3/AI buzzwords.
  - A benefit-oriented, direct style helps developers and companies understand the product's immediate utility.

### Tech Debt
- Known shortcuts:
  - None. All text replacements are direct JSX updates.

## 2026-06-21 — Meet Eyebrow, Hero Blend, and Branding Update

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/layout.tsx`
  - `app/src/app/workspace/page.tsx`
  - `app/src/app/landing.css`
  - `app/next.config.ts`
- Summary:
  - Removed "Agent Co-Auditor" eyebrow from the Meet section in `page.tsx`.
  - Added `.landing-hero::after` pseudo-element and custom gradient configurations in `landing.css` to blend the bottom edge of the scenic background image seamlessly into the off-white page background, eliminating the hard line.
  - Linked the tab icon and navigation, topbar, and footer branding logos to `/icon.png` (built dynamically at initialization from `app/src/app/icon.png` via Node copy rules in `next.config.ts`).
  - Retained `mascot.png` for the Trust Ledger central hub.
  - Integrated an icon-only X link (`https://x.com/linow_ai`) in the footer on the right, and repositioned the copyright text block to the left side directly next to the brand logo.
  - Disabled all "Launch Workspace" CTA buttons on the landing page (navbar, hero, and bottom CTA card) by switching them to disabled buttons marked with the text "Coming soon" and disabled styling.

### Reasoning
- Why this approach was chosen:
  - Pseudo-element gradient overlays avoid browser-specific scaling edge alignment/subpixel rendering problems.
  - Auto-syncing `icon.png` at configuration startup avoids build-time asset directory configuration problems across environments.

## 2026-06-21 — Refine Coming Soon Buttons legibility

### Change
- Files touched:
  - `app/src/app/page.tsx`
  - `app/src/app/landing.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Enhanced all "Coming soon" buttons (navbar, hero, and bottom CTA card) on the landing page to use full opacity (`opacity: 1`) instead of the previous transparent/washed-out style (`opacity: 0.75`).
  - Muted the text color slightly to keep a refined, non-distracting disabled look (`rgba(9, 13, 22, 0.65)` on light states / `rgba(255, 255, 255, 0.8)` on dark states).
  - Kept button style clean by removing padlock/lock SVG icons.

### Reasoning
- Why this approach was chosen:
  - Keeping buttons at full opacity (`opacity: 1`) while slightly muting the text color provides clean readability and prevents a washed-out appearance.
  - Removing lock icons maintains a cleaner, more text-focused design that matches the minimalist landing page aesthetics.

## 2026-06-21 — Dynamic File Explorer: Remove Hardcoded Folders & Add Drag-to-Root

### Change
- Files touched:
  - `app/src/app/workspace-demo/page.tsx`
  - `app/src/app/workspace-demo/components/FileExplorer.tsx`
  - `app/src/app/workspace-demo/components/UploadDocumentModal.tsx`
  - `app/src/app/workspace-demo/demo.css`
  - `docs/DEVLOG-APP.md`
- Summary:
  - Removed hardcoded `openFolders` initialization (`"demo"`, `"demo/PBC_list"`, etc.) — starts empty `{}`.
  - Removed hardcoded `defaultFolder="demo/PBC_list/evidence_initial"` and folder filter in `UploadDocumentModal` props — now passes all folders and defaults to root.
  - Removed hardcoded `"demo/PBC_list"` display name override in `getExplorerNodes()` — user-created folders show their actual name; `FOLDER_METADATA` lookup still works for preset industry templates.
  - Removed hardcoded `getFolderLabel` switch-case in `UploadDocumentModal` — replaced with generic last-path-segment extractor with root label.
  - Added a "Drop here to move to root" zone at the bottom of the file tree so users can drag files back out of folders to root level.
  - Added CSS styles for `.tree-drop-root-zone` with `.drop-active` highlight state.

### Reasoning
- Why this approach was chosen:
  - The file explorer was tightly coupled to the demo dataset paths, making it impossible for fresh users (post-onboarding) to create their own folder structure from scratch.
  - Uploaded files should default to root (no folder) so users can organize them by drag-and-drop, matching real IDE behavior.
  - A visible drop-to-root zone completes the drag-and-drop cycle — without it, files could be dragged into folders but never back out.

### Tech Debt
- Known shortcuts:
  - The drop-to-root zone is always visible for company role; could be hidden when no files exist in folders.
- Follow-up needed:
  - None. TypeScript compiles cleanly with zero new errors.
