import { describe, expect, it } from "vitest";
import { getAccordionIndex, getCarouselDragStep, getDiscoveryRailIndex, getInventorySignals, getListingGridRole, getMapModelViewerRotation, getMapModelViewerScenePan, getMapWheelZoom, getPropertyGalleryImages, getPropertyMapPinPosition, getPropertyState, getPropertyStateCounts, getPropertyTypeCounts, getSeamlessCarouselIndex, getStateMapZoom, propertyMatchesInventoryLens, getCarouselIndex, getCarouselSnapPosition, getTerrainProfile, shouldOpenMapPropertyDossier } from "../client/src/components/propertyBrowser";

const properties = [
  { id: 1, type: "Condominium" },
  { id: 2, type: "Landed terrace" },
  { id: 3, type: "Condominium" },
] as any;

describe("property browser helpers", () => {
  it("wraps carousel navigation in both directions", () => {
    expect(getCarouselIndex(2, 1, 3)).toBe(0);
    expect(getCarouselIndex(0, -1, 3)).toBe(2);
  });

  it("wraps the dossier image gallery through its available views", () => {
    expect(getCarouselIndex(0, -1, 3)).toBe(2);
    expect(getCarouselIndex(2, 1, 3)).toBe(0);
  });

  it("uses only the selected property's own gallery images", () => {
    const selectedProperty = { image: "primary-a.jpg", images: ["primary-a.jpg", "detail-a.jpg"] } as any;
    expect(getPropertyGalleryImages(selectedProperty)).toEqual(["primary-a.jpg", "detail-a.jpg"]);
    expect(getPropertyGalleryImages({ image: "primary-b.jpg" } as any)).toEqual(["primary-b.jpg"]);
  });

  it("converts intentional drags and swipes into carousel directions", () => {
    expect(getCarouselDragStep(-54)).toBe(1);
    expect(getCarouselDragStep(54)).toBe(-1);
    expect(getCarouselDragStep(16)).toBe(0);
    expect(getCarouselDragStep(8, -0.7)).toBe(1);
  });

  it("wraps continuous rail positions and snaps using drag momentum", () => {
    expect(getSeamlessCarouselIndex(-1, 5)).toBe(4);
    expect(getSeamlessCarouselIndex(5.4, 5)).toBe(0);
    expect(getCarouselSnapPosition(1.22, 0)).toBe(1);
    expect(getCarouselSnapPosition(1.22, 0.006)).toBe(2);
  });

  it("keeps accordion focus within the available featured listings", () => {
    expect(getAccordionIndex(-1, 5)).toBe(0);
    expect(getAccordionIndex(2, 5)).toBe(2);
    expect(getAccordionIndex(9, 5)).toBe(4);
  });

  it("groups market listings by property type", () => {
    expect(getPropertyTypeCounts(properties)).toEqual({ Condominium: 2, "Landed terrace": 1 });
  });

  it("derives inventory signals from available listing statuses", () => {
    const signals = getInventorySignals([
      { status: "Open for viewing", price: 850000 },
      { status: "New launch", price: 690000 },
      { status: "Ready to move in", price: 1050000 },
      { status: "Early bird offer", price: 540000 },
    ] as any);
    expect(signals).toEqual({ viewingReady: 2, launchWindow: 2, entryPrice: 540000 });
  });

  it("matches inventory lenses to real listing statuses and saved dossiers", () => {
    const viewing = { id: 1, status: "Open for viewing" } as any;
    const launch = { id: 2, status: "Early bird offer" } as any;
    expect(propertyMatchesInventoryLens(viewing, "viewing")).toBe(true);
    expect(propertyMatchesInventoryLens(launch, "viewing")).toBe(false);
    expect(propertyMatchesInventoryLens(launch, "launch")).toBe(true);
    expect(propertyMatchesInventoryLens(viewing, "saved", [1])).toBe(true);
    expect(propertyMatchesInventoryLens(viewing, "saved", [])).toBe(false);
  });

  it("assigns a stable visual hierarchy to the dossier-atlas grid", () => {
    expect(getListingGridRole(0, 6)).toBe("anchor");
    expect(getListingGridRole(1, 6)).toBe("tile");
    expect(getListingGridRole(5, 6)).toBe("wide");
    expect(getListingGridRole(0, 1)).toBe("anchor");
  });

  it("wraps discovery-rail progression through the filtered collection", () => {
    expect(getDiscoveryRailIndex(6, 6)).toBe(0);
    expect(getDiscoveryRailIndex(-1, 6)).toBe(5);
    expect(getDiscoveryRailIndex(2, 6)).toBe(2);
  });

  it("gives every map pin a stable position and cycles gracefully for longer collections", () => {
    expect(getPropertyMapPinPosition(0)).toEqual({ x: 36, y: 67 });
    expect(getPropertyMapPinPosition(5)).toEqual({ x: 61, y: 79 });
    expect(getPropertyMapPinPosition(6)).toEqual({ x: 36, y: 67 });
  });

  it("assigns locations to state-level availability views and totals each state", () => {
    expect(getPropertyState("Mont Kiara, Kuala Lumpur")).toBe("Kuala Lumpur");
    expect(getPropertyState("Iskandar Puteri, Johor")).toBe("Johor");
    expect(getPropertyState("Petaling Jaya, Selangor")).toBe("Selangor");
    expect(getPropertyStateCounts([
      { location: "Petaling Jaya, Selangor" },
      { location: "Bangsar, Kuala Lumpur" },
      { location: "Cyberjaya, Selangor" },
      { location: "Iskandar Puteri, Johor" },
    ])).toEqual({ Selangor: 2, "Kuala Lumpur": 1, Johor: 1 });
  });

  it("returns a distinct, stable ground profile for each available state terrain", () => {
    expect(getTerrainProfile("Selangor").scale).toEqual([1.12, 0.72, 0.92]);
    expect(getTerrainProfile("Kuala Lumpur").rotation).toBe(0.18);
    expect(getTerrainProfile("Johor").groundColor).toBe("#4c735f");
  });

  it("keeps model-viewer terrain rotation inside its subtle visual-preserving bounds", () => {
    expect(getMapModelViewerRotation(0, 0, 20, -20)).toEqual({ yaw: 4, pitch: -2.6 });
    expect(getMapModelViewerRotation(17.8, -9.9, 40, -30)).toEqual({ yaw: 18, pitch: -10 });
  });

  it("pans the complete map scene within a bounded editorial frame", () => {
    expect(getMapModelViewerScenePan(0, 0, 20, -20)).toEqual({ x: 4.8, y: -3.6 });
    expect(getMapModelViewerScenePan(41, -27, 20, -20)).toEqual({ x: 42, y: -28 });
  });

  it("zooms drilled-in state terrain with bounded wheel-driven levels", () => {
    expect(getStateMapZoom(1, -100)).toBe(1.15);
    expect(getStateMapZoom(1.46, -100)).toBe(1.48);
    expect(getStateMapZoom(0.83, 100)).toBe(0.82);
  });

  it("uses the same bounded wheel-zoom scale in the Malaysia overview", () => {
    expect(getMapWheelZoom(1, -120)).toBe(1.18);
    expect(getMapWheelZoom(1.46, -100)).toBe(1.48);
  });

  it("opens a 3D dossier only when the currently selected state property pin is chosen again", () => {
    expect(shouldOpenMapPropertyDossier(4, 4)).toBe(true);
    expect(shouldOpenMapPropertyDossier(4, 5)).toBe(false);
  });
});
