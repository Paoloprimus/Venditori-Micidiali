'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamic imports per componenti Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });

type Place = {
  id: string;
  nome: string;
  tipo: string;
  indirizzo_stradale?: string;
  comune: string;
  lat: number;
  lon: number;
  telefono?: string;
  website?: string;
};

type Route = {
  id: string;
  nome: string;
  descrizione?: string;
  places_sequence: string[];
  places: Place[];
  color: string;
  created_at: string;
  updated_at: string;
};

export default function ItinerariPage() {
  // State
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  
  // Modals
  const [showNewRouteModal, setShowNewRouteModal] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  
  // New route form
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteColor, setNewRouteColor] = useState('#3B82F6');
  
  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    loadRoutes();
    loadAvailablePlaces();
  }, []);

  // Aggiorna selectedRoute quando routes cambia
  useEffect(() => {
    if (selectedRoute) {
      const updated = routes.find(r => r.id === selectedRoute.id);
      if (updated) {
        setSelectedRoute(updated);
      }
    }
  }, [routes]);

  const loadRoutes = async () => {
    try {
      const res = await fetch('/api/routes');
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
      }
    } catch (err) {
      console.error('Errore caricamento itinerari:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePlaces = async () => {
    try {
      const res = await fetch('/api/places/selected');
      if (res.ok) {
        const data = await res.json();
        setAvailablePlaces(data.places || []);
      }
    } catch (err) {
      console.error('Errore caricamento luoghi:', err);
    }
  };

  const createRoute = async () => {
    if (!newRouteName.trim()) {
      alert('Inserisci un nome per l\'itinerario');
      return;
    }

    // Prendi i primi 2 luoghi disponibili come demo
    const initialPlaces = availablePlaces.slice(0, 2).map(p => p.id);

    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: newRouteName,
          places_sequence: initialPlaces.length > 0 ? initialPlaces : [],
          color: newRouteColor,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadRoutes();
        setSelectedRoute(data.route);
        setShowNewRouteModal(false);
        setNewRouteName('');
      } else {
        const error = await res.json();
        alert(error.message || 'Errore creazione itinerario');
      }
    } catch (err) {
      console.error('Errore creazione itinerario:', err);
    }
  };

  const deleteRoute = async (routeId: string) => {
    if (!confirm('Eliminare questo itinerario?')) return;

    try {
      const res = await fetch(`/api/routes/${routeId}`, { method: 'DELETE' });
      if (res.ok) {
        setRoutes(prev => prev.filter(r => r.id !== routeId));
        if (selectedRoute?.id === routeId) {
          setSelectedRoute(null);
        }
      }
    } catch (err) {
      console.error('Errore eliminazione:', err);
    }
  };

  const addPlaceToRoute = async (placeId: string) => {
    if (!selectedRoute) return;

    const newSequence = [...selectedRoute.places_sequence, placeId];
    const addedPlace = availablePlaces.find(p => p.id === placeId);

    // Aggiorna UI ottimisticamente
    if (addedPlace) {
      setSelectedRoute({
        ...selectedRoute,
        places_sequence: newSequence,
        places: [...selectedRoute.places, addedPlace],
      });
    }

    try {
      const res = await fetch(`/api/routes/${selectedRoute.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places_sequence: newSequence }),
      });

      if (res.ok) {
        await loadRoutes();
        setShowAddPlaceModal(false);
      }
    } catch (err) {
      console.error('Errore aggiunta luogo:', err);
    }
  };

  const removePlaceFromRoute = async (placeId: string) => {
    if (!selectedRoute) return;

    const newSequence = selectedRoute.places_sequence.filter(id => id !== placeId);

    try {
      const res = await fetch(`/api/routes/${selectedRoute.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places_sequence: newSequence }),
      });

      if (res.ok) {
        await loadRoutes();
      }
    } catch (err) {
      console.error('Errore rimozione luogo:', err);
    }
  };

  const reorderPlaces = async (fromIndex: number, toIndex: number) => {
    if (!selectedRoute) return;

    const newSequence = [...selectedRoute.places_sequence];
    const [moved] = newSequence.splice(fromIndex, 1);
    newSequence.splice(toIndex, 0, moved);

    // Aggiorna UI ottimisticamente
    const newPlaces = [...selectedRoute.places];
    const [movedPlace] = newPlaces.splice(fromIndex, 1);
    newPlaces.splice(toIndex, 0, movedPlace);

    setSelectedRoute({
      ...selectedRoute,
      places_sequence: newSequence,
      places: newPlaces,
    });

    try {
      await fetch(`/api/routes/${selectedRoute.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places_sequence: newSequence }),
      });
      await loadRoutes();
    } catch (err) {
      console.error('Errore riordino:', err);
    }
  };

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === toIndex) return;
    reorderPlaces(draggedIndex, toIndex);
    setDraggedIndex(null);
  };

  // Navigazione
  const startNavigation = (app: 'google' | 'waze') => {
    if (!selectedRoute || selectedRoute.places.length === 0) return;

    const waypoints = selectedRoute.places.map(p => `${p.lat},${p.lon}`);
    
    if (app === 'google') {
      // Google Maps supporta waypoints
      const destination = waypoints.pop();
      const waypointsParam = waypoints.length > 0 ? `&waypoints=${waypoints.join('|')}` : '';
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypointsParam}`;
      window.open(url, '_blank');
    } else {
      // Waze: naviga al primo punto
      const first = selectedRoute.places[0];
      const url = `https://www.waze.com/ul?ll=${first.lat},${first.lon}&navigate=yes`;
      window.open(url, '_blank');
    }
  };

  // Colori disponibili
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16'
  ];

  // Polyline per la mappa
  const polylinePositions = selectedRoute?.places.map(p => [p.lat, p.lon] as [number, number]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                🛣️ I Miei Itinerari
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Crea e gestisci i tuoi percorsi di visita
              </p>
            </div>
            
            <button
              onClick={() => setShowNewRouteModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              + Nuovo itinerario
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lista itinerari */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-white">Itinerari salvati</h2>
              <p className="text-sm text-slate-400">{routes.length} itinerari</p>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Caricamento...</div>
              ) : routes.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>Nessun itinerario creato.</p>
                  <button
                    onClick={() => setShowNewRouteModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                  >
                    Crea il primo
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {routes.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRoute(route)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedRoute?.id === route.id
                          ? 'bg-blue-900/30 border-l-4 border-blue-500'
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: route.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{route.nome}</h3>
                          <p className="text-sm text-slate-400">
                            {route.places?.length || 0} tappe
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRoute(route.id);
                          }}
                          className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dettaglio itinerario con drag & drop */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white">
                    {selectedRoute ? selectedRoute.nome : 'Seleziona un itinerario'}
                  </h2>
                  {selectedRoute && (
                    <p className="text-sm text-slate-400">
                      Trascina per riordinare le tappe
                    </p>
                  )}
                </div>
                {selectedRoute && (
                  <button
                    onClick={() => setShowAddPlaceModal(true)}
                    className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg text-sm transition-colors"
                  >
                    + Aggiungi tappa
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {!selectedRoute ? (
                <div className="p-8 text-center text-slate-400">
                  Seleziona un itinerario dalla lista
                </div>
              ) : selectedRoute.places.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>Nessuna tappa in questo itinerario.</p>
                  <button
                    onClick={() => setShowAddPlaceModal(true)}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
                  >
                    Aggiungi tappe
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {selectedRoute.places.map((place, index) => (
                    <div
                      key={place.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`p-4 cursor-grab active:cursor-grabbing transition-all ${
                        draggedIndex === index ? 'opacity-50 bg-blue-900/20' : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Numero tappa */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: selectedRoute.color }}
                        >
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{place.nome}</h4>
                          <p className="text-sm text-slate-400 truncate">
                            {place.indirizzo_stradale || place.comune}
                          </p>
                        </div>

                        {/* Azioni */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
                              window.open(url, '_blank');
                            }}
                            className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors"
                            title="Naviga"
                          >
                            🗺️
                          </button>
                          <button
                            onClick={() => removePlaceFromRoute(place.id)}
                            className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                            title="Rimuovi"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pulsanti navigazione */}
            {selectedRoute && selectedRoute.places.length > 0 && (
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <p className="text-xs text-slate-400 mb-2">Avvia navigazione:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => startNavigation('google')}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🗺️ Google Maps
                  </button>
                  <button
                    onClick={() => startNavigation('waze')}
                    className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🚗 Waze
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mappa */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-white">Mappa percorso</h2>
            </div>
            <div className="h-[400px]">
              {isClient && (
                <MapContainer
                  center={
                    selectedRoute?.places.length
                      ? [selectedRoute.places[0].lat, selectedRoute.places[0].lon]
                      : [45.4384, 10.9916]
                  }
                  zoom={12}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                  key={selectedRoute?.id || 'default'}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Polyline del percorso */}
                  {polylinePositions.length > 1 && (
                    <Polyline
                      positions={polylinePositions}
                      color={selectedRoute?.color || '#3B82F6'}
                      weight={4}
                      opacity={0.8}
                    />
                  )}
                  
                  {/* Marker delle tappe */}
                  {selectedRoute?.places.map((place, index) => (
                    <Marker
                      key={place.id}
                      position={[place.lat, place.lon]}
                    >
                      <Popup>
                        <div className="min-w-[150px]">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: selectedRoute.color }}
                            >
                              {index + 1}
                            </span>
                            <strong>{place.nome}</strong>
                          </div>
                          <p className="text-sm text-gray-600">{place.comune}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nuovo Itinerario */}
      {showNewRouteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Nuovo itinerario</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="Es: Giro Verona Centro"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Colore</label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewRouteColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newRouteColor === color ? 'scale-125 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewRouteModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={createRoute}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Crea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi Tappa */}
      {showAddPlaceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700 max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4">Aggiungi tappa</h3>
            <p className="text-sm text-slate-400 mb-4">
              Seleziona un luogo da "I Miei Luoghi"
            </p>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {availablePlaces.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  Nessun luogo disponibile.
                  <br />
                  <a href="/luoghi" className="text-blue-400 hover:underline">
                    Vai a "I Miei Luoghi"
                  </a>
                </p>
              ) : (
                availablePlaces
                  .filter(p => !selectedRoute?.places_sequence.includes(p.id))
                  .map((place) => (
                    <button
                      key={place.id}
                      onClick={() => addPlaceToRoute(place.id)}
                      className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left transition-colors"
                    >
                      <h4 className="font-medium text-white">{place.nome}</h4>
                      <p className="text-sm text-slate-400">
                        {place.tipo} • {place.comune}
                      </p>
                    </button>
                  ))
              )}
            </div>

            <button
              onClick={() => setShowAddPlaceModal(false)}
              className="mt-4 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

