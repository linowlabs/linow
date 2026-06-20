# MASTER_SUI.md — Linow: Sui Overflow 2026

> Single source of truth for the Sui Overflow submission. Walrus track.

---

# 1. Pitch Assets

## One-Liner

```
Persistent audit memory for AI agents on Walrus
```

**Alternatives:**
- `AI audit agent with verifiable Walrus memory` (41 chars)
- `Agentic audit readiness on Walrus + Sui` (40 chars)

## Pain Point

Audit evidence is manual, fragmented, and impossible to prove end-to-end. PCAOB's 2024 inspection data shows a 39% Part I.A deficiency rate across inspected firms. Globally, IFIAR's 2025 survey found 35% of inspected listed public-interest-entity audits had at least one finding — up from 26% in 2022. The root cause keeps repeating: auditors cannot obtain "sufficient appropriate audit evidence."

Meanwhile, AI agents are stateless — they lose context across sessions, can't share reasoning across workflows, and produce outputs that are impossible to audit. When an AI agent classifies audit evidence, that classification exists only in RAM until the session ends. No verifiable memory. No multi-party trust. No proof.

## Blurb (Pixar Formula)

> Every year, companies pour thousands of hours into preparing audit evidence — bank statements, contracts, invoices, system exports — scattered across email threads, shared drives, and filing cabinets. Then the auditors arrive, and the same question keeps failing audits worldwide: *"Can you prove this document existed, was unchanged, and came from the right source?"* Most companies can't.
>
> Now imagine an AI agent that reads every document, classifies it against ISA audit standards, identifies what's missing — and remembers everything. Not in a database that gets wiped. In **Walrus Memory** — persistent, portable, verifiable. Every classification, every finding, every gap is stored as durable agent memory on Walrus and anchored on Sui. The agent's reasoning trail is itself on-chain.
>
> The agent proposes. The human signs. The chain proves. **And the chain proves the agent, too.**

## 20-Second Pitch

> Linow is an AI audit agent that classifies evidence, identifies gaps, and produces structured audit findings — with every agent action stored as verifiable memory on Walrus and anchored on Sui. Companies get audit-ready. Auditors get pre-verified evidence packs. Everyone can independently verify the entire trail.

---

# 2. Track Selection: Walrus

## Why Walrus, Not Agentic Web

**Walrus track:** "Build AI agents and agentic workflows powered by Walrus as a verifiable data and memory layer."

**Agentic Web track:** Three DeFi-specific sub-tracks (Risk Guardian, Agent Wallet, Intent Engine). All require Deepbook orders, oracle feeds, or PTB compilation for financial transactions. Linow is an audit tool, not a DeFi agent.

**The Walrus track explicitly says "any domain"** — from finance to productivity to gaming. Audit fits perfectly.

## How Linow Maps to Walrus Track Requirements

| Walrus Track "What You'll Build" | Linow Deliverable |
|---|---|
| **Long-term memory** — persistent, verifiable memory for agents | MemWal stores agent classifications, findings, gap analysis across sessions |
| **Persistent data and file access** | Encrypted evidence blobs stored and retrieved from Walrus |
| **Integrations and tooling** for MemWal adoption | Proof dashboard = agent memory inspector. Domain-specific MemWal usage pattern. |

| Walrus Track "Areas of Interest" | Linow Deliverable |
|---|---|
| **Long-running workflows** — agents track state over time | Audit engagement spans days/weeks. Agent tracks evidence coverage state across sessions. |
| **Multi-agent coordination** — task delegation, step-by-step execution | Two-wallet flow: company uploads → agent classifies → auditor attests. Multi-party coordination. |
| **Artifact-driven workflows** — agents generate, store, reuse outputs | Agent generates classifications, C-C-C-E-R findings, gap reports. Stores on Walrus. Reloads to continue analysis. |

## Hackathon Requirements Checklist

| Requirement | Status | How |
|---|---|---|
| Project name | 🔲 | Linow |
| Description | 🔲 | From blurb above |
| Project logo (1:1 JPG/PNG) | 🔲 | Design or generate |
| Public GitHub repo | 🔲 | Same repo, evolved from Tatum |
| Demo video (≤5 min, YouTube) | 🔲 | Full agent demo with Walrus memory + Sui proof |
| Website | 🔲 | Existing landing page, updated |
| Deployment (testnet or mainnet) | 🔲 | Testnet (mainnet stretch for full prize) |
| Package ID | 🔲 | Updated on-chain contract address |

## Judging Criteria

| Criterion | Weight | Strategy |
|---|---|---|
| **Real-World Application** | **50%** | $280B audit market. PCAOB 39%. IFIAR 35%. ISA 500 domain knowledge. Most real-world-applicable project in the track. |
| **Product & UX** | 20% | Agent workspace + coverage dashboard + gap analysis + proof dashboard. Existing polished UI extended. |
| **Technical Implementation** | 20% | Move contracts (AuditPack + AgentAction) + MemWal + raw Walrus + SDK + agent pipeline + schema validation |
| **Presentation & Vision** | 10% | Long-term: global AI audit platform. MASTER.md roadmap: Tauri desktop → multi-framework → enterprise → Linow Model |

