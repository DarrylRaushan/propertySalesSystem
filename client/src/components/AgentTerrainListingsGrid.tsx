import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BedDouble,
  Box,
  Building2,
  Calculator,
  Heart,
  MapPin,
  RotateCcw,
  Ruler,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getPropertyState, type PropertyListing } from "./propertyBrowser";
import { cn } from "@/lib/utils";

interface AgentTerrainListingsGridProps {
  properties: PropertyListing[];
  savedIds: number[];
  onToggleSaved: (property: PropertyListing) => void;
  onOpenDossier: (property: PropertyListing) => void;
  onOpenMatchmaker?: (property: PropertyListing) => void;
  activeAgentId: string;
  scope: "mine" | "all";
}

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 })
    .format(value)
    .replace("MYR", "RM");

const badgeColors: Record<string, string> = {
  "open-for-viewing": "bg-[#d7ef73] text-[#10484b] border-[#234d4d]",
  "new-launch": "bg-[#234d4d] text-[#d7ef73] border-[#10484b]",
  "limited-units": "bg-rose-600 text-white border-rose-700",
  "early-bird": "bg-amber-500 text-[#10484b] border-amber-600",
  "investor-pick": "bg-indigo-600 text-white border-indigo-700",
  "ready-to-move": "bg-emerald-600 text-white border-emerald-700",
};

const estimatedYield = (price: number, type: string) => {
  const yields: Record<string, number> = {
    "Condominium": 5.2,
    "Serviced residence": 4.8,
    "Serviced apartment": 5.0,
    "Landed terrace": 3.9,
    "Penthouse": 4.5,
  };
  return (yields[type] || 4.5).toFixed(1) + "%";
};

