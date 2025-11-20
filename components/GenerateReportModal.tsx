// components/GenerateReportModal.tsx
'use client';

import { useState } from 'react';

type ReportType = 'visite' | 'lista_visite' | 'lista_fatturato' | 'lista_prodotto' | 'lista_km';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport: (type: ReportType) => void;
};

export default function GenerateReportModal({ isOpen, onClose, onSelectReport }: Props) {
  const [showListaSubmenu, setShowListaSubmenu] = useState(false);

  if (!isOpen) return null;

  function handleSelectPlanning() {
    onSelectReport('visite');
  }

  function handleSelectLista(type: ReportType) {
    onSelectReport(type);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: 16,
        padding: 0,
        maxWidth: 500,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 9999,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            📄 Che report vuoi generare?
          </h2>
        </div>

        {/* Contenuto */}
        <div style={{ padding: '16px 0' }}>
          {!showListaSubmenu ? (
            // Menu principale
            <>
              <button
                onClick={handleSelectPlanning}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  border: 'none',
                  background: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: 24 }}>📊</span>
                <div>
                  <div>Report Visite</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    Riepilogo visite per giorno, settimana o periodo
                  </div>
                </div>
              </button>

              <div style={{ height: 1, background: '#e5e7eb', margin: '8px 24px' }} />

              <button
                onClick={() => setShowListaSubmenu(true)}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  border: 'none',
                  background: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>📋</span>
                  <div>
                    <div>Lista Clienti per...</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                      Filtra clienti per visite, fatturato, prodotto, km
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 20, color: '#9ca3af' }}>›</span>
              </button>
            </>
          ) : (
            // Submenu liste clienti
            <>
              <button
                onClick={() => setShowListaSubmenu(false)}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  border: 'none',
                  background: '#f9fafb',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>‹</span>
                <span>Indietro</span>
              </button>

              <div style={{ padding: '16px 24px 8px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Seleziona criterio
                </div>
              </div>

              <button
                onClick={() => handleSelectLista('lista_visite')}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  border: 'none',
                  background: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: 20 }}>📅</span>
                <div>
                  <div>Numero Visite in Periodo</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    Es: clienti con &gt;5 visite nel trimestre
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectLista('lista_fatturato')}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  border: 'none',
                  background: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: 20 }}>💰</span>
                <div>
                  <div>Fatturato in Periodo</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    Es: clienti con fatturato €1000-€5000
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectLista('lista_prodotto')}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  border: 'none',
                  background: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: 20 }}>📦</span>
                <div>
                  <div>Prodotto Specifico</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    Es: clienti che hanno ordinato Vino
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectLista('lista_km')}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  border: 'none',
                  background: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: 20 }}>🚗</span>
                <div>
                  <div>Distanza (Km)</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    Es: clienti oltre 50km da ottimizzare
                  </div>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: 16,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Annulla
          </button>
        </div>
      </div>
    </>
  );
}
