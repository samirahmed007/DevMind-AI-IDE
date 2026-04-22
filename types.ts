// Built-in provider IDs (string union for type safety on known providers)
export type BuiltinProviderType =
  | 'google' | 'openai' | 'anthropic' | 'openrouter'
  | 'mistral' | 'groq' | 'xai' | 'together' | 'deepseek' | 'cohere'
  | 'ollama' | 'lmstudio' | 'jan' | 'local' | 'glm';

// All provider IDs can be a builtin OR a custom slug (e.g. "myprovider-abc123")
export type ProviderType = BuiltinProviderType | string;

export type AppTheme = 'dark' | 'light' | 'midnight' | 'solarized';
export type LogLevel = 'info' | 'error' | 'warning' | 'success';
export type AuthType = 'bearer' | 'x-api-key' | 'none';
export type ApiFormat = 'openai' | 'anthropic' | 'ollama';

// Schema-driven template for onboarding a new custom provider
export interface CustomProviderTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  apiFormat: ApiFormat;
  authType: AuthType;
  endpointPlaceholder: string;
  modelIdPlaceholder: string;
  modelIdExample: string;
  keyLink?: string;
  keyLinkLabel?: string;
  isOffline: boolean;
  setupSteps: string[];
  exampleEndpoint: string;
}

export interface LogEntry {
  id: string;
  message: string;
  level: LogLevel;
  timestamp: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow: number;
  vision: boolean;
}

// A fully user-defined provider
export interface CustomProvider {
  id: string;           // unique slug e.g. "myprovider-1717000000"
  name: string;         // display name e.g. "My Azure OpenAI"
  icon: string;         // emoji icon e.g. "🔷"
  endpoint: string;     // base URL e.g. "https://myazure.openai.azure.com/openai"
  apiKey: string;       // API key
  authType: AuthType;   // how to send the key
  apiFormat: ApiFormat; // wire format
  isOffline: boolean;   // visual badge
  models: ModelConfig[]; // models registered under this provider
}

export interface SettingsState {
  activeProvider: ProviderType;
  activeModelId: string;
  defaultProvider?: ProviderType;
  defaultModelId?: string;
  // string keys to support dynamic custom provider IDs
  apiKeys: Record<string, string>;
  customModels: ModelConfig[];
  customEndpoints: Record<string, string>;
  customProviders: CustomProvider[];   // ← NEW
  editorFontSize: number;
  editorWordWrap: 'on' | 'off';
  theme: AppTheme;
  ollamaModels: string[];
}

export interface FileSystemItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string | null;
  language?: string;
  parentId?: string | null;
  isOpen?: boolean;
  mimeType?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  modelName?: string;
  timestamp: number;
  attachments?: FileAttachment[];
  pendingActions?: AgentAction[];
}

export interface AgentAction {
  id: string;
  type: 'edit' | 'create' | 'terminal';
  data: FileEdit | FileCreate | TerminalCommand;
  applied: boolean;
  confirmed?: boolean;
}

export interface FileCreate {
  path: string;
  content: string;
}

export interface FileAttachment {
  name: string;
  mimeType: string;
  data: string;
}

export interface FileEdit {
  filePath: string;
  search: string;
  replace: string;
  applied: boolean;
}

export interface TerminalCommand {
  command: string;
  description: string;
  output?: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  actions: AgentAction[];
  mode: 'single' | 'all';
  onConfirm: () => void;
  onCancel: () => void;
}
