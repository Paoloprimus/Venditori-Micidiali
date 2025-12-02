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
    
    default:
      return JSON.stringify(result);
  }
}

