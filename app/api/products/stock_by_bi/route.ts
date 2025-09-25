// app/api/products/stock_by_bi/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const ENABLED = process.env.PRIVACY_BY_BI === "on";

export async function POST(req: Request) {
  if (!ENABLED) {
    return NextResponse.json({ error: "PRIVACY_BY_BI is OFF" }, { status: 501 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bi_list = body?.bi_list;
  if (!Array.isArray(bi_list) || bi_list.length === 0) {
    return NextResponse.json({ error: "bi_list must be a non-empty array" }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase.rpc("product_stock_by_bi", { bi_list });
  if (error) {
    return NextResponse.json({ error: "RPC error: product_stock_by_bi" }, { status: 500 });
  }

  return NextResponse.json({ stock: data ?? 0 });
}
