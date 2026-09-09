import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { PropertyListing, PropertyState, TerrainProfile } from "./propertyBrowser";
import "./PropertyTerrainMap3D.css";

type PropertyTerrainMap3DProps = {
  activeState: PropertyState | null;
  items: PropertyListing[];
  states: Array<{ state: PropertyState; label: string; count: number }>;
  activePropertyId: number | null;
  getState: (property: PropertyListing) => PropertyState;
  getProfile: (state: PropertyState) => TerrainProfile;
  onSelectState: (state: PropertyState) => void;
  onSelectProperty: (id: number) => void;
};

function TerrainMass({ profile }: { profile: TerrainProfile }) {
  const ridgePositions = useMemo(() => [[-1.8, 0.22, -0.8], [1.7, 0.25, -1.15], [0.3, 0.18, 1.35]] as const, []);
  return <group rotation={[0, profile.rotation, 0]} scale={profile.scale}>
    <mesh castShadow receiveShadow position={[0, -0.26, 0]}>
      <cylinderGeometry args={[4.7, 5.5, 0.48, 72]} />
      <meshStandardMaterial color={profile.sideColor} roughness={0.92} />
    </mesh>
    <mesh castShadow receiveShadow position={[0, 0, 0]}>
      <cylinderGeometry args={[4.68, 4.7, 0.08, 72]} />
      <meshStandardMaterial color={profile.groundColor} roughness={0.86} metalness={0.04} />
    </mesh>
    <mesh receiveShadow position={[0, 0.05, 0]} scale={[0.98, 1, 0.88]}>
      <circleGeometry args={[4.58, 72]} />
      <meshStandardMaterial color={profile.groundAccent} transparent opacity={0.26} roughness={0.9} />
    </mesh>
    {ridgePositions.map(([x, y, z], index) => <mesh castShadow receiveShadow key={index} position={[x, y, z]} scale={index === 1 ? [1.35, 0.4, 0.75] : [1, 0.31, 0.66]}>
      <sphereGeometry args={[1.2, 32, 18]} />
      <meshStandardMaterial color={profile.ridgeColor} roughness={0.96} />
    </mesh>)}
    <mesh receiveShadow position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.55, 1.6, 60]} />
      <meshStandardMaterial color={profile.routeColor} transparent opacity={0.45} />
    </mesh>
    <mesh receiveShadow position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0.6, 0]} scale={[1.7, 1, 0.72]}>
      <ringGeometry args={[2.45, 2.49, 60]} />
      <meshStandardMaterial color={profile.routeColor} transparent opacity={0.26} />
    </mesh>
  </group>;
}

function GroundedMarker({ position, label, detail, active = false, onClick }: { position: [number, number, number]; label: string; detail: string; active?: boolean; onClick: () => void }) {
  return <group position={position} onClick={(event) => { event.stopPropagation(); onClick(); }}>
    <mesh castShadow receiveShadow position={[0, 0.07, 0]}>
      <cylinderGeometry args={[active ? 0.28 : 0.22, active ? 0.35 : 0.27, 0.12, 20]} />
      <meshStandardMaterial color={active ? "#d7ef73" : "#f0f7ef"} roughness={0.52} />
    </mesh>
    <mesh castShadow position={[0, active ? 0.43 : 0.35, 0]}>
      <coneGeometry args={[active ? 0.23 : 0.18, active ? 0.58 : 0.46, 4]} />
      <meshStandardMaterial color={active ? "#d7ef73" : "#eaf6ee"} roughness={0.48} />
    </mesh>
    <Html position={[0, active ? 0.92 : 0.76, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
      <div className={`terrain-map-label${active ? " is-active" : ""}`}><b>{label}</b><small>{detail}</small></div>
    </Html>
  </group>;
}

function SkyGroundScene({ activeState, items, states, activePropertyId, getState, getProfile, onSelectState, onSelectProperty }: Omit<PropertyTerrainMap3DProps, "getProfile"> & { getProfile: (state: PropertyState) => TerrainProfile }) {
  const overviewProfile = getProfile("Selangor");
  const profile = activeState ? getProfile(activeState) : overviewProfile;
  const markerPositions: [number, number, number][] = [[-2.2, 0.11, -0.9], [0.4, 0.11, -1.3], [2.25, 0.11, 1.05], [-1.3, 0.11, 1.45], [1.7, 0.11, 0.2], [0.1, 0.11, 1.85]];

  return <>
    <fog attach="fog" args={["#174e55", 13, 27]} />
    <hemisphereLight intensity={1.08} color="#9ad4c2" groundColor="#0f3540" />
    <directionalLight castShadow position={[5, 9, 4]} intensity={1.62} color="#ddecad" shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-6, 3, -4]} intensity={0.48} color="#4d9994" />
    <mesh receiveShadow position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#164e55" roughness={1} />
    </mesh>
    <TerrainMass profile={profile} />
    {activeState ? items.map((property, index) => <GroundedMarker key={property.id} position={markerPositions[index % markerPositions.length]} label={property.name} detail={property.status} active={property.id === activePropertyId} onClick={() => onSelectProperty(property.id)} />) : states.map((state, index) => <GroundedMarker key={state.state} position={markerPositions[[0, 1, 4][index]]} label={state.label} detail={`${state.count} listings`} onClick={() => onSelectState(state.state)} />)}
    {activeState && <Html position={[0, 0.2, -3.2]} center distanceFactor={10} style={{ pointerEvents: "none" }}><div className="terrain-map-state-stamp">{activeState.toUpperCase()} / GROUND VIEW</div></Html>}
  </>;
}

export default function PropertyTerrainMap3D(props: PropertyTerrainMap3DProps) {
  return <div className="property-terrain-map-3d"><Canvas shadows gl={{ alpha: true, antialias: true }} dpr={[1, 1.6]} camera={{ position: [7.4, 6.4, 8.8], fov: 37 }}><Suspense fallback={null}><SkyGroundScene {...props} /><OrbitControls enablePan enableRotate enableZoom minDistance={6.2} maxDistance={16} minPolarAngle={0.7} maxPolarAngle={1.32} maxAzimuthAngle={1.1} minAzimuthAngle={-1.1} enableDamping dampingFactor={0.08} target={[0, 0, 0]} /></Suspense></Canvas><div className="property-terrain-map-3d__help">Drag to orbit · Scroll to zoom · Click a grounded marker</div></div>;
}
