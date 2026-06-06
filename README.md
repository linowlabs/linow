<div align="center">

<h1 align="center">Linow</h1>

<img src="docs/assets/linow-hero.png" alt="Linow" width="560">

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-111827?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="Walrus" src="https://img.shields.io/badge/Walrus-0F766E?style=for-the-badge" />
  <img alt="Tatum" src="https://img.shields.io/badge/Tatum-334155?style=for-the-badge" />
</p>

</div>

Linow is a verifiable audit evidence layer on Sui that helps companies prove audit documents existed, stayed unchanged, and were reviewed by specific wallet-backed reviewers.

Audit evidence today is fragmented across emails, drives, PDFs, and exports, making it difficult for companies and auditors to prove document integrity end to end. Linow fixes this by hashing each document, encrypting it client-side, storing the encrypted file on Walrus, and registering a tamper-evident `EvidenceRecord` on Sui through Tatum's Sui RPC. Auditors can later retrieve the evidence, verify the hash against the on-chain commitment, and create reviewer attestations tied to their wallet.

The result is a machine-checkable evidence trail: the document stays private, Walrus stores the encrypted evidence, Sui proves the lifecycle, and Tatum powers the chain interactions.

## Core Model

- Linow registers evidence commitments, not truth claims.
- Raw evidence never goes on-chain.
- Verification checks file integrity, not business truth.
- Attestation is a separate reviewer object, not an evidence status.
- A company can register evidence, but a reviewer wallet must attest to it.

## How It Works

1. A company uploads an evidence file and tags it with audit context.
2. Linow hashes the file locally and encrypts it in the browser.
3. The encrypted payload is stored on Walrus.
4. An `EvidenceRecord` is registered on Sui through Tatum RPC.
5. An auditor verifies the disclosed file against the on-chain commitment.
6. A reviewer can create an `Attestation` tied to their wallet.

## Repo Layout

- `app/` - Next.js workspace and product UI
- `sdk/` - shared client boundary and crypto helpers
- `docs/` - project docs, task archives, and design notes

## Local Development

```bash
cd app
npm install
npm run dev
```

The app builds the shared SDK package locally and runs the Linow workspace on `http://localhost:3000`.