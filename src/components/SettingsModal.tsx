import { useState, useEffect } from 'react';

export interface Settings {
  apiKey: string;
  model: string;
  voiceName: string;
  thinkingMode: boolean;
  autoConnect: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: localStorage.getItem('GEMINI_API_KEY') || '',
  model: localStorage.getItem('GEMINI_MODEL') || 'models/gemini-2.0-flash-exp',
  voiceName: localStorage.getItem('GEMINI_VOICE') || 'Charon',
  thinkingMode: localStorage.getItem('GEMINI_THINKING') === 'true',
  autoConnect: localStorage.getItem('GEMINI_AUTOCONNECT') === 'true',
};

export function SettingsModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
}) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (isOpen) {
      setSettings({
        apiKey: localStorage.getItem('GEMINI_API_KEY') || '',
        model: localStorage.getItem('GEMINI_MODEL') || 'models/gemini-2.0-flash-exp',
        voiceName: localStorage.getItem('GEMINI_VOICE') || 'Charon',
        thinkingMode: localStorage.getItem('GEMINI_THINKING') === 'true',
        autoConnect: localStorage.getItem('GEMINI_AUTOCONNECT') === 'true',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('GEMINI_API_KEY', settings.apiKey);
    localStorage.setItem('GEMINI_MODEL', settings.model);
    localStorage.setItem('GEMINI_VOICE', settings.voiceName);
    localStorage.setItem('GEMINI_THINKING', String(settings.thinkingMode));
    localStorage.setItem('GEMINI_AUTOCONNECT', String(settings.autoConnect));

    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-xl p-6 flex flex-col gap-5 border shadow-2xl"
        style={{ background: '#0a0d14', borderColor: '#1e293b', color: '#e2e8f0', fontFamily: 'monospace' }}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: '#c8f000' }}>
              GEMINI API CONFIGURATION
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            ✕
          </button>
        </div>

        {/* API Key */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 tracking-wider uppercase">GEMINI API KEY (ENV / PRIVATE)</label>
          <input
            type="password"
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 transition"
            placeholder="AIzaSy..."
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          />
          <span className="text-[10px] text-slate-500">Stored privately in local user storage.</span>
        </div>

        {/* Model Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 tracking-wider uppercase">SELECT MODEL</label>
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 transition"
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          >
            <option value="models/gemini-2.0-flash-exp">Gemini 2.0 Flash (Real-time Multimodal Live)</option>
            <option value="models/gemini-2.0-flash-thinking-exp">Gemini 2.0 Flash Thinking (Deep Reasoning)</option>
            <option value="models/gemini-1.5-pro">Gemini 1.5 Pro (High-Quality Context)</option>
          </select>
        </div>

        {/* Voice Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 tracking-wider uppercase">VOICE MODEL</label>
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 transition"
            value={settings.voiceName}
            onChange={(e) => setSettings({ ...settings, voiceName: e.target.value })}
          >
            <option value="Charon">Charon (Deep / Cybernetic)</option>
            <option value="Puck">Puck (Energetic)</option>
            <option value="Kore">Kore (Smooth)</option>
            <option value="Fenrir">Fenrir (Authoritative)</option>
            <option value="Aoede">Aoede (Warm)</option>
          </select>
        </div>

        {/* Thinking Mode Toggle */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <div className="flex flex-col">
            <span className="text-xs text-slate-300 font-bold uppercase">THINKING MODE</span>
            <span className="text-[10px] text-slate-500">Enable chain-of-thought reasoning before speech response.</span>
          </div>
          <input
            type="checkbox"
            className="w-4 h-4 accent-emerald-500 cursor-pointer"
            checked={settings.thinkingMode}
            onChange={(e) => setSettings({ ...settings, thinkingMode: e.target.checked })}
          />
        </div>

        {/* Auto Connect Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-300 font-bold uppercase">AUTO CONNECT ON STARTUP</span>
            <span className="text-[10px] text-slate-500">Start Gemini Live session automatically when opened.</span>
          </div>
          <input
            type="checkbox"
            className="w-4 h-4 accent-emerald-500 cursor-pointer"
            checked={settings.autoConnect}
            onChange={(e) => setSettings({ ...settings, autoConnect: e.target.checked })}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded border border-slate-700 text-slate-400 hover:text-white transition"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 text-xs font-bold rounded"
            style={{ background: '#c8f000', color: '#080a0e' }}
          >
            SAVE CONFIGURATION
          </button>
        </div>
      </div>
    </div>
  );
}
