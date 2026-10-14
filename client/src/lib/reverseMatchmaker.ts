/**
 * Reverse Property-to-Buyer Matchmaker Engine
 * Calculates multi-dimensional compatibility between real estate inventory and active CRM buyers/leads.
 */

export interface PropertySpec {
  id: number;
  name: string;
  developer: string;
  location: string;
  price: number;
  type: string;
  beds: number;
  size: string;
  status?: string;
  badge?: string | null;
  image?: string;
  imageUrl?: string;
  agentId?: string;
}

export interface CandidateBuyer {
  id: string | number;
  name: string;
  initials?: string;
  sourceType: "lead" | "portal_account" | "vip_client";
  segment?: string;
  phone?: string;
  email?: string;
  location?: string;
  budget?: number | string;
  preferredTypes?: string;
  minBeds?: number;
  probability?: number;
  propertyOfInterest?: string;
  isVip?: boolean;
  notes?: string;
  agentId?: string;
}

export interface MatchScoreDetails {
  budgetScore: number;
  budgetDetail: string;
  budgetFitPercent: number;
  locationScore: number;
  locationDetail: string;
  specsScore: number;
  specsDetail: string;
  intentScore: number;
  intentDetail: string;
  overallScore: number;
  matchTier: "hot" | "strong" | "prospect";
  topReasons: string[];
  whatsAppTemplate: string;
}

export interface ReverseMatchResult {
  buyer: CandidateBuyer;
  scores: MatchScoreDetails;
}

export const formatRM = (val: number) =>
  `RM ${Math.round(val).toLocaleString("en-MY")}`;

export const initialsFromName = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "??";

/**
 * Extracts numeric budget or [min, max] range from budget values.
 */
export function parseBudgetValue(raw: number | string | undefined | null): { min: number; max: number; target: number } {
  if (raw === undefined || raw === null || raw === "") {
    return { min: 0, max: 0, target: 0 };
  }
  if (typeof raw === "number") {
    return { min: raw * 0.85, max: raw * 1.15, target: raw };
  }

  const str = String(raw).replace(/,/g, "");
  // Check for range e.g. "RM 2,500,000 - RM 4,500,000" or "2500000 - 4500000"
  const rangeMatch = str.match(/(?:RM\s*)?(\d+(?:\.\d+)?)\s*(?:M|m|k|K)?\s*[-–—to]+\s*(?:RM\s*)?(\d+(?:\.\d+)?)\s*(?:M|m|k|K)?/i);
  if (rangeMatch) {
    let low = parseFloat(rangeMatch[1]);
    let high = parseFloat(rangeMatch[2]);
    if (low < 100) low *= 1_000_000;
    if (high < 100) high *= 1_000_000;
    return { min: low, max: high, target: (low + high) / 2 };
  }

  // Single number inside string
  const numMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    let num = parseFloat(numMatch[1]);
    if (str.toLowerCase().includes("m") && num < 100) num *= 1_000_000;
    else if (str.toLowerCase().includes("k") && num < 1000) num *= 1_000;
    return { min: num * 0.85, max: num * 1.15, target: num };
  }

  return { min: 0, max: 0, target: 0 };
}

/**
 * Malaysian Regional Clusters for intelligent location proximity matching.
 */
const REGIONAL_CLUSTERS: Record<string, string[]> = {
  selangor_central: ["petaling jaya", "pj", "subang", "subang jaya", "damansara", "bandar utama", "kelana jaya"],
  selangor_west: ["shah alam", "setia alam", "elmina", "klang", "kota kemuning"],
  selangor_south: ["cyberjaya", "putrajaya", "seri kembangan", "puchong"],
  kl_prime: ["klcc", "mont kiara", "hartamas", "bangsar", "bangsar south", "damansara heights", "bukit bintang", "city centre"],
  kl_east: ["ampang", "ampang hilir", "cheras", "setapak", "wangsa maju", "taman vista"],
  johor: ["johor bahru", "iskandar puteri", "medini", "puteri harbour"],
};

