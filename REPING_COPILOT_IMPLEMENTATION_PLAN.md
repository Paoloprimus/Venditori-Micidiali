# 🚀 REPING COPILOT - PIANO DI IMPLEMENTAZIONE

> **Data Start**: 27 Dicembre 2025  
> **Target MVP**: 31 Gennaio 2026 (5 settimane)  
> **Status**: ✅ PRONTO PER PARTIRE

---

## ✅ DECISIONI FINALI CONFERMATE

### 📋 Riepilogo Veloce:
- ✅ **Nome**: REPING COPILOT (base) + PRO + PRO+
- ✅ **Architettura**: Un solo codebase con feature flags
- ✅ **Tier**: FREE (€0) | PRO (€9) | PRO+ (€29)
- ✅ **AI Limiti**: 5 msg/g | 20 msg/g | ∞
- ✅ **Geografia MVP**: Solo Provincia Verona
- ✅ **Note**: SOLO localStorage (zero cloud)
- ✅ **Features MVP**: 4 core (3 settimane)

---

## 📦 FILE CREATI

### 1. **Documentazione**:
- ✅ `REPING_COPILOT_DECISIONI_FINALI.md` - Strategia completa
- ✅ `REPING_COPILOT_IMPLEMENTATION_PLAN.md` - Questo file

### 2. **Configurazione Tier**:
- ✅ `lib/tiers.ts` - Sistema tier con limiti e feature flags

### 3. **Database**:
- ✅ `supabase/migrations/20251226_add_tiers_and_places.sql` - Schema DB completo
  - Tabella `places` (POI pubblici)
  - Tabella `user_selected_places` (selezioni utente)
  - Tabella `user_routes` (itinerari)
  - Tabella `places_changelog` (audit log)
  - RLS policies
  - Indexes geografici

### 4. **Script Utility**:
- ✅ `scripts/populate-places.js` - Popola DB con dati Verona

---

## 🛠️ SETUP INIZIALE (DA FARE ORA)

### Step 1: Esegui Migration Database
```bash
# Opzione A: Se usi Supabase CLI locale
npx supabase migration up

# Opzione B: Se usi Supabase Dashboard
# 1. Vai su https://app.supabase.com
# 2. Progetto > SQL Editor
# 3. Copia/incolla contenuto di: supabase/migrations/20251226_add_tiers_and_places.sql
# 4. Clicca "Run"
```

**Verifica**:
- ✅ Tabella `places` creata
- ✅ Tabella `user_selected_places` creata
- ✅ Tabella `user_routes` creata
- ✅ Column `tier` aggiunta a `users`

### Step 2: Popola Database POI
```bash
node scripts/populate-places.js
```

**Output atteso**:
```
✅ Inseriti: 1549 POI
📊 Totale POI nel database: 1549
```

