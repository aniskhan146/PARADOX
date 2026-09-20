import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type LogLevel = "INFO" | "WARN" | "ERROR" | "API" | "CMD" | "SYS";
type LogTab   = "ALL" | "API" | "SYSTEM" | "ERROR";
type Speaker  = "User" | "Assistant";
type VoiceMode = "idle" | "user" | "assistant";

interface LogEntry { id: number; time: string; level: LogLevel; msg: string; }
interface ChatEntry { id: number; speaker: Speaker; text: string; }

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_LOGS: LogEntry[] = [
  { id:  1, time: "09:41:02", level: "SYS",   msg: "PARADOX kernel booted" },
  { id:  2, time: "09:41:03", level: "SYS",   msg: "Voice engine initialised — Whisper v3" },
  { id:  3, time: "09:41:04", level: "API",   msg: "POST /v1/audio/transcriptions 200 OK (112 ms)" },
  { id:  4, time: "09:41:05", level: "INFO",  msg: "Task scheduler loaded — 4 workers" },
  { id:  5, time: "09:41:09", level: "WARN",  msg: "RAM usage at 74% — consider closing background apps" },
  { id:  6, time: "09:41:12", level: "API",   msg: "POST /v1/chat/completions 200 OK (430 ms)" },
  { id:  7, time: "09:41:18", level: "SYS",   msg: "Visualiser WebGL context ready" },
  { id:  8, time: "09:41:22", level: "CMD",   msg: "> run diagnostics --verbose" },
  { id:  9, time: "09:41:23", level: "INFO",  msg: "Diagnostics passed — 0 errors detected" },
  { id: 10, time: "09:41:30", level: "ERROR", msg: "Socket timeout on channel 3 — retrying…" },
  { id: 11, time: "09:41:31", level: "SYS",   msg: "Re-establishing socket connection" },
  { id: 12, time: "09:41:32", level: "INFO",  msg: "Connection restored on channel 3" },
  { id: 13, time: "09:41:40", level: "API",   msg: "POST /v1/audio/speech 200 OK (88 ms)" },
];

