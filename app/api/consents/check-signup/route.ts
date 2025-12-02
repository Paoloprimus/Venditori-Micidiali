import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

// Versioni correnti dei documenti legali
const DOCUMENT_VERSIONS: Record<string, string> = {
  tos: "tos_v1.0",
  privacy: "privacy_v1.0",
  marketing: "marketing_v1.0",
};

interface SignupConsentsPayload {
  user_id: string;
  tos_accepted: boolean;
  privacy_accepted: boolean;
  marketing_accepted: boolean;
}

// POST: Registra i consensi durante il signup (chiamato dopo la registrazione)
// Questo endpoint può essere chiamato senza autenticazione perché il signup
// potrebbe richiedere conferma email prima che l'utente sia autenticato
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const body: SignupConsentsPayload = await req.json();

    // Valida payload
    if (!body.user_id) {
      return NextResponse.json({ error: "user_id richiesto" }, { status: 400 });
    }
    if (body.tos_accepted !== true || body.privacy_accepted !== true) {
      return NextResponse.json({ 
        error: "I consensi a ToS e Privacy sono obbligatori" 
      }, { status: 400 });
    }

    // Ottieni metadata richiesta
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
               headersList.get("x-real-ip") || 
               "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Prepara i record da inserire
    const records = [
      {
        user_id: body.user_id,
        consent_type: "tos",
        granted: true,
        document_version: DOCUMENT_VERSIONS.tos,
        ip_address: ip,
        user_agent: userAgent,
      },
      {
        user_id: body.user_id,
        consent_type: "privacy",
        granted: true,
        document_version: DOCUMENT_VERSIONS.privacy,
        ip_address: ip,
        user_agent: userAgent,
      },
    ];

    // Aggiungi marketing solo se accettato
    if (body.marketing_accepted) {
      records.push({
        user_id: body.user_id,
        consent_type: "marketing",
        granted: true,
        document_version: DOCUMENT_VERSIONS.marketing,
        ip_address: ip,
        user_agent: userAgent,
      });
    }

    // Usa il service role per bypassare RLS durante il signup
    // Il normale client ha già il service role se configurato
    const { error } = await supabase
      .from("consents")
      .insert(records);

    if (error) {
      console.error("Errore inserimento consensi signup:", error);
      // Non blocchiamo il signup per errori di logging consensi
      // ma logghiamo l'errore per debug
      return NextResponse.json({ 
        success: false, 
        warning: "Consensi non registrati, riprova più tardi" 
      });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Errore API consents/check-signup:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

