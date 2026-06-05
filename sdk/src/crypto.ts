import type { BinaryContent, CommitmentHex, EvidenceMetadata } from "./types";

const AES_ALGORITHM = "AES-GCM";
const IV_LENGTH_BYTES = 12;
const HASH_ALGORITHM = "SHA-256";
type ByteArray = Uint8Array<ArrayBuffer>;

export interface EncryptedPayload {
  algorithm: typeof AES_ALGORITHM;
  ciphertext: ByteArray;
  iv: ByteArray;
}

type BinaryInput = BinaryContent | Blob;

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return getCrypto().subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportEncryptionKey(key: CryptoKey): Promise<Uint8Array> {
  const rawKey = await getCrypto().subtle.exportKey("raw", key);
  return new Uint8Array(rawKey);
}

export async function importEncryptionKey(rawKey: BinaryContent): Promise<CryptoKey> {
  return getCrypto().subtle.importKey(
    "raw",
    normalizeBytes(rawKey),
    {
      name: AES_ALGORITHM,
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function hashFile(content: BinaryInput): Promise<CommitmentHex> {
  const digest = await getCrypto().subtle.digest(HASH_ALGORITHM, await toArrayBufferAsync(content));
  return toHex(new Uint8Array(digest));
}

export async function encryptFile(content: BinaryInput, key: CryptoKey): Promise<EncryptedPayload> {
  return encryptBytes(await toUint8ArrayAsync(content), key);
}

export async function decryptFile(payload: EncryptedPayload, key: CryptoKey): Promise<Uint8Array> {
  return decryptBytes(payload, key);
}

export async function encryptMetadata(
  metadata: EvidenceMetadata,
  key: CryptoKey,
): Promise<EncryptedPayload> {
  return encryptJson(metadata, key);
}

export async function decryptMetadata(
  payload: EncryptedPayload,
  key: CryptoKey,
): Promise<EvidenceMetadata> {
  return decryptJson<EvidenceMetadata>(payload, key);
}

export async function encryptJson<T>(value: T, key: CryptoKey): Promise<EncryptedPayload> {
  const plaintext = textEncoder.encode(JSON.stringify(value));
  return encryptBytes(plaintext, key);
}

export async function decryptJson<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
  const plaintext = await decryptBytes(payload, key);
  return JSON.parse(textDecoder.decode(plaintext)) as T;
}

async function encryptBytes(plaintext: Uint8Array, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = getCrypto().getRandomValues(new Uint8Array(IV_LENGTH_BYTES)) as ByteArray;
  const ciphertext = await getCrypto().subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv,
    },
    key,
    normalizeBytes(plaintext),
  );

  return {
    algorithm: AES_ALGORITHM,
    ciphertext: new Uint8Array(ciphertext) as ByteArray,
    iv,
  };
}

async function decryptBytes(payload: EncryptedPayload, key: CryptoKey): Promise<Uint8Array> {
  const plaintext = await getCrypto().subtle.decrypt(
    {
      name: payload.algorithm,
      iv: payload.iv,
    },
    key,
    payload.ciphertext,
  );

  return new Uint8Array(plaintext);
}

function getCrypto(): Crypto {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.subtle) {
    throw new Error("Web Crypto API is unavailable in this runtime.");
  }

  return cryptoApi;
}

async function toUint8ArrayAsync(content: BinaryInput): Promise<Uint8Array> {
  if (content instanceof Blob) {
    return new Uint8Array(await content.arrayBuffer());
  }

  return normalizeBytes(content);
}

async function toArrayBufferAsync(content: BinaryInput): Promise<ArrayBuffer> {
  return content instanceof Blob ? content.arrayBuffer() : normalizeBytes(content).buffer;
}

function normalizeBytes(content: BinaryContent): ByteArray {
  if (content instanceof Uint8Array) {
    return Uint8Array.from(content) as ByteArray;
  }

  return new Uint8Array(content.slice(0)) as ByteArray;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
