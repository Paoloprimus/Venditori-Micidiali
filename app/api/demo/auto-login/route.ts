import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * API: Auto-login per demo
 * GET /api/demo/auto-login?e=BASE64_EMAIL&p=BASE64_PASSWORD
 * 
 * Fa login server-side e redirect alla home
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const emailParam = url.searchParams.get("e");
  const passwordParam = url.searchParams.get("p");

  if (!emailParam || !passwordParam) {
    return NextResponse.redirect(new URL("/login?error=missing_credentials", req.url));
  }

  try {
    const email = atob(emailParam);
    const password = atob(passwordParam);

    // Usa il client SSR che gestisce i cookies
    const supabase = createSupabaseServer();

    // Login - questo setta automaticamente i cookies
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      console.error("[AutoLogin API] Error:", error);
      return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
    }

    console.log("[AutoLogin API] Success for user:", data.user.id);

    // Redirect alla home
    return NextResponse.redirect(new URL("/", req.url));

  } catch (err: any) {
    console.error("[AutoLogin API] Exception:", err);
    return NextResponse.redirect(new URL("/login?error=exception", req.url));
  }
}
