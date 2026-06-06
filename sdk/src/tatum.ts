export const TATUM_SUI_ENDPOINTS = {
  mainnet: "https://sui-mainnet.gateway.tatum.io",
  testnet: "https://sui-testnet.gateway.tatum.io",
  devnet: "https://sui-devnet.gateway.tatum.io",
} as const;

export type TatumSuiNetwork = keyof typeof TATUM_SUI_ENDPOINTS;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface TatumSuiClientConfig {
  apiKey: string;
  network?: TatumSuiNetwork;
  endpoint?: string;
  fetchFn?: FetchLike;
}

export interface SuiObjectReadOptions {
  showType?: boolean;
  showOwner?: boolean;
  showPreviousTransaction?: boolean;
  showDisplay?: boolean;
  showContent?: boolean;
  showBcs?: boolean;
  showStorageRebate?: boolean;
}

export interface ExecuteTransactionBlockInput {
  transactionBlock: string;
  signature: string | string[];
  options?: JsonValue;
  requestType?: "WaitForEffectsCert" | "WaitForLocalExecution";
}

export interface TatumJsonRpcResponse<T = JsonValue> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: TatumJsonRpcError;
}

export interface TatumJsonRpcError {
  code: number;
  message: string;
  data?: JsonValue;
}

export interface TatumSuiClient {
  call<T = JsonValue>(method: string, params?: readonly JsonValue[]): Promise<T>;
  getObject(objectId: string, options?: SuiObjectReadOptions): Promise<JsonValue>;
  executeTransactionBlock(input: ExecuteTransactionBlockInput): Promise<JsonValue>;
}

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<Pick<Response, "ok" | "status" | "statusText" | "json" | "text">>;

export class TatumSuiRpcError extends Error {
  readonly code: number;
  readonly data?: JsonValue;

  constructor(error: TatumJsonRpcError) {
    super(error.message);
    this.name = "TatumSuiRpcError";
    this.code = error.code;
    this.data = error.data;
  }
}

export function createTatumSuiClient(config: TatumSuiClientConfig): TatumSuiClient {
  if (!config.apiKey) {
    throw new Error("Tatum Sui client requires a Tatum API key.");
  }

  const endpoint = config.endpoint ?? TATUM_SUI_ENDPOINTS[config.network ?? "testnet"];
  const fetchFn = config.fetchFn ?? globalThis.fetch;

  if (!fetchFn) {
    throw new Error("Tatum Sui client requires a fetch implementation.");
  }

  let nextId = 1;

  async function call<T = JsonValue>(method: string, params: readonly JsonValue[] = []): Promise<T> {
    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: nextId++,
        method,
        params,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Tatum Sui RPC request failed with HTTP ${response.status} ${response.statusText}: ${body}`);
    }

    const payload = (await response.json()) as TatumJsonRpcResponse<T>;

    if (payload.error) {
      throw new TatumSuiRpcError(payload.error);
    }

    if (!("result" in payload)) {
      throw new Error(`Tatum Sui RPC response for ${method} did not include a result.`);
    }

    return payload.result as T;
  }

  return {
    call,
    getObject(objectId, options = { showContent: true, showType: true, showOwner: true }) {
      return call("sui_getObject", [objectId, options as JsonValue]);
    },
    executeTransactionBlock(input) {
      return call("sui_executeTransactionBlock", [
        input.transactionBlock,
        Array.isArray(input.signature) ? input.signature : [input.signature],
        input.options ?? null,
        input.requestType ?? "WaitForLocalExecution",
      ]);
    },
  };
}
