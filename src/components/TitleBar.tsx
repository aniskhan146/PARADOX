import { useState, useEffect } from 'react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onWindowStateChange(setIsMaximized);
    }
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 select-none shrink-0"
      style={{
        background: '#05070a',
        borderBottom: '1px solid #1e293b',
        WebkitAppRegion: 'drag',
      } as any}
    >
      <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        <span style={{ color: '#c8f000', letterSpacing: '0.15em' }}>PARADOX AI</span>
        <span className="text-[10px] text-slate-600 font-mono">v2.0-native</span>
      </div>

      {/* Window action buttons (no drag region) */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleMinimize}
          className="w-7 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="Minimize to Tray"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
            <rect width="12" height="2" rx="1" />
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className="w-7 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2.5 1H8.5V7H2.5Z" />
              <path d="M1 3H2.5V8.5H8" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="1" width="8" height="8" rx="1" />
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          className="w-7 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600/80 rounded transition"
          title="Minimize to Tray on Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1L9 9M9 1L1 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
