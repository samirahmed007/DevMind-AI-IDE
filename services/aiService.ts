import { GoogleGenAI } from "@google/genai";
import { ChatMessage, SettingsState, ModelConfig, CustomProvider } from "../types";
import { SYSTEM_INSTRUCTION_AGENT } from "../constants";

// ─── Resolve a custom provider from settings ──────────────────────────────
const getCustomProvider = (settings: SettingsState, providerId: string): CustomProvider | null =>
  (settings.customProviders || []).find(p => p.id === providerId) ?? null;

// ─── List of known builtin provider IDs ───────────────────────────────────
const BUILTIN_IDS = new Set([
  'google','openai','anthropic','openrouter','mistral','groq','xai',
  'together','deepseek','cohere','ollama','lmstudio','jan','local','glm'
]);

// ─── Build fetch config for builtin OpenAI-compatible endpoints ───────────
const getBuiltinFetchConfig = (settings: SettingsState, model: ModelConfig) => {
  const ep = settings.customEndpoints as Record<string, string>;
  const keys = settings.apiKeys as Record<string, string>;
  let url = '';
  let headers: Record<string, string> = { 'Content-Type': 'application/json' };

  switch (model.provider) {
    case 'openai':
      url = `${ep.openai}/chat/completions`;
      headers['Authorization'] = `Bearer ${keys.openai}`;
      break;
    case 'openrouter':
      url = `${ep.openrouter}/chat/completions`;
      headers['Authorization'] = `Bearer ${keys.openrouter}`;
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'DevMind AI IDE';
      break;
    case 'mistral':
      url = `${ep.mistral}/chat/completions`;
      headers['Authorization'] = `Bearer ${keys.mistral}`;
      break;
    case 'groq':
      url = `${ep.groq}/chat/completions`;
      headers['Authorization'] = `Bearer ${keys.groq}`;
      break;
    case 'xai':
      url = `${ep.xai}/chat/completions`;
      headers['Authorization'] = `Bearer ${keys.xai}`;
      break;
    case 'together':
      url = `${ep.together}/chat/completions`;
      headers['Authorization'] = `Bearer ${keys.together}`;
      break;
    case 'deepseek':
      url = `${ep.deepseek}/chat/completions`;
      headers['Authorization'] = `Bearer ${keys.deepseek}`;
      break;
    case 'glm':
      url = `${ep.glm || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`;
      headers['Authorization'] = `Bearer ${keys.glm}`;
      break;
    case 'ollama': {
      const isCloud = model.id.endsWith(':cloud');
      if (isCloud) {
        // Ollama Cloud models route to ollama.com API (requires subscription)
        url = 'https://ollama.com/api/chat';
        if (keys.ollama) headers['Authorization'] = `Bearer ${keys.ollama}`;
      } else {
        url = `${ep.ollama}/v1/chat/completions`;
      }
      break;
    }
    case 'lmstudio':
      url = `${ep.lmstudio}/chat/completions`;
      break;
    case 'jan':
      url = `${ep.jan}/chat/completions`;
      break;
    case 'local':
    default:
      url = `${ep.local || 'http://localhost:11434/v1'}/chat/completions`;
      break;
  }
  return { url, headers };
};

// ─── Build fetch config for a custom provider ─────────────────────────────
const getCustomFetchConfig = (cp: CustomProvider, format: 'openai' | 'anthropic' | 'ollama') => {
  let url = '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (format === 'anthropic') {
    url = cp.endpoint.endsWith('/messages') ? cp.endpoint : `${cp.endpoint}/messages`;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  } else if (format === 'ollama') {
    url = `${cp.endpoint}/v1/chat/completions`;
  } else {
    url = cp.endpoint.endsWith('/chat/completions') ? cp.endpoint : `${cp.endpoint}/chat/completions`;
  }

  // Auth
  if (cp.apiKey) {
    if (cp.authType === 'bearer') headers['Authorization'] = `Bearer ${cp.apiKey}`;
    else if (cp.authType === 'x-api-key') headers['x-api-key'] = cp.apiKey;
  }

  return { url, headers };
};

// ─── Build OpenAI-compatible messages ────────────────────────────────────
const buildOpenAiMessages = (messages: ChatMessage[], systemPrompt: string): any[] => [
  { role: 'system', content: systemPrompt },
  ...messages.map(m => {
    if (m.attachments && m.attachments.length > 0) {
      const content: any[] = [{ type: 'text', text: m.content }];
      for (const att of m.attachments) {
        if (att.mimeType.startsWith('image')) {
          content.push({ type: 'image_url', image_url: { url: att.data } });
        }
      }
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content };
    }
    return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
  })
];


