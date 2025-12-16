// lib/ai/provider.ts
// Abstraction layer per supportare OpenAI e Mistral
// Permette di switchare tra provider senza cambiare il codice business

import OpenAI from "openai";

export type AIModel = "openai" | "mistral";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ChatTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  tools?: ChatTool[];
  tool_choice?: "auto" | "none";
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

export interface ChatCompletionResponse {
  content: string | null;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
}

export interface AIProvider {
  chatCompletions(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
}

// ==================== OpenAI PROVIDER ====================

class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chatCompletions(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      messages: options.messages as any,
      tools: options.tools as any,
      tool_choice: options.tool_choice,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens,
      response_format: options.response_format,
    });

    const message = response.choices[0].message;

    return {
      content: message.content,
      tool_calls: message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      })),
    };
  }
}

// ==================== MISTRAL PROVIDER ====================

class MistralProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.mistral.ai/v1";
  }

  async chatCompletions(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // Mistral API è compatibile con OpenAI, ma con alcune differenze
    const model = options.model || process.env.MISTRAL_MODEL || "mistral-large-latest";

    // Converti messages per Mistral (stessa struttura di OpenAI)
    const messages = options.messages.map((msg) => {
      if (msg.role === "tool") {
        // Mistral usa "tool" role ma potrebbe richiedere formato diverso
        return {
          role: "tool" as const,
          content: msg.content,
          tool_call_id: msg.tool_call_id,
        };
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    });

    // Per JSON structured output, aggiungi istruzione nel system prompt
    let systemMessages = messages.filter((m) => m.role === "system");
    let otherMessages = messages.filter((m) => m.role !== "system");

    if (options.response_format?.type === "json_object") {
      const jsonInstruction = "IMPORTANTE: Rispondi SOLO con JSON valido, senza testo aggiuntivo.";
      if (systemMessages.length > 0) {
        systemMessages[0].content = `${systemMessages[0].content}\n\n${jsonInstruction}`;
      } else {
        systemMessages = [{ role: "system" as const, content: jsonInstruction }];
      }
    }

    const body = {
      model,
      messages: [...systemMessages, ...otherMessages],
      tools: options.tools,
      tool_choice: options.tool_choice === "none" ? null : options.tool_choice,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral API error: ${error}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;

    return {
      content: message.content,
      tool_calls: message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      })),
    };
  }
}

// ==================== FACTORY ====================

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  const providerType = (process.env.AI_PROVIDER || "openai").toLowerCase() as AIModel;

  if (providerType === "mistral") {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is not set");
    }
    _provider = new MistralProvider(apiKey, process.env.MISTRAL_BASE_URL);
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    _provider = new OpenAIProvider(apiKey);
  }

  return _provider;
}

// Export per test
export { OpenAIProvider, MistralProvider };










