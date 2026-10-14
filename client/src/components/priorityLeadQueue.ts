export const PRIORITY_LEAD_WINDOW_SIZE = 5;
export const PRIORITY_LEAD_PAGE_SIZE = 3;

export function initialLeadCount(total: number) {
  return Math.min(Math.max(total, 0), PRIORITY_LEAD_WINDOW_SIZE);
}

export function nextLeadCount(currentCount: number, total: number) {
  return Math.min(Math.max(currentCount, 0) + PRIORITY_LEAD_PAGE_SIZE, Math.max(total, 0));
}

export function hasMoreLeadPages(currentCount: number, total: number) {
  return Math.max(currentCount, 0) < Math.max(total, 0);
}

export type LeadScoringInput = {
  probability: number;
  value: number | string;
  segment?: string;
  priority?: string;
  action?: string;
  lastContacted?: string;
};

// Segment readiness multiplier
export const SEGMENT_MULTIPLIERS: Record<string, number> = {
  "Ready Buyer": 1.0,
  "Investor": 0.9,
  "Researcher": 0.65,
  "Low Engagement": 0.4,
};

// High-urgency action keywords that warrant immediate priority
const URGENT_ACTIONS = [
  "viewing",
  "offer",
  "estimate",
  "yield",
  "close",
  "confirm",
  "schedule",
];

export function calculateLeadExpectedValue(value: number | string, probability: number): number {
  const numVal = typeof value === "number" ? value : parseFloat(value) || 0;
  return Math.round((numVal * Math.min(Math.max(probability, 0), 100)) / 100);
}

export function calculateLeadPriorityScore(lead: LeadScoringInput): number {
  const prob = Math.min(Math.max(lead.probability, 0), 100);
  const numVal = typeof lead.value === "number" ? lead.value : parseFloat(String(lead.value)) || 0;

  // 1. Fit component (0-45 points): based on closing probability
  const fitScore = (prob / 100) * 45;

  // 2. Value component (0-30 points): normalized against typical benchmark (e.g. RM 1.5M benchmark)
  const normalizedValue = Math.min(numVal / 1_500_000, 1);
  const valueScore = normalizedValue * 30;

  // 3. Segment readiness component (0-15 points)
  const segmentWeight = SEGMENT_MULTIPLIERS[lead.segment ?? ""] ?? 0.6;
  const segmentScore = segmentWeight * 15;

  // 4. Action / Urgency component (0-10 points)
  let actionScore = 5;
  if (lead.action) {
    const actionLower = lead.action.toLowerCase();
    if (URGENT_ACTIONS.some((k) => actionLower.includes(k))) {
      actionScore = 10;
    }
  }

  const totalScore = Math.round(fitScore + valueScore + segmentScore + actionScore);
  return Math.min(Math.max(totalScore, 0), 100);
}

export function deriveLeadPriorityTier(lead: LeadScoringInput): "High" | "Medium" | "Low" {
  const score = calculateLeadPriorityScore(lead);
  const numVal = typeof lead.value === "number" ? lead.value : parseFloat(String(lead.value)) || 0;

  // High: Composite score >= 70 OR (Probability >= 75% AND Value >= RM 750k)
  if (score >= 70 || (lead.probability >= 75 && numVal >= 750_000)) {
    return "High";
  }
  // Medium: Composite score >= 45
  if (score >= 45 || lead.probability >= 60) {
    return "Medium";
  }
  return "Low";
}

export type LeadSortOption = "priority" | "expectedValue" | "probability" | "value";

export function sortPriorityLeads<T extends LeadScoringInput>(
  leads: T[],
  sortBy: LeadSortOption = "priority"
): T[] {
  return [...leads].sort((a, b) => {
    if (sortBy === "expectedValue") {
      return calculateLeadExpectedValue(b.value, b.probability) - calculateLeadExpectedValue(a.value, a.probability);
    }
    if (sortBy === "probability") {
      return b.probability - a.probability;
    }
    if (sortBy === "value") {
      const bVal = typeof b.value === "number" ? b.value : parseFloat(String(b.value)) || 0;
      const aVal = typeof a.value === "number" ? a.value : parseFloat(String(a.value)) || 0;
      return bVal - aVal;
    }
    // Default: Sort by composite priority score descending, breaking ties by expected value
    const scoreB = calculateLeadPriorityScore(b);
    const scoreA = calculateLeadPriorityScore(a);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return calculateLeadExpectedValue(b.value, b.probability) - calculateLeadExpectedValue(a.value, a.probability);
  });
}
