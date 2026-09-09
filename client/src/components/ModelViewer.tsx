/* Corporate Trust Minimalism: a calm navy/teal 3D preview surface for property show units. Keep controls legible, motion restrained, and provide a dependable procedural fallback until real GLB assets are connected.
 * Multiple mock house variants (terrace, condo, bungalow, high-rise, semi-D) so the fallback doesn't
 * render the same box every time. Variant is resolved deterministically from propertyType/propertyName
 * (falls back to a hash) so a given property always renders the same model on re-render. */
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type ModelViewerProps = {
  propertyName: string;
  propertyType?: string;
  modelUrl?: string;
  fill?: boolean;
  hideChrome?: boolean;
};

type Variant = "terrace" | "condo" | "bungalow" | "highrise" | "semid";

/** Small deterministic string hash so the same property always resolves to the same variant. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveVariant(propertyName: string, propertyType?: string): Variant {
  const haystack = `${propertyType ?? ""} ${propertyName}`.toLowerCase();

  if (/bungalow/.test(haystack)) return "bungalow";
  if (/semi[\s-]?d|cluster/.test(haystack)) return "semid";
  if (/tower|high-?rise/.test(haystack)) return "highrise";
  if (/terrace|landed|villa/.test(haystack)) return "terrace";

  if (/condo|residence|apartment|suite|service/.test(haystack)) {
    // Multiple property types share "condo"-ish naming — split between two silhouettes for variety.
    return hashString(propertyName) % 2 === 0 ? "condo" : "highrise";
  }

  const fallbackVariants: Variant[] = ["terrace", "condo", "bungalow", "highrise", "semid"];
  return fallbackVariants[hashString(propertyName) % fallbackVariants.length];
}

/** Shared ground plane + driveway used under every variant so scale/lighting stays consistent. */
function Ground({ width = 10, depth = 8 }: { width?: number; depth?: number }) {
  return (
    <>
      <mesh receiveShadow position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#dce8e4" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 0.04, 1.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[2.2, 1.2, 0.12]} />
        <meshStandardMaterial color="#b9c8c1" roughness={0.86} />
      </mesh>
      <mesh castShadow position={[0, 0.08, 2.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[3.6, 1.1, 0.1]} />
        <meshStandardMaterial color="#d6dfdb" roughness={0.9} />
      </mesh>
    </>
  );
}

function Trees({ positions }: { positions: [number, number, number][] }) {
  return (
    <>
      {positions.map(([x, y, z]) => (
        <group key={`${x}-${z}`} position={[x, y, z]}>
          <mesh castShadow position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.18, 0.35, 1.3, 8]} />
            <meshStandardMaterial color="#7b9e86" roughness={0.95} />
          </mesh>
          <mesh castShadow position={[0, 1.45, 0]}>
            <sphereGeometry args={[0.7, 16, 12]} />
            <meshStandardMaterial color="#527b69" roughness={0.92} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Two-storey terraced/landed house with a pitched roof. */
function TerraceHouse() {
  const roof = useMemo(() => {
    const geometry = new THREE.ConeGeometry(2.15, 1.1, 4);
    geometry.rotateY(Math.PI / 4);
    return geometry;
  }, []);
  return (
    <group position={[0, -0.85, 0]}>
      <Ground />
      <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[3.9, 2.6, 2.6]} />
        <meshStandardMaterial color="#f4f7f5" roughness={0.72} />
      </mesh>
      <mesh castShadow position={[0, 2.55, 0]} geometry={roof}>
        <meshStandardMaterial color="#284762" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.62, 1.34]}>
        <boxGeometry args={[0.86, 1.35, 0.06]} />
        <meshStandardMaterial color="#29475c" metalness={0.08} roughness={0.22} />
      </mesh>
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 1.18, 1.34]}>
          <boxGeometry args={[0.72, 0.76, 0.06]} />
          <meshStandardMaterial color="#93c1c4" metalness={0.1} roughness={0.18} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, -1.34]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[2.05, 0.58, 0.06]} />
        <meshStandardMaterial color="#9bc7c4" metalness={0.1} roughness={0.18} />
      </mesh>
      <Trees positions={[[-3.4, 0.55, -0.4], [3.4, 0.55, -0.4]]} />
    </group>
  );
}

