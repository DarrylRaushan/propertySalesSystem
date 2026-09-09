import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BedDouble,
  Bookmark,
  BookmarkCheck,
  Box,
  Building2,
  Filter,
  Grid3X3,
  Layers,
  MapPin,
  RotateCcw,
  Ruler,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPropertyState,
  type PropertyListing,
} from "./propertyBrowser";
import "./PropertyListingsGrid.css";

interface PropertyListingsGridProps {
  properties: PropertyListing[];
  savedIds: number[];
  onToggleSaved: (property: PropertyListing) => void;
  onOpenDossier: (property: PropertyListing) => void;
}

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("MYR", "RM");

export default function PropertyListingsGrid({
  properties,
  savedIds,
  onToggleSaved,
  onOpenDossier,
}: PropertyListingsGridProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedBeds, setSelectedBeds] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [sortBy, setSortBy] = useState<
    "featured" | "price-asc" | "price-desc" | "beds-desc" | "name-asc"
  >("featured");

  // Get distinct property types
  const types = useMemo(() => {
    const set = new Set(properties.map((p) => p.type));
    return Array.from(set);
  }, [properties]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = properties.length;
    const minPrice = total
      ? Math.min(...properties.map((p) => p.price))
      : 0;
    const maxPrice = total
      ? Math.max(...properties.map((p) => p.price))
      : 0;
    return { total, minPrice, maxPrice };
  }, [properties]);

  // Filtered & Sorted listings
  const filteredListings = useMemo(() => {
    return properties
      .filter((prop) => {
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            prop.name.toLowerCase().includes(q) ||
            prop.developer.toLowerCase().includes(q) ||
            prop.location.toLowerCase().includes(q) ||
            prop.type.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Type filter
        if (selectedType !== "all" && prop.type !== selectedType) {
          return false;
        }

        // Bedrooms filter
        if (selectedBeds !== "all") {
          if (selectedBeds === "4+" && prop.beds < 4) return false;
          if (selectedBeds !== "4+" && String(prop.beds) !== selectedBeds)
            return false;
        }

        // State filter
        if (selectedState !== "all") {
          const state = getPropertyState(prop.location);
          if (state !== selectedState) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "beds-desc") return b.beds - a.beds;
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        return 0; // featured / default
      });
  }, [
    properties,
    search,
    selectedType,
    selectedBeds,
    selectedState,
    sortBy,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedType !== "all" ||
    selectedBeds !== "all" ||
    selectedState !== "all" ||
    sortBy !== "featured";

  const handleReset = () => {
    setSearch("");
    setSelectedType("all");
    setSelectedBeds("all");
    setSelectedState("all");
    setSortBy("featured");
  };

  return (
    <section
      className="property-grid-section"
      aria-label="Traditional property listings grid"
    >
      {/* Section Header */}
      <div className="property-grid-header">
        <div className="property-grid-heading-copy">
          <span>
            <Grid3X3 size={15} /> Traditional Catalog / Complete Inventory
          </span>
          <h3>All Property Listings</h3>
          <p>
            Explore all current Malaysian developments with classic grid browsing,
            detailed specifications, and direct access to 3D unit models.
          </p>
        </div>

        <div className="property-grid-stats-pills">
          <div className="property-grid-stat-pill">
            <span>Active Listings:</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="property-grid-stat-pill">
            <span>Starting from:</span>
            <strong>{formatRM(stats.minPrice)}</strong>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="property-grid-toolbar">
        {/* Main Search Row */}
        <div className="property-grid-search-row">
          <div className="property-grid-search-input">
            <Search size={17} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project name, developer, or location (e.g. Asteria, Selangor, EcoWorld)..."
            />
          </div>

          <div className="property-grid-quick-actions">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="property-grid-sort-select"
              aria-label="Sort listings"
            >
              <option value="featured">Sort: Featured (Default)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="beds-desc">Bedrooms: Most to Least</option>
              <option value="name-asc">Name: A to Z</option>
            </select>

            {/* State Filter Dropdown */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="property-grid-sort-select"
              aria-label="Filter by region"
            >
              <option value="all">All States</option>
              <option value="Selangor">Selangor</option>
              <option value="Kuala Lumpur">Kuala Lumpur</option>
              <option value="Johor">Johor</option>
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="property-grid-reset-btn"
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Chips Row */}
        <div className="property-grid-chips-row">
          {/* Property Types */}
          <div className="property-grid-type-chips">
            <button
              onClick={() => setSelectedType("all")}
              className={`property-grid-chip ${selectedType === "all" ? "is-active" : ""}`}
            >
              All Types ({properties.length})
            </button>
            {types.map((type) => {
              const count = properties.filter((p) => p.type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`property-grid-chip ${selectedType === type ? "is-active" : ""}`}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>

          {/* Bedroom Filter Chips */}
          <div className="property-grid-bed-chips">
            <span className="text-[12px] font-bold text-[#62776f] mr-1">
              Beds:
            </span>
            {["all", "2", "3", "4+"].map((bed) => (
              <button
                key={bed}
                onClick={() => setSelectedBeds(bed)}
                className={`property-grid-chip ${selectedBeds === bed ? "is-active" : ""}`}
              >
                {bed === "all" ? "Any" : `${bed} Beds`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header Summary */}
      <div className="property-grid-results-summary">
        <span>
          Showing <b>{filteredListings.length}</b> of <b>{properties.length}</b>{" "}
          listings
          {hasActiveFilters && " matching filters"}
        </span>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-[13px] font-bold text-[#2a6860] hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Traditional Grid View */}
      {filteredListings.length > 0 ? (
        <div className="traditional-property-grid">
          {filteredListings.map((prop) => {
            const isSaved = savedIds.includes(prop.id);
            const estMonthly = Math.round(prop.price * 0.0042);

            return (
              <article key={prop.id} className="traditional-property-card">
                {/* Image Container */}
                <div className="traditional-property-image-container">
                  <img
                    src={prop.image}
                    alt={prop.name}
                    loading="lazy"
                  />

                  {/* Status Badge */}
                  <span className="traditional-property-status-badge">
                    {prop.status}
                  </span>

                  {/* Bookmark Button */}
                  <button
                    onClick={() => {
                      onToggleSaved(prop);
                      toast.success(
                        isSaved
                          ? `Removed ${prop.name} from saved dossiers`
                          : `Saved ${prop.name} to dossiers`
                      );
                    }}
                    className={`traditional-property-bookmark-btn ${isSaved ? "is-saved" : ""}`}
                    aria-label={
                      isSaved
                        ? `Remove ${prop.name} from saved`
                        : `Save ${prop.name}`
                    }
                    title={isSaved ? "Saved in Dossiers" : "Save Listing"}
                  >
                    {isSaved ? (
                      <BookmarkCheck size={17} />
                    ) : (
                      <Bookmark size={17} />
                    )}
                  </button>

                  {/* 3D Model Availability Badge */}
                  <span className="traditional-property-3d-badge">
                    <Box size={13} />
                    <span>3D Tour</span>
                  </span>
                </div>

                {/* Body Details */}
                <div className="traditional-property-body">
                  <p className="traditional-property-developer">
                    {prop.developer}
                  </p>
                  <h4 className="traditional-property-title">{prop.name}</h4>
                  <p className="traditional-property-location">
                    <MapPin size={14} className="shrink-0 text-[#4c8477]" />
                    <span className="truncate">{prop.location}</span>
                  </p>

                  {/* Specs Row */}
                  <div className="traditional-property-specs-grid">
                    <div className="traditional-property-spec-item">
                      <span>
                        <Building2 size={12} /> Type
                      </span>
                      <strong className="truncate">{prop.type}</strong>
                    </div>
                    <div className="traditional-property-spec-item">
                      <span>
                        <BedDouble size={12} /> Beds
                      </span>
                      <strong>{prop.beds} Beds</strong>
                    </div>
                    <div className="traditional-property-spec-item">
                      <span>
                        <Ruler size={12} /> Size
                      </span>
                      <strong>{prop.size}</strong>
                    </div>
                  </div>

                  {/* Price and Action Footer */}
                  <div className="traditional-property-footer">
                    <div className="traditional-property-price-line">
                      <span className="traditional-property-price">
                        {formatRM(prop.price)}
                      </span>
                      <span className="traditional-property-est">
                        est. {formatRM(estMonthly)}/mo
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenDossier(prop)}
                      className="traditional-property-action-btn"
                    >
                      <Box size={15} />
                      <span>Inspect 3D Dossier</span>
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="traditional-property-empty">
          <div className="traditional-property-empty-icon">
            <Building2 size={26} />
          </div>
          <h4>No property listings found</h4>
          <p>
            We couldn't find any developments matching your current search and
            filter criteria. Try resetting or adjusting the keywords.
          </p>
          <button onClick={handleReset}>
            <RotateCcw size={14} />
            <span>Reset Search & Filters</span>
          </button>
        </div>
      )}
    </section>
  );
}
