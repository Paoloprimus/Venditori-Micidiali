"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface UserData {
  profile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    created_at: string;
  } | null;
  consents: Array<{
    consent_type: string;
    granted: boolean;
    document_version: string;
    created_at: string;
  }>;
  stats: {
    accounts_count: number;
    contacts_count: number;
    conversations_count: number;
    messages_count: number;
    notes_count: number;
  };
}

interface ConsentRecord {
  consent_type: string;
  granted: boolean;
  document_version: string;
  created_at: string;
}

export default function MyDataPage() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      setLoading(true);
      setError(null);

      // Verifica autenticazione
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      // Carica profilo
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, created_at")
        .eq("id", user.id)
        .single();

      // Carica consensi
      const { data: consents } = await supabase
        .from("consents")
        .select("consent_type, granted, document_version, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Conta dati (statistiche aggregate senza esporre dati sensibili)
      const [
        { count: accounts_count },
        { count: contacts_count },
        { count: conversations_count },
        { count: messages_count },
        { count: notes_count },
      ] = await Promise.all([
        supabase.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("notes").select("id", { count: "exact", head: true }),
      ]);

      setUserData({
        profile: profile ? {
          ...profile,
          email: user.email || "",
        } : null,
        consents: consents || [],
        stats: {
          accounts_count: accounts_count || 0,
          contacts_count: contacts_count || 0,
          conversations_count: conversations_count || 0,
          messages_count: messages_count || 0,
          notes_count: notes_count || 0,
        },
      });

    } catch (err) {
      console.error("Errore caricamento dati:", err);
      setError("Errore nel caricamento dei dati. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData() {
    try {
      setExporting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessione scaduta. Ricarica la pagina.");
        return;
      }

      // Scarica tutti i dati dell'utente
      const [
        { data: profile },
        { data: accounts },
        { data: contacts },
        { data: conversations },
        { data: messages },
        { data: notes },
        { data: consents },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("contacts").select("*"),
        supabase.from("conversations").select("*").eq("user_id", user.id),
        supabase.from("messages").select("*").eq("user_id", user.id),
        supabase.from("notes").select("*"),
        supabase.from("consents").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        export_format_version: "1.0",
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        profile,
        consents,
        data: {
          accounts,
          contacts,
          conversations,
          messages,
          notes,
        },
        metadata: {
          app: "REPING",
          version: "Beta 1.0",
          gdpr_article: "Art. 20 - Diritto alla portabilità dei dati",
        },
      };

      // Crea e scarica file JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repping-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Errore export:", err);
      setError("Errore durante l'export. Riprova.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "ELIMINA") {
      setError("Scrivi 'ELIMINA' per confermare");
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessione scaduta");
        return;
      }

      // Nota: la cancellazione vera dell'account richiede una chiamata server-side
      // con il service_role. Per ora cancelliamo solo i dati dell'utente.
      // L'account auth.users verrà gestito manualmente o tramite edge function.

      // Cancella tutti i dati dell'utente (l'ordine è importante per le FK)
      const userId = user.id;

      // 1. Messages (referenziano conversations)
      await supabase.from("messages").delete().eq("user_id", userId);
      
      // 2. Conversations
      await supabase.from("conversations").delete().eq("user_id", userId);
      
      // 3. Notes, Contacts, Proposals (referenziano accounts)
      // Le policy RLS limitano già l'accesso, ma per sicurezza filtriamo via accounts
      const { data: userAccounts } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", userId);
      
      if (userAccounts && userAccounts.length > 0) {
        const accountIds = userAccounts.map(a => a.id);
        await supabase.from("notes").delete().in("account_id", accountIds);
        await supabase.from("contacts").delete().in("account_id", accountIds);
        await supabase.from("proposals").delete().in("account_id", accountIds);
        await supabase.from("account_monthly_volume").delete().in("account_id", accountIds);
      }
      
      // 4. Accounts
      await supabase.from("accounts").delete().eq("user_id", userId);
      
      // 5. Profile
      await supabase.from("profiles").delete().eq("id", userId);
      
      // 6. Consents (per audit, potremmo volerli mantenere ma anonimizzati)
      // Per ora li cancelliamo
      await supabase.from("consents").delete().eq("user_id", userId);

      // 7. Logout e pulizia storage
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();

      // Redirect alla home con messaggio
      alert("I tuoi dati sono stati cancellati. Per eliminare completamente l'account auth, contatta support@repping.it");
      window.location.href = "/";

    } catch (err) {
      console.error("Errore cancellazione:", err);
      setError("Errore durante la cancellazione. Contatta support@repping.it");
    } finally {
      setDeleting(false);
    }
  }

  function formatConsentType(type: string): string {
    const map: Record<string, string> = {
      tos: "Termini di Servizio",
      privacy: "Privacy Policy",
      marketing: "Marketing",
      cookie_analytics: "Cookie Analytics",
      cookie_all: "Tutti i Cookie",
    };
    return map[type] || type;
  }

  // Raggruppa consensi per tipo (mostra solo l'ultimo per tipo)
  function getLatestConsents(): ConsentRecord[] {
    if (!userData?.consents) return [];
    const byType: Record<string, ConsentRecord> = {};
    for (const c of userData.consents) {
      if (!byType[c.consent_type]) {
        byType[c.consent_type] = c;
      }
    }
    return Object.values(byType);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="topbar">
        <Link href="/" className="iconbtn">← Home</Link>
        <span className="title">I Miei Dati</span>
        <span className="spacer" />
        <span className="badge">GDPR Art. 15-20</span>
      </div>

      {/* Contenuto */}
      <div className="container py-8 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Profilo */}
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">👤 Profilo</h2>
          
          {userData?.profile ? (
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Nome</span>
                <span className="text-slate-900">{userData.profile.first_name} {userData.profile.last_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900">{userData.profile.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Ruolo</span>
                <span className="text-slate-900 capitalize">{userData.profile.role || "agente"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Registrato il</span>
                <span className="text-slate-900">
                  {new Date(userData.profile.created_at).toLocaleDateString("it-IT")}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Profilo non trovato</p>
          )}
        </section>

        {/* Statistiche dati */}
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📊 I Tuoi Dati</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{userData?.stats.accounts_count || 0}</p>
              <p className="text-slate-500">Clienti</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{userData?.stats.contacts_count || 0}</p>
              <p className="text-slate-500">Contatti</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{userData?.stats.conversations_count || 0}</p>
              <p className="text-slate-500">Conversazioni</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{userData?.stats.messages_count || 0}</p>
              <p className="text-slate-500">Messaggi</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{userData?.stats.notes_count || 0}</p>
              <p className="text-slate-500">Note</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Nota: I dati dei clienti sono cifrati end-to-end. Solo tu puoi decifrarli con la tua password.
          </p>
        </section>

        {/* Consensi */}
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">✅ Consensi</h2>
          
          {getLatestConsents().length > 0 ? (
            <div className="space-y-3">
              {getLatestConsents().map((consent) => (
                <div key={consent.consent_type} className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm text-slate-900">{formatConsentType(consent.consent_type)}</p>
                    <p className="text-xs text-slate-500">
                      {consent.document_version} • {new Date(consent.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    consent.granted 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"
                  }`}>
                    {consent.granted ? "Accettato" : "Rifiutato"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Nessun consenso registrato</p>
          )}

          <p className="text-xs text-slate-500 mt-4">
            Per modificare i consensi marketing, contatta{" "}
            <a href="mailto:privacy@repping.it" className="text-blue-600">privacy@repping.it</a>
          </p>
        </section>

        {/* Export dati */}
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📥 Esporta i Tuoi Dati</h2>
          
          <p className="text-sm text-slate-600 mb-4">
            Ai sensi dell'Art. 20 GDPR (Diritto alla portabilità), puoi scaricare tutti i tuoi dati 
            in formato JSON. Il file include profilo, clienti, contatti, conversazioni e note.
          </p>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="btn flex items-center gap-2"
          >
            {exporting ? "Preparazione..." : "⬇️ Scarica i miei dati (JSON)"}
          </button>
        </section>

        {/* Cancellazione account */}
        <section className="bg-white border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-700 mb-4">🗑️ Elimina Account</h2>
          
          <p className="text-sm text-slate-600 mb-4">
            Ai sensi dell'Art. 17 GDPR (Diritto all'oblio), puoi richiedere la cancellazione 
            di tutti i tuoi dati. Questa azione è <strong>irreversibile</strong>.
          </p>

          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-sm text-red-700 font-medium mb-2">⚠️ Attenzione</p>
            <ul className="text-xs text-red-600 space-y-1">
              <li>• Tutti i tuoi clienti, contatti e note saranno cancellati</li>
              <li>• Tutte le conversazioni e i messaggi saranno eliminati</li>
              <li>• I dati cifrati non potranno essere recuperati</li>
              <li>• Questa azione non può essere annullata</li>
            </ul>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Elimina il mio account
          </button>
        </section>

        {/* Link legali */}
        <footer className="flex flex-wrap gap-4 text-sm text-blue-600 pt-4">
          <Link href="/legal/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/legal/terms" className="hover:underline">Termini di Servizio</Link>
          <Link href="/legal/cookies" className="hover:underline">Cookie Policy</Link>
        </footer>
      </div>

      {/* Modal conferma cancellazione */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-red-700">Conferma Eliminazione</h3>
            
            <p className="text-sm text-slate-600">
              Per confermare la cancellazione del tuo account, scrivi <strong>ELIMINA</strong> nel campo sottostante:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="Scrivi ELIMINA"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              autoFocus
            />

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setError(null);
                }}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                disabled={deleting}
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "ELIMINA" || deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Eliminazione..." : "Elimina definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

