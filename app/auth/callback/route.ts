import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServer();
  await supabase.auth.exchangeCodeForSession();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
