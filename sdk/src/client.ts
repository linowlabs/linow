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

export interface LinowClient {
  register(input: RegisterEvidenceInput): Promise<RegisterEvidenceResult>;
  verify(input: VerifyEvidenceInput): Promise<VerificationResult>;
  attest(input: AttestEvidenceInput): Promise<AttestEvidenceResult>;
  getEvidence(input: GetEvidenceInput): Promise<GetEvidenceResult>;
}

export interface LinowClientHandlers extends Partial<LinowClient> {}

export function createLinowClient(handlers: LinowClientHandlers = {}): LinowClient {
  return {
    register: handlers.register ?? missingImplementation("register"),
    verify: handlers.verify ?? missingImplementation("verify"),
    attest: handlers.attest ?? missingImplementation("attest"),
    getEvidence: handlers.getEvidence ?? missingImplementation("getEvidence"),
  };
}

function missingImplementation<K extends keyof LinowClient>(operation: K): LinowClient[K] {
  return (async () => {
    throw new Error(
      `LinowClient.${operation} is not implemented yet. Define the shared interface first, then wire the real SDK handlers.`,
    );
  }) as LinowClient[K];
}
