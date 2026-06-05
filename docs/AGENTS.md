# Project Guidelines & Philosophy

## 1. Code Quality: The Boy Scout Rule

You are a developer. Every session should improve the codebase, not just add to it. Prefer small, safe improvements over broad refactors, especially during hackathon work.

- **Don't Repeat Yourself (Rule of Three):** Consolidate duplicate patterns into reusable functions only after the 3rd occurrence. Do not abstract prematurely.
- **Hygiene:** Delete dead code immediately: unused imports, functions, variables, commented code. If it's not running, it goes.
- **Leverage:** Use battle-tested packages over custom implementations. Do not reinvent the wheel unless the wheel is broken.
- **Readable:** Code must be self-documenting. Comments should explain *why*, not *what*. No need to put every change in comments; the DEVLOG will do the explanation.
- **Safety:** If a refactor carries high risk of breaking functionality or the demo path, flag it for user review rather than applying it silently.
- **Patch, Don't Replace:** Treat existing files as the source of truth and only patch them incrementally, so the work stays intact while we iterate.

## 2. Linow-Specific Rules

Linow's core framing is:

> Agent proposes, human signs, chain proves.

Keep this framing consistent across code, docs, UI copy, and demos.

- **Do not overclaim:** Linow proves integrity, timestamp, lifecycle traceability, and reviewer attestations. It does not automatically prove document truth, source authenticity, business-event validity, or audit sufficiency.
- **Agent boundaries:** The agent may classify, summarize, map assertions, detect gaps, recommend actions, and prepare unsigned transactions. It must not sign, submit transactions autonomously, modify original evidence, or replace auditor judgment.
- **Privacy:** Treat evidence as sensitive. Never store raw documents on-chain. Never log plaintext evidence. Never commit private keys, mnemonics, API keys, decrypted files, or real audit evidence.
- **Walrus:** Walrus blobs are public by default, so sensitive files must be encrypted before upload.
- **Sui:** Sui stores commitments, lifecycle objects, and attestations — not raw evidence.
- **Attestation model:** `EvidenceRecord.status` should not include `Verified`. Verification is proven by an `Attestation` from a reviewer wallet. A company cannot self-verify evidence.
- **Source confidence:** Use L0-L5 source confidence language. Do not say "source verified" unless the source is actually connector-verified or system-generated.
- **Hackathon focus:** Protect the demo path. Do not add optional features before the core end-to-end flow works.

## 3. Git Workflow

Use a monorepo during hackathons.

- `main` = stable, deployable, judge-facing
- `develop` = integration branch
- feature branches branch off `develop`
- only merge to `main` when the demo path works

Branch naming:

```txt
area/type/scope
````

Examples:

```txt
web3/feat/evidence-contract
web3/chore/init-sui
app/chore/init-nextjs
app/feat/upload-evidence
sdk/feat/crypto-utils
agent/feat/gap-analysis
infra/chore/env-example
```

For docs and demo branches, use:

```txt
docs/tatum-readme
docs/isa-mapping
demo/tatum-script
demo/sample-evidence
```

Use tags for finalized hackathon submissions:

```txt
v0.1-tatum
v0.2-sui-overflow
```

## 4. Persistent Context & Memory

Since our context resets between sessions, we use files to track our brain.

### The Dev Log

After every interaction that includes a code change, append an entry to the relevant dev log under `docs/`.

Recommended files:

```txt
docs/DEVLOG-WEB3.md
docs/DEVLOG-APP.md
docs/DEVLOG-SDK.md
docs/DEVLOG-AGENT.md
docs/DEVLOG-INFRA.md
docs/DEVLOG-DOCS.md
docs/DEVLOG-DEMO.md
```

Choose the dev log based on the primary area changed. If the area is ambiguous, ask before writing.

If the file does not exist, create it. If it exists, append to it.

If you truly cannot write to the file because of permissions, conflicts, or environment limits, provide the exact snippet the next person should paste. This is mandatory and should be treated as a checklist item for every code-changing task.

Entry format:

```md
## YYYY-MM-DD — Short Task Title

### Change
- Files touched:
- Summary:

### Reasoning
- Why this approach was chosen:

### Tech Debt
- Known shortcuts:
- Follow-up needed:
```

**Goal:** If a new developer or a new AI session joins tomorrow, they should be able to read the relevant `docs/DEVLOG-*.md` and understand the state of the project immediately.