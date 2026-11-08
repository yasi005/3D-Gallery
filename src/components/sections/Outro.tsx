"use client";

import { useRef } from "react";
import { gsap, useScrollScene } from "@/lib/lenis";
import { Sparkle } from "./Statement";
import styles from "./Outro.module.css";

export default function Outro() {
  const root = useRef<HTMLElement>(null);

  useScrollScene(root, ({ reduced }) => {
    const el = root.current!;
    const chars = el.querySelectorAll(`.${styles.char}`);
    if (!reduced) {
      gsap.fromTo(
        chars,
        { y: 0, yPercent: 120, rotate: 10 },
        {
          y: 0,
          yPercent: 0,
          rotate: 0,
          duration: 1.6,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: "top 55%" },
        },
      );
    }
  });

  useScrollScene(root, ({ reduced }) => {
    const el = root.current!;
    gsap.fromTo(
      el.querySelectorAll(`.${styles.reveal}`),
      { autoAlpha: 0, y: reduced ? 0 : 50 },
      {
        autoAlpha: 1,
        y: 0,
        duration: reduced ? 0.6 : 1.6,
        ease: "expo.out",
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 60%" },
      },
    );
  });

  return (
    <section ref={root} className={styles.outro} data-scene data-bg="#E3D5C6" aria-labelledby="outro-title">
      <div className={styles.top}>
        <Sparkle className={`${styles.star} ${styles.reveal}`} />
        <h2 id="outro-title" className={`display ${styles.title}`} aria-label="Thank you">
          {["Thank", "*you*"].map((word) => (
            <span key={word} className={styles.mask} aria-hidden>
              {[...word.replace(/\*/g, "")].map((c, i) => (
                <span key={i} className={`${styles.char} ${word.startsWith("*") ? styles.em : ""}`}>
                  {c}
                </span>
              ))}
            </span>
          ))}
        </h2>
        <p className={`${styles.line} ${styles.reveal}`}>
          for walking slowly. The kettle&apos;s still warm — stay a while.
        </p>
      </div>
      <footer className={styles.footer}>
        <span>© 2026 Yazmin</span>
        <span aria-hidden>·</span>
        <a href="https://yazmin.dev" target="_blank" rel="noopener" className={styles.made}>
          made by <span>yazmin.dev</span>
        </a>
      </footer>
    </section>
  );
}
