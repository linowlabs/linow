import { AGENT_CONFIG } from "@/lib/agent/config";

export interface DocumentContextInput {
  engagementName?: string;
  documentTypeHint?: string;
  uploaderLabel?: string;
  filePath?: string;
  auditArea?: string;
}

export interface AgentDocumentInput {
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

export function parseAgentDocumentInput(value: unknown, maxChars = 12000): AgentDocumentInput {
  if (!isRecord(value)) {
    throw new AgentInputError("Request body must be a JSON object.");
  }

  const documentName = readRequiredString(value.documentName, "documentName");
  const documentId = readOptionalString(value.documentId, "documentId") ?? deriveDocumentId(documentName);
  const documentText = readRequiredString(value.documentText, "documentText");

  const effectiveMaxChars = Number.isFinite(maxChars) ? maxChars : AGENT_CONFIG.limits.maxDocumentChars;

  if (documentText.length > effectiveMaxChars) {
    throw new AgentInputError(`documentText must be ${effectiveMaxChars.toLocaleString()} characters or fewer in cheap mode.`);
  }

  const context = parseDocumentContext(value.context);

  return {
    documentId,
    documentName,
    documentText: compactWhitespace(documentText),
    context,
  };
}

export function parseDocumentContext(value: unknown): DocumentContextInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new AgentInputError("context must be an object when provided.");
  }

  return {
    engagementName: readOptionalString(value.engagementName, "context.engagementName"),
    documentTypeHint: readOptionalString(value.documentTypeHint, "context.documentTypeHint"),
    uploaderLabel: readOptionalString(value.uploaderLabel, "context.uploaderLabel"),
    filePath: readOptionalString(value.filePath, "context.filePath"),
    auditArea: readOptionalString(value.auditArea, "context.auditArea"),
  };
}

export function buildDocumentContextLines(input: AgentDocumentInput): string[] {
  return [
    input.context?.engagementName ? `Engagement: ${input.context.engagementName}` : null,
    input.context?.auditArea ? `Audit area: ${input.context.auditArea}` : null,
    input.context?.documentTypeHint ? `Document type hint: ${input.context.documentTypeHint}` : null,
    input.context?.uploaderLabel ? `Uploader label: ${input.context.uploaderLabel}` : null,
    input.context?.filePath ? `File path: ${input.context.filePath}` : null,
  ].filter((line): line is string => Boolean(line));
}

export function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AgentInputError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

export function readOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AgentInputError(`${fieldName} must be a string when provided.`);
  }

  return value.trim();
}

export function parseOptionalStringArray(
  value: unknown,
  fieldName: string,
  options: {
    maxItems?: number;
    maxItemLength?: number;
  } = {},
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new AgentInputError(`${fieldName} must be an array of strings when provided.`);
  }

  const maxItems = options.maxItems ?? AGENT_CONFIG.limits.maxStringArrayItems;
  const maxItemLength = options.maxItemLength ?? AGENT_CONFIG.limits.maxStringItemLength;

  if (value.length > maxItems) {
    throw new AgentInputError(`${fieldName} must contain at most ${maxItems} items.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new AgentInputError(`${fieldName}[${index}] must be a string.`);
    }

    const trimmed = item.trim();

    if (trimmed.length === 0) {
      throw new AgentInputError(`${fieldName}[${index}] must not be empty.`);
    }

    if (trimmed.length > maxItemLength) {
      throw new AgentInputError(`${fieldName}[${index}] must be ${maxItemLength} characters or fewer.`);
    }

    return trimmed;
  });
}

export function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function deriveDocumentId(documentName: string): string {
  const slug = documentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return slug ? `doc_${slug}` : "doc_uploaded_file";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
