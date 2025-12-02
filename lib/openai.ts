import OpenAI from "openai";

// Lazy initialization per evitare errori durante il build
let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// Per compatibilità con codice esistente
export const openai = {
  get chat() { return getOpenAI().chat; },
  get embeddings() { return getOpenAI().embeddings; },
  get audio() { return getOpenAI().audio; },
};

export const LLM_MODEL = process.env.LLM_MODEL_NAME || "gpt-4o-mini";
