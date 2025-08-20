import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const LLM_MODEL = process.env.LLM_MODEL_NAME || "gpt-4o-mini";
