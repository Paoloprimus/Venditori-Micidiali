// app/api/docs/testing-roadmap/route.ts
// Genera PDF della Testing Roadmap

import { NextResponse } from "next/server";
import jsPDF from "jspdf";

export const runtime = "nodejs";

export async function GET() {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Helper function
    const addText = (text: string, fontSize: number, isBold = false, color: [number, number, number] = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(...color);
      
      const lines = doc.splitTextToSize(text, pageWidth - 40);
      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += fontSize * 0.5;
      }
      y += 2;
    };

    const addLine = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 5;
    };

    // TITLE PAGE
    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("TESTING ROADMAP", pageWidth / 2, 30, { align: "center" });
    doc.setFontSize(16);
    doc.text("Venditori Micidiali v1.0 BETA", pageWidth / 2, 45, { align: "center" });
    
    y = 80;
    doc.setTextColor(0, 0, 0);
    
    addText("Data: 2 Dicembre 2025", 12);
    addText("Autore: Engineering Team", 12);
    addText("Versione: 1.0", 12);
    y += 10;
    
    // EXECUTIVE SUMMARY
    addText("1. EXECUTIVE SUMMARY", 16, true, [37, 99, 235]);
    addLine();
    addText("Obiettivo: Verificare qualità, sicurezza e robustezza dell'applicazione.", 11);
    y += 5;
    
    addText("Aree di Testing:", 12, true);
    addText("• UNITARIETÀ - Moduli autonomi e ben definiti", 10);
    addText("• INTEGRAZIONE - Comunicazione tra componenti", 10);
    addText("• LOGICA - Correttezza business logic", 10);
    addText("• SICUREZZA - Protezione dati e vulnerabilità", 10);
    y += 5;
    
    addText("Timeline: 6-10 giorni totali", 11);
    y += 10;
    
    // ARCHITETTURA
    addText("2. ARCHITETTURA SISTEMA", 16, true, [37, 99, 235]);
    addLine();
    addText("Stack: Next.js 14 + React 18 + TailwindCSS + Supabase", 11);
    y += 5;
    
    addText("Moduli Principali:", 12, true);
    addText("• lib/crypto/ - Cifratura E2E (AES-256-GCM)", 10);
    addText("• lib/nlu/ - Natural Language Understanding", 10);
    addText("• lib/pdf/ - Generazione Report PDF", 10);
    addText("• lib/supabase/ - Database + RLS", 10);
    addText("• app/api/ - 35+ REST API endpoints", 10);
    y += 10;
    
    // FASE 1
    doc.addPage();
    y = 20;
    addText("3. FASE 1: UNITARIETÀ", 16, true, [37, 99, 235]);
    addLine();
    addText("Obiettivo: Verificare che ogni modulo sia autonomo.", 11);
    y += 5;
    
    addText("Test Crypto (lib/crypto/):", 12, true);
    addText("□ UNIT-C01: encrypt() produce output deterministico", 10);
    addText("□ UNIT-C02: decrypt() inverte encrypt()", 10);
    addText("□ UNIT-C03: AAD mismatch causa errore", 10);
    addText("□ UNIT-C04: Passphrase errata causa errore", 10);
    addText("□ UNIT-C05: decryptFields() gestisce campi mancanti", 10);
    y += 5;
    
    addText("Test NLU (lib/nlu/):", 12, true);
    addText("□ UNIT-N01: parseIntent() riconosce 20+ intent", 10);
    addText("□ UNIT-N02: Entity extraction (città, tipo_locale)", 10);
    addText("□ UNIT-N03: Gestione input vuoto/malformato", 10);
    addText("□ UNIT-N04: Case-insensitive matching", 10);
    y += 5;
    
    addText("Test PDF (lib/pdf/):", 12, true);
    addText("□ UNIT-P01: generateReportListaClienti() produce Blob", 10);
    addText("□ UNIT-P02: PDF contiene header corretto", 10);
    addText("□ UNIT-P03: Tabella clienti renderizzata", 10);
    y += 10;
    
    // FASE 2
    addText("4. FASE 2: INTEGRAZIONE", 16, true, [37, 99, 235]);
    addLine();
    addText("Obiettivo: Verificare comunicazione tra moduli.", 11);
    y += 5;
    
    addText("Flusso Auth:", 12, true);
    addText("□ INT-A01: Login → Session → API protected", 10);
    addText("□ INT-A02: Logout invalida sessione", 10);
    y += 3;
    
    addText("Flusso Crypto + DB:", 12, true);
    addText("□ INT-CD01: Salva cliente → dati cifrati in DB", 10);
    addText("□ INT-CD02: Leggi cliente → decifratura corretta", 10);
    addText("□ INT-CD03: Update cliente → re-cifratura", 10);
    y += 3;
    
    addText("Flusso Chat + NLU:", 12, true);
    addText("□ INT-CN01: Query clienti → risposta corretta", 10);
    addText("□ INT-CN02: Filtri città funzionanti", 10);
    addText("□ INT-CN03: Genera PDF → download", 10);
    addText("□ INT-CN04: Context tra messaggi", 10);
    y += 10;
    
    // FASE 3
    doc.addPage();
    y = 20;
    addText("5. FASE 3: LOGICA", 16, true, [37, 99, 235]);
    addLine();
    addText("Obiettivo: Verificare correttezza business logic.", 11);
    y += 5;
    
    addText("NLU Intent Matching:", 12, true);
    addText("□ 'quanti clienti ho' → client_count", 10);
    addText("□ 'lista bar verona' → client_list", 10);
    addText("□ 'vendite di ieri' → sales_summary", 10);
    addText("□ 'apri clienti' → navigate", 10);
    y += 5;
    
    addText("Filtri Database:", 12, true);
    addText("□ city=Verona → Solo 'Verona', non '...di Verona'", 10);
    addText("□ tipo=Bar → Tutti i bar", 10);
    y += 5;
    
    addText("Calcoli Aggregati:", 12, true);
    addText("□ Totale vendite = SUM(importo_vendita)", 10);
    addText("□ Conteggio visite per cliente", 10);
    y += 10;
    
    // FASE 4
    addText("6. FASE 4: SICUREZZA", 16, true, [37, 99, 235]);
    addLine();
    addText("Obiettivo: Protezione dati e robustezza.", 11);
    y += 5;
    
    addText("OWASP Top 10:", 12, true);
    addText("□ A01: Broken Access Control → RLS Supabase", 10);
    addText("□ A02: Cryptographic Failures → AES-256-GCM", 10);
    addText("□ A03: Injection → Parameterized queries", 10);
    addText("□ A07: Auth Failures → Supabase Auth", 10);
    y += 5;
    
    addText("Cifratura:", 12, true);
    addText("□ SEC-E01: Dati sensibili MAI in chiaro in DB", 10);
    addText("□ SEC-E02: IV unico per ogni cifratura", 10);
    addText("□ SEC-E03: AAD previene tampering", 10);
    addText("□ SEC-E04: Master Key non in localStorage", 10);
    y += 5;
    
    addText("RLS (Row Level Security):", 12, true);
    addText("□ SEC-R01: User A non vede dati User B", 10);
    addText("□ SEC-R02: owner_id enforced su accounts", 10);
    y += 10;
    
    // METRICHE
    doc.addPage();
    y = 20;
    addText("7. METRICHE E KPI", 16, true, [37, 99, 235]);
    addLine();
    
    addText("Coverage Target:", 12, true);
    addText("• Crypto: 100%", 10);
    addText("• API Routes: 80%", 10);
    addText("• NLU: 90%", 10);
    addText("• UI: 60%", 10);
    y += 5;
    
    addText("Performance Baseline:", 12, true);
    addText("• API response: <500ms (max 2s)", 10);
    addText("• PDF generation: <3s (max 10s)", 10);
    addText("• NLU parsing: <100ms", 10);
    addText("• Page load: <1.5s", 10);
    y += 10;
    
    // CHECKLIST
    addText("8. CHECKLIST PRE-RELEASE", 16, true, [37, 99, 235]);
    addLine();
    addText("□ Tutti i test CRITICO passati", 11);
    addText("□ npm audit clean (0 high/critical)", 11);
    addText("□ Console errors = 0", 11);
    addText("□ RLS policies verificate", 11);
    addText("□ Encryption audit OK", 11);
    addText("□ Performance baseline met", 11);
    y += 15;
    
    // SIGN-OFF
    addText("SIGN-OFF", 14, true);
    addLine();
    addText("Developer: ________________  Data: ________", 11);
    y += 8;
    addText("QA: ________________  Data: ________", 11);
    y += 8;
    addText("Security: ________________  Data: ________", 11);
    y += 8;
    addText("Product: ________________  Data: ________", 11);
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Venditori Micidiali - Testing Roadmap v1.0 | Pagina ${i} di ${pageCount}`,
        pageWidth / 2,
        290,
        { align: "center" }
      );
    }

    // Generate PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=Testing_Roadmap_v1.0.pdf",
      },
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Errore generazione PDF" }, { status: 500 });
  }
}

