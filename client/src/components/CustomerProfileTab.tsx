import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  SlidersHorizontal,
  MapPin,
  Building2,
  DollarSign,
  BedDouble,
  Target,
  CheckCircle2,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Mail,
  Phone,
  Layers,
  Award,
  BookmarkCheck,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { CustomerUser, useAuth } from "@/contexts/AuthContext";
import { PortalProperty } from "@/pages/CustomerPortal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CustomerProfileTabProps {
  properties: PortalProperty[];
  onApplyAndExplore: () => void;
}

const PERSONA_OPTIONS = [
  {
    id: "High Net Worth Investor",
    label: "High Net Worth Investor",
    desc: "Capital preservation, high yield (5.5%+), and prime asset appreciation.",
    badge: "HNW Tier",
  },
  {
    id: "First-Time Luxury Homebuyer",
    label: "First-Time Luxury Homebuyer",
    desc: "Move-in ready luxury, family-friendly layouts, and lifestyle amenities.",
    badge: "Lifestyle Tier",
  },
  {
    id: "VIP Expat Investor",
    label: "VIP Expat Investor",
    desc: "MM2H-friendly trophy penthouses, central business district connectivity.",
    badge: "Global VIP",
  },
  {
    id: "High-Yield Buy-to-Let Landlord",
    label: "High-Yield Buy-to-Let Landlord",
    desc: "Maximizing short/long-term tenancy rental returns and high tenant demand.",
    badge: "Yield Max",
  },
  {
    id: "Landed & Multi-Gen Estate Buyer",
    label: "Landed & Multi-Gen Estate Buyer",
    desc: "Expansive layouts, private land, multi-car parking, and multigenerational comfort.",
    badge: "Estate Tier",
  },
];

const LOCATION_OPTIONS = [
  { id: "KLCC", label: "KLCC & City Centre", region: "Kuala Lumpur" },
  { id: "Mont Kiara", label: "Mont Kiara", region: "Kuala Lumpur" },
  { id: "Damansara Heights", label: "Damansara Heights", region: "Kuala Lumpur" },
  { id: "Bangsar", label: "Bangsar", region: "Kuala Lumpur" },
  { id: "Ampang Hilir", label: "Ampang Hilir (Embassy Row)", region: "Kuala Lumpur" },
  { id: "Bukit Bintang", label: "Bukit Bintang", region: "Kuala Lumpur" },
  { id: "Shah Alam", label: "Shah Alam / Subang", region: "Selangor" },
  { id: "Iskandar", label: "Iskandar Puteri", region: "Johor" },
];

const PROPERTY_TYPE_OPTIONS = [
  { id: "Condominium", label: "Luxury Condominium" },
  { id: "Serviced residence", label: "Serviced Residence" },
  { id: "Penthouse", label: "Super Penthouse / Duplex" },
  { id: "Landed terrace", label: "Landed Estate / Semi-D" },
];

const BUDGET_PRESETS = [
  { label: "RM 1.0M - RM 2.0M", min: 1000000, max: 2000000, text: "RM 1,000,000 - RM 2,000,000" },
  { label: "RM 2.0M - RM 3.5M", min: 2000000, max: 3500000, text: "RM 2,000,000 - RM 3,500,000" },
  { label: "RM 2.5M - RM 4.5M", min: 2500000, max: 4500000, text: "RM 2,500,000 - RM 4,500,000" },
  { label: "RM 4.0M - RM 7.0M", min: 4000000, max: 7000000, text: "RM 4,000,000 - RM 7,000,000" },
  { label: "RM 7.0M+", min: 7000000, max: 15000000, text: "RM 7,000,000 - RM 15,000,000" },
];

const INVESTMENT_GOAL_OPTIONS = [
  { id: "High Rental Yield", label: "High Rental Yield (5.5%+ ROI)", icon: TrendingUp },
  { id: "Capital Appreciation", label: "Long-Term Capital Appreciation", icon: Target },
  { id: "Luxury Family Living", label: "Prime Family Living & School Proximity", icon: Building2 },
  { id: "Ready to Move-in", label: "Immediate Handover & Tenancy Ready", icon: Zap },
  { id: "Foreign Buyer & MM2H", label: "MM2H / Foreign Ownership Compliant", icon: ShieldCheck },
];

