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

## 2026-06-21 — Add Dynamic IDE File Tree Actions & Document Upload Overlay

### Change
- Files touched:
  - `app/src/app/workspace-demo/components/FileExplorer.tsx`
  - `app/src/app/workspace-demo/components/UploadDocumentModal.tsx`
  - `app/src/app/workspace-demo/components/PreviewPane.tsx`
  - `app/src/app/workspace-demo/page.tsx`
  - `app/src/app/workspace-demo/icons.tsx`
  - `app/src/app/workspace-demo/types.ts`
  - `app/src/app/workspace-demo/demo.css`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `docs/DEVLOG-DEMO.md`
- Summary:
  - Integrated dynamic inline file and folder creation actions in the `FileExplorer` sidebar header, supporting virtual input rows and inline key/focus handlers.
  - Developed `UploadDocumentModal` component to serve as a glassmorphic overlay for file upload. Replaced legacy `prompt()` in `handleAddDocument`.
  - Upgraded folder metadata lookup fallback in `PreviewPane` to display custom smart folder descriptors reactively.
  - Linked upload success directly to the AI Agent activity pipeline to run automated compliance checks and logs.

### Reasoning
- Why this approach was chosen:
  - Providing inline VS Code-like tree inputs and a dedicated target-folder upload dialog makes the demo completely interactive and natural, allowing presenters to prove dynamic Sui/Walrus registration on custom compliance data.
  - Keeping folder states separate ensures empty directories can be created and previewed before file attachments.

### Tech Debt
- Known shortcuts:
  - Mock file uploads simulate checksum and size generation.
- Follow-up needed:
  - None. Core dynamic interaction matches expectations.

## 2026-06-21 — Compliance Sandbox Scenario and Agent Improvements

### Change
- Files touched:
  - `app/src/app/workspace-demo/page.tsx`
  - `app/src/app/workspace-demo/components/AgentSandbox.tsx`
  - `app/src/app/workspace-demo/demo.css`
  - `docs/DEVLOG-DEMO.md`
- Summary:
  - Fixed double-text streaming bug in `streamChatResponse` by copying state objects instead of mutating. Adjusted word delay to 90ms.
  - Integrated logs inline to the conversation stream using a custom `setActivityLogs` wrapper.
  - Added scenario keywords (`analyze`, `find`, `missing`, `yes`, `good`, `bank`, `summarize`, `review`) to transition through 9 distinct compliance scenario steps.
  - Created `triggerStep6Bank` to simulate bank statements scan, comparison with General Ledger, and proposed on-chain registration.
  - Refactored `AgentSandbox.tsx` activity card layout to wrap long titles (avoiding overlaps with "DONE") and stack descriptions underneath.

### Reasoning
- Why this approach was chosen:
  - Streamlining the sandbox conversation logs inline allows presenting the agent actions in one unified chat window.
  - Using unique bubble ID maps for stream intervals isolates streaming bubbles from subsequent inline updates.
  - Wrapping text and using vertical layouts prevents layout overflows on narrow screens during the demo.

### Tech Debt
- Known shortcuts:
  - None. Scenario flow matches design goals.
- Follow-up needed:
  - Prepare for demo delivery.

