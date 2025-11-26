// lib/pdf/generator.ts
// Funzioni per generare PDF dei report

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportVisiteData, ReportListaClientiData } from './types';

/**
 * Genera PDF per Report Visite (giornaliero, settimanale o periodo)
 * @returns Blob del PDF generato
 */
export async function generateReportVisite(data: ReportVisiteData): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // ============== HEADER ==============
  doc.setFontSize(20);
  doc.setFont('Times', 'bold');
  doc.text('REPING', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(16);
  doc.text('Report Visite', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('Times', 'normal');
  doc.text(data.periodoFormattato, pageWidth / 2, yPos, { align: 'center' });
  
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
  doc.setFont('Times', 'bold');
  doc.setTextColor(0);
  doc.text('Riepilogo Periodo', 15, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('Times', 'normal');
  
  // Layout a due colonne per il riepilogo
  const col1X = 20;
  const col2X = 110;
  
  // Colonna 1: Dati quantitativi
  doc.text(`Visite effettuate: ${data.numVisite}`, col1X, yPos);
  doc.text(`Clienti visitati: ${data.numClienti}`, col1X, yPos + 6);
  doc.text(`Fatturato periodo: EUR ${data.fatturatoTotale.toFixed(2)}`, col1X, yPos + 12);
  doc.text(`Km percorsi: ${data.kmTotali.toFixed(1)} km`, col1X, yPos + 18);

  // Colonna 2: Dati temporali (NUOVO)
  doc.text(`Tempo Totale: ${data.tempoTotaleOre}`, col2X, yPos);
  doc.text(`Tempo in Visita: ${data.tempoVisiteOre}`, col2X, yPos + 6);
  doc.text(`Tempo Spostamenti: ${data.tempoViaggioOre}`, col2X, yPos + 12);
  
  yPos += 25;

  // ============== DETTAGLIO VISITE ==============
  doc.setFontSize(14);
  doc.setFont('Times', 'bold');
  doc.text('Dettaglio Visite', 15, yPos);
  yPos += 5;

  // Prepara dati per la tabella
  // Colonne: Ora | Cliente | Città | Durata | Esito | Importo | Note
  const tableData = data.visite.map((v) => [
    v.dataOra, // Si assume che sia formattata solo come ora (es. 14:30) se giornaliero, o data+ora se periodo
    v.nomeCliente,
    v.cittaCliente || '-',
    v.durataMinuti ? `${v.durataMinuti}m` : '-', // NUOVO CAMPO
    formatEsito(v.esito),
    v.importoVendita ? `EUR ${v.importoVendita.toFixed(0)}` : '-',
    v.noteVisita || '-'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Ora', 'Cliente', 'Città', 'Durata', 'Esito', 'Importo', 'Note']],
    body: tableData,
    theme: 'striped',
    styles: { 
      font: 'Times',
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [37, 99, 235], // blu
      textColor: 255,
      fontStyle: 'bold',
      font: 'Times'
    },
    columnStyles: {
      0: { cellWidth: 15 },  // Ora
      1: { cellWidth: 35 },  // Cliente
      2: { cellWidth: 25 },  // Città
      3: { cellWidth: 15 },  // Durata
      4: { cellWidth: 25 },  // Esito
      5: { cellWidth: 20 },  // Importo
      6: { cellWidth: 'auto' } // Note
    },
    didDrawPage: (data) => {
      // Footer con numero pagina
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      
      doc.setFontSize(8);
      doc.setFont('Times', 'normal');
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
  doc.setFont('Times', 'bold');
  doc.text('REPING', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(16);
  doc.text('Lista Clienti', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('Times', 'normal');
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
  doc.setFont('Times', 'bold');
  doc.setTextColor(0);
  doc.text('Filtri Applicati', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('Times', 'normal');
  doc.text(`Tipo: ${data.filtri.tipo}`, 20, yPos);
  yPos += 6;
  doc.text(`Criteri: ${data.filtri.descrizione}`, 20, yPos);
  yPos += 10;

  // ============== RISULTATI ==============
  doc.setFontSize(12);
  doc.setFont('Times', 'bold');
  doc.text('Risultati', 15, yPos);
  yPos += 5;

  // Prepara dati per la tabella
  const tableData = data.clienti.map((c) => [
    c.nome,
    c.citta || '-',
    c.numVisite.toString(),
    c.ultimaVisita || '-',
    c.fatturato ? `EUR ${c.fatturato.toFixed(2)}` : '-',
    c.km ? `${c.km.toFixed(1)}km` : '-',
    c.note || '-'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Cliente', 'Città', 'Visite', 'Ultima Visita', 'Fatturato', 'Km', 'Note']],
    body: tableData,
    theme: 'striped',
    styles: { 
      font: 'Times',
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      font: 'Times'
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
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      
      doc.setFontSize(8);
      doc.setFont('Times', 'normal');
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
  doc.setFont('Times', 'bold');
  doc.text('TOTALI:', 15, finalY);
  
  doc.setFontSize(10);
  doc.setFont('Times', 'normal');
  let totalY = finalY + 6;
  
  const totali = [
    `N. clienti: ${data.numClienti}`,
    `Visite totali: ${data.visiteTotali}`,
    `Fatturato totale: EUR ${data.fatturatoTotale.toFixed(2)}`,
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
 * Formatta il tipo visita (NO EMOJI)
 */
function formatTipo(tipo: string): string {
  const tipoMap: Record<string, string> = {
    'visita': 'Visita',
    'chiamata': 'Chiamata'
  };
  
  return tipoMap[tipo] || tipo;
}

/**
 * Formatta l'esito visita (NO EMOJI)
 */
function formatEsito(esito: string): string {
  const esitoMap: Record<string, string> = {
    'ordine_acquisito': 'Ordine',
    'da_richiamare': 'Richiamare',
    'no_interesse': 'No int.',
    'info_richiesta': 'Info',
    'altro': 'Altro'
  };
  
  return esitoMap[esito] || esito;
}
