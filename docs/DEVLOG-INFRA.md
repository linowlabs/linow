## 2026-06-13 — Document MemWal Env Setup

### Change
- Files touched:
  - `.env.example`
  - `docs/DEVLOG-INFRA.md`
- Summary:
  - Updated the example Linow package ID values to the latest deployed Sui package.
  - Added server-only MemWal variables for the delegate private key and MemWal account ID.

### Reasoning
- Why this approach was chosen:
  - The example env file should not recreate stale package configuration for new local or Vercel deployments.
  - MemWal credentials are sensitive server-side values, so the example explicitly avoids `NEXT_PUBLIC_*` naming.

### Tech Debt
- Known shortcuts:
  - The MemWal relayer URL is still controlled in SDK code rather than exposed as an env override.
- Follow-up needed:
  - Add `MEMWAL_SERVER_URL` if we switch between staging and production relayers during demo setup.

## 2026-06-13 — Add MemWal Relayer Env

### Change
- Files touched:
  - `.env.example`
  - `docs/DEVLOG-INFRA.md`
- Summary:
  - Added `MEMWAL_SERVER_URL` to the example environment so deployments can choose hosted production, staging, or self-hosted MemWal relayers.

### Reasoning
- Why this approach was chosen:
  - MemWal account IDs and delegate keys are tied to the relayer/account setup path, so making the server URL explicit avoids hidden environment mismatch during demo setup.

### Tech Debt
- Known shortcuts:
  - The example defaults to the hosted production relayer.
- Follow-up needed:
  - Switch `.env` to `https://relayer.staging.memwal.ai` if the MemWal account was created against staging/testnet.

## 2026-06-14 — Add minimal root package.json

### Change
- Files touched:
  - `package.json`
  - `docs/DEVLOG-INFRA.md`
- Summary:
  - Added minimal root `package.json` (name + private + version only) at the repository root.
  - Prevents `npm` from throwing ENOENT "Could not read package.json" when any process (including linked package resolution, dev tooling side effects, or stray `npm` calls) walks upward from `app/` to the monorepo root.

### Reasoning
- Why this approach was chosen:
  - The project uses a manual monorepo (no npm/yarn/pnpm workspaces, explicit `--prefix ../sdk` pre* scripts, and `"@linow/sdk": "file:../sdk"`).
  - A tiny root manifest is the smallest possible patch that makes npm's upward package resolution robust without introducing Turborepo, root scripts, or other monorepo tooling.
  - Directly fixes the local `npm run dev` noise observed after the server reported "Ready".

### Tech Debt
- Known shortcuts:
  - Still no root-level `dev`/`build` scripts — developers continue running from inside `app/`.
- Follow-up needed:
  - If monorepo friction grows, evaluate proper workspaces or Turborepo *after* the hackathon submission.
