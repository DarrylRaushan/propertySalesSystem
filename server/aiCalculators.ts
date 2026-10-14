/**
 * Malaysian Real Estate Financial Engine
 * Provides deterministic, mathematically exact calculations for:
 * - Tiered Memorandum of Transfer (MOT) Stamp Duty & Legal Fees
 * - Monthly Mortgage Amortization & Repayment Schedules
 * - Debt Service Ratio (DSR) Affordability Analysis
 * - Gross and Net Rental Yield
 * - Foreign Buyer Regulatory Eligibility (State-by-State Thresholds)
 */

export interface MOTBreakdown {
  propertyPrice: number;
  tier1: number; // 1% on first RM100,000
  tier2: number; // 2% on RM100,001 - RM500,000
  tier3: number; // 3% on RM500,001 - RM1,000,000
  tier4: number; // 4% on balance above RM1,000,000
  totalStampDuty: number;
  estimatedLegalFees: number;
  estimatedTotalEntryCost: number;
}

export interface MortgageDetails {
  propertyPrice: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  loanAmount: number;
  annualInterestRate: number; // in percent e.g. 4.25
  tenureYears: number;
  monthlyInstallment: number;
  totalInterestPayable: number;
  totalRepayment: number;
}

export interface DSREvaluation {
  monthlyGrossIncome: number;
  monthlyNetIncome: number;
  existingMonthlyCommitments: number;
  proposedMonthlyMortgage: number;
  totalMonthlyCommitments: number;
  dsrPercentage: number;
  maxAllowableDSR: number;
  isAffordable: boolean;
  recommendedMaxLoan: number;
  affordabilityStatus: "Highly Affordable" | "Comfortable" | "Tight / High Risk" | "Exceeds DSR Threshold";
}

export interface RentalYieldBreakdown {
  propertyPrice: number;
  monthlyRental: number;
  annualRental: number;
  estimatedMonthlyMaintenance: number;
  annualGrossYield: number; // Percentage
  annualNetYield: number;   // Percentage
}

export interface ForeignBuyerCheck {
  state: "Kuala Lumpur" | "Selangor" | "Penang" | "Johor" | "Other";
  propertyType: "Strata / Condo" | "Landed Commercial" | "Landed Residential";
  price: number;
  minThreshold: number;
  isEligible: boolean;
  stateConsentRequired: boolean;
  estimatedStateLevyPercentage: number;
  notes: string;
}

/**
 * 1. Calculate Malaysian MOT Stamp Duty based on official tiered schedule
 * Tier 1: First RM100,000 -> 1%
 * Tier 2: Next RM400,000 (RM100k-RM500k) -> 2%
 * Tier 3: Next RM500,000 (RM500k-RM1M) -> 3%
 * Tier 4: Balance above RM1,000,000 -> 4%
 */
export function calculateMOT(propertyPrice: number): MOTBreakdown {
  const price = Math.max(0, propertyPrice);

  let tier1 = 0;
  let tier2 = 0;
  let tier3 = 0;
  let tier4 = 0;

  if (price > 0) {
    tier1 = Math.min(price, 100000) * 0.01;
  }
  if (price > 100000) {
    tier2 = (Math.min(price, 500000) - 100000) * 0.02;
  }
  if (price > 500000) {
    tier3 = (Math.min(price, 1000000) - 500000) * 0.03;
  }
  if (price > 1000000) {
    tier4 = (price - 1000000) * 0.04;
  }

  const totalStampDuty = Math.round(tier1 + tier2 + tier3 + tier4);

  // Malaysian Solicitors' Remuneration Order (SRO) legal fee estimate
  // First RM500k: 1.25%, Next RM7.5M: 1.0%
  let legalFees = 0;
  if (price > 0) {
    legalFees += Math.min(price, 500000) * 0.0125;
  }
  if (price > 500000) {
    legalFees += (price - 500000) * 0.01;
  }
  const estimatedLegalFees = Math.round(legalFees);

  return {
    propertyPrice: price,
    tier1: Math.round(tier1),
    tier2: Math.round(tier2),
    tier3: Math.round(tier3),
    tier4: Math.round(tier4),
    totalStampDuty,
    estimatedLegalFees,
    estimatedTotalEntryCost: totalStampDuty + estimatedLegalFees,
  };
}

/**
 * 2. Calculate Monthly Mortgage Installment & Amortization
 * Formula: M = P * [ r(1+r)^n ] / [ (1+r)^n - 1 ]
 */
