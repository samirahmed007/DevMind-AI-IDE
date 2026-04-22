import React, { useState, useCallback } from 'react';
import { SettingsState, ProviderType, AppTheme, ModelConfig, CustomProvider, AuthType, ApiFormat, CustomProviderTemplate } from '../types';
import { Icons } from './Icon';
import { THEMES, DEFAULT_MODELS, PROVIDER_GROUPS } from '../constants';
import { detectOllamaModels, testCustomProvider } from '../services/aiService';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onSave: (newSettings: SettingsState) => void;
}

// ── Shared input styles ───────────────────────────────────────────────────
const IN = 'w-full bg-ide-activity border border-ide-border rounded-xl px-3 py-2.5 text-sm font-mono text-white outline-none focus:ring-2 ring-ide-accent/30 focus:border-ide-accent transition-all';
const LB = 'block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5';

// ── Small toggle ─────────────────────────────────────────────────────────
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; label: string }> = ({ value, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-ide-accent' : 'bg-ide-activity border border-ide-border'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
    <span className="text-xs text-gray-400 font-bold">{label}</span>
  </label>
);

// ── Password field with toggle ────────────────────────────────────────────
const PasswordInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; className?: string }> = ({ value, onChange, placeholder, className }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '••••••••••••••••'}
        className={`${IN} pr-10 ${className || ''}`}
      />
      <button type="button" onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
        {show ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
      </button>
    </div>
  );
};

// ── Provider API key links ───────────────────────────────────────────────
const API_KEY_LINKS: Record<string, { url: string; label: string }> = {
  google:     { url: 'https://aistudio.google.com/app/apikey', label: 'Google AI Studio' },
  openai:     { url: 'https://platform.openai.com/api-keys', label: 'OpenAI Platform' },
  anthropic:  { url: 'https://console.anthropic.com/settings/keys', label: 'Anthropic Console' },
  openrouter: { url: 'https://openrouter.ai/keys', label: 'OpenRouter' },
  mistral:    { url: 'https://console.mistral.ai/api-keys/', label: 'Mistral Console' },
  groq:       { url: 'https://console.groq.com/keys', label: 'Groq Console' },
  xai:        { url: 'https://console.x.ai/', label: 'xAI Console' },
  together:   { url: 'https://api.together.xyz/settings/api-keys', label: 'Together AI' },
  deepseek:   { url: 'https://platform.deepseek.com/api_keys', label: 'DeepSeek Platform' },
  cohere:     { url: 'https://dashboard.cohere.com/api-keys', label: 'Cohere Dashboard' },
  glm:        { url: 'https://open.bigmodel.cn/usercenter/apikeys', label: 'Z.AI / BigModel' },
};

// ── Schema-driven provider templates ───────────────────────────────────────────
const PROVIDER_TEMPLATES: CustomProviderTemplate[] = [
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    icon: '🔧',
    description: 'Microsoft Azure-hosted OpenAI models (GPT-4o, o3, etc.)',
    apiFormat: 'openai',
    authType: 'bearer',
    endpointPlaceholder: 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOY',
    modelIdPlaceholder: 'your-deployment-name',
    modelIdExample: 'gpt-4o',
    keyLink: 'https://portal.azure.com',
    keyLinkLabel: 'Azure Portal',
    isOffline: false,
    exampleEndpoint: 'https://myresource.openai.azure.com/openai/deployments/gpt-4o',
    setupSteps: [
      'Create an Azure OpenAI resource in the Azure Portal',
      'Deploy a model (e.g. gpt-4o) in Azure AI Studio',
      'Copy the endpoint URL from the deployment page',
      'Copy the API key from Keys and Endpoint section',
      'Set the Model ID to your deployment name (not the model name)',
    ],
  },
  {
    id: 'aws-bedrock',
    name: 'AWS Bedrock (via LiteLLM)',
    icon: '☁️',
    description: 'Amazon Bedrock models proxied through a local LiteLLM server',
    apiFormat: 'openai',
    authType: 'bearer',
    endpointPlaceholder: 'http://localhost:4000/v1',
    modelIdPlaceholder: 'bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0',
    modelIdExample: 'bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0',
    isOffline: false,
    exampleEndpoint: 'http://localhost:4000/v1',
    setupSteps: [
      'Install LiteLLM: pip install litellm[proxy]',
      'Configure AWS credentials: aws configure',
      'Start proxy: litellm --model bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0',
      'Default proxy runs at http://localhost:4000',
      'Use the LiteLLM master key as the API key (or leave blank)',
    ],
  },
  {
    id: 'cloudflare-ai',
    name: 'Cloudflare Workers AI',
    icon: '🌐',
    description: 'Cloudflare’s serverless AI inference platform',
    apiFormat: 'openai',
    authType: 'bearer',
    endpointPlaceholder: 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/ai/v1',
    modelIdPlaceholder: '@cf/meta/llama-3.1-8b-instruct',
    modelIdExample: '@cf/meta/llama-3.1-8b-instruct',
    keyLink: 'https://dash.cloudflare.com/profile/api-tokens',
    keyLinkLabel: 'Cloudflare Dashboard',
    isOffline: false,
    exampleEndpoint: 'https://api.cloudflare.com/client/v4/accounts/abc123/ai/v1',
    setupSteps: [
      'Log in to Cloudflare Dashboard → AI → Workers AI',
      'Copy your Account ID from the right sidebar',
      'Create an API token with Workers AI Read permission',
      'Replace YOUR_ACCOUNT in the endpoint URL with your Account ID',
      'Model IDs use the @cf/ prefix (e.g. @cf/meta/llama-3.1-8b-instruct)',
    ],
  },
  {
    id: 'vllm',
    name: 'Self-hosted vLLM',
    icon: '🤖',
    description: 'High-throughput LLM inference server (OpenAI-compatible)',
    apiFormat: 'openai',
    authType: 'none',
    endpointPlaceholder: 'http://your-server:8000/v1',
    modelIdPlaceholder: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    modelIdExample: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    isOffline: true,
    exampleEndpoint: 'http://localhost:8000/v1',
    setupSteps: [
      'Install: pip install vllm',
      'Start server: python -m vllm.entrypoints.openai.api_server --model meta-llama/Meta-Llama-3.1-8B-Instruct',
      'Add --api-key YOUR_KEY to enable auth (then set Auth Type to Bearer)',
      'Default port is 8000 — set endpoint to http://localhost:8000/v1',
      'Model ID must match the --model argument exactly',
    ],
  },
  {
    id: 'ollama-remote',
    name: 'Remote Ollama Server',
    icon: '🦙',
    description: 'Ollama running on a remote machine or server',
    apiFormat: 'ollama',
    authType: 'none',
    endpointPlaceholder: 'http://your-server:11434',
    modelIdPlaceholder: 'llama3.2',
    modelIdExample: 'llama3.2',
    isOffline: true,
    exampleEndpoint: 'http://192.168.1.100:11434',
    setupSteps: [
      'Install Ollama on the remote machine',
      'Start with: OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS=* ollama serve',
      'Pull models: ollama pull llama3.2',
      'Set endpoint to http://REMOTE_IP:11434',
      'Ensure port 11434 is open in your firewall',
    ],
  },
  {
    id: 'anthropic-proxy',
    name: 'Anthropic-Compatible Proxy',
    icon: '◎',
    description: 'Any proxy or gateway that speaks the Anthropic Messages API',
    apiFormat: 'anthropic',
    authType: 'x-api-key',
    endpointPlaceholder: 'https://your-proxy.example.com/v1',
    modelIdPlaceholder: 'claude-3-5-sonnet-20241022',
    modelIdExample: 'claude-3-5-sonnet-20241022',
    isOffline: false,
    exampleEndpoint: 'https://my-proxy.example.com/v1',
    setupSteps: [
      'Deploy or configure your Anthropic-compatible proxy',
      'Set the Base URL to your proxy endpoint (without /messages)',
      'Set Auth Type to x-api-key and enter your proxy key',
      'Model IDs follow Anthropic naming (e.g. claude-3-5-sonnet-20241022)',
      '/messages will be appended automatically to the endpoint',
    ],
  },
  {
    id: 'litellm-proxy',
    name: 'LiteLLM Proxy (Universal)',
    icon: '⚡',
    description: 'LiteLLM proxy — route to 100+ providers with one endpoint',
    apiFormat: 'openai',
    authType: 'bearer',
    endpointPlaceholder: 'http://localhost:4000/v1',
    modelIdPlaceholder: 'gpt-4o',
    modelIdExample: 'anthropic/claude-3-5-sonnet',
    isOffline: false,
    exampleEndpoint: 'http://localhost:4000/v1',
    setupSteps: [
      'Install: pip install litellm[proxy]',
      'Create litellm_config.yaml with your provider keys',
      'Start: litellm --config litellm_config.yaml --port 4000',
      'Use the LiteLLM master key as the API key',
      'Model IDs use provider/model format (e.g. anthropic/claude-3-5-sonnet)',
    ],
  },
  {
    id: 'custom-blank',
    name: 'Custom (Blank)',
    icon: '🔧',
    description: 'Start from scratch — configure any API endpoint manually',
    apiFormat: 'openai',
    authType: 'bearer',
    endpointPlaceholder: 'https://api.example.com/v1',
    modelIdPlaceholder: 'model-id',
    modelIdExample: 'my-model',
    isOffline: false,
    exampleEndpoint: 'https://api.example.com/v1',
    setupSteps: [
      'Enter the Base URL of your API endpoint',
      'Choose the API format that matches your server (OpenAI / Anthropic / Ollama)',
      'Set the Auth Type and enter your API key if required',
      'Add at least one model with its display name and model ID',
      'Click ⚡ Test to verify the connection before saving',
    ],
  },
];

