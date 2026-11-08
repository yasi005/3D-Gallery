"use client";

// The single fixed <Canvas> behind the page.
// Three layers are drawn into it every frame, in order:
//   1. hero frames (own perspective camera, full viewport)
//   2. DOM-synced image planes (pixel-space camera: 1 unit = 1 CSS px)
//   3. the 3D room (own camera, scissored to its DOM stage)
// Rendering is driven manually from the shared GSAP ticker (frameloop
// "never" + advance) so WebGL and DOM move in the same frame, and frames
// are only rendered when something is actually moving.

import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, advance, useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { DESKTOP_QUERY, MOBILE_QUERY, REDUCED_QUERY, motion, setWebgl, wake } from "@/lib/lenis";
import { useGlTargets, type DomRect } from "@/lib/useDomRect";
import { ImagePlane } from "./ImagePlane";
import HeroFrames from "./HeroFrames";
import Room from "./Room";

export type Layer = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  visible: boolean;
  /** viewport rect to scissor into (CSS px); full screen when omitted */
  rect?: DomRect;
};

const FOV = 30;

/** Main camera: positioned so that z = 0 maps 1 unit to 1 CSS pixel. */
function PixelCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    camera.fov = FOV;
    camera.position.set(0, 0, size.height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    camera.near = 10;
    camera.far = camera.position.z * 3;
    camera.updateProjectionMatrix();
    wake(0.3);
  }, [camera, size]);
  return null;
}

function Renderer({ hero, room }: { hero: RefObject<Layer | null>; room: RefObject<Layer | null> }) {
  useFrame(({ gl, scene, camera, size }) => {
    gl.autoClear = false;
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.clear(true, true, true);

    // Walking the room: it covers the whole screen, so skip everything else.
    if (!motion.explore.active) {
      const h = hero.current;
      if (h?.visible) {
        gl.render(h.scene, h.camera);
        gl.clearDepth();
      }
      gl.render(scene, camera);
    }

    const r = room.current;
    if (r?.visible && r.rect) {
      const { x, y, width, height } = r.rect;
      const bottom = size.height - (y + height);
      gl.clearDepth();
      gl.setViewport(x, bottom, width, height);
      gl.setScissor(x, bottom, width, height);
      gl.setScissorTest(true);
      gl.render(r.scene, r.camera);
      gl.setScissorTest(false);
      gl.setViewport(0, 0, size.width, size.height);
    }
  }, 1);
  return null;
}

/** Feeds texture progress to the preloader and wires the manual frame loop. */
function Bridge() {
  // Subscribe outside React: the loader reports progress while textures are
  // suspending mid-render, and this only feeds a plain value anyway.
  useEffect(() => {
    const apply = ({ active, progress }: { active: boolean; progress: number }) => {
      motion.loaded.textures = active ? progress / 100 : 1;
    };
    apply(useProgress.getState());
    return useProgress.subscribe(apply);
  }, []);

  useEffect(() => {
    motion.render = (time) => advance(time);
    // Wait two frames so suspended textures have started loading.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        motion.loaded.canvas = 1;
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      motion.render = null;
    };
  }, []);
  return null;
}

class WebglBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    setWebgl("off");
    motion.loaded.canvas = 1;
    motion.loaded.textures = 1;
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function hasWebgl() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Scene() {
  const [env] = useState(() => ({
    ok: hasWebgl(),
    room: matchMedia(DESKTOP_QUERY).matches && !matchMedia(REDUCED_QUERY).matches,
    mobile: matchMedia(MOBILE_QUERY).matches,
  }));
  const targets = useGlTargets();
  const hero = useRef<Layer | null>(null);
  const room = useRef<Layer | null>(null);
  const roomTarget = targets.find((t) => t.kind === "room");

  useEffect(() => {
    motion.mobile = env.mobile;
    if (!env.ok) {
      setWebgl("off");
      motion.loaded.canvas = 1;
    }
  }, [env]);

  if (!env.ok) return null;

  return (
    <div
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      <WebglBoundary>
        <Canvas
          frameloop="never"
          dpr={[1, env.mobile ? 1.25 : 1.5]}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          camera={{ fov: FOV, near: 10, far: 5000, position: [0, 0, 1000] }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            setWebgl("on");
          }}
        >
          <PixelCamera />
          <Bridge />
          <HeroFrames layer={hero} />
          {targets
            .filter((t) => t.kind === "plane" && t.item)
            .map((t) => (
              <ImagePlane key={t.key} target={t} />
            ))}
          {env.room && roomTarget && <Room target={roomTarget} layer={room} />}
          <Renderer hero={hero} room={room} />
        </Canvas>
      </WebglBoundary>
    </div>
  );
}
