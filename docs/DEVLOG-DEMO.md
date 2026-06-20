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

## 2026-06-12 - Add Engagement Pack Operating Rules

### Change
- Files touched:
  - `demo/isa_q2_engagement/audit_docs/06_operational_playbook.md`
  - `docs/ENGAGEMENT_PACK_SPEC.md`
  - `docs/DEVLOG-DEMO.md`
- Summary:
  - Added a concrete operating playbook for the `isa_q2_engagement` demo pack.
  - Added a reusable engagement-pack specification so future packs can follow the same structure and expectations.

### Reasoning
- Why this approach was chosen:
  - The demo pack already had strong assets, but the distinction between input evidence, oracle outputs, and negative cases was still easy to misread.
  - A local playbook helps anyone running the current pack, while a general spec helps future AI or developers generate new packs consistently.

### Tech Debt
- Known shortcuts:
  - The new documents describe workflow and expectations, but they are not yet linked from a top-level demo index.
- Follow-up needed:
  - Add a top-level demo README if multiple engagement packs are added later.

## 2026-06-20 — Build Rebuilt Workspace for Demo (workspace-demo)

### Change
- Files touched:
  - `app/src/app/workspace-demo/page.tsx`
  - `app/src/app/workspace-demo/demo.css`
  - `docs/DEVLOG-DEMO.md`
- Summary:
  - Created a role-based gateway and Company/Auditor views inside the new isolated `/workspace-demo` workspace.
  - Implemented the Light-Cream iOS Liquid Glass visual theme based on the user-provided design reference.
  - Set up active Web3/Sui SDK pipelines (batch registration, attestation, and AgentAction hashes) and mock agent interactive sandbox.
  - Enabled sync capabilities with Supabase demo-store to sync registered evidence and reviewer attestations.

### Reasoning
- Why this approach was chosen:
  - Rebuilding the layout in `/workspace-demo` isolates the demo workspace without breaking existing files.
  - The mock agent sandbox allows simulating the 2-way interaction, while SUI/Walrus wires are kept fully functional to represent a real product.

### Tech Debt
- Known shortcuts:
  - Document file reads in the preview pane are simulated for the selected files.
- Follow-up needed:
  - Connect upload handlers to feed files into the active PBC list.

