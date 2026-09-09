import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Key,
  Cpu,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

const PROVIDER_PRESETS: Record<
  string,
  {
    name: string;
    icon: string;
    baseUrl: string;
    defaultModel: string;
    models: string[];
    keyPlaceholder: string;
    docsUrl: string;
    badge?: string;
  }
> = {
  gemini: {
    name: "Google Gemini",
    icon: "GEM",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.6-flash",
    models: ["gemini-3.6-flash", "gemini-3.6-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
    keyPlaceholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    badge: "Recommended • Ultra Fast",
  },
  openai: {
    name: "OpenAI",
    icon: "OAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "o3-mini", "gpt-4-turbo"],
    keyPlaceholder: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  deepseek: {
    name: "DeepSeek",
    icon: "DS",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyPlaceholder: "sk-...",
    docsUrl: "https://platform.deepseek.com/",
    badge: "Deep Reasoning",
  },
  groq: {
    name: "Groq Cloud",
    icon: "GRQ",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-120b",
    models: [
      "openai/gpt-oss-120b",
      "qwen/qwen3.6-27b",
      "groq/compound",
      "openai/gpt-oss-20b",
      "llama-3.3-70b-versatile",
    ],
    keyPlaceholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    badge: "Active • Ultra Fast",
  },
  openrouter: {
    name: "OpenRouter",
    icon: "OR",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.0-flash-exp:free",
    models: [
      "google/gemini-2.0-flash-exp:free",
      "anthropic/claude-3.5-sonnet",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-r1",
    ],
    keyPlaceholder: "sk-or-v1-...",
    docsUrl: "https://openrouter.ai/keys",
  },
  ollama: {
    name: "Local LLM (Ollama / LM Studio)",
    icon: "LOC",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    models: ["llama3.2", "mistral", "qwen2.5-coder", "deepseek-r1:8b"],
    keyPlaceholder: "ollama (or leave blank)",
    docsUrl: "https://ollama.com",
    badge: "Offline & Private",
  },
};

export default function AiSettingsModal({
  isOpen,
  onClose,
  onConfigSaved,
}: AiSettingsModalProps) {
  const [provider, setProvider] = useState<string>("gemini");
  const [apiKey, setApiKey] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [model, setModel] = useState<string>("gemini-3.6-flash");
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    latencyMs?: number;
    message?: string;
    error?: string;
  } | null>(null);

  const statusQuery = trpc.ai.getStatus.useQuery(undefined, {
    enabled: isOpen,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (statusQuery.data) {
      const p = statusQuery.data.provider || "gemini";
      setProvider(p);
      setModel(statusQuery.data.model || PROVIDER_PRESETS[p]?.defaultModel || "gemini-3.6-flash");
      setBaseUrl(statusQuery.data.baseUrl || PROVIDER_PRESETS[p]?.baseUrl || "");
    }
  }, [statusQuery.data]);

  const updateConfig = trpc.ai.updateConfig.useMutation({
    onSuccess: (data) => {
      toast.success("AI Configuration updated successfully!");
      statusQuery.refetch();
      onConfigSaved?.();
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to save AI config: ${err.message}`);
    },
  });

  const testConnection = trpc.ai.testConnection.useMutation({
    onSuccess: (res) => {
      setTestResult(res);
      if (res.success) {
        toast.success(`Connected successfully! Latency: ${res.latencyMs}ms`);
      } else {
        toast.error(`Connection failed: ${res.error}`);
      }
    },
    onError: (err) => {
      setTestResult({ success: false, error: err.message });
      toast.error(`Connection test error: ${err.message}`);
    },
  });

  const handleProviderSelect = (key: string) => {
    setProvider(key);
    const preset = PROVIDER_PRESETS[key];
    if (preset) {
      setBaseUrl(preset.baseUrl);
      setModel(preset.defaultModel);
    }
    setTestResult(null);
  };

  const handleTestPing = () => {
    setTestResult(null);
    testConnection.mutate({
      provider: provider as any,
      apiKey: apiKey.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
      model: model.trim() || undefined,
    });
  };

  const handleSave = () => {
    updateConfig.mutate({
      provider: provider as any,
      apiKey: apiKey.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
      model: model.trim() || undefined,
    });
  };

  const currentPreset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.gemini;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden rounded-2xl border border-[#e2e8f0] shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e293b] via-[#284762] to-[#1e293b] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs border border-white/20">
                <Sparkles className="size-5 text-[#f59e0b]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Connect Large Language Model (LLM)
                </DialogTitle>
                <DialogDescription className="text-xs text-white/80">
                  Connect an LLM to analyze live CRM leads, properties, and sales pipeline
                </DialogDescription>
              </div>
            </div>
            {statusQuery.data?.hasKey ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                Active: {statusQuery.data.model}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">
                <AlertCircle className="size-3" />
                Local Heuristic Mode
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Provider Selection Grid */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
              1. Choose LLM Provider
            </Label>
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.entries(PROVIDER_PRESETS).map(([k, p]) => {
                const isSelected = provider === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleProviderSelect(k)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? "border-[#284762] bg-[#f0f4f8] ring-2 ring-[#284762]/20 shadow-xs"
                        : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#fafbfc]"
                    }`}
                  >
                    {p.badge && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#284762]/10 text-[#284762]">
                        {p.badge}
                      </span>
                    )}
                    <div className="text-lg mb-1">{p.icon}</div>
                    <span className="text-[13px] font-bold text-[#1e293b]">{p.name}</span>
                    <span className="text-[11px] text-[#64748b] truncate w-full">
                      {p.defaultModel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key & Model Details */}
          <div className="space-y-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-[#334155] flex items-center gap-1.5">
                  <Key className="size-3.5 text-[#284762]" />
                  API Key
                </Label>
                {currentPreset.docsUrl && (
                  <a
                    href={currentPreset.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-medium text-[#284762] hover:underline flex items-center gap-1"
                  >
                    Get {currentPreset.name} API Key
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  statusQuery.data?.maskedKey
                    ? `Current: ${statusQuery.data.maskedKey} (Leave blank to keep unchanged)`
                    : currentPreset.keyPlaceholder
                }
                className="bg-white border-[#cbd5e1] font-mono text-xs focus-visible:ring-[#284762]"
              />
              <p className="mt-1 text-[11px] text-[#64748b] flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-600" />
                Keys are securely held in memory and can also be defined in <code className="px-1 bg-white border rounded">.env</code>.
              </p>
            </div>

            {/* Model Selector & Presets */}
            <div>
              <Label className="text-xs font-bold text-[#334155] flex items-center gap-1.5 mb-1.5">
                <Cpu className="size-3.5 text-[#284762]" />
                Model Name
              </Label>
              <div className="flex gap-2">
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gemini-2.0-flash, gpt-4o, deepseek-chat"
                  className="bg-white border-[#cbd5e1] font-mono text-xs focus-visible:ring-[#284762]"
                />
              </div>

              {/* Quick model preset chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentPreset.models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-mono transition-all ${
                      model === m
                        ? "bg-[#284762] text-white font-semibold shadow-2xs"
                        : "bg-white border border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Base URL (Optional / Advanced) */}
            <div>
              <Label className="text-xs font-bold text-[#334155] flex items-center gap-1.5 mb-1.5">
                <Globe className="size-3.5 text-[#284762]" />
                API Endpoint Base URL
              </Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={currentPreset.baseUrl}
                className="bg-white border-[#cbd5e1] font-mono text-xs focus-visible:ring-[#284762]"
              />
            </div>
          </div>

          {/* Diagnostic Test Feedback Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                testResult.success
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                  : "border-red-200 bg-red-50/80 text-red-900"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {testResult.success
                      ? "LLM Connection Verified!"
                      : "Connection Error"}
                  </span>
                  {testResult.latencyMs && (
                    <span className="text-[10px] bg-white/70 px-1.5 py-0.5 rounded border">
                      ⏱ {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[11px] break-all">
                  {testResult.success
                    ? `Model responded: "${testResult.message}"`
                    : testResult.error}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5 flex items-center justify-between">
          <Button
            variant="outline"
            type="button"
            onClick={handleTestPing}
            disabled={testConnection.isPending}
            className="text-xs font-semibold gap-1.5 border-[#cbd5e1] hover:bg-white text-[#334155]"
          >
            {testConnection.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <Zap className="size-3.5 text-[#f59e0b]" />
                Test Ping
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              className="text-xs text-[#64748b] hover:bg-[#e2e8f0]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateConfig.isPending}
              className="text-xs font-semibold bg-[#284762] hover:bg-[#1a2c3d] text-white shadow-xs"
            >
              {updateConfig.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
