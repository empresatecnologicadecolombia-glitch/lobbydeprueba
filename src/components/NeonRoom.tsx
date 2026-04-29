import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Stars, useVideoTexture } from "@react-three/drei";
import { Maximize2, Minimize2 } from "lucide-react";
import * as THREE from "three";

const ROOM_SIZE = 20;
const WALL_HEIGHT = 8;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.4;
const MOVE_SPEED = 4.5;

const WALL_COLOR = "#EAECEE";

// ---------- Pearly white wall ----------
function Wall({
  position,
  rotation,
  width,
  height,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={WALL_COLOR}
        roughness={0.2}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ---------- Ceiling ----------
function Ceiling() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]} receiveShadow>
      <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      <meshStandardMaterial color="#F0F0F0" roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

// ---------- Floor with cyan neon grid ----------
function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color="#1a1d24" roughness={0.4} metalness={0.3} />
      </mesh>
      <gridHelper
        args={[ROOM_SIZE, ROOM_SIZE, "#00ffff", "#00ffff"]}
        position={[0, 0.01, 0]}
      />
    </>
  );
}

// ---------- Room with 4 walls ----------
function Room() {
  const half = ROOM_SIZE / 2;
  const midY = WALL_HEIGHT / 2;
  return (
    <>
      <Floor />
      <Ceiling />
      <Wall position={[0, midY, -half]} rotation={[0, 0, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} />
      <Wall position={[0, midY, half]} rotation={[0, Math.PI, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} />
      <Wall position={[-half, midY, 0]} rotation={[0, Math.PI / 2, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} />
      <Wall position={[half, midY, 0]} rotation={[0, -Math.PI / 2, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} />
    </>
  );
}

// ---------- Holographic neon screen (reusable on any wall) ----------
function HoloScreen({
  position,
  rotation,
  width = 8,
  height = 4.5,
  frameColor = "#00ffff",
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width?: number;
  height?: number;
  frameColor?: string;
}) {
  const w = width;
  const h = height;
  return (
    <group position={position} rotation={rotation}>
      {/* Border lines using thin emissive planes */}
      {[
        { p: [0, h / 2, 0.01] as [number, number, number], s: [w, 0.04] as [number, number] },
        { p: [0, -h / 2, 0.01] as [number, number, number], s: [w, 0.04] as [number, number] },
        { p: [-w / 2, 0, 0.01] as [number, number, number], s: [0.04, h] as [number, number] },
        { p: [w / 2, 0, 0.01] as [number, number, number], s: [0.04, h] as [number, number] },
      ].map((b, i) => (
        <mesh key={i} position={b.p}>
          <planeGeometry args={b.s} />
          <meshBasicMaterial color={frameColor} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- 4 holographic screens, one centered on each wall ----------
function HoloScreens() {
  const half = ROOM_SIZE / 2;
  const y = WALL_HEIGHT / 2;
  const off = 0.03;
  return (
    <>
      {/* Back wall (-Z) */}
      <HoloScreen position={[0, y, -half + off]} rotation={[0, 0, 0]} />
      {/* Front wall (+Z) */}
      <HoloScreen position={[0, y, half - off]} rotation={[0, Math.PI, 0]} />
      {/* Left wall (-X) */}
      <HoloScreen position={[-half + off, y, 0]} rotation={[0, Math.PI / 2, 0]} />
      {/* Right wall (+X) */}
      <HoloScreen position={[half - off, y, 0]} rotation={[0, -Math.PI / 2, 0]} />
    </>
  );
}

function VideoWall({
  position,
  rotation,
  muted = true,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  muted?: boolean;
}) {
  const videoTexture = useVideoTexture("/beele-casaparlante.mp4", {
    muted,
    loop: true,
    playsInline: true,
    crossOrigin: "anonymous",
    start: true,
  });

  useEffect(() => {
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;
    videoTexture.wrapS = THREE.ClampToEdgeWrapping;
    videoTexture.wrapT = THREE.ClampToEdgeWrapping;
  }, [videoTexture]);

  useEffect(() => {
    const videoEl = videoTexture.image;
    if (!(videoEl instanceof HTMLVideoElement)) return;

    videoEl.muted = muted;
    videoEl.volume = muted ? 0 : 1;

    if (muted) return;

    const tryPlay = () => {
      videoEl.play().catch(() => {
        // On some browsers, audio starts after first gesture.
      });
    };

    tryPlay();
    window.addEventListener("pointerdown", tryPlay, { passive: true });
    window.addEventListener("keydown", tryPlay);
    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, [videoTexture, muted]);

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[8, 4.5]} />
        <meshBasicMaterial map={videoTexture} toneMapped={false} color="#ffffff" />
      </mesh>
    </group>
  );
}

function WallVideoScreens() {
  const half = ROOM_SIZE / 2;
  const y = WALL_HEIGHT / 2;
  const off = 0.06;

  return (
    <>
      <VideoWall position={[0, y, -half + off]} rotation={[0, 0, 0]} muted={false} />
    </>
  );
}

// ---------- Modern lounge set in the back-left corner ----------
function LoungeSet() {
  const half = ROOM_SIZE / 2;
  // Anchor near back-left corner
  const cx = -half + 3.2;
  const cz = -half + 3.2;

  const sofaColor = "#1a1a1d"; // matte charcoal
  const cushionColor = "#26262b";
  const tableTop = "#0f0f12";
  const tableBase = "#2a2a2f";

  return (
    <group position={[cx, 0, cz]}>
      {/* Rug under the set */}
      <mesh position={[0.4, 0.005, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.2, 5.2]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.95} metalness={0} />
      </mesh>

      {/* L-Sofa: long segment along -Z (against back wall direction) */}
      <group position={[0, 0, -1.6]}>
        {/* Base */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.5, 1.0]} />
          <meshStandardMaterial color={sofaColor} roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.85, -0.4]} castShadow>
          <boxGeometry args={[3.2, 0.7, 0.2]} />
          <meshStandardMaterial color={sofaColor} roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Cushions */}
        {[-1.0, 0, 1.0].map((x, i) => (
          <mesh key={i} position={[x, 0.6, 0.05]} castShadow>
            <boxGeometry args={[0.95, 0.25, 0.85]} />
            <meshStandardMaterial color={cushionColor} roughness={0.7} metalness={0.05} />
          </mesh>
        ))}
      </group>

      {/* L-Sofa: short segment along -X */}
      <group position={[-1.6, 0, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.5, 2.4]} />
          <meshStandardMaterial color={sofaColor} roughness={0.6} metalness={0.05} />
        </mesh>
        <mesh position={[-0.4, 0.85, 0]} castShadow>
          <boxGeometry args={[0.2, 0.7, 2.4]} />
          <meshStandardMaterial color={sofaColor} roughness={0.6} metalness={0.05} />
        </mesh>
        {[-0.8, 0.2, 1.1].map((z, i) => (
          <mesh key={i} position={[0.05, 0.6, z]} castShadow>
            <boxGeometry args={[0.85, 0.25, 0.85]} />
            <meshStandardMaterial color={cushionColor} roughness={0.7} metalness={0.05} />
          </mesh>
        ))}
      </group>

      {/* Low coffee table */}
      <group position={[0.4, 0, 0.2]}>
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.08, 0.9]} />
          <meshStandardMaterial color={tableTop} roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[1.4, 0.24, 0.7]} />
          <meshStandardMaterial color={tableBase} roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Subtle cyan underglow strip */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[1.5, 0.02, 0.8]} />
          <meshBasicMaterial color="#00ffff" toneMapped={false} />
        </mesh>
      </group>

      {/* Floor lamp accent (slim emissive pole) */}
      <group position={[1.7, 0, -1.7]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 2.2, 12]} />
          <meshStandardMaterial color="#1a1a1d" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.25, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#ff2bd6"
            emissive="#ff2bd6"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
        <pointLight position={[0, 2.25, 0]} color="#ff2bd6" intensity={8} distance={6} decay={2} />
      </group>
    </group>
  );
}

