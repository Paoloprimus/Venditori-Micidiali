/**
 * API: Seed Demo Data
 * POST /api/demo/seed
 * 
 * Inserisce dati fake per permettere all'utente di testare l'app.
 * Tutti i dati sono marcati con custom: { is_demo: true } per poterli cancellare.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 10 clienti fake (basati su clienti-test-sporchi.csv)
const DEMO_CLIENTS = [
  { name: "Bar Sport", contact_name: "Giuseppe Bianchi", phone: "+39 349 123 4567", email: "barsport@libero.it", address: "Via Garibaldi 45", city: "Verona", type: "Bar", notes: "Paga sempre in contanti" },
  { name: "Pizzeria da Gino", contact_name: "Mario Rossi", phone: "+39 349 876 5432", email: null, address: "Piazza Dante 12", city: "Brescia", type: "Pizzeria", notes: "Allergico glutine il titolare" },
  { name: "Ristorante La Pergola", contact_name: "Anna Verdi", phone: "+39 02 123 4567", email: "lapergola@pec.it", address: "Via Roma 123", city: "Milano", type: "Ristorante", notes: "Chiuso lunedì" },
  { name: "Enoteca Il Grappolo", contact_name: "Franco Neri", phone: "+39 347 987 6543", email: "grappolo@gmail.com", address: "Corso Italia 78", city: "Bergamo", type: "Enoteca", notes: "Specializzato in vini locali" },
  { name: "Hotel Bellavista", contact_name: "Reception", phone: "+39 045 555 1234", email: "info@hotelbellavista.com", address: "Lungolago Mazzini 5", city: "Peschiera del Garda", type: "Hotel", notes: "Prenotare sempre prima" },
  { name: "Trattoria Nonna Maria", contact_name: "Maria Bianchi", phone: "+39 333 111 2222", email: null, address: "Vicolo Stretto 3", city: "Verona", type: "Trattoria", notes: "Solo pranzo" },
  { name: "Pub The Lion", contact_name: "Jack Smith", phone: "+39 338 999 8877", email: "thelion@hotmail.com", address: "Via Mazzini 90", city: "Padova", type: "Pub", notes: "Birre artigianali" },
  { name: "Caffè Centrale", contact_name: "Luisa Bruni", phone: "+39 320 999 8887", email: "caffe.centrale@yahoo.it", address: "Piazza Bra 1", city: "Verona", type: "Bar", notes: "Aperitivi dalle 18" },
  { name: "Gelateria Il Cono", contact_name: "Famiglia Gelati", phone: null, email: "gelateria.cono@tiscali.it", address: "Viale Trieste 22", city: "Trento", type: "Gelateria", notes: "Chiuso in inverno" },
  { name: "Bar Tabacchi Fortuna", contact_name: "Sig. Neri", phone: "+39 349 000 1111", email: null, address: "Corso Vittorio Emanuele 156", city: "Torino", type: "Bar", notes: "Slot machines" },
];

// Esiti possibili per le visite
const ESITI = ["Interessato", "Ordine effettuato", "Da ricontattare", "Non interessato", "Preventivo richiesto"];
const PRODOTTI = ["Vino rosso", "Birra artigianale", "Caffè", "Cornetti", "Prosecco", "Amaro", "Gin", "Rum"];
const PROSSIME_AZIONI = ["Inviare catalogo", "Portare campioni", "Richiamare", "Preparare offerta", "Visita di follow-up"];

// Genera data casuale negli ultimi N giorni
function randomDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString().split("T")[0];
}

// Genera un importo casuale
function randomAmount(): number {
  const amounts = [0, 0, 0, 150, 280, 450, 620, 890, 1200, 1500];
  return amounts[Math.floor(Math.random() * amounts.length)];
}

// Genera note per visita
function generateVisitNote(client: typeof DEMO_CLIENTS[0], esito: string): string {
  const notes = [
    `Incontrato ${client.contact_name}. ${esito === "Ordine effettuato" ? "Ha ordinato la solita fornitura." : "Interessato ai nuovi prodotti."}`,
    `${client.contact_name} era disponibile. Discusso di nuove offerte.`,
    `Passato al ${client.name}. ${esito === "Non interessato" ? "Momento non favorevole." : "Buon feedback."}`,
    `Visita positiva. ${client.contact_name} vuole vedere il catalogo aggiornato.`,
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

// Genera note per il cliente
const CLIENT_NOTES = [
  "Preferisce le consegne il martedì mattina",
  "Pagamento a 30 giorni fine mese",
  "Interessato a prodotti biologici",
  "Ha due figli che aiutano nel locale",
  "Chiede sempre lo sconto del 5%",
  "Cliente storico, molto affidabile",
  "Preferisce essere contattato via WhatsApp",
  "Locale con dehor estivo, aumenta ordini in estate",
  "Cerca fornitori locali",
  "Ha cambiato gestione recentemente",
];

export async function POST(req: NextRequest) {
  // Prendi userId dal body (passato dal client dopo creazione utente)
  let userId: string;
  try {
    const body = await req.json();
    userId = body.userId;
  } catch {
    return NextResponse.json({ error: "Missing userId in body" }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Usa admin client per bypassare RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  console.log("[Demo Seed] Starting seed for user:", userId);
  
  // Helper per insert via REST API (bypassa trigger)
  async function insertViaRest(table: string, data: Record<string, any>) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || res.statusText);
    }
    return res.json();
  }
  
  // Usa userId dal body invece di user.id
  const user = { id: userId };

  try {
    const results = {
      clients: 0,
      visits: 0,
      notes: 0,
      errors: [] as string[],
    };

    // 1. Inserisci clienti demo
    const insertedClients: { id: string; data: typeof DEMO_CLIENTS[0] }[] = [];
    
    for (const client of DEMO_CLIENTS) {
      try {
        console.log("[Demo Seed] Inserting client:", client.name);
        
        // Usa SOLO le colonne che esistono nel DB:
        // - name (in chiaro, per dati demo)
        // - city (in chiaro)
        // - tipo_locale (in chiaro, NON 'type')
        // - notes (in chiaro)
        // - custom (JSONB con is_demo flag)
        // Usa REST API diretto per bypassare trigger/RLS
        const insertData = {
          user_id: user.id,
          name: client.name,
          city: client.city,
          tipo_locale: client.type,
          notes: client.notes,
          custom: { 
            is_demo: true,
            address: client.address,
            contact_name: client.contact_name,
            phone: client.phone,
            email: client.email,
          },
        };

        let inserted: { id: string };
        try {
          const result = await insertViaRest("accounts", insertData);
          inserted = Array.isArray(result) ? result[0] : result;
        } catch (error: any) {
          console.error("[Demo Seed] Errore insert client:", client.name, error.message);
          results.errors.push(`Cliente ${client.name}: ${error.message}`);
          continue;
        }

        console.log("[Demo Seed] Inserted client:", client.name, "with id:", inserted.id);
        insertedClients.push({ id: inserted.id, data: client });
        results.clients++;
      } catch (e: any) {
        console.error("[Demo Seed] Exception for client:", client.name, e);
        results.errors.push(`Cliente ${client.name}: ${e.message}`);
      }
    }

    // 2. Inserisci visite per ogni cliente (2-4 visite ciascuno)
    for (const { id: accountId, data: client } of insertedClients) {
      const numVisits = 2 + Math.floor(Math.random() * 3); // 2-4 visite
      
      for (let i = 0; i < numVisits; i++) {
        const esito = ESITI[Math.floor(Math.random() * ESITI.length)];
        const importo = esito === "Ordine effettuato" ? randomAmount() : 0;
        const prodotti = PRODOTTI.slice(0, 1 + Math.floor(Math.random() * 3)).join(", ");
        
        try {
          const { error } = await supabase
            .from("visits")
            .insert({
              user_id: user.id,
              account_id: accountId,
              data_visita: randomDate(60), // Ultimi 60 giorni
              tipo: Math.random() > 0.7 ? "telefonata" : "visita",
              importo_vendita: importo,
              prodotti_discussi: prodotti,
              note: generateVisitNote(client, esito),
              esito,
              prossima_azione: PROSSIME_AZIONI[Math.floor(Math.random() * PROSSIME_AZIONI.length)],
              prossima_data: Math.random() > 0.5 ? randomDate(-14) : null, // Prossimi 14 giorni o null
            });

          if (!error) {
            results.visits++;
          }
        } catch (e: any) {
          // Ignora errori singole visite
        }
      }
    }

    // 3. Inserisci note per ogni cliente
    for (const { id: accountId } of insertedClients) {
      const numNotes = 1 + Math.floor(Math.random() * 2); // 1-2 note
      
      for (let i = 0; i < numNotes; i++) {
        const noteBody = CLIENT_NOTES[Math.floor(Math.random() * CLIENT_NOTES.length)];
        
        try {
          const { error } = await supabase
            .from("notes")
            .insert({
              account_id: accountId,
              body: noteBody,
              custom: { is_demo: true },
            });

          if (!error) {
            results.notes++;
          }
        } catch (e: any) {
          // Ignora errori singole note
        }
      }
    }

    console.log("[Demo Seed] Completed:", results);

    // Se non è stato inserito nessun cliente, considera un errore
    if (results.clients === 0) {
      return NextResponse.json({
        success: false,
        error: "Nessun cliente inserito",
        details: results.errors,
        ...results,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Caricati ${results.clients} clienti, ${results.visits} visite, ${results.notes} note demo`,
    });

  } catch (error: any) {
    console.error("[Demo Seed] Error:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}
