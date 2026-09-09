import { useEffect, useRef, useState, type KeyboardEvent, type WheelEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Bookmark, BookmarkCheck, ChevronDown, Compass, MapPin, Ruler } from "lucide-react";
import { getDiscoveryRailIndex, type PropertyListing } from "./propertyBrowser";
import "./PropertyDiscoveryRail.css";

const formatRM = (value: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value).replace("MYR", "RM");

type PropertyDiscoveryRailProps = {
  items: PropertyListing[];
  savedIds: number[];
  onToggleSaved: (property: PropertyListing) => void;
  onOpen: (property: PropertyListing) => void;
};

export default function PropertyDiscoveryRail({ items, savedIds, onToggleSaved, onOpen }: PropertyDiscoveryRailProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const wheelAccumulator = useRef(0);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [activeIndex, items.length]);

  if (!items.length) return null;

  const activeProperty = items[activeIndex];
  const isSaved = savedIds.includes(activeProperty.id);
  const setRailIndex = (index: number) => setActiveIndex(getDiscoveryRailIndex(index, items.length));
  const moveRail = (step: number) => setRailIndex(activeIndex + step);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    wheelAccumulator.current += event.deltaY;
    if (Math.abs(wheelAccumulator.current) < 42) return;
    event.preventDefault();
    moveRail(wheelAccumulator.current > 0 ? 1 : -1);
    wheelAccumulator.current = 0;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      moveRail(1);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveRail(-1);
    }
  };

  return <section className="property-discovery-rail" aria-label="Property discovery rail">
    <aside className="property-discovery-rail__intro">
      <span>Discovery rail / {String(activeIndex + 1).padStart(2, "0")}</span>
      <h4>One property.<br /><em>One next move.</em></h4>
      <p>Scroll over the image or use the arrow keys to move through the collection. Select an index to jump directly.</p>
      <div className="property-discovery-rail__keys" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd><span>Browse</span></div>
    </aside>
    <div className="property-discovery-rail__stage" tabIndex={0} onWheel={handleWheel} onKeyDown={handleKeyDown} aria-label="Use arrow keys or mouse wheel to browse properties">
      <article className="property-discovery-rail__card" key={activeProperty.id}>
        <img src={activeProperty.image} alt="" />
        <div className="property-discovery-rail__veil" />
        <span className="property-discovery-rail__status">{activeProperty.status}</span>
        <span className="property-discovery-rail__dossier">DOSSIER / {String(activeProperty.id).padStart(2, "0")}</span>
        <button className={`property-discovery-rail__save${isSaved ? " is-saved" : ""}`} onClick={() => onToggleSaved(activeProperty)} aria-pressed={isSaved} aria-label={`${isSaved ? "Remove" : "Save"} ${activeProperty.name} dossier`}>{isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}</button>
        <div className="property-discovery-rail__content">
          <p>{activeProperty.developer}</p>
          <h5>{activeProperty.name}</h5>
          <span><MapPin size={13} /> {activeProperty.location}</span>
          <div className="property-discovery-rail__facts"><strong>{formatRM(activeProperty.price)}</strong><small><Compass size={12} /> {activeProperty.type}</small><small><Ruler size={12} /> {activeProperty.beds} bed · {activeProperty.size}</small></div>
          <button onClick={() => onOpen(activeProperty)}>Open dossier <ArrowUpRight size={15} /></button>
        </div>
      </article>
      <div className="property-discovery-rail__controls"><button onClick={() => moveRail(-1)} aria-label="Previous property"><ArrowUp size={15} /></button><button onClick={() => moveRail(1)} aria-label="Next property"><ArrowDown size={15} /></button></div>
    </div>
    <nav className="property-discovery-rail__index" aria-label="Property collection index">
      {items.map((property, index) => <button key={property.id} className={index === activeIndex ? "is-active" : ""} onClick={() => setRailIndex(index)} aria-current={index === activeIndex ? "true" : undefined}><span>{String(index + 1).padStart(2, "0")}</span><b>{property.name}</b><small>{property.status}</small><ChevronDown size={14} /></button>)}
    </nav>
  </section>;
}
