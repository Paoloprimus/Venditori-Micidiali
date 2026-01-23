/**
 * API: Create Demo Session
 * POST /api/demo/create-session
 * 
 * Crea un account temporaneo per la demo anonima.
 * L'account viene marcato per essere cancellato dopo 2 ore.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Client con service role per creare utenti
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Dati demo (copiati da seed per essere self-contained)
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

const ESITI = ["Interessato", "Ordine effettuato", "Da ricontattare", "Non interessato", "Preventivo richiesto"];
const PRODOTTI = ["Vino rosso", "Birra artigianale", "Caffè", "Cornetti", "Prosecco", "Amaro", "Gin", "Rum"];
const PROSSIME_AZIONI = ["Inviare catalogo", "Portare campioni", "Richiamare", "Preparare offerta", "Visita di follow-up"];
const CLIENT_NOTES = [
  "Preferisce le consegne il martedì mattina",
  "Pagamento a 30 giorni fine mese",
  "Interessato a prodotti biologici",
  "Chiede sempre lo sconto del 5%",
  "Cliente storico, molto affidabile",
];

function randomDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString().split("T")[0];
}

function randomAmount(): number {
  const amounts = [0, 0, 150, 280, 450, 620, 890, 1200];
  return amounts[Math.floor(Math.random() * amounts.length)];
}

export async function POST(req: NextRequest) {
  console.log("[Demo Session] Creating new demo session...");

  try {
    // 1. Genera credenziali temporanee
    const uuid = crypto.randomUUID().slice(0, 8);
    const email = `demo-${uuid}@temp.reping.app`;
    const password = crypto.randomUUID(); // Password random, non serve ricordarla
    
    console.log("[Demo Session] Creating user:", email);

    // 2. Crea utente con service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Salta conferma email
      user_metadata: {
        is_demo: true,
        demo_created_at: new Date().toISOString(),
        demo_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 ore
      },
    });

    if (authError || !authData.user) {
      console.error("[Demo Session] Auth error:", authError);
      return NextResponse.json({ error: "Errore creazione account demo" }, { status: 500 });
    }

    const userId = authData.user.id;
    console.log("[Demo Session] User created:", userId);

    // 3. Crea profilo utente
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      display_name: "Utente Demo",
      role: "demo",
    });

    // 4. Inserisci dati demo
    const insertedClients: { id: string; data: typeof DEMO_CLIENTS[0] }[] = [];
    
    for (const client of DEMO_CLIENTS) {
      const { data: inserted, error } = await supabaseAdmin
        .from("accounts")
        .insert({
          user_id: userId,
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
        })
        .select("id")
        .single();

      if (!error && inserted) {
        insertedClients.push({ id: inserted.id, data: client });
      }
    }

    console.log("[Demo Session] Inserted", insertedClients.length, "clients");

    // 5. Inserisci visite
    let visitsCount = 0;
    for (const { id: accountId, data: client } of insertedClients) {
      const numVisits = 2 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < numVisits; i++) {
        const esito = ESITI[Math.floor(Math.random() * ESITI.length)];
        const importo = esito === "Ordine effettuato" ? randomAmount() : 0;
        const prodotti = PRODOTTI.slice(0, 1 + Math.floor(Math.random() * 3)).join(", ");
        
        const { error } = await supabaseAdmin
          .from("visits")
          .insert({
            user_id: userId,
            account_id: accountId,
            data_visita: randomDate(60),
            tipo: Math.random() > 0.7 ? "telefonata" : "visita",
            importo_vendita: importo,
            prodotti_discussi: prodotti,
            note: `Visita a ${client.name}. ${esito}.`,
            esito,
            prossima_azione: PROSSIME_AZIONI[Math.floor(Math.random() * PROSSIME_AZIONI.length)],
          });

        if (!error) visitsCount++;
      }
    }

    // 6. Inserisci note
    let notesCount = 0;
    for (const { id: accountId } of insertedClients) {
      const noteBody = CLIENT_NOTES[Math.floor(Math.random() * CLIENT_NOTES.length)];
      
      const { error } = await supabaseAdmin
        .from("notes")
        .insert({
          account_id: accountId,
          body: noteBody,
          custom: { is_demo: true },
        });

      if (!error) notesCount++;
    }

    console.log("[Demo Session] Created:", { clients: insertedClients.length, visits: visitsCount, notes: notesCount });

    // 7. Ritorna credenziali per auto-login
    return NextResponse.json({
      success: true,
      email,
      password,
      userId,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      stats: {
        clients: insertedClients.length,
        visits: visitsCount,
        notes: notesCount,
      },
    });

  } catch (error: any) {
    console.error("[Demo Session] Error:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}