> ⚠️ **50% real-world application is our biggest weapon.** Lead with the problem stats. Make judges feel the pain before they see the product.

> 💡 **Prize:** 50% on win, 50% after mainnet deployment. If already on mainnet by announcement → 100% upfront.

---

# 3. What Linow Proves and Does Not Prove

**Linow proves:**
- The disclosed file matches the registered on-chain commitment
- The evidence existed by the time of Sui registration (timestamp)
- The evidence lifecycle is traceable (registered → reviewed → attested)
- Reviewer attestations were issued by specific wallets at specific times
- Evidence packs are machine-checkable for assertion coverage gaps
- Agent classifications and findings are verifiable (output hashes logged on-chain)
- Agent memory is persistent and portable (Walrus Memory)

**Linow does NOT automatically prove:**
- The document content is true or accurate
- The document came from the claimed source (unless connector-verified — see Source Confidence Levels)
- The business event described actually happened
- The evidence is sufficient for a professional audit opinion
- That auditor judgment is replaced — Linow aids auditors, it does not replace them

> This distinction matters. Overclaiming destroys credibility. A product that clearly states its boundaries sounds more trustworthy than one that implies magic.

---

# 4. Source Confidence Levels

Uploading a PDF labeled "Bank ABC" does not prove Bank ABC issued it. Source proof is a spectrum, not a boolean.

```
L0 — Integrity proof         File matches on-chain commitment. Tamper-evident.
L1 — Timestamp proof          File was registered at a specific Sui timestamp.
L2 — Company source claim     Company uploaded and labeled the document. No independent verification.
L3 — Reviewer attestation     A reviewer (auditor) wallet attested this evidence.
L4 — Connector source proof   Document was imported directly via verified connector (e.g., bank API, ERP export).
L5 — Continuous system proof  Evidence is system-generated and auto-registered (no human upload step).
```

**Sui Overflow (June 21):** L0–L3. Company uploads, agent classifies, auditor attests.
**Post-hackathon roadmap:** L4–L5 via source-system connectors.

---

# 5. Why Blockchain / Why Sui / Why Walrus / Why MemWal

## Why On-Chain

This is a **multi-party trust problem**. The company, auditor, regulator, lender, insurer, or partner may all need to trust the same evidence trail. A normal database is controlled by one party. A blockchain gives a shared, timestamped, tamper-evident record that no single party controls.

## Why Sui

Sui's global state is made of **objects**, and this product is naturally object-based:
- Each piece of evidence = its own object with its own owner, version, status, permissions, and lifecycle
- **Programmable Transaction Blocks (PTBs)** enable atomic multi-step flows: register evidence + link to audit pack + log agent action — all in one transaction
- Sui documentation describes its object/transaction history as a "cryptographically auditable view of system state and history" — literally our use case

## Why Walrus (Evidence Storage)

Business evidence files are **large**: PDFs, contracts, invoices, Excel exports, screenshots, logs. These should NOT go on-chain.

Walrus provides:
- **Decentralized storage** — no single point of failure
- **Content-addressed blobs** — any change to the stored ciphertext produces a new identifier
- **Programmable via Sui** — blob metadata is a Sui object
- **Highly available** — erasure coding with ~4.5x redundancy

> ⚠️ **Critical:** Walrus blobs are **public by default**. Private company documents MUST be encrypted before upload. Linow encrypts with AES-256-GCM before storing on Walrus.

## Why MemWal (Agent Memory)

MemWal (Walrus Memory) is a decentralized, verifiable memory layer for AI agents. It solves the **Goldfish Problem** — agents losing context across sessions.

Linow uses MemWal because:
- **Persistence** — agent classifications, findings, and gap analysis survive session restarts
- **Portability** — agent memory is not locked to a single runtime or device
- **Verifiability** — memory is stored on Walrus and anchored on Sui
- **Privacy** — MemWal encrypts memories by default via Seal
- **Recall** — agent can query past memory: "What evidence has been classified for this engagement?"
- **Restore** — if local state is lost, agent memory can be restored from Walrus

### MemWal Integration Points

```
1. REMEMBER — After agent classifies, extracts, or drafts a finding:
   memwal.remember("Classified bank_statement.pdf as bank statement. 
                     Assertions: Existence, Completeness, Valuation, Accuracy. 
                     Source confidence: L2.")

2. RECALL — Before gap analysis or when resuming a session:
   memwal.recall({ query: "What evidence has been classified for this pack?" })
   → Returns prior classifications, findings, and gaps

3. RESTORE — If local state is lost:
   memwal.restore() → Rebuilds engagement context from Walrus Memory

4. Raw Walrus — For encrypted evidence blobs (large files):
   walrusClient.storeBlob(encryptedBlob) → blob_id
```

