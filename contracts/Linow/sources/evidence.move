module linow::evidence {
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::option::Option;
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};

    const EInvalidCommitmentLength: u64 = 0;
    const EInvalidAttestationType: u64 = 1;
    const EInvalidSourceConfidence: u64 = 2;

    const STATUS_REGISTERED: u8 = 0;
    const STATUS_UNDER_REVIEW: u8 = 1;
    const STATUS_SUPERSEDED: u8 = 2;
    const SHA256_COMMITMENT_LENGTH: u64 = 32;

    const ATTESTATION_EVIDENCE_VERIFIED: u8 = 0;
    const ATTESTATION_PACK_REVIEWED: u8 = 1;
    const ATTESTATION_HASH_CONFIRMED: u8 = 2;
    const ATTESTATION_REJECTED: u8 = 3;

    const SOURCE_CONFIDENCE_L0: u8 = 0;
    const SOURCE_CONFIDENCE_L1: u8 = 1;
    const SOURCE_CONFIDENCE_L2: u8 = 2;
    const SOURCE_CONFIDENCE_L3: u8 = 3;
    const SOURCE_CONFIDENCE_L4: u8 = 4;
    const SOURCE_CONFIDENCE_L5: u8 = 5;

    public struct EvidenceRecord has key, store {
        id: UID,
        evidence_commitment: vector<u8>,
        walrus_blob_id: vector<u8>,
        encrypted_metadata: vector<u8>,
        isa_assertions: vector<u8>,
        status: u8,
        registrant: address,
        registered_at: u64,
        audit_pack_id: Option<ID>,
    }

    public struct EvidenceRegistered has copy, drop {
        evidence_id: ID,
        registrant: address,
        registered_at: u64,
    }

    public struct Attestation has key, store {
        id: UID,
        target_id: ID,
        attester: address,
        attestation_type: u8,
        source_confidence: u8,
        encrypted_notes: vector<u8>,
        attested_at: u64,
    }

    public struct AttestationCreated has copy, drop {
        attestation_id: ID,
        target_id: ID,
        attester: address,
        attestation_type: u8,
        source_confidence: u8,
        attested_at: u64,
    }

    public fun registered_status(): u8 {
        STATUS_REGISTERED
    }

    public fun register_evidence(
        evidence_commitment: vector<u8>,
        walrus_blob_id: vector<u8>,
        encrypted_metadata: vector<u8>,
        isa_assertions: vector<u8>,
        audit_pack_id: Option<ID>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): EvidenceRecord {
        assert!(evidence_commitment.length() == SHA256_COMMITMENT_LENGTH, EInvalidCommitmentLength);

        let registrant = tx_context::sender(ctx);
        let registered_at = clock::timestamp_ms(clock);
        let record = EvidenceRecord {
            id: object::new(ctx),
            evidence_commitment,
            walrus_blob_id,
            encrypted_metadata,
            isa_assertions,
            status: STATUS_REGISTERED,
            registrant,
            registered_at,
            audit_pack_id,
        };
        let evidence_id = object::id(&record);

        event::emit(EvidenceRegistered {
            evidence_id,
            registrant,
            registered_at,
        });
        record
    }

    public fun evidence_id(record: &EvidenceRecord): ID {
        object::id(record)
    }

    public fun evidence_commitment(record: &EvidenceRecord): &vector<u8> {
        &record.evidence_commitment
    }

    public fun walrus_blob_id(record: &EvidenceRecord): &vector<u8> {
        &record.walrus_blob_id
    }

    public fun encrypted_metadata(record: &EvidenceRecord): &vector<u8> {
        &record.encrypted_metadata
    }

    public fun isa_assertions(record: &EvidenceRecord): &vector<u8> {
        &record.isa_assertions
    }

    public fun status(record: &EvidenceRecord): u8 {
        record.status
    }

    public fun registrant(record: &EvidenceRecord): address {
        record.registrant
    }

    public fun registered_at(record: &EvidenceRecord): u64 {
        record.registered_at
    }

    public fun audit_pack_id(record: &EvidenceRecord): &Option<ID> {
        &record.audit_pack_id
    }

    public fun create_attestation(
        target_id: ID,
        attestation_type: u8,
        source_confidence: u8,
        encrypted_notes: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Attestation {
        assert!(attestation_type <= ATTESTATION_REJECTED, EInvalidAttestationType);
        assert!(source_confidence <= SOURCE_CONFIDENCE_L5, EInvalidSourceConfidence);

        let attester = tx_context::sender(ctx);
        let attested_at = clock::timestamp_ms(clock);
        let attestation = Attestation {
            id: object::new(ctx),
            target_id,
            attester,
            attestation_type,
            source_confidence,
            encrypted_notes,
            attested_at,
        };
        let attestation_id = object::id(&attestation);

        event::emit(AttestationCreated {
            attestation_id,
            target_id,
            attester,
            attestation_type,
            source_confidence,
            attested_at,
        });
        attestation
    }

    public fun attestation_id(attestation: &Attestation): ID {
        object::id(attestation)
    }

    public fun target_id(attestation: &Attestation): ID {
        attestation.target_id
    }

    public fun attester(attestation: &Attestation): address {
        attestation.attester
    }

    public fun attestation_type(attestation: &Attestation): u8 {
        attestation.attestation_type
    }

    public fun source_confidence(attestation: &Attestation): u8 {
        attestation.source_confidence
    }

    public fun encrypted_notes(attestation: &Attestation): &vector<u8> {
        &attestation.encrypted_notes
    }

    public fun attested_at(attestation: &Attestation): u64 {
        attestation.attested_at
    }

    public fun under_review_status(): u8 {
        STATUS_UNDER_REVIEW
    }

    public fun superseded_status(): u8 {
        STATUS_SUPERSEDED
    }

    public fun evidence_verified_attestation_type(): u8 {
        ATTESTATION_EVIDENCE_VERIFIED
    }

    public fun pack_reviewed_attestation_type(): u8 {
        ATTESTATION_PACK_REVIEWED
    }

    public fun hash_confirmed_attestation_type(): u8 {
        ATTESTATION_HASH_CONFIRMED
    }

    public fun rejected_attestation_type(): u8 {
        ATTESTATION_REJECTED
    }

    public fun source_confidence_l0(): u8 {
        SOURCE_CONFIDENCE_L0
    }

    public fun source_confidence_l1(): u8 {
        SOURCE_CONFIDENCE_L1
    }

    public fun source_confidence_l2(): u8 {
        SOURCE_CONFIDENCE_L2
    }

    public fun source_confidence_l3(): u8 {
        SOURCE_CONFIDENCE_L3
    }

    public fun source_confidence_l4(): u8 {
        SOURCE_CONFIDENCE_L4
    }

    public fun source_confidence_l5(): u8 {
        SOURCE_CONFIDENCE_L5
    }
}
