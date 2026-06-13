# Linow Demo Script: Acme Q2 2026 Revenue Evidence
**Sui Overflow 2026 – Walrus Track**

**Goal of this document**: Define one concrete, judge-ready end-to-end story that:
- Directly addresses previous Tatum hackathon feedback (need for a crisp company → auditor → third-party verifier narrative).
- Satisfies the Walrus track requirements (long-term agent memory via MemWal, persistent data access, tooling for memory).
- Maximizes differentiation from generic "blockchain notarization" projects by centering the *agent's persistent verifiable memory and on-chain reasoning trail*.
- Fits in a ≤5 minute YouTube demo video.
- Aligns with `MASTER_SUI.md` §11 and the judging criteria (especially Real-World Application 50% + Technical Implementation).

**Characters**
- **Wallet A – Company (CFO / finance controller at Acme Corp)**: Prepares evidence pack and drives the agent.
- **Wallet B – Auditor (external independent auditor)**: Reviews the agent's work, performs verification, and issues on-chain attestations.
- **Third-party verifier** (implied): Future user (next auditor, regulator, lender) who independently validates the entire trail.

**Evidence Pack (4 files + 1 deliberate gap)**
| File                      | Type               | Key ISA Assertions                          | Source Confidence | Gap? |
|---------------------------|--------------------|---------------------------------------------|-------------------|------|
| `bank_statement_q2.pdf`   | Bank Statement     | Existence, Completeness, Valuation, Accuracy | L2                | No   |
| `invoice_4021.csv`        | Invoice            | Existence, Cut-off, Classification, Occurrence, Accuracy | L2 | No   |
| `customer_contract.pdf`   | Contract           | Existence, Rights & Obligations, Cut-off, Classification | L2 | No   |
| `delivery_receipt.pdf`    | Delivery Receipt   | Existence, Cut-off, Occurrence              | L2                | No   |
| *(intentionally missing)* Board minutes / approval documentation | — | Rights & Obligations, Occurrence | — | **Yes** |

**Expected outcome**: After processing 4 files the agent reports ~7/8 assertions covered. Gap on "Rights & Obligations". Agent produces a structured C-C-C-E-R finding recommending approval evidence.

**Video constraints**
- ≤ 5 minutes total.
- Must clearly show two different wallets switching on camera.
- MemWal `remember` / `recall` calls must be visible (agent activity feed or memory pane).
- End with independent verification + export / proof surface.
- Use reliable agent outputs (pre-cached via harness or schemas as safety net).
- Strong voiceover that tells a story rather than just clicking.

---

## 1. Act 1: The Problem

### Title
The Broken State of Audit Evidence

### Script
"Every year companies pour thousands of hours into audit evidence — bank statements, invoices, contracts — scattered everywhere. Then the auditors arrive and ask the same question that fails audits worldwide: 'Can you prove this document existed, was unchanged, and came from the right source?' Most companies can't.

PCAOB's latest data: 39% Part I.A deficiency rate. IFIAR found 35% of inspected public interest entity audits had findings.

AI agents could help classify and analyze all this evidence — but today's agents are stateless. They forget everything the moment the session ends. No memory. No audit trail of their own reasoning.

That's the problem Linow solves."

### Current Routes
- Landing page (intro stats + high-level narrative)
- Workspace (initial state)

### What to Do on the Demo / To Show
- Open the landing page or start of workspace.
- Show a messy folder of real-looking PDFs and CSVs (use demo assets).
- Display the PCAOB / IFIAR stats prominently (static or animated cards).
- Quick visual: "This is what companies send auditors" — drag or highlight the four files + note the missing approval docs.
- Transition smoothly into "Now imagine an AI agent that *remembers*."

### Things Needed to Be Done (Code Wise)
- Polish the landing page hero / problem statement section (already partially exists in `app/src/app/page.tsx` and `landing.css`).
- Ensure clean stats callouts (PCAOB 39%, IFIAR 35%) that can be screenshared.
- Prepare a 5–8 second screen recording or static "messy folder" visual of the exact four demo files.
- Create a short reusable "problem" intro clip or component for the video.