### Two Walrus Layers

```
┌─────────────────────────────────────────────────┐
│                 WALRUS USAGE                      │
├─────────────────────────────────────────────────┤
│                                                   │
│  Layer 1: MemWal (Agent Memory)                   │
│  ├── Classifications                              │
│  ├── C-C-C-E-R findings                          │
│  ├── Gap analysis results                         │
│  ├── Source confidence notes                      │
│  ├── Audit pack summaries                         │
│  └── Encrypted by default (Seal)                  │
│                                                   │
│  Layer 2: Raw Walrus (Evidence Blobs)             │
│  ├── Encrypted evidence files (AES-256-GCM)       │
│  ├── Large binary blobs (PDFs, Excel, images)     │
│  ├── Content-addressed by ciphertext              │
│  └── Referenced by on-chain EvidenceRecord         │
│                                                   │
└─────────────────────────────────────────────────┘
```

> **Fallback:** If MemWal relayer or delegate key setup fails during the hackathon, store the same memory manifest directly on Walrus with the existing encrypted blob flow (SO-24a). Demo is never blocked by MemWal beta risk.

---

# 6. Privacy & Trust Architecture

## What We Encrypt vs Leave Public

| Field | Treatment | Rationale |
|---|---|---|
| `evidence_commitment` | Public | Integrity anchor — needs to be verifiable |
| `walrus_blob_id` | Encrypted | Prevents unauthorized download |
| `encrypted_metadata` (type, source, desc) | Encrypted (AES-256-GCM) | Business-sensitive |
| `isa_assertions` | Public | Useful for coverage visibility |
| `status` | Public | Workflow visibility |
| `registrant` | Public (address) | Unavoidable on Sui |
| `registered_at` | Public | Unavoidable on Sui |
| Agent memory (MemWal) | Encrypted (Seal, by default) | Agent reasoning is private |
| Agent output hashes (on-chain event) | Public | Verifiability — audit the auditor |

## Agent Privacy & Trust Model

**Hard truth:** If the agent analyzes private documents, the plaintext is visible to the execution environment running that agent.

Linow reduces this risk through:
- **Scoped access** — agent only sees documents for the current engagement
- **No plaintext logs** — agent outputs are hashed, not stored in raw form on-chain
- **Human approval** — agent proposes transactions; user signs them
- **Audit trail** — all agent actions are logged as Sui events for meta-auditability
- **MemWal privacy** — agent memory encrypted via Seal by default

> The agent can recommend actions and prepare transactions, but **cannot sign or submit transactions autonomously**. The user must approve all on-chain writes. Agent proposes, human signs.

## Commitment Scheme

**Hackathon (demo simplicity):** On-chain field stores raw `document_hash = SHA-256(file)` for easy verification demos.

**Production model:** On-chain field stores a salted commitment:

```
plaintext_hash      = SHA-256(file)
salt                = random 256-bit value
evidence_commitment = SHA-256(plaintext_hash || salt || org_id || schema_version)
```

---

# 7. Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            USER                                      │
│                              │                                        │
│                    ┌─────────▼──────────┐                             │
│                    │   Agent Workspace   │  ← user interacts here     │
│                    │   (Next.js Web UI)  │                             │
│                    └─────────┬──────────┘                             │
│                              │                                        │
│                    ┌─────────▼──────────┐                             │
│                    │   LINOW AUDIT AGENT │  ← LLM-powered, sandboxed  │
│                    │                     │                             │
│                    │  Tools:             │                             │
│                    │  ├── classify()     │  → doc type + assertions    │
│                    │  ├── extract()      │  → metadata + citations     │
│                    │  ├── map_assert()   │  → ISA mapping + confidence │
│                    │  ├── find_gaps()    │  → missing evidence         │
│                    │  ├── draft_ccer()   │  → C-C-C-E-R finding       │
│                    │  └── prepare_tx()   │  → unsigned PTB            │
│                    └─────────┬──────────┘                             │
│                              │                                        │
│                    ┌─────────▼──────────┐                             │
│                    │  HUMAN APPROVAL     │  ← user signs or rejects    │
│                    └─────────┬──────────┘                             │
│                              │                                        │
│         ┌────────────────────┼────────────────────┐                   │
│         ▼                    ▼                    ▼                    │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐               │
│  │  MemWal      │   │  Raw Walrus  │   │    Sui       │               │
│  │  (agent      │   │  (encrypted  │   │  (objects +  │               │
│  │   memory)    │   │   blobs)     │   │   events)    │               │
│  └─────────────┘   └──────────────┘   └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: What Goes Where

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  DOCUMENT (PDF, invoice, contract, etc.)                          │
│       │                                                           │
│       ├──► SHA-256 Hash ──────────────► Sui: evidence_commitment  │
│       │                                 (public, 32 bytes)        │
│       │                                                           │
│       ├──► AES-256-GCM Encrypt ──────► Walrus: encrypted blob    │
│       │    (random IV per encryption)   (private, any size)       │
│       │                                                           │
│       ├──► Agent classifies ─────────► MemWal: remember()         │
│       │    (type, assertions, L0-L5)    (private, encrypted)      │
│       │                                                           │
│       └──► Agent output hash ────────► Sui: AgentAction event     │
│            (SHA-256 of classification)  (public, verifiable)      │
│                                                                   │
│  RESULT: Raw document NEVER touches the blockchain.               │
│  On-chain = proof. Off-chain = content + agent memory.            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

