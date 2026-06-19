-- Shared demo engagement persistence.
-- This is for the web proof-of-concept only. Use synthetic/demo files.

create extension if not exists pgcrypto;

create table if not exists public.demo_engagements (
  id uuid primary key default gen_random_uuid(),
  audit_pack_id text,
  company_wallet text,
  auditor_wallet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_evidence (
  id text primary key,
  engagement_id uuid not null references public.demo_engagements(id) on delete cascade,
  evidence_id text,
  file_name text not null,
  file_mime text,
  file_size bigint,
  storage_bucket text,
  storage_path text,
  document_type text,
  source text,
  description text,
  assertions jsonb not null default '[]'::jsonb,
  commitment text,
  walrus_blob_id text,
  audit_pack_id text,
  registered_by_wallet text,
  status text not null default 'local',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_attestations (
  id text primary key,
  engagement_id uuid not null references public.demo_engagements(id) on delete cascade,
  evidence_id text not null,
  attestation_id text not null,
  tx_digest text,
  reviewer_wallet text not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_agent_actions (
  id text primary key,
  engagement_id uuid not null references public.demo_engagements(id) on delete cascade,
  pack_id text not null,
  evidence_id text,
  action_type text not null,
  output_hash text not null,
  tx_digest text,
  event_type text,
  event_seq text,
  signer_wallet text not null,
  created_at timestamptz not null default now()
);

alter table public.demo_engagements enable row level security;
alter table public.demo_evidence enable row level security;
alter table public.demo_attestations enable row level security;
alter table public.demo_agent_actions enable row level security;

-- PoC policies: anon can read/write synthetic demo engagement data.
-- Replace with authenticated ownership/invite policies before real evidence use.
create policy "demo_engagements_poc_select" on public.demo_engagements for select using (true);
create policy "demo_engagements_poc_insert" on public.demo_engagements for insert with check (true);
create policy "demo_engagements_poc_update" on public.demo_engagements for update using (true);

create policy "demo_evidence_poc_select" on public.demo_evidence for select using (true);
create policy "demo_evidence_poc_insert" on public.demo_evidence for insert with check (true);
create policy "demo_evidence_poc_update" on public.demo_evidence for update using (true);

create policy "demo_attestations_poc_select" on public.demo_attestations for select using (true);
create policy "demo_attestations_poc_insert" on public.demo_attestations for insert with check (true);

create policy "demo_agent_actions_poc_select" on public.demo_agent_actions for select using (true);
create policy "demo_agent_actions_poc_insert" on public.demo_agent_actions for insert with check (true);

insert into storage.buckets (id, name, public)
values ('demo-evidence', 'demo-evidence', false)
on conflict (id) do nothing;

create policy "demo_evidence_files_poc_select"
on storage.objects for select
using (bucket_id = 'demo-evidence');

create policy "demo_evidence_files_poc_insert"
on storage.objects for insert
with check (bucket_id = 'demo-evidence');

create policy "demo_evidence_files_poc_update"
on storage.objects for update
using (bucket_id = 'demo-evidence');