const SEED_CHAT: ChatEntry[] = [
  { id: 1, speaker: "Assistant", text: "PARADOX online. All systems nominal — how can I help?" },
  { id: 2, speaker: "User",      text: "Run diagnostics." },
  { id: 3, speaker: "Assistant", text: "Diagnostics complete. CPU 42 %, RAM 74 %, GPU 18 %. Zero errors detected." },
  { id: 4, speaker: "User",      text: "List active tasks." },
  { id: 5, speaker: "Assistant", text: "Active: render_loop · data_sync · log_writer. Idle: monitor_cpu." },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString("en-US", { hour12: false });

const LOG_TAB_FILTER: Record<LogTab, (l: LogEntry) => boolean> = {
  ALL:    () => true,
  API:    l  => l.level === "API",
  SYSTEM: l  => l.level === "SYS" || l.level === "CMD" || l.level === "INFO" || l.level === "WARN",
  ERROR:  l  => l.level === "ERROR",
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO:  "#6ee7b7",
  WARN:  "#fbbf24",
  ERROR: "#f87171",
  API:   "#60a5fa",
  CMD:   "#a78bfa",
  SYS:   "#94a3b8",
};

// ── Animated metric bar ───────────────────────────────────────────────────────
function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs" style={{ fontFamily: "monospace" }}>
        <span style={{ color: "#9ca3af" }}>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "#1e293b" }}>
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
    if (muted) { callVisual(av => av.setSpeaking(false)); return; }
    callVisual(av => av.setSpeaking(mode !== "idle"));
  }, [mode, muted, callVisual]);

  // Pulse on assistant response
  useEffect(() => {
    if (mode === "assistant" && !muted) {
      const interval = setInterval(() => callVisual(av => av.pulse(0.7 + Math.random() * 0.3)), 1200);
      return () => clearInterval(interval);
    }
  }, [mode, muted, callVisual]);

  return (
    <iframe
      ref={iframeRef}
      src="/visualizer.html"
      className="w-full h-full border-0"
      style={{ minHeight: 300 }}
      onLoad={() => callVisual(av => av.setSpeaking(mode !== "idle" && !muted))}
    />
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  // system state
  const [live, setLive]       = useState(false);
  const [muted, setMuted]     = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle");

  // metrics — simulated real-time
  const [cpu, setCpu]   = useState(42);
  const [ram, setRam]   = useState(74);
  const [gpu, setGpu]   = useState(18);
  const [disk, setDisk] = useState(55);
  const [net, setNet]   = useState(12);

  // logs
  const [logs, setLogs]       = useState<LogEntry[]>(SEED_LOGS);
  const [logTab, setLogTab]   = useState<LogTab>("ALL");
  const logEndRef             = useRef<HTMLDivElement>(null);

  // chat
  const [chat, setChat] = useState<ChatEntry[]>(SEED_CHAT);
  const [cmd, setCmd]   = useState("");
  const chatEndRef      = useRef<HTMLDivElement>(null);

  const nowStr  = new Date().toLocaleTimeString("en-US", { hour12: false });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── Real-time metric simulation ──
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const jitter = (base: number, range: number) =>
        Math.min(99, Math.max(5, base + (Math.random() - 0.5) * range));
      setCpu(v  => Math.round(jitter(v, 14)));
      setRam(v  => Math.round(jitter(v, 6)));
      setGpu(v  => Math.round(jitter(v, 20)));
      setDisk(v => Math.round(jitter(v, 4)));
      setNet(v  => Math.round(jitter(v, 18)));
    }, 1000);
    return () => clearInterval(id);
  }, [live]);

  // ── Voice mode cycling (demo) ──
  useEffect(() => {
    if (!live) { setVoiceMode("idle"); return; }
    // alternate user → assistant → idle for demo
    const sequence: VoiceMode[] = ["user", "assistant", "idle", "idle"];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % sequence.length;
      setVoiceMode(sequence[i]);
    }, 3500);
    return () => clearInterval(id);
  }, [live]);

  // ── Auto-scroll ──
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // ── Send command ──
  function sendCmd() {
    if (!cmd.trim()) return;
    const text = cmd.trim();
    setCmd("");
    const t = ts();
    setChat(c => [...c, { id: Date.now(), speaker: "User", text }]);
    setLogs(l => [...l, { id: Date.now(), time: t, level: "CMD", msg: `> ${text}` }]);
    setTimeout(() => {
      const reply = `Executing: "${text}" — acknowledged.`;
      setChat(c => [...c, { id: Date.now() + 1, speaker: "Assistant", text: reply }]);
      setLogs(l => [...l, { id: Date.now() + 2, time: ts(), level: "INFO", msg: reply }]);
    }, 700);
  }

  const filteredLogs = logs.filter(LOG_TAB_FILTER[logTab]);
  const LOG_TABS: LogTab[] = ["ALL", "API", "SYSTEM", "ERROR"];

  const metricColor = (v: number) => v > 85 ? "#f87171" : v > 65 ? "#fbbf24" : "#22c55e";

  // ── Voice badge ──
  const voiceBadge =
    muted ? { label: "MUTED", color: "#6b7280" } :
    voiceMode === "user" ? { label: "YOU", color: "#a78bfa" } :
    voiceMode === "assistant" ? { label: "ASSISTANT", color: "#22c55e" } :
    { label: "IDLE", color: "#475569" };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0d0f14", color: "#e2e8f0", fontFamily: "monospace" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: "#080a0e", borderBottom: "1px solid #1e293b" }}>

        <div className="paradox-logo text-xl px-2 py-1" style={{ fontSize: "1.25rem" }}>
          PARADOX
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* voice mode indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded"
            style={{ background: "#0f172a", border: `1px solid ${voiceBadge.color}33` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: voiceBadge.color,
              boxShadow: voiceMode !== "idle" && !muted ? `0 0 5px ${voiceBadge.color}` : "none" }} />
            <span style={{ color: voiceBadge.color }}>{voiceBadge.label}</span>
          </div>

          <button
            onClick={() => setLive(v => !v)}
            className={`px-5 py-1.5 text-xs font-bold rounded tracking-widest cursor-pointer ${live ? "btn-stop" : "btn-start"}`}
            style={{ letterSpacing: "0.15em" }}>
            {live ? "■ STOP" : "▶ START"}
          </button>

          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-widest" style={{ color: "#94a3b8" }}>LIVE</span>
            <span className="w-2.5 h-2.5 rounded-full" style={{
              background: live ? "#22c55e" : "#334155",
              boxShadow: live ? "0 0 7px #22c55e" : "none" }} />
          </div>
        </div>

        <div className="text-right text-xs" style={{ color: "#475569", lineHeight: 1.7 }}>
          <div style={{ color: "#94a3b8" }}>{nowStr}</div>
          <div>{dateStr}</div>
        </div>
      </header>

      {/* ── Main 3-column grid ─────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT: Task Manager ─────────────────────────────────── */}
        <aside className="flex flex-col shrink-0 p-4 gap-4"
          style={{ width: 210, background: "#080a0e", borderRight: "1px solid #1e293b", overflowY: "auto" }}>

          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: "#475569", letterSpacing: "0.2em" }}>
              Task Manager
            </h2>
            <div className="flex flex-col gap-3">
              <MetricBar label="CPU"  value={cpu}  color={metricColor(cpu)} />
              <MetricBar label="RAM"  value={ram}  color={metricColor(ram)} />
              <MetricBar label="GPU"  value={gpu}  color={metricColor(gpu)} />
              <MetricBar label="DISK" value={disk} color={metricColor(disk)} />
              <MetricBar label="NET"  value={net}  color="#60a5fa" />
            </div>
          </div>

          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12 }}>
            <h2 className="text-xs font-bold tracking-widest uppercase mb-2"
              style={{ color: "#475569", letterSpacing: "0.2em" }}>
              Processes
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { name: "voice_engine", st: "running", cpu: 8  },
                { name: "llm_inference", st: "running", cpu: 21 },
                { name: "render_loop",  st: "running", cpu: 6  },
                { name: "data_sync",    st: "running", cpu: 4  },
                { name: "monitor_cpu",  st: "idle",    cpu: 0  },
                { name: "log_writer",   st: "running", cpu: 3  },
              ].map(p => (
                <div key={p.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: p.st === "running" ? "#22c55e" : "#334155",
                        boxShadow: p.st === "running" ? "0 0 4px #22c55e" : "none" }} />
                    <span className="text-xs truncate" style={{ color: "#94a3b8" }}>{p.name}</span>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: p.cpu > 0 ? "#c8f000" : "#334155" }}>
                    {p.cpu > 0 ? `${p.cpu}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CENTER: Visualizer ──────────────────────────────────── */}
        <main className="flex flex-col flex-1 min-w-0" style={{ background: "#000", position: "relative" }}>

          {/* mute button overlay — bottom-center */}
          <div className="absolute bottom-4 left-1/2 z-10" style={{ transform: "translateX(-50%)" }}>
            <button
              onClick={() => setMuted(v => !v)}
              title={muted ? "Unmute microphone" : "Mute microphone"}
              style={{
                width: 48, height: 48,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: muted ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                boxShadow: muted
                  ? "0 0 0 1.5px #ef4444, 0 0 12px rgba(239,68,68,0.25)"
                  : "0 0 0 1.5px #22c55e, 0 0 18px rgba(34,197,94,0.35)",
                color: muted ? "#ef4444" : "#22c55e",
                backdropFilter: "blur(8px)",
                transition: "all 0.3s ease",
              }}>
              {muted
                ? /* mic-off */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
                    <path d="M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2"/>
                    <path d="M19 12v0a7 7 0 0 1-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                : /* mic-on */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
              }
            </button>
          </div>

          <Visualizer mode={voiceMode} muted={muted} />
        </main>

        {/* ── RIGHT: Chat History ─────────────────────────────────── */}
        <aside className="flex flex-col shrink-0"
          style={{ width: 270, background: "#080a0e", borderLeft: "1px solid #1e293b" }}>

          <div className="px-3 py-2 text-xs font-bold tracking-widest uppercase shrink-0"
            style={{ color: "#475569", borderBottom: "1px solid #1e293b", letterSpacing: "0.18em" }}>
            Chat History
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3" style={{ minHeight: 0 }}>
            {chat.map(m => (
              <div key={m.id} className={`flex flex-col gap-0.5 ${m.speaker === "User" ? "items-end" : "items-start"}`}>
                <span className="text-xs" style={{ color: "#334155" }}>{m.speaker}</span>
                <div className="text-xs px-2.5 py-2 rounded-lg"
                  style={{
                    background: m.speaker === "User" ? "#1e1b3a" : "#0f1a0f",
                    color:      m.speaker === "User" ? "#c4b5fd" : "#86efac",
                    border:     `1px solid ${m.speaker === "User" ? "#3730a3" : "#166534"}`,
                    maxWidth: "90%", wordBreak: "break-word", lineHeight: 1.6,
                  }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </aside>
      </div>

      {/* ── LOGS section ───────────────────────────────────────────── */}
      <section style={{ height: 220, background: "#060810", borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>

        {/* tab bar */}
        <div className="flex items-center shrink-0" style={{ borderBottom: "1px solid #1e293b" }}>
          <span className="px-4 py-1.5 text-xs font-black tracking-widest"
            style={{ color: "#e2e8f0", letterSpacing: "0.25em", borderRight: "1px solid #1e293b" }}>
            LOGS
          </span>
          {LOG_TABS.map(tab => (
            <button key={tab}
              onClick={() => setLogTab(tab)}
              className="px-3 py-1.5 text-xs font-bold tracking-wider transition-colors"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: logTab === tab ? "#c8f000" : "#475569",
                borderBottom: logTab === tab ? "2px solid #c8f000" : "2px solid transparent",
                letterSpacing: "0.12em",
              }}>
              {tab}
              {tab === "ERROR" && logs.filter(l => l.level === "ERROR").length > 0 && (
                <span className="ml-1.5 px-1 rounded text-xs"
                  style={{ background: "#7f1d1d", color: "#fca5a5", fontSize: 10 }}>
                  {logs.filter(l => l.level === "ERROR").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* log entries */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-0.5" style={{ minHeight: 0 }}>
          {filteredLogs.length === 0
            ? <span className="text-xs" style={{ color: "#334155" }}>No entries.</span>
            : filteredLogs.map(l => (
              <div key={l.id} className="flex gap-3 text-xs items-start" style={{ fontFamily: "monospace", lineHeight: 1.6 }}>
                <span className="shrink-0" style={{ color: "#334155" }}>{l.time}</span>
                <span className="shrink-0 w-12 text-center rounded px-1"
                  style={{ background: `${LEVEL_COLOR[l.level]}18`, color: LEVEL_COLOR[l.level], fontSize: 10 }}>
                  {l.level}
                </span>
                <span style={{ color: "#94a3b8", wordBreak: "break-word" }}>{l.msg}</span>
              </div>
            ))
          }
          <div ref={logEndRef} />
        </div>
      </section>

      {/* ── Command bar ────────────────────────────────────────────── */}
      <footer className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ background: "#080a0e", borderTop: "1px solid #1e293b" }}>
        <span style={{ color: "#a78bfa", fontSize: 14 }}>{"›"}</span>
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "#e2e8f0", caretColor: "#c8f000", fontFamily: "monospace" }}
          placeholder="Enter command or message…"
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendCmd()}
        />
        <button onClick={sendCmd}
          className="px-4 py-1 text-sm font-bold rounded"
          style={{ background: "#c8f000", color: "#080a0e", border: "none", cursor: "pointer", fontFamily: "monospace" }}>
          SEND
        </button>
      </footer>
    </div>
  );
}