# 8. On-Chain Objects & Events

## Object Schema: Sui Move

```
┌─────────────────────────────────────────────────────────┐
│                    EvidenceRecord                         │
│  (key, store) — existing from Tatum                      │
├─────────────────────────────────────────────────────────┤
│  id: UID                        (Sui unique identifier)  │
│  evidence_commitment: vector<u8>(SHA-256, 32 bytes)      │
│  walrus_blob_id: String         (encrypted)              │
│  encrypted_metadata: vector<u8> (AES-256-GCM)            │
│  isa_assertions: vector<u8>     (assertion bitmask)      │
│  status: u8                     (lifecycle)              │
│  registrant: address            (who registered)         │
│  registered_at: u64             (timestamp ms)           │
│  audit_pack_id: Option<ID>      (link to pack)           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Attestation                          │
│  (key, store) — existing from Tatum                      │
├─────────────────────────────────────────────────────────┤
│  id: UID                                                 │
│  target_id: ID                  (evidence or pack ID)    │
│  attester: address              (reviewer wallet)        │
│  attestation_type: u8           (see enums below)        │
│  source_confidence: u8          (L0–L5)                  │
│  encrypted_notes: vector<u8>    (reviewer's notes)       │
│  attested_at: u64                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      AuditPack (NEW)                     │
│  (key, store)                                            │
├─────────────────────────────────────────────────────────┤
│  id: UID                                                 │
│  encrypted_details: vector<u8>  (company, period, etc.)  │
│  evidence_ids: vector<ID>       (linked EvidenceRecords) │
│  finding_hashes: vector<vector<u8>> (C-C-C-E-R hashes)  │
│  memory_blob_id: Option<String> (Walrus memory ref)      │
│  assertions_covered: vector<u8> (aggregated coverage)    │
│  status: u8                     (Draft/Submitted/Done)   │
│  owner: address                 (company wallet)         │
│  auditor: Option<address>       (reviewer wallet)        │
│  created_at: u64                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   AgentAction (NEW — event)               │
│  (copy, drop) — emitted as Sui event, not stored         │
├─────────────────────────────────────────────────────────┤
│  pack_id: ID                    (target audit pack)      │
│  evidence_id: Option<ID>        (target evidence, if any)│
│  action_type: vector<u8>        (classify/extract/gap/   │
│                                  find/recommend)         │
│  agent_output_hash: vector<u8>  (SHA-256 of output JSON) │
│  timestamp: u64                                          │
│  Note: Agent actions are logged as events for            │
│  meta-auditability. Audit the auditor.                   │
└─────────────────────────────────────────────────────────┘
```

## Status Enums

```
EvidenceRecord.status:
  0 = Registered      (initial — company uploaded)
  1 = UnderReview      (reviewer is examining)
  2 = Superseded       (replaced by newer version)
  Note: "Verified" is NOT a status. Verification is proven
  by the existence of an Attestation object from a reviewer wallet.

AuditPack.status:
  0 = Draft            (still adding evidence)
  1 = Submitted        (sent to auditor)
  2 = UnderReview      (auditor working on it)
  3 = Complete         (audit complete)

Attestation.attestation_type:
  0 = EvidenceVerified (single evidence reviewed and verified)
  1 = PackReviewed     (full pack reviewed)
  2 = HashConfirmed    (hash-only integrity check)
  3 = Rejected         (reviewer rejected the evidence)

ISA Assertions (bitmask values):
  0 = Existence
  1 = Completeness
  2 = Valuation & Allocation
  3 = Rights & Obligations
  4 = Cut-off
  5 = Classification
  6 = Occurrence
  7 = Accuracy
```

---

# 9. Agent Architecture

## Agent Sandbox

