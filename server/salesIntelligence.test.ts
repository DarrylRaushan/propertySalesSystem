import { describe, expect, it } from "vitest";
import { buildSalesIntelligence, getFunnelStageContext } from "../shared/salesIntelligence";

const leads = [
  { id: 1, name: "Aiman", location: "Petaling Jaya, Selangor", property: "Asteria", value: 1_250_000, probability: 92, priority: "High" as const, action: "Schedule viewing", lastContacted: "2026-08-11T00:00:00.000Z" },
  { id: 2, name: "Joanne", location: "Bangsar South, Kuala Lumpur", property: "Southlink", value: 1_350_000, probability: 69, priority: "Medium" as const, action: "Follow up", lastContacted: "2026-08-05T00:00:00.000Z" },
];
const sources = [
  { label: "Organic enquiries", value: 168, color: "#287462", note: "Search" },
  { label: "Portal campaigns", value: 124, color: "#4b8a70", note: "Portals" },
  { label: "Referrals", value: 82, color: "#83a866", note: "Partners" },
];
const testNow = Date.parse("2026-08-13T00:00:00.000Z");

describe("sales intelligence", () => {
  it("creates a 30/60/90 forecast and expresses the largest funnel leak", () => {
    const result = buildSalesIntelligence(leads, sources, 18_400_000, testNow);
    expect(result.forecasts.map((item) => item.expectedRevenue)).toEqual([5_704_000, 11_592_000, 18_400_000]);
    expect(result.leak).toMatchObject({ from: "Qualified", to: "Viewings", lost: 108, conversion: 34 });
  });

  it("ranks demand drivers and produces concrete overdue, cooling, priority, funnel, and channel interventions", () => {
    const result = buildSalesIntelligence(leads, sources, 18_400_000, testNow);
    expect(result.sourceDrivers[0]?.label).toBe("Referrals");
    expect(result.locationDrivers[0]?.label).toBe("Petaling Jaya");
    expect(result.interventions.map((item) => item.kind)).toEqual(["Overdue follow-up", "Cooling value", "Priority lead", "Funnel leak", "Channel decision"]);
    expect(result.interventions[0]).toMatchObject({ title: "Re-open Joanne", urgency: "Overdue" });
  });

  it("expresses the selected funnel stage as a share of enquiries and a conversion from the preceding stage", () => {
    const result = buildSalesIntelligence(leads, sources, 18_400_000, testNow);
    expect(getFunnelStageContext(result.funnel, 2)).toMatchObject({ label: "Viewings", value: 56, percentage: 13, conversion: 34, previousLabel: "Qualified" });
    expect(getFunnelStageContext(result.funnel, 0)).toMatchObject({ label: "Enquiries", percentage: 100, conversion: null });
  });
});
