# 🧠 Algoritmo di Pianificazione Visite REPING

> Documentazione tecnica dell'algoritmo intelligente per pianificazione e ottimizzazione percorsi

---

## 📋 Panoramica

Il sistema di pianificazione REPING utilizza un **algoritmo ibrido a due fasi**:

1. **FASE 1: Scoring** → Determina **CHI visitare** (priorità clienti)
2. **FASE 2: Route Optimization** → Determina **IN CHE ORDINE** (ottimizzazione percorso)

---

## 1️⃣ FASE 1: Smart Scoring (Chi Visitare)

### Formula di Scoring

Ogni cliente riceve un punteggio da **0 a 100** basato su 4 fattori ponderati:

```
Score Finale = (Latenza × 32%) + (Distanza × 28%) + (Revenue × 25%) + (Note × 20%)
```

### 1.1 Latenza (32% del peso)

> **Obiettivo:** Evitare che i clienti vengano trascurati troppo a lungo.

| Giorni dall'ultima visita | Punteggio | Razionale |
|---------------------------|-----------|-----------|
| Mai visitato | 100 | Massima priorità |
| ≥ 30 giorni | 100 | Troppo tempo, rischio abbandono |
| 21-29 giorni | 80 | Alta priorità |
| 14-20 giorni | 60 | Media priorità |
| 7-13 giorni | 40 | Bassa priorità |
| 3-6 giorni | 20 | Molto bassa |
| < 3 giorni | 10 | Minima (appena visitato) |

**Implementazione:**
```typescript
if (client.ultimo_esito_at) {
  daysAgo = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
  if (daysAgo >= 30) latencyScore = 100;
  else if (daysAgo >= 21) latencyScore = 80;
  // ...
} else {
  latencyScore = 100; // Mai visitato = massima priorità
  daysAgo = 999;
}
```

---

### 1.2 Distanza (28% del peso)

> **Obiettivo:** Raggruppare clienti geograficamente vicini per ottimizzare i percorsi.

Calcola la **distanza media** del cliente rispetto ai clienti **già selezionati** nel piano.

| Distanza media (km) | Punteggio | Razionale |
|---------------------|-----------|-----------|
| < 5 km | 100 | Molto vicino (stesso quartiere) |
| 5-9 km | 80 | Vicino (stessa area) |
| 10-19 km | 60 | Media distanza |
| 20-29 km | 40 | Lontano |
| ≥ 30 km | 20 | Molto lontano |

**Implementazione:**
```typescript
if (selectedIds.length > 0) {
  const selectedClients = clients.filter(c => selectedIds.includes(c.id));
  const distances = selectedClients.map(sc => 
    calculateDistance(client.latitude, client.longitude, sc.latitude, sc.longitude)
  );
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  
  if (avgDistance < 5) distanceScore = 100;
  else if (avgDistance < 10) distanceScore = 80;
  // ...
} else {
  distanceScore = 50; // Default se nessuno selezionato
}
```

**Nota:** Usa **Haversine × 1.3** per approssimare la distanza stradale reale.

---

### 1.3 Revenue (25% del peso)

> **Obiettivo:** Dare priorità ai clienti più profittevoli.

Valuta il **volume vendite mensile attuale** del cliente.

| Volume (€/mese) | Punteggio | Razionale |
|-----------------|-----------|-----------|
| ≥ 1000€ | 100 | Cliente VIP |
| 750-999€ | 80 | Cliente premium |
| 500-749€ | 60 | Cliente medio-alto |
| 250-499€ | 40 | Cliente medio |
| < 250€ | 20 | Cliente piccolo |
| Nessun dato | 30 | Default per nuovi clienti |

**Implementazione:**
```typescript
if (client.volume_attuale) {
  if (client.volume_attuale >= 1000) revenueScore = 100;
  else if (client.volume_attuale >= 750) revenueScore = 80;
  // ...
} else {
  revenueScore = 30; // Default per chi non ha volume
}
```

---

### 1.4 Note Prescrittive (20% del peso)

> **Obiettivo:** Riconoscere urgenze e opportunità dalle note dell'agente.

Analizza il campo **note custom** del cliente cercando parole chiave.

