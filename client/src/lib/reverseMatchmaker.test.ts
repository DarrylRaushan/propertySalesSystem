import { describe, it, expect } from "vitest";
import {
  parseBudgetValue,
  scoreBudget,
  scoreLocation,
  scoreSpecs,
  scoreIntent,
  rankBuyersForProperty,
  type PropertySpec,
  type CandidateBuyer,
} from "./reverseMatchmaker";

describe("Reverse Property-to-Buyer Matchmaker Engine", () => {
  const sampleProperty: PropertySpec = {
    id: 101,
    name: "Asteria Residences",
    developer: "Sunway Property",
    location: "Petaling Jaya, Selangor",
    price: 1250000,
    type: "Condominium",
    beds: 3,
    size: "1,350 sq ft",
    status: "Viewing Available",
  };

  it("correctly parses diverse budget string formats and numbers", () => {
    expect(parseBudgetValue(1250000).target).toBe(1250000);
    expect(parseBudgetValue("RM 1,250,000").target).toBe(1250000);

    const range = parseBudgetValue("RM 1,000,000 - RM 1,500,000");
    expect(range.min).toBe(1000000);
    expect(range.max).toBe(1500000);
    expect(range.target).toBe(1250000);

    const milRange = parseBudgetValue("RM 2.5M - RM 4.5M");
    expect(milRange.min).toBe(2500000);
    expect(milRange.max).toBe(4500000);
  });

  it("scores budget alignment with high confidence when price matches target", () => {
    const budget = parseBudgetValue(1250000);
    const result = scoreBudget(budget, 1250000);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.fitPercent).toBeGreaterThanOrEqual(90);
  });

  it("scores location proximity using regional cluster matching", () => {
    // Exact match
    const exact = scoreLocation("Petaling Jaya, Selangor", "Petaling Jaya, Selangor");
    expect(exact.score).toBeGreaterThanOrEqual(95);

    // Nearby cluster: Damansara to Petaling Jaya (both central Selangor)
    const cluster = scoreLocation("Damansara, Selangor", "Petaling Jaya, Selangor");
    expect(cluster.score).toBeGreaterThanOrEqual(85);
  });

  it("ranks candidates in descending order of compatibility score", () => {
    const candidates: CandidateBuyer[] = [
      {
        id: "b1",
        name: "Aiman Faris",
        sourceType: "lead",
        segment: "Ready Buyer",
        location: "Petaling Jaya, Selangor",
        budget: 1250000,
        preferredTypes: "Condominium",
        minBeds: 3,
        probability: 92,
      },
      {
        id: "b2",
        name: "Farah Mohd",
        sourceType: "lead",
        segment: "Researcher",
        location: "Ampang, Kuala Lumpur",
        budget: 590000,
        preferredTypes: "Landed terrace",
        minBeds: 4,
        probability: 57,
      },
      {
        id: "b3",
        name: "Sarah Lim",
        sourceType: "vip_client",
        segment: "Investor",
        location: "Mont Kiara, Kuala Lumpur",
        budget: "RM 1,200,000 - RM 1,800,000",
        preferredTypes: "Condominium,Serviced residence",
        minBeds: 2,
        isVip: true,
      },
    ];

    const ranked = rankBuyersForProperty(sampleProperty, candidates);

    expect(ranked.length).toBe(3);
    // Aiman Faris should be top rank (#1) with >= 85 score (Hot Match)
    expect(ranked[0].buyer.name).toBe("Aiman Faris");
    expect(ranked[0].scores.matchTier).toBe("hot");
    expect(ranked[0].scores.overallScore).toBeGreaterThanOrEqual(85);

    // Farah Mohd should have lowest score because budget (590k vs 1.25M) and location mismatch
    expect(ranked[2].buyer.name).toBe("Farah Mohd");
    expect(ranked[0].scores.overallScore).toBeGreaterThan(ranked[2].scores.overallScore);

    // WhatsApp pitch is generated with property name and price
    expect(ranked[0].scores.whatsAppTemplate).toContain("Asteria Residences");
    expect(ranked[0].scores.whatsAppTemplate).toContain("RM 1,250,000");
  });
});
