'use client';

import { useEffect, useState } from 'react';
import OSMMapClustered, { MapPoint } from '@/components/OSMMapClustered';
import './map-clusters.css';

export default function MappaPage() {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carica i dati via API
    fetch('/api/horeca-data')
      .then(res => res.json())
      .then(data => {
        setPoints(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Errore caricamento dati:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Mappa HoReCa Verona
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {loading ? 'Caricamento...' : `${points.length.toLocaleString()} punti caricati da OpenStreetMap`}
          </p>
        </div>
      </div>

      {/* Mappa */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Caricamento dati...</p>
          </div>
        ) : points.length > 0 ? (
          <OSMMapClustered
            points={points}
            height="calc(100vh - 180px)"
            zoom={11}
            center={[45.4384, 10.9916]}
            onMarkerClick={(point) => {
              console.log('Clicked:', point);
            }}
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              Nessun dato disponibile.
            </p>
          </div>
        )}
      </div>

      {/* Statistiche */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Statistiche</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Restaurant</p>
              <p className="text-lg font-bold text-gray-900">
                {points.filter(p => p.tipo === 'restaurant').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cafe</p>
              <p className="text-lg font-bold text-gray-900">
                {points.filter(p => p.tipo === 'cafe').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bar</p>
              <p className="text-lg font-bold text-gray-900">
                {points.filter(p => p.tipo === 'bar').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

