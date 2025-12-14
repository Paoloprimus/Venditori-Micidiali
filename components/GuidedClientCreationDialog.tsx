// components/GuidedClientCreationDialog.tsx
"use client";

import { useEffect, useRef } from "react";

type ClientData = {
  name: string;
  city: string;
  street: string;
  tipo_locale: string;
  phone: string;
  email: string;
  notes: string;
};

type Step = 'name' | 'city' | 'street' | 'tipo_locale' | 'phone' | 'email' | 'notes' | 'confirm';

interface Props {
  active: boolean;
  currentStep: Step;
  clientData: Partial<ClientData>;
  onClose: () => void;
}

const STEP_LABELS: Record<Step, string> = {
  name: 'Nome cliente',
  city: 'Città',
  street: 'Indirizzo',
  tipo_locale: 'Tipo locale',
  phone: 'Telefono',
  email: 'Email',
  notes: 'Note',
  confirm: 'Conferma',
};

const STEP_ICONS: Record<Step, string> = {
  name: '🏪',
  city: '🏙️',
  street: '📍',
  tipo_locale: '🍽️',
  phone: '📞',
  email: '📧',
  notes: '📝',
  confirm: '✅',
};

export default function GuidedClientCreationDialog({ active, currentStep, clientData, onClose }: Props) {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active && progressRef.current) {
      // Anima progress bar
      const steps: Step[] = ['name', 'city', 'street', 'tipo_locale', 'phone', 'email', 'notes', 'confirm'];
      const stepIndex = steps.indexOf(currentStep);
      const progress = ((stepIndex + 1) / steps.length) * 100;
      progressRef.current.style.width = `${progress}%`;
    }
  }, [active, currentStep]);

  if (!active) return null;

  const isConfirmStep = currentStep === 'confirm';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Card principale */}
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          width: '100%',
          maxWidth: 480,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header con progress */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>
              🎙️ Nuovo Cliente a Voce
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              ref={progressRef}
              style={{
                height: '100%',
                background: 'white',
                borderRadius: 2,
                transition: 'width 0.4s ease-out',
                width: '12.5%',
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '32px 24px' }}>
          {isConfirmStep ? (
            // Riepilogo finale
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                  Perfetto! Ecco il riepilogo:
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  Controlla i dati e conferma per salvare
                </p>
              </div>

              {/* Riepilogo dati */}
              <div style={{ 
                background: '#f9fafb', 
                borderRadius: 12, 
                padding: 16,
                border: '1px solid #e5e7eb',
                marginBottom: 24,
              }}>
                {Object.entries(clientData).map(([key, value]) => {
                  if (!value) return null;
                  const step = key as Step;
                  return (
                    <div key={key} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      <span style={{ fontSize: 20 }}>{STEP_ICONS[step]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                          {STEP_LABELS[step]}
                        </div>
                        <div style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>
                          {value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ 
                padding: 12, 
                background: '#eff6ff', 
                border: '1px solid #3b82f6',
                borderRadius: 8,
                fontSize: 13,
                color: '#1e40af',
                textAlign: 'center',
              }}>
                💬 Di' <strong>"Sì"</strong> per salvare o <strong>"No"</strong> per annullare
              </div>
            </div>
          ) : (
            // Step corrente
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>{STEP_ICONS[currentStep]}</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                {STEP_LABELS[currentStep]}
              </h3>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                {currentStep === 'name' && 'Come si chiama il locale o il cliente?'}
                {currentStep === 'city' && 'In che città si trova?'}
                {currentStep === 'street' && 'Qual è l\'indirizzo completo?'}
                {currentStep === 'tipo_locale' && 'È un bar, ristorante, hotel o altro?'}
                {currentStep === 'phone' && 'Hai un numero di telefono? (o di\' "salta")'}
                {currentStep === 'email' && 'Hai un indirizzo email? (o di\' "salta")'}
                {currentStep === 'notes' && 'Vuoi aggiungere delle note? (o di\' "no")'}
              </p>

              {/* Microfono animato */}
              <div style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                animation: 'pulse 2s ease-in-out infinite',
                boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)',
              }}>
                <span style={{ fontSize: 48 }}>🎤</span>
              </div>

              {/* Valore corrente (se già inserito) */}
              {clientData[currentStep] && (
                <div style={{
                  marginTop: 24,
                  padding: 12,
                  background: '#f0fdf4',
                  border: '1px solid #10b981',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#047857',
                }}>
                  ✓ Attuale: <strong>{clientData[currentStep]}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Animazione pulse CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}

