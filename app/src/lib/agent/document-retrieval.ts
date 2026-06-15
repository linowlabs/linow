import { AGENT_CONFIG } from "@/lib/agent/config";
import type { DocumentContextInput } from "@/lib/agent/common";
import { ASSERTION_CATALOG, getAssertionLabel, type AssertionId } from "@/lib/agent/schemas";

type RetrievalTask = "metadata" | "assertion_mapping" | "gap_analysis" | "draft_finding";

export interface RetrievalDocumentInput {
  documentId: string;
  documentName: string;
  documentText: string;
  context?: DocumentContextInput;
  classificationSummary?: string;
  metadataSummary?: string;
  notes?: string[];
}

export interface DocumentChunk {
  chunk_id: string;
  document_id: string;
  document_name: string;
  char_start: number;
  char_end: number;
  text: string;
  contextual_summary: string;
}

export interface RetrievedDocumentChunk extends DocumentChunk {
  score: number;
  lexical_score: number;
  semantic_score: number;
  matched_terms: string[];
}

export interface AssertionMappingRetrievalInput extends RetrievalDocumentInput {
  frameworkReference?: string;
}

export interface GapAnalysisRetrievalDocumentInput extends RetrievalDocumentInput {
  supportedAssertions?: string[];
  sourceConfidence?: string | null;
}

export interface GapAnalysisRetrievalInput {
  packId: string;
  engagementName: string;
  auditArea?: string;
  stage?: string;
  packNotes?: string[];
  documents: GapAnalysisRetrievalDocumentInput[];
}

export interface FindingRetrievalInput {
  packId: string;
  engagementName: string;
  auditArea?: string;
  stage?: string;
  gapTitle: string;
  gapRationale: string;
  relatedAssertions: AssertionId[];
  relatedAssertionLabels: string[];
  packNotes?: string[];
  documents: GapAnalysisRetrievalDocumentInput[];
}

interface RetrievalQuery {
  text: string;
  terms: string[];
}

interface CorpusStats {
  totalChunks: number;
  docFrequency: Map<string, number>;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "do",
  "for",
  "from",
  "has",
  "have",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "the",
  "their",
  "this",
  "to",
  "was",
  "with",
]);

export function chunkDocumentText(input: RetrievalDocumentInput): DocumentChunk[] {
  const targetChars = AGENT_CONFIG.retrieval.chunkTargetChars;
  const overlapChars = AGENT_CONFIG.retrieval.chunkOverlapChars;
  const paragraphs = splitIntoParagraphs(input.documentText);
  const chunks: DocumentChunk[] = [];
  let cursor = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.length <= targetChars) {
      pushChunk(paragraph);
      continue;
    }

    let paragraphCursor = 0;
    while (paragraphCursor < paragraph.length) {
      const nextCursor = Math.min(paragraph.length, paragraphCursor + targetChars);
      pushChunk(paragraph.slice(paragraphCursor, nextCursor));
      paragraphCursor = Math.max(nextCursor - overlapChars, paragraphCursor + 1);
    }
  }

  return chunks;

  function pushChunk(text: string) {
    const compacted = text.replace(/\s+/g, " ").trim();

    if (compacted.length === 0) {
      return;
    }

    const chunkStart = cursor;
    const chunkEnd = cursor + compacted.length;
    chunks.push({
      chunk_id: `${input.documentId}::chunk_${String(chunkIndex + 1).padStart(3, "0")}`,
      document_id: input.documentId,
      document_name: input.documentName,
      char_start: chunkStart,
      char_end: chunkEnd,
      text: compacted,
      contextual_summary: buildChunkContextualSummary({
        input,
        chunkText: compacted,
      }),
    });

    cursor = chunkEnd + 1;
    chunkIndex += 1;
  }
}

export function retrieveMetadataExtractionChunks(input: RetrievalDocumentInput): RetrievedDocumentChunk[] {
  return retrieveTopChunks([input], {
    task: "metadata",
    query: buildMetadataQuery(input),
    maxChunks: AGENT_CONFIG.retrieval.maxMetadataChunks,
  });
}

export function retrieveAssertionMappingChunks(
  input: AssertionMappingRetrievalInput,
): RetrievedDocumentChunk[] {
  return retrieveTopChunks([input], {
    task: "assertion_mapping",
    query: buildAssertionMappingQuery(input),
    maxChunks: AGENT_CONFIG.retrieval.maxAssertionMappingChunks,
  });
}

export function retrieveGapAnalysisChunks(input: GapAnalysisRetrievalInput): RetrievedDocumentChunk[] {
  return retrieveTopChunks(input.documents, {
    task: "gap_analysis",
    query: buildGapAnalysisQuery(input),
    maxChunks: AGENT_CONFIG.retrieval.maxGapAnalysisChunks,
  });
}

export function retrieveFindingChunks(input: FindingRetrievalInput): RetrievedDocumentChunk[] {
  return retrieveTopChunks(input.documents, {
    task: "draft_finding",
    query: buildFindingQuery(input),
    maxChunks: AGENT_CONFIG.retrieval.maxDraftFindingChunks,
  });
}

