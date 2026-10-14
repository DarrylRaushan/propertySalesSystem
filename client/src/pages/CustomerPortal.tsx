import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Search,
  SlidersHorizontal,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Heart,
  Calendar,
  Sparkles,
  Phone,
  ShieldCheck,
  TrendingUp,
  Calculator,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  DollarSign,
  MessageSquare,
  MessagesSquare,
  CheckCircle2,
  Share2,
  Clock,
  ArrowRight,
  User,
  Briefcase,
  LogOut,
  Info,
  Layers,
  HelpCircle,
  BadgeCheck,
  Loader2,
  Plus,
  Trash2,
  Lock,
  History,
  X,
  CalendarPlus,
  Scale,
  Mic,
  Volume2,
  UserCheck,
} from "lucide-react";
import { useAuth, PROPERTY_AGENTS, CustomerUser } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import CustomerPropertyDetailModal from "@/components/CustomerPropertyDetailModal";
import CustomerViewingModal from "@/components/CustomerViewingModal";
import PropertyComparisonModal from "@/components/PropertyComparisonModal";
import PropertyAccordionGallery from "@/components/PropertyAccordionGallery";
import CustomerProfileTab from "@/components/CustomerProfileTab";
import InteractiveFinancialRoiCalculator from "@/components/InteractiveFinancialRoiCalculator";
import ConciergeVoiceMode from "@/components/ConciergeVoiceMode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { buildGoogleCalendarUrl } from "@/lib/calendarUtils";
import "@/components/CustomerPortal.css";
import "@/components/PropertyAccordionGallery.css";
import "@/components/PropertiesFeaturedGallery.css";
import "@/components/PropertiesBrowser.css";

/** Shape used throughout CustomerPortal — mapped from DB property row */
export type PortalProperty = {
  id: number;
  title: string;
  name: string;
  developer: string;
  location: string;
  price: number;
  type: string;
  beds: number;
  baths: number;
  size: string;
  status: string;
  badge?: string;
  yield: string;
  imageUrl?: string;
  description?: string;
  collection: string[];
  features?: string[];
};

/** Convert a raw DB property row into the PortalProperty shape */
function toPortalProperty(p: {
  id: number; title: string; developer: string; location: string;
  type: string; status: string; price: number; beds: number; baths: number;
  size: string; description?: string | null; features?: string | null;
  imageUrl?: string | null; badge?: string | null; rentalYield?: string | null;
  collection?: string | null;
}): PortalProperty {
  let collectionArr: string[] = [];
  try { if (p.collection) collectionArr = JSON.parse(p.collection); } catch {}
  let featuresArr: string[] = [];
  try { if (p.features) featuresArr = JSON.parse(p.features); } catch {}
  return {
    id: p.id,
    title: p.title,
    name: p.title,
    developer: p.developer,
    location: p.location,
    price: p.price,
    type: p.type,
    beds: p.beds,
    baths: p.baths,
    size: p.size,
    status: p.status,
    badge: p.badge ?? undefined,
    yield: p.rentalYield ?? "5.0%",
    imageUrl: p.imageUrl ?? undefined,
    description: p.description ?? undefined,
    collection: collectionArr,
    features: featuresArr,
  };
}

type CustomerTab = "explore" | "shortlist" | "viewings" | "financing" | "concierge" | "profile";

