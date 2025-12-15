# Migrazione a Mistral AI - Guida

## Strategia: Sviluppo con OpenAI, Produzione con Mistral

Questa guida spiega come configurare reping.app per usare **Mistral AI** in produzione mantenendo lo sviluppo con **OpenAI** (via Cursor).

## ✅ Fattibilità

**SÌ, è fattibile!** Perché:

1. **Contesto limitato**: Il dominio vendite è ben definito → Mistral può gestirlo
2. **System prompt chiari**: Istruzioni specifiche funzionano bene con Mistral
3. **NLU locale**: Il parsing intent è già locale, non dipende dal modello
4. **Function calling**: Mistral supporta function calling (compatibile OpenAI API)

## ⚠️ Considerazioni

### 1. Function Calling
- ✅ **Supportato**: Mistral API è compatibile con OpenAI per function calling
- ⚠️ **Test richiesti**: Verificare che tutti i tool calls funzionino correttamente

### 2. JSON Structured Output
- ⚠️ **Non nativo**: Mistral potrebbe non supportare `response_format: json_object`
- ✅ **Workaround**: Aggiungere istruzioni nel system prompt (già implementato in `provider.ts`)

### 3. Qualità delle risposte
- ✅ **Sufficiente per dominio vendite**: Il contesto limitato aiuta
- ⚠️ **Test A/B**: Confrontare risposte OpenAI vs Mistral su casi reali

## 🚀 Implementazione

### Step 1: Configurazione Environment Variables

Aggiungi al tuo `.env`:

```bash
# Provider AI (openai | mistral)
AI_PROVIDER=openai  # Per sviluppo
# AI_PROVIDER=mistral  # Per produzione

# Mistral API (solo se AI_PROVIDER=mistral)
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_MODEL=mistral-large-latest  # o mistral-small-latest
MISTRAL_BASE_URL=https://api.mistral.ai/v1  # opzionale
```

### Step 2: Refactoring Codice

Il file `lib/ai/provider.ts` fornisce un abstraction layer. 

**Esempio di migrazione** (`app/api/messages/send/route.ts`):

```typescript
// PRIMA (OpenAI diretto)
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const response = await openai.chat.completions.create({ ... });

// DOPO (Provider abstraction)
import { getAIProvider } from "@/lib/ai/provider";
const provider = getAIProvider();
const response = await provider.chatCompletions({ ... });
```

### Step 3: Test

1. **Test locale con Mistral**:
   ```bash
   AI_PROVIDER=mistral npm run dev
   ```

2. **Verifica function calling**: Testa tutte le funzioni (search_clients, get_visits, etc.)

3. **Verifica JSON output**: Testa generazione proposte

4. **Confronto qualità**: Confronta risposte OpenAI vs Mistral

## 📊 Modelli Mistral Consigliati

### Per Produzione
- **Mistral Large 2** (`mistral-large-latest`):
  - ✅ 123B parametri
  - ✅ 128k context window
  - ✅ Supporto italiano eccellente
  - ✅ Function calling completo
  - 💰 Costo: ~$2-4 per 1M tokens

- **Mistral Small 3** (`mistral-small-latest`):
  - ✅ 24B parametri
  - ✅ Più veloce e economico
  - ✅ Sufficiente per dominio vendite
  - 💰 Costo: ~$0.5-1 per 1M tokens

### Raccomandazione
Inizia con **Mistral Small 3** per testare. Se la qualità è sufficiente, mantienilo per risparmiare. Se serve più qualità, passa a **Mistral Large 2**.

## 🔄 Workflow Sviluppo

1. **Sviluppo** (Cursor + OpenAI):
   - Usa `AI_PROVIDER=openai` in `.env.local`
   - Sviluppa e testa con OpenAI (modelli avanzati)

2. **Test Produzione** (Mistral):
   - Cambia `AI_PROVIDER=mistral` in `.env.production`
   - Testa funzionalità critiche

3. **Deploy**:
   - Vercel/ambiente produzione usa `AI_PROVIDER=mistral`
   - Monitora qualità e costi

## 📝 Checklist Migrazione

- [ ] Aggiunto `lib/ai/provider.ts` (già fatto)
- [ ] Refactoring `app/api/messages/send/route.ts`
- [ ] Refactoring `app/api/proposals/generate/route.ts`
- [ ] Test function calling con Mistral
- [ ] Test JSON structured output
- [ ] Test qualità risposte (A/B)
- [ ] Configurazione environment variables produzione
- [ ] Monitoraggio costi e performance

## 🎯 Vantaggi

1. **Conformità Europea**: Dati processati in Europa (se usi Mistral EU)
2. **Costi**: Potenzialmente più economici di OpenAI
3. **Sviluppo**: Continui a usare modelli avanzati per sviluppo
4. **Flessibilità**: Switch facile tra provider

## ⚠️ Limitazioni Note

1. **JSON Output**: Richiede prompt engineering (già gestito)
2. **Qualità**: Potrebbe essere leggermente inferiore a GPT-4 per compiti complessi
3. **Latency**: Verificare tempi di risposta vs OpenAI

## 🔗 Risorse

- [Mistral AI Documentation](https://docs.mistral.ai/)
- [Mistral API Reference](https://docs.mistral.ai/api/)
- [Function Calling Guide](https://docs.mistral.ai/capabilities/function_calling/)









