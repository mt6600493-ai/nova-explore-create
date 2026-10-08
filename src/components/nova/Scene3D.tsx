import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";

export type Part = {
  shape: "sphere" | "box" | "cylinder" | "cone" | "torus";
  position: number[];
  scale: number[];
  rotation: number[];
  color: string;
  label: string;
};

const v3 = (a: number[] | undefined, d: number): [number, number, number] => {
  const f = (i: number) => {
    const n = Number(a?.[i] ?? (i > 0 ? a?.[0] : undefined));
    return Number.isFinite(n) && n !== 0 ? n : d;
  };
  return [f(0), f(1), f(2)];
};

function Geometry({ shape }: { shape: Part["shape"] }) {
  switch (shape) {
    case "box":
      return <boxGeometry args={[1, 1, 1]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    case "cone":
      return <coneGeometry args={[0.5, 1, 32]} />;
    case "torus":
      return <torusGeometry args={[0.5, 0.15, 16, 64]} />;
    default:
      return <sphereGeometry args={[0.5, 48, 48]} />;
  }
}

function Model({ parts, spin, showLabels }: { parts: Part[]; spin: boolean; showLabels: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (spin && ref.current) ref.current.rotation.y += dt * 0.25;
  });
  return (
    <group ref={ref}>
      {parts.map((p, i) => {
        const pos: [number, number, number] = [p.position?.[0] ?? 0, p.position?.[1] ?? 0, p.position?.[2] ?? 0];
        const rot: [number, number, number] = [p.rotation?.[0] ?? 0, p.rotation?.[1] ?? 0, p.rotation?.[2] ?? 0];
        const s = v3(p.scale, 1);
        return (
          <group key={i} position={pos} rotation={rot}>
            <mesh scale={s} castShadow>
              <Geometry shape={p.shape} />
              <meshStandardMaterial color={p.color || "#88ccff"} roughness={0.45} metalness={0.15} />
            </mesh>
            {showLabels && p.label ? (
              <Html center distanceFactor={10} position={[0, s[1] * 0.6 + 0.3, 0]}>
                <span className="nova-3d-label">{p.label}</span>
              </Html>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

export default function Scene3D({ parts, spin, showLabels }: { parts: Part[]; spin: boolean; showLabels: boolean }) {
  return (
    <Canvas camera={{ position: [0, 3, 10], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={["#05070f"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.4} />
      <pointLight position={[-6, -4, -4]} intensity={0.8} color="#7dd3fc" />
      <Stars radius={60} depth={40} count={1500} factor={3} fade />
      <Model parts={parts} spin={spin} showLabels={showLabels} />
      <OrbitControls enablePan makeDefault />
    </Canvas>
  );
}
