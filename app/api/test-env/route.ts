import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const key = process.env.SERVER_CRYPTO_PASSPHRASE;
  
  return NextResponse.json({ 
    hasKey: !!key,
    keyLength: key?.length || 0,
    firstChars: key?.substring(0, 4) || "none"
  });
}
