import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowUpRight, Bookmark, BookmarkCheck,
  Building2, ChevronLeft, ChevronRight, Compass, Layers3,
  MapPin, Ruler, ScanLine, TrendingUp, Zap,
} from "lucide-react";
import {
  getListingBadge,
  getPropertyMapPinPosition,
  getPropertyState,
  getPropertyStateCounts,
  shouldOpenMapPropertyDossier,
  type PropertyBadge,
  type PropertyListing,
  type PropertyState,
} from "./propertyBrowser";
import MapModelViewer from "./MapModelViewer";
import "./PropertyMapExplorer.css";

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 })
    .format(value)
    .replace("MYR", "RM");

const BADGE_LABEL: Record<string, string> = {
  "investor-pick":    "Investor Pick",
  "open-for-viewing": "Open for Viewing",
  "new-launch":       "New Launch",
  "early-bird":       "Early Bird",
  "limited-units":    "Limited Units",
  "ready-to-move":    "Ready to Move In",
};

const BADGE_COLOUR: Record<string, string> = {
  "investor-pick":    "badge-chip--gold",
  "open-for-viewing": "badge-chip--teal",
  "new-launch":       "badge-chip--violet",
  "early-bird":       "badge-chip--orange",
  "limited-units":    "badge-chip--rose",
  "ready-to-move":    "badge-chip--green",
};

const SIGNAL_ICON: Record<string, React.ReactNode> = {
  "investor-pick":    <TrendingUp size={11} />,
  "open-for-viewing": <Compass size={11} />,
  "new-launch":       <Zap size={11} />,
  "early-bird":       <Zap size={11} />,
};

const mapStates: Array<{ state: PropertyState; x: number; y: number; label: string }> = [
  { state: "Selangor",    x: 37, y: 64, label: "SELANGOR" },
  { state: "Kuala Lumpur", x: 58, y: 57, label: "KUALA LUMPUR" },
  { state: "Johor",       x: 77, y: 69, label: "JOHOR" },
];

type PropertyMapExplorerProps = {
  items: PropertyListing[];
  savedIds: number[];
  onToggleSaved: (property: PropertyListing) => void;
  onOpen: (property: PropertyListing) => void;
};

