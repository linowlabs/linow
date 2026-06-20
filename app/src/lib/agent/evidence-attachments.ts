import { readFile } from "node:fs/promises";
import { AGENT_CONFIG } from "@/lib/agent/config";
import { type AgentDocumentInput } from "@/lib/agent/common";
import type { IngestedEvidenceFile } from "@/lib/agent/ingest";
import type { AgentCompletionAttachment } from "@/lib/agent/provider-types";

type AttachmentCapableDocument = AgentDocumentInput & {
  ingested_file?: IngestedEvidenceFile;
};

const IMAGE_MIME_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".bmp", "image/bmp"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
]);

export async function buildGeminiEvidenceAttachments(
  input: AttachmentCapableDocument,
): Promise<AgentCompletionAttachment[]> {
  const file = input.ingested_file;

  if (!file || file.byteLength > getMaxInlineAttachmentBytes()) {
    return [];
  }

  const mimeType = resolveAttachableMimeType(file);

  if (!mimeType) {
    return [];
  }

  if (file.format === "pdf" && !shouldAttachPdf(input)) {
    return [];
  }

  const data = await readFile(file.absolutePath);

  return [
    {
      displayName: file.filename,
      mimeType,
      dataBase64: data.toString("base64"),
      byteLength: data.byteLength,
    },
  ];
}

function resolveAttachableMimeType(file: IngestedEvidenceFile): string | undefined {
  if (file.format === "pdf") {
    return "application/pdf";
  }

  if (file.format === "image") {
    return IMAGE_MIME_TYPES.get(file.extension);
  }

  return undefined;
}

function shouldAttachPdf(input: AttachmentCapableDocument): boolean {
  const mode = getGeminiPdfMode();

  if (mode === "off") {
    return false;
  }

  if (mode === "always") {
    return true;
  }

  return input.documentText.length < AGENT_CONFIG.gemini.minPdfTextCharsForTextOnly;
}

function getGeminiPdfMode(): "auto" | "always" | "off" {
  const raw = process.env.GEMINI_PDF_MODE;

  if (raw === "always" || raw === "off") {
    return raw;
  }

  return AGENT_CONFIG.gemini.pdfMode;
}

function getMaxInlineAttachmentBytes(): number {
  const raw = process.env.GEMINI_MAX_INLINE_ATTACHMENT_BYTES;
  const parsed = raw ? Number(raw) : NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : AGENT_CONFIG.gemini.maxInlineAttachmentBytes;
}
