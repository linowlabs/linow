## 2026-06-06 - Add Tamperable Demo CSV

### Change
- Files touched:
  - `demo/tamperable_audit_sample.csv`
  - `docs/DEVLOG-DEMO.md`
- Summary:
  - Added a small CSV under `demo/` for the live smoke test.
  - Kept the content generic and audit-shaped so it is easy to register, verify, and then tamper during the demo.

### Reasoning
- Why this approach was chosen:
  - The J6-19 smoke test needs a lightweight file that can be edited quickly without extra setup.
  - A CSV is easy to inspect and tamper in a controlled way, which makes the mismatch step obvious during the demo.
  - The sample stays non-sensitive and avoids looking like real evidence.

### Tech Debt
- Known shortcuts:
  - The file is just a demo asset and is not wired into the app automatically.
- Follow-up needed:
  - Use this CSV, or a copied variant of it, as the register/verify input during the J6-19 smoke test.
