"use client";

import { useEffect, useRef } from "react";
import { DESKTOP_QUERY, gsap } from "@/lib/lenis";
import styles from "./Cursor.module.css";

/** Small cocoa dot; grows into a "view" ring over [data-cursor] elements. */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dot.current;
    const halo = ring.current;
    if (!el || !halo || !matchMedia(DESKTOP_QUERY).matches) return;

    const html = document.documentElement;
    html.classList.add("has-cursor");
    const x = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });
    // a soft ring that trails behind and stretches with speed
    const rx = gsap.quickTo(halo, "x", { duration: 0.9, ease: "power3.out" });
    const ry = gsap.quickTo(halo, "y", { duration: 0.9, ease: "power3.out" });
    let px = 0;
    let py = 0;
    let stretch = 0;
    const squash = () => {
      if (stretch < 0.001) return;
      stretch *= 0.88;
      gsap.set(halo, { scaleX: 1 + stretch, scaleY: 1 - stretch * 0.5 });
    };
    gsap.ticker.add(squash);
    let shown = false;
    let current: string | null = null;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!shown) {
        gsap.set([el, halo], { x: e.clientX, y: e.clientY });
        gsap.to([el, halo], { autoAlpha: 1, duration: 0.3 });
        shown = true;
        px = e.clientX;
        py = e.clientY;
      }
      x(e.clientX);
      y(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      stretch = Math.min(0.6, stretch + Math.hypot(dx, dy) / 400);
      gsap.set(halo, { rotate: (Math.atan2(dy, dx) * 180) / Math.PI });

      const hit = (e.target as Element | null)?.closest?.("[data-cursor]");
      const label = hit?.getAttribute("data-cursor") ?? null;
      if (label !== current) {
        current = label;
        if (text.current) text.current.textContent = label ?? "";
        el.classList.toggle(styles.active, !!label);
        halo.classList.toggle(styles.ringHidden, !!label);
      }
    };
    const leave = () => {
      shown = false;
      gsap.to([el, halo], { autoAlpha: 0, duration: 0.3 });
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      html.classList.remove("has-cursor");
      gsap.ticker.remove(squash);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <>
      <div ref={ring} className={styles.ring} data-cursor-ui aria-hidden />
      <div ref={dot} className={styles.cursor} data-cursor-ui aria-hidden>
        <span ref={text} className={styles.text} />
      </div>
    </>
  );
}
