import { AGENT_CONFIG } from "@/lib/agent/config";
import { getServerEnv } from "@/lib/server-env";

interface TokenUsageEntry {
  atMs: number;
  tokens: number;
}

const tokenUsageWindow: TokenUsageEntry[] = [];
let geminiBlockedUntilMs = 0;

export async function waitForGeminiTokenBudget(requestBody: string) {
  const estimatedTokens = estimateGeminiRequestTokens(requestBody);
  const tpmLimit = getGeminiTpmLimit();
  const windowMs = getGeminiTpmWindowMs();
  const safetyBuffer = getGeminiTpmSafetyBuffer();

  while (true) {
    const now = Date.now();
    pruneTokenUsageWindow(now, windowMs);

    if (now < geminiBlockedUntilMs) {
      await sleep(geminiBlockedUntilMs - now);
      continue;
    }

    const usedTokens = tokenUsageWindow.reduce((total, entry) => total + entry.tokens, 0);

    if (usedTokens + estimatedTokens + safetyBuffer <= tpmLimit) {
      return estimatedTokens;
    }

    const waitMs = computeBudgetWaitMs(now, estimatedTokens + safetyBuffer - (tpmLimit - usedTokens), windowMs);
    await sleep(waitMs);
  }
}

export function recordGeminiTokenUsage(totalTokens: number | undefined, estimatedTokens: number) {
  tokenUsageWindow.push({
    atMs: Date.now(),
    tokens: Math.max(1, totalTokens ?? estimatedTokens),
  });
}

export function recordGeminiRateLimit(retryDelayMs: number) {
  geminiBlockedUntilMs = Math.max(geminiBlockedUntilMs, Date.now() + retryDelayMs);
}

function estimateGeminiRequestTokens(requestBody: string): number {
  const charsPerToken = getGeminiCharsPerTokenEstimate();
  const completionReserve = getGeminiCompletionReserveTokens();
  return Math.ceil(requestBody.length / charsPerToken) + completionReserve;
}

function computeBudgetWaitMs(now: number, requiredTokens: number, windowMs: number): number {
  let deficit = requiredTokens;

  for (const entry of tokenUsageWindow) {
    deficit -= entry.tokens;
    if (deficit <= 0) {
      return Math.max(250, entry.atMs + windowMs - now + 50);
    }
  }

  return Math.max(1_000, windowMs);
}

function pruneTokenUsageWindow(now: number, windowMs: number) {
  while (tokenUsageWindow.length > 0 && tokenUsageWindow[0].atMs + windowMs <= now) {
    tokenUsageWindow.shift();
  }
}

function getGeminiTpmLimit(): number {
  return readPositiveNumberEnv("GEMINI_TPM_LIMIT") ?? AGENT_CONFIG.gemini.tpmLimit;
}

function getGeminiTpmWindowMs(): number {
  return readPositiveNumberEnv("GEMINI_TPM_WINDOW_MS") ?? AGENT_CONFIG.gemini.tpmWindowMs;
}

function getGeminiTpmSafetyBuffer(): number {
  return readPositiveNumberEnv("GEMINI_TPM_SAFETY_BUFFER") ?? AGENT_CONFIG.gemini.tpmSafetyBuffer;
}

function getGeminiCharsPerTokenEstimate(): number {
  return readPositiveNumberEnv("GEMINI_TPM_CHARS_PER_TOKEN") ?? AGENT_CONFIG.gemini.estimatedCharsPerToken;
}

function getGeminiCompletionReserveTokens(): number {
  return readPositiveNumberEnv("GEMINI_TPM_COMPLETION_RESERVE") ?? AGENT_CONFIG.gemini.completionReserveTokens;
}

function readPositiveNumberEnv(name: string): number | undefined {
  const raw = getServerEnv(name);

  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
