import React from "react";
import { Sparkles, ArrowRight, Check, Copy, UserCheck, Flame, PhoneCall, ExternalLink, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";

export interface DecisionSpec {
  title: string;
  recommendations?: Array<{
    leadId?: number;
    name?: string;
    property?: string;
    value?: string;
    probability?: string;
    action?: string;
    urgency?: "Critical" | "High" | "Medium" | "Normal";
    idealBuyer?: string;
    price?: string;
    status?: string;
    type?: string;
  }>;
  quickActions?: Array<{
    label: string;
    target: string;
    type?: string;
  }>;
}

export const AIDecisionCard: React.FC<{ decision: DecisionSpec; onCloseParent?: () => void }> = ({
  decision,
  onCloseParent,
}) => {
  const [, setLocation] = useLocation();
  const [copiedPitchIndex, setCopiedPitchIndex] = React.useState<number | null>(null);

  const handleNavigate = (target: string) => {
    setLocation(target);
    if (onCloseParent) {
      // Optional: keep assistant open or close based on preference
    }
  };

  const handleCopyPitch = (rec: any, index: number) => {
    const leadName = rec.name ? rec.name.split(" ")[0] : "Client";
    const propName = rec.property || "our prime listing";
    const pitchText = `Hi ${leadName}, following up regarding your interest in ${propName}. We have just received an exclusive priority unit release this week with special developer incentives. Would you be free for a 10-minute viewing discussion today?`;
    navigator.clipboard.writeText(pitchText);
    setCopiedPitchIndex(index);
    toast.success(`Copied tailored pitch for ${leadName} to clipboard!`);
    setTimeout(() => setCopiedPitchIndex(null), 2500);
  };

  return (
    <div className="ai-decision-card my-3 overflow-hidden rounded-xl border border-[#e2e8f0] bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] p-3.5 shadow-sm">
      {/* Card Header */}
      <div className="mb-2.5 flex items-center justify-between border-b border-[#e2e8f0] pb-2">
        <div className="flex items-center gap-1.5">
          <div className="flex size-5 items-center justify-center rounded-full bg-[#a9752e] text-white">
            <Sparkles className="size-3" />
          </div>
          <h4 className="text-[14px] font-bold text-[#1e293b]">{decision.title}</h4>
        </div>
        <span className="rounded-full bg-[#e2e8f0] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
          AI Decision Engine
        </span>
      </div>

      {/* Recommendations List */}
      {decision.recommendations && decision.recommendations.length > 0 && (
        <div className="space-y-2">
          {decision.recommendations.map((rec, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#e2e8f0] bg-white p-2.5 shadow-xs transition-all hover:border-[#cbd5e1]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {rec.name && <span className="text-[13px] font-bold text-[#0f172a]">{rec.name}</span>}
                    {rec.urgency && (
                      <span
                        className={`flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[11px] font-bold ${
                          rec.urgency === "Critical"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <Flame className="size-2.5" />
                        {rec.urgency}
                      </span>
                    )}
                  </div>

                  {rec.property && (
                    <p className="text-[13px] text-[#475569] flex items-center gap-1.5">
                      <Building2 size={13} className="text-[#64748b] shrink-0" />
                      <span className="font-medium">{rec.property}</span>
                      {rec.value && <span className="text-[#64748b]"> • Deal: {rec.value}</span>}
                      {rec.probability && (
                        <span className="font-semibold text-emerald-600"> ({rec.probability} Prob)</span>
                      )}
                    </p>
                  )}

                  {rec.idealBuyer && (
                    <p className="text-[12px] text-[#64748b]">Target: {rec.idealBuyer}</p>
                  )}

                  {rec.action && (
                    <p className="mt-1 text-[13px] font-medium text-[#1e293b] flex items-center gap-1.5">
                      <ArrowRight size={13} className="text-[#2563eb] shrink-0" />
                      <span className="text-[#0f172a]">{rec.action}</span>
                    </p>
                  )}
                </div>

                {/* Quick Pitch Copy Button */}
                {rec.name && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPitch(rec, i)}
                    className="h-6 shrink-0 gap-1 border-[#cbd5e1] text-[12px] font-medium text-[#334155] hover:bg-[#f1f5f9]"
                  >
                    {copiedPitchIndex === i ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-[#64748b]" />
                        <span>Copy Pitch</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Action Navigation Buttons */}
      {decision.quickActions && decision.quickActions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#e2e8f0] pt-2">
          {decision.quickActions.map((qa, idx) => (
            <button
              key={idx}
              onClick={() => handleNavigate(qa.target)}
              className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[13px] font-semibold text-[#284762] border border-[#cbd5e1] shadow-2xs hover:bg-[#f8fafc] hover:border-[#94a3b8] transition-all"
            >
              <span>{qa.label}</span>
              <ArrowRight className="size-3 text-[#64748b]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIDecisionCard;
