"use client";

import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls, RoundedBox, Text } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";

type Bar = { label: string; value: number; color: string };

const BASE_BARS: Bar[] = [
  { label: "Jan", value: 2.2, color: "#4CC9F0" },
  { label: "Feb", value: 2.8, color: "#60A5FA" },
  { label: "Mar", value: 3.1, color: "#2DD4A4" },
  { label: "Apr", value: 3.6, color: "#F5C26B" },
  { label: "May", value: 4.2, color: "#F59E0B" },
  { label: "Jun", value: 4.8, color: "#FB7185" },
];

function BarMesh({
  x,
  height,
  color,
}: {
  x: number;
  height: number;
  color: string;
}) {
  return (
    <Float speed={1.4} rotationIntensity={0.08} floatIntensity={0.25}>
      <RoundedBox
        args={[0.55, Math.max(height, 0.35), 0.55]}
        radius={0.08}
        smoothness={4}
        position={[x, height / 2, 0]}
      >
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.28} />
      </RoundedBox>
    </Float>
  );
}

function Scene({ bars, boost }: { bars: Bar[]; boost: number }) {
  const positions = useMemo(
    () => bars.map((_, i) => i * 0.85 - ((bars.length - 1) * 0.85) / 2),
    [bars],
  );

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 8, 5]} intensity={1.35} color="#fff7ed" />
      <pointLight position={[-4, 3, -2]} intensity={0.8} color="#4CC9F0" />
      <pointLight position={[3, 2, 4]} intensity={0.55} color="#F59E0B" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[4.2, 64]} />
        <meshStandardMaterial color="#0b1220" metalness={0.2} roughness={0.85} />
      </mesh>

      {bars.map((bar, i) => (
        <BarMesh
          key={bar.label}
          x={positions[i]}
          height={bar.value * boost}
          color={bar.color}
        />
      ))}

      <Text
        position={[0, 5.2, 0]}
        fontSize={0.38}
        color="#F8FAFC"
        anchorX="center"
        anchorY="middle"
      >
        Runway growth
      </Text>

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.6}
        maxPolarAngle={1.35}
        minDistance={6}
        maxDistance={11}
        autoRotate
        autoRotateSpeed={0.85}
      />
    </>
  );
}

export default function WealthScene3D({ className }: { className?: string }) {
  const [boost, setBoost] = useState(1);

  return (
    <div
      className={`relative h-[360px] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#070b12] sm:h-[420px] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(76,201,240,0.16),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.14),transparent_40%)]" />

      <div className="absolute right-3 top-3 z-20 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setBoost((b) => Math.min(1.6, Number((b + 0.15).toFixed(2))))}
          className="rounded-full border border-vaultic-cyan/30 bg-vaultic-cyan/10 px-3 py-1.5 text-xs font-semibold text-vaultic-cyan transition hover:bg-vaultic-cyan/20"
        >
          + Growth
        </button>
        <button
          type="button"
          onClick={() => setBoost((b) => Math.max(0.55, Number((b - 0.15).toFixed(2))))}
          className="rounded-full border border-vaultic-orange/30 bg-vaultic-orange/10 px-3 py-1.5 text-xs font-semibold text-vaultic-orange transition hover:bg-vaultic-orange/20"
        >
          Stress
        </button>
        <button
          type="button"
          onClick={() => setBoost(1)}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10"
        >
          Reset
        </button>
      </div>

      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-white/50">
            Loading 3D chart…
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 4.2, 8.5], fov: 42 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene bars={BASE_BARS} boost={boost} />
        </Canvas>
      </Suspense>

      <p className="absolute bottom-3 left-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
        Drag to explore · sample data
      </p>
    </div>
  );
}
