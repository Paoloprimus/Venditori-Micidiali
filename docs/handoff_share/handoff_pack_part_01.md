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
app/api/standard/execute/route.ts
app/api/standard/normalize/route.ts
app/api/standard/shortlist/route.ts
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
- API app/api/standard/execute/route.ts — [POST]
- API app/api/standard/normalize/route.ts — [POST]
- API app/api/standard/shortlist/route.ts — [POST]
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
.github/workflows/db-sync.yml
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
app/api/standard/
app/api/standard/execute/
app/api/standard/execute/route.ts
app/api/standard/normalize/
app/api/standard/normalize/route.ts
app/api/standard/shortlist/
app/api/standard/shortlist/route.ts
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
docs/handoff/handoff_summary.md
docs/handoff/handoff_tasks.md
docs/handoff/repo_tree.md
docs/handoff/routes_manifest.md
docs/handoff_share/
docs/handoff_share/handoff_index.md
docs/handoff_share/handoff_pack_part_01.md
docs/handoff_share/handoff_prompt_starter.txt
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
lib/config.ts
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
supabase/schema.sql
types/
types/pdf-parse.d.ts
.gitignore
next-env.d.ts
next.config.mjs
package.json
postcss.config.js
progetto.tsx
README_CODER_CHANGE.md
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

