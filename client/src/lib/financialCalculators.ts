/**
 * Malaysian Real Estate Financial & ROI Calculation Engine
 * Deterministic formulas for:
 * 1. Mortgage installment & yearly amortization schedule
 * 2. Tiered MOT Stamp Duty, Loan Stamp Duty & SRO 2023 Legal Fees
 * 3. Debt Service Ratio (DSR) & Malaysian bank underwriting evaluation
 * 4. 5-10 Year Capital Appreciation & Total Cash-on-Cash ROI Projections
 */

export interface MortgageResult {
  propertyPrice: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  loanAmount: number;
  annualInterestRate: number;
  tenureYears: number;
  monthlyInstallment: number;
  totalInterestPayable: number;
  totalRepayment: number;
}

export interface AmortizationYearPoint {
  year: number;
  remainingBalance: number;
  yearlyPrincipalPaid: number;
  yearlyInterestPaid: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
  equityFromPayments: number; // Downpayment + Cumulative Principal
}

export interface EntryCostsBreakdown {
  propertyPrice: number;
  loanAmount: number;
  isFirstTimeBuyer: boolean;
  // MOT Tiers
  motTier1: number; // 1% on first 100k
  motTier2: number; // 2% on 100k - 500k
  motTier3: number; // 3% on 500k - 1M
  motTier4: number; // 4% on > 1M
  motGross: number;
  motDiscount: number;
  motNet: number;
  // Loan Stamp Duty (0.5%)
  loanStampDuty: number;
  // Legal Fees (SRO 2023)
  spaLegalFees: number;
  loanLegalFees: number;
  estimatedDisbursements: number;
  totalLegalAndDisbursements: number;
  // Grand Total Outlay
  downPaymentAmount: number;
  totalUpfrontCashRequired: number;
}

export interface DSRResult {
  monthlyNetIncome: number;
  existingMonthlyCommitments: number;
  proposedMonthlyMortgage: number;
  totalMonthlyCommitments: number;
  dsrPercentage: number;
  maxAllowableDSR: number;
  isAffordable: boolean;
  status: "Prime" | "Healthy" | "Near Ceiling" | "Exceeds Limit";
  statusColor: string;
  recommendedMaxInstallment: number;
  minRecommendedIncome: number;
  advice: string;
}

export interface YearlyAppreciationPoint {
  year: number;
  projectedValue: number;
  capitalGain: number;
  capitalGainPercent: number;
  annualNetRental: number;
  cumulativeNetRental: number;
  remainingLoan: number;
  netEquity: number;
  totalProfit: number;
  cashOnCashRoiPercent: number;
}

export interface AppreciationAndRoiResult {
  holdingYears: number;
  annualAppreciationRate: number;
  grossRentalYield: number;
  monthlyMaintenance: number;
  initialCashOutlay: number;
  yearlyPoints: YearlyAppreciationPoint[];
  finalPoint: YearlyAppreciationPoint;
}

/**
 * 1. Calculate Monthly Mortgage Installment
 */