// ---------- Spotlight that highlights the lounge set ----------
function LoungeSpotlight() {
  const half = ROOM_SIZE / 2;
  const target = useRef<THREE.Object3D>(new THREE.Object3D());
  const { scene } = useThree();

  useEffect(() => {
    target.current.position.set(-half + 3.6, 0.4, -half + 3.6);
    scene.add(target.current);
    return () => {
      scene.remove(target.current);
    };
  }, [scene, half]);

  return (
    <spotLight
      position={[-half + 3.6, WALL_HEIGHT - 0.5, -half + 3.6]}
      angle={0.55}
      penumbra={0.6}
      intensity={45}
      distance={14}
      decay={2}
      color="#ffffff"
      castShadow
      target={target.current}
    />
  );
}

// ---------- Neon accent lights that bounce off the pearly walls ----------
function NeonAccents() {
  const half = ROOM_SIZE / 2 - 1.2;
  const y = WALL_HEIGHT - 1.2;
  const lights: { pos: [number, number, number]; color: string; intensity: number }[] = [
    { pos: [-half, y, -half], color: "#00ffff", intensity: 60 }, // cyan
    { pos: [half, y, half], color: "#ff2bd6", intensity: 55 }, // magenta
    { pos: [half, y, -half], color: "#9d4bff", intensity: 35 }, // violet accent
    { pos: [-half, y, half], color: "#00ffaa", intensity: 30 }, // mint accent
  ];

  return (
    <>
      {lights.map((l, i) => (
        <group key={i} position={l.pos}>
          <pointLight
            color={l.color}
            intensity={l.intensity}
            distance={26}
            decay={2}
          />
          <mesh>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial
              color={l.color}
              emissive={l.color}
              emissiveIntensity={4}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---------- Earth + Moon attached to the camera ----------
function EarthMoonAnchor() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const moonPivotRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    camera.add(group);
    return () => {
      camera.remove(group);
    };
  }, [camera]);

  useFrame((_, delta) => {
    if (moonPivotRef.current) {
      moonPivotRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -5]}>
      {/* Earth */}
      <mesh>
        <sphereGeometry args={[0.7, 48, 48]} />
        <meshStandardMaterial
          color="#1e6fff"
          roughness={0.55}
          metalness={0.15}
          emissive="#0a2a6b"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Soft halo to keep Earth readable against bright walls */}
      <mesh>
        <sphereGeometry args={[0.78, 32, 32]} />
        <meshBasicMaterial color="#3aa0ff" transparent opacity={0.12} />
      </mesh>

      {/* Key light at the Earth */}
      <pointLight color="#ffffff" intensity={3.2} distance={9} decay={2} />

      {/* Moon orbiting */}
      <group ref={moonPivotRef}>
        <mesh position={[1.6, 0.2, 0]}>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.9}
            metalness={0}
            emissive="#bcd4ff"
            emissiveIntensity={0.15}
          />
        </mesh>
      </group>
    </group>
  );
}

