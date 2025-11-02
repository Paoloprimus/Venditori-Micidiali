/**
 * GEOCODING SERVICE
 * 
 * Converte indirizzi in coordinate GPS usando OpenStreetMap Nominatim
 * 
 * LIMITI:
 * - Rate limit: 1 richiesta al secondo
 * - Servizio gratuito, usare con moderazione
 * - Risultati migliori con indirizzi completi italiani
 * 
 * USO:
 * const coords = await geocodeAddress('Via Roma 1', 'Verona');
 * if (coords) {
 *   console.log(coords.latitude, coords.longitude);
 * }
 */

export type GeoCoordinates = {
  latitude: number;
  longitude: number;
  display_name?: string;
};

/**
 * Geocodifica un indirizzo usando OpenStreetMap Nominatim
 * 
 * @param address - Indirizzo completo (es. "Via Roma 1")
 * @param city - Città (es. "Verona")
 * @returns Coordinate GPS o null se non trovate
 */
export async function geocodeAddress(
  address: string,
  city: string
): Promise<GeoCoordinates | null> {
  try {
    // Costruisci query completa
    const fullAddress = `${address}, ${city}, Italia`;
    
    // URL encode
    const query = encodeURIComponent(fullAddress);
    
    // Chiama Nominatim API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=1&countrycodes=it`;
    
    console.log('[Geocoding] Query:', fullAddress);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'REPING-App/1.0', // Required by Nominatim
      },
    });
    
    if (!response.ok) {
      console.error('[Geocoding] HTTP error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.warn('[Geocoding] Nessun risultato per:', fullAddress);
      return null;
    }
    
    const result = data[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('[Geocoding] Coordinate invalide:', result);
      return null;
    }
    
    console.log('[Geocoding] ✅ Trovato:', {
      latitude,
      longitude,
      display_name: result.display_name,
    });
    
    return {
      latitude,
      longitude,
      display_name: result.display_name,
    };
    
  } catch (error) {
    console.error('[Geocoding] Errore:', error);
    return null;
  }
}

/**
 * Geocodifica con rate limiting (max 1 req/sec per Nominatim)
 * 
 * @param address - Indirizzo completo
 * @param city - Città
 * @param delayMs - Delay tra richieste (default 1100ms)
 * @returns Coordinate GPS o null
 */
export async function geocodeAddressWithDelay(
  address: string,
  city: string,
  delayMs: number = 1100
): Promise<GeoCoordinates | null> {
  const result = await geocodeAddress(address, city);
  
  // Aspetta prima della prossima richiesta (rate limit Nominatim)
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  return result;
}

/**
 * Batch geocoding con progress callback
 * 
 * @param addresses - Array di { address, city }
 * @param onProgress - Callback chiamato ad ogni indirizzo processato
 * @returns Array di risultati (null se non trovato)
 */
export async function geocodeBatch(
  addresses: Array<{ address: string; city: string }>,
  onProgress?: (index: number, total: number, result: GeoCoordinates | null) => void
): Promise<Array<GeoCoordinates | null>> {
  const results: Array<GeoCoordinates | null> = [];
  
  for (let i = 0; i < addresses.length; i++) {
    const { address, city } = addresses[i];
    const result = await geocodeAddressWithDelay(address, city);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, addresses.length, result);
    }
  }
  
  return results;
}
