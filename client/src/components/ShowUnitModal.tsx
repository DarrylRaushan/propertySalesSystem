import React, { useMemo } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Lightbulb,
  MapPin,
  Send,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import ModelViewer from "./ModelViewer";
import "./ShowUnitModal.css";

export type ShowUnitLeadData = {
  id?: number | string;
  name?: string;
  initials?: string;
  location?: string;
  property?: string;
  propertyName?: string;
  propertyType?: string;
  propertyValue?: number;
  value?: number | string;
  probability?: number;
  fit?: number;
  segment?: string;
  priority?: string;
  action?: string;
  nextAction?: string;
  phone?: string;
  email?: string;
  notes?: string;
  modelUrl?: string;
};

export type ShowUnitModalProps = {
  open: boolean;
  lead: ShowUnitLeadData | null;
  onClose: () => void;
  onBackToLead?: (lead: ShowUnitLeadData) => void;
  onConfirmAction?: (lead: ShowUnitLeadData) => void;
};

const moneyFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

function formatMoney(val: number) {
  return moneyFormatter.format(val).replace("MYR", "RM");
}

export function generateSuitabilityAnalysis(lead: ShowUnitLeadData) {
  const name = lead.name || "This customer";
  const propertyName = lead.propertyName || lead.property || "Selected Property";
  const location = lead.location || "Central Region";
  const segment = lead.segment || "Ready Buyer";
  const fitScore = typeof lead.fit === "number" ? lead.fit : typeof lead.probability === "number" ? lead.probability : 88;
  const rawVal = lead.propertyValue ?? lead.value ?? 950000;
  const numValue = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal)) || 950000;
  const nextAction = lead.nextAction || lead.action || "Schedule private viewing";

  const isInvestor = /investor|yield|portfolio/i.test(segment);
  const isReadyBuyer = /ready|buyer|family|urgent/i.test(segment);

  let matchTier = "Exceptional Match";
  if (fitScore < 60) matchTier = "Moderate Match";
  else if (fitScore < 80) matchTier = "High Match";

  let matchHeadline = "";
  let reasons: Array<{
    icon: "target" | "dollar" | "location" | "zap";
    label: string;
    value: string;
    sub: string;
  }> = [];
  let suggestedAngle = "";

  if (isInvestor) {
    matchHeadline = `High-yield capital growth match for ${name}`;
    reasons = [
      {
        icon: "dollar",
        label: "Expected Yield",
        value: "5.4% - 6.2%",
        sub: `Fits ${name}'s cashflow target at ${formatMoney(numValue)}`,
      },
      {
        icon: "location",
        label: "Rental Velocity",
        value: "92% Occupancy",
        sub: `High tenant demand corridor in ${location}`,
      },
      {
        icon: "zap",
        label: "Closing Score",
        value: `${fitScore}% Fit`,
        sub: "Strong sensitivity to rental comps & yields",
      },
    ];
    suggestedAngle = "Highlight projected 5-year capital appreciation & rental comps.";
  } else if (isReadyBuyer) {
    matchHeadline = `Turnkey & lifestyle alignment for ${name}`;
    reasons = [
      {
        icon: "dollar",
        label: "Budget Index",
        value: formatMoney(numValue),
        sub: "Within pre-qualified bank financing range",
      },
      {
        icon: "location",
        label: "Location Fit",
        value: location,
        sub: "Direct match to primary commute criteria",
      },
      {
        icon: "target",
        label: "Timeline",
        value: "14–30 Days",
        sub: "High intent ready for immediate viewing",
      },
    ];
    suggestedAngle = "Focus on floor layout practicality and developer packages.";
  } else {
    matchHeadline = `Curated high-value listing for ${name}`;
    reasons = [
      {
        icon: "dollar",
        label: "Price Band",
        value: formatMoney(numValue),
        sub: "Top value-for-money candidate in watchlist",
      },
      {
        icon: "location",
        label: "Growth Hub",
        value: location,
        sub: "High-demand sector with infrastructure upside",
      },
      {
        icon: "target",
        label: "Match Rate",
        value: `${fitScore}% AI Fit`,
        sub: `Next move: "${nextAction}"`,
      },
    ];
    suggestedAngle = `Deliver tailored loan estimate & comparison for ${location}.`;
  }

  return {
    matchScore: Math.max(fitScore, 70),
    matchTier,
    matchHeadline,
    reasons,
    suggestedAngle,
    nextAction,
    formattedValue: formatMoney(numValue),
  };
}

