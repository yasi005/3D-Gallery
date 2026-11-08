"use client";

import { useRef, type CSSProperties } from "react";
import { galleryImages, type GalleryItem } from "@/data/gallery";
import { gsap, useScrollScene } from "@/lib/lenis";
import { useGlTarget } from "@/lib/useDomRect";
import Frame from "../Frame";
import styles from "./Gallery.module.css";

// Editorial placement per slot (desktop): grid columns of 12 + vertical nudge.
const PLACEMENT = [
  { col: "2 / span 3", shift: "0vh" },
  { col: "8 / span 3", shift: "14vh" },
  { col: "1 / span 3", shift: "6vh" },
  { col: "5 / span 3", shift: "-6vh" },
  { col: "3 / span 3", shift: "12vh" },
  { col: "9 / span 3", shift: "-2vh" },
];

function Figure({ item, index }: { item: GalleryItem; index: number }) {
  const ref = useGlTarget(`gallery-${item.id}`, "plane", item);
  const place = PLACEMENT[index % PLACEMENT.length];
  return (
    <figure
      className={styles.figure}
      style={{ "--col": place.col, "--shift": place.shift } as CSSProperties}
    >
      <div
        ref={ref}
        className={styles.media}
        style={{ aspectRatio: item.aspect }}
        data-cursor="view"
      >
        <Frame item={item} sizes="(max-width: 768px) 90vw, 35vw" gl />
      </div>
      {item.caption && (
        <figcaption className={styles.caption}>
          <span className="label">{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.captionText}>{item.caption}</span>
        </figcaption>
      )}
    </figure>
  );
}

export default function Gallery() {
  const root = useRef<HTMLElement>(null);

  useScrollScene(root, ({ reduced }) => {
    const el = root.current!;
    gsap.utils.toArray<HTMLElement>(`.${styles.caption}`, el).forEach((cap) => {
      gsap.fromTo(
        cap,
        { autoAlpha: 0, y: reduced ? 0 : 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reduced ? 0.6 : 1.4,
          ease: "expo.out",
          scrollTrigger: { trigger: cap, start: "top 92%" },
        },
      );
    });
    // Placeholder labels appear once the WebGL sheet has mostly unfolded.
    gsap.utils.toArray<HTMLElement>(`.${styles.media}`, el).forEach((media) => {
      const tag = media.querySelector("[aria-hidden]");
      if (!tag) return;
      gsap.fromTo(
        tag,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 1,
          delay: reduced ? 0 : 1.2,
          scrollTrigger: { trigger: media, start: "top 85%" },
        },
      );
    });
    gsap.fromTo(
      el.querySelector(`.${styles.head}`),
      { autoAlpha: 0, y: reduced ? 0 : 30 },
      { autoAlpha: 1, y: 0, duration: 1.4, scrollTrigger: { trigger: el, start: "top 75%" } },
    );
  });

  return (
    <section ref={root} className={styles.gallery} data-scene data-bg="#EDE4DA" aria-labelledby="gallery-title">
      <header className={styles.head}>
        <p className="label">(02) — Selected</p>
        <h2 id="gallery-title" className={styles.title} data-skew>
          Things we <em>kept</em>
        </h2>
      </header>
      <div className={styles.grid}>
        {galleryImages.map((item, i) => (
          <Figure key={item.id} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
