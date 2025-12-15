# Esempio Refactoring per Mistral

## File: `app/api/messages/send/route.ts`

### PRIMA (OpenAI diretto)

```typescript
import OpenAI from "openai";
import { chatTools } from "@/lib/ai/tools";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

// ...

// Call OpenAI with tools
const response = await openai.chat.completions.create({
  model: MODEL,
  messages,
  tools: chatTools,
  tool_choice: "auto",
  temperature: 0.3,
  max_tokens: 1000
});

let reply = "";
const assistantMessage = response.choices[0].message;

// Check if LLM wants to call a function
if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
  // ... tool execution ...
  
  // Multiple tool calls - let LLM compose the response
  const finalResponse = await openai.chat.completions.create({
    model: MODEL,
    messages: toolMessages,
    temperature: 0.3,
    max_tokens: 500
  });
  
  reply = finalResponse.choices[0].message.content || "Ecco i risultati.";
}
```

### DOPO (Provider abstraction)

```typescript
import { getAIProvider } from "@/lib/ai/provider";
import { chatTools } from "@/lib/ai/tools";
import type { ChatMessage, ChatTool } from "@/lib/ai/provider";

const provider = getAIProvider();
const MODEL = process.env.OPENAI_CHAT_MODEL || process.env.MISTRAL_MODEL || "gpt-4o-mini";

// ...

// Converti messages al formato provider
const providerMessages: ChatMessage[] = messages.map(msg => ({
  role: msg.role as "system" | "user" | "assistant",
  content: msg.content,
}));

// Converti tools al formato provider
const providerTools: ChatTool[] = chatTools.map(tool => ({
  type: "function",
  function: {
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  },
}));

// Call provider (funziona con OpenAI e Mistral)
const response = await provider.chatCompletions({
  model: MODEL,
  messages: providerMessages,
  tools: providerTools,
  tool_choice: "auto",
  temperature: 0.3,
  max_tokens: 1000,
});

let reply = "";

// Check if LLM wants to call a function
if (response.tool_calls && response.tool_calls.length > 0) {
  // Execute all tool calls
  const toolResults: { name: string; result: any }[] = [];
  
  for (const toolCall of response.tool_calls) {
    const fnName = toolCall.name;
    const fnArgs = JSON.parse(toolCall.arguments || "{}");
    
    console.log(`[function-call] ${fnName}:`, fnArgs);
    
    const result = await executeFunction(fnName, fnArgs, userId, supabase);
    toolResults.push({ name: fnName, result });
  }

  // If single tool call, format the result directly
  if (toolResults.length === 1) {
    reply = formatToolResult(toolResults[0].name, toolResults[0].result);
  } else {
    // Multiple tool calls - let LLM compose the response
    const toolMessages: ChatMessage[] = [
      ...providerMessages,
      {
        role: "assistant",
        content: null,
      },
      ...response.tool_calls.map((tc, i) => ({
        role: "tool" as const,
        tool_call_id: tc.id,
        content: JSON.stringify(toolResults[i].result),
        name: tc.name,
      })),
    ];

    const finalResponse = await provider.chatCompletions({
      model: MODEL,
      messages: toolMessages,
      temperature: 0.3,
      max_tokens: 500,
    });

    reply = finalResponse.content || "Ecco i risultati.";
  }
} else {
  // No tool call - direct response
  reply = response.content || "Come posso aiutarti?";
}
```

## File: `app/api/proposals/generate/route.ts`

### PRIMA

```typescript
import { openai } from '../../../../lib/openai';

const completion = await openai.chat.completions.create({
  model: process.env.LLM_MODEL_NAME || 'gpt-4o-mini',
  temperature: 0.3,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: sys },
    { role: 'user', content: user }
  ]
});
```

### DOPO

```typescript
import { getAIProvider } from '@/lib/ai/provider';
import type { ChatMessage } from '@/lib/ai/provider';

const provider = getAIProvider();
const MODEL = process.env.LLM_MODEL_NAME || process.env.MISTRAL_MODEL || 'gpt-4o-mini';

const messages: ChatMessage[] = [
  { role: 'system', content: sys },
  { role: 'user', content: user }
];

const completion = await provider.chatCompletions({
  model: MODEL,
  temperature: 0.3,
  response_format: { type: 'json_object' }, // Provider gestisce il workaround per Mistral
  messages,
});

const content = completion.content || '{}';
const payload = JSON.parse(content) as ProposalPayload;
```

## Vantaggi del Refactoring

1. **Switch facile**: Cambi solo `AI_PROVIDER` env var
2. **Codice pulito**: Business logic separata dal provider
3. **Testabile**: Puoi mockare il provider per test
4. **Future-proof**: Aggiungi altri provider facilmente









