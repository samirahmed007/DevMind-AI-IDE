import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icon';

interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  timestamp: number;
  isError?: boolean;
}

interface TerminalProps {
  isExpanded: boolean;
  onToggle: (v: boolean) => void;
  onClear: () => void;
  externalCommands?: { command: string; description: string }[];
}

export const TerminalPanel: React.FC<TerminalProps> = ({ isExpanded, onToggle, onClear, externalCommands }) => {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // Simulate common commands for the virtual terminal
  const simulateCommand = (cmd: string): string => {
    const trimmed = cmd.trim();
    if (!trimmed) return '';
    if (trimmed === 'clear' || trimmed === 'cls') {
      setEntries([]);
      return '';
    }
    if (trimmed === 'help') {
      return `DevMind Virtual Terminal
Available hints (this is a browser-based IDE — commands are simulated):
  help          Show this help
  clear         Clear terminal
  ls / dir      List workspace files
  pwd           Show current directory
  node -v       Show Node version hint
  npm -v        Show npm version hint
  git status    Show git status hint
Note: Copy terminal commands suggested by AI and run them in your real terminal.`;
    }
    if (trimmed === 'ls' || trimmed === 'dir') {
      return 'workspace/\n  (Use the file explorer to browse files)';
    }
    if (trimmed === 'pwd') {
      return '/workspace';
    }
    if (trimmed.startsWith('echo ')) {
      return trimmed.slice(5).replace(/^["']|["']$/g, '');
    }
    if (trimmed === 'node -v' || trimmed === 'node --version') {
      return 'v20.x.x (estimated — run in your real terminal)';
    }
    if (trimmed === 'npm -v' || trimmed === 'npm --version') {
      return '10.x.x (estimated — run in your real terminal)';
    }
    if (trimmed === 'git status') {
      return 'On branch main\nThis is a browser-based IDE. Use your real terminal for git operations.';
    }
    if (trimmed.startsWith('npm ') || trimmed.startsWith('npx ') || trimmed.startsWith('yarn ') || trimmed.startsWith('pnpm ')) {
      return `⚠ This is a browser-based IDE.\nCopy this command and run it in your local terminal:\n  $ ${trimmed}`;
    }
    return `Command not found: ${trimmed.split(' ')[0]}\nThis is a simulated terminal. Copy AI-suggested commands to your real terminal.`;
  };

  const handleRun = (cmdOverride?: string) => {
    const cmd = cmdOverride ?? input.trim();
    if (!cmd) return;

    const output = simulateCommand(cmd);
    if (cmd !== 'clear' && cmd !== 'cls') {
      const entry: TerminalEntry = {
        id: Date.now().toString(),
        command: cmd,
        output,
        timestamp: Date.now(),
      };
      setEntries(prev => [...prev, entry]);
    }

    if (!cmdOverride) {
      setHistory(prev => [cmd, ...prev.slice(0, 49)]);
      setHistIdx(-1);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleRun(); }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      setInput(history[next] || '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? '' : history[next]);
    }
  };

  return (
    <div className={`border-t border-ide-border bg-ide-sidebar/80 backdrop-blur-sm transition-all duration-300 shrink-0 ${isExpanded ? 'h-[220px]' : 'h-[30px]'}`}>
      <div
        className="h-[30px] flex items-center justify-between px-4 cursor-pointer hover:bg-black/10"
        onClick={() => onToggle(!isExpanded)}
      >
        <div className="flex items-center space-x-3 text-[11px] font-black uppercase tracking-widest text-gray-400">
          <Icons.Terminal size={14} strokeWidth={2.5} className="text-green-400" />
          <span>Terminal</span>
          {entries.length > 0 && (
            <span className="bg-ide-activity px-1.5 py-0.5 rounded text-[9px] text-gray-500">{entries.length}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isExpanded && (
            <button onClick={(e) => { e.stopPropagation(); setEntries([]); }}
              className="text-[10px] text-gray-600 hover:text-gray-400 font-bold uppercase px-2 py-1 rounded hover:bg-white/5 transition-all">
              Clear
            </button>
          )}
          {isExpanded ? <Icons.ChevronDown size={14} strokeWidth={2.5} /> : <Icons.ChevronUp size={14} strokeWidth={2.5} />}
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col h-[190px] px-2 pb-2">
          <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-xs space-y-2 pb-1">
            {entries.length === 0 && (
              <div className="text-gray-600 text-[11px] pt-2 pl-2 italic">
                Virtual terminal — AI suggested commands appear here. Type 'help' for info.
              </div>
            )}
            {entries.map(entry => (
              <div key={entry.id} className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500 shrink-0">$</span>
                  <span className="text-white">{entry.command}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(entry.command)}
                    className="opacity-0 hover:opacity-100 ml-auto text-gray-600 hover:text-gray-400 transition-opacity"
                    title="Copy command"
                  >
                    <Icons.Copy size={10} />
                  </button>
                </div>
                {entry.output && (
                  <pre className="text-gray-400 pl-4 whitespace-pre-wrap leading-tight text-[10px]">{entry.output}</pre>
                )}
              </div>
            ))}
            <div ref={endRef} />
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
            <button onClick={() => handleRun()}
              className="text-gray-600 hover:text-green-400 transition-colors p-1">
              <Icons.Play size={12} fill="currentColor" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
