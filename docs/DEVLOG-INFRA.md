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
