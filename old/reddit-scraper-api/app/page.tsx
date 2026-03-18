"use client";

import { useState, useEffect, useRef } from "react";
import {
  Copy, Download, Link as LinkIcon, Loader2, Sparkles, CheckCircle2,
  Image as ImageIcon, Sparkles as SparklesIcon, FileText, Home as HomeIcon,
  Wrench, Clock, Terminal, Trash2, Code2, BookOpen, TerminalSquare, Play,
  Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

type ThreadResult = {
  id: string;
  title: string;
  text_content: string;
  media: string[];
  timestamp: number;
  dev_raw?: { proxy_url: string; headers: any; raw_json: any; };
};

const meshVariants1 = {
  idle: { scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -40, 0], opacity: [0.08, 0.12, 0.08], transition: { repeat: Infinity, duration: 25, ease: "linear" } },
  loading: { scale: [1, 1.4, 1], x: [0, 20, 0], opacity: [0.15, 0.25, 0.15], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } }
};

const meshVariants2 = {
  idle: { scale: [1, 1.1, 1], x: [0, -60, 0], y: [0, 30, 0], opacity: [0.05, 0.1, 0.05], transition: { repeat: Infinity, duration: 30, ease: "linear" } },
  loading: { scale: [1, 1.5, 1], x: [0, -20, 0], opacity: [0.1, 0.3, 0.1], transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.2 } }
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ThreadResult[]>([]);
  const [error, setError] = useState("");
  const [quota, setQuota] = useState<{ requestCount: number; requestLimit: number } | null>(null);

  // Layout & Advanced States
  const [activeView, setActiveView] = useState("home");
  const [devMode, setDevMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.touchAction = "none";
      document.documentElement.style.position = "fixed";
      document.documentElement.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.touchAction = "";
      document.documentElement.style.position = "";
      document.documentElement.style.width = "";
    }
    return () => { 
      document.body.style.overflow = ""; 
      document.documentElement.style.overflow = ""; 
    };
  }, [mobileMenuOpen]);

  // Tools & Docs State
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [anonInput, setAnonInput] = useState("");
  const [anonOutput, setAnonOutput] = useState("");
  const [apiTestResponse, setApiTestResponse] = useState<string>("");
  const [apiTesting, setApiTesting] = useState(false);
  const [codeTab, setCodeTab] = useState("curl");
  const [xRayMode, setXRayMode] = useState(false);
  const [retainUsernames, setRetainUsernames] = useState(false);

  const [baseUrl, setBaseUrl] = useState("https://reddit-scraper.com");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const codeSnippets = {
    curl: `curl -X POST ${baseUrl}/api/v1/scrape \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://reddit.com/r/ProgrammerHumor/comments/..."}'`,
    node: `const response = await fetch("${baseUrl}/api/v1/scrape", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ url: "https://reddit.com/..." })\n});\n\nconst data = await response.json();\nconsole.log(data);`,
    python: `import requests\n\nurl = "${baseUrl}/api/v1/scrape"\npayload = {"url": "https://reddit.com/..."}\nheaders = {"Content-Type": "application/json"}\n\nresponse = requests.post(url, json=payload, headers=headers)\nprint(response.json())`
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const handleNavClick = (view: string) => { setActiveView(view); setActiveHistoryId(null); closeMobileMenu(); };

  const clearSession = () => {
    setResults([]); setLogs([]); setActiveHistoryId(null);
    setAnonInput(""); setAnonOutput(""); setBulkUrls("");
    setError(""); setUrl(""); setApiTestResponse("");
    closeMobileMenu();
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString([], { hour12: false })}] ${msg}`]);
  };

  useEffect(() => {
    if (devMode && logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs, devMode]);

  const fetchQuota = async () => {
    try {
      const res = await fetch(`/api/quota?t=${Date.now()}`);
      if (res.ok) setQuota(await res.json());
    } catch { }
  };

  useEffect(() => { fetchQuota(); }, []);

  const coreFetchThreadUrl = async (targetUrl: string): Promise<ThreadResult> => {
    addLog(`PROXY REQ: Linking ScraperAPI tunnel for -> [ ${targetUrl.substring(0, 30)}... ]`);
    if (xRayMode) addLog(`X-RAY ENABLED: Preparing concurrent database sweep mapping architectures for Pullpush...`);

    const res = await fetch("/api/reddit", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: targetUrl, retainUsernames }),
    });
    const data = await res.json();
    if (!res.ok) {
      addLog(`ERROR: Connection failed: ${data.error}`);
      throw new Error(data.error || "Failed to fetch thread");
    }
    addLog(`PROXY RES: 200 OK. Resolving structure...`);
    if (data.dev_raw) {
      addLog(`PROXY TUNNEL MAP URL: ${data.dev_raw.proxy_url}`);
      addLog(`PROXY HEADERS: ${JSON.stringify(data.dev_raw.headers).substring(0, 70)}...`);
      addLog(`RAW EXTRACT (UNFORMATTED JSON): ${JSON.stringify(data.dev_raw.raw_json).length} bytes buffered`);
    }
    return { id: Math.random().toString(36).substring(2, 9), ...data, timestamp: Date.now() };
  };

  const fetchThread = async () => {
    if (!url) return;
    setLoading(true); setError(""); setActiveHistoryId(null);
    try {
      const thread = await coreFetchThreadUrl(url);
      setResults((prev) => [thread, ...prev]);
      setUrl(""); fetchQuota();
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const executeBulkScrape = async () => {
    const lines = bulkUrls.split("\n").map(l => l.trim()).filter(l => l);
    if (!lines.length) return;
    setBulkLoading(true); setError(""); setActiveView("home"); setActiveHistoryId(null);
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      try {
        const thread = await coreFetchThreadUrl(lines[i]);
        setResults((prev) => [thread, ...prev]); fetchQuota();
        await new Promise(res => setTimeout(res, 2000));
      } catch (err: any) { addLog(`BULK FAIL skipping index ${i}: ${err.message}`); }
    }
    setBulkLoading(false);
  };

  const executeUserAnonymization = () => {
    let mappedMap = new Map();
    const redactedText = anonInput.replace(/u\/([a-zA-Z0-9_-]+)/gi, (match, username) => {
      if (!mappedMap.has(username)) mappedMap.set(username, `Person ${mappedMap.size + 1}`);
      return mappedMap.get(username);
    });
    setAnonOutput(redactedText);
    addLog(`USER ANON: Masked ${mappedMap.size} unique user handles locally.`);
  };

  const testPublicAPI = async () => {
    setApiTesting(true);
    setApiTestResponse('// Testing POST /api/v1/scrape...\n// Waiting for proxy response...');
    try {
      const targetUrl = url || "https://www.reddit.com/r/IAmA/comments/z1c9z/i_am_barack_obama_president_of_the_united_states/";
      addLog(`PUBLIC API REQ: Testing /api/v1/scrape with ${targetUrl}`);
      const t0 = performance.now();
      const res = await fetch("/api/reddit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: targetUrl, retainUsernames }),
      });
      const data = await res.json();
      addLog(`PUBLIC API RES: HTTP ${res.status} returned in ${(performance.now() - t0).toFixed(0)}ms`);
      setApiTestResponse(JSON.stringify(data, null, 2));
      fetchQuota();
    } catch (err: any) {
      setApiTestResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally { setApiTesting(false); }
  };

  return (
    <div className="flex flex-1 w-full h-[100dvh] bg-[#000000] text-zinc-300 overflow-hidden font-sans selection:bg-[#FF4500]/30 selection:text-white">

      {/* Resend "Dark Liquid" Outer Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div variants={meshVariants1} animate={loading || bulkLoading || apiTesting ? "loading" : "idle"} className="absolute top-[0%] left-[-10%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-[#FF4500] rounded-full blur-[140px] md:blur-[180px]" style={{ willChange: "transform, opacity, scale" }} />
        <motion.div variants={meshVariants2} animate={loading || bulkLoading || apiTesting ? "loading" : "idle"} className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-zinc-600 rounded-full blur-[140px] md:blur-[180px]" style={{ willChange: "transform, opacity, scale" }} />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden" onClick={closeMobileMenu} />
        )}
      </AnimatePresence>

      {/* Resend-Style Sidebar Nav */}
      <nav className={`fixed md:relative inset-y-0 left-0 bg-[#000000] md:bg-[#000000]/40 backdrop-blur-2xl border-r border-[#1f1f1f] shadow-2xl z-[60] flex flex-col w-64 transform transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button className="md:hidden absolute top-5 right-5 text-zinc-500 hover:text-white" onClick={closeMobileMenu}><X className="w-5 h-5" /></button>

        <div className="pt-8 px-6 pb-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-7 h-7 rounded border border-[#333] shadow-[0_0_15px_rgba(255,69,0,0.4)] flex items-center justify-center bg-gradient-to-br from-[#FF4500] to-orange-600">
              <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold tracking-tight text-zinc-100 text-lg">Reddit Scraper</span>
          </div>

          <AnimatePresence mode="wait">
            {quota && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="w-full space-y-2.5 overflow-hidden pb-4 mb-2 border-b border-[#1f1f1f]">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Proxy Quota</span>
                  <span className="text-[11px] font-mono font-medium text-zinc-400">{quota.requestCount.toLocaleString()} / {quota.requestLimit.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-[#111111] rounded-full overflow-hidden border border-[#222]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (quota.requestCount / Math.max(1, quota.requestLimit)) * 100)}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-gradient-to-r from-orange-500 to-[#FF4500]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 px-4 space-y-1.5 overflow-y-auto hide-scrollbar">
          <button onClick={() => handleNavClick("home")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === "home" && !activeHistoryId ? "bg-[#111] text-white" : "text-zinc-500 hover:text-zinc-200"}`}><HomeIcon className="w-4 h-4" /> Playground</button>
          <button onClick={() => handleNavClick("api")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === "api" ? "bg-[#111] text-white" : "text-zinc-500 hover:text-zinc-200"}`}><BookOpen className="w-4 h-4" /> API Documentation</button>
          <button onClick={() => handleNavClick("tools")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === "tools" ? "bg-[#111] text-white" : "text-zinc-500 hover:text-zinc-200"}`}><Wrench className="w-4 h-4" /> Utilities</button>

          <div className="pt-6 pb-2 px-3 uppercase text-[10px] font-semibold text-zinc-600 tracking-wider">Session Local History</div>
          {results.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-zinc-600 italic">No logs attached.</div>
          ) : (
            <div className="space-y-[2px]">
              {results.map((r) => (
                <button key={r.id} onClick={() => { setActiveView("home"); setActiveHistoryId(r.id); closeMobileMenu(); }} className={`w-full text-left truncate px-3 py-2 text-[13px] rounded-lg transition-all ${activeHistoryId === r.id ? "bg-[#FF4500]/10 text-[#FF4500]" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"}`}>
                  {r.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-[#000000] border-t border-[#1f1f1f]">
          <button onClick={() => { setDevMode(!devMode); closeMobileMenu(); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all mb-2 ${devMode ? "bg-zinc-800 text-white" : "hover:bg-[#111] text-zinc-500"}`}><span className="flex items-center gap-2"><Terminal className={`w-3.5 h-3.5 ${devMode ? "text-emerald-400" : ""}`} /> Terminal</span><div className={`w-7 h-4 rounded-full relative transition-colors ${devMode ? "bg-emerald-500" : "bg-zinc-800"}`}><motion.div animate={{ x: devMode ? 14 : 2 }} className="w-2.5 h-2.5 bg-white rounded-full absolute top-[3px] shadow" /></div></button>
          <button onClick={clearSession} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-rose-500/80 hover:bg-rose-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Wipe Memory</button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-20 h-full overflow-hidden">

        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[#1f1f1f] bg-[#000000]/60 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF4500]" />
            <span className="font-semibold tracking-tight text-white mb-0.5">Reddit.Scraper</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-6 h-6 text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar scroll-smooth p-4 sm:p-8 lg:p-12 pb-32 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-10 md:space-y-12">

            {activeView === "home" && !activeHistoryId && (
              <>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-4 md:pt-10">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-2">Reddit<span className="text-[#FF4500]">.Scraper</span></h1>
                  <p className="text-zinc-400 text-sm md:text-base max-w-lg">Zero-trace Reddit thread unpacking entirely obfuscated inside an API-first residential proxy layer. Under Development.</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-1">Execute Request</label>
                  <div className="group relative flex flex-col sm:flex-row sm:items-center bg-[#050505] border border-[#1f1f1f] rounded-xl px-2 sm:px-5 py-2 sm:py-1 focus-within:border-[#FF4500]/60 focus-within:ring-1 focus-within:ring-[#FF4500]/60 transition-all shadow-md gap-3">
                    <div className="flex flex-1 items-center px-3 sm:px-0">
                      <span className="text-[#FF4500] font-mono font-bold mr-3 text-lg">{'>_'}</span>
                      <Input type="url" placeholder="https://reddit.com/r/..." value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchThread()} className="flex-1 h-12 sm:h-14 bg-transparent !border-none !ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none outline-none text-zinc-200 font-mono text-sm placeholder:text-zinc-600 px-0" />
                    </div>
                    <motion.button onClick={fetchThread} disabled={loading || !url} whileTap={{ scale: (loading || !url) ? 1 : 0.95 }} className="w-full sm:w-auto h-12 sm:h-10 px-6 rounded-lg bg-[#FF4500] hover:bg-orange-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-[0_0_15px_rgba(255,69,0,0.3)] hover:shadow-[0_0_20px_rgba(255,69,0,0.5)] flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Target"}
                    </motion.button>
                  </div>
                  {error && <div className="text-rose-500 font-mono text-xs mt-3 px-2 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" />{error}</div>}

                  {/* Feature Toggles */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setXRayMode(!xRayMode)} className="flex items-center justify-between sm:justify-start gap-4 self-stretch sm:self-auto px-5 py-2.5 rounded-full border border-[#1f1f1f] shadow-lg bg-[#0a0a0a] transition-all hover:bg-[#111] group">
                      <div className={`w-10 h-5 rounded-full relative transition-colors shadow-inner flex items-center px-[2px] shrink-0 ${xRayMode ? "bg-[#FF4500]" : "bg-[#222]"}`}>
                        <motion.div animate={{ x: xRayMode ? 20 : 0 }} className={`w-4 h-4 bg-white rounded-full shadow-md ${xRayMode ? "shadow-[0_0_10px_rgba(255,255,255,0.8)]" : ""}`} />
                      </div>
                      <span className={`text-[13px] font-semibold tracking-widest uppercase transition-colors ${xRayMode ? "text-[#FF4500]" : "text-zinc-500 group-hover:text-zinc-400"}`}>X-Ray Mode <span className="text-zinc-600 font-normal ml-1 normal-case tracking-normal">(Recover Deleted)</span></span>
                    </button>

                    <button onClick={() => setRetainUsernames(!retainUsernames)} className="flex items-center justify-between sm:justify-start gap-4 self-stretch sm:self-auto px-5 py-2.5 rounded-full border border-[#1f1f1f] shadow-lg bg-[#0a0a0a] transition-all hover:bg-[#111] group">
                      <div className={`w-10 h-5 rounded-full relative transition-colors shadow-inner flex items-center px-[2px] shrink-0 ${retainUsernames ? "bg-[#FF4500]" : "bg-[#222]"}`}>
                        <motion.div animate={{ x: retainUsernames ? 20 : 0 }} className={`w-4 h-4 bg-white rounded-full shadow-md ${retainUsernames ? "shadow-[0_0_10px_rgba(255,255,255,0.8)]" : ""}`} />
                      </div>
                      <span className={`text-[13px] font-semibold tracking-widest uppercase transition-colors ${retainUsernames ? "text-[#FF4500]" : "text-zinc-500 group-hover:text-zinc-400"}`}>Native Users <span className="text-zinc-600 font-normal ml-1 normal-case tracking-normal">(Disable Aliases)</span></span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}

            {/* Application Feeds */}
            {activeView === "home" && (
              <div className="space-y-10">
                <AnimatePresence>
                  {results.filter(r => !activeHistoryId || r.id === activeHistoryId).map((thread) => (
                    <ThreadCard key={thread.id} thread={thread} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {activeView === "api" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pt-4 md:pt-10 w-full max-w-4xl mx-auto pb-12">
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold text-white tracking-tight">API Documentation</h2>
                  <p className="text-zinc-400 text-sm md:text-base leading-relaxed">Integrate zero-trace Reddit thread extraction natively into your application. Our infrastructure routes every request through residential proxies to bypass 403 Forbidden blocks and rate limits from Reddit.</p>
                </div>

                <div className="space-y-12">
                  <section className="space-y-4">
                    <h3 className="text-xl font-medium text-white border-b border-[#1f1f1f] pb-2">Overview</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed font-normal">The REST API allows you to extract structured text directly from any valid Reddit post (including old.reddit and mobile sharing links, automatically dropping all tracking parameters). All operations occur server-side utilizing a <b className="text-zinc-200">residential proxy matrix</b> to prevent data-center IP blocking inherently common on Vercel/AWS deployments.</p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xl font-medium text-white border-b border-[#1f1f1f] pb-2">Authentication</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed font-normal">Our public endpoint is currently unauthenticated for evaluation purposes but enforces strict Request Rates natively evaluating your IP. You are allowed <b className="text-[#FF4500]">5,000 proxy cycle requests</b> across your lifetime hardware footprint. Exceeding this boundary will return a standard <span className="font-mono bg-[#111] px-1.5 py-0.5 rounded border border-[#222] text-[#FF4500] text-xs">429 Too Many Requests</span> blocking structure.</p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xl font-medium text-white border-b border-[#1f1f1f] pb-2">The Endpoint</h3>
                    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl">
                      <div className="flex border-b border-[#1f1f1f] bg-[#050505] px-5 py-4 items-center gap-4">
                        <span className="text-[10px] px-3 py-1 rounded bg-[#FF4500]/10 border border-[#FF4500]/30 text-[#FF4500] font-bold uppercase tracking-wider">POST</span>
                        <span className="text-sm font-mono text-zinc-300">{baseUrl}/api/v1/scrape</span>
                      </div>
                      <div className="p-6">
                        <p className="text-sm text-zinc-300 font-semibold mb-4 tracking-wide">Request Parameters</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-[#1f1f1f] pb-3 mb-4 text-xs font-bold text-zinc-500 uppercase tracking-widest gap-2">
                          <span>Parameter</span>
                          <span className="hidden md:block">Type</span>
                          <span className="hidden md:block">Description</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 text-sm text-zinc-400 gap-y-2">
                          <span className="font-mono text-[#FF4500]">url <span className="text-zinc-600 md:hidden ml-2">(string)</span></span>
                          <span className="font-mono text-zinc-500 hidden md:block">string</span>
                          <span>The strictly formatted target Reddit submission URL you desire to extract organically.</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 text-sm text-zinc-400 gap-y-2 mt-4 pt-4 border-t border-[#1f1f1f]">
                          <span className="font-mono text-[#FF4500]">xRayMode <span className="text-zinc-600 md:hidden ml-2">(boolean)</span></span>
                          <span className="font-mono text-zinc-500 hidden md:block">boolean</span>
                          <span>Optional. Instructs the backend to sweep historical <b className="text-zinc-300">Pullpush Archive APIs</b> to reliably recover scrubbed/deleted submissions and missing comment layers if present.</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xl font-medium text-white border-b border-[#1f1f1f] pb-2">Interactive Syntax</h3>
                    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl space-y-0">
                      <div className="flex border-b border-[#1f1f1f] bg-[#050505] px-1 overflow-x-auto hide-scrollbar">
                        {["curl", "node", "python"].map(tab => (
                          <button key={tab} onClick={() => setCodeTab(tab)} className={`px-6 py-4 text-[12px] font-mono font-bold uppercase tracking-widest transition-colors w-full md:w-auto text-center border-b-2 ${codeTab === tab ? "text-[#FF4500] border-[#FF4500]" : "text-zinc-600 hover:text-zinc-300 border-transparent"}`}>
                            {tab}
                          </button>
                        ))}
                      </div>
                      <pre className="p-6 overflow-x-auto text-[13px] font-mono text-emerald-400/90 leading-loose"><code>{codeSnippets[codeTab as keyof typeof codeSnippets]}</code></pre>
                    </div>
                  </section>

                  <section className="space-y-4 pb-12">
                    <h3 className="text-xl font-medium text-white border-b border-[#1f1f1f] pb-2">Live Execution Demo</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-normal">Trigger an explicit cycle execution natively resolving our hardened residential proxy network. We intercept the exact execution format mapping the thread seamlessly back into your UI via JSON dynamically bypassing Vercel infrastructure.</p>

                    <motion.button onClick={testPublicAPI} disabled={apiTesting} whileTap={{ scale: 0.98 }} className="w-full md:w-auto h-12 px-8 rounded-lg bg-[#FF4500] hover:bg-orange-500 shadow-[0_0_15px_rgba(255,69,0,0.3)] disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-3 transition-colors uppercase tracking-wider">
                      {apiTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {apiTesting ? "Resolving Pipeline..." : "Execute POST /api/v1/scrape"}
                    </motion.button>

                    <AnimatePresence>
                      {apiTestResponse && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6">
                          <pre className="p-6 rounded-xl bg-[#050505] border border-[#1f1f1f] overflow-x-auto text-[12px] font-mono text-amber-500 shadow-inner max-h-[500px] whitespace-pre-wrap leading-relaxed"><code>{apiTestResponse}</code></pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                </div>
              </motion.div>
            )}

            {activeView === "tools" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-6 md:pt-10 pb-16">
                <div><h2 className="text-2xl font-semibold text-white">Client Utilities</h2><p className="text-zinc-400 text-sm mt-2">Manage extended bulk logic and text hashes natively isolating resources.</p></div>

                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="p-2 border border-[#222] bg-[#111] rounded-lg shrink-0 w-max"><TerminalSquare className="w-5 h-5 text-zinc-300" /></div>
                    <div><h3 className="font-semibold text-white">Bulk Multi-Fetch Scrape</h3><p className="text-xs text-zinc-500">Execution restricted to 5 concurrent raw URLs globally.</p></div>
                  </div>
                  <Textarea value={bulkUrls} onChange={(e) => setBulkUrls(e.target.value)} placeholder={`https://reddit.com/r/...`} className="h-40 rounded-xl bg-[#000] border border-[#1f1f1f] p-4 text-sm font-mono text-zinc-300 resize-none focus-visible:ring-1 focus-visible:ring-[#FF4500]/50" />
                  <motion.button onClick={executeBulkScrape} disabled={bulkLoading || !bulkUrls} whileTap={{ scale: 0.98 }} className="w-full h-12 rounded-lg font-medium text-white bg-[#FF4500] shadow-[0_0_15px_rgba(255,69,0,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"><Loader2 className={`w-4 h-4 ${bulkLoading ? 'animate-spin' : 'hidden'}`} /> Execute Dynamic Multi-Pipeline Array</motion.button>
                </div>

                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="p-2 border border-[#222] bg-[#111] rounded-lg shrink-0 w-max"><Code2 className="w-5 h-5 text-zinc-300" /></div>
                    <div><h3 className="font-semibold text-white">Regex Anonymizer Hash Component</h3><p className="text-xs text-zinc-500">Map iterations strictly inside V8 isolating string arrays exclusively from the web.</p></div>
                  </div>
                  <Textarea value={anonInput} onChange={(e) => setAnonInput(e.target.value)} placeholder="Paste string block crossing raw u/Username handles..." className="h-32 rounded-xl bg-[#000] border border-[#1f1f1f] p-4 text-sm font-mono text-zinc-300 focus-visible:ring-1 focus-visible:ring-[#FF4500]/50" />
                  <div className="flex justify-end"><motion.button onClick={executeUserAnonymization} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto h-12 sm:h-10 px-6 rounded-lg bg-[#222] hover:bg-[#333] border border-[#444] text-white text-sm font-medium">Execute Thread Masking</motion.button></div>
                  {anonOutput && <Textarea readOnly value={anonOutput} className="h-32 mt-4 rounded-xl bg-[#000] border border-emerald-900/50 text-emerald-500 p-4 text-sm font-mono focus-visible:ring-0" />}
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* Developer Console "Bottom Sheet" Drawer */}
        <AnimatePresence>
          {devMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 320, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full bg-[#050505]/95 backdrop-blur-[40px] border-t border-[#1f1f1f] z-40 flex flex-col lowercase text-[11px] font-['JetBrains_Mono','Fira_Code',monospace] shrink-0"
            >
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#1f1f1f] bg-black text-zinc-500 uppercase tracking-widest text-[10px]">
                <span className="font-semibold flex items-center gap-2"><div className="w-2 h-2 bg-[#FF4500] rounded-full animate-pulse" /> Root Terminal Extractor</span>
                <span>/dev/null</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap hide-scrollbar">
                {logs.length === 0 ? (
                  <span className="opacity-50"># waiting for event interception signatures...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`mb-1 transition-colors ${log.includes("ERROR") ? 'text-rose-500' : ''} ${log.includes("RAW EXTRACT") ? 'text-emerald-500' : ''} ${log.includes("PUBLIC API") ? 'text-amber-400' : ''}`}>
                      <span className="text-[#FF4500] opacity-80 mr-2">{'>'}</span> {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ThreadCard({ thread }: { thread: ThreadResult }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("transcript");

  const tabs = [{ id: "transcript", label: "-t transcript" }, { id: "media", label: "-m media" }, { id: "json", label: "--json schema" }];

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(thread.text_content);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const downloadText = () => {
    const blob = new Blob([thread.text_content], { type: "text/plain" }); const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = blobUrl; link.download = `${thread.title.trim()}.txt`; link.click(); URL.revokeObjectURL(blobUrl);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`bg-[#0a0a0a] border border-[#1f1f1f] shadow-2xl rounded-[24px] p-4 sm:p-6 md:p-8 space-y-6 mt-6 relative`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <p className="font-semibold text-zinc-100 text-base sm:text-lg leading-snug">{thread.title}</p>
        <div className="shrink-0 w-max text-[10px] text-zinc-500 px-2 py-1 rounded border border-[#222] bg-[#111] font-mono">{new Date(thread.timestamp).toLocaleTimeString()}</div>
      </div>

      <div className="flex w-full md:w-fit p-1 bg-[#111] rounded-lg border border-[#222] overflow-x-auto hide-scrollbar">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`relative px-4 py-2.5 text-[12px] font-mono transition-colors rounded-md z-10 whitespace-nowrap ${activeTab === t.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {activeTab === t.id && <motion.div layoutId={`pill-${thread.id}`} className="absolute inset-0 bg-[#222] rounded-md shadow-sm border border-[#333]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
            <span className="relative z-20">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-[#000] border border-[#1f1f1f] rounded-xl overflow-hidden focus-within:border-[#333] transition-colors relative">
        <AnimatePresence mode="wait">
          {activeTab === "transcript" && (
            <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Textarea readOnly value={thread.text_content} className="min-h-[350px] resize-y bg-transparent border-none p-5 font-['JetBrains_Mono',monospace] text-[12px] leading-relaxed outline-none text-zinc-300 focus-visible:ring-0" />
            </motion.div>
          )}
          {activeTab === "media" && (
            <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-[350px] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {thread.media?.length ? thread.media.map((img, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden shadow-sm border border-[#333] bg-[#0a0a0a] min-h-[200px]"><img src={img} alt="media" className="absolute inset-0 w-full h-full object-cover" /></div>
              )) : <div className="col-span-full flex flex-col items-center justify-center text-zinc-600 font-mono text-xs"><ImageIcon className="w-8 h-8 opacity-50 mb-4" />{"{ \"media\": \"null\" }"}</div>}
            </motion.div>
          )}
          {activeTab === "json" && (
            <motion.div key="json" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Textarea readOnly value={thread.dev_raw ? JSON.stringify(thread.dev_raw, null, 2) : "UNVERIFIED DAEMON STRUCTURE RESPONSE"} className="min-h-[350px] resize-y bg-transparent border-none p-5 font-['JetBrains_Mono',monospace] text-[11px] leading-relaxed outline-none text-amber-500/80 focus-visible:ring-0" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <motion.button onClick={copyToClipboard} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto h-12 sm:h-10 px-5 rounded-lg bg-[#222] hover:bg-[#333] border border-[#333] transition-colors text-zinc-300 font-medium text-sm flex items-center justify-center gap-2">
          {copied ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Copied</> : <><Copy className="w-4 h-4" /> Extract to Clipboard</>}
        </motion.button>
        <motion.button onClick={downloadText} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto h-12 sm:h-10 px-5 rounded-lg bg-[#222] hover:bg-[#333] border border-[#333] transition-colors text-zinc-300 font-medium text-sm flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Download .txt Object Schema
        </motion.button>
      </div>
    </motion.div>
  );
}
