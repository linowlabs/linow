# Linow Architecture

Linow is a verifiable audit evidence layer on Sui. It helps a company register evidence, prove that a later file matches the recorded commitment, and attach reviewer attestations from wallet-backed reviewers.

The current build targets Sui testnet and uses this deployed package:

```txt
0x6b800d28cc87423198e6b35516885f9c6155a680424ac28aa47f59eabd2994d5
```

## System Components

| Component | Role |
| --- | --- |
| `app/` | Next.js app for upload, verification, attestation, and proof display |
| `sdk/` | Shared TypeScript SDK for crypto, Walrus, Tatum, Sui transaction building, verify, and attest flows |
| Sui Move package | Stores `EvidenceRecord` and `Attestation` objects |
| Tatum Sui RPC | Server-side Sui JSON-RPC transport for transaction execution and object reads |
| Walrus testnet | Stores encrypted evidence blobs |
| Browser wallet | Human-controlled signer for registration and attestation transactions |

## Trust Model

Linow follows the project rule:

```txt
Agent proposes, human signs, chain proves.
```

The app and SDK prepare evidence actions, but they do not hold private keys or sign transactions. A connected browser wallet signs on-chain writes. Tatum submits signed transaction bytes and reads Sui objects from the server side. Sui stores commitments, lifecycle objects, and attestations, not raw evidence.

Linow proves document integrity against the recorded commitment, registration timing, lifecycle traceability, and reviewer attestations. It does not automatically prove document truth, source authenticity, audit sufficiency, or replace auditor judgment.

## Data Flow

### Register Evidence

1. User selects a document in the app.
2. SDK hashes the plaintext file with SHA-256.
3. SDK encrypts the file and metadata client-side.
4. SDK uploads the encrypted payload to Walrus testnet.
5. SDK builds a Sui programmable transaction block for `evidence::register_evidence`.
6. Browser wallet signs the prepared transaction.
7. App server route submits the signed transaction through Tatum Sui RPC.
8. Sui creates an `EvidenceRecord` object containing the evidence commitment, Walrus blob reference, encrypted metadata, ISA assertion bytes, status, registrant, timestamp, and optional audit pack link.

### Verify Evidence

1. User selects an existing evidence record and provides a comparison file.
2. App server route reads the `EvidenceRecord` from Sui through Tatum.
3. SDK hashes the supplied file locally.
4. SDK compares the computed hash with the on-chain evidence commitment.
5. App shows match or tamper-detected status.

Verification is read-only and does not spend gas.

### Create Attestation

1. User selects an evidence record after a successful verification.
2. SDK encrypts reviewer notes.
3. SDK builds a Sui programmable transaction block for `evidence::create_attestation`.
4. Browser wallet signs the transaction.
5. App server route submits the signed transaction through Tatum Sui RPC.
6. Sui creates an `Attestation` object tied to the target evidence ID and reviewer wallet.

Attestation is separate from `EvidenceRecord.status`. The evidence record is not marked as "verified" by the company; reviewer trust is represented by the attestation object.

## Storage And Privacy

Raw evidence is never stored on-chain. Walrus blobs are public by default, so Linow encrypts files before upload. Sui stores public commitments and references that allow later verification without exposing the plaintext document.

The current demo keeps the uploaded file in browser session state to make original-file verification smooth. That session state resets on refresh and is not treated as persistent product storage.

## Server Boundaries

The browser receives public values such as package ID and proof artifacts. It does not receive `TATUM_API_KEY`.

Sui execution and object reads pass through app server routes:

| Route | Purpose |
| --- | --- |
| `POST /api/sui/execute` | Submit signed transaction bytes to Tatum |
| `POST /api/sui/object` | Read Sui objects through Tatum |

The app loads local environment values from the repository root `.env` during monorepo development.

## Environment

Current environment target:

```txt
TATUM_SUI_NETWORK=testnet
WALRUS_NETWORK=testnet
LINOW_PACKAGE_ID=0x6b800d28cc87423198e6b35516885f9c6155a680424ac28aa47f59eabd2994d5
NEXT_PUBLIC_LINOW_PACKAGE_ID=0x6b800d28cc87423198e6b35516885f9c6155a680424ac28aa47f59eabd2994d5
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

`TATUM_API_KEY` is required on the server and must not be exposed to the browser.

## Local Verification

Build the app and SDK from the app workspace:

```powershell
cd d:\projects\linow\app
npm run build
```

Run the live demo with a funded Sui testnet browser wallet:

1. Register `demo/tamperable_audit_sample.csv`.
2. Verify the original file and confirm the hash matches.
3. Verify an edited copy and confirm tamper detection.
4. Create a reviewer attestation after successful verification.
