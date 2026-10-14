import * as dbFeature from "./db-feature";
import {
  calculateMOT,
  calculateMortgage,
  calculateRentalYield,
  checkForeignBuyerEligibility,
  formatRM,
} from "./aiCalculators";

export interface SystemDataContext {
  metrics: {
    totalLeads: number;
    highPriority: number;
    activeProperties: number;
    expectedSalesValue: number;
    totalCustomers: number;
    priorityDistribution: Array<{ priority: string; count: number }>;
  };
  leadsSummary: Array<{
    id: number;
    name: string;
    segment: string;
    priority: string;
    probability: number;
    value: number;
    property: string;
    action: string;
    phone?: string | null;
    email?: string | null;
    lastContacted?: string | null;
  }>;
  propertiesSummary: Array<{
    id: number;
    title: string;
    developer: string;
    location: string;
    type: string;
    status: string;
    price: number;
    beds: number;
    baths: number;
    size: string;
  }>;
  customersSummary: Array<{
    id: number;
    name: string;
    segment: string;
    totalPurchased: number;
    unitsOwned: number;
    isVip: boolean;
  }>;
  salesTrend: Array<{
    month: string;
    value: number;
    year: number;
  }>;
  pipelineStages: Array<{
    name: string;
    count: number;
    conversionRate: number;
  }>;
  enquirySources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  followUpHealth: Array<{
    metric: string;
    value: number;
    label: string;
    sub?: string | null;
  }>;
}

export async function getLiveSystemDataContext(): Promise<SystemDataContext> {
  const safeQuery = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  const [
    metricsData,
    leadsData,
    propertiesData,
    customersData,
    salesTrendData,
    pipelineData,
    enquiryData,
    followUpData,
  ] = await Promise.all([
    safeQuery(() => dbFeature.getDashboardMetrics(), null),
    safeQuery(() => dbFeature.listLeads({ limit: 100 }), []),
    safeQuery(() => dbFeature.listProperties({ activeOnly: false }), []),
    safeQuery(() => dbFeature.listCustomers(), []),
    safeQuery(() => dbFeature.listSalesTrend(2024), []),
    safeQuery(() => dbFeature.listPipelineStages(), []),
    safeQuery(() => dbFeature.listEnquirySources(), []),
    safeQuery(() => dbFeature.listFollowUpHealth(), []),
  ]);

  const metrics = metricsData || {
    totalLeads: leadsData.length,
    highPriority: leadsData.filter((l) => l.priority === "High").length,
    activeProperties: propertiesData.filter((p) => p.isActive).length,
    expectedSalesValue: leadsData.reduce((acc, l) => acc + (l.value * l.probability) / 100, 0),
    totalCustomers: customersData.length,
    priorityDistribution: [
      { priority: "High", count: leadsData.filter((l) => l.priority === "High").length },
      { priority: "Medium", count: leadsData.filter((l) => l.priority === "Medium").length },
      { priority: "Low", count: leadsData.filter((l) => l.priority === "Low").length },
    ],
  };

  const leadsSummary = leadsData.map((l) => ({
    id: l.id,
    name: l.name,
    segment: l.segment,
    priority: l.priority,
    probability: l.probability,
    value: l.value,
    property: l.property,
    action: l.action,
    phone: l.phone,
    email: l.email,
    lastContacted: l.lastContacted,
  }));

  const propertiesSummary = propertiesData.map((p) => ({
    id: p.id,
    title: p.title,
    developer: p.developer,
    location: p.location,
    type: p.type,
    status: p.status,
    price: p.price,
    beds: p.beds,
    baths: p.baths,
    size: p.size,
  }));

  const customersSummary = customersData.map((c) => ({
    id: c.id,
    name: c.name,
    segment: c.segment,
    totalPurchased: c.totalPurchased,
    unitsOwned: c.unitsOwned,
    isVip: Boolean(c.isVip),
  }));

  const salesTrend = (salesTrendData || []).map((s) => ({
    month: s.month,
    value: s.value,
    year: s.year,
  }));

  const pipelineStages = (pipelineData || []).map((p) => ({
    name: p.name,
    count: p.count,
    conversionRate: p.conversionRate,
  }));

  const enquirySources = (enquiryData || []).map((e) => ({
    source: e.source,
    count: e.count,
    percentage: e.percentage,
  }));

  const followUpHealth = (followUpData || []).map((f) => ({
    metric: f.metric,
    value: f.value,
    label: f.label,
    sub: f.sub,
  }));

  return {
    metrics,
    leadsSummary,
    propertiesSummary,
    customersSummary,
    salesTrend,
    pipelineStages,
    enquirySources,
    followUpHealth,
  };
}