---

## 2. Act 2: Company Upload & Agent Ingestion with Memory

### Title
Company Uploads Evidence — The Agent Thinks and Remembers

### Script
"Acme's CFO connects their wallet and creates an Audit Pack for Q2 2026 Revenue Evidence.

They batch upload the four documents.

The agent activates immediately. It classifies each file against ISA 500, maps the assertions, and assigns source confidence.

Watch what happens: after every classification the agent writes its reasoning to **Walrus Memory** using `memwal.remember()`.

The coverage dashboard lights up — 7 out of 8 assertions covered, readiness at 72%.

The CFO reviews the agent's work, approves it, and signs the transaction. EvidenceRecords are created on Sui. AgentAction events log exactly what the agent concluded. Encrypted files go to Walrus."

### Current Routes
- Workspace > Upload Evidence (`register` view / tab)
- Workspace > Evidence Registry (`records` view) — will receive the new records
- Backend: `POST /api/agent/classify`, `/api/agent/extract-metadata`, `/api/agent/map-assertions`, `/api/agent/orchestrate`
- Proof snapshot card (appears after successful registration)

### What to Do on the Demo / To Show
- Connect Wallet A (clearly label on screen: "Company Wallet – Acme CFO").
- Click into the Upload / Register view.
- Select the four files (ideally drag-and-drop or multi-select).
- Trigger the agent (via "Analyze with Agent" or auto on upload for the demo flow).
- Show a live **Agent Activity Feed** (or console-style log) that displays:
  - Classification results with assertion tags
  - Explicit `memwal.remember(...)` messages
- Real-time **Coverage Dashboard** (heat map or progress bars per assertion + overall readiness %).
- Human review gate: show the agent's proposed classifications/assertions before the user signs.
- User signs with Wallet A.
- After success: new records appear in the Registry table. Proof snapshot card pops with Evidence IDs, tx digest, package ID, Walrus blob IDs.
- Highlight that the agent's outputs were hashed and written as AgentAction events on Sui.

### Things Needed to Be Done (Code Wise)
- Implement batch upload support in the register flow (current baseline is mostly single file).
- Build a visible **Agent Activity Feed** component (real-time or step-by-step) that shows tool calls + `memwal.remember` calls (even if mocked with real schema outputs initially).
- Create a **Coverage Dashboard** / ISA assertion heat map + readiness score (core new UI per MASTER).
- Wire the existing `/api/agent/*` routes + orchestration into the workspace "register" flow (currently the workspace still uses the old Tatum-era register path without agent).
- Add AuditPack creation UI (even a simple name + owner field) that links the registered EvidenceRecords.
- Log and display `AgentAction` creation (or at least surface the event hashes) in the proof snapshot.
- Ensure the register flow calls the new direct Sui transport (post-Tatum migration) instead of serverTatumExecute.
- Add visual "MemWal write" indicators (temporary or permanent) for the demo.

---

## 3. Act 3: Agent Uses Memory to Find the Gap

### Title
The Agent Recalls Its Own Work and Spots the Gap

### Script
"The agent doesn't stop at what was uploaded.

It now runs gap analysis — but crucially, it first calls `memwal.recall('What evidence has been classified for this pack?')` to load its own prior memory.

Because the memory is persistent and portable on Walrus, the agent knows exactly what it already analyzed.

Result: Rights & Obligations is uncovered. The agent drafts a full C-C-C-E-R finding:

- Condition: No board approval evidence found.
- Criteria: ISA 500 requires sufficient evidence for Rights & Obligations.
- Recommendation: Upload board minutes or authorization matrix.

This finding is also remembered to MemWal and logged as an AgentAction on Sui.

The CFO reviews the draft finding and accepts it."

### Current Routes
- Workspace > Upload Evidence / Records (inline gap analysis would live here or in a new "Audit Pack" view)
- Backend: `POST /api/agent/analyze-gaps`, `/api/agent/draft-finding`, `/api/agent/orchestrate`
- Existing agent harness at `/api/agent/harness/isa-q2`

