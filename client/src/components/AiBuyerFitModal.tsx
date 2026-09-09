import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Sparkles,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface FitPerson {
  key: string;
  name: string;
  initials: string;
  kind: "Lead" | "Customer";
  detail: string;
  score: number;
}

interface PropertyDetails {
  name: string;
  developer: string;
  location: string;
  price: number;
  type: string;
  beds: number;
  size: string;
}

interface AiBuyerFitModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: FitPerson | null;
  property: PropertyDetails;
}

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("MYR", "RM");

export default function AiBuyerFitModal({
  isOpen,
  onClose,
  buyer,
  property,
}: AiBuyerFitModalProps) {
  const [copied, setCopied] = useState(false);

  const explainFitMutation = trpc.ai.explainFit.useMutation();

  useEffect(() => {
    if (isOpen && buyer) {
      explainFitMutation.mutate({
        buyerName: buyer.name,
        buyerKind: buyer.kind,
        buyerDetail: buyer.detail,
        buyerScore: buyer.score,
        propertyName: property.name,
        propertyDeveloper: property.developer,
        propertyLocation: property.location,
        propertyPrice: property.price,
        propertyType: property.type,
        propertyBeds: property.beds,
        propertySize: property.size,
      });
    }
  }, [isOpen, buyer?.key, property.name]);

  if (!buyer) return null;

  const handleCopyPitch = () => {
    const text = explainFitMutation.data?.summary;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden rounded-2xl border border-[#cbd5e1] shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#10484b] via-[#1a383b] to-[#10484b] p-6 text-white relative overflow-hidden">
          {/* Subtle geometric pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(215, 239, 115, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(215, 239, 115, 0.4) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#d7ef73] text-[#10484b] font-bold text-base shadow-md ring-2 ring-white/20">
                {buyer.initials}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">
                    {buyer.name}
                  </DialogTitle>
                  <span className="rounded-full bg-[#d7ef73]/20 border border-[#d7ef73]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#d7ef73]">
                    {buyer.kind} · {buyer.detail}
                  </span>
                </div>
                <DialogDescription className="text-xs text-emerald-100/80 mt-1 flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-[#d7ef73]" />
                  Matching with <strong>{property.name}</strong> ({formatRM(property.price)})
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <Sparkles className="size-3.5 text-[#d7ef73]" />
                <span className="text-sm font-black text-[#d7ef73]">
                  {buyer.score}% Match
                </span>
              </div>
              <span className="text-[10px] text-white/60 mt-0.5">
                AI Compatibility Fit
              </span>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-4">
          {explainFitMutation.isPending ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-[#10484b] shadow-inner">
                <Loader2 className="size-6 animate-spin text-[#10484b]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1e293b]">
                  Synthesizing Buyer & Property Match Intelligence…
                </p>
                <p className="text-xs text-[#64748b] max-w-sm">
                  Analyzing affordability ratios, unit bedroom configuration, and lifestyle alignment with Google Gemini.
                </p>
              </div>
            </div>
          ) : explainFitMutation.isError ? (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs">
              <p className="font-bold">Could not generate AI analysis:</p>
              <p className="mt-1">{explainFitMutation.error.message}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plain paragraph — clean and concise */}
              <p className="text-[15px] text-[#1e293b] leading-relaxed">
                {explainFitMutation.data?.summary || ""}
              </p>

              {/* Provider Info Pill */}
              <div className="flex items-center justify-between pt-3 border-t border-[#e2e8f0] text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  Grounded with live database records
                </span>
                <span className="font-mono text-[10px] bg-[#f1f5f9] px-2 py-0.5 rounded border border-[#e2e8f0]">
                  {explainFitMutation.data?.provider?.toUpperCase()} · {explainFitMutation.data?.model}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold border-[#cbd5e1] hover:bg-white text-[#475569]"
          >
            Close Overview
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleCopyPitch}
              disabled={explainFitMutation.isPending || !explainFitMutation.data?.summary}
              className="text-xs font-bold gap-1.5 bg-[#10484b] hover:bg-[#1a383b] text-[#d7ef73] shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-[#d7ef73]" />
                  Pitch Copied!
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy Summary
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
