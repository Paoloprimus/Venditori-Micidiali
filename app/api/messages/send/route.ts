import { NextResponse } from "next/server";

const PRICE_IN = Number(process.env.PRICING_INPUT_PER_1M ?? "1.25");   // EUR / 1M
const PRICE_OUT = Number(process.env.PRICING_OUTPUT_PER_1M ?? "10.0"); // EUR / 1M

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { content?: string; terse?: boolean } | null;
  const content = (body?.content ?? "").trim();
  const terse = !!body?.terse;

  if (!content) {
    return NextResponse.json({ error: "EMPTY" }, { status: 400 });
  }

  // Stima token molto grezza: 1 token ≈ 4 caratteri
  const tokensIn = Math.ceil(content.length / 4);
  // Stima OUT: se "breve", metà; altrimenti 120% dell'input
  const tokensOut = Math.ceil((terse ? 0.5 : 1.2) * tokensIn);

  const costIn = (tokensIn / 1_000_000) * PRICE_IN;
  const costOut = (tokensOut / 1_000_000) * PRICE_OUT;
  const estimate = costIn + costOut;

  // Risposta finta, giusto per collaudare la UI
  const reply = terse
    ? "Ricevuto. Posso proporti una soluzione Light o Full?"
    : "Capito. Ti propongo due approcci: Light (rapido e quasi zero setup) o Full (più automatico ma con un po’ di configurazione). Quale preferisci?";

  return NextResponse.json({
    reply,
    estimate, tokensIn, tokensOut, costIn, costOut
  });
}
