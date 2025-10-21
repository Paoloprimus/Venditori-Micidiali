export interface Intent {
  key: string;
  examples: string[];
  template: string;
}

export interface IntentPolicy {
  version: string;
  last_updated: string;
  confidence_thresholds: { accept: number; clarify: number };
  pii_redaction: { active: boolean; rules: Record<string, string> };
  intents: Intent[];
}

export interface ClassificationResult {
  intent: string | null;
  confidence: number;
  needsClarification: boolean;
}