```
┌──────────────────────────────────────────────────────────┐
│                  Agent Sandbox                            │
│                                                          │
│  LLM Runtime (isolated):                                 │
│  ├── Read-only access to uploaded evidence                │
│  ├── Can ONLY call approved tool APIs                    │
│  ├── All outputs validated against JSON schemas          │
│  ├── All approved outputs hashed and logged on-chain     │
│  ├── CANNOT sign or submit transactions                  │
│  └── Memory stored via MemWal, not local state           │
│                                                          │
│  Approved Tool APIs:                                     │
│  ├── classify_evidence(doc) → type + assertions + conf   │
│  ├── extract_metadata(doc) → structured metadata         │
│  ├── map_assertions(doc) → ISA mapping + L0-L5 level     │
│  ├── analyze_gaps(pack) → missing evidence + readiness % │
│  ├── draft_finding(gap) → C-C-C-E-R structured finding   │
│  └── prepare_transaction(action) → unsigned PTB          │
│                                                          │
│  ❌ Cannot: modify documents                             │
│  ❌ Cannot: sign or submit transactions                  │
│  ❌ Cannot: access other engagements                     │
│  ❌ Cannot: make external network calls                  │
│  ❌ Cannot: persist plaintext outside MemWal             │
└──────────────────────────────────────────────────────────┘
```

## Agent Output Schemas

All agent outputs are validated against JSON schemas before storage or chain logging.

### Classification Output

```json
{
  "document_id": "doc_001",
  "filename": "bank_statement_q1.pdf",
  "document_type": "bank_statement",
  "confidence": 0.94,
  "rationale": "Contains account number, transaction dates, running balances, and bank header.",
  "limitations": "Company-uploaded (L2). Not independently verified through bank connector.",
  "assertions": [0, 1, 2, 7],
  "assertion_labels": ["Existence", "Completeness", "Valuation & Allocation", "Accuracy"],
  "source_confidence": "L2",
  "source_confidence_reason": "Uploaded by company wallet. No connector verification."
}
```

### C-C-C-E-R Finding Output

```json
{
  "finding_id": "FND-001",
  "severity": "MEDIUM",
  "title": "Missing approval evidence for revenue recognition",
  "condition": "No board approval or authorization log found for Q1 2026 revenue transactions totaling $142,500.",
  "criteria": "ISA 500 requires sufficient appropriate evidence for Rights & Obligations assertion. Board authorization documents provide evidence of approval authority.",
  "cause": "Company evidence pack contains invoices, contracts, and bank statements but no approval chain documentation.",
  "effect": "Auditor cannot verify that recorded revenue was properly authorized. This may result in a qualified opinion or additional procedures.",
  "recommendation": "Upload board minutes, approval logs, or authorization matrix showing revenue recognition approval for the audit period.",
  "citations": [
    {
      "document_id": "doc_001",
      "filename": "invoice_4021.pdf",
      "reference": "Invoice total $47,500 — no matching approval document",
      "confidence": 0.88
    }
  ],
  "missing_assertions": [3, 5],
  "missing_assertion_labels": ["Rights & Obligations", "Classification"],
  "status": "DRAFT"
}
```

### Gap Analysis Output

```json
{
  "pack_id": "pack_001",
  "total_assertions": 8,
  "covered_assertions": [0, 1, 2, 6, 7],
  "covered_labels": ["Existence", "Completeness", "Valuation", "Occurrence", "Accuracy"],
  "missing_assertions": [3, 4, 5],
  "missing_labels": ["Rights & Obligations", "Cut-off", "Classification"],
  "readiness_score": 62,
  "recommendations": [
    "Upload board minutes or approval logs (Rights & Obligations)",
    "Upload period-end shipping documents or last invoice numbers (Cut-off)",
    "Upload chart of accounts or journal entry documentation (Classification)"
  ],
  "evidence_count": 4,
  "finding_count": 1
}
```

## Agent Orchestration Flow

```
User uploads documents
        │
        ▼
┌─── FOR EACH DOCUMENT ───────────────────────────┐
│                                                   │
│  1. classify_evidence(doc)                        │
│     → type, assertions, confidence, limitations   │
│     → memwal.remember(classification)             │
│                                                   │
│  2. extract_metadata(doc)                         │
│     → dates, parties, amounts, cited locations    │
│     → memwal.remember(metadata)                   │
│                                                   │
│  3. map_assertions(doc)                           │
│     → ISA assertion mapping + source confidence   │
│     → memwal.remember(assertion_mapping)          │
│                                                   │
└───────────────────────────────────────────────────┘
        │
        ▼
4. analyze_gaps(pack)
   → memwal.recall("What evidence exists for this pack?")
   → Compare against ISA 500 requirements
   → readiness score + missing assertions
   → memwal.remember(gap_analysis)
        │
        ▼
5. draft_finding(gap)
   → C-C-C-E-R structured finding
   → memwal.remember(finding)
        │
        ▼
6. HUMAN REVIEW GATE
   → User reviews classifications, gaps, findings
   → Accept / Edit / Reject each item
        │
        ▼
7. On approval:
   → Hash approved agent outputs
   → Prepare PTB: register evidence + link to pack + log AgentAction
   → User signs → submit to Sui
        │
        ▼
8. Store audit pack manifest to Walrus
   → Upload memory manifest with all refs
```

