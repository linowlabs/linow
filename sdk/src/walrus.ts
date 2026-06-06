export const WALRUS_HTTP_ENDPOINTS = {
  testnet: {
    publisher: "https://publisher.walrus-testnet.walrus.space",
    aggregator: "https://aggregator.walrus-testnet.walrus.space",
  },
  mainnet: {
    publisher: "https://publisher.walrus-mainnet.walrus.space",
    aggregator: "https://aggregator.walrus-mainnet.walrus.space",
  },
} as const;

export type WalrusNetwork = keyof typeof WALRUS_HTTP_ENDPOINTS;
export type EncryptedBlobContent = ArrayBuffer | Uint8Array;

export interface WalrusClientConfig {
  network?: WalrusNetwork;
  publisherUrl?: string;
  aggregatorUrl?: string;
  fetchFn?: FetchLike;
}

export interface UploadEncryptedBlobInput {
  encryptedContent: EncryptedBlobContent;
  epochs?: number;
  deletable?: boolean;
  sendObjectTo?: string;
}

export interface WalrusBlobObject {
  id?: string;
  blobId?: string;
  registeredEpoch?: number;
  certifiedEpoch?: number;
  size?: number;
  encodingType?: string;
  deletable?: boolean;
  storage?: {
    id?: string;
    startEpoch?: number;
    endEpoch?: number;
    storageSize?: number;
  };
}

export interface WalrusBlobEvent {
  txDigest?: string;
  eventSeq?: string;
}

export interface WalrusUploadResult {
  blobId: string;
  blobObjectId?: string;
  endEpoch?: number;
  event?: WalrusBlobEvent;
  raw: unknown;
}

export interface WalrusClient {
  uploadEncryptedBlob(input: UploadEncryptedBlobInput): Promise<WalrusUploadResult>;
  readEncryptedBlob(blobId: string): Promise<ArrayBuffer>;
}

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: BodyInit;
  },
) => Promise<Pick<Response, "ok" | "status" | "statusText" | "arrayBuffer" | "json" | "text">>;

interface NewlyCreatedResponse {
  newlyCreated: {
    blobObject?: WalrusBlobObject;
  };
}

interface AlreadyCertifiedResponse {
  alreadyCertified: {
    blobId?: string;
    event?: WalrusBlobEvent;
    endEpoch?: number;
  };
}

export function createWalrusClient(config: WalrusClientConfig = {}): WalrusClient {
  const network = config.network ?? "testnet";
  const publisherUrl = stripTrailingSlash(config.publisherUrl ?? WALRUS_HTTP_ENDPOINTS[network].publisher);
  const aggregatorUrl = stripTrailingSlash(config.aggregatorUrl ?? WALRUS_HTTP_ENDPOINTS[network].aggregator);
  const fetchFn = config.fetchFn ?? globalThis.fetch;

  if (!fetchFn) {
    throw new Error("Walrus client requires a fetch implementation.");
  }

  return {
    async uploadEncryptedBlob(input) {
      const url = new URL(`${publisherUrl}/v1/blobs`);

      if (input.epochs !== undefined) {
        url.searchParams.set("epochs", input.epochs.toString());
      }

      if (input.deletable !== undefined) {
        url.searchParams.set(input.deletable ? "deletable" : "permanent", "true");
      }

      if (input.sendObjectTo) {
        url.searchParams.set("send_object_to", input.sendObjectTo);
      }

      const response = await fetchFn(url.toString(), {
        method: "PUT",
        headers: {
          "content-type": "application/octet-stream",
        },
        body: input.encryptedContent as BodyInit,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Walrus upload failed with HTTP ${response.status} ${response.statusText}: ${body}`);
      }

      const payload = await response.json();
      return parseUploadResult(payload);
    },

    async readEncryptedBlob(blobId) {
      const response = await fetchFn(`${aggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Walrus read failed with HTTP ${response.status} ${response.statusText}: ${body}`);
      }

      return response.arrayBuffer();
    },
  };
}

function parseUploadResult(payload: unknown): WalrusUploadResult {
  if (isNewlyCreatedResponse(payload)) {
    const blobObject = payload.newlyCreated.blobObject;
    const blobId = blobObject?.blobId;

    if (!blobId) {
      throw new Error("Walrus upload response did not include a blob ID.");
    }

    return {
      blobId,
      blobObjectId: blobObject.id,
      endEpoch: blobObject.storage?.endEpoch,
      raw: payload,
    };
  }

  if (isAlreadyCertifiedResponse(payload)) {
    const blobId = payload.alreadyCertified.blobId;

    if (!blobId) {
      throw new Error("Walrus already-certified response did not include a blob ID.");
    }

    return {
      blobId,
      endEpoch: payload.alreadyCertified.endEpoch,
      event: payload.alreadyCertified.event,
      raw: payload,
    };
  }

  throw new Error("Walrus upload response had an unsupported shape.");
}

function isNewlyCreatedResponse(payload: unknown): payload is NewlyCreatedResponse {
  return typeof payload === "object" && payload !== null && "newlyCreated" in payload;
}

function isAlreadyCertifiedResponse(payload: unknown): payload is AlreadyCertifiedResponse {
  return typeof payload === "object" && payload !== null && "alreadyCertified" in payload;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
