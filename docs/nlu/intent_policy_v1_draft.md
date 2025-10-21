# 🧭 REPPING – Intent Classification Policy  
**Versione:** 1.0-draft (modificabile congiuntamente Paolo + GPT-5)  
**Data:** 21 ottobre 2025  
**Stato:** Bozza valida per test integrativo  
**Scopo:** Definire le regole comportamentali del modulo NLU ibrido (LLM + planner deterministico)  
**Autori:** Paolo (Ergonomo no-code) + GPT-5 (Developer assistente)  

---

## ⚙️ Schema tecnico operativo (`intent_policy.json`)

```json
{
  "version": "1.0-draft",
  "last_updated": "2025-10-21",
  "principles": {
    "no_data_exposure": true,
    "no_generated_answers": true,
    "deterministic_templates": true,
    "ask_confirmation_on_doubt": true
  },
  "confidence_thresholds": {
    "accept": 0.75,
    "clarify": 0.45
  },
  "pii_redaction": {
    "active": true,
    "rules": {
      "names": "<NOME>",
      "emails": "<EMAIL>",
      "numbers": "<NUM>",
      "codes": "<CODE>"
    }
  },
  "intents": [
    {
      "key": "count_clients",
      "description": "Contare quanti clienti esistono",
      "examples": ["Quanti clienti ho?", "Numero clienti?", "Quanti contatti ci sono?"],
      "template": "Hai {N} clienti."
    },
    {
      "key": "list_client_names",
      "description": "Elenco dei nomi dei clienti",
      "examples": ["Come si chiamano?", "Dammi i nomi dei clienti", "Elenco clienti"],
      "template": "I tuoi clienti sono: {NOMI}."
    },
    {
      "key": "list_client_emails",
      "description": "Elenco delle email dei clienti",
      "examples": ["E le email?", "Mostrami le email dei clienti", "Contatti email"],
      "template": "Le email dei tuoi clienti sono: {EMAILS}."
    },
    {
      "key": "list_missing_products",
      "description": "Prodotti mancanti o non disponibili",
      "examples": ["Quali prodotti mancano?", "Cosa non ho in stock?"],
      "template": "I prodotti mancanti sono: {PRODOTTI}."
    },
    {
      "key": "list_orders_recent",
      "description": "Ordini recenti",
      "examples": ["Ultimi ordini", "Cosa ho venduto ieri?"],
      "template": "Gli ultimi ordini sono: {ORDINI}."
    },
    {
      "key": "summary_sales",
      "description": "Sintesi vendite",
      "examples": ["Riassunto vendite", "Come sta andando?"],
      "template": "Hai venduto {VALORE_TOTALE} in {PERIODO}."
    },
    {
      "key": "greet",
      "description": "Saluto o avvio sessione",
      "examples": ["Ciao", "Buongiorno", "Ehi Repping"],
      "template": "Ciao! Come posso aiutarti oggi?"
    },
    {
      "key": "help",
      "description": "Richiesta d’aiuto o guida",
      "examples": ["Cosa posso chiederti?", "Aiutami", "Come funziona?"],
      "template": "Puoi chiedermi di contare i clienti, mostrare nomi, email o prodotti mancanti."
    }
  ],
  "logging": {
    "keep_text": false,
    "metrics_only": true,
    "fields": ["intent", "confidence", "timestamp"]
  },
  "updates_policy": {
    "requires_approval_by": ["Paolo", "GPT-5"],
    "change_log_required": true
  }
}
```

---

## 🧩 Diagramma concettuale del flusso decisionale

```
────────────────────────────────────────────
          🧠 Repping – Intent Flow
────────────────────────────────────────────
           ↓ (1) Input utente
     [ Frase libera scritta o vocale ]
           ↓
     (2) Redazione PII locale
     → sostituzione nomi, email, numeri
           ↓
     (3) LLM di classificazione
     → restituisce { intent, confidence }
           ↓
     (4) Valutazione soglia
     ├── conf ≥ 0.75 →  planner → risposta deterministica
     ├── 0.45–0.75 → richiesta chiarimento ("Vuoi i nomi o le email?")
     └── < 0.45 →  "Non ho capito, puoi riformularlo?"
           ↓
     (5) Risposta locale (template + dati reali)
────────────────────────────────────────────
  Privacy: nessun dato sensibile inviato
  Contesto: solo turno corrente
────────────────────────────────────────────
```

---

### 📎 Note operative
- Questo documento descrive il **comportamento vincolante** del modulo NLU ibrido.  
- Ogni revisione dovrà incrementare il numero di versione (`1.1`, `1.2` …) e riportare un changelog nel repo.  
- Il file JSON corrispondente (`intent_policy.json`) è la **fonte unica di verità** per il codice.  
- Nessun fallback offline o regola minima è prevista in questa versione.

---

**Repository target:**  
`https://github.com/Paoloprimus/Repping/blob/main/app/nlu/intent_policy_v1_draft.md`