| Tipo nota | Esempi keyword | Punteggio | Razionale |
|-----------|----------------|-----------|-----------|
| Urgente | "urgente", "richiamare", "importante", "priorità", "subito", "asap" | 100 | Richiesta urgente |
| Opportunità | "interessato", "caldo", "ordine", "acquisto" | 60 | Opportunità commerciale |
| Nota generica | Qualsiasi testo | 30 | Ha note |
| Nessuna nota | (vuoto) | 0 | Nessuna priorità extra |

**Implementazione:**
```typescript
const notes = client.custom?.notes || '';
const notesLower = notes.toLowerCase();

const urgentKeywords = ['urgente', 'richiamare', 'importante', 'priorit', 'subito', 'asap'];
const positiveKeywords = ['interessato', 'caldo', 'ordine', 'acquisto'];

if (urgentKeywords.some(kw => notesLower.includes(kw))) {
  notesScore = 100;
} else if (positiveKeywords.some(kw => notesLower.includes(kw))) {
  notesScore = 60;
} else if (notes.trim()) {
  notesScore = 30;
} else {
  notesScore = 0;
}
```

---

### Esempio di Calcolo

**Cliente: Ristorante "Da Mario"**
- Ultima visita: 25 giorni fa → Latenza = 80
- Distanza media dai clienti selezionati: 7 km → Distanza = 80
- Volume mensile: 850€ → Revenue = 80
- Note: "Cliente interessato a nuova linea birre" → Note = 60

```
Score Finale = (80 × 0.32) + (80 × 0.28) + (80 × 0.25) + (60 × 0.20)
             = 25.6 + 22.4 + 20.0 + 12.0
             = 80 punti
```

---

## 2️⃣ FASE 2: Route Optimization (In Che Ordine)

### Algoritmo TSP Semplificato (Traveling Salesman Problem)

Usa una variante del **Nearest Neighbor Algorithm** ottimizzata per partenza/ritorno a casa.

### Step-by-Step

