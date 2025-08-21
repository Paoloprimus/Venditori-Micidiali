import { NextResponse } from "next/server";
import { LLM_MODEL } from "../../../lib/openai";

export function GET() {
  return NextResponse.json({ model: LLM_MODEL || "n/d" });
}
