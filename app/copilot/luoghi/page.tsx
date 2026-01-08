'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { getNote, saveNote, getNotesCount, type PlaceNote } from '@/lib/notes';

// Dynamic imports per componenti Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster'), { ssr: false });

type Place = {
  id: string;
  nome: string;
  tipo: string;
  indirizzo_stradale?: string;
  comune: string;
  provincia?: string;
  cap?: string;
  lat: number;
  lon: number;
  telefono?: string;
  website?: string;
  email?: string;
  opening_hours?: string;
  added_at?: string;
  last_visited?: string;
};

type FilterData = {
  tipi: { tipo: string; count: number }[];
  comuni: { comune: string; provincia: string; count: number }[];
  total: number;
};

export default function LuoghiPage() {
  // State
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedLimit, setSelectedLimit] = useState(100);
  const [filters, setFilters] = useState<FilterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'explore' | 'myplaces'>('explore');
  
  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedComune, setSelectedComune] = useState('');
  
  // Map
  const [isClient, setIsClient] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([45.4384, 10.9916]);

  // Carica dati iniziali
  useEffect(() => {
    setIsClient(true);
    loadFilters();
    loadAllPlaces();
    loadSelectedPlaces();
  }, []);

  // Ricarica quando cambiano i filtri
  useEffect(() => {
    loadAllPlaces();
  }, [selectedTipo, selectedComune, searchQuery]);

  const loadFilters = async () => {
    try {
      const res = await fetch('/api/places/filters');
      const data = await res.json();
      setFilters(data);
    } catch (err) {
      console.error('Errore caricamento filtri:', err);
    }
  };

  const loadAllPlaces = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTipo) params.set('tipo', selectedTipo);
      if (selectedComune) params.set('comune', selectedComune);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', '500');

      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();
      setAllPlaces(data.places || []);
    } catch (err) {
      console.error('Errore caricamento places:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedPlaces = async () => {
    try {
      const res = await fetch('/api/places/selected');
      if (res.ok) {
        const data = await res.json();
        setSelectedPlaces(data.places || []);
        setSelectedCount(data.count || 0);
        setSelectedLimit(data.limit || 100);
      }
    } catch (err) {
      console.error('Errore caricamento selected:', err);
    }
  };

  const isPlaceSelected = useCallback((placeId: string) => {
    return selectedPlaces.some(p => p.id === placeId);
  }, [selectedPlaces]);

  const togglePlace = async (place: Place) => {
    const isSelected = isPlaceSelected(place.id);

    try {
      if (isSelected) {
        // Rimuovi
        const res = await fetch(`/api/places/select?place_id=${place.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setSelectedPlaces(prev => prev.filter(p => p.id !== place.id));
          setSelectedCount(prev => prev - 1);
        }
      } else {
        // Aggiungi
        const res = await fetch('/api/places/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place_id: place.id }),
        });
        
        if (res.ok) {
          setSelectedPlaces(prev => [...prev, { ...place, added_at: new Date().toISOString() }]);
          setSelectedCount(prev => prev + 1);
        } else {
          const data = await res.json();
          if (data.error === 'limit_reached') {
            alert(data.message);
          }
        }
      }
    } catch (err) {
      console.error('Errore toggle place:', err);
    }
  };

  const displayedPlaces = activeTab === 'explore' ? allPlaces : selectedPlaces;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                🗺️ I Miei Luoghi
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Esplora e seleziona i POI per la tua zona
              </p>
            </div>
            
            {/* Contatore limite tier */}
            <div className="bg-slate-700/50 rounded-xl px-4 py-2 border border-slate-600/50">
              <div className="text-xs text-slate-400 mb-1">Luoghi selezionati</div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${
                  selectedCount >= selectedLimit ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {selectedCount}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-300">{selectedLimit}</span>
              </div>
              {selectedCount >= selectedLimit && (
                <p className="text-xs text-amber-400 mt-1">
                  ⚡ Limite raggiunto
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'explore'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            🔍 Esplora ({filters?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('myplaces')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'myplaces'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            ⭐ I Miei Luoghi ({selectedCount})
          </button>
        </div>
      </div>

      {/* Filtri (solo in explore) */}
      {activeTab === 'explore' && (
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Ricerca */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cerca</label>
                <input
                  type="text"
                  placeholder="Nome o indirizzo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tipo</label>
                <select
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tutti i tipi</option>
                  {filters?.tipi.map(t => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.tipo} ({t.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Comune */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Comune</label>
                <select
                  value={selectedComune}
                  onChange={(e) => setSelectedComune(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tutti i comuni</option>
                  {filters?.comuni.slice(0, 50).map(c => (
                    <option key={c.comune} value={c.comune}>
                      {c.comune} ({c.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista luoghi */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-white">
                {activeTab === 'explore' ? 'POI disponibili' : 'I tuoi luoghi'}
              </h2>
              <p className="text-sm text-slate-400">
                {displayedPlaces.length} {activeTab === 'explore' ? 'risultati' : 'selezionati'}
              </p>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  Caricamento...
                </div>
              ) : displayedPlaces.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  {activeTab === 'explore' 
                    ? 'Nessun risultato per i filtri selezionati'
                    : 'Nessun luogo selezionato. Vai su "Esplora" per aggiungerne!'}
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {displayedPlaces.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      isSelected={isPlaceSelected(place.id)}
                      onToggle={() => togglePlace(place)}
                      onCenter={() => setMapCenter([place.lat, place.lon])}
                      isLimitReached={selectedCount >= selectedLimit}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mappa */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-white">Mappa</h2>
            </div>
            <div className="h-[500px]">
              {isClient && (
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                  key={`${mapCenter[0]}-${mapCenter[1]}`}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MarkerClusterGroup chunkedLoading>
                    {displayedPlaces.map((place) => (
                      <Marker
                        key={place.id}
                        position={[place.lat, place.lon]}
                      >
                        <Popup>
                          <div className="min-w-[200px]">
                            <h3 className="font-bold text-gray-900">{place.nome}</h3>
                            <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full mt-1">
                              {place.tipo}
                            </span>
                            {place.indirizzo_stradale && (
                              <p className="text-sm text-gray-600 mt-2">
                                📍 {place.indirizzo_stradale}
                              </p>
                            )}
                            <p className="text-sm text-gray-500">{place.comune}</p>
                            
                            <button
                              onClick={() => togglePlace(place)}
                              className={`mt-3 w-full py-2 rounded-lg font-medium text-sm transition-all ${
                                isPlaceSelected(place.id)
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                            >
                              {isPlaceSelected(place.id) ? '✕ Rimuovi' : '+ Aggiungi ai miei luoghi'}
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MarkerClusterGroup>
                </MapContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Card per singolo place
function PlaceCard({
  place,
  isSelected,
  onToggle,
  onCenter,
  isLimitReached,
}: {
  place: Place;
  isSelected: boolean;
  onToggle: () => void;
  onCenter: () => void;
  isLimitReached: boolean;
}) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [hasNote, setHasNote] = useState(false);

  // Carica nota esistente
  useEffect(() => {
    const existing = getNote(place.id);
    if (existing) {
      setNoteText(existing.note);
      setHasNote(true);
    }
  }, [place.id]);

  const handleSaveNote = () => {
    if (noteText.trim()) {
      saveNote(place.id, place.nome, noteText.trim());
      setHasNote(true);
    }
    setShowNote(false);
  };

  // Deep linking per navigazione
  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    window.open(url, '_blank');
  };

  const openWaze = () => {
    const url = `https://www.waze.com/ul?ll=${place.lat},${place.lon}&navigate=yes`;
    window.open(url, '_blank');
  };

  const openAppleMaps = () => {
    const url = `https://maps.apple.com/?daddr=${place.lat},${place.lon}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`p-4 hover:bg-slate-700/30 transition-colors ${
      isSelected ? 'bg-emerald-900/20 border-l-4 border-emerald-500' : ''
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{place.nome}</h3>
            {hasNote && (
              <span className="text-amber-400" title="Ha una nota">📝</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block px-2 py-0.5 text-xs bg-slate-600 text-slate-300 rounded-full">
              {place.tipo}
            </span>
            <span className="text-xs text-slate-500">{place.comune}</span>
          </div>
          {place.indirizzo_stradale && (
            <p className="text-sm text-slate-400 mt-1 truncate">
              📍 {place.indirizzo_stradale}
            </p>
          )}
          {place.telefono && (
            <a 
              href={`tel:${place.telefono}`}
              className="text-sm text-blue-400 hover:text-blue-300 mt-1 block"
            >
              📞 {place.telefono}
            </a>
          )}
          
          {/* Pulsanti navigazione */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={openGoogleMaps}
              className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
              title="Apri in Google Maps"
            >
              🗺️ Maps
            </button>
            <button
              onClick={openWaze}
              className="px-2 py-1 text-xs bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40 rounded transition-colors"
              title="Apri in Waze"
            >
              🚗 Waze
            </button>
            <button
              onClick={openAppleMaps}
              className="px-2 py-1 text-xs bg-slate-600/20 text-slate-400 hover:bg-slate-600/40 rounded transition-colors"
              title="Apri in Apple Maps"
            >
              🍎 Apple
            </button>
            <button
              onClick={() => setShowNote(!showNote)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                hasNote 
                  ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/40'
                  : 'bg-slate-600/20 text-slate-400 hover:bg-slate-600/40'
              }`}
              title={hasNote ? 'Modifica nota' : 'Aggiungi nota'}
            >
              📝 Nota
            </button>
          </div>

          {/* Area nota espandibile */}
          {showNote && (
            <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Scrivi una nota per questo luogo..."
                className="w-full h-20 bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowNote(false)}
                  className="px-3 py-1 text-xs bg-slate-600 text-slate-300 hover:bg-slate-500 rounded transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                >
                  💾 Salva
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Le note sono salvate nel browser
              </p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={onCenter}
            className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Centra sulla mappa"
          >
            🎯
          </button>
          <button
            onClick={onToggle}
            disabled={!isSelected && isLimitReached}
            className={`p-2 rounded-lg transition-colors ${
              isSelected
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
                : isLimitReached
                  ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed'
                  : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40'
            }`}
            title={isSelected ? 'Rimuovi' : isLimitReached ? 'Limite raggiunto' : 'Aggiungi'}
          >
            {isSelected ? '✕' : '+'}
          </button>
        </div>
      </div>
    </div>
  );
}