---

# 10. ISA 500 Evidence Mapping

> **Caveat:** Assertion mapping is an **audit-readiness aid**, not a professional audit conclusion.

## Assertion Definitions (ISA 500)

| ID | Assertion | Definition | Example Evidence |
|---|---|---|---|
| 0 | **Existence** | Assets, liabilities, equity interests exist at period end | Bank confirmation, physical inventory count |
| 1 | **Completeness** | All items that should be recorded have been recorded | Bank reconciliation, vendor statement reconciliation |
| 2 | **Valuation & Allocation** | Amounts are recorded at appropriate values | Appraisal reports, impairment analyses |
| 3 | **Rights & Obligations** | Entity holds rights to assets; liabilities are its obligations | Contracts, title deeds, board minutes |
| 4 | **Cut-off** | Transactions recorded in the correct period | Shipping docs near period end, last invoice number |
| 5 | **Classification** | Items recorded in proper accounts | Chart of accounts, journal entry documentation |
| 6 | **Occurrence** | Transactions actually took place during the period | Invoices, purchase orders, delivery receipts |
| 7 | **Accuracy** | Amounts and data recorded correctly | System reports, third-party confirmations |

## Evidence Type → Assertion Matrix

| Evidence Type | Exist. | Compl. | Valuat. | Rights | Cut-off | Class. | Occur. | Accur. |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Bank Statement | ✓ | ✓ | ✓ | | | | | ✓ |
| Bank Confirmation | ✓ | ✓ | ✓ | ✓ | | | | ✓ |
| Invoice | ✓ | | | | ✓ | ✓ | ✓ | ✓ |
| Purchase Order | | ✓ | | ✓ | ✓ | | ✓ | |
| Contract | ✓ | | | ✓ | ✓ | ✓ | | |
| Board Minutes | ✓ | | | ✓ | | | ✓ | |
| System Export (ERP) | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ |
| Delivery Receipt | ✓ | | | | ✓ | | ✓ | |
| Appraisal Report | | | ✓ | | | | | ✓ |
| Vendor Statement | | ✓ | | | | | | ✓ |

---

# 11. Concrete Demo Scenario

## The Acme Audit-Readiness Story

### Characters

- **Wallet A (Company):** Acme Corp CFO preparing Q2 2026 revenue evidence
- **Wallet B (Auditor):** External auditor reviewing Acme's evidence pack

### Demo Evidence Pack (3-5 files)

| File | Type | ISA Assertions | Source Confidence | Has Gap? |
|---|---|---|---|---|
| `bank_statement_q2.pdf` | Bank Statement | Existence, Completeness, Valuation, Accuracy | L2 | No |
| `invoice_4021.csv` | Invoice | Existence, Cut-off, Classification, Occurrence, Accuracy | L2 | No |
| `customer_contract.pdf` | Contract | Existence, Rights & Obligations, Cut-off, Classification | L2 | No |
| `delivery_receipt.pdf` | Delivery Receipt | Existence, Cut-off, Occurrence | L2 | No |
| *(intentionally missing)* | Board Minutes | Rights & Obligations, Occurrence | — | **YES — the gap** |

**Expected gap:** No board minutes or approval logs → missing Rights & Obligations coverage → agent recommends uploading approval documentation.

### Demo Flow (≤5 minutes)

**Act 1 — The Problem (30 sec)**
- Quick stats: PCAOB 39%, IFIAR 35%. "Audit evidence is broken."
- Show a messy folder of files. "This is what companies send auditors."

**Act 2 — Company Uploads Evidence (1.5 min)**
- Connect Wallet A (Company)
- Create AuditPack: "Q2 2026 Revenue Evidence"
- Upload 4 evidence files in batch
- **Agent activates** — activity feed shows classification in real-time:
  - "Bank statement → Existence, Completeness, Valuation, Accuracy (L2)"
  - "Invoice → Existence, Cut-off, Classification, Occurrence, Accuracy (L2)"
- Agent saves memory to MemWal: `memwal.remember(classifications)`
- Agent registers evidence on Sui (user signs PTB)
- **Coverage dashboard lights up**: 7/8 assertions covered, readiness 72%

**Act 3 — Agent Identifies Gap (1 min)**
- Agent recalls prior memory: `memwal.recall("What evidence exists?")`
- Dashboard shows gap: "Missing: Rights & Obligations"
- Agent drafts C-C-C-E-R finding:
  - Condition: No approval evidence found
  - Criteria: ISA 500 requires Rights & Obligations assertion
  - Recommendation: Upload board minutes or authorization matrix
- Agent logs `AgentAction` event on Sui (hash of finding output)