export function calculateMortgage(
  propertyPrice: number,
  downPaymentPercent: number = 10,
  annualInterestRate: number = 4.25,
  tenureYears: number = 30
): MortgageResult {
  const price = Math.max(0, propertyPrice);
  const downPaymentAmount = Math.round(price * (downPaymentPercent / 100));
  const loanAmount = Math.max(0, price - downPaymentAmount);

  if (loanAmount <= 0 || tenureYears <= 0 || annualInterestRate <= 0) {
    return {
      propertyPrice: price,
      downPaymentPercent,
      downPaymentAmount,
      loanAmount: 0,
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
 * 2. Generate Yearly Amortization Schedule
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  annualInterestRate: number = 4.25,
  tenureYears: number = 30,
  downPaymentAmount: number = 0
): AmortizationYearPoint[] {
  if (loanAmount <= 0 || tenureYears <= 0 || annualInterestRate <= 0) {
    return [];
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  const totalMonths = tenureYears * 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);

  let currentBalance = loanAmount;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  const schedule: AmortizationYearPoint[] = [];

  for (let year = 1; year <= tenureYears; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let month = 1; month <= 12; month++) {
      if (currentBalance <= 0) break;
      const interestForMonth = currentBalance * monthlyRate;
      const principalForMonth = Math.min(currentBalance, monthlyPayment - interestForMonth);

      yearInterest += interestForMonth;
      yearPrincipal += principalForMonth;
      currentBalance = Math.max(0, currentBalance - principalForMonth);
    }

    cumulativePrincipal += yearPrincipal;
    cumulativeInterest += yearInterest;

    schedule.push({
      year,
      remainingBalance: Math.round(currentBalance),
      yearlyPrincipalPaid: Math.round(yearPrincipal),
      yearlyInterestPaid: Math.round(yearInterest),
      cumulativePrincipal: Math.round(cumulativePrincipal),
      cumulativeInterest: Math.round(cumulativeInterest),
      equityFromPayments: Math.round(downPaymentAmount + cumulativePrincipal),
    });

    if (currentBalance <= 0) break;
  }

  return schedule;
}

/**
 * Calculate SRO 2023 Legal Fees (Solicitors' Remuneration Order)
 * - First RM500k: 1.25% (min RM500)
 * - Next RM7.5M: 1.00%
 * - Next RM2M: 0.8%
 */
export function calculateSroLegalFees(amount: number): number {
  if (amount <= 0) return 0;
  let fee = 0;
  fee += Math.min(amount, 500000) * 0.0125;
  if (amount > 500000) {
    fee += Math.min(amount - 500000, 7500000) * 0.01;
  }
  if (amount > 8000000) {
    fee += (amount - 8000000) * 0.008;
  }
  return Math.max(500, Math.round(fee));
}

/**
 * 3. Calculate MOT, Stamp Duties, Legal Fees & Entry Costs
 */
export function calculateEntryCosts(
  propertyPrice: number,
  downPaymentPercent: number = 10,
  isFirstTimeBuyer: boolean = false
): EntryCostsBreakdown {
  const price = Math.max(0, propertyPrice);
  const downPaymentAmount = Math.round(price * (downPaymentPercent / 100));
  const loanAmount = Math.max(0, price - downPaymentAmount);

  // MOT Tiers
  let tier1 = 0;
  let tier2 = 0;
  let tier3 = 0;
  let tier4 = 0;

  if (price > 0) tier1 = Math.min(price, 100000) * 0.01;
  if (price > 100000) tier2 = (Math.min(price, 500000) - 100000) * 0.02;
  if (price > 500000) tier3 = (Math.min(price, 1000000) - 500000) * 0.03;
  if (price > 1000000) tier4 = (price - 1000000) * 0.04;

  const motGross = Math.round(tier1 + tier2 + tier3 + tier4);
  let motDiscount = 0;

  if (isFirstTimeBuyer) {
    if (price <= 500000) {
      motDiscount = motGross; // 100% exemption
    } else if (price <= 1000000) {
      motDiscount = Math.round(motGross * 0.75); // 75% exemption
    }
  }

  const motNet = Math.max(0, motGross - motDiscount);

  // Loan Agreement Stamp Duty (0.5% on loan amount)
  let loanStampDuty = Math.round(loanAmount * 0.005);
  if (isFirstTimeBuyer && price <= 500000) {
    loanStampDuty = 0; // 100% relief for first-time buyers on loan stamp duty
  }

  // Legal Fees
  const spaLegalFees = calculateSroLegalFees(price);
  const loanLegalFees = loanAmount > 0 ? calculateSroLegalFees(loanAmount) : 0;
  const estimatedDisbursements = price > 0 ? 3200 : 0; // State search, land registry, bankruptcy search, stamping documentation
  const totalLegalAndDisbursements = spaLegalFees + loanLegalFees + estimatedDisbursements;

  const totalUpfrontCashRequired = downPaymentAmount + motNet + loanStampDuty + totalLegalAndDisbursements;

  return {
    propertyPrice: price,
    loanAmount,
    isFirstTimeBuyer,
    motTier1: Math.round(tier1),
    motTier2: Math.round(tier2),
    motTier3: Math.round(tier3),
    motTier4: Math.round(tier4),
    motGross,
    motDiscount,
    motNet,
    loanStampDuty,
    spaLegalFees,
    loanLegalFees,
    estimatedDisbursements,
    totalLegalAndDisbursements,
    downPaymentAmount,
    totalUpfrontCashRequired,
  };
}

/**
 * 4. Calculate Debt Service Ratio (DSR) & Bank Underwriting
 */
export function calculateDSR(
  monthlyNetIncome: number,
  existingMonthlyCommitments: number,
  proposedMonthlyMortgage: number,
  maxAllowableDSR: number = 70
): DSRResult {
  const netIncome = Math.max(1, monthlyNetIncome);
  const totalMonthlyCommitments = existingMonthlyCommitments + proposedMonthlyMortgage;
  const dsrPercentage = Math.round((totalMonthlyCommitments / netIncome) * 1000) / 10;

  let status: DSRResult["status"];
  let statusColor: string;
  let advice: string;

  if (dsrPercentage <= 40) {
    status = "Prime";
    statusColor = "#10b981"; // Emerald
    advice = "Exceptional financial buffer. Pre-approved for premier Tier-1 bank rates (Maybank, CIMB, Public Bank).";
  } else if (dsrPercentage <= 60) {
    status = "Healthy";
    statusColor = "#22c55e"; // Green
    advice = "Standard bank-eligible range. High likelihood of immediate loan approval with standard documentation.";
  } else if (dsrPercentage <= maxAllowableDSR) {
    status = "Near Ceiling";
    statusColor = "#f59e0b"; // Amber
    advice = "Approaching maximum bank threshold. Consider adding a co-applicant or lengthening tenure to lower monthly installment.";
  } else {
    status = "Exceeds Limit";
    statusColor = "#ef4444"; // Red
    advice = "Exceeds standard 70% bank ceiling. Banks typically decline unless supplemented with pledged liquid assets or a 15-20% higher downpayment.";
  }

  const maxTotalCommitment = netIncome * (maxAllowableDSR / 100);
  const recommendedMaxInstallment = Math.max(0, Math.round(maxTotalCommitment - existingMonthlyCommitments));
  const minRecommendedIncome = Math.round(totalMonthlyCommitments / (0.6)); // 60% healthy target

  return {
    monthlyNetIncome: netIncome,
    existingMonthlyCommitments,
    proposedMonthlyMortgage,
    totalMonthlyCommitments,
    dsrPercentage,
    maxAllowableDSR,
    isAffordable: dsrPercentage <= maxAllowableDSR,
    status,
    statusColor,
    recommendedMaxInstallment,
    minRecommendedIncome,
    advice,
  };
}

/**
 * 5. Calculate Capital Appreciation & 5-10 Year Total ROI
 */
export function calculateCapitalAppreciationAndROI(
  propertyPrice: number,
  downPaymentAmount: number,
  totalUpfrontCashRequired: number,
  annualAppreciationRate: number = 5.0, // e.g. 5.0%
  holdingYears: number = 10,
  annualInterestRate: number = 4.25,
  tenureYears: number = 30,
  grossRentalYield: number = 4.5,
  monthlyMaintenance: number = 850
): AppreciationAndRoiResult {
  const initialCost = Math.max(1, totalUpfrontCashRequired || downPaymentAmount);
  const amortSchedule = generateAmortizationSchedule(
    propertyPrice - downPaymentAmount,
    annualInterestRate,
    tenureYears,
    downPaymentAmount
  );

  const amortMap = new Map<number, number>();
  amortSchedule.forEach((pt) => amortMap.set(pt.year, pt.remainingBalance));

  const yearlyPoints: YearlyAppreciationPoint[] = [];
  let cumulativeNetRental = 0;

  for (let y = 1; y <= holdingYears; y++) {
    // Compound appreciation: P * (1 + r)^y
    const projectedValue = Math.round(propertyPrice * Math.pow(1 + annualAppreciationRate / 100, y));
    const capitalGain = projectedValue - propertyPrice;
    const capitalGainPercent = Math.round((capitalGain / propertyPrice) * 1000) / 10;

    // Rental yield: gross yield on current year property value minus maintenance
    const annualGrossRent = projectedValue * (grossRentalYield / 100);
    const annualMaintenanceCost = monthlyMaintenance * 12;
    const annualNetRental = Math.max(0, Math.round(annualGrossRent - annualMaintenanceCost));
    cumulativeNetRental += annualNetRental;

    // Remaining bank loan
    const remainingLoan = amortMap.get(y) ?? 0;
    const netEquity = Math.max(0, projectedValue - remainingLoan);

    // Total profit = Capital gain + cumulative net rental
    const totalProfit = capitalGain + cumulativeNetRental;
    const cashOnCashRoiPercent = Math.round((totalProfit / initialCost) * 1000) / 10;

    yearlyPoints.push({
      year: y,
      projectedValue,
      capitalGain,
      capitalGainPercent,
      annualNetRental,
      cumulativeNetRental,
      remainingLoan,
      netEquity,
      totalProfit,
      cashOnCashRoiPercent,
    });
  }

  const finalPoint = yearlyPoints[yearlyPoints.length - 1] || {
    year: holdingYears,
    projectedValue: propertyPrice,
    capitalGain: 0,
    capitalGainPercent: 0,
    annualNetRental: 0,
    cumulativeNetRental: 0,
    remainingLoan: 0,
    netEquity: 0,
    totalProfit: 0,
    cashOnCashRoiPercent: 0,
  };

  return {
    holdingYears,
    annualAppreciationRate,
    grossRentalYield,
    monthlyMaintenance,
    initialCashOutlay: initialCost,
    yearlyPoints,
    finalPoint,
  };
}

/**
 * Format currency helper
 */
export function formatRinggit(amount: number): string {
  if (amount >= 1000000) {
    return `RM ${(amount / 1000000).toFixed(2)}M`;
  }
  return `RM ${Math.round(amount).toLocaleString()}`;
}
