// Quiet Command Center style: editorial Swiss modernism, navy + warm paper, signal lime accents, action-first hierarchy.
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  Box,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  Info,
  Maximize2,
  MoreHorizontal,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import ModelViewer from "@/components/ModelViewer";
import LeadProfileModal from "@/components/LeadProfileModal";
import ShowUnitModal from "@/components/ShowUnitModal";
import { LineChart } from "@/components/charts/line-chart";
import { Line } from "@/components/charts/line";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { LineSeriesTerminalMarker } from "@/components/charts/line-series-terminal-marker";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import NewLeadModal from "@/components/NewLeadModal";
import {
  hasMoreLeadPages,
  initialLeadCount,
  nextLeadCount,
  calculateLeadExpectedValue,
  calculateLeadPriorityScore,
  deriveLeadPriorityTier,
  sortPriorityLeads,
  type LeadSortOption,
} from "./priorityLeadQueue";
import { getPipelineStageMetrics } from "./pipelineHealth";
import { useAuth } from "@/contexts/AuthContext";
import AgentHeader from "@/components/AgentHeader";
import "./CompactDashboard.css";
import "./DashboardTerrainTheme.css";

type Lead = {
  id: number;
  initials: string;
  name: string;
  location: string;
  probability: number;
  value: number;
  segment: string;
  priority: string;
  action: string;
  property: string;
  accent: string;
};
type FunnelItem = { stage: string; value: number; color: string };
type SourceItem = { label: string; value: number; color: string; note?: string };
type TrendItem = { month: string; value: number };
type RevenueCommissionItem = { month: string; revenue: number; commission: number };
type PerformanceMixItem = { month: string; bookings: number; revenue: number; runRate: number };
type Viewing = {
  id: number;
  propertyTitle: string;
  propertyLocation: string;
  agentName: string;
  date: string;
  timeSlot: string;
  status: string;
  customerName?: string;
};

export type CompactDashboardProps = {
  leads: Lead[];
  viewings?: Viewing[];
  trendData: TrendItem[];
  funnelData: FunnelItem[];
  sourceData: SourceItem[];
  priorityData: { label: string; value: number; color: string }[];
  totalLeads: number;
  highPriority: number;
  activeProperties: number;
  expectedSalesValue: number;
  scheduledHealth: number;
  contactedHealth: number;
  search: string;
  setSearch: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  segmentFilter: string;
  setSegmentFilter: (value: string) => void;
  onOpenAnalytics: () => void;
  period: string;
  onPeriodChange: (period: string) => void;
};

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("MYR", "RM");

const formatMillion = (value: number) =>
  `RM ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;

function FitRing({ value }: { value: number }) {
  const ringColor = value >= 80 ? "#2f7e59" : value >= 65 ? "#b88728" : "#5d7889";
  const trackColor = value >= 80 ? "#e2f0e7" : value >= 65 ? "#fbf3e2" : "#e5ecf0";
  return (
    <div
      className="fit-ring"
      style={{
        background: `conic-gradient(${ringColor} ${value * 3.6}deg, ${trackColor} 0deg)`,
      }}
    >
      <div>
        <strong style={{ color: ringColor }}>{value}%</strong>
        <small>fit</small>
      </div>
    </div>
  );
}

function CompactDonut({ data }: { data: SourceItem[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let accumulated = 0;
  const gradientStops = data
    .map((item) => {
      const start = (accumulated / total) * 360;
      accumulated += item.value;
      const end = (accumulated / total) * 360;
      return `${item.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div
      className="compact-donut"
      style={{ background: `conic-gradient(${gradientStops})` }}
      role="img"
      aria-label="Acquisition source mix donut chart"
    >
      <div>
        <strong>{total}</strong>
        <span>Enquiries</span>
      </div>
    </div>
  );
}

