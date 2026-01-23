import { createServerClient } from "@supabase/ssr";
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

    // Prepara la response per il redirect
    const response = NextResponse.redirect(new URL("/", req.url));

    // Crea client SSR che scrive i cookies nella response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // Scrive il cookie nella response
            response.cookies.set({
              name,
              value,
              ...options,
              path: "/",
              httpOnly: false,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: "",
              ...options,
              path: "/",
              maxAge: 0,
            });
          },
        },
      }
    );

    // Login - questo chiamerà set() per i cookies
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      console.error("[AutoLogin API] Error:", error);
      return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
    }

    console.log("[AutoLogin API] Success for user:", data.user.id);
    console.log("[AutoLogin API] Cookies set in response");

    // Ritorna la response con i cookies già settati
    return response;

  } catch (err: any) {
    console.error("[AutoLogin API] Exception:", err);
    return NextResponse.redirect(new URL("/login?error=exception", req.url));
  }
}
