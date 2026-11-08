"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { heroFrames } from "@/data/gallery";
import { motion, onReady, wake } from "@/lib/lenis";
import { createFrameMaterial, LazyTexture, planeGeometry } from "./ImagePlane";
import type { Layer } from "./Scene";

// [x, y, z, height] — kept toward the edges so the title stays readable.
const LAYOUT: [number, number, number, number][] = [
  [-2.35, 0.95, -0.6, 1.25],
  [2.45, 1.05, -2.2, 1.35],
  [-1.85, -1.25, -3.6, 1.2],
  [2.05, -1.15, -1.2, 1.05],
  [0.55, 1.75, -5.6, 1.4],
  [-3.3, -0.1, -7.2, 1.6],
];

const CAMERA_Z = 5;
const FLY_DISTANCE = 13.5;

export default function HeroFrames({ layer }: { layer: RefObject<Layer | null> }) {
  const size = useThree((s) => s.size);
  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => new THREE.PerspectiveCamera(35, 1, 0.1, 60), []);
  const frames = useMemo(
    () =>
      heroFrames.slice(0, motion.mobile ? 4 : LAYOUT.length).map((item, i) => ({
        item,
        layout: LAYOUT[i],
        material: createFrameMaterial(item, 14),
      })),
    [],
  );
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const intro = useRef({ value: 0 });
  const turn = useRef<THREE.Vector2[]>([]);

  useEffect(() => {
    layer.current = { scene, camera, visible: true };
    return () => {
      layer.current = null;
    };
  }, [layer, scene, camera]);

  useEffect(() => {
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  // Frames drift in with the hero reveal.
  useEffect(() => {
    let tween: gsap.core.Tween | undefined;
    const off = onReady(() => {
      tween = gsap.to(intro.current, {
        value: 1,
        duration: motion.reduced ? 0.6 : 2.4,
        delay: 0.2,
        ease: "expo.out",
        onUpdate: () => wake(0.1),
      });
    });
    return () => {
      off();
      tween?.kill();
    };
  }, []);

  useEffect(() => () => frames.forEach((f) => f.material.dispose()), [frames]);

  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    const p = motion.hero;
    const visible = motion.heroVisible;
    if (layer.current) layer.current.visible = visible;
    if (!visible) return;

    // Camera: gentle mouse parallax + fly forward on scroll.
    const flying = motion.reduced ? 0 : p;
    const px = motion.mobile ? Math.sin(t * 0.25) * 0.15 : motion.pointer.x * 0.35;
    const py = motion.mobile ? Math.cos(t * 0.2) * 0.1 : motion.pointer.y * 0.22;
    camera.position.x += (px - camera.position.x) * 0.05;
    camera.position.y += (py - camera.position.y) * 0.05;
    camera.position.z = CAMERA_Z - easeInOut(flying) * FLY_DISTANCE;
    look.set(camera.position.x * 0.4, camera.position.y * 0.4, camera.position.z - 6);
    camera.lookAt(look);

    const ic = intro.current.value;
    frames.forEach((f, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const [x, y, z, h] = f.layout;
      const w = h * f.item.aspect;
      const drift = i * 1.7;
      m.position.set(
        x + Math.sin(t * 0.21 + drift) * 0.08,
        y + Math.cos(t * 0.27 + drift) * 0.1 - (1 - ic) * 0.6,
        z + (1 - ic) * -1.5,
      );
      // each frame turns a little toward the cursor, nearer frames more
      const depth = 1 - THREE.MathUtils.clamp(-z / 8, 0, 1) * 0.6;
      const turnX = motion.mobile ? 0 : -motion.pointer.y * 0.22 * depth;
      const turnY = motion.mobile ? 0 : motion.pointer.x * 0.32 * depth;
      const rot = turn.current[i] ?? (turn.current[i] = new THREE.Vector2());
      rot.x += (turnX - rot.x) * 0.06;
      rot.y += (turnY - rot.y) * 0.06;
      m.rotation.set(
        Math.sin(t * 0.18 + drift) * 0.05 + rot.x,
        Math.cos(t * 0.15 + drift) * 0.08 - x * 0.04 + rot.y,
        Math.sin(t * 0.12 + drift) * 0.015,
      );
      m.scale.set(w, h, h);

      // Fade frames that are about to pass through the camera.
      const ahead = camera.position.z - m.position.z;
      const near = THREE.MathUtils.smoothstep(ahead, 0.4, 1.8);
      const fade = motion.reduced ? 1 - p : 1;
      const u = f.material.uniforms;
      u.uOpacity.value = ic * near * fade;
      u.uSize.value.set(w * 100, h * 100);
      u.uShade.value = THREE.MathUtils.clamp((-z - 1) / 8, 0, 1) * 0.6;
      m.visible = u.uOpacity.value > 0.001;
    });
  });

  return createPortal(
    <>
      {frames.map((f, i) => (
        <mesh
          key={f.item.id}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={planeGeometry()}
          material={f.material}
        >
          <LazyTexture item={f.item} material={f.material} near />
        </mesh>
      ))}
    </>,
    scene,
  );
}

function easeInOut(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
