'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
// @ts-ignore - CSS imports without type declarations
import 'leaflet/dist/leaflet.css';
// @ts-ignore - CSS imports without type declarations
import 'leaflet.markercluster/dist/MarkerCluster.css';
// @ts-ignore - CSS imports without type declarations
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster'),
  { ssr: false }
);

export type MapPoint = {
  id?: string;
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
  source?: string;
};

type OSMMapClusteredProps = {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMarkerClick?: (point: MapPoint) => void;
};

// Componente per auto-fit bounds (carica dinamicamente)
const FitBoundsToMarkers = dynamic(
  () => Promise.resolve(function FitBoundsInner({ points }: { points: MapPoint[] }) {
    const { useMap } = require('react-leaflet');
    const map = useMap();
    
    useMemo(() => {
      if (points.length > 0 && map && typeof map.fitBounds === 'function') {
        import('leaflet').then((L) => {
          const bounds = L.default.latLngBounds(
            points.map((p: MapPoint) => [p.lat, p.lon] as [number, number])
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        });
      }
    }, [points, map]);

    return null;
  }),
  { ssr: false }
);

export default function OSMMapClustered({
  points,
  center = [45.4384, 10.9916],
  zoom = 11,
  height = '600px',
  onMarkerClick,
}: OSMMapClusteredProps) {
  const [isClient, setIsClient] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useMemo(() => {
    setIsClient(true);
    // Carica note da localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reping-horeca-notes');
      if (saved) {
        setNotes(JSON.parse(saved));
      }
    }
  }, []);

  const saveNote = (pointId: string, note: string) => {
    const newNotes = { ...notes, [pointId]: note };
    setNotes(newNotes);
    if (typeof window !== 'undefined') {
      localStorage.setItem('reping-horeca-notes', JSON.stringify(newNotes));
    }
  };

  if (typeof window === 'undefined' || !isClient) {
    return (
      <div style={{ height, background: '#e5e7eb' }} className="flex items-center justify-center">
        <p className="text-gray-600">Caricamento mappa...</p>
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <FitBoundsToMarkers points={points} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MarkerClusterGroup chunkedLoading>
          {points.map((point, idx) => {
            const pointId = `${point.nome}_${point.comune}_${idx}`;
            const currentNote = notes[pointId] || '';
            
            return (
              <Marker
                key={point.id || idx}
                position={[point.lat, point.lon]}
                eventHandlers={{
                  click: () => onMarkerClick?.(point),
                }}
              >
                <Popup maxWidth={300} className="custom-popup">
                  <div className="p-2 min-w-[250px]">
                    {/* Header */}
                    <div className="border-b pb-2 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{point.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {point.tipo}
                        </span>
                        {point.source && (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            {point.source}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Indirizzo */}
                    {point.indirizzo_stradale && (
                      <p className="text-sm text-gray-700 mb-1">
                        📍 {point.indirizzo_stradale}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mb-2">
                      {point.comune}
                      {point.provincia && ` (${point.provincia})`}
                      {point.cap && ` - ${point.cap}`}
                    </p>
                    
                    {/* Contatti */}
                    {(point.telefono || point.website || point.email) && (
                      <div className="mb-3 pb-3 border-b space-y-1">
                        {point.telefono && (
                          <p className="text-sm text-gray-700">
                            📞 <a href={`tel:${point.telefono}`} className="text-blue-600 hover:underline">
                              {point.telefono}
                            </a>
                          </p>
                        )}
                        {point.website && (
                          <p className="text-sm text-gray-700">
                            🌐 <a href={point.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Sito web
                            </a>
                          </p>
                        )}
                        {point.email && (
                          <p className="text-sm text-gray-700">
                            ✉️ <a href={`mailto:${point.email}`} className="text-blue-600 hover:underline">
                              {point.email}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Note editabili */}
                    <div className="mt-3 pt-3 border-t">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        📝 Note personali:
                      </label>
                      <textarea
                        className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                        placeholder="Aggiungi note personalizzate..."
                        defaultValue={currentNote}
                        onBlur={(e) => saveNote(pointId, e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💾 Salvate automaticamente sul tuo browser
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Legenda */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
        <p className="text-xs font-semibold mb-1">
          📍 {points.length.toLocaleString()} punti HoReCa
        </p>
        <p className="text-xs text-gray-500">Click sui cluster per zoom</p>
      </div>

      {/* Filtro tipo */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-lg z-[1000] max-w-[200px]">
        <p className="text-xs font-semibold mb-1">Tipi presenti:</p>
        {[...new Set(points.map(p => p.tipo))].slice(0, 5).map(tipo => (
          <p key={tipo} className="text-xs text-gray-600">• {tipo}</p>
        ))}
      </div>
    </div>
  );
}
