// app/(marketing)/page.tsx
// Landing Page REPING

"use client";

import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleBetaRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    
    setSubmitting(true);
    // TODO: Inviare email a un servizio (es. Supabase, Mailchimp)
    // Per ora simuliamo
    await new Promise(r => setTimeout(r, 1000));
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="font-sans">
      {/* ============ NAVBAR ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="text-xl font-bold text-white">REPING</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition">Funzionalità</a>
            <a href="#demo" className="text-slate-300 hover:text-white transition">Demo</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition">Prezzi</a>
            <a href="#beta" className="text-slate-300 hover:text-white transition">Beta</a>
          </div>

          <Link 
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Accedi
          </Link>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Testo */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-6">
                <span className="animate-pulse">●</span>
                Beta disponibile su invito
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Il tuo AI CoPilot
                <span className="text-blue-500"> alle Vendite</span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Vendi di più, meglio e in meno tempo.
                <br />
                Parla con l'assistente, lui fa il resto.
              </p>

              <div className="flex flex-wrap gap-4">
                <a 
                  href="#demo"
                  className="px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition flex items-center gap-2"
                >
                  <span>▶</span> Guarda Demo
                </a>
                <a 
                  href="#beta"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Richiedi Accesso Beta
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex items-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">🔐</span>
                  Dati cifrati E2E
                </div>
                <div className="flex items-center gap-2">
                  <span>🇮🇹</span>
                  Made in Italy
                </div>
                <div className="flex items-center gap-2">
                  <span>🚗</span>
                  Hands-free
                </div>
              </div>
            </div>

            {/* Screenshot/Mockup */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl p-4 border border-slate-700">
                <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Mockup app */}
                  <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-4 text-slate-500 text-sm">reping.app</span>
                  </div>
                  <div className="p-6 min-h-[300px] flex flex-col justify-center items-center text-center">
                    <div className="text-6xl mb-4">🤖</div>
                    <p className="text-slate-400 mb-4">&quot;Quanti clienti ho visitato questa settimana?&quot;</p>
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 text-blue-300">
                      <p>Hai visitato <strong>12 clienti</strong> questa settimana.</p>
                      <p className="text-sm text-blue-400 mt-1">+3 rispetto alla settimana scorsa 📈</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                AI Powered
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PAIN POINTS ============ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
            Ti riconosci in questi problemi?
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Ogni giorno gli agenti di commercio affrontano sfide che rubano tempo e riducono le vendite.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "⏰", title: "Pianificazione lenta", desc: "Perdo tempo a gestire la pianificazione delle attività" },
              { icon: "📋", title: "Info frammentate", desc: "Non ho tutte le info utili per la vendita a portata di mano" },
              { icon: "🚗", title: "Guida pericolosa", desc: "Non riesco a lavorare bene mentre guido" },
              { icon: "📊", title: "Nessuna visione", desc: "Non ho il polso della situazione e dello storico vendite" },
              { icon: "🗺️", title: "Percorsi inefficienti", desc: "Non so se i miei piani di visita sono razionali ed efficaci" },
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
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
            REPING risolve tutto questo
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Un assistente AI che capisce il tuo lavoro e ti aiuta ogni giorno.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                icon: "📱", 
                title: "Info sottomano", 
                desc: "Tutti i dati dei tuoi clienti, prodotti e storico sempre accessibili con una domanda.",
                color: "blue"
              },
              { 
                icon: "📊", 
                title: "Elaborazioni dati", 
                desc: "Analisi automatiche: fatturato, visite, trend. Chiedi e REPING calcola.",
                color: "green"
              },
              { 
                icon: "📝", 
                title: "Note personalizzate", 
                desc: "Appunti e promemoria per vendite mirate. Mai più dimenticare un dettaglio.",
                color: "purple"
              },
              { 
                icon: "💡", 
                title: "Consigli strategici", 
                desc: "Indicazioni operative basate sui tuoi dati. L'AI suggerisce, tu decidi.",
                color: "yellow"
              },
              { 
                icon: "🗺️", 
                title: "Percorsi ottimizzati", 
                desc: "Risparmia km e tempo. REPING pianifica i giri più efficienti.",
                color: "red"
              },
              { 
                icon: "🚗", 
                title: "Modalità Guida", 
                desc: "Hands-free totale. Parla mentre guidi, REPING ascolta e risponde.",
                color: "indigo"
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-2xl bg-gradient-to-br from-${feature.color}-50 to-white border border-${feature.color}-100 hover:shadow-xl transition`}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ VIDEO DEMO ============ */}
      <section id="demo" className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Guarda REPING in azione
          </h2>
          <p className="text-slate-400 mb-10">
            2 minuti per capire come REPING può trasformare il tuo lavoro.
          </p>

          {/* Video placeholder */}
          <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 group cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition shadow-lg">
                <span className="text-white text-3xl ml-1">▶</span>
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

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
            Scegli il piano giusto per te
          </h2>
          <p className="text-center text-slate-600 mb-12">
            Inizia gratis, scala quando vuoi.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* FREE */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-lg transition">
              <div className="text-sm font-medium text-slate-500 mb-2">STARTER</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">€0</div>
              <div className="text-slate-500 mb-6">per sempre</div>
              
              <ul className="space-y-3 mb-8">
                {["30 domande/giorno", "Storico 90 giorni", "3 export PDF/mese", "Supporto community"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button className="w-full py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:border-slate-400 transition">
                Inizia Gratis
              </button>
            </div>

            {/* PREMIUM */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-2xl shadow-xl transform md:-translate-y-4">
              <div className="text-sm font-medium text-blue-200 mb-2">PREMIUM</div>
              <div className="text-4xl font-bold text-white mb-1">€50</div>
              <div className="text-blue-200 mb-6">/mese</div>
              
              <ul className="space-y-3 mb-8">
                {["300 domande/giorno", "Storico illimitato", "Export PDF illimitati", "Analytics avanzati", "Supporto prioritario"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <span className="text-green-300">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition">
                Scegli Premium
              </button>
              
              <div className="mt-4 text-center text-blue-200 text-sm">
                ⭐ Il più scelto
              </div>
            </div>

            {/* PRO */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-lg transition">
              <div className="text-sm font-medium text-slate-500 mb-2">PRO</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">€150</div>
              <div className="text-slate-500 mb-6">/mese</div>
              
              <ul className="space-y-3 mb-8">
                {["Domande illimitate", "Tutto Premium +", "API access", "Multi-utente", "Supporto dedicato"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button className="w-full py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:border-slate-400 transition">
                Contattaci
              </button>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            Tutti i prezzi sono IVA esclusa. Fatturazione mensile o annuale (-20%).
          </p>
        </div>
      </section>

      {/* ============ BETA CTA ============ */}
      <section id="beta" className="py-20 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-sm mb-6">
            🚀 Posti limitati
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Vuoi provare REPING in anteprima?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Stiamo cercando <strong>10 agenti di commercio</strong> per testare REPING.
            <br />
            Accesso gratuito + supporto diretto con il team.
          </p>

          {submitted ? (
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-6 max-w-md mx-auto">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-semibold text-white mb-2">Richiesta inviata!</h3>
              <p className="text-green-100">
                Ti contatteremo presto all'indirizzo <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleBetaRequest} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="La tua email"
                required
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-white/50"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition disabled:opacity-50"
              >
                {submitting ? "Invio..." : "Richiedi Accesso"}
              </button>
            </form>
          )}

          <p className="mt-6 text-blue-200 text-sm">
            📧 Oppure scrivi a <a href="mailto:info@reping.it" className="underline">info@reping.it</a>
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 bg-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🤖</span>
                <span className="text-xl font-bold text-white">REPING</span>
              </div>
              <p className="text-slate-400 text-sm">
                Il tuo AI CoPilot alle Vendite.
                <br />
                Per agenti di commercio HoReCa.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Prodotto</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-white transition">Funzionalità</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Prezzi</a></li>
                <li><a href="#demo" className="hover:text-white transition">Demo</a></li>
                <li><a href="#beta" className="hover:text-white transition">Beta</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legale</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/legal/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/legal/terms" className="hover:text-white transition">Termini di Servizio</Link></li>
                <li><Link href="/legal/cookies" className="hover:text-white transition">Cookie Policy</Link></li>
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
    </div>
  );
}

