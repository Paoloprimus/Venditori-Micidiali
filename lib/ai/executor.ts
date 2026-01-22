// lib/ai/executor.ts
// Esecuzione dei tool calls e formattazione risultati
// Estratto da app/api/messages/send/route.ts per mantenibilità

import { SupabaseClient } from "@supabase/supabase-js";

// ==================== TOOL IMPLEMENTATIONS ====================

export async function executeFunction(
  name: string, 
  args: Record<string, any>, 
  userId: string,
  supabase: SupabaseClient
): Promise<any> {
  
  switch (name) {
    case "search_clients": {
      let query = supabase
        .from("accounts")
        .select(args.count_only ? "id" : "id, city, tipo_locale, notes")
        .eq("user_id", userId);
      
      // "Inizia con" per evitare falsi positivi (es: "Verona" non trova "Villafranca di Verona")
      if (args.city) query = query.ilike("city", `${args.city}%`);
      if (args.tipo_locale) query = query.ilike("tipo_locale", `%${args.tipo_locale}%`);
      if (args.notes_contain) query = query.ilike("notes", `%${args.notes_contain}%`);
      
      const limit = Math.min(args.limit || 10, 100);
      query = query.limit(limit);
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (args.count_only) {
        return { count: data?.length || 0, ids: data?.map((d: any) => d.id) || [] };
      }
      return { clients: data || [], count: data?.length || 0 };
    }
    
    case "search_in_notes": {
      let query = supabase
        .from("accounts")
        .select("id, city, tipo_locale, notes")
        .eq("user_id", userId)
        .ilike("notes", `%${args.search_text}%`);
      
      if (args.client_city) query = query.ilike("city", `${args.client_city}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { found: false, message: `Nessuna nota trovata con "${args.search_text}"` };
      }
      
      // Estrai snippet rilevanti dalle note
      const results = data.map((c: any) => {
        const notes = c.notes || "";
        // Trova la frase che contiene il termine cercato
        const sentences = notes.split(/[.!?]+/);
        const relevant = sentences.find((s: string) => 
          s.toLowerCase().includes(args.search_text.toLowerCase())
        );
        return {
          client_id: c.id,
          city: c.city,
          tipo: c.tipo_locale,
          snippet: relevant?.trim() || notes.substring(0, 100)
        };
      });
      
      return { found: true, results, count: results.length };
    }
    
    case "get_visits": {
      let query = supabase
        .from("visits")
        .select("id, account_id, data_visita, tipo, esito, importo_vendita, prodotti_discussi")
        .eq("user_id", userId)
        .order("data_visita", { ascending: false });
      
      if (args.client_id) query = query.eq("account_id", args.client_id);
      
      if (args.period) {
        const now = new Date();
        let fromDate: Date;
        switch (args.period) {
          case "today": fromDate = new Date(now.toDateString()); break;
          case "week": fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case "month": fromDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
          case "year": fromDate = new Date(now.getFullYear(), 0, 1); break;
          default: fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
      }
      
      const limit = Math.min(args.limit || 10, 50);
      query = query.limit(limit);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return { visits: data || [], count: data?.length || 0 };
    }
    
    case "get_sales_summary": {
      const now = new Date();
      let fromDate: Date;
      let periodLabel: string;
      
      switch (args.period || "month") {
        case "today": 
          fromDate = new Date(now.toDateString()); 
          periodLabel = "oggi";
          break;
        case "week": 
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          periodLabel = "questa settimana";
          break;
        case "year": 
          fromDate = new Date(now.getFullYear(), 0, 1);
          periodLabel = "quest'anno";
          break;
        default: 
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "questo mese";
      }
      
      let query = supabase
        .from("visits")
        .select("importo_vendita")
        .eq("user_id", userId)
        .gte("data_visita", fromDate.toISOString().split('T')[0]);
      
      if (args.client_id) query = query.eq("account_id", args.client_id);
      
      const { data, error } = await query;
      if (error) throw error;
      
      const total = (data || []).reduce((sum: number, v: any) => sum + (v.importo_vendita || 0), 0);
      const orderCount = (data || []).filter((v: any) => v.importo_vendita > 0).length;
      
      return { total, orderCount, period: periodLabel };
    }
    
    case "navigate_to_page": {
      const pages: Record<string, { url: string; name: string }> = {
        clients: { url: "/clients", name: "Lista Clienti" },
        visits: { url: "/visits", name: "Lista Visite" },
        products: { url: "/products", name: "Prodotti" },
        documents: { url: "/documents", name: "Documenti" },
        settings: { url: "/settings", name: "Impostazioni" }
      };
      return pages[args.page] || { url: "/", name: "Home" };
    }
    
    case "get_visit_by_position": {
      const now = new Date();
      let targetDate: string;
      
      switch (args.day) {
        case "yesterday":
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          targetDate = yesterday.toISOString().split('T')[0];
          break;
        case "tomorrow":
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          targetDate = tomorrow.toISOString().split('T')[0];
          break;
        default: // today
          targetDate = now.toISOString().split('T')[0];
      }
      
      // Prendi tutte le visite del giorno ordinate per orario
      const { data, error } = await supabase
        .from("visits")
        .select("id, account_id, data_visita, tipo, esito, importo_vendita, prodotti_discussi, notes, created_at")
        .eq("user_id", userId)
        .eq("data_visita", targetDate)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      if (!data || data.length === 0) {
        return { found: false, message: `Nessuna visita trovata per ${args.day === 'yesterday' ? 'ieri' : args.day === 'tomorrow' ? 'domani' : 'oggi'}` };
      }
      
      const position = args.position - 1; // 0-indexed
      if (position < 0 || position >= data.length) {
        return { found: false, message: `Hai solo ${data.length} visite ${args.day === 'yesterday' ? 'ieri' : args.day === 'tomorrow' ? 'domani' : 'oggi'}` };
      }
      
      const visit = data[position];
      
      // Prendi anche le note del cliente
      const { data: clientData } = await supabase
        .from("accounts")
        .select("city, tipo_locale, notes")
        .eq("id", visit.account_id)
        .single();
      
      return {
        found: true,
        position: args.position,
        day: args.day,
        visit: {
          client_id: visit.account_id,
          client_city: clientData?.city,
          client_tipo: clientData?.tipo_locale,
          client_notes: clientData?.notes,
          visit_tipo: visit.tipo,
          esito: visit.esito,
          importo: visit.importo_vendita,
          prodotti: visit.prodotti_discussi,
          visit_notes: visit.notes
        }
      };
    }
    
    case "search_visits_by_product": {
      let query = supabase
        .from("visits")
        .select("id, account_id, data_visita, tipo, esito, importo_vendita, prodotti_discussi")
        .eq("user_id", userId)
        .ilike("prodotti_discussi", `%${args.product}%`)
        .order("data_visita", { ascending: false });
      
      if (args.day) {
        const now = new Date();
        let fromDate: Date;
        switch (args.day) {
          case "today":
            fromDate = new Date(now.toDateString());
            break;
          case "yesterday":
            fromDate = new Date(now);
            fromDate.setDate(fromDate.getDate() - 1);
            query = query.eq("data_visita", fromDate.toISOString().split('T')[0]);
            break;
          case "week":
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
            break;
          default:
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
        }
      }
      
      const { data, error } = await query.limit(10);
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { found: false, message: `Nessuna visita trovata con prodotto "${args.product}"` };
      }
      
      return {
        found: true,
        product: args.product,
        visits: data.map((v: any) => ({
          client_id: v.account_id,
          date: v.data_visita,
          importo: v.importo_vendita,
          prodotti: v.prodotti_discussi
        })),
        count: data.length
      };
    }
    
    case "generate_pdf_report": {
      // Restituisce un comando speciale che il frontend intercetterà
      const filters: Record<string, string> = {};
      if (args.city_filter) filters.city = args.city_filter;
      if (args.tipo_filter) filters.tipo = args.tipo_filter;
      if (args.period) filters.period = args.period;
      
      return {
        action: "GENERATE_PDF",
        report_type: args.report_type,
        filters,
      };
    }
    
    // 🆕 ANALYTICS TOOLS
    case "get_top_clients": {
      const now = new Date();
      let fromDate: Date;
      let periodLabel: string;
      
      switch (args.period || "month") {
        case "quarter":
          fromDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          periodLabel = "questo trimestre";
          break;
        case "year":
          fromDate = new Date(now.getFullYear(), 0, 1);
          periodLabel = "quest'anno";
          break;
        default:
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "questo mese";
      }
      
      // Get visits with sales in the period
      const { data: visits, error } = await supabase
        .from("visits")
        .select("account_id, importo_vendita")
        .eq("user_id", userId)
        .gte("data_visita", fromDate.toISOString().split('T')[0])
        .gt("importo_vendita", 0);
      
      if (error) throw error;
      
      // Aggregate by client
      const clientSales: Record<string, { total: number; count: number }> = {};
      for (const v of visits || []) {
        if (!clientSales[v.account_id]) {
          clientSales[v.account_id] = { total: 0, count: 0 };
        }
        clientSales[v.account_id].total += v.importo_vendita || 0;
        clientSales[v.account_id].count++;
      }
      
      // Sort and limit
      const sorted = Object.entries(clientSales)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, args.limit || 10);
      
      // Get client details
      const clientIds = sorted.map(([id]) => id);
      const { data: clients } = await supabase
        .from("accounts")
        .select("id, city, tipo_locale")
        .in("id", clientIds);
      
      const clientMap = new Map((clients || []).map(c => [c.id, c]));
      
      return {
        period: periodLabel,
        clients: sorted.map(([id, stats], idx) => ({
          position: idx + 1,
          client_id: id,
          city: clientMap.get(id)?.city || "",
          tipo: clientMap.get(id)?.tipo_locale || "",
          total: stats.total,
          orderCount: stats.count
        }))
      };
    }
    
    case "get_top_products": {
      const now = new Date();
      let fromDate: Date;
      let periodLabel: string;
      
      switch (args.period || "month") {
        case "quarter":
          fromDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          periodLabel = "questo trimestre";
          break;
        case "year":
          fromDate = new Date(now.getFullYear(), 0, 1);
          periodLabel = "quest'anno";
          break;
        default:
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "questo mese";
      }
      
      // Get visits with products
      const { data: visits, error } = await supabase
        .from("visits")
        .select("prodotti_discussi, importo_vendita")
        .eq("user_id", userId)
        .gte("data_visita", fromDate.toISOString().split('T')[0])
        .not("prodotti_discussi", "is", null);
      
      if (error) throw error;
      
      // Aggregate by product
      const productSales: Record<string, { count: number; revenue: number }> = {};
      for (const v of visits || []) {
        const products = (v.prodotti_discussi || "").split(/[,;]+/).map((p: string) => p.trim().toLowerCase()).filter(Boolean);
        const revenuePerProduct = products.length > 0 ? (v.importo_vendita || 0) / products.length : 0;
        
        for (const product of products) {
          if (!productSales[product]) {
            productSales[product] = { count: 0, revenue: 0 };
          }
          productSales[product].count++;
          productSales[product].revenue += revenuePerProduct;
        }
      }
      
      // Sort and limit
      const sorted = Object.entries(productSales)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, args.limit || 10);
      
      return {
        period: periodLabel,
        products: sorted.map(([name, stats], idx) => ({
          position: idx + 1,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          mentions: stats.count,
          estimatedRevenue: Math.round(stats.revenue)
        }))
      };
    }
    
    case "get_best_selling_day": {
      const now = new Date();
      let fromDate: Date;
      let periodLabel: string;
      
      switch (args.period || "month") {
        case "quarter":
          fromDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          periodLabel = "questo trimestre";
          break;
        case "year":
          fromDate = new Date(now.getFullYear(), 0, 1);
          periodLabel = "quest'anno";
          break;
        default:
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "questo mese";
      }
      
      // Get visits
      const { data: visits, error } = await supabase
        .from("visits")
        .select("data_visita, importo_vendita")
        .eq("user_id", userId)
        .gte("data_visita", fromDate.toISOString().split('T')[0])
        .gt("importo_vendita", 0);
      
      if (error) throw error;
      
      // Aggregate by day of week
      const dayNames = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
      const daySales: Record<number, { total: number; count: number }> = {};
      
      for (const v of visits || []) {
        const date = new Date(v.data_visita);
        const dayOfWeek = date.getDay();
        
        if (!daySales[dayOfWeek]) {
          daySales[dayOfWeek] = { total: 0, count: 0 };
        }
        daySales[dayOfWeek].total += v.importo_vendita || 0;
        daySales[dayOfWeek].count++;
      }
      
      // Sort by total
      const sorted = Object.entries(daySales)
        .map(([day, stats]) => ({
          dayOfWeek: parseInt(day),
          dayName: dayNames[parseInt(day)],
          total: stats.total,
          count: stats.count,
          average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0
        }))
        .sort((a, b) => b.total - a.total);
      
      return {
        period: periodLabel,
        days: sorted,
        bestDay: sorted[0]?.dayName || "N/A"
      };
    }
    
    case "get_zone_performance": {
      const now = new Date();
      let fromDate: Date;
      let periodLabel: string;
      
      switch (args.period || "month") {
        case "quarter":
          fromDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          periodLabel = "questo trimestre";
          break;
        case "year":
          fromDate = new Date(now.getFullYear(), 0, 1);
          periodLabel = "quest'anno";
          break;
        default:
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "questo mese";
      }
      
      // Get visits with sales
      const { data: visits, error: vError } = await supabase
        .from("visits")
        .select("account_id, importo_vendita")
        .eq("user_id", userId)
        .gte("data_visita", fromDate.toISOString().split('T')[0])
        .gt("importo_vendita", 0);
      
      if (vError) throw vError;
      
      // Get client cities
      const accountIds = [...new Set((visits || []).map(v => v.account_id))];
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, city")
        .in("id", accountIds);
      
      const accountCityMap = new Map((accounts || []).map(a => [a.id, a.city]));
      
      // Aggregate by city
      const citySales: Record<string, { total: number; count: number }> = {};
      for (const v of visits || []) {
        const city = accountCityMap.get(v.account_id) || "Sconosciuta";
        if (!citySales[city]) {
          citySales[city] = { total: 0, count: 0 };
        }
        citySales[city].total += v.importo_vendita || 0;
        citySales[city].count++;
      }
      
      // Sort by total
      const sorted = Object.entries(citySales)
        .map(([city, stats]) => ({
          city,
          total: stats.total,
          count: stats.count
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      
      return {
        period: periodLabel,
        zones: sorted,
        bestZone: sorted[0]?.city || "N/A"
      };
    }

    // 🆕 WRITE TOOLS
    case "create_client": {
      const { name, city, tipo_locale, notes } = args;
      if (!name) return { error: "Nome cliente obbligatorio" };
      
      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: userId,
          name: name,
          city: city || null,
          tipo_locale: tipo_locale || null,
          notes: notes || null,
        })
        .select("id, name")
        .single();
      
      if (error) return { error: `Errore creazione: ${error.message}` };
      return { success: true, client: data, message: `Cliente "${name}" creato` };
    }

    case "register_visit": {
      const { client_name, tipo, esito, importo, note, prodotti } = args;
      if (!client_name) return { error: "Nome cliente obbligatorio" };
      
      // Trova il cliente per nome (case insensitive)
      const { data: clients } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("user_id", userId)
        .ilike("name", `%${client_name}%`)
        .limit(1);
      
      if (!clients || clients.length === 0) {
        return { error: `Cliente "${client_name}" non trovato` };
      }
      
      const client = clients[0];
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("visits")
        .insert({
          user_id: userId,
          account_id: client.id,
          data_visita: today,
          tipo: tipo || "visita",
          esito: esito || null,
          importo_vendita: importo || 0,
          note: note || null,
          prodotti_discussi: prodotti || null,
        })
        .select("id")
        .single();
      
      if (error) return { error: `Errore registrazione: ${error.message}` };
      return { 
        success: true, 
        visit_id: data.id,
        client_name: client.name,
        message: `Visita a "${client.name}" registrata` 
      };
    }

    case "add_note_to_client": {
      const { client_name, note } = args;
      if (!client_name || !note) return { error: "Nome cliente e nota obbligatori" };
      
      // Trova il cliente
      const { data: clients } = await supabase
        .from("accounts")
        .select("id, name, notes")
        .eq("user_id", userId)
        .ilike("name", `%${client_name}%`)
        .limit(1);
      
      if (!clients || clients.length === 0) {
        return { error: `Cliente "${client_name}" non trovato` };
      }
      
      const client = clients[0];
      const existingNotes = client.notes || "";
      const timestamp = new Date().toLocaleDateString("it-IT");
      const newNotes = existingNotes 
        ? `${existingNotes}\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;
      
      const { error } = await supabase
        .from("accounts")
        .update({ notes: newNotes })
        .eq("id", client.id);
      
      if (error) return { error: `Errore aggiunta nota: ${error.message}` };
      return { 
        success: true, 
        client_name: client.name,
        message: `Nota aggiunta a "${client.name}"` 
      };
    }
    
    default:
      return { error: "Funzione non trovata" };
  }
}

// ==================== FORMAT RESPONSE ====================

export function formatToolResult(name: string, result: any): string {
  switch (name) {
    case "search_clients": {
      if (result.count === 0) return "Nessun cliente trovato.";
      if (result.clients) {
        // Lista clienti
        const lines = result.clients.slice(0, 10).map((c: any, i: number) => {
          let line = `${i + 1}. [CLIENT:${c.id}]`;
          if (c.tipo_locale) line += ` - ${c.tipo_locale}`;
          if (c.city) line += ` - ${c.city}`;
          return line;
        });
        return lines.join("\n") + (result.count > 10 ? `\n\n...e altri ${result.count - 10}` : "");
      }
      // Solo count
      return `${result.count}`;
    }
    
    case "get_visits": {
      if (result.count === 0) return "Nessuna visita trovata.";
      const lines = result.visits.slice(0, 10).map((v: any, i: number) => {
        const data = new Date(v.data_visita).toLocaleDateString("it-IT");
        let line = `${i + 1}. ${data} - [CLIENT:${v.account_id}] - ${v.tipo || "visita"}`;
        if (v.importo_vendita) line += ` - €${v.importo_vendita}`;
        return line;
      });
      return lines.join("\n");
    }
    
    case "get_sales_summary": {
      if (result.total === 0) return `Nessuna vendita ${result.period}.`;
      return `**€${result.total.toLocaleString("it-IT")}** ${result.period} (${result.orderCount} ordini)`;
    }
    
    case "navigate_to_page": {
      return `📂 **${result.name}**\n\n👉 [Clicca qui per aprire](${result.url})`;
    }
    
    case "search_in_notes": {
      if (!result.found) return result.message;
      const lines = result.results.slice(0, 5).map((r: any, i: number) => {
        let line = `${i + 1}. [CLIENT:${r.client_id}]`;
        if (r.city) line += ` (${r.city})`;
        line += `\n   📝 "${r.snippet}"`;
        return line;
      });
      return lines.join("\n\n");
    }
    
    case "get_visit_by_position": {
      if (!result.found) return result.message;
      const v = result.visit;
      const dayLabel = result.day === 'yesterday' ? 'ieri' : result.day === 'tomorrow' ? 'domani' : 'oggi';
      let text = `**Visita #${result.position} di ${dayLabel}:**\n\n`;
      text += `👤 [CLIENT:${v.client_id}]`;
      if (v.client_city) text += ` - ${v.client_city}`;
      if (v.client_tipo) text += ` (${v.client_tipo})`;
      text += '\n';
      if (v.esito) text += `📋 Esito: ${v.esito}\n`;
      if (v.importo) text += `💰 Importo: €${v.importo}\n`;
      if (v.prodotti) text += `📦 Prodotti: ${v.prodotti}\n`;
      if (v.client_notes) text += `\n📝 Note cliente: ${v.client_notes}`;
      return text;
    }
    
    case "search_visits_by_product": {
      if (!result.found) return result.message;
      let text = `Trovate **${result.count}** visite con "${result.product}":\n\n`;
      result.visits.slice(0, 5).forEach((v: any, i: number) => {
        const date = new Date(v.date).toLocaleDateString('it-IT');
        text += `${i + 1}. [CLIENT:${v.client_id}] - ${date}`;
        if (v.importo) text += ` - €${v.importo}`;
        text += '\n';
      });
      return text;
    }
    
    case "generate_pdf_report": {
      // Marker speciale che il frontend intercetta
      const filterDesc = Object.entries(result.filters || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || 'nessuno';
      
      return `[PDF_COMMAND:${JSON.stringify(result)}]\n\n📄 **Report PDF pronto!**\n\nTipo: ${result.report_type}\nFiltri: ${filterDesc}\n\n👉 Clicca il pulsante qui sotto per scaricare il PDF.`;
    }
    
    // 🆕 ANALYTICS FORMATTERS
    case "get_top_clients": {
      if (!result.clients || result.clients.length === 0) {
        return `Nessun cliente con vendite ${result.period}.`;
      }
      let text = `🏆 **Top ${result.clients.length} clienti** (${result.period}):\n\n`;
      result.clients.forEach((c: any) => {
        text += `${c.position}. [CLIENT:${c.client_id}]`;
        if (c.tipo) text += ` - ${c.tipo}`;
        if (c.city) text += ` - ${c.city}`;
        text += `\n   💰 €${c.total.toLocaleString('it-IT')} (${c.orderCount} ordini)\n\n`;
      });
      return text;
    }
    
    case "get_top_products": {
      if (!result.products || result.products.length === 0) {
        return `Nessun prodotto registrato ${result.period}.`;
      }
      let text = `📦 **Top ${result.products.length} prodotti** (${result.period}):\n\n`;
      result.products.forEach((p: any) => {
        text += `${p.position}. **${p.name}**\n`;
        text += `   📊 ${p.mentions} menzioni - ~€${p.estimatedRevenue.toLocaleString('it-IT')} stimati\n\n`;
      });
      return text;
    }
    
    case "get_best_selling_day": {
      if (!result.days || result.days.length === 0) {
        return `Nessun dato vendite ${result.period}.`;
      }
      let text = `📅 **Analisi vendite per giorno** (${result.period}):\n\n`;
      text += `🏆 Il tuo giorno migliore è **${result.bestDay}**!\n\n`;
      result.days.forEach((d: any, idx: number) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "  ";
        text += `${medal} **${d.dayName}**: €${d.total.toLocaleString('it-IT')} (${d.count} ordini, media €${d.average})\n`;
      });
      return text;
    }
    
    case "get_zone_performance": {
      if (!result.zones || result.zones.length === 0) {
        return `Nessun dato per zona ${result.period}.`;
      }
      let text = `🗺️ **Performance per zona** (${result.period}):\n\n`;
      text += `🏆 La tua zona migliore è **${result.bestZone}**!\n\n`;
      result.zones.forEach((z: any, idx: number) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
        text += `${medal} **${z.city}**: €${z.total.toLocaleString('it-IT')} (${z.count} ordini)\n`;
      });
      return text;
    }

    // 🆕 WRITE TOOLS formatters
    case "create_client": {
      if (result.error) return `❌ ${result.error}`;
      return `✅ **${result.message}**\n\nIl cliente è stato aggiunto al tuo database.`;
    }

    case "register_visit": {
      if (result.error) return `❌ ${result.error}`;
      return `✅ **${result.message}**\n\nLa visita è stata registrata.`;
    }

    case "add_note_to_client": {
      if (result.error) return `❌ ${result.error}`;
      return `✅ **${result.message}**`;
    }
    
    default:
      return JSON.stringify(result);
  }
}

