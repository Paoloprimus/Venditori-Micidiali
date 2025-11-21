// components/GenerateListaClientiButton.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import GenerateReportModal from './GenerateReportModal';
import ListaClientiForm from './ListaClientiForm';
import GenerateReportVisiteButton from './GenerateReportVisiteButton';
import {
  generateReportListaClienti,
  savePdfToDevice,
  saveDocumentMetadata,
  generateListaClientiFilename,
  type ReportListaClientiData,
  type ClienteListaDetail,
  // 💡 CORREZIONE 1: Importiamo il tipo DocumentMetadata per la funzione saveDocumentMetadata
  type DocumentMetadata 
} from '@/lib/pdf';

type ReportType = 'visite' | 'lista_visite' | 'lista_fatturato' | 'lista_prodotto' | 'lista_km';

type Props = {
  onSuccess?: () => void;
};

export default function GenerateListaClientiButton({ onSuccess }: Props) {
  const { crypto } = useCrypto();
  const [showModal, setShowModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);

  async function handleSelectReport(type: ReportType) {
    if (type === 'visite') {
      // Mostra form report visite
      setSelectedReportType(type);
      return;
    }

    // Per liste clienti, mostra form
    setSelectedReportType(type);
  }

  async function handleGenerateLista(formData: any) {
    if (!crypto || typeof crypto.decryptFields !== 'function') {
      alert('Crittografia non disponibile');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // 1. Query clienti base
      let query = supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city, ultimo_esito_at, volume_attuale, latitude, longitude')
        .eq('user_id', user.id);

      const { data: clientsData, error: clientsError } = await query;
      if (clientsError) throw clientsError;

      if (!clientsData || clientsData.length === 0) {
        alert('Nessun cliente trovato');
        return;
      }

      // 2. Decifra nomi
      const hexToBase64 = (hexStr: any): string => {
        if (!hexStr || typeof hexStr !== 'string') return '';
        if (!hexStr.startsWith('\\x')) return hexStr;
        const hex = hexStr.slice(2);
        const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
        return bytes;
      };

      const toObj = (x: any): Record<string, unknown> =>
        Array.isArray(x)
          ? x.reduce((acc: Record<string, unknown>, it: any) => {
              if (it && typeof it === "object" && "name" in it) acc[it.name] = it.value ?? "";
              return acc;
            }, {})
          : ((x ?? {}) as Record<string, unknown>);

      const decryptedClients: any[] = [];
      
      for (const c of clientsData) {
        try {
          const recordForDecrypt = {
            ...c,
            name_enc: hexToBase64(c.name_enc),
            name_iv: hexToBase64(c.name_iv),
          };

          const decAny = await (crypto as any).decryptFields(
            'table:accounts',
            'accounts',
            c.id, // ✅ FIX: Usa l'ID del cliente come Associated Data
            recordForDecrypt,
            ['name']
          );

          const dec = toObj(decAny);

          const clientName = String(dec.name ?? 'Cliente senza nome');

          decryptedClients.push({
            id: c.id,
            name: clientName,
            city: c.city || '',
            ultimaVisita: c.ultimo_esito_at,
            fatturato: c.volume_attuale ? parseFloat(c.volume_attuale) : 0,
            latitude: c.latitude,
            longitude: c.longitude,
          });
        } catch (e) {
          console.error('[Lista] Errore decrypt cliente:', c.id, e);
          // Aggiungi comunque il cliente con nome fallback
          decryptedClients.push({
            id: c.id,
            name: 'Cliente sconosciuto (errore decrypt)',
            city: c.city || '',
            ultimaVisita: c.ultimo_esito_at,
            fatturato: c.volume_attuale ? parseFloat(c.volume_attuale) : 0,
            latitude: c.latitude,
            longitude: c.longitude,
          });
        }
      }

      // 3. Applica filtri e calcola stats per ogni cliente
      const clientsWithStats = await Promise.all(
        decryptedClients.map(async (client) => {
          // Query visite per questo cliente nel periodo
          let visitsQuery = supabase
            .from('visits')
            .select('*')
            .eq('user_id', user.id)
            .eq('account_id', client.id);

          if (formData.dataInizio) {
            visitsQuery = visitsQuery.gte('data_visita', `${formData.dataInizio}T00:00:00`);
          }
          if (formData.dataFine) {
            visitsQuery = visitsQuery.lte('data_visita', `${formData.dataFine}T23:59:59`);
          }

          const { data: visits } = await visitsQuery;
          const numVisite = visits?.length || 0;
          const fatturatoVisite = visits?.reduce((sum, v) => sum + (parseFloat(v.importo_vendita) || 0), 0) || 0;

          // Calcola km (da posizione utente, se disponibile - TODO)
          const km = 0; // Placeholder

          return {
            ...client,
            numVisite,
            fatturatoVisite,
            km,
          };
        })
      );

      // 4. Filtra in base al tipo
      let filteredClients = clientsWithStats;

      if (formData.type === 'lista_visite') {
        filteredClients = filteredClients.filter(c => c.numVisite >= (formData.minVisite || 0));
      } else if (formData.type === 'lista_fatturato') {
        filteredClients = filteredClients.filter(c => {
          const fatturato = c.fatturatoVisite;
          const min = formData.minFatturato || 0;
          const max = formData.maxFatturato || Infinity;
          return fatturato >= min && fatturato <= max;
        });
      } else if (formData.type === 'lista_prodotto') {
        // TODO: Implementare query prodotti quando avremo la relazione
        alert('Filtro per prodotto non ancora implementato (richiede relazione visite-prodotti)');
        return;
      } else if (formData.type === 'lista_km') {
        // TODO: Implementare calcolo km quando avremo coordinate utente
        alert('Filtro per km non ancora implementato (richiede geocoding completo)');
        return;
      }

      if (filteredClients.length === 0) {
        alert('Nessun cliente corrisponde ai filtri selezionati');
        return;
      }

      // 5. Ordina
      if (formData.ordinaPer === 'nome') {
        filteredClients.sort((a, b) => a.name.localeCompare(b.name));
      } else if (formData.ordinaPer === 'fatturato') {
        filteredClients.sort((a, b) => b.fatturatoVisite - a.fatturatoVisite);
      }

      // 6. Prepara dati per PDF
      const clientiLista: ClienteListaDetail[] = filteredClients.map(c => ({
        nome: c.name,
        citta: c.city,
        numVisite: c.numVisite,
        ultimaVisita: c.ultimaVisita ? new Date(c.ultimaVisita).toLocaleDateString('it-IT') : null,
        fatturato: c.fatturatoVisite, // 💡 CORREZIONE 2: Usa 'fatturato' come richiesto dal tipo ClienteListaDetail
        km: c.km,
        note: null, // TODO: Aggiungere note se servono
      }));

      // Calcola totali
      const numClienti = clientiLista.length;
      const visiteTotali = clientiLista.reduce((sum, c) => sum + c.numVisite, 0);
      const fatturatoTotale = clientiLista.reduce((sum, c) => sum + c.fatturato, 0);
      const kmTotali = clientiLista.reduce((sum, c) => sum + c.km, 0);

      // Descrizione filtro
      let descrizione = '';
      let filtroTipoString = ''; // Aggiungo una variabile per il tipo in formato stringa per il filename
      if (formData.type === 'lista_visite') {
        const periodo = formData.periodo === 'settimana' ? 'Settimana' : formData.periodo === 'mese' ? 'Mese' : 'Trimestre';
        descrizione = `>=${formData.minVisite} visite in ${periodo}`;
        filtroTipoString = 'Visite';
      } else if (formData.type === 'lista_fatturato') {
        const periodo = formData.periodo === 'settimana' ? 'Settimana' : formData.periodo === 'mese' ? 'Mese' : 'Trimestre';
        const max = formData.maxFatturato ? ` - €${formData.maxFatturato}` : '+';
        descrizione = `Fatturato €${formData.minFatturato}${max} in ${periodo}`;
        filtroTipoString = 'Fatturato';
      } else if (formData.type === 'lista_prodotto') {
        filtroTipoString = 'Prodotto';
        // ... Logica per descrizione prodotto
      } else if (formData.type === 'lista_km') {
        filtroTipoString = 'Km';
        // ... Logica per descrizione km
      }

      const reportData: ReportListaClientiData = {
        nomeAgente: user.email?.split('@')[0] || 'Agente',
        dataGenerazione: new Date().toLocaleString('it-IT'),
        filtri: {
          tipo: formData.type,
          descrizione,
        },
        clienti: clientiLista,
        numClienti,
        visiteTotali,
        fatturatoTotale,
        kmTotali,
      };

      // 7. Genera PDF
      const pdfBlob = await generateReportListaClienti(reportData);

      // 8. Salva su device
      const filename = generateListaClientiFilename(filtroTipoString, undefined, formData.dataFine);
      const filePath = await savePdfToDevice(pdfBlob, filename);

      if (!filePath) {
        alert('Download PDF annullato');
        return;
      }

      // 9. Salva metadata nel DB (La struttura di questo oggetto è ORA CORRETTA)
      const metadataForDB: DocumentMetadata = {
          filtro_tipo: formData.type,
          periodo: formData.periodo,
          num_clienti: numClienti,
          visite_tot: visiteTotali,
      };
      
      await saveDocumentMetadata({
        document_type: 'lista_clienti',
        title: `Lista ${filtroTipoString} - ${descrizione}`,
        filename,
        file_path: filePath,
        metadata: metadataForDB, // L'oggetto metadati corretto
        file_size: pdfBlob.size,
      });

      // 10. Success!
      alert('✅ Lista generata e salvata!');
      setSelectedReportType(null);
      setShowModal(false);
      if (onSuccess) onSuccess();

    } catch (e: any) {
      console.error('[Lista] Errore generazione:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: '100%',
          padding: '16px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#2563eb',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        ➕ GENERA NUOVO REPORT
      </button>

      {/* Modale selezione tipo */}
      {showModal && !selectedReportType && (
        <GenerateReportModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSelectReport={handleSelectReport}
        />
      )}

      {/* Form Report Visite */}
      {selectedReportType === 'visite' && (
        <GenerateReportVisiteButton
          onClose={() => {
            setSelectedReportType(null);
            setShowModal(false);
          }}
          onSuccess={onSuccess}
        />
      )}

      {/* Form configurazione lista */}
      {selectedReportType && selectedReportType !== 'visite' && (
        <ListaClientiForm
          reportType={selectedReportType as any}
          onBack={() => setSelectedReportType(null)}
          onGenerate={handleGenerateLista}
        />
      )}
    </>
  );
}