/** Mid-rise serviced-residence block with a flat roof band. */
function CondoBlock() {
  return (
    <group position={[0, -0.85, 0]}>
      <Ground />
      <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[3.4, 2.6, 2.6]} />
        <meshStandardMaterial color="#f4f7f5" roughness={0.72} />
      </mesh>
      <mesh castShadow position={[0, 2.28, 0]}>
        <boxGeometry args={[3.55, 0.16, 2.75]} />
        <meshStandardMaterial color="#2f6f78" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.62, 1.34]}>
        <boxGeometry args={[0.86, 1.35, 0.06]} />
        <meshStandardMaterial color="#29475c" metalness={0.08} roughness={0.22} />
      </mesh>
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 1.18, 1.34]}>
          <boxGeometry args={[0.72, 0.76, 0.06]} />
          <meshStandardMaterial color="#93c1c4" metalness={0.1} roughness={0.18} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, -1.34]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[2.05, 0.58, 0.06]} />
        <meshStandardMaterial color="#9bc7c4" metalness={0.1} roughness={0.18} />
      </mesh>
      <Trees positions={[[-3.2, 0.55, -0.6]]} />
    </group>
  );
}

/** Single-storey bungalow: wide footprint, low roofline, overhanging porch roof. */
function Bungalow() {
  return (
    <group position={[0, -0.85, 0]}>
      <Ground width={11} depth={8.5} />
      <mesh castShadow receiveShadow position={[0, 0.62, 0]}>
        <boxGeometry args={[4.6, 1.35, 2.9]} />
        <meshStandardMaterial color="#f4f7f5" roughness={0.72} />
      </mesh>
      {/* wide overhanging flat roof */}
      <mesh castShadow position={[0, 1.42, 0.15]}>
        <boxGeometry args={[5.3, 0.14, 3.4]} />
        <meshStandardMaterial color="#284762" roughness={0.78} />
      </mesh>
      {/* porch pillars */}
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} castShadow position={[x, 0.68, 1.55]}>
          <cylinderGeometry args={[0.09, 0.09, 1.3, 10]} />
          <meshStandardMaterial color="#9bc7c4" metalness={0.15} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 1.46]}>
        <boxGeometry args={[1.0, 1.05, 0.06]} />
        <meshStandardMaterial color="#29475c" metalness={0.08} roughness={0.22} />
      </mesh>
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, 0.68, 1.46]}>
          <boxGeometry args={[0.7, 0.62, 0.06]} />
          <meshStandardMaterial color="#93c1c4" metalness={0.1} roughness={0.18} />
        </mesh>
      ))}
      <Trees positions={[[-4.0, 0.55, -0.8], [4.0, 0.55, -0.8]]} />
    </group>
  );
}

/** Slim high-rise tower made of stacked floor slabs with balcony bands. */
function HighriseTower() {
  const floors = 5;
  const floorHeight = 0.62;
  return (
    <group position={[0, -0.85, 0]}>
      <Ground width={9} depth={7.5} />
      <mesh castShadow receiveShadow position={[0, (floors * floorHeight) / 2, 0]}>
        <boxGeometry args={[2.5, floors * floorHeight, 2.1]} />
        <meshStandardMaterial color="#f4f7f5" roughness={0.7} />
      </mesh>
      {Array.from({ length: floors }, (_, i) => (
        <mesh key={i} castShadow position={[0, floorHeight * (i + 1) - 0.02, 1.08]}>
          <boxGeometry args={[2.6, 0.06, 0.18]} />
          <meshStandardMaterial color="#2f6f78" roughness={0.55} metalness={0.1} />
        </mesh>
      ))}
      {Array.from({ length: floors }, (_, i) => (
        <mesh key={`glass-${i}`} position={[0, floorHeight * i + floorHeight / 2, 1.06]}>
          <boxGeometry args={[2.2, floorHeight * 0.72, 0.05]} />
          <meshStandardMaterial color="#93c1c4" metalness={0.15} roughness={0.15} />
        </mesh>
      ))}
      <mesh castShadow position={[0, floors * floorHeight + 0.12, 0]}>
        <boxGeometry args={[2.6, 0.24, 2.2]} />
        <meshStandardMaterial color="#284762" roughness={0.7} />
      </mesh>
      <Trees positions={[[-2.6, 0.55, 1.9]]} />
    </group>
  );
}

