import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel } from '../types';
import { Icons } from './Icon';

interface LogStatusProps {
  logs: LogEntry[];
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
  onClear: () => void;
}

export const LogStatus: React.FC<LogStatusProps> = ({ logs, isExpanded, onToggle, onClear }) => {
  const [autoHide, setAutoHide] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    if (isExpanded && autoHide && logs.length > 0) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        onToggle(false);
      }, 8000); 
    }

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [logs, isExpanded, autoHide]);

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error': return <Icons.AlertCircle size={12} />;
      case 'warning': return <Icons.AlertCircle size={12} />;
      case 'success': return <Icons.Check size={12} />;
      default: return <Icons.Info size={12} />;
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const copyIndividualLog = (log: LogEntry) => {
    navigator.clipboard.writeText(log.message);
  };

  return (
    <div className={`absolute bottom-0 left-0 right-0 bg-ide-panel border-t border-ide-border z-30 transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'h-56 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]' : 'h-0'}`}>
      <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <Icons.Terminal size={14} className="mr-2 text-ide-accent" />
            System Runtime Log
          </div>
          <button 
            onClick={() => setAutoHide(!autoHide)}
            className={`text-[9px] px-2 py-0.5 rounded border transition-colors font-bold ${autoHide ? 'bg-ide-accent/10 border-ide-accent/30 text-ide-accent' : 'border-ide-border text-gray-500'}`}
          >
            Auto-hide: {autoHide ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="flex items-center space-x-3">
          {logs.length > 0 && (
            <button 
              onClick={handleCopyLogs} 
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-white transition-colors"
              title="Copy all logs"
            >
              <Icons.Copy size={13} />
              Copy All
            </button>
          )}
          <button onClick={onClear} className="p-1.5 text-gray-500 hover:text-white transition-colors" title="Wipe History"><Icons.Trash2 size={13} /></button>
          <button onClick={() => onToggle(false)} className="p-1.5 text-gray-500 hover:text-white transition-colors"><Icons.X size={13} /></button>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1.5 bg-black/30 no-scrollbar selection:bg-ide-accent/20">
        {logs.length === 0 ? (
          <div className="text-gray-600 italic p-2 flex items-center gap-3">
            <Icons.RefreshCw size={12} className="opacity-30" />
            Awaiting system events...
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex items-start space-x-3 py-1 px-2 rounded-lg hover:bg-white/5 transition-colors group">
              <span className="text-gray-600 shrink-0 select-none opacity-60">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={`${getLevelColor(log.level)} shrink-0 mt-0.5`}>{getLevelIcon(log.level)}</span>
              <span className="text-gray-300 break-all leading-relaxed flex-1">{log.message}</span>
              <button 
                onClick={() => copyIndividualLog(log)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-ide-accent transition-all"
                title="Copy line"
              >
                <Icons.Copy size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
