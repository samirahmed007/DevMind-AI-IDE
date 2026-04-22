import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileSystemItem, ChatMessage, FileEdit, SettingsState, FileAttachment,
  AgentAction, FileCreate, TerminalCommand, ProviderType, LogEntry, LogLevel, ConfirmDialogState
} from './types';
import { Explorer, readEntryTree } from './components/Explorer';
import { EditorArea } from './components/Editor';
import { ChatPanel } from './components/Chat';
import { SettingsPanel } from './components/Settings';
import { LogStatus } from './components/LogStatus';
import { AboutModal } from './components/AboutModal';
import { TerminalPanel } from './components/Terminal';
import { BottomPanel } from './components/BottomPanel';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Icons } from './components/Icon';
import { DEFAULT_SETTINGS, DEFAULT_MODELS, PROVIDER_GROUPS } from './constants';
import { streamResponse, enhancePrompt } from './services/aiService';

const INITIAL_MESSAGES: ChatMessage[] = [{
  id: 'welcome',
  role: 'assistant',
  content: `Welcome to **DevMind AI IDE v8** — your intelligent coding assistant.

I can help you:
• 📁 **Browse & edit** any file in your workspace
• ✨ **Create** new files and components
• 🔍 **Analyze** code architecture and bugs
• 💻 **Suggest** terminal commands to run
• 🔄 **Apply** changes with diff/patch previews

Use the file explorer to open files, then ask me to modify them. I'll show you exactly what changes I'm proposing before applying anything.

Type your first request below!`,
  timestamp: Date.now(),
  modelName: 'DevMind'
}];

const INITIAL_FILES: Record<string, FileSystemItem> = {
  '1': {
    id: '1',
    name: 'welcome.md',
    path: '/welcome.md',
    type: 'file',
    language: 'markdown',
    isOpen: false,
    content: `# 🚀 Welcome to DevMind AI IDE v8

## What is DevMind?

DevMind is a fully browser-based AI coding assistant and IDE. Connect any AI model — cloud or local — and write, edit, and manage code through a conversational agent that proposes every change before applying it. No backend required.

---

## 🌐 Online AI Providers (12 built-in)

| Provider | Free Tier | Best For |
|---|---|---|
| **Google Gemini** | Limited | Gemini 2.5 Pro/Flash with thinking |
| **OpenAI** | No | GPT-4o, o4-mini |
| **Anthropic** | No | Claude Opus/Sonnet/Haiku 4.5 |
| **Mistral AI** | No | Codestral, Mistral Large |
| **Groq** | Yes | Llama 3.3 70B — ultra-fast |
| **xAI / Grok** | No | Grok 3, Grok 3 Mini |
| **Together AI** | No | Llama 3.1 405B, Qwen 2.5 Coder |
| **DeepSeek** | No | DeepSeek V3, R1 |
| **Cohere** | Trial | Command R+ |
| **OpenRouter** | Yes (:free models) | 100+ models via single key |
| **GLM / Z.AI** | GLM-4.7-Flash only | GLM-5.1, GLM-4.7 |

**Settings → Online AI** to add your API keys. Each provider card has a direct “Get API Key” link.

---

## 🔒 Offline / Local AI (100% Private)

### Ollama (Local)
\`\`\`bash
curl -fsSL https://ollama.com/install.sh | sh
OLLAMA_ORIGINS="*" ollama serve
ollama pull llama3.2
\`\`\`
Then **Settings → Offline AI → ⚡ Detect** to auto-discover all running models.

### Ollama Cloud
Run large models on Ollama’s servers (subscription required):
1. Subscribe at https://ollama.com/upgrade
2. Add your key in **Settings → Offline AI → Ollama API Key**
3. Select any \`:cloud\` model (e.g. \`gemma4:31b-cloud\`, \`qwen3.5:cloud\`)

### LM Studio
1. Download [LM Studio](https://lmstudio.ai) → load a GGUF model
2. Start the Local Server (default: \`http://localhost:1234/v1\`)

### Jan.ai
1. Download [Jan.ai](https://jan.ai) → install a model → start the API server
2. Default endpoint: \`http://localhost:1337/v1\`

---

## 🔷 Custom Providers

Connect **any** OpenAI-compatible or Anthropic-compatible API without code changes:

**Settings → Custom Providers → New Provider**

Choose from 8 built-in templates, each with a step-by-step setup guide:
- Azure OpenAI, AWS Bedrock via LiteLLM, Cloudflare Workers AI
- Self-hosted vLLM, Remote Ollama, Anthropic proxy, LiteLLM Universal, Custom Blank

---

## 🤖 AI Agent

The agent automatically receives your full workspace file tree and the active file content. It proposes changes as:
- **Edit patches** — red/green diff preview, applied with one click
- **New files** — full content preview before creation
- **Terminal commands** — copy to clipboard with one click

All changes require explicit confirmation. Nothing is modified without your approval.

---

## 📤 Settings Import / Export

- **Export Settings** — saves all config (providers, models, endpoints, preferences) to a dated JSON file. API keys are redacted for safe sharing.
- **Import Settings** — restores config from a JSON file with schema validation.

Both buttons are in the **Settings footer** (bottom of the Settings panel).

---

## ⌨️ Shortcuts

| Key | Action |
|---|---|
| \`Enter\` | Send chat message |
| \`Shift+Enter\` | New line in chat |
| \`@path\` | Reference a file in chat |
| \`↑ / ↓\` | Terminal command history |
| \`Escape\` | Cancel inline message edit |
`
  }
};