// ---------- First Person Controller (WASD) ----------
function FirstPersonController() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const touchLookId = useRef<number | null>(null);
  const touchMoveId = useRef<number | null>(null);
  const lastLook = useRef({ x: 0, y: 0 });
  const moveOrigin = useRef({ x: 0, y: 0 });
  const touchMoveVec = useRef({ x: 0, y: 0 });
  const isCoarse = useRef(false);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 4);
  }, [camera]);

  useEffect(() => {
    isCoarse.current = window.matchMedia("(pointer: coarse)").matches;
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!isCoarse.current) return;
    const LOOK_SENS = 0.0032;
    const MOVE_RADIUS = 82;

    const onTouchStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX > window.innerWidth * 0.5 && touchLookId.current === null) {
          touchLookId.current = t.identifier;
          lastLook.current = { x: t.clientX, y: t.clientY };
        } else if (t.clientX <= window.innerWidth * 0.5 && touchMoveId.current === null) {
          touchMoveId.current = t.identifier;
          moveOrigin.current = { x: t.clientX, y: t.clientY };
          touchMoveVec.current = { x: 0, y: 0 };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === touchLookId.current) {
          const dx = t.clientX - lastLook.current.x;
          const dy = t.clientY - lastLook.current.y;
          lastLook.current = { x: t.clientX, y: t.clientY };
          camera.rotation.y -= dx * LOOK_SENS;
          camera.rotation.x = THREE.MathUtils.clamp(
            camera.rotation.x - dy * LOOK_SENS,
            -Math.PI / 2 + 0.05,
            Math.PI / 2 - 0.05,
          );
        }
        if (t.identifier === touchMoveId.current) {
          const dx = t.clientX - moveOrigin.current.x;
          const dy = t.clientY - moveOrigin.current.y;
          touchMoveVec.current = {
            x: THREE.MathUtils.clamp(dx / MOVE_RADIUS, -1, 1),
            y: THREE.MathUtils.clamp(dy / MOVE_RADIUS, -1, 1),
          };
        }
      }
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === touchLookId.current) touchLookId.current = null;
        if (t.identifier === touchMoveId.current) {
          touchMoveId.current = null;
          touchMoveVec.current = { x: 0, y: 0 };
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [camera]);

  useFrame((_, delta) => {
    const k = keys.current;
    const keyForward = (k["KeyW"] ? 1 : 0) - (k["KeyS"] ? 1 : 0);
    const keyStrafe = (k["KeyD"] ? 1 : 0) - (k["KeyA"] ? 1 : 0);
    const forward = THREE.MathUtils.clamp(keyForward - touchMoveVec.current.y, -1, 1);
    const strafe = THREE.MathUtils.clamp(keyStrafe + touchMoveVec.current.x, -1, 1);

    direction.current.set(-strafe, 0, forward).normalize();
    const yaw = new THREE.Euler(0, camera.rotation.y, 0, "YXZ");
    direction.current.applyEuler(yaw);

    velocity.current.x = direction.current.x * MOVE_SPEED;
    velocity.current.z = direction.current.z * MOVE_SPEED;

    camera.position.x += velocity.current.x * delta;
    camera.position.z += velocity.current.z * delta;

    const limit = ROOM_SIZE / 2 - PLAYER_RADIUS;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
    camera.position.y = PLAYER_HEIGHT;
  });

  return null;
}

