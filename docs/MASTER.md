# LINOW - MASTER SYSTEM CONTEXT DOCUMENT
**Version:** 1.0  
**Status:** Foundation Reference - Development Ready  
**Last updated:** 2025  
**Purpose:** Granular reference for development - architecture, agents, system, and final design decisions

---

## TABLE OF CONTENTS

1. [Product Vision & Philosophy](#1-product-vision--philosophy)
2. [Product Positioning & Competitors](#2-product-positioning--competitors)
3. [Domain Knowledge: Audit](#3-domain-knowledge-audit)
4. [Overall System Architecture](#4-overall-system-architecture)
5. [Linow Desktop Application (IDE Layer)](#5-linow-desktop-application-ide-layer)
6. [Sandbox & Privacy System](#6-sandbox--privacy-system)
7. [Hash System - Two Layers](#7-hash-system---two-layers)
8. [Agent Architecture](#8-agent-architecture)
9. [MCP Integration System](#9-mcp-integration-system)
10. [Knowledge Base & RAG](#10-knowledge-base--rag)
11. [Finding System (C-C-C-E-R)](#11-finding-system-c-c-c-e-r)
12. [Human-in-the-Loop Gate](#12-human-in-the-loop-gate)
13. [Trust Layer - Blockchain (Optional)](#13-trust-layer---blockchain-optional)
14. [System Modules](#14-system-modules)
15. [End-to-End Data Flow](#15-end-to-end-data-flow)
16. [Storage Architecture](#16-storage-architecture)
17. [Cloud Intelligence Layer](#17-cloud-intelligence-layer)
18. [UI/UX System](#18-uiux-system)
19. [Tech Stack](#19-tech-stack)
20. [Non-Negotiable Principles](#20-non-negotiable-principles)
21. [Roadmap](#21-roadmap)
22. [Glossary](#22-glossary)

---

## 1. PRODUCT VISION & PHILOSOPHY

### 1.1 One Sentence

> **Linow is a global AI audit platform in the form of an IDE, where anyone, professional auditors or companies without an audit team, can run a full audit process with professional standards without needing to learn how audit works.**

### 1.2 Core Philosophy

```
PROFESSIONAL AUDITOR            NON-AUDITOR (Company)
Linow = Copilot                 Linow = Autopilot
AI propose, human decide        AI runs the process, human approves each step
All control is in the           Simple notifications, business language
auditor's hands                 no need to learn audit terminology
```

**What does not change in both modes:** AI never finalizes anything without explicit human approval. This is non-negotiable.

### 1.3 Product Analogy

| Reference | What Linow adopts |
|---|---|
| **VS Code / Cursor** | Desktop IDE, panel-based, extensible via plugins |
| **Claude Code / GitHub Copilot** | AI agent inside the IDE, intelligence in the cloud |
| **Canva** | Professional workflow behind the scenes, even non-technical users can use it |
| **Notion** | Same engine, different behavior depending on the user |

### 1.4 Design Principles

1. **Invisible Workflow** - the user does not need to know there is audit planning, fieldwork, and reporting behind the scenes. Linow runs it.
2. **Privacy by Architecture** - original documents never leave the device.
3. **Explainability First** - every AI output must show where it came from.
4. **Human Always Decides** - AI only proposes and highlights. Humans approve.
5. **Extensible by Design** - MCP allows Linow to connect to any ecosystem.

---

## 2. PRODUCT POSITIONING & COMPETITORS

### 2.1 Target Market

- **Global** - all companies, all sizes, all industries
- **All frameworks** - ISO 27001, SOC 2, GDPR, Indonesian PDP Law, OJK, HIPAA, PCI-DSS, IFRS, and so on
- **Two types of users:** professional auditors (public accounting firms, firms, internal audit) and non-auditors (founders, CFOs, compliance officers)

### 2.2 Main Competitor: Vanta

| Dimension | Vanta | Linow |
|---|---|---|
| **How it works** | Integration-based, pulls data from cloud infrastructure | Document-based + AI analysis, reads all types of documents |
| **Standards** | SOC 2, ISO 27001, HIPAA, GDPR (US/EU focus) | All global frameworks including local regulations |
| **Pricing** | $7,000-$30,000/year | Accessible for all sizes |
| **Trust** | Centralized, data is on Vanta's servers | Verifiable, hash on-chain, no need to trust Linow |
| **Depth** | Pass/fail per control, no substantive finding | Full C-C-C-E-R finding with document citation |
| **Privacy** | Full connection to company infrastructure | Original documents never leave the device |
| **Extensibility** | Closed ecosystem | MCP, connected to any tools |

### 2.3 Other Competitors to Watch

- **Sprinto** - more aggressive expansion into Asia, more nimble than Vanta
- **Drata / Secureframe** - Vanta-like competitors
- **Local public accounting firms that are starting digitalization** - deep domain knowledge but no product mindset

### 2.4 Linow's Structural Advantages

```
1. Document-first: does not need modern cloud infrastructure
2. Framework-agnostic: modular KB, auto-compose per company profile  
3. Privacy by architecture: documents do not leave the device
4. Verifiable trust: on-chain, not centralized server
5. MCP extensibility: open ecosystem, not locked-in
6. IDE experience: familiar for technical users, powerful for everyone
```

---

## 3. DOMAIN KNOWLEDGE: AUDIT

### 3.1 Definition of Audit

A systematic verification process: ensuring *what is claimed* matches *what actually happens*, based on certain standards or criteria.

```
Actual Condition  VS  Criteria/Standard  →  Gap (Finding)  →  Recommendation
```

### 3.2 Universal Audit Process (4 Phases)

```
PLANNING → EXECUTION (FIELDWORK) → REPORTING → FOLLOW-UP
```

Linow runs all four phases invisibly behind the scenes. The user only sees a natural work interface.

### 3.3 Anatomy of a Finding: C-C-C-E-R Format

> **The basic unit of the entire system. Every AI output must follow this format.**

```
CONDITION      → What was found (facts from the document)
CRITERIA       → What should be in place (standard reference)
CAUSE          → Why it happened
EFFECT         → Its impact (business risk, not audit jargon)
RECOMMENDATION → Actionable improvement advice
```

**Example output for non-auditors (different framing, same substance):**
- **Condition:** 47 employee accounts of people who have resigned are still active in the system
- **Criteria:** ISO 27001 A.9.2.6 requires access revocation immediately after offboarding
- **Cause:** There is no automated process that synchronizes the HR system with Active Directory
- **Effect:** Former employees can still access company data, creating a data leakage risk
- **Recommendation:** Implement automated user lifecycle management that connects the HR system to AD

### 3.4 Severity Rating

| Level | Criteria | Action Time |
|---|---|---|
| 🔴 Critical | Direct risk, major impact | Immediate |
| 🟠 High | Significant risk | 30 days |
| 🟡 Medium | Moderate risk | 90 days |
| 🟢 Low | Best practice not yet implemented | 180 days |

### 3.5 Supported Frameworks (Modular KB)

```
IT SECURITY        → ISO 27001, NIST CSF, SOC 2 Type II
DATA PRIVACY       → GDPR, Indonesian PDP Law, Singapore/Thailand PDPA, CCPA
FINANCIAL          → IFRS, PSAK, ISA 500, GAAP
INDUSTRY-SPECIFIC  → PCI-DSS (payment), HIPAA (healthcare), MAS TRM (Singapore)
FINANCIAL REGULATOR → OJK, POJK, SE OJK (Indonesia), FCA (UK), MAS (SG)
GOVERNANCE         → COBIT 2019, COSO Framework, IIA Standards
```

**Auto-compose:** when a new company is onboarded, Linow asks 3-5 profile questions (industry, location, size, already has an auditor?) then auto-loads the relevant framework bundle.

---

## 4. OVERALL SYSTEM ARCHITECTURE

### 4.1 Three Main Layers

```
┌─────────────────────────────────────────────────────┐
│           ☁  CLOUD - Linow Intelligence             │
│                                                     │
│  AI Model (Claude API → Linow Model)                │
│  Audit Engine · Orchestrator · Framework KB         │
│  User Management · Billing · Analytics              │
└──────────────────────┬──────────────────────────────┘
                       │ API call
                       │ (only extracted text + metadata)
                       │ (NOT original files)
┌──────────────────────▼──────────────────────────────┐
│         💻  LOCAL - Linow Desktop App (IDE)         │
│                                                     │
│  Sandbox (original documents, never leave)          │
│  Local Extraction Engine                            │
│  Working Memory (engagement history, finding drafts)│
│  Preview Renderer (read-only highlight layer)       │
│  Hash Engine (SHA-256, local)                       │
└──────────────────────┬──────────────────────────────┘
                       │ MCP protocol
┌──────────────────────▼──────────────────────────────┐
│         🔌  MCP SERVERS - External Context          │
│                                                     │
│  Jira · GitHub · Slack · Teams · ERP · SAP          │
│  Custom tools from public accounting firms or       │
│  specific vendors                                   │
│  Sui Blockchain (trust layer, optional)             │
└─────────────────────────────────────────────────────┘
```

### 4.2 Data Flow Principles

```
[ORIGINAL DOCUMENT]
     │
     ▼ (inside sandbox, local)
[EXTRACTION] → clean text + metadata + structure
     │                    │
     │                    ▼
     │             [HASH #1 - local]
     │             stored in local DB
     │             for internal integrity check
     │
     ▼ (sent to cloud, NOT original file)
[CLOUD AI] → analysis, cross-ref KB, generate citation
     │
     ▼ (returned to local)
[FINDING DRAFT] → stored in local memory
     │
     ▼ (when user finishes work)
[SAVE LOCALLY] → working memory, finding, audit trail
     │
     ▼ (optional, user chooses)
[HASH #2 - on-chain] → SHA-256 sent to Sui blockchain
                        original document remains local
```

---

## 5. LINOW DESKTOP APPLICATION (IDE LAYER)

### 5.1 Concept

Linow is downloaded and run like VS Code or Cursor. It is not a web app. This matters for:
- Access to the local file system (sandbox)
- Running the local extraction engine
- Privacy, documents never leave
- Performance, preview rendering is faster
- Can work offline for local work (AI needs connection)

### 5.2 Panel Layout (IDE-Inspired)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TITLEBAR: [Engagement Name] · [Phase] · [Progress] · [Status]      │
├────────────┬────────────────────────────────────┬───────────────────┤
│            │                                    │                   │
│  EXPLORER  │      SANDBOX VIEWER                │   AGENT PANEL     │
│  PANEL     │      (Read-only preview)           │                   │
│            │                                    │  ┌─────────────┐  │
│  📁 Eng.   │  ┌──────────────────────────────┐  │  │ AI ACTIVITY │  │
│  ├─ /docs  │  │                              │  │  │             │  │
│  │  ├─ fin │  │  [Document rendered here]    │  │  │ Reading...  │  │
│  │  ├─ it  │  │                              │  │  │ ░░░░░░░     │  │
│  │  └─ hr  │  │  ████ highlighted text ████  │  │  └─────────────┘  │
│  ├─ /find  │  │  ░░░░ reading trace ░░░░░    │  │                   │
│  └─ /rep   │  │  ████ flagged finding ████   │  │  ┌─────────────┐  │
│            │  │                              │  │  │ FINDINGS    │  │
│  FINDINGS  │  └──────────────────────────────┘  │  │ 🔴 3 Crit  │  │
│  ────────  │                                    │  │ 🟡 7 Med   │  │
│  🔴 3      │  [citation detail panel]           │  │ 🟢 12 Low  │  │
│  🟡 7      │  When user click highlight:        │  └─────────────┘  │
│  🟢 12     │  → show C-C-C-E-R draft            │                   │
│            │  → show standard reference         │  ┌─────────────┐  │
│  MCP       │  → Accept / Edit / Reject          │  │ CHAT/QUERY  │  │
│  ────────  │                                    │  │ "Why was   │  │
│  ● Jira    │                                    │  │  this      │  │
│  ● GitHub  │                                    │  │  flagged?" │  │
│  ○ Slack   │                                    │  └─────────────┘  │
│            │                                    │                   │
└────────────┴────────────────────────────────────┴───────────────────┘
```

### 5.3 Panel Breakdown

**Explorer Panel (left)**
- Engagement file tree (docs, findings, reports)
- Finding list with severity badge
- MCP connections status (connected/disconnected)
- Active frameworks

**Sandbox Viewer (center) - CORE UX**
- Document preview: PDF, Excel, Word, all rendered here
- Three visual overlay layers (see Section 6)
- Citation detail panel when user clicks a highlight
- Accept / Edit / Reject button per finding proposal

**Agent Panel (right)**
- AI Activity feed, what the AI is doing
- Finding queue with severity
- Chat/query interface, user can ask the AI about a finding

---

## 6. SANDBOX & PRIVACY SYSTEM

### 6.1 Definition of Sandbox

The sandbox is an isolated environment inside the Linow Desktop App where original documents are stored and processed locally. AI interacts with documents through the sandbox, not by directly accessing files.

```
FILE SYSTEM (user local)
         │
         ▼ (user opens/imports document)
    SANDBOX LAYER
    ┌────────────────────────────────┐
    │  Original file (immutable)     │ ← never modified
    │  Extracted text (working copy) │ ← sent to cloud AI
    │  Hash #1 (SHA-256)             │ ← fingerprint for integrity
    │  Annotation layer (separate)   │ ← highlights, notes, AI marks
    │  Rendered preview              │ ← displayed in viewer
    └────────────────────────────────┘
         │
         ▼ (only this leaves)
    CLOUD AI ← text + metadata + analysis question
```

### 6.2 Three Visual Layers in Sandbox Viewer

**Layer 1 - Reading Trace (Animated)**
```
Yellow = being read / relevant to the current analysis
Blue   = cross-referenced with another document in the engagement
Red    = flagged as a potential finding
```
Highlights move in an animated way to show that the AI is processing. AI returns citations (precise locations), and the UI animates them sequentially. This is not deceptive, because the AI really found information from those locations.

**Layer 2 - Citation Detail (On-Click)**
```
User clicks red area → panel slides in:
┌─────────────────────────────────────────────┐
│ 🔴 Finding Proposal: Inactive User Accounts │
│ Severity: HIGH                              │
│                                             │
│ 📄 Evidence (page 3, paragraph 2):          │
│ [highlighted text from document]            │
│                                             │
│ 📋 Standard violated:                       │
│ ISO 27001 A.9.2.6                           │
│ [short quote from standard]                 │
│                                             │
│ 🔗 Related finding: FND-001 (15 Jan)        │
│                                             │
│ CONDITION    [...]                          │
│ CRITERIA     [...]                          │
│ CAUSE        [...]                          │
│ EFFECT       [...]                          │
│ RECOMMENDATION [...]                        │
│                                             │
│ [✅ Accept] [✏️ Edit] [❌ Reject]            │
└─────────────────────────────────────────────┘
```

**Layer 3 - Audit Trail (Background)**
```
Every action is recorded:
[timestamp] AI proposed finding FND-007 from page 3 paragraph 2
[timestamp] User edited finding FND-007, changed severity to MEDIUM
[timestamp] User confirmed finding FND-007
```

### 6.3 What Never Happens in the Sandbox

- Original files are never modified
- Original files are never sent to the cloud (only extracted text)
- Annotations are stored as a separate layer, not written into the file
- Memory does not automatically sync to the cloud, it is stored locally, and the user chooses

---

## 7. HASH SYSTEM - TWO LAYERS

### 7.1 Hash #1 - Internal Guard (Always Present)

```
PURPOSE   : Ensure documents do not change during the audit session
CREATED   : When the document first enters the sandbox
ALGORITHM : SHA-256
STORED    : Local SQLite, engagement DB
VERIFIED BY : Linow system itself (internal check)
NATURE    : Mandatory, automatic, invisible to the user

FLOW:
Document enters sandbox
    ↓
SHA-256 calculated from the original file bytes
    ↓
Hash stored in local DB
    ↓
Every time AI will process → hash recalculated → compared
If different → ALERT: "The document has changed since it was first imported"
```

**Analogy:** a seal on an internal envelope. To make sure the contents of the envelope do not change while work is in progress.

### 7.2 Hash #2 - External Proof (Optional)

```
PURPOSE   : Prove to external parties that the document is original and not falsified
CREATED   : When the user explicitly chooses "Register to Chain"
ALGORITHM : SHA-256 (same) → but what is stored is different
STORED    : Sui Blockchain, public, permanent, immutable
VERIFIED BY : Anyone in the world, without needing to trust Linow
NATURE    : Optional, at the end of the flow, consciously chosen by the user

FLOW:
User finishes work (audit completed or certain milestone)
    ↓
Linow shows dialog:
"Do you want to register these documents to the blockchain
 for permanent proof?"
    ↓
User chooses which documents to register
    ↓
SHA-256 hash sent to Sui blockchain
    ↓
Blockchain returns: transaction ID + timestamp
    ↓
Stored locally as an "on-chain certificate"
    ↓
Anyone can verify: file hash == blockchain hash → original
```

**Analogy:** a public notarial deed. Permanent, can be checked by anyone, not dependent on one party.

### 7.3 Critical Differences

| Aspect | Hash #1 (Internal Guard) | Hash #2 (External Proof) |
|---|---|---|
| Purpose | Internal integrity | External proof |
| Created | Automatically on import | Manually, when user chooses |
| Stored | Local SQLite | Sui Blockchain |
| Verification | Linow system | Anyone in the world |
| Document content | Remains local | Remains local (only hash is on-chain) |
| Mandatory | Yes | No |

---

## 8. AGENT ARCHITECTURE

### 8.1 Agent Philosophy

The Linow agent is not a rigid sequential pipeline. The agent is a **dynamic orchestrator** that calls the right tools from available MCP servers according to the context of the current work.

```
OLD AGENT (initial concept):
Orchestrator → Document → Analysis → Finding → Report
(pipeline, hardcoded tools)

LINOW AGENT (final):
Orchestrator that dynamically calls tools
from connected MCP servers

ISO 27001 analysis   → load MCP: Framework KB (ISO)
ERP contract analysis → load MCP: Data Connector (ERP)
Need verification    → load MCP: Trust Layer (Sui)
Healthcare auditor   → load MCP: 3rd Party (HIPAA specialist)
```

### 8.2 Five Core Agents

---

#### AGENT-01: Orchestrator (Master)

```
ROLE      : Coordinator of the entire system, does not perform analysis itself
NATURE    : Stateless (state is always loaded from local DB)
FRAMEWORK : LangGraph (stateful multi-agent + native human-in-the-loop)

RESPONSIBILITIES:
- Monitor the overall engagement state
- Decide which agent is called based on event
- Enforce human-in-the-loop gate (nothing passes without approval)
- Handle retry, error, timeout
- Route MCP tool calls to the correct server

EVENT → RESPONSE:
"New document enters sandbox"      → trigger Document Agent
"Document extraction complete"     → trigger Analysis Agent
"Analysis complete"                → trigger Finding Agent
"User approves finding"            → update state, check whether ready for report
"User requests generate report"    → trigger Report Agent
"MCP tool available"               → register to tool registry
"User query in chat panel"         → route to Analysis Agent with context

STATE MONITORED:
{
  engagement_id: string,
  phase: "planning" | "fieldwork" | "reporting" | "followup",
  documents: { id, status, hash }[],
  findings: { id, status, severity }[],
  mcp_connections: { name, status, tools }[],
  pending_human_approvals: { id, type, deadline }[]
}
```

---

#### AGENT-02: Document Agent

```
ROLE      : Processing all documents that enter the sandbox
RUNS      : Local (extraction) + cloud (embedding)

RESPONSIBILITIES:
1. Parse documents from the sandbox
   - PDF → extract text per page, per paragraph
   - Excel → extract per sheet, per semantic section
   - Word → extract per heading, per paragraph
   - Image/scan → OCR first, then extract

2. Semantic chunking (NOT by character count)
   Financial statement PDF → chunk per line item / footnote
   Transaction Excel       → chunk per transaction category
   Policy document         → chunk per article / section
   Log file                → chunk per time window or event type
   Contract                → chunk per clause

3. Calculate Hash #1 (SHA-256 from original bytes)

4. Store to local working memory:
   - Original path (pointer, not copied)
   - Extracted text chunks
   - Metadata (page count, type, date)
   - Hash #1

5. Embed chunks → Vector DB (local)
   Embedding model: can be offline (sentence-transformers) or
   cloud (OpenAI/Anthropic embedding API)

6. Update Orchestrator: "document ready to analyze"

INPUT  : File path from sandbox
OUTPUT : Chunks in Vector DB + metadata in local SQLite + Hash #1

ERROR HANDLING:
- Corrupt file → alert user, skip
- OCR failed → alert user, ask for a cleaner document
- Embedding timeout → retry 3x, then queue for later
```

---

#### AGENT-03: Analysis Agent

```
ROLE      : Core analysis, compare documents with standards
RUNS      : Cloud (AI inference) + local (retrieval)

RESPONSIBILITIES:
1. Query Vector DB (local) for context from other documents
   in the same engagement

2. Query Knowledge Base (cloud) for relevant frameworks
   "Which standards apply to this content?"

3. Run rule-based pre-checks (deterministic, does not need AI):
   - Format check (does the document follow the expected format?)
   - Completeness check (are all expected sections present?)
   - Date/period check (is the document for the audited period?)

4. Send to Cloud AI for deep analysis:
   Context sent to cloud:
   {
     extracted_text: string,      // text from document (not original file)
     relevant_chunks: string[],   // from other related documents
     applicable_standards: {      // from KB
       framework: string,
       controls: { id, text }[]
     }[],
     engagement_context: {        // about this engagement
       industry: string,
       scope: string[],
       period: string
     }
   }

5. Process response from Cloud AI:
   - Extract citations (precise location: page, paragraph, sentence)
   - Assign severity per citation
   - Detect cross-document relation
   - Flag for Finding Agent

OUTPUT FORMAT per citation:
{
  document_id: string,
  location: {
    page: number,
    paragraph: number,
    sentence_range: [number, number]
  },
  extracted_text: string,        // text to highlight
  matched_standard: {
    framework: string,
    control_id: string,
    control_text: string
  },
  gap_description: string,
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  confidence: number,            // 0.0 - 1.0
  related_findings: string[]     // finding IDs that already exist
}
```

---

#### AGENT-04: Finding Agent

```
ROLE      : Organize citations into structured C-C-C-E-R findings
RUNS      : Cloud (drafting) + local (dedup check)

RESPONSIBILITIES:
1. Receive citation list from Analysis Agent

2. Check deduplication:
   - Query local DB: "is there a similar finding that has already been confirmed?"
   - If yes → merge or link as related finding
   - If no → create new finding

3. Draft finding in C-C-C-E-R format:
   Input to Cloud AI:
   {
     citations: Citation[],
     existing_findings: Finding[], // for context and consistency
     framework_context: string,
     user_mode: "auditor" | "non-auditor"  // determines output language
   }

   If user_mode = "auditor":
     → technical language, audit terminology, complete standard references
   If user_mode = "non-auditor":
     → business language, impact in business context, actionable recommendation

4. Assign severity rating with justification

5. Set status: DRAFT
   DRAFT finding has not entered any report

6. Send to Orchestrator → trigger Human Review Gate
   Finding NEVER goes directly to CONFIRMED without a human

7. After human decides:
   CONFIRMED → save to local DB, ready for report
   EDITED    → save edited version (audit trail stores both versions)
   REJECTED  → save as rejected (still in audit trail, not included in report)

FINDING STATUS FLOW:
DRAFT → [HUMAN REVIEW] → CONFIRMED / EDITED+CONFIRMED / REJECTED
                              ↓
                        Only CONFIRMED goes into report
```

---

#### AGENT-05: Report Agent

```
ROLE      : Compile and generate reports from confirmed findings
RUNS      : Cloud (generation) + local (assembly)
TRIGGER   : Can ONLY be run explicitly by the user
            Never auto-triggered

RESPONSIBILITIES:
1. Validation: check whether there are findings still in DRAFT
   If yes → warn the user before generating

2. Compile all findings with CONFIRMED status

3. Generate report according to template:

   Template A - IT Audit Report:
   - Cover page
   - Executive Summary (overall maturity 1-5, top 3 issues)
   - Scope & Methodology
   - Risk & Control Matrix
   - Detailed Findings (C-C-C-E-R per finding)
   - Remediation Roadmap (per priority tier)
   - Appendix (working papers, evidence index)

   Template B - Compliance Report:
   - Per article/control: ✅ Compliant / ⚠️ Partial / ❌ Non-Compliant
   - Evidence per article
   - Compliance Matrix

   Template C - Management Report (non-auditor):
   - Business language, not audit jargon
   - "We found X things that need improvement"
   - Improvement priorities with estimated effort

4. Draft report → MUST be reviewed by user before export

5. Export options:
   - PDF (with or without "DRAFT" watermark)
   - Word (.docx) for further editing
   - JSON (for external integration)
   + Option: Register final document on-chain (Hash #2)
```

---

### 8.3 Agent State Machine (LangGraph)

```python
# Conceptual representation of LangGraph state

class LinowState(TypedDict):
    engagement_id: str
    phase: Literal["planning", "fieldwork", "reporting", "followup"]
    documents: List[DocumentState]
    citations: List[Citation]
    findings: List[Finding]
    pending_approvals: List[PendingApproval]
    mcp_tools: List[MCPTool]
    last_human_action: Optional[HumanAction]

# Nodes in graph
nodes = [
    "orchestrator",
    "document_agent",
    "analysis_agent",
    "finding_agent",
    "report_agent",
    "human_review",      # interrupt node, pauses for human input
]

# Edges with conditions
edges = {
    "orchestrator": conditional_routing,      # decide which agent
    "document_agent": "analysis_agent",
    "analysis_agent": "finding_agent",
    "finding_agent": "human_review",          # ALWAYS to human review
    "human_review": conditional_after_human,  # confirmed/edited/rejected
    "report_agent": "human_review",           # report must also be approved
}

# Human-in-the-loop: LangGraph interrupt
# When finding_agent finishes → graph pauses at "human_review"
# Graph resumes only after human inputs decision
```

---

## 9. MCP INTEGRATION SYSTEM

### 9.1 Concept

Linow acts as an **MCP Host**. Auditors or companies can connect external MCP servers to add context into AI analysis. Linow does not need to build all integrations, it uses an open ecosystem.

### 9.2 How It Works

```
LINOW (MCP Host)
├── Maintain registry of tools available from all MCP servers
├── When Analysis Agent needs additional context → query registry
├── Select relevant tool → call MCP server
├── Result from MCP → add as context to AI prompt
└── User can see in Explorer Panel: which tools are active

EXAMPLE FLOW:
Auditor is analyzing IT policy documents
    ↓
Analysis Agent detects: "there is a reference to a Jira ticket"
    ↓
Orchestrator checks: "is Jira MCP connected?"
    ↓ (yes)
Call Jira MCP → get ticket detail → add to context
    ↓
AI now knows the status of the referenced ticket
    ↓
Finding is more accurate because there is context from Jira
```

### 9.3 MCP Servers Relevant for Audit

```
BUILT-IN (built and maintained by Linow):
├── Framework KB Server  → ISO 27001, GDPR, Indonesian PDP Law, etc. (read-only)
├── Trust Layer Server   → Sui blockchain interaction
└── Local File Server    → safe access to local sandbox

3RD PARTY (users connect themselves):
├── Project Management   → Jira, Linear, Asana (view open issues)
├── Version Control      → GitHub, GitLab (view code changes, PRs)
├── Communication        → Slack, Teams (view relevant discussions)
├── ERP / Finance        → SAP, Oracle, Xero (pull financial data)
├── HR Systems           → Workday, BambooHR (user lifecycle data)
├── Cloud Infrastructure → AWS, GCP, Azure (pull config & logs)
└── Custom              → public accounting firms can build MCP servers for specific industries
```

### 9.4 Privacy in MCP

```
MCP connection still follows privacy principles:
- Data from MCP is treated the same as local documents
- Only relevant context is sent to Cloud AI
- User can see and control: "what Jira data is sent to AI?"
- Audit trail records every MCP call made
```

---

## 10. KNOWLEDGE BASE & RAG

### 10.1 Two Types of Knowledge Base

```
KB #1 - STATIC (Framework & Standards)
Location : Cloud (managed by Linow)
Content  : ISO 27001, GDPR, Indonesian PDP Law, SOC 2, etc., complete text
Update   : Periodically when standards are revised
Access   : Read-only, cannot be modified

KB #2 - DYNAMIC (Engagement Documents)
Location : Local (Vector DB on user device)
Content  : All document chunks uploaded in this engagement
Update   : Every time a new document enters
Reset    : Per new engagement (does not carry over)
Access   : Read-write by Document Agent
```

### 10.2 Analysis Agent Query Strategy

```
Step 1: Query KB #2 (local)
"Other documents in this engagement that discuss this topic?"
→ find cross-reference or contradiction

Step 2: Query KB #1 (cloud)
"What framework applies to this content based on company profile?"
→ load relevant framework bundle

Step 3: Synthesis
Compare condition from document vs requirement from standard
→ identify gap → generate citation

Step 4: Cross-engagement learning (future)
If Linow already has many engagements:
→ "Is this gap common in this industry?"
→ anonymous benchmarking (privacy-preserving)
```

### 10.3 Chunking Strategy (Critical)

> Do not chunk by character count. Chunk by semantic unit.

```
Financial statement PDF → chunk per line item, per footnote
Transaction Excel       → chunk per transaction category, per period
Policy document         → chunk per article, per section, per sub-section
Log file                → chunk per time window, per event category
Contract/agreement      → chunk per clause, per schedule
Email thread            → chunk per email (preserve context)
Meeting minutes         → chunk per agenda item
```

---

## 11. FINDING SYSTEM (C-C-C-E-R)

### 11.1 Finding Object Schema

```typescript
interface Finding {
  id: string;                         // FND-{engagement}-{sequence}
  engagement_id: string;

  // Content
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

  condition: string;                  // What was found
  criteria: string;                   // Standard reference
  cause: string;                      // Root cause
  effect: string;                     // Business impact
  recommendation: string;             // Improvement advice

  // Evidence
  citations: Citation[];              // References to original documents

  // Traceability
  status: "DRAFT" | "CONFIRMED" | "EDITED" | "REJECTED";
  proposed_at: ISO8601;               // When AI proposes
  proposed_by: "ai";

  reviewed_at?: ISO8601;              // When human reviews
  reviewed_by?: string;               // User ID who reviews
  review_action?: "accept" | "edit" | "reject";
  review_notes?: string;              // Notes from reviewer

  // Versioning
  versions: FindingVersion[];         // All versions (original AI + edits)

  // Relations
  related_findings: string[];         // Related finding IDs

  // On-chain (optional)
  on_chain_hash?: string;
  on_chain_tx?: string;
  on_chain_timestamp?: ISO8601;
}

interface Citation {
  document_id: string;
  document_name: string;
  page: number;
  paragraph: number;
  sentence_range: [number, number];
  extracted_text: string;             // Quoted text
  context: string;                    // Surrounding paragraph (for context)
}
```

### 11.2 Finding Status Flow

```
AI generate → DRAFT
                │
                ▼
        [HUMAN REVIEW GATE]
        User sees in Sandbox Viewer
        Click highlight → citation detail panel
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
CONFIRMED    EDITED      REJECTED
(as-is)   (modified)    (does not enter
              │           report, but remains
              ▼           in trail)
          CONFIRMED
          (edited version)
    │           │
    └─────┬─────┘
          ▼
     Goes into report
```

---

## 12. HUMAN-IN-THE-LOOP GATE

### 12.1 Principle

> AI never finalizes anything. AI only proposes and highlights. Humans decide.

This applies in **both modes**, copilot (auditor) and autopilot (non-auditor). What differs is only **how the gate is presented**, not the existence of the gate.

### 12.2 Gate for Copilot Mode (Professional Auditor)

```
Presentation : Citation detail panel in Sandbox Viewer
               Full C-C-C-E-R with complete standard references
               Can see exact highlighted text in the document

Options      : [✅ Accept] [✏️ Edit inline] [❌ Reject + reason]

Edit mode    : Auditor can modify condition, criteria, cause,
               effect, recommendation, severity, all fields
               AI version is still saved as version #1
               Edited version is saved as version #2

Reject mode  : Auditor fills in reason for rejection
               Finding does not disappear, remains in audit trail
               Useful for "why was this not included?"
```

### 12.3 Gate for Autopilot Mode (Non-Auditor)

```
Presentation : Simple notification in Agent Panel
               Business language, not audit terminology

Example notification:
"AI found 3 things that need your attention:

🔴 47 old employee accounts can still access the system
   Risk: former employees can view company data
   [View detail] [Mark as done] [Ignore]

🟡 Data backup is done manually, not automatically
   Risk: if backup is forgotten, data can be permanently lost
   [View detail] [Mark as done] [Ignore]"

Options      : [View detail] → expand to full C-C-C-E-R
               [Mark done] → CONFIRMED
               [Ignore] → REJECTED with note "user ignored"

Progressive  : User can "View detail" to enter a deeper view,
disclosure     same as copilot mode.
               But they are not forced to understand all technical details
```

### 12.4 What Cannot Be Ignored

```
Final report CANNOT be exported if:
- There is a finding in DRAFT status (not yet reviewed)
- User has not confirmed that review is complete

Linow will show:
"There are still 3 findings that have not been reviewed.
 Complete the review before generating the report."
```

---

## 13. TRUST LAYER - BLOCKCHAIN (OPTIONAL)

### 13.1 Position in the Flow

```
Trust layer is a feature at the END of the flow, not at the beginning.
User does not need to know about blockchain to start working.
```

### 13.2 When It Is Activated

```
Trigger:
1. User completes work (engagement complete)
2. User wants to share report with investors/regulators
3. User wants to store documents as permanent evidence

Dialog that appears:
"Your audit work is complete.
 Do you want to register these documents
 to the blockchain as permanent proof that cannot be changed?

 Registered: ONLY digital fingerprint (hash)
 Document content: remains on your device, does not go anywhere

 [Register now] [Skip for now]"
```

### 13.3 What Goes On-Chain

```
On-chain (public on Sui blockchain):
- SHA-256 hash of original file
- Registration timestamp
- Engagement ID (optional, can be anonymous)
- Hash of final report

NOT on-chain:
- Document content
- Company name (unless user chooses)
- Finding details
- Any sensitive information
```

### 13.4 Verification Method (For External Parties)

```
Investor/regulator receives Linow report:
1. Open Linow Verifier (public web app, free)
2. Upload document to verify
3. Linow Verifier calculates hash → compares with on-chain
4. Result: "✅ This document was registered on [date] and has never been changed"
          or "❌ Hash does not match, document may have been modified"

No Linow account needed for verification.
No need to trust Linow, the blockchain proves it.
```

---

## 14. SYSTEM MODULES

### MOD-01: Engagement Management

```
Function  : End-to-end audit project management

Entities:
  Engagement  → id, client_name, industry, location, size,
                audit_type, period, status, team, frameworks[]
  Audit Plan  → scope, checklist (auto-generated from framework),
                active standards, risk areas
  Timeline    → phase, milestone, deadline, completion

Features:
  - New engagement wizard:
    Q1: "What is the company's industry?" → determine applicable frameworks
    Q2: "Which country does the company operate in?" → determine regulations
    Q3: "What is the company size?" → calibrate scope
    Q4: "Does it already have an internal audit team?" → determine mode
    Q5: "What is the purpose of this audit?" → investor / regulator / internal
  - Auto-generate audit plan from profile
  - Framework bundle auto-composition
  - Progress tracking per phase
```

### MOD-02: Document Management

```
Function  : Management of all documents inside the sandbox

Entities:
  Document  → id, engagement_id, filename, sandbox_path,
              hash_sha1 (internal), category, import_date,
              extracted_text_path, status, on_chain_hash?

Features:
  - Import from local file system
  - Import via MCP (directly from Google Drive, SharePoint, etc.)
  - Auto-categorization (financial / IT / HR / policy / evidence)
  - Sandbox isolation (immutable original)
  - Preview rendering with annotation layer
```

### MOD-03: Analysis Engine

```
Function  : Coordinate document analysis through agents

Entities:
  Analysis Task  → id, document_id, frameworks[], status, started_at
  Citation       → (see schema Section 11)

Features:
  - Auto-trigger when document is ready
  - Multi-framework analysis in one pass
  - Cross-document relation detection
  - Confidence scoring per citation
  - MCP context enrichment
```

### MOD-04: Finding & Working Paper

```
Function  : Management of findings and work documentation

Entities:
  Finding           → (see schema Section 11)
  Working Paper     → finding_id, evidence[], analysis_notes, 
                      auditor_notes, methodology
  Management Response → finding_id, response, action_plan, 
                        PIC, deadline, status

Features:
  - Human review gate interface
  - Inline editing with version history
  - Cross-reference between findings
  - Management response tracking
  - Finding deduplication
```

### MOD-05: Report Generator

```
Function  : Generate reports from confirmed findings

Entities:
  Report  → id, engagement_id, template, generated_at, 
            status, sections[], export_format

Features:
  - Multi-template (IT, Compliance, Management)
  - Executive summary auto-generation
  - Risk & Control Matrix
  - Remediation Roadmap with timeline
  - Export: PDF, Word, JSON
  - Optional on-chain registration
```

---

## 15. END-TO-END DATA FLOW

### 15.1 Happy Path: Document → Confirmed Finding

```
1. USER IMPORTS DOCUMENT
   └─ Drag to Linow Explorer / Import from MCP

2. SANDBOX PROCESSING (local)
   └─ Document Agent:
      ├─ Calculate Hash #1 (SHA-256)
      ├─ Extract text (Tika / PyMuPDF / Tesseract)
      ├─ Semantic chunking
      └─ Embed → local Vector DB

3. CLOUD ANALYSIS
   └─ Analysis Agent:
      ├─ Query local Vector DB (cross-document)
      ├─ Query Cloud KB (applicable standards)
      ├─ Send extracted text + context to Cloud AI
      └─ Receive citations list

4. FINDING DRAFT
   └─ Finding Agent:
      ├─ Check deduplication
      ├─ Draft C-C-C-E-R via Cloud AI
      ├─ Assign severity
      └─ Status: DRAFT

5. HUMAN REVIEW GATE
   └─ Sandbox Viewer:
      ├─ Animated highlight on document
      ├─ User clicks → citation detail panel
      └─ User: Accept / Edit / Reject

6. FINDING CONFIRMED
   └─ Save to local SQLite
      Status: CONFIRMED
      Audit trail: timestamped

7. (OPTIONAL) ON-CHAIN REGISTRATION
   └─ User chooses "Register to Chain"
      ├─ Hash #2 sent to Sui
      └─ Receive tx ID + timestamp
```

### 15.2 Cross-Document Analysis Flow

```
Document N is imported
    ↓
Before generating citation:
Analysis Agent queries local Vector DB:
"Other documents that discuss a similar topic?"
    ↓
If there is a match:
→ cross-reference → add as context
→ detect contradiction between documents
→ alert: "This document is related to [doc X] imported on [date Y]"
    ↓
Generated finding becomes richer in context
```

---

## 16. STORAGE ARCHITECTURE

### 16.1 Local Storage (Per Engagement)

```
~/.linow/
├── engagements/
│   └── {engagement_id}/
│       ├── engagement.db          # SQLite: metadata, findings, trail
│       ├── vector.db              # ChromaDB: embedded chunks
│       ├── sandbox/
│       │   ├── originals/         # Original files (immutable, read-only)
│       │   │   ├── doc1.pdf
│       │   │   └── data.xlsx
│       │   ├── extracted/         # Text from extraction
│       │   └── annotations/       # Highlights, notes (separate from original)
│       ├── findings/
│       │   └── {finding_id}.json  # Finding object per file
│       ├── reports/
│       │   └── draft_v{n}.pdf
│       └── audit_trail.log        # Append-only event log
└── settings.json                  # App preferences, MCP connections
```

### 16.2 SQLite Schema

```sql
-- ENGAGEMENTS
CREATE TABLE engagements (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  size TEXT,
  audit_type TEXT,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'active',
  mode TEXT,                        -- 'auditor' | 'non-auditor'
  frameworks TEXT,                  -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DOCUMENTS
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  engagement_id TEXT REFERENCES engagements(id),
  filename TEXT NOT NULL,
  sandbox_path TEXT NOT NULL,       -- path to original in sandbox
  hash_sha256 TEXT NOT NULL,        -- Hash #1 (internal guard)
  category TEXT,
  import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  extracted_text_path TEXT,
  status TEXT DEFAULT 'processing',
  on_chain_hash TEXT,               -- Hash #2 (if registered)
  on_chain_tx TEXT,
  on_chain_timestamp DATETIME
);

-- FINDINGS
CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  engagement_id TEXT REFERENCES engagements(id),
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  condition_text TEXT NOT NULL,
  criteria_text TEXT NOT NULL,
  cause_text TEXT NOT NULL,
  effect_text TEXT NOT NULL,
  recommendation_text TEXT NOT NULL,
  citations TEXT NOT NULL,          -- JSON array of Citation objects
  status TEXT DEFAULT 'DRAFT',
  proposed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewed_by TEXT,
  review_action TEXT,
  review_notes TEXT,
  related_findings TEXT,            -- JSON array of finding IDs
  versions TEXT                     -- JSON array of FindingVersion objects
);

-- AUDIT TRAIL (append-only)
CREATE TABLE audit_trail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  engagement_id TEXT,
  entity_type TEXT,                 -- 'document' | 'finding' | 'report'
  entity_id TEXT,
  action TEXT,                      -- 'import' | 'propose' | 'confirm' | etc.
  actor TEXT,                       -- 'ai' | user_id
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  before_state TEXT,                -- JSON snapshot before
  after_state TEXT,                 -- JSON snapshot after
  metadata TEXT                     -- JSON extra info
);

-- MCP CONNECTIONS
CREATE TABLE mcp_connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  last_connected DATETIME,
  tools TEXT                        -- JSON array of available tools
);
```

---

## 17. CLOUD INTELLIGENCE LAYER

### 17.1 Current: Claude API

```
Model     : claude-sonnet-4-20250514 (or latest version)
Use cases : Deep document analysis, finding drafting, report generation
Max tokens: Adjusted per task

Prompt structure:
{
  system: "You are Linow's audit analysis engine...",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: extracted_document_text },
        { type: "text", text: applicable_standards_context },
        { type: "text", text: cross_document_context },
        { type: "text", text: analysis_instructions }
      ]
    }
  ]
}
```

### 17.2 During Growth: Linow Model

```
Linow will fine-tune or train its own model on:
- Audit finding patterns from all engagements (anonymous, privacy-preserving)
- Audit standards corpus
- Domain-specific reasoning for audit

Deploy  : Cloud (same as Claude API now)
Runtime : Still in cloud, user does not need to set up anything
Interface : Same API, switching models is not a breaking change
```

### 17.3 Multi-Model Support

```
Linow is designed to be model-agnostic:
- Current: Claude API
- Can be replaced with: OpenAI, Gemini, Mistral, or Linow's own model
- Enterprise user: can bring your own API key
- Settings in settings.json:
  { "ai_provider": "anthropic", "model": "claude-sonnet-4-20250514" }
```

---

## 18. UI/UX SYSTEM

### 18.1 UX Principles

1. **AI Is Not Seen as AI** - user interacts with the "Linow audit system", not an "AI chatbot"
2. **Invisible Complexity** - the 4-phase audit workflow runs behind the scenes
3. **Progressive Disclosure** - technical details are available but not forced
4. **Explain Yourself** - every AI output shows: which document, which page, which standard
5. **Zero Training Required** - onboarding only needs 5 profile questions

### 18.2 Onboarding Flow (New Engagement)

```
Screen 1: "Hello! Let's start. Tell us about your company:"
  → Company name, industry, size, location

Screen 2: "What is this audit for?"
  → Investor preparation / regulatory compliance / internal check / other

Screen 3: "Does the company already have an audit team?"
  → Yes (copilot mode) / No (autopilot mode)

Screen 4: "Linow recommends these frameworks for you:"
  → [ISO 27001] [Indonesian PDP Law] [OJK] - can add/remove

Screen 5: "Import your first document to start"
  → Drag & drop area / Browse files / Connect MCP

→ Engagement active, Linow starts working
```

### 18.3 Color System for Highlights

```
Yellow (#FFD700) → Reading trace: AI is processing this area
Blue   (#4A90E2) → Cross-reference: connected with another document
Red    (#E53E3E) → Critical/High finding: needs immediate attention
Orange (#ED8936) → Medium finding
Green  (#38A169) → Low finding / area already compliant
Gray   (#A0AEC0) → Already reviewed (dimmed)
```

### 18.4 Responsive Behavior

```
All panels are resizable (like an IDE)
Sandbox Viewer can be fullscreen for deep review
Agent Panel can collapse to focus on documents
Explorer Panel can detach as a floating window
```

---

## 19. TECH STACK

### 19.1 Desktop Application

```
Framework  : Tauri (Rust + WebView)
             Lighter than Electron, more secure, native performance
UI         : React + TypeScript
Styling    : Tailwind CSS
State mgmt : Zustand (client state) + SQLite (persistent state)
```

### 19.2 Local Processing

```
Document parsing  : Apache Tika (Java, via subprocess) or PyMuPDF
OCR               : Tesseract (offline, open source)
Embedding (local) : sentence-transformers (optional, for offline mode)
Vector DB         : ChromaDB (fully local, no server)
Structured DB     : SQLite (via better-sqlite3 or rusqlite)
Hash              : Built-in crypto (SHA-256)
```

### 19.3 Cloud Intelligence

```
AI Provider    : Anthropic Claude API (current)
               : Linow model (during growth)
Agent Framework: LangGraph (Python), served as backend API
Backend API    : FastAPI (Python), bridge between Tauri app and LangGraph
Auth           : JWT + API key management
```

### 19.4 Blockchain

```
Network    : Sui blockchain
SDK        : @mysten/sui (JavaScript) / sui-sdk (Rust)
Operation  : Only write hash + read for verify
             No complex smart contract
Gas        : User pays or Linow subsidizes (business decision)
```

### 19.5 MCP

```
Protocol   : Model Context Protocol (Anthropic spec)
Host impl  : Built into Tauri app (as MCP host)
Transport  : stdio (for local MCP) / HTTP+SSE (for remote MCP)
```

### 19.6 Deployment

```
Desktop app  : Tauri → build for macOS, Windows, Linux
               Distribution: direct download + auto-update
Backend API  : Cloud (AWS/GCP/Vercel), stateless, scale horizontally
Vector DB    : Local on device (no server)
Blockchain   : Sui mainnet (production) / devnet (development)
```

---

## 20. NON-NEGOTIABLE PRINCIPLES

| # | Principle | Implementation |
|---|---|---|
| 1 | AI never finalizes without human approval | LangGraph interrupt node in every finding |
| 2 | Original documents are never modified | Sandbox isolation, original folder read-only |
| 3 | Original documents are never sent to cloud | Only extracted text goes to API |
| 4 | All AI outputs must be explainable | Every finding must have citation with precise location |
| 5 | Audit trail cannot be deleted | Append-only log, SQLite with WAL mode |
| 6 | Trust layer (blockchain) is never mandatory | Always optional, always at the end of the flow |
| 7 | Copilot/autopilot mode does not change safety | Gate remains, only presentation differs |

---

## 21. ROADMAP

### Phase 0 - Foundation (Now)
- [ ] Tauri app skeleton with panel layout
- [ ] Sandbox file management (import, preview, read-only)
- [ ] Local extraction pipeline (PDF, Excel, Word)
- [ ] Hash #1 system (local SHA-256)
- [ ] ChromaDB integration
- [ ] Claude API connection

### Phase 1 - MVP: IT Audit (ISO 27001)
- [ ] Engagement wizard (5 onboarding questions)
- [ ] Analysis Agent with ISO 27001 KB
- [ ] Finding Agent with C-C-C-E-R output
- [ ] Human review gate (accept/edit/reject)
- [ ] Sandbox Viewer with highlight layers
- [ ] LangGraph orchestration
- [ ] Basic report generator (PDF)
- [ ] Local SQLite persistence

### Phase 2 - Expand Frameworks
- [ ] GDPR, Indonesian PDP Law, SOC 2 in Knowledge Base
- [ ] Auto-compose framework bundle
- [ ] Cross-document analysis
- [ ] Non-auditor mode (business language)
- [ ] MCP integration (Jira, GitHub as pilot)
- [ ] Hash #2 + Sui blockchain (optional)

### Phase 3 - Global Platform
- [ ] All global frameworks
- [ ] Multi-language UI
- [ ] Enterprise features (team collaboration, SSO)
- [ ] Linow Verifier (public web app for hash verification)
- [ ] MCP marketplace (3rd party server)
- [ ] Analytics & benchmarking (anonymous)

### Phase 4 - Linow Model
- [ ] Fine-tuning on audit domain
- [ ] Deploy as Linow AI (replace Claude API)
- [ ] On-premise option for regulated industry

---

## 22. GLOSSARY

| Term | Definition |
|---|---|
| **Engagement** | One audit project for one client/company |
| **Finding** | One audit finding in C-C-C-E-R format |
| **C-C-C-E-R** | Condition, Criteria, Cause, Effect, Recommendation |
| **Citation** | Precise reference to a document section (page, paragraph, sentence) |
| **Sandbox** | Local isolated environment where original documents are stored and processed |
| **Hash #1** | SHA-256 for internal integrity check (local, automatic) |
| **Hash #2** | SHA-256 registered to Sui blockchain (optional, external) |
| **Copilot Mode** | Mode for professional auditors, AI as partner, human decides everything |
| **Autopilot Mode** | Mode for non-auditors, AI runs the process, simple notifications |
| **Human Gate** | Interrupt point in LangGraph that pauses the process until human approval |
| **KB** | Knowledge Base, repository of audit standards and frameworks |
| **RAG** | Retrieval-Augmented Generation, AI queries KB before generating output |
| **MCP** | Model Context Protocol, standard for connecting AI to external tools |
| **Chain of Custody** | Documentation that proves document integrity and origin |
| **Audit Trail** | Append-only log of all activities in an engagement |
| **Framework Bundle** | Collection of frameworks auto-composed based on company profile |
| **Semantic Chunking** | Splitting documents based on units of meaning, not number of characters |
| **LangGraph** | Framework for stateful multi-agent with human-in-the-loop |
| **Tauri** | Framework for building desktop apps with Rust + WebView |
| **Sui** | Layer 1 blockchain used for Linow's trust layer |
| **Trust Layer** | Optional on-chain registration feature for external proof |

---

*This document is a living document. Every new architectural decision must be reflected here.*
*Next version: LangGraph state machine implementation detail + local extraction pipeline spec.*
