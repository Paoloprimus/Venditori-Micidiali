// Server Component: verifica login e mostra la home con chat integrata (stato interno)
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../lib/supabase/server";
import HomeClient from "../components/HomeClient";

export default async function Page() {
  const supabase = createSupabaseServer();

  // 1) Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) {
    redirect("/login");
  }

  // 2) Profilo (nome/cognome) — opzionale: se manca, usiamo un fallback
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user!.id)
    .maybeSingle();

  const userName =
    (profile?.first_name && profile?.last_name)
      ? `${profile.first_name} ${profile.last_name}`
      : (user?.user_metadata?.full_name ||
         (user?.email ? user.email.split("@")[0] : "Utente"));

  // 3) Render
  return <HomeClient email={user?.email ?? ""} userName={userName} />;
}
