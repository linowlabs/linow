export const SOURCE_CONFIDENCE_LEVELS = [
  "L0",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
] as const;

export type SourceConfidenceLevel = (typeof SOURCE_CONFIDENCE_LEVELS)[number];

export const ATTESTATION_TYPE_VALUES = [
  "evidenceVerified",
  "packReviewed",
  "hashConfirmed",
  "rejected",
] as const;

export type AttestationType = (typeof ATTESTATION_TYPE_VALUES)[number];

export const EVIDENCE_STATUS_VALUES = [
  "registered",
  "underReview",
  "superseded",
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUS_VALUES)[number];

export const RETENTION_STATUS_VALUES = [
  "available",
  "atRisk",
  "needsRenewal",
  "archived",
  "expired",
] as const;

export type RetentionStatus = (typeof RETENTION_STATUS_VALUES)[number];

export const ASSERTION_IDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export type AssertionId = (typeof ASSERTION_IDS)[number];

export type EvidenceId = string;
export type AttestationId = string;
export type TransactionDigest = string;
export type CommitmentHex = string;
export type BlobId = string;
export type WalletAddress = string;
export type IsoTimestamp = string;

export type BinaryContent = ArrayBuffer | Uint8Array | Blob;

export interface EvidenceMetadata {
  fileName: string;
  mediaType?: string;
  documentType?: string;
  description?: string;
  claimedSource?: string;
  periodLabel?: string;
  documentDate?: string;
  tags?: string[];
}

export interface SourceConfidence {
  level: SourceConfidenceLevel;
  reason: string;
  limitations?: string[];
}

export interface ProofArtifacts {
  evidenceId: EvidenceId;
  packageId?: string;
  transactionDigest?: TransactionDigest;
  walrusBlobId?: BlobId;
  attestationId?: AttestationId;
}

export interface RetentionInfo {
  status: RetentionStatus;
  expiresAt?: IsoTimestamp;
  archivedAt?: IsoTimestamp;
}

export interface EvidenceRecord {
  id: EvidenceId;
  commitment: CommitmentHex;
  status: EvidenceStatus;
  assertions: AssertionId[];
  metadata: EvidenceMetadata;
  blobId?: BlobId;
  registrantAddress?: WalletAddress;
  registeredAt?: IsoTimestamp;
  lastUpdatedAt?: IsoTimestamp;
  latestAttestationId?: AttestationId;
  sourceConfidence?: SourceConfidence;
  retention?: RetentionInfo;
  proof?: ProofArtifacts;
}

export interface RegisterEvidenceInput {
  content: BinaryContent;
  metadata: EvidenceMetadata;
  assertions: AssertionId[];
  signerAddress?: WalletAddress;
}

export interface RegisterEvidenceResult {
  evidence: EvidenceRecord;
  transactionDigest?: TransactionDigest;
  warnings: string[];
}

export interface VerifyEvidenceInput {
  evidenceId: EvidenceId;
  content: BinaryContent;
}

export interface VerificationResult {
  evidenceId: EvidenceId;
  status: "match" | "mismatch";
  isMatch: boolean;
  tamperDetected: boolean;
  expectedCommitment: CommitmentHex;
  actualCommitment: CommitmentHex;
  checkedAt: IsoTimestamp;
  evidence?: EvidenceRecord;
  limitations: string[];
}

export interface AttestEvidenceInput {
  evidenceId: EvidenceId;
  reviewerAddress: WalletAddress;
  attestationType?: AttestationType;
  sourceConfidence?: SourceConfidenceLevel;
  note?: string;
}

export interface AttestationRecord {
  id: AttestationId;
  evidenceId: EvidenceId;
  reviewerAddress: WalletAddress;
  attestationType?: AttestationType;
  sourceConfidence?: SourceConfidenceLevel;
  createdAt: IsoTimestamp;
  note?: string;
  transactionDigest?: TransactionDigest;
}

export interface AttestEvidenceResult {
  attestation: AttestationRecord;
  evidence?: EvidenceRecord;
  warnings: string[];
}

export interface GetEvidenceInput {
  evidenceId: EvidenceId;
}

export interface GetEvidenceResult {
  evidence: EvidenceRecord | null;
  fetchedAt: IsoTimestamp;
}
