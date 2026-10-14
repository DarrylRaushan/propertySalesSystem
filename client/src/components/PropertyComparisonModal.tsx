import React, { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Scale,
  Sparkles,
  Check,
  Building2,
  MapPin,
  TrendingUp,
  Coins,
  ShieldCheck,
  Calendar,
  Train,
  Plus,
  ArrowRight,
  Printer,
  Award,
  Layers,
  Heart,
  ExternalLink,
} from "lucide-react";

export interface PropertyItem {
  id: number;
  title: string;
  developer: string;
  location: string;
  type: string;
  price: number;
  size: string;
  beds: number;
  baths: number;
  imageUrl: string;
  yield?: string;
  rentalYield?: string;
  badge?: string;
  features?: string[] | string;
  description?: string;
  collection?: string[];
}

interface PropertyComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProperties: PropertyItem[];
  allAvailableProperties: PropertyItem[];
  onBookViewing?: (property: PropertyItem) => void;
  onToggleSave?: (propertyId: number) => void;
  isSavedFn?: (propertyId: number) => boolean;
}

export default function PropertyComparisonModal({
  isOpen,
  onClose,
  selectedProperties,
  allAvailableProperties,
  onBookViewing,
  onToggleSave,
  isSavedFn,
}: PropertyComparisonModalProps) {
  // Current active compared properties (min 2, max 3)
  const [comparedList, setComparedList] = useState<PropertyItem[]>(() => {
    if (selectedProperties.length >= 2) return selectedProperties.slice(0, 3);
    if (selectedProperties.length === 1 && allAvailableProperties.length > 1) {
      const second = allAvailableProperties.find((p) => p.id !== selectedProperties[0].id);
      return second ? [selectedProperties[0], second] : [selectedProperties[0]];
    }
    return allAvailableProperties.slice(0, 2);
  });

  // Sync when selectedProperties prop updates on modal opening
  React.useEffect(() => {
    if (isOpen) {
      if (selectedProperties.length >= 2) {
        setComparedList(selectedProperties.slice(0, 3));
      } else if (selectedProperties.length === 1) {
        const others = allAvailableProperties.filter((p) => p.id !== selectedProperties[0].id);
        setComparedList([selectedProperties[0], ...others.slice(0, 1)]);
      } else {
        setComparedList(allAvailableProperties.slice(0, 2));
      }
    }
  }, [isOpen, selectedProperties, allAvailableProperties]);

  if (!isOpen) return null;

  // Helper calculations
  const parsedMetrics = comparedList.map((p) => {
    const sizeNum = parseInt(p.size) || 1200;
    const psf = Math.round(p.price / sizeNum);
    const rawYield = parseFloat(p.yield || p.rentalYield || "4.8");
    const yieldPercent = isNaN(rawYield) ? 4.8 : rawYield;
    const estAnnualRent = Math.round(p.price * (yieldPercent / 100));
    const estMonthlyRent = Math.round(estAnnualRent / 12);
    // 30 years @ 4.2% p.a., 90% financing
    const loanAmount = p.price * 0.9;
    const monthlyRate = 0.042 / 12;
    const nMonths = 360;
    const monthlyInstallment = Math.round(
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, nMonths))) /
        (Math.pow(1 + monthlyRate, nMonths) - 1)
    );
    const maintenanceFee = Math.round(sizeNum * 0.45); // ~RM 0.45/sqft luxury average
    const netCashflow = estMonthlyRent - (monthlyInstallment + maintenanceFee);

    // Feature set extraction
    let featureList: string[] = [];
    if (Array.isArray(p.features)) {
      featureList = p.features;
    } else if (typeof p.features === "string") {
      try {
        featureList = JSON.parse(p.features);
      } catch {
        featureList = p.features.split(",").map((s) => s.trim());
      }
    }

    return {
      property: p,
      sizeNum,
      psf,
      yieldPercent,
      estMonthlyRent,
      monthlyInstallment,
      maintenanceFee,
      netCashflow,
      featureList,
    };
  });

  // Highlight benchmarks
  const lowestPsf = Math.min(...parsedMetrics.map((m) => m.psf));
  const highestYield = Math.max(...parsedMetrics.map((m) => m.yieldPercent));
  const lowestPrice = Math.min(...parsedMetrics.map((m) => m.property.price));

  // Swap / replace a slot
  const handleReplaceSlot = (index: number, newPropertyId: number) => {
    const target = allAvailableProperties.find((p) => p.id === newPropertyId);
    if (!target) return;
    setComparedList((prev) => {
      const next = [...prev];
      next[index] = target;
      return next;
    });
  };

  // Add 3rd slot
  const handleAddThirdSlot = () => {
    const existingIds = new Set(comparedList.map((p) => p.id));
    const candidate = allAvailableProperties.find((p) => !existingIds.has(p.id));
    if (candidate && comparedList.length < 3) {
      setComparedList((prev) => [...prev, candidate]);
    }
  };

  // Remove slot (only if > 2)
  const handleRemoveSlot = (index: number) => {
    if (comparedList.length <= 2) return;
    setComparedList((prev) => prev.filter((_, i) => i !== index));
  };

  // Luxury amenities check matrix definitions
  const AMENITY_KEYS = [
    { key: "Private Lift", label: "Private Lift Lobby" },
    { key: "Sky Pool", label: "Sky Infinity Pool / Club" },
    { key: "Concierge", label: "5-Star Branded Concierge" },
    { key: "Smart Home", label: "Smart Home Infrastructure" },
    { key: "MRT", label: "Direct MRT / Transit Access" },
    { key: "EV", label: "Dedicated EV Charging" },
  ];

  const hasAmenity = (features: string[], label: string) => {
    const lower = features.map((f) => f.toLowerCase());
    const target = label.toLowerCase();
    return (
      lower.some((f) => f.includes(target)) ||
      (target === "private lift" && lower.some((f) => f.includes("lift"))) ||
      (target === "sky pool" && lower.some((f) => f.includes("pool"))) ||
      (target === "concierge" && lower.some((f) => f.includes("concierge") || f.includes("kempinski"))) ||
      (target === "smart home" && lower.some((f) => f.includes("smart"))) ||
      (target === "mrt" && lower.some((f) => f.includes("mrt") || f.includes("transit"))) ||
      (target === "ev" && lower.some((f) => f.includes("ev") || f.includes("charging")))
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-[#f7faf5] border border-[#234d4d]/30 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[#10484b]"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-[#10484b] via-[#1a4445] to-[#234d4d] text-[#fbfff9] flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#d7ef73] text-[#10484b] flex items-center justify-center font-bold shadow-md shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold customer-portal-serif text-[#fbfff9]">
                    Side-by-Side Property Comparison Matrix
                  </h2>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#d7ef73] text-[#10484b]">
                    {comparedList.length} Contenders
                  </span>
                </div>
                <p className="text-xs text-[#d2e5d4]/90 font-medium mt-0.5">
                  Deep comparative analytics, rental yields, price per sqft, and luxury specifications.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                title="Print Comparison"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#fbfff9] text-xs font-semibold transition border border-white/15"
              >
                <Printer size={14} />
                <span>Export / Print</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-[#fbfff9] flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Subheader: Property Switchers & Slot Controls */}
          <div className="bg-[#fbfff9] px-4 sm:px-6 py-3 border-b border-[#dfe6df] flex items-center justify-between gap-3 text-xs shrink-0 overflow-x-auto">
            <div className="flex items-center gap-2 text-[#567177] font-semibold">
              <Layers size={14} className="text-[#234d4d]" />
              <span>Comparing:</span>
              <span className="text-[#10484b] font-bold">
                {comparedList.map((p) => p.title.split(" ")[0]).join(" vs ")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {comparedList.length < 3 && allAvailableProperties.length > comparedList.length && (
                <button
                  type="button"
                  onClick={handleAddThirdSlot}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eaf6df] hover:bg-[#dff0d0] text-[#234d4d] font-bold text-xs border border-[#234d4d]/30 transition"
                >
                  <Plus size={13} />
                  <span>Add 3rd Property</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Matrix Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Top Cards Column Grid */}
            <div className={`grid gap-4 ${comparedList.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
              {parsedMetrics.map((item, idx) => {
                const { property: p, psf, yieldPercent } = item;
                const isSaved = isSavedFn ? isSavedFn(p.id) : false;

                return (
                  <div
                    key={p.id}
                    className="bg-[#fbfff9] border-2 border-[#234d4d]/30 rounded-2xl p-4 shadow-sm space-y-3 relative flex flex-col justify-between"
                  >
                    {/* Header Slot Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#234d4d] bg-[#eaf6df] px-2 py-0.5 rounded-md border border-[#234d4d]/20">
                          Contender {idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {comparedList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(idx)}
                              title="Remove column"
                              className="text-[11px] text-slate-400 hover:text-rose-600 px-1 font-bold"
                            >
                              ✕
                            </button>
                          )}
                          {onToggleSave && (
                            <button
                              type="button"
                              onClick={() => onToggleSave(p.id)}
                              className={`p-1 rounded-md transition ${isSaved ? "text-rose-600" : "text-slate-400 hover:text-rose-500"}`}
                            >
                              <Heart size={14} fill={isSaved ? "currentColor" : "none"} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dropdown to switch property in this column */}
                      <select
                        value={p.id}
                        onChange={(e) => handleReplaceSlot(idx, Number(e.target.value))}
                        className="w-full text-xs font-bold text-[#10484b] bg-[#f4faea] border border-[#234d4d]/25 rounded-lg p-1.5 mb-2.5 focus:ring-1 focus:ring-[#234d4d]"
                      >
                        {allAvailableProperties.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.title} ({opt.location.split(",")[0]})
                          </option>
                        ))}
                      </select>

                      {/* Image Thumbnail */}
                      <div className="aspect-[16/10] rounded-xl overflow-hidden relative border border-[#234d4d]/20 shadow-inner mb-3">
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                        {p.badge && (
                          <span className="absolute top-2 left-2 bg-[#10484b]/90 backdrop-blur-sm text-[#d7ef73] text-[9px] font-black px-2 py-0.5 rounded-full border border-[#d7ef73]/30">
                            {p.badge}
                          </span>
                        )}
                      </div>

                      {/* Title & Developer */}
                      <h3 className="font-bold text-sm text-[#10484b] customer-portal-serif line-clamp-1">
                        {p.title}
                      </h3>
                      <p className="text-[11px] text-[#567177] font-medium flex items-center gap-1">
                        <Building2 size={11} className="text-[#234d4d]" />
                        <span>{p.developer}</span>
                      </p>
                      <p className="text-[11px] text-[#567177] flex items-center gap-1 truncate">
                        <MapPin size={11} className="text-[#234d4d] shrink-0" />
                        <span>{p.location}</span>
                      </p>
                    </div>

                    {/* Price Block */}
                    <div className="pt-2 border-t border-[#dfe6df]">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-[#567177] font-bold block">Asking Price</span>
                          <span className="text-base font-black text-[#10484b] customer-portal-serif">
                            RM {p.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#567177] font-bold block">Rate / sqft</span>
                          <span className="text-xs font-black text-[#234d4d]">
                            RM {psf.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Benchmarking Badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {psf === lowestPsf && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200">
                            ★ Lowest PSF (High Value)
                          </span>
                        )}
                        {yieldPercent === highestYield && (
                          <span className="bg-[#d7ef73] text-[#10484b] text-[9px] font-black px-1.5 py-0.5 rounded border border-[#10484b]/20">
                            ★ Top Rental Yield ({yieldPercent}%)
                          </span>
                        )}
                        {p.price === lowestPrice && (
                          <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-indigo-200">
                            ★ Lowest Entry Capital
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      {onBookViewing && (
                        <button
                          type="button"
                          onClick={() => onBookViewing(p)}
                          className="w-full mt-3 py-2 px-3 rounded-xl bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm border border-[#234d4d]"
                        >
                          <Calendar size={13} />
                          <span>Schedule VIP Viewing</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Deep Metric Comparison Tables */}
            <div className="space-y-4">
              {/* SECTION 1: Financial & ROI Breakdown */}
              <div className="bg-[#fbfff9] border border-[#dfe6df] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-[#eaf6df]/70 border-b border-[#dfe6df] flex items-center gap-2">
                  <Coins size={14} className="text-[#234d4d]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#10484b]">
                    Financial & Rental Velocity Benchmarking
                  </h4>
                </div>
                <div className="divide-y divide-[#dfe6df] text-xs">
                  {/* Built-up Size & Layout */}
                  <div className={`grid p-3 items-center ${comparedList.length === 3 ? "grid-cols-4" : "grid-cols-3"}`}>
                    <span className="font-bold text-[#567177]">Built-Up Area & Layout</span>
                    {parsedMetrics.map((m) => (
                      <span key={m.property.id} className="font-bold text-[#10484b]">
                        {m.property.size} ({m.property.beds} Beds, {m.property.baths} Baths)
                      </span>
                    ))}
                  </div>

                  {/* Calculated Price Per Sqft */}
                  <div className={`grid p-3 items-center ${comparedList.length === 3 ? "grid-cols-4" : "grid-cols-3"}`}>
                    <span className="font-bold text-[#567177]">Price / sq.ft.</span>
                    {parsedMetrics.map((m) => (
                      <div key={m.property.id} className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[#10484b]">RM {m.psf.toLocaleString()}</span>
                        {m.psf === lowestPsf && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            Lowest
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Projected Gross Rental Yield */}
                  <div className={`grid p-3 items-center ${comparedList.length === 3 ? "grid-cols-4" : "grid-cols-3"}`}>
                    <span className="font-bold text-[#567177]">Projected Rental Yield</span>
                    {parsedMetrics.map((m) => (
                      <div key={m.property.id} className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-[#234d4d]">{m.yieldPercent}%</span>
                        {m.yieldPercent === highestYield && (
                          <span className="text-[9px] bg-[#d7ef73] text-[#10484b] font-bold px-1.5 py-0.2 rounded">
                            Top Yield
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Est. Monthly Rental Income */}
                  <div className={`grid p-3 items-center ${comparedList.length === 3 ? "grid-cols-4" : "grid-cols-3"}`}>
                    <span className="font-bold text-[#567177]">Est. Monthly Rent Income</span>
                    {parsedMetrics.map((m) => (
                      <span key={m.property.id} className="font-bold text-emerald-800">
                        RM {m.estMonthlyRent.toLocaleString()} / mo
                      </span>
                    ))}
                  </div>

                  {/* Estimated Monthly Loan Repayment (30yr @ 4.2%) */}
                  <div className={`grid p-3 items-center ${comparedList.length === 3 ? "grid-cols-4" : "grid-cols-3"}`}>
                    <div>
                      <span className="font-bold text-[#567177] block">Indicative Monthly Loan</span>
                      <span className="text-[10px] text-slate-400 font-medium">90% LTV, 30y @ 4.2%</span>
                    </div>
                    {parsedMetrics.map((m) => (
                      <span key={m.property.id} className="font-medium text-[#10484b]">
                        RM {m.monthlyInstallment.toLocaleString()} / mo
                      </span>
                    ))}
                  </div>

                  {/* Est. Maintenance Fee */}
                  <div className={`grid p-3 items-center ${comparedList.length === 3 ? "grid-cols-4" : "grid-cols-3"}`}>
                    <span className="font-bold text-[#567177]">Est. Maintenance Fee</span>
                    {parsedMetrics.map((m) => (
                      <span key={m.property.id} className="font-medium text-[#567177]">
                        ~RM {m.maintenanceFee.toLocaleString()} / mo
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Luxury Amenities & Specifications Matrix */}
              <div className="bg-[#fbfff9] border border-[#dfe6df] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-[#eaf6df]/70 border-b border-[#dfe6df] flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#234d4d]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#10484b]">
                    Exclusive Amenities & Architectural Pedigree
                  </h4>
                </div>
                <div className="divide-y divide-[#dfe6df] text-xs">
                  {/* Property Type / Category */}
                  <div className={`grid p-3 items-center ${comparedList.length === 3 ? "grid-cols-4" : "grid-cols-3"}`}>
                    <span className="font-bold text-[#567177]">Property Category</span>
                    {parsedMetrics.map((m) => (
                      <span key={m.property.id} className="font-bold text-[#10484b]">
                        {m.property.type}
                      </span>
                    ))}
                  </div>

                  {/* Amenity Checks */}
                  {AMENITY_KEYS.map((amenity) => (
                    <div
                      key={amenity.key}
                      className={`grid p-3 items-center ${comparedList.length === 3 ? "grid-cols-4" : "grid-cols-3"}`}
                    >
                      <span className="font-bold text-[#567177]">{amenity.label}</span>
                      {parsedMetrics.map((m) => {
                        const present = hasAmenity(m.featureList, amenity.key);
                        return (
                          <div key={m.property.id} className="flex items-center gap-1.5">
                            {present ? (
                              <div className="flex items-center gap-1 text-emerald-800 font-bold">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                  <Check size={11} strokeWidth={3} />
                                </span>
                                <span>Included</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-slate-400 font-medium">
                                <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                  <X size={11} />
                                </span>
                                <span>Standard</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: AI Executive Comparative Synthesis */}
              <div className="bg-gradient-to-br from-[#10484b] to-[#234d4d] text-[#fbfff9] p-4 sm:p-5 rounded-2xl shadow-md border border-[#234d4d]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-[#d7ef73] text-[#10484b] flex items-center justify-center">
                    <Sparkles size={14} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#d7ef73]">
                    AI Investment Verdict & Contender Profiles
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Contender 1 Verdict */}
                  {parsedMetrics[0] && (
                    <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#d7ef73] font-bold text-[11px]">
                        <Award size={13} />
                        <span>{parsedMetrics[0].property.title.split(" ")[0]} Profile</span>
                      </div>
                      <p className="text-[#d2e5d4] leading-relaxed text-[11px]">
                        {parsedMetrics[0].psf === lowestPsf
                          ? `Value champion at RM ${parsedMetrics[0].psf.toLocaleString()}/sqft. Ideal entry for capital appreciation and balanced portfolio holding.`
                          : `High-conviction luxury tier development located in prime ${parsedMetrics[0].property.location.split(",")[0]}. Supported by strong developer branding.`}
                      </p>
                    </div>
                  )}

                  {/* Contender 2 Verdict */}
                  {parsedMetrics[1] && (
                    <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#d7ef73] font-bold text-[11px]">
                        <Award size={13} />
                        <span>{parsedMetrics[1].property.title.split(" ")[0]} Profile</span>
                      </div>
                      <p className="text-[#d2e5d4] leading-relaxed text-[11px]">
                        {parsedMetrics[1].yieldPercent === highestYield
                          ? `Highest yield leader delivering ${parsedMetrics[1].yieldPercent}% gross return with ~RM ${parsedMetrics[1].estMonthlyRent.toLocaleString()}/mo estimated rental income.`
                          : `Distinguished residence with spacious ${parsedMetrics[1].property.size} layout, optimized for high-end tenant tenancy and expat leasing.`}
                      </p>
                    </div>
                  )}

                  {/* Contender 3 Verdict (if active) */}
                  {parsedMetrics[2] ? (
                    <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#d7ef73] font-bold text-[11px]">
                        <Award size={13} />
                        <span>{parsedMetrics[2].property.title.split(" ")[0]} Profile</span>
                      </div>
                      <p className="text-[#d2e5d4] leading-relaxed text-[11px]">
                        Super-prime flagship offering comprehensive branded lifestyle amenities and robust multi-generational portfolio value retention.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white/5 border border-dashed border-white/15 flex flex-col items-center justify-center text-center text-[#d2e5d4]/70">
                      <p className="text-[11px] font-medium">Add a 3rd contender above to compare another luxury residence.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-3 sm:p-4 bg-[#fbfff9] border-t border-[#dfe6df] flex items-center justify-between text-xs shrink-0">
            <span className="text-[#567177] font-medium text-[11px]">
              * Yields & installments are indicative estimates based on prevailing market benchmarks.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] font-bold text-xs transition shadow-sm border border-[#234d4d]"
            >
              Close Comparison
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
