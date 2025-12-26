'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Import dinamico per evitare SSR
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

// Tipo per un punto sulla mappa
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
};

type OSMMapProps = {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMarkerClick?: (point: MapPoint) => void;
};

export default function OSMMap({
  points,
  center = [45.4384, 10.9916], // Default: Verona
  zoom = 10,
  height = '600px',
  onMarkerClick,
}: OSMMapProps) {
  // Calcola centro automatico dai punti se non specificato
  const mapCenter = useMemo(() => {
    if (points.length === 0) return center;
    
    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const avgLon = points.reduce((sum, p) => sum + p.lon, 0) / points.length;
    
    return [avgLat, avgLon] as [number, number];
  }, [points, center]);

  // Carica Leaflet CSS solo client-side
  useMemo(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore - CSS imports without type declarations
      import('leaflet/dist/leaflet.css');
      // @ts-ignore - CSS imports without type declarations
      import('leaflet.markercluster/dist/MarkerCluster.css');
      // @ts-ignore - CSS imports without type declarations
      import('leaflet.markercluster/dist/MarkerCluster.Default.css');
    }
  }, []);

  if (typeof window === 'undefined') {
    return (
      <div style={{ height, background: '#e5e7eb' }} className="flex items-center justify-center">
        <p className="text-gray-600">Caricamento mappa...</p>
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {points.map((point, idx) => (
          <Marker
            key={point.id || idx}
            position={[point.lat, point.lon]}
            eventHandlers={{
              click: () => onMarkerClick?.(point),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-bold text-base mb-1">{point.nome}</h3>
                <p className="text-sm text-gray-600 mb-2">{point.tipo}</p>
                {point.indirizzo_stradale && (
                  <p className="text-xs text-gray-500">{point.indirizzo_stradale}</p>
                )}
                <p className="text-xs text-gray-500">
                  {point.comune}
                  {point.provincia && ` (${point.provincia})`}
                  {point.cap && ` - ${point.cap}`}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legenda */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg z-10">
        <p className="text-xs font-semibold mb-1">Punti: {points.length.toLocaleString()}</p>
        <p className="text-xs text-gray-500">Click su un marker per dettagli</p>
      </div>
    </div>
  );
}


