import {
  AGENT_SCHEMA_VERSION,
  evidenceClassificationSchema,
  getAssertionLabel,
  isEvidenceClassificationOutput,
  type EvidenceClassificationOutput,
} from "@/lib/agent/schemas";

export interface DocumentContextInput {
  engagementName?: string;
  documentTypeHint?: string;
  uploaderLabel?: string;
}

export interface ClassifyDocumentInput {
  documentId: string;
  documentName: string;
  documentText: string;
  context?: DocumentContextInput;
}

export class AgentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentInputError";
  }
}

export const groqClassificationSchema = evidenceClassificationSchema;

export function parseClassifyDocumentInput(value: unknown): ClassifyDocumentInput {
  if (!isRecord(value)) {
    throw new AgentInputError("Request body must be a JSON object.");
  }

  const documentName = readRequiredString(value.documentName, "documentName");
  const documentId = readOptionalString(value.documentId, "documentId") ?? deriveDocumentId(documentName);
  const documentText = readRequiredString(value.documentText, "documentText");

  if (documentText.length > 12000) {
    throw new AgentInputError("documentText must be 12,000 characters or fewer in cheap mode.");
  }

  const contextValue = value.context;
  let context: DocumentContextInput | undefined;

  if (contextValue !== undefined) {
    if (!isRecord(contextValue)) {
      throw new AgentInputError("context must be an object when provided.");
    }

    context = {
      engagementName: readOptionalString(contextValue.engagementName, "context.engagementName"),
      documentTypeHint: readOptionalString(contextValue.documentTypeHint, "context.documentTypeHint"),
      uploaderLabel: readOptionalString(contextValue.uploaderLabel, "context.uploaderLabel"),
    };
  }

  return {
    documentId,
    documentName,
    documentText: compactWhitespace(documentText),
    context,
  };
}

export function buildClassificationMessages(input: ClassifyDocumentInput) {
  const contextLines = [
    input.context?.engagementName ? `Engagement: ${input.context.engagementName}` : null,
    input.context?.documentTypeHint ? `Document type hint: ${input.context.documentTypeHint}` : null,
    input.context?.uploaderLabel ? `Uploader label: ${input.context.uploaderLabel}` : null,
  ].filter(Boolean);

  return [
    {
      role: "system" as const,
      content: [
        "You are Linow's audit evidence classification agent.",
        `Return JSON that matches schema_version ${AGENT_SCHEMA_VERSION} exactly.`,
        "Classify the document into an audit-relevant type and map likely ISA 500 assertions.",
        "You must not claim that evidence is source-verified unless the input explicitly proves it.",
        "Use source confidence language L0-L5 exactly.",
        "Keep the output limited to classification fields only.",
        "Use the canonical assertion labels that match the chosen IDs.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Document id: ${input.documentId}`,
        `Document name: ${input.documentName}`,
        ...(contextLines.length > 0 ? contextLines : []),
        "Task:",
        "- Classify the document into an audit-relevant type.",
        "- Provide one confidence score between 0 and 1.",
        "- Explain the rationale briefly.",
        "- Return limitations as an array of caveats.",
        "- Return assertion IDs and matching labels.",
        "- Assign source confidence with caveats.",
        "Document text:",
        input.documentText,
      ].join("\n"),
    },
  ];
}

export function isAgentClassificationResult(value: unknown): value is EvidenceClassificationOutput {
  return isEvidenceClassificationOutput(value);
}

export function normalizeClassificationResult(
  input: ClassifyDocumentInput,
  value: EvidenceClassificationOutput,
): EvidenceClassificationOutput {
  const assertionLabels =
    value.assertions.length === value.assertion_labels.length
      ? value.assertion_labels
      : value.assertions.map((assertionId) => getAssertionLabel(assertionId));

  return {
    ...value,
    schema_name: "evidence_classification",
    schema_version: AGENT_SCHEMA_VERSION,
    document_id: input.documentId,
    filename: input.documentName,
    assertion_labels: assertionLabels,
  };
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AgentInputError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function readOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AgentInputError(`${fieldName} must be a string when provided.`);
  }

  return value.trim();
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function deriveDocumentId(documentName: string): string {
  const slug = documentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return slug ? `doc_${slug}` : "doc_uploaded_file";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
