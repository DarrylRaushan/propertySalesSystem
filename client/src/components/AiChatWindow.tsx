import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  X,
  Send,
  Bot,
  Sparkles,
  BarChart2,
  TrendingUp,
  PieChart,
  Users,
  Building,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Zap,
  Calculator,
  MessageSquare,
  ShieldCheck,
  Flame,
  Plus,
  ChevronLeft,
  Trash2,
  MessagesSquare,
  Clock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { AIChartRenderer, type ChartSpec } from "./AIChartRenderer";
import { AIDecisionCard, type DecisionSpec } from "./AIDecisionCard";
import { AiThinkingBlock } from "./AiThinkingBlock";
import AiSettingsModal from "./AiSettingsModal";
import { toast } from "sonner";
import { Settings } from "lucide-react";

interface AiChatWindowProps {
  onClose: () => void;
}

interface ParsedMessageSegment {
  type: "text" | "chart" | "decision" | "think";
  content?: string;
  chart?: ChartSpec;
  decision?: DecisionSpec;
  think?: string;
}

function cleanJsonBody(raw: string): string {
  let cleaned = raw.trim();
  // Strip markdown code block fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function parseAssistantMessage(rawContent: string): ParsedMessageSegment[] {
  const segments: ParsedMessageSegment[] = [];

  // Match <think>...</think>, <<<CHART_DATA...>>>, <<<DECISION_CARD...>>>
  const blockRegex = /(?:<think>([\s\S]*?)<\/think>)|(?:<<<(CHART_DATA|DECISION_CARD)\s*([\s\S]*?)\s*>>>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(rawContent)) !== null) {
    const textBefore = rawContent.slice(lastIndex, match.index).trim();
    if (textBefore) {
      segments.push({ type: "text", content: textBefore });
    }

    if (match[1] !== undefined) {
      // It's a <think> block
      segments.push({ type: "think", think: match[1].trim() });
    } else {
      const blockType = match[2];
      const blockBody = cleanJsonBody(match[3]);

      try {
        const parsed = JSON.parse(blockBody);
        if (blockType === "CHART_DATA") {
          segments.push({ type: "chart", chart: parsed });
        } else if (blockType === "DECISION_CARD") {
          segments.push({ type: "decision", decision: parsed });
        }
      } catch {
        // If parsing fails, render as raw text block
        segments.push({ type: "text", content: blockBody });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  const trailingText = rawContent.slice(lastIndex).trim();
  if (trailingText) {
    segments.push({ type: "text", content: trailingText });
  }

  return segments.length > 0 ? segments : [{ type: "text", content: rawContent }];
}

const DEFAULT_WELCOME_MSG = {
  role: "ai" as const,
  content:
    "### Welcome to Property AI Assistant\nI am connected directly to your **live Property CRM & Database**. I can analyze your sales pipeline, prioritize hot leads, calculate Malaysian mortgage/DSR, recommend tailored property pitches, and generate custom graphs on demand.\n\n**Try asking:**\n- *\"Calculate monthly mortgage & DSR for RM 1.25M property\"*\n- *\"Generate WhatsApp outreach pitch for high-priority leads\"*\n- *\"Which leads have the highest probability and what action should I take?\"*\n- *\"Chart our monthly sales trends for 2024–2025\"*",
};

// ── Multi-Conversation types & helpers ──────────────────────────────────────
interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: { role: "user" | "ai"; content: string }[];
}

const CONVOS_STORAGE_KEY = "property_ai_conversations_v1";
const ACTIVE_CONVO_KEY = "property_ai_active_convo_v1";

function generateId() {
  return `convo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function deriveTitleFromMessages(msgs: { role: string; content: string }[]): string {
  const firstUser = msgs.find((m) => m.role === "user");
  if (!firstUser) return "New Conversation";
  return firstUser.content.slice(0, 48) + (firstUser.content.length > 48 ? "…" : "");
}

function createNewConversation(): Conversation {
  return {
    id: generateId(),
    title: "New Conversation",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [{ ...DEFAULT_WELCOME_MSG }],
  };
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const initial = createNewConversation();
  return [initial];
}

function saveConversations(convos: Conversation[]) {
  try {
    localStorage.setItem(CONVOS_STORAGE_KEY, JSON.stringify(convos));
  } catch {}
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString("en-MY", { month: "short", day: "numeric" });
}

// Legacy key — migrate old single-conversation data if present
const LEGACY_STORAGE_KEY = "property_ai_chat_history_v1";

export default function AiChatWindow({ onClose }: AiChatWindowProps) {
  // ── Multi-Conversation State ─────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const convos = loadConversations();
    // Migrate legacy single-conversation data
    try {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const legacyMsgs = JSON.parse(legacy);
        if (Array.isArray(legacyMsgs) && legacyMsgs.length > 1) {
          // Only migrate if there are actual user messages
          const hasUserMsg = legacyMsgs.some((m: any) => m.role === "user");
          if (hasUserMsg && convos.length === 1 && convos[0].messages.length <= 1) {
            convos[0].messages = legacyMsgs;
            convos[0].title = deriveTitleFromMessages(legacyMsgs);
            convos[0].updatedAt = Date.now();
          }
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {}
    return convos;
  });

  const [activeConvoId, setActiveConvoId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_CONVO_KEY);
      if (saved) return saved;
    } catch {}
    return conversations[0]?.id ?? "";
  });

  const [showConvoList, setShowConvoList] = useState(false);

  // Derived active conversation
  const activeConvo = conversations.find((c) => c.id === activeConvoId) ?? conversations[0];
  const messages = activeConvo?.messages ?? [DEFAULT_WELCOME_MSG];

  const setMessages = useCallback(
    (updater: (prev: { role: "user" | "ai"; content: string }[]) => { role: "user" | "ai"; content: string }[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvoId
            ? {
                ...c,
                messages: updater(c.messages),
                title: deriveTitleFromMessages(updater(c.messages)),
                updatedAt: Date.now(),
              }
            : c
        )
      );
    },
    [activeConvoId]
  );

  // Persist conversations to localStorage
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_CONVO_KEY, activeConvoId);
    } catch {}
  }, [activeConvoId]);

  // ── UI state ────────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const dragControls = useDragControls();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Conversation management helpers ─────────────────────────────────────
  const handleNewConversation = () => {
    const newConvo = createNewConversation();
    setConversations((prev) => [newConvo, ...prev]);
    setActiveConvoId(newConvo.id);
    setShowConvoList(false);
    setInput("");
  };

  const handleSwitchConversation = (id: string) => {
    setActiveConvoId(id);
    setShowConvoList(false);
    setInput("");
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (updated.length === 0) {
        const fresh = createNewConversation();
        setActiveConvoId(fresh.id);
        return [fresh];
      }
      if (id === activeConvoId) {
        setActiveConvoId(updated[0].id);
      }
      return updated;
    });
  };

  const statusQuery = trpc.ai.getStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const chat = trpc.ai.chat.useMutation({
    onSuccess: ({ content }) => {
      setMessages((prev) => [...prev, { role: "ai", content }]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `**Request Error**: ${err.message || "Could not complete request. Please verify your AI settings."}`,
        },
      ]);
    },
  });

  const handleSend = (text: string) => {
    const content = text.trim();
    if (!content || chat.isPending) return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(() => nextMessages);
    setInput("");
    chat.mutate({
      messages: nextMessages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      })),
    });
  };

  const handleClearHistory = () => {
    // Reset the current active conversation
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvoId
          ? {
              ...c,
              title: "New Conversation",
              updatedAt: Date.now(),
              messages: [
                {
                  role: "ai" as const,
                  content:
                    "Conversation cleared. How can I help you analyze your property data, calculate loans, or generate charts today?",
                },
              ],
            }
          : c
      )
    );
  };

  const handleCopyMessage = (content: string, index: number) => {
    // Strip chart/decision markers for clean text copy
    const cleanText = content
      .replace(/<<<CHART_DATA[\s\S]*?>>>/g, "")
      .replace(/<<<DECISION_CARD[\s\S]*?>>>/g, "")
      .trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    toast.success("Response copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chat.isPending]);

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{ willChange: "transform" }}
      className={cn(
        "ai-terrain-chat fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_16px_50px_rgba(26,42,66,0.18)]",
        isExpanded
          ? "bottom-8 right-8 w-[1040px] max-w-[calc(100vw-48px)] h-[calc(100vh-64px)]"
          : "bottom-20 right-8 h-[560px] w-[420px] max-w-[calc(100vw-32px)]"
      )}
    >
      {/* ── Conversation List Overlay ───────────────────────────── */}
      <AnimatePresence>
        {showConvoList && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-20 flex flex-col bg-white"
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#eef0f3] bg-[#f8fafc]">
              <div className="flex items-center gap-2">
                <MessagesSquare className="size-4 text-[#284762]" />
                <span className="text-[13px] font-bold text-[#1e293b]">Conversations</span>
                <span className="text-[11px] text-[#64748b] bg-[#e2e8f0] rounded-full px-1.5 py-0.5 font-semibold">{conversations.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleNewConversation}
                  title="New Conversation"
                  className="h-7 w-7 text-[#284762] hover:bg-[#edf2f7]"
                >
                  <Plus className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowConvoList(false)}
                  title="Close"
                  className="h-7 w-7 text-[#64748b] hover:bg-[#e2e8f0]"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* New conversation button */}
            <button
              onClick={handleNewConversation}
              className="mx-3 mt-3 mb-1 flex items-center gap-2 rounded-xl border border-dashed border-[#284762] bg-[#f0f6ff] hover:bg-[#e0ecff] px-3 py-2.5 text-[13px] font-bold text-[#284762] transition-all"
            >
              <Plus className="size-3.5 shrink-0" />
              <span>New conversation</span>
            </button>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {conversations.map((convo) => (
                <div
                  key={convo.id}
                  onClick={() => handleSwitchConversation(convo.id)}
                  className={cn(
                    "group flex items-start justify-between gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-all",
                    convo.id === activeConvoId
                      ? "bg-[#284762] text-white"
                      : "hover:bg-[#f1f5f9] text-[#334155]"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[13px] font-semibold truncate leading-tight", convo.id === activeConvoId ? "text-white" : "text-[#1e293b]")}>
                      {convo.title}
                    </p>
                    <p className={cn("text-[11px] mt-0.5 flex items-center gap-1", convo.id === activeConvoId ? "text-[#a8c8e8]" : "text-[#64748b]")}>
                      <Clock className="size-2.5 shrink-0" />
                      {formatRelativeTime(convo.updatedAt)} · {convo.messages.filter((m) => m.role === "user").length} msgs
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(convo.id, e)}
                    className={cn(
                      "shrink-0 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity",
                      convo.id === activeConvoId
                        ? "hover:bg-white/20 text-white/70 hover:text-white"
                        : "hover:bg-red-50 text-[#94a3b8] hover:text-red-500"
                    )}
                    title="Delete conversation"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Draggable Header */}
      <div
        className="ai-terrain-chat-header flex items-center justify-between border-b border-[#eef0f3] bg-[#f8fafc] px-3.5 py-2.5 select-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => !showConvoList && dragControls.start(e)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setShowConvoList((v) => !v)}
            className="ai-terrain-chat-bot flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#284762] to-[#1a2c3d] text-white shadow-xs hover:opacity-80 transition-opacity"
            title="View all conversations"
          >
            {showConvoList ? <ChevronLeft className="size-3.5" /> : <MessagesSquare className="size-3.5 text-[#f59e0b]" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[13px] font-bold text-[#1e293b] truncate max-w-[130px]" title={activeConvo?.title}>
                {activeConvo?.title === "New Conversation" ? "Property AI" : activeConvo?.title ?? "Property AI"}
              </h3>
              {statusQuery.data?.hasKey ? (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-1 rounded-full bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700 border border-emerald-200 transition-colors"
                  title="AI Model Configuration"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate max-w-[90px]">{statusQuery.data.model}</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-1 rounded-full bg-amber-50 hover:bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold text-amber-800 border border-amber-200 transition-colors"
                  title="Click to connect an LLM API Key"
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  <span>Connect Key</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewConversation}
            title="New Conversation"
            className="h-6 w-6 text-[#284762] hover:bg-[#edf2f7] hover:text-[#1a2c3d]"
          >
            <Plus className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsSettingsOpen(true)}
            title="Configure LLM & API Keys"
            className="h-6 w-6 text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
          >
            <Settings className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClearHistory}
            title="Clear This Conversation"
            className="h-6 w-6 text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
          >
            <RotateCcw className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? "Collapse to Widget" : "Expand to Analytics Studio"}
            className="h-6 w-6 text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
          >
            {isExpanded ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="Close"
            className="h-6 w-6 text-[#64748b] hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="ai-terrain-chat-main flex flex-1 overflow-hidden">
        {/* Chat Conversation & Visualizations Canvas */}
        <div className={cn("flex flex-1 flex-col bg-[#fafbfc]", isExpanded && "border-r border-[#eef0f3]")}>
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const segments = isUser ? [] : parseAssistantMessage(msg.content);

              return (
                <div
                  key={i}
                  className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full shadow-2xs mt-0.5",
                      isUser
                        ? "bg-[#284762] text-white"
                        : "bg-gradient-to-br from-[#a9752e] to-[#8a5d20] text-white"
                    )}
                  >
                    {isUser ? (
                      <span className="text-[10px] font-bold">ME</span>
                    ) : (
                      <Bot className="size-3" />
                    )}
                  </div>

                  <div
                    className={cn(
                      "group relative rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-xs overflow-hidden",
                      isUser
                        ? "bg-[#284762] text-white rounded-tr-xs max-w-[85%]"
                        : "bg-white border border-[#e2e8f0] text-[#1e293b] rounded-tl-xs max-w-[92%]"
                    )}
                  >
                    {!isUser && (
                      <button
                        onClick={() => handleCopyMessage(msg.content, i)}
                        className="absolute right-2 top-2 hidden rounded p-1 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#334155] group-hover:block transition-all"
                        title="Copy text"
                      >
                        {copiedIndex === i ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    )}

                    {isUser ? (
                      <div>{msg.content}</div>
                    ) : (
                      <div className="space-y-2">
                        {segments.map((seg, sIdx) => {
                          if (seg.type === "think" && seg.think) {
                            return <AiThinkingBlock key={sIdx} content={seg.think} />;
                          }
                          if (seg.type === "chart" && seg.chart) {
                            return <AIChartRenderer key={sIdx} chart={seg.chart} />;
                          }
                          if (seg.type === "decision" && seg.decision) {
                            return (
                              <AIDecisionCard
                                key={sIdx}
                                decision={seg.decision}
                                onCloseParent={onClose}
                              />
                            );
                          }
                          return (
                            <Streamdown
                              key={sIdx}
                              className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1.5 prose-headings:font-bold prose-headings:text-[#0f172a] prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-[#0f172a]"
                            >
                              {seg.content || ""}
                            </Streamdown>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {chat.isPending && (
              <div className="flex gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#a9752e] text-white shadow-2xs mt-0.5">
                  <Bot className="size-3" />
                </div>
                <div className="rounded-2xl rounded-tl-xs border border-[#e2e8f0] bg-white px-3.5 py-2 text-[12px] text-[#64748b] shadow-xs flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#284762] animate-ping" />
                  <span>Thinking, analyzing CRM records & formulating decision plan…</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-[#eef0f3] bg-white p-2.5 space-y-2">
            {/* Quick Integral Tools Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() => handleSend("Calculate monthly mortgage repayment and DSR requirement for RM 1,250,000 property")}
                className="flex items-center gap-1 shrink-0 rounded-full border border-[#cbd5e1] bg-[#f8fafc] hover:bg-[#edf2f7] hover:border-[#94a3b8] px-2.5 py-1 text-[#334155] font-semibold transition-all"
              >
                <Calculator className="size-3 text-emerald-600" />
                <span>RM 1.25M Loan</span>
              </button>

              <button
                type="button"
                onClick={() => handleSend("Generate ready-to-send WhatsApp outreach pitches for high-yield investor and family own-stay buyers")}
                className="flex items-center gap-1 shrink-0 rounded-full border border-[#cbd5e1] bg-[#f8fafc] hover:bg-[#edf2f7] hover:border-[#94a3b8] px-2.5 py-1 text-[#334155] font-semibold transition-all"
              >
                <MessageSquare className="size-3 text-blue-600" />
                <span>WhatsApp Pitch</span>
              </button>

              <button
                type="button"
                onClick={() => handleSend("How should I overcome common buyer objections regarding high price per sq ft and interest rates?")}
                className="flex items-center gap-1 shrink-0 rounded-full border border-[#cbd5e1] bg-[#f8fafc] hover:bg-[#edf2f7] hover:border-[#94a3b8] px-2.5 py-1 text-[#334155] font-semibold transition-all"
              >
                <ShieldCheck className="size-3 text-amber-600" />
                <span>Objections</span>
              </button>

              <button
                type="button"
                onClick={() => handleSend("Perform priority analysis on all active CRM leads. Which leads should I contact first today?")}
                className="flex items-center gap-1 shrink-0 rounded-full border border-[#cbd5e1] bg-[#f8fafc] hover:bg-[#edf2f7] hover:border-[#94a3b8] px-2.5 py-1 text-[#334155] font-semibold transition-all"
              >
                <Flame className="size-3 text-red-600" />
                <span>Top Leads</span>
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 focus-within:border-[#284762] focus-within:ring-1 focus-within:ring-[#284762]/20 transition-all">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                placeholder="Ask mortgage, pitch, objections, or CRM analysis..."
                className="h-7 border-none bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0 text-[#1e293b] placeholder:text-[#94a3b8]"
                disabled={chat.isPending}
              />
              <Button
                size="icon-sm"
                onClick={() => handleSend(input)}
                disabled={!input.trim() || chat.isPending}
                className="h-6 w-6 shrink-0 rounded-lg bg-[#284762] hover:bg-[#1a2c3d] text-white shadow-xs disabled:opacity-40"
              >
                <Send className="size-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Hub & Strategic Query Presets - ONLY RENDERED IN EXPANDED VIEW */}
        {isExpanded && (
          <div className="w-[280px] bg-[#fcfdfd] border-l border-[#eef0f3] p-3.5 flex flex-col overflow-y-auto transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Zap className="size-3.5 text-[#a9752e]" />
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
                  Agent Power Tools Studio
                </h4>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-[#64748b] hover:text-[#284762] text-[11px] p-0.5 rounded"
                title="Configure LLM"
              >
                <Settings className="size-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {/* Tool 1: Mortgage Calculator */}
              <button
                onClick={() => handleSend("Calculate monthly mortgage repayment, DSR criteria, and MOT legal fees for a RM 1,250,000 property.")}
                className="flex w-full items-start gap-2 rounded-lg border border-[#eef0f3] bg-white p-2 text-left hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-xs transition-all"
              >
                <Calculator className="size-3.5 mt-0.5 shrink-0 text-[#059669]" />
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]">Mortgage & DSR</p>
                  <p className="text-[12px] text-[#64748b] leading-tight">Loan & MOT fee calculation</p>
                </div>
              </button>

              {/* Tool 2: WhatsApp Pitch Generator */}
              <button
                onClick={() => handleSend("Generate high-converting WhatsApp outreach pitches tailored to our top active leads with priority incentives.")}
                className="flex w-full items-start gap-2 rounded-lg border border-[#eef0f3] bg-white p-2 text-left hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-xs transition-all"
              >
                <MessageSquare className="size-3.5 mt-0.5 shrink-0 text-[#2563eb]" />
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]">WhatsApp Pitch Maker</p>
                  <p className="text-[12px] text-[#64748b] leading-tight">One-click outreach copy</p>
                </div>
              </button>

              {/* Tool 3: Objection Killer Matrix */}
              <button
                onClick={() => handleSend("Provide strategies and scripts to overcome buyer objections regarding pricing per sq ft, market timing, and interest rates.")}
                className="flex w-full items-start gap-2 rounded-lg border border-[#eef0f3] bg-white p-2 text-left hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-xs transition-all"
              >
                <ShieldCheck className="size-3.5 mt-0.5 shrink-0 text-[#d97706]" />
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]">Objection Killer</p>
                  <p className="text-[12px] text-[#64748b] leading-tight">Proven closing responses</p>
                </div>
              </button>

              {/* Tool 4: Priority Leads */}
              <button
                onClick={() => handleSend("Perform a deep priority analysis on all active CRM leads. Which leads represent our biggest closing opportunities and what exact action should we take today?")}
                className="flex w-full items-start gap-2 rounded-lg border border-[#eef0f3] bg-white p-2 text-left hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-xs transition-all"
              >
                <Users className="size-3.5 mt-0.5 shrink-0 text-[#a9752e]" />
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]">Lead Prioritization</p>
                  <p className="text-[12px] text-[#64748b] leading-tight">High-value closing actions</p>
                </div>
              </button>

              {/* Tool 5: Sales Trend */}
              <button
                onClick={() => handleSend("Analyze our monthly sales revenue trends across 2024-2025 and generate an interactive line chart.")}
                className="flex w-full items-start gap-2 rounded-lg border border-[#eef0f3] bg-white p-2 text-left hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-xs transition-all"
              >
                <TrendingUp className="size-3.5 mt-0.5 shrink-0 text-[#284762]" />
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]">Sales Trend & Volume</p>
                  <p className="text-[12px] text-[#64748b] leading-tight">Monthly performance chart</p>
                </div>
              </button>

              {/* Tool 6: Property Pricing */}
              <button
                onClick={() => handleSend("Compare property inventory prices, sizes, and calculate average price benchmarks across our active listings.")}
                className="flex w-full items-start gap-2 rounded-lg border border-[#eef0f3] bg-white p-2 text-left hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-xs transition-all"
              >
                <Building className="size-3.5 mt-0.5 shrink-0 text-[#7c3aed]" />
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]">Property Portfolio</p>
                  <p className="text-[12px] text-[#64748b] leading-tight">Inventory pricing comparison</p>
                </div>
              </button>

              {/* Tool 7: Lead Acquisition Mix */}
              <button
                onClick={() => handleSend("Show an enquiry source channel breakdown as a pie chart and tell me which channel yields the highest quality leads.")}
                className="flex w-full items-start gap-2 rounded-lg border border-[#eef0f3] bg-white p-2 text-left hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-xs transition-all"
              >
                <PieChart className="size-3.5 mt-0.5 shrink-0 text-[#6366f1]" />
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]">Lead Acquisition Mix</p>
                  <p className="text-[12px] text-[#64748b] leading-tight">Marketing channels chart</p>
                </div>
              </button>

              {/* Tool 8: Pipeline Bottlenecks */}
              <button
                onClick={() => handleSend("Conduct a bottleneck diagnostic on our pipeline stages. At which stage are we losing the most deals and how can agents fix this?")}
                className="flex w-full items-start gap-2 rounded-lg border border-[#eef0f3] bg-white p-2 text-left hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-xs transition-all"
              >
                <BarChart2 className="size-3.5 mt-0.5 shrink-0 text-[#d97706]" />
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]">Funnel Bottlenecks</p>
                  <p className="text-[12px] text-[#64748b] leading-tight">Conversion drop-off audit</p>
                </div>
              </button>
            </div>

            {/* Pro-Tip Box */}
            <div className="mt-auto pt-3">
              <div className="rounded-xl border border-[#e2e7eb] bg-gradient-to-br from-[#f0f4f8] to-[#e8f0f8] p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="size-3 text-[#284762]" />
                  <span className="text-[12px] font-bold text-[#284762]">Pro Tip</span>
                </div>
                <p className="text-[12px] text-[#475569] leading-relaxed">
                  Connect your <strong>Gemini</strong> or <strong>OpenAI</strong> API key via the settings gear icon to enable full reasoning and deep DB synthesis.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Settings Modal */}
      <AiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={() => {
          statusQuery.refetch();
        }}
      />
    </motion.div>
  );
}

