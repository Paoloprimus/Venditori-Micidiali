import { redirect } from "next/navigation";
import { createSupabaseServer } from "../lib/supabase/server";
import HomeClient from "../components/HomeClient";

export default async function Home() {
  const supabase = createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const email = data.user?.email ?? "utente";
  return <HomeClient email={email} />;
}

