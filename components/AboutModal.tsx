import React, { useState } from 'react';
import { Icons } from './Icon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    icon: Icons.Globe,
    label: '12 AI Providers Built-in',
    sub: 'Gemini · GPT · Claude · Grok · Groq · Mistral · GLM · OpenRouter + more',
  },
  {
    icon: Icons.HardDrive,
    label: 'Offline & Ollama Cloud',
    sub: 'Local Ollama · Cloud models (:cloud suffix) · LM Studio · Jan.ai',
  },
  {
    icon: Icons.Plus,
    label: 'Unlimited Custom Providers',
    sub: '8 templates: Azure, Bedrock, Cloudflare, vLLM, LiteLLM + more',
  },
  {
    icon: Icons.Brain,
    label: 'Intelligent Coding Agent',
    sub: 'Full workspace context · diff previews · file creation · terminal commands',
  },
  {
    icon: Icons.CheckCheck,
    label: 'Confirm Before Apply',
    sub: 'Every change shown as a red/green diff — apply individually or all at once',
  },
  {
    icon: Icons.FolderOpen,
    label: 'Full File System Support',
    sub: 'Recursive folder upload · OS drag-and-drop · internal drag-to-move',
  },
  {
    icon: Icons.Code,
    label: 'Monaco Editor',
    sub: 'VS Code engine · syntax highlighting for 50+ languages · multi-tab',
  },
  {
    icon: Icons.Download,
    label: 'Settings Import / Export',
    sub: 'Export all config to JSON · import with schema validation · safe key redaction',
  },
];

const STEPS = [
  { n: '1', text: 'Open Settings (gear icon) → Online AI or Offline AI' },
  { n: '2', text: 'Add your API key — click “Get API Key” for a direct link to each provider' },
  { n: '3', text: 'Select a provider and model in the header dropdowns' },
  { n: '4', text: 'Upload files or type in the editor, then ask the agent anything' },
  { n: '5', text: 'Review proposed changes as diffs, then click Apply' },
  { n: '6', text: 'Export your settings anytime via Settings → Export Settings (footer)' },
];

type Tab = 'features' | 'start';

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<Tab>('features');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-ide-panel border border-ide-border w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 space-y-5">

          {/* Logo + title */}
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-ide-accent/15 rounded-2xl flex items-center justify-center text-ide-accent shadow-xl border border-ide-accent/20 shrink-0">
              <Icons.Code size={32} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white tracking-wider uppercase">DevMind AI IDE</h2>
              <p className="text-[11px] text-ide-accent font-black uppercase tracking-[0.3em] mt-0.5">v8.0 · Professional Edition</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                Browser-based IDE with multi-provider AI — write, edit, and manage code with an agent that proposes every change before applying it.
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-500 hover:text-white shrink-0">
              <Icons.X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-ide-activity/40 rounded-xl border border-ide-border">
            <button
              onClick={() => setTab('features')}
              className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                tab === 'features' ? 'bg-ide-accent text-white shadow-lg' : 'text-gray-500 hover:text-white'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setTab('start')}
              className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                tab === 'start' ? 'bg-ide-accent text-white shadow-lg' : 'text-gray-500 hover:text-white'
              }`}
            >
              Get Started
            </button>
          </div>

          {/* Features tab */}
          {tab === 'features' && (
            <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto no-scrollbar">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-xl bg-ide-activity/30 border border-white/5">
                  <f.icon size={15} strokeWidth={2.5} className="text-ide-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white">{f.label}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Get Started tab */}
          {tab === 'start' && (
            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              <p className="text-[11px] text-gray-400 leading-relaxed pb-1">
                DevMind works entirely in your browser — no backend required. Follow these steps to make your first AI-assisted edit:
              </p>
              {STEPS.map(s => (
                <div key={s.n} className="flex items-start gap-3 p-3 rounded-xl bg-ide-activity/30 border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-ide-accent/20 border border-ide-accent/30 text-ide-accent text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {s.n}
                  </span>
                  <p className="text-[12px] text-gray-300 leading-relaxed">{s.text}</p>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-green-900/10 border border-green-800/20 mt-1">
                <p className="text-[10px] text-green-300 font-bold flex items-center gap-2">
                  <Icons.HardDrive size={12} strokeWidth={2.5} />
                  For 100% private AI: install Ollama, run{' '}
                  <code className="bg-black/30 px-1 rounded font-mono">OLLAMA_ORIGINS="*" ollama serve</code>,
                  then use Settings → Offline AI → ⚡ Detect.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-ide-border">
            <div>
              <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">Developed by</p>
              <p className="text-sm font-black text-white">Samir Uddin Ahmed</p>
            </div>
            <button
              onClick={onClose}
              className="bg-ide-accent hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
            >
              Start Coding
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};