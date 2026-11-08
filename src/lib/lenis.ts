"use client";

// One shared motion setup: Lenis + GSAP ticker + ScrollTrigger, and a tiny
// mutable store that DOM sections write to and the WebGL scene reads from
// every frame (no React state, no re-renders).

import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useLayoutEffect, type ReactNode, type RefObject } from "react";

export const MOBILE_QUERY = "(max-width: 768px), (hover: none)";
export const DESKTOP_QUERY = "(min-width: 769px) and (hover: hover)";
export const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: "power3.out", duration: 1.2 });

type Listener = () => void;
const readyListeners = new Set<Listener>();
const webglListeners = new Set<Listener>();

export const motion = {
  lenis: null as Lenis | null,
  /** smoothed scroll velocity, roughly -1..1 */
  velocity: 0,
  /** pointer in -1..1, y up */
  pointer: { x: 0, y: 0 },
  reduced: false,
  mobile: false,
  ready: false,
  webgl: "pending" as "pending" | "on" | "off",
  /** preloader inputs, each 0..1 */
  loaded: { fonts: 0, canvas: 0, textures: 1 },
  /** hero fly-through progress 0..1 */
  hero: 0,
  heroVisible: true,
  /** walkable room: input written by the DOM section, read by WebGL */
  explore: {
    active: false,
    /** KeyboardEvent.code values currently held */
    keys: new Set<string>(),
    /** mouse-look delta in px since the last frame (consumed by WebGL) */
    look: { x: 0, y: 0 },
    /** a click happened (consumed by WebGL: inspect / step back) */
    click: false,
    /** a movement key was pressed (consumed by WebGL: leaves inspect mode) */
    back: false,
  },
  roomVisible: false,
  roomLabel: null as HTMLElement | null,
  roomActive: -1,
  /** set by the room section: called when the visitor faces / turns from a frame */
  onRoomActive: null as ((index: number) => void) | null,
  /** set by the room section: called when a work is opened (index) or closed (-1) */
  onRoomFocus: null as ((index: number) => void) | null,
  /** preview still for the room box: aspect of the box, and whether to re-shoot */
  roomPoster: { aspect: 16 / 9, dirty: true },
  /** set by the room section: receives a blob URL of the latest still */
  onRoomPoster: null as ((url: string) => void) | null,
  /** set by the room section: the exit doors were clicked (they open for ~0.85s) */
  onRoomLeave: null as (() => void) | null,
  /** set by the room section: the visitor walked out through the exit door */
  onRoomExit: null as (() => void) | null,
  /** keep rendering until this time (seconds, gsap ticker time) */
  awakeUntil: 0,
  /** set by the WebGL scene: renders one frame */
  render: null as ((time: number) => void) | null,
};

/** Ask for frames for the next `seconds` (scroll, hover, texture load…). */
export function wake(seconds = 0.6) {
  motion.awakeUntil = Math.max(motion.awakeUntil, gsap.ticker.time + seconds);
}

export function onReady(cb: Listener) {
  if (motion.ready) {
    cb();
    return () => {};
  }
  readyListeners.add(cb);
  return () => void readyListeners.delete(cb);
}

/** Called by the preloader when it starts revealing the page. */
export function setReady() {
  if (motion.ready) return;
  motion.ready = true;
  document.documentElement.classList.remove("is-loading");
  window.scrollTo(0, 0);
  motion.lenis?.scrollTo(0, { immediate: true, force: true });
  motion.lenis?.start();
  ScrollTrigger.refresh();
  readyListeners.forEach((cb) => cb());
  readyListeners.clear();
  wake(1);
}

export function setWebgl(state: "on" | "off") {
  motion.webgl = state;
  document.documentElement.classList.toggle("webgl-on", state === "on");
  webglListeners.forEach((cb) => cb());
}

export function subscribeWebgl(cb: Listener) {
  webglListeners.add(cb);
  return () => void webglListeners.delete(cb);
}

export function scrollToTop() {
  if (motion.lenis) {
    motion.lenis.scrollTo(0, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    window.scrollTo({ top: 0, behavior: motion.reduced ? "auto" : "smooth" });
  }
}

/** Mounted once in the root layout. */
export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    motion.reduced = matchMedia(REDUCED_QUERY).matches;
    motion.mobile = matchMedia(MOBILE_QUERY).matches;

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    let lenis: Lenis | null = null;
    if (!motion.reduced) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, autoRaf: false, anchors: true });
      lenis.on("scroll", ScrollTrigger.update);
      if (!motion.ready) lenis.stop();
      motion.lenis = lenis;
    }

    let skewers: ((v: number) => void)[] | null = null;
    let lastSkew = 0;

    // Page background eases between scene colours ([data-bg] on sections).
    const bgTriggers = gsap.utils.toArray<HTMLElement>("[data-bg]").map((section) =>
      ScrollTrigger.create({
        trigger: section,
        start: "top 60%",
        end: "bottom 60%",
        refreshPriority: -1,
        onToggle: (self) => {
          if (!self.isActive) return;
          gsap.to(document.documentElement, {
            "--page": section.dataset.bg,
            duration: 1.4,
            ease: "power2.out",
            overwrite: true,
          });
        },
      }),
    );

    const tick = (time: number) => {
      lenis?.raf(time * 1000);

      const raw = lenis && !motion.reduced ? lenis.velocity / 35 : 0;
      const target = Math.max(-1, Math.min(1, raw));
      motion.velocity += (target - motion.velocity) * 0.12;
      if (Math.abs(motion.velocity) < 0.0005) motion.velocity = 0;

      // Headings marked [data-skew] lean with scroll speed.
      if (motion.velocity !== lastSkew) {
        lastSkew = motion.velocity;
        if (!skewers) {
          skewers = gsap.utils
            .toArray<HTMLElement>("[data-skew]")
            .map((el) => gsap.quickSetter(el, "skewY", "deg") as (v: number) => void);
        }
        const deg = -motion.velocity * 4;
        skewers.forEach((set) => set(deg));
      }

      const busy =
        motion.velocity !== 0 ||
        time < motion.awakeUntil ||
        motion.heroVisible ||
        motion.roomVisible ||
        !motion.ready;
      if (busy && motion.render && !document.hidden) motion.render(time);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onPointer = (e: PointerEvent) => {
      motion.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      motion.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      wake(1.5);
    };
    const onScroll = () => wake(0.4);
    const onResize = () => wake(0.5);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      gsap.ticker.remove(tick);
      bgTriggers.forEach((t) => t.kill());
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      lenis?.destroy();
      motion.lenis = null;
    };
  }, []);

  return children;
}

export type MotionConditions = {
  desktop: boolean;
  mobile: boolean;
  reduced: boolean;
};

/**
 * Scoped GSAP setup for a section. `setup` re-runs when the media
 * conditions change; everything it creates (tweens, ScrollTriggers) is
 * reverted automatically on change and on unmount.
 */
export function useScrollScene(
  scope: RefObject<HTMLElement | null>,
  setup: (c: MotionConditions) => void | (() => void),
) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia(scope.current ?? undefined);
    mm.add(
      { desktop: DESKTOP_QUERY, mobile: MOBILE_QUERY, reduced: REDUCED_QUERY },
      (ctx) => setup(ctx.conditions as MotionConditions),
    );
    return () => mm.revert();
    // setup is intentionally run once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export { gsap, ScrollTrigger };
