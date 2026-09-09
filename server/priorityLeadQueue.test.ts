import { describe, expect, it } from "vitest";
import {
  hasMoreLeadPages,
  initialLeadCount,
  nextLeadCount,
  calculateLeadExpectedValue,
  calculateLeadPriorityScore,
  deriveLeadPriorityTier,
  sortPriorityLeads,
  PRIORITY_LEAD_PAGE_SIZE,
  PRIORITY_LEAD_WINDOW_SIZE,
} from "../client/src/components/priorityLeadQueue";

describe("priority lead queue pagination", () => {
  it("opens with no more than five leads in the interactive viewport", () => {
    expect(initialLeadCount(12)).toBe(PRIORITY_LEAD_WINDOW_SIZE);
    expect(initialLeadCount(3)).toBe(3);
  });

  it("adds one incremental page without exceeding the available lead count", () => {
    expect(nextLeadCount(PRIORITY_LEAD_WINDOW_SIZE, 12)).toBe(PRIORITY_LEAD_WINDOW_SIZE + PRIORITY_LEAD_PAGE_SIZE);
    expect(nextLeadCount(11, 12)).toBe(12);
  });

  it("reports whether the scroll queue can load another page", () => {
    expect(hasMoreLeadPages(5, 12)).toBe(true);
    expect(hasMoreLeadPages(12, 12)).toBe(false);
  });
});

describe("priority lead scoring and ranking logic", () => {
  it("accurately calculates expected pipeline value based on deal size and close probability", () => {
    expect(calculateLeadExpectedValue(1_250_000, 92)).toBe(1_150_000);
    expect(calculateLeadExpectedValue(600_000, 50)).toBe(300_000);
    expect(calculateLeadExpectedValue("1000000", 75)).toBe(750_000);
  });

  it("assigns higher composite priority scores to ready buyers with high closing fit and urgent actions", () => {
    const highLead = {
      name: "Aiman Faris",
      probability: 92,
      value: 1250000,
      segment: "Ready Buyer",
      action: "Schedule viewing",
    };
    const lowLead = {
      name: "Siti Yusuf",
      probability: 61,
      value: 680000,
      segment: "Low Engagement",
      action: "Re-open conversation",
    };

    const highPriorityScore = calculateLeadPriorityScore(highLead);
    const lowPriorityScore = calculateLeadPriorityScore(lowLead);

    expect(highPriorityScore).toBeGreaterThan(lowPriorityScore);
    expect(deriveLeadPriorityTier(highLead)).toBe("High");
  });

  it("sorts leads by priority score descending by default", () => {
    const leads = [
      { id: 1, name: "Low Lead", probability: 55, value: 500000, segment: "Low Engagement", action: "Follow up" },
      { id: 2, name: "Top Opportunity", probability: 90, value: 1400000, segment: "Ready Buyer", action: "Confirm viewing slot" },
      { id: 3, name: "Mid Investor", probability: 70, value: 950000, segment: "Investor", action: "Send yield analysis" },
    ];

    const sorted = sortPriorityLeads(leads);
    expect(sorted[0].name).toBe("Top Opportunity");
    expect(sorted[1].name).toBe("Mid Investor");
    expect(sorted[2].name).toBe("Low Lead");
  });
});