## TODO / FIXME
```
README_CODER_CHANGE.md:87: TODO/FIXME trovati nel codice,
docs/handoff/db_schema.md:89: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:403: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:411: ## TODO / FIXME
docs/handoff/handoff_pack.md:413: README_CODER_CHANGE.md:87: TODO/FIXME trovati nel codice,
docs/handoff/handoff_pack.md:414: docs/handoff/db_schema.md:89: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:415: docs/handoff/handoff_pack.md:399: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:416: docs/handoff/handoff_pack.md:407: ## TODO / FIXME
docs/handoff/handoff_pack.md:417: docs/handoff/handoff_pack.md:409: README_CODER_CHANGE.md:87: TODO/FIXME trovati nel codice,
docs/handoff/handoff_pack.md:418: docs/handoff/handoff_pack.md:410: docs/handoff/db_schema.md:89: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:419: docs/handoff/handoff_pack.md:411: docs/handoff/handoff_pack.md:382: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:420: docs/handoff/handoff_pack.md:412: docs/handoff/handoff_pack.md:390: ## TODO/FIXME
docs/handoff/handoff_pack.md:421: docs/handoff/handoff_pack.md:413: docs/handoff/handoff_pack.md:392: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:422: docs/handoff/handoff_pack.md:414: docs/handoff/handoff_pack.md:393: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:423: docs/handoff/handoff_pack.md:415: docs/handoff/handoff_pack.md:394: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:424: docs/handoff/handoff_pack.md:416: docs/handoff/handoff_pack.md:395: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:425: docs/handoff/handoff_pack.md:417: docs/handoff/handoff_pack.md:396: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:426: docs/handoff/handoff_pack.md:418: docs/handoff/handoff_pack.md:397: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:427: docs/handoff/handoff_pack.md:419: docs/handoff/handoff_pack.md:398: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:428: docs/handoff/handoff_pack.md:420: docs/handoff/handoff_pack.md:399: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:429: docs/handoff/handoff_pack.md:421: docs/handoff/handoff_pack.md:400: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:430: docs/handoff/handoff_pack.md:422: docs/handoff/handoff_pack.md:401: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:431: docs/handoff/handoff_pack.md:423: docs/handoff/handoff_pack.md:402: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:432: docs/handoff/handoff_pack.md:424: docs/handoff/handoff_pack.md:403: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:433: docs/handoff/handoff_pack.md:425: docs/handoff/handoff_pack.md:404: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:434: docs/handoff/handoff_pack.md:426: docs/handoff/handoff_pack.md:405: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:435: docs/handoff/handoff_pack.md:427: docs/handoff/handoff_pack.md:406: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:436: docs/handoff/handoff_pack.md:428: docs/handoff/handoff_pack.md:407: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:437: docs/handoff/handoff_pack.md:429: docs/handoff/handoff_pack.md:408: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:438: docs/handoff/handoff_pack.md:430: docs/handoff/handoff_pack.md:409: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:439: docs/handoff/handoff_pack.md:431: docs/handoff/handoff_pack.md:410: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:440: docs/handoff/handoff_pack.md:432: docs/handoff/handoff_pack.md:411: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:441: docs/handoff/handoff_pack.md:433: docs/handoff/handoff_pack.md:412: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:442: docs/handoff/handoff_pack.md:434: docs/handoff/handoff_pack.md:413: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:443: docs/handoff/handoff_pack.md:435: docs/handoff/handoff_pack.md:414: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:444: docs/handoff/handoff_pack.md:436: docs/handoff/handoff_pack.md:415: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:445: docs/handoff/handoff_pack.md:437: docs/handoff/handoff_pack.md:416: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:446: docs/handoff/handoff_pack.md:438: docs/handoff/handoff_pack.md:417: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:447: docs/handoff/handoff_pack.md:439: docs/handoff/handoff_pack.md:418: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:448: docs/handoff/handoff_pack.md:440: docs/handoff/handoff_pack.md:419: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:449: docs/handoff/handoff_pack.md:441: docs/handoff/handoff_pack.md:420: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:450: docs/handoff/handoff_pack.md:442: docs/handoff/handoff_pack.md:421: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:451: docs/handoff/handoff_pack.md:443: docs/handoff/handoff_pack.md:422: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:452: docs/handoff/handoff_pack.md:444: docs/handoff/handoff_pack.md:423: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:453: docs/handoff/handoff_pack.md:445: docs/handoff/handoff_pack.md:424: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:454: docs/handoff/handoff_pack.md:446: docs/handoff/handoff_pack.md:425: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:455: docs/handoff/handoff_pack.md:447: docs/handoff/handoff_pack.md:426: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:456: docs/handoff/handoff_pack.md:448: docs/handoff/handoff_pack.md:427: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:457: docs/handoff/handoff_pack.md:449: docs/handoff/handoff_pack.md:428: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:458: docs/handoff/handoff_pack.md:450: docs/handoff/handoff_pack.md:429: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:459: docs/handoff/handoff_pack.md:451: docs/handoff/handoff_pack.md:430: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:460: docs/handoff/handoff_pack.md:452: docs/handoff/handoff_tasks.md:3: ## TODO/FIXME
docs/handoff/handoff_pack.md:461: docs/handoff/handoff_pack.md:453: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:462: docs/handoff/handoff_pack.md:454: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:463: docs/handoff/handoff_pack.md:455: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:464: docs/handoff/handoff_pack.md:456: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:465: docs/handoff/handoff_pack.md:457: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:466: docs/handoff/handoff_pack.md:458: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:467: docs/handoff/handoff_pack.md:459: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:468: docs/handoff/handoff_pack.md:460: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:469: docs/handoff/handoff_pack.md:461: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:470: docs/handoff/handoff_pack.md:462: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:471: docs/handoff/handoff_pack.md:463: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:472: docs/handoff/handoff_pack.md:464: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:473: docs/handoff/handoff_pack.md:465: docs/handoff/handoff_tasks.md:17: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:474: docs/handoff/handoff_pack.md:466: docs/handoff/handoff_tasks.md:18: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:475: docs/handoff/handoff_pack.md:467: docs/handoff/handoff_tasks.md:19: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:476: docs/handoff/handoff_pack.md:468: docs/handoff/handoff_tasks.md:20: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:477: docs/handoff/handoff_pack.md:469: docs/handoff/handoff_tasks.md:21: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:478: docs/handoff/handoff_pack.md:470: docs/handoff/handoff_tasks.md:22: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:479: docs/handoff/handoff_pack.md:471: docs/handoff/handoff_tasks.md:23: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:480: docs/handoff/handoff_pack.md:472: docs/handoff/handoff_tasks.md:24: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:481: docs/handoff/handoff_pack.md:473: docs/handoff/handoff_tasks.md:25: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:482: docs/handoff/handoff_pack.md:474: docs/handoff/handoff_tasks.md:26: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:483: docs/handoff/handoff_pack.md:475: docs/handoff/handoff_tasks.md:27: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:484: docs/handoff/handoff_pack.md:476: docs/handoff/handoff_tasks.md:28: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:485: docs/handoff/handoff_pack.md:477: docs/handoff/handoff_tasks.md:29: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:486: docs/handoff/handoff_pack.md:478: docs/handoff/handoff_tasks.md:30: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:487: docs/handoff/handoff_pack.md:479: docs/handoff/handoff_tasks.md:31: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:488: docs/handoff/handoff_pack.md:480: docs/handoff/handoff_tasks.md:32: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:489: docs/handoff/handoff_pack.md:481: docs/handoff/handoff_tasks.md:33: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:490: docs/handoff/handoff_pack.md:482: docs/handoff/handoff_tasks.md:34: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:491: docs/handoff/handoff_pack.md:483: docs/handoff/handoff_tasks.md:35: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:492: docs/handoff/handoff_pack.md:484: docs/handoff/handoff_tasks.md:36: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:493: docs/handoff/handoff_pack.md:485: docs/handoff/handoff_tasks.md:37: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:494: docs/handoff/handoff_pack.md:486: docs/handoff/handoff_tasks.md:38: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:495: docs/handoff/handoff_pack.md:487: docs/handoff/handoff_tasks.md:39: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:496: docs/handoff/handoff_pack.md:488: docs/handoff/handoff_tasks.md:40: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:497: docs/handoff/handoff_pack.md:489: docs/handoff/handoff_tasks.md:41: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:498: docs/handoff/handoff_pack.md:490: docs/handoff/handoff_tasks.md:42: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:499: docs/handoff/handoff_pack.md:491: docs/handoff/handoff_tasks.md:43: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:500: docs/handoff/handoff_pack.md:492: docs/handoff_share/handoff_pack_part_01.md:382: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:501: docs/handoff/handoff_pack.md:493: docs/handoff_share/handoff_pack_part_01.md:390: ## TODO/FIXME
docs/handoff/handoff_pack.md:502: docs/handoff/handoff_pack.md:494: docs/handoff_share/handoff_pack_part_01.md:392: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:503: docs/handoff/handoff_pack.md:495: docs/handoff_share/handoff_pack_part_01.md:393: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:504: docs/handoff/handoff_pack.md:496: docs/handoff_share/handoff_pack_part_01.md:394: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:505: docs/handoff/handoff_pack.md:497: docs/handoff_share/handoff_pack_part_01.md:395: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:506: docs/handoff/handoff_pack.md:498: docs/handoff_share/handoff_pack_part_01.md:396: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:507: docs/handoff/handoff_pack.md:499: docs/handoff_share/handoff_pack_part_01.md:397: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:508: docs/handoff/handoff_pack.md:500: docs/handoff_share/handoff_pack_part_01.md:398: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:509: docs/handoff/handoff_pack.md:501: docs/handoff_share/handoff_pack_part_01.md:399: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:510: docs/handoff/handoff_pack.md:502: docs/handoff_share/handoff_pack_part_01.md:400: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:511: docs/handoff/handoff_pack.md:503: docs/handoff_share/handoff_pack_part_01.md:401: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:512: docs/handoff/handoff_pack.md:504: docs/handoff_share/handoff_pack_part_01.md:402: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:513: docs/handoff/handoff_pack.md:505: docs/handoff_share/handoff_pack_part_01.md:403: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:514: docs/handoff/handoff_pack.md:506: docs/handoff_share/handoff_pack_part_01.md:404: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:515: docs/handoff/handoff_pack.md:507: docs/handoff_share/handoff_pack_part_01.md:405: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:516: docs/handoff/handoff_pack.md:508: docs/handoff_share/handoff_pack_part_01.md:406: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:517: docs/handoff/handoff_pack.md:509: docs/handoff_share/handoff_pack_part_01.md:407: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:518: docs/handoff/handoff_pack.md:510: docs/handoff_share/handoff_pack_part_01.md:408: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:519: docs/handoff/handoff_pack.md:511: docs/handoff_share/handoff_pack_part_01.md:409: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:520: docs/handoff/handoff_pack.md:512: docs/handoff_share/handoff_pack_part_01.md:410: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:521: docs/handoff/handoff_pack.md:513: docs/handoff_share/handoff_pack_part_01.md:411: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:522: docs/handoff/handoff_pack.md:514: docs/handoff_share/handoff_pack_part_01.md:412: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:523: docs/handoff/handoff_pack.md:515: docs/handoff_share/handoff_pack_part_01.md:413: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:524: docs/handoff/handoff_pack.md:516: docs/handoff_share/handoff_pack_part_01.md:414: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:525: docs/handoff/handoff_pack.md:517: docs/handoff_share/handoff_pack_part_01.md:415: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:526: docs/handoff/handoff_pack.md:518: docs/handoff_share/handoff_pack_part_01.md:416: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:527: docs/handoff/handoff_pack.md:519: docs/handoff_share/handoff_pack_part_01.md:417: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:528: docs/handoff/handoff_pack.md:520: docs/handoff_share/handoff_pack_part_01.md:418: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:529: docs/handoff/handoff_pack.md:521: docs/handoff_share/handoff_pack_part_01.md:419: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:530: docs/handoff/handoff_pack.md:522: docs/handoff_share/handoff_pack_part_01.md:420: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:531: docs/handoff/handoff_pack.md:523: docs/handoff_share/handoff_pack_part_01.md:421: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:532: docs/handoff/handoff_pack.md:524: docs/handoff_share/handoff_pack_part_01.md:422: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:533: docs/handoff/handoff_pack.md:525: docs/handoff_share/handoff_pack_part_01.md:423: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:534: docs/handoff/handoff_pack.md:526: docs/handoff_share/handoff_pack_part_01.md:424: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:535: docs/handoff/handoff_pack.md:527: docs/handoff_share/handoff_pack_part_01.md:425: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:536: docs/handoff/handoff_pack.md:528: docs/handoff_share/handoff_pack_part_01.md:426: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:537: docs/handoff/handoff_pack.md:529: docs/handoff_share/handoff_pack_part_01.md:427: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:538: docs/handoff/handoff_pack.md:530: docs/handoff_share/handoff_pack_part_01.md:428: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:539: docs/handoff/handoff_pack.md:531: docs/handoff_share/handoff_pack_part_01.md:429: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:540: docs/handoff/handoff_pack.md:532: docs/handoff_share/handoff_pack_part_01.md:430: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:541: docs/handoff/handoff_pack.md:533: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:542: docs/handoff/handoff_pack.md:534: scripts/update_handoff.mjs:261: ## TODO / FIXME
docs/handoff/handoff_pack.md:543: docs/handoff/handoff_pack.md:535: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:544: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME
docs/handoff/handoff_pack.md:545: docs/handoff/handoff_tasks.md:5: README_CODER_CHANGE.md:87: TODO/FIXME trovati nel codice,
docs/handoff/handoff_pack.md:546: docs/handoff/handoff_tasks.md:6: docs/handoff/db_schema.md:89: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:547: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:382: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:548: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:390: ## TODO/FIXME
docs/handoff/handoff_pack.md:549: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:392: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:550: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:393: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:551: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:394: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:552: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_pack.md:395: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:553: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_pack.md:396: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:554: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_pack.md:397: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:555: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_pack.md:398: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:556: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_pack.md:399: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:557: docs/handoff/handoff_tasks.md:17: docs/handoff/handoff_pack.md:400: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:558: docs/handoff/handoff_tasks.md:18: docs/handoff/handoff_pack.md:401: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:559: docs/handoff/handoff_tasks.md:19: docs/handoff/handoff_pack.md:402: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:560: docs/handoff/handoff_tasks.md:20: docs/handoff/handoff_pack.md:403: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:561: docs/handoff/handoff_tasks.md:21: docs/handoff/handoff_pack.md:404: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:562: docs/handoff/handoff_tasks.md:22: docs/handoff/handoff_pack.md:405: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:563: docs/handoff/handoff_tasks.md:23: docs/handoff/handoff_pack.md:406: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:564: docs/handoff/handoff_tasks.md:24: docs/handoff/handoff_pack.md:407: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:565: docs/handoff/handoff_tasks.md:25: docs/handoff/handoff_pack.md:408: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:566: docs/handoff/handoff_tasks.md:26: docs/handoff/handoff_pack.md:409: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:567: docs/handoff/handoff_tasks.md:27: docs/handoff/handoff_pack.md:410: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:568: docs/handoff/handoff_tasks.md:28: docs/handoff/handoff_pack.md:411: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:569: docs/handoff/handoff_tasks.md:29: docs/handoff/handoff_pack.md:412: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:570: docs/handoff/handoff_tasks.md:30: docs/handoff/handoff_pack.md:413: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:571: docs/handoff/handoff_tasks.md:31: docs/handoff/handoff_pack.md:414: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:572: docs/handoff/handoff_tasks.md:32: docs/handoff/handoff_pack.md:415: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:573: docs/handoff/handoff_tasks.md:33: docs/handoff/handoff_pack.md:416: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:574: docs/handoff/handoff_tasks.md:34: docs/handoff/handoff_pack.md:417: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:575: docs/handoff/handoff_tasks.md:35: docs/handoff/handoff_pack.md:418: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:576: docs/handoff/handoff_tasks.md:36: docs/handoff/handoff_pack.md:419: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:577: docs/handoff/handoff_tasks.md:37: docs/handoff/handoff_pack.md:420: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:578: docs/handoff/handoff_tasks.md:38: docs/handoff/handoff_pack.md:421: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:579: docs/handoff/handoff_tasks.md:39: docs/handoff/handoff_pack.md:422: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:580: docs/handoff/handoff_tasks.md:40: docs/handoff/handoff_pack.md:423: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:581: docs/handoff/handoff_tasks.md:41: docs/handoff/handoff_pack.md:424: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:582: docs/handoff/handoff_tasks.md:42: docs/handoff/handoff_pack.md:425: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:583: docs/handoff/handoff_tasks.md:43: docs/handoff/handoff_pack.md:426: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:584: docs/handoff/handoff_tasks.md:44: docs/handoff/handoff_pack.md:427: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:585: docs/handoff/handoff_tasks.md:45: docs/handoff/handoff_pack.md:428: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:586: docs/handoff/handoff_tasks.md:46: docs/handoff/handoff_pack.md:429: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:587: docs/handoff/handoff_tasks.md:47: docs/handoff/handoff_pack.md:430: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:588: docs/handoff/handoff_tasks.md:48: docs/handoff/handoff_tasks.md:3: ## TODO/FIXME
docs/handoff/handoff_pack.md:589: docs/handoff/handoff_tasks.md:49: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:590: docs/handoff/handoff_tasks.md:50: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:591: docs/handoff/handoff_tasks.md:51: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:592: docs/handoff/handoff_tasks.md:52: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:593: docs/handoff/handoff_tasks.md:53: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:594: docs/handoff/handoff_tasks.md:54: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:595: docs/handoff/handoff_tasks.md:55: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:596: docs/handoff/handoff_tasks.md:56: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:597: docs/handoff/handoff_tasks.md:57: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:598: docs/handoff/handoff_tasks.md:58: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:599: docs/handoff/handoff_tasks.md:59: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:600: docs/handoff/handoff_tasks.md:60: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:601: docs/handoff/handoff_tasks.md:61: docs/handoff/handoff_tasks.md:17: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:602: docs/handoff/handoff_tasks.md:62: docs/handoff/handoff_tasks.md:18: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:603: docs/handoff/handoff_tasks.md:63: docs/handoff/handoff_tasks.md:19: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:604: docs/handoff/handoff_tasks.md:64: docs/handoff/handoff_tasks.md:20: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:605: docs/handoff/handoff_tasks.md:65: docs/handoff/handoff_tasks.md:21: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:606: docs/handoff/handoff_tasks.md:66: docs/handoff/handoff_tasks.md:22: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:607: docs/handoff/handoff_tasks.md:67: docs/handoff/handoff_tasks.md:23: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:608: docs/handoff/handoff_tasks.md:68: docs/handoff/handoff_tasks.md:24: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:609: docs/handoff/handoff_tasks.md:69: docs/handoff/handoff_tasks.md:25: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:610: docs/handoff/handoff_tasks.md:70: docs/handoff/handoff_tasks.md:26: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:611: docs/handoff/handoff_tasks.md:71: docs/handoff/handoff_tasks.md:27: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:612: docs/handoff/handoff_tasks.md:72: docs/handoff/handoff_tasks.md:28: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:613: docs/handoff/handoff_tasks.md:73: docs/handoff/handoff_tasks.md:29: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:614: docs/handoff/handoff_tasks.md:74: docs/handoff/handoff_tasks.md:30: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:615: docs/handoff/handoff_tasks.md:75: docs/handoff/handoff_tasks.md:31: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:616: docs/handoff/handoff_tasks.md:76: docs/handoff/handoff_tasks.md:32: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:617: docs/handoff/handoff_tasks.md:77: docs/handoff/handoff_tasks.md:33: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:618: docs/handoff/handoff_tasks.md:78: docs/handoff/handoff_tasks.md:34: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:619: docs/handoff/handoff_tasks.md:79: docs/handoff/handoff_tasks.md:35: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:620: docs/handoff/handoff_tasks.md:80: docs/handoff/handoff_tasks.md:36: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:621: docs/handoff/handoff_tasks.md:81: docs/handoff/handoff_tasks.md:37: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:622: docs/handoff/handoff_tasks.md:82: docs/handoff/handoff_tasks.md:38: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:623: docs/handoff/handoff_tasks.md:83: docs/handoff/handoff_tasks.md:39: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:624: docs/handoff/handoff_tasks.md:84: docs/handoff/handoff_tasks.md:40: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:625: docs/handoff/handoff_tasks.md:85: docs/handoff/handoff_tasks.md:41: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:626: docs/handoff/handoff_tasks.md:86: docs/handoff/handoff_tasks.md:42: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:627: docs/handoff/handoff_tasks.md:87: docs/handoff/handoff_tasks.md:43: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:628: docs/handoff/handoff_tasks.md:88: docs/handoff_share/handoff_pack_part_01.md:382: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:629: docs/handoff/handoff_tasks.md:89: docs/handoff_share/handoff_pack_part_01.md:390: ## TODO/FIXME
docs/handoff/handoff_pack.md:630: docs/handoff/handoff_tasks.md:90: docs/handoff_share/handoff_pack_part_01.md:392: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:631: docs/handoff/handoff_tasks.md:91: docs/handoff_share/handoff_pack_part_01.md:393: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:632: docs/handoff/handoff_tasks.md:92: docs/handoff_share/handoff_pack_part_01.md:394: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:633: docs/handoff/handoff_tasks.md:93: docs/handoff_share/handoff_pack_part_01.md:395: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:634: docs/handoff/handoff_tasks.md:94: docs/handoff_share/handoff_pack_part_01.md:396: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:635: docs/handoff/handoff_tasks.md:95: docs/handoff_share/handoff_pack_part_01.md:397: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:636: docs/handoff/handoff_tasks.md:96: docs/handoff_share/handoff_pack_part_01.md:398: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:637: docs/handoff/handoff_tasks.md:97: docs/handoff_share/handoff_pack_part_01.md:399: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:638: docs/handoff/handoff_tasks.md:98: docs/handoff_share/handoff_pack_part_01.md:400: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:639: docs/handoff/handoff_tasks.md:99: docs/handoff_share/handoff_pack_part_01.md:401: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:640: docs/handoff/handoff_tasks.md:100: docs/handoff_share/handoff_pack_part_01.md:402: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:641: docs/handoff/handoff_tasks.md:101: docs/handoff_share/handoff_pack_part_01.md:403: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:642: docs/handoff/handoff_tasks.md:102: docs/handoff_share/handoff_pack_part_01.md:404: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:643: docs/handoff/handoff_tasks.md:103: docs/handoff_share/handoff_pack_part_01.md:405: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:644: docs/handoff/handoff_tasks.md:104: docs/handoff_share/handoff_pack_part_01.md:406: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:645: docs/handoff/handoff_tasks.md:105: docs/handoff_share/handoff_pack_part_01.md:407: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:646: docs/handoff/handoff_tasks.md:106: docs/handoff_share/handoff_pack_part_01.md:408: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:647: docs/handoff/handoff_tasks.md:107: docs/handoff_share/handoff_pack_part_01.md:409: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:648: docs/handoff/handoff_tasks.md:108: docs/handoff_share/handoff_pack_part_01.md:410: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:649: docs/handoff/handoff_tasks.md:109: docs/handoff_share/handoff_pack_part_01.md:411: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:650: docs/handoff/handoff_tasks.md:110: docs/handoff_share/handoff_pack_part_01.md:412: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:651: docs/handoff/handoff_tasks.md:111: docs/handoff_share/handoff_pack_part_01.md:413: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:652: docs/handoff/handoff_tasks.md:112: docs/handoff_share/handoff_pack_part_01.md:414: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:653: docs/handoff/handoff_tasks.md:113: docs/handoff_share/handoff_pack_part_01.md:415: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:654: docs/handoff/handoff_tasks.md:114: docs/handoff_share/handoff_pack_part_01.md:416: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:655: docs/handoff/handoff_tasks.md:115: docs/handoff_share/handoff_pack_part_01.md:417: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:656: docs/handoff/handoff_tasks.md:116: docs/handoff_share/handoff_pack_part_01.md:418: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:657: docs/handoff/handoff_tasks.md:117: docs/handoff_share/handoff_pack_part_01.md:419: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:658: docs/handoff/handoff_tasks.md:118: docs/handoff_share/handoff_pack_part_01.md:420: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:659: docs/handoff/handoff_tasks.md:119: docs/handoff_share/handoff_pack_part_01.md:421: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:660: docs/handoff/handoff_tasks.md:120: docs/handoff_share/handoff_pack_part_01.md:422: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:661: docs/handoff/handoff_tasks.md:121: docs/handoff_share/handoff_pack_part_01.md:423: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:662: docs/handoff/handoff_tasks.md:122: docs/handoff_share/handoff_pack_part_01.md:424: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:663: docs/handoff/handoff_tasks.md:123: docs/handoff_share/handoff_pack_part_01.md:425: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:664: docs/handoff/handoff_tasks.md:124: docs/handoff_share/handoff_pack_part_01.md:426: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:665: docs/handoff/handoff_tasks.md:125: docs/handoff_share/handoff_pack_part_01.md:427: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:666: docs/handoff/handoff_tasks.md:126: docs/handoff_share/handoff_pack_part_01.md:428: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:667: docs/handoff/handoff_tasks.md:127: docs/handoff_share/handoff_pack_part_01.md:429: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:668: docs/handoff/handoff_tasks.md:128: docs/handoff_share/handoff_pack_part_01.md:430: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:669: docs/handoff/handoff_tasks.md:129: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:670: docs/handoff/handoff_tasks.md:130: scripts/update_handoff.mjs:261: ## TODO / FIXME
docs/handoff/handoff_pack.md:671: docs/handoff/handoff_tasks.md:131: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:672: docs/handoff_share/handoff_pack_part_01.md:399: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:673: docs/handoff_share/handoff_pack_part_01.md:407: ## TODO / FIXME
docs/handoff/handoff_pack.md:674: docs/handoff_share/handoff_pack_part_01.md:409: README_CODER_CHANGE.md:87: TODO/FIXME trovati nel codice,
docs/handoff/handoff_pack.md:675: docs/handoff_share/handoff_pack_part_01.md:410: docs/handoff/db_schema.md:89: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:676: docs/handoff_share/handoff_pack_part_01.md:411: docs/handoff/handoff_pack.md:382: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:677: docs/handoff_share/handoff_pack_part_01.md:412: docs/handoff/handoff_pack.md:390: ## TODO/FIXME
docs/handoff/handoff_pack.md:678: docs/handoff_share/handoff_pack_part_01.md:413: docs/handoff/handoff_pack.md:392: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:679: docs/handoff_share/handoff_pack_part_01.md:414: docs/handoff/handoff_pack.md:393: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:680: docs/handoff_share/handoff_pack_part_01.md:415: docs/handoff/handoff_pack.md:394: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:681: docs/handoff_share/handoff_pack_part_01.md:416: docs/handoff/handoff_pack.md:395: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:682: docs/handoff_share/handoff_pack_part_01.md:417: docs/handoff/handoff_pack.md:396: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:683: docs/handoff_share/handoff_pack_part_01.md:418: docs/handoff/handoff_pack.md:397: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:684: docs/handoff_share/handoff_pack_part_01.md:419: docs/handoff/handoff_pack.md:398: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:685: docs/handoff_share/handoff_pack_part_01.md:420: docs/handoff/handoff_pack.md:399: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:686: docs/handoff_share/handoff_pack_part_01.md:421: docs/handoff/handoff_pack.md:400: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:687: docs/handoff_share/handoff_pack_part_01.md:422: docs/handoff/handoff_pack.md:401: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:688: docs/handoff_share/handoff_pack_part_01.md:423: docs/handoff/handoff_pack.md:402: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:689: docs/handoff_share/handoff_pack_part_01.md:424: docs/handoff/handoff_pack.md:403: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:690: docs/handoff_share/handoff_pack_part_01.md:425: docs/handoff/handoff_pack.md:404: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:691: docs/handoff_share/handoff_pack_part_01.md:426: docs/handoff/handoff_pack.md:405: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:692: docs/handoff_share/handoff_pack_part_01.md:427: docs/handoff/handoff_pack.md:406: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:693: docs/handoff_share/handoff_pack_part_01.md:428: docs/handoff/handoff_pack.md:407: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:694: docs/handoff_share/handoff_pack_part_01.md:429: docs/handoff/handoff_pack.md:408: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:695: docs/handoff_share/handoff_pack_part_01.md:430: docs/handoff/handoff_pack.md:409: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:696: docs/handoff_share/handoff_pack_part_01.md:431: docs/handoff/handoff_pack.md:410: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:697: docs/handoff_share/handoff_pack_part_01.md:432: docs/handoff/handoff_pack.md:411: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:698: docs/handoff_share/handoff_pack_part_01.md:433: docs/handoff/handoff_pack.md:412: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:699: docs/handoff_share/handoff_pack_part_01.md:434: docs/handoff/handoff_pack.md:413: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:700: docs/handoff_share/handoff_pack_part_01.md:435: docs/handoff/handoff_pack.md:414: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:701: docs/handoff_share/handoff_pack_part_01.md:436: docs/handoff/handoff_pack.md:415: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:702: docs/handoff_share/handoff_pack_part_01.md:437: docs/handoff/handoff_pack.md:416: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:703: docs/handoff_share/handoff_pack_part_01.md:438: docs/handoff/handoff_pack.md:417: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:704: docs/handoff_share/handoff_pack_part_01.md:439: docs/handoff/handoff_pack.md:418: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:705: docs/handoff_share/handoff_pack_part_01.md:440: docs/handoff/handoff_pack.md:419: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:706: docs/handoff_share/handoff_pack_part_01.md:441: docs/handoff/handoff_pack.md:420: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:707: docs/handoff_share/handoff_pack_part_01.md:442: docs/handoff/handoff_pack.md:421: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:708: docs/handoff_share/handoff_pack_part_01.md:443: docs/handoff/handoff_pack.md:422: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:709: docs/handoff_share/handoff_pack_part_01.md:444: docs/handoff/handoff_pack.md:423: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:710: docs/handoff_share/handoff_pack_part_01.md:445: docs/handoff/handoff_pack.md:424: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:711: docs/handoff_share/handoff_pack_part_01.md:446: docs/handoff/handoff_pack.md:425: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:712: docs/handoff_share/handoff_pack_part_01.md:447: docs/handoff/handoff_pack.md:426: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:713: docs/handoff_share/handoff_pack_part_01.md:448: docs/handoff/handoff_pack.md:427: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:714: docs/handoff_share/handoff_pack_part_01.md:449: docs/handoff/handoff_pack.md:428: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:715: docs/handoff_share/handoff_pack_part_01.md:450: docs/handoff/handoff_pack.md:429: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:716: docs/handoff_share/handoff_pack_part_01.md:451: docs/handoff/handoff_pack.md:430: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:717: docs/handoff_share/handoff_pack_part_01.md:452: docs/handoff/handoff_tasks.md:3: ## TODO/FIXME
docs/handoff/handoff_pack.md:718: docs/handoff_share/handoff_pack_part_01.md:453: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:719: docs/handoff_share/handoff_pack_part_01.md:454: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:720: docs/handoff_share/handoff_pack_part_01.md:455: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:721: docs/handoff_share/handoff_pack_part_01.md:456: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:722: docs/handoff_share/handoff_pack_part_01.md:457: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:723: docs/handoff_share/handoff_pack_part_01.md:458: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:724: docs/handoff_share/handoff_pack_part_01.md:459: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:725: docs/handoff_share/handoff_pack_part_01.md:460: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:726: docs/handoff_share/handoff_pack_part_01.md:461: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:727: docs/handoff_share/handoff_pack_part_01.md:462: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:728: docs/handoff_share/handoff_pack_part_01.md:463: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:729: docs/handoff_share/handoff_pack_part_01.md:464: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:730: docs/handoff_share/handoff_pack_part_01.md:465: docs/handoff/handoff_tasks.md:17: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:731: docs/handoff_share/handoff_pack_part_01.md:466: docs/handoff/handoff_tasks.md:18: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:732: docs/handoff_share/handoff_pack_part_01.md:467: docs/handoff/handoff_tasks.md:19: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:733: docs/handoff_share/handoff_pack_part_01.md:468: docs/handoff/handoff_tasks.md:20: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:734: docs/handoff_share/handoff_pack_part_01.md:469: docs/handoff/handoff_tasks.md:21: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:735: docs/handoff_share/handoff_pack_part_01.md:470: docs/handoff/handoff_tasks.md:22: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:736: docs/handoff_share/handoff_pack_part_01.md:471: docs/handoff/handoff_tasks.md:23: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:737: docs/handoff_share/handoff_pack_part_01.md:472: docs/handoff/handoff_tasks.md:24: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:738: docs/handoff_share/handoff_pack_part_01.md:473: docs/handoff/handoff_tasks.md:25: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:739: docs/handoff_share/handoff_pack_part_01.md:474: docs/handoff/handoff_tasks.md:26: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:740: docs/handoff_share/handoff_pack_part_01.md:475: docs/handoff/handoff_tasks.md:27: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:741: docs/handoff_share/handoff_pack_part_01.md:476: docs/handoff/handoff_tasks.md:28: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:742: docs/handoff_share/handoff_pack_part_01.md:477: docs/handoff/handoff_tasks.md:29: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:743: docs/handoff_share/handoff_pack_part_01.md:478: docs/handoff/handoff_tasks.md:30: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:744: docs/handoff_share/handoff_pack_part_01.md:479: docs/handoff/handoff_tasks.md:31: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:745: docs/handoff_share/handoff_pack_part_01.md:480: docs/handoff/handoff_tasks.md:32: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:746: docs/handoff_share/handoff_pack_part_01.md:481: docs/handoff/handoff_tasks.md:33: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:747: docs/handoff_share/handoff_pack_part_01.md:482: docs/handoff/handoff_tasks.md:34: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:748: docs/handoff_share/handoff_pack_part_01.md:483: docs/handoff/handoff_tasks.md:35: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:749: docs/handoff_share/handoff_pack_part_01.md:484: docs/handoff/handoff_tasks.md:36: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:750: docs/handoff_share/handoff_pack_part_01.md:485: docs/handoff/handoff_tasks.md:37: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:751: docs/handoff_share/handoff_pack_part_01.md:486: docs/handoff/handoff_tasks.md:38: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:752: docs/handoff_share/handoff_pack_part_01.md:487: docs/handoff/handoff_tasks.md:39: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:753: docs/handoff_share/handoff_pack_part_01.md:488: docs/handoff/handoff_tasks.md:40: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:754: docs/handoff_share/handoff_pack_part_01.md:489: docs/handoff/handoff_tasks.md:41: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:755: docs/handoff_share/handoff_pack_part_01.md:490: docs/handoff/handoff_tasks.md:42: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:756: docs/handoff_share/handoff_pack_part_01.md:491: docs/handoff/handoff_tasks.md:43: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:757: docs/handoff_share/handoff_pack_part_01.md:492: docs/handoff_share/handoff_pack_part_01.md:382: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:758: docs/handoff_share/handoff_pack_part_01.md:493: docs/handoff_share/handoff_pack_part_01.md:390: ## TODO/FIXME
docs/handoff/handoff_pack.md:759: docs/handoff_share/handoff_pack_part_01.md:494: docs/handoff_share/handoff_pack_part_01.md:392: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:760: docs/handoff_share/handoff_pack_part_01.md:495: docs/handoff_share/handoff_pack_part_01.md:393: docs/handoff/handoff_pack.md:343: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:761: docs/handoff_share/handoff_pack_part_01.md:496: docs/handoff_share/handoff_pack_part_01.md:394: docs/handoff/handoff_pack.md:351: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:762: docs/handoff_share/handoff_pack_part_01.md:497: docs/handoff_share/handoff_pack_part_01.md:395: docs/handoff/handoff_pack.md:353: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:763: docs/handoff_share/handoff_pack_part_01.md:498: docs/handoff_share/handoff_pack_part_01.md:396: docs/handoff/handoff_pack.md:354: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:764: docs/handoff_share/handoff_pack_part_01.md:499: docs/handoff_share/handoff_pack_part_01.md:397: docs/handoff/handoff_pack.md:355: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:765: docs/handoff_share/handoff_pack_part_01.md:500: docs/handoff_share/handoff_pack_part_01.md:398: docs/handoff/handoff_pack.md:356: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:766: docs/handoff_share/handoff_pack_part_01.md:501: docs/handoff_share/handoff_pack_part_01.md:399: docs/handoff/handoff_pack.md:357: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:767: docs/handoff_share/handoff_pack_part_01.md:502: docs/handoff_share/handoff_pack_part_01.md:400: docs/handoff/handoff_pack.md:358: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:768: docs/handoff_share/handoff_pack_part_01.md:503: docs/handoff_share/handoff_pack_part_01.md:401: docs/handoff/handoff_pack.md:359: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:769: docs/handoff_share/handoff_pack_part_01.md:504: docs/handoff_share/handoff_pack_part_01.md:402: docs/handoff/handoff_pack.md:360: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:770: docs/handoff_share/handoff_pack_part_01.md:505: docs/handoff_share/handoff_pack_part_01.md:403: docs/handoff/handoff_pack.md:361: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:771: docs/handoff_share/handoff_pack_part_01.md:506: docs/handoff_share/handoff_pack_part_01.md:404: docs/handoff/handoff_pack.md:362: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:772: docs/handoff_share/handoff_pack_part_01.md:507: docs/handoff_share/handoff_pack_part_01.md:405: docs/handoff/handoff_pack.md:363: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:773: docs/handoff_share/handoff_pack_part_01.md:508: docs/handoff_share/handoff_pack_part_01.md:406: docs/handoff/handoff_pack.md:364: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:774: docs/handoff_share/handoff_pack_part_01.md:509: docs/handoff_share/handoff_pack_part_01.md:407: docs/handoff/handoff_pack.md:365: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:775: docs/handoff_share/handoff_pack_part_01.md:510: docs/handoff_share/handoff_pack_part_01.md:408: docs/handoff/handoff_pack.md:366: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:776: docs/handoff_share/handoff_pack_part_01.md:511: docs/handoff_share/handoff_pack_part_01.md:409: docs/handoff/handoff_pack.md:367: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:777: docs/handoff_share/handoff_pack_part_01.md:512: docs/handoff_share/handoff_pack_part_01.md:410: docs/handoff/handoff_pack.md:368: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:778: docs/handoff_share/handoff_pack_part_01.md:513: docs/handoff_share/handoff_pack_part_01.md:411: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:779: docs/handoff_share/handoff_pack_part_01.md:514: docs/handoff_share/handoff_pack_part_01.md:412: docs/handoff/handoff_tasks.md:5: docs/handoff/db_schema.md:91: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:780: docs/handoff_share/handoff_pack_part_01.md:515: docs/handoff_share/handoff_pack_part_01.md:413: docs/handoff/handoff_tasks.md:6: docs/handoff/handoff_pack.md:335: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:781: docs/handoff_share/handoff_pack_part_01.md:516: docs/handoff_share/handoff_pack_part_01.md:414: docs/handoff/handoff_tasks.md:7: docs/handoff/handoff_pack.md:343: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:782: docs/handoff_share/handoff_pack_part_01.md:517: docs/handoff_share/handoff_pack_part_01.md:415: docs/handoff/handoff_tasks.md:8: docs/handoff/handoff_pack.md:345: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:783: docs/handoff_share/handoff_pack_part_01.md:518: docs/handoff_share/handoff_pack_part_01.md:416: docs/handoff/handoff_tasks.md:9: docs/handoff/handoff_pack.md:346: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:784: docs/handoff_share/handoff_pack_part_01.md:519: docs/handoff_share/handoff_pack_part_01.md:417: docs/handoff/handoff_tasks.md:10: docs/handoff/handoff_pack.md:347: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:785: docs/handoff_share/handoff_pack_part_01.md:520: docs/handoff_share/handoff_pack_part_01.md:418: docs/handoff/handoff_tasks.md:11: docs/handoff/handoff_pack.md:348: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:786: docs/handoff_share/handoff_pack_part_01.md:521: docs/handoff_share/handoff_pack_part_01.md:419: docs/handoff/handoff_tasks.md:12: docs/handoff/handoff_tasks.md:3: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:787: docs/handoff_share/handoff_pack_part_01.md:522: docs/handoff_share/handoff_pack_part_01.md:420: docs/handoff/handoff_tasks.md:13: docs/handoff/handoff_tasks.md:5: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:788: docs/handoff_share/handoff_pack_part_01.md:523: docs/handoff_share/handoff_pack_part_01.md:421: docs/handoff/handoff_tasks.md:14: docs/handoff/handoff_tasks.md:6: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:789: docs/handoff_share/handoff_pack_part_01.md:524: docs/handoff_share/handoff_pack_part_01.md:422: docs/handoff/handoff_tasks.md:15: docs/handoff/handoff_tasks.md:7: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:790: docs/handoff_share/handoff_pack_part_01.md:525: docs/handoff_share/handoff_pack_part_01.md:423: docs/handoff/handoff_tasks.md:16: docs/handoff/handoff_tasks.md:8: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:791: docs/handoff_share/handoff_pack_part_01.md:526: docs/handoff_share/handoff_pack_part_01.md:424: docs/handoff/handoff_tasks.md:17: scripts/update_handoff.mjs:106: // TODO/FIXME nei file sorgenti
docs/handoff/handoff_pack.md:792: docs/handoff_share/handoff_pack_part_01.md:527: docs/handoff_share/handoff_pack_part_01.md:425: docs/handoff/handoff_tasks.md:18: scripts/update_handoff.mjs:107: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:793: docs/handoff_share/handoff_pack_part_01.md:528: docs/handoff_share/handoff_pack_part_01.md:426: docs/handoff/handoff_tasks.md:19: scripts/update_handoff.mjs:232: ## TODO / FIXME (scan sorgente)
docs/handoff/handoff_pack.md:794: docs/handoff_share/handoff_pack_part_01.md:529: docs/handoff_share/handoff_pack_part_01.md:427: docs/handoff/handoff_tasks.md:20: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:795: docs/handoff_share/handoff_pack_part_01.md:530: docs/handoff_share/handoff_pack_part_01.md:428: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.md:796: docs/handoff_share/handoff_pack_part_01.md:531: docs/handoff_share/handoff_pack_part_01.md:429: scripts/update_handoff.mjs:245: ## TODO/FIXME
docs/handoff/handoff_pack.md:797: docs/handoff_share/handoff_pack_part_01.md:532: docs/handoff_share/handoff_pack_part_01.md:430: supabase/migrations/2025-08-23_memory_proposals.sql:85: -- TODO RLS policies per-user/tenant (dipende dal modello auth corrente).
docs/handoff/handoff_pack.md:798: docs/handoff_share/handoff_pack_part_01.md:533: scripts/update_handoff.mjs:136: const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
docs/handoff/handoff_pack.m