export default function PropertyMapExplorer({ items, savedIds, onToggleSaved, onOpen }: PropertyMapExplorerProps) {
  const [activeState, setActiveState]           = useState<PropertyState | null>(null);
  const [activePropertyId, setActivePropertyId] = useState<number | null>(items[0]?.id ?? null);
  const [panelKey, setPanelKey]                 = useState(0);        // forces re-animation on property change
  const [bearing, setBearing]                   = useState(0);        // compass needle rotation
  const bearingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stateCounts   = useMemo(() => getPropertyStateCounts(items), [items]);
  const visibleItems  = useMemo(
    () => activeState ? items.filter((p) => getPropertyState(p.location) === activeState) : items,
    [activeState, items],
  );

  useEffect(() => {
    if (!visibleItems.some((p) => p.id === activePropertyId))
      setActivePropertyId(visibleItems[0]?.id ?? null);
  }, [activePropertyId, visibleItems]);

  // Slowly drift the compass needle for ambience
  useEffect(() => {
    bearingTimer.current = setInterval(() => setBearing((b) => (b + 0.15) % 360), 60);
    return () => { if (bearingTimer.current) clearInterval(bearingTimer.current); };
  }, []);

  if (!items.length || !visibleItems.length) return null;

  const activeProperty  = visibleItems.find((p) => p.id === activePropertyId) ?? visibleItems[0];
  const activeIndex     = visibleItems.findIndex((p) => p.id === activeProperty.id);
  const activeIsSaved   = savedIds.includes(activeProperty.id);
  const selectedState   = getPropertyState(activeProperty.location);
  const badge: PropertyBadge = getListingBadge(activeProperty);
  const badgeLabel      = badge ? (BADGE_LABEL[badge] ?? activeProperty.status) : activeProperty.status;
  const badgeColour     = badge ? (BADGE_COLOUR[badge] ?? "") : "";
  const signalIcon      = badge ? (SIGNAL_ICON[badge] ?? <ScanLine size={11} />) : <ScanLine size={11} />;

  const selectProperty = (property: PropertyListing) => {
    setActivePropertyId(property.id);
    setPanelKey((k) => k + 1);
  };

  const cycleProperty = (dir: 1 | -1) => {
    const next = (activeIndex + dir + visibleItems.length) % visibleItems.length;
    selectProperty(visibleItems[next]);
  };

  const enterState = (state: PropertyState) => {
    setActiveState(state);
    const first = items.find((p) => getPropertyState(p.location) === state);
    if (first) selectProperty(first);
  };

  return (
    <section
      className={`property-map-explorer${activeState ? " is-drilled" : ""}`}
      aria-label="Property availability map explorer"
    >
      {/* ── Left: Map canvas ──────────────────────────────────────────────── */}
      <div className="property-map-explorer__map">
        <MapModelViewer>
          {/* Terrain geometry */}
          <div className="property-map-explorer__terrain" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>

          {/* Road network SVG */}
          <svg
            className="property-map-explorer__roads"
            viewBox="0 0 1000 620"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M70 105C190 155 192 264 316 295s197-24 288 55 154 58 314 54" />
            <path d="M128 440c120-49 183-174 301-127s137 104 260 84 171-109 246-163" />
            <path d="M278 70c-37 156 59 174 73 285s-70 157-125 222" />
            <path d="M536 28c13 128 140 183 176 274s-41 151 53 283" />
            <path d="M96 352c166 5 192 123 291 99s119-101 218-98 134 109 316 77" />
            {/* Highlight route */}
            <path className="property-map-explorer__roads-highlight" d="M200 200c80 30 110 90 180 110s140-10 200 50" />
          </svg>

          {/* Scan-line grid overlay */}
          <div className="property-map-explorer__scan-overlay" aria-hidden="true" />

          {!activeState ? (
            /* ── State overview ─────────────────────────────────────────── */
            <>
              {mapStates.map(({ state, x, y, label }) => {
                const count = stateCounts[state] ?? 0;
                const ringPct = count / Math.max(...Object.values(stateCounts).map(v => v ?? 1), 1) * 100;
                return (
                  <button
                    key={state}
                    className="property-map-explorer__state-region"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => enterState(state)}
                    aria-label={`Explore ${state} — ${count} properties`}
                  >
                    {/* Animated count ring */}
                    <svg className="property-map-explorer__count-ring" viewBox="0 0 36 36" aria-hidden="true">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(215,239,115,.18)" strokeWidth="2.5" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="#d7ef73" strokeWidth="2.5"
                        strokeDasharray={`${ringPct} 100`}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                        style={{ transition: "stroke-dasharray 800ms ease-out" }}
                      />
                    </svg>
                    <i><Layers3 size={16} /></i>
                    <span>
                      <b>{label}</b>
                      <small>{count} properties</small>
                    </span>
                  </button>
                );
              })}
              <div className="property-map-explorer__district district--north">NORTHWEST CORRIDOR</div>
              <div className="property-map-explorer__district district--central">CENTRAL REGION</div>
              <div className="property-map-explorer__district district--south">SOUTHERN CORRIDOR</div>
            </>
          ) : (
            /* ── Drilled-in state pins ──────────────────────────────────── */
            <>
              {/* State spotlight overlay */}
              <div className="property-map-explorer__spotlight" aria-hidden="true" />

              {visibleItems.map((property, index) => {
                const position = getPropertyMapPinPosition(index);
                const isActive = property.id === activeProperty.id;
                const pb: PropertyBadge = getListingBadge(property);
                const pinBadge = pb ? BADGE_COLOUR[pb] : "";
                const handlePin = () => {
                  if (shouldOpenMapPropertyDossier(activeProperty.id, property.id)) {
                    onOpen(property);
                    return;
                  }
                  selectProperty(property);
                };
                return (
                  <button
                    key={property.id}
                    className={`property-map-explorer__pin${isActive ? " is-active" : ""} ${pinBadge}`}
                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                    onClick={handlePin}
                    aria-pressed={isActive}
                    aria-label={
                      isActive
                        ? `Open 3D dossier for ${property.name}`
                        : `Select ${property.name}, ${property.location}`
                    }
                  >
                    <i><MapPin size={15} /></i>
                    {isActive && (
                      <span>
                        <em>{pb ? BADGE_LABEL[pb] ?? property.status : property.status}</em>
                        <b>{property.name}</b>
                        <small>{formatRM(property.price)}</small>
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="property-map-explorer__district district--focus">
                {activeState.toUpperCase()} AVAILABILITY
              </div>
            </>
          )}
        </MapModelViewer>

        {/* Map head */}
        <div className="property-map-explorer__map-head">
          <div>
            <span>
              <Compass size={13} />
              {activeState ? `State map / ${activeState}` : "Inventory map / indicative"}
            </span>
            <h4>
              {activeState
                ? <>{activeState}<br /><em>availability.</em></>
                : <>Where availability<br /><em>is gathering.</em></>}
            </h4>
          </div>
          <div>
            <b>{activeState ? visibleItems.length : items.length}</b>
            <span>{activeState ? "state pins" : "active pins"}</span>
          </div>
        </div>

        {/* Back / instruction strip */}
        {activeState
          ? (
            <button className="property-map-explorer__back" onClick={() => setActiveState(null)}>
              <ArrowLeft size={14} /> Malaysia overview
            </button>
          )
          : <span className="property-map-explorer__instruction">Select a state region to zoom into its availability.</span>}

        {/* Legend */}
        <div className="property-map-explorer__legend">
          <span><i className="is-active" /> {activeState ? "Selected property" : "Select state"}</span>
          <span><i /> {activeState ? "State inventory" : "State availability"}</span>
        </div>

        {/* Compass rose */}
        <div
          className="property-map-explorer__compass"
          aria-hidden="true"
          style={{ "--compass-bearing": `${bearing}deg` } as React.CSSProperties}
        >
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="rgba(215,239,115,.22)" strokeWidth="1" />
            <polygon points="20,4 23,20 20,18 17,20" fill="#d7ef73" opacity=".9" />
            <polygon points="20,36 23,20 20,22 17,20" fill="rgba(215,239,115,.35)" />
            <circle cx="20" cy="20" r="2.5" fill="#d7ef73" />
          </svg>
          <span>N</span>
        </div>

        {/* Drilled-state cycle controls */}
        {activeState && visibleItems.length > 1 && (
          <div className="property-map-explorer__cycle">
            <button onClick={() => cycleProperty(-1)} aria-label="Previous property">
              <ChevronLeft size={14} />
            </button>
            <span>{activeIndex + 1} / {visibleItems.length}</span>
            <button onClick={() => cycleProperty(1)} aria-label="Next property">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Right: Property detail panel ──────────────────────────────────── */}
      <aside className="property-map-explorer__panel">
        <div className="property-map-explorer__brief-label">
          <ScanLine size={13} /> Selected property / preliminary brief
        </div>

        {/* Animated card — key forces CSS re-entry animation on change */}
        <div className="property-map-explorer__selection" key={panelKey}>
          <div className="property-map-explorer__selection-image">
            <img src={activeProperty.image} alt="" />
            {/* Badge chip over photo */}
            <span className={`badge-chip ${badgeColour}`}>
              {signalIcon}{badgeLabel}
            </span>
            <button
              className={activeIsSaved ? "is-saved" : ""}
              onClick={() => onToggleSaved(activeProperty)}
              aria-pressed={activeIsSaved}
              aria-label={`${activeIsSaved ? "Remove" : "Save"} ${activeProperty.name} dossier`}
            >
              {activeIsSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          </div>
          <div className="property-map-explorer__selection-copy">
            <p>{activeProperty.developer}</p>
            <h5>{activeProperty.name}</h5>
            <span><MapPin size={13} /> {activeProperty.location}</span>
            <strong>{formatRM(activeProperty.price)}</strong>
            <small>{activeProperty.beds} bed · {activeProperty.size}</small>
          </div>
        </div>

        {/* Stats grid */}
        <div className="property-map-explorer__brief-grid">
          <div>
            <span><Building2 size={13} /> Property type</span>
            <b>{activeProperty.type}</b>
          </div>
          <div>
            <span><Layers3 size={13} /> State</span>
            <b>{selectedState}</b>
          </div>
          <div>
            <span><Ruler size={13} /> Built-up</span>
            <b>{activeProperty.size}</b>
          </div>
        </div>

        {/* Availability signal */}
        <div className="property-map-explorer__availability">
          <span>Availability signal</span>
          <b className={`availability-badge ${badgeColour}`}>{signalIcon}{badgeLabel}</b>
          <p>This listing is shown within the current {activeState ?? "Malaysia"} availability view.</p>
        </div>

        {/* Thumbnail rail — quick-switch */}
        {activeState && visibleItems.length > 1 && (
          <div className="property-map-explorer__rail">
            {visibleItems.map((property) => {
              const isActive = property.id === activeProperty.id;
              return (
                <button
                  key={property.id}
                  className={`property-map-explorer__rail-thumb${isActive ? " is-active" : ""}`}
                  onClick={() => selectProperty(property)}
                  aria-pressed={isActive}
                  aria-label={property.name}
                >
                  <img src={property.image} alt="" />
                  {isActive && <span className="property-map-explorer__rail-active-ring" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="property-map-explorer__actions">
          <button onClick={() => onOpen(activeProperty)}>
            Open full dossier <ArrowUpRight size={15} />
          </button>
          <span>REF / {String(activeProperty.id).padStart(2, "0")}</span>
        </div>

        <div className="property-map-explorer__footnote">
          Map geometry is an illustrative state-level availability view for property exploration.
        </div>
      </aside>
    </section>
  );
}
