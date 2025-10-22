// lib/nlu/IntentClassifier.ts
import policyData from "./intent_policy.json";
import type { IntentPolicy, ClassificationResult } from "./types";
import { redactPII } from "./pii";
import { preprocessUtterance } from "./utterance_preproc"; // ⬅️ nuovo

const policy = policyData as IntentPolicy;

export async function classifyIntent(
  utterance: string
): Promise<ClassificationResult> {
  // 1) normalizza parlato
  const pre = preprocessUtterance(utterance);

  // 2) redazione PII
  const cleaned = policy.pii_redaction.active ? redactPII(pre) : pre;

  // 3) chiamata al modello (placeholder attuale)
  const { intent, confidence } = await fakeLLMClassifier(cleaned);

  const { accept, clarify } = policy.confidence_thresholds;
  return {
    intent: confidence >= clarify ? intent : null,
    confidence,
    needsClarification: confidence < accept && confidence >= clarify,
  };
}


/**
 * Mock temporaneo del classificatore LLM.
 * Da sostituire con la tua API reale (es. OpenAI, o locale).
 */
async function fakeLLMClassifier(
  phrase: string
): Promise<{ intent: string; confidence: number }> {
  const phraseLower = phrase.toLowerCase();
  if (phraseLower.includes("quanti")) return { intent: "count_clients", confidence: 0.9 };
  if (phraseLower.includes("nome")) return { intent: "list_client_names", confidence: 0.9 };
  if (phraseLower.includes("email")) return { intent: "list_client_emails", confidence: 0.9 };
  if (phraseLower.includes("mancan")) return { intent: "list_missing_products", confidence: 0.85 };
  if (phraseLower.includes("ordine")) return { intent: "list_orders_recent", confidence: 0.8 };
  if (phraseLower.includes("vendit")) return { intent: "summary_sales", confidence: 0.8 };
  if (phraseLower.match(/\b(ciao|buongiorno|salve)\b/)) return { intent: "greet", confidence: 0.95 };
  if (phraseLower.match(/\b(aiutami|come funziona)\b/)) return { intent: "help", confidence: 0.9 };
  return { intent: "unknown", confidence: 0.3 };
}
