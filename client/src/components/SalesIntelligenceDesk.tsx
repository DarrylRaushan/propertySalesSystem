import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeAlert,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Filter,
  Flame,
  Layers,
  MapPinned,
  PieChart as PieIcon,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { FunnelChart } from "@/components/FunnelChart";
import AgentHeader from "@/components/AgentHeader";
import { cn } from "@/lib/utils";
import {
  buildSalesIntelligence,
  formatRinggit,
  getFunnelStageContext,
  type ForecastHorizon,
  type IntelligenceLead,
  type IntelligenceSource,
} from "@shared/salesIntelligence";

type SalesIntelligenceDeskProps = {
  onBack: () => void;
  onOpenLeads: () => void;
  onOpenViewingFollowUps: () => void;
  leads: IntelligenceLead[];
  sources: IntelligenceSource[];
  expectedSalesValue: number;
};

type AnalyticsTab = "overview" | "funnel" | "channels" | "actions";

const horizonLabels: Record<ForecastHorizon, string> = {
  "30": "30-Day Window",
  "60": "60-Day Window",
  "90": "90-Day Window",
};

// Monthly projection trajectory data matching the horizon
const monthlyTrendBase = [
  { month: "Jan", actual: 11.2, projected: 11.2, commission: 0.37 },
  { month: "Feb", actual: 12.4, projected: 12.4, commission: 0.41 },
  { month: "Mar", actual: 13.8, projected: 13.8, commission: 0.45 },
  { month: "Apr", actual: 14.2, projected: 14.2, commission: 0.47 },
  { month: "May", actual: 15.6, projected: 15.6, commission: 0.51 },
  { month: "Jun", actual: 16.8, projected: 16.8, commission: 0.55 },
  { month: "Jul", actual: 17.4, projected: 17.4, commission: 0.57 },
  { month: "Aug", actual: 18.4, projected: 18.4, commission: 0.61 },
  { month: "Sep", actual: null, projected: 19.8, commission: 0.65 },
  { month: "Oct", actual: null, projected: 21.2, commission: 0.70 },
  { month: "Nov", actual: null, projected: 22.5, commission: 0.74 },
  { month: "Dec", actual: null, projected: 24.0, commission: 0.79 },
];