export default function App() {
  const [files, setFiles] = useState<Record<string, FileSystemItem>>(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState<string | null>('1');
  const [openFileIds, setOpenFileIds] = useState<string[]>(['1']);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [bottomTab, setBottomTab] = useState<'terminal' | 'logs'>('terminal');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false, title: '', description: '', actions: [], mode: 'single',
    onConfirm: () => {}, onCancel: () => {}
  });

  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem('devmind_settings_v8');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(parsed.apiKeys || {}) },
          customEndpoints: { ...DEFAULT_SETTINGS.customEndpoints, ...(parsed.customEndpoints || {}) },
          customProviders: parsed.customProviders || [],
          ollamaModels: parsed.ollamaModels || [],
        };
        // Apply default provider/model if set
        if (parsed.defaultProvider) merged.activeProvider = parsed.defaultProvider;
        if (parsed.defaultModelId) merged.activeModelId = parsed.defaultModelId;
        return merged;
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('devmind_settings_v8', JSON.stringify(settings));
    document.documentElement.className = `theme-${settings.theme}`;
  }, [settings]);

  const addLog = useCallback((message: string, level: LogLevel = 'info') => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      message,
      level,
      timestamp: Date.now(),
    };
    setLogs(prev => [...prev.slice(-99), newLog]);
    if (level === 'error') { setIsTerminalExpanded(true); setBottomTab('logs'); }
  }, []);

  const openFile = (id: string) => {
    if (!openFileIds.includes(id)) setOpenFileIds(prev => [...prev, id]);
    setActiveFileId(id);
  };

  const closeFile = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenFileIds(prev => {
      const newOpen = prev.filter(fid => fid !== id);
      if (activeFileId === id) setActiveFileId(newOpen.length > 0 ? newOpen[newOpen.length - 1] : null);
      return newOpen;
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFileId || value === undefined) return;
    setFiles(prev => ({ ...prev, [activeFileId]: { ...prev[activeFileId], content: value } }));
  };

  const handleCreateFile = (name: string, parentId?: string | null, content: string = '') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const parent = parentId ? files[parentId] : null;
    const ext = name.split('.').pop() || 'plaintext';
    const newFile: FileSystemItem = {
      id, name,
      path: parent ? `${parent.path}/${name}` : `/${name}`,
      type: 'file', content,
      language: ext,
      parentId: parentId || null
    };
    setFiles(prev => ({ ...prev, [id]: newFile }));
    addLog(`File created: ${name}`, 'success');
    openFile(id);
  };

  const handleCreateFolder = (name: string, parentId?: string | null) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const parent = parentId ? files[parentId] : null;
    const newFolder: FileSystemItem = {
      id, name,
      path: parent ? `${parent.path}/${name}` : `/${name}`,
      type: 'folder', parentId: parentId || null
    };
    setFiles(prev => ({ ...prev, [id]: newFolder }));
    addLog(`Folder created: ${name}`, 'success');
  };

  const handleUpload = (fileList: FileList) => {
    const newItems: Record<string, FileSystemItem> = {};
    const folderIdMap: Record<string, string> = {}; // path -> id

    const getOrCreateFolder = (folderPath: string): string => {
      if (folderIdMap[folderPath]) return folderIdMap[folderPath];
      const parts = folderPath.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const parentId = parentPath ? getOrCreateFolder(parentPath) : null;
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
      newItems[id] = { id, name, path: '/' + folderPath, type: 'folder', parentId };
      folderIdMap[folderPath] = id;
      return id;
    };

    Array.from(fileList).forEach(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const parts = relativePath.split('/');
      const name = parts[parts.length - 1];
      const folderPath = parts.slice(0, -1).join('/');
      const parentId = folderPath ? getOrCreateFolder(folderPath) : null;
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newFile: FileSystemItem = {
          id, name,
          path: '/' + relativePath,
          type: 'file', content,
          mimeType: file.type,
          language: name.split('.').pop() || 'plaintext',
          parentId,
        };
        setFiles(prev => ({ ...prev, ...newItems, [id]: newFile }));
        addLog(`Uploaded: ${relativePath}`, 'info');
      };
      if (file.type.startsWith('image') || file.type === 'application/pdf') reader.readAsDataURL(file);
      else reader.readAsText(file);
    });

    // Immediately add folder nodes
    if (Object.keys(newItems).length > 0) {
      setFiles(prev => ({ ...prev, ...newItems }));
    }
  };

  const handleUploadEntries = useCallback(async (entries: FileSystemEntry[]) => {
    // Recursively read all entries from the OS drop
    const allFiles = (await Promise.all(entries.map(readEntryTree))).flat();

    const newItems: Record<string, FileSystemItem> = {};
    const folderIdMap: Record<string, string> = {};

    const getOrCreateFolder = (folderPath: string): string => {
      const clean = folderPath.replace(/^\//, '');
      if (!clean) return '';
      if (folderIdMap[clean]) return folderIdMap[clean];
      const parts = clean.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const parentId = parentPath ? getOrCreateFolder(parentPath) : null;
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
      newItems[id] = { id, name, path: '/' + clean, type: 'folder', parentId: parentId || null };
      folderIdMap[clean] = id;
      return id;
    };

    // Pre-create all folder nodes synchronously
    for (const { path } of allFiles) {
      const parts = path.replace(/^\//, '').split('/');
      if (parts.length > 1) {
        const folderPath = parts.slice(0, -1).join('/');
        getOrCreateFolder(folderPath);
      }
    }
    if (Object.keys(newItems).length > 0) {
      setFiles(prev => ({ ...prev, ...newItems }));
    }

    // Now read file contents
    for (const { path, file } of allFiles) {
      const parts = path.replace(/^\//, '').split('/');
      const name = parts[parts.length - 1];
      const folderPath = parts.slice(0, -1).join('/');
      const parentId = folderPath ? (folderIdMap[folderPath] || null) : null;
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFiles(prev => ({
          ...prev,
          [id]: {
            id, name,
            path: path.startsWith('/') ? path : '/' + path,
            type: 'file', content,
            mimeType: file.type,
            language: name.split('.').pop() || 'plaintext',
            parentId,
          },
        }));
        addLog(`Uploaded: ${path}`, 'info');
      };
      if (file.type.startsWith('image') || file.type === 'application/pdf') reader.readAsDataURL(file);
      else reader.readAsText(file);
    }
  }, [addLog]);

  const handleDelete = (id: string) => {
    const itemName = files[id]?.name;
    setFiles(prev => {
      const next = { ...prev };
      const idsToDelete = new Set([id]);
      let count;
      do {
        count = idsToDelete.size;
        (Object.values(next) as FileSystemItem[]).forEach(f => {
          if (f.parentId && idsToDelete.has(f.parentId)) idsToDelete.add(f.id);
        });
      } while (idsToDelete.size !== count);
      idsToDelete.forEach(toDel => {
        delete next[toDel];
        setOpenFileIds(prevOpen => prevOpen.filter(oid => oid !== toDel));
        if (activeFileId === toDel) setActiveFileId(null);
      });
      return next;
    });
    addLog(`Deleted: ${itemName}`, 'warning');
  };

  const handleMoveItem = (itemId: string, targetParentId: string | null) => {
    setFiles(prev => {
      const item = prev[itemId];
      if (!item || targetParentId === itemId) return prev;
      let current = targetParentId;
      while (current) {
        if (current === itemId) return prev;
        current = prev[current]?.parentId || null;
      }
      const targetParent = targetParentId ? prev[targetParentId] : null;
      const newPath = targetParent ? `${targetParent.path}/${item.name}` : `/${item.name}`;
      addLog(`Moved ${item.name} → ${targetParent ? targetParent.path : 'root'}`, 'info');
      return { ...prev, [itemId]: { ...item, parentId: targetParentId, path: newPath } };
    });
  };

  const handleDownloadItem = (item: FileSystemItem) => {
    if (item.type === 'file') {
      const el = document.createElement('a');
      el.href = URL.createObjectURL(new Blob([item.content || ''], { type: item.mimeType || 'text/plain' }));
      el.download = item.name;
      document.body.appendChild(el);
      el.click();
      document.body.removeChild(el);
      addLog(`Downloaded: ${item.name}`, 'info');
    } else {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ [item.id]: item }, null, 2));
      const el = document.createElement('a');
      el.setAttribute('href', dataStr);
      el.setAttribute('download', `${item.name}_backup.json`);
      document.body.appendChild(el);
      el.click();
      el.remove();
    }
  };

  const downloadWorkspace = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(files, null, 2));
    const el = document.createElement('a');
    el.setAttribute('href', dataStr);
    el.setAttribute('download', 'devmind_workspace.json');
    document.body.appendChild(el);
    el.click();
    el.remove();
    addLog('Workspace exported', 'success');
  };

  const handleClearChat = () => {
    setMessages(INITIAL_MESSAGES);
    addLog('Chat history cleared', 'info');
  };

  const handleEditMessage = useCallback((msgId: string, newContent: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: newContent } : m));
    addLog('Message edited', 'info');
  }, [addLog]);

  // ── Core action execution (no confirmation) ────────────────────────────
  const executeAction = useCallback((action: AgentAction) => {
    if (action.type === 'edit') {
      const editData = action.data as FileEdit;
      const targetFile = (Object.values(files) as FileSystemItem[]).find(f =>
        f.path === editData.filePath ||
        f.path === '/' + editData.filePath ||
        f.name === editData.filePath ||
        f.path.endsWith('/' + editData.filePath)
      );

      if (!targetFile) {
        addLog(`Patch failed: File "${editData.filePath}" not found in workspace`, 'error');
        return;
      }

      const normalize = (s: string) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const searchBlock = normalize(editData.search);
      const replaceBlock = normalize(editData.replace);

      let source = '';
      let editorModel: any = null;

      if (editorRef.current && monacoRef.current && activeFileId === targetFile.id) {
        editorModel = editorRef.current.getModel();
        source = normalize(editorModel.getValue());
      } else {
        source = normalize(targetFile.content || '');
      }

      let matchIdx = source.indexOf(searchBlock);

      // Fallback: relaxed whitespace matching
      if (matchIdx === -1) {
        const sourceLines = source.split('\n');
        const searchLines = searchBlock.split('\n');
        for (let i = 0; i <= sourceLines.length - searchLines.length; i++) {
          let matches = true;
          for (let j = 0; j < searchLines.length; j++) {
            if (sourceLines[i + j].trim() !== searchLines[j].trim()) {
              matches = false;
              break;
            }
          }
          if (matches) {
            const potentialBlock = sourceLines.slice(i, i + searchLines.length).join('\n');
            matchIdx = source.indexOf(potentialBlock);
            break;
          }
        }
      }

      if (matchIdx !== -1) {
        if (editorModel && monacoRef.current && activeFileId === targetFile.id) {
          const before = source.substring(0, matchIdx);
          const linesBefore = before.split('\n');
          const startLine = linesBefore.length;
          const startCol = linesBefore[linesBefore.length - 1].length + 1;
          const matchedContent = source.substr(matchIdx, searchBlock.length);
          const matchedLines = matchedContent.split('\n');
          const endLine = startLine + matchedLines.length - 1;
          const endCol = matchedLines.length > 1
            ? matchedLines[matchedLines.length - 1].length + 1
            : startCol + matchedContent.length;
          const range = new monacoRef.current.Range(startLine, startCol, endLine, endCol);
          editorRef.current.executeEdits('devmind-ai', [{ range, text: replaceBlock, forceMoveMarkers: true }]);
        } else {
          const newContent = source.substring(0, matchIdx) + replaceBlock + source.substring(matchIdx + searchBlock.length);
          setFiles(prev => ({ ...prev, [targetFile.id]: { ...prev[targetFile.id], content: newContent } }));
        }
        action.applied = true;
        addLog(`✓ Patched: ${targetFile.name}`, 'success');
      } else {
        addLog(`✗ Search block not found in ${targetFile.name}`, 'error');
      }
    } else if (action.type === 'create') {
      const data = action.data as FileCreate;
      const name = data.path.split('/').pop() || data.path;
      const ext = name.split('.').pop() || 'plaintext';
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
      const newFile: FileSystemItem = {
        id, name,
        path: data.path.startsWith('/') ? data.path : '/' + data.path,
        type: 'file', content: data.content,
        language: ext, parentId: null,
      };
      setFiles(prev => ({ ...prev, [id]: newFile }));
      setOpenFileIds(prev => [...prev, id]);
      setActiveFileId(id);
      addLog(`✓ Created: ${name}`, 'success');
      action.applied = true;
    } else if (action.type === 'terminal') {
      const data = action.data as TerminalCommand;
      navigator.clipboard.writeText(data.command).catch(() => {});
      action.applied = true;
      addLog(`Terminal command copied: ${data.command}`, 'info');
      setIsTerminalExpanded(true);
    }
  }, [files, activeFileId, addLog, setFiles, setOpenFileIds, setActiveFileId, setIsTerminalExpanded]);

  // ── Confirm dialog handler ─────────────────────────────────────────────
  const handleRequestConfirm = (actions: AgentAction[], mode: 'single' | 'all') => {
    const title = mode === 'all'
      ? `Apply ${actions.length} Changes`
      : actions[0]?.type === 'edit'
        ? 'Apply File Edit'
        : actions[0]?.type === 'create'
          ? 'Create New File'
          : 'Run Terminal Command';

    const description = mode === 'all'
      ? 'Review and confirm all proposed changes below.'
      : 'Review and confirm this change before applying.';

    setConfirmDialog({
      isOpen: true,
      title,
      description,
      actions,
      mode,
      onConfirm: () => {
        actions.forEach(a => executeAction(a));
        // Update messages to mark actions as applied
        setMessages(prev => prev.map(msg => ({
          ...msg,
          pendingActions: msg.pendingActions?.map(pa =>
            actions.find(a => a.id === pa.id) ? { ...pa, applied: true } : pa
          )
        })));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
    });
  };

  // ── Direct apply (no confirm) ──────────────────────────────────────────
  const handleApplyAction = useCallback((action: AgentAction) => {
    handleRequestConfirm([action], 'single');
  }, [executeAction]);

  const handleApplyAllActions = useCallback((actions: AgentAction[]) => {
    handleRequestConfirm(actions, 'all');
  }, [executeAction]);

  // ── Send message to AI ─────────────────────────────────────────────────
  const handleSendMessage = async (text: string, attachments: FileAttachment[]) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    // Find active model by provider+id
    const customProvs = settings.customProviders || [];
    const cpModels = customProvs.flatMap((cp: any) => cp.models || []);
    const detectedOllama = (settings.ollamaModels || []).map((name: string) => ({
      id: name, name: `${name} (Ollama)`, provider: 'ollama' as const, contextWindow: 32768, vision: false,
    }));
    const allAvailableModels = [
      ...DEFAULT_MODELS,
      ...detectedOllama.filter((dm: any) => !DEFAULT_MODELS.some(m => m.id === dm.id && m.provider === 'ollama')),
      ...settings.customModels,
      ...cpModels,
    ];
    const activeModel = allAvailableModels.find(m =>
      m.id === settings.activeModelId && m.provider === settings.activeProvider
    ) || allAvailableModels.find(m => m.provider === settings.activeProvider) || allAvailableModels[0];

    addLog(`→ ${activeModel.name} (${activeModel.provider})`, 'info');

    // Build rich context for agent
    const workspaceFileList = (Object.values(files) as FileSystemItem[])
      .map(f => `  ${f.type === 'folder' ? '📁' : '📄'} ${f.path}`)
      .join('\n');

    let contextStr = `## WORKSPACE FILE TREE\n${workspaceFileList}\n\n`;

    const currentFile = activeFileId ? files[activeFileId] : null;
    if (currentFile && currentFile.type === 'file') {
      const actualContent = editorRef.current && activeFileId === currentFile.id
        ? editorRef.current.getValue()
        : (currentFile.content || '(empty)');
      contextStr += `## ACTIVE FILE: ${currentFile.path}\n\`\`\`${currentFile.language || ''}\n${actualContent}\n\`\`\`\n`;
    }

    // Include any @file references from the user message
    const mentionedPaths = [...text.matchAll(/@([^\s]+)/g)].map(m => m[1]);
    for (const path of mentionedPaths) {
      const mentionedFile = (Object.values(files) as FileSystemItem[]).find(f =>
        f.path === path || f.path.endsWith(path) || f.name === path
      );
      if (mentionedFile && mentionedFile.content && mentionedFile.id !== activeFileId) {
        contextStr += `\n## REFERENCED FILE: ${mentionedFile.path}\n\`\`\`${mentionedFile.language || ''}\n${mentionedFile.content}\n\`\`\`\n`;
      }
    }

    const assistantMsgId = (Date.now() + 1).toString();
    let fullResponse = '', fullThought = '';
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      thought: '',
      timestamp: Date.now(),
      modelName: activeModel.name
    }]);

    try {
      await streamResponse(
        [...messages, userMsg],
        settings,
        activeModel,
        contextStr,
        (chunk, thought) => {
          if (chunk) fullResponse += chunk;
          if (thought) fullThought += thought;
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: fullResponse, thought: fullThought } : m
          ));
        }
      );

      // Parse agent actions from the response
      const actions = detectActions(fullResponse);
      if (actions.length > 0) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, pendingActions: actions } : m
        ));
        addLog(`Agent proposed ${actions.length} change${actions.length !== 1 ? 's' : ''}`, 'info');
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      }]);
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Parse XML action blocks from AI response ───────────────────────────
  const detectActions = (content: string): AgentAction[] => {
    const actions: AgentAction[] = [];

    const stripCDATA = (s: string) => {
      const t = s.trim();
      if (t.startsWith('<![CDATA[') && t.endsWith(']]>')) return t.slice(9, -3);
      return t;
    };

    // Edit actions
    const editRegex = /<edit>[\s\S]*?<path>([\s\S]*?)<\/path>[\s\S]*?<search>([\s\S]*?)<\/search>[\s\S]*?<replace>([\s\S]*?)<\/replace>[\s\S]*?<\/edit>/g;
    let match;
    while ((match = editRegex.exec(content)) !== null) {
      actions.push({
        id: `edit-${Date.now()}-${actions.length}`,
        type: 'edit',
        data: {
          filePath: match[1].trim(),
          search: stripCDATA(match[2]),
          replace: stripCDATA(match[3]),
          applied: false,
        },
        applied: false,
      });
    }

    // Create actions
    const createRegex = /<create>[\s\S]*?<path>([\s\S]*?)<\/path>[\s\S]*?<content>([\s\S]*?)<\/content>[\s\S]*?<\/create>/g;
    while ((match = createRegex.exec(content)) !== null) {
      actions.push({
        id: `create-${Date.now()}-${actions.length}`,
        type: 'create',
        data: {
          path: match[1].trim(),
          content: stripCDATA(match[2]),
        },
        applied: false,
      });
    }

    // Terminal commands
    const terminalRegex = /<terminal>[\s\S]*?<command>([\s\S]*?)<\/command>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/terminal>/g;
    while ((match = terminalRegex.exec(content)) !== null) {
      actions.push({
        id: `terminal-${Date.now()}-${actions.length}`,
        type: 'terminal',
        data: {
          command: stripCDATA(match[1]),
          description: match[2].trim(),
        },
        applied: false,
      });
    }

    return actions;
  };

  const handleResendMessage = useCallback((msgId: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      const msg = prev[idx];
      const trimmed = prev.slice(0, idx);
      setTimeout(() => handleSendMessage(msg.content, msg.attachments || []), 10);
      return trimmed;
    });
  }, []);

  // ── Get active model display ───────────────────────────────────────────
  const customProviders = settings.customProviders || [];
  const customProviderModels = customProviders.flatMap((cp: any) => cp.models || []);
  // Dynamically build Ollama models from detected list
  const detectedOllamaModels = (settings.ollamaModels || []).map(name => ({
    id: name, name: `${name} (Ollama)`, provider: 'ollama' as const, contextWindow: 32768, vision: false,
  }));
  const allModels = [
    ...DEFAULT_MODELS,
    ...detectedOllamaModels.filter(dm => !DEFAULT_MODELS.some(m => m.id === dm.id && m.provider === 'ollama')),
    ...settings.customModels,
    ...customProviderModels,
  ];

  const activeModel = allModels.find(m =>
    m.id === settings.activeModelId && m.provider === settings.activeProvider
  ) || allModels.find(m => m.provider === settings.activeProvider);

  const providerModels = allModels.filter(m => m.provider === settings.activeProvider);
  const allProviders = [...PROVIDER_GROUPS.online, ...PROVIDER_GROUPS.offline];

  return (
    <div className="fixed inset-0 grid grid-rows-[44px_1fr] bg-ide-bg text-ide-text overflow-hidden select-none selection:bg-ide-accent/30 font-sans">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-ide-panel border-b border-ide-border flex items-center justify-between px-4 shadow-sm z-30">
        <div className="flex items-center space-x-6">
          <span className="font-black text-ide-accent flex items-center gap-2 text-sm uppercase tracking-widest cursor-default">
            <Icons.Code size={20} strokeWidth={2.5} />
            DevMind
            <span className="text-[9px] text-gray-500 font-bold normal-case tracking-normal">v8</span>
          </span>

          <div className="flex items-center space-x-2">
            {/* Provider selector */}
            <select
              value={settings.activeProvider}
              onChange={e => {
                const newProvider = e.target.value as ProviderType;
                const firstModel = allModels.find(m => m.provider === newProvider);
                setSettings(s => ({
                  ...s,
                  activeProvider: newProvider,
                  activeModelId: firstModel?.id || s.activeModelId
                }));
              }}
              className="bg-ide-activity border border-ide-border rounded-lg px-2 py-1.5 text-xs font-bold text-ide-text outline-none hover:border-ide-accent transition-all cursor-pointer"
            >
              <optgroup label="── Online ──">
                {PROVIDER_GROUPS.online.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </optgroup>
              <optgroup label="── Offline ──">
                {PROVIDER_GROUPS.offline.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </optgroup>
              {customProviders.length > 0 && (
                <optgroup label="── Custom ──">
                  {customProviders.map((cp: any) => (
                    <option key={cp.id} value={cp.id}>{cp.icon} {cp.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Model selector */}
            <select
              value={settings.activeModelId}
              onChange={e => setSettings(s => ({ ...s, activeModelId: e.target.value }))}
              className="bg-ide-activity border border-ide-border rounded-lg px-2 py-1.5 text-xs font-bold text-ide-text outline-none hover:border-ide-accent transition-all cursor-pointer max-w-[180px]"
            >
              {providerModels.length > 0
                ? providerModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                : <option value="">No models for this provider</option>
              }
            </select>

            {/* Offline indicator */}
            {(PROVIDER_GROUPS.offline.find(p => p.id === settings.activeProvider) ||
              customProviders.find((cp: any) => cp.id === settings.activeProvider && cp.isOffline)) && (
              <span className="text-[9px] text-green-400 font-black uppercase px-2 py-1 bg-green-900/20 border border-green-800/30 rounded-md">
                🔒 Offline
              </span>
            )}
            {customProviders.find((cp: any) => cp.id === settings.activeProvider && !cp.isOffline) && (
              <span className="text-[9px] text-purple-400 font-black uppercase px-2 py-1 bg-purple-900/20 border border-purple-800/30 rounded-md">
                🔷 Custom
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button onClick={downloadWorkspace} className="p-2 rounded-lg hover:bg-ide-activity transition-all text-gray-400 hover:text-white" title="Export Workspace">
            <Icons.Download size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-lg hover:bg-ide-activity transition-all text-gray-400 hover:text-white ${!showSidebar && 'opacity-40'}`}
            title="Toggle Explorer">
            <Icons.PanelLeft size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg hover:bg-ide-activity transition-all text-gray-400 hover:text-white ${!showChat && 'opacity-40'}`}
            title="Toggle AI Chat">
            <Icons.MessageSquare size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => { setIsTerminalExpanded(true); setBottomTab('logs'); }}
            className="p-2 rounded-lg hover:bg-ide-activity transition-all text-gray-400 hover:text-white"
            title="System Runtime Log"
          >
            <Icons.Terminal size={18} strokeWidth={2.5} />
          </button>
          <div className="w-px h-5 bg-ide-border mx-1" />
          <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg hover:bg-ide-activity transition-all text-gray-400 hover:text-white" title="Settings">
            <Icons.Settings size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => setShowAbout(true)} className="p-2 rounded-lg hover:bg-ide-activity transition-all text-gray-400 hover:text-white" title="About">
            <Icons.Info size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <main className="flex overflow-hidden min-h-0">
        {/* Explorer sidebar */}
        {showSidebar && (
          <aside className="w-64 flex-shrink-0 border-r border-ide-border min-h-0 flex flex-col bg-ide-sidebar shadow-lg">
            <Explorer
              files={files}
              activeFileId={activeFileId}
              onFileClick={openFile}
              onUpload={handleUpload}
              onUploadEntries={handleUploadEntries}
              onDelete={handleDelete}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onMoveItem={handleMoveItem}
              onDownloadItem={handleDownloadItem}
            />
          </aside>
        )}

        {/* Editor + terminal */}
        <section className="flex-1 min-w-0 bg-ide-bg relative flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 relative">
            <EditorArea
              openFiles={openFileIds.map(id => files[id]).filter(Boolean)}
              activeFileId={activeFileId}
              settings={settings}
              onChange={handleEditorChange}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
              }}
              onTabClick={openFile}
              onTabClose={closeFile}
            />
          </div>

          {/* Tabbed bottom panel: Terminal + Logs */}
          <BottomPanel
            logs={logs}
            isExpanded={isTerminalExpanded}
            onToggle={setIsTerminalExpanded}
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            onClearLogs={() => setLogs([])}
            onTerminalCommand={(cmd) => addLog(`Terminal: ${cmd}`, 'info')}
          />
        </section>

        {/* Chat panel */}
        {showChat && (
          <aside className="w-[400px] flex-shrink-0 border-l border-ide-border shadow-2xl z-20 min-h-0 flex flex-col bg-ide-panel">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              onEnhancePrompt={async (t) => {
                const model = activeModel || allModels[0] || DEFAULT_MODELS[0];
                return enhancePrompt(t, settings, model);
              }}
              onApplyAction={handleApplyAction}
              onApplyAllActions={handleApplyAllActions}
              onRequestConfirm={handleRequestConfirm}
              onClearChat={handleClearChat}
              isStreaming={isStreaming}
              workspaceFiles={Object.values(files)}
              onAttachFile={openFile}
              onRunTerminal={(cmd, desc) => {
                setIsTerminalExpanded(true);
                setBottomTab('terminal');
                addLog(`Terminal: ${cmd}`, 'info');
              }}
              onEditMessage={handleEditMessage}
              onResendMessage={handleResendMessage}
            />
          </aside>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />

      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        actions={confirmDialog.actions}
        mode={confirmDialog.mode}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />
    </div>
  );
}