### What to Do on the Demo / To Show
- After the coverage lights up in Act 2, explicitly trigger (or auto-run) gap analysis.
- Make the `memwal.recall` call visible in the activity feed (show the query + returned prior classifications).
- Display the gap clearly (missing assertions highlighted in red on the coverage map).
- Show the full structured **C-C-C-E-R finding** card (Condition, Criteria, Cause, Effect, Recommendation + citations to specific files).
- Human review/approval step for the finding (Accept / Edit / Reject).
- On approval: show the finding being written to MemWal and an AgentAction event emitted.
- Transition note: "Now we'll switch to the auditor."

### Things Needed to Be Done (Code Wise)
- Full implementation of the gap analysis tool + C-C-C-E-R drafting tool (schemas already exist in `AGENT_SCHEMAS.md`).
- Integrate `memwal.recall` into the gap analysis orchestration (this is the key Walrus-track differentiator — must be real or convincingly demonstrated).
- Build a reusable **C-C-C-E-R Finding Card** component that renders the structured output nicely.
- Add a "Run Gap Analysis" / "Continue with Agent" button in the records or new Audit Pack workspace view.
- Create an in-memory or UI state for "current Audit Pack" that aggregates the registered evidence + agent's findings.
- Surface AgentAction events for the gap/finding step in the proof surface.
- Memory inspector pane (simple table or list of recent `remember` entries) that can demonstrate recall.
- Wire the agent tools into the direct Sui flow so AgentAction Move events are actually emitted.

---

## 4. Act 4: Auditor Review & Attestation

### Title
Auditor Reviews the Agent's Work and Attests On-Chain

### Script
"Now we switch to the external auditor's wallet.

The auditor opens the same Audit Pack. They can see every document the company uploaded, the agent's classifications and assertion mapping, the gap the agent found, and the C-C-C-E-R finding it drafted.

The auditor verifies the hash of one or two key files against the on-chain commitments — they match.

Satisfied with both the evidence integrity and the agent's analysis, the auditor creates an Attestation from their wallet. This upgrades the source confidence to L3 for the attested items.

Everything is now recorded on Sui as a separate Attestation object tied to the reviewer's address."

### Current Routes
- Workspace > Create Attestation (`attest` view)
- Workspace > Evidence Registry (`records` view) — actions to jump to attest
- Workspace > Verify Evidence (used by auditor)
- Backend attestation flow (still using the old `createAttestationFlow`)

### What to Do on the Demo / To Show
- Clear, on-camera switch from Wallet A to Wallet B. Label the new wallet as "External Auditor Wallet".
- Auditor views the full pack (ideally via the records table or a dedicated "Open Audit Pack" view).
- Auditor runs verification on selected evidence (show success).
- Auditor sees the agent's gap finding and C-C-C-E-R (read-only for them).
- Auditor selects attestation type (e.g. "Pack Reviewed" or "Evidence Verified"), adds notes, and signs.
- Successful attestation updates the record (shows "Attested by..." in the registry table) and refreshes the proof snapshot with the new Attestation ID.
- Highlight source confidence upgrade (L2 → L3) visually.

### Things Needed to Be Done (Code Wise)
- Improve the "attest" view to also surface the agent's findings + gap analysis (currently the attest view is fairly basic).
- Add two-wallet switching helper / clear visual indicator in the workspace (or document using separate browser profiles).
- Update attestation flow to also reference the new AuditPack and/or AgentAction data where relevant.
- Enhance the registry table rows to clearly show "Agent findings present" + latest attestation status.
- Make the source confidence level (L0-L5) update live in the UI after attestation.
- Ensure the direct Sui transport is used for the attestation PTB (post-Tatum migration).

---

## 5. Act 5: Independent Verification, Tamper Test & Export / Proof

### Title
The Chain Proves Everything — Including the Agent

### Script
"Let's look at the complete proof surface.

