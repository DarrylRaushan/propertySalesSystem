import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { PropertyListing } from "./propertyBrowser";
import { getCarouselSnapPosition, getSeamlessCarouselIndex } from "./propertyBrowser";
import "./PropertyDepthCarousel.css";
import "./PropertyDepthCarouselEnhancement.css";
import "./PropertyDepthCarouselSeamless.css";

type PropertyDepthCarouselProps = {
  items: PropertyListing[];
  activeIndex: number;
  onChange: (index: number) => void;
  onOpen: (property: PropertyListing) => void;
};

type DragState = {
  source: "pointer" | "touch" | "mouse";
  pointerId: number;
  startX: number;
  startPosition: number;
  lastX: number;
  lastTime: number;
  velocityInCards: number;
  moved: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function PropertyDepthCarousel({ items, activeIndex, onChange, onOpen }: PropertyDepthCarouselProps) {
  const rootRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const positionRef = useRef(activeIndex);
  const activeRef = useRef(activeIndex);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const wheelTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const internalChangeRef = useRef(false);
  const [displayActive, setDisplayActive] = useState(activeIndex);
  const [isDragging, setIsDragging] = useState(false);
  const visibleItems = useMemo(() => items.slice(0, 5), [items]);
  const count = visibleItems.length;
  const active = visibleItems[displayActive];

  const getStepWidth = useCallback(() => Math.max((rootRef.current?.clientWidth || 300) * 0.52, 112), []);

  const layout = useCallback((position: number) => {
    if (!count) return;
    const dragging = Boolean(dragRef.current?.moved);
    visibleItems.forEach((_, index) => {
      const card = cardRefs.current[index];
      if (!card) return;
      let distance = index - position;
      distance = ((distance % count) + count) % count;
      if (distance > count / 2) distance -= count;
      const distanceAhead = Math.max(distance, 0);
      const absoluteDistance = Math.abs(distance);
      const shown = absoluteDistance <= 3.35;
      const opacity = distance < 0 ? clamp(1 + distance, 0, 1) : shown ? 1 : 0;
      const brightness = clamp(1 - distanceAhead * 0.15, 0.24, 1);
      const blur = clamp(distanceAhead * 0.65, 0, 3.2);
      const translateX = distance * 55;
      const translateZ = -distanceAhead * 126;
      const rotateY = -clamp(distance, 0, 1) * 15;
      const scale = 1 - distanceAhead * 0.048;
      card.style.transform = `translate(-50%, -50%) translateX(${translateX.toFixed(2)}px) translateZ(${translateZ.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);
      card.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blur.toFixed(2)}px)`;
      card.style.zIndex = String(Math.round(2000 - distance * 24));
      card.style.pointerEvents = shown && opacity > 0.08 ? "auto" : "none";
      card.style.transition = dragging ? "opacity 90ms linear, filter 90ms linear" : "transform 260ms cubic-bezier(.23,1,.32,1), opacity 160ms ease-out, filter 220ms ease-out";
    });
  }, [count, visibleItems]);

  const syncActive = useCallback((position: number) => {
    const nextIndex = getSeamlessCarouselIndex(position, count);
    if (nextIndex === activeRef.current) return;
    activeRef.current = nextIndex;
    setDisplayActive(nextIndex);
    internalChangeRef.current = true;
    onChange(nextIndex);
  }, [count, onChange]);

  const settleTo = useCallback((target: number, animate = true) => {
    if (!count) return;
    tweenRef.current?.kill();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const proxy = { position: positionRef.current };
    const duration = animate && !reduceMotion ? 0.34 : 0;
    tweenRef.current = gsap.to(proxy, {
      position: target,
      duration,
      ease: "power3.out",
      onUpdate: () => {
        positionRef.current = proxy.position;
        layout(proxy.position);
        syncActive(proxy.position);
      },
      onComplete: () => {
        positionRef.current = target;
        layout(target);
        syncActive(target);
      },
    });
  }, [count, layout, syncActive]);

  const move = useCallback((step: number) => settleTo(positionRef.current + step), [settleTo]);

  const focusIndex = useCallback((index: number, animate = true) => {
    if (!count) return;
    const requested = ((index % count) + count) % count;
    const current = getSeamlessCarouselIndex(positionRef.current, count);
    let delta = requested - current;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    settleTo(positionRef.current + delta, animate);
  }, [count, settleTo]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "Enter" && active) { event.preventDefault(); onOpen(active); }
  };

  const startDrag = (source: DragState["source"], pointerId: number, clientX: number) => {
    tweenRef.current?.kill();
    dragRef.current = { source, pointerId, startX: clientX, startPosition: positionRef.current, lastX: clientX, lastTime: performance.now(), velocityInCards: 0, moved: false };
    setIsDragging(true);
  };

  const continueDrag = (pointerId: number, clientX: number) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    const now = performance.now();
    const deltaX = clientX - drag.startX;
    const stepWidth = getStepWidth();
    drag.velocityInCards = -((clientX - drag.lastX) / Math.max(now - drag.lastTime, 1)) / stepWidth;
    drag.lastX = clientX;
    drag.lastTime = now;
    if (Math.abs(deltaX) > 4) drag.moved = true;
    const position = drag.startPosition - deltaX / stepWidth;
    positionRef.current = position;
    layout(position);
    syncActive(position);
  };

  const finishDrag = (pointerId: number, clientX: number) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    continueDrag(pointerId, clientX);
    suppressClickRef.current = drag.moved;
    dragRef.current = null;
    setIsDragging(false);
    const target = getCarouselSnapPosition(positionRef.current, drag.velocityInCards);
    settleTo(target, drag.moved);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startDrag("pointer", event.pointerId, event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => continueDrag(event.pointerId, event.clientX);
  const onPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    finishDrag(event.pointerId, event.clientX);
  };
  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => { const touch = event.touches[0]; if (touch) startDrag("touch", touch.identifier, touch.clientX); };
  const onTouchMove = (event: React.TouchEvent<HTMLElement>) => { const drag = dragRef.current; const touch = Array.from(event.touches).find((item) => item.identifier === drag?.pointerId); if (drag?.source === "touch" && touch) continueDrag(touch.identifier, touch.clientX); };
  const onTouchEnd = (event: React.TouchEvent<HTMLElement>) => { const drag = dragRef.current; const touch = Array.from(event.changedTouches).find((item) => item.identifier === drag?.pointerId); if (drag?.source === "touch" && touch) finishDrag(touch.identifier, touch.clientX); };
  const onMouseDown = (event: React.MouseEvent<HTMLElement>) => { if (event.button === 0) startDrag("mouse", 0, event.clientX); };
  const onMouseMove = (event: React.MouseEvent<HTMLElement>) => { if (dragRef.current?.source === "mouse") continueDrag(0, event.clientX); };
  const onMouseUp = (event: React.MouseEvent<HTMLElement>) => { if (dragRef.current?.source === "mouse") finishDrag(0, event.clientX); };

  const onWheel = useCallback((event: WheelEvent) => {
    if (count < 2) return;
    event.preventDefault();
    tweenRef.current?.kill();
    const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const normalizedDelta = event.deltaMode === 1 ? rawDelta * 24 : rawDelta;
    const position = positionRef.current + clamp(normalizedDelta / (getStepWidth() * 1.1), -0.62, 0.62);
    positionRef.current = position;
    layout(position);
    syncActive(position);
    if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(() => settleTo(getCarouselSnapPosition(positionRef.current), true), 120);
  }, [count, getStepWidth, layout, settleTo, syncActive]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => { root.removeEventListener("wheel", onWheel); if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current); };
  }, [onWheel]);

  useEffect(() => {
    if (!count) return;
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }
    positionRef.current = activeIndex;
    activeRef.current = activeIndex;
    setDisplayActive(activeIndex);
    requestAnimationFrame(() => layout(activeIndex));
  }, [activeIndex, count, layout]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => layout(positionRef.current));
    observer.observe(root);
    return () => observer.disconnect();
  }, [layout]);

  useEffect(() => () => { tweenRef.current?.kill(); }, []);

  const onCardClick = (property: PropertyListing, index: number) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    if (index === displayActive) onOpen(property); else focusIndex(index);
  };

  if (!active) return null;

  return <section ref={rootRef} className="property-depth-carousel" role="region" aria-roledescription="carousel" aria-label="Featured properties. Drag, swipe, or scroll to browse." tabIndex={0} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
    <div className={`property-depth-carousel__viewport ${isDragging ? "is-dragging" : ""}`}>
      <span className="property-depth-carousel__grid" aria-hidden="true" />
      <span className="property-depth-carousel__corner property-depth-carousel__corner--one" aria-hidden="true" />
      <span className="property-depth-carousel__corner property-depth-carousel__corner--two" aria-hidden="true" />
      <div className="property-depth-carousel__stage">
        {visibleItems.map((property, index) => <button key={property.id} ref={(element) => { cardRefs.current[index] = element; }} type="button" className={`property-depth-carousel__card ${index === displayActive ? "is-active" : ""}`} aria-label={`${property.name}, ${index + 1} of ${count}`} aria-current={index === displayActive || undefined} onClick={() => onCardClick(property, index)}>
          <img src={property.image} alt="" draggable={false} />
          <span className="property-depth-carousel__shade" />
          <span className="property-depth-carousel__status">{property.status}</span>
          {index === displayActive && <span className="property-depth-carousel__active-copy"><b>{property.name}</b><small><MapPin size={12} /> {property.location}</small></span>}
        </button>)}
      </div>
    </div>
    <div className="property-depth-carousel__controls">
      <button type="button" onClick={() => move(-1)} aria-label="Previous featured listing"><ChevronLeft size={17} /></button>
      <span aria-live="polite">{displayActive + 1} / {count}</span>
      <button type="button" onClick={() => move(1)} aria-label="Next featured listing"><ChevronRight size={17} /></button>
      <div className="property-depth-carousel__dots" aria-label="Featured listing selection">{visibleItems.map((property, index) => <button key={property.id} type="button" className={index === displayActive ? "is-active" : ""} onClick={() => focusIndex(index)} aria-label={`Show ${property.name}`} aria-current={index === displayActive || undefined} />)}</div>
    </div>
    <p className="property-depth-carousel__hint">Drag, swipe, or scroll to browse · <b>←</b> <b>→</b> navigate · <b>Enter</b> opens dossier</p>
  </section>;
}
