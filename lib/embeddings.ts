// Helper for OpenAI embeddings
import { openai } from './openai'; // assumes lib/openai.ts exports 'openai' client
const MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

export async function embedText(input: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: MODEL,
    input
  });
  // @ts-ignore
  return res.data[0].embedding as number[];
}