export default function NeonRoom() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sourceHostRef = useRef<HTMLDivElement>(null);
  const leftEyeRef = useRef<HTMLCanvasElement>(null);
  const rightEyeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const pressedM = e.code === "KeyM" || e.key === "m" || e.key === "M";
      if (!pressedM) return;

      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      // Fullscreen can fail without user gesture or due to browser policy.
      console.error("Fullscreen toggle failed:", error);
    }
  };

  useEffect(() => {
    const sourceCanvas = sourceHostRef.current?.querySelector("canvas");
    if (!sourceCanvas) return;

    const drawToEye = (target: HTMLCanvasElement | null) => {
      if (!target) return;
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(target.clientWidth * dpr));
      const height = Math.max(1, Math.floor(target.clientHeight * dpr));

      if (target.width !== width || target.height !== height) {
        target.width = width;
        target.height = height;
      }

      const ctx = target.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, width, height);
    };

    let rafId = 0;
    const tick = () => {
      drawToEye(leftEyeRef.current);
      drawToEye(rightEyeRef.current);
      rafId = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Single render source (hidden) */}
      <div ref={sourceHostRef} className="absolute inset-0 opacity-0">
        <Canvas
          camera={{ fov: 75, near: 0.1, far: 200, position: [0, PLAYER_HEIGHT, 4] }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#050510"]} />

          <Stars
            radius={80}
            depth={50}
            count={4000}
            factor={4}
            saturation={0}
            fade
            speed={0.5}
          />

          <ambientLight intensity={0.55} />
          <directionalLight position={[5, 8, 5]} intensity={0.4} color="#ffffff" />

          <Room />
          <HoloScreens />
          <WallVideoScreens />
          <NeonAccents />
          <LoungeSet />
          <LoungeSpotlight />

          <EarthMoonAnchor />
          <FirstPersonController />

          <PointerLockControls />
        </Canvas>
      </div>

      {/* Mirrored output for both eyes, each with full bubble */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 bg-black px-[6%]">
        <div className="relative h-full w-full max-w-[44%] overflow-hidden">
          <canvas
            ref={leftEyeRef}
            className="h-full w-full"
            style={{ filter: "url(#global-bubble)", transform: "scale(1.04)" }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "#000",
              WebkitMaskImage:
                "radial-gradient(ellipse 56% 60% at 50% 50%, transparent 58%, rgba(0,0,0,0.9) 74%, black 100%)",
              maskImage:
                "radial-gradient(ellipse 56% 60% at 50% 50%, transparent 58%, rgba(0,0,0,0.9) 74%, black 100%)",
            }}
          />
        </div>
        <div className="relative h-full w-full max-w-[44%] overflow-hidden">
          <canvas
            ref={rightEyeRef}
            className="h-full w-full"
            style={{ filter: "url(#global-bubble)", transform: "scale(1.04)" }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "#000",
              WebkitMaskImage:
                "radial-gradient(ellipse 56% 60% at 50% 50%, transparent 58%, rgba(0,0,0,0.9) 74%, black 100%)",
              maskImage:
                "radial-gradient(ellipse 56% 60% at 50% 50%, transparent 58%, rgba(0,0,0,0.9) 74%, black 100%)",
            }}
          />
        </div>
      </div>

      <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0" focusable="false">
        <filter id="global-bubble" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.0035 0.0035"
            numOctaves="1"
            seed="11"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="34"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="group absolute right-5 top-5 z-50 inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-slate-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.22)] backdrop-blur-md transition-all duration-300 hover:border-cyan-200 hover:text-cyan-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Entrar en pantalla completa"}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        <span>{isFullscreen ? "Exit Fullscreen" : "Full Screen"}</span>
      </button>

    </div>
  );
}
