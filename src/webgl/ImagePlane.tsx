"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import gsap from "gsap";
import type { GalleryItem } from "@/data/gallery";
import { placeholderFor } from "@/lib/placeholder";
import { motion, wake } from "@/lib/lenis";
import { useDomRect, type GlTarget } from "@/lib/useDomRect";
import vertexShader from "./shaders/distortion.vert";
import distortionFrag from "./shaders/distortion.frag";
import placeholderFrag from "./shaders/placeholder.frag";

const fragmentShader = placeholderFrag + "\n" + distortionFrag;

/** Shared shader material for every image in WebGL (gallery, hero, room). */
export function createFrameMaterial(item: GalleryItem, radius = 18) {
  const ph = placeholderFor(item.id);
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTexture: { value: null },
      uTextureMix: { value: 0 },
      uImageAspect: { value: item.aspect },
      uSize: { value: new THREE.Vector2(100 * item.aspect, 100) },
      uRadius: { value: radius },
      uColorA: { value: new THREE.Color(ph.a) },
      uColorB: { value: new THREE.Color(ph.b) },
      uAngle: { value: (ph.angle * Math.PI) / 180 },
      uSeed: { value: ph.seed },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uBend: { value: 0 },
      uRgb: { value: 0 },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uOpacity: { value: 1 },
      uShade: { value: 0 },
      uReveal: { value: 1 },
      uParallax: { value: 0 },
      uInner: { value: 0 },
    },
  });
}

/** Loads a texture (suspends) and fades it into the material. */
function TextureSlot({ src, material }: { src: string; material: THREE.ShaderMaterial }) {
  const texture = useTexture(src);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    const img = texture.image as { width?: number; height?: number } | undefined;
    if (img?.width && img?.height) material.uniforms.uImageAspect.value = img.width / img.height;
    material.uniforms.uTexture.value = texture;
    const tween = gsap.to(material.uniforms.uTextureMix, {
      value: 1,
      duration: 1.2,
      onUpdate: () => wake(0.1),
    });
    return () => {
      tween.kill();
    };
  }, [texture, material, gl]);
  return null;
}

/**
 * Lazily attaches a real texture once `near` becomes true.
 * The placeholder shader stays visible while it loads (and forever if
 * the slot has no `src`).
 */
export function LazyTexture({
  item,
  material,
  near,
}: {
  item: GalleryItem;
  material: THREE.ShaderMaterial;
  near: boolean;
}) {
  if (!item.src || !near) return null;
  return (
    <Suspense fallback={null}>
      <TextureSlot src={item.src} material={material} />
    </Suspense>
  );
}

let sharedGeometry: THREE.PlaneGeometry | null = null;
export function planeGeometry() {
  if (!sharedGeometry) {
    const segments = motion.mobile ? 12 : 40;
    sharedGeometry = new THREE.PlaneGeometry(1, 1, segments, segments);
  }
  return sharedGeometry;
}

/** A WebGL plane that follows a DOM element's box (gallery images). */
export function ImagePlane({ target }: { target: GlTarget }) {
  const item = target.item!;
  const mesh = useRef<THREE.Mesh>(null);
  const size = useThree((s) => s.size);
  const { rect, update } = useDomRect(target.el);
  const material = useMemo(() => {
    const m = createFrameMaterial(item, 18);
    m.uniforms.uReveal.value = motion.reduced ? 1 : 0;
    m.uniforms.uInner.value = motion.reduced ? 0 : 1;
    return m;
  }, [item]);
  const hover = useRef({ value: 0, target: 0, mx: 0.5, my: 0.5 });
  const [near, setNear] = useState(false);
  const revealed = useRef(motion.reduced);

  useEffect(() => {
    const u = material.uniforms.uReveal;
    return () => {
      gsap.killTweensOf(u);
    };
  }, [material]);

  // Hover is read from the DOM box: the canvas sits behind the page.
  useEffect(() => {
    if (motion.reduced) return;
    const el = target.el;
    const h = hover.current;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      h.mx = (e.clientX - r.left) / r.width;
      h.my = 1 - (e.clientY - r.top) / r.height;
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      move(e);
      h.target = 1;
      wake(1);
    };
    const leave = () => {
      h.target = 0;
      wake(1.5);
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [target.el]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    update();
    m.visible = rect.visible;
    if (rect.near && !near) setNear(true);
    if (!rect.visible) return;

    m.position.set(
      rect.x + rect.width / 2 - size.width / 2,
      -(rect.y + rect.height / 2 - size.height / 2),
      0,
    );
    m.scale.set(rect.width, rect.height, rect.height);

    // Unfold once, when the box is well inside the viewport.
    if (!revealed.current && motion.ready && rect.y < size.height * 0.85) {
      revealed.current = true;
      gsap.to(material.uniforms.uReveal, {
        value: 1,
        duration: 2.2,
        ease: "power3.inOut",
        onUpdate: () => wake(0.1),
      });
    }

    const h = hover.current;
    h.value += (h.target - h.value) * Math.min(1, delta * 4);
    if (Math.abs(h.target - h.value) > 0.002 || h.value > 0.01) wake(0.1);

    const u = material.uniforms;
    u.uSize.value.set(rect.width, rect.height);
    u.uTime.value = state.clock.elapsedTime;
    u.uVelocity.value = motion.velocity;
    u.uBend.value = motion.reduced ? 0 : 1;
    u.uRgb.value = motion.reduced || motion.mobile ? 0 : 1;
    u.uHover.value = h.value;
    u.uMouse.value.set(h.mx, h.my);
    // -1 when the plane sits at the bottom of the screen, +1 at the top
    u.uParallax.value = THREE.MathUtils.clamp(
      ((rect.y + rect.height / 2) / size.height) * -2 + 1,
      -1.2,
      1.2,
    );
  });

  return (
    <mesh ref={mesh} geometry={planeGeometry()} material={material} visible={false}>
      <LazyTexture item={item} material={material} near={near} />
    </mesh>
  );
}
