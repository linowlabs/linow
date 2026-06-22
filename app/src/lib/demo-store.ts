const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const DEMO_EVIDENCE_BUCKET = "demo-evidence";

export interface DemoEngagementRow {
  id: string;
  audit_pack_id?: string | null;
  company_wallet?: string | null;
  auditor_wallet?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DemoEvidenceRow {
  id: string;
  engagement_id: string;
  evidence_id?: string | null;
  file_name: string;
  file_mime?: string | null;
  file_size?: number | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  document_type?: string | null;
  source?: string | null;
  description?: string | null;
  assertions?: string[] | null;
  commitment?: string | null;
  walrus_blob_id?: string | null;
  audit_pack_id?: string | null;
  registered_by_wallet?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DemoAttestationRow {
  id: string;
  engagement_id: string;
  evidence_id: string;
  attestation_id: string;
  tx_digest?: string | null;
  reviewer_wallet: string;
  action: string;
  note?: string | null;
  created_at?: string;
}

export interface DemoAgentActionRow {
  id: string;
  engagement_id: string;
  pack_id: string;
  evidence_id?: string | null;
  action_type: string;
  output_hash: string;
  tx_digest?: string | null;
  event_type?: string | null;
  event_seq?: string | null;
  signer_wallet: string;
  created_at?: string;
}

export interface DemoEngagementBundle {
  engagement: DemoEngagementRow;
  evidence: DemoEvidenceRow[];
  attestations: DemoAttestationRow[];
  agentActions: DemoAgentActionRow[];
}

export function isDemoStoreConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function createDemoEngagement(input: Partial<DemoEngagementRow> = {}): Promise<DemoEngagementRow> {
  const id = input.id ?? crypto.randomUUID();
  const rows = await supabaseRest<DemoEngagementRow[]>("/demo_engagements", {
    method: "POST",
    query: "on_conflict=id",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ ...input, id }]),
  });

  return rows[0] ?? { ...input, id };
}

export async function updateDemoEngagement(id: string, patch: Partial<DemoEngagementRow>): Promise<DemoEngagementRow> {
  const rows = await supabaseRest<DemoEngagementRow[]>("/demo_engagements", {
    method: "PATCH",
    query: `id=eq.${encodeURIComponent(id)}`,
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });

  return rows[0] ?? { id, ...patch };
}

export async function loadDemoEngagement(id: string): Promise<DemoEngagementBundle> {
  const [engagementRows, evidence, attestations, agentActions] = await Promise.all([
    supabaseRest<DemoEngagementRow[]>("/demo_engagements", {
      query: `id=eq.${encodeURIComponent(id)}&limit=1`,
    }),
    supabaseRest<DemoEvidenceRow[]>("/demo_evidence", {
      query: `engagement_id=eq.${encodeURIComponent(id)}&order=created_at.desc`,
    }),
    supabaseRest<DemoAttestationRow[]>("/demo_attestations", {
      query: `engagement_id=eq.${encodeURIComponent(id)}&order=created_at.desc`,
    }),
    supabaseRest<DemoAgentActionRow[]>("/demo_agent_actions", {
      query: `engagement_id=eq.${encodeURIComponent(id)}&order=created_at.desc`,
    }),
  ]);

  const engagement = engagementRows[0];
  if (!engagement) {
    throw new Error(`Demo engagement ${id} was not found.`);
  }

  return { engagement, evidence, attestations, agentActions };
}

export async function uploadDemoEvidenceFile(input: {
  engagementId: string;
  evidenceRowId: string;
  file: File;
}): Promise<{ bucket: string; path: string }> {
  requireDemoStore();

  const safeName = input.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${input.engagementId}/${input.evidenceRowId}/${safeName}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${DEMO_EVIDENCE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "content-type": input.file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: input.file,
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Supabase evidence file upload failed."));
  }

  return { bucket: DEMO_EVIDENCE_BUCKET, path };
}

export async function downloadDemoEvidenceFile(row: DemoEvidenceRow): Promise<File | undefined> {
  requireDemoStore();

  if (!row.storage_bucket || !row.storage_path) return undefined;

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${row.storage_bucket}/${row.storage_path}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await readError(response, `Failed to download ${row.file_name}.`));
  }

  const blob = await response.blob();
  return new File([blob], row.file_name, {
    type: row.file_mime || blob.type || "application/octet-stream",
  });
}

export async function upsertDemoEvidence(row: DemoEvidenceRow): Promise<DemoEvidenceRow> {
  const rows = await supabaseRest<DemoEvidenceRow[]>("/demo_evidence", {
    method: "POST",
    query: "on_conflict=id",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([row]),
  });

  return rows[0] ?? row;
}

export async function insertDemoAttestation(row: DemoAttestationRow): Promise<void> {
  await supabaseRest("/demo_attestations", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}

export async function insertDemoAgentAction(row: DemoAgentActionRow): Promise<void> {
  await supabaseRest("/demo_agent_actions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}

async function supabaseRest<T = unknown>(
  path: string,
  init: {
    method?: string;
    query?: string;
    headers?: Record<string, string>;
    body?: BodyInit;
  } = {},
): Promise<T> {
  requireDemoStore();

  const query = init.query ? `?${init.query}` : "";
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}${query}`, {
    method: init.method ?? "GET",
    headers: {
      ...authHeaders(),
      "content-type": "application/json",
      ...init.headers,
    },
    body: init.body,
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Supabase demo store request failed."));
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function requireDemoStore() {
  if (!isDemoStoreConfigured()) {
    throw new Error("Supabase demo persistence is not configured.");
  }
}

function authHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY as string,
    authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = await response.text().catch(() => "");
  return body ? `${fallback} HTTP ${response.status}: ${body}` : `${fallback} HTTP ${response.status}.`;
}
