export const AGENT_CONFIG = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-20b",
    defaultTemperature: 0.1,
    requestTimeoutMs: 20_000,
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
    metadataExtraction: "linow_agent_metadata_extraction",
    assertionMappingBundle: "linow_agent_assertion_mapping_bundle",
    gapAnalysis: "linow_agent_gap_analysis",
    ccerFinding: "linow_agent_ccer_finding",
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
