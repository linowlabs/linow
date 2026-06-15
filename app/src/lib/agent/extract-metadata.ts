import {
  AGENT_SCHEMA_VERSION,
  type MetadataExtractionOutput,
  metadataExtractionSchema,
  isMetadataExtractionOutput,
} from "@/lib/agent/schemas";
import { buildDocumentContextLines, type AgentDocumentInput } from "@/lib/agent/common";
import { retrieveMetadataExtractionChunks } from "@/lib/agent/document-retrieval";

export interface MetadataExtractionPromptInput extends AgentDocumentInput {
  classificationSummary?: string;
  notes?: string[];
}

export const groqMetadataExtractionSchema = metadataExtractionSchema;

export function buildMetadataExtractionMessages(input: MetadataExtractionPromptInput) {
  const contextLines = buildDocumentContextLines(input);
  const retrievedChunks = retrieveMetadataExtractionChunks(input);
  const compactChunkCards = retrievedChunks.map((chunk) =>
    [
      `${chunk.chunk_id} [chars ${chunk.char_start}-${chunk.char_end}]`,
      chunk.text,
    ].join("\n"),
  );

  return [
    {
      role: "system" as const,
      content: [
        "You are Linow's audit evidence metadata extraction agent.",
        `Return JSON that matches schema_version ${AGENT_SCHEMA_VERSION} exactly.`,
        "Extract only what the provided evidence supports.",
        "Do not invent dates, amounts, parties, or references.",
        "Citations must point to the current document only.",
        "If evidence is partial, state that in limitations.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Document id: ${input.documentId}`,
        `Document name: ${input.documentName}`,
        ...(contextLines.length > 0 ? contextLines : []),
        input.classificationSummary ? `Classification summary: ${input.classificationSummary}` : null,
        "Task:",
        "- Extract dates, periods, document reference, parties, amounts, and citations.",
        "- Return null for date/reference fields when absent.",
        "- Return empty arrays when the text does not support a section.",
        "- Use only the evidence excerpts below.",
        "- Stay conservative when the excerpts are incomplete.",
        "Retrieved evidence excerpts:",
        ...compactChunkCards,
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
