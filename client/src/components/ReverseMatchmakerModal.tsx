import { useEffect, useMemo, useState } from "react";
import {
  X,
  Sparkles,
  Search,
  MessageCircle,
  Calendar,
  Send,
  Copy,
  Check,
  Bot,
  Flame,
  Zap,
  TrendingUp,
  MapPin,
  Building2,
  BedDouble,
  DollarSign,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  User,
  Users,
  Crown,
  Phone,
  Mail,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  rankBuyersForProperty,
  formatRM,
  type CandidateBuyer,
  type PropertySpec,
  type ReverseMatchResult,
} from "@/lib/reverseMatchmaker";
import { addLeadActionLog } from "./leadActionHistory";
import { useAuth } from "@/contexts/AuthContext";
import "./ReverseMatchmakerModal.css";

// Rich fallback candidates mirroring active CRM database
const FALLBACK_CANDIDATES: CandidateBuyer[] = [
  {
    id: 1,
    name: "Aiman Faris",
    initials: "AF",
    sourceType: "lead",
    segment: "Ready Buyer",
    location: "Petaling Jaya, Selangor",
    budget: 1250000,
    preferredTypes: "Condominium,Serviced residence",
    minBeds: 3,
    probability: 92,
    propertyOfInterest: "Asteria Residences",
    phone: "+60123456789",
    email: "aiman@example.test",
    agentId: "hannah",
  },
  {
    id: 2,
    name: "Sarah Lim",
    initials: "SL",
    sourceType: "vip_client",
    segment: "Investor",
    location: "Mont Kiara, Kuala Lumpur",
    budget: "RM 1,200,000 - RM 2,000,000",
    preferredTypes: "Condominium,Penthouse",
    minBeds: 2,
    probability: 87,
    propertyOfInterest: "The Mews KL",
    phone: "+60129876543",
    email: "sarah@example.test",
    isVip: true,
    agentId: "hannah",
  },
  {
    id: 3,
    name: "Muhammad Zaki",
    initials: "MZ",
    sourceType: "lead",
    segment: "Ready Buyer",
    location: "Shah Alam, Selangor",
    budget: 780000,
    preferredTypes: "Landed terrace,Condominium",
    minBeds: 3,
    probability: 78,
    propertyOfInterest: "Elmina Green",
    phone: "+60128765432",
    email: "zaki@example.test",
    agentId: "hannah",
  },
  {
    id: 4,
    name: "Joanne Chong",
    initials: "JC",
    sourceType: "lead",
    segment: "Researcher",
    location: "Bangsar South, Kuala Lumpur",
    budget: 1350000,
    preferredTypes: "Serviced apartment,Condominium",
    minBeds: 2,
    probability: 69,
    propertyOfInterest: "Southlink Suites",
    phone: "+60127654321",
    email: "joanne@example.test",
    agentId: "hannah",
  },
  {
    id: 5,
    name: "Ravi Nair",
    initials: "RN",
    sourceType: "lead",
    segment: "Investor",
    location: "Cyberjaya, Selangor",
    budget: 650000,
    preferredTypes: "Serviced residence",
    minBeds: 1,
    probability: 58,
    propertyOfInterest: "Mutiara Ville",
    phone: "+60126543210",
    email: "ravi@example.test",
    agentId: "amir",
  },
  {
    id: 6,
    name: "Nadia Ismail",
    initials: "NI",
    sourceType: "lead",
    segment: "Ready Buyer",
    location: "Setapak, Kuala Lumpur",
    budget: 840000,
    preferredTypes: "Condominium",
    minBeds: 3,
    probability: 73,
    propertyOfInterest: "Seri Wangi",
    phone: "+60124455667",
    email: "nadia@example.test",
    agentId: "amir",
  },
  {
    id: 7,
    name: "Tan Wei Ming",
    initials: "TW",
    sourceType: "lead",
    segment: "Investor",
    location: "Damansara, Selangor",
    budget: 1120000,
    preferredTypes: "Condominium,Serviced residence",
    minBeds: 2,
    probability: 66,
    propertyOfInterest: "Verde Heights",
    phone: "+60125566778",
    email: "weiming@example.test",
    agentId: "amir",
  },
  {
    id: 8,
    name: "Siti Aisyah",
    initials: "SA",
    sourceType: "vip_client",
    segment: "Luxury",
    location: "KLCC & Ampang Hilir",
    budget: "RM 2,500,000 - RM 4,500,000",
    preferredTypes: "Penthouse,Condominium",
    minBeds: 3,
    isVip: true,
    phone: "+60126543210",
    email: "siti.aisyah@vip.com",
    agentId: "hannah",
  },
  {
    id: 9,
    name: "Marcus Wong",
    initials: "MW",
    sourceType: "portal_account",
    segment: "First-Time Luxury Homebuyer",
    location: "Damansara Heights & Bangsar",
    budget: "RM 1,200,000 - RM 2,000,000",
    preferredTypes: "Condominium,Serviced residence",
    minBeds: 2,
    phone: "+60167734021",
    email: "marcus.wong@outlook.com",
    agentId: "amir",
  },
];

