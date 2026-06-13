module linow::agent_action {
    use sui::event;
    use sui::object::ID;
    use std::option::Option;
    use sui::clock::{Self, Clock};

    public struct AgentAction has copy, drop {
        pack_id: ID,
        evidence_id: Option<ID>,
        action_type: vector<u8>,
        agent_output_hash: vector<u8>,
        timestamp: u64,
    }

    public fun action_classify(): vector<u8> {
        b"classify"
    }

    public fun action_extract(): vector<u8> {
        b"extract"
    }

    public fun action_gap(): vector<u8> {
        b"gap"
    }

    public fun action_ccer(): vector<u8> {
        b"ccer"
    }

    public fun action_recommend(): vector<u8> {
        b"recommend"
    }

    public fun emit_agent_action(
        pack_id: ID,
        evidence_id: Option<ID>,
        action_type: vector<u8>,
        agent_output_hash: vector<u8>,
        clock: &Clock,
    ) {
        let timestamp = clock::timestamp_ms(clock);

        event::emit(AgentAction {
            pack_id,
            evidence_id,
            action_type,
            agent_output_hash,
            timestamp,
        });
    }
}