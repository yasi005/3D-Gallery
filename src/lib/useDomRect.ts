"use client";

// DOM ↔ WebGL sync.
// DOM components register an element with `useGlTarget`; the WebGL scene
// lists targets with `useGlTargets` and follows each element's on-screen
// box with `useDomRect` (read once per rendered frame).

import { useCallback, useState, useSyncExternalStore } from "react";
import type { GalleryItem } from "@/data/gallery";

export type GlTarget = {
  key: string;
  kind: "plane" | "room";
  el: HTMLElement;
  item?: GalleryItem;
};

const targets = new Map<string, GlTarget>();
const listeners = new Set<() => void>();
let snapshot: GlTarget[] = [];
const EMPTY: GlTarget[] = [];

function emit() {
  snapshot = [...targets.values()];
  listeners.forEach((l) => l());
}

/** DOM side: returns a ref callback that registers the element. */
export function useGlTarget(key: string, kind: GlTarget["kind"], item?: GalleryItem) {
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      targets.set(key, { key, kind, el, item });
      emit();
      return () => {
        targets.delete(key);
        emit();
      };
    },
    [key, kind, item],
  );
}

/** WebGL side: all registered targets. */
export function useGlTargets() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => snapshot,
    () => EMPTY,
  );
}

export type DomRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** intersects the viewport */
  visible: boolean;
  /** within ~1.5 viewports (used to start loading textures) */
  near: boolean;
};

export function measure(el: HTMLElement, out: DomRect) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  out.x = r.left;
  out.y = r.top;
  out.width = r.width;
  out.height = r.height;
  out.visible = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && r.width > 0;
  out.near = r.bottom > -vh * 1.5 && r.top < vh * 2.5;
  return out;
}

/**
 * Viewport box of a DOM element. Call `update()` inside a WebGL frame
 * callback (kept free of three/R3F so DOM bundles can import this file).
 */
export function useDomRect(el: HTMLElement | null) {
  const [rect] = useState<DomRect>(() => ({ x: 0, y: 0, width: 0, height: 0, visible: false, near: false }));
  const update = useCallback(() => (el ? measure(el, rect) : rect), [el, rect]);
  return { rect, update };
}
