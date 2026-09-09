export type PropertyBadge =
  | "investor-pick"
  | "open-for-viewing"
  | "new-launch"
  | "early-bird"
  | "limited-units"
  | "ready-to-move"
  | null;

export type PropertyListing = {
  id: number;
  name: string;
  developer: string;
  location: string;
  price: number;
  type: string;
  beds: number;
  size: string;
  status: string;
  image: string;
  images?: string[];
  modelUrl: string;
  /** Agent who manages this listing */
  agentId?: string;
  /** Manually curated by the agent — always surfaces in the Featured carousel */
  featured?: boolean;
  /** Visual badge override; if omitted, derived automatically from `status` */
  badge?: PropertyBadge;
};

export type InventoryLens = "all" | "viewing" | "launch" | "saved";
export type PropertyState = "Selangor" | "Kuala Lumpur" | "Johor";
export type TerrainProfile = { groundColor: string; groundAccent: string; sideColor: string; ridgeColor: string; routeColor: string; rotation: number; scale: [number, number, number] };

export function getCarouselIndex(current: number, step: number, count: number) {
  if (count <= 0) return 0;
  return ((current + step) % count + count) % count;
}

export function getPropertyGalleryImages(property: Pick<PropertyListing, "image" | "images">) {
  return property.images?.length ? property.images : [property.image];
}

export function getCarouselDragStep(deltaX: number, velocityX = 0, threshold = 42) {
  const intendedDelta = Math.abs(deltaX) >= threshold ? deltaX : Math.abs(velocityX) >= 0.52 ? velocityX * threshold * 2 : 0;
  if (intendedDelta === 0) return 0;
  return intendedDelta < 0 ? 1 : -1;
}

export function getSeamlessCarouselIndex(position: number, count: number) {
  if (count <= 0) return 0;
  return ((Math.round(position) % count) + count) % count;
}

export function getCarouselSnapPosition(position: number, velocityInCards = 0) {
  const boundedVelocity = Math.min(Math.max(velocityInCards, -0.008), 0.008);
  return Math.round(position + boundedVelocity * 180);
}