export function calculateMortgage(
  propertyPrice: number,
  downPaymentPercent: number = 10,
  annualInterestRate: number = 4.25,
  tenureYears: number = 30
): MortgageDetails {
  const price = Math.max(0, propertyPrice);
  const downPaymentAmount = Math.round(price * (downPaymentPercent / 100));
  const loanAmount = price - downPaymentAmount;

  if (loanAmount <= 0 || tenureYears <= 0 || annualInterestRate <= 0) {
    return {
      propertyPrice: price,
      downPaymentPercent,
      downPaymentAmount,
      loanAmount: Math.max(0, loanAmount),
      annualInterestRate,
      tenureYears,
      monthlyInstallment: 0,
      totalInterestPayable: 0,
      totalRepayment: 0,
    };
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  const totalMonths = tenureYears * 12;

  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyInstallment = Math.round((loanAmount * monthlyRate * factor) / (factor - 1));
  const totalRepayment = monthlyInstallment * totalMonths;
  const totalInterestPayable = Math.max(0, totalRepayment - loanAmount);

  return {
    propertyPrice: price,
    downPaymentPercent,
    downPaymentAmount,
    loanAmount,
    annualInterestRate,
    tenureYears,
    monthlyInstallment,
    totalInterestPayable,
    totalRepayment,
  };
}

/**
 * 3. Evaluate Debt Service Ratio (DSR) & Affordability
 * DSR = (Total Monthly Commitments + New Mortgage) / Net Monthly Income
 */
export function evaluateDSR(
  monthlyNetIncome: number,
  existingMonthlyCommitments: number,
  proposedMonthlyMortgage: number,
  maxAllowableDSR: number = 70
): DSREvaluation {
  const netIncome = Math.max(1, monthlyNetIncome);
  const totalMonthlyCommitments = existingMonthlyCommitments + proposedMonthlyMortgage;
  const dsrPercentage = Math.round((totalMonthlyCommitments / netIncome) * 1000) / 10;

  const isAffordable = dsrPercentage <= maxAllowableDSR;

  let affordabilityStatus: DSREvaluation["affordabilityStatus"];
  if (dsrPercentage <= 40) {
    affordabilityStatus = "Highly Affordable";
  } else if (dsrPercentage <= 60) {
    affordabilityStatus = "Comfortable";
  } else if (dsrPercentage <= maxAllowableDSR) {
    affordabilityStatus = "Tight / High Risk";
  } else {
    affordabilityStatus = "Exceeds DSR Threshold";
  }

  // Calculate maximum recommended loan monthly installment
  const maxAllowableTotalCommitment = netIncome * (maxAllowableDSR / 100);
  const maxAvailableMonthlyInstallment = Math.max(0, maxAllowableTotalCommitment - existingMonthlyCommitments);

  // Estimate maximum loan amount based on 4.25% interest over 30 years
  // Loan = Installment * ( (1+r)^n - 1 ) / ( r(1+r)^n )
  const r = 4.25 / 100 / 12;
  const n = 30 * 12;
  const factor = Math.pow(1 + r, n);
  const recommendedMaxLoan = Math.round(maxAvailableMonthlyInstallment * ((factor - 1) / (r * factor)));

  return {
    monthlyGrossIncome: Math.round(netIncome * 1.2),
    monthlyNetIncome: netIncome,
    existingMonthlyCommitments,
    proposedMonthlyMortgage,
    totalMonthlyCommitments,
    dsrPercentage,
    maxAllowableDSR,
    isAffordable,
    recommendedMaxLoan,
    affordabilityStatus,
  };
}

/**
 * 4. Calculate Gross and Net Rental Yield
 */
export function calculateRentalYield(
  propertyPrice: number,
  monthlyRental: number,
  monthlyMaintenance: number = 0
): RentalYieldBreakdown {
  const price = Math.max(1, propertyPrice);
  const annualRental = monthlyRental * 12;
  const annualGrossYield = Math.round((annualRental / price) * 1000) / 10;

  const annualNetRental = Math.max(0, (monthlyRental - monthlyMaintenance) * 12);
  const annualNetYield = Math.round((annualNetRental / price) * 1000) / 10;

  return {
    propertyPrice: price,
    monthlyRental,
    annualRental,
    estimatedMonthlyMaintenance: monthlyMaintenance,
    annualGrossYield,
    annualNetYield,
  };
}

/**
 * 5. Check Foreign Purchaser Thresholds (Malaysia)
 */
export function checkForeignBuyerEligibility(
  stateName: string,
  price: number,
  propertyType: "Strata / Condo" | "Landed Commercial" | "Landed Residential" = "Strata / Condo"
): ForeignBuyerCheck {
  const stateLower = stateName.toLowerCase();
  let state: ForeignBuyerCheck["state"] = "Other";
  let minThreshold = 1000000;
  let estimatedStateLevyPercentage = 0;
  let notes = "";

  if (stateLower.includes("kuala lumpur") || stateLower.includes("kl") || stateLower.includes("cheras") || stateLower.includes("bangsar") || stateLower.includes("mont kiara") || stateLower.includes("damansara")) {
    state = "Kuala Lumpur";
    minThreshold = 1000000;
    notes = "Kuala Lumpur sets a minimum threshold of RM 1,000,000 for strata residential units.";
  } else if (stateLower.includes("selangor") || stateLower.includes("petaling jaya") || stateLower.includes("pj") || stateLower.includes("subang") || stateLower.includes("shah alam") || stateLower.includes("cyberjaya")) {
    state = "Selangor";
    minThreshold = 2000000;
    notes = "Selangor requires a minimum purchase price of RM 2,000,000 for foreign strata properties (Zone 1 & 2).";
  } else if (stateLower.includes("penang")) {
    state = "Penang";
    minThreshold = 1000000;
    notes = "Penang Island minimum threshold is RM 1,000,000 for strata properties (RM 3,000,000 for landed).";
  } else if (stateLower.includes("johor") || stateLower.includes("iskandar")) {
    state = "Johor";
    minThreshold = 1000000;
    estimatedStateLevyPercentage = 2.0;
    notes = "Johor minimum threshold is RM 1,000,000 in general (certain Medini zones may have specific exemptions), plus a 2% state consent levy.";
  } else {
    minThreshold = 1000000;
    notes = "Federal guideline sets general foreign threshold at RM 1,000,000 subject to state authority approval.";
  }

  const isEligible = price >= minThreshold;

  return {
    state,
    propertyType,
    price,
    minThreshold,
    isEligible,
    stateConsentRequired: true,
    estimatedStateLevyPercentage,
    notes,
  };
}

/**
 * Format currency to Malaysian Ringgit standard
 */
export function formatRM(amount: number): string {
  if (amount >= 1000000) {
    const formatted = (amount / 1000000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `RM ${formatted}M`;
  }
  return `RM ${amount.toLocaleString("en-MY")}`;
}
