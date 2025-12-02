// components/drawers/DrawerImpostazioni.tsx
// Estratto da components/Drawers.tsx per mantenibilità

"use client";
import { useEffect, useState } from "react";
import { geocodeAddress } from '@/lib/geocoding';
import { supabase } from '@/lib/supabase/client';

interface DrawerImpostazioniProps {
  onClose: () => void;
}

export default function DrawerImpostazioni({ onClose }: DrawerImpostazioniProps) {
  // Stato Profilo
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileEmail, setProfileEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profileCreatedAt, setProfileCreatedAt] = useState('');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Stato Indirizzo Casa
  const [addressExpanded, setAddressExpanded] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCoords, setSavedCoords] = useState<string | null>(null);

  // Stato Pagina Iniziale
  const [homePageExpanded, setHomePageExpanded] = useState(false);
  const [homePageMode, setHomePageMode] = useState<'chat' | 'dashboard'>('chat');

  // Carica profilo utente
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setProfileEmail(user.email || '');
        setProfileCreatedAt(user.created_at || '');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');
          setProfileRole(profile.role || 'venditore');
        }
      } catch (e) {
        console.error('[Profile] Errore caricamento:', e);
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Carica impostazioni salvate
  useEffect(() => {
    const saved = localStorage.getItem('repping_settings');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.homeAddress) setHomeAddress(data.homeAddress);
        if (data.homeCity) setHomeCity(data.homeCity);
        if (data.homeLat && data.homeLon) {
          setSavedCoords(`${data.homeLat}, ${data.homeLon}`);
        }
        if (data.homePageMode === 'dashboard' || data.homePageMode === 'chat') {
          setHomePageMode(data.homePageMode);
        }
      } catch {}
    }
  }, []);

  function handleHomePageModeChange(mode: 'chat' | 'dashboard') {
    setHomePageMode(mode);
    try {
      const saved = localStorage.getItem('repping_settings');
      const data = saved ? JSON.parse(saved) : {};
      data.homePageMode = mode;
      localStorage.setItem('repping_settings', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('repping:homePageModeChanged', { detail: { mode } }));
    } catch {}
  }

  async function handleSaveProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Inserisci nome e cognome');
      return;
    }
    
    setProfileSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');
      
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName.trim(), last_name: lastName.trim() })
        .eq('id', user.id);
      
      if (error) throw error;
      setProfileEditing(false);
      alert('✅ Profilo aggiornato!');
    } catch (e: any) {
      console.error('[Profile] Errore salvataggio:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveAddress() {
    if (!homeAddress.trim() || !homeCity.trim()) {
      alert('Inserisci indirizzo e città');
      return;
    }

    setSaving(true);
    try {
      const coords = await geocodeAddress(homeAddress, homeCity);
      
      if (!coords) {
        alert('Indirizzo non trovato. Verifica i dati.');
        return;
      }

      const settings = {
        homeAddress, homeCity,
        homeLat: coords.latitude,
        homeLon: coords.longitude,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('repping_settings', JSON.stringify(settings));
      setSavedCoords(`${coords.latitude}, ${coords.longitude}`);
      alert('✅ Impostazioni salvate!\nIl punto di partenza verrà usato per ottimizzare i percorsi.');
    } catch (e: any) {
      console.error(e);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  const roleLabels: Record<string, string> = {
    admin: '👑 Amministratore',
    venditore: '💼 Venditore',
  };

  const accordionButtonStyle = (isExpanded: boolean) => ({
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: isExpanded ? '8px 8px 0 0' : 8,
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
  });

  const accordionContentStyle = {
    padding: 16,
    border: '1px solid #e5e7eb',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    background: 'white',
  };

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Impostazioni</div>
      </div>
      <div className="list" style={{ padding: 16 }}>
        
        {/* SEZIONE PROFILO */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setProfileExpanded(!profileExpanded)} style={accordionButtonStyle(profileExpanded)}>
            <span>👤 Il Mio Profilo</span>
            <span style={{ fontSize: 12 }}>{profileExpanded ? '▲' : '▼'}</span>
          </button>
          
          {profileExpanded && (
            <div style={accordionContentStyle}>
              {profileLoading ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>⏳ Caricamento profilo...</div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* Avatar e Nome */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 24, fontWeight: 700,
                    }}>
                      {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{firstName} {lastName}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{roleLabels[profileRole] || profileRole}</div>
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>📧 Email</div>
                    <div style={{ fontSize: 14, color: '#111827' }}>{profileEmail}</div>
                  </div>
                  
                  {/* Data registrazione */}
                  {profileCreatedAt && (
                    <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>📅 Membro dal</div>
                      <div style={{ fontSize: 14, color: '#111827' }}>
                        {new Date(profileCreatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                  
                  {/* Form modifica nome */}
                  {profileEditing ? (
                    <div style={{ display: 'grid', gap: 12, padding: 16, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#1e40af' }}>Nome</label>
                        <input value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #93c5fd' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#1e40af' }}>Cognome</label>
                        <input value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #93c5fd' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setProfileEditing(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>Annulla</button>
                        <button onClick={handleSaveProfile} disabled={profileSaving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: profileSaving ? 0.7 : 1 }}>
                          {profileSaving ? 'Salvo...' : '💾 Salva'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setProfileEditing(true)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                      ✏️ Modifica Nome
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SEZIONE INDIRIZZO CASA */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setAddressExpanded(!addressExpanded)} style={accordionButtonStyle(addressExpanded)}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span>📍 Punto di Partenza</span>
              {homeAddress && homeCity && !addressExpanded && (
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 400 }}>✓ {homeAddress}, {homeCity}</span>
              )}
            </div>
            <span style={{ fontSize: 12 }}>{addressExpanded ? '▲' : '▼'}</span>
          </button>
          
          {addressExpanded && (
            <div style={accordionContentStyle}>
              {homeAddress && homeCity && savedCoords && (
                <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, marginBottom: 16, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginBottom: 4 }}>✓ Indirizzo salvato</div>
                  <div style={{ fontSize: 13, color: '#166534' }}>{homeAddress}, {homeCity}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Coordinate: {savedCoords}</div>
                </div>
              )}
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                {homeAddress && homeCity ? 'Modifica il tuo indirizzo di partenza se necessario.' : 'Imposta il tuo indirizzo di casa o ufficio. Verrà usato per ottimizzare i percorsi giornalieri.'}
              </p>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Indirizzo</label>
                  <input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="Es. Via Roma 10" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Città</label>
                  <input value={homeCity} onChange={e => setHomeCity(e.target.value)} placeholder="Es. Milano" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db' }} />
                </div>
                <button onClick={handleSaveAddress} disabled={saving} style={{ marginTop: 8, width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvataggio...' : '💾 Salva Indirizzo'}
                </button>
                {savedCoords && (
                  <div style={{ marginTop: 8, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12, color: '#15803d' }}>
                    ✅ Coordinate salvate: {savedCoords}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SEZIONE PAGINA INIZIALE */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setHomePageExpanded(!homePageExpanded)} style={accordionButtonStyle(homePageExpanded)}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span>🏠 Pagina Iniziale</span>
              {!homePageExpanded && (
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>{homePageMode === 'chat' ? '💬 Chat' : '📊 Dashboard'}</span>
              )}
            </div>
            <span style={{ fontSize: 12 }}>{homePageExpanded ? '▲' : '▼'}</span>
          </button>
          
          {homePageExpanded && (
            <div style={accordionContentStyle}>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Scegli cosa vedere quando apri l'app:</p>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <HomePageOption mode="chat" currentMode={homePageMode} onChange={handleHomePageModeChange} title="Chat Assistente" description="Parla con l'assistente AI per cercare clienti, prodotti, info" icon="💬" />
                <HomePageOption mode="dashboard" currentMode={homePageMode} onChange={handleHomePageModeChange} title="Dashboard" description="KPI giornalieri, azioni rapide, riepilogo attività" icon="📊" />
              </div>

              <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', border: '1px solid #fde68a' }}>
                💡 Puoi sempre accedere all'altra vista dal menu laterale
              </div>
            </div>
          )}
        </div>

        {/* SEZIONE DRIVING MODE */}
        <div style={{ marginBottom: 16 }}>
          <a 
            href="/driving"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 12,
              textDecoration: 'none',
              color: 'white',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>🚗</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Modalità Guida</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Interfaccia hands-free per guidare</div>
              </div>
            </div>
            <span style={{ fontSize: 20 }}>→</span>
          </a>
        </div>

        {/* Versione App */}
        <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
          REPING Beta 1.0 • 2025
        </div>
      </div>
    </>
  );
}

// Sub-component per opzione pagina iniziale
function HomePageOption({ 
  mode, currentMode, onChange, title, description, icon 
}: { 
  mode: 'chat' | 'dashboard'; 
  currentMode: 'chat' | 'dashboard'; 
  onChange: (m: 'chat' | 'dashboard') => void; 
  title: string; 
  description: string; 
  icon: string;
}) {
  const isActive = mode === currentMode;
  return (
    <button
      onClick={() => onChange(mode)}
      style={{
        padding: 16, borderRadius: 12,
        border: isActive ? '2px solid #2563eb' : '1px solid #e5e7eb',
        background: isActive ? '#eff6ff' : 'white',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 28 }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{description}</div>
        </div>
        {isActive && <div style={{ marginLeft: 'auto', color: '#2563eb', fontWeight: 600 }}>✓</div>}
      </div>
    </button>
  );
}

