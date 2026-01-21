/**
 * API: Analyze Import File with AI
 * POST /api/clients/analyze-import
 * 
 * Usa un LLM per mappare intelligentemente le colonne di un file CSV/Excel
 * ai campi della tabella accounts di REPING.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Campi supportati nella tabella accounts
const REPING_FIELDS = {
  name: "Nome azienda/cliente (es: Bar Roma, Pizzeria da Gino)",
  contact_name: "Nome persona referente (es: Mario Rossi, Sig. Bianchi)",
  phone: "Numero di telefono (es: 349 123 4567, +39 02 1234567)",
  email: "Indirizzo email (es: info@bar.it)",
  address: "Indirizzo/Via (es: Via Roma 123, Piazza Dante 5)",
  city: "Città/Comune (es: Milano, Verona, Roma)",
  postal_code: "CAP (es: 20100, 37100)",
  vat_number: "Partita IVA (es: IT12345678901)",
  tipo_locale: "Tipo locale (es: Bar, Ristorante, Hotel, Enoteca)",
  notes: "Note aggiuntive",
};

// Alias comuni per fallback senza AI
const FALLBACK_ALIASES: Record<string, string[]> = {
  name: ["name", "nome", "ragione sociale", "azienda", "cliente", "company", "rag.soc", "rag soc", "denominazione", "ditta", "società", "societa"],
  contact_name: ["contact_name", "contatto", "referente", "rif", "rif.to", "riferimento", "persona", "nome contatto", "responsabile"],
  phone: ["phone", "telefono", "tel", "mobile", "cell", "cellulare", "numero", "recapito"],
  email: ["email", "mail", "e-mail", "posta", "pec"],
  address: ["address", "indirizzo", "via", "street", "sede", "ubicazione"],
  city: ["city", "città", "citta", "comune", "località", "localita", "paese"],
  postal_code: ["postal_code", "cap", "zip", "codice postale"],
  vat_number: ["vat_number", "p.iva", "piva", "partita iva", "vat", "tax id", "cf", "codice fiscale"],
  tipo_locale: ["tipo_locale", "tipo", "type", "categoria", "category", "settore", "attività", "attivita"],
  notes: ["notes", "note", "commenti", "comments", "memo", "osservazioni", "annotazioni"],
};

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  
  // Auth check
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { headers, sampleData } = body;

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json({ error: "Headers mancanti" }, { status: 400 });
    }

    // Prova mapping con AI
    let mapping: Record<string, string> = {};
    let issues: string[] = [];
    let usedAI = false;

    try {
      const aiResult = await analyzeWithAI(headers, sampleData);
      mapping = aiResult.mapping;
      issues = aiResult.issues;
      usedAI = true;
    } catch (aiError) {
      console.warn("[analyze-import] AI fallback:", aiError);
      // Fallback a mapping basato su alias
      mapping = fallbackMapping(headers);
    }

    // Post-processing: normalizza e valida
    const processed = postProcessMapping(mapping, headers, sampleData);
    
    return NextResponse.json({
      mapping: processed.mapping,
      issues: [...issues, ...processed.issues],
      usedAI,
    });

  } catch (error: any) {
    console.error("[analyze-import] Error:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}

/**
 * Analisi con AI (Claude/GPT)
 */
async function analyzeWithAI(
  headers: string[], 
  sampleData: any[]
): Promise<{ mapping: Record<string, string>; issues: string[] }> {
  
  // Prepara sample per il prompt
  const sampleStr = sampleData.slice(0, 3).map((row, i) => {
    return `Riga ${i + 1}: ${headers.map(h => `${h}="${row[h] || ""}"`).join(", ")}`;
  }).join("\n");

  const prompt = `Sei un assistente per l'importazione dati in un CRM per agenti di commercio.

Analizza queste intestazioni di colonne e i dati di esempio da un file Excel/CSV:

INTESTAZIONI: ${headers.join(", ")}

DATI ESEMPIO:
${sampleStr}

CAMPI DISPONIBILI IN REPING:
${Object.entries(REPING_FIELDS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

COMPITO:
1. Per ogni colonna, determina a quale campo REPING corrisponde guardando sia il nome che i valori
2. Se una colonna contiene dati combinati (es. "Via Roma 123, Verona"), indica che potrebbe essere splittata
3. Ignora colonne che non corrispondono a nessun campo (es. ID interni, date creazione)

REGOLE IMPORTANTI:
- Il campo "name" è l'azienda/locale (Bar Roma, Ristorante X), NON la persona
- Il campo "contact_name" è il nome della PERSONA referente
- Se non sei sicuro, non mappare la colonna

Rispondi SOLO con un JSON valido in questo formato:
{
  "mapping": { "Nome Colonna Originale": "campo_reping", ... },
  "issues": ["eventuali problemi o suggerimenti"]
}`;

  // Usa Anthropic (Claude) se disponibile, altrimenti OpenAI
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    return await callClaude(prompt, anthropicKey);
  } else if (openaiKey) {
    return await callOpenAI(prompt, openaiKey);
  } else {
    throw new Error("Nessuna API key AI configurata");
  }
}

async function callClaude(
  prompt: string, 
  apiKey: string
): Promise<{ mapping: Record<string, string>; issues: string[] }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307", // Modello veloce e economico
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  
  // Estrai JSON dalla risposta
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Risposta AI non valida");
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function callOpenAI(
  prompt: string, 
  apiKey: string
): Promise<{ mapping: Record<string, string>; issues: string[] }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  
  return JSON.parse(text);
}

/**
 * Fallback mapping basato su alias (senza AI)
 */
function fallbackMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const header of headers) {
    const norm = header.toLowerCase().trim();
    
    for (const [field, aliases] of Object.entries(FALLBACK_ALIASES)) {
      // Match esatto
      if (aliases.includes(norm)) {
        mapping[header] = field;
        break;
      }
      // Match parziale
      if (aliases.some(a => norm.includes(a) || a.includes(norm))) {
        mapping[header] = field;
        break;
      }
    }
  }
  
  return mapping;
}

/**
 * Post-processing del mapping
 */
function postProcessMapping(
  mapping: Record<string, string>,
  headers: string[],
  sampleData: any[]
): { mapping: Record<string, string>; issues: string[] } {
  const issues: string[] = [];
  const finalMapping = { ...mapping };
  
  // Verifica che ci sia almeno il campo name
  const hasName = Object.values(finalMapping).includes("name");
  if (!hasName) {
    // Prova a inferire il name dalla prima colonna con stringhe
    for (const header of headers) {
      const sample = sampleData[0]?.[header];
      if (sample && typeof sample === "string" && sample.length > 2 && !finalMapping[header]) {
        // Probabilmente è il nome
        finalMapping[header] = "name";
        issues.push(`Ho assunto che "${header}" contenga i nomi dei clienti`);
        break;
      }
    }
  }
  
  // Verifica che non ci siano duplicati
  const usedFields = new Set<string>();
  for (const [col, field] of Object.entries(finalMapping)) {
    if (usedFields.has(field)) {
      // Duplicato: rimuovi il secondo
      delete finalMapping[col];
      issues.push(`Colonna "${col}" rimossa (${field} già mappato)`);
    } else {
      usedFields.add(field);
    }
  }
  
  // Suggerimenti utili
  if (!Object.values(finalMapping).includes("phone") && !Object.values(finalMapping).includes("email")) {
    issues.push("Nessun recapito (telefono/email) trovato - potrai aggiungerlo dopo");
  }
  
  return { mapping: finalMapping, issues };
}
