import React from 'react';
import { AgentAction, FileEdit, FileCreate, TerminalCommand } from '../types';
import { Icons } from './Icon';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  actions: AgentAction[];
  mode: 'single' | 'all';
  onConfirm: () => void;
  onCancel: () => void;
}

const ActionPreview: React.FC<{ action: AgentAction }> = ({ action }) => {
  if (action.type === 'edit') {
    const d = action.data as FileEdit;
    return (
      <div className="space-y-2">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          📝 Edit: <span className="text-ide-accent">{d.filePath}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-hidden">
          <div>
            <div className="text-[9px] text-red-400 font-black uppercase mb-1">Remove</div>
            <pre className="text-[9px] bg-red-900/20 border border-red-800/30 rounded p-2 overflow-auto max-h-32 text-red-300 leading-relaxed">{d.search}</pre>
          </div>
          <div>
            <div className="text-[9px] text-green-400 font-black uppercase mb-1">Add</div>
            <pre className="text-[9px] bg-green-900/20 border border-green-800/30 rounded p-2 overflow-auto max-h-32 text-green-300 leading-relaxed">{d.replace}</pre>
          </div>
        </div>
      </div>
    );
  }
  if (action.type === 'create') {
    const d = action.data as FileCreate;
    return (
      <div className="space-y-2">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          ✨ Create: <span className="text-green-400">{d.path}</span>
        </div>
        <pre className="text-[9px] bg-black/30 border border-white/5 rounded p-2 overflow-auto max-h-32 text-gray-300 leading-relaxed">{d.content.slice(0, 300)}{d.content.length > 300 ? '\n...(truncated)' : ''}</pre>
      </div>
    );
  }
  if (action.type === 'terminal') {
    const d = action.data as TerminalCommand;
    return (
      <div className="space-y-2">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          💻 Terminal Command
        </div>
        <div className="bg-black/60 border border-yellow-800/30 rounded p-3">
          <code className="text-yellow-300 text-xs font-mono">{d.command}</code>
        </div>
        <p className="text-[10px] text-gray-400">{d.description}</p>
      </div>
    );
  }
  return null;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, description, actions, mode, onConfirm, onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="bg-ide-panel border border-ide-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="flex items-center space-x-4 px-6 py-4 border-b border-ide-border bg-ide-sidebar/50 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Icons.AlertTriangle size={22} className="text-yellow-400" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">{title}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
          </div>
          <button onClick={onCancel} className="ml-auto p-2 hover:bg-white/10 rounded-lg transition-all">
            <Icons.X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {actions.map((action, i) => (
            <div key={action.id || i} className="p-4 bg-ide-activity/50 border border-ide-border rounded-xl">
              <ActionPreview action={action} />
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-ide-border flex justify-end space-x-3 bg-ide-sidebar/30 shrink-0">
          <button onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-ide-accent hover:bg-blue-600 text-white transition-all flex items-center shadow-xl active:scale-95">
            <Icons.Check size={16} strokeWidth={2.5} className="mr-2" />
            {mode === 'all' ? `Apply All ${actions.length} Changes` : 'Apply Change'}
          </button>
        </div>
      </div>
    </div>
  );
};
