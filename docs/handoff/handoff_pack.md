# Handoff Pack

> Documento unico per onboarding rapido.  
> Copia questo file nella nuova chat.

---

# Handoff Overview

## Stack & Deploy
- **Frontend**: Next.js (React)
- **Backend**: API Routes Next.js
- **DB**: Supabase (Postgres + RLS)
- **Deploy**: Vercel (app) / Supabase (DB)

## Scripts npm
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## Dependencies
```json
{
  "@supabase/ssr": "^0.4.0",
  "@supabase/supabase-js": "^2.45.0",
  "next": "14.2.5",
  "openai": "^4.54.0",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "zod": "^3.23.8",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.4.0",
  "pdf-parse": "^1.1.1",
  "csv-parse": "^5.5.6",
  "autoprefixer": "^10.4.0"
}
```

## DevDependencies
```json
{
  "typescript": "5.5.4",
  "@types/react": "18.3.3",
  "@types/node": "20.14.12"
}
```

## API Routes rilevate
```
app/api/accounts/create/route.ts
app/api/accounts/update-custom/route.ts
app/api/clients/notes-search/route.ts
app/api/clients/search/route.ts
app/api/clients/upsert/route.ts
app/api/contacts/create/route.ts
app/api/conversations/[id]/route.ts
app/api/conversations/create/route.ts
app/api/conversations/list/route.ts
app/api/conversations/new/route.ts
app/api/custom-fields/apply/route.ts
app/api/custom-fields/propose/route.ts
app/api/debug/auth/route.ts
app/api/memory/search/route.ts
app/api/memory/upsert/route.ts
app/api/messages/by-conversation/route.ts
app/api/messages/send/route.ts
app/api/model/route.ts
app/api/products/create/route.ts
app/api/products/import/route.ts
app/api/proposals/[id]/route.ts
app/api/proposals/generate/route.ts
app/api/usage/current-chat/route.ts
app/api/voice/transcribe/route.ts
```

## Env files rilevati
_(nessun file .env trovato)_


---

# Repo Tree

```
.github/
.github/workflows/
.github/workflows/update-handoff.yml
app/
app/admin/
app/admin/login/
app/admin/login/page.tsx
app/admin/page.tsx
app/api/
app/api/accounts/
app/api/accounts/create/
app/api/accounts/create/route.ts
app/api/accounts/update-custom/
app/api/accounts/update-custom/route.ts
app/api/clients/
app/api/clients/notes-search/
app/api/clients/notes-search/route.ts
app/api/clients/search/
app/api/clients/search/route.ts
app/api/clients/upsert/
app/api/clients/upsert/route.ts
app/api/contacts/
app/api/contacts/create/
app/api/contacts/create/route.ts
app/api/conversations/
app/api/conversations/[id]/
app/api/conversations/[id]/route.ts
app/api/conversations/create/
app/api/conversations/create/route.ts
app/api/conversations/list/
app/api/conversations/list/route.ts
app/api/conversations/new/
app/api/conversations/new/route.ts
app/api/custom-fields/
app/api/custom-fields/apply/
app/api/custom-fields/apply/route.ts
app/api/custom-fields/propose/
app/api/custom-fields/propose/route.ts
app/api/debug/
app/api/debug/auth/
app/api/debug/auth/route.ts
app/api/memory/
app/api/memory/search/
app/api/memory/search/route.ts
app/api/memory/upsert/
app/api/memory/upsert/route.ts
app/api/messages/
app/api/messages/by-conversation/
app/api/messages/by-conversation/route.ts
app/api/messages/send/
app/api/messages/send/route.ts
app/api/model/
app/api/model/route.ts
app/api/products/
app/api/products/create/
app/api/products/create/route.ts
app/api/products/import/
app/api/products/import/route.ts
app/api/proposals/
app/api/proposals/[id]/
app/api/proposals/[id]/route.ts
app/api/proposals/generate/
app/api/proposals/generate/route.ts
app/api/usage/
app/api/usage/current-chat/
app/api/usage/current-chat/route.ts
app/api/voice/
app/api/voice/transcribe/
app/api/voice/transcribe/route.ts
app/chat/
app/chat/[id]/
app/chat/[id]/page.tsx
app/handoff/
app/handoff/page.tsx
app/handoff2.0/
app/handoff2.0/page.tsx
app/login/
app/login/page.tsx
app/progetto/
app/progetto/page.tsx
app/progetto/page2.tsx
app/progetto1/
app/progetto1/page.tsx
app/tools/
app/tools/designer/
app/tools/designer/page.tsx
app/tools/proposals/
app/tools/proposals/page.tsx
app/tools/quick-add/
app/tools/quick-add/page.tsx
app/tools/quick-add/QuickAddClient.tsx
app/globals.css
app/layout.tsx
app/page.tsx
components/
components/home/
components/home/Composer.tsx
components/home/Thread.tsx
components/home/TopBar.tsx
components/products/
components/products/ProductImport.tsx
components/products/ProductManager.tsx
components/products/ProductManual.tsx
components/ui/
components/ui/Toast.tsx
components/DBDesigner.tsx
components/Drawers.tsx
components/HomeClient.tsx
components/ProposalGenerator.tsx
components/SaveNoteButton.tsx
hooks/
hooks/useAutoResize.ts
hooks/useConversations.ts
hooks/useTTS.ts
hooks/useVoice.ts
lib/
lib/api/
lib/api/conversations.ts
lib/api/http.ts
lib/api/messages.ts
lib/api/usage.ts
lib/api/voice.ts
lib/supabase/
lib/supabase/admin.ts
lib/supabase/client.ts
lib/supabase/server.ts
lib/voice/
lib/voice/dispatch.ts
lib/voice/intents.ts
lib/embeddings.ts
lib/openai.ts
lib/sessionTitle.ts
lib/types.copilot.ts
scripts/
scripts/update_handoff.mjs
supabase/
supabase/.temp/
supabase/.temp/cli-latest
supabase/migrations/
supabase/migrations/2025-08-23_memory_proposals.sql
types/
types/pdf-parse.d.ts
.gitignore
next-env.d.ts
next.config.mjs
package.json
postcss.config.js
progetto.tsx
tailwind.config.js
tsconfig.json
```


---

# DB Schema (Supabase)

> Schema generato concatenando le **migrations**.

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
```


---

# Handoff Tasks

## TODO / FIXME (scan sorgente)
```
scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
```

## Commits recenti
```
- 610870d 2025-09-12 Create update_handoff.mjs
```

## CHANGELOG (estratto)
_(assente)_

