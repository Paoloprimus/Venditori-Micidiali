// lib/response-templates.ts
// Template fissi per risposte (NO LLM Composer)

/**
 * Formatta risultati SQL in risposta utente usando template fissi
 * NO emoji, NO suggerimenti, NO domande
 */
export function formatResponse(sqlResult: any[], userQuery: string): string {
  // Nessun risultato
  if (!sqlResult || sqlResult.length === 0) {
    return 'Nessun risultato trovato.';
  }
  
  const firstRow = sqlResult[0];
  const keys = Object.keys(firstRow);
  
  // 🎯 CASO 1: Aggregazione semplice (COUNT/SUM/AVG) → solo numero
  if (sqlResult.length === 1 && keys.length === 1) {
    const value = Object.values(firstRow)[0];
    
    // Se è un numero con decimali (fatturato)
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return `€${Number(value).toFixed(2)}`;
    }
    
    // Altrimenti solo il valore
    return String(value);
  }
  
  // 🎯 CASO 2: Liste >10 → avviso senza suggerimenti
  if (sqlResult.length > 10) {
    return `Ho trovato ${sqlResult.length} risultati. In chat ti posso elencare solo i primi 10.`;
  }
  
  // 🎯 CASO 3: Top/Ranking con aggregazioni (account_id + sum/count)
  if (firstRow.account_id && (firstRow.sum !== undefined || firstRow.count !== undefined)) {
    const count = sqlResult.length;
    const isSum = firstRow.sum !== undefined;
    
    let response = '';
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const row = sqlResult[i];
      const value = isSum 
        ? `€${Number(row.sum).toFixed(2)}` 
        : `${row.count} visite`;
      
      response += `${i + 1}. [CLIENT:${row.account_id}] - ${value}\n`;
    }
    
    return response.trim();
  }
  
  // 🎯 CASO 4: Lista clienti standard (id, city, tipo_locale, notes)
  if (firstRow.id) {
    const count = sqlResult.length;
    let response = '';
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const row = sqlResult[i];
      
      response += `${i + 1}. [CLIENT:${row.id}]`;
      
      // Mostra solo campi richiesti nella query (intelligente)
      const queryLower = userQuery.toLowerCase();
      const wantsDetails = queryLower.includes('dettagli') || queryLower.includes('completo');
      const wantsNotes = queryLower.includes('note');
      
      // Sempre mostra tipo e città se presenti (info base)
      if (row.tipo_locale) response += ` - ${row.tipo_locale}`;
      if (row.city) response += ` - ${row.city}`;
      
      // Mostra campi aggiuntivi solo se richiesti o se è richiesta dettagliata
      if (wantsDetails || queryLower.includes('fatturato') || queryLower.includes('vendita')) {
        if (row.sum !== undefined) response += ` - €${Number(row.sum).toFixed(2)}`;
        if (row.importo_vendita !== undefined) response += ` - €${Number(row.importo_vendita).toFixed(2)}`;
      }
      
      if (wantsDetails || queryLower.includes('visite') || queryLower.includes('visit')) {
        if (row.count !== undefined) response += ` - ${row.count} visite`;
        if (row.data_visita) response += ` - ${new Date(row.data_visita).toLocaleDateString('it-IT')}`;
      }
      
      // ✅ Mostra notes solo se richieste esplicitamente
      if (wantsNotes && row.notes) {
        response += `\n   Note: ${row.notes}`;
      }
      
      response += '\n';
    }
    
    return response.trim();
  }
  
  // 🎯 CASO 5: Dati generici (fallback)
  const count = sqlResult.length;
  let response = '';
  
  for (let i = 0; i < Math.min(count, 10); i++) {
    const row = sqlResult[i];
    const values = Object.values(row).join(' - ');
    response += `${i + 1}. ${values}\n`;
  }
  
  return response.trim();
}