/**
 * Extracts key financial numbers from query to generate exact pre-computed benchmarks
 */
function extractFinancialMatrixFromQuery(query?: string): string {
  if (!query) return "";
  const q = query.toLowerCase();

  // Check for price or loan related query
  const match = q.match(/(\d[\d,\.]*)\s*(k|m|million|thousand)?/i);
  let price = 0;
  if (match) {
    let raw = parseFloat(match[1].replace(/,/g, ""));
    if (match[2]) {
      const u = match[2].toLowerCase();
      if (u.startsWith("m")) raw *= 1_000_000;
      else if (u.startsWith("k") || u.startsWith("thou")) raw *= 1_000;
    }
    if (raw >= 100000) price = raw;
  }

  if (price > 0 && (q.includes("mot") || q.includes("stamp") || q.includes("loan") || q.includes("mortgage") || q.includes("calculate") || q.includes("installment") || q.includes("yield") || q.includes("foreign"))) {
    const mot = calculateMOT(price);
    const mortgage = calculateMortgage(price, 10, 4.25, 30);
    const foreignKL = checkForeignBuyerEligibility("Kuala Lumpur", price);
    const foreignSelangor = checkForeignBuyerEligibility("Selangor", price);

    return `\n[PRE-CALCULATED FINANCIAL MATRIX FOR ${formatRM(price)}]
• Exact MOT Stamp Duty: ${formatRM(mot.totalStampDuty)} (Tier 1: ${formatRM(mot.tier1)}, Tier 2: ${formatRM(mot.tier2)}, Tier 3: ${formatRM(mot.tier3)}, Tier 4: ${formatRM(mot.tier4)})
• Legal Fee Estimate (SRO): ${formatRM(mot.estimatedLegalFees)} (Total Entry Cost: ${formatRM(mot.estimatedTotalEntryCost)})
• 90% Loan Amount (${formatRM(mortgage.loanAmount)}) @ 4.25% for 30 Years: ${formatRM(mortgage.monthlyInstallment)}/month
• Foreign Buyer Strata Eligibility: KL Eligible=${foreignKL.isEligible ? "YES" : "NO (Min RM1M)"} | Selangor Eligible=${foreignSelangor.isEligible ? "YES" : "NO (Min RM2M)"}
`;
  }
  return "";
}

export function formatSystemContextForPrompt(data: SystemDataContext, query?: string): string {
  const q = query ? query.toLowerCase() : "";

  // Smart Filtering (Mini-RAG): Prioritize relevant records if query specifies a lead, property, or location
  let filteredLeads = [...data.leadsSummary];
  let filteredProperties = [...data.propertiesSummary];

  if (q) {
    // If a specific lead name is mentioned
    const leadMatch = data.leadsSummary.filter((l) => q.includes(l.name.toLowerCase()));
    if (leadMatch.length > 0) {
      filteredLeads = [...leadMatch, ...data.leadsSummary.filter((l) => !q.includes(l.name.toLowerCase()))];
    }

    // If a specific location or property title is mentioned
    const propMatch = data.propertiesSummary.filter(
      (p) => q.includes(p.title.toLowerCase()) || q.includes(p.location.toLowerCase()) || q.includes(p.developer.toLowerCase())
    );
    if (propMatch.length > 0) {
      filteredProperties = [...propMatch, ...data.propertiesSummary.filter((p) => !propMatch.some((m) => m.id === p.id))];
    }
  }

  // Top prioritized leads by expected yield
  const topLeads = filteredLeads
    .sort((a, b) => (b.value * b.probability) - (a.value * a.probability))
    .slice(0, 15)
    .map(
      (l) =>
        `• [ID:${l.id}] ${l.name} (${l.segment}) | Priority:${l.priority} | Val:${formatRM(l.value)} | Prob:${l.probability}% | Target:"${l.property}" | Action:${l.action}${l.phone ? ` | Tel:${l.phone}` : ""}`
    )
    .join("\n");

  const propertiesList = filteredProperties
    .slice(0, 12)
    .map(
      (p) =>
        `• [ID:${p.id}] ${p.title} (${p.developer}) - ${p.location} | ${p.type} | ${formatRM(p.price)} | ${p.size} | ${p.beds}B/${p.baths}Ba | Status:${p.status}`
    )
    .join("\n");

  const customersList = data.customersSummary
    .slice(0, 8)
    .map(
      (c) =>
        `• [ID:${c.id}] ${c.name} | VIP:${c.isVip ? "Yes" : "No"} | Seg:${c.segment} | Units:${c.unitsOwned} | TotalSpent:${formatRM(c.totalPurchased)}`
    )
    .join("\n");

  const monthlySales = data.salesTrend
    .map((s) => `${s.month}: RM ${(s.value / 1_000_000).toFixed(2)}M`)
    .join(" | ");

  const pipelineSummary = data.pipelineStages
    .map((p) => `${p.name}: ${p.count} (${p.conversionRate}%)`)
    .join(" ➔ ");

  const enquirySummary = data.enquirySources
    .map((e) => `${e.source}: ${e.count} (${e.percentage}%)`)
    .join(", ");

  const followUpSummary = data.followUpHealth
    .map((f) => `${f.label}: ${f.value}`)
    .join(" | ");

  const financialMatrix = extractFinancialMatrixFromQuery(query);

  return `=== LIVE REAL-TIME DATABASE DUMP & BENCHMARKS ===
Total Active Leads: ${data.metrics.totalLeads} (High Priority: ${data.metrics.highPriority}) | Active Properties: ${data.metrics.activeProperties} | Expected Pipeline: ${formatRM(data.metrics.expectedSalesValue)} | Confirmed Buyers: ${data.metrics.totalCustomers}
[PIPELINE] ${pipelineSummary || "None"}
[SOURCES] ${enquirySummary || "None"}
[FOLLOW-UP] ${followUpSummary || "None"}
[2024 SALES] ${monthlySales || "None"}${financialMatrix}

[PROPERTIES PORTFOLIO]
${propertiesList || "No properties"}

[TOP ACTIVE LEADS]
${topLeads || "No leads"}

[VIP BUYERS]
${customersList || "No records"}
======================================`;
}

