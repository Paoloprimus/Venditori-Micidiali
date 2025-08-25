export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  return NextResponse.json({ user: data?.user ?? null, error: error?.message ?? null });
}
