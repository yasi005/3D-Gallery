"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, motion, setReady } from "@/lib/lenis";
import { Sparkle } from "@/components/sections/Statement";
import styles from "./Preloader.module.css";

const MIN_DURATION = 1.8;
const MAX_DURATION = 9;

export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = root.current;
    const bar = fill.current;
    const board = stage.current;
    if (!el || !bar || !board) return;

    document.fonts?.ready.then(() => (motion.loaded.fonts = 1));

    const stars = board.querySelectorAll<HTMLElement>(`.${styles.star}`);
    const brand = board.querySelector(`.${styles.brand}`);
    const track = board.querySelector(`.${styles.track}`);
    const whisper = board.querySelector(`.${styles.whisper}`);
    const mark = el.querySelector(`.${styles.mark}`);

    // Soft entrance — stars bloom, then the line waits to be filled.
    if (!motion.reduced) {
      gsap.set([stars, brand, track, whisper, mark], { autoAlpha: 0 });
      gsap.set(stars, { scale: 0.35, rotate: -12 });
      gsap
        .timeline()
        .to(stars, {
          autoAlpha: 1,
          scale: 1,
          rotate: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: { each: 0.12, from: "center" },
        })
        .fromTo(brand, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out" }, 0.25)
        .to(track, { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, 0.45)
        .to([whisper, mark], { autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.55);
    }

    const start = performance.now();
    const shown = { value: 0 };
    let finished = false;
    let tl: gsap.core.Timeline | undefined;

    const finish = () => {
      finished = true;
      gsap.ticker.remove(tick);
      gsap.set(bar, { scaleX: 1 });

      if (motion.reduced) {
        setReady();
        tl = gsap.timeline({ onComplete: () => setDone(true) }).to(el, { autoAlpha: 0, duration: 0.45 });
        return;
      }

      tl = gsap
        .timeline({ onComplete: () => setDone(true) })
        // little bloom when the rooms are ready
        .to(
          stars,
          {
            scale: 1.35,
            duration: 0.55,
            ease: "expo.out",
            stagger: { each: 0.05, from: "center" },
          },
          0,
        )
        .to(stars, { scale: 1, duration: 0.7, ease: "power3.inOut" }, 0.35)
        .to(board, { y: -28, autoAlpha: 0, duration: 0.85, ease: "expo.inOut" }, 0.45)
        .to(mark, { autoAlpha: 0, duration: 0.4, ease: "power2.out" }, 0.45)
        .add(() => setReady(), 0.85)
        .fromTo(
          el,
          { clipPath: "inset(0% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 100% 0%)", duration: 1.15, ease: "expo.inOut" },
          0.75,
        );
    };

    const tick = () => {
      if (finished) return;
      const t = (performance.now() - start) / 1000;
      const { fonts, canvas, textures } = motion.loaded;
      // Heavily wait on the 3D canvas + textures; fonts are a light gate.
      const real = fonts * 0.12 + canvas * 0.38 + textures * 0.5;
      const target = Math.min(real, t / MIN_DURATION) * 100;
      shown.value += (target - shown.value) * 0.07;
      if (target >= 100 && shown.value > 99.4) shown.value = 100;

      const p = shown.value / 100;
      gsap.set(bar, { scaleX: p });

      // Side stars wake as the line travels; middle one breathes the whole time.
      if (!motion.reduced && stars.length >= 3) {
        const breath = 1 + Math.sin(t * 2.2) * 0.06;
        gsap.set(stars[1], { scale: breath * (0.85 + p * 0.15), opacity: 0.55 + p * 0.45 });
        gsap.set(stars[0], { opacity: Math.min(1, p * 2.2), scale: 0.7 + Math.min(p, 0.45) });
        gsap.set(stars[2], { opacity: Math.min(1, Math.max(0, p - 0.35) * 2.4), scale: 0.7 + Math.min(Math.max(p - 0.35, 0), 0.45) });
      }

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
      <div ref={stage} className={styles.stage} aria-hidden>
        <div className={styles.stars}>
          <Sparkle className={styles.star} />
          <Sparkle className={`${styles.star} ${styles.starMid}`} />
          <Sparkle className={styles.star} />
        </div>
        <p className={styles.brand}>Yazmin</p>
        <div className={styles.track}>
          <div ref={fill} className={styles.fill} />
        </div>
        <p className={styles.whisper}>soft light, slow rooms</p>
      </div>
      <p className={`label ${styles.mark}`} aria-hidden>
        a small gallery
      </p>
    </div>
  );
}
