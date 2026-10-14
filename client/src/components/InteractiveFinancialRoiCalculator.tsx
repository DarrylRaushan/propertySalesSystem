import React, { useState, useMemo } from "react";
import {
  Calculator,
  Receipt,
  TrendingUp,
  Building2,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";

interface PropertyOption {
  id: number;
  title: string;
  location: string;
  price: number;
  imageUrl?: string;
  maintenanceFee?: number;
}

interface InteractiveFinancialRoiCalculatorProps {
  initialPrice?: number;
  properties?: PropertyOption[];
  onSelectProperty?: (property: PropertyOption) => void;
  className?: string;
}

type CalcTab = "mortgage" | "stamp_duty" | "roi";

export default function InteractiveFinancialRoiCalculator({
  initialPrice = 2500000,
  properties = [],
  onSelectProperty,
  className = "",
}: InteractiveFinancialRoiCalculatorProps) {
  const [activeTab, setActiveTab] = useState<CalcTab>("mortgage");

  // Shared Core Inputs (Original state)
  const [calcPrice, setCalcPrice] = useState<number>(initialPrice);
  const [calcDownpaymentPercent, setCalcDownpaymentPercent] = useState<number>(10);
  const [calcTenureYears, setCalcTenureYears] = useState<number>(30);
  const [calcInterestRate, setCalcInterestRate] = useState<number>(4.2);

  // Tab 2: Stamp duty state
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState<boolean>(false);

  // Tab 3: ROI state
  const [annualGrowthRate, setAnnualGrowthRate] = useState<number>(5.0);
  const [holdingYears, setHoldingYears] = useState<number>(5);

  // Quick property select
  const selectedProperty = useMemo(() => {
    return properties.find((p) => Math.abs(p.price - calcPrice) < 1000) || null;
  }, [properties, calcPrice]);

  const handlePropertySelect = (p: PropertyOption) => {
    setCalcPrice(p.price);
    if (onSelectProperty) onSelectProperty(p);
  };

  // --- Calculations for Tab 1: Mortgage (Original formulas) ---
  const downpaymentAmount = Math.round(calcPrice * (calcDownpaymentPercent / 100));
  const loanPrincipal = Math.max(0, calcPrice - downpaymentAmount);
  const monthlyRate = calcInterestRate / 100 / 12;
  const totalPayments = calcTenureYears * 12;
  const monthlyRepayment = Math.round(
    monthlyRate > 0 && loanPrincipal > 0
      ? (loanPrincipal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
          (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : loanPrincipal / Math.max(1, totalPayments)
  );
  const totalRepayment = monthlyRepayment * totalPayments;
  const totalInterest = Math.max(0, totalRepayment - loanPrincipal);
  const minRecommendedIncome = Math.round(monthlyRepayment / 0.6); // 60% DSR

  // Malaysian MOT Stamp Duty (Original formula)
  const stampDuty = useMemo(() => {
    let price = calcPrice;
    let duty = 0;
    if (price > 1000000) {
      duty += (price - 1000000) * 0.04;
      price = 1000000;
    }
    if (price > 500000) {
      duty += (price - 500000) * 0.03;
      price = 500000;
    }
    if (price > 100000) {
      duty += (price - 100000) * 0.02;
      price = 100000;
    }
    duty += price * 0.01;
    return Math.round(duty);
  }, [calcPrice]);

  // --- Calculations for Tab 2: Stamp Duty & Entry Costs ---
  const motTiers = useMemo(() => {
    const price = Math.max(0, calcPrice);
    const tier1 = Math.min(price, 100000) * 0.01;
    const tier2 = price > 100000 ? (Math.min(price, 500000) - 100000) * 0.02 : 0;
    const tier3 = price > 500000 ? (Math.min(price, 1000000) - 500000) * 0.03 : 0;
    const tier4 = price > 1000000 ? (price - 1000000) * 0.04 : 0;
    const grossMot = Math.round(tier1 + tier2 + tier3 + tier4);

    let exemption = 0;
    if (isFirstTimeBuyer) {
      if (price <= 500000) exemption = grossMot;
      else if (price <= 1000000) exemption = Math.round(grossMot * 0.75);
    }
    const netMot = Math.max(0, grossMot - exemption);

    // Loan Agreement Stamp duty (0.5%)
    const loanStampDuty = Math.round(loanPrincipal * 0.005);

    // Legal fees estimate (SRO standard: 1.25% first 500k, 1% next)
    let legal = Math.min(price, 500000) * 0.0125;
    if (price > 500000) legal += (price - 500000) * 0.01;
    const estimatedLegalAndDisbursements = Math.round(legal) + 2800;

    const totalCashToClose = downpaymentAmount + netMot + loanStampDuty + estimatedLegalAndDisbursements;

    return {
      tier1: Math.round(tier1),
      tier2: Math.round(tier2),
      tier3: Math.round(tier3),
      tier4: Math.round(tier4),
      grossMot,
      exemption,
      netMot,
      loanStampDuty,
      estimatedLegalAndDisbursements,
      totalCashToClose,
    };
  }, [calcPrice, loanPrincipal, downpaymentAmount, isFirstTimeBuyer]);

  // --- Calculations for Tab 3: 5-Year ROI & Growth ---
  const roiData = useMemo(() => {
    const projectedValue = Math.round(calcPrice * Math.pow(1 + annualGrowthRate / 100, holdingYears));
    const capitalGain = projectedValue - calcPrice;
    const capitalGainPercent = Math.round((capitalGain / Math.max(1, calcPrice)) * 1000) / 10;

    // Estimated remaining loan after holdingYears
    let balance = loanPrincipal;
    for (let m = 0; m < holdingYears * 12; m++) {
      if (balance <= 0) break;
      const interestPart = balance * monthlyRate;
      const principalPart = monthlyRepayment - interestPart;
      balance = Math.max(0, balance - principalPart);
    }
    const netEquity = Math.round(projectedValue - balance);

    // Yearly progression points
    const years = [];
    for (let y = 1; y <= holdingYears; y++) {
      years.push({
        year: y,
        value: Math.round(calcPrice * Math.pow(1 + annualGrowthRate / 100, y)),
      });
    }

    return {
      projectedValue,
      capitalGain,
      capitalGainPercent,
      estimatedRemainingLoan: Math.round(balance),
      netEquity,
      progression: years,
    };
  }, [calcPrice, annualGrowthRate, holdingYears, loanPrincipal, monthlyRate, monthlyRepayment]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Sub-Tab Navigation */}
      <div className="pb-4 border-b border-[#d2e5d4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="customer-portal-serif text-2xl sm:text-3xl font-normal text-[#10484b]">
            Mortgage & Financing Vault
          </h2>
          <p className="text-xs text-[#567177] mt-0.5 font-medium">
            Simulate monthly repayments, Malaysian stamp duty (MOT), and 5-year investment growth.
          </p>
        </div>

        {/* 3 Simple Tabs */}
        <div className="flex items-center gap-1.5 bg-[#f4faea] p-1 rounded-2xl border border-[#234d4d]/30 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("mortgage")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "mortgage"
                ? "bg-[#234d4d] text-[#d7ef73] shadow-xs"
                : "text-[#10484b] hover:bg-white"
            }`}
          >
            <Calculator size={13} />
            <span>Mortgage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stamp_duty")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "stamp_duty"
                ? "bg-[#234d4d] text-[#d7ef73] shadow-xs"
                : "text-[#10484b] hover:bg-white"
            }`}
          >
            <Receipt size={13} />
            <span>Stamp Duty (MOT)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roi")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "roi"
                ? "bg-[#234d4d] text-[#d7ef73] shadow-xs"
                : "text-[#10484b] hover:bg-white"
            }`}
          >
            <TrendingUp size={13} />
            <span>5-Year ROI</span>
          </button>
        </div>
      </div>

      {/* Quick Property Preset Selector (Optional convenience) */}
      {properties.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#567177] font-semibold flex items-center gap-1">
            <Building2 size={13} className="text-[#234d4d]" />
            Quick Pre-fill:
          </span>
          <select
            aria-label="Pre-fill from Curated Property"
            value={selectedProperty?.id || ""}
            onChange={(e) => {
              const p = properties.find((item) => item.id === Number(e.target.value));
              if (p) handlePropertySelect(p);
            }}
            className="bg-[#fbfff9] text-[#10484b] text-xs font-bold rounded-xl px-2.5 py-1 border border-[#dfe6df] focus:outline-none"
          >
            <option value="">Custom Property Value</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (RM {(p.price / 1000000).toFixed(1)}M)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: ORIGINAL MORTGAGE CALCULATOR                                   */}
      {/* ===================================================================== */}
      {activeTab === "mortgage" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Sliders Form */}
          <div className="lg:col-span-7 terrain-card p-6 space-y-6">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#234d4d]">
              Loan Simulation Parameters
            </h3>

            {/* Property Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#10484b]">Property Purchase Price</span>
                <span className="text-base font-black text-[#10484b] customer-portal-serif">
                  RM {calcPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                aria-label="Property Purchase Price"
                min={500000}
                max={10000000}
                step={50000}
                value={calcPrice}
                onChange={(e) => setCalcPrice(Number(e.target.value))}
                className="w-full h-2 bg-[#dfe6df] rounded-lg appearance-none cursor-pointer accent-[#234d4d]"
              />
              <div className="flex justify-between text-[10px] text-[#6e897e] font-semibold">
                <span>RM 500,000</span>
                <span>RM 5,000,000</span>
                <span>RM 10,000,000</span>
              </div>
            </div>

            {/* Downpayment */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#10484b]">
                  Downpayment Percentage ({calcDownpaymentPercent}%)
                </span>
                <span className="font-bold text-[#234d4d]">
                  RM {downpaymentAmount.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                aria-label="Downpayment Percentage"
                min={5}
                max={50}
                step={5}
                value={calcDownpaymentPercent}
                onChange={(e) => setCalcDownpaymentPercent(Number(e.target.value))}
                className="w-full h-2 bg-[#dfe6df] rounded-lg appearance-none cursor-pointer accent-[#234d4d]"
              />
              <div className="flex justify-between text-[10px] text-[#6e897e] font-semibold">
                <span>5% (Min)</span>
                <span>10% (Standard)</span>
                <span>30%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Tenure */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#10484b]">
                  Loan Tenure ({calcTenureYears} Years)
                </span>
                <span className="font-bold text-[#285c59]">
                  {calcTenureYears * 12} Installments
                </span>
              </div>
              <input
                type="range"
                aria-label="Loan Tenure"
                min={10}
                max={35}
                step={1}
                value={calcTenureYears}
                onChange={(e) => setCalcTenureYears(Number(e.target.value))}
                className="w-full h-2 bg-[#dfe6df] rounded-lg appearance-none cursor-pointer accent-[#234d4d]"
              />
              <div className="flex justify-between text-[10px] text-[#6e897e] font-semibold">
                <span>10 Years</span>
                <span>20 Years</span>
                <span>30 Years</span>
                <span>35 Years</span>
              </div>
            </div>

            {/* Interest Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#10484b]">Annual Bank Interest Rate</span>
                <span className="font-bold text-[#234d4d]">
                  {calcInterestRate.toFixed(2)}% p.a.
                </span>
              </div>
              <input
                type="range"
                aria-label="Annual Bank Interest Rate"
                min={3.0}
                max={6.0}
                step={0.05}
                value={calcInterestRate}
                onChange={(e) => setCalcInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-[#dfe6df] rounded-lg appearance-none cursor-pointer accent-[#234d4d]"
              />
              <div className="flex justify-between text-[10px] text-[#6e897e] font-semibold">
                <span>3.00%</span>
                <span>4.20% (Market Average)</span>
                <span>6.00%</span>
              </div>
            </div>
          </div>

          {/* Repayment Breakdown Results Card matching Hero gradient */}
          <div className="lg:col-span-5 space-y-4">
            <div className="customer-terrain-hero p-6 text-white space-y-4">
              <div>
                <span className="badge-lime">Estimated Monthly Installment</span>
                <div className="text-3xl font-black tracking-tight text-white mt-2 customer-portal-serif">
                  RM {monthlyRepayment.toLocaleString()}
                  <span className="text-xs font-normal text-[#d7ef73]"> / month</span>
                </div>
              </div>

              <div className="p-3 bg-black/20 backdrop-blur rounded-xl space-y-2 text-xs border border-white/10">
                <div className="flex justify-between text-slate-200">
                  <span>Loan Principal ({100 - calcDownpaymentPercent}%):</span>
                  <span className="font-bold text-white">RM {loanPrincipal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Total Interest ({calcTenureYears} yrs):</span>
                  <span className="font-bold text-[#d7ef73]">RM {totalInterest.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Total Repayment:</span>
                  <span className="font-bold text-white">RM {totalRepayment.toLocaleString()}</span>
                </div>
              </div>

              {/* Affordability check */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">Recommended Monthly Income:</span>
                  <span className="font-bold text-[#d7ef73]">~RM {minRecommendedIncome.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Calculated at a healthy 60% Debt Service Ratio (DSR).
                </p>
              </div>
            </div>

            {/* Stamp Duty (MOT) Card */}
            <div className="terrain-card p-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#10484b]">Est. Malaysian Stamp Duty (MOT)</span>
                <span className="font-bold text-[#10484b] customer-portal-serif text-sm">
                  RM {stampDuty.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-[#567177] leading-relaxed font-medium">
                Based on standard Inland Revenue Board (LHDN) tiered schedule (1% first 100k, 2% up to 500k, 3% up to 1M, 4% above).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: STAMP DUTY & ENTRY COSTS (SIMPLE CALC)                        */}
      {/* ===================================================================== */}
      {activeTab === "stamp_duty" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Inputs & Tier List */}
          <div className="lg:col-span-7 terrain-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#dfe6df]">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#234d4d]">
                Malaysian MOT Stamp Duty Tiers
              </h3>

              {/* First-time homebuyer checkbox */}
              <label className="flex items-center gap-2 cursor-pointer bg-[#f4faea] px-2.5 py-1 rounded-xl border border-[#234d4d]/30 text-xs font-bold text-[#10484b]">
                <input
                  type="checkbox"
                  checked={isFirstTimeBuyer}
                  onChange={(e) => setIsFirstTimeBuyer(e.target.checked)}
                  className="rounded text-[#234d4d] focus:ring-[#234d4d]"
                />
                <span>First-Time Homebuyer</span>
              </label>
            </div>

            {/* Price slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#10484b]">Property Price</span>
                <span className="text-sm font-extrabold text-[#10484b] customer-portal-serif">
                  RM {calcPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                aria-label="Property Price for Stamp Duty"
                min={500000}
                max={10000000}
                step={50000}
                value={calcPrice}
                onChange={(e) => setCalcPrice(Number(e.target.value))}
                className="w-full h-2 bg-[#dfe6df] rounded-lg appearance-none cursor-pointer accent-[#234d4d]"
              />
            </div>

            {/* Tiers list */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[#f4faea] rounded-xl border border-[#dfe6df]">
                <div>
                  <span className="font-bold text-[#10484b]">Tier 1 (1%):</span>
                  <span className="text-[#567177] ml-2">First RM 100,000</span>
                </div>
                <span className="font-bold text-[#10484b]">RM {motTiers.tier1.toLocaleString()}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-[#f4faea] rounded-xl border border-[#dfe6df]">
                <div>
                  <span className="font-bold text-[#10484b]">Tier 2 (2%):</span>
                  <span className="text-[#567177] ml-2">RM 100k – RM 500k</span>
                </div>
                <span className="font-bold text-[#10484b]">RM {motTiers.tier2.toLocaleString()}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-[#f4faea] rounded-xl border border-[#dfe6df]">
                <div>
                  <span className="font-bold text-[#10484b]">Tier 3 (3%):</span>
                  <span className="text-[#567177] ml-2">RM 500k – RM 1,000,000</span>
                </div>
                <span className="font-bold text-[#10484b]">RM {motTiers.tier3.toLocaleString()}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-[#f4faea] rounded-xl border border-[#dfe6df]">
                <div>
                  <span className="font-bold text-[#10484b]">Tier 4 (4%):</span>
                  <span className="text-[#567177] ml-2">Balance above RM 1,000,000</span>
                </div>
                <span className="font-bold text-[#234d4d]">RM {motTiers.tier4.toLocaleString()}</span>
              </div>
            </div>

            {isFirstTimeBuyer && motTiers.exemption > 0 && (
              <p className="text-[11px] text-emerald-700 font-bold bg-[#eaf6df] p-2.5 rounded-xl border border-emerald-300">
                ✓ First-time buyer relief applied: Saved RM {motTiers.exemption.toLocaleString()} in MOT stamp duty!
              </p>
            )}
          </div>

          {/* Right: Cash to Close summary */}
          <div className="lg:col-span-5 space-y-4">
            <div className="customer-terrain-hero p-6 text-white space-y-4">
              <div>
                <span className="badge-lime">Total Upfront Cash to Close</span>
                <div className="text-3xl font-black tracking-tight text-white mt-2 customer-portal-serif">
                  RM {motTiers.totalCashToClose.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#f6ffdf] mt-1">
                  Required capital prior to title transfer and key collection.
                </p>
              </div>

              <div className="p-3 bg-black/20 backdrop-blur rounded-xl space-y-2 text-xs border border-white/10">
                <div className="flex justify-between text-slate-200">
                  <span>Downpayment ({calcDownpaymentPercent}%):</span>
                  <span className="font-bold text-white">RM {downpaymentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Net MOT Stamp Duty:</span>
                  <span className="font-bold text-[#d7ef73]">RM {motTiers.netMot.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Loan Agreement Stamp Duty:</span>
                  <span className="font-bold text-white">RM {motTiers.loanStampDuty.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Est. Legal Fees & Stamping:</span>
                  <span className="font-bold text-white">
                    RM {motTiers.estimatedLegalAndDisbursements.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-300">
                Legal fees calculated based on the official Solicitors' Remuneration Order (SRO).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: 5-YEAR ROI & INVESTMENT GROWTH (SIMPLE CALC)                   */}
      {/* ===================================================================== */}
      {activeTab === "roi" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Inputs */}
          <div className="lg:col-span-7 terrain-card p-6 space-y-6">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#234d4d]">
              Investment Growth Parameters
            </h3>

            {/* Property Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#10484b]">Current Property Value</span>
                <span className="text-base font-black text-[#10484b] customer-portal-serif">
                  RM {calcPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                aria-label="Current Property Value for ROI"
                min={500000}
                max={10000000}
                step={50000}
                value={calcPrice}
                onChange={(e) => setCalcPrice(Number(e.target.value))}
                className="w-full h-2 bg-[#dfe6df] rounded-lg appearance-none cursor-pointer accent-[#234d4d]"
              />
            </div>

            {/* Annual Capital Appreciation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#10484b]">
                  Expected Annual Growth ({annualGrowthRate.toFixed(1)}% p.a.)
                </span>
                <span className="font-bold text-emerald-800">Compounded</span>
              </div>
              <input
                type="range"
                aria-label="Expected Annual Growth"
                min={1.0}
                max={9.0}
                step={0.5}
                value={annualGrowthRate}
                onChange={(e) => setAnnualGrowthRate(Number(e.target.value))}
                className="w-full h-2 bg-[#dfe6df] rounded-lg appearance-none cursor-pointer accent-[#234d4d]"
              />
              <div className="flex gap-2">
                {[
                  { label: "Conservative (3.5%)", rate: 3.5 },
                  { label: "Standard (5.0%)", rate: 5.0 },
                  { label: "Prime Area (7.0%)", rate: 7.0 },
                ].map((opt) => (
                  <button
                    key={opt.rate}
                    type="button"
                    onClick={() => setAnnualGrowthRate(opt.rate)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition ${
                      annualGrowthRate === opt.rate
                        ? "bg-[#234d4d] text-[#d7ef73] border-[#234d4d]"
                        : "bg-[#fbfff9] text-[#567177] border-[#dfe6df] hover:bg-[#f4faea]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Holding Years */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#10484b]">Holding Horizon</span>
                <span className="font-bold text-[#234d4d]">{holdingYears} Years</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 10].map((yrs) => (
                  <button
                    key={yrs}
                    type="button"
                    onClick={() => setHoldingYears(yrs)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition ${
                      holdingYears === yrs
                        ? "bg-[#234d4d] text-[#d7ef73] border-[#234d4d]"
                        : "bg-[#fbfff9] text-[#567177] border-[#dfe6df] hover:bg-[#f4faea]"
                    }`}
                  >
                    {yrs} Years
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: ROI Results Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="customer-terrain-hero p-6 text-white space-y-4">
              <div>
                <span className="badge-lime">Projected {holdingYears}-Year Asset Value</span>
                <div className="text-3xl font-black tracking-tight text-white mt-2 customer-portal-serif">
                  RM {roiData.projectedValue.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-emerald-300 mt-1">
                  +RM {roiData.capitalGain.toLocaleString()} (+{roiData.capitalGainPercent}% Total Gain)
                </div>
              </div>

              <div className="p-3 bg-black/20 backdrop-blur rounded-xl space-y-2 text-xs border border-white/10">
                <div className="flex justify-between text-slate-200">
                  <span>Initial Purchase Price:</span>
                  <span className="font-bold text-white">RM {calcPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Est. Capital Appreciation:</span>
                  <span className="font-bold text-[#d7ef73]">+RM {roiData.capitalGain.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Remaining Bank Debt:</span>
                  <span className="font-bold text-white">RM {roiData.estimatedRemainingLoan.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200 pt-1 border-t border-white/10">
                  <span className="font-bold text-[#d7ef73]">Net Accumulated Equity:</span>
                  <span className="font-extrabold text-white text-sm">
                    RM {roiData.netEquity.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-300">
                Asset valuation assumes {annualGrowthRate.toFixed(1)}% annual compounding rate.
              </p>
            </div>

            {/* Quick 5-Year timeline strip */}
            <div className="terrain-card p-4 bg-[#fbfff9] space-y-2">
              <span className="text-[11px] font-bold text-[#10484b] block">
                Year-by-Year Valuation Trajectory:
              </span>
              <div className="flex items-center justify-between text-[11px] text-[#567177] font-semibold pt-1">
                {roiData.progression.map((pt) => (
                  <div key={pt.year} className="text-center">
                    <span className="text-[10px] text-[#234d4d] block font-bold">Yr {pt.year}</span>
                    <span>RM {(pt.value / 1000000).toFixed(2)}M</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
