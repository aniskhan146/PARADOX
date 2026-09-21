import { useState, useRef, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { SettingsModal, Settings } from './components/SettingsModal';
import { geminiLiveService } from './services/geminiLive';
import { audioEngine } from './services/audioEngine';

// ── Types ────────────────────────────────────────────────────────────────────
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'API' | 'CMD' | 'SYS';
type LogTab = 'ALL' | 'API' | 'SYSTEM' | 'ERROR';
type Speaker = 'User' | 'Assistant';
type VoiceMode = 'idle' | 'user' | 'assistant';

interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  msg: string;
}
interface ChatEntry {
  id: number;
  speaker: Speaker;
  text: string;
}

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_LOGS: LogEntry[] = [
  { id: 1, time: '09:41:02', level: 'SYS', msg: 'PARADOX kernel booted — Native v2.0' },
  { id: 2, time: '09:41:03', level: 'SYS', msg: 'Gemini Live WebSocket Engine ready' },
  { id: 3, time: '09:41:04', level: 'API', msg: 'Web Audio API initialized — 16kHz PCM input / 24kHz output' },
];

const SEED_CHAT: ChatEntry[] = [
  { id: 1, speaker: 'Assistant', text: 'PARADOX online. How can I assist you today?' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });

const LOG_TAB_FILTER: Record<LogTab, (l: LogEntry) => boolean> = {
  ALL: () => true,
  API: (l) => l.level === 'API',
  SYSTEM: (l) => l.level === 'SYS' || l.level === 'CMD' || l.level === 'INFO' || l.level === 'WARN',
  ERROR: (l) => l.level === 'ERROR',
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: '#6ee7b7',
  WARN: '#fbbf24',
  ERROR: '#f87171',
  API: '#60a5fa',
  CMD: '#a78bfa',
  SYS: '#94a3b8',
};

// ── Metric bar ───────────────────────────────────────────────────────
function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs" style={{ fontFamily: 'monospace' }}>
        <span style={{ color: '#9ca3af' }}>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: '#1e293b' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
    </div>
  );
}

