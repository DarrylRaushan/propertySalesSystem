import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { BedDouble, MapPin, Ruler } from "lucide-react";
import type { PropertyListing } from "./propertyBrowser";
import { getAccordionIndex, getListingBadge } from "./propertyBrowser";
import "./PropertyAccordionGallery.css";

const BADGE_LABEL: Record<string, string> = {
  "investor-pick":    "Investor Pick",
  "open-for-viewing": "Open for Viewing",
  "new-launch":       "New Launch",
  "early-bird":       "Early Bird",
  "limited-units":    "Limited Units",
  "ready-to-move":    "Ready to Move In",
};


type PropertyAccordionGalleryProps = {
  items: PropertyListing[];
  activeIndex: number;
  onChange: (index: number) => void;
  onOpen: (property: PropertyListing) => void;
};

const formatRM = (value: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value).replace("MYR", "RM");

export default function PropertyAccordionGallery({ items, activeIndex, onChange, onOpen }: PropertyAccordionGalleryProps) {
  const panelRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mediaRefs = useRef<Array<HTMLImageElement | null>>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const featured = useMemo(() => items.slice(0, 5), [items]);
  const count = featured.length;
  const active = getAccordionIndex(activeIndex, count);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const expandedGrow = count > 1 ? (0.66 * (count - 1)) / (1 - 0.66) : 1;
    timelineRef.current?.kill();
    const timeline = gsap.timeline();
    panelRefs.current.forEach((panel, index) => {
      if (!panel) return;
      const isActive = index === active;
      const rotateY = isActive ? 0 : index < active ? 5 : -5;
      timeline.to(panel, { flexGrow: isActive ? expandedGrow : 1, rotateY, duration: reduceMotion ? 0 : 0.28, ease: "power3.out" }, 0);
      const media = mediaRefs.current[index];
      if (media) timeline.to(media, { scale: isActive ? 1.01 : 1.18, xPercent: isActive ? 0 : index < active ? 7 : -7, duration: reduceMotion ? 0 : 0.28, ease: "power3.out" }, 0);
    });
    timelineRef.current = timeline;
  }, [active, count]);

  useEffect(() => () => { timelineRef.current?.kill(); }, []);

  const activate = (index: number) => onChange(getAccordionIndex(index, count));
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); activate((index + 1) % count); }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); activate((index - 1 + count) % count); }
    if (event.key === "Home") { event.preventDefault(); activate(0); }
    if (event.key === "End") { event.preventDefault(); activate(count - 1); }
    if (event.key === "Enter" && featured[index]) { event.preventDefault(); index === active ? onOpen(featured[index]) : activate(index); }
  };

  if (!count) return null;

  return <div className="property-accordion-gallery" role="list" aria-label="Featured property accordion gallery">
    {featured.map((property, index) => {
      const isActive = index === active;
      const badge = getListingBadge(property);
      const badgeLabel = badge ? BADGE_LABEL[badge] ?? property.status : property.status;
      return <button key={property.id} ref={(element) => { panelRefs.current[index] = element; }} type="button" className={`property-accordion-panel ${isActive ? "is-active" : ""} ${property.featured ? "is-featured" : ""} ${badge ? `badge--${badge}` : ""}`} onMouseEnter={() => activate(index)} onFocus={() => activate(index)} onClick={() => isActive ? onOpen(property) : activate(index)} onKeyDown={(event) => onKeyDown(event, index)} role="listitem" aria-current={isActive || undefined} aria-label={`${property.name}, ${index + 1} of ${count}${isActive ? ", active; select to open dossier" : ""}`}>
        <img ref={(element) => { mediaRefs.current[index] = element; }} src={property.image} alt="" draggable={false} />
        <span className="property-accordion-panel__wash" aria-hidden="true" />
        <span className={`property-accordion-panel__status badge--${badge ?? "default"}`}>
          {property.featured && <span className="property-accordion-panel__star" aria-hidden="true">★</span>}
          {badgeLabel}
        </span>
        <span className="property-accordion-panel__rail" aria-hidden="true" />
        {isActive && <span className="property-accordion-panel__caption"><b>{property.name}</b><small><MapPin size={12} /> {property.location}</small><span className="property-accordion-panel__facts"><strong>{formatRM(property.price)}</strong><em><BedDouble size={11} /> {property.beds} bed <Ruler size={11} /> {property.size}</em></span><span className="property-accordion-panel__action">Open dossier <span aria-hidden="true">→</span></span></span>}
      </button>;
    })}
  </div>;
}
