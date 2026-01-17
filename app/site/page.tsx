// app/site/page.tsx
// Landing Page REPING 

"use client";

import { useState } from "react";
import Link from "next/link";
import AnimatedMockup from "./demo";

// Logo Component - R lime su sfondo nero
function RepingLogo({ size = "md", light = false }: { size?: "sm" | "md" | "lg"; light?: boolean }) {
  const sizes = { sm: 32, md: 40, lg: 56 };
  const s = sizes[size];
  const textColor = light ? "text-white" : "text-slate-900";
  const textSize = size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-lg";
  
  return (
    <div className="flex items-center gap-2">
      {/* Logo Icon - R lime su sfondo nero */}
      <svg width={s} height={s} viewBox="0 0 512 512" fill="none">
        <rect width="512" height="512" rx="96" fill="#1e1e1e" />
        <text 
          x="256" 
          y="380" 
          fontFamily="Outfit, system-ui, sans-serif" 
          fontSize="360" 
          fontWeight="900" 
          fill="#BEFF00" 
          textAnchor="middle"
        >
          R
        </text>
      </svg>
      <span className={`font-bold ${textSize} ${textColor}`}>REPING</span>
    </div>
  );
}


// Beta Banner Component - Riutilizzabile
function BetaBanner({ variant = "default" }: { variant?: "default" | "large" | "sticky" }) {
  if (variant === "sticky") {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 text-center font-medium shadow-lg">
        🚧 VERSIONE BETA - Accesso su invito | <a href="#beta" className="underline font-bold">Richiedi accesso</a>
      </div>
    );
  }
  
  if (variant === "large") {
    return (
      <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white font-semibold text-lg shadow-lg">
        <span className="animate-pulse text-2xl">●</span>
        BETA - Accesso su invito
      </div>
    );
  }
  
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 border-2 border-amber-500/50 rounded-full text-amber-400 font-semibold">
      <span className="animate-pulse">●</span>
      BETA
    </div>
  );
}

// Form di candidatura Beta
interface BetaFormData {
  nome: string;
  email: string;
  settore: string;
  settoreAltro: string;
  ruolo: string;
  clienti: string;
  zona: string;
  telefono: string;
  esperienza: string;
  strumenti: string[];
  strumentiAltro: string;
  dispositivi: string;
  dispositiviAltro: string;
  comeConosciuto: string;
  privacy: boolean;
}

const INITIAL_FORM: BetaFormData = {
  nome: "",
  email: "",
  settore: "",
  settoreAltro: "",
  ruolo: "",
  clienti: "",
  zona: "",
  telefono: "",
  esperienza: "",
  strumenti: [],
  strumentiAltro: "",
  dispositivi: "",
  dispositiviAltro: "",
  comeConosciuto: "",
  privacy: false,
};