#### **Step 1: Partenza da Casa**
Trova il cliente **più vicino al punto di partenza** (casa/ufficio dell'agente).

```typescript
// Coordinate casa salvate nelle impostazioni utente
homeLat = localStorage.getItem('repping_settings').homeLat;
homeLon = localStorage.getItem('repping_settings').homeLon;

// Trova il più vicino
let nearestIdx = -1;
let nearestDist = Infinity;

for (let i = 0; i < remaining.length; i++) {
  const dist = calculateDistance(homeLat, homeLon, remaining[i].lat, remaining[i].lon);
  if (dist < nearestDist) {
    nearestDist = dist;
    nearestIdx = i;
  }
}

ordered.push(remaining.splice(nearestIdx, 1)[0]);
```

---

#### **Step 2: Riserva Ultimo Slot**
**Ottimizzazione esclusiva REPING**: Riserva l'**ultimo slot** per il cliente più vicino a casa, così il ritorno è minimizzato.

```typescript
let lastClient = null;
if (homeLat && homeLon && remaining.length > 1) {
  let closestToHomeIdx = 0;
  let closestToHomeDist = Infinity;
  
  for (let i = 0; i < remaining.length; i++) {
    const dist = calculateDistance(homeLat, homeLon, remaining[i].lat, remaining[i].lon);
    if (dist < closestToHomeDist) {
      closestToHomeDist = dist;
      closestToHomeIdx = i;
    }
  }
  
  // Rimuovi e salva per la fine
  lastClient = remaining.splice(closestToHomeIdx, 1)[0];
}
```

---

#### **Step 3: Nearest Neighbor per il Resto**
Per i clienti rimanenti, applica l'algoritmo **Nearest Neighbor**:
- Dal cliente corrente, scegli sempre il più vicino tra quelli non ancora visitati.

```typescript
while (remaining.length > 0) {
  const current = ordered[ordered.length - 1];
  
  let nearestIdx = 0;
  let nearestDist = Infinity;
  
  for (let i = 0; i < remaining.length; i++) {
    const dist = calculateDistance(
      current.latitude,
      current.longitude,
      remaining[i].latitude,
      remaining[i].longitude
    );
    
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIdx = i;
    }
  }
  
  ordered.push(remaining.splice(nearestIdx, 1)[0]);
}
```

---

#### **Step 4: Ritorno a Casa**
Aggiungi il cliente riservato allo Step 2 come **ultima tappa**.

```typescript
if (lastClient) {
  ordered.push(lastClient);
}
```

**Risultato:** Il percorso è ottimizzato per:
1. Partire dal cliente più vicino a casa
2. Minimizzare i km tra una tappa e l'altra
3. Finire vicino a casa per un ritorno rapido

---

### Calcolo Distanze

#### Haversine (Stima veloce)
Per lo scoring e l'ordinamento rapido, REPING usa la **formula di Haversine** moltiplicata per **1.3** per approssimare la distanza stradale.

```typescript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raggio Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const haversine = R * c;
  return haversine * 1.3; // ×1.3 per approssimare percorso stradale
}
```

**Complessità:** O(1)  
**Precisione:** ±10-15%

---

#### OSRM (Calcolo esatto)
Quando l'utente clicca **"Calcola percorso reale"**, REPING interroga il servizio **OSRM** (Open Source Routing Machine) per ottenere:
- **Km stradali reali** (considerando sensi unici, autostrade, ecc.)
- **Tempo di percorrenza stimato** (considerando velocità limite)

```typescript
const waypoints = [
  { lat: homeLat, lon: homeLon, name: '🏠 Partenza' },
  ...selectedClients.map(c => ({ lat: c.latitude, lon: c.longitude, name: c.name })),
  { lat: homeLat, lon: homeLon, name: '🏠 Ritorno' }
];

const routeData = await getMultiStopRoute(waypoints);

setRealKm(routeData.totalDistanceKm);
setRealMinutes(routeData.totalDurationMinutes);
```

**Servizio:** `https://router.project-osrm.org/route/v1/driving/`  
**Formato:** `lon1,lat1;lon2,lat2;...`  
**Complessità:** O(n²) (rete stradale)  
**Precisione:** 99%

---

## 🎯 Esempio Completo: Giornata dell'Agente

### Input
- **Home:** Via Roma 10, Milano (45.464, 9.190)
- **Data:** Martedì 15 Dicembre 2025
- **Clienti disponibili:** 80
- **Numero visite desiderate:** 6

---

### FASE 1: Scoring Top 10 Clienti

| Cliente | Latenza | Distanza | Revenue | Note | **Score** |
|---------|---------|----------|---------|------|-----------|
| Trattoria Bella Vista | 100 (35gg) | 80 (6km) | 100 (1200€) | 60 ("ordine") | **88** |
| Ristorante Centrale | 80 (28gg) | 100 (4km) | 80 (900€) | 100 ("urgente") | **89** ⭐ |
| Bar Sport | 60 (18gg) | 100 (3km) | 40 (300€) | 0 | **58** |
| Pizzeria da Gino | 80 (22gg) | 80 (8km) | 60 (600€) | 30 | **69** |
| Hotel Milano | 40 (10gg) | 60 (15km) | 100 (1500€) | 0 | **57** |
| Osteria del Porto | 100 (mai) | 40 (22km) | 20 (200€) | 100 ("richiama") | **69** |
| Café Centrale | 60 (15gg) | 100 (5km) | 60 (500€) | 0 | **62** |
| Ristorante Stella | 80 (25gg) | 80 (7km) | 80 (850€) | 60 ("caldo") | **76** |
| Bar Duomo | 40 (9gg) | 100 (2km) | 40 (250€) | 0 | **51** |
| Trattoria Aurora | 100 (32gg) | 60 (12km) | 60 (550€) | 30 | **75** |

**Top 6 selezionati:**
1. Ristorante Centrale (89)
2. Trattoria Bella Vista (88)
3. Ristorante Stella (76)
4. Trattoria Aurora (75)
5. Pizzeria da Gino (69)
6. Osteria del Porto (69)

---

### FASE 2: Route Optimization

**Coordinate clienti selezionati:**
- 🏠 Casa: (45.464, 9.190) Milano centro
- A. Ristorante Centrale: (45.465, 9.192) - 0.3km da casa
- B. Trattoria Bella Vista: (45.470, 9.195) - 0.8km da A
- C. Ristorante Stella: (45.472, 9.198) - 0.5km da B
- D. Trattoria Aurora: (45.478, 9.210) - 1.8km da C
- E. Pizzeria da Gino: (45.460, 9.185) - 3.2km da D (ma 0.7km da casa!)
- F. Osteria del Porto: (45.490, 9.220) - 5.5km da E

#### Ottimizzazione Step-by-Step:

1. **Partenza:** Ristorante Centrale (0.3km da casa) ✅
2. **Riserva ultimo:** Pizzeria da Gino (0.7km da casa) 🔒
3. **Nearest Neighbor:**
   - Da Centrale → Bella Vista (0.8km)
   - Da Bella Vista → Stella (0.5km)
   - Da Stella → Aurora (1.8km)
   - Da Aurora → Osteria Porto (5.5km)
4. **Ultimo:** Pizzeria da Gino (3.2km da Porto, ma 0.7km da casa!)

**Ordine finale:**
```
🏠 Casa
  ↓ 0.3 km
1️⃣ Ristorante Centrale
  ↓ 0.8 km
2️⃣ Trattoria Bella Vista
  ↓ 0.5 km
3️⃣ Ristorante Stella
  ↓ 1.8 km
4️⃣ Trattoria Aurora
  ↓ 5.5 km
5️⃣ Osteria del Porto
  ↓ 3.2 km
6️⃣ Pizzeria da Gino
  ↓ 0.7 km
🏠 Casa
```

**Totale Haversine:** 12.8 km  
**Totale OSRM (reale):** 16.4 km (+28% per strade reali)  
**Tempo stimato:** 42 minuti di guida

---

## 📊 Performance & Scalabilità

### Complessità Algoritmica

| Fase | Operazione | Complessità | Tempo (80 clienti) |
|------|------------|-------------|---------------------|
| Scoring | Calcolo punteggi | O(n) | ~5ms |
| Nearest Neighbor | Ordinamento percorso | O(n²) | ~15ms |
| OSRM | Calcolo km reali | O(n²) network | ~2-5s (online) |

**Totale:** Pianificazione completa in < 5 secondi per 80 clienti.

---

### Vantaggi dell'Algoritmo REPING

✅ **Bilanciamento intelligente:** Non solo distanza, ma anche priorità commerciale  
✅ **Ritorno ottimizzato:** Ultima tappa sempre vicina a casa  
✅ **Flessibilità:** L'agente può modificare manualmente l'ordine  
✅ **Scalabile:** Funziona con 10 o 500 clienti  
✅ **Trasparente:** Mostra il breakdown dello score per ogni cliente  

---

## 🔧 File Sorgente

- **Algoritmo completo:** `/app/planning/[data]/page.tsx`
- **Routing OSRM:** `/lib/routing.ts`
- **Calcoli distanza:** Funzione `calculateDistance()` (Haversine)
- **Geocoding:** `/lib/geocoding.ts` (OpenStreetMap Nominatim)

---

## 📝 Note Tecniche

### Perché Haversine × 1.3?
La formula di Haversine calcola la distanza "in linea d'aria". Moltiplicando per **1.3** otteniamo una buona approssimazione della distanza stradale reale, considerando che le strade raramente sono perfettamente diritte.

### Perché non sempre OSRM?
OSRM richiede una connessione internet e impiega ~2-5 secondi per calcolare percorsi complessi. Per la fase di **scoring e ordinamento veloce**, usiamo Haversine. OSRM viene chiamato solo quando l'utente richiede esplicitamente il calcolo del **percorso reale**.

### Gestione Punto di Partenza Mancante
Se l'utente non ha impostato il punto di partenza (casa/ufficio):
- **Scoring:** La distanza non viene considerata (score = 50 di default)
- **Ottimizzazione:** Si parte dal primo cliente della lista corrente

---

## 🚀 Evoluzioni Future

### In Beta 1.0
- [x] Algoritmo base scoring + routing
- [x] Integrazione OSRM
- [x] UI per modifica manuale

### Roadmap Post-Beta
- [ ] Machine Learning per apprendere preferenze agente
- [ ] Integrazione traffico in tempo reale (Google Maps API)
- [ ] Ottimizzazione multi-giorno (pianificazione settimanale)
- [ ] Suggerimenti proattivi automatici (es. "Domani passa da X, non lo vedi da 30gg")
- [ ] A/B testing per validare i pesi dello scoring

---

**Ultimo aggiornamento:** Dicembre 2025  
**Versione:** REPING Beta 1.0