function PriorityRow({
  lead,
  expanded,
  selected,
  onToggle,
  onFocus,
  onOpenViewer,
  onOpenProfile,
}: {
  lead: Lead;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onOpenViewer: () => void;
  onOpenProfile: () => void;
}) {
  const expectedValue = calculateLeadExpectedValue(lead.value, lead.probability);
  const priorityScore = calculateLeadPriorityScore(lead);
  const effectivePriority = lead.priority || deriveLeadPriorityTier(lead);
  const priorityClass = effectivePriority.toLowerCase();

  return (
    <div
      className={`compact-priority-row ${expanded ? "is-expanded" : ""} ${
        selected ? "is-selected" : ""
      }`}
    >
      <button
        className="compact-priority-main"
        onClick={onToggle}
        onFocus={onFocus}
        aria-expanded={expanded}
      >
        <FitRing value={lead.probability} />
        <div className="compact-priority-copy">
          <div className="compact-priority-title">
            <strong>{lead.name}</strong>
            <span className={`priority-tag priority-${priorityClass}`}>{effectivePriority}</span>
            <small className="priority-score-badge" title={`Composite Intent Score: ${priorityScore}/100`}>
              Score {priorityScore}
            </small>
          </div>
          <p>
            {lead.location} <i /> {lead.property}
          </p>
          <div className="compact-progress">
            <span style={{ width: `${Math.min(lead.probability, 100)}%` }} />
          </div>
        </div>
        <div className="compact-priority-value">
          <strong>{formatRM(lead.value)}</strong>
          <small>{lead.segment}</small>
          <em title="Probability-weighted expected pipeline value">Exp: {formatRM(expectedValue)}</em>
        </div>
        <ChevronDown size={15} className="compact-chevron" />
      </button>
      {expanded && (
        <div className="compact-priority-detail">
          <div className="compact-priority-detail-meta">
            <span>
              <Check size={13} /> Next move: <b>{lead.action}</b>
            </span>
            <span className="compact-priority-score-detail">
              <Zap size={11} /> High-intent fit: <b>{lead.probability}%</b> · Expected: <b>{formatRM(expectedValue)}</b>
            </span>
          </div>
          <div className="compact-priority-actions">
            <button
              onClick={onOpenProfile}
              className="text-[#10484b] hover:text-[#234d4d]"
              title="Inspect lead profile & rating breakdown"
            >
              Profile & Rating <Info size={13} />
            </button>
            <button
              onClick={() =>
                toast.success(`${lead.action} opened`, {
                  description: lead.name,
                })
              }
            >
              Open action <ArrowUpRight size={13} />
            </button>
            <button onClick={onOpenViewer}>
              3D show unit <Box size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityLeadList({
  leads,
  sortBy = "priority",
  expanded,
  onExpandedChange,
  onOpenViewer,
  onOpenProfile,
}: {
  leads: Lead[];
  sortBy?: LeadSortOption;
  expanded: number | null;
  onExpandedChange: (leadId: number | null) => void;
  onOpenViewer: (lead: Lead) => void;
  onOpenProfile: (lead: Lead) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const loadTimeoutRef = useRef<number | undefined>(undefined);
  const loadingRef = useRef(false);
  const sortedLeads = useMemo(() => sortPriorityLeads(leads, sortBy), [leads, sortBy]);
  const [loadedCount, setLoadedCount] = useState(() => initialLeadCount(sortedLeads.length));
  const [selectedId, setSelectedId] = useState<number | null>(sortedLeads[0]?.id ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(0);
  const renderedLeads = useMemo(() => sortedLeads.slice(0, loadedCount), [sortedLeads, loadedCount]);
  const canLoadMore = hasMoreLeadPages(loadedCount, sortedLeads.length);

  useEffect(() => {
    setLoadedCount(initialLeadCount(sortedLeads.length));
    setSelectedId(sortedLeads[0]?.id ?? null);
    setTopGradientOpacity(0);
    setBottomGradientOpacity(0);
  }, [sortedLeads]);

  useEffect(() => () => {
    if (loadTimeoutRef.current !== undefined) window.clearTimeout(loadTimeoutRef.current);
  }, []);

  const loadMore = useCallback(() => {
    if (!canLoadMore || loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    loadTimeoutRef.current = window.setTimeout(() => {
      setLoadedCount((current) => nextLeadCount(current, leads.length));
      setIsLoading(false);
      loadingRef.current = false;
    }, 220);
  }, [canLoadMore, leads.length]);

  const focusLead = useCallback((leadId: number) => {
    setSelectedId(leadId);
    window.requestAnimationFrame(() =>
      document
        .querySelector(`[data-priority-lead-id="${leadId}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
  }, []);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      const remaining = Math.max(scrollHeight - (scrollTop + clientHeight), 0);
      setTopGradientOpacity(Math.min(scrollTop / 34, 1));
      setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(remaining / 42, 1));
      if (remaining < 38) loadMore();
    },
    [loadMore]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!renderedLeads.length) return;
    const currentIndex = Math.max(
      renderedLeads.findIndex((lead) => lead.id === selectedId),
      0
    );
    if (event.key === "Enter") {
      event.preventDefault();
      const activeLead = renderedLeads[currentIndex];
      if (activeLead) onExpandedChange(expanded === activeLead.id ? null : activeLead.id);
      return;
    }
    const targetIndex =
      event.key === "ArrowDown"
        ? Math.min(currentIndex + 1, renderedLeads.length - 1)
        : event.key === "ArrowUp"
        ? Math.max(currentIndex - 1, 0)
        : event.key === "Home"
        ? 0
        : event.key === "End"
        ? renderedLeads.length - 1
        : null;
    if (targetIndex === null) return;
    event.preventDefault();
    const targetLead = renderedLeads[targetIndex];
    if (targetLead) focusLead(targetLead.id);
  };

  return (
    <div className="priority-queue-shell">
      <div
        ref={listRef}
        className="compact-priority-list priority-queue"
        role="listbox"
        tabIndex={0}
        aria-label={`Priority leads queue, ${leads.length} available`}
        aria-activedescendant={selectedId ? `priority-lead-${selectedId}` : undefined}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
      >
        {renderedLeads.map((lead, index) => (
          <motion.div
            id={`priority-lead-${lead.id}`}
            data-priority-lead-id={lead.id}
            className="priority-queue-item"
            key={lead.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index, 4) * 0.035 }}
          >
            <PriorityRow
              lead={lead}
              expanded={expanded === lead.id}
              selected={selectedId === lead.id}
              onToggle={() => {
                setSelectedId(lead.id);
                onExpandedChange(expanded === lead.id ? null : lead.id);
              }}
              onFocus={() => setSelectedId(lead.id)}
              onOpenViewer={() => onOpenViewer(lead)}
              onOpenProfile={() => onOpenProfile(lead)}
            />
          </motion.div>
        ))}
        {canLoadMore && (
          <div className="priority-queue-sentinel" aria-hidden="true">
            {isLoading ? "Loading next leads…" : "Scroll to load more leads"}
          </div>
        )}
        {!canLoadMore && renderedLeads.length > 0 && (
          <div className="priority-queue-sentinel is-complete" aria-live="polite">
            All matching leads in queue
          </div>
        )}
        {renderedLeads.length === 0 && (
          <div className="compact-empty">No leads match those filters.</div>
        )}
      </div>
      <div
        className="priority-queue-gradient priority-queue-gradient-top"
        style={{ opacity: topGradientOpacity }}
        aria-hidden="true"
      />
      <div
        className="priority-queue-gradient priority-queue-gradient-bottom"
        style={{ opacity: bottomGradientOpacity }}
        aria-hidden="true"
      />
    </div>
  );
}

function ExperienceDialog({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="compact-experience-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.section
        className="compact-experience-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button className="compact-icon-button" onClick={onClose} aria-label={`Close ${title}`}>
            <X size={16} />
          </button>
        </header>
        {children}
      </motion.section>
    </motion.div>
  );
}

// ── Confirmed Tours Strip ─────────────────────────────────────────────────────
// Renders customer-booked viewings inside the agent's lead pipeline card.
function ConfirmedToursStrip({ viewings }: { viewings: Viewing[] }) {
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
    } catch {
      return date;
    }
  };

  const statusStyle = (status: string) => {
    if (status === "Confirmed")  return { dot: "#22c55e", bg: "#f0fdf4", text: "#15803d" };
    if (status === "Cancelled")  return { dot: "#ef4444", bg: "#fef2f2", text: "#b91c1c" };
    return { dot: "#f59e0b", bg: "#fffbeb", text: "#b45309" };
  };

  return (
    <div style={{
      margin: "0 0 12px 0",
      border: "1.5px solid #d7ef73",
      borderRadius: 12,
      overflow: "hidden",
      background: "#f8fdf2",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 12px 7px",
        borderBottom: "1px solid #e6f0c6",
        background: "#f0f9e0",
      }}>
        <CalendarCheck size={13} color="#4a7a28" />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#4a7a28", textTransform: "uppercase" }}>
          Confirmed Tours · {viewings.filter(v => v.status === "Confirmed").length} upcoming
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {viewings.slice(0, 5).map((v, i) => {
          const s = statusStyle(v.status);
          const isCancelled = v.status === "Cancelled";
          return (
            <div
              key={v.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 12px",
                borderTop: i === 0 ? "none" : "1px solid #edf3e0",
                opacity: isCancelled ? 0.55 : 1,
                transition: "background 0.15s",
              }}
            >
              {/* Status dot */}
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: s.dot, flexShrink: 0,
              }} />
              {/* Date + time */}
              <span style={{ fontSize: 11, fontWeight: 700, color: "#365924", minWidth: 64, flexShrink: 0 }}>
                {formatDate(v.date)} · {v.timeSlot}
              </span>
              {/* Property */}
              <span style={{ fontSize: 11, color: "#46622e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {v.propertyTitle}
              </span>
              {/* Customer */}
              {v.customerName && (
                <span style={{ fontSize: 11, color: "#7a9960", flexShrink: 0, marginLeft: 4 }}>
                  {v.customerName}
                </span>
              )}
              {/* Status badge */}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 7px",
                borderRadius: 6, background: s.bg, color: s.text, flexShrink: 0,
              }}>
                {v.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineProgressLegend({ data }: { data: FunnelItem[] }) {
  const [activeIndex, setActiveIndex] = useState(1);
  const stages = data.slice(0, 4);
  const max = Math.max(...stages.map((item) => item.value), 1);
  const active = getPipelineStageMetrics(stages, activeIndex);
  const activeLabel = active.item?.stage || "Pipeline";
  const insight = active.previous
    ? `${active.progressionFromPrevious}% of ${active.previous.stage.toLowerCase()} progressed to ${activeLabel.toLowerCase()}.`
    : `${active.item?.value || 0} enquiries establish the current pipeline base.`;

  return (
    <div className="pipeline-progress-legend">
      <div className="pipeline-progress-heading">
        <span>Stage contribution</span>
        <b>{stages[0]?.value || 0} total enquiries</b>
      </div>
      <div className="pipeline-progress-items" onMouseLeave={() => setActiveIndex(1)}>
        {stages.map((item, index) => {
          const metrics = getPipelineStageMetrics(stages, index);
          const isActive = activeIndex === index;
          return (
            <button
              type="button"
              key={item.stage}
              className={isActive ? "is-active" : ""}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
              aria-pressed={isActive}
            >
              <div className="pipeline-progress-row">
                <i style={{ background: item.color }} />
                <span>
                  <b>{item.stage}</b>
                  <small>
                    {index === 0
                      ? "Pipeline base"
                      : `${metrics.progressionFromPrevious}% from previous`}
                  </small>
                </span>
                <strong>
                  {item.value}
                  <em>{metrics.shareOfPipeline}%</em>
                </strong>
              </div>
              <div className="pipeline-progress-track">
                <motion.span
                  style={{ background: item.color }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: item.value / max }}
                  transition={{
                    duration: 0.42,
                    delay: index * 0.05,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <div className="pipeline-progress-insight">
        <Target size={14} />
        <p>
          <b>{activeLabel} focus</b>
          {insight}
        </p>
      </div>
    </div>
  );
}

function PipelineHealthDeepDive({
  data,
  onOpenAnalytics,
}: {
  data: FunnelItem[];
  onOpenAnalytics: () => void;
}) {
  const base = Math.max(data[0]?.value || 0, 1);
  const qualified = data[1]?.value || 0;
  const bookings = data[2]?.value || 0;
  return (
    <div className="pipeline-deep-dive">
      <div className="pipeline-deep-dive-summary">
        <div>
          <span>Conversion snapshot</span>
          <strong>{Math.round((qualified / base) * 100)}%</strong>
          <small>enquiry to qualified</small>
        </div>
        <div>
          <span>Booking progression</span>
          <strong>{qualified ? Math.round((bookings / qualified) * 100) : 0}%</strong>
          <small>qualified to booking</small>
        </div>
        <button className="compact-compare-button" onClick={onOpenAnalytics}>
          <ArrowUpRight size={14} /> Open analytics
        </button>
      </div>
      <PipelineProgressLegend data={data} />
      <p className="pipeline-deep-dive-caption">
        Select a stage to compare its volume with the opening enquiry base and see the progression from the prior stage.
      </p>
    </div>
  );
}

function InteractiveSourceMix({ data, compact = false }: { data: SourceItem[]; compact?: boolean }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const active = hoveredIndex === null ? null : data[hoveredIndex];

  if (compact) {
    const pieSize = 96;
    const innerRadius = 30;
    const topSource = [...data].sort((a, b) => b.value - a.value)[0];

    return (
      <div className="perf-source-compact-layout" onMouseLeave={() => setHoveredIndex(null)}>
        {/* Top visual card: Donut chart + quick metrics */}
        <div className="perf-source-top-card">
          <div className="perf-source-pie-box">
            <PieChart
              data={data}
              size={pieSize}
              innerRadius={innerRadius}
              padAngle={0.038}
              cornerRadius={4}
              hoveredIndex={hoveredIndex}
              onHoverChange={setHoveredIndex}
              hoverOffset={5}
            >
              {data.map((item, index) => (
                <PieSlice key={item.label} index={index} hoverEffect="grow" hoverOffset={5} showGlow />
              ))}
              <PieCenter defaultLabel="Total" className="source-mix-pie-center">
                {({ value, label }) => (
                  <div className="perf-source-pie-center">
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>

          <div className="perf-source-top-meta">
            <div className="perf-source-meta-row">
              <span className="perf-source-meta-label">Total volume</span>
              <strong className="perf-source-meta-val">{total} leads</strong>
            </div>
            <div className="perf-source-meta-row">
              <span className="perf-source-meta-label">Top channel</span>
              <div className="perf-source-meta-pill">
                <i style={{ background: topSource?.color || "#287462" }} />
                <span>{topSource ? topSource.label.replace(" enquiries", "").replace(" campaigns", "") : "—"}</span>
                <b>{topSource ? `${Math.round((topSource.value / total) * 100)}%` : ""}</b>
              </div>
            </div>
          </div>
        </div>

        {/* 2x2 Grid of source cards */}
        <div className="perf-source-grid">
          {data.map((item, index) => {
            const percentage = Math.round((item.value / total) * 100);
            const isActive = hoveredIndex === index;
            return (
              <button
                key={item.label}
                type="button"
                className={`perf-source-tile ${isActive ? "is-active" : ""}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
              >
                <div className="perf-source-tile-title">
                  <i style={{ background: item.color }} />
                  <span title={item.label}>{item.label}</span>
                </div>
                <div className="perf-source-tile-metric">
                  <strong className="perf-source-tile-pct">{percentage}%</strong>
                  <span className="perf-source-tile-val">{item.value} leads</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Channel insight callout matching Card 3 */}
        <div className="perf-source-callout">
          <Sparkles size={13} className="perf-source-callout-icon" />
          <p>
            {active ? (
              <>
                <strong>{active.label}</strong>: {active.value} leads ({Math.round((active.value / total) * 100)}%)
              </>
            ) : (
              <>
                <strong>Channel mix</strong>: Healthy distribution across owned and partner sources
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  const pieSize = 260;
  const innerRadius = 78;

  return (
    <div className="source-mix-deep-dive">
      <div className="source-mix-pie-panel">
        <PieChart
          data={data}
          size={pieSize}
          innerRadius={innerRadius}
          padAngle={0.032}
          cornerRadius={6}
          hoveredIndex={hoveredIndex}
          onHoverChange={setHoveredIndex}
          hoverOffset={9}
        >
          {data.map((item, index) => (
            <PieSlice key={item.label} index={index} hoverEffect="grow" hoverOffset={8} showGlow />
          ))}
          <PieCenter defaultLabel="Enquiries" className="source-mix-pie-center">
            {({ value, label }) => (
              <div className="source-mix-pie-center-content">
                <strong>{value}</strong>
                <span>{label}</span>
                <small>{Math.round(((value || 0) / total) * 100)}% of enquiries</small>
              </div>
            )}
          </PieCenter>
        </PieChart>
        <p>
          {active
            ? `${active.label} is selected. Use the legend to compare source contribution.`
            : "Hover a slice or source to inspect its contribution."}
        </p>
      </div>
      <div className="source-mix-interactive-legend" onMouseLeave={() => setHoveredIndex(null)}>
        <div className="source-mix-legend-heading">
          <span>Acquisition sources</span>
          <b>{total} total</b>
        </div>
        {data.map((item, index) => {
          const percentage = Math.round((item.value / total) * 100);
          const isActive = hoveredIndex === index;
          return (
            <button
              key={item.label}
              className={isActive ? "is-active" : ""}
              onMouseEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
              onClick={() => setHoveredIndex(index)}
            >
              <i style={{ background: item.color }} />
              <span>
                <b>{item.label}</b>
                <small>{item.note || "Active source"}</small>
              </span>
              <strong>{percentage}%</strong>
              <em>{item.value}</em>
            </button>
          );
        })}
        <div className="source-mix-insight">
          <Sparkles size={15} />
          <p>
            <b>{active ? `${active.label} contribution` : "Channel insight"}</b>
            {active
              ? ` generated ${active.value} enquiries in the selected period.`
              : " Source mix is spread across owned, partner, and paid discovery channels."}
          </p>
        </div>
      </div>
    </div>
  );
}

function AnimatedRevenueBars({ data }: { data: RevenueCommissionItem[] }) {
  const max = Math.max(...data.map((item) => item.revenue), 1);
  return (
    <div className="compact-bar-frame">
      <div className="compact-bar-legend">
        <span>
          <i className="revenue" /> Revenue
        </span>
        <span>
          <i className="commission" /> Commission
        </span>
      </div>
      <div
        className="compact-bar-chart"
        role="img"
        aria-label="Animated monthly revenue versus commission bar chart"
      >
        {data.map((item, index) => (
          <div className="compact-bar-group" key={item.month}>
            <div className="compact-bar-values">
              <span>{formatMillion(item.revenue)}</span>
              <b>{formatMillion(item.commission)}</b>
            </div>
            <div className="compact-bar-columns">
              <motion.div
                className="compact-bar revenue"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((item.revenue / max) * 100, 5)}%` }}
                transition={{ type: "spring", stiffness: 115, damping: 18, delay: index * 0.055 }}
              />
              <motion.div
                className="compact-bar commission"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((item.commission / max) * 100, 4)}%` }}
                transition={{
                  type: "spring",
                  stiffness: 115,
                  damping: 18,
                  delay: 0.12 + index * 0.055,
                }}
              />
            </div>
            <span className="compact-bar-label">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceMixChart({ data }: { data: PerformanceMixItem[] }) {
  const width = 760;
  const height = 330;
  const left = 42;
  const right = 18;
  const top = 22;
  const bottom = 34;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const max =
    Math.max(...data.flatMap((item) => [item.bookings, item.revenue, item.runRate]), 1) * 1.08;
  const xFor = (index: number) => left + (index / Math.max(data.length - 1, 1)) * innerWidth;
  const yFor = (value: number) => top + ((max - value) / max) * innerHeight;
  const linePath = data
    .map((item, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(item.revenue)}`)
    .join(" ");
  const areaPath = `${data
    .map((item, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(item.runRate)}`)
    .join(" ")} L ${xFor(data.length - 1)} ${top + innerHeight} L ${xFor(0)} ${
    top + innerHeight
  } Z`;
  const barWidth = Math.min(30, (innerWidth / Math.max(data.length, 1)) * 0.48);
  const latest = data.at(-1);

  return (
    <div className="compact-performance-frame">
      <div className="compact-performance-legend">
        <span>
          <i className="bookings" /> Booked sales
        </span>
        <span>
          <i className="revenue" /> Expected sales
        </span>
        <span>
          <i className="run-rate" /> Run rate
        </span>
      </div>
      <div className="compact-performance-scroll">
        <svg
          className="compact-performance-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Performance mix chart of monthly booked sales, expected sales, and run rate"
        >
          <defs>
            <linearGradient id="performance-run-rate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cfe87a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#cfe87a" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((step) => (
            <g key={step}>
              <line
                x1={left}
                x2={width - right}
                y1={yFor(max * step)}
                y2={yFor(max * step)}
                className="compact-performance-grid"
              />
              <text
                x={left - 8}
                y={yFor(max * step) + 3}
                textAnchor="end"
                className="compact-performance-axis"
              >
                {(max * step).toFixed(0)}M
              </text>
            </g>
          ))}
          <motion.path
            d={areaPath}
            fill="url(#performance-run-rate)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          />
          {data.map((item, index) => {
            const barY = yFor(item.bookings);
            return (
              <motion.rect
                key={item.month}
                x={xFor(index) - barWidth / 2}
                width={barWidth}
                rx={5}
                initial={{ y: top + innerHeight, height: 0 }}
                animate={{ y: barY, height: top + innerHeight - barY }}
                transition={{ type: "spring", stiffness: 105, damping: 18, delay: index * 0.05 }}
                className="compact-performance-bar"
              />
            );
          })}
          <motion.path
            d={linePath}
            fill="none"
            stroke="#2e6570"
            strokeWidth="3.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          {data.map((item, index) => (
            <g key={`${item.month}-point`}>
              <motion.circle
                cx={xFor(index)}
                cy={yFor(item.revenue)}
                r="4"
                fill="#fffefa"
                stroke="#2e6570"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              />
              <text
                x={xFor(index)}
                y={height - 10}
                textAnchor="middle"
                className="compact-performance-label"
              >
                {item.month}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="compact-performance-latest">
        <div>
          <span>Latest month</span>
          <b>{latest ? formatMillion(latest.bookings * 1_000_000) : "—"}</b>
          <small>booked sales</small>
        </div>
        <div>
          <span>Expected close</span>
          <b>{latest ? formatMillion(latest.revenue * 1_000_000) : "—"}</b>
          <small>sales value</small>
        </div>
        <div>
          <span>Run rate</span>
          <b>{latest ? formatMillion(latest.runRate * 1_000_000) : "—"}</b>
          <small>projected pace</small>
        </div>
      </div>
    </div>
  );
}

export default function CompactDashboard({
  leads,
  viewings,
  trendData,
  funnelData,
  sourceData,
  totalLeads,
  highPriority,
  activeProperties,
  expectedSalesValue,
  scheduledHealth,
  contactedHealth,
  search,
  setSearch,
  priorityFilter,
  setPriorityFilter,
  segmentFilter,
  setSegmentFilter,
  onOpenAnalytics,
  period,
  onPeriodChange,
}: CompactDashboardProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [viewerLead, setViewerLead] = useState<Lead | null>(null);
  const [profileLead, setProfileLead] = useState<Lead | null>(null);
  const [chartOpen, setChartOpen] = useState(
    () => new URLSearchParams(window.location.search).get("salesMomentum") === "open"
  );
  const [barChartOpen, setBarChartOpen] = useState(false);
  const [performanceMixOpen, setPerformanceMixOpen] = useState(false);
  const [sourceMixOpen, setSourceMixOpen] = useState(false);
  const [pipelineHealthOpen, setPipelineHealthOpen] = useState(
    () => new URLSearchParams(window.location.search).get("pipelineHealth") === "open"
  );

  const trendValues = trendData.length
    ? trendData.map((item) => item.value)
    : [12, 13, 12.6, 14, 14.8, 15.3, 16.1, 17.4, 18.4];

  const sourceMixData = useMemo<SourceItem[]>(
    () =>
      sourceData.length
        ? sourceData
        : [
            { label: "Organic enquiries", value: 168, color: "#287462", note: "Owned discovery" },
            { label: "Portal campaigns", value: 124, color: "#5c9b75", note: "Paid enquiries" },
            { label: "Referrals", value: 82, color: "#a7c368", note: "Partner network" },
            { label: "Walk-ins", value: 54, color: "#d7ef73", note: "On-site interest" },
          ],
    [sourceData]
  );

  const pipelineStages = funnelData.length
    ? funnelData
    : [
        { stage: "Enquiries", value: 428, color: "#287462" },
        { stage: "Qualified", value: 164, color: "#5c9b75" },
        { stage: "Bookings", value: 18, color: "#a7c368" },
      ];

  const baseEnquiries = Math.max(pipelineStages[0]?.value || 428, 1);
  const qualifiedCount = pipelineStages[1]?.value || 164;
  const bookingsCount = pipelineStages[2]?.value || 18;
  const sourceTotal = sourceMixData.reduce((sum, item) => sum + item.value, 0) || 1;

  const chartData = useMemo(
    () =>
      trendData.map((item, index) => ({
        date: new Date(2024, index, 1),
        value: item.value,
        month: item.month,
      })),
    [trendData]
  );

  const revenueCommissionData = useMemo(
    () =>
      trendData.map((item, index) => {
        const revenue = Math.round(item.value * 1_000_000);
        const commission = Math.round(revenue * (0.034 + (index % 3) * 0.003));
        return { month: item.month, revenue, commission };
      }),
    [trendData]
  );

  const performanceMixData = useMemo(
    () =>
      trendData.map((item, index) => ({
        month: item.month,
        bookings: Number((item.value * (0.56 + (index % 4) * 0.025)).toFixed(1)),
        revenue: item.value,
        runRate: Number((item.value * (1.04 + (index > trendData.length - 4 ? 0.035 : 0))).toFixed(1)),
      })),
    [trendData]
  );

  const [sortBy, setSortBy] = useState<LeadSortOption>("priority");

  const resetFilters = () => {
    setSearch("");
    setPriorityFilter("all");
    setSegmentFilter("all");
    setSortBy("priority");
  };

  const toggleAi = () => window.dispatchEvent(new CustomEvent("toggleAiChat"));

  // Sparkline calculation for Sales Trend card
  const trendSvgWidth = 340;
  const trendSvgHeight = 110;
  const trendMin = Math.min(...trendValues);
  const trendMax = Math.max(...trendValues);
  const trendRange = Math.max(trendMax - trendMin, 1);
  const trendPoints = trendValues.map((v, i) => {
    const x = (i / Math.max(trendValues.length - 1, 1)) * trendSvgWidth;
    const y = trendSvgHeight - 16 - ((v - trendMin) / trendRange) * (trendSvgHeight - 34);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const trendPolyline = trendPoints.join(" ");
  const trendArea = `M 0,${trendSvgHeight} L ${trendPoints.join(" L ")} L ${trendSvgWidth},${trendSvgHeight} Z`;
  const lastPointParts = trendPoints[trendPoints.length - 1]?.split(",") || ["340", "20"];
  const { activeAgent } = useAuth();

  return (
    <div className="compact-dashboard-root">
      {/* ─── Top Unified Analytics-Style Header (Exact Customer Side Design) ─── */}
      <AgentHeader
        activePage="Dashboard"
        eyebrow={`${activeAgent.name}'s Desk / Executive Suite`}
        badgeText={`${activeAgent.role} · Active Book`}
        rightControls={
          <div className="compact-hero-period-switcher">
            {["Week", "Month", "Quarter"].map((item) => (
              <button
                key={item}
                className={period === item ? "selected" : ""}
                onClick={() => {
                  onPeriodChange(item);
                  toast(`Showing ${item.toLowerCase()} signals`);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        }
      />

      <section className="compact-dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-label="Compact sales dashboard">
        {/* Customer-Styled Terrain Hero Section */}
        <header className="customer-terrain-hero mb-6">
          <div className="max-w-2xl space-y-3 relative z-10">
            <div className="customer-hero-eyebrow">
              <Sparkles size={14} />
              Executive Sales Intelligence · {activeAgent.name}
            </div>
            <h1 className="customer-portal-serif text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.05] text-white">
              Sales, Forecasts & High-Intent Leads <em className="text-[#d7ef73] not-italic">in Real Time</em>
            </h1>
            <p className="text-sm text-[#e4ece2] leading-relaxed max-w-xl">
              Real-time pipeline progression, priority actions queue, and AI conversion signals across your prime portfolio.
            </p>

            {/* Metric Strip */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-[#fbfff9]">
              <div>
                <span className="block text-2xl font-bold text-[#d7ef73]">
                  {(expectedSalesValue / 1_000_000).toFixed(1)}M
                </span>
                <span className="text-[11px] font-semibold text-[#c3dec4] uppercase tracking-wider">
                  Expected Sales
                </span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <span className="block text-2xl font-bold text-white">
                  {highPriority}
                </span>
                <span className="text-[11px] font-semibold text-[#c3dec4] uppercase tracking-wider">
                  Priority Leads
                </span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <span className="block text-2xl font-bold text-white">
                  {activeProperties}
                </span>
                <span className="text-[11px] font-semibold text-[#c3dec4] uppercase tracking-wider">
                  Live Properties
                </span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <span className="block text-2xl font-bold text-[#d7ef73]">
                  {totalLeads}
                </span>
                <span className="text-[11px] font-semibold text-[#c3dec4] uppercase tracking-wider">
                  Total Leads
                </span>
              </div>
            </div>
          </div>

          {/* Floating Search & Filter Toolbar in Hero (Matching Customer Portal) */}
          <div className="relative z-10 mt-6 p-3 bg-[#fbfff9] rounded-2xl shadow-xl border-[1.5px] border-[#234d4d] text-[#10484b] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567177]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads, locations, properties..."
                className="w-full pl-9 pr-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
              />
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
              >
                <option value="all">All Priority Tiers</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {/* Segment Filter */}
            <div>
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
              >
                <option value="all">All Buyer Segments</option>
                <option value="Ready Buyer">Ready Buyer</option>
                <option value="Investor">Investor</option>
                <option value="Researcher">Researcher</option>
                <option value="Low Engagement">Low Engagement</option>
              </select>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center gap-2">
              <NewLeadModal />
              {(search || priorityFilter !== "all" || segmentFilter !== "all") && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 bg-[#f3f5ef] hover:bg-rose-50 text-rose-700 border border-[#dfe6df] rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <X size={13} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Grid: Priority Leads (Left) + Sales Trend (Right) */}
        <div className="compact-main-grid">
        {/* Priority Leads Queue */}
        <article className="compact-card priority-card">
          <div className="compact-card-header">
            <div>
              <span className="compact-section-label">
                <Zap size={13} /> Next best actions
              </span>
              <h2>Priority leads</h2>
              <p>Ranked high-intent opportunities needing action today.</p>
            </div>
            <div className="compact-card-tools">
              <button
                className="compact-tool-button"
                onClick={() => setViewerLead(leads[0] ?? null)}
                disabled={!leads.length}
              >
                <Box size={13} /> 3D preview
              </button>
              <span className="compact-pill priority-queue-count">
                {leads.length} in queue
              </span>
              <button
                className="compact-icon-button"
                onClick={() =>
                  toast("Use the lead queue arrows or scroll to load more leads.")
                }
                aria-label="Priority lead queue options"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="compact-filter-row">
            <div className="compact-search">
              <Search size={14} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a lead or property..."
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter by priority"
            >
              <option value="all">All priority</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <select
              value={segmentFilter}
              onChange={(event) => setSegmentFilter(event.target.value)}
              aria-label="Filter by segment"
            >
              <option value="all">All segments</option>
              <option value="Ready Buyer">Ready buyers</option>
              <option value="Investor">Investors</option>
              <option value="Researcher">Researchers</option>
              <option value="Low Engagement">Low engagement</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as LeadSortOption)}
              aria-label="Sort opportunities by"
              className="compact-sort-select"
            >
              <option value="priority">Rank: Priority Score</option>
              <option value="expectedValue">Rank: Expected Value</option>
              <option value="probability">Rank: Close Fit %</option>
              <option value="value">Rank: Total Deal Size</option>
            </select>
            {(search || priorityFilter !== "all" || segmentFilter !== "all" || sortBy !== "priority") && (
              <button className="compact-reset" onClick={resetFilters}>
                Reset
              </button>
            )}
          </div>

          {/* ── Confirmed Tours Strip (from customer portal bookings) ── */}
          {viewings && viewings.length > 0 && (
            <ConfirmedToursStrip viewings={viewings} />
          )}

          {/* Lead List */}
          <PriorityLeadList
            leads={leads}
            sortBy={sortBy}
            expanded={expanded}
            onExpandedChange={setExpanded}
            onOpenViewer={setViewerLead}
            onOpenProfile={setProfileLead}
          />
        </article>

        {/* Sales Trend & Supporting Insight */}
        <aside className="compact-side-stack">
          <article className="compact-card trend-card">
            <div className="compact-card-header">
              <div>
                <span className="compact-section-label">
                  <TrendingUp size={13} /> Supporting insight
                </span>
                <h2>Sales trend</h2>
                <p>Quarterly run rate and trajectory.</p>
              </div>
              <div className="compact-trend-actions">
                <span className="compact-pill">{period}</span>
                <button
                  className="compact-icon-button"
                  onClick={() => setChartOpen(true)}
                  aria-label="Open animated sales trend"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            <div className="compact-trend-total">
              <strong>RM {trendValues[trendValues.length - 1].toFixed(1)}M</strong>
              <span>
                <ArrowUpRight size={13} /> +12.6%
              </span>
            </div>

            {/* Visual Trend Chart with Gradient Fill */}
            <div className="compact-trend-svg-wrap">
              <svg
                className="compact-trend-chart"
                viewBox={`0 0 ${trendSvgWidth} ${trendSvgHeight}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Sales trend chart"
              >
                <defs>
                  <linearGradient id="trend-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2e7a68" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2e7a68" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={`M0 ${trendSvgHeight - 16} H${trendSvgWidth}`} className="compact-chart-baseline" />
                <path d={trendArea} fill="url(#trend-area-grad)" />
                <polyline
                  points={trendPolyline}
                  fill="none"
                  stroke="#2e7a68"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx={Number(lastPointParts[0])}
                  cy={Number(lastPointParts[1])}
                  r="5"
                  fill="#d7ef73"
                  stroke="#10484b"
                  strokeWidth="2.5"
                />
              </svg>
            </div>

            <div className="compact-chart-labels">
              <span>{trendData[0]?.month || "Jan"}</span>
              <span>{trendData[Math.floor(trendData.length / 2)]?.month || "Jun"}</span>
              <span>{trendData.at(-1)?.month || "Oct"}</span>
            </div>

            {/* Quick KPI summary row in trend card */}
            <div className="compact-trend-kpis">
              <div>
                <span>Avg Deal Size</span>
                <b>RM 940K</b>
              </div>
              <div>
                <span>Close Rate</span>
                <b>18.4%</b>
              </div>
              <div>
                <span>Top Project</span>
                <b>Asteria</b>
              </div>
            </div>

            <button
              className="compact-chart-explore"
              onClick={() => setChartOpen(true)}
            >
              Explore detailed momentum <ChevronRight size={14} />
            </button>
          </article>
        </aside>
      </div>

      {/* Performance Details: 3 Square Cards Row at Bottom */}
      <section className="performance-row" aria-label="Performance details">
        <div className="performance-row-header">
          <div>
            <span className="compact-section-label">
              <Activity size={13} /> Performance details
            </span>
            <h2>Pipeline, source & follow-up</h2>
            <p>Full diagnostics displayed directly in view.</p>
          </div>
        </div>

        <div className="performance-details-grid">
          {/* Card 1: Pipeline Health */}
          <article className="performance-detail-panel">
            <div className="performance-detail-heading">
              <div>
                <span className="perf-kicker">
                  <Filter size={13} /> Pipeline health
                </span>
                <h3>Where deals slow down</h3>
              </div>
            </div>

            <div className="performance-panel-content">
              {/* Funnel Stages */}
              <div className="perf-funnel">
                {pipelineStages.map((stage, i) => {
                  const pct = Math.round((stage.value / baseEnquiries) * 100);
                  const convPct =
                    i === 0 || !pipelineStages[i - 1]?.value
                      ? null
                      : Math.round((stage.value / (pipelineStages[i - 1]?.value ?? 1)) * 100);
                  return (
                    <div key={stage.stage} className="perf-funnel-row">
                      <div className="perf-funnel-meta">
                        <span className="perf-funnel-label">{stage.stage}</span>
                        <div className="perf-funnel-numbers">
                          {convPct !== null && (
                            <span className="perf-conv-badge">{convPct}% conv.</span>
                          )}
                          <b className="perf-funnel-count">{stage.value.toLocaleString()}</b>
                        </div>
                      </div>
                      <div className="perf-funnel-track">
                        <motion.span
                          className="perf-funnel-fill"
                          style={{
                            background:
                              i === 0
                                ? "linear-gradient(90deg, #0f4040 0%, #1d5f50 50%, #2c8c6a 100%)"
                                : i === 1
                                ? "linear-gradient(90deg, #1d5f50 0%, #3d9070 50%, #6ab87e 100%)"
                                : "linear-gradient(90deg, #3d9070 0%, #6ab87e 50%, #b6e04c 100%)",
                          }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: pct / 100 }}
                          transition={{ duration: 0.8, delay: i * 0.12, ease: [0.23, 1, 0.32, 1] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Conversion snapshot */}
              <div className="perf-conversion-row">
                <div className="perf-conversion-stat">
                  <strong>{Math.round((qualifiedCount / baseEnquiries) * 100)}%</strong>
                  <span>Enq → Qualified</span>
                </div>
                <div className="perf-conversion-divider" />
                <div className="perf-conversion-stat">
                  <strong>
                    {qualifiedCount ? Math.round((bookingsCount / qualifiedCount) * 100) : 0}%
                  </strong>
                  <span>Qualified → Booked</span>
                </div>
                <div className="perf-conversion-divider" />
                <div className="perf-conversion-stat">
                  <strong>{Math.round((bookingsCount / baseEnquiries) * 100)}%</strong>
                  <span>Overall rate</span>
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Source Mix */}
          <article className="performance-detail-panel perf-source-panel">
            <div className="performance-detail-heading">
              <div>
                <span className="perf-kicker">
                  <Target size={13} /> Source mix
                </span>
                <h3>Where momentum starts</h3>
              </div>
            </div>

            <div className="performance-panel-content perf-source-panel-content">
              <InteractiveSourceMix data={sourceMixData} compact />
            </div>
          </article>

          {/* Card 3: Follow-up Health */}
          <article className="performance-detail-panel">
            <div className="performance-detail-heading">
              <div>
                <span className="perf-kicker">
                  <CheckCircle2 size={13} /> Follow-up health
                </span>
                <h3>Action coverage</h3>
              </div>
            </div>

            <div className="performance-panel-content">
              <div className="perf-health-duo">
                <div className="perf-health-ring-wrap">
                  <svg className="perf-health-ring" viewBox="0 0 64 64">
                    <defs>
                      <linearGradient id="ringGradSched" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0f4040" />
                        <stop offset="100%" stopColor="#2c8c6a" />
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="32" r="26" className="perf-health-ring-track" />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="26"
                      className="perf-health-ring-fill perf-health-ring-scheduled"
                      stroke="url(#ringGradSched)"
                      strokeDasharray={`${(scheduledHealth / 100) * 163.4} 163.4`}
                      initial={{ strokeDashoffset: 163.4 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
                    />
                    <text x="32" y="35" className="perf-health-ring-text" style={{ fontSize: '15.5px' }}>
                      {scheduledHealth}%
                    </text>
                  </svg>
                  <span className="perf-health-ring-label">Scheduled</span>
                  <small className="perf-health-ring-sub">Within SLA target</small>
                </div>
                <div className="perf-health-ring-wrap">
                  <svg className="perf-health-ring" viewBox="0 0 64 64">
                    <defs>
                      <linearGradient id="ringGradContact" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2c7c68" />
                        <stop offset="100%" stopColor="#8ac863" />
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="32" r="26" className="perf-health-ring-track" />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="26"
                      className="perf-health-ring-fill perf-health-ring-contacted"
                      stroke="url(#ringGradContact)"
                      strokeDasharray={`${(contactedHealth / 100) * 163.4} 163.4`}
                      initial={{ strokeDashoffset: 163.4 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 1.1, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
                    />
                    <text x="32" y="35" className="perf-health-ring-text" style={{ fontSize: '15.5px' }}>
                      {contactedHealth}%
                    </text>
                  </svg>
                  <span className="perf-health-ring-label">Contacted</span>
                  <small className="perf-health-ring-sub">Direct engagement</small>
                </div>
              </div>

              {/* Action SLA & Breakdown Metric Cards */}
              <div className="perf-sla-grid">
                <div className="perf-sla-card">
                  <div className="perf-sla-meta">
                    <span>Response Velocity</span>
                    <span className="perf-badge-ok">4.2h avg</span>
                  </div>
                  <strong>Active SLA</strong>
                  <small>Follow-up within standard</small>
                </div>
                <div className="perf-sla-card">
                  <div className="perf-sla-meta">
                    <span>Action Gap</span>
                    <span className="perf-badge-warn">{100 - contactedHealth}%</span>
                  </div>
                  <strong>{Math.round(((100 - contactedHealth) / 100) * leads.length)} leads</strong>
                  <small>Pending initial contact</small>
                </div>
              </div>

              <div className="perf-health-callout">
                <Check size={13} />
                <span>Next action logged on <strong>{scheduledHealth}%</strong> of priority leads</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Footer */}
      <footer className="compact-footer">
        <span>
          <span className="compact-status-dot" /> Data synced 4 min ago
        </span>
        <span>northstar / revenue workspace</span>
      </footer>

      {/* Lead Profile & Rating Breakdown Modal */}
      <LeadProfileModal
        lead={profileLead}
        open={!!profileLead}
        onOpenChange={(open) => !open && setProfileLead(null)}
        onOpen3DViewer={(lead) => {
          setProfileLead(null);
          setViewerLead(lead as unknown as Lead);
        }}
      />

      {/* Interactive Show Unit Modal with Green/White theme & AI suitability match */}
      <ShowUnitModal
        open={!!viewerLead}
        lead={viewerLead as any}
        onClose={() => setViewerLead(null)}
        onBackToLead={(lead) => {
          setViewerLead(null);
          setProfileLead(lead as any);
        }}
        onConfirmAction={(lead) => {
          toast.success(`Action confirmed for ${lead.name}`, {
            description: `${lead.nextAction || lead.action || "Follow-up"} scheduled.`,
          });
          setViewerLead(null);
        }}
      />

      <AnimatePresence>
        {chartOpen && (
          <ExperienceDialog
            title="Sales momentum"
            eyebrow="Interactive performance deep-dive"
            onClose={() => setChartOpen(false)}
          >
            <div className="sales-momentum-toolbar">
              <div className="sales-momentum-summary">
                <span>{period} close projection</span>
                <strong>RM {trendValues[trendValues.length - 1].toFixed(1)}M</strong>
                <small>
                  <ArrowUpRight size={13} /> 12.6% versus previous period
                </small>
              </div>
              <div className="sales-momentum-actions" aria-label="Open related sales analyses">
                <button
                  className="compact-compare-button"
                  onClick={() => {
                    setChartOpen(false);
                    setPerformanceMixOpen(true);
                  }}
                >
                  <BarChart3 size={14} /> Performance mix <ChevronRight size={14} />
                </button>
                <button
                  className="compact-compare-button"
                  onClick={() => {
                    setChartOpen(false);
                    setBarChartOpen(true);
                  }}
                >
                  <BarChart3 size={14} /> Revenue vs. commission <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <div className="compact-line-chart-meta">
              <span>
                <i /> Actual sales
              </span>
              <span>
                <b /> Forecast tail
              </span>
            </div>
            <div className="compact-animated-chart">
              <LineChart
                data={chartData}
                animationDuration={1100}
                animationEasing="cubic-bezier(0.23, 1, 0.32, 1)"
                revealSignature={period}
                margin={{ top: 30, right: 34, bottom: 34, left: 30 }}
              >
                <Grid
                  horizontal
                  numTicksRows={4}
                  stroke="rgba(47, 111, 120, .18)"
                  strokeDasharray="3,5"
                  hideHorizontalEdgeLines
                />
                <Line
                  dataKey="value"
                  stroke="#2f6f78"
                  strokeWidth={3}
                  showMarkers
                  fadeEdges={false}
                  showHighlight
                  dashFromIndex={Math.max(chartData.length - 2, 0)}
                  dashArray="7,5"
                  markers={{ radius: 3.6, ringGap: 2, strokeWidth: 1.5 }}
                />
                <LineSeriesTerminalMarker dataKey="value" fill="#d7ef73" stroke="#2f6f78" />
                <XAxis numTicks={6} />
              </LineChart>
            </div>
            <p className="sales-momentum-caption">
              Hover across the markers to inspect momentum. The dashed ending flags the current forecast period.
            </p>
          </ExperienceDialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {barChartOpen && (
          <ExperienceDialog
            title="Revenue vs. commission"
            eyebrow="Animated monthly contribution view"
            onClose={() => setBarChartOpen(false)}
          >
            <AnimatedRevenueBars data={revenueCommissionData} />
            <div className="compact-experience-note">
              <div>
                <b>
                  {formatMillion(
                    revenueCommissionData.reduce((sum, item) => sum + item.revenue, 0)
                  )}
                </b>
                <span>period revenue projection</span>
              </div>
              <p>
                Monthly projection with derived commission tracking across booked pipeline.
              </p>
            </div>
          </ExperienceDialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {performanceMixOpen && (
          <ExperienceDialog
            title="Performance mix"
            eyebrow="Bookings, expected sales, and run rate"
            onClose={() => setPerformanceMixOpen(false)}
          >
            <PerformanceMixChart data={performanceMixData} />
            <div className="compact-experience-note">
              <div>
                <b>{performanceMixData.length} months</b>
                <span>performance series</span>
              </div>
              <p>
                Booked sales, expected revenue curve, and run rate pace across active quarters.
              </p>
            </div>
          </ExperienceDialog>
        )}
      </AnimatePresence>
    </section>
  </div>
);
}