export default function CustomerPortal() {
  // ── Live property data from DB ──────────────────────────────────────────
  const { data: rawProperties, isLoading: propertiesLoading } = trpc.properties.list.useQuery({ activeOnly: true });
  const CUSTOMER_PROPERTIES: PortalProperty[] = useMemo(
    () => (rawProperties ?? []).map(toPortalProperty),
    [rawProperties]
  );

  const {
    role,
    isGuest,
    isCustomer,
    activeCustomer,
    activeAgent,
    availableAgents,
    logout,
    openAuthModal,
    requireAuth,
    savedPropertyIds,
    toggleSaveProperty,
    isPropertySaved,
    bookedViewings,
    cancelViewing,
    dismissViewing,
    quickLogin,
  } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<CustomerTab>("explore");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [selectedBedrooms, setSelectedBedrooms] = useState("all");
  const [activeCollection, setActiveCollection] = useState("all");

  // Accordion state for Featured For You section
  const [accordionActiveIndex, setAccordionActiveIndex] = useState(0);

  // Modals & Tracker States
  const [detailModalProperty, setDetailModalProperty] = useState<any | null>(null);
  const [viewingModalProperty, setViewingModalProperty] = useState<any | null>(null);
  const [reschedulingViewing, setReschedulingViewing] = useState<any | null>(null);
  const [historyViewing, setHistoryViewing] = useState<any | null>(null);
  const [trackerFilter, setTrackerFilter] = useState<"active" | "cancelled">("active");

  // Comparison Modal States
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<number[]>([]);

  const toggleComparisonSelection = (propId: number) => {
    setSelectedComparisonIds((prev) => {
      if (prev.includes(propId)) {
        return prev.filter((id) => id !== propId);
      }
      if (prev.length >= 3) {
        toast.info("Maximum 3 properties can be compared simultaneously.");
        return prev;
      }
      return [...prev, propId];
    });
  };

  // Mortgage Calculator State
  const [calcPrice, setCalcPrice] = useState<number>(2500000);
  const [calcDownpaymentPercent, setCalcDownpaymentPercent] = useState<number>(10);
  const [calcTenureYears, setCalcTenureYears] = useState<number>(30);
  const [calcInterestRate, setCalcInterestRate] = useState<number>(4.2);

  // AI Concierge Multi-Conversation State
  interface ConciergeConvo {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: Array<{ role: "user" | "assistant"; text: string }>;
  }

  const CONCIERGE_STORAGE_KEY = activeCustomer
    ? `customer_concierge_convos_${activeCustomer.id}`
    : null;
  const CONCIERGE_ACTIVE_KEY = activeCustomer
    ? `customer_concierge_active_${activeCustomer.id}`
    : null;

  const defaultWelcomeMsg = {
    role: "assistant" as const,
    text: `Good day${activeCustomer ? `, ${activeCustomer.name.split(" ")[0]}` : ""}! I am your Personal Butler & Property Concierge. Ask me anything about our luxury property listings, rental yield projections, foreign buyer guidelines (MM2H/EPU), mortgage calculations, or prime locations in Malaysia.`,
  };

  function createConciergeConvo(): ConciergeConvo {
    return {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      title: "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [defaultWelcomeMsg],
    };
  }

  function loadConciergeConvos(): ConciergeConvo[] {
    if (!CONCIERGE_STORAGE_KEY) return [createConciergeConvo()];
    try {
      const raw = sessionStorage.getItem(CONCIERGE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [createConciergeConvo()];
  }

  const [conciergeConvos, setConciergeConvos] = useState<ConciergeConvo[]>(() =>
    loadConciergeConvos()
  );
  const [activeConciergeId, setActiveConciergeId] = useState<string>(() => {
    if (!CONCIERGE_ACTIVE_KEY) return conciergeConvos[0]?.id ?? "";
    try {
      return sessionStorage.getItem(CONCIERGE_ACTIVE_KEY) ?? conciergeConvos[0]?.id ?? "";
    } catch {
      return conciergeConvos[0]?.id ?? "";
    }
  });
  const [showConciergeList, setShowConciergeList] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [conciergeMode, setConciergeMode] = useState<"chat" | "voice">("chat");

  const activeConciergeConvo =
    conciergeConvos.find((c) => c.id === activeConciergeId) ?? conciergeConvos[0];
  const chatMessages = activeConciergeConvo?.messages ?? [defaultWelcomeMsg];

  // Persist concierge conversations
  React.useEffect(() => {
    if (!CONCIERGE_STORAGE_KEY) return;
    try {
      sessionStorage.setItem(CONCIERGE_STORAGE_KEY, JSON.stringify(conciergeConvos));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conciergeConvos]);

  React.useEffect(() => {
    if (!CONCIERGE_ACTIVE_KEY) return;
    try {
      sessionStorage.setItem(CONCIERGE_ACTIVE_KEY, activeConciergeId);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConciergeId]);

  function appendConciergeMsg(convoId: string, msg: { role: "user" | "assistant"; text: string }) {
    setConciergeConvos((prev) =>
      prev.map((c) => {
        if (c.id !== convoId) return c;
        const newMsgs = [...c.messages, msg];
        const firstUser = newMsgs.find((m) => m.role === "user");
        return {
          ...c,
          messages: newMsgs,
          title: firstUser
            ? firstUser.text.slice(0, 48) + (firstUser.text.length > 48 ? "\u2026" : "")
            : c.title,
          updatedAt: Date.now(),
        };
      })
    );
  }

  function handleNewConciergeConvo() {
    const fresh = createConciergeConvo();
    setConciergeConvos((prev) => [fresh, ...prev]);
    setActiveConciergeId(fresh.id);
    setShowConciergeList(false);
    setInputMessage("");
  }

  function handleDeleteConciergeConvo(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConciergeConvos((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (updated.length === 0) {
        const fresh = createConciergeConvo();
        setActiveConciergeId(fresh.id);
        return [fresh];
      }
      if (id === activeConciergeId) setActiveConciergeId(updated[0].id);
      return updated;
    });
  }

  // ─── Cross-Reference Recommendations for Authenticated Customer ──────────────
  const tailoredRecommendations = useMemo(() => {
    if (!activeCustomer || !CUSTOMER_PROPERTIES.length) return [];

    return CUSTOMER_PROPERTIES.map((prop) => {
      let score = 52; // baseline
      const reasons: string[] = [];

      // 1. Check Location preference
      const prefLocs = (activeCustomer.preferredLocation || "").toLowerCase();
      const propLoc = prop.location.toLowerCase();
      const locTokens = prefLocs.split(/[,&]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      const hasLocMatch = locTokens.some((tok) => propLoc.includes(tok) || (tok === "klcc" && propLoc.includes("city")));
      if (
        hasLocMatch ||
        (prefLocs.includes("klcc") && (propLoc.includes("klcc") || propLoc.includes("city") || propLoc.includes("bintang"))) ||
        (prefLocs.includes("damansara") && propLoc.includes("damansara")) ||
        (prefLocs.includes("mont kiara") && propLoc.includes("mont kiara")) ||
        (prefLocs.includes("bangsar") && propLoc.includes("bangsar")) ||
        (prefLocs.includes("johor") && (propLoc.includes("johor") || propLoc.includes("iskandar"))) ||
        (prefLocs.includes("shah alam") && propLoc.includes("shah alam"))
      ) {
        score += 22;
        reasons.push("Prime Location Match");
      }

      // 2. Check Target Budget range
      const budgetParts = (activeCustomer.budget || "").replace(/[^0-9-]/g, "").split("-").map(Number);
      if (budgetParts.length === 2 && !isNaN(budgetParts[0]) && !isNaN(budgetParts[1])) {
        const [minB, maxB] = budgetParts;
        if (prop.price >= minB && prop.price <= maxB) {
          score += 16;
          reasons.push("Fits Target Budget");
        } else if (prop.price >= minB * 0.85 && prop.price <= maxB * 1.15) {
          score += 8;
        }
      }

      // 3. Check Property Types preference
      const prefTypes = (activeCustomer.preferredTypes || "").toLowerCase();
      if (prefTypes) {
        const typeTokens = prefTypes.split(",").map((s) => s.trim()).filter(Boolean);
        if (typeTokens.some((t) => prop.type.toLowerCase().includes(t))) {
          score += 10;
          reasons.push(`${prop.type} Match`);
        }
      }

      // 4. Check Minimum Bedrooms
      const minBeds = activeCustomer.minBeds ?? 0;
      if (minBeds > 0) {
        if (prop.beds >= minBeds) {
          score += 8;
        } else {
          score -= 6;
        }
      }

      // 5. Check Strategic Investment Goal / Segment
      const goal = (activeCustomer.investmentGoal || "").toLowerCase();
      const segment = (activeCustomer.segment || "").toLowerCase();
      const propYield = parseFloat(prop.yield || "0");

      if (goal.includes("yield") || segment.includes("investor")) {
        if (propYield >= 5.8) {
          score += 14;
          reasons.push(`High Yield (${prop.yield})`);
        } else if (propYield >= 5.0) {
          score += 8;
        }
      } else if (goal.includes("family") || segment.includes("homebuyer") || segment.includes("estate")) {
        if (prop.type.includes("Landed") || prop.beds >= 3) {
          score += 14;
          reasons.push("Family Living Layout");
        }
      } else if (goal.includes("capital") || segment.includes("expat") || segment.includes("vip")) {
        if (prop.type.includes("Penthouse") || prop.price >= 3000000 || prop.badge) {
          score += 14;
          reasons.push("VIP Luxury Tier");
        }
      }

      // 6. Check Preferred Features
      const prefFeatures = (activeCustomer.preferredFeatures || "").toLowerCase();
      if (prefFeatures) {
        const featTokens = prefFeatures.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        const propFeatStr = (prop.features || []).join(" ").toLowerCase();
        const featMatches = featTokens.filter((ft) => propFeatStr.includes(ft.split(" ")[0]));
        if (featMatches.length > 0) {
          score += Math.min(8, featMatches.length * 2);
        }
      }

      const matchPercent = Math.min(99, Math.max(55, Math.round(score)));
      const matchReason = reasons.length > 0 ? reasons.slice(0, 3).join(" • ") : "Curated for your profile";

      return {
        ...prop,
        name: prop.title,
        image: prop.imageUrl,
        modelUrl: "",
        matchPercent,
        matchReason,
      };
    })
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, 5);
  }, [activeCustomer, CUSTOMER_PROPERTIES]);

  const currentTailoredProp = tailoredRecommendations[accordionActiveIndex] || tailoredRecommendations[0];

  // Filter properties
  const filteredProperties = useMemo(() => {
    return CUSTOMER_PROPERTIES.filter((p) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.developer.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Location
      if (selectedLocation !== "all") {
        if (!p.location.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // Type
      if (selectedType !== "all") {
        if (p.type !== selectedType) return false;
      }

      // Bedrooms
      if (selectedBedrooms !== "all") {
        const minBeds = parseInt(selectedBedrooms);
        if (p.beds < minBeds) return false;
      }

      // Price Range
      if (selectedPriceRange !== "all") {
        if (selectedPriceRange === "under-1m" && p.price >= 1000000) return false;
        if (selectedPriceRange === "1m-2.5m" && (p.price < 1000000 || p.price > 2500000)) return false;
        if (selectedPriceRange === "2.5m-4m" && (p.price < 2500000 || p.price > 4000000)) return false;
        if (selectedPriceRange === "above-4m" && p.price <= 4000000) return false;
      }

      // Curated collection filter
      if (activeCollection !== "all") {
        if (!p.collection?.includes(activeCollection)) return false;
      }

      return true;
    });
  }, [
    searchQuery,
    selectedLocation,
    selectedType,
    selectedPriceRange,
    selectedBedrooms,
    activeCollection,
  ]);

  // Shortlisted properties list
  const shortlistedProperties = useMemo(() => {
    return CUSTOMER_PROPERTIES.filter((p) => savedPropertyIds.includes(p.id));
  }, [savedPropertyIds]);

  // Target properties for the comparison matrix
  const comparisonTargetProperties = useMemo(() => {
    if (selectedComparisonIds.length >= 2) {
      return CUSTOMER_PROPERTIES.filter((p) => selectedComparisonIds.includes(p.id));
    }
    if (shortlistedProperties.length >= 2) {
      return shortlistedProperties.slice(0, 3);
    }
    if (shortlistedProperties.length === 1 && CUSTOMER_PROPERTIES.length > 1) {
      const second = CUSTOMER_PROPERTIES.find((p) => p.id !== shortlistedProperties[0].id);
      return second ? [shortlistedProperties[0], second] : [shortlistedProperties[0]];
    }
    return CUSTOMER_PROPERTIES.slice(0, 2);
  }, [selectedComparisonIds, shortlistedProperties]);

  // Handle actions
  const handleSaveToggle = (e: React.MouseEvent, propId: number) => {
    e.stopPropagation();
    if (isGuest) {
      requireAuth("Sign in to add this luxury property to your private shortlist.");
      return;
    }
    const isSaved = isPropertySaved(propId);
    toggleSaveProperty(propId);
    toast.success(isSaved ? "Removed from Shortlist" : "Saved to your Shortlist!");
  };

  const handleBookViewingClick = (property: any) => {
    if (isGuest) {
      requireAuth("Sign in to book a VIP viewing with our senior property specialist.", () => {
        setViewingModalProperty(property);
      });
      return;
    }
    setViewingModalProperty(property);
  };

  const handleMortgageTransfer = (price: number) => {
    setCalcPrice(price);
    setActiveTab("financing");
    toast.success(`Mortgage calculator pre-filled for RM ${price.toLocaleString()}`);
  };

  // Customer Portal AI Chat Mutation & Guest Limits
  const GUEST_QUERY_LIMIT = 3;
  const guestQueryCount = isGuest
    ? chatMessages.filter((m) => m.role === "user").length
    : 0;
  const isGuestLimitReached = isGuest && guestQueryCount >= GUEST_QUERY_LIMIT;
  const guestQueriesRemaining = Math.max(0, GUEST_QUERY_LIMIT - guestQueryCount);

  const [isAiThinking, setIsAiThinking] = useState(false);
  const aiChatMutation = trpc.ai.chat.useMutation({
    onSuccess: ({ content }) => {
      // Strip system error prefixes if any for clean buyer presentation
      const cleanContent = content.replace(/^> ⚠️ \*\*Notice\*\*:[\s\S]*?\n\n/, "");
      appendConciergeMsg(activeConciergeId, { role: "assistant", text: cleanContent });
      setIsAiThinking(false);
    },
    onError: () => {
      // Intelligent fallback answer if mutation fails
      setIsAiThinking(false);
    },
  });

  const sendConciergeMessage = (userText: string) => {
    if (!userText.trim() || isAiThinking) return;

    if (isGuestLimitReached) {
      openAuthModal("You have used your 3 free guest questions. Sign in to unlock unlimited AI inquiries and save your conversations!");
      return;
    }

    const trimmed = userText.trim();
    const convoId = activeConciergeId;
    appendConciergeMsg(convoId, { role: "user", text: trimmed });
    setIsAiThinking(true);

    const currentConvo = conciergeConvos.find((c) => c.id === convoId);
    const existingMessages = currentConvo ? currentConvo.messages : [];
    const allMessages = [
      ...existingMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      })),
      { role: "user" as const, content: trimmed },
    ];

    aiChatMutation.mutate(
      { messages: allMessages, mode: "customer" },
      {
        onError: () => {
          // Local AI fallback responses
          let botReply = "";
          const lower = trimmed.toLowerCase();

          if (lower.includes("foreign") || lower.includes("mm2h") || lower.includes("epu") || lower.includes("expat")) {
            botReply = `**Malaysian Foreign Purchaser Guidelines (2024–2025):**\n\n- **Kuala Lumpur (Strata Residences)**: Minimum purchase price of **RM 1,000,000**.\n- **Selangor (Landed / Strata)**: Minimum threshold of **RM 2,000,000**.\n- **State Consent (EPU)**: Foreign buyers require State Authority Consent. Consent fee in KL is approx. RM 1,000–RM 2,000; in Selangor it is 2% of the purchase price.\n- **MM2H Visa Holders**: Eligible for preferential financing margins (up to 70%–80%).`;
          } else if (lower.includes("yield") || lower.includes("roi") || lower.includes("return") || lower.includes("rent")) {
            botReply = `**Top Rental Yields in Our Inventory:**\n\n1. **The Conlay KLCC** — Estimated **6.4% gross yield** (strong expat & multinational corporate tenant demand).\n2. **Pavilion Damansara Heights** — Estimated **5.8% gross yield** (integrated lifestyle mall & MRT access).\n3. **8 Conlay (Kempinski)** — Estimated **5.5% gross yield** (serviced branded residence).\n\n*Tip: High-floor 1-to-2 bedroom layouts in transit-oriented developments generate the highest gross rental yields.*`;
          } else if (lower.includes("loan") || lower.includes("mortgage") || lower.includes("rate") || lower.includes("dsr") || lower.includes("repayment")) {
            botReply = `**Malaysian Mortgage & Financing Overview:**\n\n- **Current Base Rates**: Commercial bank housing loan rates range from **4.10% to 4.35% p.a.**\n- **Margin of Financing (LTV)**: Up to **90%** for 1st and 2nd residential properties (Malaysians), **70%** for 3rd property onward.\n- **Debt Service Ratio (DSR)**: Banks generally accept monthly total debt obligations up to **60%–70%** of net monthly income.\n- Check out our **Mortgage & Affordability Vault** tab to calculate exact monthly repayments and MOT stamp duty tiers!`;
          } else if (lower.includes("klcc") || lower.includes("location") || lower.includes("damansara") || lower.includes("mont kiara") || lower.includes("bangsar")) {
            botReply = `**Prime Malaysian Neighborhood Insights:**\n\n- **KLCC**: The financial & diplomatic core. Premium high-rise luxury, walking distance to Petronas Twin Towers, MRT Putrajaya Line, and world-class retail.\n- **Damansara Heights**: Established high-net-worth enclave known as the "Beverly Hills of KL". Superb capital appreciation and leafy tranquility.\n- **Mont Kiara**: Top choice for international expat families, surrounded by Garden International School, Mont Kiara International School, and retail dining hubs.\n- **Bangsar**: Chic urban living with vibrant cafes, luxury low-density condominiums, and rapid access to KL Sentral transportation hub.`;
          } else {
            botReply = `I am analyzing your inquiry regarding **"${trimmed}"** against our live property listings, market transaction benchmarks, and Malaysian real estate regulations.\n\nFeel free to ask me for:\n- Specific property pricing, floor sizes, and bedroom configurations\n- Rental yield calculations and capital appreciation projections\n- Legal fees and tiered MOT Stamp Duty estimates\n- Comparison between any active residences in our marketplace`;
          }

          appendConciergeMsg(convoId, { role: "assistant", text: botReply });
          setIsAiThinking(false);
        },
      }
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isAiThinking) return;
    const userText = inputMessage.trim();
    setInputMessage("");
    sendConciergeMessage(userText);
  };

  return (
    <div className="customer-portal-root">
      {/* ─── Top Unified Analytics-Style Header ─── */}
      <header className="analytics-workspace-header">
        <div className="analytics-header-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Row 1: Title & Controls */}
          <div className="analytics-workspace-header-inner">
            <div className="analytics-workspace-title">
              <div className="analytics-back shrink-0">
                <Building2 className="size-4 text-[#10484b]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="analytics-eyebrow">Signature Living</span>
                  <span className="text-[10px] font-bold text-[#356f54] bg-[#e4f2df] px-2 py-0.5 rounded-full border border-[#cbe5c4]">
                    {isCustomer ? `${activeCustomer?.segment || "VIP Member"}` : "Guest Edition"}
                  </span>
                </div>
                <h1 className="analytics-main-title">
                  Properly Luxury <em>· Marketplace</em>
                </h1>
              </div>
            </div>

            {/* Right Group: Auth & Switcher Actions */}
            <div className="flex items-center gap-2">
                {isGuest ? (
                  <>
                    <button
                      onClick={() => openAuthModal("Sign in to unlock your private shortlist and VIP viewings.")}
                      className="px-3.5 py-1.5 bg-[#10484b] hover:bg-[#234d4d] text-[#d7ef73] rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 border border-[#234d4d]"
                    >
                      <User size={13} />
                      Sign In
                    </button>
                    <button
                      onClick={() => quickLogin("agent", "hannah")}
                      className="px-2.5 py-1.5 bg-[#fbfff9] border border-[#234d4d] text-[#10484b] hover:bg-[#eaf6df] rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      title="Switch to Property Agent Workspace"
                    >
                      <Briefcase size={13} />
                      <span className="hidden sm:inline">Agent Suite</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab("profile")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-xl shadow-sm transition text-left cursor-pointer border group",
                        activeTab === "profile"
                          ? "bg-[#234d4d] text-white border-[#234d4d] ring-2 ring-[#d7ef73]"
                          : "bg-[#fbfff9] hover:bg-[#f4faea] border-[#234d4d] text-[#10484b]"
                      )}
                      title="Click to view & edit Profile and AI Preferences"
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center transition group-hover:scale-105",
                          activeTab === "profile"
                            ? "bg-[#d7ef73] text-[#10484b]"
                            : "bg-[#234d4d] text-[#d7ef73]"
                        )}
                      >
                        {activeCustomer?.avatarInitials || "ST"}
                      </div>
                      <div className="text-left hidden sm:block">
                        <p
                          className={cn(
                            "text-xs font-bold leading-tight",
                            activeTab === "profile" ? "text-white" : "text-[#10484b]"
                          )}
                        >
                          {activeCustomer?.name}
                        </p>
                        <p
                          className={cn(
                            "text-[9px] font-semibold",
                            activeTab === "profile" ? "text-[#d7ef73]" : "text-[#4a9070]"
                          )}
                        >
                          {activeCustomer?.segment}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => quickLogin("agent", "hannah")}
                      className="px-2.5 py-1.5 bg-[#fbfff9] border border-[#234d4d] text-[#10484b] hover:bg-[#eaf6df] rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      title="Switch to Agent Workspace"
                    >
                      <Briefcase size={13} />
                      <span className="hidden sm:inline">Agent Suite</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        toast.success("Signed out to Guest Mode");
                      }}
                      className="p-1.5 text-[#567177] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
                      title="Sign Out"
                    >
                      <LogOut size={16} />
                    </button>
                  </>
                )}
              </div>
          </div>

          {/* Row 2: Segmented Navigation Tab Bar */}
          <div className="analytics-tabs-container">
            <div className="analytics-tabs-nav">
              <button
                onClick={() => setActiveTab("explore")}
                className={cn("analytics-tab-btn", activeTab === "explore" && "is-active")}
              >
                <Building2 className="size-3.5 shrink-0" />
                <span>Explore Residences</span>
                <span className={cn("analytics-tab-badge", activeTab === "explore" ? "bg-[#d7ef73] text-[#10484b]" : "bg-[#e8f2e6] text-[#3b6b55]")}>
                  {CUSTOMER_PROPERTIES.length}
                </span>
              </button>

              <button
                onClick={() => {
                  if (isGuest) {
                    requireAuth("Sign in to view your private shortlist.");
                    return;
                  }
                  setActiveTab("shortlist");
                }}
                className={cn("analytics-tab-btn", activeTab === "shortlist" && "is-active")}
              >
                <Heart className="size-3.5 shrink-0" />
                <span>My Shortlist</span>
                {savedPropertyIds.length > 0 && (
                  <span className={cn("analytics-tab-badge", activeTab === "shortlist" ? "bg-[#d7ef73] text-[#10484b]" : "bg-rose-100 text-rose-700")}>
                    {savedPropertyIds.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  if (isGuest) {
                    requireAuth("Sign in to track your booked private tours.");
                    return;
                  }
                  setActiveTab("viewings");
                }}
                className={cn("analytics-tab-btn", activeTab === "viewings" && "is-active")}
              >
                <Calendar className="size-3.5 shrink-0" />
                <span>Tour Tracker</span>
                {bookedViewings.filter((v) => v.status !== "Cancelled").length > 0 && (
                  <span className={cn("analytics-tab-badge", activeTab === "viewings" ? "bg-[#d7ef73] text-[#10484b]" : "bg-[#e8f2e6] text-[#3b6b55]")}>
                    {bookedViewings.filter((v) => v.status !== "Cancelled").length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("financing")}
                className={cn("analytics-tab-btn", activeTab === "financing" && "is-active")}
              >
                <Calculator className="size-3.5 shrink-0" />
                <span>Mortgage & Affordability Vault</span>
              </button>

              <button
                onClick={() => setActiveTab("concierge")}
                className={cn("analytics-tab-btn", activeTab === "concierge" && "is-active")}
              >
                <Sparkles className="size-3.5 shrink-0" />
                <span>AI Concierge</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Tab Content ────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ========================================================================= */}
        {/* TAB 1: EXPLORE RESIDENCES & MARKETPLACE                                     */}
        {/* ========================================================================= */}
        {activeTab === "explore" && (
          <div className="space-y-8">
            {/* Terrain Hero Banner */}
            <div className="customer-terrain-hero">
              <div className="max-w-2xl space-y-3 relative z-10">
                <div className="customer-hero-eyebrow">
                  <Sparkles size={14} />
                  Curated Malaysian Real Estate Portfolio
                </div>
                <h1 className="customer-portal-serif text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.05] text-white">
                  Signature Residences & Penthouses <em className="text-[#d7ef73] not-italic">in Prime KL</em>
                </h1>
                <p className="text-sm text-[#e4ece2] leading-relaxed max-w-xl">
                  Hand-picked architectural landmarks across Damansara Heights, KLCC, Mont Kiara, and Bangsar. Verified unit plans, yield analytics, and private one-on-one viewings.
                </p>
              </div>

              {/* Terrain Search & Filter Bar */}
              <div className="relative z-10 p-3 bg-[#fbfff9] rounded-2xl shadow-xl border-[1.5px] border-[#234d4d] text-[#10484b] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {/* Search Text */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567177]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search residence or developer..."
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                  />
                </div>

                {/* Location Filter */}
                <div>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                  >
                    <option value="all">All Prime Locations</option>
                    <option value="Damansara Heights">Damansara Heights</option>
                    <option value="KLCC">KLCC & City Centre</option>
                    <option value="Shah Alam">Shah Alam / Selangor</option>
                    <option value="Bukit Bintang">Bukit Bintang</option>
                    <option value="Johor">Iskandar Puteri, Johor</option>
                  </select>
                </div>

                {/* Property Type */}
                <div>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                  >
                    <option value="all">All Property Types</option>
                    <option value="Condominium">Condominium</option>
                    <option value="Serviced residence">Serviced Residence</option>
                    <option value="Penthouse">Super Penthouse</option>
                    <option value="Landed terrace">Landed Estate</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <select
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                  >
                    <option value="all">Any Price Budget</option>
                    <option value="under-1m">Under RM 1,000,000</option>
                    <option value="1m-2.5m">RM 1.0M - RM 2.5M</option>
                    <option value="2.5m-4m">RM 2.5M - RM 4.0M</option>
                    <option value="above-4m">Above RM 4,000,000</option>
                  </select>
                </div>

                {/* Bedrooms */}
                <div>
                  <select
                    value={selectedBedrooms}
                    onChange={(e) => setSelectedBedrooms(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                  >
                    <option value="all">Any Bedrooms</option>
                    <option value="2">2+ Bedrooms</option>
                    <option value="3">3+ Bedrooms</option>
                    <option value="4">4+ Bedrooms</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ─── FEATURED FOR YOU: AI Customer Match (Logged-In Customers Only) ─── */}
            {isCustomer && activeCustomer && tailoredRecommendations.length > 0 && (
              <section className="properties-featured properties-featured--gallery terrain-card">
                <div className="properties-featured-gallery-heading flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#234d4d] font-extrabold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#234d4d]" />
                        Featured For You • {activeCustomer.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#d7ef73] text-[#153941] border border-[#234d4d]">
                        {activeCustomer.segment}
                      </span>
                    </div>
                    <p className="text-xs text-[#567177] font-medium mt-0.5">
                      <b>{tailoredRecommendations.length}</b> matches cross-referenced with your target budget ({activeCustomer.budget}) & location ({activeCustomer.preferredLocation})
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="self-start sm:self-auto px-3 py-1.5 bg-[#fbfff9] hover:bg-[#eaf6df] border border-[#234d4d] text-[#10484b] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Customize your matching criteria"
                  >
                    <SlidersHorizontal size={13} className="text-[#234d4d]" />
                    <span>Tune Preferences</span>
                  </button>
                </div>

                <PropertyAccordionGallery
                  items={tailoredRecommendations as any}
                  activeIndex={accordionActiveIndex}
                  onChange={setAccordionActiveIndex}
                  onOpen={(prop) => setDetailModalProperty(prop)}
                />

                <aside className="properties-featured-panel bg-[#f4faea] p-4 rounded-2xl border border-[#dfe6df]">
                  <div className="flex items-center justify-between">
                    <span className="badge-lime">
                      {currentTailoredProp?.matchPercent}% AI Fit Match
                    </span>
                    <span className="text-[10px] text-[#6e897e] font-bold uppercase">{currentTailoredProp?.status}</span>
                  </div>
                  <p className="text-xs text-[#6e897e] font-semibold mt-2">{currentTailoredProp?.developer}</p>
                  <h3 className="customer-portal-serif text-xl font-normal text-[#10484b] mt-0.5">{currentTailoredProp?.name}</h3>
                  <div className="text-xs text-[#567177] flex items-center gap-1 mt-1 font-medium">
                    <MapPin size={13} className="text-[#234d4d]" /> {currentTailoredProp?.location}
                  </div>
                  <strong className="customer-portal-serif text-lg font-black text-[#10484b] mt-2 block">
                    {currentTailoredProp ? `RM ${currentTailoredProp.price.toLocaleString()}` : ""}
                  </strong>
                  <small className="text-xs text-[#6e897e] font-medium block mt-0.5">
                    {currentTailoredProp?.beds} bedrooms · {currentTailoredProp?.size}
                  </small>
                  <div className="properties-featured-cues mt-2 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#fbfff9] border border-[#234d4d] text-[10.5px] font-bold text-[#10484b] flex items-center gap-1">
                      <BadgeCheck size={12} className="text-[#234d4d]" /> 3D-Ready
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#fbfff9] border border-[#234d4d] text-[10.5px] font-bold text-[#234d4d] flex items-center gap-1">
                      <Sparkles size={12} /> {currentTailoredProp?.matchReason}
                    </span>
                  </div>
                  <button
                    onClick={() => currentTailoredProp && setDetailModalProperty(currentTailoredProp)}
                    className="w-full mt-3 py-2 px-3 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm border border-[#234d4d]"
                  >
                    Open Dossier <ChevronRight size={15} />
                  </button>
                </aside>
              </section>
            )}

            {/* Curated Collection Filter Pills matching Terrain theme */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#234d4d] mr-2 shrink-0">
                Curated:
              </span>
              <button
                onClick={() => setActiveCollection("all")}
                className={`terrain-pill ${activeCollection === "all" ? "active" : ""}`}
              >
                All Residences ({CUSTOMER_PROPERTIES.length})
              </button>
              <button
                onClick={() => setActiveCollection("penthouses")}
                className={`terrain-pill ${activeCollection === "penthouses" ? "active" : ""}`}
              >
                Penthouses & Sky Suites
              </button>
              <button
                onClick={() => setActiveCollection("transit")}
                className={`terrain-pill ${activeCollection === "transit" ? "active" : ""}`}
              >
                Transit-Oriented (MRT Direct)
              </button>
              <button
                onClick={() => setActiveCollection("yield")}
                className={`terrain-pill ${activeCollection === "yield" ? "active" : ""}`}
              >
                High Rental Yield ({">"}5.5%)
              </button>
              <button
                onClick={() => setActiveCollection("ready")}
                className={`terrain-pill ${activeCollection === "ready" ? "active" : ""}`}
              >
                Ready to Move In
              </button>
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#567177] font-semibold">
                Showing <span className="font-bold text-[#10484b]">{filteredProperties.length}</span> curated residences
              </p>
              {isGuest && (
                <div className="flex items-center gap-2 text-xs text-[#285c59] bg-[#eaf6df] px-3 py-1 rounded-full border border-[#234d4d]">
                  <Info size={13} className="text-[#10484b]" />
                  <span>Browsing as Guest. Sign in anytime to unlock personalized AI matches, save properties, or book tours.</span>
                </div>
              )}
            </div>

            {/* Properties Grid with Terrain Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((prop) => {
                const isSaved = isPropertySaved(prop.id);
                const estMonthly = Math.round((prop.price * 0.9 * 0.042) / 12 + (prop.price * 0.9) / 360);

                return (
                  <div
                    key={prop.id}
                    onClick={() => setDetailModalProperty(prop)}
                    className="terrain-card flex flex-col cursor-pointer group"
                  >
                    {/* Photo Container */}
                    <div className="property-image-container aspect-[16/10] bg-[#edf2ea]">
                      <img
                        src={prop.imageUrl}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="badge-pine">
                          {prop.badge || prop.type}
                        </span>

                        {/* Save to Shortlist Heart */}
                        <button
                          onClick={(e) => handleSaveToggle(e, prop.id)}
                          className={`p-2 rounded-full backdrop-blur-md transition-all shadow-md ${
                            isSaved
                              ? "bg-rose-500 text-white"
                              : "bg-[#fbfff9]/90 text-[#10484b] hover:bg-white hover:text-rose-500"
                          }`}
                          title={isSaved ? "Saved" : "Save to Shortlist"}
                        >
                          <Heart size={16} className={isSaved ? "fill-white" : ""} />
                        </button>
                      </div>

                      {/* Yield Tag */}
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-[#153941]/90 backdrop-blur text-[#d7ef73] text-[11px] font-bold border border-[#d7ef73]/30 flex items-center gap-1">
                        <TrendingUp size={13} />
                        Est. Yield: {prop.yield}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-[#fbfff9]">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-[#567177] mb-1 font-medium">
                          <MapPin size={13} className="text-[#234d4d] shrink-0" />
                          <span className="truncate">{prop.location}</span>
                        </div>

                        <h3 className="font-bold text-base text-[#10484b] group-hover:text-[#234d4d] transition line-clamp-1 customer-portal-serif">
                          {prop.title}
                        </h3>

                        <p className="text-[11px] text-[#6e897e] mt-0.5 font-medium">
                          Developer: {prop.developer}
                        </p>
                      </div>

                      {/* Specs */}
                      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#f4faea] rounded-xl border border-[#dfe6df] text-center text-xs">
                        <div>
                          <p className="text-[10px] text-[#6e897e] font-bold uppercase">Beds</p>
                          <p className="font-bold text-[#10484b]">{prop.beds} Suites</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#6e897e] font-bold uppercase">Baths</p>
                          <p className="font-bold text-[#10484b]">{prop.baths} Baths</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#6e897e] font-bold uppercase">Size</p>
                          <p className="font-bold text-[#10484b]">{prop.size}</p>
                        </div>
                      </div>

                      {/* Price & CTAs */}
                      <div className="pt-3 border-t border-[#dfe6df] flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-[#6e897e] uppercase font-bold">Fixed Price</p>
                          <p className="text-base font-black text-[#10484b] customer-portal-serif">
                            RM {prop.price.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-[#6e897e]">
                            ~RM {estMonthly.toLocaleString()}/mo
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMortgageTransfer(prop.price);
                            }}
                            className="p-2 rounded-xl border border-[#234d4d] text-[#10484b] hover:bg-[#eaf6df] transition shadow-sm"
                            title="Calculate Mortgage"
                          >
                            <Calculator size={15} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookViewingClick(prop);
                            }}
                            className="px-3.5 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm border border-[#234d4d]"
                          >
                            <Calendar size={13} />
                            Book Tour
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY SHORTLIST & COMPARISON                                            */}
        {/* ========================================================================= */}
        {activeTab === "shortlist" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d2e5d4]">
              <div>
                <h2 className="customer-portal-serif text-2xl sm:text-3xl font-normal text-[#10484b]">
                  My Private Shortlist
                </h2>
                <p className="text-xs text-[#567177] mt-0.5 font-medium">
                  Compare specifications, rental yields, and price per sqft across your saved residences.
                </p>
              </div>

              {shortlistedProperties.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#fbfff9] text-[#10484b] border-[1.5px] border-[#234d4d]">
                    {shortlistedProperties.length} Properties Saved
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsComparisonModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-black shadow-md border border-[#234d4d] transition active:scale-95"
                  >
                    <Scale size={14} />
                    <span>Compare Matrix</span>
                    <span className="bg-[#d7ef73] text-[#10484b] text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {selectedComparisonIds.length > 0 ? selectedComparisonIds.length : Math.min(shortlistedProperties.length, 3)}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {shortlistedProperties.length === 0 ? (
              <div className="text-center py-16 terrain-card p-8 space-y-4">
                <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-200">
                  <Heart size={28} />
                </div>
                <h3 className="text-lg font-bold text-[#10484b] customer-portal-serif">
                  Your shortlist is currently empty
                </h3>
                <p className="text-xs text-[#567177] max-w-sm mx-auto">
                  Browse our premier property collection and click the heart icon on any residence to compare them side-by-side.
                </p>
                <button
                  onClick={() => setActiveTab("explore")}
                  className="px-4 py-2 bg-[#234d4d] text-[#d7ef73] rounded-xl text-xs font-bold border border-[#234d4d]"
                >
                  Explore Residences
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Interactive Comparison Bar */}
                <div className="terrain-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#eaf6df] via-[#f4faea] to-[#eaf6df] border border-[#234d4d]/30 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#234d4d] text-[#d7ef73] flex items-center justify-center shrink-0 shadow-md">
                      <Scale size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#10484b] customer-portal-serif flex items-center gap-1.5">
                        <span>Side-by-Side Property Comparison Matrix</span>
                        <span className="text-[10px] bg-[#d7ef73] text-[#10484b] font-extrabold px-1.5 py-0.2 rounded">
                          Interactive
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#567177] font-medium mt-0.5">
                        {selectedComparisonIds.length > 0
                          ? `${selectedComparisonIds.length} properties selected (Max 3). Click 'Launch Comparison' to view deep analytics.`
                          : "Select 2 or 3 residences using the checkboxes below to benchmark yields, monthly loan repayments, and luxury amenities."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedComparisonIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedComparisonIds([])}
                        className="text-xs font-bold text-[#567177] hover:text-rose-600 px-2 underline"
                      >
                        Clear ({selectedComparisonIds.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsComparisonModalOpen(true)}
                      className="px-4 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm border border-[#234d4d] active:scale-95"
                    >
                      <Scale size={14} />
                      <span>Compare {selectedComparisonIds.length ? `${selectedComparisonIds.length} Contenders` : "Residences"}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Comparison Matrix Table */}
                <div className="terrain-card overflow-x-auto p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#234d4d]">
                      Side-by-Side Comparison Matrix
                    </h3>
                    <span className="text-[11px] text-[#567177] font-medium">
                      Select checkboxes to compare 2–3 properties in detail
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                    <thead>
                      <tr className="border-b-[1.5px] border-[#234d4d] text-[#10484b] font-bold">
                        <th className="py-3 px-2 w-10 text-center">Compare</th>
                        <th className="py-3 px-3">Property</th>
                        <th className="py-3 px-3">Developer</th>
                        <th className="py-3 px-3">Location</th>
                        <th className="py-3 px-3">Price (RM)</th>
                        <th className="py-3 px-3">Built-Up</th>
                        <th className="py-3 px-3">Price / sqft</th>
                        <th className="py-3 px-3">Rental Yield</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dfe6df]">
                      {shortlistedProperties.map((p) => {
                        const sizeNum = parseInt(p.size) || 1200;
                        const psf = Math.round(p.price / sizeNum);
                        const isChecked = selectedComparisonIds.includes(p.id);

                        return (
                          <tr
                            key={p.id}
                            className={`transition cursor-pointer ${
                              isChecked ? "bg-[#eaf6df]/90 font-medium" : "hover:bg-[#f4faea]/80"
                            }`}
                            onClick={() => toggleComparisonSelection(p.id)}
                          >
                            <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleComparisonSelection(p.id)}
                                className="w-4 h-4 rounded text-[#234d4d] accent-[#234d4d] cursor-pointer"
                                title="Select for comparison"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={p.imageUrl}
                                  alt={p.title}
                                  className="w-10 h-10 rounded-lg object-cover border border-[#234d4d]"
                                />
                                <div>
                                  <p className="font-bold text-[#10484b] line-clamp-1 customer-portal-serif">
                                    {p.title}
                                  </p>
                                  <span className="text-[10px] text-[#4a9070] font-bold">
                                    {p.type}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[#285c59] font-medium">
                              {p.developer}
                            </td>
                            <td className="py-3 px-3 text-[#567177] truncate max-w-[140px]">
                              {p.location}
                            </td>
                            <td className="py-3 px-3 font-black text-[#10484b] customer-portal-serif text-sm">
                              RM {p.price.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-[#285c59]">
                              {p.size} ({p.beds} Beds)
                            </td>
                            <td className="py-3 px-3 text-[#567177]">
                              RM {psf.toLocaleString()} / sqft
                            </td>
                            <td className="py-3 px-3 font-bold text-[#10484b]">
                              <span className="bg-[#d7ef73] text-[#153941] px-1.5 py-0.5 rounded font-black text-[11px]">
                                {p.yield}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleBookViewingClick(p)}
                                  className="px-3 py-1 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-lg text-[11px] font-bold border border-[#234d4d]"
                                >
                                  Book Tour
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleSaveToggle(e, p.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Shortlisted Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {shortlistedProperties.map((prop) => (
                    <div
                      key={prop.id}
                      onClick={() => setDetailModalProperty(prop)}
                      className="terrain-card p-5 cursor-pointer space-y-3"
                    >
                      <div className="aspect-[16/10] rounded-xl overflow-hidden relative border border-[#234d4d]">
                        <img src={prop.imageUrl} alt={prop.title} className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => handleSaveToggle(e, prop.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500 text-white"
                        >
                          <Heart size={14} className="fill-white" />
                        </button>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-[#10484b] line-clamp-1 customer-portal-serif">
                          {prop.title}
                        </h4>
                        <p className="text-xs text-[#567177]">{prop.location}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#dfe6df]">
                        <span className="font-black text-sm text-[#10484b] customer-portal-serif">
                          RM {prop.price.toLocaleString()}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComparisonSelection(prop.id);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                              selectedComparisonIds.includes(prop.id)
                                ? "bg-[#d7ef73] text-[#10484b] border-[#10484b]/30 shadow-sm"
                                : "bg-[#fbfff9] text-[#234d4d] border-[#234d4d]/30 hover:bg-[#eaf6df]"
                            }`}
                          >
                            <Scale size={12} className="inline mr-1" />
                            {selectedComparisonIds.includes(prop.id) ? "Selected" : "Compare"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookViewingClick(prop);
                            }}
                            className="px-3.5 py-1.5 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold border border-[#234d4d] transition"
                          >
                            Book Tour
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TOUR TRACKER & BOOKED VIEWINGS                                       */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* TAB 3: TOUR TRACKER & BOOKED VIEWINGS                                       */}
        {/* ========================================================================= */}
        {activeTab === "viewings" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d2e5d4]">
              <div>
                <h2 className="customer-portal-serif text-2xl sm:text-3xl font-normal text-[#10484b]">
                  VIP Private Tour Tracker
                </h2>
                <p className="text-xs text-[#567177] mt-0.5 font-medium">
                  Manage your scheduled appointments and showroom visits with dedicated property specialists.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingModalProperty(CUSTOMER_PROPERTIES[0])}
                  className="px-4 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm border border-[#234d4d]"
                >
                  <Calendar size={14} />
                  + Schedule New Tour
                </button>
              </div>
            </div>

            {/* WhatsApp Two-Way Integration Status Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#e7fedb] via-[#f0fbf0] to-[#eaf6df] border border-[#25D366]/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <MessageSquare size={18} className="fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#075E54]">
                      WhatsApp Live Two-Way Sync Active
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-[#25D366]/20 text-[#075E54] text-[10px] font-black uppercase tracking-wider">
                      Connected
                    </span>
                  </div>
                  <p className="text-[11px] text-[#2c5344] mt-0.5 font-medium">
                    All tours are synced with <strong>{activeCustomer?.phone || "+60 12-882 1099"}</strong>. If you can't make your appointment, simply text <strong>CANCEL</strong> on WhatsApp to auto-update this portal.
                  </p>
                </div>
              </div>

              <a
                href="#whatsapp-chat"
                onClick={(e) => {
                  e.preventDefault();
                  // Trigger widget opening by dispatching custom event or clicking launcher
                  const btn = document.querySelector('button[title*="WhatsApp"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }}
                className="px-3.5 py-1.5 bg-[#075E54] hover:bg-[#128C7E] text-[#d7ef73] text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shrink-0 border border-[#075E54]"
              >
                <span>Open WhatsApp Chat</span>
                <ChevronRight size={14} />
              </a>
            </div>

            {/* Segment pills — Upcoming vs History */}
            {(() => {
              const activeCount = bookedViewings.filter((v) => v.status !== "Cancelled").length;
              const cancelledCount = bookedViewings.filter((v) => v.status === "Cancelled").length;
              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTrackerFilter("active")}
                      className={`terrain-pill ${
                        trackerFilter === "active" ? "active" : ""
                      }`}
                    >
                      <Calendar size={12} className="inline-block mr-1" />
                      Upcoming Tours
                      {activeCount > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                          trackerFilter === "active"
                            ? "bg-[#d7ef73] text-[#10484b]"
                            : "bg-[#e8f2e6] text-[#3b6b55]"
                        }`}>
                          {activeCount}
                        </span>
                      )}
                    </button>
                    {cancelledCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setTrackerFilter("cancelled")}
                        className={`terrain-pill ${
                          trackerFilter === "cancelled" ? "active" : ""
                        }`}
                      >
                        <History size={12} className="inline-block mr-1" />
                        Cancelled History
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                          trackerFilter === "cancelled"
                            ? "bg-rose-200 text-rose-800"
                            : "bg-rose-100 text-rose-600"
                        }`}>
                          {cancelledCount}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Clear All Cancelled button — only shown on cancelled tab */}
                  {trackerFilter === "cancelled" && cancelledCount > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const cancelled = bookedViewings.filter((v) => v.status === "Cancelled");
                        await Promise.all(cancelled.map((v) => dismissViewing(v.id)));
                        setTrackerFilter("active");
                      }}
                      className="px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-1.5"
                    >
                      <Trash2 size={12} />
                      Clear All Cancelled History
                    </button>
                  )}
                </div>
              );
            })()}

            {bookedViewings.length === 0 || bookedViewings.filter((v) => v.status !== "Cancelled").length === 0 && trackerFilter === "active" ? (
              <div className="text-center py-16 terrain-card p-8 space-y-4">
                <div className="w-14 h-14 bg-[#eaf6df] text-[#234d4d] rounded-full flex items-center justify-center mx-auto border border-[#234d4d]">
                  <Calendar size={28} />
                </div>
                <h3 className="text-lg font-bold text-[#10484b] customer-portal-serif">
                  No upcoming private tours
                </h3>
                <p className="text-xs text-[#567177] max-w-sm mx-auto">
                  Select any signature residence from our marketplace to arrange a private one-on-one walkthrough.
                </p>
                {bookedViewings.filter((v) => v.status === "Cancelled").length > 0 && (
                  <p className="text-[11px] text-[#8faaaa] mt-1">
                    You have {bookedViewings.filter((v) => v.status === "Cancelled").length} cancelled tour{bookedViewings.filter((v) => v.status === "Cancelled").length > 1 ? "s" : ""} in your{" "}
                    <button
                      className="underline hover:text-[#234d4d] transition"
                      onClick={() => setTrackerFilter("cancelled")}
                    >
                      history
                    </button>
                    .
                  </p>
                )}
                <button
                  onClick={() => setActiveTab("explore")}
                  className="px-4 py-2 bg-[#234d4d] text-[#d7ef73] rounded-xl text-xs font-bold border border-[#234d4d]"
                >
                  Browse Residences
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookedViewings
                  .filter((v) => {
                    if (trackerFilter === "active") return v.status !== "Cancelled";
                    if (trackerFilter === "cancelled") return v.status === "Cancelled";
                    return true;
                  })
                  .map((viewing) => {
                  const isCancelled = viewing.status === "Cancelled";
                  const isWhatsAppCancelled = isCancelled && viewing.cancelledVia === "whatsapp";

                  const handleOpenReschedule = () => {
                    const matched = CUSTOMER_PROPERTIES.find(
                      (p) =>
                        p.id === viewing.propertyId ||
                        p.title.toLowerCase().trim() === viewing.propertyTitle.toLowerCase().trim() ||
                        viewing.propertyTitle.toLowerCase().includes(p.title.toLowerCase()) ||
                        p.title.toLowerCase().includes(viewing.propertyTitle.toLowerCase())
                    );
                    setReschedulingViewing(viewing);
                    setViewingModalProperty(
                      matched || {
                        id: viewing.propertyId,
                        title: viewing.propertyTitle,
                        name: viewing.propertyTitle,
                        location: viewing.propertyLocation,
                        price: viewing.propertyPrice,
                        imageUrl: viewing.propertyImage,
                        developer: "",
                        type: "Residence",
                        beds: 3,
                        baths: 2,
                        size: "1,200 sqft",
                        status: "Available",
                        yield: "5.2%",
                        collection: [],
                        features: [],
                      }
                    );
                  };

                  return (
                    <div
                      key={viewing.id}
                      className={`terrain-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all ${
                        isCancelled ? "opacity-75 bg-[#fafbf9] border-dashed border-rose-200" : ""
                      }`}
                    >
                        <div
                          onClick={() => setHistoryViewing(viewing)}
                          className="flex items-start gap-4 cursor-pointer flex-1 group"
                          title="Click to view appointment history & timeline"
                        >
                          {viewing.propertyImage && (
                            <img
                              src={viewing.propertyImage}
                              alt={viewing.propertyTitle}
                              className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[#234d4d] group-hover:ring-2 group-hover:ring-[#234d4d]/30 transition"
                            />
                          )}
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {isCancelled ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300 flex items-center gap-1">
                                  ✕ Cancelled
                                </span>
                              ) : (
                                <span className="badge-lime">
                                  {viewing.status}
                                </span>
                              )}

                              {/* WhatsApp Tag */}
                              {isWhatsAppCancelled ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] text-[10px] font-bold border border-[#86efac] flex items-center gap-1">
                                  💬 Cancelled via WhatsApp
                                </span>
                              ) : !isCancelled ? (
                                <>
                                  <span className="px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#2e7d32] text-[10px] font-semibold border border-[#a5d6a7] flex items-center gap-1">
                                    📱 WhatsApp Synced
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200 flex items-center gap-1">
                                    📅 Google Calendar
                                  </span>
                                </>
                              ) : null}

                              <span className="text-xs text-[#567177]">
                                Tour Ref: #{viewing.id}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-[#10484b] customer-portal-serif group-hover:text-[#234d4d] transition flex items-center gap-1.5">
                              <span>{viewing.propertyTitle}</span>
                              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#234d4d]" />
                            </h3>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#285c59]">
                              <span className="flex items-center gap-1 font-semibold">
                                <Calendar size={13} className="text-[#234d4d]" />
                                {viewing.date}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-semibold">
                                <Clock size={13} className="text-[#234d4d]" />
                                {viewing.timeSlot}
                              </span>
                            </div>

                            {viewing.notes && (
                              <p className="text-[11px] text-[#567177] italic bg-[#f4faea] px-2.5 py-1 rounded-lg border border-[#dfe6df]">
                                Note: {viewing.notes}
                              </p>
                            )}

                            {isCancelled && viewing.cancellationReason && (
                              <p className="text-[11px] text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-200">
                                ℹ️ {viewing.cancellationReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Agent contact card & Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[#dfe6df]">
                          <div className="p-2.5 bg-[#f4faea] rounded-xl border border-[#234d4d] flex items-center gap-2.5 w-full sm:w-auto">
                            <div className="w-8 h-8 rounded-full bg-[#234d4d] text-[#d7ef73] text-xs font-bold flex items-center justify-center">
                              {viewing.agentName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-[#10484b]">
                                {viewing.agentName}
                              </p>
                              <p className="text-[10px] text-[#6e897e] font-semibold">Specialist</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                            {/* History button */}
                            <button
                              onClick={() => setHistoryViewing(viewing)}
                              className="px-2.5 py-2 bg-white hover:bg-[#eaf6df] border border-[#dfe6df] text-[#234d4d] text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-2xs"
                              title="View Booking Timeline & History"
                            >
                              <History size={13} />
                              <span>History</span>
                            </button>

                            <a
                              href={`tel:${viewing.agentPhone}`}
                              className="px-2.5 py-2 bg-[#fbfff9] border border-[#234d4d] hover:bg-[#eaf6df] text-[#10484b] text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-2xs"
                              title="Call Specialist"
                            >
                              <Phone size={13} />
                            </a>

                            {!isCancelled ? (
                              <>
                                <a
                                  href={buildGoogleCalendarUrl({
                                    title: viewing.propertyTitle,
                                    location: viewing.propertyLocation,
                                    date: viewing.date,
                                    timeSlot: viewing.timeSlot,
                                    specialistName: viewing.agentName,
                                    specialistPhone: viewing.agentPhone,
                                    notes: viewing.notes,
                                    bookingId: viewing.id,
                                    googleCalendarHtmlLink: viewing.googleCalendarHtmlLink,
                                    googleCalendarEventId: viewing.googleCalendarEventId,
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                  title="Open Event in Google Calendar"
                                >
                                  <Calendar size={13} className="text-blue-600" />
                                  <span>G-Cal</span>
                                </a>

                                <button
                                  onClick={handleOpenReschedule}
                                  className="px-3 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold rounded-xl transition border border-[#234d4d]"
                                >
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => {
                                    cancelViewing(viewing.id);
                                    toast.success("Tour appointment cancelled.");
                                  }}
                                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition border border-rose-200"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={handleOpenReschedule}
                                  className="px-3 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold rounded-xl transition border border-[#234d4d] flex items-center gap-1"
                                >
                                  <CalendarPlus size={13} />
                                  Re-book Tour
                                </button>
                                <button
                                  onClick={() => {
                                    dismissViewing(viewing.id);
                                    toast.success("Removed from history.");
                                  }}
                                  className="px-3 py-2 text-rose-500 hover:bg-rose-50 text-xs font-bold rounded-xl transition border border-rose-200 flex items-center gap-1"
                                  title="Remove this cancelled tour from your history"
                                >
                                  <Trash2 size={12} />
                                  Dismiss
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MORTGAGE & AFFORDABILITY PLANNER                                    */}
        {/* ========================================================================= */}
        {activeTab === "financing" && (
          <InteractiveFinancialRoiCalculator
            initialPrice={calcPrice}
            properties={CUSTOMER_PROPERTIES.map((p) => {
              const numericSize = parseInt(p.size.replace(/\D/g, ""), 10) || 1800;
              return {
                id: p.id,
                title: p.title,
                location: p.location,
                price: p.price,
                imageUrl: p.imageUrl,
                maintenanceFee: Math.round(numericSize * 0.45),
              };
            })}
            onSelectProperty={(prop) => {
              setCalcPrice(prop.price);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AI CONCIERGE & BUYER CHATBOT                                        */}
        {/* ========================================================================= */}
        {activeTab === "concierge" && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-[#d2e5d4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="customer-portal-serif text-2xl sm:text-3xl font-normal text-[#10484b]">
                    AI Property Concierge
                  </h2>
                  {isGuest && (
                    <span className="text-[10px] font-bold bg-[#f4faea] text-[#234d4d] border border-[#234d4d] px-2 py-0.5 rounded-full">
                      Guest Edition ({guestQueriesRemaining}/{GUEST_QUERY_LIMIT} free left)
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#567177] mt-0.5 font-medium">
                  Ask any question about properties, loan calculations, foreign buyer rules, rental yields, and prime locations.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {!isGuest ? (
                  <button
                    onClick={handleNewConciergeConvo}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold rounded-xl transition shadow"
                  >
                    <Plus size={13} />
                    New Chat
                  </button>
                ) : (
                  <button
                    onClick={() => openAuthModal("Sign in to unlock unlimited AI property queries and save your chat history.")}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold rounded-xl transition shadow"
                  >
                    <Sparkles size={13} />
                    Sign In for Unlimited
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Chat Container with sidebar OR Voice Mode Component */}
              <div className="lg:col-span-8 terrain-card flex overflow-hidden" style={{ height: "630px" }}>
                {conciergeMode === "voice" ? (
                  <div className="w-full h-full flex flex-col">
                    <ConciergeVoiceMode
                      onSendMessage={sendConciergeMessage}
                      isAiThinking={isAiThinking}
                      messages={chatMessages}
                      onSwitchToChat={() => setConciergeMode("chat")}
                      isGuestLimitReached={isGuestLimitReached}
                      onOpenAuthModal={openAuthModal}
                    />
                  </div>
                ) : (
                  <>
                    {/* Conversation list sidebar (Members only) */}
                    <AnimatePresence>
                  {!isGuest && showConciergeList && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 220, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col border-r border-[#dfe6df] bg-[#f4faea] overflow-hidden shrink-0"
                      style={{ minWidth: 0 }}
                    >
                      <div className="p-3 border-b border-[#dfe6df] flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#234d4d] flex items-center gap-1.5">
                          <MessagesSquare size={12} />
                          Conversations
                        </span>
                        <span className="text-[10px] text-[#567177] bg-[#dfe6df] rounded-full px-1.5 py-0.5 font-bold">{conciergeConvos.length}</span>
                      </div>
                      <button
                        onClick={handleNewConciergeConvo}
                        className="mx-2 my-2 flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-dashed border-[#234d4d] text-[#234d4d] text-[11px] font-bold hover:bg-[#eaf6df] transition"
                      >
                        <Plus size={11} />
                        New conversation
                      </button>
                      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
                        {conciergeConvos.map((convo) => (
                          <div
                            key={convo.id}
                            onClick={() => { setActiveConciergeId(convo.id); setShowConciergeList(false); }}
                            className={cn(
                              "group flex items-start justify-between gap-1 rounded-xl px-2.5 py-2 cursor-pointer transition-all",
                              convo.id === activeConciergeId
                                ? "bg-[#234d4d] text-white"
                                : "hover:bg-[#eaf6df] text-[#10484b]"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-[11px] font-semibold truncate", convo.id === activeConciergeId ? "text-white" : "text-[#10484b]")}>
                                {convo.title}
                              </p>
                              <p className={cn("text-[10px] mt-0.5", convo.id === activeConciergeId ? "text-[#a8d4c4]" : "text-[#567177]")}>
                                {convo.messages.filter((m) => m.role === "user").length} msgs
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteConciergeConvo(convo.id, e)}
                              className={cn(
                                "shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                                convo.id === activeConciergeId
                                  ? "text-white/60 hover:text-white hover:bg-white/10"
                                  : "text-[#567177] hover:text-red-500 hover:bg-red-50"
                              )}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main chat panel */}
                <div className="flex flex-1 flex-col min-w-0">
                  {/* Chat Header */}
                  <div className="px-5 py-4 bg-[#234d4d] text-white flex items-center justify-between border-b border-[#10484b] shrink-0 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {!isGuest ? (
                        <button
                          onClick={() => setShowConciergeList((v) => !v)}
                          className="w-9 h-9 rounded-xl bg-[#d7ef73]/20 hover:bg-[#d7ef73]/30 text-[#d7ef73] flex items-center justify-center transition shrink-0"
                          title="Conversation history"
                        >
                          {showConciergeList ? <ChevronLeft size={16} /> : <MessagesSquare size={16} />}
                        </button>
                      ) : (
                        <button
                          onClick={() => openAuthModal("Sign in to unlock multiple saved conversations.")}
                          className="w-9 h-9 rounded-xl bg-[#d7ef73]/20 hover:bg-[#d7ef73]/30 text-[#d7ef73] flex items-center justify-center transition shrink-0"
                          title="Sign in to save chat history"
                        >
                          <Lock size={15} />
                        </button>
                      )}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1c4545] border border-[#d7ef73]/40 text-[#d7ef73] flex items-center justify-center font-bold text-sm shadow-sm shrink-0" title="Luxury Butler Concierge">
                        <UserCheck size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-[260px] leading-tight">
                          {activeConciergeConvo?.title === "New Conversation"
                            ? "Luxury Butler Concierge"
                            : activeConciergeConvo?.title ?? "Luxury Butler Concierge"}
                        </p>
                        <p className="text-xs text-[#d7ef73] font-medium truncate mt-0.5">
                          {isGuest ? `${guestQueriesRemaining} free questions remaining` : "Personal Butler · Online 24/7"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Segmented Mode Switcher Tab on Chat Window */}
                      <div className="inline-flex items-center p-1 bg-black/30 border border-white/15 rounded-xl gap-1 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setConciergeMode("chat")}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-bold rounded-lg transition-all bg-[#d7ef73] text-[#10484b] shadow-sm"
                        >
                          <MessageSquare size={14} />
                          <span>Text Chat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConciergeMode("voice")}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-bold rounded-lg transition-all text-white/70 hover:text-white hover:bg-white/10"
                          title="Switch to Live Voice Mode"
                        >
                          <Mic size={14} />
                          <span>Voice Mode</span>
                        </button>
                      </div>
                      {!isGuest ? (
                        <>
                          <button
                            onClick={handleNewConciergeConvo}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d7ef73]/20 hover:bg-[#d7ef73]/30 text-[#d7ef73] text-xs font-bold rounded-xl transition"
                            title="New conversation"
                          >
                            <Plus size={13} />
                            <span>New</span>
                          </button>
                          <span className="px-2.5 py-1 rounded-full bg-[#d7ef73] text-[#10484b] text-[11px] font-black uppercase tracking-wider">Active</span>
                        </>
                      ) : (
                        <button
                          onClick={() => openAuthModal("Sign in to unlock unlimited AI inquiries.")}
                          className="px-3 py-1.5 bg-[#d7ef73] text-[#153941] text-xs font-bold rounded-xl hover:bg-white transition"
                        >
                          Unlock Unlimited
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f9fff7]">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                            msg.role === "user"
                              ? "bg-[#234d4d] text-[#f6ffdf] rounded-br-none border border-[#10484b]"
                              : "bg-[#fbfff9] text-[#285c59] border-[1.5px] border-[#234d4d] rounded-bl-none shadow-sm font-medium"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {isAiThinking && (
                      <div className="flex justify-start">
                        <div className="bg-[#fbfff9] text-[#285c59] border-[1.5px] border-[#234d4d] rounded-2xl rounded-bl-none p-3 text-xs shadow-sm flex items-center gap-2 font-medium">
                          <span className="size-2 rounded-full bg-[#234d4d] animate-ping" />
                          <span>AI is analyzing property database & market regulations…</span>
                        </div>
                      </div>
                    )}

                    {/* Guest limit reached notification card */}
                    {isGuestLimitReached && (
                      <div className="p-4 rounded-2xl bg-[#f4faea] border border-[#234d4d] text-center space-y-2.5 shadow-sm my-2">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-[#234d4d] text-[#d7ef73] flex items-center justify-center">
                          <Sparkles size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#10484b]">Free Guest Limit Reached ({GUEST_QUERY_LIMIT}/{GUEST_QUERY_LIMIT})</p>
                          <p className="text-xs text-[#567177] max-w-md mx-auto mt-0.5">
                            You have used your 3 free preview inquiries. Sign in or create a free account to unlock unlimited AI inquiries, save multiple conversations, and get tailored property match scoring.
                          </p>
                        </div>
                        <button
                          onClick={() => openAuthModal("Sign in to unlock unlimited AI property inquiries and save your conversations.")}
                          className="px-5 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold rounded-xl transition shadow"
                        >
                          Sign In for Unlimited Access
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Input Bar */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-[#fbfff9] border-t border-[#dfe6df] flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConciergeMode("voice")}
                      title="Switch to Live Voice Mode (speak to AI)"
                      className="p-2.5 rounded-xl border border-[#dfe6df] bg-[#f3f5ef] hover:bg-[#234d4d] hover:text-[#d7ef73] text-[#234d4d] transition shrink-0 flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                    >
                      <Mic size={14} />
                      <span className="hidden sm:inline text-[11px] font-bold">Voice</span>
                    </button>
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={
                        isGuestLimitReached
                          ? "Guest limit reached (3/3). Sign in to ask unlimited questions..."
                          : "Ask any question about properties, prices, foreign quotas, MRT, or mortgage..."
                      }
                      disabled={isAiThinking || isGuestLimitReached}
                      className="flex-1 px-3.5 py-2.5 text-xs bg-[#f3f5ef] border border-[#dfe6df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#234d4d] text-[#10484b] font-medium disabled:opacity-50"
                    />
                    {isGuestLimitReached ? (
                      <button
                        type="button"
                        onClick={() => openAuthModal("Sign in to unlock unlimited AI property queries.")}
                        className="px-4 py-2.5 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold rounded-xl shadow transition border border-[#234d4d]"
                      >
                        Sign In
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || isAiThinking}
                        className="px-4 py-2.5 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold rounded-xl shadow transition border border-[#234d4d] disabled:opacity-40"
                      >
                        Send
                      </button>
                    )}
                  </form>
                </div>
              </>
            )}
          </div>

              {/* Right: AI Capabilities & Suggested Questions */}
              <div className="lg:col-span-4 space-y-4">
                {/* AI Capabilities Card */}
                <div className="terrain-card p-5 space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-[#dfe6df] pb-3">
                    <div className="w-8 h-8 rounded-xl bg-[#234d4d] text-[#d7ef73] flex items-center justify-center font-bold">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-[#10484b] uppercase tracking-wider">
                        AI Property Assistant
                      </h3>
                      <p className="text-[10px] text-[#567177]">Instant automated answers 24/7</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 p-2 bg-[#f4faea] rounded-lg border border-[#e2ece0]">
                      <Building2 size={14} className="text-[#234d4d] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#10484b] text-[11px]">Listings & Inventory</p>
                        <p className="text-[10px] text-[#567177]">Look up floor sizes, layouts, developers, & pricing</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2 bg-[#f4faea] rounded-lg border border-[#e2ece0]">
                      <TrendingUp size={14} className="text-[#234d4d] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#10484b] text-[11px]">Rental Yield & ROI</p>
                        <p className="text-[10px] text-[#567177]">Gross rental projections & capital appreciation trends</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2 bg-[#f4faea] rounded-lg border border-[#e2ece0]">
                      <ShieldCheck size={14} className="text-[#234d4d] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#10484b] text-[11px]">Foreign Buyer Guidelines</p>
                        <p className="text-[10px] text-[#567177]">EPU state consent, MM2H perks, and price thresholds</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2 bg-[#f4faea] rounded-lg border border-[#e2ece0]">
                      <Calculator size={14} className="text-[#234d4d] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#10484b] text-[11px]">Mortgage & Legal Fees</p>
                        <p className="text-[10px] text-[#567177]">DSR qualification criteria & MOT stamp duty estimates</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggested Question Prompts */}
                <div className="terrain-card p-5 space-y-2.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#234d4d]">
                    Suggested Inquiries
                  </p>
                  {[
                    "What are the foreign buyer guidelines in Kuala Lumpur?",
                    "Which properties have the highest rental yield?",
                    "Can you calculate monthly repayment for RM 2.8M?",
                    "What is the difference between KLCC and Damansara Heights?",
                    "What are the Malaysian MOT stamp duty tiers?",
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (isGuestLimitReached) {
                          openAuthModal("Sign in to ask unlimited questions!");
                        } else {
                          if (conciergeMode === "voice") {
                            sendConciergeMessage(prompt);
                          } else {
                            setInputMessage(prompt);
                          }
                        }
                      }}
                      className="w-full p-2 text-left bg-[#f4faea] hover:bg-[#eaf6df] border border-[#234d4d] rounded-lg text-xs text-[#10484b] font-medium transition"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Discreet Agent Contact Reference */}
                <div className="p-3 bg-[#f4faea] rounded-xl border border-[#dfe6df] text-[11px] text-[#567177] flex items-center justify-between">
                  <span>Designated Specialist: <strong className="text-[#10484b]">{activeAgent.name}</strong></span>
                  <a
                    href={`tel:${activeAgent.phone}`}
                    className="text-[#234d4d] font-bold hover:underline"
                  >
                    {activeAgent.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CUSTOMER PROFILE & AI MATCH CRITERIA                                */}
        {/* ========================================================================= */}
        {activeTab === "profile" && (
          <CustomerProfileTab
            properties={CUSTOMER_PROPERTIES}
            onApplyAndExplore={() => setActiveTab("explore")}
          />
        )}
      </main>

      {/* ─── Modals ───────────────────────────────────────────────────────────────── */}
      <AuthModal />

      <CustomerPropertyDetailModal
        isOpen={Boolean(detailModalProperty)}
        onClose={() => setDetailModalProperty(null)}
        property={detailModalProperty}
        onBookViewing={(p) => {
          setDetailModalProperty(null);
          setViewingModalProperty(p);
        }}
        onCalculateMortgage={handleMortgageTransfer}
      />

      <CustomerViewingModal
        isOpen={Boolean(viewingModalProperty)}
        onClose={() => {
          setViewingModalProperty(null);
          setReschedulingViewing(null);
        }}
        property={viewingModalProperty}
        rescheduleViewingId={reschedulingViewing?.id}
        initialAgentId={reschedulingViewing?.agentId}
        initialDate={reschedulingViewing?.date}
        initialSlot={reschedulingViewing?.timeSlot}
        initialNotes={reschedulingViewing?.notes}
      />

      <PropertyComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        selectedProperties={comparisonTargetProperties as any}
        allAvailableProperties={CUSTOMER_PROPERTIES as any}
        onBookViewing={(p) => {
          setIsComparisonModalOpen(false);
          setViewingModalProperty(p);
        }}
        onToggleSave={(id) => toggleSaveProperty(id)}
        isSavedFn={(id) => isPropertySaved(id)}
      />

      {/* ─── Tour History & Audit Details Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {historyViewing && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#153941]/80 backdrop-blur-md"
              onClick={() => setHistoryViewing(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg bg-[#fbfff9] rounded-3xl shadow-2xl border-[1.5px] border-[#234d4d] overflow-hidden z-10 text-[#10484b]"
            >
              {/* Header */}
              <div className="relative px-6 py-5 bg-gradient-to-r from-[#153941] via-[#234d4d] to-[#153941] text-white">
                <button
                  onClick={() => setHistoryViewing(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#d7ef73] text-[#153941] text-[11px] font-extrabold tracking-wider uppercase border border-[#234d4d]">
                    Tour Reference #{historyViewing.id}
                  </span>
                  {historyViewing.status === "Cancelled" ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/40 text-[10px] font-bold">
                      Cancelled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-bold">
                      {historyViewing.status}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-normal tracking-tight text-white customer-portal-serif">
                  {historyViewing.propertyTitle}
                </h2>
                <p className="text-xs text-[#f6ffdf] mt-0.5 truncate">
                  {historyViewing.propertyLocation} • RM {historyViewing.propertyPrice.toLocaleString()}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Specialist Info */}
                <div className="p-3.5 bg-[#f4faea] rounded-2xl border border-[#dfe6df] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#234d4d] text-[#d7ef73] font-bold flex items-center justify-center text-sm shadow-xs">
                      {historyViewing.agentName.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#10484b]">{historyViewing.agentName}</p>
                      <p className="text-xs text-[#567177] font-medium">Dedicated Property Specialist</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${historyViewing.agentPhone}`}
                    className="px-3 py-1.5 bg-[#234d4d] text-[#d7ef73] rounded-xl text-xs font-bold hover:bg-[#10484b] transition flex items-center gap-1"
                  >
                    <Phone size={12} /> Call
                  </a>
                </div>

                {/* Timeline / Audit Trail */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#234d4d] flex items-center gap-1.5">
                    <History size={14} /> Appointment Timeline & History
                  </h4>

                  <div className="space-y-3 border-l-2 border-[#234d4d]/30 ml-2.5 pl-4 text-xs">
                    {/* Scheduled Slot Event */}
                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#234d4d] border-2 border-white" />
                      <p className="font-bold text-[#10484b]">
                        {historyViewing.status === "Cancelled" ? "Scheduled Slot (Cancelled)" : "Confirmed Appointment Slot"}
                      </p>
                      <p className="text-[#567177] mt-0.5 flex items-center gap-2">
                        <span>📅 {historyViewing.date}</span>
                        <span>•</span>
                        <span>⏰ {historyViewing.timeSlot}</span>
                      </p>
                    </div>

                    {/* WhatsApp Status Event */}
                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#25D366] border-2 border-white" />
                      <p className="font-bold text-[#10484b]">WhatsApp Concierge Sync</p>
                      <p className="text-[#567177] mt-0.5">
                        {historyViewing.cancelledVia === "whatsapp"
                          ? "Appointment was cancelled via WhatsApp interactive command."
                          : "Two-way WhatsApp sync active. Text STATUS, CANCEL, or RESCHEDULE anytime."}
                      </p>
                    </div>

                    {/* Cancellation details if cancelled */}
                    {historyViewing.status === "Cancelled" && (
                      <div className="relative">
                        <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white" />
                        <p className="font-bold text-rose-800">Cancellation Record</p>
                        <p className="text-rose-700 mt-0.5">
                          {historyViewing.cancellationReason || "Cancelled by client request."}
                        </p>
                      </div>
                    )}

                    {/* Notes if any */}
                    {historyViewing.notes && (
                      <div className="relative">
                        <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" />
                        <p className="font-bold text-[#10484b]">Special Requests</p>
                        <p className="text-[#567177] italic mt-0.5">"{historyViewing.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-[#dfe6df] flex flex-wrap items-center justify-end gap-2">
                  {historyViewing.status !== "Cancelled" ? (
                    <>
                      <button
                        onClick={() => {
                          const target = historyViewing;
                          setHistoryViewing(null);
                          const matched = CUSTOMER_PROPERTIES.find(
                            (p) =>
                              p.id === target.propertyId ||
                              p.title.toLowerCase().trim() === target.propertyTitle.toLowerCase().trim()
                          );
                          setReschedulingViewing(target);
                          setViewingModalProperty(
                            matched || {
                              id: target.propertyId,
                              title: target.propertyTitle,
                              name: target.propertyTitle,
                              location: target.propertyLocation,
                              price: target.propertyPrice,
                              imageUrl: target.propertyImage,
                              developer: "",
                              type: "Residence",
                              beds: 3,
                              baths: 2,
                              size: "1,200 sqft",
                              status: "Available",
                              yield: "5.2%",
                              collection: [],
                              features: [],
                            }
                          );
                        }}
                        className="px-4 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold transition border border-[#234d4d] cursor-pointer"
                      >
                        Reschedule Appointment
                      </button>
                      <button
                        onClick={async () => {
                          const idToCancel = historyViewing.id;
                          setHistoryViewing(null);
                          await cancelViewing(idToCancel);
                          toast.success("Tour appointment cancelled.");
                        }}
                        className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition border border-rose-200 cursor-pointer"
                      >
                        Cancel Tour
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        const target = historyViewing;
                        setHistoryViewing(null);
                        const matched = CUSTOMER_PROPERTIES.find(
                          (p) =>
                            p.id === target.propertyId ||
                            p.title.toLowerCase().trim() === target.propertyTitle.toLowerCase().trim()
                        );
                        setReschedulingViewing(target);
                        setViewingModalProperty(
                          matched || {
                            id: target.propertyId,
                            title: target.propertyTitle,
                            name: target.propertyTitle,
                            location: target.propertyLocation,
                            price: target.propertyPrice,
                            imageUrl: target.propertyImage,
                            developer: "",
                            type: "Residence",
                            beds: 3,
                            baths: 2,
                            size: "1,200 sqft",
                            status: "Available",
                            yield: "5.2%",
                            collection: [],
                            features: [],
                          }
                        );
                      }}
                      className="px-4 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold transition border border-[#234d4d] cursor-pointer"
                    >
                      Rebook This Tour
                    </button>
                  )}
                  <button
                    onClick={() => setHistoryViewing(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
