import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { isDone, type SceneIncident } from './model';

interface Props {
  incidents: SceneIncident[];
  step: number;
  active: boolean;
  onSelect: (id: string) => void;
}

const RED = new THREE.Color('#FF4D5E');
const GREEN = new THREE.Color('#2BD99F');
/** Frame-rate independent smoothing factor. */
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

const LAYOUT: [number, number, number][] = [
  [0, 1.45, 0],
  [-1.95, -1.15, 0.35],
  [1.95, -1.05, -0.35],
];

type LabelRefs = React.RefObject<(HTMLDivElement | null)[]>;

export default function Scene({ incidents, step, active, onSelect }: Props) {
  // Labels are plain DOM over the canvas, positioned each frame from projected 3D coordinates.
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="scene">
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 9], fov: 45 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#08090A']} />
      <fog attach="fog" args={['#08090A', 12, 30]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 6, 6]} intensity={60} color="#ffffff" />
      <directionalLight position={[-6, -2, -4]} intensity={1.2} color="#4589FF" />
      <Stars radius={60} depth={40} count={1600} factor={3} saturation={0} fade speed={0.4} />
      <Sparkles count={70} scale={[14, 8, 5]} size={1.6} speed={0.25} color="#4589FF" opacity={0.45} />
      <Constellation incidents={incidents} step={step} onSelect={onSelect} labels={labels} hovered={hovered} setHovered={setHovered} />
      <CameraRig />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.45} luminanceSmoothing={0.3} />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </Canvas>
      <div className="scene-labels" aria-hidden>
        {incidents.map((inc, i) => {
          const done = isDone(inc, step);
          const on = hovered === inc.id;
          return (
            <div key={inc.id} ref={(el) => { labels.current[i] = el; }} className={`node-label${on ? ' is-hovered' : ''}`}>
              <span className="node-id">{inc.id}</span>
              {on && <span className="node-title">{inc.title}</span>}
              {on && (
                <span className="node-verdict" style={{ color: done ? inc.afterColor : inc.beforeColor }}>
                  {done ? inc.afterVerdict : inc.beforeVerdict} · click for proof
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface NodeShared {
  labels: LabelRefs;
  hovered: string | null;
  setHovered: (id: string | null) => void;
}

/** Positions the triangle beside the hero copy on wide screens, below it on narrow ones. */
function Constellation({ incidents, step, onSelect, ...shared }: Omit<Props, 'active'> & NodeShared) {
  const { viewport, size } = useThree();
  const wide = size.width >= 1100;
  const scale = wide ? Math.min(0.82, viewport.width / 16) : Math.min(0.85, viewport.width / 7.5);
  const x = wide ? viewport.width * 0.22 : 0;
  const y = wide ? -0.1 : 0;

  return (
    <group position={[x, y, 0]} scale={scale}>
      {incidents.map((inc, i) => (
        <IncidentNode key={inc.id} index={i} inc={inc} step={step} position={LAYOUT[i % LAYOUT.length]} onSelect={onSelect} {...shared} />
      ))}
    </group>
  );
}

const labelAnchor = new THREE.Vector3();

function IncidentNode({
  index,
  inc,
  step,
  position,
  onSelect,
  labels,
  hovered: hoveredId,
  setHovered,
}: {
  index: number;
  inc: SceneIncident;
  step: number;
  position: [number, number, number];
  onSelect: (id: string) => void;
} & NodeShared) {
  const group = useRef<THREE.Group>(null);
  const hovered = hoveredId === inc.id;
  const core = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const cage = useRef<THREE.LineSegments>(null);
  const done = isDone(inc, step);
  const target = useMemo(() => new THREE.Color(done ? inc.afterColor : inc.beforeColor), [done, inc]);

  useFrame(({ camera, size }, dt) => {
    const el = labels.current[index];
    if (el && group.current) {
      group.current.localToWorld(labelAnchor.set(0, -1.25, 0)).project(camera);
      const x = (labelAnchor.x * 0.5 + 0.5) * size.width;
      const y = (-labelAnchor.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    }
    if (core.current) {
      core.current.rotation.y += dt * 0.25;
      core.current.rotation.x += dt * 0.1;
      const s = THREE.MathUtils.lerp(core.current.scale.x, hovered ? 1.12 : 1, damp(8, dt));
      core.current.scale.setScalar(s);
    }
    if (cage.current) {
      cage.current.rotation.y -= dt * 0.12;
      cage.current.rotation.z += dt * 0.05;
    }
    if (coreMat.current) {
      coreMat.current.emissive.lerp(target, damp(3, dt));
      coreMat.current.color.lerp(target, damp(3, dt));
    }
  });

  const cageGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.98, 1)), []);

  return (
    <group ref={group} position={position}>
      <mesh
        ref={core}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(inc.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = '';
        }}
        onClick={() => onSelect(inc.id)}
      >
        <icosahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial
          ref={coreMat}
          color={inc.beforeColor}
          emissive={inc.beforeColor}
          emissiveIntensity={0.32}
          metalness={0.5}
          roughness={0.28}
          flatShading
        />
      </mesh>
      <lineSegments ref={cage} geometry={cageGeo}>
        <lineBasicMaterial color="#8A94A6" transparent opacity={0.1} />
      </lineSegments>
      {inc.variants.map((fixed, i) => (
        <Shard
          key={i}
          index={i}
          count={inc.variants.length}
          flipped={fixed && step > inc.offset + i}
        />
      ))}
      <Shield on={done && inc.guarded} color={inc.afterColor} />
    </group>
  );
}

function Shard({ index, count, flipped }: { index: number; count: number; flipped: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const pulse = useRef(0);
  const wasFlipped = useRef(flipped);
  const orbit = useMemo(
    () => ({
      radius: 1.18 + (index % 2) * 0.22,
      speed: 0.35 + (index % 3) * 0.07,
      phase: (index / Math.max(count, 1)) * Math.PI * 2,
      tilt: 0.5 + index * 0.55,
    }),
    [index, count],
  );

  useFrame(({ clock }, dt) => {
    if (flipped !== wasFlipped.current) {
      wasFlipped.current = flipped;
      pulse.current = 1;
    }
    pulse.current = Math.max(0, pulse.current - dt * 1.6);
    const t = clock.elapsedTime * orbit.speed + orbit.phase;
    if (ref.current) {
      const px = Math.cos(t) * orbit.radius;
      const pz = Math.sin(t) * orbit.radius;
      ref.current.position.set(px, pz * Math.sin(orbit.tilt) * 0.55, pz * Math.cos(orbit.tilt));
      ref.current.rotation.x += dt * 1.2;
      ref.current.rotation.y += dt * 0.8;
      ref.current.scale.setScalar(1 + pulse.current * 1.4);
    }
    if (mat.current) {
      const c = flipped ? GREEN : RED;
      mat.current.color.lerp(c, damp(8, dt));
      mat.current.emissive.lerp(c, damp(8, dt));
      mat.current.emissiveIntensity = 1.1 + pulse.current * 2.5;
    }
  });

  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.1, 0]} />
      <meshStandardMaterial ref={mat} color={RED} emissive={RED} emissiveIntensity={1.1} flatShading />
    </mesh>
  );
}

const shieldVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const shieldFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(vN, vV)), 4.0);
    float scan = 0.85 + 0.15 * sin(vN.y * 18.0 - uTime * 1.5);
    gl_FragColor = vec4(uColor, f * uOpacity * scan);
  }
`;

function Shield({ on, color }: { on: boolean; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  // Built imperatively: R3F copies a declarative `uniforms` prop, so per-frame writes would never reach the GPU.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shieldVert,
        fragmentShader: shieldFrag,
        uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color],
  );
  const uniforms = material.uniforms;

  useFrame(({ clock }, dt) => {
    const u = uniforms.uOpacity;
    u.value = THREE.MathUtils.lerp(u.value, on ? 0.55 : 0, damp(2.5, dt));
    uniforms.uTime.value = clock.elapsedTime;
    if (ref.current) {
      ref.current.visible = u.value > 0.01;
      ref.current.scale.setScalar(0.8 + u.value * 0.36);
    }
  });

  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[1.38, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/** Slow drift plus mouse parallax. */
function CameraRig() {
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, pointer, clock }, dt) => {
    const t = clock.elapsedTime;
    target.set(pointer.x * 0.6 + Math.sin(t * 0.07) * 0.3, pointer.y * 0.35 + Math.cos(t * 0.09) * 0.15, 9);
    camera.position.lerp(target, damp(1.5, dt));
    camera.lookAt(0, 0, 0);
  });
  return null;
}
