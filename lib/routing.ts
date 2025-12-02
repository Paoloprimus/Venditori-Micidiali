/**
 * ROUTING SERVICE
 * 
 * Calcola distanze stradali REALI usando OSRM (Open Source Routing Machine)
 * Basato su OpenStreetMap - gratuito e senza limiti stringenti
 * 
 * API: http://router.project-osrm.org/route/v1/driving/{coords}
 * 
 * NOTA: Per produzione potrebbe servire un server OSRM dedicato
 * o passare a OpenRouteService/GraphHopper per limiti più alti
 */

export type RouteResult = {
  distanceKm: number;      // Distanza stradale in km
  durationMinutes: number; // Tempo stimato in minuti
  success: boolean;
  error?: string;
};

export type MultiRouteResult = {
  totalKm: number;
  totalMinutes: number;
  legs: Array<{
    from: string;
    to: string;
    distanceKm: number;
    durationMinutes: number;
  }>;
  success: boolean;
  error?: string;
};

// Cache semplice per evitare chiamate ripetute
const routeCache = new Map<string, RouteResult>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore
const cacheTimestamps = new Map<string, number>();

function getCacheKey(lat1: number, lon1: number, lat2: number, lon2: number): string {
  // Arrotonda a 4 decimali (~11m precisione) per cache hit migliori
  return `${lat1.toFixed(4)},${lon1.toFixed(4)}-${lat2.toFixed(4)},${lon2.toFixed(4)}`;
}

/**
 * Calcola distanza stradale tra due punti usando OSRM
 */
export async function getRouteDistance(
  fromLat: number, fromLon: number,
  toLat: number, toLon: number
): Promise<RouteResult> {
  const cacheKey = getCacheKey(fromLat, fromLon, toLat, toLon);
  
  // Check cache
  const cached = routeCache.get(cacheKey);
  const cachedTime = cacheTimestamps.get(cacheKey);
  if (cached && cachedTime && Date.now() - cachedTime < CACHE_TTL) {
    return cached;
  }

  try {
    // OSRM usa formato: lon,lat (non lat,lon!)
    const coords = `${fromLon},${fromLat};${toLon},${toLat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'REPING-App/1.0',
      },
    });

    if (!response.ok) {
      console.error('[Routing] HTTP error:', response.status);
      return { distanceKm: 0, durationMinutes: 0, success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes?.[0]) {
      console.warn('[Routing] No route found:', data.code);
      return { distanceKm: 0, durationMinutes: 0, success: false, error: data.code };
    }

    const route = data.routes[0];
    const result: RouteResult = {
      distanceKm: Math.round(route.distance / 100) / 10, // metri -> km con 1 decimale
      durationMinutes: Math.round(route.duration / 60),   // secondi -> minuti
      success: true,
    };

    // Cache result
    routeCache.set(cacheKey, result);
    cacheTimestamps.set(cacheKey, Date.now());

    return result;

  } catch (error) {
    console.error('[Routing] Error:', error);
    return { 
      distanceKm: 0, 
      durationMinutes: 0, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Calcola distanza totale per un percorso con più tappe
 * Utile per: casa -> cliente1 -> cliente2 -> ... -> casa
 */
export async function getMultiStopRoute(
  waypoints: Array<{ lat: number; lon: number; name?: string }>
): Promise<MultiRouteResult> {
  if (waypoints.length < 2) {
    return { totalKm: 0, totalMinutes: 0, legs: [], success: false, error: 'Need at least 2 waypoints' };
  }

  const legs: MultiRouteResult['legs'] = [];
  let totalKm = 0;
  let totalMinutes = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    
    const result = await getRouteDistance(from.lat, from.lon, to.lat, to.lon);
    
    if (!result.success) {
      // Continua comunque, segna la tratta come fallita
      legs.push({
        from: from.name ?? `Punto ${i + 1}`,
        to: to.name ?? `Punto ${i + 2}`,
        distanceKm: 0,
        durationMinutes: 0,
      });
      continue;
    }

    legs.push({
      from: from.name ?? `Punto ${i + 1}`,
      to: to.name ?? `Punto ${i + 2}`,
      distanceKm: result.distanceKm,
      durationMinutes: result.durationMinutes,
    });

    totalKm += result.distanceKm;
    totalMinutes += result.durationMinutes;

    // Rate limiting: OSRM pubblico ha limiti, aspetta 100ms tra richieste
    if (i < waypoints.length - 2) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    totalMinutes,
    legs,
    success: legs.some(l => l.distanceKm > 0), // Successo se almeno una tratta ha funzionato
  };
}

/**
 * Calcola distanze da un punto a molti destinazioni (batch)
 * Usa la Table API di OSRM per efficienza
 */
export async function getDistancesToMany(
  from: { lat: number; lon: number },
  destinations: Array<{ id: string; lat: number; lon: number }>
): Promise<Map<string, { distanceKm: number; durationMinutes: number }>> {
  const results = new Map<string, { distanceKm: number; durationMinutes: number }>();

  if (destinations.length === 0) {
    return results;
  }

  // OSRM Table API: calcola matrice distanze in una sola chiamata
  // Limite: ~100 punti per chiamata sul server pubblico
  const batchSize = 50;
  
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    
    try {
      // Costruisci coordinate: origine + destinazioni
      const coords = [
        `${from.lon},${from.lat}`,
        ...batch.map(d => `${d.lon},${d.lat}`)
      ].join(';');

      const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance,duration`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'REPING-App/1.0' },
      });

      if (!response.ok) {
        console.error('[Routing] Table API error:', response.status);
        continue;
      }

      const data = await response.json();

      if (data.code !== 'Ok') {
        console.warn('[Routing] Table API failed:', data.code);
        continue;
      }

      // Estrai distanze e durate
      const distances = data.distances?.[0] ?? [];
      const durations = data.durations?.[0] ?? [];

      for (let j = 0; j < batch.length; j++) {
        const dest = batch[j];
        const distance = distances[j + 1]; // +1 perché indice 0 è l'origine
        const duration = durations[j + 1];

        if (distance != null && duration != null) {
          results.set(dest.id, {
            distanceKm: Math.round(distance / 100) / 10,
            durationMinutes: Math.round(duration / 60),
          });
        }
      }

      // Rate limiting tra batch
      if (i + batchSize < destinations.length) {
        await new Promise(r => setTimeout(r, 200));
      }

    } catch (error) {
      console.error('[Routing] Batch error:', error);
    }
  }

  return results;
}

/**
 * Fallback: distanza in linea d'aria (Haversine)
 * Usato solo se OSRM non risponde
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Raggio Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

