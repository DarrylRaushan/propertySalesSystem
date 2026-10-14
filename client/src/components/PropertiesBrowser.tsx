import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, BedDouble, BookmarkCheck, Box, Building2, ChevronLeft, ChevronRight, Compass, Eye, Globe, MapPin, Ruler, ScanLine, Search, Sparkles, User, Users, X } from "lucide-react";
import { toast } from "sonner";
import PropertyAccordionGallery from "./PropertyAccordionGallery";
import { getCarouselIndex, getFeaturedListings, getInventorySignals, getPropertyGalleryImages, getPropertyTypeCounts, propertyMatchesInventoryLens, type InventoryLens, type PropertyListing } from "./propertyBrowser";
import PropertyMapExplorer from "./PropertyMapExplorer";
import AgentTerrainListingsGrid from "./AgentTerrainListingsGrid";
import CustomerPropertyDetailModal from "./CustomerPropertyDetailModal";
import ReverseMatchmakerModal from "./ReverseMatchmakerModal";
import AgentHeader from "./AgentHeader";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import "./PropertiesBrowser.css";
import "./PropertiesGalleryEnhancement.css";
import "./PropertiesFeaturedGallery.css";
import "./PropertiesMarketBrowser.css";
import "./PropertyDossierEnhancement.css";
import "./PropertyDossierTerrainTheme.css";
import "./PropertyDossierGallery.css";

const formatRM = (value: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value).replace("MYR", "RM");

const marketLenses: Array<{ id: InventoryLens; label: string }> = [
  { id: "all", label: "Full index" },
  { id: "viewing", label: "View now" },
  { id: "launch", label: "New / offers" },
  { id: "saved", label: "Saved" },
];

