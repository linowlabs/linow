export const AGENT_CONFIG = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-20b",
    defaultTemperature: 0.1,
    requestTimeoutMs: 20_000,
    maxAttemptsPerRequest: 2,
    maxRetryAfterMs: 6_000,
  },
  limits: {
    maxDocumentChars: 12_000,
    maxPackDocuments: 64,
    maxStringArrayItems: 64,
    maxStringItemLength: 240,
    maxFindingsPerPack: 5,
  },
  schemaNames: {
    classification: "linow_agent_classification",
    documentAnalysisBundle: "linow_agent_document_analysis_bundle",
    metadataExtraction: "linow_agent_metadata_extraction",
    assertionMappingBundle: "linow_agent_assertion_mapping_bundle",
    gapAnalysis: "linow_agent_gap_analysis",
    ccerFinding: "linow_agent_ccer_finding",
  },
  cache: {
    enableDocumentAnalysisReuse: true,
    documentAnalysisDir: ".cache/agent/document-analysis",
    documentAnalysisVersion: "2026-06-14-v1",
  },
  orchestrationProfiles: {
    cheap: {
      maxDocumentChars: 8_000,
      combineDocumentPasses: true,
      maxFindingsPerPack: 1,
      recallPriorMemory: true,
      maxPriorMemoryNotes: 4,
    },
    balanced: {
      maxDocumentChars: 10_000,
      combineDocumentPasses: true,
      maxFindingsPerPack: 3,
      recallPriorMemory: true,
      maxPriorMemoryNotes: 6,
    },
    full: {
      maxDocumentChars: 12_000,
      combineDocumentPasses: false,
      maxFindingsPerPack: 5,
      recallPriorMemory: true,
      maxPriorMemoryNotes: 8,
    },
  },
  harnessPacks: {
    isa_q2: {
      key: "isa_q2",
      rootSegments: ["demo", "isa_q2_engagement"],
      expected: {
        classifications: ["expected_outputs", "expected_classification_summary.csv"],
        sourceConfidence: ["expected_outputs", "expected_source_confidence.json"],
        gapBefore: ["expected_outputs", "expected_gap_analysis_before_remediation.json"],
        gapAfter: ["expected_outputs", "expected_gap_analysis_after_remediation.json"],
      },
    },
  },
} as const;

export type HarnessPackKey = keyof typeof AGENT_CONFIG.harnessPacks;
export type AgentOrchestrationProfile = keyof typeof AGENT_CONFIG.orchestrationProfiles;
