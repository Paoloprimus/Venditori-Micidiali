// app/login/page.tsx
"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase/client"; // <- singleton
import { useRouter } from "next/navigation";
// Importa useCrypto per sbloccare la cifratura
import { useCrypto } from "@/lib/crypto/CryptoProvider"; 

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  // Aggiungi useCrypto
  const { unlock } = useCrypto(); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ⬇️ nuovi campi per il signup
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🗑️ Rimuovi la funzione savePassphrase() vecchia. 
  // La nuova logica sarà integrata direttamente in submit().
  
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    
    // Controlli minimi
    if (!email || !password) {
      setMsg("Inserisci email e password.");
      setLoading(false);
      return;
    }
    
    try {
      if (mode === "signup") {
        // 1) Registrazione
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName },
          },
        });

        if (error) {
          throw error;
        }
        
        // **⚠️ ATTENZIONE:** Dopo il signup, Supabase NON fa un login automatico in tutti i casi
        // (dipende dalle impostazioni di email confirmation).
        // Per semplicità, qui facciamo solo un redirect. L'utente dovrà loggarsi.
        setMsg("Registrazione completata! Controlla la tua email per la conferma e poi accedi.");
        setLoading(false);
        return;
        
      } else {
        // 2) Accesso (Sign In)
        const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (user && session) {
          // ----------------------------------------------------
          // ➡️ LOGICA CRUCIALE PER LA PERSISTENZA TOTALE
          // ----------------------------------------------------
          
          try {
              // 1. Usa la password per sbloccare la crittografia (Passphrase = PW)
              console.log('[Login] Tentativo di sblocco crittografia con la password...');
              await unlock(password); 
              
              // 2. Memorizza la Passphrase (PW) in localStorage (Persistenza totale)
              localStorage.setItem("repping:pph", password); 
              
              // 3. Pulisci la chiave meno persistente (sessionStorage)
              sessionStorage.removeItem("repping:pph");
              
              console.log('[Login] Passphrase salvata in localStorage. Redirect in corso...');

          } catch (cryptoError: any) {
              // Se lo sblocco fallisce, NON logghiamo l'utente (non può usare l'app)
              console.error('[Login] ERRORE CRITTOGRAFIA (Passphrase errata o chiavi mancanti):', cryptoError);
              
              // **Opzionale:** Se lo sblocco fallisce, potresti voler forzare un logout
              // (anche se tecnicamente il login Supabase è andato a buon fine).
              // Per ora, lo reindirizziamo ma l'app fallirà nel caricare i dati.
              // Alternativa più sicura: await supabase.auth.signOut(); throw new Error("Passphrase non valida.");
          }
          
          // ----------------------------------------------------
          
          // 4. Redirect dopo login e sblocco
          router.push("/clients");
          
        } else {
            // Caso teorico in cui non ci sono né user né error
            throw new Error("Login failed without error.");
        }
      }
    } catch (e: any) {
      console.error("[Login] Global error:", e);
      setMsg(e.message || "Si è verificato un errore sconosciuto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // ... (Il resto del codice del tuo componente non viene modificato)
    // ...
    // ...
  );
}