export function ShowUnitModal({
  open,
  lead,
  onClose,
  onBackToLead,
  onConfirmAction,
}: ShowUnitModalProps) {
  if (!open || !lead) return null;

  const propertyName = lead.propertyName || lead.property || "Selected Property";
  const propertyType = lead.propertyType || lead.property || "Show Unit";
  const analysis = useMemo(() => generateSuitabilityAnalysis(lead), [lead]);

  const initials =
    lead.initials ||
    (lead.name
      ? lead.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("")
      : "CU");

  return (
    <div
      className="sum-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="sum-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sum-title"
      >
        {/* Header with signature lush green gradient */}
        <header className="sum-header">
          <div className="sum-header-main">
            <div className="sum-header-title-wrap">
              <div className="sum-header-badge">
                <Building2 aria-hidden="true" />
                <span>3D Show Unit Experience</span>
              </div>
              <h2 id="sum-title">{propertyName}</h2>
              <div className="sum-header-meta">
                <span className="sum-lead-pill">
                  <span className="sum-lead-avatar">{initials}</span>
                  <b>{lead.name}</b>
                </span>
                <span className="sum-meta-item">
                  <MapPin aria-hidden="true" />
                  {lead.location || "Malaysia"}
                </span>
                {lead.segment && (
                  <span className="sum-segment-badge">{lead.segment}</span>
                )}
              </div>
            </div>

            <div className="sum-header-pricing">
              <span className="sum-price-label">Listed unit value</span>
              <div className="sum-price-val">
                <CircleDollarSign aria-hidden="true" />
                {analysis.formattedValue}
              </div>
              <span className="sum-price-sub">Interactive spatial walkthrough</span>
            </div>
          </div>

          <button
            type="button"
            className="sum-close-btn"
            onClick={onClose}
            aria-label="Close show unit modal"
          >
            <X />
          </button>
        </header>

        {/* 2-Column Split: 3D Model on Left, Concise AI Info on Right */}
        <div className="sum-split-body">
          {/* Left Column: 3D Model Viewer */}
          <div className="sum-viewer-pane">
            <ModelViewer
              propertyName={propertyName}
              propertyType={propertyType}
              modelUrl={lead.modelUrl}
            />
          </div>

          {/* Right Column: Clean, Concise AI Suitability Cards (NO wall of text) */}
          <section className="sum-ai-pane" aria-labelledby="sum-ai-title">
            <div className="sum-ai-header">
              <div className="sum-ai-header-left">
                <span className="sum-ai-icon-bubble">
                  <Sparkles aria-hidden="true" />
                </span>
                <div>
                  <h3 id="sum-ai-title">AI Property Match</h3>
                  <p>{analysis.matchHeadline}</p>
                </div>
              </div>
              <div className="sum-ai-score-pill">
                <Target aria-hidden="true" />
                <b>{analysis.matchScore}%</b>
                <span>{analysis.matchTier}</span>
              </div>
            </div>

            {/* 3 Quick Metric / Suitability Cards */}
            <div className="sum-metric-cards">
              {analysis.reasons.map((r, i) => (
                <article className="sum-metric-card" key={i}>
                  <span className="sum-metric-icon">
                    {r.icon === "dollar" ? (
                      <CircleDollarSign aria-hidden="true" />
                    ) : r.icon === "location" ? (
                      <MapPin aria-hidden="true" />
                    ) : (
                      <Target aria-hidden="true" />
                    )}
                  </span>
                  <div className="sum-metric-info">
                    <span className="sum-metric-label">{r.label}</span>
                    <strong className="sum-metric-val">{r.value}</strong>
                    <small className="sum-metric-sub">{r.sub}</small>
                  </div>
                </article>
              ))}
            </div>

            {/* Recommended Pitch Angle */}
            <div className="sum-ai-angle-bar">
              <span className="sum-angle-badge">
                <Lightbulb aria-hidden="true" /> Pitch Angle
              </span>
              <p>{analysis.suggestedAngle}</p>
            </div>
          </section>
        </div>

        {/* Footer Actions Bar */}
        <footer className="sum-footer">
          {onBackToLead && (
            <button
              type="button"
              className="sum-btn sum-btn--ghost"
              onClick={() => onBackToLead(lead)}
            >
              <ArrowLeft aria-hidden="true" />
              Back to lead
            </button>
          )}

          <button
            type="button"
            className="sum-btn sum-btn--outline"
            onClick={() => {
              navigator.clipboard?.writeText?.(
                `${window.location.origin}/properties?highlight=${encodeURIComponent(propertyName)}`
              );
              toast.success(`3D show unit link copied for ${lead.name}`, {
                description: `Shared link to ${propertyName}`,
              });
            }}
          >
            <Share2 aria-hidden="true" />
            Share 3D link
          </button>

          <button
            type="button"
            className="sum-btn sum-btn--primary"
            onClick={() => {
              if (onConfirmAction) {
                onConfirmAction(lead);
              } else {
                toast.success(`Action confirmed for ${lead.name}`, {
                  description: `${analysis.nextAction} scheduled.`,
                });
                onClose();
              }
            }}
          >
            <CheckCircle2 aria-hidden="true" />
            <span>Confirm: {analysis.nextAction}</span>
            <ChevronRight aria-hidden="true" />
          </button>
        </footer>
      </section>
    </div>
  );
}

export default ShowUnitModal;