// â”€â”€â”€ Ollama native NDJSON stream reader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ollama /api/chat returns newline-delimited JSON, NOT SSE.
// Each line: {"model":"...","message":{"role":"assistant","content":"..."},"done":false}
const readOllamaNDJSON = async (
  response: Response,
  onChunk: (text: string) => void
) => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No response body');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed);
        const content = json.message?.content;
        if (content) onChunk(content);
      } catch {}
    }
  }
  if (buffer.trim()) {
    try {
      const json = JSON.parse(buffer.trim());
      const content = json.message?.content;
      if (content) onChunk(content);
    } catch {}
  }
};

// â”€â”€â”€ Compact system prompt for context-limited cloud models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COMPACT_SYSTEM = `You are DevMind, an expert AI coding assistant with access to the user's workspace.
Respond concisely. Use these XML tags for file operations:
<edit><path>file</path><search><![CDATA[old]]></search><replace><![CDATA[new]]></replace></edit>
<create><path>file</path><content><![CDATA[content]]></content></create>
<terminal><command><![CDATA[cmd]]></command><description>desc</description></terminal>`;

const CLOUD_CONTEXT_LIMIT = 1500;

const buildOllamaMessages = (
  messages: ChatMessage[],
  systemPrompt: string,
  contextLimit?: number
): { role: string; content: string }[] => {
  const sys = contextLimit && systemPrompt.length > contextLimit
    ? systemPrompt.slice(0, contextLimit) + '\n...(truncated)'
    : systemPrompt;
  return [
    { role: 'system', content: sys },
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];
};

// â”€â”€â”€ Ollama Cloud streaming via native /api/chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const streamOllamaCloud = async (
  modelId: string,
  apiKey: string,
  messages: ChatMessage[],
  fileContext: string | null,
  onChunk: (text: string) => void
) => {
  if (!apiKey) {
    throw new Error(
      'Ollama Cloud requires a subscription key. ' +
      'Get one at https://ollama.com/upgrade then add it in Settings â†’ Offline AI â†’ Ollama API Key.'
    );
  }

  // Use compact system prompt + trimmed context to stay within cloud model limits
  const systemContent = fileContext
    ? `${COMPACT_SYSTEM}\n\n${fileContext.slice(0, CLOUD_CONTEXT_LIMIT)}`
    : COMPACT_SYSTEM;

  const ollamaMessages = buildOllamaMessages(messages, systemContent);

  const response = await fetch('https://ollama.com/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: ollamaMessages,
      stream: true,
      options: { num_predict: 2048 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Ollama Cloud: Authentication failed (${response.status}). ` +
        'Ensure your subscription key is set in Settings â†’ Offline AI â†’ Ollama API Key. ' +
        'Upgrade at https://ollama.com/upgrade'
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Ollama Cloud: Model '${modelId}' not found (404). ` +
        'Cloud models require the :cloud suffix (e.g. gemma4:31b-cloud). ' +
        'Check available models at https://ollama.com/search'
      );
    }
    if (response.status === 400) {
      const isCtx = errText.includes('context') || errText.includes('prompt too long');
      throw new Error(
        isCtx
          ? `Ollama Cloud: Prompt too long for '${modelId}'. Try a shorter message or clear chat history.`
          : `Ollama Cloud Error 400: ${errText.slice(0, 200)}`
      );
    }
    throw new Error(`Ollama Cloud Error ${response.status}: ${errText.slice(0, 200)}`);
  }

  await readOllamaNDJSON(response, onChunk);
};

// â”€â”€â”€ Local Ollama via native /api/chat (NDJSON) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const streamOllamaLocal = async (
  baseUrl: string,
  modelId: string,
  messages: ChatMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void
) => {
  const ollamaMessages = buildOllamaMessages(messages, systemPrompt);

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelId, messages: ollamaMessages, stream: true }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 404) {
      throw new Error(
        `Ollama: Model '${modelId}' not found locally. ` +
        `Run: ollama pull ${modelId}`
      );
    }
    throw new Error(`Ollama Local Error ${response.status}: ${errText.slice(0, 200)}`);
  }

  await readOllamaNDJSON(response, onChunk);
};

// ─── SSE stream reader ────────────────────────────────────────────────────
const readSSEStream = async (response: Response, onChunk: (text: string, thought?: string) => void) => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No response body');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta;
          if (delta?.reasoning_content) onChunk('', delta.reasoning_content);
          const content = delta?.content || json.delta?.content;
          if (content) onChunk(content);
        } catch {}
      }
    }
  }
};

// ─── Anthropic streaming ──────────────────────────────────────────────────
const streamAnthropicRaw = async (
  url: string, headers: Record<string, string>,
  modelId: string, systemPrompt: string, messages: ChatMessage[],
  onChunk: (text: string, thought?: string) => void
) => {
  const anthropicMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.attachments?.length
      ? [
          { type: 'text', text: m.content },
          ...m.attachments.filter(a => a.mimeType.startsWith('image')).map(a => ({
            type: 'image',
            source: { type: 'base64', media_type: a.mimeType, data: a.data.split(',')[1] || a.data },
          })),
        ]
      : m.content,
  }));

  const response = await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ model: modelId, max_tokens: 16000, system: systemPrompt, messages: anthropicMessages, stream: true }),
  });
  if (!response.ok) throw new Error(`Anthropic Error ${response.status}: ${await response.text()}`);

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No response body');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim() || !line.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(line.slice(6));
        if (json.type === 'content_block_delta') {
          if (json.delta?.type === 'thinking_delta') onChunk('', json.delta.thinking || '');
          else if (json.delta?.type === 'text_delta') onChunk(json.delta.text || '');
        }
      } catch {}
    }
  }
};

// ─── Cohere streaming ─────────────────────────────────────────────────────
const streamCohere = async (
  settings: SettingsState, model: ModelConfig, systemPrompt: string,
  messages: ChatMessage[], onChunk: (text: string, thought?: string) => void
) => {
  const ep = settings.customEndpoints as Record<string, string>;
  const url = `${ep.cohere}/chat`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${(settings.apiKeys as any).cohere}`,
  };
  const response = await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({
      model: model.id,
      preamble: systemPrompt,
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      stream: true,
    }),
  });
  if (!response.ok) throw new Error(`Cohere Error ${response.status}: ${await response.text()}`);
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No body');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.type === 'content-delta') onChunk(json.delta?.message?.content?.text || '');
      } catch {}
    }
  }
};

