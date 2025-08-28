// Server Component: verifica login e mostra la home con chat integrata (stato interno)
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../lib/supabase/server";
import HomeClient from "../components/HomeClient";

export default async function Page() {
  const supabase = createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    redirect("/login");
  }

  return <HomeClient email={user?.email ?? ""} />;
}