export default function SalesIntelligenceDesk({
  onBack,
  onOpenLeads,
  onOpenViewingFollowUps,
  leads,
  sources,
  expectedSalesValue,
}: SalesIntelligenceDeskProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [horizon, setHorizon] = useState<ForecastHorizon>("90");
  const [activeDriver, setActiveDriver] = useState<string | null>(null);
  const [activeFunnelIndex, setActiveFunnelIndex] = useState(1);

  const intelligence = useMemo(
    () => buildSalesIntelligence(leads, sources, expectedSalesValue),
    [leads, sources, expectedSalesValue]
  );
  const forecast =
    intelligence.forecasts.find((item) => item.horizon === horizon) ??
    intelligence.forecasts[2];
  const topDriver = intelligence.sourceDrivers[0];
  const funnelContext = getFunnelStageContext(
    intelligence.funnel,
    activeFunnelIndex
  );

  const tabs: Array<{ id: AnalyticsTab; label: string; icon: any; count?: number }> = [
    { id: "overview", label: "Executive Overview", icon: Sparkles },
    { id: "funnel", label: "Pipeline & Funnel", icon: Layers, count: intelligence.leak.lost },
    { id: "channels", label: "Channels & Demand", icon: Compass },
    { id: "actions", label: "Action Queue", icon: Zap, count: intelligence.interventions.length },
  ];

  return (
    <div className="analytics-page sales-intelligence-desk pb-28">
      {/* Unified 2-Row Top Workspace Header */}
      <AgentHeader
        activePage="Analytics"
        eyebrow="Executive Desk / Sales Intelligence"
        badgeText="Live Projections"
        title={<>Sales Intelligence <em>· Forecasts</em></>}
        rightControls={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#5a7b70] hidden sm:inline-block">
              Forecast Horizon:
            </span>
            <div className="analytics-horizon" role="group" aria-label="Forecast horizon">
              {(Object.keys(horizonLabels) as ForecastHorizon[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setHorizon(item)}
                  className={cn(horizon === item && "is-active")}
                >
                  {horizonLabels[item]}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Main Tab Content */}
      <div className="analytics-page-main space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Workspace Sub-Filter Tabs */}
        <div className="flex items-center gap-2 pb-2 border-b border-[#dfe6df] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border",
                  isActive
                    ? "bg-[#10484b] text-[#d7ef73] border-[#234d4d] shadow-sm"
                    : "bg-[#fbfff9] text-[#567177] hover:bg-[#eaf6df] border-[#dfe6df]"
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px]",
                      isActive ? "bg-[#234d4d] text-[#d7ef73]" : "bg-[#f3f5ef] text-[#567177]"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Executive Hero Banner */}
              <section className="intelligence-hero">
                <div className="intelligence-hero-copy">
                  <div className="flex items-center gap-2">
                    <span className="intelligence-eyebrow">
                      <TrendingUp className="size-3.5" /> Growth Trajectory
                    </span>
                    <span className="text-[10px] font-bold text-[#d7ef73] bg-white/10 px-2 py-0.5 rounded">
                      {horizon}-Day Strategy
                    </span>
                  </div>
                  <h3 className="hero-revenue-title text-white font-serif text-[24px] sm:text-[28px] font-bold leading-tight mt-2">
                    {formatRinggit(forecast.expectedRevenue, true)} in projected bookings over the next {horizon} days.
                  </h3>
                  <p>
                    Forecast confidence is rated at{" "}
                    <strong className="text-[#d7ef73]">{forecast.confidence}%</strong>.
                    Strategic demand pull is led by {topDriver?.label} ({topDriver?.quality}/100 quality).
                    Protect closing timelines by prioritizing high-fit viewing appointments.
                  </p>
                  <div className="intelligence-hero-metrics">
                    <div className="hero-metric-box">
                      <span>Expected Sales</span>
                      <strong>{formatRinggit(forecast.expectedRevenue, true)}</strong>
                      <small className="text-[#b9d96e] text-[11px] font-semibold">Target Run-Rate</small>
                    </div>
                    <div className="hero-metric-box">
                      <span>Est. Commission</span>
                      <strong>{formatRinggit(forecast.commission, true)}</strong>
                      <small className="text-[#a8c6ba] text-[11px]">~3.3% Gross Yield</small>
                    </div>
                    <div className="hero-metric-box">
                      <span>Weighted Pipeline</span>
                      <strong>{formatRinggit(intelligence.weightedPipelineValue, true)}</strong>
                      <small className="text-[#b9d96e] text-[11px] font-semibold">Probability-Adjusted</small>
                    </div>
                  </div>
                </div>

                <aside
                  className="forecast-confidence"
                  aria-label={`Forecast confidence ${forecast.confidence}%`}
                >
                  <div
                    className="confidence-ring"
                    style={{ "--confidence": `${forecast.confidence}%` } as React.CSSProperties}
                  >
                    <span>
                      {forecast.confidence}
                      <small>%</small>
                    </span>
                  </div>
                  <p>Confidence Rating</p>
                  <span>
                    Factoring current lead velocity, pricing elasticity, and viewing pace.
                  </span>
                </aside>
              </section>

              {/* Trajectory Chart & Management Read */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.85fr)]">
                {/* Revenue Trajectory Chart */}
                <article className="intelligence-card">
                  <div className="intelligence-card-heading">
                    <div>
                      <span className="analytics-kicker">Revenue Velocity</span>
                      <h3>Monthly Performance & Forecast Run</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5a7b70]">
                        <span className="size-2.5 rounded-full bg-[#10484b]" />
                        <span>Actual</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5a7b70]">
                        <span className="size-2.5 rounded-full bg-[#8baa60]" />
                        <span>Projected</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={monthlyTrendBase}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8baa60" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8baa60" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10484b" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#10484b" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e6f0e6" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={{ stroke: "#d2e5d4" }}
                          tick={{ fill: "#607c72", fontSize: 11, fontWeight: 600 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `RM ${v}M`}
                          tick={{ fill: "#607c72", fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#10484b",
                            borderColor: "#234d4d",
                            borderRadius: "10px",
                            color: "#fbfff9",
                            fontSize: "12px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                          }}
                          formatter={(value: any, name: any) => [
                            `RM ${value}M`,
                            name === "actual" ? "Actual Revenue" : "Projected Forecast",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="projected"
                          stroke="#8baa60"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={1}
                          fill="url(#projectedGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stroke="#10484b"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#actualGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                {/* Management Takeaway & Strategic Decisions */}
                <aside className="intelligence-card decision-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="decision-icon">
                        <CircleDollarSign className="size-5" />
                      </div>
                      <span className="text-[10px] font-bold text-[#234d4d] bg-[#eff8de] px-2 py-0.5 rounded-full border border-[#cbe5c4]">
                        Executive Read
                      </span>
                    </div>
                    <span className="analytics-kicker mt-4 block">Key Opportunity</span>
                    <h3 className="text-[22px] font-bold leading-snug text-[#10484b] mt-1 font-serif">
                      Demand is resilient. Conversion discipline is your revenue multiplier.
                    </h3>
                    <p className="text-[13.5px] text-[#456d60] leading-relaxed mt-2.5">
                      Organic and referral channels are supplying the highest-quality buyers.
                      The primary opportunity to accelerate commission is converting the{" "}
                      <strong>{intelligence.leak.lost} qualified leads</strong> into confirmed physical viewings.
                    </p>
                  </div>

                  <div className="decision-actions mt-5">
                    <button onClick={onOpenLeads} className="flex-1">
                      <UsersRound className="size-4" /> Work High-Fit Leads
                    </button>
                    <button onClick={onOpenViewingFollowUps} className="secondary flex-1">
                      <CalendarDays className="size-4" /> Schedule Viewing Blocks
                    </button>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}

          {/* TAB 2: PIPELINE & FUNNEL HEALTH */}
          {activeTab === "funnel" && (
            <motion.div
              key="funnel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Funnel Stage Metric Cards Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {intelligence.funnel.map((stage, idx) => {
                  const isSelected = activeFunnelIndex === idx;
                  return (
                    <button
                      key={stage.label}
                      onClick={() => setActiveFunnelIndex(idx)}
                      className={cn(
                        "text-left p-4 rounded-xl border transition-all cursor-pointer",
                        isSelected
                          ? "border-[#10484b] bg-gradient-to-br from-[#10484b] to-[#1a3d3c] text-white shadow-md"
                          : "border-[#d8e6db] bg-white hover:border-[#8baa60] text-[#164a4b]"
                      )}
                    >
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isSelected ? "text-[#d7ef73]" : "text-[#5a7b70]")}>
                        Stage 0{idx + 1}
                      </span>
                      <strong className="text-[20px] font-bold block mt-1 font-serif">
                        {stage.value} Leads
                      </strong>
                      <span className={cn("text-[12px] font-semibold block mt-0.5", isSelected ? "text-white/80" : "text-[#4a7265]")}>
                        {stage.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Funnel Visualization & Drop-off Diagnostic */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(330px,0.8fr)]">
                <article className="intelligence-card">
                  <div className="intelligence-card-heading">
                    <div>
                      <span className="analytics-kicker">Interactive Conversion Funnel</span>
                      <h3>Pipeline Flow & Stage Velocity</h3>
                    </div>
                    <span className="leak-pill">
                      <BadgeAlert className="size-3.5" /> {intelligence.leak.lost} Leads at Risk
                    </span>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] lg:items-center">
                    <div className="funnel-visual">
                      <FunnelChart
                        data={intelligence.funnel}
                        className="min-h-[260px]"
                        color="#2f806f"
                        layers={3}
                        gap={11}
                        minWidthPercent={42}
                        showPercentage
                        showValues
                        showLabels
                        labelLayout="grouped"
                        hoveredIndex={activeFunnelIndex}
                        onHoverChange={(index) => {
                          if (index !== null) setActiveFunnelIndex(index);
                        }}
                        onStageSelect={setActiveFunnelIndex}
                      />
                    </div>

                    <div className="funnel-stage-readout">
                      <span>Focused Stage</span>
                      <strong>
                        {funnelContext.label} · {funnelContext.value} Leads
                      </strong>
                      <p>
                        {funnelContext.conversion === null
                          ? "This represents the full top-of-funnel intake baseline."
                          : `${funnelContext.conversion}% conversion from ${funnelContext.previousLabel}; ${funnelContext.percentage}% of overall pipeline volume.`}
                      </p>
                      <button
                        onClick={onOpenLeads}
                        className="mt-3 text-[12px] font-bold text-[#1c6356] hover:text-[#10484b] flex items-center gap-1 cursor-pointer"
                      >
                        Inspect stage leads <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </article>

                {/* Drop-off Diagnostic Callout */}
                <aside className="intelligence-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[#856228]">
                      <BadgeAlert className="size-5 text-[#d97706]" />
                      <span className="text-[12px] font-bold uppercase tracking-wider">
                        Primary Bottleneck
                      </span>
                    </div>

                    <div className="leak-callout mt-4">
                      <span>Largest Deal Drop-Off</span>
                      <strong>
                        {intelligence.leak.from} ➔ {intelligence.leak.to}
                      </strong>
                      <p>
                        Only <strong>{intelligence.leak.conversion}%</strong> of qualified leads progress to scheduled viewings. {intelligence.leak.note}
                      </p>
                      <button onClick={onOpenViewingFollowUps} className="mt-3">
                        Launch Viewing Follow-Up Drive <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl bg-[#f2f8ed] p-4 border border-[#d2e7cf]">
                    <div className="flex items-center gap-2 text-[#2d5f47] text-[12px] font-bold">
                      <Sparkles className="size-4 text-[#8baa60]" />
                      <span>Actionable Recommendation</span>
                    </div>
                    <p className="text-[12.5px] text-[#456d60] leading-relaxed mt-1">
                      Setting up a dedicated 48-hour viewing call sprint will immediately safeguard an estimated{" "}
                      <strong>{formatRinggit(intelligence.weightedPipelineValue * 0.15, true)}</strong> in deal value.
                    </p>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CHANNELS & DEMAND ATTRIBUTION */}
          {activeTab === "channels" && (
            <motion.div
              key="channels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
                {/* Acquisition Channel Breakdown */}
                <article className="intelligence-card">
                  <div className="intelligence-card-heading">
                    <div>
                      <span className="analytics-kicker">Channel Attribution</span>
                      <h3>Acquisition Source Quality vs Revenue</h3>
                    </div>
                    <p className="driver-note">
                      {topDriver?.label} yields highest conversion at{" "}
                      <strong className="text-[#10484b]">{topDriver?.quality}/100</strong>.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {intelligence.sourceDrivers.map((source) => {
                      const isSelected = activeDriver === source.label;
                      return (
                        <div
                          key={source.label}
                          onClick={() =>
                            setActiveDriver(isSelected ? null : source.label)
                          }
                          className={cn(
                            "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer",
                            isSelected
                              ? "border-[#10484b] bg-[#f0faea] shadow-xs"
                              : "border-[#e0ecdf] bg-white hover:border-[#8baa60]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="size-3 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: source.color }}
                            />
                            <div>
                              <b className="text-[13px] font-bold text-[#164a4b] block">
                                {source.label}
                              </b>
                              <small className="text-[11px] text-[#607c72] block">
                                {source.note}
                              </small>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-[#7a9885] uppercase tracking-wider block">
                                Quality Score
                              </span>
                              <span className="text-[14px] font-bold text-[#10484b]">
                                {source.quality}
                                <small className="text-[10px] text-[#7a9885]">/100</small>
                              </span>
                            </div>

                            <div className="text-right min-w-[90px]">
                              <span className="text-[10px] font-bold text-[#7a9885] uppercase tracking-wider block">
                                Est. Revenue
                              </span>
                              <strong className="text-[13px] font-bold text-[#234d4d]">
                                {formatRinggit(source.expectedRevenue, true)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                {/* Location Pull & Project Drivers */}
                <aside className="intelligence-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPinned className="size-4 text-[#317664]" />
                      <span className="analytics-kicker">Geographic Pull</span>
                    </div>
                    <h3 className="text-[18px] font-bold text-[#10484b] mt-1 font-serif">
                      Top Sub-Market Demand
                    </h3>

                    <div className="mt-4 space-y-3">
                      {intelligence.locationDrivers.map((loc, idx) => (
                        <div key={loc.label} className="demand-row">
                          <div className="flex items-center justify-between">
                            <b>{loc.label}</b>
                            <strong>{formatRinggit(loc.expectedRevenue, true)}</strong>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#68877c] mt-0.5">
                            <span>{loc.leads} active buyer leads</span>
                            <span>Rank #0{idx + 1}</span>
                          </div>
                          <div className="w-full bg-[#e8f2e6] h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-[#10484b] h-full rounded-full"
                              style={{ width: `${Math.max(30, 100 - idx * 25)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strongest Project Signal */}
                  <div className="project-pill mt-5">
                    <Target className="size-4 text-[#3f6c4d]" />
                    <div>
                      <span>Top Performing Development</span>
                      <strong>{intelligence.projectDrivers[0]?.label}</strong>
                      <small className="block text-[#547761] mt-0.5">
                        {formatRinggit(
                          intelligence.projectDrivers[0]?.expectedRevenue ?? 0,
                          true
                        )}{" "}
                        in active weighted demand
                      </small>
                    </div>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}

          {/* TAB 4: ACTION QUEUE (INTERVENTIONS) */}
          {activeTab === "actions" && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              <article className="intelligence-card">
                <div className="intelligence-card-heading">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-[#d97706]" />
                      <span className="analytics-kicker">Revenue Protection</span>
                    </div>
                    <h3>Prioritized Tactical Interventions</h3>
                  </div>
                  <button
                    onClick={onOpenLeads}
                    className="flex items-center gap-1 text-[12px] font-bold text-[#1c6356] hover:text-[#10484b] cursor-pointer"
                  >
                    View All CRM Leads <ArrowUpRight className="size-4" />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {intelligence.interventions.map((item, index) => {
                    const isUrgent =
                      item.urgency === "Overdue" || item.urgency === "Today";
                    return (
                      <div
                        key={item.id}
                        onClick={
                          item.kind === "Funnel leak"
                            ? onOpenViewingFollowUps
                            : onOpenLeads
                        }
                        className="group flex flex-col justify-between p-4 rounded-xl border border-[#dce8dc] bg-[#fbfff9] hover:border-[#10484b] hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className="size-6 rounded-lg bg-[#eef7e8] text-[#234d4d] font-bold text-[11px] flex items-center justify-center">
                                0{index + 1}
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#57786d]">
                                {item.kind}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                isUrgent
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              )}
                            >
                              {item.urgency}
                            </span>
                          </div>

                          <h4 className="text-[14px] font-bold text-[#10484b] mt-2.5 group-hover:text-[#234d4d] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[12.5px] text-[#607c72] leading-relaxed mt-1">
                            {item.detail}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#eaf2ea] flex items-center justify-between text-[11.5px] font-bold text-[#1c6356] group-hover:text-[#10484b]">
                          <span>Execute Intervention</span>
                          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

