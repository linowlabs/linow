import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { AgentInputError, compactWhitespace } from "@/lib/agent/common";

export interface IngestedEvidenceFile {
  absolutePath: string;
  relativePath: string;
  filename: string;
  extension: string;
  format:
    | "text"
    | "csv"
    | "tsv"
    | "json"
    | "markdown"
    | "pdf"
    | "spreadsheet"
    | "docx"
    | "image"
    | "unsupported";
  text: string;
  byteLength: number;
  warnings: string[];
}

const repoRoot = path.resolve(process.cwd(), "..");
const allowedRoots = Array.from(new Set([repoRoot, path.resolve("/private/tmp"), os.tmpdir()]));

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".log",
  ".xml",
  ".html",
  ".htm",
  ".yml",
  ".yaml",
]);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"]);

export async function ingestEvidenceFile(filePath: string): Promise<IngestedEvidenceFile> {
  const absolutePath = resolveEvidencePath(filePath);
  const fileBuffer = await fs.readFile(absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const filename = path.basename(absolutePath);

  let format: IngestedEvidenceFile["format"];
  let text = "";
  let warnings: string[] = [];

  if (TEXT_EXTENSIONS.has(extension)) {
    format = inferTextFormat(extension);
    text = await fs.readFile(absolutePath, "utf8");
  } else if (extension === ".pdf") {
    format = "pdf";
    ({ text, warnings } = await extractPdfText(fileBuffer));
  } else if (extension === ".xlsx" || extension === ".xls" || extension === ".xlsm" || extension === ".xlsb") {
    format = "spreadsheet";
    text = extractSpreadsheetText(fileBuffer);
  } else if (extension === ".docx") {
    format = "docx";
    ({ text, warnings } = await extractDocxText(fileBuffer));
  } else if (IMAGE_EXTENSIONS.has(extension)) {
    format = "image";
    warnings = [
      "Image text is not extracted locally. Gemini provider can analyze this file as an inline image attachment.",
    ];
    text = `Image evidence file: ${filename}. Use the attached image content for OCR and visual evidence analysis when available.`;
  } else {
    format = "unsupported";
    warnings = [
      `Unsupported file extension: ${extension || "(none)"}.`,
      "Provide extracted text manually or add a dedicated parser for this format.",
    ];
    text = `Unsupported evidence file format for ${filename}.`;
  }

  return {
    absolutePath,
    relativePath: path.relative(repoRoot, absolutePath),
    filename,
    extension,
    format,
    text: compactWhitespace(text),
    byteLength: fileBuffer.byteLength,
    warnings,
  };
}

function resolveEvidencePath(filePath: string): string {
  const candidate = path.isAbsolute(filePath) ? path.normalize(filePath) : path.resolve(repoRoot, filePath);

  if (!allowedRoots.some((root) => candidate === root || candidate.startsWith(`${root}${path.sep}`))) {
    throw new AgentInputError("filePath must stay within the repository workspace.");
  }

  return candidate;
}

function inferTextFormat(extension: string): IngestedEvidenceFile["format"] {
  if (extension === ".csv") {
    return "csv";
  }

  if (extension === ".tsv") {
    return "tsv";
  }

  if (extension === ".json") {
    return "json";
  }

  if (extension === ".md" || extension === ".markdown") {
    return "markdown";
  }

  return "text";
}

async function extractPdfText(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const normalizedText = compactWhitespace(parsed.text ?? "");
  const warnings: string[] = [];

  if (!normalizedText) {
    warnings.push("No extractable text was found in this PDF. It may be scanned or image-only.");
  }

  return {
    text: normalizedText || "PDF contained no extractable text.",
    warnings,
  };
}

function extractSpreadsheetText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer", dense: true });
  const sheetBlocks = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return `Sheet: ${sheetName}\n<empty>`;
    }

    const csv = XLSX.utils.sheet_to_csv(worksheet, {
      FS: ",",
      RS: "\n",
      blankrows: false,
      skipHidden: false,
    });

    return [`Sheet: ${sheetName}`, csv.trim() || "<empty>"].join("\n");
  });

  return sheetBlocks.join("\n\n");
}

async function extractDocxText(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  const result = await mammoth.extractRawText({ buffer });
  const warnings = [...(result.messages?.map((message) => message.message) ?? [])];
  const text = compactWhitespace(result.value ?? "");

  if (!text) {
    warnings.push("DOCX extraction produced no visible text.");
  }

  return {
    text: text || "DOCX contained no extractable text.",
    warnings,
  };
}
