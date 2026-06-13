module linow::audit_pack {
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::option::{Self, Option};
    use std::string::{Self, String};
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};

    const EInvalidStatus: u64 = 0;

    const STATUS_DRAFT: u8 = 0;
    const STATUS_SUBMITTED: u8 = 1;
    const STATUS_UNDER_REVIEW: u8 = 2;
    const STATUS_COMPLETE: u8 = 3;

    public struct AuditPack has key, store {
        id: UID,
        encrypted_details: vector<u8>,
        evidence_ids: vector<ID>,
        finding_hashes: vector<vector<u8>>,
        memory_blob_id: Option<String>,
        assertions_covered: vector<u8>,
        status: u8,
        owner: address,
        auditor: Option<address>,
        created_at: u64,
    }

    public struct AuditPackCreated has copy, drop {
        pack_id: ID,
        owner: address,
        created_at: u64,
    }

    public struct EvidenceAdded has copy, drop {
        pack_id: ID,
        evidence_id: ID,
    }

    public struct FindingAdded has copy, drop {
        pack_id: ID,
    }

    public struct MemoryBlobSet has copy, drop {
        pack_id: ID,
    }

    public fun draft_status(): u8 {
        STATUS_DRAFT
    }

    public fun submitted_status(): u8 {
        STATUS_SUBMITTED
    }

    public fun under_review_status(): u8 {
        STATUS_UNDER_REVIEW
    }

    public fun complete_status(): u8 {
        STATUS_COMPLETE
    }

    public fun create_audit_pack(
        encrypted_details: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): AuditPack {
        let owner = tx_context::sender(ctx);
        let created_at = clock::timestamp_ms(clock);

        let pack = AuditPack {
            id: object::new(ctx),
            encrypted_details,
            evidence_ids: vector<ID>[],
            finding_hashes: vector<vector<u8>>[],
            memory_blob_id: option::none(),
            assertions_covered: vector<u8>[],
            status: STATUS_DRAFT,
            owner,
            auditor: option::none(),
            created_at,
        };

        let pack_id = object::id(&pack);

        event::emit(AuditPackCreated {
            pack_id,
            owner,
            created_at,
        });

        pack
    }

    public fun add_evidence(pack: &mut AuditPack, evidence_id: ID) {
        vector::push_back(&mut pack.evidence_ids, evidence_id);

        event::emit(EvidenceAdded {
            pack_id: object::id(pack),
            evidence_id,
        });
    }

    public fun add_finding(pack: &mut AuditPack, finding_hash: vector<u8>) {
        vector::push_back(&mut pack.finding_hashes, finding_hash);

        event::emit(FindingAdded {
            pack_id: object::id(pack),
        });
    }

    public fun set_memory_blob_id(pack: &mut AuditPack, blob_id: String) {
        pack.memory_blob_id = option::some(blob_id);

        event::emit(MemoryBlobSet {
            pack_id: object::id(pack),
        });
    }

    public fun set_auditor(pack: &mut AuditPack, auditor: address) {
        pack.auditor = option::some(auditor);
    }

    public fun submit(pack: &mut AuditPack) {
        assert!(pack.status == STATUS_DRAFT, EInvalidStatus);
        pack.status = STATUS_SUBMITTED;
    }

    public fun start_review(pack: &mut AuditPack) {
        assert!(pack.status == STATUS_SUBMITTED, EInvalidStatus);
        pack.status = STATUS_UNDER_REVIEW;
    }

    public fun complete(pack: &mut AuditPack) {
        assert!(pack.status == STATUS_UNDER_REVIEW, EInvalidStatus);
        pack.status = STATUS_COMPLETE;
    }

    public fun pack_id(pack: &AuditPack): ID {
        object::id(pack)
    }

    public fun encrypted_details(pack: &AuditPack): &vector<u8> {
        &pack.encrypted_details
    }

    public fun evidence_ids(pack: &AuditPack): &vector<ID> {
        &pack.evidence_ids
    }

    public fun finding_hashes(pack: &AuditPack): &vector<vector<u8>> {
        &pack.finding_hashes
    }

    public fun memory_blob_id(pack: &AuditPack): &Option<String> {
        &pack.memory_blob_id
    }

    public fun assertions_covered(pack: &AuditPack): &vector<u8> {
        &pack.assertions_covered
    }

    public fun status(pack: &AuditPack): u8 {
        pack.status
    }

    public fun owner(pack: &AuditPack): address {
        pack.owner
    }

    public fun auditor(pack: &AuditPack): &Option<address> {
        &pack.auditor
    }

    public fun created_at(pack: &AuditPack): u64 {
        pack.created_at
    }
}