// app/page.tsx  (Server Component)
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../lib/supabase/server";
import HomeClient from "../components/HomeClient";
import CryptoShell from "../components/CryptoShell";

function deriveNames(email?: string | null, fullName?: string | null) {
  const safe = (s?: string | null) => (s || "").trim();
  const fn = safe(fullName);
  if (fn) {
    const parts = fn.split(/\s+/);
    return { first_name: parts[0] || "Utente", last_name: parts.slice(1).join(" ") || "" };
  }
  const local = safe(email?.split("@")[0]);
  if (!local) return { first_name: "Utente", last_name: "" };
  const bySep = local.split(/[._-]+/).filter(Boolean);
  if (bySep.length >= 2) return { first_name: bySep[0], last_name: bySep.slice(1).join(" ") };
  return { first_name: local, last_name: "" };
}

export default async function Page() {
  const supabase = createSupabaseServer();

  // 1) Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  // 2) Profilo
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user!.id)
    .maybeSingle();

  let first_name = profile?.first_name ?? "";
  let last_name = profile?.last_name ?? "";

  if (!first_name && !last_name) {
    const derived = deriveNames(user?.email ?? null, (user?.user_metadata as any)?.full_name ?? null);
    await supabase
      .from("profiles")
      .upsert({ id: user!.id, first_name: derived.first_name, last_name: derived.last_name }, { onConflict: "id" });
    first_name = derived.first_name;
    last_name = derived.last_name;
  }

  const userName = [first_name, last_name].filter(Boolean).join(" ").trim();

  // 3) Render: avvolgiamo il contenuto nel guscio client con Provider + bottone
  return (
    <CryptoShell>
      <p>Se vedi il bottone in alto, clicca “🔒 Sblocca dati”.</p>
      <HomeClient email={user?.email ?? ""} userName={userName} />
    </CryptoShell>
  );
}
