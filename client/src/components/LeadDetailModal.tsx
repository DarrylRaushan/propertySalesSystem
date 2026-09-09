import { useEffect, useState, useMemo } from "react";
import {
  ArrowUpRight,
  Box,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  History,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Sparkles,
  Target,
  UserCheck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateLeadExpectedValue,
  calculateLeadPriorityScore,
  deriveLeadPriorityTier,
  SEGMENT_MULTIPLIERS,
} from "./priorityLeadQueue";
import {
  getLeadActionLogs,
  addLeadActionLog,
  type LeadActionLog,
} from "./leadActionHistory";
import "./LeadDetailModal.css";

export type LeadSignal = {
  id: "intent" | "value" | "segment" | "urgency";
  label: string;
  score: number;
  maxScore: number;
};

export type LeadDetail = {
  id: string;
  name: string;
  initials?: string;
  priority: "High" | "Medium" | "Low";
  phone: string;
  email: string;
  location: string;
  propertyName: string;
  propertyValue: number;
  expectedValue: number;
  leadScore: number;
  priorScore?: number;
  fit: number;
  segment: string;
  primaryInsight: string;
  nextAction: string;
  signals: LeadSignal[];
};

export type LeadDetailModalProps = {
  open: boolean;
  lead: LeadDetail | null;
  onClose: () => void;
  onViewUnit?: (lead: LeadDetail) => void;
  onConfirmFollowUp?: (lead: LeadDetail) => void;
};

const moneyFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
});

function formatMoney(value: number) {
  return moneyFormatter.format(value).replace("MYR", "RM");
}

function signalIcon(id: LeadSignal["id"]) {
  const className = "ldm-signal-icon";
  switch (id) {
    case "intent":
      return <Target className={className} aria-hidden="true" />;
    case "value":
      return <CircleDollarSign className={className} aria-hidden="true" />;
    case "segment":
      return <UserRound className={className} aria-hidden="true" />;
    case "urgency":
      return <Zap className={className} aria-hidden="true" />;
  }
}

export function toLeadDetail(lead: any): LeadDetail {
  if (!lead) {
    return {
      id: "0",
      name: "Unknown Lead",
      priority: "Medium",
      phone: "-",
      email: "-",
      location: "-",
      propertyName: "-",
      propertyValue: 0,
      expectedValue: 0,
      leadScore: 0,
      fit: 0,
      segment: "Ready Buyer",
      primaryInsight: "",
      nextAction: "Follow up",
      signals: [],
    };
  }

  const numValue =
    typeof lead.propertyValue === "number"
      ? lead.propertyValue
      : typeof lead.value === "number"
      ? lead.value
      : parseFloat(String(lead.value || 0)) || 0;

  const prob =
    typeof lead.fit === "number"
      ? lead.fit
      : typeof lead.probability === "number"
      ? lead.probability
      : 75;

  const compositeScore =
    typeof lead.leadScore === "number"
      ? lead.leadScore
      : calculateLeadPriorityScore({
          probability: prob,
          value: numValue,
          segment: lead.segment,
          priority: lead.priority,
          action: lead.action || lead.nextAction,
        });

  const expValue =
    typeof lead.expectedValue === "number"
      ? lead.expectedValue
      : calculateLeadExpectedValue(numValue, prob);

  const rawPriority = (
    lead.priority ||
    deriveLeadPriorityTier({
      probability: prob,
      value: numValue,
      segment: lead.segment,
      priority: lead.priority,
      action: lead.action || lead.nextAction,
    })
  ) as string;

  const effectivePriority: "High" | "Medium" | "Low" =
    rawPriority === "High" || rawPriority === "Low" ? rawPriority : "Medium";

  const propName = lead.propertyName || lead.property || "Listed Property";
  const nextAction = lead.nextAction || lead.action || "Schedule private tour";
  const seg = lead.segment || "Ready Buyer";

  const fitScore = Math.round((prob / 100) * 45);
  const valueScore = Math.round(Math.min(numValue / 1_500_000, 1) * 30);
  const segScore = Math.round((SEGMENT_MULTIPLIERS[seg] ?? 0.6) * 15);
  const urgScore = nextAction.toLowerCase().match(/viewing|offer|yield|close|confirm|schedule|tour/)
    ? 10
    : 5;

  const signals: LeadSignal[] =
    Array.isArray(lead.signals) && lead.signals.length > 0
      ? lead.signals
      : [
          { id: "intent", label: "Purchase intent", score: fitScore, maxScore: 45 },
          { id: "value", label: "Deal value impact", score: valueScore, maxScore: 30 },
          { id: "segment", label: `Segment · ${seg}`, score: segScore, maxScore: 15 },
          { id: "urgency", label: "Action urgency", score: urgScore, maxScore: 10 },
        ];

  const primaryInsight =
    lead.primaryInsight ||
    `${lead.name} scores ${compositeScore}/100 with ${prob}% closing probability. Next recommended move is to ${nextAction.toLowerCase()}.`;

  return {
    id: String(lead.id ?? ""),
    name: lead.name || "Lead",
    initials:
      lead.initials ||
      (lead.name
        ? lead.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((p: string) => p[0]?.toUpperCase() ?? "")
            .join("")
        : "??"),
    priority: effectivePriority,
    phone: lead.phone || "+60 12-345 6789",
    email: lead.email || `${lead.name ? lead.name.toLowerCase().replace(/\s+/g, ".") : "lead"}@example.test`,
    location: lead.location || "Kuala Lumpur",
    propertyName: propName,
    propertyValue: numValue,
    expectedValue: expValue,
    leadScore: compositeScore,
    priorScore: lead.priorScore ?? Math.max(0, compositeScore - 4),
    fit: prob,
    segment: seg,
    primaryInsight,
    nextAction,
    signals,
  };
}