export default function LandingPage() {
  const [form, setForm] = useState<BetaFormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (field: keyof BetaFormData, value: string | boolean | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleStrumento = (strumento: string) => {
    setForm(prev => ({
      ...prev,
      strumenti: prev.strumenti.includes(strumento)
        ? prev.strumenti.filter(s => s !== strumento)
        : [...prev.strumenti, strumento]
    }));
  };

  async function handleBetaRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    // Validazione
    if (!form.nome || !form.email || !form.settore || !form.ruolo || 
        !form.clienti || !form.zona || !form.telefono || !form.esperienza ||
        form.strumenti.length === 0 || !form.dispositivi || !form.comeConosciuto) {
      setError("Compila tutti i campi obbligatori");
      return;
    }
    if (!form.privacy) {
      setError("Devi accettare la Privacy Policy per procedere");
      return;
    }
    if ((form.settore === "altro" && !form.settoreAltro) ||
        (form.strumenti.includes("Misto") && !form.strumentiAltro) ||
        (form.dispositivi === "altro" && !form.dispositiviAltro)) {
      setError("Specifica i campi 'Altro' selezionati");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepara dati per email
      const strumentiText = form.strumenti.includes("Misto") 
        ? form.strumenti.filter(s => s !== "Misto").join(", ") + " + " + form.strumentiAltro
        : form.strumenti.join(", ");
      
      const settoreText = form.settore === "altro" ? form.settoreAltro : form.settore;
      const dispositiviText = form.dispositivi === "altro" ? form.dispositiviAltro : form.dispositivi;

      // Invia via Web3Forms (gratuito, no backend)
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "0f7cea16-e0ed-4735-969f-aacbcc65595d",
          subject: `🎯 Candidatura Beta REPING: ${form.nome}`,
          from_name: "REPING Beta Form",
          to: "info@reping.it",
          // Dati candidatura
          "Nome": form.nome,
          "Email": form.email,
          "Telefono": form.telefono,
          "Settore": settoreText,
          "Ruolo": form.ruolo,
          "Clienti gestiti": form.clienti,
          "Zona": form.zona,
          "Esperienza": form.esperienza,
          "Strumenti attuali": strumentiText,
          "Dispositivi": dispositiviText,
          "Come ci ha conosciuto": form.comeConosciuto,
          // Messaggio formattato
          message: `
NUOVA CANDIDATURA BETA REPING
=============================

👤 DATI PERSONALI
Nome: ${form.nome}
Email: ${form.email}
Telefono: ${form.telefono}

💼 PROFILO PROFESSIONALE
Settore: ${settoreText}
Ruolo: ${form.ruolo}
Clienti gestiti: ${form.clienti}
Zona: ${form.zona}
Esperienza: ${form.esperienza}

🛠️ STRUMENTI E DISPOSITIVI
Strumenti attuali: ${strumentiText}
Dispositivi: ${dispositiviText}

📣 ACQUISIZIONE
Come ci ha conosciuto: ${form.comeConosciuto}

✅ Privacy accettata: Sì
          `.trim(),
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        throw new Error("Errore invio");
      }
    } catch (err) {
      setError("Errore nell'invio. Riprova o scrivi a info@reping.it");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="font-sans">
      {/* ============ NAVBAR ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-600 backdrop-blur-sm border-b border-slate-500">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <RepingLogo size="sm" light />
          </Link>
          
          <a 
            href="#beta"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white rounded-lg font-medium transition"
          >
            Richiedi Accesso Beta
          </a>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-40 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* Colonna sinistra: Titolo + Claim + CTA */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-8">
                REPING
                <br />
                <span className="text-white">IL CoPilota</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Intelligente</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">e Sicuro</span>
                <br />
                <span className="text-white">x Agenti di</span>
                <br />
                <span className="text-white">Commercio</span>
              </h1>

              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Vendi di più, meglio e in meno tempo.
              </p>

              {/* Features list MOBILE - sotto il claim */}
              <div className="lg:hidden mb-8 space-y-2 text-sm">
                {/* Feature intelligenti */}
                <p className="text-cyan-400">• Ottimizzazione pianificazione</p>
                <p className="text-cyan-400">• Suggerimenti proattivi</p>
                <p className="text-cyan-400">• Personalizzazione vendite</p>
                <p className="text-cyan-400">• Analisi, statistiche, report</p>
                
                {/* Feature sicure */}
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• Modalità Voce e Guida Sicura</p>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• Zero Data Retention sul Server</p>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• Crittografia End-to-End</p>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• GDPR-compliant by design</p>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• Made ❤️ in Italy</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <a 
                  href="#beta"
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-xl hover:opacity-90 transition shadow-lg"
                >
                  Richiedi Accesso Beta
                </a>
              </div>
            </div>

            {/* Colonna centrale: Features list DESKTOP */}
            <div className="hidden lg:block space-y-2 text-base whitespace-nowrap px-3">
              {/* Feature intelligenti */}
              <p className="text-cyan-400">• Ottimizzazione pianificazione</p>
              <p className="text-cyan-400">• Suggerimenti proattivi</p>
              <p className="text-cyan-400">• Personalizzazione vendite</p>
              <p className="text-cyan-400">• Analisi, statistiche, report</p>
              
              {/* Feature sicure */}
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• Modalità Voce e Guida Sicura</p>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• Zero Data Retention sul Server</p>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• Crittografia End-to-End</p>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• GDPR-compliant by design</p>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">• Made ❤️ in Italy</p>
            </div>

            {/* Colonna destra: Animated Mockup */}
            <div className="flex justify-center">
              <AnimatedMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ============ PAIN POINTS ============ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Quanto pesano queste difficoltà nel tuo lavoro?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "⏰", title: "Pianificazione lenta", desc: "Perdi tempo a gestire la pianificazione delle attività" },
              { icon: "📋", title: "Info frammentate", desc: "Non hai tutte le info utili per la vendita a portata di mano" },
              { icon: "🚗", title: "Guida pericolosa", desc: "Rischio incidenti per guardare e maneggiare uno schermo" },
              { icon: "📊", title: "Visione debole", desc: "Poco orientato verso l'obiettivo finale" },
              { icon: "🗺️", title: "Percorsi inefficienti", desc: "Non sei certo della tua pianificazione" },
              { icon: "🎯", title: "Scarsa personalizzazione", desc: "Non hai tempo e info sufficienti per migliorare la qualità del servizio clienti" },
            ].map((pain, i) => (
              <div 
                key={i} 
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-red-300 hover:shadow-lg transition group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition">{pain.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{pain.title}</h3>
                <p className="text-slate-600 text-sm">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES / BENEFITS ============ */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <BetaBanner />
            <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-4">
              REPING risolve tutto questo
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              AI CoPilot che capisce il tuo lavoro e ti supporta in molti modi.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "", title: "Info sottomano", desc: "Tutti i dati sempre immediatamente accessibili, anche solo con una domanda.", bg: "from-blue-50 to-white border-blue-100" },
              { icon: "", title: "Elaborazioni dati", desc: "Analisi automatiche: fatturato, visite, trend. Chiedi e REPING calcola.", bg: "from-green-50 to-white border-green-100" },
              { icon: "", title: "Note personalizzate", desc: "Appunti e promemoria per vendite mirate. Mai più dimenticare un dettaglio.", bg: "from-purple-50 to-white border-purple-100" },
              { icon: "", title: "Consigli strategici", desc: "Indicazioni operative basate sui tuoi dati. L'AI suggerisce, tu decidi.", bg: "from-yellow-50 to-white border-yellow-100" },
              { icon: "", title: "Percorsi ottimizzati", desc: "Risparmia km e tempo. REPING pianifica i giri più efficienti.", bg: "from-red-50 to-white border-red-100" },
              { icon: "", title: "Modalità Guida", desc: "Guida in sicurezza, REPING dialoga con te! Hands-free totale.", bg: "from-indigo-50 to-white border-indigo-100" },
            ].map((feature, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-2xl bg-gradient-to-br ${feature.bg} border hover:shadow-xl transition`}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SICUREZZA E2E ============ */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Testo */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm mb-4">
                <span>🔐</span>
                Privacy by Design
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                I tuoi dati sono <span className="text-green-400">SOLO tuoi</span>
              </h2>
              
              <p className="text-slate-300 mb-6 text-lg leading-relaxed">
                I dati sensibili dei tuoi clienti meritano la massima protezione. 
                Con REPING, sono <strong className="text-white">cifrati end-to-end</strong> e leggibili 
                <strong className="text-white"> esclusivamente sul tuo dispositivo</strong>.
              </p>
              
              <p className="text-slate-400 mb-8">
                Nemmeno noi di REPING possiamo accedere ai tuoi dati. 
                È una scelta tecnica complessa, ma necessaria per la tua tranquillità.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                  Crittografia end-to-end (AES-256)
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                  Zero-knowledge: nemmeno noi leggiamo i tuoi dati
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                  Conforme GDPR
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                  La tua password = la tua chiave di cifratura
                </li>
              </ul>
            </div>
            
            {/* Visual */}
            <div className="relative">
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-4xl">🔐</span>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-white font-bold text-lg">Dati sensibili cifrati</p>
                  <p className="text-slate-400 text-sm">Solo TU puoi decifrarli</p>
                </div>
                
                {/* Visual representation - dati realmente cifrati */}
                <div className="space-y-2">
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">🏢</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Nome cliente/azienda</p>
                      <p className="text-green-400 font-mono text-xs">████████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">👤</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Nome contatto</p>
                      <p className="text-green-400 font-mono text-xs">██████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">📧</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Email</p>
                      <p className="text-green-400 font-mono text-xs">████████████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">📞</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Telefono</p>
                      <p className="text-green-400 font-mono text-xs">██████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">📍</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Indirizzo</p>
                      <p className="text-green-400 font-mono text-xs">████████████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">🏛️</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">P.IVA</p>
                      <p className="text-green-400 font-mono text-xs">██████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-green-400 text-xs font-medium">Cifrato AES-256-GCM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ VIDEO DEMO ============ */}
      {/* 🔒 BETA: Sezione video commentata - da riattivare quando il video sarà pronto
      <section id="demo" className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <BetaBanner />
          <h2 className="text-3xl font-bold text-white mt-4 mb-4">
            Guarda REPING in azione
          </h2>
          <p className="text-slate-400 mb-10">
            2 minuti per capire come REPING può trasformare il tuo lavoro.
          </p>

          <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 group cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition shadow-lg">
                <span className="text-white text-4xl ml-2">▶</span>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 text-slate-500 text-sm">
              🎬 Video demo coming soon
            </div>
          </div>

          <p className="mt-6 text-slate-500 text-sm">
            Il video sarà disponibile a breve. Nel frattempo, <a href="#beta" className="text-blue-400 hover:underline">richiedi accesso al Beta</a> per provare dal vivo!
          </p>
        </div>
      </section>
      */}

      {/* ============ MODALITÀ D'USO ============ */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              3 Modalità d'Uso
            </h2>
            <p className="text-slate-600">
              Scegli come interagire con REPING in base alle tue esigenze
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* GUI */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">GUI Standard</h3>
              <p className="text-slate-600 text-sm">
                Interazione classica con interfaccia grafica, arricchita da
                funzioni <strong>proattive</strong> (pianificazione visite, utilizzo note clienti).
              </p>
            </div>
            
            {/* Chat */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Chat AI</h3>
              <p className="text-slate-600 text-sm">
                GUI + interazione in <strong>linguaggio naturale</strong> per funzioni avanzate: 
                elaborazioni statistiche, grafici personalizzati, analisi semantiche complesse.
              </p>
            </div>
            
            {/* Guida */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-emerald-200">
              <div className="text-4xl mb-4">🚗</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Modalità Guida</h3>
              <p className="text-slate-600 text-sm">
                Uso <strong>solo dialogico</strong> (voce + audio) per tutte le funzioni dell'app. 
                Perfetta per la <strong>guida sicura</strong>: niente schermo, solo conversazione.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ============ BETA CTA ============ */}
      <section id="beta" className="py-20 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 text-lg font-bold mb-6">
              🚀 BETA PER PRO SELEZIONATI
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Candidati al programma Beta
            </h2>
            <p className="text-slate-300 text-lg">
              Cerchiamo <strong className="text-white">agenti di commercio plurimandatari qualificati</strong> per completare la fase di Beta testing di REPING.
              <br />
              Se selezionato: <strong className="text-amber-400">accesso completo gratuito</strong> + supporto diretto con il team.
            </p>
          </div>

          {submitted ? (
            <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-8 text-center max-w-lg mx-auto">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-3">Candidatura inviata!</h3>
              <p className="text-slate-300 mb-4">
                Grazie <strong className="text-white">{form.nome}</strong>!
                <br />
                Valuteremo la tua candidatura e ti contatteremo entro 24h a <strong className="text-white">{form.email}</strong>
              </p>
              <p className="text-slate-400 text-sm">
                ⚠️ Se non verrai selezionato, i tuoi dati saranno cancellati.
              </p>
            </div>
          ) : (
            <form onSubmit={handleBetaRequest} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Sezione: Dati personali */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">👤</span> Dati personali
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Nome e Cognome *</label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={e => updateForm("nome", e.target.value)}
                      placeholder="Mario Rossi"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => updateForm("email", e.target.value)}
                      placeholder="mario@esempio.it"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Telefono *</label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={e => updateForm("telefono", e.target.value)}
                      placeholder="+39 333 1234567"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Zona (regione/provincia) *</label>
                    <input
                      type="text"
                      value={form.zona}
                      onChange={e => updateForm("zona", e.target.value)}
                      placeholder="es. Lombardia, Milano e provincia"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sezione: Profilo professionale */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">💼</span> Profilo professionale
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Settore *</label>
                    <select
                      value={form.settore}
                      onChange={e => updateForm("settore", e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="HoReCa">HoReCa (Hotel, Ristoranti, Caffè)</option>
                      <option value="Food&Beverage">Food & Beverage</option>
                      <option value="altro">Altro (specificare)</option>
                    </select>
                    {form.settore === "altro" && (
                      <input
                        type="text"
                        value={form.settoreAltro}
                        onChange={e => updateForm("settoreAltro", e.target.value)}
                        placeholder="Specifica il settore..."
                        className="w-full mt-2 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Ruolo *</label>
                    <select
                      value={form.ruolo}
                      onChange={e => updateForm("ruolo", e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="Monomandatario">Agente Monomandatario</option>
                      <option value="Plurimandatario">Agente Plurimandatario</option>
                      <option value="Dipendente">Venditore Dipendente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Quanti clienti gestisci? *</label>
                    <select
                      value={form.clienti}
                      onChange={e => updateForm("clienti", e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="<50">Meno di 50</option>
                      <option value="50-300">50 - 300</option>
                      <option value="300-500">300 - 500</option>
                      <option value=">500">Più di 500</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Anni di esperienza *</label>
                    <select
                      value={form.esperienza}
                      onChange={e => updateForm("esperienza", e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="<2">Meno di 2 anni</option>
                      <option value="2-10">2 - 10 anni</option>
                      <option value=">10">Più di 10 anni</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sezione: Strumenti e dispositivi */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">🛠️</span> Strumenti e dispositivi
                </h3>
                
                <div className="mb-4">
                  <label className="block text-slate-400 text-sm mb-2">Strumenti attuali per gestire i clienti * (seleziona tutti)</label>
                  <div className="flex flex-wrap gap-2">
                    {["CRM", "Excel", "App", "Carta", "Misto"].map(strumento => (
                      <button
                        key={strumento}
                        type="button"
                        onClick={() => toggleStrumento(strumento)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          form.strumenti.includes(strumento)
                            ? "bg-blue-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {strumento}
                      </button>
                    ))}
                  </div>
                  {form.strumenti.includes("Misto") && (
                    <input
                      type="text"
                      value={form.strumentiAltro}
                      onChange={e => updateForm("strumentiAltro", e.target.value)}
                      placeholder="Specifica gli strumenti usati..."
                      className="w-full mt-2 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1">Dispositivo principale per lavoro *</label>
                  <select
                    value={form.dispositivi}
                    onChange={e => updateForm("dispositivi", e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="iPhone">iPhone</option>
                    <option value="Android">Smartphone Android</option>
                    <option value="iPad">iPad</option>
                    <option value="Tablet Android">Tablet Android</option>
                    <option value="Mac">Mac</option>
                    <option value="PC Windows">PC Windows</option>
                    <option value="altro">Altro (specificare)</option>
                  </select>
                  {form.dispositivi === "altro" && (
                    <input
                      type="text"
                      value={form.dispositiviAltro}
                      onChange={e => updateForm("dispositiviAltro", e.target.value)}
                      placeholder="Specifica il dispositivo..."
                      className="w-full mt-2 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* Sezione: Come ci hai conosciuto */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">📣</span> Come ci hai conosciuto?
                </h3>
                <input
                  type="text"
                  value={form.comeConosciuto}
                  onChange={e => updateForm("comeConosciuto", e.target.value)}
                  placeholder="es. LinkedIn, passaparola, ricerca Google, altro..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Privacy e Submit */}
              <div className="border-t border-slate-700 pt-6">
                <label className="flex items-start gap-3 cursor-pointer mb-6">
                  <input
                    type="checkbox"
                    checked={form.privacy}
                    onChange={e => updateForm("privacy", e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-300 text-sm">
                    Ho letto e accetto la{" "}
                    <a href="https://reping.app/legal/privacy" target="_blank" className="text-blue-400 hover:underline">
                      Privacy Policy
                    </a>
                    . Comprendo che in caso di non selezione i miei dati saranno cancellati. *
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin">⏳</span> Invio in corso...
                    </>
                  ) : (
                    <>
                      🚀 Invia Candidatura
                    </>
                  )}
                </button>

                <p className="text-center text-slate-500 text-sm mt-4">
                  Problemi? Scrivi a{" "}
                  <a href="mailto:info@reping.it" className="text-blue-400 hover:underline">info@reping.it</a>
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 bg-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo */}
            <div>
              <RepingLogo size="md" light />
              <p className="text-slate-400 text-sm mt-4">
                Il tuo AI CoPilot alle Vendite.
                <br />
                Per agenti di commercio.
              </p>
              <div className="mt-3">
                <BetaBanner />
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Prodotto</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-white transition">Funzionalità</a></li>
                <li><a href="#beta" className="hover:text-white transition">Beta</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legale</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="https://reping.app/legal/privacy" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="https://reping.app/legal/terms" className="hover:text-white transition">Termini di Servizio</a></li>
                <li><a href="https://reping.app/legal/cookies" className="hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Contatti</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>📧 <a href="mailto:info@reping.it" className="hover:text-white transition">info@reping.it</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2025 REPING. Tutti i diritti riservati.
            </p>
            <p className="text-slate-500 text-sm">
              Made with ❤️ in Italy
            </p>
          </div>
        </div>
      </footer>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slideInRight {
          animation: slideInRight 0.4s ease-out forwards;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