export default function AgentTerrainListingsGrid({
  properties,
  savedIds,
  onToggleSaved,
  onOpenDossier,
  onOpenMatchmaker,
  activeAgentId,
  scope,
}: AgentTerrainListingsGridProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "beds-desc">("featured");

  const types = useMemo(() => Array.from(new Set(properties.map((p) => p.type))), [properties]);

  const filteredListings = useMemo(() => {
    return properties
      .filter((p) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          if (
            !p.name.toLowerCase().includes(q) &&
            !p.developer.toLowerCase().includes(q) &&
            !p.location.toLowerCase().includes(q)
          ) return false;
        }
        if (selectedType !== "all" && p.type !== selectedType) return false;
        if (selectedState !== "all" && getPropertyState(p.location) !== selectedState) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "beds-desc") return b.beds - a.beds;
        return (a.featured ? 0 : 1) - (b.featured ? 0 : 1);
      });
  }, [properties, search, selectedType, selectedState, sortBy]);

  const hasFilters = search.trim() !== "" || selectedType !== "all" || selectedState !== "all" || sortBy !== "featured";
  const handleReset = () => { setSearch(""); setSelectedType("all"); setSelectedState("all"); setSortBy("featured"); };

  return (
    <section
      id="traditional-listings-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-8 border-t border-[#dce5dd]"
      aria-label="Property listings grid"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#2e695e] flex items-center gap-1.5">
            <Sparkles size={13} />
            {scope === "mine" ? "My Active Book · Agent Listings" : "Full Market Catalog · All Developments"}
          </span>
          <h3 className="mt-1.5 text-[clamp(22px,3vw,32px)] font-normal text-[#153941] leading-tight" style={{ fontFamily: '"Fraunces", Georgia, serif', letterSpacing: "-0.04em" }}>
            {scope === "mine" ? "Your Curated Portfolio" : "All Property Listings"}
          </h3>
          <p className="mt-1 text-sm text-[#5c726a]">
            {filteredListings.length} listings · click any card to open the full dossier
          </p>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d] max-w-[200px]"
        >
          <option value="featured">Sort: Featured</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="beds-desc">Bedrooms: Most first</option>
        </select>
      </div>

      {/* Search & Filter Toolbar — matches customer portal hero bar style */}
      <div className="p-3 bg-[#fbfff9] rounded-2xl shadow-sm border border-[#234d4d] mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567177]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project, developer, or location..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] placeholder:text-[#879793] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
          />
        </div>

        {/* Type */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
        >
          <option value="all">All Types ({properties.length})</option>
          {types.map((t) => (
            <option key={t} value={t}>{t} ({properties.filter(p => p.type === t).length})</option>
          ))}
        </select>

        {/* State */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#f3f5ef] border border-[#dfe6df] rounded-xl text-xs font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
        >
          <option value="all">All States</option>
          <option value="Selangor">Selangor</option>
          <option value="Kuala Lumpur">Kuala Lumpur</option>
          <option value="Johor">Johor</option>
        </select>
      </div>

      {/* Active Filters Row */}
      {hasFilters && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#567177] font-medium">
            Showing <span className="font-bold text-[#10484b]">{filteredListings.length}</span> of <span className="font-bold text-[#10484b]">{properties.length}</span> listings
          </p>
          <button onClick={handleReset} className="flex items-center gap-1 text-xs font-bold text-[#2a6860] hover:underline">
            <RotateCcw size={11} /> Clear filters
          </button>
        </div>
      )}

      {/* Terrain Card Grid — 3 columns matching customer portal */}
      {filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((prop) => {
            const isSaved = savedIds.includes(prop.id);
            const badge = prop.badge;
            const badgeStyle = badge ? badgeColors[badge] : "bg-[#e4f2df] text-[#10484b] border-[#cbe5c4]";
            const badgeLabel = badge ? badge.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : prop.status;
            const estMonthly = Math.round((prop.price * 0.9 * 0.042) / 12 + (prop.price * 0.9) / 360);
            const yieldPct = estimatedYield(prop.price, prop.type);
            const isMyListing = prop.agentId === activeAgentId;

            return (
              <div
                key={prop.id}
                onClick={() => onOpenDossier(prop)}
                className="terrain-card flex flex-col cursor-pointer group"
                style={{ fontFamily: "\"Inter\", system-ui, sans-serif" }}
              >
                {/* Photo */}
                <div className="property-image-container aspect-[16/10] bg-[#edf2ea] relative overflow-hidden rounded-t-[18px]">
                  <img
                    src={prop.image}
                    alt={prop.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Top Badges Row */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className={cn("px-2.5 py-1 rounded-lg text-[10.5px] font-bold border", badgeStyle)}>
                      {badgeLabel}
                    </span>

                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSaved(prop); toast.success(isSaved ? `Removed from saved` : `Saved to dossiers`); }}
                      className={cn(
                        "p-2 rounded-full backdrop-blur-md transition-all shadow-md",
                        isSaved ? "bg-rose-500 text-white" : "bg-[#fbfff9]/90 text-[#10484b] hover:bg-white hover:text-rose-500"
                      )}
                      title={isSaved ? "Saved" : "Save listing"}
                    >
                      <Heart size={15} className={isSaved ? "fill-white" : ""} />
                    </button>
                  </div>

                  {/* Bottom yield + agent tag */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div className="px-2.5 py-1 rounded-lg bg-[#153941]/90 backdrop-blur text-[#d7ef73] text-[11px] font-bold border border-[#d7ef73]/30 flex items-center gap-1">
                      <TrendingUp size={12} />
                      Est. Yield: {yieldPct}
                    </div>
                    {scope === "all" && prop.agentId && (
                      <div className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur",
                        isMyListing
                          ? "bg-[#d7ef73]/90 text-[#10484b] border border-[#10484b]/20"
                          : "bg-white/80 text-[#567177] border border-[#dfe6df]"
                      )}>
                        <User size={10} />
                        {isMyListing ? "My Listing" : prop.agentId.charAt(0).toUpperCase() + prop.agentId.slice(1)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-[#fbfff9] rounded-b-[18px]">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[#567177] mb-1 font-medium">
                      <MapPin size={13} className="text-[#234d4d] shrink-0" />
                      <span className="truncate">{prop.location}</span>
                    </div>

                    <h3 className="font-bold text-base text-[#10484b] group-hover:text-[#234d4d] transition line-clamp-1" style={{ fontFamily: '"Fraunces", Georgia, serif', letterSpacing: "-0.03em" }}>
                      {prop.name}
                    </h3>

                    <p className="text-[11px] text-[#6e897e] mt-0.5 font-medium">
                      Developer: {prop.developer}
                    </p>
                  </div>

                  {/* Specs 3-col */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#f4faea] rounded-xl border border-[#dfe6df] text-center text-xs">
                    <div>
                      <p className="text-[10px] text-[#6e897e] font-bold uppercase">Beds</p>
                      <p className="font-bold text-[#10484b]">{prop.beds} Suites</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6e897e] font-bold uppercase">Type</p>
                      <p className="font-bold text-[#10484b] truncate text-[10px]">{prop.type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6e897e] font-bold uppercase">Size</p>
                      <p className="font-bold text-[#10484b]">{prop.size}</p>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="pt-3 border-t border-[#dfe6df] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#6e897e] uppercase font-bold">Asking Price</p>
                      <p className="text-base font-black text-[#10484b]" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                        {formatRM(prop.price)}
                      </p>
                      <p className="text-[10px] text-[#6e897e]">~{formatRM(estMonthly)}/mo</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onOpenMatchmaker && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onOpenMatchmaker(prop); }}
                          className="px-3 py-2 bg-[#d7ef73] hover:bg-[#c9e361] text-[#10484b] rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm border border-[#10484b]/20"
                          title="Reverse Matchmaker: Match buyers for this property"
                        >
                          <Users size={12} className="text-[#10484b]" />
                          <span>Match Buyers</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenDossier(prop); }}
                        className="px-3.5 py-2 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm border border-[#234d4d]"
                      >
                        <Box size={13} />
                        <span>Inspect 3D</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6df] border border-[#234d4d] flex items-center justify-center">
            <Building2 size={24} className="text-[#10484b]" />
          </div>
          <h4 className="text-base font-bold text-[#10484b]">No listings found</h4>
          <p className="text-sm text-[#567177] max-w-xs">No developments match your current filters. Try resetting or switching to the full catalog view.</p>
          <button
            onClick={handleReset}
            className="mt-2 px-4 py-2 bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        </div>
      )}
    </section>
  );
}