/** Semi-detached pair: two linked volumes sharing one long pitched roof. */
function SemiDetached() {
  const roof = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0, 1.55, 1.0, 3, 1, false);
    geometry.rotateZ(Math.PI / 2);
    geometry.scale(1, 1, 2.4);
    return geometry;
  }, []);
  return (
    <group position={[0, -0.85, 0]}>
      <Ground width={11} depth={8} />
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} castShadow receiveShadow position={[x, 0.9, 0]}>
          <boxGeometry args={[2.1, 2.6, 2.5]} />
          <meshStandardMaterial color="#f4f7f5" roughness={0.72} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 2.28, 0]} geometry={roof}>
        <meshStandardMaterial color="#284762" roughness={0.78} />
      </mesh>
      {[-1.15, 1.15].map((x) => (
        <mesh key={`door-${x}`} position={[x, 0.62, 1.29]}>
          <boxGeometry args={[0.7, 1.3, 0.06]} />
          <meshStandardMaterial color="#29475c" metalness={0.08} roughness={0.22} />
        </mesh>
      ))}
      {[-1.15, 1.15].map((x) => (
        <mesh key={`win-${x}`} position={[x, 1.65, 1.29]}>
          <boxGeometry args={[0.6, 0.6, 0.06]} />
          <meshStandardMaterial color="#9bc7c4" metalness={0.1} roughness={0.18} />
        </mesh>
      ))}
      <Trees positions={[[0, 0.55, -0.7]]} />
    </group>
  );
}

function MockHouse({ variant }: { variant: Variant }) {
  switch (variant) {
    case "terrace":
      return <TerraceHouse />;
    case "bungalow":
      return <Bungalow />;
    case "highrise":
      return <HighriseTower />;
    case "semid":
      return <SemiDetached />;
    case "condo":
    default:
      return <CondoBlock />;
  }
}

function RemoteModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(), [scene]);
  return <primitive object={model} />;
}

export default function ModelViewer({ propertyName, propertyType, modelUrl, fill = false, hideChrome = false }: ModelViewerProps) {
  const variant = useMemo(() => resolveVariant(propertyName, propertyType), [propertyName, propertyType]);

  return (
    <div className={fill
      ? "relative h-full min-h-0 w-full overflow-hidden bg-[radial-gradient(circle_at_50%_25%,#f8fcfb_0%,#eaf3f1_46%,#d4e5e0_100%)]"
      : "relative h-full min-h-[360px] w-full overflow-hidden rounded-[16px] border border-[#dce8e5] bg-[radial-gradient(circle_at_50%_25%,#f8fcfb_0%,#eaf3f1_46%,#d4e5e0_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
    }>
      <Canvas
        shadows
        camera={{ position: [5.6, 3.4, 6.2], fov: 38 }}
        dpr={[1, 1.6]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.35} />
          <directionalLight castShadow position={[5, 8, 6]} intensity={2.2} shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-5, 4, -4]} intensity={0.7} color="#9bc7c4" />
          <group position={[0, -0.3, 0]}>
            {modelUrl ? <RemoteModel url={modelUrl} /> : <MockHouse variant={variant} />}
          </group>
          <OrbitControls
            enablePan={false}
            target={[0, 0.75, 0]}
            minDistance={3.2}
            maxDistance={14}
            minPolarAngle={0.4}
            maxPolarAngle={1.5}
            enableDamping
            dampingFactor={0.08}
          />
        </Suspense>
      </Canvas>
      {!hideChrome && (
        <>
          <div className="pointer-events-none absolute left-3.5 top-3.5 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#215a51] shadow-sm backdrop-blur-sm">
            3D Show Unit View
          </div>
          <div className="pointer-events-none absolute bottom-3.5 left-3.5 right-3.5 flex items-end justify-between gap-3">
            <div className="rounded-lg bg-white/80 px-2.5 py-1 backdrop-blur-sm border border-white/70 shadow-xs">
              <p className="text-[11px] font-bold text-[#143d42] leading-tight">{propertyName}</p>
              <p className="text-[9.5px] font-medium text-[#4d726b]">Drag to rotate · Scroll to zoom</p>
            </div>
            <span className="rounded-full bg-[#114b4f]/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
              Interactive
            </span>
          </div>
        </>
      )}
    </div>
  );
}
