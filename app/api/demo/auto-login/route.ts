import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Crea client per login
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    // Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      console.error("[AutoLogin API] Error:", error);
      return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
    }

    console.log("[AutoLogin API] Success for user:", data.user.id);

    // Setta i cookies di sessione Supabase
    const cookieStore = cookies();
    
    // I cookie names usati da Supabase
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || "supabase";
    
    cookieStore.set(`sb-${projectRef}-auth-token`, JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: data.user,
    }), {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    // Redirect alla home con flag demo
    const response = NextResponse.redirect(new URL("/?demo=true", req.url));
    
    // Aggiungi header per indicare che è una demo
    response.headers.set("X-Demo-User", "true");
    
    return response;

  } catch (err: any) {
    console.error("[AutoLogin API] Exception:", err);
    return NextResponse.redirect(new URL("/login?error=exception", req.url));
  }
}
