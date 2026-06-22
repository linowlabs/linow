import type { AssertionId } from "@/lib/agent/schemas";

interface DocumentTypeDefinition {
  canonical: string;
  aliases: readonly string[];
  filenameHints: readonly string[];
  baselineAssertions?: readonly AssertionId[];
}

const DOCUMENT_TYPE_DEFINITIONS: readonly DocumentTypeDefinition[] = [
  {
    canonical: "financial_reporting_workbook",
    aliases: ["financial reporting workbook", "financial reporting pack", "reporting workbook"],
    filenameHints: ["financial_reporting", "reporting_pack"],
    baselineAssertions: [1, 2, 5, 7],
  },
  {
    canonical: "management_report",
    aliases: ["management report", "monthly management report"],
    filenameHints: ["management_report"],
    baselineAssertions: [1, 2, 5],
  },
  {
    canonical: "sales_register",
    aliases: ["sales register", "revenue register"],
    filenameHints: ["sales_register"],
    baselineAssertions: [1, 4, 5, 6, 7],
  },
  {
    canonical: "customer_contract",
    aliases: ["customer contract", "sales contract", "commercial contract"],
    filenameHints: ["customer_contract", "contract_"],
    baselineAssertions: [0, 3, 4, 5],
  },
  {
    canonical: "invoice",
    aliases: ["invoice", "customer invoice"],
    filenameHints: ["invoice_", "inv-"],
    baselineAssertions: [0, 4, 5, 6, 7],
  },
  {
    canonical: "service_acceptance",
    aliases: ["service acceptance", "acceptance certificate", "uat signoff", "uat sign-off"],
    filenameHints: ["service_acceptance", "uat_"],
    baselineAssertions: [0, 4, 6],
  },
  {
    canonical: "cutoff_log",
    aliases: ["cutoff log", "cut-off log", "delivery cutoff log", "service delivery cutoff log"],
    filenameHints: ["cutoff_log", "cut-off", "cutoff"],
    baselineAssertions: [4, 6, 7],
  },
  {
    canonical: "bank_transaction_export",
    aliases: ["bank transaction export", "bank transactions export", "bank transaction listing", "bank export"],
    filenameHints: ["bank_transactions", "bank_transaction"],
    baselineAssertions: [0, 1, 2, 7],
  },
  {
    canonical: "bank_statement",
    aliases: ["bank statement", "monthly bank statement"],
    filenameHints: ["bank_statement"],
    baselineAssertions: [0, 1, 2, 7],
  },
  {
    canonical: "gl_ledger",
    aliases: ["gl ledger", "general ledger", "ledger export"],
    filenameHints: ["gl_ledger", "ledger_"],
    baselineAssertions: [1, 2, 5, 7],
  },
  {
    canonical: "deferred_revenue_rollforward",
    aliases: ["deferred revenue rollforward", "revenue rollforward"],
    filenameHints: ["deferred_revenue_rollforward", "rollforward"],
    baselineAssertions: [1, 2, 7],
  },
  {
    canonical: "ar_aging",
    aliases: ["ar aging", "a/r aging", "accounts receivable aging"],
    filenameHints: ["ar_aging", "aging"],
    baselineAssertions: [1, 2, 7],
  },
  {
    canonical: "policy_document",
    aliases: ["policy document", "revenue recognition policy", "accounting policy"],
    filenameHints: ["policy", "revenue_recognition_policy"],
    baselineAssertions: [5],
  },
  {
    canonical: "manual_adjustment_note",
    aliases: ["manual adjustment note", "journal adjustment note", "je note"],
    filenameHints: ["manual_adjustment_note", "jrn-"],
    baselineAssertions: [2, 5, 7],
  },
  {
    canonical: "email_thread",
    aliases: ["email thread", "finance email thread", "email chain"],
    filenameHints: ["email_thread"],
    baselineAssertions: [4],
  },
  {
    canonical: "board_minutes",
    aliases: ["board minutes", "committee minutes", "commercial committee minutes"],
    filenameHints: ["board_minutes", "committee_minutes", "minutes_"],
    baselineAssertions: [3, 6],
  },
  {
    canonical: "approval_document",
    aliases: ["approval document", "approval memo", "cfo approval"],
    filenameHints: ["approval_document", "approval_"],
    baselineAssertions: [3, 5, 7],
  },
  {
    canonical: "tampered_bank_statement",
    aliases: ["tampered bank statement"],
    filenameHints: ["tampered_bank_statement"],
  },
  {
    canonical: "tampered_sales_register",
    aliases: ["tampered sales register"],
    filenameHints: ["tampered_sales_register"],
  },
  {
    canonical: "irrelevant_document",
    aliases: ["irrelevant document", "marketing brochure", "brochure"],
    filenameHints: ["wrong_document", "brochure", "marketing"],
  },
] as const;

const ASSERTION_ORDER: readonly AssertionId[] = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export function buildDocumentTypePromptBlock(): string {
  return [
    "Use one of these canonical document_type values when applicable:",
    ...DOCUMENT_TYPE_DEFINITIONS.map((definition) => `- ${definition.canonical}`),
    "If no listed value fits, return a short lowercase_snake_case type.",
  ].join("\n");
}

export function normalizeDocumentType(value: string, filename?: string): string {
  const normalizedValue = normalizeToken(value);
  const definitionByValue = matchDefinition(normalizedValue);

  if (definitionByValue) {
    return definitionByValue.canonical;
  }

  const normalizedFilename = normalizeToken(filename ?? "");
  const definitionByFilename = DOCUMENT_TYPE_DEFINITIONS.find((definition) =>
    definition.filenameHints.some((hint) => normalizedFilename.includes(normalizeToken(hint))),
  );

  if (definitionByFilename) {
    return definitionByFilename.canonical;
  }

  return toSnakeCase(value);
}

export function getDocumentTypeBaselineAssertions(documentType: string): AssertionId[] {
  const normalizedType = normalizeDocumentType(documentType);
  const definition = DOCUMENT_TYPE_DEFINITIONS.find((candidate) => candidate.canonical === normalizedType);

  return definition?.baselineAssertions ? [...definition.baselineAssertions] : [];
}

export function calibrateClassificationAssertions(
  documentType: string,
  assertionIds: readonly AssertionId[],
  documentText: string,
): AssertionId[] {
  const normalizedType = normalizeDocumentType(documentType);
  const merged = new Set<AssertionId>(assertionIds);

  if (normalizedType === "bank_statement" && /statement period|ending balance|account holder|balance/i.test(documentText)) {
    for (const assertionId of getDocumentTypeBaselineAssertions(normalizedType)) {
      merged.add(assertionId);
    }
  }

  if (
    normalizedType === "bank_transaction_export" &&
    /transfer|deposit|receipt|balance|transaction/i.test(documentText)
  ) {
    for (const assertionId of getDocumentTypeBaselineAssertions(normalizedType)) {
      merged.add(assertionId);
    }
  }

  return [...merged].sort((left, right) => ASSERTION_ORDER.indexOf(left) - ASSERTION_ORDER.indexOf(right));
}

function matchDefinition(normalizedValue: string): DocumentTypeDefinition | undefined {
  return DOCUMENT_TYPE_DEFINITIONS.find((definition) => {
    if (normalizeToken(definition.canonical) === normalizedValue) {
      return true;
    }

    return definition.aliases.some((alias) => normalizeToken(alias) === normalizedValue);
  });
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function toSnakeCase(value: string): string {
  const token = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return token.length > 0 ? token : "unclassified_document";
}