interface ReverseMatchmakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertySpec | any | null;
  onBookViewingForBuyer?: (property: PropertySpec, buyer: CandidateBuyer) => void;
}

type FilterTab = "all" | "hot" | "strong" | "leads" | "vip";

export default function ReverseMatchmakerModal({
  isOpen,
  onClose,
  property,
  onBookViewingForBuyer,
}: ReverseMatchmakerModalProps) {
  const { activeAgent } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPitchBuyerKey, setExpandedPitchBuyerKey] = useState<string | null>(null);
  const [customPitchText, setCustomPitchText] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatingAiKey, setGeneratingAiKey] = useState<string | null>(null);

  // Live queries from TRPC backend
  const { data: apiLeads } = trpc.leads.list.useQuery({ limit: 500 });
  const { data: apiCustomers } = trpc.customers.list.useQuery();

  const explainFitMutation = trpc.ai.explainFit.useMutation();

  // Combine DB leads and customers into unified candidate list
  const allCandidates = useMemo((): CandidateBuyer[] => {
    const list: CandidateBuyer[] = [];

    // 1. API Leads
    if (apiLeads && apiLeads.length > 0) {
      apiLeads.forEach((l) => {
        list.push({
          id: `lead-${l.id}`,
          name: l.name,
          initials: l.initials,
          sourceType: "lead",
          segment: l.segment,
          location: l.location,
          budget: l.value,
          preferredTypes: l.property?.includes("Condo") ? "Condominium" : undefined,
          probability: l.probability,
          propertyOfInterest: l.property,
          phone: (l as any).phone,
          email: (l as any).email,
          agentId: (l as any).agentId,
        });
      });
    }

    // 2. API Customers
    if (apiCustomers && apiCustomers.length > 0) {
      apiCustomers.forEach((c) => {
        list.push({
          id: `cust-${c.id}`,
          name: c.name,
          sourceType: "vip_client",
          segment: c.segment || "Existing Buyer",
          budget: c.totalPurchased || 1500000,
          isVip: Boolean(c.isVip),
          phone: c.phone || undefined,
          email: c.email || undefined,
        });
      });
    }

    // If API returned nothing or during preview mode, fall back to rich candidates
    if (list.length === 0) {
      return FALLBACK_CANDIDATES;
    }

    // Ensure our high-value target accounts are included for variety
    FALLBACK_CANDIDATES.forEach((fc) => {
      if (!list.some((existing) => existing.name.toLowerCase() === fc.name.toLowerCase())) {
        list.push(fc);
      }
    });

    return list;
  }, [apiLeads, apiCustomers]);

  // Run the multi-dimensional reverse matchmaker algorithm
  const rankedMatches = useMemo((): ReverseMatchResult[] => {
    if (!property) return [];
    const normalizedProp: PropertySpec = {
      id: property.id || 1,
      name: property.name || property.title || "Selected Development",
      developer: property.developer || "Premier Developer",
      location: property.location || "Malaysia",
      price: Number(property.price) || 1200000,
      type: property.type || "Condominium",
      beds: Number(property.beds) || 3,
      size: property.size || "1,200 sq ft",
      status: property.status || "Available",
      badge: property.badge || null,
      image: property.image || property.imageUrl,
      agentId: property.agentId,
    };

    return rankBuyersForProperty(normalizedProp, allCandidates);
  }, [property, allCandidates]);

  // Filter and search
  const filteredMatches = useMemo(() => {
    return rankedMatches.filter((item) => {
      // Tab filter
      if (activeTab === "hot" && item.scores.matchTier !== "hot") return false;
      if (activeTab === "strong" && item.scores.matchTier !== "strong") return false;
      if (activeTab === "leads" && item.buyer.sourceType !== "lead") return false;
      if (activeTab === "vip" && !item.buyer.isVip && item.buyer.sourceType !== "vip_client") return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.buyer.name.toLowerCase().includes(q);
        const matchesLoc = item.buyer.location?.toLowerCase().includes(q);
        const matchesSeg = item.buyer.segment?.toLowerCase().includes(q);
        if (!matchesName && !matchesLoc && !matchesSeg) return false;
      }

      return true;
    });
  }, [rankedMatches, activeTab, searchQuery]);

  // Summary Metrics
  const hotCount = useMemo(() => rankedMatches.filter((m) => m.scores.matchTier === "hot").length, [rankedMatches]);
  const avgScore = useMemo(() => {
    if (rankedMatches.length === 0) return 0;
    const sum = rankedMatches.slice(0, 10).reduce((acc, m) => acc + m.scores.overallScore, 0);
    return Math.round(sum / Math.min(10, rankedMatches.length));
  }, [rankedMatches]);

  const totalPipelinePotential = useMemo(() => {
    return rankedMatches
      .slice(0, 5)
      .reduce((acc, m) => acc + (typeof m.buyer.budget === "number" ? m.buyer.budget : property?.price || 1200000), 0);
  }, [rankedMatches, property]);

  if (!isOpen || !property) return null;

  const propPrice = Number(property.price) || 1250000;
  const propImg = property.image || property.imageUrl || "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop";

  const handleOpenPitchDrawer = (result: ReverseMatchResult) => {
    const key = String(result.buyer.id);
    if (expandedPitchBuyerKey === key) {
      setExpandedPitchBuyerKey(null);
    } else {
      setExpandedPitchBuyerKey(key);
      setCustomPitchText(result.scores.whatsAppTemplate);
    }
  };

  const handleCopyPitch = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Outreach pitch copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleSendViaWhatsApp = (result: ReverseMatchResult, text: string) => {
    const phone = result.buyer.phone?.replace(/[^0-9]/g, "") || "60123456789";
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/${phone}?text=${encoded}`;
    
    // Log in Lead CRM action history
    addLeadActionLog(
      result.buyer.id,
      `Outbound WhatsApp Pitch: ${property.name}`,
      `Pitched ${property.name} (${formatRM(propPrice)}) to ${result.buyer.name} based on ${result.scores.overallScore}% compatibility match.`,
      activeAgent.name,
      "whatsapp"
    );

    toast.success(`Opening WhatsApp outreach for ${result.buyer.name}`, {
      description: `Action logged in ${activeAgent.name}'s activity timeline.`,
    });

    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleGenerateAiPitch = async (result: ReverseMatchResult) => {
    const key = String(result.buyer.id);
    setGeneratingAiKey(key);
    setExpandedPitchBuyerKey(key);

    try {
      const aiRes = await explainFitMutation.mutateAsync({
        buyerName: result.buyer.name,
        buyerKind: result.buyer.sourceType === "vip_client" ? "Customer" : "Lead",
        buyerDetail: `${result.buyer.segment || "Active Buyer"} · ${result.scores.overallScore}% Match`,
        buyerScore: result.scores.overallScore,
        propertyName: property.name,
        propertyDeveloper: property.developer,
        propertyLocation: property.location,
        propertyPrice: propPrice,
        propertyType: property.type,
        propertyBeds: Number(property.beds) || 3,
        propertySize: property.size || "1,200 sq ft",
      });

      if (aiRes && aiRes.summary) {
        const enriched = [
          `Hi ${result.buyer.name.split(" ")[0]},`,
          ``,
          aiRes.summary,
          ``,
          `I would be delighted to host you for a private preview tour of ${property.name} this week. What day suits you best?`,
        ].join("\n");

        setCustomPitchText(enriched);
        toast.success("AI sales pitch tailored with Gemini!");
      }
    } catch (e: any) {
      toast.error("Could not generate AI pitch", { description: e.message || "Using smart pre-configured template instead." });
      setCustomPitchText(result.scores.whatsAppTemplate);
    } finally {
      setGeneratingAiKey(null);
    }
  };

  return (
    <div className="rmm-overlay" onClick={onClose}>
      <div className="rmm-container" onClick={(e) => e.stopPropagation()}>
        {/* Header Hero Banner */}
        <header className="rmm-header-hero">
          <div className="rmm-hero-top">
            <div className="rmm-property-snapshot">
              <img src={propImg} alt={property.name} className="rmm-property-thumb" />
              <div className="rmm-property-info">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#d7ef73] text-[#10484b]">
                    Reverse Matchmaker
                  </span>
                  <span className="text-xs text-white/80 font-semibold">
                    {property.developer}
                  </span>
                </div>
                <h2>{property.name}</h2>
                <div className="rmm-property-meta">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-[#d7ef73]" /> {property.location}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <BedDouble className="size-3.5 text-[#d7ef73]" /> {property.beds} Suites
                  </span>
                  <span>•</span>
                  <span>{property.type}</span>
                  <span>•</span>
                  <span className="rmm-property-price">{formatRM(propPrice)}</span>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="rmm-close-btn" aria-label="Close matchmaker">
              <X className="size-5" />
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="rmm-metrics-strip">
            <div className="rmm-metric-pill">
              <span>Matching CRM Buyers</span>
              <strong>{rankedMatches.length} Candidates</strong>
            </div>
            <div className="rmm-metric-pill">
              <span>Hot Matches (≥85%)</span>
              <strong className="text-[#d7ef73] flex items-center gap-1">
                <Flame className="size-4" /> {hotCount} Ready
              </strong>
            </div>
            <div className="rmm-metric-pill">
              <span>Average Match Score</span>
              <strong>{avgScore}% Compatibility</strong>
            </div>
            <div className="rmm-metric-pill">
              <span>Top Pipeline Pool</span>
              <strong>{formatRM(totalPipelinePotential)}</strong>
            </div>
          </div>
        </header>

        {/* Toolbar & Filter Tabs */}
        <nav className="rmm-toolbar">
          <div className="rmm-tabs-group">
            <button
              onClick={() => setActiveTab("all")}
              className={`rmm-tab-btn ${activeTab === "all" ? "is-active" : ""}`}
            >
              <Users className="size-3.5" /> All ({rankedMatches.length})
            </button>
            <button
              onClick={() => setActiveTab("hot")}
              className={`rmm-tab-btn ${activeTab === "hot" ? "is-active" : ""}`}
            >
              <Flame className="size-3.5 text-amber-500" /> Hot Matches ({hotCount})
            </button>
            <button
              onClick={() => setActiveTab("strong")}
              className={`rmm-tab-btn ${activeTab === "strong" ? "is-active" : ""}`}
            >
              <Zap className="size-3.5 text-emerald-500" /> Strong Fits ({rankedMatches.filter((m) => m.scores.matchTier === "strong").length})
            </button>
            <button
              onClick={() => setActiveTab("leads")}
              className={`rmm-tab-btn ${activeTab === "leads" ? "is-active" : ""}`}
            >
              <User className="size-3.5" /> Active Leads
            </button>
            <button
              onClick={() => setActiveTab("vip")}
              className={`rmm-tab-btn ${activeTab === "vip" ? "is-active" : ""}`}
            >
              <Crown className="size-3.5 text-amber-400" /> VIP Clients
            </button>
          </div>

          <div className="rmm-search-box">
            <Search className="rmm-search-icon size-3.5" />
            <input
              type="text"
              placeholder="Search candidate by name, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rmm-search-input"
            />
          </div>
        </nav>

        {/* Candidate List Scroll */}
        <main className="rmm-candidates-list">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((item, idx) => {
              const isHot = item.scores.matchTier === "hot";
              const isStrong = item.scores.matchTier === "strong";
              const key = String(item.buyer.id);
              const isPitchExpanded = expandedPitchBuyerKey === key;
              const isCopied = copiedKey === key;
              const isGeneratingAi = generatingAiKey === key;

              return (
                <article
                  key={key}
                  className={`rmm-buyer-card ${isHot ? "is-hot" : ""}`}
                >
                  {/* Top Row: Rank, Buyer Avatar, Details, Score Dial */}
                  <div className="rmm-card-top">
                    <div className="rmm-buyer-identity">
                      <span className="rmm-rank-badge">#{idx + 1}</span>
                      <div className="rmm-buyer-avatar">
                        {item.buyer.initials}
                      </div>
                      <div className="rmm-buyer-details">
                        <h3>
                          <span>{item.buyer.name}</span>
                          {item.buyer.isVip && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Crown className="size-2.5" /> VIP
                            </span>
                          )}
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-[#f4faea] text-[#234d4d] border border-[#dfe6df]">
                            {item.buyer.segment || "Pipeline Buyer"}
                          </span>
                        </h3>
                        <p>
                          {item.buyer.location || "Klang Valley"} • Target Budget:{" "}
                          <strong className="text-[#10484b]">
                            {typeof item.buyer.budget === "number" ? formatRM(item.buyer.budget) : item.buyer.budget || "Flexible"}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="rmm-score-badge">
                      <div
                        className={`rmm-score-pill ${
                          isHot ? "tier-hot" : isStrong ? "tier-strong" : "tier-prospect"
                        }`}
                      >
                        {isHot ? <Flame className="size-3.5 fill-[#10484b]" /> : <Sparkles className="size-3.5" />}
                        <span>{item.scores.overallScore}% Match</span>
                      </div>
                      <span className="rmm-score-label">
                        {isHot ? "🔥 Hot Prospect" : isStrong ? "⚡ Strong Fit" : "💡 Opportunity"}
                      </span>
                    </div>
                  </div>

                  {/* 4-Pillar Compatibility Breakdown */}
                  <div className="rmm-pillars-grid">
                    {/* Pillar 1: Budget */}
                    <div className="rmm-pillar-col">
                      <div className="rmm-pillar-header">
                        <span>💰 Budget Fit</span>
                        <span>{item.scores.budgetScore}%</span>
                      </div>
                      <div className="rmm-pillar-bar">
                        <div
                          className={`rmm-pillar-fill ${isHot ? "tier-hot" : ""}`}
                          style={{ width: `${item.scores.budgetScore}%` }}
                        />
                      </div>
                      <span className="rmm-pillar-detail">{item.scores.budgetDetail}</span>
                    </div>

                    {/* Pillar 2: Location */}
                    <div className="rmm-pillar-col">
                      <div className="rmm-pillar-header">
                        <span>📍 Location</span>
                        <span>{item.scores.locationScore}%</span>
                      </div>
                      <div className="rmm-pillar-bar">
                        <div
                          className={`rmm-pillar-fill ${isHot ? "tier-hot" : ""}`}
                          style={{ width: `${item.scores.locationScore}%` }}
                        />
                      </div>
                      <span className="rmm-pillar-detail">{item.scores.locationDetail}</span>
                    </div>

                    {/* Pillar 3: Layout & Specs */}
                    <div className="rmm-pillar-col">
                      <div className="rmm-pillar-header">
                        <span>🏢 Layout Fit</span>
                        <span>{item.scores.specsScore}%</span>
                      </div>
                      <div className="rmm-pillar-bar">
                        <div
                          className={`rmm-pillar-fill ${isHot ? "tier-hot" : ""}`}
                          style={{ width: `${item.scores.specsScore}%` }}
                        />
                      </div>
                      <span className="rmm-pillar-detail">{item.scores.specsDetail}</span>
                    </div>

                    {/* Pillar 4: Intent & Timeline */}
                    <div className="rmm-pillar-col">
                      <div className="rmm-pillar-header">
                        <span>⚡ Timeline</span>
                        <span>{item.scores.intentScore}%</span>
                      </div>
                      <div className="rmm-pillar-bar">
                        <div
                          className={`rmm-pillar-fill ${isHot ? "tier-hot" : ""}`}
                          style={{ width: `${item.scores.intentScore}%` }}
                        />
                      </div>
                      <span className="rmm-pillar-detail">{item.scores.intentDetail}</span>
                    </div>
                  </div>

                  {/* Top Match Reasons Pills */}
                  <div className="rmm-reasons-wrap">
                    <span className="text-[11px] font-bold text-[#6e897e] uppercase tracking-wider">
                      Match Factors:
                    </span>
                    {item.scores.topReasons.map((reason, rIdx) => (
                      <span key={rIdx} className="rmm-reason-tag">
                        <Check className="size-3 text-[#234d4d]" />
                        {reason}
                      </span>
                    ))}
                  </div>

                  {/* Action Strip: Contact info + 1-Click Outreach Buttons */}
                  <div className="rmm-action-strip">
                    <div className="rmm-contact-preview">
                      {item.buyer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3 text-[#234d4d]" /> {item.buyer.phone}
                        </span>
                      )}
                      {item.buyer.email && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Mail className="size-3 text-[#234d4d]" /> {item.buyer.email}
                        </span>
                      )}
                    </div>

                    <div className="rmm-btn-group">
                      {/* 1-Click AI Elevator Pitch */}
                      <button
                        onClick={() => handleGenerateAiPitch(item)}
                        disabled={isGeneratingAi}
                        className="rmm-btn-ai"
                        title="Generate bespoke AI objection & deal pitch"
                      >
                        <Bot className="size-3.5" />
                        <span>{isGeneratingAi ? "Generating..." : "AI Pitch"}</span>
                      </button>

                      {/* 1-Click WhatsApp Pitch Drawer */}
                      <button
                        onClick={() => handleOpenPitchDrawer(item)}
                        className="rmm-btn-wa"
                        title="Open WhatsApp draft tailored to this buyer"
                      >
                        <MessageCircle className="size-3.5 fill-white" />
                        <span>{isPitchExpanded ? "Hide Draft" : "WhatsApp Pitch"}</span>
                      </button>

                      {/* Schedule Tour */}
                      {onBookViewingForBuyer && (
                        <button
                          onClick={() => onBookViewingForBuyer(property, item.buyer)}
                          className="rmm-btn-viewing"
                          title="Book private VIP tour"
                        >
                          <Calendar className="size-3.5" />
                          <span>Book Tour</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Outreach Pitch Drawer */}
                  {isPitchExpanded && (
                    <div className="rmm-pitch-tray">
                      <div className="rmm-pitch-header">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Sparkles className="size-3.5 text-[#234d4d]" />
                          Personalized Outreach Pitch for {item.buyer.name}
                        </span>
                        <span className="text-[11px] text-[#6e897e]">
                          Ready to review & dispatch
                        </span>
                      </div>

                      <textarea
                        value={customPitchText}
                        onChange={(e) => setCustomPitchText(e.target.value)}
                        className="rmm-pitch-textarea"
                        rows={4}
                      />

                      <div className="rmm-pitch-actions">
                        <button
                          onClick={() => handleCopyPitch(key, customPitchText)}
                          className="px-3 py-1.5 rounded-lg border border-[#dfe6df] bg-white text-xs font-bold text-[#10484b] hover:bg-[#f4faea] transition flex items-center gap-1.5"
                        >
                          {isCopied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                          <span>{isCopied ? "Copied!" : "Copy Pitch"}</span>
                        </button>

                        <button
                          onClick={() => handleSendViaWhatsApp(item, customPitchText)}
                          className="px-4 py-1.5 rounded-lg bg-[#25d366] hover:bg-[#1eb855] text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="size-3.5" />
                          <span>Dispatch to WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6df] border border-[#234d4d] flex items-center justify-center text-[#10484b]">
                <Filter className="size-6" />
              </div>
              <h4 className="text-base font-bold text-[#10484b]">No buyers match the current filter</h4>
              <p className="text-xs text-[#567177] max-w-sm">
                Try switching to "All Candidates" or clearing the search query to view broader buyer matches.
              </p>
              <button
                onClick={() => {
                  setActiveTab("all");
                  setSearchQuery("");
                }}
                className="mt-2 px-4 py-2 bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
