import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Square,
  Radio,
  Send,
  Loader2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import ButlerConciergeAvatar from "./ButlerConciergeAvatar";

interface ConciergeVoiceModeProps {
  onSendMessage: (text: string) => void;
  isAiThinking: boolean;
  messages: Array<{ role: "user" | "assistant"; text: string }>;
  onSwitchToChat: () => void;
  isGuestLimitReached?: boolean;
  onOpenAuthModal?: (prompt?: string) => void;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";



/* =====================================================================
   HARMONIC AUDIO WAVEFORM BARS
   Symmetric, elegant frequency visualizer
   ===================================================================== */
function HarmonicAudioWaveform({ active }: { active: boolean }) {
  const bars = [6, 12, 18, 26, 20, 14, 22, 28, 22, 14, 20, 26, 18, 12, 6];

  return (
    <div className="flex items-center justify-center gap-1.5 h-6">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          animate={{
            height: active ? [5, h, 5] : 4,
            opacity: active ? [0.6, 1, 0.6] : 0.25,
          }}
          transition={{
            repeat: Infinity,
            duration: 0.45 + (i % 5) * 0.1,
            ease: "easeInOut",
            delay: i * 0.04,
          }}
          className={`w-1 rounded-full ${active ? "bg-[#d7ef73]" : "bg-white/20"}`}
        />
      ))}
    </div>
  );
}

/* =====================================================================
   MAIN COMPONENT
   ===================================================================== */
