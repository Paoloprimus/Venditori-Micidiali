# Handoff Pack

> Documento unico per onboarding rapido.

---

## Quickstart

**Avvio locale**
```
npm run dev
```

**Variabili importanti**
_(nessuna individuata)_

**Variabili pubbliche**
_(nessuna individuata)_


---

# Handoff Overview

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

## API Routes
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

## Env
_(nessun file .env)_


---

# Routes Manifest

- PAGE app/admin/login/page.tsx
- PAGE app/admin/page.tsx
- API app/api/accounts/create/route.ts — [POST]
- API app/api/accounts/update-custom/route.ts — [POST]
- API app/api/clients/notes-search/route.ts — [GET]
- API app/api/clients/search/route.ts — [GET]
- API app/api/clients/upsert/route.ts — [POST]
- API app/api/contacts/create/route.ts — [POST]
- API app/api/conversations/[id]/route.ts — [PATCH, DELETE]
- API app/api/conversations/create/route.ts — [POST]
- API app/api/conversations/list/route.ts — [GET]
- API app/api/conversations/new/route.ts — [POST]
- API app/api/custom-fields/apply/route.ts — [POST]
- API app/api/custom-fields/propose/route.ts — [POST]
- API app/api/debug/auth/route.ts — [GET]
- API app/api/memory/search/route.ts — [POST]
- API app/api/memory/upsert/route.ts — [POST]
- API app/api/messages/by-conversation/route.ts — [GET]
- API app/api/messages/send/route.ts — [POST, GET]
- API app/api/model/route.ts
- API app/api/products/create/route.ts — [POST]
- API app/api/products/import/route.ts — [POST]
- API app/api/proposals/[id]/route.ts — [GET, PATCH]
- API app/api/proposals/generate/route.ts — [POST]
- API app/api/usage/current-chat/route.ts — [GET]
- API app/api/voice/transcribe/route.ts — [POST, GET]
- PAGE app/chat/[id]/page.tsx
- PAGE app/handoff/page.tsx
- PAGE app/handoff2.0/page.tsx
- PAGE app/login/page.tsx
- PAGE app/page.tsx
- PAGE app/progetto/page.tsx
- PAGE app/progetto1/page.tsx
- PAGE app/tools/designer/page.tsx
- PAGE app/tools/proposals/page.tsx
- PAGE app/tools/quick-add/page.tsx

---

# Repo Tree

```
.github/
.github/workflows/
.github/workflows/update-handoff.yml
.github/handoff_counter.txt
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
docs/
docs/handoff/
docs/handoff/db_schema.md
docs/handoff/handoff_overview.md
docs/handoff/handoff_pack.md
docs/handoff/handoff_tasks.md
docs/handoff/repo_tree.md
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
```


---

# Handoff Tasks

## TODO/FIXME
```
docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
scripts/update_handoff.mjs:245: ## TODO/FIXME
supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
- Implementare **RLS (Row-Level Security)** su tutte le tabelle:
  - `accounts`, `contacts`, `products`, `proposals`, `notes`, `custom_fields_registry`, ecc.
  - Distinguere almeno due ruoli: **admin** e **venditore**.
  - Policy: i venditori vedono solo i propri dati; admin vede tutto.
- Configurare **autenticazione Supabase** con gestione ruoli.
- Definire chiaramente flusso di **registrazione / login**.
- Completare gestione **environment variables** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, ecc.).
- Documentare le **pagine Next.js** con breve descrizione del loro scopo (es. `app/chat/[id]` = sessione di chat vocale con cliente).
- Documentare il **flusso AI**: 
  - trascrizione voce → salvataggio in DB → chiamata modello → risposta TTS.
  - memoria (embeddings + upsert) → recupero in chat.
```

## Roadmap a breve termine
1. **Sicurezza & Accessi**
   - Attivare RLS in Supabase con policies.
   - Validare login/ruolo nel frontend (redirect se non autenticato).
2. **User Flows**
   - Scrivere doc breve con mapping “pagina → funzione”.
   - Collegare ogni API route al relativo uso (es. `/api/voice/transcribe` ↔ chat vocale).
3. **Ambiente**
   - Sistemare file `.env.example` con tutte le variabili richieste.
   - Aggiungere note su come configurare deploy su Vercel (env + secrets).

## Commits recenti
```
- 2ec1dcf 2025-09-13 chore(handoff): step 4/10 [skip ci]
```

## CHANGELOG
_(assente)_

