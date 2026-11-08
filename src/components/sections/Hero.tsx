"use client";

import { useRef } from "react";
import { ScrollTrigger, gsap, motion, onReady, useScrollScene } from "@/lib/lenis";
import styles from "./Hero.module.css";

// Each line is split into letters. Wrap words in *asterisks* for italic.
const TITLE = ["Soft light,", "*slow* rooms"];
const INTRO = "A small gallery of quiet things — scroll gently";

function Line({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/).filter(Boolean);
  return (
    <span className={styles.line} aria-hidden>
      {parts.map((part, p) => {
        const em = part.startsWith("*");
        const chars = [...part.replace(/\*/g, "")];
        return (
          <span key={p} className={em ? styles.em : undefined}>
            {chars.map((c, i) => (
              // outer span scatters on scroll, inner span rises on load
              <span key={i} className={styles.scatter}>
                <span className={styles.char}>{c === " " ? " " : c}</span>
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useScrollScene(root, ({ reduced }) => {
    const el = root.current!;
    const chars = el.querySelectorAll(`.${styles.char}`);
    const scatter = gsap.utils.toArray<HTMLElement>(`.${styles.scatter}`, el);
    const lines = el.querySelectorAll(`.${styles.line}`);
    const intro = el.querySelector(`.${styles.intro}`);
    const hint = el.querySelector(`.${styles.hint}`);

    const tl = gsap.timeline({ paused: true });
    if (reduced) {
      tl.to([el.querySelector("h1"), intro, hint], { autoAlpha: 1, duration: 0.8, stagger: 0.1 });
    } else {
      tl.fromTo(
        chars,
        // y: 0 clears the CSS pre-hide transform GSAP would otherwise keep
        { y: 0, yPercent: 115, rotate: 8, skewX: -12 },
        {
          y: 0,
          yPercent: 0,
          rotate: 0,
          skewX: 0,
          duration: 1.8,
          ease: "expo.out",
          stagger: { each: 0.04, from: "start" },
        },
        0.1,
      )
        .fromTo(intro, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.9)
        .fromTo(hint, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 1.3)
        // drop the rise-in mask so scattered letters can leave their line
        .set(lines, { overflow: "visible" });
    }
    const off = onReady(() => tl.play());

    // Frames fly past the camera as the hero scrolls out.
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        motion.hero = self.progress;
        motion.heroVisible = self.progress < 1;
      },
      onLeave: () => (motion.heroVisible = false),
      onEnterBack: () => (motion.heroVisible = true),
    });

    if (reduced) {
      gsap.to(el.querySelector(`.${styles.content}`), {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom 30%", scrub: true },
      });
      return () => {
        off();
        st.kill();
      };
    }

    // Letters drift up and apart like dust caught in the air.
    const rand = gsap.utils.random(0, 1, 0.001, true);
    const out = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: el, start: "top top", end: "bottom 15%", scrub: 0.6 },
    });
    scatter.forEach((s) => {
      const r = rand();
      out.to(
        s,
        {
          yPercent: -80 - r * 220,
          xPercent: (rand() - 0.5) * 120,
          rotate: (rand() - 0.5) * 70,
          autoAlpha: 0,
          filter: "blur(6px)",
          duration: 0.6 + r * 0.4,
        },
        r * 0.35,
      );
    });
    out
      .to(lines, { letterSpacing: "0.04em", duration: 1 }, 0)
      .to([intro, hint], { autoAlpha: 0, y: -40, duration: 0.4 }, 0);

    return () => {
      off();
      st.kill();
    };
  });

  return (
    <section ref={root} className={styles.hero} data-scene data-bg="#EDE4DA" aria-labelledby="hero-title">
      <div className={styles.content}>
        <h1
          id="hero-title"
          tabIndex={-1}
          className={`display ${styles.title}`}
          aria-label={TITLE.join(" ").replace(/\*/g, "")}
        >
          {TITLE.map((line) => (
            <Line key={line} text={line} />
          ))}
        </h1>
        <p className={`label ${styles.intro}`}>{INTRO}</p>
      </div>
      <p className={`label ${styles.hint}`} aria-hidden>
        <span className={styles.hintLine} />
        Scroll
      </p>
    </section>
  );
}
