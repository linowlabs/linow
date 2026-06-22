import {
  AGENT_SCHEMA_VERSION,
  type MetadataExtractionOutput,
  type AgentCitation,
  type ExtractedAmount,
  type ExtractedDate,
  type ExtractedParty,
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
  value: Partial<MetadataExtractionOutput>,
): MetadataExtractionOutput {
  return {
    ...value,
    schema_name: "metadata_extraction",
    schema_version: AGENT_SCHEMA_VERSION,
    document_id: input.documentId,
    filename: input.documentName,
    document_date: normalizeOptionalString(value.document_date),
    period_start: normalizeOptionalString(value.period_start),
    period_end: normalizeOptionalString(value.period_end),
    document_reference: normalizeOptionalString(value.document_reference),
    parties: normalizeParties(value.parties),
    key_dates: normalizeDates(value.key_dates),
    key_amounts: normalizeAmounts(value.key_amounts),
    citations: normalizeCitations(input, value.citations),
    limitations: normalizeStringArray(value.limitations),
  };
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeParties(value: unknown): ExtractedParty[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.role !== "string") {
      return [];
    }

    return [
      {
        name: item.name.trim(),
        role: item.role.trim(),
        confidence: normalizeConfidence(item.confidence),
      },
    ];
  });
}

function normalizeDates(value: unknown): ExtractedDate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.label !== "string" || typeof item.value !== "string") {
      return [];
    }

    return [
      {
        label: item.label.trim(),
        value: item.value.trim(),
        confidence: normalizeConfidence(item.confidence),
      },
    ];
  });
}

function normalizeAmounts(value: unknown): ExtractedAmount[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.label !== "string") {
      return [];
    }

    const amount = typeof item.amount === "number" ? item.amount : Number(String(item.amount ?? "").replace(/[^0-9.-]/g, ""));

    if (!Number.isFinite(amount)) {
      return [];
    }

    return [
      {
        label: item.label.trim(),
        amount,
        currency: typeof item.currency === "string" && item.currency.trim().length > 0 ? item.currency.trim() : null,
        confidence: normalizeConfidence(item.confidence),
      },
    ];
  });
}

function normalizeCitations(input: AgentDocumentInput, value: unknown): AgentCitation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.reference !== "string" || item.reference.trim().length === 0) {
      return [];
    }

    const page = typeof item.page === "number" && Number.isInteger(item.page) && item.page >= 1 ? item.page : null;

    return [
      {
        document_id: input.documentId,
        filename: input.documentName,
        reference: item.reference.trim(),
        page,
        confidence: normalizeConfidence(item.confidence),
      },
    ];
  });
}

function normalizeConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
