# DB Schema

```sql
-- 2025-08-23_memory_proposals.sql
-- Migration: Memory Bank + Proposals + Custom Fields Registry
-- Safe to run in Supabase SQL editor (adjust schema/owner as needed).

create extension if not exists vector;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  custom jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  custom jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text,
  title text not null,
  base_price numeric,
  custom jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  body text not null,
  custom jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  payload jsonb not null,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists custom_fields_registry (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('accounts','contacts','products')),
  field_key text not null,
  field_label text not null,
  field_type text not null check (field_type in ('text','number','boolean','date','enum')),
  options jsonb default '[]'::jsonb, -- for enum or helper metadata
  help text,
  created_at timestamptz default now(),
  unique (entity, field_key)
);

create table if not exists notes_embeddings (
  note_id uuid primary key references notes(id) on delete cascade,
  embedding vector(1536)
);
create index if not exists notes_embeddings_cosine_idx
  on notes_embeddings using ivfflat (embedding vector_cosine_ops);

-- RPC to match notes by embedding similarity (cosine distance)
-- Requires: create function privileges for authenticated role.
create or replace function match_notes(query_embedding vector(1536), match_count int, account uuid)
returns table(note_id uuid, similarity float)
language sql stable parallel safe as
$$
  select n.id as note_id,
         1 - (ne.embedding <=> query_embedding) as similarity
  from notes_embeddings ne
  join notes n on n.id = ne.note_id
  where (account is null or n.account_id = account)
  order by ne.embedding <-> query_embedding
  limit coalesce(match_count, 5);
$$;

-- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).


-- 2025-09-16_add_synonyms.sql
-- Synonyms table (exported to keep handoff in sync)
create table if not exists public.synonyms (
  id         uuid primary key default gen_random_uuid(),
  entity     text not null,           -- es: 'products'
  alias      text not null,           -- es: 'cornetto'
  canonical  text not null,           -- es: 'croissant'
  created_at timestamptz default now()
);

-- Lookup veloce per entity+alias
create index if not exists synonyms_entity_alias_idx
  on public.synonyms(entity, alias);
```