### Step 3: Aggiungi SUPABASE_SERVICE_ROLE_KEY
Nel file `.env.local`, aggiungi (se non c'è già):
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Dove trovarlo**:
- Supabase Dashboard > Project Settings > API
- Copia "service_role" key (secret)

### Step 4: Verifica Server
```bash
npm run dev
```

Vai su: http://localhost:3000/mappa

**Deve funzionare tutto come prima** (mappa con 1549 POI di Verona)

---

## 📅 ROADMAP MVP (3 settimane)

### 🔷 SETTIMANA 1: Sistema Tier + Selezione Luoghi

#### Task 1.1: Hook useTier
**File**: `hooks/useTier.ts`

```typescript
export function useTier() {
  const { user } = useUser();
  const tier = user?.tier || 'FREE';
  const limits = TIERS[tier].limits;
  const features = TIERS[tier].features;
  
  return {
    tier,
    limits,
    features,
    hasFeature: (f) => hasFeature(tier, f),
    hasReachedLimit: (l, count) => hasReachedLimit(tier, l, count),
    getUpgradeMessage: (l) => getUpgradeMessage(tier, l),
  };
}
```

**Tempo**: 1 ora

---

#### Task 1.2: UI Badge Tier
**File**: `components/TierBadge.tsx`

Mostra tier corrente + limiti nei vari posti:
- Header app
- Pagina impostazioni
- Popup POI
- Lista itinerari

**Tempo**: 2 ore

---

#### Task 1.3: API Selezione Luoghi
**File**: `app/api/places/select/route.ts`

```typescript
// POST /api/places/select
// Body: { placeId: string }
// Controlla limite tier, inserisce in user_selected_places
```

**File**: `app/api/places/deselect/route.ts`

```typescript
// DELETE /api/places/select
// Body: { placeId: string }
```

**Tempo**: 2 ore

---

#### Task 1.4: UI Selezione Luoghi
**File**: `components/PlacesList.tsx`

Lista scrollabile di tutti i POI con:
- ✅ Checkbox "Aggiungi ai miei luoghi"
- 🔍 Search bar (nome, tipo, comune)
- 🏷️ Filtro per tipo (bar, restaurant, cafe...)
- 📍 Ordinamento per distanza (usa geolocation)

**File**: `components/MyPlacesList.tsx`

Lista dei POI selezionati dall'utente con:
- 🗑️ Bottone rimuovi
- 📍 Link "Mostra su mappa"
- 🔢 Badge: "45/50 luoghi (FREE)"

**Tempo**: 8 ore

---

#### Task 1.5: Integrazione Mappa
**Modifica**: `components/OSMMapClustered.tsx`

- ⭐ Icona stella sui POI già selezionati
- 🆕 Bottone "Aggiungi/Rimuovi" nel popup
- ⚠️ Alert se limite raggiunto → Upgrade modal

**Tempo**: 3 ore

**Totale Settimana 1**: ~16 ore (2 giorni full-time)

---

### 🔷 SETTIMANA 2: Itinerari

#### Task 2.1: API Itinerari
**File**: `app/api/routes/route.ts`

```typescript
// GET /api/routes
// Returns: user_routes for current user

// POST /api/routes
// Body: { nome, descrizione, places_sequence: UUID[], color }
// Controlla limite tier

// PUT /api/routes/:id
// Aggiorna itinerario

// DELETE /api/routes/:id
```

**Tempo**: 3 ore

---

#### Task 2.2: UI Creazione Itinerari
**File**: `app/routes/new/page.tsx`

Interfaccia drag & drop:
1. Lista "Miei luoghi" (sinistra)
2. Lista "Itinerario" (destra) - draggable
3. Reorder con frecce ↑↓
4. Input nome/descrizione
5. Color picker
6. Bottone "Salva"

**Libreria**: `@dnd-kit/core` per drag & drop

**Tempo**: 10 ore

---

#### Task 2.3: Visualizzazione Itinerario su Mappa
**File**: `app/routes/[id]/page.tsx`

Mappa con:
- 🛣️ Linee tra POI (ordine sequenziale)
- 🔢 Numeri tappe (1, 2, 3...)
- 🎨 Colore personalizzato
- 📏 Distanza totale (somma distanze tra punti)

**Tempo**: 6 ore

---

#### Task 2.4: Lista Itinerari
**File**: `app/routes/page.tsx`

Cards con:
- Nome + descrizione
- Preview mappa statica (Leaflet screenshot)
- Numero tappe
- Badge: "3/5 itinerari (FREE)"
- Bottoni: Visualizza | Modifica | Elimina

**Tempo**: 4 ore

**Totale Settimana 2**: ~23 ore (3 giorni full-time)

---

### 🔷 SETTIMANA 3: Note Locali + AI Opt-in + Navigation

#### Task 3.1: Sistema Note localStorage
**File**: `lib/notes/localStorage.ts`

```typescript
interface Note {
  placeId: string;
  text: string;
  history: {
    text: string;
    timestamp: number;
  }[];
}

export function saveNote(placeId: string, text: string): void;
export function getNote(placeId: string): Note | null;
export function exportNotes(): string; // JSON
export function importNotes(json: string): void;
```

**Tempo**: 3 ore

---

#### Task 3.2: UI Note nel Popup
**Modifica**: `components/OSMMapClustered.tsx` - Popup

- 📝 Textarea per note
- 💾 Auto-save on blur
- 🕒 Mostra "Ultima modifica: X minuti fa"
- ⚠️ Disclaimer: "Note salvate solo su questo device"
- 📥 Bottone "Export note" (globale, non per singolo POI)

**Tempo**: 4 ore

---

#### Task 3.3: AI Opt-in Toggle
**File**: `app/settings/page.tsx`

Sezione "Intelligenza Artificiale":

```
[ ] Consenti all'AI di leggere le mie note per suggerimenti migliori

⚠️ Se attivi questa opzione, l'AI potrà accedere alle note salvate
   sul tuo dispositivo per fornirti suggerimenti personalizzati.
   Le note NON vengono mai caricate sui nostri server.
   
   Puoi disattivare questa opzione in qualsiasi momento.
```

Salva preferenza in: `user_settings` (Supabase)

**Tempo**: 2 ore

---

#### Task 3.4: API Bridge per AI
**File**: `app/api/ai/context/route.ts`

```typescript
// GET /api/ai/context
// Body: { placeIds: UUID[] }
// Returns: { notes: { placeId: string, summary: string }[] }

// Lato client:
// 1. Legge note da localStorage per placeIds
// 2. Crea summary (primi 100 chars)
// 3. Invia a API (non il testo completo)
```

**Tempo**: 3 ore

---

#### Task 3.5: Deep Linking Navigation
**File**: `lib/navigation.ts`

```typescript
export function openInWaze(places: Place[]): void {
  // waze://?ll=LAT,LON&navigate=yes
}

export function openInGoogleMaps(places: Place[]): void {
  // https://www.google.com/maps/dir/?api=1&waypoints=...
}

export function openInAppleMaps(places: Place[]): void {
  // maps://?saddr=...&daddr=...
}
```

**File**: `app/routes/[id]/page.tsx` - Aggiungi bottoni

- 🚗 Apri in Waze
- 🗺️ Apri in Google Maps
- 🍎 Apri in Apple Maps

**Tempo**: 4 ore

---

#### Task 3.6: Export/Import Note
**File**: `app/settings/page.tsx`

Sezione "I Tuoi Dati":

```
📥 Export Note (JSON)
   Scarica tutte le tue note in formato JSON

📤 Import Note (JSON)
   Carica note da un file precedentemente esportato
   
   [ ] Sostituisci note esistenti
   [ ] Unisci con note esistenti
```

**Tempo**: 3 ore

**Totale Settimana 3**: ~19 ore (2.5 giorni full-time)

---

## 📊 RECAP TIMING

| Settimana | Features | Ore | Giorni FTE |
|-----------|----------|-----|------------|
| 1 | Tier + Selezione | 16h | 2 |
| 2 | Itinerari | 23h | 3 |
| 3 | Note + AI + Nav | 19h | 2.5 |
| **TOTALE** | **MVP Completo** | **58h** | **7.5 giorni** |

**Con 1 dev full-time**: 2 settimane (considerando imprevisti)  
**Con 1 dev part-time**: 3-4 settimane

---

## 🧪 TESTING CHECKLIST

### Test Funzionali:
- [ ] Selezione POI rispetta limiti tier
- [ ] Upgrade modal appare quando limite raggiunto
- [ ] Itinerari salvano ordine corretto
- [ ] Note salvano/caricano da localStorage
- [ ] Export note genera JSON valido
- [ ] Import note non sovrascrive senza conferma
- [ ] AI opt-in salva preferenza
- [ ] Deep link apre app navigazione
- [ ] Mappa mostra stelle su POI selezionati

### Test Tier:
- [ ] FREE: max 50 luoghi, 5 itinerari, 5 msg AI
- [ ] PRO: max 200 luoghi, 20 itinerari, 20 msg AI
- [ ] PRO+: illimitato

### Test Browser:
- [ ] Chrome desktop
- [ ] Safari desktop
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)
- [ ] localStorage funziona in incognito (NO → avviso)