/**
 * Customer-safe context formatting — STRICTLY excludes leads, buyer contacts, pipeline data, and sales revenue.
 * Only includes public property listings and Malaysian property buying benchmarks.
 */
export function formatCustomerContextForPrompt(properties: Array<any>, query?: string): string {
  const q = query ? query.toLowerCase() : "";

  // Filter properties matching location or features if provided
  let filtered = [...properties];
  if (q) {
    const matched = properties.filter(
      (p) =>
        q.includes(p.title.toLowerCase()) ||
        q.includes(p.location.toLowerCase()) ||
        q.includes(p.developer.toLowerCase()) ||
        (p.type && q.includes(p.type.toLowerCase()))
    );
    if (matched.length > 0) {
      filtered = [...matched, ...properties.filter((p) => !matched.some((m) => m.id === p.id))];
    }
  }

  const propertiesList = filtered
    .slice(0, 20)
    .map(
      (p) =>
        `• [${p.title}] by ${p.developer} | ${p.location} | Type:${p.type} | Price:${formatRM(p.price)} | Size:${p.size} | ${p.beds} Beds, ${p.baths} Baths | Est. Yield:${p.rentalYield || "5.0%"}${p.badge ? ` | Badge:${p.badge}` : ""}${p.features ? ` | Features:${p.features}` : ""}`
    )
    .join("\n");

  const financialMatrix = extractFinancialMatrixFromQuery(query);

  return `=== PUBLIC RESIDENCE INVENTORY & MALAYSIAN REAL ESTATE GUIDELINES ===
[AVAILABLE PROPERTIES]
${propertiesList || "No properties currently listed."}${financialMatrix}

[MALAYSIAN REAL ESTATE BENCHMARKS & GUIDELINES]
• Standard Commercial Mortgage Rates: 4.10% – 4.35% p.a.
• Margin of Financing: Up to 90% for Malaysian citizens (1st/2nd home), 70%–80% for foreigners / MM2H holders.
• Maximum Recommended DSR (Debt Service Ratio): 60% – 70% of net monthly income.
• Foreign Purchaser Minimum Thresholds:
  - Kuala Lumpur (Strata residential): RM 1,000,000 minimum
  - Selangor (Strata / Landed residential): RM 2,000,000 minimum
  - State Consent Fee (EPU): Required for all foreign acquisitions.
• Malaysian MOT Stamp Duty Tier Schedule:
  - 1% on first RM 100,000
  - 2% on RM 100,001 to RM 500,000
  - 3% on RM 500,001 to RM 1,000,000
  - 4% on amount exceeding RM 1,000,000
• Loan Agreement Stamp Duty: 0.50% of total loan facility.
======================================================================`;
}
