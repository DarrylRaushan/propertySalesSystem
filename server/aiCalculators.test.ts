import { describe, expect, it } from "vitest";
import {
  calculateMOT,
  calculateMortgage,
  evaluateDSR,
  calculateRentalYield,
  checkForeignBuyerEligibility,
  formatRM,
} from "./aiCalculators";

describe("Malaysian Real Estate Financial Calculators", () => {
  describe("calculateMOT", () => {
    it("correctly calculates tiered MOT stamp duty for RM 1,500,000 property", () => {
      // Tier 1: 100k * 1% = 1,000
      // Tier 2: 400k * 2% = 8,000
      // Tier 3: 500k * 3% = 15,000
      // Tier 4: 500k * 4% = 20,000
      // Total = 44,000
      const result = calculateMOT(1500000);
      expect(result.tier1).toBe(1000);
      expect(result.tier2).toBe(8000);
      expect(result.tier3).toBe(15000);
      expect(result.tier4).toBe(20000);
      expect(result.totalStampDuty).toBe(44000);
      expect(result.estimatedLegalFees).toBeGreaterThan(0);
      expect(result.estimatedTotalEntryCost).toBe(result.totalStampDuty + result.estimatedLegalFees);
    });

    it("correctly calculates MOT stamp duty for RM 400,000 property", () => {
      // Tier 1: 100k * 1% = 1,000
      // Tier 2: 300k * 2% = 6,000
      // Total = 7,000
      const result = calculateMOT(400000);
      expect(result.tier1).toBe(1000);
      expect(result.tier2).toBe(6000);
      expect(result.tier3).toBe(0);
      expect(result.tier4).toBe(0);
      expect(result.totalStampDuty).toBe(7000);
    });
  });

  describe("calculateMortgage", () => {
    it("calculates accurate monthly installment for RM 1,000,000 property with 10% down at 4.25% for 30 years", () => {
      const result = calculateMortgage(1000000, 10, 4.25, 30);
      expect(result.downPaymentAmount).toBe(100000);
      expect(result.loanAmount).toBe(900000);
      // Monthly installment for 900k @ 4.25% for 30y is approx ~RM 4,428
      expect(result.monthlyInstallment).toBeGreaterThan(4400);
      expect(result.monthlyInstallment).toBeLessThan(4460);
      expect(result.totalRepayment).toBe(result.monthlyInstallment * 360);
    });
  });

  describe("evaluateDSR", () => {
    it("correctly assesses affordable DSR under 60%", () => {
      const result = evaluateDSR(12000, 2000, 4000, 70);
      // Total commitments = 6,000 / 12,000 = 50.0%
      expect(result.dsrPercentage).toBe(50);
      expect(result.isAffordable).toBe(true);
      expect(result.affordabilityStatus).toBe("Comfortable");
    });

    it("flags unaffordable DSR over 70%", () => {
      const result = evaluateDSR(10000, 4000, 4500, 70);
      // Total commitments = 8,500 / 10,000 = 85.0%
      expect(result.dsrPercentage).toBe(85);
      expect(result.isAffordable).toBe(false);
      expect(result.affordabilityStatus).toBe("Exceeds DSR Threshold");
    });
  });

  describe("calculateRentalYield", () => {
    it("calculates accurate gross and net rental yield", () => {
      // RM 1.2M property renting for RM 5,500/mo with RM 500/mo maintenance
      const result = calculateRentalYield(1200000, 5500, 500);
      expect(result.annualRental).toBe(66000);
      expect(result.annualGrossYield).toBe(5.5);
      expect(result.annualNetYield).toBe(5.0);
    });
  });

  describe("checkForeignBuyerEligibility", () => {
    it("validates RM 1.5M condo in Kuala Lumpur as eligible", () => {
      const result = checkForeignBuyerEligibility("Kuala Lumpur", 1500000);
      expect(result.isEligible).toBe(true);
      expect(result.minThreshold).toBe(1000000);
    });

    it("flags RM 1.5M condo in Selangor as below threshold", () => {
      const result = checkForeignBuyerEligibility("Petaling Jaya, Selangor", 1500000);
      expect(result.isEligible).toBe(false);
      expect(result.minThreshold).toBe(2000000);
    });
  });

  describe("formatRM", () => {
    it("formats millions cleanly", () => {
      expect(formatRM(1500000)).toBe("RM 1.5M");
      expect(formatRM(2000000)).toBe("RM 2M");
      expect(formatRM(850000)).toBe("RM 850,000");
    });
  });
});
