import type {
  AttestEvidenceInput,
  AttestEvidenceResult,
  GetEvidenceInput,
  GetEvidenceResult,
  RegisterEvidenceInput,
  RegisterEvidenceResult,
  VerificationResult,
  VerifyEvidenceInput,
} from "./types";
import type {
  CreateAuditPackChainInput,
  CreateAuditPackResult,
  GetAuditPackInput,
  GetAuditPackResult,
} from "./audit-pack.js";
import type {
  EmitAgentActionInput,
  EmitAgentActionResult,
} from "./agent-action.js";

export interface LinowClient {
  register(input: RegisterEvidenceInput): Promise<RegisterEvidenceResult>;
  verify(input: VerifyEvidenceInput): Promise<VerificationResult>;
  attest(input: AttestEvidenceInput): Promise<AttestEvidenceResult>;
  getEvidence(input: GetEvidenceInput): Promise<GetEvidenceResult>;
  createAuditPack?(input: CreateAuditPackChainInput): Promise<CreateAuditPackResult>;
  getAuditPack?(input: GetAuditPackInput): Promise<GetAuditPackResult>;
  emitAgentAction?(input: EmitAgentActionInput): Promise<EmitAgentActionResult>;
}

export interface LinowClientHandlers extends Partial<LinowClient> {}

export function createLinowClient(handlers: LinowClientHandlers = {}): LinowClient {
  return {
    register: handlers.register ?? missingImplementation("register"),
    verify: handlers.verify ?? missingImplementation("verify"),
    attest: handlers.attest ?? missingImplementation("attest"),
    getEvidence: handlers.getEvidence ?? missingImplementation("getEvidence"),
    createAuditPack: handlers.createAuditPack,
    getAuditPack: handlers.getAuditPack,
    emitAgentAction: handlers.emitAgentAction,
  };
}

function missingImplementation<K extends keyof LinowClient>(operation: K): LinowClient[K] {
  return (async () => {
    throw new Error(
      `LinowClient.${operation} is not implemented yet. Define the shared interface first, then wire the real SDK handlers.`,
    );
  }) as LinowClient[K];
}