### Test UX:
- [ ] Onboarding chiaro per nuovo utente
- [ ] Empty states informativi
- [ ] Loading states su async operations
- [ ] Error messages comprensibili
- [ ] Mobile responsive tutte le pagine

---

## 🎨 DESIGN SYSTEM

### Colori Tier:
- FREE: `bg-gray-100 text-gray-800`
- PRO: `bg-blue-100 text-blue-800`
- PRO+: `bg-purple-100 text-purple-800`

### Icone:
- ⭐ Luogo selezionato
- 📍 Luogo disponibile
- 🚫 Limite raggiunto
- 🔒 Feature PRO/PRO+
- 🛣️ Itinerario
- 📝 Note
- 🤖 AI

### Componenti Riusabili:
- `<TierBadge tier={tier} />`
- `<UpgradeButton targetTier="PRO" />`
- `<LimitWarning type="places" current={45} max={50} />`
- `<FeatureLock feature="aiOnNotes" />`

---

## 🚀 DEPLOYMENT

### Pre-launch Checklist:
- [ ] Migration DB eseguita su prod
- [ ] Dati POI Verona caricati
- [ ] Variabili ENV configurate
- [ ] Analytics installato (PostHog/Mixpanel)
- [ ] Error tracking (Sentry)
- [ ] SEO metadata
- [ ] Favicon/manifest PWA
- [ ] Legal pages (Privacy, Terms)

