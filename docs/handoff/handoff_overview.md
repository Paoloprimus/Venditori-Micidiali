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
app/api/messages/append/route.ts
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