**Act 4 — Auditor Reviews & Attests (1 min)**
- Switch to Wallet B (Auditor)
- Auditor views AuditPack with evidence + agent findings
- Auditor verifies hash for each evidence item → ✅ VERIFIED
- Auditor creates Attestation (signed with Wallet B)
- Coverage dashboard updates: source confidence upgraded to L3

**Act 5 — The Proof (1 min)**
- Show proof dashboard: AuditPack ID, EvidenceRecord IDs, AgentAction event, Walrus blob IDs, Attestation IDs
- Tamper test: upload modified file → ❌ TAMPERED
- Upload original → ✅ VERIFIED
- Show MemWal recall: agent remembers classifications from earlier session
- Close: **"The agent proposes. The human signs. The chain proves. And the chain proves the agent, too."**

---

# 12. Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Sui Move |
| Chain RPC | Sui Testnet (direct @mysten/sui, no Tatum) |
| Evidence Storage | Walrus (testnet) |
| Agent Memory | MemWal (@mysten-incubation/memwal) with direct Walrus fallback |
| Encryption | AES-256-GCM (Web Crypto API) |
| SDK | TypeScript (`@mysten/sui`, `@mysten/walrus`, `@mysten-incubation/memwal`) |
| Web UI | Next.js + TypeScript + Vanilla CSS |
| Wallet | `@mysten/dapp-kit` |
| Agent | LLM API (Claude/GPT-4) + tool-use pattern |

---

# 13. Project Structure

```
linow/
├── docs/
│   ├── MASTER_SUI.md             ← you are here
│   ├── ARCHITECTURE.md           (existing)
│   ├── task_sui_overflow.csv     (scoped hackathon tasks)
│   ├── task_v2.csv               (long-term tasks)
│   └── docs-archive/             (reference docs)
├── contracts/
│   └── linow/
│       ├── Move.toml
│       └── sources/
│           ├── evidence.move     (EvidenceRecord + Attestation — existing)
│           ├── audit_pack.move   (AuditPack — NEW)
│           └── agent_action.move (AgentAction event — NEW)
├── sdk/
│   └── src/
│       ├── index.ts
│       ├── client.ts             (LinowClient — existing)
│       ├── crypto.ts             (AES + SHA-256 — existing)
│       ├── walrus.ts             (upload/download — existing)
│       ├── memwal.ts             (MemWal adapter — NEW)
│       ├── audit-pack.ts         (AuditPack SDK — NEW)
│       ├── agent-action.ts       (AgentAction SDK — NEW)
│       └── types.ts
├── app/
│   └── src/
│       └── app/
│           ├── page.tsx          (landing — existing)
│           ├── workspace/
│           │   ├── page.tsx      (main workspace — extend)
│           │   ├── audit-pack/   (NEW — pack workspace UI)
│           │   └── proof/        (NEW — proof dashboard)
│           └── agent/
│               ├── tools/        (NEW — agent tool implementations)
│               ├── schemas/      (NEW — JSON output schemas)
│               └── orchestrator/ (NEW — agent flow)
├── demo/
│   ├── evidence/                 (demo evidence files)
│   └── expected-outputs/         (expected agent outputs)
└── README.md
```

---

# 14. What's New Since Tatum

The Sui Overflow rules require "substantial new functionality" for existing projects. Here is what is newly built:

| Component | Status at Tatum | New for Sui Overflow |
|---|---|---|
| **Agent pipeline** | Did not exist | 6 agent tools: classify, extract, map, gap, finding, prepare_tx |
| **C-C-C-E-R findings** | Did not exist | Structured Condition-Criteria-Cause-Effect-Recommendation output |
| **AuditPack** | Optional, not built | New Move object grouping evidence with coverage tracking |
| **AgentAction events** | Did not exist | New Move event logging agent reasoning on-chain |
| **MemWal integration** | Did not exist | Persistent agent memory via Walrus Memory SDK |
| **Coverage dashboard** | Did not exist | ISA assertion heat map with readiness score |
| **Gap analysis** | Did not exist | Agent identifies missing evidence and recommends uploads |
| **Two-wallet flow** | Single wallet only | Company wallet + auditor wallet with distinct roles |
| **Batch upload** | Single file only | Multi-file evidence registration in one PTB |
| **Agent activity feed** | Did not exist | Real-time display of agent classification and analysis |
| **Proof dashboard** | Basic tx display | Full proof surface: pack, evidence, agent action, Walrus, attestation IDs |

---

# 15. Scope & Non-Goals

## In Scope (June 21)

- AI audit agent with 6 tool APIs
- MemWal for persistent agent memory (+ direct Walrus fallback)
- Raw Walrus for encrypted evidence blobs
- AuditPack and AgentAction on Sui (Move)
- Coverage dashboard + gap analysis UI
- Two-wallet company → auditor flow
- C-C-C-E-R finding generation
- Proof dashboard
- Demo video ≤5 min
- README + architecture docs

## NOT in Scope (Excluded)

