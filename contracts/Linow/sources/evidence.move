module linow::evidence {
    use std::option::Option;
    use sui::object::{ID, UID};

    const STATUS_REGISTERED: u8 = 0;
    const STATUS_UNDER_REVIEW: u8 = 1;
    const STATUS_SUPERSEDED: u8 = 2;

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

    #[allow(unused_field)]
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

    #[allow(unused_field)]
    public struct Attestation has key, store {
        id: UID,
        target_id: ID,
        attester: address,
        attestation_type: u8,
        source_confidence: u8,
        encrypted_notes: vector<u8>,
        attested_at: u64,
    }

    public fun registered_status(): u8 {
        STATUS_REGISTERED
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