export function getAccordionIndex(index: number, count: number) {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

export function getPropertyTypeCounts(properties: PropertyListing[]) {
  return properties.reduce<Record<string, number>>((counts, property) => {
    counts[property.type] = (counts[property.type] || 0) + 1;
    return counts;
  }, {});
}

export function getInventorySignals(properties: PropertyListing[]) {
  const viewingReady = properties.filter((property) => /viewing|move in/i.test(property.status)).length;
  const launchWindow = properties.filter((property) => /launch|early bird/i.test(property.status)).length;
  const entryPrice = properties.length ? Math.min(...properties.map((property) => property.price)) : 0;
  return { viewingReady, launchWindow, entryPrice };
}

export function propertyMatchesInventoryLens(property: Pick<PropertyListing, "id" | "status">, lens: InventoryLens, savedIds: number[] = []) {
  if (lens === "all") return true;
  if (lens === "saved") return savedIds.includes(property.id);
  if (lens === "viewing") return /viewing|move in/i.test(property.status);
  return /launch|early bird/i.test(property.status);
}

/**
 * Derives a badge from a listing's status when no explicit badge is set.
 * Priority order mirrors urgency for a sales agent:
 *   investor-pick > open-for-viewing > new-launch > early-bird > limited-units > ready-to-move
 */
export function getListingBadge(property: Pick<PropertyListing, "status" | "badge">): PropertyBadge {
  if (property.badge !== undefined) return property.badge ?? null;
  const s = property.status.toLowerCase();
  if (/investor/i.test(s))       return "investor-pick";
  if (/viewing/i.test(s))        return "open-for-viewing";
  if (/new launch/i.test(s))     return "new-launch";
  if (/early bird/i.test(s))     return "early-bird";
  if (/limited/i.test(s))        return "limited-units";
  if (/ready|move in/i.test(s))  return "ready-to-move";
  return null;
}

/** Urgency rank used for featured carousel ordering (lower = shown first). */
const FEATURED_RANK: Record<string, number> = {
  "investor-pick":    0,
  "open-for-viewing": 1,
  "new-launch":       2,
  "early-bird":       3,
  "limited-units":    4,
  "ready-to-move":    5,
};

/**
 * Returns up to `limit` listings for the Featured Inventory carousel.
 * Sort order:
 *   1. Manually `featured` flagged listings first
 *   2. Then by badge urgency rank
 *   3. Then by original array position
 */
export function getFeaturedListings(properties: PropertyListing[], limit = 5): PropertyListing[] {
  return [...properties]
    .sort((a, b) => {
      const aFeatured = a.featured ? 0 : 1;
      const bFeatured = b.featured ? 0 : 1;
      if (aFeatured !== bFeatured) return aFeatured - bFeatured;
      const aBadge = getListingBadge(a) ?? "";
      const bBadge = getListingBadge(b) ?? "";
      const aRank = FEATURED_RANK[aBadge] ?? 99;
      const bRank = FEATURED_RANK[bBadge] ?? 99;
      return aRank - bRank;
    })
    .slice(0, limit);
}

export type ListingGridRole = "anchor" | "tile" | "wide";

export function getListingGridRole(index: number, count: number): ListingGridRole {
  if (index === 0) return "anchor";
  if (count >= 5 && index === count - 1) return "wide";
  return "tile";
}

export function getDiscoveryRailIndex(index: number, count: number) {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

const propertyMapPinPositions = [
  { x: 36, y: 67 },
  { x: 52, y: 60 },
  { x: 67, y: 70 },
  { x: 44, y: 75 },
  { x: 75, y: 65 },
  { x: 61, y: 79 },
];

export function getPropertyMapPinPosition(index: number) {
  return propertyMapPinPositions[((index % propertyMapPinPositions.length) + propertyMapPinPositions.length) % propertyMapPinPositions.length];
}

export function getPropertyState(location: string): PropertyState {
  if (/mont kiara|bangsar|kuala lumpur/i.test(location)) return "Kuala Lumpur";
  if (/iskandar puteri|johor/i.test(location)) return "Johor";
  return "Selangor";
}

export function getPropertyStateCounts(properties: Pick<PropertyListing, "location">[]) {
  return properties.reduce<Partial<Record<PropertyState, number>>>((counts, property) => {
    const state = getPropertyState(property.location);
    counts[state] = (counts[state] ?? 0) + 1;
    return counts;
  }, {});
}

export function getTerrainProfile(state: PropertyState): TerrainProfile {
  const profiles: Record<PropertyState, TerrainProfile> = {
    Selangor: { groundColor: "#4f7f63", groundAccent: "#89ae76", sideColor: "#174d4d", ridgeColor: "#3c6b55", routeColor: "#d7ef73", rotation: -0.12, scale: [1.12, 0.72, 0.92] },
    "Kuala Lumpur": { groundColor: "#557965", groundAccent: "#99b87e", sideColor: "#1b4d4e", ridgeColor: "#486a58", routeColor: "#e4f5a5", rotation: 0.18, scale: [0.84, 0.72, 0.8] },
    Johor: { groundColor: "#4c735f", groundAccent: "#82a876", sideColor: "#174948", ridgeColor: "#3f6553", routeColor: "#d8ef86", rotation: -0.32, scale: [1.22, 0.72, 0.72] },
  };
  return profiles[state];
}

export function getMapModelViewerRotation(yaw: number, pitch: number, deltaX: number, deltaY: number) {
  return {
    yaw: Math.min(18, Math.max(-18, yaw + deltaX * 0.2)),
    pitch: Math.min(10, Math.max(-10, pitch + deltaY * 0.13)),
  };
}

export function getMapModelViewerScenePan(x: number, y: number, deltaX: number, deltaY: number) {
  return {
    x: Number(Math.min(42, Math.max(-42, x + deltaX * 0.24)).toFixed(2)),
    y: Number(Math.min(28, Math.max(-28, y + deltaY * 0.18)).toFixed(2)),
  };
}

export function getStateMapZoom(currentZoom: number, wheelDeltaY: number) {
  return Number(Math.min(1.48, Math.max(0.82, currentZoom - wheelDeltaY * 0.0015)).toFixed(3));
}

export const getMapWheelZoom = getStateMapZoom;

export function shouldOpenMapPropertyDossier(activePropertyId: number, clickedPropertyId: number) {
  return activePropertyId === clickedPropertyId;
}
