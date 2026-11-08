"use client";

import { useRef } from "react";
import { featureImage } from "@/data/gallery";
import { gsap, useScrollScene } from "@/lib/lenis";
import Frame from "../Frame";
import styles from "./CardOverImage.module.css";

function Heart() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className={styles.heart}>
      <path
        d="M12 20.5s-7.5-4.4-9.3-9.2C1.5 8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.5 3.5 4.3 6.8-1.8 4.8-9.3 9.2-9.3 9.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function CardOverImage() {
  const root = useRef<HTMLElement>(null);

  useScrollScene(root, ({ reduced }) => {
    const el = root.current!;
    const media = el.querySelector(`.${styles.media}`);
    const zoom = el.querySelector(`.${styles.zoom}`);
    const card = el.querySelector(`.${styles.card}`);
    const heart = el.querySelector(`.${styles.heart}`);
    const lines = el.querySelectorAll(`.${styles.card} > :not(svg)`);

    if (reduced) {
      gsap.fromTo(card, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, scrollTrigger: { trigger: el, start: "top 55%" } });
      return;
    }

    // The image opens from a small rounded window to full-bleed…
    gsap.fromTo(
      media,
      { clipPath: "inset(14% 18% 14% 18% round 28px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 0px)",
        ease: "power2.inOut",
        scrollTrigger: { trigger: el, start: "top 90%", end: "top top", scrub: 0.6 },
      },
    );
    // …while the picture inside drifts and settles.
    gsap.fromTo(
      zoom,
      { scale: 1.35, yPercent: -6 },
      {
        scale: 1,
        yPercent: 6,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      },
    );

    // The card swings up like a postcard being set down, then the heart beats.
    gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 25%" } })
      .fromTo(
        card,
        { autoAlpha: 0, y: 160, rotateX: -35, rotateZ: -4, transformPerspective: 900 },
        { autoAlpha: 1, y: 0, rotateX: 0, rotateZ: 0, duration: 1.9, ease: "expo.out" },
      )
      .fromTo(lines, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.35)
      .fromTo(heart, { scale: 0 }, { scale: 1, duration: 0.9, ease: "back.out(3)" }, 0.5)
      .to(heart, { scale: 1.3, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 3 }, 1.3);
  });

  return (
    <section ref={root} className={styles.feature} data-scene data-bg="#EDE4DA" aria-labelledby="feature-title">
      <div className={styles.media} data-cursor="view">
        <div className={styles.zoom}>
          <Frame item={featureImage} sizes="100vw" />
        </div>
      </div>
      <article className={styles.card}>
        <Heart />
        <h2 id="feature-title" className={styles.title}>
          Made <em>slowly</em>, on purpose
        </h2>
        <p className={styles.body}>
          Nothing here was rushed. Each piece was chosen because it made a room feel a little warmer
          — the way afternoon light does, or a cup of tea left on the sill.
        </p>
      </article>
    </section>
  );
}
