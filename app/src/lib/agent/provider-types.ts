export type AgentProviderName = "groq" | "gemini";

export interface AgentUsageStats {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AgentChatMessage {
  role: "system" | "user";
  content: string;
}

export interface AgentCompletionAttachment {
  displayName: string;
  mimeType: string;
  dataBase64: string;
  byteLength: number;
}

export interface AgentJsonCompletionConfig<T> {
  provider?: AgentProviderName;
  model?: string;
  schemaName: string;
  schema: unknown;
  messages: AgentChatMessage[];
  validate: (value: unknown) => value is T;
  responseMode?: "json_schema" | "json_object";
  attachments?: AgentCompletionAttachment[];
}

export interface AgentJsonCompletionResult<T> {
  provider: AgentProviderName;
  model: string;
  result: T;
  usage?: AgentUsageStats;
}
