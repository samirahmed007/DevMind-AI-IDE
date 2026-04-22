import { ModelConfig, ProviderType, AppTheme } from './types';

export const DEFAULT_MODELS: ModelConfig[] = [
  // ── Google Gemini ──────────────────────────────────────
  { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', provider: 'google', contextWindow: 2000000, vision: true },
  { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', provider: 'google', contextWindow: 1000000, vision: true },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', contextWindow: 1000000, vision: true },
  { id: 'gemini-2.5-flash-lite-latest', name: 'Gemini 2.5 Flash Lite', provider: 'google', contextWindow: 1000000, vision: true },
  // ── OpenAI ────────────────────────────────────────────
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, vision: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, vision: true },
  { id: 'o3-mini', name: 'o3 Mini', provider: 'openai', contextWindow: 200000, vision: false },
  { id: 'o4-mini', name: 'o4 Mini', provider: 'openai', contextWindow: 200000, vision: true },
  // ── Anthropic ─────────────────────────────────────────
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'anthropic', contextWindow: 200000, vision: true },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'anthropic', contextWindow: 200000, vision: true },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic', contextWindow: 200000, vision: false },
  // ── Mistral ───────────────────────────────────────────
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', contextWindow: 128000, vision: true },
  { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'mistral', contextWindow: 128000, vision: false },
  { id: 'codestral-latest', name: 'Codestral', provider: 'mistral', contextWindow: 256000, vision: false },
  { id: 'mistral-nemo', name: 'Mistral Nemo', provider: 'mistral', contextWindow: 128000, vision: false },
  // ── Groq (ultra-fast) ─────────────────────────────────
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', contextWindow: 128000, vision: false },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Fast)', provider: 'groq', contextWindow: 128000, vision: false },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'groq', contextWindow: 8192, vision: false },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', contextWindow: 32768, vision: false },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', provider: 'groq', contextWindow: 128000, vision: false },
  // ── xAI / Grok ────────────────────────────────────────
  { id: 'grok-3', name: 'Grok 3', provider: 'xai', contextWindow: 131072, vision: false },
  { id: 'grok-3-mini', name: 'Grok 3 Mini', provider: 'xai', contextWindow: 131072, vision: false },
  { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', provider: 'xai', contextWindow: 32768, vision: true },
  // ── Together AI ───────────────────────────────────────
  { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Turbo', provider: 'together', contextWindow: 128000, vision: false },
  { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', provider: 'together', contextWindow: 128000, vision: false },
  { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', provider: 'together', contextWindow: 32768, vision: false },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (Together)', provider: 'together', contextWindow: 64000, vision: false },
  // ── DeepSeek ──────────────────────────────────────────
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', contextWindow: 64000, vision: false },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek', contextWindow: 16000, vision: false },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', contextWindow: 64000, vision: false },
  // ── Cohere ────────────────────────────────────────────
  { id: 'command-r-plus-08-2024', name: 'Command R+', provider: 'cohere', contextWindow: 128000, vision: false },
  { id: 'command-r-08-2024', name: 'Command R', provider: 'cohere', contextWindow: 128000, vision: false },
  // ── OpenRouter ────────────────────────────────────────
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4 (OR)', provider: 'openrouter', contextWindow: 200000, vision: true },
  { id: 'openai/gpt-4o', name: 'GPT-4o (OR)', provider: 'openrouter', contextWindow: 128000, vision: true },
  { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro (OR)', provider: 'openrouter', contextWindow: 2000000, vision: true },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (OR)', provider: 'openrouter', contextWindow: 128000, vision: false },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OR)', provider: 'openrouter', contextWindow: 64000, vision: false },
  { id: 'mistralai/codestral-2501', name: 'Codestral (OR)', provider: 'openrouter', contextWindow: 256000, vision: false },
  { id: 'openrouter/free', name: 'Free (Best Available)', provider: 'openrouter', contextWindow: 128000, vision: false },
  { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick Free (OR)', provider: 'openrouter', contextWindow: 128000, vision: true },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp Free (OR)', provider: 'openrouter', contextWindow: 1000000, vision: true },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 Free (OR)', provider: 'openrouter', contextWindow: 64000, vision: false },
  // ── Ollama (Offline + Cloud) ───────────────────────────
  { id: 'llama3.2', name: 'Llama 3.2 (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  { id: 'codellama', name: 'CodeLlama (Ollama)', provider: 'ollama', contextWindow: 16384, vision: false },
  { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2 (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  { id: 'qwen2.5-coder:7b', name: 'Qwen2.5 Coder 7B (Ollama)', provider: 'ollama', contextWindow: 32768, vision: false },
  { id: 'mistral', name: 'Mistral 7B (Ollama)', provider: 'ollama', contextWindow: 32768, vision: false },
  { id: 'phi4', name: 'Phi-4 (Ollama)', provider: 'ollama', contextWindow: 16384, vision: false },
  { id: 'gemma3:12b', name: 'Gemma 3 12B (Ollama)', provider: 'ollama', contextWindow: 32768, vision: true },
  { id: 'gemma4:31b-cloud', name: 'Gemma 4 31B Cloud (Ollama)', provider: 'ollama', contextWindow: 128000, vision: true },
  { id: 'qwen3.5:cloud', name: 'Qwen 3.5 Cloud (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  { id: 'qwen3.5:397b-cloud', name: 'Qwen 3.5 397B Cloud (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  { id: 'qwen3-coder-next:cloud', name: 'Qwen3 Coder Next Cloud (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  { id: 'kimi-k2.6:cloud', name: 'Kimi K2.6 Cloud (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  { id: 'glm-5.1:cloud', name: 'GLM-5.1 Cloud (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  { id: 'minimax-m2.7:cloud', name: 'MiniMax M2.7 Cloud (Ollama)', provider: 'ollama', contextWindow: 128000, vision: false },
  // ── GLM / Z.AI ────────────────────────────────────────
  { id: 'glm-5.1', name: 'GLM-5.1', provider: 'glm', contextWindow: 128000, vision: true },
  { id: 'glm-5', name: 'GLM-5', provider: 'glm', contextWindow: 128000, vision: true },
  { id: 'glm-4.7', name: 'GLM-4.7', provider: 'glm', contextWindow: 128000, vision: true },
  { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', provider: 'glm', contextWindow: 128000, vision: false },
  { id: 'glm-4.6', name: 'GLM-4.6', provider: 'glm', contextWindow: 128000, vision: false },
  { id: 'glm-4.5', name: 'GLM-4.5', provider: 'glm', contextWindow: 128000, vision: false },
  // ── LM Studio (Offline) ───────────────────────────────
  { id: 'local-model', name: 'Local Model (LM Studio)', provider: 'lmstudio', contextWindow: 32768, vision: false },
  // ── Jan.ai (Offline) ──────────────────────────────────
  { id: 'jan-local', name: 'Local Model (Jan.ai)', provider: 'jan', contextWindow: 32768, vision: false },
  // ── Custom Local ──────────────────────────────────────
  { id: 'custom-local', name: 'Custom Local (OpenAI Compatible)', provider: 'local', contextWindow: 32768, vision: false },
];

export const THEMES: { id: AppTheme, name: string }[] = [
  { id: 'dark', name: 'Default Dark' },
  { id: 'light', name: 'Light' },
  { id: 'midnight', name: 'Midnight Blue' },
  { id: 'solarized', name: 'Solarized Dark' },
];

export const PROVIDER_GROUPS = {
  online: [
    { id: 'google', name: 'Google Gemini', icon: '✦', color: '#4285f4' },
    { id: 'openai', name: 'OpenAI', icon: '◈', color: '#10a37f' },
    { id: 'anthropic', name: 'Anthropic', icon: '◎', color: '#d4a27f' },
    { id: 'mistral', name: 'Mistral AI', icon: '⬡', color: '#f43f5e' },
    { id: 'groq', name: 'Groq (Ultra-Fast)', icon: '⚡', color: '#f59e0b' },
    { id: 'xai', name: 'xAI / Grok', icon: '✕', color: '#ffffff' },
    { id: 'together', name: 'Together AI', icon: '⊕', color: '#8b5cf6' },
    { id: 'deepseek', name: 'DeepSeek', icon: '◉', color: '#06b6d4' },
    { id: 'cohere', name: 'Cohere', icon: '◈', color: '#39d353' },
    { id: 'openrouter', name: 'OpenRouter', icon: '⟐', color: '#6366f1' },
    { id: 'glm', name: 'GLM / Z.AI', icon: '🧠', color: '#06b6d4' },
  ],
  offline: [
    { id: 'ollama', name: 'Ollama (Local)', icon: '🦙', color: '#84cc16' },
    { id: 'lmstudio', name: 'LM Studio', icon: '🖥', color: '#06b6d4' },
    { id: 'jan', name: 'Jan.ai', icon: '🤖', color: '#f97316' },
    { id: 'local', name: 'Custom OpenAI-Compatible', icon: '⚙', color: '#6b7280' },
  ],
};

export const DEFAULT_SETTINGS = {
  activeProvider: 'google' as ProviderType,
  activeModelId: 'gemini-2.5-flash-preview-05-20',
  apiKeys: {
    google: '',
    openai: '',
    anthropic: '',
    openrouter: '',
    mistral: '',
    groq: '',
    xai: '',
    together: '',
    deepseek: '',
    cohere: '',
    glm: '',
    ollama: '',
    lmstudio: '',
    jan: '',
    local: '',
  },
  defaultProvider: undefined as any,
  defaultModelId: undefined as any,
  customModels: [],
  customEndpoints: {
    google: 'https://generativelanguage.googleapis.com',
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    mistral: 'https://api.mistral.ai/v1',
    groq: 'https://api.groq.com/openai/v1',
    xai: 'https://api.x.ai/v1',
    together: 'https://api.together.xyz/v1',
    deepseek: 'https://api.deepseek.com/v1',
    cohere: 'https://api.cohere.com/v2',
    glm: 'https://open.bigmodel.cn/api/paas/v4',
    ollama: 'http://localhost:11434',
    lmstudio: 'http://localhost:1234/v1',
    jan: 'http://localhost:1337/v1',
    local: 'http://localhost:11434/v1',
  },
  editorFontSize: 14,
  editorWordWrap: 'on' as 'on' | 'off',
  theme: 'dark' as AppTheme,
  ollamaModels: [] as string[],
  customProviders: [] as any[],
};

export const SYSTEM_INSTRUCTION_AGENT = `
You are DevMind, an expert AI Software Engineer and IDE Agent. You operate inside a browser-based IDE with full access to the workspace filesystem.

## Identity
You are a senior engineer. You write clean, idiomatic, production-ready code. You think before acting. You always explain what you're doing and why. You ask for clarification when requirements are ambiguous.

## Your Capabilities
- Read any file in the workspace (context is provided automatically)
- Create new files and folders
- Edit existing files using precise diff/patch operations
- Suggest terminal commands for the user to run
- Analyze architecture, debug errors, review code
- Refactor, optimize, and document code

## Workflow
1. **Understand** — Fully analyze the request before proposing any changes
2. **Explore** — Review the file tree and active file context provided to you
3. **Plan** — Think through what files need to change and why
4. **Execute** — Use the action protocol below to propose changes
5. **Explain** — Always describe what each change does and why

## Action Protocol
Use XML tags to propose changes. Wrap multiple actions in <actions>. Always wrap code in <![CDATA[...]]>.

### CREATE A NEW FILE:
\`\`\`xml
<create>
  <path>relative/path/to/file.ext</path>
  <content><![CDATA[FULL FILE CONTENT HERE]]></content>
</create>
\`\`\`

### EDIT AN EXISTING FILE (search/replace patch):
\`\`\`xml
<edit>
  <path>relative/path/to/file.ext</path>
  <search><![CDATA[EXACT_EXISTING_CODE_TO_FIND]]></search>
  <replace><![CDATA[NEW_CODE_TO_INSERT]]></replace>
</edit>
\`\`\`

### SUGGEST A TERMINAL COMMAND:
\`\`\`xml
<terminal>
  <command><![CDATA[npm install package-name]]></command>
  <description>Install the required dependency</description>
</terminal>
\`\`\`

## Rules
- **Always explain** your changes before the XML action blocks
- **Use relative paths** from the workspace root (e.g., src/components/Button.tsx)
- **<search> must be unique** — use enough surrounding code to avoid ambiguity
- **Prefer targeted edits** over full file rewrites
- **Batch related changes** in one <actions> wrapper
- **Terminal commands** should always be safe — explain exactly what they do
- **For destructive operations** (deleting code, major refactors), warn the user
- **The user reviews all actions** before applying — they can apply individually or all at once
- **Think step by step** — show your reasoning in a brief analysis before the actions
- **If you reference a file**, use the exact path shown in the workspace file tree
- **If a file doesn't exist yet**, use <create> not <edit>

## Code Quality Standards
- Write idiomatic code for the target language/framework
- Add meaningful comments for complex logic
- Follow existing conventions in the codebase
- Prefer named exports and explicit types (TypeScript)
- Handle error cases gracefully
`;
