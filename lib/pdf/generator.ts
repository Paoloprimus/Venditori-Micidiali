// lib/pdf/generator.ts
// Funzioni per generare PDF dei report

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportPlanningData, ReportListaClientiData } from './types';

/**
 * Genera PDF per Report Planning giornaliero
 * @returns Blob del PDF generato
 */
export async function generateReportPlanning(data: ReportPlanningData): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // ============== HEADER ==============
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('REPING', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(16);
  doc.text('Report Planning Giornaliero', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dataFormattata, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Agente: ${data.nomeAgente}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  
  // Linea separatore
  doc.setDrawColor(200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // ============== RIEPILOGO ==============
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('📊 Riepilogo Giornata', 15, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const riepilogo = [
    `Visite completate: ${data.numCompletate} su ${data.numVisite}`,
    `Visite saltate: ${data.numSaltate}`,
    `Fatturato giornata: €${data.fatturatoTotale.toFixed(2)}`,
    `Km percorsi: ${data.kmTotali.toFixed(1)} km`
  ];
  
  riepilogo.forEach((line) => {
    doc.text(line, 20, yPos);
    yPos += 6;
  });
  
  yPos += 5;

  // ============== DETTAGLIO VISITE ==============
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('📋 Dettaglio Visite', 15, yPos);
  yPos += 5;

  // Prepara dati per la tabella
  const tableData = data.visite.map((v) => [
    v.ordine.toString(),
    v.nomeCliente,
    v.cittaCliente || '-',
    v.ultimaVisita || 'Prima visita',
    v.giorniDaUltimaVisita ? `${v.giorniDaUltimaVisita}gg` : '-',
    v.fatturato ? `€${v.fatturato.toFixed(2)}` : '-',
    formatEsito(v.esito),
    v.noteVisita || '-'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Cliente', 'Città', 'Ultima Visita', 'Giorni', 'Fatturato', 'Esito', 'Note']],
    body: tableData,
    theme: 'striped',
    styles: { 
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [37, 99, 235], // blu
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10 },  // #
      1: { cellWidth: 35 },  // Cliente
      2: { cellWidth: 25 },  // Città
      3: { cellWidth: 25 },  // Ultima Visita
      4: { cellWidth: 15 },  // Giorni
      5: { cellWidth: 25 },  // Fatturato
      6: { cellWidth: 25 },  // Esito
      7: { cellWidth: 'auto' } // Note
    },
    didDrawPage: (data) => {
      // Footer con numero pagina
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generato il ${new Date().toLocaleString('it-IT')} - Pagina ${currentPage}/${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  });

  // Genera blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Genera PDF per Report Lista Clienti
 * @returns Blob del PDF generato
 */
export async function generateReportListaClienti(data: ReportListaClientiData): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // ============== HEADER ==============
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('REPING', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(16);
  doc.text('Lista Clienti', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Agente: ${data.nomeAgente}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  doc.text(`Generato il: ${data.dataGenerazione}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  
  // Linea separatore
  doc.setDrawColor(200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // ============== FILTRI APPLICATI ==============
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('🔍 Filtri Applicati', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tipo: ${data.filtri.tipo}`, 20, yPos);
  yPos += 6;
  doc.text(`Criteri: ${data.filtri.descrizione}`, 20, yPos);
  yPos += 10;

  // ============== RISULTATI ==============
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('📊 Risultati', 15, yPos);
  yPos += 5;

  // Prepara dati per la tabella
  const tableData = data.clienti.map((c) => [
    c.nome,
    c.citta || '-',
    c.numVisite.toString(),
    c.ultimaVisita || '-',
    c.fatturato ? `€${c.fatturato.toFixed(2)}` : '-',
    c.km ? `${c.km.toFixed(1)}km` : '-',
    c.note || '-'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Cliente', 'Città', 'Visite', 'Ultima Visita', 'Fatturato', 'Km', 'Note']],
    body: tableData,
    theme: 'striped',
    styles: { 
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 40 },  // Cliente
      1: { cellWidth: 25 },  // Città
      2: { cellWidth: 20 },  // Visite
      3: { cellWidth: 25 },  // Ultima Visita
      4: { cellWidth: 25 },  // Fatturato
      5: { cellWidth: 20 },  // Km
      6: { cellWidth: 'auto' } // Note
    },
    didDrawPage: (data) => {
      // Footer con totali e numero pagina
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generato il ${new Date().toLocaleString('it-IT')} - Pagina ${currentPage}/${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  });

  // Aggiungi totali in fondo all'ultima pagina
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTALI:', 15, finalY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let totalY = finalY + 6;
  
  const totali = [
    `N° clienti: ${data.numClienti}`,
    `Visite totali: ${data.visiteTotali}`,
    `Fatturato totale: €${data.fatturatoTotale.toFixed(2)}`,
    `Km totali: ${data.kmTotali.toFixed(1)} km`
  ];
  
  totali.forEach((line) => {
    doc.text(line, 20, totalY);
    totalY += 6;
  });

  // Genera blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Formatta l'esito visita per visualizzazione
 */
function formatEsito(esito: string): string {
  const esitoMap: Record<string, string> = {
    'ordine_acquisito': '✅ Ordine',
    'da_richiamare': '📞 Richiamare',
    'no_interesse': '❌ No interesse',
    'info_richiesta': 'ℹ️ Info',
    'altro': '📝 Altro'
  };
  
  return esitoMap[esito] || esito;
}
