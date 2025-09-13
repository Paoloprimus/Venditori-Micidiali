Coder Change — Handoff Checklist

Documento operativo per passaggi di consegne tra coder/LLM.
Obiettivo: evitare errori per mancanza di contesto e ripartire subito.

1) Cos’è questo progetto (in 1 min)

Prodotto: Assistente AI per venditori (chat testo/voce + TTS), con Sales Co-Pilot (memory bank, proposte, quick add via voce).

Stack: Next.js + Tailwind · API Routes (OpenAI) · Supabase (Postgres + RLS) · Vercel.

Ergonomia: niente form pesanti → l’assistente trasforma input naturali in dati strutturati e aggiorna il DB.

2) Cosa incollare nella nuova chat LLM (3 scenari)
A. Sempre (kick-off leggero)

Incolla docs/handoff/handoff_summary.md
→ Il modello capisce subito natura e scopi del prodotto + stack.

B. Lavoro tecnico completo (serve pieno contesto)

Incolla docs/handoff_share/handoff_prompt_starter.txt (primo messaggio in chat).

Incolla tutti i file docs/handoff_share/handoff_pack_part_01.md, ..._02.md, ecc. in ordine.
→ Contengono: Quickstart, Overview, Routes Manifest, Repo Tree, DB Schema, Tasks/Roadmap.

C. Solo roadmap/organizzazione (niente codice ora)

Incolla docs/handoff/handoff_summary.md

Incolla docs/handoff/handoff_tasks.md
→ Focus su cosa resta da fare e priorità, senza caricare dettagli pesanti.

3) Come rigenerare l’handoff (se il repo è cambiato)

GitHub → Actions → workflow “Update Handoff (…manuale)” → Run workflow

run_now = true (forza rigenerazione)

(opz.) git_window = 30.days

Al termine, verifica in Code → docs/:

handoff/ → overview, repo_tree, db_schema, handoff_tasks, handoff_pack

handoff_share/ → handoff_prompt_starter.txt + pack diviso in parti

Nota: il workflow aggiorna automaticamente anche ogni N push (es. 10).
Modifica il valore nel file .github/workflows/update-handoff.yml se serve.

4) Variabili & segreti (dove guardarli)

.env.example (se presente) e docs/handoff/handoff_overview.md → elenco variabili.

Supabase: impostazioni DB e credenziali nel dashboard del progetto.

GitHub → Settings → Secrets and variables → Actions:

SUPABASE_DB_URL (consigliato per dump schema completo con RLS).

5) Avvio locale (Quickstart)
npm install
npm run dev
# Apri il browser sull'URL indicato (di solito http://localhost:3000)

6) Cose da NON fare al primo colpo

Non toccare le RLS finché non hai letto docs/handoff/db_schema.md e handoff_tasks.md.

Non cambiare rotte API senza aggiornare il Routes Manifest (si rigenera via workflow).

Non committare segreti o .env reali nel repo.

7) Flussi principali (mappa ad alto livello)

Chat vocale: voce → /api/voice/transcribe → testo → modello → TTS → UI.

Memory bank: note/proposte → embeddings → /api/memory/upsert / /api/memory/search.

Proposte: /api/proposals/generate crea payload; /api/proposals/[id] gestisce aggiornamenti.
(Dettaglio file/rotte: vedi docs/handoff/routes_manifest.md e docs/handoff/handoff_pack.md.)

8) Stato lavori / Priorità (leggi prima di iniziare)

Apri docs/handoff/handoff_tasks.md → contiene:

TODO/FIXME trovati nel codice,

Roadmap breve (sicurezza/RLS, flows, ambiente, AI e2e),

Commits recenti (finestra configurabile).

9) In caso di dubbi (procedura rapida)

Chiedi esplicitamente in chat: “Mostrami la sezione X del pack” (es. DB schema).

Se manca, Rigenera (vedi §3).

Se servono decisioni di prodotto, parti da handoff_summary.md e proponi 2-3 opzioni chiare.

Appendice — Domande frequenti

Non vedo docs/handoff_share/ dopo il run
→ Aggiorna lo script scripts/update_handoff.mjs e verifica che il workflow committi sia handoff che handoff_share.

Il pack è troppo lungo da incollare
→ Usa la modalità “a pezzi” (handoff_share) e incolla solo ciò che serve (summary sempre, il resto on-demand).

Devo cambiare la frequenza di aggiornamento
→ Modifica la condizione if [ "$COUNT" -lt N ] nel workflow (default 10).

TL;DR:

Nuova chat → sempre handoff_summary.md.

Se si codifica seriamente → prompt starter + pack parts.

Roadmap e priorità → handoff_tasks.md.

Se il pack non riflette l’ultimo stato → Run workflow (run_now=true).
