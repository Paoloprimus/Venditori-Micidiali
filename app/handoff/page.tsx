'use client';

import { useState } from 'react';

export default function HandoffPage() {
  const [activeSection, setActiveSection] = useState('vision');

  const sections = {
    vision: {
      title: "Visione & Obiettivo Prodotto",
      content: `Base AIxPMI Assistant (chat vocale, sessioni, TTS opzionale, Tailwind).
Esteso con "Sales Co-Pilot": funzioni di memory bank personalizzata, generatore proposte, quick add via voce.
Obiettivo: un assistente conversazionale per PMI che gestisce sia interazioni (chat) sia dati strutturati (clienti, contatti, prodotti, proposte).
Principio ergonomico: il venditore non deve MAI compilar form complessi → interazione SOLO naturale (testo o voce). L'assistente traduce in dati strutturati e aggiorna automaticamente il DB.`
    },
    stack: {
      title: "Stack & Architettura",
      content: `Next.js 14 (App Router) + TypeScript + Tailwind CSS.
Supabase (Postgres + RLS) come DB multi-tenant, estensione pgvector.
OpenAI SDK v4 per chat completions, embeddings e trascrizione audio.
Deploy: GitHub → Vercel auto; env su Vercel.`
    },
    structure: {
      title: "Struttura Repo",
      content: `app/
  api/
    accounts/create/route.ts         → crea account
    products/create/route.ts         → crea prodotto
    contacts/create/route.ts         → crea contatto
    accounts/update-custom/route.ts  → nuovo, aggiorna accounts.custom da testo naturale
    custom-fields/propose/route.ts
    custom-fields/apply/route.ts
    memory/upsert/route.ts
    memory/search/route.ts
    proposals/generate/route.ts
    proposals/[id]/route.ts
    messages/send/route.ts           → aggiornato: ora integra
                                       - riconoscimento intento (briefing / update / other)
                                       - update automatico scheda cliente
                                       - briefing operativo deterministico
  tools/
    designer/page.tsx
    proposals/page.tsx
    quick-add/page.tsx
    quick-add/QuickAddClient.tsx
components/
  SaveNoteButton.tsx
  ProposalGenerator.tsx
  DBDesigner.tsx
  Drawers.tsx (fixati bug title/total_cost)
lib/
  embeddings.ts
  types.copilot.ts
  openai.ts
  supabase/server.ts`
    },
    dataModel: {
      title: "Modello Dati (Postgres)",
      content: `Tabelle oltre a conversations/messages:
- accounts(id, user_id, name, custom jsonb, created_at, updated_at)
- contacts(id, account_id, full_name, email, phone, custom, created_at)
- products(id, sku, title, base_price, custom, created_at)
- notes(id, account_id, contact_id, body, custom, created_at)
- proposals(id, account_id, contact_id, payload jsonb, status, created_at)
- custom_fields_registry(id, entity, field_key, field_label, field_type, options, help, created_at)
- notes_embeddings(note_id, embedding vector(1536))

Aggiornamenti a conversations:
- campo updated_at con trigger auto-update
- trigger su insert/update messages → aggiorna updated_at`
    },
    features: {
      title: "Funzionalità Implementate",
      content: `- Sessioni: drawer sinistro corretto (niente più errori total_cost, titolo visibile).
- Quick Add: voce/testo, crea account/prodotto/contatto.
- Update scheda cliente: l'assistente capisce frasi naturali (es. "Rossi paga a 60 giorni") e aggiorna accounts.custom (fascia, pagamento, tabù, interessi, ecc.). Nessun form.
- Briefing cliente: l'assistente riconosce richieste naturali (es. "com'è messo Rossi?", "preparami l'incontro con Rossi") e:
  - recupera campi strutturati da accounts.custom
  - mostra briefing deterministico senza invenzioni
  - include ultime note
  - chiede al modello solo 2-3 prossime azioni pratiche (vietato inventare prodotti/interessi)
- Memory Bank: salvataggio note con embeddings, ricerca semantica.
- Proposals: generazione bozza proposta in JSON usando dati account + note.`
    },
    accountSchema: {
      title: "Schema Scheda Cliente (accounts.custom)",
      content: `L'assistente popola automaticamente questi campi (8 chiave):
- fascia (A/B/C)
- pagamento (es. 60 giorni)
- prodotti_interesse (array)
- ultimi_volumi (stringa)
- ultimo_esito (stringa)
- tabu (array)
- interessi (array)
- note (stringa libera breve)

Esempio accounts.custom:
{
  "fascia": "B",
  "pagamento": "60 giorni",
  "tabu": ["ACME"],
  "interessi": ["calcio"]
}`
    },
    issues: {
      title: "Problemi Risolti",
      content: `- Drawer: eliminato uso di colonna inesistente total_cost.
- Conversations: aggiunto updated_at mancante, trigger sistemato.
- messages/send: tolti riferimenti a colonne non presenti (tokens/cost), ora coerente con schema reale.
- Briefing: niente più confusione "calcio = prodotto di interesse".
- UX: venditore non compila form, interagisce solo via linguaggio naturale.`
    },
    roadmap: {
      title: "Roadmap Prossima",
      content: `- UI briefing dedicata (oltre al messaggio in chat).
- Quick Add esteso: includere "crea nota".
- Report fine giornata (PDF/Docx) con briefing clienti visitati.
- Rifinitura drawer: inline-edit titolo sessione, fallback robusto se title nullo.
- Miglior handling updated_at (verifica ordinamento lista).
- Migliorare RLS per products (oggi globali).
- QA su custom fields registry e uso dinamico nei form.
- Aggiungere comandi voce auto per briefing ("leggi briefing Rossi" a mani libere).
- UI usage/costi con grafico.`
    },
    changelog: {
      title: "Changelog v1.4",
      content: `- Aggiunto endpoint accounts/update-custom.
- Aggiornata messages/send: riconoscimento intenti + update + briefing robusto.
- Fixati bug UI drawer (total_cost, titolo).
- Integrato flusso "frasi naturali → dati strutturati → briefing".
- Briefing operativo deterministico (senza invenzioni).
- Aggiornato handoff per passaggio chiaro a nuovi coder.`
    }
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('  ') || line.startsWith('-') || line.startsWith('{') || line.startsWith('}')) {
        return <div key={index} className="ml-4 font-mono text-sm">{line}</div>;
      } else if (line.includes('→')) {
        const parts = line.split('→');
        return (
          <div key={index} className="flex my-1">
            <span className="font-mono text-sm flex-1">{parts[0]}</span>
            <span className="text-blue-600 ml-2">{parts[1]}</span>
          </div>
        );
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <div key={index} className="my-1">{line}</div>;
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white">
          <h1 className="text-3xl font-bold">AIxPMI Assistant + Sales Co-Pilot</h1>
          <p className="text-indigo-100 mt-2">Handoff tecnico v1.4 - Data: 2025-08-24</p>
          <div className="mt-4 flex items-center">
            <span className="bg-indigo-700 px-3 py-1 rounded-full text-sm mr-3">Next.js 14</span>
            <span className="bg-indigo-700 px-3 py-1 rounded-full text-sm mr-3">Supabase</span>
            <span className="bg-indigo-700 px-3 py-1 rounded-full text-sm">OpenAI SDK v4</span>
          </div>
          <a 
            href="https://github.com/Paoloprimus/Venditori-Micidiali" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center mt-4 text-indigo-200 hover:text-white"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Repository GitHub
          </a>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-1/4 bg-gray-50 p-4 border-r">
            <nav className="space-y-1">
              {Object.entries(sections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeSection === key
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="w-full md:w-3/4 p-6">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {sections[activeSection as keyof typeof sections].title}
              </h2>
              <div className="bg-gray-50 p-6 rounded-lg border">
                {formatContent(sections[activeSection as keyof typeof sections].content)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