// ── Form validation ───────────────────────────────────────────────────────────────
const validateUrl = (url: string): string | null => {
  if (!url.trim()) return 'Endpoint URL is required';
  try { new URL(url); return null; } catch { return 'Must be a valid URL (e.g. https://api.example.com/v1)'; }
};
const validateName = (name: string): string | null =>
  !name.trim() ? 'Provider name is required' : name.trim().length < 2 ? 'Name must be at least 2 characters' : null;

// ── JSON import/export schema validator ──────────────────────────────────────────────
const isValidProvider = (p: any): p is CustomProvider =>
  typeof p === 'object' && p !== null &&
  typeof p.id === 'string' && p.id.length > 0 &&
  typeof p.name === 'string' && p.name.length > 0 &&
  typeof p.endpoint === 'string' &&
  ['openai','anthropic','ollama'].includes(p.apiFormat) &&
  ['bearer','x-api-key','none'].includes(p.authType) &&
  Array.isArray(p.models);

const validateImportedProviders = (raw: any): { valid: CustomProvider[]; errors: string[] } => {
  const errors: string[] = [];
  if (!Array.isArray(raw)) return { valid: [], errors: ['JSON must be an array of provider objects'] };
  const valid: CustomProvider[] = [];
  raw.forEach((item: any, i: number) => {
    if (isValidProvider(item)) {
      valid.push({ ...item, models: (item.models || []).filter((m: any) =>
        typeof m.id === 'string' && typeof m.name === 'string'
      )});
    } else {
      errors.push(`Item ${i + 1}: missing required fields (id, name, endpoint, apiFormat, authType)`);
    }
  });
  return { valid, errors };
};