// ─── MAIN stream function ─────────────────────────────────────────────────
export const streamResponse = async (
  messages: ChatMessage[],
  settings: SettingsState,
  model: ModelConfig,
  currentFileContext: string | null,
  onChunk: (text: string, thought?: string) => void
) => {
  const systemPrompt = SYSTEM_INSTRUCTION_AGENT + (currentFileContext ? `\n\n${currentFileContext}` : '');
  const isBuiltin = BUILTIN_IDS.has(model.provider);

  // ── Google (SDK) ────────────────────────────────────────────────────────
  if (model.provider === 'google') {
    const apiKey = (settings.apiKeys as any).google || (process.env as any).API_KEY;
    if (!apiKey) throw new Error('Google API Key not set. Go to Settings → Online AI.');
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [
        { text: msg.content },
        ...(msg.attachments || []).map(att => ({
          inlineData: { mimeType: att.mimeType, data: att.data.split(',')[1] || att.data }
        }))
      ],
    }));
    const isThinking = model.id.includes('gemini-2.5') || model.id.includes('gemini-3');
    const chat = ai.chats.create({
      model: model.id,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: isThinking ? { thinkingBudget: 16000 } : undefined,
      },
      history: contents.slice(0, -1),
    });
    const lastMsg = messages[messages.length - 1];
    const lastParts: any[] = [{ text: lastMsg.content }];
    for (const att of lastMsg.attachments || []) {
      lastParts.push({ inlineData: { mimeType: att.mimeType, data: att.data.split(',')[1] || att.data } });
    }
    const result = await chat.sendMessageStream({ message: lastParts.length === 1 ? lastParts[0].text : lastParts });
    for await (const chunk of result) {
      let t = '', th = '';
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.thought) th += part.text || '';
          else if (part.text) t += part.text;
        }
      } else { t = chunk.text || ''; }
      onChunk(t, th);
    }
    return;
  }

  // ── Anthropic (builtin) ─────────────────────────────────────────────────
  if (model.provider === 'anthropic') {
    const ep = settings.customEndpoints as Record<string, string>;
    const url = `${ep.anthropic || 'https://api.anthropic.com/v1'}/messages`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': (settings.apiKeys as any).anthropic || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    await streamAnthropicRaw(url, headers, model.id, systemPrompt, messages, onChunk);
    return;
  }

  // ── Ollama Cloud (subscription required) ─────────────────────────────────
  if (model.provider === 'ollama' && model.id.endsWith(':cloud')) {
    const apiKey = (settings.apiKeys as any).ollama || '';
    await streamOllamaCloud(model.id, apiKey, messages, currentFileContext, onChunk);
    return;
  }

  // ── Cohere (builtin) ────────────────────────────────────────────────────
  if (model.provider === 'cohere') {
    await streamCohere(settings, model, systemPrompt, messages, onChunk);
    return;
  }

  // ── Custom (user-added) provider ────────────────────────────────────────
  if (model.provider === 'ollama') {
    const ep = settings.customEndpoints as Record<string, string>;
    const baseUrl = ep.ollama || 'http://localhost:11434';
    await streamOllamaLocal(baseUrl, model.id, messages, systemPrompt, onChunk);
    return;
  }

  if (!isBuiltin) {
    const cp = getCustomProvider(settings, model.provider);
    if (!cp) throw new Error(`Custom provider "${model.provider}" not found in settings.`);
    const { url, headers } = getCustomFetchConfig(cp, cp.apiFormat);
    if (!url) throw new Error(`No endpoint configured for provider "${cp.name}"`);

    if (cp.apiFormat === 'anthropic') {
      await streamAnthropicRaw(url, headers, model.id, systemPrompt, messages, onChunk);
    } else {
      // OpenAI or Ollama format
      const oaiMessages = buildOpenAiMessages(messages, systemPrompt);
      const response = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({ model: model.id, messages: oaiMessages, stream: true }),
      });
      if (!response.ok) throw new Error(`${cp.name} Error ${response.status}: ${await response.text()}`);
      await readSSEStream(response, onChunk);
    }
    return;
  }
  // ── All other builtin OpenAI-compatible ────────────────────────────────
  const { url, headers } = getBuiltinFetchConfig(settings, model);
  if (!url) throw new Error('Provider URL not configured');
  const apiKeys = settings.apiKeys as Record<string, string>;
  const needsKey = ['openai','openrouter','mistral','groq','xai','together','deepseek','glm'];
  if (needsKey.includes(model.provider) && !apiKeys[model.provider]) {
    throw new Error(`${model.provider} API Key not set. Go to Settings → Online AI.`);
  }
  // Friendly GLM billing error hint
  const response = await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ model: model.id, messages: buildOpenAiMessages(messages, systemPrompt), stream: true }),
  });
  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429 && model.provider === 'glm') {
      throw new Error(`GLM API Error 429: Insufficient balance. GLM-4.7-Flash is free-tier; other GLM models require a paid Z.AI account. Recharge at https://open.bigmodel.cn`);
    }
    throw new Error(`API Error ${response.status}: ${errText}`);
  }
  await readSSEStream(response, onChunk);
};