function retrieveTopChunks(
  documents: RetrievalDocumentInput[],
  input: {
    task: RetrievalTask;
    query: RetrievalQuery;
    maxChunks: number;
  },
): RetrievedDocumentChunk[] {
  const chunks = documents.flatMap((document) => chunkDocumentText(document));

  if (chunks.length === 0) {
    return [];
  }

  if (chunks.length <= input.maxChunks) {
    return chunks.map((chunk) => ({
      ...chunk,
      score: 0,
      lexical_score: 0,
      semantic_score: 0,
      matched_terms: [],
    }));
  }

  const corpusStats = buildCorpusStats(chunks);

  return chunks
    .map((chunk) => scoreRetrievedChunk(chunk, input.query, corpusStats, input.task))
    .sort((left, right) => right.score - left.score || left.char_start - right.char_start)
    .slice(0, input.maxChunks);
}

function buildMetadataQuery(input: RetrievalDocumentInput): RetrievalQuery {
  return buildQuery([
    input.documentName,
    input.context?.documentTypeHint,
    input.context?.auditArea,
    input.classificationSummary,
    "document date period start end effective issued reference account invoice contract statement approval approver prepared by customer vendor party amount currency total balance transfer payment acceptance committee signed",
  ]);
}

function buildAssertionMappingQuery(input: AssertionMappingRetrievalInput): RetrievalQuery {
  return buildQuery([
    input.documentName,
    input.context?.documentTypeHint,
    input.context?.auditArea,
    input.frameworkReference,
    input.classificationSummary,
    input.metadataSummary,
    ASSERTION_CATALOG.map((item) => item.label).join(" "),
    "existence completeness valuation allocation rights obligations cutoff cut off classification occurrence accuracy approval contract invoice payment acceptance policy statement transaction exception support evidence",
  ]);
}

function buildGapAnalysisQuery(input: GapAnalysisRetrievalInput): RetrievalQuery {
  return buildQuery([
    input.engagementName,
    input.auditArea,
    input.stage,
    input.packNotes?.join(" "),
    input.documents.flatMap((document) => document.supportedAssertions ?? []).join(" "),
    "gap missing unsupported partial support exception follow up approval pending absent cut off mismatch rights obligations completeness occurrence accuracy manual adjustment override evidence issue review note recommendation readiness",
  ]);
}

function buildFindingQuery(input: FindingRetrievalInput): RetrievalQuery {
  return buildQuery([
    input.engagementName,
    input.auditArea,
    input.stage,
    input.packNotes?.join(" "),
    input.gapTitle,
    input.gapRationale,
    input.relatedAssertionLabels.join(" "),
    input.relatedAssertions.map((assertionId) => getAssertionLabel(assertionId)).join(" "),
    "condition criteria cause effect recommendation approval missing absent pending exception support mismatch manual adjustment evidence citation remediation",
  ]);
}

function buildQuery(fragments: Array<string | undefined>): RetrievalQuery {
  const text = fragments.filter((value): value is string => Boolean(value)).join(" ");
  return {
    text,
    terms: tokenize(text),
  };
}

function buildChunkContextualSummary(input: {
  input: RetrievalDocumentInput;
  chunkText: string;
}): string {
  const preview = input.chunkText.slice(0, 180).replace(/\s+/g, " ").trim();
  const notePreview = input.input.notes?.slice(0, 2).join(" | ");
  const fragments = [
    `Chunk from ${input.input.documentName}.`,
    input.input.context?.documentTypeHint ? `Type hint: ${input.input.context.documentTypeHint}.` : null,
    input.input.context?.auditArea ? `Audit area: ${input.input.context.auditArea}.` : null,
    input.input.classificationSummary ? `Classification: ${truncate(input.input.classificationSummary, 180)}.` : null,
    input.input.metadataSummary ? `Metadata: ${truncate(input.input.metadataSummary, 180)}.` : null,
    notePreview ? `Notes: ${truncate(notePreview, 160)}.` : null,
    `Preview: ${preview}.`,
  ].filter((value): value is string => Boolean(value));

  return fragments.join(" ");
}

function buildCorpusStats(chunks: DocumentChunk[]): CorpusStats {
  const docFrequency = new Map<string, number>();

  for (const chunk of chunks) {
    const uniqueTokens = new Set(tokenize(`${chunk.contextual_summary} ${chunk.text}`));
    for (const token of uniqueTokens) {
      docFrequency.set(token, (docFrequency.get(token) ?? 0) + 1);
    }
  }

  return {
    totalChunks: chunks.length,
    docFrequency,
  };
}

