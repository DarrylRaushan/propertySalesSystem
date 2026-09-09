export type IntelligenceLead = {
  id: number;
  name: string;
  location: string;
  property: string;
  value: number;
  probability: number;
  priority: "High" | "Medium" | "Low";
  action: string;
  lastContacted?: string | null;
};

export type IntelligenceSource = {
  label: string;
  value: number;
  color: string;
  note: string;
};

export type ForecastHorizon = "30" | "60" | "90";

export type IntelligenceFunnelStage = {
  label: string;
  value: number;
  displayValue?: string;
  color?: string;
};

const forecastShares: Record<ForecastHorizon, number> = { "30": 0.31, "60": 0.63, "90": 1 };
const forecastConfidence: Record<ForecastHorizon, number> = { "30": 82, "60": 74, "90": 68 };
const sourceQuality: Record<string, number> = {
  "Organic enquiries": 79,
  "Portal campaigns": 58,
  Referrals: 88,
  "WhatsApp follow-up": 67,
};

const locationLabel = (location: string) => location.split(",")[0]?.trim() || location;

export function formatRinggit(value: number, compact = false) {
  if (compact && value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(1)}M`;
  if (compact && value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value).replace("MYR", "RM");
}

export function getFunnelStageContext(funnel: IntelligenceFunnelStage[], index: number) {
  const stage = funnel[index] ?? funnel[0];
  const previous = index > 0 ? funnel[index - 1] : undefined;
  if (!stage) return { label: "No stage selected", value: 0, percentage: 0, conversion: null, previousLabel: null };
  return {
    label: stage.label,
    value: stage.value,
    percentage: Math.round((stage.value / Math.max(funnel[0]?.value ?? 1, 1)) * 100),
    conversion: previous ? Math.round((stage.value / Math.max(previous.value, 1)) * 100) : null,
    previousLabel: previous?.label ?? null,
  };
}

export function buildSalesIntelligence(leads: IntelligenceLead[], sources: IntelligenceSource[], expectedSalesValue: number, now = Date.now()) {
  const weightedPipelineValue = leads.reduce((total, lead) => total + lead.value * (lead.probability / 100), 0);
  const forecasts = (Object.keys(forecastShares) as ForecastHorizon[]).map((horizon) => {
    const expectedRevenue = Math.round(expectedSalesValue * forecastShares[horizon]);
    return {
      horizon,
      expectedRevenue,
      commission: Math.round(expectedRevenue * 0.033),
      confidence: forecastConfidence[horizon],
    };
  });

  const funnel: IntelligenceFunnelStage[] = [
    { label: "Enquiries", value: 428, displayValue: "428", color: "#2f806f" },
    { label: "Qualified", value: 164, displayValue: "164", color: "#559c72" },
    { label: "Viewings", value: 56, displayValue: "56", color: "#9fc469" },
    { label: "Bookings", value: 18, displayValue: "18", color: "#d7ef73" },
  ];
  const leak = {
    from: "Qualified",
    to: "Viewings",
    lost: funnel[1].value - funnel[2].value,
    conversion: Math.round((funnel[2].value / funnel[1].value) * 100),
    note: "Qualified demand is not reaching booked viewings fast enough.",
  };

  const sourceDrivers = sources
    .map((source) => ({
      ...source,
      quality: sourceQuality[source.label] ?? 62,
      expectedRevenue: Math.round(weightedPipelineValue * (source.value / Math.max(sources.reduce((total, item) => total + item.value, 0), 1))),
    }))
    .sort((a, b) => b.quality - a.quality || b.expectedRevenue - a.expectedRevenue);

  const locationDrivers = Array.from(
    leads.reduce((groups, lead) => {
      const label = locationLabel(lead.location);
      const current = groups.get(label) ?? { label, leads: 0, expectedRevenue: 0 };
      current.leads += 1;
      current.expectedRevenue += lead.value * (lead.probability / 100);
      groups.set(label, current);
      return groups;
    }, new Map<string, { label: string; leads: number; expectedRevenue: number }>()).values()
  ).sort((a, b) => b.expectedRevenue - a.expectedRevenue).slice(0, 3);

  const projectDrivers = Array.from(
    leads.reduce((groups, lead) => {
      const current = groups.get(lead.property) ?? { label: lead.property, leads: 0, expectedRevenue: 0 };
      current.leads += 1;
      current.expectedRevenue += lead.value * (lead.probability / 100);
      groups.set(lead.property, current);
      return groups;
    }, new Map<string, { label: string; leads: number; expectedRevenue: number }>()).values()
  ).sort((a, b) => b.expectedRevenue - a.expectedRevenue).slice(0, 3);

  const highValueCooling = [...leads].filter((lead) => lead.value >= 900_000 && lead.probability < 75).sort((a, b) => b.value - a.value)[0];
  const highIntent = [...leads].filter((lead) => lead.priority === "High" && lead.probability >= 75).sort((a, b) => b.probability - a.probability)[0];
  const overdueFollowUp = [...leads]
    .map((lead) => ({ lead, daysSinceContact: lead.lastContacted ? Math.floor((now - new Date(lead.lastContacted).getTime()) / 86_400_000) : -1 }))
    .filter(({ lead, daysSinceContact }) => lead.priority !== "Low" && Number.isFinite(daysSinceContact) && daysSinceContact >= 3)
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact || b.lead.value - a.lead.value)[0];
  const interventions = [
    overdueFollowUp && {
      id: `overdue-${overdueFollowUp.lead.id}`,
      kind: "Overdue follow-up",
      title: `Re-open ${overdueFollowUp.lead.name}`,
      detail: `No logged contact for ${overdueFollowUp.daysSinceContact} days · ${overdueFollowUp.lead.action}`,
      urgency: "Overdue",
      leadId: overdueFollowUp.lead.id,
    },
    highValueCooling && {
      id: `cooling-${highValueCooling.id}`,
      kind: "Cooling value",
      title: `Progress ${highValueCooling.name}`,
      detail: `${formatRinggit(highValueCooling.value, true)} at ${highValueCooling.probability}% fit · ${highValueCooling.action}`,
      urgency: "Today",
      leadId: highValueCooling.id,
    },
    highIntent && {
      id: `priority-${highIntent.id}`,
      kind: "Priority lead",
      title: `Protect ${highIntent.name}'s buying window`,
      detail: `${highIntent.property} · ${highIntent.probability}% fit · ${highIntent.action}`,
      urgency: "Today",
      leadId: highIntent.id,
    },
    {
      id: "funnel-leak",
      kind: "Funnel leak",
      title: `Move ${leak.lost} qualified leads to viewing`,
      detail: `${leak.conversion}% currently progress from qualified to viewing. Build a next-48-hour call block.`,
      urgency: "48 hours",
      leadId: null,
    },
    {
      id: "channel-decision",
      kind: "Channel decision",
      title: "Review portal campaign quality",
      detail: "Portal campaigns produce reach, but their 58/100 quality signal trails organic and referrals.",
      urgency: "This week",
      leadId: null,
    },
  ].filter(Boolean) as Array<{ id: string; kind: string; title: string; detail: string; urgency: string; leadId: number | null }>;

  return { weightedPipelineValue, forecasts, funnel, leak, sourceDrivers, locationDrivers, projectDrivers, interventions };
}
