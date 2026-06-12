import {
  AGENT_SCHEMA_VERSION,
  type MetadataExtractionOutput,
  metadataExtractionSchema,
  isMetadataExtractionOutput,
} from "@/lib/agent/schemas";
import { buildDocumentContextLines, type AgentDocumentInput } from "@/lib/agent/common";

export const groqMetadataExtractionSchema = metadataExtractionSchema;

export function buildMetadataExtractionMessages(input: AgentDocumentInput) {
  const contextLines = buildDocumentContextLines(input);

  return [
    {
      role: "system" as const,
      content: [
        "You are Linow's audit evidence metadata extraction agent.",
        `Return JSON that matches schema_version ${AGENT_SCHEMA_VERSION} exactly.`,
        "Extract only what is supported by the provided document text.",
        "Do not invent exact dates, amounts, or parties if they are not visible.",
        "Citations should point to the described reference in the current document only.",
        "Keep limitations explicit whenever the text is partial or ambiguous.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Document id: ${input.documentId}`,
        `Document name: ${input.documentName}`,
        ...(contextLines.length > 0 ? contextLines : []),
        "Task:",
        "- Extract dates, periods, document reference, parties, amounts, and citations.",
        "- Return null for date/reference fields when absent.",
        "- Return empty arrays when the text does not support a section.",
        "Document text:",
        input.documentText,
      ].join("\n"),
    },
  ];
}

export function isAgentMetadataExtractionResult(value: unknown): value is MetadataExtractionOutput {
  return isMetadataExtractionOutput(value);
}

export function normalizeMetadataExtractionResult(
  input: AgentDocumentInput,
  value: MetadataExtractionOutput,
): MetadataExtractionOutput {
  return {
    ...value,
    schema_name: "metadata_extraction",
    schema_version: AGENT_SCHEMA_VERSION,
    document_id: input.documentId,
    filename: input.documentName,
  };
}