export function LeadDetailModal({
  open,
  lead,
  onClose,
  onViewUnit,
  onConfirmFollowUp,
}: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [historyLogs, setHistoryLogs] = useState<LeadActionLog[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Load history when lead is active
  useEffect(() => {
    if (lead) {
      const logs = getLeadActionLogs(lead.id, lead.name, lead.nextAction);
      setHistoryLogs(logs);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (!open || !lead) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, lead, onClose]);

  if (!open || !lead) return null;

  const initials =
    lead.initials ??
    lead.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const change = lead.priorScore ? lead.leadScore - lead.priorScore : null;

  const handleConfirmFollowUpAction = () => {
    // 1. Add persistent log entry
    const newLog = addLeadActionLog(
      lead.id,
      lead.nextAction,
      `Follow-up confirmed: "${lead.nextAction}" executed by Hannah Cheong. Lead moved to active follow-up stage.`,
      "Hannah Cheong",
      "viewing"
    );

    // 2. Update local state
    setHistoryLogs((prev) => [newLog, ...prev]);

    // 3. Trigger callback or toast
    if (onConfirmFollowUp) {
      onConfirmFollowUp(lead);
    } else {
      toast.success(`Action confirmed for ${lead.name}`, {
        description: `Logged: ${lead.nextAction}`,
      });
    }

    // 4. Switch to history tab to show the recorded entry
    setActiveTab("history");
  };

  const handleSaveCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const newLog = addLeadActionLog(
      lead.id,
      "Agent Interaction Note",
      newNote.trim(),
      "Hannah Cheong",
      "note"
    );

    setHistoryLogs((prev) => [newLog, ...prev]);
    setNewNote("");
    setIsAddingNote(false);
    toast.success("Note saved to timeline!");
  };

  return (
    <div
      className="ldm-backdrop"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section className="ldm-dialog" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
        {/* Header */}
        <header className="ldm-header">
          <div className="ldm-header-grid">
            <div className="ldm-identity">
              <div className="ldm-avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="ldm-person">
                <div className="ldm-name-row">
                  <h2 id="lead-modal-title">{lead.name}</h2>
                  <span className={`ldm-priority ldm-priority--${lead.priority.toLowerCase()}`}>
                    {lead.priority}
                  </span>
                </div>
                <div className="ldm-meta-row">
                  <span>
                    <Phone aria-hidden="true" />
                    {lead.phone}
                  </span>
                  <span>
                    <Mail aria-hidden="true" />
                    {lead.email}
                  </span>
                  <span>
                    <MapPin aria-hidden="true" />
                    {lead.location}
                  </span>
                  <span className="ldm-property-chip">
                    <Building2 aria-hidden="true" />
                    {lead.propertyName}
                  </span>
                </div>
              </div>
            </div>

            <div className="ldm-value-card">
              <span>Property value</span>
              <div>
                <CircleDollarSign aria-hidden="true" />
                {formatMoney(lead.propertyValue)}
              </div>
              <small>Listed unit value</small>
            </div>
          </div>
          <button className="ldm-close" type="button" onClick={onClose} aria-label="Close lead details">
            <X />
          </button>
        </header>

        {/* Navigation Tabs between Overview and Action History */}
        <div className="ldm-tab-bar">
          <button
            type="button"
            className={`ldm-tab-pill ${activeTab === "overview" ? "is-active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Sparkles className="size-3.5" />
            <span>Lead Profile & Signals</span>
          </button>

          <button
            type="button"
            className={`ldm-tab-pill ${activeTab === "history" ? "is-active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History className="size-3.5" />
            <span>Action History & Timeline</span>
            <span className="ldm-tab-count">{historyLogs.length}</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="ldm-content">
            <section className="ldm-metrics" aria-label="Lead metrics">
              <article className="ldm-metric-card">
                <strong>
                  {lead.leadScore}
                  <small>/100</small>
                </strong>
                <span>Lead score</span>
                {change !== null && (
                  <em>
                    <ArrowUpRight aria-hidden="true" />
                    {change >= 0 ? `Up from ${lead.priorScore}` : `Down from ${lead.priorScore}`} last update
                  </em>
                )}
              </article>
              <article className="ldm-metric-card">
                <strong>
                  {lead.fit}
                  <small>%</small>
                </strong>
                <span>Fit</span>
              </article>
              <article className="ldm-metric-card ldm-metric-card--value">
                <strong>{formatMoney(lead.expectedValue)}</strong>
                <span>Expected value</span>
              </article>
            </section>

            <section className="ldm-why" aria-labelledby="lead-why-title">
              <h3 id="lead-why-title">Why this lead matters</h3>
              <div className="ldm-reasons">
                <article className="ldm-reason">
                  <span className="ldm-reason-icon">
                    <ArrowUpRight />
                  </span>
                  <div>
                    <strong>{lead.fit}% closing probability</strong>
                    <small>Exceptional fit</small>
                  </div>
                </article>
                <article className="ldm-reason">
                  <span className="ldm-reason-icon">
                    <UserRound />
                  </span>
                  <div>
                    <strong>{lead.segment}</strong>
                    <small>High purchase intent</small>
                  </div>
                </article>
                <article className="ldm-reason ldm-reason--action">
                  <span className="ldm-reason-icon">
                    <CalendarDays />
                  </span>
                  <div>
                    <strong>{lead.nextAction}</strong>
                    <small>Best next step</small>
                  </div>
                </article>
              </div>
            </section>

            <section className="ldm-signals" aria-labelledby="lead-signals-title">
              <h3 id="lead-signals-title">Signal breakdown</h3>
              <div className="ldm-signal-grid">
                {lead.signals.map((signal) => {
                  const percent = Math.min(100, Math.round((signal.score / signal.maxScore) * 100));
                  return (
                    <article className="ldm-signal" key={signal.id}>
                      <span className="ldm-signal-icon-wrap">{signalIcon(signal.id)}</span>
                      <span className="ldm-signal-label">{signal.label}</span>
                      <span className="ldm-progress">
                        <i style={{ width: `${percent}%` }} />
                      </span>
                      <strong>
                        {signal.score}/{signal.maxScore}
                      </strong>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="ldm-ai-overview">
              <Sparkles aria-hidden="true" />
              <div>
                <strong>AI overview</strong>
                <p>{lead.primaryInsight || `${lead.segment} lead with ${lead.fit}% fit. ${lead.nextAction} next.`}</p>
              </div>
            </aside>
          </div>
        )}

        {/* Tab 2: Action History & Timeline */}
        {activeTab === "history" && (
          <div className="ldm-content ldm-history-content">
            {/* Quick Action / Note Input Bar */}
            <div className="ldm-history-log-box">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[#10484b] flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-[#3b7a5a]" />
                  Log Client Interaction or Note
                </span>
                {!isAddingNote && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(true)}
                    className="text-[11.5px] font-bold text-[#1c6356] hover:text-[#10484b] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="size-3.5" /> Add Note
                  </button>
                )}
              </div>

              {isAddingNote && (
                <form onSubmit={handleSaveCustomNote} className="space-y-2 mt-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={`Type notes from phone call, WhatsApp conversation, or viewing with ${lead.name}...`}
                    className="w-full p-2.5 rounded-lg border border-[#c8decb] text-[13px] bg-white focus:outline-none focus:border-[#10484b] min-h-[70px]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNote(false);
                        setNewNote("");
                      }}
                      className="px-3 py-1 rounded-md text-[12px] font-semibold border border-[#d0e0d2] text-[#557568] hover:bg-[#f0f6ee]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newNote.trim()}
                      className="px-3 py-1 rounded-md text-[12px] font-bold bg-[#10484b] text-[#d7ef73] hover:bg-[#1a3d3c] flex items-center gap-1"
                    >
                      <Send className="size-3" /> Save Log
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Chronological Timeline */}
            <div className="ldm-timeline">
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#57786d] mb-4 flex items-center gap-1.5">
                <Clock className="size-3.5" /> Chronological Activity Log
              </h4>

              {historyLogs.length === 0 ? (
                <div className="text-center py-8 text-[13px] text-[#607c72]">
                  No past actions logged yet. Click "Confirm follow-up" below to log the first interaction.
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#d8e8db]">
                  {historyLogs.map((item) => (
                    <div key={item.id} className="ldm-timeline-item relative pl-9">
                      {/* Node Bullet */}
                      <span className="absolute left-2.5 top-1.5 size-4 rounded-full bg-[#10484b] ring-4 ring-[#eaf5eb] flex items-center justify-center">
                        <CheckCircle2 className="size-2.5 text-[#d7ef73]" />
                      </span>

                      <div className="bg-[#fbfff9] border border-[#d6e8d8] rounded-xl p-3.5 shadow-xs hover:border-[#10484b] transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[13px] font-bold text-[#10484b] block">
                              {item.action}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-[#5e7e72] mt-0.5">
                              <span className="flex items-center gap-1">
                                <UserCheck className="size-3 text-[#3b7a5a]" /> {item.agentName}
                              </span>
                              <span>•</span>
                              <span>{item.formattedDate} at {item.formattedTime}</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                            {item.status}
                          </span>
                        </div>

                        {item.notes && (
                          <p className="text-[12.5px] text-[#416357] leading-relaxed mt-2 pt-2 border-t border-[#ebf4ec]">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <footer className="ldm-actions">
          <button type="button" className="ldm-button ldm-button--ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="ldm-button ldm-button--unit" onClick={() => onViewUnit?.(lead)}>
            <Box aria-hidden="true" />
            View discussed unit
          </button>
          <button
            type="button"
            className="ldm-button ldm-button--primary"
            onClick={handleConfirmFollowUpAction}
          >
            Confirm follow-up
            <ChevronRight aria-hidden="true" />
          </button>
        </footer>
      </section>
    </div>
  );
}

export default LeadDetailModal;