// ─── Ollama model detection ───────────────────────────────────────────────
export const detectOllamaModels = async (baseUrl: string): Promise<string[]> => {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: any) => m.name as string);
  } catch { return []; }
};

// ─── Test a custom provider connection ───────────────────────────────────
export const testCustomProvider = async (cp: CustomProvider, modelId: string): Promise<{ ok: boolean; message: string }> => {
  try {
    const { url, headers } = getCustomFetchConfig(cp, cp.apiFormat);
    if (!url) return { ok: false, message: 'No endpoint URL configured' };

    const testMessages = [{ role: 'user', content: 'Say "OK" in one word.' }];
    let body: any;
    if (cp.apiFormat === 'anthropic') {
      body = { model: modelId, max_tokens: 10, messages: testMessages, stream: false };
    } else {
      body = { model: modelId, messages: [{ role: 'system', content: 'You are helpful.' }, ...testMessages], stream: false, max_tokens: 10 };
    }

    const res = await fetch(url, {
      method: 'POST', headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) return { ok: true, message: `✓ Connected! Status ${res.status}` };
    const err = await res.text().catch(() => '');
    return { ok: false, message: `✗ HTTP ${res.status}: ${err.slice(0, 120)}` };
  } catch (e: any) {
    return { ok: false, message: `✗ ${e.message || 'Connection failed'}` };
  }
};

// ─── OpenRouter free models fetcher ─────────────────────────────────────
export const fetchOpenRouterFreeModels = async (apiKey: string): Promise<{ id: string; name: string; contextWindow: number }[]> => {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || [])
      .filter((m: any) => m.id?.includes(':free') || m.pricing?.prompt === '0' || m.pricing?.prompt === 0)
      .map((m: any) => ({ id: m.id, name: m.name || m.id, contextWindow: m.context_length || 128000 }));
  } catch { return []; }
};

// ─── Prompt enhancement ───────────────────────────────────────────────────
export const enhancePrompt = async (
  originalPrompt: string, settings: SettingsState, model: ModelConfig
): Promise<string> => {
  let fullText = '';
  await streamResponse(
    [{ id: 'enh', role: 'user', content: `Rewrite this prompt to be more precise and detailed for a coding AI. Output only the improved prompt.\n\nOriginal:\n${originalPrompt}`, timestamp: Date.now() }],
    settings, model, null, chunk => { fullText += chunk; }
  );
  return fullText.trim() || originalPrompt;
};