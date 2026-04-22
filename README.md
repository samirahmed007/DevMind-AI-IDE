# DevMind AI IDE — v8.0 Professional Edition

> A fully browser-based, multi-provider AI coding assistant and IDE. Connect any AI model — cloud or local — write, edit, and manage code with an intelligent agent that proposes every change before applying it.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Value Proposition](#value-proposition)
- [Target Audience](#target-audience)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Provider Reference](#provider-reference)
- [Ollama Cloud Setup](#ollama-cloud-setup)
- [Settings Import / Export](#settings-import--export)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Custom Provider Examples](#custom-provider-examples)

---

## Project Overview

DevMind AI IDE is a self-contained, browser-based development environment that puts a powerful AI coding agent directly alongside your code editor. Unlike cloud-hosted AI tools that lock you into a single model, DevMind lets you switch between any of 12 built-in providers — or add your own — without touching a line of configuration code.

The core workflow: open or upload your project files, describe what you want to the AI agent in plain language, review the proposed changes as a visual diff, and apply them with a single click. Every file edit, file creation, and terminal command is gated behind an explicit confirmation step — the agent never modifies anything without your approval.

---

## Value Proposition

| Problem | DevMind's Solution |
|---|---|
| Vendor lock-in to a single AI model | 12 built-in providers + unlimited custom endpoints |
| AI tools that apply changes silently | Every change shown as a red/green diff before applying |
| Privacy concerns with cloud-only tools | Full offline support via Ollama, LM Studio, Jan.ai |
| Complex setup for self-hosted models | Add any OpenAI-compatible URL in the Settings UI — no code changes |
| Switching between editor and chat | Editor, chat, terminal, and file explorer in one browser tab |
| Losing API keys across machines | Export/import all settings as JSON — keys are redacted for safe sharing |

---

## Target Audience

- **Full-stack and frontend developers** who want AI assistance without leaving their editor
- **AI/ML engineers** who run local models (Ollama, vLLM, LM Studio) and need a capable UI
- **Teams and individuals** evaluating multiple AI providers and wanting a single interface
- **Privacy-conscious developers** who need 100% local inference with no data leaving the machine
- **Power users** connecting to private deployments — Azure OpenAI, AWS Bedrock via LiteLLM, Cloudflare Workers AI, or any custom endpoint

---

## Key Features

### AI Providers
- **12 built-in online providers:** Google Gemini, OpenAI, Anthropic, Mistral AI, Groq, xAI/Grok, Together AI, DeepSeek, Cohere, OpenRouter, GLM/Z.AI, and Ollama Cloud
- **3 offline/local providers:** Ollama (local), LM Studio, Jan.ai — 100% private, no data leaves your machine
- **Unlimited custom providers:** Add any OpenAI-compatible, Anthropic-compatible, or Ollama endpoint from the Settings UI
- **8 custom provider templates:** Azure OpenAI, AWS Bedrock, Cloudflare Workers AI, vLLM, Remote Ollama, Anthropic proxy, LiteLLM, and Custom Blank — each with a built-in setup guide
- **Ollama auto-detection:** Click ⚡ Detect to discover all locally running models automatically
- **Ollama Cloud support:** Stream from cloud-hosted Ollama models (gemma4:31b-cloud, qwen3.5:cloud, etc.) using native NDJSON streaming
- **Per-provider API key links:** Direct links to each provider's key management page inside Settings

### AI Agent
- Full workspace context sent automatically with every message (file tree + active file content)
- Reference any file or folder with `@path/to/file` in the chat input
- Proposes changes using a structured XML action protocol:
  - **Edit** — search/replace diff with red (remove) / green (add) preview
  - **Create** — new file with full content preview
  - **Terminal** — suggested command with one-click copy
- Apply changes individually or all at once via confirmation dialog
- **Reasoning/thinking block** — collapsible panel shows the model's chain-of-thought (Gemini 2.5, Claude, DeepSeek R1)
- **Copy / Edit / Resend** controls on every chat message bubble
- Prompt enhancement — AI rewrites your prompt to be more precise before sending

### File Explorer
- Full recursive folder upload via the folder picker button or drag-and-drop from the OS
- OS-level folder drop uses the `FileSystem API` (`webkitGetAsEntry`) for complete subfolder traversal
- Drag-and-drop file/folder reordering within the workspace (move items into folders)
- Create, rename, delete, and download individual files or folders
- Context-aware file picker (`@` reference) includes both files and folders

### Code Editor
- Monaco Editor (the engine behind VS Code) with syntax highlighting for 50+ languages
- Configurable font size and word wrap
- Multiple open tabs with close buttons
- AI patches applied directly into the editor model with precise range edits

### Terminal & Runtime Log
- Tabbed bottom panel combining a virtual terminal and the system runtime log
- Terminal: command history (↑/↓), simulated common commands, copy-to-clipboard for AI suggestions
- Runtime Log: timestamped entries with level badges (INFO / SUCCESS / WARNING / ERROR)
- **Auto-hide toggle** (ON/OFF) for the log panel — errors always force the panel open
- Manual trigger button in the header toolbar

### Settings & Configuration
- **General:** Theme (Dark, Light, Midnight Blue, Solarized Dark), font size, word wrap
- **Default Provider & Model:** Set a startup provider and model; the model dropdown filters dynamically
- **Online AI:** API key + endpoint per provider, direct "Get API Key" links
- **Offline AI:** Ollama URL, ⚡ Detect button, Ollama Cloud key field, LM Studio / Jan.ai endpoints
- **Custom Providers:** Add/edit/delete/test custom endpoints with template wizard and setup guides
- **Model Registry:** View all built-in models with set-default, hide, and restore actions; add extra models
- **JSON Import/Export:** Export all settings to a dated JSON file; import back with schema validation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.7 |
| Build tool | Vite 6 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Google AI SDK | `@google/genai` |
| All other providers | Native `fetch` with SSE / NDJSON streaming |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A modern browser (Chrome, Edge, or Firefox)

### Installation

```bash
git clone https://github.com/your-org/devmind-ai-ide.git
cd devmind-ai-ide
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Production Build

```bash
npm run build
npm run preview
```

### First Run

1. Open the app — the editor loads with a welcome file and the AI chat panel is open on the right
2. Go to **Settings** (gear icon) → **Online AI**
3. Expand your preferred provider and paste your API key
4. Close Settings — the provider and model dropdowns in the header are now active
5. Type a message in the chat panel and press **Enter**

---

## Usage Guide

### Connecting an AI Provider

**Online providers:**
1. Settings → Online AI → expand provider card → paste API key → Save

**Offline providers (Ollama):**
```bash
curl -fsSL https://ollama.com/install.sh | sh
OLLAMA_ORIGINS="*" ollama serve
ollama pull llama3.2
```
Then: **Settings → Offline AI → ⚡ Detect**

**Custom providers:**
1. Settings → Custom Providers → New Provider
2. Choose a template (Azure, vLLM, Bedrock, etc.) — each has a built-in setup guide
3. Fill in endpoint, auth type, API key, and add models
4. Click ⚡ Test → Save

### Using the AI Agent

- Type in the chat input and press **Enter**
- Use `@path/to/file` to include a specific file's content as context
- Click the folder icon to browse and select files/folders for context
- Review proposed changes as red/green diffs, then click **Apply** or **Apply All**
- Hover any message bubble for **Copy**, **Edit**, and **Resend** controls

### File Explorer

| Button | Action |
|---|---|
| `+` | New file at root |
| Folder+ | New folder at root |
| Upload arrow | Upload individual files |
| Folder icon | Upload entire folder (recursive) |

Drag files/folders from your OS onto the Explorer panel for recursive upload. Drag items within the Explorer to move them into folders.

---

## Provider Reference

### Online Providers

| Provider | Free Tier | Notable Models |
|---|---|---|
| **Google Gemini** | Limited | Gemini 2.5 Pro, 2.5 Flash, 2.5 Flash Lite |
| **OpenAI** | No | GPT-4o, o4-mini, o3-mini |
| **Anthropic** | No | Claude Opus/Sonnet/Haiku 4.5 |
| **Mistral AI** | No | Codestral, Mistral Large, Mistral Nemo |
| **Groq** | Yes (rate-limited) | Llama 3.3 70B, DeepSeek R1 Distill 70B |
| **xAI / Grok** | No | Grok 3, Grok 3 Mini, Grok 2 Vision |
| **Together AI** | No | Llama 3.1 405B Turbo, Qwen 2.5 Coder 32B |
| **DeepSeek** | No | DeepSeek V3, R1, Coder |
| **Cohere** | Trial | Command R+ |
| **OpenRouter** | Yes (`:free` models) | 100+ models via single key |
| **GLM / Z.AI** | GLM-4.7-Flash only | GLM-5.1, GLM-5, GLM-4.7, GLM-4.7-Flash |

> **GLM note:** Only `glm-4.7-flash` is free-tier. All other GLM models require a paid Z.AI balance. Recharge at [open.bigmodel.cn](https://open.bigmodel.cn).

### Offline Providers

| Provider | Setup | Default Endpoint |
|---|---|---|
| **Ollama (local)** | `OLLAMA_ORIGINS="*" ollama serve` | `http://localhost:11434` |
| **Ollama Cloud** | Subscription at ollama.com/upgrade | `https://ollama.com/api/chat` |
| **LM Studio** | Start local server in the app | `http://localhost:1234/v1` |
| **Jan.ai** | Start API server in the app | `http://localhost:1337/v1` |

---

## Ollama Cloud Setup

Ollama Cloud models run on Ollama's servers and require a paid subscription.

### Step 1 — Get a Subscription Key
1. Go to **https://ollama.com/upgrade** and subscribe
2. Go to **https://ollama.com/settings/keys** and generate an API key

### Step 2 — Add the Key in DevMind
1. Settings → Offline AI → expand **Ollama**
2. Paste your key into **API Key (Ollama Cloud models only)**
3. Save

### Step 3 — Select a Cloud Model
In the header, select **Ollama (Local)** as provider, then choose a `:cloud` model:

| Model | ID |
|---|---|
| Gemma 4 31B Cloud | `gemma4:31b-cloud` |
| Qwen 3.5 Cloud | `qwen3.5:cloud` |
| Qwen 3.5 397B Cloud | `qwen3.5:397b-cloud` |
| Qwen3 Coder Next Cloud | `qwen3-coder-next:cloud` |
| Kimi K2.6 Cloud | `kimi-k2.6:cloud` |
| GLM-5.1 Cloud | `glm-5.1:cloud` |
| MiniMax M2.7 Cloud | `minimax-m2.7:cloud` |

### Tips
- Keep messages short — cloud models have limited context windows (4K–8K tokens)
- Clear chat history between tasks to avoid context overflow
- The app automatically uses a compact system prompt and truncates file context for cloud models

---

## Settings Import / Export

### Export
Click **Export Settings** in the Settings footer to download a dated JSON file containing:
- All custom providers and their model configurations
- Custom model registry entries
- Custom endpoint URLs
- Default provider/model preferences
- Editor preferences (theme, font size, word wrap)
- API keys are **redacted** (`***REDACTED***`) for safe sharing

### Import
Click **Import Settings** in the Settings footer and select a previously exported JSON file.

The importer validates:
- JSON structure (must be an object)
- Version compatibility (8.0)
- Array types for `customProviders` and `customModels`
- Valid theme values
- Font size range (8–40)

Redacted API keys are skipped — re-enter them manually after import. All other settings are merged with your current configuration.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Enter` | Send chat message |
| `Shift+Enter` | New line in chat input |
| `@` + path | Reference a workspace file in chat |
| `↑` / `↓` | Navigate terminal command history |
| `Escape` | Cancel inline message edit |

---

## Custom Provider Examples

### Azure OpenAI
```
Template:  Azure OpenAI (built-in template)
URL:       https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOY
Auth:      Bearer
Key:       your-azure-api-key
Model ID:  your-deployment-name
```

### AWS Bedrock via LiteLLM
```
Template:  AWS Bedrock (built-in template)
URL:       http://localhost:4000/v1
Auth:      Bearer
Key:       your-litellm-master-key
Model ID:  bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0
```

### Cloudflare Workers AI
```
Template:  Cloudflare Workers AI (built-in template)
URL:       https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/ai/v1
Auth:      Bearer
Key:       your-cf-api-token
Model ID:  @cf/meta/llama-3.1-8b-instruct
```

### Self-hosted vLLM
```
Template:  Self-hosted vLLM (built-in template)
URL:       http://your-server:8000/v1
Auth:      None (or Bearer if --api-key was set)
Model ID:  meta-llama/Meta-Llama-3.1-8B-Instruct
```

---

*Developed by Samir Uddin Ahmed — DevMind AI IDE v8.0 Professional Edition*
