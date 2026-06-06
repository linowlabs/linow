## 2026-06-05 - Align Design Doc With Current Shell

### Change
- Files touched:
  - `docs/DESIGN.md`
  - `docs/DEVLOG-DOCS.md`
- Summary:
  - Updated the design source of truth to match the current dark glass workspace look used by the app shell.
  - Replaced the earlier cool-light direction with the actual deep navy, slate glass, turquoise, and electric-blue palette.
  - Kept the June 6 layout guidance centered on top bar, left sidebar, and main workspace.

### Reasoning
- Why this approach was chosen:
  - The design doc should describe the shell that is actually on screen, not a previous iteration.
  - Keeping the palette, typography, and layout notes aligned reduces future design drift.
  - The current shell already has a clear proof-first audit-tech identity, so the doc should reinforce that direction.

### Tech Debt
- Known shortcuts:
  - The doc reflects the current shell styling, but some views are still presentational until the real SDK flows are wired in.
- Follow-up needed:
  - Update the design doc again only if the shell meaningfully changes, so it remains a stable reference rather than a changelog.
## 2026-06-06
- Rewrote the root `README.md` as a polished project landing page based on `MASTER.md`, including the centered Linow badge placeholder and updated product narrative.
- Reworked the README stack section into a centered chip bar for Next.js, Walrus, and Tatum to match the project framing in `MASTER.md`.

## 2026-06-06 - Add Architecture Overview

### Change
- Files touched:
  - `docs/ARCHITECTURE.md`
  - `docs/DEVLOG-DOCS.md`
- Summary:
  - Added a concise system architecture document for the current Linow testnet build.
  - Covered the app, SDK, Sui Move package, Tatum RPC routes, Walrus encrypted storage, browser wallet signing, package ID, and environment targets.

### Reasoning
- Why this approach was chosen:
  - Submission reviewers need a direct architecture reference instead of reading through implementation devlogs.
  - The doc stays focused on what exists in the current build: verifiable audit evidence on Sui testnet with encrypted Walrus storage and Tatum-backed Sui RPC.

### Tech Debt
- Known shortcuts:
  - The architecture doc describes the current monorepo layout and testnet setup, not a production deployment model.
- Follow-up needed:
  - Update this doc if package IDs, networks, or the server route boundaries change.
