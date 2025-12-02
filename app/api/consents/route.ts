import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

// Versioni correnti dei documenti legali
const DOCUMENT_VERSIONS = {
  tos: "tos_v1.0",
  privacy: "privacy_v1.0",
  marketing: "marketing_v1.0",
  cookie_analytics: "cookie_v1.0",
  cookie_all: "cookie_v1.0",
} as const;

type ConsentType = keyof typeof DOCUMENT_VERSIONS;

interface ConsentPayload {
  consent_type: ConsentType;
  granted: boolean;
}

// POST: Registra un nuovo consenso
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const body = await req.json();
    
    // Supporta sia singolo consent che array
    const consents: ConsentPayload[] = Array.isArray(body.consents) 
      ? body.consents 
      : [{ consent_type: body.consent_type, granted: body.granted }];

    // Valida tutti i consent
    for (const c of consents) {
      if (!c.consent_type || !Object.keys(DOCUMENT_VERSIONS).includes(c.consent_type)) {
        return NextResponse.json({ 
          error: `Tipo consenso non valido: ${c.consent_type}` 
        }, { status: 400 });
      }
      if (typeof c.granted !== "boolean") {
        return NextResponse.json({ 
          error: "Il campo 'granted' deve essere boolean" 
        }, { status: 400 });
      }
    }

    // Ottieni metadata richiesta
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
               headersList.get("x-real-ip") || 
               "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Inserisci tutti i consensi
    const records = consents.map(c => ({
      user_id: user.id,
      consent_type: c.consent_type,
      granted: c.granted,
      document_version: DOCUMENT_VERSIONS[c.consent_type],
      ip_address: ip,
      user_agent: userAgent,
    }));

    const { data, error } = await supabase
      .from("consents")
      .insert(records)
      .select();

    if (error) {
      console.error("Errore inserimento consensi:", error);
      return NextResponse.json({ error: "Errore database" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      consents: data 
    });

  } catch (err) {
    console.error("Errore API consents:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

// GET: Ottieni lo stato corrente dei consensi dell'utente
export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    // Ottieni l'ultimo consenso per ogni tipo
    const { data, error } = await supabase
      .from("consents")
      .select("consent_type, granted, document_version, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore lettura consensi:", error);
      return NextResponse.json({ error: "Errore database" }, { status: 500 });
    }

    // Raggruppa per tipo, prendi solo l'ultimo (più recente)
    const latestByType: Record<string, typeof data[0]> = {};
    for (const consent of data || []) {
      if (!latestByType[consent.consent_type]) {
        latestByType[consent.consent_type] = consent;
      }
    }

    // Verifica se ha i consensi obbligatori
    const hasRequiredConsents = 
      latestByType.tos?.granted === true && 
      latestByType.privacy?.granted === true;

    return NextResponse.json({
      consents: latestByType,
      hasRequiredConsents,
      currentVersions: DOCUMENT_VERSIONS,
    });

  } catch (err) {
    console.error("Errore API consents GET:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

