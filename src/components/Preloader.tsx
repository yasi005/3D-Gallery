"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, motion, setReady } from "@/lib/lenis";
import styles from "./Preloader.module.css";

const MIN_DURATION = 1.6; // seconds — never flash
const MAX_DURATION = 9; // give up waiting and reveal anyway

export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = root.current;
    const num = counter.current;
    if (!el || !num) return;

    document.fonts?.ready.then(() => (motion.loaded.fonts = 1));
    const start = performance.now();
    const shown = { value: 0 };
    let finished = false;
    let tl: gsap.core.Timeline | undefined;

    const finish = () => {
      finished = true;
      gsap.ticker.remove(tick);
      num.textContent = "100";
      if (motion.reduced) {
        setReady();
        tl = gsap.timeline({ onComplete: () => setDone(true) }).to(el, { autoAlpha: 0, duration: 0.5 });
        return;
      }
      tl = gsap
        .timeline({ onComplete: () => setDone(true) })
        .to(num.parentElement, { yPercent: -105, duration: 0.9, ease: "expo.inOut" }, 0.15)
        .add(() => setReady(), 0.75)
        .fromTo(
          el,
          { clipPath: "inset(0% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 100% 0%)", duration: 1.2, ease: "expo.inOut" },
          0.7,
        );
    };

    const tick = () => {
      if (finished) return;
      const t = (performance.now() - start) / 1000;
      const { fonts, canvas, textures } = motion.loaded;
      const real = fonts * 0.25 + canvas * 0.35 + textures * 0.4;
      const target = Math.min(real, t / MIN_DURATION) * 100;
      shown.value += (target - shown.value) * 0.08;
      if (target >= 100 && shown.value > 99.5) shown.value = 100;
      num.textContent = String(Math.floor(shown.value));
      if (shown.value >= 100 || t > MAX_DURATION) finish();
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      tl?.kill();
    };
  }, []);

  if (done) return null;

  return (
    <div ref={root} className={styles.preloader} role="status" aria-live="polite">
      <span className="sr-only">Loading gallery</span>
      <div className={styles.mask} aria-hidden>
        <p className={styles.count}>
          <span ref={counter}>0</span>
          <span className={styles.pct}>%</span>
        </p>
      </div>
      <p className={`label ${styles.caption}`} aria-hidden>
        Sable — a small gallery
      </p>
    </div>
  );
}
