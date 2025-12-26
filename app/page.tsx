'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getNotesCount } from '@/lib/notes';

type Stats = {
  totalPlaces: number;
  selectedPlaces: number;
  selectedLimit: number;
  routes: number;
  notes: number;
};

export default function CopilotHomePage() {
  const [stats, setStats] = useState<Stats>({
    totalPlaces: 0,
    selectedPlaces: 0,
    selectedLimit: 100,
    routes: 0,
    notes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // Note locali (sempre disponibili)
    const notesCount = getNotesCount();
    
    // Dati da API (richiede auth)
    try {
      const [placesRes, selectedRes, routesRes] = await Promise.all([
        fetch('/api/places?limit=1'),
        fetch('/api/places/selected'),
        fetch('/api/routes'),
      ]);

      const placesData = await placesRes.json();
      
      let selectedData = { count: 0, limit: 100 };
      let routesData = { count: 0 };
      
      if (selectedRes.ok) {
        selectedData = await selectedRes.json();
        setIsLoggedIn(true);
      }
      
      if (routesRes.ok) {
        routesData = await routesRes.json();
      }

      setStats({
        totalPlaces: placesData.total || 0,
        selectedPlaces: selectedData.count || 0,
        selectedLimit: selectedData.limit || 100,
        routes: routesData.count || 0,
        notes: notesCount,
      });
    } catch (err) {
      console.error('Errore caricamento stats:', err);
      setStats(prev => ({ ...prev, notes: notesCount }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                🚀 REPING COPILOT
              </h1>
              <p className="text-slate-400 mt-1">
                Organizza i tuoi giri visite
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <span className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-full text-sm">
                  ✓ Connesso
                </span>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Accedi
                </Link>
              )}
              <Link
                href="/pro"
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              >
                PRO →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="📍"
            label="POI disponibili"
            value={loading ? '...' : stats.totalPlaces.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon="⭐"
            label="Miei luoghi"
            value={loading ? '...' : `${stats.selectedPlaces}/${stats.selectedLimit}`}
            color="emerald"
          />
          <StatCard
            icon="🛣️"
            label="Itinerari"
            value={loading ? '...' : stats.routes.toString()}
            color="cyan"
          />
          <StatCard
            icon="📝"
            label="Note"
            value={loading ? '...' : stats.notes.toString()}
            color="amber"
          />
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold text-white mb-4">Inizia subito</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <ActionCard
            href="/luoghi"
            icon="📍"
            title="I Miei Luoghi"
            description="Esplora e seleziona POI HoReCa nella tua zona"
            color="violet"
          />
          <ActionCard
            href="/itinerari"
            icon="🛣️"
            title="I Miei Itinerari"
            description="Crea percorsi ottimizzati per le visite"
            color="cyan"
          />
          <ActionCard
            href="/note"
            icon="📝"
            title="Le Mie Note"
            description="Gestisci e esporta le tue note sui clienti"
            color="amber"
          />
        </div>

        {/* Mappa preview */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Mappa HoReCa</h3>
              <p className="text-sm text-slate-400">
                {stats.totalPlaces.toLocaleString()} POI disponibili
              </p>
            </div>
            <Link
              href="/luoghi"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Esplora →
            </Link>
          </div>
          <div className="h-64 bg-slate-900/50 flex items-center justify-center">
            <Link
              href="/luoghi"
              className="text-slate-400 hover:text-white transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-4xl">🗺️</span>
              <span>Clicca per aprire la mappa</span>
            </Link>
          </div>
        </div>

        {/* Info box */}
        {!isLoggedIn && (
          <div className="mt-8 bg-blue-900/30 rounded-xl border border-blue-500/30 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-medium text-white">Accedi per sbloccare tutto</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Con un account puoi salvare i tuoi luoghi preferiti, creare itinerari 
                  e sincronizzare i dati tra dispositivi.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Accedi o Registrati
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-700/50 text-center">
          <p className="text-slate-500 text-sm">
            REPING COPILOT • Versione Light per agenti HoReCa
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/legal/privacy" className="text-slate-500 hover:text-slate-300 text-sm">
              Privacy
            </Link>
            <Link href="/legal/terms" className="text-slate-500 hover:text-slate-300 text-sm">
              Termini
            </Link>
            <Link href="/pro" className="text-slate-500 hover:text-slate-300 text-sm">
              REPING PRO
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: 'blue' | 'emerald' | 'cyan' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-600/20 border-blue-500/30',
    emerald: 'bg-emerald-600/20 border-emerald-500/30',
    cyan: 'bg-cyan-600/20 border-cyan-500/30',
    amber: 'bg-amber-600/20 border-amber-500/30',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: 'violet' | 'cyan' | 'amber';
}) {
  const colors = {
    violet: 'hover:bg-violet-900/30 hover:border-violet-500/50',
    cyan: 'hover:bg-cyan-900/30 hover:border-cyan-500/50',
    amber: 'hover:bg-amber-900/30 hover:border-amber-500/50',
  };

  return (
    <Link
      href={href}
      className={`block bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 transition-all ${colors[color]}`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </Link>
  );
}