// ── Visualizer iframe ─────────────────────────────────────────────────────────
function Visualizer({ mode, muted }: { mode: VoiceMode; muted: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const callVisual = useCallback((fn: (av: any) => void) => {
    const win = iframeRef.current?.contentWindow as any;
    if (win?.AgentVisual) fn(win.AgentVisual);
  }, []);

  useEffect(() => {
    if (muted) {
      callVisual((av) => av.setSpeaking(false));
      return;
    }
    callVisual((av) => av.setSpeaking(mode !== 'idle'));
  }, [mode, muted, callVisual]);

  // Pulse visualizer on audio levels
  useEffect(() => {
    if (mode === 'assistant' && !muted) {
      const interval = setInterval(() => callVisual((av) => av.pulse(0.7 + Math.random() * 0.3)), 800);
      return () => clearInterval(interval);
    }
  }, [mode, muted, callVisual]);

  return (
    <iframe
      ref={iframeRef}
      src="/visualizer.html"
      className="w-full h-full border-0"
      style={{ minHeight: 300 }}
      onLoad={() => callVisual((av) => av.setSpeaking(mode !== 'idle' && !muted))}
    />
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  // system state
  const [live, setLive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('idle');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // metrics — real-time simulation
  const [cpu, setCpu] = useState(38);
  const [ram, setRam] = useState(65);
  const [gpu, setGpu] = useState(12);
  const [disk, setDisk] = useState(52);
  const [net, setNet] = useState(8);

  // logs & chat with persistent local storage
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('PARADOX_LOGS');
    return saved ? JSON.parse(saved) : SEED_LOGS;
  });
  const [logTab, setLogTab] = useState<LogTab>('ALL');
  const logEndRef = useRef<HTMLDivElement>(null);

  const [chat, setChat] = useState<ChatEntry[]>(() => {
    const saved = localStorage.getItem('PARADOX_CHAT');
    return saved ? JSON.parse(saved) : SEED_CHAT;
  });
  const [cmd, setCmd] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Persistence
  useEffect(() => {
    localStorage.setItem('PARADOX_LOGS', JSON.stringify(logs.slice(-100)));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('PARADOX_CHAT', JSON.stringify(chat.slice(-50)));
  }, [chat]);

  // ── Real-time metric simulation ──
  useEffect(() => {
    const id = setInterval(() => {
      const jitter = (base: number, range: number) =>
        Math.min(99, Math.max(5, base + (Math.random() - 0.5) * range));
      setCpu((v) => Math.round(jitter(v, 12)));
      setRam((v) => Math.round(jitter(v, 4)));
      setGpu((v) => Math.round(jitter(v, 16)));
      setDisk((v) => Math.round(jitter(v, 2)));
      setNet((v) => Math.round(jitter(v, 10)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // Audio engine audio level hooks
  useEffect(() => {
    audioEngine.setOnMicLevel((level) => {
      if (level > 0.03 && !muted) {
        setVoiceMode('user');
      } else if (voiceMode === 'user') {
        setVoiceMode('idle');
      }
    });

    audioEngine.setOnSpeakerLevel((level) => {
      if (level > 0.02) {
        setVoiceMode('assistant');
      }
    });
  }, [muted, voiceMode]);

  // ── Gemini Live Controller ──
  const startGeminiLive = async () => {
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      setLogs((l) => [...l, { id: Date.now(), time: ts(), level: 'ERROR', msg: 'API Key missing! Please set your Gemini API Key in Settings.' }]);
      setIsSettingsOpen(true);
      return;
    }

    try {
      setLogs((l) => [...l, { id: Date.now(), time: ts(), level: 'SYS', msg: 'Connecting to Gemini Live WebSocket...' }]);

      let assistantResponseBuffer = '';

      await geminiLiveService.connect(
        {
          apiKey,
          model: localStorage.getItem('GEMINI_MODEL') || 'models/gemini-2.0-flash-exp',
          voiceName: localStorage.getItem('GEMINI_VOICE') || 'Charon',
        },
        {
          onOpen: () => {
            setLive(true);
            setLogs((l) => [...l, { id: Date.now(), time: ts(), level: 'SYS', msg: 'Gemini Live Session Established [ONLINE]' }]);
          },
          onAudioData: (base64Pcm) => {
            audioEngine.playChunk(base64Pcm);
          },
          onTextDelta: (text) => {
            assistantResponseBuffer += text;
          },
          onTurnComplete: () => {
            if (assistantResponseBuffer.trim()) {
              const text = assistantResponseBuffer.trim();
              setChat((c) => [...c, { id: Date.now(), speaker: 'Assistant', text }]);
              assistantResponseBuffer = '';
            }
            setVoiceMode('idle');
          },
          onToolCall: (functionCalls) => {
            const responses = functionCalls.map((fc) => {
              setLogs((l) => [...l, { id: Date.now(), time: ts(), level: 'CMD', msg: `Executing Tool Function: ${fc.name}` }]);

              let responseData: any = { status: 'success' };
              if (fc.name === 'runDiagnostics') {
                responseData = { cpu: `${cpu}%`, ram: `${ram}%`, gpu: `${gpu}%`, status: '0 errors' };
              } else if (fc.name === 'toggleMute') {
                setMuted(Boolean(fc.args.mute));
                responseData = { muted: fc.args.mute };
              } else if (fc.name === 'clearChatHistory') {
                setChat([]);
                setLogs([]);
                responseData = { cleared: true };
              }

              return { id: fc.id, name: fc.name, response: responseData };
            });

            geminiLiveService.sendToolResponse(responses);
          },
          onError: (err) => {
            setLogs((l) => [...l, { id: Date.now(), time: ts(), level: 'ERROR', msg: `Gemini Live Error: ${err.message || err}` }]);
          },
          onClose: () => {
            setLive(false);
            setVoiceMode('idle');
            setLogs((l) => [...l, { id: Date.now(), time: ts(), level: 'SYS', msg: 'Gemini Live Session Disconnected [OFFLINE]' }]);
          },
        }
      );

      // Start Microphone stream
      await audioEngine.startMicrophone((base64Pcm) => {
        if (!muted && geminiLiveService.active) {
          geminiLiveService.sendAudioChunk(base64Pcm);
        }
      });
    } catch (e: any) {
      setLogs((l) => [...l, { id: Date.now(), time: ts(), level: 'ERROR', msg: `Connection failed: ${e.message}` }]);
    }
  };

  const stopGeminiLive = () => {
    audioEngine.stopMicrophone();
    geminiLiveService.disconnect();
    setLive(false);
    setVoiceMode('idle');
  };

  const toggleLive = () => {
    if (live) stopGeminiLive();
    else startGeminiLive();
  };

  // ── Send text command ──
  function sendCmd() {
    if (!cmd.trim()) return;
    const text = cmd.trim();
    setCmd('');
    const t = ts();

    setChat((c) => [...c, { id: Date.now(), speaker: 'User', text }]);
    setLogs((l) => [...l, { id: Date.now(), time: t, level: 'CMD', msg: `> ${text}` }]);

    if (geminiLiveService.active) {
      geminiLiveService.sendText(text);
    } else {
      setTimeout(() => {
        const reply = `Executed local command: "${text}". Connect Gemini Live for full voice reasoning.`;
        setChat((c) => [...c, { id: Date.now() + 1, speaker: 'Assistant', text: reply }]);
        setLogs((l) => [...l, { id: Date.now() + 2, time: ts(), level: 'INFO', msg: reply }]);
      }, 500);
    }
  }

  const filteredLogs = logs.filter(LOG_TAB_FILTER[logTab]);
  const LOG_TABS: LogTab[] = ['ALL', 'API', 'SYSTEM', 'ERROR'];
  const metricColor = (v: number) => (v > 85 ? '#f87171' : v > 65 ? '#fbbf24' : '#22c55e');

  const voiceBadge = muted
    ? { label: 'MUTED', color: '#6b7280' }
    : voiceMode === 'user'
      ? { label: 'YOU (LISTENING)', color: '#a78bfa' }
      : voiceMode === 'assistant'
        ? { label: 'PARADOX (SPEAKING)', color: '#22c55e' }
        : { label: 'STANDBY', color: '#475569' };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0d0f14', color: '#e2e8f0', fontFamily: 'monospace' }}>
      {/* Titlebar for Windows desktop window controls */}
      <TitleBar />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(s: Settings) => {
          setLogs((l) => [...l, { id: Date.now(), time: ts(), level: 'SYS', msg: 'Configuration saved. Restart connection to apply.' }]);
          if (s.autoConnect && !live) startGeminiLive();
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: '#080a0e', borderBottom: '1px solid #1e293b' }}>
        <div className="text-xl px-2 py-1 tracking-widest font-bold" style={{ fontSize: '1.25rem', color: '#c8f000' }}>
          PARADOX
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: '#0f172a', border: `1px solid ${voiceBadge.color}33` }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: voiceBadge.color,
                boxShadow: voiceMode !== 'idle' && !muted ? `0 0 5px ${voiceBadge.color}` : 'none',
              }}
            />
            <span style={{ color: voiceBadge.color }}>{voiceBadge.label}</span>
          </div>

          <button
            onClick={toggleLive}
            className={`px-5 py-1.5 text-xs font-bold rounded tracking-widest cursor-pointer transition ${live ? 'btn-stop bg-red-600/80 hover:bg-red-600' : 'btn-start bg-emerald-600/80 hover:bg-emerald-600'}`}
            style={{ letterSpacing: '0.15em', color: '#fff' }}
          >
            {live ? '■ DISCONNECT' : '▶ CONNECT LIVE'}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 text-xs font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Settings"
          >
            ⚙ CONFIG
          </button>
        </div>

        <div className="text-right text-xs" style={{ color: '#475569', lineHeight: 1.7 }}>
          <div style={{ color: '#94a3b8' }}>{nowStr}</div>
          <div>{dateStr}</div>
        </div>
      </header>

      {/* Main 3-column grid */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT: Task Manager */}
        <aside className="flex flex-col shrink-0 p-4 gap-4" style={{ width: 220, background: '#080a0e', borderRight: '1px solid #1e293b', overflowY: 'auto' }}>
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#475569', letterSpacing: '0.2em' }}>
              System Metrics
            </h2>
            <div className="flex flex-col gap-3">
              <MetricBar label="CPU" value={cpu} color={metricColor(cpu)} />
              <MetricBar label="RAM" value={ram} color={metricColor(ram)} />
              <MetricBar label="GPU" value={gpu} color={metricColor(gpu)} />
              <MetricBar label="DISK" value={disk} color={metricColor(disk)} />
              <MetricBar label="NET" value={net} color="#60a5fa" />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}>
            <h2 className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#475569', letterSpacing: '0.2em' }}>
              Processes
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { name: 'gemini_live_ws', st: live ? 'running' : 'idle', cpu: live ? 14 : 0 },
                { name: 'web_audio_pcm', st: live ? 'running' : 'idle', cpu: live ? 8 : 0 },
                { name: 'neural_sphere', st: 'running', cpu: 6 },
                { name: 'task_scheduler', st: 'running', cpu: 2 },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: p.st === 'running' ? '#22c55e' : '#334155',
                        boxShadow: p.st === 'running' ? '0 0 4px #22c55e' : 'none',
                      }}
                    />
                    <span className="text-xs truncate" style={{ color: '#94a3b8' }}>
                      {p.name}
                    </span>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: p.cpu > 0 ? '#c8f000' : '#334155' }}>
                    {p.cpu > 0 ? `${p.cpu}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER: Visualizer */}
        <main className="flex flex-col flex-1 min-w-0" style={{ background: '#000', position: 'relative' }}>
          {/* Mute button overlay */}
          <div className="absolute bottom-4 left-1/2 z-10" style={{ transform: 'translateX(-50%)' }}>
            <button
              onClick={() => setMuted((v) => !v)}
              title={muted ? 'Unmute microphone' : 'Mute microphone'}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: muted ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                boxShadow: muted
                  ? '0 0 0 1.5px #ef4444, 0 0 12px rgba(239,68,68,0.25)'
                  : '0 0 0 1.5px #22c55e, 0 0 18px rgba(34,197,94,0.35)',
                color: muted ? '#ef4444' : '#22c55e',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.3s ease',
              }}
            >
              {muted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                  <path d="M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2" />
                  <path d="M19 12v0a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          </div>

          <Visualizer mode={voiceMode} muted={muted} />
        </main>

        {/* RIGHT: Chat History */}
        <aside className="flex flex-col shrink-0" style={{ width: 280, background: '#080a0e', borderLeft: '1px solid #1e293b' }}>
          <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1e293b' }}>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#475569', letterSpacing: '0.18em' }}>
              Transcripts
            </span>
            <button
              onClick={() => {
                setChat([]);
                localStorage.removeItem('PARADOX_CHAT');
              }}
              className="text-[10px] text-slate-500 hover:text-red-400 transition"
            >
              CLEAR
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3" style={{ minHeight: 0 }}>
            {chat.map((m) => (
              <div key={m.id} className={`flex flex-col gap-0.5 ${m.speaker === 'User' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs" style={{ color: '#334155' }}>
                  {m.speaker}
                </span>
                <div
                  className="text-xs px-2.5 py-2 rounded-lg"
                  style={{
                    background: m.speaker === 'User' ? '#1e1b3a' : '#0f1a0f',
                    color: m.speaker === 'User' ? '#c4b5fd' : '#86efac',
                    border: `1px solid ${m.speaker === 'User' ? '#3730a3' : '#166534'}`,
                    maxWidth: '90%',
                    wordBreak: 'break-word',
                    lineHeight: 1.6,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </aside>
      </div>

      {/* LOGS section */}
      <section style={{ height: 180, background: '#060810', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center shrink-0" style={{ borderBottom: '1px solid #1e293b' }}>
          <span className="px-4 py-1.5 text-xs font-black tracking-widest" style={{ color: '#e2e8f0', letterSpacing: '0.25em', borderRight: '1px solid #1e293b' }}>
            LOGS
          </span>
          {LOG_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setLogTab(tab)}
              className="px-3 py-1.5 text-xs font-bold tracking-wider transition-colors"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: logTab === tab ? '#c8f000' : '#475569',
                borderBottom: logTab === tab ? '2px solid #c8f000' : '2px solid transparent',
                letterSpacing: '0.12em',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-0.5" style={{ minHeight: 0 }}>
          {filteredLogs.map((l) => (
            <div key={l.id} className="flex gap-3 text-xs items-start" style={{ fontFamily: 'monospace', lineHeight: 1.6 }}>
              <span className="shrink-0" style={{ color: '#334155' }}>
                {l.time}
              </span>
              <span className="shrink-0 w-12 text-center rounded px-1" style={{ background: `${LEVEL_COLOR[l.level]}18`, color: LEVEL_COLOR[l.level], fontSize: 10 }}>
                {l.level}
              </span>
              <span style={{ color: '#94a3b8', wordBreak: 'break-word' }}>{l.msg}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </section>

      {/* Command input footer */}
      <footer className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ background: '#080a0e', borderTop: '1px solid #1e293b' }}>
        <span style={{ color: '#a78bfa', fontSize: 14 }}>{'›'}</span>
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: '#e2e8f0', caretColor: '#c8f000', fontFamily: 'monospace' }}
          placeholder="Enter command or voice prompt..."
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendCmd()}
        />
        <button onClick={sendCmd} className="px-4 py-1 text-sm font-bold rounded" style={{ background: '#c8f000', color: '#080a0e', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
          SEND
        </button>
      </footer>
    </div>
  );
}