### Launch Sequence:
1. Deploy su Vercel preview
2. Test completo su preview URL
3. Beta chiusa: 10 utenti tester
4. Feedback & fix
5. Deploy su prod
6. Announce 🎉

---

## 📈 POST-MVP (Roadmap v1.1)

### Settimana 4-5: Features Avanzate
- [ ] Calendario visite
- [ ] Notifiche push
- [ ] Sistema flag POI errati
- [ ] Storico modifiche itinerari

### Settimana 6: Espansione Geografica
- [ ] Import dati Veneto completo (~10k POI)
- [ ] Abilitazione PRO tier
- [ ] Test performance con +10k POI

### Settimana 7-8: CRM Module (PRO+)
- [ ] Tabelle CRM (clients, orders, visits)
- [ ] E2E encryption
- [ ] Migration wizard da FREE → PRO+

---

## 💰 BUSINESS METRICS

### KPI da Monitorare:
- 👥 **Utenti registrati** (target: 100 in 3 mesi)
- 📈 **Utenti attivi settimanali** (target: 50 WAU)
- 💵 **Conversion rate** (target: 15% FREE → PRO)
- 💬 **AI messages/user/day** (costo OpenAI)
- 📍 **POI selezionati/user** (engagement)
- 🛣️ **Itinerari creati/user** (feature adoption)
- ⏱️ **Retention Day 7** (target: >40%)
- ⏱️ **Retention Day 30** (target: >20%)

### Revenue Projection (6 mesi):
| Mese | Users | PRO (10%) | PRO+ (2%) | MRR |
|------|-------|-----------|-----------|-----|
| 1 | 50 | 5 | 1 | €74 |
| 2 | 100 | 10 | 2 | €148 |
| 3 | 200 | 20 | 4 | €296 |
| 4 | 350 | 35 | 7 | €518 |
| 5 | 550 | 55 | 11 | €814 |
| 6 | 800 | 80 | 16 | €1,184 |

**Break-even**: Mese 4 (costi server ~€300/mese)

---

## 🎯 NEXT IMMEDIATE ACTION

### Adesso (5 minuti):
1. ✅ Esegui migration DB
2. ✅ Popola places table
3. ✅ Verifica su localhost

### Oggi (2 ore):
1. ⬜ Crea `hooks/useTier.ts`
2. ⬜ Aggiungi tier badge in header
3. ⬜ Test tier limits

### Domani (8 ore):
1. ⬜ API select/deselect places
2. ⬜ UI PlacesList
3. ⬜ UI MyPlacesList

### Questa Settimana (16 ore):
1. ⬜ Completa Settimana 1 tasks
2. ⬜ Daily standup (self-review)
3. ⬜ Fine settimana: demo interna

---

## 📞 SUPPORT & QUESTIONS

**Durante sviluppo**, per dubbi:
1. Consulta: `REPING_COPILOT_DECISIONI_FINALI.md`
2. Controlla: `lib/tiers.ts` per logica tier
3. Testa: Sempre con utente FREE first

**Quando finito MVP**:
1. Tag release: `v1.0.0-mvp`
2. Deploy preview
3. Beta testing

---

**Documento creato**: 26 Dicembre 2025  
**Ultima modifica**: 26 Dicembre 2025  
**Next review**: Fine Settimana 1

🚀 **LET'S BUILD REPING COPILOT!**

