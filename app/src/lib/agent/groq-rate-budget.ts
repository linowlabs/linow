import { AGENT_CONFIG } from "@/lib/agent/config";
import { getServerEnv } from "@/lib/server-env";

interface TokenUsageEntry {
  atMs: number;
  tokens: number;
}

const tokenUsageWindow: TokenUsageEntry[] = [];
let groqBlockedUntilMs = 0;

export async function waitForGroqTokenBudget(requestBody: string) {
  const estimatedTokens = estimateGroqRequestTokens(requestBody);
  const tpmLimit = getGroqTpmLimit();
  const windowMs = getGroqTpmWindowMs();
  const safetyBuffer = getGroqTpmSafetyBuffer();

  while (true) {
    const now = Date.now();
    pruneTokenUsageWindow(now, windowMs);

    if (now < groqBlockedUntilMs) {
      await sleep(groqBlockedUntilMs - now);
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

export function recordGroqTokenUsage(totalTokens: number | undefined, estimatedTokens: number) {
  const tokens = Math.max(1, totalTokens ?? estimatedTokens);
  tokenUsageWindow.push({
    atMs: Date.now(),
    tokens,
  });
}

export function recordGroqRateLimit(retryDelayMs: number) {
  groqBlockedUntilMs = Math.max(groqBlockedUntilMs, Date.now() + retryDelayMs);
}

function estimateGroqRequestTokens(requestBody: string): number {
  const charsPerToken = getGroqCharsPerTokenEstimate();
  const completionReserve = getGroqCompletionReserveTokens();
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

function getGroqTpmLimit(): number {
  return readPositiveNumberEnv("GROQ_TPM_LIMIT") ?? AGENT_CONFIG.groq.tpmLimit;
}

function getGroqTpmWindowMs(): number {
  return readPositiveNumberEnv("GROQ_TPM_WINDOW_MS") ?? AGENT_CONFIG.groq.tpmWindowMs;
}

function getGroqTpmSafetyBuffer(): number {
  return readPositiveNumberEnv("GROQ_TPM_SAFETY_BUFFER") ?? AGENT_CONFIG.groq.tpmSafetyBuffer;
}

function getGroqCharsPerTokenEstimate(): number {
  return readPositiveNumberEnv("GROQ_TPM_CHARS_PER_TOKEN") ?? AGENT_CONFIG.groq.estimatedCharsPerToken;
}

function getGroqCompletionReserveTokens(): number {
  return readPositiveNumberEnv("GROQ_TPM_COMPLETION_RESERVE") ?? AGENT_CONFIG.groq.completionReserveTokens;
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
