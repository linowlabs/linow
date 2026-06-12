import { promises as fs } from "node:fs";
import path from "node:path";
import { AGENT_CONFIG, type HarnessPackKey } from "@/lib/agent/config";
import { normalizeDocumentType } from "@/lib/agent/document-taxonomy";
import type {
  EvidenceClassificationOutput,
  GapAnalysisOutput,
  SourceConfidenceOutput,
} from "@/lib/agent/schemas";
import { AgentInputError } from "@/lib/agent/common";

export interface HarnessEvaluationInput {
  pack_key: HarnessPackKey;
  stage: "before_remediation" | "after_remediation";
  classifications?: EvidenceClassificationOutput[];
  source_confidences?: SourceConfidenceOutput[];
  gap_analysis?: GapAnalysisOutput;
}

export interface HarnessEvaluationResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
}

const repoRoot = path.resolve(process.cwd(), "..");

export async function evaluateIsaQ2Harness(input: HarnessEvaluationInput): Promise<HarnessEvaluationResult> {
  const packConfig = getHarnessPackConfig(input.pack_key);
  const checks: HarnessEvaluationResult["checks"] = [];

  if (input.classifications) {
    const expectedClassifications = await loadExpectedClassificationRows(packConfig);
    const materialRows = expectedClassifications.filter(
      (row) => !row.file_path.startsWith("negative_cases/") && !row.file_path.startsWith("evidence_remediation/"),
    );

    const matched = materialRows.filter((row) =>
      input.classifications?.some(
        (classification) =>
          classification.filename === path.basename(row.file_path) &&
          normalizeDocumentType(classification.document_type, classification.filename) ===
            normalizeDocumentType(row.document_type, row.file_path),
      ),
    );

    checks.push({
      name: "classification coverage",
      passed: matched.length === materialRows.length,
      detail: `${matched.length}/${materialRows.length} material files matched expected document types.`,
    });
  }

  if (input.source_confidences) {
    const expectedSource = await loadExpectedSourceConfidence(packConfig);
    const wrongLevel = input.source_confidences.filter((item) => item.source_confidence !== expectedSource.default_initial_evidence.level);

    checks.push({
      name: "source confidence guardrail",
      passed: wrongLevel.length === 0,
      detail:
        wrongLevel.length === 0
          ? `All source confidence outputs stayed at ${expectedSource.default_initial_evidence.level} before attestation.`
          : `${wrongLevel.length} outputs deviated from the expected default L2 level.`,
    });
  }

  if (input.gap_analysis) {
    const expectedGaps =
      input.stage === "before_remediation"
        ? await loadExpectedGapAnalysis(packConfig, "before")
        : await loadExpectedGapAnalysis(packConfig, "after");

    const expectedGapTitles = expectedGaps.open_gaps.map((gap) => gap.title);
    const actualGapTitles = input.gap_analysis.gaps.map((gap) => gap.title);
    const missingGapTitles = expectedGapTitles.filter((title) => !actualGapTitles.includes(title));

    checks.push({
      name: "gap analysis expectations",
      passed: missingGapTitles.length === 0,
      detail:
        missingGapTitles.length === 0
          ? `All expected ${input.stage} gaps were present.`
          : `Missing expected gaps: ${missingGapTitles.join("; ")}`,
    });
  }

  if (checks.length === 0) {
    throw new AgentInputError("At least one of classifications, source_confidences, or gap_analysis must be provided.");
  }

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}

async function loadExpectedClassificationRows(
  packConfig: (typeof AGENT_CONFIG.harnessPacks)[HarnessPackKey],
): Promise<Array<{ file_path: string; document_type: string }>> {
  const csv = await fs.readFile(resolvePackPath(packConfig, packConfig.expected.classifications), "utf8");

  const rows = parseCsv(csv);
  return rows.slice(1).map((row) => ({
    file_path: row[0] ?? "",
    document_type: row[1] ?? "",
  }));
}

async function loadExpectedSourceConfidence(
  packConfig: (typeof AGENT_CONFIG.harnessPacks)[HarnessPackKey],
): Promise<{ default_initial_evidence: { level: string } }> {
  const raw = await fs.readFile(resolvePackPath(packConfig, packConfig.expected.sourceConfidence), "utf8");
  return JSON.parse(raw) as { default_initial_evidence: { level: string } };
}

async function loadExpectedGapAnalysis(
  packConfig: (typeof AGENT_CONFIG.harnessPacks)[HarnessPackKey],
  stage: "before" | "after",
): Promise<{
  open_gaps: Array<{ title: string }>;
}> {
  const pathSegments = stage === "before" ? packConfig.expected.gapBefore : packConfig.expected.gapAfter;
  const raw = await fs.readFile(resolvePackPath(packConfig, pathSegments), "utf8");
  return JSON.parse(raw) as { open_gaps: Array<{ title: string }> };
}

function getHarnessPackConfig(packKey: HarnessPackKey) {
  const config = AGENT_CONFIG.harnessPacks[packKey];

  if (!config) {
    throw new AgentInputError(`Unsupported harness pack: ${packKey}`);
  }

  return config;
}

function resolvePackPath(
  packConfig: (typeof AGENT_CONFIG.harnessPacks)[HarnessPackKey],
  pathSegments: readonly string[],
) {
  return path.join(repoRoot, ...packConfig.rootSegments, ...pathSegments);
}

function parseCsv(value: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const nextChar = value[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.length > 0));
}
