import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, FileEdit, FileAttachment, AgentAction, FileCreate, TerminalCommand, FileSystemItem } from '../types';
import { Icons } from './Icon';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachments: FileAttachment[]) => void;
  onEnhancePrompt: (text: string) => Promise<string>;
  onApplyAction: (action: AgentAction) => void;
  onApplyAllActions: (actions: AgentAction[]) => void;
  onRequestConfirm: (actions: AgentAction[], mode: 'single' | 'all') => void;
  onClearChat: () => void;
  isStreaming: boolean;
  workspaceFiles: FileSystemItem[];
  onAttachFile: (fileId: string) => void;
  onRunTerminal: (cmd: string, desc: string) => void;
  onEditMessage: (msgId: string, newContent: string) => void;
  onResendMessage: (msgId: string) => void;
}

// ── Thought / reasoning block ─────────────────────────────────────────────
const ThoughtBlock: React.FC<{ thought: string; isStreaming: boolean }> = ({ thought, isStreaming }) => {
  const [isExpanded, setIsExpanded] = useState(isStreaming);
  useEffect(() => { if (isStreaming) setIsExpanded(true); }, [isStreaming]);
  if (!thought.trim() && !isStreaming) return null;

  return (
    <div className="mb-4 overflow-hidden border border-ide-border bg-ide-activity/30 rounded-xl shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isExpanded ? 'bg-ide-accent/15 text-ide-accent' : 'text-gray-500 hover:text-ide-accent'}`}
      >
        <div className="flex items-center">
          <Icons.Brain size={16} strokeWidth={2.5} className={`mr-3 ${isStreaming ? 'animate-pulse text-ide-accent' : ''}`} />
          <span>Reasoning</span>
          {thought && <span className="ml-2 text-[9px] text-gray-600">{thought.length} chars</span>}
        </div>
        {isExpanded ? <Icons.ChevronDown size={14} strokeWidth={2.5} /> : <Icons.ChevronRight size={14} strokeWidth={2.5} />}
      </button>
      {isExpanded && (
        <div className="px-4 py-3 text-[11px] font-mono text-gray-400 leading-relaxed animate-in fade-in duration-200 max-h-48 overflow-y-auto no-scrollbar">
          {thought
            ? thought
            : <span className="flex items-center space-x-2 animate-pulse"><Icons.RefreshCw size={12} className="animate-spin" /><span>Processing...</span></span>
          }
        </div>
      )}
    </div>
  );
};