const FEATURE_OPTIONS = [
  "Sky Infinity Pool",
  "Private Lift Lobby",
  "Smart Home Automation",
  "24/7 VIP Concierge",
  "Transit / MRT Connected",
  "Golf / Skyline View",
  "EV Charger Infrastructure",
  "Green Building / ESG Certified",
  "Double Volume High Ceiling",
];

export default function CustomerProfileTab({ properties, onApplyAndExplore }: CustomerProfileTabProps) {
  const { activeCustomer, updateCustomerProfile, isUpdatingProfile, activeAgent } = useAuth();

  // Local form state initialized from activeCustomer
  const [name, setName] = useState(activeCustomer?.name || "");
  const [phone, setPhone] = useState(activeCustomer?.phone || "");
  const [segment, setSegment] = useState(activeCustomer?.segment || "High Net Worth Investor");
  const [budgetRange, setBudgetRange] = useState(activeCustomer?.budget || "RM 2,500,000 - RM 4,500,000");

  // Selected Locations array
  const [selectedLocations, setSelectedLocations] = useState<string[]>(() => {
    const raw = activeCustomer?.preferredLocation || "KLCC & Mont Kiara";
    const locs: string[] = [];
    LOCATION_OPTIONS.forEach((loc) => {
      if (raw.toLowerCase().includes(loc.id.toLowerCase())) {
        locs.push(loc.id);
      }
    });
    return locs.length > 0 ? locs : ["KLCC", "Mont Kiara"];
  });

  // Selected Property Types
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => {
    const raw = activeCustomer?.preferredTypes || "Condominium,Penthouse,Serviced residence";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  });

  // Minimum Bedrooms
  const [minBeds, setMinBeds] = useState<number>(activeCustomer?.minBeds ?? 2);

  // Primary Goal
  const [investmentGoal, setInvestmentGoal] = useState<string>(
    activeCustomer?.investmentGoal || "High Rental Yield"
  );

  // Preferred Features
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() => {
    const raw = activeCustomer?.preferredFeatures || "Sky Infinity Pool,Private Lift Lobby,24/7 VIP Concierge";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  });

  // Section collapse state (default all collapsed)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    persona: false,
    budget: false,
    location: false,
    layout: false,
    strategy: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allExpanded = Object.values(expandedSections).every(Boolean);
  const toggleAllSections = () => {
    const next = !allExpanded;
    setExpandedSections({
      persona: next,
      budget: next,
      location: next,
      layout: next,
      strategy: next,
    });
  };

  // Sync state if activeCustomer changes externally
  useEffect(() => {
    if (activeCustomer) {
      setName(activeCustomer.name || "");
      setPhone(activeCustomer.phone || "");
      setSegment(activeCustomer.segment || "High Net Worth Investor");
      setBudgetRange(activeCustomer.budget || "RM 2,500,000 - RM 4,500,000");
    }
  }, [activeCustomer]);

  // Toggle helper for arrays
  const toggleItem = (list: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      if (list.length > 1) {
        setter(list.filter((x) => x !== item));
      } else {
        toast.info("Please keep at least one selection.");
      }
    } else {
      setter([...list, item]);
    }
  };

  // Helper to extract numeric min/max from budget text
  const budgetNumbers = useMemo(() => {
    const parts = budgetRange.replace(/[^0-9-]/g, "").split("-").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { min: parts[0], max: parts[1] };
    }
    return { min: 2000000, max: 4500000 };
  }, [budgetRange]);

  // ── Live AI Simulation for the current active criteria ──────────────────────
  const simulationResults = useMemo(() => {
    if (!properties || properties.length === 0) return { count: 0, topMatches: [], topScore: 0 };

    const scored = properties.map((prop) => {
      let score = 50;
      const reasons: string[] = [];

      // 1. Location match
      const propLoc = prop.location.toLowerCase();
      const locMatch = selectedLocations.some((locId) =>
        propLoc.includes(locId.toLowerCase())
      );
      if (locMatch) {
        score += 24;
        reasons.push("Prime Location Match");
      }

      // 2. Budget match
      if (prop.price >= budgetNumbers.min && prop.price <= budgetNumbers.max) {
        score += 18;
        reasons.push("Budget Matched");
      } else if (prop.price >= budgetNumbers.min * 0.85 && prop.price <= budgetNumbers.max * 1.15) {
        score += 10;
      }

      // 3. Property Type
      if (selectedTypes.some((t) => prop.type.toLowerCase().includes(t.toLowerCase()))) {
        score += 10;
        reasons.push(`${prop.type} Match`);
      }

      // 4. Bedroom Count
      if (minBeds > 0) {
        if (prop.beds >= minBeds) {
          score += 10;
        } else {
          score -= 8;
        }
      }

      // 5. Investment Goal
      const propYield = parseFloat(prop.yield || "0");
      if (investmentGoal === "High Rental Yield") {
        if (propYield >= 5.8) {
          score += 14;
          reasons.push(`High Yield (${prop.yield})`);
        }
      } else if (investmentGoal === "Luxury Family Living") {
        if (prop.beds >= 3 || prop.type.includes("Landed")) {
          score += 14;
          reasons.push("Family Living Layout");
        }
      } else if (investmentGoal === "Capital Appreciation" || investmentGoal === "Foreign Buyer & MM2H") {
        if (prop.badge || prop.price >= 3000000) {
          score += 12;
          reasons.push("Prime Capital Tier");
        }
      }

      // 6. Features overlap
      const propFeatures = (prop.features || []).join(" ").toLowerCase();
      const matchedFeatures = selectedFeatures.filter((f) =>
        propFeatures.includes(f.toLowerCase().split(" ")[0])
      );
      if (matchedFeatures.length > 0) {
        score += Math.min(10, matchedFeatures.length * 3);
      }

      const matchPercent = Math.min(99, Math.max(55, Math.round(score)));
      return {
        ...prop,
        matchPercent,
        reasons: reasons.slice(0, 3).join(" • ") || "Curated for preferences",
      };
    });

    const sorted = scored.sort((a, b) => b.matchPercent - a.matchPercent);
    const topMatches = sorted.slice(0, 4);
    const qualifying = sorted.filter((p) => p.matchPercent >= 80);

    return {
      count: qualifying.length,
      topMatches,
      topScore: topMatches[0]?.matchPercent || 92,
      topProperty: topMatches[0],
    };
  }, [properties, selectedLocations, budgetNumbers, selectedTypes, minBeds, investmentGoal, selectedFeatures]);

  // Handle Save
  const handleSavePreferences = async () => {
    try {
      const locString = selectedLocations.join(" & ");
      const typeString = selectedTypes.join(",");
      const featureString = selectedFeatures.join(",");

      await updateCustomerProfile({
        name,
        phone,
        segment,
        budget: budgetRange,
        preferredLocation: locString,
        preferredTypes: typeString,
        minBeds,
        investmentGoal,
        preferredFeatures: featureString,
      });

      toast.success("AI match preferences saved successfully!", {
        description: `Your Featured Area is now tuned for ${selectedLocations.length} locations & ${budgetRange}.`,
      });
    } catch (err: any) {
      toast.error("Failed to save preferences", {
        description: err?.message || "Please try again.",
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── Breadcrumb & Navigation Bar ─── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onApplyAndExplore}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#fbfff9] hover:bg-[#eaf6df] border border-[#234d4d] text-[#10484b] text-xs font-bold transition shadow-sm"
        >
          <ArrowRight className="size-3.5 rotate-180 text-[#234d4d]" />
          <span>Back to Explore Residences</span>
        </button>
        <span className="text-xs text-[#567177] font-semibold">
          Customer Account Settings & Match Algorithm Criteria
        </span>
      </div>

      {/* ─── Profile Overview Header ─── */}
      <div className="p-6 sm:p-8 bg-[#10484b] text-white rounded-3xl relative overflow-hidden shadow-2xl border-[1.5px] border-[#234d4d]">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#d7ef73]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-[#d7ef73] to-[#8fb837] text-[#10484b] font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-white/20">
              {activeCustomer?.avatarInitials || "ST"}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="customer-portal-serif text-2xl sm:text-3xl font-normal text-white">
                  {name || activeCustomer?.name}
                </h1>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#d7ef73] text-[#10484b] border border-[#234d4d]">
                  {segment}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-[#d7ef73] border border-white/20 flex items-center gap-1">
                  <ShieldCheck size={12} /> Verified Buyer
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#c5dfbe] mt-1.5 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-[#d7ef73]" /> {activeCustomer?.email}
                </span>
                {phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-[#d7ef73]" /> {phone}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Dedicated Advisor Mini Card */}
          <div className="bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/15 max-w-sm flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#234d4d] text-[#d7ef73] font-bold text-xs flex items-center justify-center shrink-0">
              {activeAgent.initials}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-[10px] uppercase font-bold text-[#d7ef73] tracking-wider">Dedicated Luxury Advisor</p>
              <p className="text-xs font-bold text-white truncate">{activeAgent.name}</p>
              <p className="text-[10.5px] text-[#c5dfbe] truncate">{activeAgent.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Grid: Main Preference Form + Live AI Match Impact Card ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Preference Controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* Controls Toolbar */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold text-[#10484b] flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-[#234d4d]" />
              <span>Matching Criteria Dimensions (5)</span>
            </p>
            <button
              type="button"
              onClick={toggleAllSections}
              className="text-xs font-bold text-[#234d4d] hover:text-[#10484b] hover:underline flex items-center gap-1 transition px-2.5 py-1 rounded-lg hover:bg-[#eaf6df]"
            >
              <ChevronsUpDown size={13} />
              <span>{allExpanded ? "Collapse All" : "Expand All"}</span>
            </button>
          </div>

          {/* Section 1: Persona & Buyer Segment */}
          <section className="bg-[#fbfff9] rounded-3xl border border-[#dfe6df] shadow-sm overflow-hidden transition-all">
            <div
              onClick={() => toggleSection("persona")}
              className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none hover:bg-[#f6faf1] transition border-b border-transparent group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#eaf6df] text-[#234d4d] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#10484b] uppercase tracking-wider">
                    Buyer Persona & Segment
                  </h3>
                  <p className="text-xs text-[#567177] hidden sm:block">
                    Guides AI scoring weights according to your investment strategy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#d7ef73] text-[#10484b] border border-[#234d4d]/30 max-w-[140px] sm:max-w-none truncate">
                  {segment}
                </span>
                <div className="size-8 rounded-xl bg-[#f3f5ef] group-hover:bg-[#eaf6df] flex items-center justify-center border border-[#dfe6df] transition">
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-[#234d4d] transition-transform duration-300",
                      expandedSections.persona && "rotate-180"
                    )}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections.persona && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-1 border-t border-[#f0f4ee]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {PERSONA_OPTIONS.map((p) => {
                        const isSelected = segment === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSegment(p.id)}
                            className={cn(
                              "p-3.5 rounded-2xl border text-left transition-all relative",
                              isSelected
                                ? "bg-[#f4faea] border-[#234d4d] shadow-sm ring-1 ring-[#234d4d]"
                                : "bg-[#f3f5ef]/60 border-[#dfe6df] hover:border-[#b3c7b3] hover:bg-[#f3f5ef]"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-extrabold text-[#10484b]">{p.label}</span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[9.5px] font-extrabold",
                                  isSelected
                                    ? "bg-[#d7ef73] text-[#10484b]"
                                    : "bg-[#e2e8de] text-[#567177]"
                                )}
                              >
                                {p.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#567177] leading-relaxed">{p.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Section 2: Budget Target Range */}
          <section className="bg-[#fbfff9] rounded-3xl border border-[#dfe6df] shadow-sm overflow-hidden transition-all">
            <div
              onClick={() => toggleSection("budget")}
              className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none hover:bg-[#f6faf1] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#eaf6df] text-[#234d4d] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#10484b] uppercase tracking-wider">
                    Target Acquisition Budget
                  </h3>
                  <p className="text-xs text-[#567177] hidden sm:block">
                    Cross-references listing prices with your preferred financial parameters.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#eaf6df] text-[#10484b] border border-[#234d4d]/30 max-w-[150px] sm:max-w-none truncate">
                  {budgetRange}
                </span>
                <div className="size-8 rounded-xl bg-[#f3f5ef] group-hover:bg-[#eaf6df] flex items-center justify-center border border-[#dfe6df] transition">
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-[#234d4d] transition-transform duration-300",
                      expandedSections.budget && "rotate-180"
                    )}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections.budget && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-1 border-t border-[#f0f4ee] space-y-4">
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {BUDGET_PRESETS.map((preset) => {
                        const isSelected = budgetRange === preset.text;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setBudgetRange(preset.text)}
                            className={cn(
                              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all border",
                              isSelected
                                ? "bg-[#234d4d] text-[#d7ef73] border-[#234d4d] shadow-sm"
                                : "bg-[#f3f5ef] text-[#10484b] border-[#dfe6df] hover:bg-[#e4eee0]"
                            )}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Input */}
                    <div>
                      <label className="text-[11px] font-bold text-[#567177] uppercase tracking-wider block mb-1">
                        Custom Budget String Label
                      </label>
                      <input
                        type="text"
                        value={budgetRange}
                        onChange={(e) => setBudgetRange(e.target.value)}
                        placeholder="e.g. RM 2,500,000 - RM 4,500,000"
                        className="w-full px-4 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-bold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Section 3: Prime Locations */}
          <section className="bg-[#fbfff9] rounded-3xl border border-[#dfe6df] shadow-sm overflow-hidden transition-all">
            <div
              onClick={() => toggleSection("location")}
              className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none hover:bg-[#f6faf1] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#eaf6df] text-[#234d4d] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#10484b] uppercase tracking-wider">
                    Preferred Prime Locations (Multi-Select)
                  </h3>
                  <p className="text-xs text-[#567177] hidden sm:block">
                    Properties in these corridors receive priority match scoring.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs font-extrabold text-[#234d4d] bg-[#eaf6df] px-2.5 py-1 rounded-full border border-[#234d4d]/30">
                  {selectedLocations.length} selected
                </span>
                <div className="size-8 rounded-xl bg-[#f3f5ef] group-hover:bg-[#eaf6df] flex items-center justify-center border border-[#dfe6df] transition">
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-[#234d4d] transition-transform duration-300",
                      expandedSections.location && "rotate-180"
                    )}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections.location && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-1 border-t border-[#f0f4ee]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                      {LOCATION_OPTIONS.map((loc) => {
                        const isSelected = selectedLocations.includes(loc.id);
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => toggleItem(selectedLocations, loc.id, setSelectedLocations)}
                            className={cn(
                              "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between",
                              isSelected
                                ? "bg-[#234d4d] text-white border-[#234d4d] shadow-sm"
                                : "bg-[#f3f5ef] text-[#10484b] border-[#dfe6df] hover:bg-[#e4eee0]"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <MapPin
                                size={14}
                                className={isSelected ? "text-[#d7ef73]" : "text-[#567177]"}
                              />
                              {isSelected && <Check size={14} className="text-[#d7ef73]" />}
                            </div>
                            <div>
                              <p className="text-xs font-extrabold leading-tight">{loc.label}</p>
                              <p
                                className={cn(
                                  "text-[10px] mt-0.5 font-medium",
                                  isSelected ? "text-[#c5dfbe]" : "text-[#7b938a]"
                                )}
                              >
                                {loc.region}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Section 4: Property Types & Minimum Bedrooms */}
          <section className="bg-[#fbfff9] rounded-3xl border border-[#dfe6df] shadow-sm overflow-hidden transition-all">
            <div
              onClick={() => toggleSection("layout")}
              className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none hover:bg-[#f6faf1] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#eaf6df] text-[#234d4d] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition">
                  4
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#10484b] uppercase tracking-wider">
                    Property Types & Layout Criteria
                  </h3>
                  <p className="text-xs text-[#567177] hidden sm:block">
                    Tailor format criteria for multi-generational living or tenant density.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-extrabold text-[#10484b] bg-[#eaf6df] px-2.5 py-1 rounded-full border border-[#234d4d]/30">
                  {selectedTypes.length} Types · {minBeds === 0 ? "Any Beds" : `${minBeds}+ Beds`}
                </span>
                <div className="size-8 rounded-xl bg-[#f3f5ef] group-hover:bg-[#eaf6df] flex items-center justify-center border border-[#dfe6df] transition">
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-[#234d4d] transition-transform duration-300",
                      expandedSections.layout && "rotate-180"
                    )}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections.layout && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-1 border-t border-[#f0f4ee] space-y-5">
                    {/* Property Types */}
                    <div>
                      <label className="text-[11px] font-extrabold text-[#10484b] uppercase tracking-wider block mb-2">
                        Eligible Formats (Multi-Select)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {PROPERTY_TYPE_OPTIONS.map((t) => {
                          const isSelected = selectedTypes.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleItem(selectedTypes, t.id, setSelectedTypes)}
                              className={cn(
                                "p-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
                                isSelected
                                  ? "bg-[#234d4d] text-[#d7ef73] border-[#234d4d]"
                                  : "bg-[#f3f5ef] text-[#10484b] border-[#dfe6df] hover:bg-[#e4eee0]"
                              )}
                            >
                              {isSelected && <Check size={13} className="text-[#d7ef73]" />}
                              <span>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Min Bedrooms */}
                    <div>
                      <label className="text-[11px] font-extrabold text-[#10484b] uppercase tracking-wider block mb-2">
                        Minimum Bedroom Requirement
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[0, 1, 2, 3, 4].map((num) => {
                          const isSelected = minBeds === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setMinBeds(num)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5",
                                isSelected
                                  ? "bg-[#234d4d] text-[#d7ef73] border-[#234d4d]"
                                  : "bg-[#f3f5ef] text-[#10484b] border-[#dfe6df] hover:bg-[#e4eee0]"
                              )}
                            >
                              <BedDouble size={14} />
                              {num === 0 ? "Any Bedrooms" : `${num}+ Bedrooms`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Section 5: Primary Investment Goal & Amenities */}
          <section className="bg-[#fbfff9] rounded-3xl border border-[#dfe6df] shadow-sm overflow-hidden transition-all">
            <div
              onClick={() => toggleSection("strategy")}
              className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none hover:bg-[#f6faf1] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#eaf6df] text-[#234d4d] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition">
                  5
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#10484b] uppercase tracking-wider">
                    Strategic Objective & Amenities
                  </h3>
                  <p className="text-xs text-[#567177] hidden sm:block">
                    Select investment focus and must-have lifestyle amenities.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-extrabold text-[#10484b] bg-[#eaf6df] px-2.5 py-1 rounded-full border border-[#234d4d]/30 max-w-[140px] sm:max-w-none truncate">
                  {investmentGoal}
                </span>
                <div className="size-8 rounded-xl bg-[#f3f5ef] group-hover:bg-[#eaf6df] flex items-center justify-center border border-[#dfe6df] transition">
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-[#234d4d] transition-transform duration-300",
                      expandedSections.strategy && "rotate-180"
                    )}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections.strategy && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-1 border-t border-[#f0f4ee] space-y-5">
                    {/* Primary Goal */}
                    <div>
                      <label className="text-[11px] font-extrabold text-[#10484b] uppercase tracking-wider block mb-2">
                        Primary Goal
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {INVESTMENT_GOAL_OPTIONS.map((g) => {
                          const isSelected = investmentGoal === g.id;
                          const Icon = g.icon;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setInvestmentGoal(g.id)}
                              className={cn(
                                "p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center gap-2.5",
                                isSelected
                                  ? "bg-[#f4faea] text-[#10484b] border-[#234d4d] ring-1 ring-[#234d4d]"
                                  : "bg-[#f3f5ef] text-[#567177] border-[#dfe6df] hover:bg-[#e4eee0]"
                              )}
                            >
                              <div
                                className={cn(
                                  "size-7 rounded-lg flex items-center justify-center shrink-0",
                                  isSelected ? "bg-[#234d4d] text-[#d7ef73]" : "bg-[#e2e8de] text-[#10484b]"
                                )}
                              >
                                <Icon size={14} />
                              </div>
                              <span className="flex-1">{g.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Must-Have Features */}
                    <div>
                      <label className="text-[11px] font-extrabold text-[#10484b] uppercase tracking-wider block mb-2">
                        Key Desired Amenities (Multi-Select)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {FEATURE_OPTIONS.map((feat) => {
                          const isSelected = selectedFeatures.includes(feat);
                          return (
                            <button
                              key={feat}
                              type="button"
                              onClick={() => toggleItem(selectedFeatures, feat, setSelectedFeatures)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5",
                                isSelected
                                  ? "bg-[#234d4d] text-white border-[#234d4d]"
                                  : "bg-[#f3f5ef] text-[#10484b] border-[#dfe6df] hover:bg-[#e4eee0]"
                              )}
                            >
                              {isSelected ? (
                                <Check size={12} className="text-[#d7ef73]" />
                              ) : (
                                <span className="size-1.5 rounded-full bg-[#8fa49a]" />
                              )}
                              <span>{feat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Right 1 Column: Live AI Fit Impact & Instant Save Action */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {/* Live AI Match Scorecard */}
          <div className="p-6 bg-gradient-to-br from-[#10484b] to-[#175c5f] text-white rounded-3xl border-[1.5px] border-[#234d4d] shadow-xl relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-[#d7ef73] text-[#10484b] uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={13} /> Live AI Cross-Reference
              </span>
              <span className="text-xs text-[#c5dfbe] font-bold">Real-time</span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="customer-portal-serif text-4xl sm:text-5xl font-normal text-[#d7ef73]">
                  {simulationResults.topScore}%
                </span>
                <span className="text-xs text-[#c5dfbe] font-bold">Top Match Score</span>
              </div>
              <p className="text-xs text-[#e4ece2] mt-1.5">
                Based on your active criteria, <b>{simulationResults.count}</b> luxury residences qualify with an 80%+ compatibility rating.
              </p>
            </div>

            {/* Top Match Spotlight */}
            {simulationResults.topProperty && (
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 space-y-2">
                <p className="text-[10px] text-[#d7ef73] font-bold uppercase tracking-wider">
                  Top Recommended Residence
                </p>
                <div className="flex items-center gap-3">
                  {simulationResults.topProperty.imageUrl && (
                    <img
                      src={simulationResults.topProperty.imageUrl}
                      alt={simulationResults.topProperty.title}
                      className="size-12 rounded-xl object-cover border border-white/20"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">
                      {simulationResults.topProperty.title}
                    </p>
                    <p className="text-[10.5px] text-[#c5dfbe] truncate flex items-center gap-1">
                      <MapPin size={11} className="text-[#d7ef73]" /> {simulationResults.topProperty.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/10 text-[#d7ef73] font-bold">
                  <span>RM {simulationResults.topProperty.price.toLocaleString()}</span>
                  <span className="text-[#c5dfbe] font-normal">{simulationResults.topProperty.yield} Yield</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={isUpdatingProfile}
                className="w-full py-3 px-4 bg-[#d7ef73] hover:bg-[#c9e460] text-[#10484b] rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 border border-[#234d4d] active:scale-[0.98]"
              >
                {isUpdatingProfile ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Saving Preferences...
                  </>
                ) : (
                  <>
                    <BookmarkCheck size={15} /> Save & Apply to Featured Area
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSavePreferences().then(() => {
                    onApplyAndExplore();
                  });
                }}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/20"
              >
                <span>View My Featured Matches</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Tips Card */}
          <div className="p-5 bg-[#fbfff9] rounded-3xl border border-[#dfe6df] shadow-sm space-y-2.5 text-xs text-[#567177]">
            <div className="flex items-center gap-1.5 text-[#10484b] font-bold">
              <Info size={14} className="text-[#234d4d]" />
              <span>How AI Matching Works</span>
            </div>
            <p className="leading-relaxed">
              Our model continuously weighs listing locations (+25%), target budget compatibility (+25%), bedroom layouts (+20%), and rental yield projections (+15%) against your active criteria to present the highest-confidence opportunities in the <b>Featured For You</b> area.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
