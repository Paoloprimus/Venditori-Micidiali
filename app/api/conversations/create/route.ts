Ecco il codice completo per `app/api/conversations/create/route.ts`, pronto da copiare:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { makeSessionTitle } from '@/lib/sessionTitle';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Genera titolo automatico (es. "lun 25/08/25")
  const title = makeSessionTitle();

  // Inserisci conversazione in DB
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title })
    .select('id, title')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}
```

Questo è tutto il file. Non serve altro: gestisce l’autenticazione, genera il titolo e salva la nuova conversazione. ✔️