- Desktop app (Tauri) — long-term vision, not hackathon
- Full MCP integration — post-hackathon
- Multiple audit frameworks (ISO, SOC, GDPR) — ISA 500 only
- Source-system connectors (QuickBooks, Xero) — post-hackathon
- Full LangGraph multi-agent orchestration — single agent with tools
- Report generator — findings are the output, not a formatted PDF
- Mainnet deployment — stretch goal only
- Token / tokenomics — not applicable

---

# 16. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Agent produces bad classifications | Medium | High | Test against known-good demo pack. Schema validation. Pre-cache demo outputs as safety net. |
| MemWal relayer/delegate setup fails | Medium | Medium | SO-24a: direct Walrus fallback path. Demo is never blocked. |
| Seal integration takes too long | High | Low | Timeboxed (SO-29). MemWal may provide Seal by default. Document as next step if cut. |
| UI feels bolted-on | Medium | Medium | Extend existing dark-mode workspace shell. Don't redesign. |
| Demo video doesn't tell a story | Medium | High | Script it (Act 1-5 above). Rehearse (SO-34). Two wallets. |
| Judges see "notarization" | Low | High | Agent activity feed + gap analysis + C-C-C-E-R = visually different from notarization |
| 9-day timeline is too tight | Medium | High | A and B work in parallel. Cut Seal, landing page, verifier/export if needed. |

---

# 17. Competitive Landscape

| Player | What They Do | Our Difference |
|---|---|---|
| **Vanta** ($7K-$30K/yr) | Compliance automation SaaS | Centralized. No tamper-proof evidence. Closed ecosystem. Prices out 90% of companies. |
| **Diligent** | Board governance + audit SaaS | Enterprise-only. No on-chain proof. No AI agent. |
| **Blockchain notarization** | Hash-on-chain services | No audit context. No assertion mapping. No agent. No findings. |
| **Generic MemWal chatbots** | Chatbots with persistent memory | No domain expertise. No structured output. No multi-party trust. |
| **Linow** | Agentic audit-readiness with Walrus memory | AI agent + ISA 500 domain + C-C-C-E-R findings + MemWal memory + Sui proof + multi-party trust |

---

# 18. Post-Hackathon Path

| Step | Timeline | Notes |
|---|---|---|
| Mainnet deployment | Post-announcement | Unlocks remaining 50% of Sui Overflow prize |
| Sui Basecamp 2026 | August 2026 | Winners announced. Visibility opportunity. |
| Pilot with 1-3 companies | Q3 2026 | Real evidence, real audit cycle |
| Apply to Alliance/accelerator | Q4 2026 | With hackathon win + pilot data |
| Seal production integration | Q3-Q4 2026 | Replace AES with decentralized key management |
| Source-system connectors | Q4 2026+ | QuickBooks, Xero, bank APIs for L4-L5 |
| Tauri desktop app | Q1 2027 | Transition from web to desktop IDE per MASTER.md |

---

# 19. Submission Checklist

- [ ] DeepSurge profile created
- [ ] Project registered on DeepSurge
- [ ] GitHub repo (public during judging)
- [ ] Demo video (≤5 min, YouTube)
- [ ] Project logo (1:1 JPG/PNG)
- [ ] Website (existing landing page, updated)
- [ ] Deployed to testnet
- [ ] Package ID recorded
- [ ] README rewritten with agent-first narrative
- [ ] Submit before **June 21** (Pacific Time)
- [ ] Available for virtual Demo Day (July 20-21)
- [ ] KYC for at least one team member

---

# 20. Resource Links

| Resource | URL |
|---|---|
| Sui Docs | https://docs.sui.io/ |
| Move Book | https://move-book.com/ |
| Walrus Docs | https://docs.wal.app/ |
| MemWal Docs | https://memory.walrus.xyz |
| MemWal GitHub | https://github.com/mysten-incubation/memwal |
| MemWal npm | `@mysten-incubation/memwal` |
| Seal Docs | (via Walrus docs → Seal section) |
| Sui SDK (TS) | https://sdk.mystenlabs.com/ |
| Walrus SDK (TS) | `@mysten/walrus` on npm |
| dApp Kit | `@mysten/dapp-kit` |
| Sui Overflow Handbook | https://go.sui.io/overflow26-participant-handbook |
| Sui Overflow Telegram | https://go.sui.io/suioverflow2026-tg |
| Walrus Telegram | (from walrus track docs) |
| ISA 500 Standard | IFAC / IAASB publications |

---

# Changelog

| Date | Change |
|---|---|
| 2026-06-12 | Initial MASTER_SUI.md created. Adapted from MASTER_TATUM.md with Walrus track focus, MemWal integration, agent pipeline, C-C-C-E-R findings, and updated architecture. |

---

*This document is the single source of truth for the Sui Overflow 2026 submission. All design decisions, schemas, and scope boundaries must be reflected here.*
