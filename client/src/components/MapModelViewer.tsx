import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { getMapModelViewerRotation, getMapModelViewerScenePan, getMapWheelZoom } from "./propertyBrowser";
import "./MapModelViewer.css";

type MapModelViewerProps = { children: React.ReactNode };

export default function MapModelViewer({ children }: MapModelViewerProps) {
  const [rotation, setRotation] = useState({ yaw: 0, pitch: 0 });
  const [pan, setPan]           = useState({ x: 0, y: 0 });
  const [zoom, setZoom]         = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag    = useRef<{ x: number; y: number } | null>(null);
  const isDirty = rotation.yaw !== 0 || rotation.pitch !== 0 || pan.x !== 0 || pan.y !== 0 || zoom !== 1;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => getMapWheelZoom(current, event.deltaY));
    };
    root.addEventListener("wheel", handleWheel, { passive: false });
    return () => root.removeEventListener("wheel", handleWheel);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const deltaX = event.clientX - drag.current.x;
    const deltaY = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setRotation((current) => getMapModelViewerRotation(current.yaw, current.pitch, deltaX, deltaY));
    setPan((current) => getMapModelViewerScenePan(current.x, current.y, deltaX, deltaY));
  };

  const handlePointerEnd = () => { drag.current = null; };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft")  { setRotation((c) => getMapModelViewerRotation(c.yaw, c.pitch, -16, 0)); setPan((c) => getMapModelViewerScenePan(c.x, c.y, -16, 0)); }
    if (event.key === "ArrowRight") { setRotation((c) => getMapModelViewerRotation(c.yaw, c.pitch,  16, 0)); setPan((c) => getMapModelViewerScenePan(c.x, c.y,  16, 0)); }
    if (event.key === "ArrowUp")    { setRotation((c) => getMapModelViewerRotation(c.yaw, c.pitch, 0, -14)); setPan((c) => getMapModelViewerScenePan(c.x, c.y, 0, -14)); }
    if (event.key === "ArrowDown")  { setRotation((c) => getMapModelViewerRotation(c.yaw, c.pitch, 0,  14)); setPan((c) => getMapModelViewerScenePan(c.x, c.y, 0,  14)); }
    if (event.key === "+" || event.key === "=") setZoom((z) => getMapWheelZoom(z, -80));
    if (event.key === "-")                      setZoom((z) => getMapWheelZoom(z,  80));
    if (event.key === "0" || event.key === "Escape") {
      setRotation({ yaw: 0, pitch: 0 });
      setPan({ x: 0, y: 0 });
      setZoom(1);
    }
  };

  const reset = () => {
    setRotation({ yaw: 0, pitch: 0 });
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div
      ref={rootRef}
      className="map-model-viewer"
      tabIndex={0}
      aria-label="Interactive terrain map. Drag open map space to move the scene, scroll to zoom, arrow keys to pan, +/- to zoom, 0 to reset."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      style={{
        "--map-yaw":   `${rotation.yaw}deg`,
        "--map-pitch": `${rotation.pitch}deg`,
        "--map-pan-x": `${pan.x}px`,
        "--map-pan-y": `${pan.y}px`,
        "--map-zoom":  zoom,
      } as CSSProperties}
    >
      <div className="map-model-viewer__scene">{children}</div>

      {/* Zoom toolbar */}
      <div className="map-model-viewer__controls" aria-label="Map controls">
        <button
          type="button"
          className="map-model-viewer__ctrl-btn"
          onClick={() => setZoom((z) => getMapWheelZoom(z, -80))}
          aria-label="Zoom in"
        >
          <Plus size={13} />
        </button>
        <span className="map-model-viewer__zoom-level" aria-live="polite" aria-label={`Zoom ${Math.round(zoom * 100)}%`}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="map-model-viewer__ctrl-btn"
          onClick={() => setZoom((z) => getMapWheelZoom(z, 80))}
          aria-label="Zoom out"
        >
          <Minus size={13} />
        </button>
        {isDirty && (
          <button
            type="button"
            className="map-model-viewer__ctrl-btn map-model-viewer__ctrl-reset"
            onClick={reset}
            aria-label="Reset map view"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      <span className="map-model-viewer__state-zoom-hint">Drag · Scroll · Arrow keys</span>
    </div>
  );
}
