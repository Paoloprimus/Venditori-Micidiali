"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASE 1: Migrazione nomi attività da cifrato (name_enc) a chiaro (name)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Questa pagina admin:
 * 1. Carica tutti gli account con name_enc ma senza name popolato
 * 2. Decripta client-side ogni nome
 * 3. Salva il nome in chiaro nella colonna `name`
 * 
 * SICUREZZA: La decriptazione avviene nel browser, le chiavi non escono mai.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';

interface AccountToMigrate {
  id: string;
  name: string | null;
  name_enc: string | null;
  name_iv: string | null;
  city: string | null;
  name_migrated_at: string | null;
}

interface MigrationResult {
  id: string;
  status: 'success' | 'error' | 'skipped';
  name?: string;
  error?: string;
}

// Helper: converte hex PostgreSQL in base64
function hexToBase64(hexStr: unknown): string {
  if (!hexStr || typeof hexStr !== 'string') return '';
  if (!hexStr.startsWith('\\x')) return hexStr;
  const hex = hexStr.slice(2);
  const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
  return bytes;
}

export default function MigrateNamesPage() {
  const crypto = useCrypto();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [accounts, setAccounts] = useState<AccountToMigrate[]>([]);
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    needsMigration: 0,
    alreadyMigrated: 0,
    noEncrypted: 0,
  });

  // Verifica se utente è admin
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
      setChecking(false);
    }
    checkAdmin();
  }, []);

  // Carica account da migrare
  async function loadAccounts() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, name_enc, name_iv, city, name_migrated_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Errore caricamento accounts:', error);
      setLoading(false);
      return;
    }

    const all = data as AccountToMigrate[];
    
    // Calcola statistiche
    const needsMigration = all.filter(a => 
      a.name_enc && a.name_iv && (!a.name || a.name.trim() === '')
    );
    const alreadyMigrated = all.filter(a => a.name_migrated_at);
    const noEncrypted = all.filter(a => !a.name_enc || !a.name_iv);

    setStats({
      total: all.length,
      needsMigration: needsMigration.length,
      alreadyMigrated: alreadyMigrated.length,
      noEncrypted: noEncrypted.length,
    });

    setAccounts(needsMigration);
    setLoading(false);
  }

  // Esegui migrazione
  async function runMigration() {
    if (!crypto || !crypto.isUnlocked()) {
      alert('Crypto non sbloccato. Inserisci la passphrase prima.');
      return;
    }

    if (accounts.length === 0) {
      alert('Nessun account da migrare.');
      return;
    }

    if (!confirm(`Stai per migrare ${accounts.length} account.\n\nI nomi verranno decriptati e salvati in chiaro nella colonna 'name'.\n\nContinuare?`)) {
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress(0);

    const newResults: MigrationResult[] = [];

    // Assicurati che le chiavi dello scope siano disponibili
    if (typeof (crypto as any).getOrCreateScopeKeys === 'function') {
      await (crypto as any).getOrCreateScopeKeys('table:accounts');
    }

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      setProgress(Math.round(((i + 1) / accounts.length) * 100));

      try {
        // Salta se già ha un nome valido
        if (account.name && account.name.trim() !== '') {
          newResults.push({ id: account.id, status: 'skipped', name: account.name });
          continue;
        }

        // Salta se non ha dati cifrati
        if (!account.name_enc || !account.name_iv) {
          newResults.push({ id: account.id, status: 'skipped', error: 'No encrypted data' });
          continue;
        }

        // Prepara per decriptazione
        const recordForDecrypt = {
          name_enc: hexToBase64(account.name_enc),
          name_iv: hexToBase64(account.name_iv),
        };

        // Decripta
        const decrypted = await crypto.decryptFields(
          'table:accounts',
          'accounts',
          account.id,
          recordForDecrypt as Record<string, unknown>,
          ['name']
        );

        const decryptedName = decrypted?.name;

        if (!decryptedName || typeof decryptedName !== 'string' || decryptedName.trim() === '') {
          newResults.push({ id: account.id, status: 'error', error: 'Decrypted name is empty' });
          continue;
        }

        // Salva il nome in chiaro
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ 
            name: decryptedName.trim(),
            name_migrated_at: new Date().toISOString(),
          })
          .eq('id', account.id);

        if (updateError) {
          newResults.push({ id: account.id, status: 'error', error: updateError.message });
        } else {
          newResults.push({ id: account.id, status: 'success', name: decryptedName.trim() });
        }

      } catch (err: any) {
        newResults.push({ 
          id: account.id, 
          status: 'error', 
          error: err.message || 'Unknown error' 
        });
      }

      setResults([...newResults]);
    }

    setLoading(false);
    
    // Ricarica stats
    await loadAccounts();
  }

  // Render
  if (checking) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p>Verifica permessi...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h1 style={{ color: '#ef4444' }}>⛔ Accesso negato</h1>
        <p>Solo gli amministratori possono accedere a questa pagina.</p>
      </div>
    );
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>🔄 Migrazione Nomi Attività</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Fase 1: Decripta <code>name_enc</code> → salva in <code>name</code> (chiaro)
      </p>

      {/* Info box */}
      <div style={{ 
        background: '#f0f9ff', 
        border: '1px solid #0ea5e9', 
        borderRadius: 8, 
        padding: 16, 
        marginBottom: 24 
      }}>
        <h3 style={{ margin: 0, color: '#0369a1' }}>ℹ️ Cosa fa questa migrazione</h3>
        <ul style={{ margin: '8px 0', paddingLeft: 20, color: '#0369a1' }}>
          <li>Legge i nomi cifrati (<code>name_enc</code>) dal database</li>
          <li>Li decripta <strong>nel tuo browser</strong> (le chiavi non escono mai)</li>
          <li>Salva il nome in chiaro nella colonna <code>name</code></li>
          <li>I dati cifrati (<code>name_enc</code>) NON vengono eliminati</li>
        </ul>
      </div>

      {/* Statistiche */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div style={{ background: '#f3f4f6', padding: 16, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total}</div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>Totale account</div>
        </div>
        <div style={{ background: '#fef3c7', padding: 16, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{stats.needsMigration}</div>
          <div style={{ color: '#92400e', fontSize: 14 }}>Da migrare</div>
        </div>
        <div style={{ background: '#d1fae5', padding: 16, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{stats.alreadyMigrated}</div>
          <div style={{ color: '#065f46', fontSize: 14 }}>Già migrati</div>
        </div>
        <div style={{ background: '#e5e7eb', padding: 16, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#6b7280' }}>{stats.noEncrypted}</div>
          <div style={{ color: '#4b5563', fontSize: 14 }}>Senza enc</div>
        </div>
      </div>

      {/* Azioni */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={loadAccounts}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '⏳ Caricamento...' : '🔍 Analizza Account'}
        </button>

        <button
          onClick={runMigration}
          disabled={loading || accounts.length === 0}
          style={{
            padding: '12px 24px',
            background: stats.needsMigration > 0 ? '#059669' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: (loading || accounts.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (loading || accounts.length === 0) ? 0.5 : 1,
          }}
        >
          {loading ? `⏳ Migrazione... ${progress}%` : `🚀 Migra ${stats.needsMigration} Account`}
        </button>
      </div>

      {/* Progress bar */}
      {loading && progress > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            background: '#e5e7eb', 
            borderRadius: 9999, 
            height: 8, 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              background: '#059669', 
              height: '100%', 
              width: `${progress}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ textAlign: 'center', marginTop: 8, color: '#6b7280' }}>
            {progress}% completato
          </p>
        </div>
      )}

      {/* Risultati */}
      {results.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3>Risultati migrazione</h3>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <span style={{ color: '#059669' }}>✅ Successo: {successCount}</span>
            <span style={{ color: '#ef4444' }}>❌ Errori: {errorCount}</span>
            <span style={{ color: '#6b7280' }}>⏭️ Saltati: {skippedCount}</span>
          </div>

          {/* Lista errori */}
          {errorCount > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: '#ef4444' }}>
                Mostra {errorCount} errori
              </summary>
              <div style={{ 
                maxHeight: 300, 
                overflow: 'auto', 
                background: '#fef2f2', 
                padding: 16, 
                borderRadius: 8, 
                marginTop: 8 
              }}>
                {results.filter(r => r.status === 'error').map(r => (
                  <div key={r.id} style={{ marginBottom: 8, fontSize: 14 }}>
                    <code>{r.id.slice(0, 8)}...</code>: {r.error}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Lista successi (collapsible) */}
          {successCount > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: '#059669' }}>
                Mostra {successCount} migrati con successo
              </summary>
              <div style={{ 
                maxHeight: 300, 
                overflow: 'auto', 
                background: '#f0fdf4', 
                padding: 16, 
                borderRadius: 8, 
                marginTop: 8 
              }}>
                {results.filter(r => r.status === 'success').map(r => (
                  <div key={r.id} style={{ marginBottom: 8, fontSize: 14 }}>
                    <code>{r.id.slice(0, 8)}...</code>: <strong>{r.name}</strong>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Prossimi passi */}
      <div style={{ 
        background: '#f9fafb', 
        border: '1px solid #e5e7eb', 
        borderRadius: 8, 
        padding: 16 
      }}>
        <h3 style={{ margin: '0 0 12px 0' }}>📋 Prossimi passi (dopo migrazione)</h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: '#4b5563' }}>
          <li>Verifica che i nomi siano visibili correttamente nell'app</li>
          <li>Testa la ricerca clienti (dovrebbe usare <code>name</code> in chiaro)</li>
          <li>Procedi con Fase 2: Logging conversazioni + RAG</li>
          <li>(Opzionale futuro) Rimuovi <code>name_enc</code> dopo conferma</li>
        </ol>
      </div>
    </div>
  );
}