export default function ConciergeVoiceMode({
  onSendMessage,
  isAiThinking,
  messages,
  onSwitchToChat,
  isGuestLimitReached,
  onOpenAuthModal,
}: ConciergeVoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.05);
  const [browserSupportsSpeech, setBrowserSupportsSpeech] = useState(true);

  const recognitionRef        = useRef<any>(null);
  const lastSpokenMsgIndexRef = useRef<number>(-1);
  const silenceTimerRef       = useRef<any>(null);

  /* Init speech recognition */
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setBrowserSupportsSpeech(false); return; }

    try {
      const r = new SpeechRecognition();
      r.continuous = true; r.interimResults = true; r.lang = "en-US";
      r.onstart  = () => setVoiceState("listening");
      r.onresult = (event: any) => {
        let fin = "", inter = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) fin   += item[0].transcript;
          else              inter += item[0].transcript;
        }
        if (inter) setInterimTranscript(inter);
        if (fin) {
          setTranscript((p) => (p ? `${p} ${fin.trim()}` : fin.trim()));
          setInterimTranscript("");
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => handleCommitSpokenText(fin.trim()), 1800);
        }
      };
      r.onerror = (err: any) => { if (err.error !== "no-speech") console.warn("[Voice]", err.error); };
      r.onend   = () => setVoiceState((cur) => (cur === "listening" ? "idle" : cur));
      recognitionRef.current = r;
    } catch (e) {
      setBrowserSupportsSpeech(false);
    }

    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAiThinking) {
      setVoiceState("processing");
      try { recognitionRef.current?.stop(); } catch {}
    }
  }, [isAiThinking]);

  const cleanForSpeech = (raw: string) =>
    raw.replace(/[*#_`>]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/RM\s?(\d[\d,]*)/gi, "$1 Malaysian Ringgit")
      .replace(/\n\s*[-•]\s*/g, ". ").replace(/\n{2,}/g, ". ").trim();

  useEffect(() => {
    if (!messages.length) return;
    const idx = messages.length - 1;
    const msg = messages[idx];
    if (msg.role === "assistant" && idx > lastSpokenMsgIndexRef.current && !isAiThinking) {
      lastSpokenMsgIndexRef.current = idx;
      if (isMuted || !("speechSynthesis" in window)) { setVoiceState("idle"); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(cleanForSpeech(msg.text));
      utt.rate = speechRate; utt.pitch = 1.0; utt.lang = "en-US";
      const pref = window.speechSynthesis.getVoices().find(
        (v) => v.lang.startsWith("en") &&
          (v.name.includes("Google") || v.name.includes("Samantha") ||
           v.name.includes("Natural") || v.name.includes("Premium") || v.name.includes("Serena"))
      );
      if (pref) utt.voice = pref;
      utt.onstart = () => setVoiceState("speaking");
      utt.onend   = () => setVoiceState("idle");
      utt.onerror = () => setVoiceState("idle");
      window.speechSynthesis.speak(utt);
    }
  }, [messages, isAiThinking, isMuted, speechRate]);

  const toggleListening = () => {
    if (isGuestLimitReached) { onOpenAuthModal?.("Sign in to unlock unlimited voice queries."); return; }
    if (voiceState === "speaking") {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setVoiceState("idle"); return;
    }
    if (voiceState === "listening") {
      try { recognitionRef.current?.stop(); } catch {}
      setVoiceState("idle");
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    } else {
      if (!browserSupportsSpeech) { toast.info("Voice recognition not supported in this browser."); return; }
      try {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        setTranscript(""); setInterimTranscript("");
        recognitionRef.current?.start();
        setVoiceState("listening");
      } catch { try { recognitionRef.current?.stop(); } catch {} }
    }
  };

  const handleCommitSpokenText = (text?: string) => {
    const send = text || transcript.trim() || interimTranscript.trim();
    if (!send) return;
    if (isGuestLimitReached) { onOpenAuthModal?.(); return; }
    try { recognitionRef.current?.stop(); } catch {}
    setTranscript(""); setInterimTranscript("");
    onSendMessage(send);
  };

  const QUICK_PROMPTS = [
    "What penthouses are available in KLCC?",
    "Which residence has the highest rental yield?",
    "What are foreign buyer quota rules in Malaysia?",
    "Explain mortgage calculations for RM 3,000,000",
  ];

  const lastAI   = [...messages].reverse().find((m) => m.role === "assistant");
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const pillCls = {
    idle:       "bg-white/10 text-[#d2e5d4] border-white/15",
    listening:  "bg-emerald-400/20 text-emerald-300 border-emerald-400/40 animate-pulse",
    processing: "bg-amber-400/20 text-amber-300 border-amber-400/40",
    speaking:   "bg-[#d7ef73]/20 text-[#d7ef73] border-[#d7ef73]/40",
  }[voiceState];

  const dotCls = {
    idle:       "bg-slate-400",
    listening:  "bg-emerald-400",
    processing: "bg-amber-400 animate-ping",
    speaking:   "bg-[#d7ef73]",
  }[voiceState];

  const stateLabel = {
    idle:       "Tap your concierge or mic to speak",
    listening:  "Concierge is listening… speak naturally",
    processing: "Concierge is reviewing property data…",
    speaking:   "Concierge is speaking…",
  }[voiceState];

  /* ──────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────── */
  return (
    <div
      className="flex flex-col h-full text-[#fbfff9] overflow-hidden relative"
      style={{
        background: "radial-gradient(ellipse at 50% 18%, #144447 0%, #0c2b2d 55%, #071718 100%)",
      }}
    >
      {/* ── Top bar ── */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/25 backdrop-blur-md z-20 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#234d4d] border border-[#d7ef73]/40 text-[#d7ef73] flex items-center justify-center font-bold text-sm shadow-sm">
            <UserCheck size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base customer-portal-serif text-white leading-tight">
              AI Property Concierge
            </h3>
            <p className="text-xs text-[#d7ef73] font-medium mt-0.5 hidden sm:block">
              Voice Mode · Personal Butler
            </p>
          </div>
        </div>

        {/* Segmented Mode Switcher Tab on Voice Window */}
        <div className="inline-flex items-center p-1 bg-black/30 border border-white/15 rounded-xl gap-1 shadow-inner">
          <button
            type="button"
            onClick={onSwitchToChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-bold rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Switch to Text Chat"
          >
            <MessageSquare size={14} />
            <span>Text Chat</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-bold rounded-lg bg-[#d7ef73] text-[#10484b] shadow-sm cursor-default"
          >
            <Mic size={14} className="animate-pulse" />
            <span>Voice Mode</span>
          </button>
        </div>
      </div>

      {/* ── Main Stage ── */}
      <div className="flex-1 flex flex-col items-center justify-between px-5 py-3 overflow-y-auto min-h-0">
        {/* Status Pill */}
        <div className="shrink-0 mb-1">
          <span
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wide border shadow-sm transition backdrop-blur-md ${pillCls}`}
          >
            <span className={`w-2 h-2 rounded-full ${dotCls}`} />
            {stateLabel}
          </span>
        </div>

        {/* Center Virtual Butler Concierge Avatar */}
        <div className="flex flex-col items-center justify-center my-auto py-1">
          <ButlerConciergeAvatar
            voiceState={voiceState}
            onClick={toggleListening}
            size={220}
          />

          {/* Harmonic audio wave frequency */}
          <div className="mt-1">
            <HarmonicAudioWaveform active={voiceState === "speaking" || voiceState === "listening"} />
          </div>
        </div>

        {/* Live Subtitles / Dialogue Feedback Card */}
        <div className="w-full max-w-xl shrink-0 my-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={voiceState + (lastAI?.text?.slice(0, 10) || "") + transcript.slice(0, 10)}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 px-4 py-2.5 text-center shadow-lg"
            >
              {voiceState === "listening" ? (
                <div>
                  <span className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider block mb-0.5">
                    Concierge Listening to you…
                  </span>
                  <p className="text-white text-xs sm:text-sm font-medium italic">
                    "{transcript || interimTranscript || "Speak to your concierge, I'm listening…"}"
                  </p>
                </div>
              ) : voiceState === "processing" ? (
                <div className="py-0.5">
                  <span className="text-amber-300 font-bold text-xs animate-pulse flex items-center justify-center gap-2">
                    <Loader2 size={13} className="animate-spin" />
                    Reviewing properties, mortgage calculations, and prime locations…
                  </span>
                </div>
              ) : voiceState === "speaking" && lastAI ? (
                <div>
                  <span className="text-[#d7ef73] font-extrabold text-[10px] uppercase tracking-wider block mb-0.5">
                    Personal Butler Concierge
                  </span>
                  <p className="text-white/95 text-xs sm:text-sm font-medium line-clamp-3 leading-relaxed">
                    "{lastAI.text}"
                  </p>
                </div>
              ) : lastUser ? (
                <div>
                  <span className="text-white/40 font-semibold text-[10px] uppercase tracking-wider block mb-0.5">
                    Your Inquiry
                  </span>
                  <p className="text-[#d2e5d4] text-xs font-medium line-clamp-2">
                    "{lastUser.text}"
                  </p>
                </div>
              ) : (
                <p className="text-[#d2e5d4]/70 text-xs italic py-0.5">
                  "Good day! I am your personal property concierge. Ask me anything about our residences, foreign buyer guidelines, or loan calculations."
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="w-full max-w-xl shrink-0 mb-2 flex items-center justify-center gap-1.5 flex-wrap">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isAiThinking}
              onClick={() => {
                if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                onSendMessage(prompt);
              }}
              className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-[#d7ef73]/20 border border-white/10 hover:border-[#d7ef73]/40 text-[#d2e5d4] hover:text-white text-[11px] font-medium transition shadow-xs flex items-center gap-1 group disabled:opacity-40"
            >
              <Sparkles size={10} className="text-[#d7ef73]/70 group-hover:text-[#d7ef73]" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Bottom Primary Action Control */}
        <div className="shrink-0 flex items-center justify-center gap-3">
          {voiceState === "speaking" ? (
            <button
              type="button"
              onClick={() => {
                if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                setVoiceState("idle");
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#d7ef73] text-[#10484b] font-extrabold text-xs shadow-xl hover:bg-white hover:scale-105 transition-all"
            >
              <Square size={12} fill="currentColor" />
              <span>Stop Speaking</span>
            </button>
          ) : voiceState === "listening" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition"
              >
                <MicOff size={13} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={() => handleCommitSpokenText()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-400 text-[#092b2d] font-black text-xs shadow-lg shadow-emerald-400/30 hover:scale-105 transition-all"
              >
                <Send size={12} />
                <span>Done & Send</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleListening}
              disabled={voiceState === "processing"}
              className={`flex items-center gap-2 px-7 py-2.5 rounded-full font-bold text-xs shadow-xl transition-all duration-300 ${
                voiceState === "processing"
                  ? "bg-amber-400/20 text-amber-300 cursor-not-allowed border border-amber-400/30"
                  : "bg-[#d7ef73] hover:bg-[#cbe362] text-[#10484b] hover:scale-105 shadow-[#d7ef73]/20"
              }`}
            >
              <Mic size={14} />
              <span>Speak to Concierge</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