export default function PropertiesBrowser({ properties, onBack }: { properties: PropertyListing[]; onBack: () => void }) {
  const { activeAgent } = useAuth();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [lens, setLens] = useState<InventoryLens>("all");
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<PropertyListing | null>(null);
  const [matchmakerProperty, setMatchmakerProperty] = useState<PropertyListing | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  // Agent scope toggle: "mine" = only active agent's, "all" = full catalog
  const [scope, setScope] = useState<"mine" | "all">("mine");

  // Filter by agent scope first
  const agentFilteredProperties = useMemo(() =>
    scope === "mine"
      ? properties.filter(p => !p.agentId || p.agentId === activeAgent.id)
      : properties,
    [properties, scope, activeAgent.id]
  );

  const typeCounts = useMemo(() => getPropertyTypeCounts(agentFilteredProperties), [agentFilteredProperties]);
  const inventorySignals = useMemo(() => getInventorySignals(agentFilteredProperties), [agentFilteredProperties]);
  const types = Object.keys(typeCounts);
  const results = useMemo(() => agentFilteredProperties.filter((property) => (type === "all" || property.type === type) && `${property.name} ${property.location} ${property.developer}`.toLowerCase().includes(query.toLowerCase())), [agentFilteredProperties, query, type]);
  const listingResults = useMemo(() => results.filter((property) => propertyMatchesInventoryLens(property, lens, savedIds)), [lens, results, savedIds]);
  const featured = useMemo(() => getFeaturedListings(results.length ? results : agentFilteredProperties), [results, agentFilteredProperties]);

  useEffect(() => { if (activeIndex >= featured.length) setActiveIndex(0); }, [activeIndex, featured.length]);

  const toggleSaved = (property: PropertyListing) => {
    setSavedIds((current) => current.includes(property.id) ? current.filter((id) => id !== property.id) : [...current, property.id]);
  };
  const openDossier = (property: PropertyListing) => { setGalleryIndex(0); setSelected(property); };
  const openMapDossier = openDossier;

  const myCount = properties.filter(p => !p.agentId || p.agentId === activeAgent.id).length;
  const allCount = properties.length;

  const activeProperty = featured[activeIndex];
  return (
    <div className="properties-workspace pb-24">
      <AgentHeader
        activePage="Properties"
        eyebrow="Market Inventory / Live Catalog"
        badgeText="Verified Developments"
        title={<>Properties <em>· Worth the Visit</em></>}
      />

      {/* Agent Scope Toggle — My Listings vs Full Market */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#234d4d]">Showing:</span>
          <div className="flex items-center gap-1 p-1 bg-[#f3f5ef] rounded-xl border border-[#dfe6df]">
            <button
              onClick={() => { setScope("mine"); setType("all"); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
                scope === "mine"
                  ? "bg-[#10484b] text-[#d7ef73] shadow-sm"
                  : "text-[#567177] hover:bg-[#eaf6df]"
              )}
            >
              <User className="size-3.5" />
              My Listings ({myCount})
            </button>
            <button
              onClick={() => { setScope("all"); setType("all"); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
                scope === "all"
                  ? "bg-[#10484b] text-[#d7ef73] shadow-sm"
                  : "text-[#567177] hover:bg-[#eaf6df]"
              )}
            >
              <Globe className="size-3.5" />
              Full Catalog ({allCount})
            </button>
          </div>
          {scope === "mine" && (
            <span className="text-[11px] text-[#567177] font-medium">
              Filtered to <strong className="text-[#10484b]">{activeAgent.name}</strong>'s active book
            </span>
          )}
        </div>
      </div>

      <div className="properties-workspace-main">
        <header className="properties-hero">
          <span className="properties-hero-radar" aria-hidden="true" />
          <div className="properties-hero-copy">
            <span><Sparkles size={14} /> {scope === "mine" ? `${activeAgent.name}'s Portfolio` : "Market inventory / Malaysia"}</span>
            <h2>Find the property<br /><em>worth the visit.</em></h2>
            <p>A more tactile read on available developments, inventory signals, and the listings your buyers are likely to ask about next.</p>
            <div className="property-hero-stats">
              <div><strong>{agentFilteredProperties.length}</strong><span>Curated listings</span></div>
              <div><strong>{types.length}</strong><span>Property types</span></div>
              <div><strong>RM {(inventorySignals.entryPrice / 1_000_000).toFixed(2)}M</strong><span>Entry point</span></div>
            </div>
            <div className="property-hero-signals">
              <span><Compass size={13} /><b>{inventorySignals.viewingReady}</b> viewing-ready</span>
              <span><ScanLine size={13} /><b>{inventorySignals.launchWindow}</b> launch window</span>
            </div>
          </div>
          <div className="properties-hero-actions">
            <b>COLLECTION / 2024</b>
            <button onClick={onBack}><ArrowLeft size={14} /> Dashboard</button>
            <span>Updated 4 min ago</span>
          </div>
        </header>

        <section className="properties-featured properties-featured--gallery">
          <div className="properties-featured-gallery-heading">
            <span>Featured inventory / expand to inspect</span>
            <p><b>{featured.length}</b> curated highlights · Select an expanded panel to open its dossier</p>
          </div>
          <PropertyAccordionGallery items={featured} activeIndex={activeIndex} onChange={setActiveIndex} onOpen={openDossier} />
        <aside className="properties-featured-panel">
          <span className="property-status">{activeProperty?.status}</span>
          <p>{activeProperty?.developer}</p>
          <h3>{activeProperty?.name}</h3>
          <div><MapPin size={14} /> {activeProperty?.location}</div>
          <strong>{activeProperty ? formatRM(activeProperty.price) : ""}</strong>
          <small>{activeProperty?.beds} bedrooms · {activeProperty?.size}</small>
          <div className="properties-featured-cues">
            <span><BadgeCheck size={13} /> 3D-ready</span>
            <span><Compass size={13} /> Buyer dossier</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => activeProperty && setMatchmakerProperty(activeProperty)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#d7ef73] hover:bg-[#c9e361] text-[#10484b] text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm border border-[#10484b]/20 cursor-pointer"
              title="Reverse Matchmaker: Match buyers from your CRM"
            >
              <Users size={13} /> Match Buyers
            </button>
            <button
              onClick={() => activeProperty && openDossier(activeProperty)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#234d4d] hover:bg-[#10484b] text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              Open listing <ChevronRight size={14} />
            </button>
          </div>
        </aside>
      </section>

      <section className="properties-browse">
        <div className="properties-browse-heading">
          <div>
            <span>Market browser</span>
            <h3>Interactive Availability Map</h3>
            <p>{listingResults.length} developments match the current map view.</p>
          </div>
          <div className="properties-type-pills">
            {["all", ...types].map((item) => (
              <button
                key={item}
                className={type === item ? "is-active" : ""}
                onClick={() => setType(item)}
              >
                {item === "all" ? "All inventory" : `${item} · ${typeCounts[item]}`}
              </button>
            ))}
          </div>
        </div>

        <div className="properties-market-ribbon">
          <div className="properties-market-signal">
            <ScanLine size={15} />
            <span><b>Field guide:</b> {inventorySignals.viewingReady} viewable now · {inventorySignals.launchWindow} in the launch window</span>
          </div>
          <div className="properties-market-lenses" aria-label="Inventory lens">
            {marketLenses.map((marketLens) => (
              <button
                key={marketLens.id}
                className={lens === marketLens.id ? "is-active" : ""}
                onClick={() => setLens(marketLens.id)}
              >
                {marketLens.id === "saved" && savedIds.length > 0 ? <BookmarkCheck size={12} /> : null}
                {marketLens.label}
                {marketLens.id === "saved" ? ` · ${savedIds.length}` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="properties-filter-bar">
          <label>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search developments, locations, developers on map..."
            />
          </label>
          {(query || type !== "all" || lens !== "all") && (
            <button onClick={() => { setQuery(""); setType("all"); setLens("all"); }}>
              <X size={14} /> Reset
            </button>
          )}
        </div>

        <PropertyMapExplorer
          items={listingResults}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
          onOpen={openMapDossier}
        />

        {listingResults.length === 0 && (
          <div className="properties-empty">
            <Building2 size={22} />
            <b>{lens === "saved" ? "No dossiers saved yet." : "No listings match this view."}</b>
            <span>{lens === "saved" ? "Use the bookmark in any listing card to keep it in this field guide." : "Reset the filters or broaden the market search."}</span>
          </div>
        )}
      </section>

      {/* Terrain-style Cards Grid matching Customer Portal design */}
      <AgentTerrainListingsGrid
        properties={agentFilteredProperties}
        savedIds={savedIds}
        onToggleSaved={toggleSaved}
        onOpenDossier={openDossier}
        onOpenMatchmaker={(prop) => setMatchmakerProperty(prop)}
        activeAgentId={activeAgent.id}
        scope={scope}
      />
      </div>

      {/* Sleek Modal Dossier for Property Agent Side */}
      <CustomerPropertyDetailModal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        property={selected}
        isAgentView={true}
        onOpenMatchmaker={(prop) => {
          setSelected(null);
          setMatchmakerProperty(prop);
        }}
      />

      {/* Reverse Property-to-Buyer Matchmaker Modal */}
      <ReverseMatchmakerModal
        isOpen={Boolean(matchmakerProperty)}
        onClose={() => setMatchmakerProperty(null)}
        property={matchmakerProperty}
      />
    </div>
  );
}
