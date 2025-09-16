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