function normalizeLocation(loc: string): string {
  return loc.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

function findCluster(loc: string): string | null {
  const norm = normalizeLocation(loc);
  for (const [clusterKey, keywords] of Object.entries(REGIONAL_CLUSTERS)) {
    if (keywords.some((k) => norm.includes(k))) {
      return clusterKey;
    }
  }
  return null;
}

/**
 * Evaluates budget compatibility.
 */
export function scoreBudget(buyerBudget: { min: number; max: number; target: number }, price: number): {
  score: number;
  detail: string;
  fitPercent: number;
} {
  if (buyerBudget.target <= 0) {
    return {
      score: 65,
      detail: "Flexible budget · No hard limit declared",
      fitPercent: 65,
    };
  }

  // Case 1: Inside explicitly specified min-max bracket
  if (price >= buyerBudget.min && price <= buyerBudget.max) {
    return {
      score: 98,
      detail: `Within target window (${formatRM(buyerBudget.min)} - ${formatRM(buyerBudget.max)})`,
      fitPercent: 100,
    };
  }

  const ratio = price / buyerBudget.target;

  // Case 2: Price is slightly below budget (Buyer has budget headroom)
  if (ratio >= 0.80 && ratio < 1.0) {
    const diff = Math.round((1 - ratio) * 100);
    return {
      score: 94,
      detail: `Comfortable headroom (${diff}% under max budget)`,
      fitPercent: 95,
    };
  }

  // Case 3: Price is exactly at or slightly above target (up to 12% stretch)
  if (ratio >= 1.0 && ratio <= 1.12) {
    const diff = Math.round((ratio - 1) * 100);
    return {
      score: 90,
      detail: `Direct target alignment (+${diff}% mild stretch)`,
      fitPercent: 92,
    };
  }

  // Case 4: Moderate stretch or moderate discount (12% - 25%)
  if (ratio > 1.12 && ratio <= 1.25) {
    return {
      score: 75,
      detail: `Stretch candidate (+${Math.round((ratio - 1) * 100)}% over indicative)`,
      fitPercent: 75,
    };
  }

  if (ratio >= 0.65 && ratio < 0.80) {
    return {
      score: 78,
      detail: `Strong value entry (${Math.round((1 - ratio) * 100)}% below budget)`,
      fitPercent: 80,
    };
  }

  // Case 5: Out of range (>35% discrepancy)
  const score = Math.max(35, Math.round(100 - Math.abs(ratio - 1) * 60));
  return {
    score,
    detail: ratio > 1 ? "Exceeds current indicative budget" : "Substantially under budget preference",
    fitPercent: Math.max(30, Math.round(100 - Math.abs(ratio - 1) * 50)),
  };
}

/**
 * Evaluates location compatibility.
 */
export function scoreLocation(buyerLoc: string | undefined, propertyLoc: string): {
  score: number;
  detail: string;
} {
  if (!buyerLoc || buyerLoc.trim() === "") {
    return {
      score: 70,
      detail: "Open location criteria · Klang Valley broad interest",
    };
  }

  const bNorm = normalizeLocation(buyerLoc);
  const pNorm = normalizeLocation(propertyLoc);

  // Exact substring match
  if (bNorm.includes(pNorm) || pNorm.includes(bNorm)) {
    return {
      score: 98,
      detail: `Exact district match in ${propertyLoc}`,
    };
  }

  // Shared regional cluster
  const bCluster = findCluster(buyerLoc);
  const pCluster = findCluster(propertyLoc);

  if (bCluster && pCluster && bCluster === pCluster) {
    return {
      score: 90,
      detail: `Adjacent neighborhood within same arterial corridor`,
    };
  }

  // Shared state (Selangor vs KL)
  const isBothSelangor = bNorm.includes("selangor") && pNorm.includes("selangor");
  const isBothKL = (bNorm.includes("kuala lumpur") || bNorm.includes("kl")) &&
    (pNorm.includes("kuala lumpur") || pNorm.includes("kl"));

  if (isBothSelangor || isBothKL) {
    return {
      score: 78,
      detail: `Same metropolitan jurisdiction`,
    };
  }

  return {
    score: 55,
    detail: `Alternative region · Expansion prospect`,
  };
}

/**
 * Evaluates Property Type and Bedroom spec fit.
 */
export function scoreSpecs(
  buyerTypes: string | undefined,
  minBeds: number | undefined,
  property: PropertySpec
): { score: number; detail: string } {
  let score = 70;
  const reasons: string[] = [];

  // Bedroom evaluation
  if (minBeds && minBeds > 0) {
    if (property.beds >= minBeds) {
      score += 15;
      reasons.push(`${property.beds} suites fulfills ${minBeds}+ requirement`);
    } else {
      score -= 20;
      reasons.push(`${property.beds} suites below ${minBeds} preferred beds`);
    }
  } else {
    score += 10;
    reasons.push(`${property.beds} bedrooms layout suitable for profile`);
  }

  // Property type match
  if (buyerTypes) {
    const pTypeNorm = property.type.toLowerCase();
    const bTypesNorm = buyerTypes.toLowerCase();
    if (bTypesNorm.includes(pTypeNorm) || pTypeNorm.includes(bTypesNorm)) {
      score += 15;
      reasons.push(`Prefers ${property.type} developments`);
    }
  }

  return {
    score: Math.min(100, Math.max(40, score)),
    detail: reasons.join(" · ") || "Standard residential configuration",
  };
}

/**
 * Evaluates Buyer Urgency & Persona Intent.
 */
export function scoreIntent(buyer: CandidateBuyer, property: PropertySpec): { score: number; detail: string } {
  let score = 65;
  const details: string[] = [];

  if (buyer.segment === "Ready Buyer") {
    score += 20;
    details.push("High-urgency Ready Buyer");
  } else if (buyer.segment?.includes("Investor")) {
    score += 16;
    details.push("Active investor seeking rental yield");
  } else if (buyer.segment?.includes("Luxury") || buyer.segment?.includes("High Net Worth")) {
    score += 18;
    details.push("High Net Worth portfolio expansion");
  } else if (buyer.segment === "First-time Buyer") {
    score += 12;
    details.push("Motivated home seeker");
  }

  if (buyer.isVip) {
    score += 10;
    details.push("Verified VIP client in CRM");
  }

  if (buyer.probability && buyer.probability >= 75) {
    score += 8;
    details.push(`${buyer.probability}% pipeline closing probability`);
  }

  return {
    score: Math.min(100, Math.max(50, score)),
    detail: details.slice(0, 2).join(" · ") || "Active prospective buyer in funnel",
  };
}

/**
 * Generates an executive Malaysian luxury real-estate WhatsApp outreach message.
 */
export function generateWhatsAppPitch(buyer: CandidateBuyer, property: PropertySpec, reasons: string[]): string {
  const firstName = buyer.name.split(" ")[0];
  const hook = reasons[0] || "matches your investment and lifestyle preferences";

  return [
    `🏛️ *PROPERLY LUXURY REAL ESTATE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Hi *${firstName}*, hope you're having a productive week!`,
    ``,
    `I wanted to share a newly available opportunity at *${property.name}* in *${property.location}* that strongly aligns with your profile:`,
    ``,
    `✨ *Key Development Highlights:*`,
    `• *Asking:* ${formatRM(property.price)} (${property.size})`,
    `• *Layout:* ${property.beds} Suites · ${property.type}`,
    `• *Developer:* ${property.developer}`,
    `• *Match Factor:* ${hook}`,
    ``,
    `Would you be open for a private 3D walkthrough or a preview tour this week?`,
    ``,
    `Warm regards,`,
    `*Properly Concierge Team*`,
  ].join("\n");
}

/**
 * Core Reverse Matchmaker algorithm: Ranks all candidates against a given property.
 */
export function rankBuyersForProperty(
  property: PropertySpec,
  candidates: CandidateBuyer[]
): ReverseMatchResult[] {
  const results: ReverseMatchResult[] = [];

  for (const buyer of candidates) {
    // 1. Budget Score (Weight: 35%)
    const budgetData = parseBudgetValue(buyer.budget);
    const budgetRes = scoreBudget(budgetData, property.price);

    // 2. Location Score (Weight: 25%)
    const locationRes = scoreLocation(buyer.location, property.location);

    // 3. Specs Score (Weight: 20%)
    const specsRes = scoreSpecs(buyer.preferredTypes, buyer.minBeds, property);

    // 4. Intent Score (Weight: 20%)
    const intentRes = scoreIntent(buyer, property);

    // Weighted Overall Score
    const overall = Math.round(
      budgetRes.score * 0.35 +
      locationRes.score * 0.25 +
      specsRes.score * 0.20 +
      intentRes.score * 0.20
    );

    const clampedOverall = Math.min(99, Math.max(48, overall));

    const matchTier: "hot" | "strong" | "prospect" =
      clampedOverall >= 85 ? "hot" : clampedOverall >= 70 ? "strong" : "prospect";

    // Collect top highlights
    const topReasons: string[] = [];
    if (budgetRes.score >= 88) topReasons.push(budgetRes.detail);
    if (locationRes.score >= 85) topReasons.push(locationRes.detail);
    if (specsRes.score >= 85) topReasons.push(specsRes.detail);
    if (intentRes.score >= 85) topReasons.push(intentRes.detail);
    if (topReasons.length === 0) topReasons.push(budgetRes.detail);

    const whatsAppTemplate = generateWhatsAppPitch(buyer, property, topReasons);

    results.push({
      buyer: {
        ...buyer,
        initials: buyer.initials || initialsFromName(buyer.name),
      },
      scores: {
        budgetScore: budgetRes.score,
        budgetDetail: budgetRes.detail,
        budgetFitPercent: budgetRes.fitPercent,
        locationScore: locationRes.score,
        locationDetail: locationRes.detail,
        specsScore: specsRes.score,
        specsDetail: specsRes.detail,
        intentScore: intentRes.score,
        intentDetail: intentRes.detail,
        overallScore: clampedOverall,
        matchTier,
        topReasons: topReasons.slice(0, 3),
        whatsAppTemplate,
      },
    });
  }

  // Sort descending by overall compatibility score
  return results.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
}