Anyone — a regulator, a future auditor, a lender — can now see:
- The Audit Pack ID
- Every EvidenceRecord with its commitment and Walrus blob reference
- The AgentAction events that log exactly what the AI classified and recommended
- The Attestation objects signed by the real auditor wallet

We run a tamper test: we upload a modified version of the bank statement — immediately flagged as tampered.

We re-upload the original — verified.

Finally, we show that the agent's memory is portable. Even if we lost local state, the agent can call `memwal.recall` and recover its prior classifications and the gap finding from Walrus.

To close the loop we generate a Readiness Manifest / Proof Bundle export — a machine-readable package containing all the on-chain references and Walrus pointers. A third party can use this to independently re-verify the entire engagement.

The agent proposes. The human signs. The chain proves. **And the chain proves the agent, too.**"

### Current Routes
- Workspace > Evidence Registry (`records`)
- Proof snapshot card (appears after major actions)
- Verify view (for tamper test)
- Attest results (for attestation proof)

### What to Do on the Demo / To Show
- Open / focus the **Proof Dashboard** (currently the "Proof Output Surface" card — needs to become richer).
- Display the full set of artifacts: AuditPack (future), Evidence IDs, AgentAction event IDs, Walrus blob IDs, Attestation IDs, tx digests, package ID.
- Perform live tamper test using one of the registered files vs a tampered copy (use `demo/tamperable_audit_sample*` or equivalent PDFs).
- Demonstrate memory recall / restore (even if simulated, show the recall query returning prior agent outputs).
- Click "Export Readiness Manifest" or "Download Proof Bundle" → show a generated JSON (or downloadable file) that contains all references.
- Deliver the final line with conviction while the proof surface is on screen.
- Optional: quick third-party verification fantasy — "If I were a new auditor tomorrow, I would start here."

### Things Needed to Be Done (Code Wise)
- Build a proper **Proof Dashboard** component (expand the current proof snapshot card) that aggregates:
  - AuditPack ID + status
  - List of EvidenceRecords with links
  - AgentAction events
  - Attestations
  - Walrus references
  - Overall readiness / coverage
- Implement a real **tamper test** flow that works with the actual registered blobs (current baseline has some support via the verify path).
- Add a **Memory Recall / Inspector** view or panel that can call `memwal.recall` and display past agent memories (critical for Walrus track).
- Implement an **Export / Readiness Manifest** feature (simple JSON export at minimum) that collects on-chain IDs + Walrus blob IDs + agent output hashes + attestation data. Bonus: make it downloadable as a file.
- Create a dedicated "Proof" or "Audit Pack Detail" view (new route or tab) that can be used by a third-party verifier without the company context.
- Finish the Tatum → direct `@mysten/sui` migration so the entire flow (especially reads for verification/proof) feels clean and native.
- Populate real demo assets under `demo/acme-q2-revenue/` (or similar) with the exact four files + expected agent outputs aligned to the schemas.
- Add clear two-wallet instructions or a demo mode toggle for easy wallet switching during recording.

---

## Preparation & Assets

### Recommended Demo Assets Folder
Create / maintain:
- `demo/acme-q2-revenue/` (or extend the existing `isa_q2_engagement` harness)
  - The four evidence files (PDFs + CSV)
  - Tampered variants for Act 5
  - `EXPECTED_OUTPUTS/` (JSON files matching the agent schemas)
  - `PLAYBOOK.md` (human instructions for running the exact demo)

### Supporting Code Surfaces to Prioritize
1. Agent orchestration wired into the main workspace with visible MemWal steps.
2. Coverage dashboard + gap analysis UI.
3. C-C-C-E-R finding renderer.
4. Enhanced proof surface + export button.
5. Memory inspector / recall demo surface.
6. Clear two-wallet UX (labels + easy switching guidance).
7. Direct Sui transport (remove Tatum dependency) across SDK + app.

This scenario is designed so that when implemented, the 5-minute video tells a complete, memorable story that directly maps to both the Walrus track problem statement and the real-world audit pain that gives Linow its 50% Real-World Application weight.

Update this file as implementation progresses. The final video script can be derived directly from the "Script" + "What to Do" columns above.
