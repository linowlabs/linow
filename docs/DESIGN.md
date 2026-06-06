# DESIGN.md

## Direction

Linow should feel **premium, dark, glass-like, futuristic, and business-ready**.

Core vibe:

> premium audit-tech with frosted glass, deep slate surfaces, turquoise status cues, and proof-focused UI.

The product should feel credible for auditors, finance teams, and compliance teams.

---

## Font

Primary font:

```txt
DM Sans
```

Use monospace for technical values:

```txt
hashes, evidence IDs, blob IDs, package IDs, transaction digests
```

---

## Color Palette

Current shell palette:

```txt
Background Navy     #081929
Deep Slate Glass    rgba(13, 19, 30, 0.65)
Sidebar Dark Glass  rgba(9, 13, 20, 0.75)
Primary Blue        #3099F1
Turquoise           #4FD1C5
Cyan                #A3DBE9
Text High           #FFFFFF
Text Medium         #DCECF2
Text Secondary      rgba(166, 207, 222, 0.70)
Text Muted          rgba(107, 143, 160, 0.60)
```

Use electric blue for primary action and focus states, turquoise for secure/status cues, and cyan for technical values.

---

## Visual Style

Use:

```txt
dark radial gradients
frosted glass cards
subtle borders
light blur
gentle shadows
clean spacing
```

Avoid:

```txt
noisy crypto visuals
excessive glow
cyberpunk neon
cluttered dashboards
flat low-depth surfaces
```

Glass should feel premium, not gimmicky.

---

## Layout

### June 6 MVP

Use a simple workspace layout:

```txt
top bar + left sidebar + main workspace
```

Sidebar:

```txt
Upload Evidence
Verify Evidence
Create Attestation
Evidence Records
```

Main workspace shows the active flow and proof cards:

```txt
file selected
hash generated
encryption complete
Walrus blob stored
Sui record created
verification result
tamper detection
attestation result
```

Do not add a right inspector yet.

### June 21 Agent Version

Upgrade to:

```txt
sidebar + workspace + inspector
```

Inspector can show:

```txt
source confidence
ISA assertions
gap analysis
agent notes
attestation chain
recommended action
```

---

## UI Principles

1. **Proof first**
   Hashes, verification results, attestations, and source confidence must be easy to find.

2. **Clarity over decoration**
   The audit flow must stay obvious.

3. **Minimal but not empty**
   Use whitespace, but keep important status visible.

4. **Professional trust**
   Calm, precise, credible.

---

## Components

Use glass-style cards for:

```txt
evidence records
verification results
audit pack summaries
source confidence
readiness score
```

Use badges for:

```txt
evidence status
source confidence level
ISA assertions
verification state
```

Use clear primary buttons for main actions:

```txt
Upload
Register
Verify
Attest
Review and Sign
```

---

## Product Flow Priority

### June 6

```txt
Upload -> Hash -> Encrypt -> Store on Walrus -> Register on Sui -> Verify -> Tamper Detect -> Attest
```

### June 21

```txt
Classify Evidence -> Map Assertions -> Source Confidence -> Gap Analysis -> Human Approval -> Attestation
```

---

## UI Copy Tone

Use precise, calm language.

Good:

```txt
Hash matches
Evidence registered
Awaiting attestation
Source confidence: L2
Tamper detected
Review and sign
```

Avoid:

```txt
Guaranteed truth
Fully verified source
Trustless revolution
100% audit-proof
```

---

## Summary

Linow should look:

```txt
clean
secure
futuristic
calm
credible
proof-focused
dark glass
```