function scoreRetrievedChunk(
  chunk: DocumentChunk,
  query: RetrievalQuery,
  corpusStats: CorpusStats,
  task: RetrievalTask,
): RetrievedDocumentChunk {
  const searchableText = `${chunk.contextual_summary} ${chunk.text}`;
  const tokenCounts = countTokens(searchableText);
  const lexicalScore = scoreLexical(tokenCounts, query.terms, corpusStats);
  const semanticScore = scoreSemantic(tokenCounts, query.terms, corpusStats);
  const matchedTerms = query.terms.filter((term) => tokenCounts.has(term));
  const signalBonus = scoreTaskSignals(chunk, task, matchedTerms);
  const score = lexicalScore * 0.55 + semanticScore * 0.35 + signalBonus;

  return {
    ...chunk,
    score,
    lexical_score: lexicalScore,
    semantic_score: semanticScore,
    matched_terms: matchedTerms,
  };
}

function scoreLexical(
  tokenCounts: Map<string, number>,
  queryTerms: string[],
  corpusStats: CorpusStats,
): number {
  if (queryTerms.length === 0) {
    return 0;
  }

  let score = 0;

  for (const term of queryTerms) {
    const tf = tokenCounts.get(term) ?? 0;

    if (tf === 0) {
      continue;
    }

    const idf = computeIdf(term, corpusStats);
    score += (1 + Math.log1p(tf)) * idf;
  }

  return score / queryTerms.length;
}

function scoreSemantic(
  tokenCounts: Map<string, number>,
  queryTerms: string[],
  corpusStats: CorpusStats,
): number {
  if (queryTerms.length === 0) {
    return 0;
  }

  const queryVector = buildHashedVector(new Map(queryTerms.map((term) => [term, 1])), corpusStats);
  const chunkVector = buildHashedVector(tokenCounts, corpusStats);
  return cosineSimilarity(queryVector, chunkVector);
}

function scoreTaskSignals(
  chunk: DocumentChunk,
  task: RetrievalTask,
  matchedTerms: string[],
): number {
  const text = `${chunk.contextual_summary} ${chunk.text}`.toLowerCase();
  const hasDate = /\b20\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/.test(text);
  const hasAmount = /\b(idr|usd|eur|sgd|rp)\b|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/.test(text);
  const hasApproval = /(approval|approved|committee|sign(?:ed)?|authorized|pending)/.test(text);
  const hasException = /(exception|follow up|pending|missing|override|manual adjustment|cut[- ]?off)/.test(text);
  const hasReference = /(inv[-_ ]?\d+|contract|statement|reference|journal|jrn[-_ ]?\d+)/.test(text);
  const matchedBonus = matchedTerms.length * 0.25;

  switch (task) {
    case "metadata":
      return matchedBonus + (hasDate ? 1.2 : 0) + (hasAmount ? 1 : 0) + (hasReference ? 0.8 : 0);
    case "assertion_mapping":
      return matchedBonus + (hasApproval ? 0.8 : 0) + (hasAmount ? 0.5 : 0) + (hasReference ? 0.6 : 0);
    case "gap_analysis":
      return matchedBonus + (hasException ? 1.2 : 0) + (hasApproval ? 0.8 : 0) + (hasDate ? 0.4 : 0);
    case "draft_finding":
      return matchedBonus + (hasException ? 1.4 : 0) + (hasApproval ? 1 : 0) + (hasReference ? 0.6 : 0);
  }
}

function buildHashedVector(
  tokenCounts: Map<string, number>,
  corpusStats: CorpusStats,
): Float32Array {
  const dimensions = AGENT_CONFIG.retrieval.embeddingDimensions;
  const vector = new Float32Array(dimensions);

  for (const [token, count] of tokenCounts.entries()) {
    const idf = computeIdf(token, corpusStats);
    const weight = (1 + Math.log1p(count)) * idf;
    const baseHash = hashToken(token);
    const index = baseHash % dimensions;
    const sign = (baseHash >> 1) % 2 === 0 ? 1 : -1;
    vector[index] += sign * weight;
  }

  return normalizeVector(vector);
}

function computeIdf(term: string, corpusStats: CorpusStats): number {
  const docFrequency = corpusStats.docFrequency.get(term) ?? 0;
  return Math.log((corpusStats.totalChunks + 1) / (docFrequency + 1)) + 1;
}

function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
  }
  return dot;
}

function normalizeVector(vector: Float32Array): Float32Array {
  let magnitude = 0;
  for (const value of vector) {
    magnitude += value * value;
  }

  const normalizedMagnitude = Math.sqrt(magnitude);

  if (normalizedMagnitude === 0) {
    return vector;
  }

  const normalized = new Float32Array(vector.length);
  for (let index = 0; index < vector.length; index += 1) {
    normalized[index] = vector[index] / normalizedMagnitude;
  }

  return normalized;
}

function countTokens(value: string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const token of tokenize(value)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return counts;
}

function tokenize(value: string): string[] {
  const minLength = AGENT_CONFIG.retrieval.minQueryTokenLength;

  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= minLength)
    .filter((token) => !STOP_WORDS.has(token));
}

function splitIntoParagraphs(value: string): string[] {
  const normalized = value.replace(/\r\n/g, "\n").trim();

  if (normalized.length === 0) {
    return [];
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0);

  return blocks.length > 0 ? blocks : [normalized];
}

function hashToken(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