// ── Single action card ─────────────────────────────────────────────────────
const ActionCard: React.FC<{
  action: AgentAction;
  index: number;
  isStreaming: boolean;
  onApply: (a: AgentAction) => void;
  onConfirm: (a: AgentAction) => void;
  onCopyTerminal: (cmd: string, desc: string) => void;
}> = ({ action, index, isStreaming, onApply, onConfirm, onCopyTerminal }) => {
  const [expanded, setExpanded] = useState(true);

  const iconColor = action.type === 'edit' ? 'text-blue-400' : action.type === 'create' ? 'text-green-400' : 'text-yellow-400';
  const label = action.type === 'edit' ? 'Edit File' : action.type === 'create' ? 'New File' : 'Terminal Command';
  const filePath = action.type === 'terminal'
    ? (action.data as TerminalCommand).command
    : (action.data as any).filePath || (action.data as any).path;

  return (
    <div className={`mt-4 rounded-xl border overflow-hidden shadow-inner transition-all ${
      action.applied
        ? 'border-green-800/40 bg-green-900/10'
        : action.type === 'terminal'
        ? 'border-yellow-800/30 bg-yellow-900/5'
        : 'border-white/10 bg-black/40'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center space-x-3 flex-1 text-left">
          <span className={`text-[11px] font-black uppercase tracking-widest ${iconColor}`}>
            {action.type === 'edit' && <Icons.FilePenLine size={14} className="inline mr-2" strokeWidth={2.5} />}
            {action.type === 'create' && <Icons.FilePlus size={14} className="inline mr-2" strokeWidth={2.5} />}
            {action.type === 'terminal' && <Icons.Terminal size={14} className="inline mr-2" strokeWidth={2.5} />}
            {label}
          </span>
          <span className="text-[10px] text-gray-500 font-mono truncate max-w-[140px]">{filePath}</span>
        </button>

        <div className="flex items-center space-x-2 shrink-0">
          {action.applied ? (
            <span className="text-[10px] text-green-500 font-black uppercase flex items-center">
              <Icons.Check size={14} strokeWidth={3} className="mr-1" />Applied
            </span>
          ) : action.type === 'terminal' ? (
            <button
              onClick={() => onCopyTerminal(
                (action.data as TerminalCommand).command,
                (action.data as TerminalCommand).description
              )}
              className="px-3 py-1.5 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-700/40 text-yellow-300 text-[10px] font-black uppercase rounded-lg transition-all"
            >
              <Icons.Copy size={12} className="inline mr-1" strokeWidth={2.5} />Copy
            </button>
          ) : (
            <button
              onClick={() => onConfirm(action)}
              disabled={isStreaming}
              className="px-3 py-1.5 bg-ide-accent hover:bg-blue-600 disabled:opacity-30 text-white text-[10px] font-black uppercase rounded-lg shadow-xl active:scale-95 transition-all"
            >
              Apply
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-400 p-1">
            {expanded ? <Icons.ChevronDown size={14} /> : <Icons.ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-white/5 text-[10px] font-mono">
          {action.type === 'edit' && (
            <div className="grid grid-cols-2 gap-0">
              <div className="p-3 border-r border-white/5">
                <div className="text-[9px] font-black uppercase text-red-400/70 mb-1.5 flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />Remove
                </div>
                <pre className="whitespace-pre-wrap bg-red-900/10 p-2 rounded text-[9px] text-red-300/80 max-h-36 overflow-auto leading-relaxed selection:bg-red-500/20">
                  {(action.data as FileEdit).search}
                </pre>
              </div>
              <div className="p-3">
                <div className="text-[9px] font-black uppercase text-green-400/70 mb-1.5 flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />Add
                </div>
                <pre className="whitespace-pre-wrap bg-green-900/10 p-2 rounded text-[9px] text-green-300/80 max-h-36 overflow-auto leading-relaxed selection:bg-green-500/20">
                  {(action.data as FileEdit).replace}
                </pre>
              </div>
            </div>
          )}
          {action.type === 'create' && (
            <div className="p-3">
              <div className="text-[9px] font-black uppercase text-ide-accent/70 mb-1.5">New File Content</div>
              <pre className="whitespace-pre-wrap bg-white/5 p-2 rounded text-[9px] text-gray-300/80 max-h-36 overflow-auto leading-relaxed">
                {(action.data as FileCreate).content.slice(0, 500)}{(action.data as FileCreate).content.length > 500 ? '\n... (truncated)' : ''}
              </pre>
            </div>
          )}
          {action.type === 'terminal' && (
            <div className="p-3">
              <div className="text-[9px] font-black uppercase text-yellow-400/70 mb-1.5">Command</div>
              <pre className="whitespace-pre-wrap bg-black/60 border border-yellow-800/20 p-3 rounded text-xs text-yellow-200 leading-relaxed">$ {(action.data as TerminalCommand).command}</pre>
              {(action.data as TerminalCommand).description && (
                <p className="text-[10px] text-gray-500 mt-2">{(action.data as TerminalCommand).description}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Message bubble ─────────────────────────────────────────────────────────
const MessageBubble: React.FC<{
  msg: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  onApply: (a: AgentAction) => void;
  onConfirmSingle: (a: AgentAction) => void;
  onConfirmAll: (actions: AgentAction[]) => void;
  onRunTerminal: (cmd: string, desc: string) => void;
  onEdit: (msgId: string, newContent: string) => void;
  onResend: (msgId: string) => void;
}> = ({ msg, isLast, isStreaming, onApply, onConfirmSingle, onConfirmAll, onRunTerminal, onEdit, onResend }) => {
  const nonTerminalPending = (msg.pendingActions || []).filter(a => !a.applied && a.type !== 'terminal');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleEditSave = () => {
    if (editText.trim()) onEdit(msg.id, editText.trim());
    setEditing(false);
  };

  return (
    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-300`}>
      <div className={`flex items-center mb-2 space-x-3 text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        <span className={msg.role === 'user' ? 'text-ide-accent ml-3' : 'text-gray-400'}>
          {msg.role === 'user' ? 'You' : (msg.modelName || 'DevMind')}
        </span>
        <span className="text-gray-600 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className={`max-w-[95%] rounded-2xl p-4 text-[13px] shadow-lg leading-relaxed ${
        msg.role === 'user'
          ? 'bg-ide-accent text-white rounded-tr-none'
          : msg.role === 'system'
          ? 'bg-red-900/30 border border-red-800/40 text-red-300 rounded-tl-none'
          : 'bg-ide-activity border border-ide-border text-ide-text rounded-tl-none shadow-xl'
      }`}>
        {msg.role === 'assistant' && (
          <ThoughtBlock thought={msg.thought || ''} isStreaming={isStreaming && isLast} />
        )}

        {msg.attachments?.map((att, i) => (
          <div key={i} className="flex items-center space-x-3 mb-3 p-2 bg-black/20 rounded-xl border border-white/5">
            {att.mimeType.startsWith('image') ? (
              <img src={att.data} className="h-10 w-10 object-cover rounded-lg" alt={att.name} />
            ) : (
              <Icons.FileText size={18} className="text-red-400" />
            )}
            <span className="text-[11px] font-bold truncate max-w-[150px]">{att.name}</span>
          </div>
        ))}

        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full bg-black/30 border border-ide-accent/40 rounded-xl p-3 text-[13px] text-white outline-none resize-none min-h-[80px] font-sans leading-relaxed"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); } if (e.key === 'Escape') setEditing(false); }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-gray-400 hover:text-white border border-ide-border rounded-lg transition-all">Cancel</button>
              <button onClick={handleEditSave} className="px-3 py-1.5 text-[10px] font-black uppercase bg-ide-accent hover:bg-blue-600 text-white rounded-lg transition-all">Save</button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap font-sans text-[13px]">{msg.content}</div>
        )}

        {/* Actions */}
        {msg.pendingActions && msg.pendingActions.length > 0 && (
          <div className="mt-4 space-y-1">
            {nonTerminalPending.length > 1 && (
              <div className="flex items-center justify-between p-3 bg-ide-accent/10 border border-ide-accent/20 rounded-xl mb-3">
                <span className="text-[11px] text-ide-accent font-black uppercase tracking-widest">
                  {nonTerminalPending.length} pending changes
                </span>
                <button
                  onClick={() => onConfirmAll(nonTerminalPending)}
                  disabled={isStreaming}
                  className="px-4 py-2 bg-ide-accent hover:bg-blue-600 disabled:opacity-30 text-white text-[10px] font-black uppercase rounded-lg shadow-xl active:scale-95 transition-all"
                >
                  <Icons.CheckCheck size={14} className="inline mr-2" strokeWidth={2.5} />
                  Apply All
                </button>
              </div>
            )}
            {msg.pendingActions.map((action, i) => (
              <ActionCard
                key={action.id || i}
                action={action}
                index={i}
                isStreaming={isStreaming && isLast}
                onApply={onApply}
                onConfirm={onConfirmSingle}
                onCopyTerminal={(cmd, desc) => {
                  navigator.clipboard.writeText(cmd);
                  onRunTerminal(cmd, desc);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Message controls */}
      {msg.role !== 'system' && !editing && (
        <div className={`flex items-center gap-1 mt-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-all"
            title="Copy message"
          >
            {copied ? <Icons.Check size={12} strokeWidth={2.5} className="text-green-400" /> : <Icons.Copy size={12} strokeWidth={2.5} />}
          </button>
          {msg.role === 'user' && (
            <>
              <button
                onClick={() => { setEditText(msg.content); setEditing(true); }}
                className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-all"
                title="Edit message"
              >
                <Icons.FilePenLine size={12} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => onResend(msg.id)}
                disabled={isStreaming}
                className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-all disabled:opacity-30"
                title="Resend message"
              >
                <Icons.RefreshCw size={12} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── File picker for context ────────────────────────────────────────────────
const FileContextPicker: React.FC<{
  files: FileSystemItem[];
  onSelect: (path: string) => void;
  onClose: () => void;
}> = ({ files, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const allItems = files.filter(f => f.type === 'file' || f.type === 'folder');
  const filtered = search
    ? allItems.filter(f => f.path.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-ide-panel border border-ide-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
      <div className="p-3 border-b border-ide-border">
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search files & folders..."
          className="w-full bg-ide-activity border border-ide-border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-ide-accent"
        />
      </div>
      <div className="max-h-48 overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <div className="p-3 text-[11px] text-gray-500 text-center">No files found</div>
        ) : filtered.slice(0, 30).map(f => (
          <button key={f.id}
            onClick={() => { onSelect(f.path); onClose(); }}
            className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-ide-activity/60 text-left transition-colors">
            {f.type === 'folder'
              ? <Icons.FolderOpen size={14} className="text-ide-accent shrink-0" />
              : <Icons.FileText size={14} className="text-gray-500 shrink-0" />}
            <span className="text-[11px] text-gray-300 truncate">{f.path}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Main Chat Panel ────────────────────────────────────────────────────────
export const ChatPanel: React.FC<ChatProps> = ({
  messages, onSendMessage, onEnhancePrompt, onApplyAction, onApplyAllActions,
  onRequestConfirm, onClearChat, isStreaming, workspaceFiles, onAttachFile, onRunTerminal, onEditMessage, onResendMessage
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(input, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      (Array.from(e.target.files) as File[]).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          setAttachments(prev => [...prev, { name: file.name, mimeType: file.type, data: evt.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleFileContextSelect = (path: string) => {
    setInput(prev => `${prev}@${path} `);
    textareaRef.current?.focus();
  };

  const handleEnhance = async () => {
    if (!input.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const enhanced = await onEnhancePrompt(input);
      setInput(enhanced);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleConfirmSingle = (action: AgentAction) => {
    onRequestConfirm([action], 'single');
  };

  const handleConfirmAll = (actions: AgentAction[]) => {
    onRequestConfirm(actions, 'all');
  };

  return (
    <div className="flex flex-col h-full bg-ide-panel w-full">
      {/* Header */}
      <div className="p-4 border-b border-ide-border font-black text-xs uppercase tracking-[0.2em] flex justify-between items-center shrink-0 h-12 bg-ide-sidebar/40">
        <div className="flex items-center space-x-3">
          <Icons.MessageSquare size={20} strokeWidth={2.5} className="text-ide-accent" />
          <span>AI Agent</span>
          {isStreaming && (
            <div className="flex items-center space-x-1.5 text-ide-accent">
              <div className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-pulse" />
              <span className="text-[9px]">Thinking</span>
            </div>
          )}
        </div>
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} className="text-gray-500 hover:text-red-400 p-1 transition-colors" title="Clear chat">
            <Icons.Trash2 size={18} strokeWidth={2.5} />
          </button>
        ) : (
          <div className="flex items-center space-x-2 animate-in slide-in-from-right-2">
            <button onClick={() => setConfirmClear(false)} className="text-[10px] text-gray-400 font-bold uppercase hover:text-white">Cancel</button>
            <button onClick={() => { onClearChat(); setConfirmClear(false); }} className="text-[10px] bg-red-600 px-2 py-1 rounded font-bold uppercase text-white shadow-lg">Confirm</button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-ide-bg/30 no-scrollbar">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isLast={idx === messages.length - 1}
            isStreaming={isStreaming}
            onApply={onApplyAction}
            onConfirmSingle={handleConfirmSingle}
            onConfirmAll={handleConfirmAll}
            onRunTerminal={onRunTerminal}
            onEdit={onEditMessage}
            onResend={onResendMessage}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 bg-ide-panel border-t border-ide-border shrink-0 shadow-2xl space-y-3">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex space-x-2 pb-1 overflow-x-auto no-scrollbar">
            {attachments.map((att, i) => (
              <div key={i} className="relative group flex-shrink-0">
                {att.mimeType.startsWith('image')
                  ? <img src={att.data} className="h-12 w-12 object-cover rounded-lg border border-ide-border" alt="" />
                  : <div className="h-12 w-12 bg-ide-activity flex items-center justify-center rounded-lg border border-ide-border"><Icons.FileText size={24} /></div>
                }
                <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-xl">
                  <Icons.X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="relative">
          {showFilePicker && (
            <FileContextPicker
              files={workspaceFiles}
              onSelect={handleFileContextSelect}
              onClose={() => setShowFilePicker(false)}
            />
          )}
          <div className="bg-ide-activity border border-ide-border rounded-2xl overflow-hidden focus-within:border-ide-accent focus-within:ring-2 ring-ide-accent/10 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask DevMind anything... (Shift+Enter for new line)"
              className="w-full bg-transparent p-4 text-[13px] text-white outline-none resize-none min-h-[80px] font-sans leading-relaxed"
              rows={3}
            />
            <div className="flex items-center justify-between px-4 py-2.5 bg-black/10 border-t border-white/5">
              <div className="flex items-center space-x-1">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} multiple accept="image/*,.pdf" />
                <button onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Attach image/PDF">
                  <Icons.Paperclip size={18} strokeWidth={2.5} />
                </button>
                <button onClick={() => setShowFilePicker(!showFilePicker)}
                  className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${showFilePicker ? 'text-ide-accent' : 'text-gray-500 hover:text-white'}`}
                  title="Reference workspace file">
                  <Icons.FolderOpen size={18} strokeWidth={2.5} />
                </button>
                <button onClick={handleEnhance} disabled={isEnhancing || !input.trim()}
                  className="p-2 text-purple-400 hover:text-purple-300 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors" title="Enhance prompt with AI">
                  {isEnhancing
                    ? <Icons.RefreshCw size={18} strokeWidth={2.5} className="animate-spin" />
                    : <Icons.Wand2 size={18} strokeWidth={2.5} />
                  }
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-600 font-mono">{input.length > 0 ? `${input.length}` : ''}</span>
                <button onClick={handleSend} disabled={isStreaming || (!input.trim() && attachments.length === 0)}
                  className="bg-ide-accent hover:bg-blue-600 disabled:opacity-30 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-xl transition-all active:scale-95 flex items-center">
                  {isStreaming
                    ? <Icons.Square size={14} strokeWidth={2.5} fill="currentColor" />
                    : <><Icons.Send size={14} strokeWidth={2.5} className="mr-1.5" />Send</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] text-gray-700 uppercase tracking-widest">Enter to send • Shift+Enter for newline • @filename to reference</span>
        </div>
      </div>
    </div>
  );
};
