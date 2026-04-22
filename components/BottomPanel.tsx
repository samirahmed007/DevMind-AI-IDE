import React, { useState, useRef, useEffect } from 'react';
import { LogEntry, LogLevel } from '../types';
import { Icons } from './Icon';

interface BottomPanelProps {
  logs: LogEntry[];
  isExpanded: boolean;
  onToggle: (v: boolean) => void;
  activeTab: 'terminal' | 'logs';
  onTabChange: (tab: 'terminal' | 'logs') => void;
  onClearLogs: () => void;
  onTerminalCommand?: (cmd: string) => void;
}

interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  timestamp: number;
}

const simulateCommand = (cmd: string, setEntries: React.Dispatch<React.SetStateAction<TerminalEntry[]>>): string => {
  const t = cmd.trim();
  if (!t) return '';
  if (t === 'clear' || t === 'cls') { setEntries([]); return ''; }
  if (t === 'help') return `DevMind Virtual Terminal\n  help, clear, ls, pwd, echo <text>\n  npm/npx/yarn commands are simulated — copy to your real terminal.`;
  if (t === 'ls' || t === 'dir') return 'workspace/\n  (Use the file explorer to browse files)';
  if (t === 'pwd') return '/workspace';
  if (t.startsWith('echo ')) return t.slice(5).replace(/^["']|["']$/g, '');
  if (t === 'node -v' || t === 'node --version') return 'v20.x.x (run in your real terminal)';
  if (t === 'npm -v' || t === 'npm --version') return '10.x.x (run in your real terminal)';
  if (t === 'git status') return 'On branch main\nUse your real terminal for git operations.';
  if (/^(npm|npx|yarn|pnpm) /.test(t)) return `⚠ Browser-based IDE — copy and run in your local terminal:\n  $ ${t}`;
  return `Command not found: ${t.split(' ')[0]}\nThis is a simulated terminal.`;
};

const getLevelColor = (level: LogLevel) => {
  switch (level) {
    case 'error': return 'text-red-400';
    case 'warning': return 'text-yellow-400';
    case 'success': return 'text-green-400';
    default: return 'text-blue-400';
  }
};

export const BottomPanel: React.FC<BottomPanelProps> = ({
  logs, isExpanded, onToggle, activeTab, onTabChange, onClearLogs, onTerminalCommand,
}) => {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const termEndRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'terminal') termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, activeTab]);

  const handleRun = (cmdOverride?: string) => {
    const cmd = (cmdOverride ?? input).trim();
    if (!cmd) return;
    const output = simulateCommand(cmd, setEntries);
    if (cmd !== 'clear' && cmd !== 'cls') {
      setEntries(prev => [...prev, { id: Date.now().toString(), command: cmd, output, timestamp: Date.now() }]);
    }
    if (!cmdOverride) {
      setHistory(prev => [cmd, ...prev.slice(0, 49)]);
      setHistIdx(-1);
      setInput('');
    }
    onTerminalCommand?.(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleRun(); }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next); setInput(history[next] || '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next); setInput(next === -1 ? '' : history[next]);
    }
  };

  const [autoHide, setAutoHide] = useState(true);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide logs panel after 8s of inactivity when enabled
  useEffect(() => {
    if (activeTab !== 'logs' || !isExpanded || !autoHide) return;
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    autoHideTimerRef.current = setTimeout(() => onToggle(false), 8000);
    return () => { if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current); };
  }, [logs, activeTab, isExpanded, autoHide]);

  const errorCount = logs.filter(l => l.level === 'error').length;

  return (
    <div className={`border-t border-ide-border bg-ide-sidebar/80 backdrop-blur-sm transition-all duration-300 shrink-0 ${isExpanded ? 'h-[240px]' : 'h-[30px]'}`}>
      {/* Tab bar */}
      <div className="h-[30px] flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center h-full">
          {/* Toggle chevron */}
          <button
            onClick={() => onToggle(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-white transition-colors mr-1"
          >
            {isExpanded ? <Icons.ChevronDown size={13} strokeWidth={2.5} /> : <Icons.ChevronUp size={13} strokeWidth={2.5} />}
          </button>

          {/* Terminal tab */}
          <button
            onClick={() => { onTabChange('terminal'); if (!isExpanded) onToggle(true); }}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${
              activeTab === 'terminal' && isExpanded
                ? 'border-ide-accent text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icons.Terminal size={13} strokeWidth={2.5} className="text-green-400" />
            Terminal
            {entries.length > 0 && (
              <span className="bg-ide-activity px-1 py-0.5 rounded text-[9px] text-gray-500">{entries.length}</span>
            )}
          </button>

          {/* Logs tab */}
          <button
            onClick={() => { onTabChange('logs'); if (!isExpanded) onToggle(true); }}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${
              activeTab === 'logs' && isExpanded
                ? 'border-ide-accent text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icons.Info size={13} strokeWidth={2.5} className="text-blue-400" />
            Runtime Log
            {errorCount > 0 && (
              <span className="bg-red-900/40 border border-red-800/40 px-1 py-0.5 rounded text-[9px] text-red-400 font-black">{errorCount}</span>
            )}
            {logs.length > 0 && errorCount === 0 && (
              <span className="bg-ide-activity px-1 py-0.5 rounded text-[9px] text-gray-500">{logs.length}</span>
            )}
          </button>
        </div>

        {/* Actions */}
        {isExpanded && (
          <div className="flex items-center gap-1">
            {activeTab === 'terminal' && (
              <button onClick={() => setEntries([])} className="text-[10px] text-gray-600 hover:text-gray-400 font-bold uppercase px-2 py-1 rounded hover:bg-white/5 transition-all">
                Clear
              </button>
            )}
            {activeTab === 'logs' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAutoHide(v => !v)}
                  className={`text-[9px] px-2 py-0.5 rounded border transition-colors font-black uppercase ${
                    autoHide ? 'bg-ide-accent/10 border-ide-accent/30 text-ide-accent' : 'border-ide-border text-gray-500 hover:text-white'
                  }`}
                  title="Toggle auto-hide"
                >
                  Auto-hide: {autoHide ? 'ON' : 'OFF'}
                </button>
                {logs.length > 0 && (
                  <>
                    <button
                      onClick={() => {
                        const text = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
                        navigator.clipboard.writeText(text);
                      }}
                      className="text-[10px] text-gray-600 hover:text-gray-400 font-bold uppercase px-2 py-1 rounded hover:bg-white/5 transition-all flex items-center gap-1"
                    >
                      <Icons.Copy size={11} />Copy
                    </button>
                    <button onClick={onClearLogs} className="p-1.5 text-gray-600 hover:text-white transition-colors">
                      <Icons.Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="flex flex-col h-[210px]">
          {/* Terminal */}
          {activeTab === 'terminal' && (
            <div className="flex flex-col flex-1 px-2 pb-2 overflow-hidden">
              <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-xs space-y-1.5 pb-1">
                {entries.length === 0 && (
                  <div className="text-gray-600 text-[11px] pt-2 pl-2 italic">
                    Virtual terminal — type 'help' for info. Copy AI commands to your real terminal.
                  </div>
                )}
                {entries.map(entry => (
                  <div key={entry.id} className="space-y-0.5">
                    <div className="flex items-center space-x-2 group">
                      <span className="text-green-500 shrink-0">$</span>
                      <span className="text-white">{entry.command}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(entry.command)}
                        className="opacity-0 group-hover:opacity-100 ml-auto text-gray-600 hover:text-gray-400 transition-opacity"
                        title="Copy"
                      >
                        <Icons.Copy size={10} />
                      </button>
                    </div>
                    {entry.output && (
                      <pre className="text-gray-400 pl-4 whitespace-pre-wrap leading-tight text-[10px]">{entry.output}</pre>
                    )}
                  </div>
                ))}
                <div ref={termEndRef} />
              </div>
              <div className="flex items-center space-x-2 border-t border-white/5 pt-1.5">
                <span className="text-green-500 font-mono text-xs shrink-0">$</span>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent text-white text-xs font-mono outline-none placeholder-gray-700"
                />
                <button onClick={() => handleRun()} className="text-gray-600 hover:text-green-400 transition-colors p-1">
                  <Icons.Play size={12} fill="currentColor" />
                </button>
              </div>
            </div>
          )}

          {/* Logs */}
          {activeTab === 'logs' && (
            <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-black/20 no-scrollbar">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic p-2 flex items-center gap-2">
                  <Icons.RefreshCw size={11} className="opacity-30" />
                  Awaiting system events...
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 py-0.5 px-2 rounded hover:bg-white/5 group transition-colors">
                    <span className="text-gray-600 shrink-0 opacity-60 text-[10px]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`${getLevelColor(log.level)} shrink-0 mt-0.5 text-[10px] font-black uppercase`}>{log.level}</span>
                    <span className="text-gray-300 break-all leading-relaxed flex-1">{log.message}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(log.message)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-ide-accent transition-all shrink-0"
                    >
                      <Icons.Copy size={11} />
                    </button>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