// ── Template picker wizard ──────────────────────────────────────────────────────────────
const TemplatePicker: React.FC<{
  onSelect: (t: CustomProviderTemplate) => void;
  onCancel: () => void;
}> = ({ onSelect, onCancel }) => {
  const [search, setSearch] = useState('');
  const filtered = PROVIDER_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-white uppercase tracking-widest">Choose a Template</p>
        <button onClick={onCancel} className="p-1.5 text-gray-500 hover:text-white transition-colors">
          <Icons.X size={14} strokeWidth={2.5} />
        </button>
      </div>
      <input
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search templates..."
        className={IN}
      />
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto no-scrollbar">
        {filtered.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="text-left p-3 rounded-xl border border-ide-border hover:border-ide-accent/50 bg-ide-activity/30 hover:bg-ide-accent/10 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg leading-none">{t.icon}</span>
              <p className="text-[11px] font-black text-white truncate">{t.name}</p>
              {t.isOffline && (
                <span className="ml-auto text-[8px] text-green-400 font-black bg-green-900/20 px-1.5 py-0.5 rounded shrink-0">LOCAL</span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{t.description}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-ide-activity border border-ide-border text-gray-500">{t.apiFormat}</span>
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-ide-activity border border-ide-border text-gray-500">{t.authType}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Inline validation error ───────────────────────────────────────────────────────────────
const FieldError: React.FC<{ msg: string | null }> = ({ msg }) =>
  msg ? <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><Icons.AlertCircle size={10} />{msg}</p> : null;

// ── Offline provider setup guides ──────────────────────────────────────────────
const OFFLINE_GUIDES: Record<string, { title: string; steps: { cmd?: string; text: string }[]; links?: { url: string; label: string }[] }> = {
  ollama: {
    title: 'How to set up Ollama',
    steps: [
      { text: 'Install Ollama on your machine:' },
      { cmd: 'curl -fsSL https://ollama.com/install.sh | sh', text: 'Linux / macOS' },
      { text: 'Windows: download the installer from ollama.com' },
      { text: 'Start Ollama with CORS enabled (required for browser access):' },
      { cmd: 'OLLAMA_ORIGINS="*" ollama serve', text: 'macOS / Linux' },
      { text: 'Pull a model to use:' },
      { cmd: 'ollama pull llama3.2', text: 'General purpose' },
      { cmd: 'ollama pull qwen2.5-coder:7b', text: 'Code-focused' },
      { cmd: 'ollama pull deepseek-coder-v2', text: 'DeepSeek Coder' },
      { text: 'Click ⚡ Detect above to auto-discover all running models.' },
    ],
    links: [
      { url: 'https://ollama.com/download', label: 'Download Ollama' },
      { url: 'https://ollama.com/library', label: 'Browse Models' },
    ],
  },
  lmstudio: {
    title: 'How to set up LM Studio',
    steps: [
      { text: 'Download and install LM Studio from lmstudio.ai' },
      { text: 'Open LM Studio → Search and download a GGUF model (e.g. Llama 3, Mistral, Phi-4)' },
      { text: 'Go to the “Local Server” tab (left sidebar → ↔ icon)' },
      { text: 'Select your downloaded model from the dropdown at the top' },
      { text: 'Click “Start Server” — the default endpoint is http://localhost:1234/v1' },
      { text: 'The endpoint is already pre-filled above. Click Save and select LM Studio in the header.' },
    ],
    links: [
      { url: 'https://lmstudio.ai', label: 'Download LM Studio' },
    ],
  },
  jan: {
    title: 'How to set up Jan.ai',
    steps: [
      { text: 'Download and install Jan from jan.ai' },
      { text: 'Open Jan → Hub tab → download a model (e.g. Llama 3.2, Mistral 7B)' },
      { text: 'Go to Settings → Advanced → enable “API Server”' },
      { text: 'Start the API server — default endpoint is http://localhost:1337/v1' },
      { text: 'The endpoint is already pre-filled above. Click Save and select Jan.ai in the header.' },
    ],
    links: [
      { url: 'https://jan.ai', label: 'Download Jan.ai' },
    ],
  },
  local: {
    title: 'How to set up a custom OpenAI-compatible server',
    steps: [
      { text: 'Start any OpenAI-compatible local server. Common options:' },
      { cmd: 'ollama serve', text: 'Ollama (exposes /v1/chat/completions at port 11434)' },
      { cmd: 'python -m vllm.entrypoints.openai.api_server --model mistralai/Mistral-7B-v0.1', text: 'vLLM' },
      { cmd: 'python -m llama_cpp.server --model model.gguf --host 0.0.0.0', text: 'llama.cpp server' },
      { text: 'Set the Base URL above to your server’s /v1 endpoint (e.g. http://localhost:8000/v1)' },
      { text: 'Leave API Key blank if your server has no auth, or enter your key if required.' },
      { text: 'Click Save and select “Custom OpenAI-Compatible” in the header dropdown.' },
    ],
    links: [
      { url: 'https://github.com/vllm-project/vllm', label: 'vLLM on GitHub' },
      { url: 'https://github.com/ggerganov/llama.cpp', label: 'llama.cpp on GitHub' },
    ],
  },
};

const OfflineSetupGuide: React.FC<{ providerId: string }> = ({ providerId }) => {
  const [open, setOpen] = useState(false);
  const guide = OFFLINE_GUIDES[providerId];
  if (!guide) return null;

  return (
    <div className="border border-ide-border/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
          open ? 'bg-ide-accent/10 text-ide-accent' : 'text-gray-500 hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="flex items-center gap-2">
          <Icons.BookOpen size={13} strokeWidth={2.5} />
          {guide.title}
        </span>
        {open ? <Icons.ChevronDown size={12} strokeWidth={2.5} /> : <Icons.ChevronRight size={12} strokeWidth={2.5} />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-2 bg-black/20 animate-in slide-in-from-top-1 duration-150">
          {guide.steps.map((step, i) => (
            <div key={i}>
              {step.cmd ? (
                <div className="flex items-center justify-between gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-2 group">
                  <code className="text-[10px] text-green-300 font-mono flex-1 break-all">{step.cmd}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(step.cmd!)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-ide-accent transition-all shrink-0"
                    title="Copy"
                  >
                    <Icons.Copy size={11} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 leading-relaxed pl-1">
                  <span className="text-gray-600 mr-1.5">{i + 1}.</span>{step.text}
                </p>
              )}
            </div>
          ))}
          {guide.links && guide.links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
              {guide.links.map(l => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-ide-accent hover:text-blue-300 font-bold transition-colors">
                  <Icons.ExternalLink size={10} strokeWidth={2.5} />{l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Delete confirmation modal ────────────────────────────────────────────────────
const DeleteModelModal: React.FC<{
  model: ModelConfig | null;
  isBuiltin?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ model, isBuiltin, onConfirm, onCancel }) => {
  if (!model) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-ide-panel border border-red-800/40 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-800/40 flex items-center justify-center shrink-0">
            <Icons.Trash2 size={18} strokeWidth={2.5} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Remove Model</p>
            <p className="text-[10px] text-gray-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="p-3 bg-ide-activity/40 rounded-xl border border-ide-border">
          <p className="text-xs font-black text-white">{model.name}</p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{model.provider} · {model.id}</p>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          {isBuiltin
            ? <>Remove <span className="text-white font-bold">{model.name}</span> from the visible registry? It will reappear after a page reload via “Restore All”.</>
            : <>Permanently delete <span className="text-white font-bold">{model.name}</span>? This cannot be undone.</>
          }
        </p>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-gray-400 hover:text-white border border-ide-border hover:border-gray-500 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg active:scale-95">
            {isBuiltin ? 'Hide' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Builtin provider card ─────────────────────────────────────────────────
const BuiltinProviderCard: React.FC<{
  provider: { id: string; name: string; icon: string; color: string };
  localSettings: SettingsState;
  onKeyChange: (p: string, v: string) => void;
  onEndpointChange: (p: string, v: string) => void;
  isOffline?: boolean;
}> = ({ provider, localSettings, onKeyChange, onEndpointChange, isOffline }) => {
  const [open, setOpen] = useState(false);
  const keys = localSettings.apiKeys as Record<string, string>;
  const eps = localSettings.customEndpoints as Record<string, string>;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${open ? 'border-ide-accent/40 shadow-lg' : 'border-ide-border'} bg-ide-sidebar/40`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all">
        <div className="flex items-center space-x-3">
          <span className="text-xl leading-none">{provider.icon}</span>
          <div className="text-left">
            <p className="text-xs font-black text-white">{provider.name}</p>
            <p className="text-[10px] mt-0.5 font-bold">
              {isOffline
                ? <span className="text-green-400">● Offline</span>
                : keys[provider.id] ? <span className="text-green-400">● Key set</span> : <span className="text-gray-500">○ No key</span>}
            </p>
          </div>
        </div>
        {open ? <Icons.ChevronDown size={14} strokeWidth={2.5} className="text-gray-400" /> : <Icons.ChevronRight size={14} strokeWidth={2.5} className="text-gray-500" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-ide-border/50 pt-4 animate-in slide-in-from-top-2 duration-200">
          <div>
            <label className={LB}>Base URL / Endpoint</label>
            <input type="text" value={eps[provider.id] || ''} onChange={e => onEndpointChange(provider.id, e.target.value)} className={IN} />
          </div>
          {!isOffline && (
            <div>
              <label className={LB}>API Key</label>
              <PasswordInput value={keys[provider.id] || ''} onChange={v => onKeyChange(provider.id, v)} />
              {API_KEY_LINKS[provider.id] && (
                <a href={API_KEY_LINKS[provider.id].url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-ide-accent hover:text-blue-300 font-bold transition-colors">
                  <Icons.ExternalLink size={11} strokeWidth={2.5} />
                  Get API Key — {API_KEY_LINKS[provider.id].label}
                </a>
              )}
            </div>
          )}
          {provider.id === 'ollama' && (
            <div className="space-y-2">
              <div>
                <label className={LB}>API Key (Ollama Cloud models only)</label>
                <PasswordInput value={keys[provider.id] || ''} onChange={v => onKeyChange(provider.id, v)} placeholder="ollama-cloud-key (optional)" />
                <a href="https://ollama.com/upgrade" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-ide-accent hover:text-blue-300 font-bold transition-colors">
                  <Icons.ExternalLink size={11} strokeWidth={2.5} />
                  Get Ollama Cloud Key
                </a>
              </div>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Local CORS: <code className="bg-black/30 px-1 rounded font-mono">OLLAMA_ORIGINS=* ollama serve</code>
              </p>
            </div>
          )}
          {OFFLINE_GUIDES[provider.id] && provider.id !== 'ollama' && (
            <OfflineSetupGuide providerId={provider.id} />
          )}
        </div>
      )}
    </div>
  );
};

// ── Custom provider form (add or edit) ────────────────────────────────────
const EMPTY_PROVIDER: Omit<CustomProvider, 'id' | 'models'> = {
  name: '', icon: '🔷', endpoint: '', apiKey: '', authType: 'bearer', apiFormat: 'openai', isOffline: false,
};

const CustomProviderForm: React.FC<{
  initial?: Partial<Omit<CustomProvider, 'id' | 'models'>>;
  template?: CustomProviderTemplate | null;
  onSave: (data: Omit<CustomProvider, 'id' | 'models'>) => void;
  onCancel: () => void;
  isEdit?: boolean;
}> = ({ initial, template, onSave, onCancel, isEdit }) => {
  const [form, setForm] = useState<Omit<CustomProvider, 'id' | 'models'>>(template
    ? { name: template.name, icon: template.icon, endpoint: '', apiKey: '', authType: template.authType, apiFormat: template.apiFormat, isOffline: template.isOffline }
    : { ...EMPTY_PROVIDER, ...initial }
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showGuide, setShowGuide] = useState(!!template);

  const set = (key: keyof typeof form, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const nameErr = touched.name ? validateName(form.name) : null;
  const urlErr = touched.endpoint ? validateUrl(form.endpoint) : null;
  const canSave = !validateName(form.name) && !validateUrl(form.endpoint);

  const ICONS = ['🔷', '⚡', '🔥', '🌐', '🤖', '🧠', '💎', '🦾', '☁️', '🔮', '🏠', '🔑', '⚙️', '🌟', '🚀', '🎯', '💡', '🔬', '🧬', '🎲'];

  const FORMAT_INFO: Record<ApiFormat, { note: string; color: string }> = {
    openai:    { note: '/chat/completions appended automatically', color: 'text-green-400' },
    anthropic: { note: '/messages appended automatically', color: 'text-orange-400' },
    ollama:    { note: '/v1/chat/completions appended automatically', color: 'text-lime-400' },
  };

  const guideSteps = template?.setupSteps ?? (
    form.apiFormat === 'openai' ? [
      'Set the Base URL to your API endpoint (e.g. https://api.example.com/v1)',
      'Choose Bearer auth and enter your API key',
      '/chat/completions will be appended automatically',
      'Add at least one model with its display name and model ID',
      'Click âš¡ Test to verify the connection',
    ] : form.apiFormat === 'anthropic' ? [
      'Set the Base URL to your Anthropic-compatible endpoint',
      'Choose x-api-key auth and enter your key',
      '/messages will be appended automatically',
      'Model IDs follow Anthropic naming (e.g. claude-3-5-sonnet-20241022)',
      'Click âš¡ Test to verify the connection',
    ] : [
      'Set the Base URL to your Ollama server (e.g. http://localhost:11434)',
      'No auth required for local Ollama',
      '/v1/chat/completions will be appended automatically',
      'Model IDs are the ollama model names (e.g. llama3.2)',
      'Click âš¡ Test to verify the connection',
    ]
  );

  return (
    <div className="space-y-4">
      <div className="border border-ide-border/60 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowGuide(v => !v)}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${showGuide ? 'bg-ide-accent/10 text-ide-accent' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
        >
          <span className="flex items-center gap-2">
            <Icons.BookOpen size={13} strokeWidth={2.5} />
            {template ? `Setup Guide â€” ${template.name}` : 'Setup Guide'}
          </span>
          {showGuide ? <Icons.ChevronDown size={12} /> : <Icons.ChevronRight size={12} />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 pt-3 space-y-2 bg-black/20">
            {guideSteps.map((step, i) => (
              <p key={i} className="text-[10px] text-gray-400 leading-relaxed">
                <span className="text-gray-600 mr-1.5 font-black">{i + 1}.</span>{step}
              </p>
            ))}
            {template?.exampleEndpoint && (
              <div className="mt-2 p-2 bg-black/30 rounded-lg border border-white/5">
                <p className="text-[9px] text-gray-600 uppercase font-black mb-1">Example Endpoint</p>
                <code className="text-[10px] text-green-300 font-mono break-all">{template.exampleEndpoint}</code>
              </div>
            )}
            {template?.keyLink && (
              <a href={template.keyLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-ide-accent hover:text-blue-300 font-bold transition-colors">
                <Icons.ExternalLink size={10} strokeWidth={2.5} />
                Get API Key â€” {template.keyLinkLabel}
              </a>
            )}
          </div>
        )}
      </div>

      <div>
        <label className={LB}>Icon</label>
        <div className="flex flex-wrap gap-1.5 p-3 bg-ide-activity/30 rounded-xl border border-ide-border">
          {ICONS.map(ic => (
            <button key={ic} onClick={() => set('icon', ic)}
              className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all hover:bg-ide-accent/20 ${form.icon === ic ? 'bg-ide-accent/30 ring-2 ring-ide-accent' : ''}`}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LB}>Provider Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} onBlur={() => setTouched(p => ({ ...p, name: true }))}
            placeholder="My Azure OpenAI" className={`${IN} ${nameErr ? 'border-red-500/60' : ''}`} />
          <FieldError msg={nameErr} />
        </div>
        <div>
          <label className={LB}>API Format *</label>
          <select value={form.apiFormat} onChange={e => set('apiFormat', e.target.value as ApiFormat)} className={IN + ' cursor-pointer'}>
            <option value="openai">OpenAI Compatible</option>
            <option value="anthropic">Anthropic Compatible</option>
            <option value="ollama">Ollama</option>
          </select>
          <p className={`text-[9px] mt-1 font-bold ${FORMAT_INFO[form.apiFormat].color}`}>{FORMAT_INFO[form.apiFormat].note}</p>
        </div>
      </div>

      <div>
        <label className={LB}>Base URL / Endpoint *</label>
        <input value={form.endpoint} onChange={e => set('endpoint', e.target.value)} onBlur={() => setTouched(p => ({ ...p, endpoint: true }))}
          placeholder={template?.endpointPlaceholder ?? (form.apiFormat === 'anthropic' ? 'https://api.anthropic.com/v1' : form.apiFormat === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1')}
          className={`${IN} ${urlErr ? 'border-red-500/60' : ''}`} />
        <FieldError msg={urlErr} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LB}>Auth Type</label>
          <select value={form.authType} onChange={e => set('authType', e.target.value as AuthType)} className={IN + ' cursor-pointer'}>
            <option value="bearer">Authorization: Bearer</option>
            <option value="x-api-key">x-api-key header</option>
            <option value="none">No Auth</option>
          </select>
        </div>
        <div>
          <label className={LB}>API Key {form.authType === 'none' ? '(not required)' : ''}</label>
          <PasswordInput value={form.apiKey} onChange={v => set('apiKey', v)}
            placeholder={form.authType === 'none' ? 'No auth required' : 'sk-...'}
            className={form.authType === 'none' ? 'opacity-40' : ''} />
          {template?.keyLink && form.authType !== 'none' && (
            <a href={template.keyLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-[10px] text-ide-accent hover:text-blue-300 font-bold transition-colors">
              <Icons.ExternalLink size={10} strokeWidth={2.5} />Get key â€” {template.keyLinkLabel}
            </a>
          )}
        </div>
      </div>

      <Toggle value={form.isOffline} onChange={v => set('isOffline', v)} label="Mark as Offline / Local provider" />

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white border border-ide-border hover:border-gray-500 transition-all">Cancel</button>
        <button onClick={() => { setTouched({ name: true, endpoint: true }); if (canSave) onSave(form); }}
          className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${canSave ? 'bg-ide-accent hover:bg-blue-600 text-white' : 'bg-ide-activity border border-ide-border text-gray-500'}`}>
          {isEdit ? 'Update Provider' : 'Add Provider'}
        </button>
      </div>
    </div>
  );
};

// â”€â”€ Model manager for a custom provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ModelManager: React.FC<{
  provider: CustomProvider;
  onChange: (models: ModelConfig[]) => void;
}> = ({ provider, onChange }) => {
  const [newModel, setNewModel] = useState<Partial<ModelConfig>>({ contextWindow: 32768, vision: false });
  const [showAdd, setShowAdd] = useState(false);

  const addModel = () => {
    if (!newModel.id || !newModel.name) return;
    const m: ModelConfig = {
      id: newModel.id!.trim(),
      name: newModel.name!.trim(),
      provider: provider.id,
      contextWindow: newModel.contextWindow || 32768,
      vision: !!newModel.vision,
    };
    onChange([...provider.models, m]);
    setNewModel({ contextWindow: 32768, vision: false });
    setShowAdd(false);
  };

  const removeModel = (id: string) => onChange(provider.models.filter(m => m.id !== id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
          Models ({provider.models.length})
        </p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-[10px] text-ide-accent hover:text-blue-300 font-black uppercase flex items-center gap-1 transition-colors">
          <Icons.Plus size={12} strokeWidth={2.5} />Add Model
        </button>
      </div>

      {/* Model list */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
        {provider.models.length === 0 && !showAdd && (
          <p className="text-[11px] text-gray-600 italic text-center py-3">No models added yet. Click + Add Model above.</p>
        )}
        {provider.models.map(m => (
          <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-ide-activity/40 rounded-xl border border-white/5 group">
            <div className="min-w-0 mr-2">
              <p className="text-xs font-black text-white truncate">{m.name}</p>
              <p className="text-[10px] text-gray-500 font-mono truncate">{m.id}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {m.vision && <span className="text-[9px] text-blue-400 font-bold bg-blue-900/20 px-1.5 py-0.5 rounded">Vision</span>}
              <span className="text-[9px] text-gray-600">{(m.contextWindow / 1000).toFixed(0)}K</span>
              <button onClick={() => removeModel(m.id)}
                className="text-gray-700 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all">
                <Icons.X size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add model inline form */}
      {showAdd && (
        <div className="p-3 bg-ide-bg/50 border border-ide-border/60 rounded-xl space-y-2.5 animate-in slide-in-from-bottom-2 duration-200">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LB}>Display Name *</label>
              <input value={newModel.name || ''} onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. GPT-4 Turbo" className={IN} />
            </div>
            <div>
              <label className={LB}>Model ID *</label>
              <input value={newModel.id || ''} onChange={e => setNewModel(p => ({ ...p, id: e.target.value }))}
                placeholder="e.g. gpt-4-turbo" className={IN} />
            </div>
            <div>
              <label className={LB}>Context (tokens)</label>
              <input type="number" value={newModel.contextWindow || 32768}
                onChange={e => setNewModel(p => ({ ...p, contextWindow: parseInt(e.target.value) || 32768 }))}
                className={IN} />
            </div>
            <div className="flex items-end">
              <Toggle value={!!newModel.vision} onChange={v => setNewModel(p => ({ ...p, vision: v }))} label="Vision" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)}
              className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-gray-500 hover:text-white border border-ide-border hover:border-gray-500 transition-all">
              Cancel
            </button>
            <button onClick={addModel} disabled={!newModel.id || !newModel.name}
              className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-ide-accent hover:bg-blue-600 disabled:opacity-30 text-white transition-all active:scale-95">
              <Icons.Plus size={12} className="inline mr-1" strokeWidth={2.5} />Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Inline delete confirm button ─────────────────────────────────────────
const DeleteConfirmButton: React.FC<{ onDelete: () => void; label: string }> = ({ onDelete, label }) => {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-150">
        <span className="text-[9px] text-red-400 font-bold mr-1">Sure?</span>
        <button onClick={() => { onDelete(); setConfirming(false); }}
          className="py-1.5 px-2 rounded-lg text-[9px] font-black uppercase bg-red-600 hover:bg-red-500 text-white transition-all">Yes</button>
        <button onClick={() => setConfirming(false)}
          className="py-1.5 px-2 rounded-lg text-[9px] font-black uppercase bg-ide-activity border border-ide-border text-gray-400 hover:text-white transition-all">No</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)}
      className="py-2 px-3 rounded-xl text-[10px] font-black uppercase bg-red-900/20 hover:bg-red-900/40 border border-red-800/30 text-red-400 transition-all"
      title={`Delete ${label}`}>
      <Icons.Trash2 size={12} />
    </button>
  );
};

// ── Custom provider card (expanded view with test + edit + models) ─────────
const CustomProviderCard: React.FC<{
  cp: CustomProvider;
  onUpdate: (cp: CustomProvider) => void;
  onDelete: (id: string) => void;
}> = ({ cp, onUpdate, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (cp.models.length === 0) { setTestStatus({ ok: false, message: '⚠ Add at least one model first' }); return; }
    setTesting(true);
    setTestStatus(null);
    const result = await testCustomProvider(cp, cp.models[0].id);
    setTestStatus(result);
    setTesting(false);
  };

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${open ? 'border-ide-accent/40 shadow-lg' : 'border-ide-border'} bg-ide-sidebar/40`}>
      {/* Header */}
      <div className="flex items-center px-5 py-4">
        <button onClick={() => setOpen(!open)} className="flex items-center space-x-3 flex-1 text-left hover:opacity-80 transition-opacity">
          <span className="text-xl leading-none">{cp.icon}</span>
          <div>
            <p className="text-xs font-black text-white">{cp.name}</p>
            <p className="text-[10px] text-gray-500 font-mono truncate max-w-[200px]">{cp.endpoint}</p>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {cp.isOffline && <span className="text-[9px] text-green-400 font-bold bg-green-900/20 px-2 py-0.5 rounded-md mr-1">Offline</span>}
          <span className="text-[9px] text-gray-500 bg-ide-activity px-2 py-0.5 rounded-md mr-1">{cp.models.length} models</span>
          <button onClick={() => setOpen(!open)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
            {open ? <Icons.ChevronDown size={14} /> : <Icons.ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-ide-border/50 px-5 pb-5 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {editing ? (
            <CustomProviderForm
              initial={{ name: cp.name, icon: cp.icon, endpoint: cp.endpoint, apiKey: cp.apiKey, authType: cp.authType, apiFormat: cp.apiFormat, isOffline: cp.isOffline }}
              onSave={data => { onUpdate({ ...cp, ...data }); setEditing(false); }}
              onCancel={() => setEditing(false)}
              isEdit
            />
          ) : (
            <>
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-ide-activity/30 rounded-lg px-3 py-2">
                  <p className="text-gray-500 uppercase font-black text-[9px] tracking-widest">Format</p>
                  <p className="text-white font-bold mt-0.5">{cp.apiFormat}</p>
                </div>
                <div className="bg-ide-activity/30 rounded-lg px-3 py-2">
                  <p className="text-gray-500 uppercase font-black text-[9px] tracking-widest">Auth</p>
                  <p className="text-white font-bold mt-0.5">{cp.authType}</p>
                </div>
              </div>

              {/* Test result */}
              {testStatus && (
                <div className={`px-3 py-2 rounded-lg text-[11px] font-mono border ${testStatus.ok ? 'bg-green-900/20 border-green-800/40 text-green-300' : 'bg-red-900/20 border-red-800/40 text-red-300'}`}>
                  {testStatus.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={handleTest} disabled={testing}
                  className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-ide-activity hover:bg-ide-activity/80 border border-ide-border text-gray-300 transition-all disabled:opacity-50">
                  {testing ? <Icons.RefreshCw size={12} className="animate-spin inline mr-1" /> : '⚡'} Test
                </button>
                <button onClick={() => setEditing(true)}
                  className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-ide-activity hover:bg-ide-activity/80 border border-ide-border text-gray-300 transition-all">
                  <Icons.FilePenLine size={12} className="inline mr-1" />Edit
                </button>
                <DeleteConfirmButton onDelete={() => onDelete(cp.id)} label={cp.name} />
              </div>

              {/* Model manager */}
              <div className="border-t border-ide-border/50 pt-4">
                <ModelManager provider={cp} onChange={models => onUpdate({ ...cp, models })} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS PANEL
// ────────────────────────────────────────────────────────────────────────────
export const SettingsPanel: React.FC<SettingsProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [local, setLocal] = useState<SettingsState>(settings);
  const [tab, setTab] = useState<'general' | 'online' | 'offline' | 'custom' | 'models'>('general');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomProviderTemplate | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState('');
  const [detecting, setDetecting] = useState(false);

  if (!isOpen) return null;

  const setKey = (k: string, v: string) => setLocal(p => ({ ...p, apiKeys: { ...p.apiKeys, [k]: v } }));
  const setEp  = (k: string, v: string) => setLocal(p => ({ ...p, customEndpoints: { ...p.customEndpoints, [k]: v } }));

  const providers: CustomProvider[] = local.customProviders || [];

  const addCustomProvider = (data: Omit<CustomProvider, 'id' | 'models'>) => {
    const id = `custom-${Date.now()}`;
    const cp: CustomProvider = { ...data, id, models: [] };
    setLocal(p => ({ ...p, customProviders: [...(p.customProviders || []), cp] }));
    setShowAddProvider(false);
  };

  const updateCustomProvider = (updated: CustomProvider) => {
    setLocal(p => ({ ...p, customProviders: (p.customProviders || []).map(c => c.id === updated.id ? updated : c) }));
  };

  const deleteCustomProvider = (id: string) => {
    setLocal(p => ({ ...p, customProviders: (p.customProviders || []).filter(c => c.id !== id) }));
  };

  // Built-in custom models (not tied to a custom provider)
  const addBuiltinCustomModel = (m: ModelConfig) => setLocal(p => ({ ...p, customModels: [...p.customModels, m] }));
  const removeBuiltinCustomModel = (id: string) => setLocal(p => ({ ...p, customModels: p.customModels.filter(m => m.id !== id) }));

  const detectOllama = async () => {
    setDetecting(true);
    setOllamaStatus('Detecting...');
    const ep = (local.customEndpoints as any).ollama || 'http://localhost:11434';
    const models = await detectOllamaModels(ep);
    if (models.length > 0) {
      setLocal(p => ({ ...p, ollamaModels: models }));
      setOllamaStatus(`✓ ${models.length} model${models.length > 1 ? 's' : ''}: ${models.slice(0, 4).join(', ')}${models.length > 4 ? '...' : ''}`);
    } else {
      setOllamaStatus('⚠ No models found. Is Ollama running?');
    }
    setDetecting(false);
  };

  const TABS = [
    { id: 'general', label: 'Editor', icon: Icons.Monitor },
    { id: 'online',  label: 'Online AI', icon: Icons.Globe },
    { id: 'offline', label: 'Offline AI', icon: Icons.HardDrive },
    { id: 'custom',  label: 'Custom Providers', icon: Icons.Plus, badge: providers.length || undefined },
    { id: 'models',  label: 'Model Registry', icon: Icons.Brain },
  ];

  return (
    <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="bg-ide-panel border border-ide-border w-full max-w-[920px] rounded-[24px] shadow-2xl flex flex-col h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-4 border-b border-ide-border bg-ide-sidebar/50 shrink-0">
          <div className="flex items-center gap-3">
            <Icons.Settings className="text-ide-accent" size={20} strokeWidth={2.5} />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <Icons.X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar nav */}
          <div className="w-48 border-r border-ide-border bg-ide-sidebar/20 p-3 space-y-1 shrink-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  tab === t.id ? 'bg-ide-accent text-white shadow-lg' : 'text-gray-500 hover:bg-ide-activity hover:text-white'
                }`}>
                <div className="flex items-center gap-2.5">
                  <t.icon size={15} strokeWidth={2.5} className="shrink-0" />
                  {t.label}
                </div>
                {t.badge !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${tab === t.id ? 'bg-white/20' : 'bg-ide-activity'}`}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-7 space-y-5 animate-in slide-in-from-bottom-4 duration-200">

            {/* ── GENERAL ── */}
            {tab === 'general' && (
              <div className="space-y-5">
                <h3 className="section-title flex items-center gap-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                  <div className="w-1 h-4 bg-ide-accent rounded-full" />Editor & UI
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={LB}>Theme</label>
                    <select value={local.theme} onChange={e => setLocal(p => ({ ...p, theme: e.target.value as AppTheme }))} className={IN + ' cursor-pointer'}>
                      {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div><label className={LB}>Font Size (px)</label>
                    <input type="number" min={10} max={30} value={local.editorFontSize}
                      onChange={e => setLocal(p => ({ ...p, editorFontSize: parseInt(e.target.value) || 14 }))} className={IN} />
                  </div>
                  <div><label className={LB}>Word Wrap</label>
                    <select value={local.editorWordWrap} onChange={e => setLocal(p => ({ ...p, editorWordWrap: e.target.value as 'on' | 'off' }))} className={IN + ' cursor-pointer'}>
                      <option value="on">On</option>
                      <option value="off">Off</option>
                    </select>
                  </div>
                </div>

                {/* Default provider/model */}
                <div className="border-t border-ide-border pt-5">
                  <h4 className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />Default Provider & Model
                  </h4>
                  <p className="text-[11px] text-gray-500 mb-3">Set the provider and model that will be selected on startup.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LB}>Default Provider</label>
                      <select
                        value={local.defaultProvider || ''}
                        onChange={e => setLocal(p => ({ ...p, defaultProvider: e.target.value || undefined }))}
                        className={IN + ' cursor-pointer'}
                      >
                        <option value="">(none — use last active)</option>
                        {[...PROVIDER_GROUPS.online, ...PROVIDER_GROUPS.offline].map(p => (
                          <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                        ))}
                        {(local.customProviders || []).map((cp: any) => (
                          <option key={cp.id} value={cp.id}>{cp.icon} {cp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LB}>Default Model</label>
                      <select
                        value={local.defaultModelId || ''}
                        onChange={e => setLocal(p => ({ ...p, defaultModelId: e.target.value || undefined }))}
                        className={IN + ' cursor-pointer'}
                      >
                        <option value="">(none — use first model of provider)</option>
                        {DEFAULT_MODELS
                          .filter(m => !local.defaultProvider || m.provider === local.defaultProvider)
                          .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        {(local.customModels || [])
                          .filter(m => !local.defaultProvider || m.provider === local.defaultProvider)
                          .map(m => <option key={m.id} value={m.id}>{m.name} (custom)</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ONLINE ── */}
            {tab === 'online' && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />Online AI Providers
                </h3>
                <p className="text-[11px] text-gray-500">API keys are stored locally in your browser and never sent to any server other than the chosen provider.</p>
                {PROVIDER_GROUPS.online.map(p => (
                  <BuiltinProviderCard key={p.id} provider={p} localSettings={local} onKeyChange={setKey} onEndpointChange={setEp} />
                ))}
              </div>
            )}

            {/* ── OFFLINE ── */}
            {tab === 'offline' && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                  <div className="w-1 h-4 bg-green-500 rounded-full" />Offline / Local AI
                </h3>
                <div className="p-3 bg-green-900/10 border border-green-800/30 rounded-xl flex items-center gap-3">
                  <span className="text-lg">🔒</span>
                  <p className="text-[11px] text-green-300 font-bold">100% Private — all inference runs on your machine, no data leaves</p>
                </div>

                {/* Ollama detect */}
                <div className="border border-ide-border rounded-2xl overflow-hidden bg-ide-sidebar/40">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🦙</span>
                      <div>
                        <p className="text-xs font-black text-white">Ollama</p>
                        <p className="text-[10px] text-green-400 font-bold">● Free · Local</p>
                      </div>
                    </div>
                    <button onClick={detectOllama} disabled={detecting}
                      className="px-3 py-1.5 bg-green-900/30 hover:bg-green-800/40 border border-green-700/40 text-green-300 text-[10px] font-black uppercase rounded-lg transition-all disabled:opacity-50">
                      {detecting ? <Icons.RefreshCw size={11} className="animate-spin inline" /> : '⚡'} Detect
                    </button>
                  </div>
                  <div className="px-5 pb-4 space-y-3 border-t border-ide-border/40 pt-3">
                    {ollamaStatus && <p className="text-[11px] font-mono bg-black/20 px-3 py-2 rounded-lg text-gray-300">{ollamaStatus}</p>}
                    <div><label className={LB}>Ollama URL</label>
                      <input value={(local.customEndpoints as any).ollama || ''} onChange={e => setEp('ollama', e.target.value)} className={IN} placeholder="http://localhost:11434" />
                    </div>
                    {local.ollamaModels?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {local.ollamaModels.map(m => (
                          <span key={m} className="px-2 py-1 bg-green-900/20 border border-green-800/30 rounded-lg text-[10px] text-green-300 font-mono">{m}</span>
                        ))}
                      </div>
                    )}
                    <OfflineSetupGuide providerId="ollama" />
                  </div>
                </div>

                {PROVIDER_GROUPS.offline.filter(p => p.id !== 'ollama').map(p => (
                  <BuiltinProviderCard key={p.id} provider={p} localSettings={local} onKeyChange={setKey} onEndpointChange={setEp} isOffline />
                ))}
              </div>
            )}

            {/* ── CUSTOM PROVIDERS ── */}
            {tab === 'custom' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />Custom Providers
                  </h3>
                  {!showAddProvider && (
                    <div className="flex gap-2">
                    <label className="px-3 py-2 bg-ide-activity hover:bg-ide-activity/80 border border-ide-border text-gray-300 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer" title="Import providers from JSON">
                      <Icons.Upload size={12} className="inline mr-1" strokeWidth={2.5} />Import
                      <input type="file" accept=".json" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            const imported: CustomProvider[] = JSON.parse(ev.target?.result as string);
                            if (Array.isArray(imported)) {
                              setLocal(p => ({ ...p, customProviders: [...(p.customProviders||[]), ...imported.filter(ip => !(p.customProviders||[]).find(cp => cp.id === ip.id))] }));
                            }
                          } catch { alert('Invalid JSON file'); }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }} />
                    </label>
                    {providers.length > 0 && (
                      <button onClick={() => {
                        const blob = new Blob([JSON.stringify(providers, null, 2)], {type:'application/json'});
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                        a.download = 'devmind-providers.json'; a.click();
                      }} className="px-3 py-2 bg-ide-activity hover:bg-ide-activity/80 border border-ide-border text-gray-300 text-[10px] font-black uppercase rounded-xl transition-all" title="Export providers to JSON">
                        <Icons.Download size={12} className="inline mr-1" strokeWidth={2.5} />Export
                      </button>
                    )}
                    <button onClick={() => setShowAddProvider(true)}
                      className="px-3 py-2 bg-ide-accent hover:bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg active:scale-95">
                      <Icons.Plus size={12} className="inline mr-1.5" strokeWidth={2.5} />New Provider
                    </button>
                  </div>
                  )}
                </div>

                <div className="p-3 bg-purple-900/10 border border-purple-800/20 rounded-xl">
                  <p className="text-[11px] text-purple-300 font-bold mb-0.5">Connect any OpenAI-compatible or Anthropic-compatible API</p>
                  <p className="text-[10px] text-gray-500">Azure OpenAI, Vertex AI, Bedrock, Cloudflare AI, self-hosted models, private deployments — any endpoint works.</p>
                </div>

                {/* Add form */}
                {showAddProvider && (
                  <div className="p-5 bg-ide-activity/30 border border-ide-accent/30 rounded-2xl animate-in slide-in-from-bottom-2 duration-200">
                    <p className="text-xs font-black text-white uppercase tracking-widest mb-4">New Custom Provider</p>
                    <CustomProviderForm template={selectedTemplate} onSave={addCustomProvider} onCancel={() => { setShowAddProvider(false); setSelectedTemplate(null); setShowTemplatePicker(false); }} />
                  </div>
                )}

                {/* Provider list */}
                {providers.length === 0 && !showAddProvider && (
                  <div className="text-center py-12 text-gray-600">
                    <span className="text-4xl block mb-3">🔷</span>
                    <p className="text-sm font-bold text-gray-500">No custom providers yet</p>
                    <p className="text-[11px] text-gray-600 mt-1">Click "New Provider" to connect any OpenAI-compatible API</p>
                  </div>
                )}

                {providers.map(cp => (
                  <CustomProviderCard key={cp.id} cp={cp} onUpdate={updateCustomProvider} onDelete={deleteCustomProvider} />
                ))}
              </div>
            )}

            {/* ── MODEL REGISTRY ── */}
            {tab === 'models' && (
              <ModelRegistryTab
                local={local}
                setLocal={setLocal}
                providers={providers}
                addBuiltinCustomModel={addBuiltinCustomModel}
                removeBuiltinCustomModel={removeBuiltinCustomModel}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-ide-border flex items-center justify-between bg-ide-sidebar/50 shrink-0">
          <div className="flex items-center gap-2">
            {/* Full settings export */}
            <button
              onClick={() => {
                const exportData = {
                  version: '8.0',
                  exportedAt: new Date().toISOString(),
                  activeProvider: local.activeProvider,
                  activeModelId: local.activeModelId,
                  defaultProvider: local.defaultProvider,
                  defaultModelId: local.defaultModelId,
                  theme: local.theme,
                  editorFontSize: local.editorFontSize,
                  editorWordWrap: local.editorWordWrap,
                  customProviders: local.customProviders,
                  customModels: local.customModels,
                  customEndpoints: local.customEndpoints,
                  ollamaModels: local.ollamaModels,
                  // Redact keys for safe sharing
                  apiKeys: Object.fromEntries(
                    Object.entries(local.apiKeys).map(([k, v]) => [k, v ? '***REDACTED***' : ''])
                  ),
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `devmind-settings-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-ide-activity hover:bg-ide-activity/80 border border-ide-border text-gray-300 text-[10px] font-black uppercase rounded-xl transition-all"
              title="Export all settings to JSON (API keys redacted)"
            >
              <Icons.Download size={12} strokeWidth={2.5} />Export Settings
            </button>

            {/* Full settings import */}
            <label
              className="flex items-center gap-1.5 px-3 py-2 bg-ide-activity hover:bg-ide-activity/80 border border-ide-border text-gray-300 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer"
              title="Import settings from JSON"
            >
              <Icons.Upload size={12} strokeWidth={2.5} />Import Settings
              <input type="file" accept=".json" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const raw = JSON.parse(ev.target?.result as string);
                    // Schema validation
                    const errs: string[] = [];
                    if (!raw || typeof raw !== 'object') { errs.push('Root must be a JSON object'); }
                    else {
                      if (raw.version && raw.version !== '8.0') errs.push(`Version mismatch: expected 8.0, got ${raw.version}`);
                      if (raw.customProviders !== undefined && !Array.isArray(raw.customProviders)) errs.push('customProviders must be an array');
                      if (raw.customModels !== undefined && !Array.isArray(raw.customModels)) errs.push('customModels must be an array');
                      if (raw.theme && !['dark','light','midnight','solarized'].includes(raw.theme)) errs.push(`Unknown theme: ${raw.theme}`);
                      if (raw.editorFontSize && (typeof raw.editorFontSize !== 'number' || raw.editorFontSize < 8 || raw.editorFontSize > 40)) errs.push('editorFontSize must be a number between 8 and 40');
                    }
                    if (errs.length > 0) {
                      alert('Import failed:\n' + errs.join('\n'));
                      return;
                    }
                    // Merge imported settings (skip redacted API keys)
                    const importedKeys = raw.apiKeys
                      ? Object.fromEntries(
                          Object.entries(raw.apiKeys as Record<string,string>)
                            .filter(([, v]) => v && v !== '***REDACTED***')
                        )
                      : {};
                    setLocal(p => ({
                      ...p,
                      ...(raw.theme ? { theme: raw.theme } : {}),
                      ...(raw.editorFontSize ? { editorFontSize: raw.editorFontSize } : {}),
                      ...(raw.editorWordWrap ? { editorWordWrap: raw.editorWordWrap } : {}),
                      ...(raw.defaultProvider !== undefined ? { defaultProvider: raw.defaultProvider } : {}),
                      ...(raw.defaultModelId !== undefined ? { defaultModelId: raw.defaultModelId } : {}),
                      ...(raw.activeProvider ? { activeProvider: raw.activeProvider } : {}),
                      ...(raw.activeModelId ? { activeModelId: raw.activeModelId } : {}),
                      apiKeys: { ...p.apiKeys, ...importedKeys },
                      customEndpoints: raw.customEndpoints ? { ...p.customEndpoints, ...raw.customEndpoints } : p.customEndpoints,
                      customProviders: raw.customProviders ?? p.customProviders,
                      customModels: raw.customModels ?? p.customModels,
                      ollamaModels: raw.ollamaModels ?? p.ollamaModels,
                    }));
                    alert(`Settings imported successfully${Object.keys(importedKeys).length > 0 ? ` (${Object.keys(importedKeys).length} API keys restored)` : ' (API keys were redacted in export — re-enter them manually)'}`);
                  } catch { alert('Invalid JSON file — could not parse'); }
                };
                reader.readAsText(file);
                e.target.value = '';
              }} />
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-gray-500 hover:text-white transition-all">Discard</button>
            <button onClick={() => { onSave(local); onClose(); }}
              className="px-7 py-2.5 rounded-xl text-xs font-black uppercase bg-ide-accent hover:bg-blue-600 text-white transition-all shadow-2xl active:scale-95 flex items-center gap-2">
              <Icons.Save size={14} strokeWidth={2.5} />Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Extra model form for builtin providers ────────────────────────────────
// ── Model Registry Tab ───────────────────────────────────────────────────────────────
const ModelRegistryTab: React.FC<{
  local: SettingsState;
  setLocal: React.Dispatch<React.SetStateAction<SettingsState>>;
  providers: CustomProvider[];
  addBuiltinCustomModel: (m: ModelConfig) => void;
  removeBuiltinCustomModel: (id: string) => void;
}> = ({ local, setLocal, providers, addBuiltinCustomModel, removeBuiltinCustomModel }) => {
  const [pendingDelete, setPendingDelete] = useState<{ model: ModelConfig; source: 'builtin' | 'custom' } | null>(null);
  const [hiddenBuiltins, setHiddenBuiltins] = useState<Set<string>>(() =>
    new Set(((local as any)._hiddenBuiltins as string[]) || [])
  );

  const visibleBuiltins = DEFAULT_MODELS.filter(m => !hiddenBuiltins.has(m.id));

  const setDefault = (m: ModelConfig) => {
    const isDefault = local.defaultModelId === m.id;
    setLocal(p => ({
      ...p,
      defaultModelId: isDefault ? undefined : m.id,
      defaultProvider: isDefault ? p.defaultProvider : m.provider,
    }));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.source === 'builtin') {
      const next = new Set(hiddenBuiltins);
      next.add(pendingDelete.model.id);
      setHiddenBuiltins(next);
      setLocal(p => ({ ...p, _hiddenBuiltins: Array.from(next) } as any));
    } else {
      removeBuiltinCustomModel(pendingDelete.model.id);
    }
    if (local.defaultModelId === pendingDelete.model.id) {
      setLocal(p => ({ ...p, defaultModelId: undefined }));
    }
    setPendingDelete(null);
  };

  return (
    <div className="space-y-5">
      <DeleteModelModal
        model={pendingDelete?.model ?? null}
        isBuiltin={pendingDelete?.source === 'builtin'}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <h3 className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase tracking-widest">
        <div className="w-1 h-4 bg-ide-accent rounded-full" />Model Registry
      </h3>

      {/* Built-in models */}
      <div className="border border-ide-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-ide-activity/20 border-b border-ide-border">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Built-in Models
            <span className="ml-2 text-gray-600 normal-case font-bold">
              {visibleBuiltins.length} visible{hiddenBuiltins.size > 0 ? ` · ${hiddenBuiltins.size} hidden` : ''}
            </span>
          </p>
          {hiddenBuiltins.size > 0 && (
            <button
              onClick={() => { setHiddenBuiltins(new Set()); setLocal(p => ({ ...p, _hiddenBuiltins: [] } as any)); }}
              className="text-[9px] text-ide-accent hover:text-blue-300 font-black uppercase transition-colors"
            >
              Restore All
            </button>
          )}
        </div>
        <div className="divide-y divide-ide-border/30 max-h-64 overflow-y-auto no-scrollbar">
          {visibleBuiltins.map(m => {
            const isDefault = local.defaultModelId === m.id;
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] group transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-gray-300 truncate">
                    {m.name}
                    {isDefault && <span className="ml-2 text-[9px] text-ide-accent font-black">★ DEFAULT</span>}
                  </p>
                  <p className="text-[9px] text-gray-600 font-mono">
                    {m.provider} · {(m.contextWindow / 1000).toFixed(0)}K
                    {m.vision && <span className="ml-1 text-blue-500/70">· vision</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setDefault(m)}
                    className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border transition-all ${
                      isDefault
                        ? 'bg-ide-accent/20 border-ide-accent/40 text-ide-accent opacity-100'
                        : 'border-ide-border text-gray-500 hover:text-white hover:border-gray-400'
                    }`}
                    title={isDefault ? 'Clear default' : 'Set as default'}
                  >
                    {isDefault ? 'Clear' : '★ Default'}
                  </button>
                  <button
                    onClick={() => setPendingDelete({ model: m, source: 'builtin' })}
                    className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-all"
                    title="Hide from registry"
                  >
                    <Icons.Trash2 size={12} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
          {visibleBuiltins.length === 0 && (
            <p className="text-[11px] text-gray-600 italic text-center py-6">
              All built-in models hidden. Click “Restore All” above.
            </p>
          )}
        </div>
      </div>

      {/* Custom provider models summary */}
      {providers.filter(cp => cp.models.length > 0).length > 0 && (
        <div className="p-4 bg-purple-900/10 border border-purple-800/20 rounded-2xl">
          <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest mb-2">Custom Provider Models</p>
          {providers.filter(cp => cp.models.length > 0).map(cp => (
            <div key={cp.id} className="mb-2 last:mb-0">
              <p className="text-[10px] text-gray-400 font-bold mb-1">{cp.icon} {cp.name}</p>
              <div className="flex flex-wrap gap-1">
                {cp.models.map(m => (
                  <span key={m.id} className="px-2 py-0.5 bg-ide-activity rounded-md text-[10px] border border-purple-800/20 text-purple-300 font-mono">{m.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <BuiltinExtraModelForm
        customModels={local.customModels}
        providers={providers}
        onAdd={addBuiltinCustomModel}
        onRemove={id => {
          const m = local.customModels.find(cm => cm.id === id);
          if (m) setPendingDelete({ model: m, source: 'custom' });
        }}
        onSetDefault={setDefault}
      />
    </div>
  );
};

const BuiltinExtraModelForm: React.FC<{
  customModels: ModelConfig[];
  providers: CustomProvider[];
  onAdd: (m: ModelConfig) => void;
  onRemove: (id: string) => void;
  onSetDefault: (m: ModelConfig) => void;
}> = ({ customModels, providers, onAdd, onRemove, onSetDefault }) => {
  const [form, setForm] = useState<Partial<ModelConfig>>({ provider: 'openai', contextWindow: 32768, vision: false });
  const [showForm, setShowForm] = useState(false);

  const allProviderOptions = [
    ...PROVIDER_GROUPS.online.map(p => ({ id: p.id, label: `${p.icon} ${p.name}` })),
    ...PROVIDER_GROUPS.offline.map(p => ({ id: p.id, label: `${p.icon} ${p.name}` })),
    ...providers.map(cp => ({ id: cp.id, label: `${cp.icon} ${cp.name} (custom)` })),
  ];

  const add = () => {
    if (!form.id || !form.name || !form.provider) return;
    onAdd({ id: form.id.trim(), name: form.name.trim(), provider: form.provider, contextWindow: form.contextWindow || 32768, vision: !!form.vision });
    setForm({ provider: 'openai', contextWindow: 32768, vision: false });
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Extra Models ({customModels.length})</p>
        <button onClick={() => setShowForm(!showForm)}
          className="text-[10px] text-ide-accent hover:text-blue-300 font-black uppercase flex items-center gap-1 transition-colors">
          <Icons.Plus size={12} />Add Extra Model
        </button>
      </div>

      {showForm && (
        <div className="p-4 bg-ide-activity/30 border border-ide-border rounded-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LB}>Display Name *</label>
              <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="My GPT-4" className={IN} /></div>
            <div><label className={LB}>Model ID *</label>
              <input value={form.id || ''} onChange={e => setForm(p => ({ ...p, id: e.target.value }))} placeholder="gpt-4-32k" className={IN} /></div>
            <div><label className={LB}>Provider</label>
              <select value={form.provider || 'openai'} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className={IN + ' cursor-pointer'}>
                {allProviderOptions.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select></div>
            <div><label className={LB}>Context (tokens)</label>
              <input type="number" value={form.contextWindow || 32768} onChange={e => setForm(p => ({ ...p, contextWindow: parseInt(e.target.value) }))} className={IN} /></div>
          </div>
          <div className="flex items-center justify-between">
            <Toggle value={!!form.vision} onChange={v => setForm(p => ({ ...p, vision: v }))} label="Vision capable" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase text-gray-500 border border-ide-border hover:border-gray-500 transition-all">Cancel</button>
              <button onClick={add} disabled={!form.id || !form.name} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-ide-accent hover:bg-blue-600 disabled:opacity-30 text-white transition-all active:scale-95">Add</button>
            </div>
          </div>
        </div>
      )}

      {customModels.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
          {customModels.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-2.5 bg-ide-activity/40 border border-white/5 rounded-xl group">
              <div className="min-w-0 mr-2">
                <p className="text-xs font-black text-white">{m.name}</p>
                <p className="text-[10px] text-gray-500 font-mono">{m.provider} · {m.id}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onSetDefault(m)}
                  className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-ide-border text-gray-600 hover:text-white hover:border-gray-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Set as default"
                >
                  ★
                </button>
                <button onClick={() => onRemove(m.id)} className="text-gray-700 hover:text-red-400 p-1.5 opacity-0 group-hover:opacity-100 transition-all">
                  <Icons.Trash2 size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

