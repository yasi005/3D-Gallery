"use client";

import Image from "next/image";
import { useRef } from "react";
import { galleryImages, heroFrames, type GalleryItem } from "@/data/gallery";
import { DESKTOP_QUERY, gsap, useScrollScene } from "@/lib/lenis";
import styles from "./Statement.module.css";

const byId = (id: string) => [...heroFrames, ...galleryImages].find((g) => g.id === id)!;

/** Hover a word (or pair) → a little polaroid of a painting that feels like it. */
const POPS: Record<string, { item: GalleryItem; note: string; tilt: number }> = {
  quiet: { item: byId("img-12"), note: "quiet", tilt: -5 },
  soft: { item: byId("img-07"), note: "soft light", tilt: 4 },
  slow: { item: byId("img-02"), note: "slow hands", tilt: -3 },
  warm: { item: byId("img-10"), note: "warm plaster", tilt: 5 },
  rooms: { item: byId("img-01"), note: "rooms", tilt: -4 },
  breathe: { item: byId("img-04"), note: "breathe", tilt: 3 },
};
/** which pop each word belongs to */
const WORD_POP: Record<string, string> = {
  quiet: "quiet",
  soft: "soft",
  light: "soft",
  slow: "slow",
  hands: "slow",
  warm: "warm",
  plaster: "warm",
  rooms: "rooms",
  breathe: "breathe",
};
const popOf = (w: string) => WORD_POP[w.replace(/[^a-z]/gi, "").toLowerCase()];

// *word* = italic
const SENTENCE =
  "We keep *quiet* things — soft light, slow hands, warm plaster, and rooms that let you *breathe*.";

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      <path
        d="M50 0 C53 32 68 47 100 50 C68 53 53 68 50 100 C47 68 32 53 0 50 C32 47 47 32 50 0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Statement() {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const popLayer = useRef<HTMLDivElement>(null);

  // Touch screens: tap a key word and its polaroid pops up above it; tap
  // again, tap elsewhere or scroll to put it away.
  useScrollScene(root, ({ reduced }) => {
    if (matchMedia(DESKTOP_QUERY).matches) return;
    const layer = popLayer.current!;
    const words = root.current!.querySelectorAll<HTMLElement>("[data-pop]");
    const cards = new Map<string, HTMLElement>();
    layer.querySelectorAll<HTMLElement>("[data-card]").forEach((c) => cards.set(c.dataset.card!, c));
    let current: string | null = null;
    let scrollAt = 0;

    const hide = () => {
      if (!current) return;
      const card = cards.get(current)!;
      gsap.to(card, { autoAlpha: 0, scale: 0.7, y: 12, duration: reduced ? 0.01 : 0.3, ease: "power2.in", overwrite: true });
      words.forEach((w) => w.classList.remove(styles.lit));
      current = null;
    };
    const show = (word: HTMLElement) => {
      const key = word.dataset.pop!;
      if (current === key) return hide();
      hide();
      current = key;
      scrollAt = window.scrollY;
      words.forEach((w) => w.classList.toggle(styles.lit, w.dataset.pop === key));
      const r = word.getBoundingClientRect();
      const below = r.top < 300;
      layer.classList.toggle(styles.below, below);
      const half = Math.min(110, window.innerWidth / 2 - 8);
      gsap.set(layer, {
        x: gsap.utils.clamp(half + 8, window.innerWidth - half - 8, r.left + r.width / 2),
        y: below ? r.bottom + 14 : r.top - 10,
      });
      const card = cards.get(key)!;
      const tilt = Number(card.dataset.tilt);
      if (reduced) gsap.set(card, { autoAlpha: 1, scale: 1, rotate: tilt, y: 0 });
      else
        gsap.fromTo(
          card,
          { autoAlpha: 0, scale: 0.4, rotate: 0, y: below ? -20 : 30 },
          { autoAlpha: 1, scale: 1, rotate: tilt, y: 0, duration: 0.7, ease: "back.out(2.2)", overwrite: true },
        );
    };
    const onTap = (e: Event) => {
      const word = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-pop]");
      if (word && root.current!.contains(word)) show(word);
      else hide();
    };
    const onScroll = () => {
      if (current && Math.abs(window.scrollY - scrollAt) > 40) hide();
    };
    document.addEventListener("click", onTap);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      hide();
      document.removeEventListener("click", onTap);
      window.removeEventListener("scroll", onScroll);
    };
  });

  // Hover pop-ups (desktop only): a card per key word, following the cursor.
  useScrollScene(root, () => {
    if (!matchMedia(DESKTOP_QUERY).matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = popLayer.current!;
    const words = root.current!.querySelectorAll<HTMLElement>("[data-pop]");
    const cards = new Map<string, HTMLElement>();
    layer.querySelectorAll<HTMLElement>("[data-card]").forEach((c) => cards.set(c.dataset.card!, c));
    const x = gsap.quickTo(layer, "x", { duration: 0.55, ease: "power3.out" });
    const y = gsap.quickTo(layer, "y", { duration: 0.55, ease: "power3.out" });
    let current: string | null = null;

    // the card sits above the cursor, or below it near the top of the screen
    const lift = (cy: number) => {
      const below = cy < 330;
      layer.classList.toggle(styles.below, below);
      return below ? cy + 26 : cy - 18;
    };
    const move = (e: PointerEvent) => {
      x(e.clientX);
      y(lift(e.clientY));
    };
    const show = (key: string, e: PointerEvent) => {
      if (current === key) return;
      if (current) hide(current);
      current = key;
      words.forEach((w) => w.classList.toggle(styles.lit, w.dataset.pop === key));
      if (!layer.dataset.on) {
        gsap.set(layer, { x: e.clientX, y: lift(e.clientY) });
        layer.dataset.on = "1";
      }
      const card = cards.get(key)!;
      gsap.fromTo(
        card,
        { autoAlpha: 0, scale: 0.4, rotate: 0, y: 30 },
        { autoAlpha: 1, scale: 1, rotate: Number(card.dataset.tilt), y: 0, duration: 0.7, ease: "back.out(2.2)", overwrite: true },
      );
    };
    const hide = (key: string) => {
      gsap.to(cards.get(key)!, { autoAlpha: 0, scale: 0.6, y: 16, duration: 0.3, ease: "power2.in", overwrite: true });
    };
    const leave = () => {
      if (current) hide(current);
      current = null;
      delete layer.dataset.on;
      words.forEach((w) => w.classList.remove(styles.lit));
    };
    const enter = (e: PointerEvent) => show((e.currentTarget as HTMLElement).dataset.pop!, e);
    const out = (e: PointerEvent) => {
      const to = (e.relatedTarget as HTMLElement | null)?.closest?.<HTMLElement>("[data-pop]");
      if (!to) leave();
    };
    words.forEach((w) => {
      w.addEventListener("pointerenter", enter);
      w.addEventListener("pointerleave", out);
    });
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      words.forEach((w) => {
        w.removeEventListener("pointerenter", enter);
        w.removeEventListener("pointerleave", out);
      });
      window.removeEventListener("pointermove", move);
    };
  });

  useScrollScene(root, ({ reduced }) => {
    const words = root.current!.querySelectorAll(`.${styles.word}`);
    const star = root.current!.querySelector(`.${styles.star}`);
    const kicker = root.current!.querySelector(`.${styles.kicker}`);

    if (reduced) {
      gsap.set(words, { "--p": 1 });
      gsap.from(pin.current, {
        autoAlpha: 0,
        duration: 1,
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      return;
    }

    gsap.timeline({
      scrollTrigger: {
        trigger: pin.current,
        start: "top top",
        end: "+=70%",
        pin: true,
        anticipatePin: 1,
      },
    });

    // Words come into focus and ink in one by one, until the pin releases.
    gsap.to(words, {
      "--p": 1,
      ease: "none",
      stagger: 0.12,
      scrollTrigger: {
        trigger: root.current,
        start: "top 60%",
        end: () => `+=${window.innerHeight * 1.2}`,
        scrub: 0.5,
      },
    });

    // The star blooms in, then keeps turning slowly for the whole scene.
    gsap.fromTo(
      star,
      { scale: 0, rotate: -180 },
      {
        scale: 1,
        rotate: 0,
        ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 80%", end: "top 20%", scrub: 1 },
      },
    );
    gsap.fromTo(
      star!.parentElement,
      { rotate: 0 },
      {
        rotate: 270,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top 20%", end: "bottom top", scrub: 1 },
      },
    );
    gsap.fromTo(
      kicker,
      { autoAlpha: 0, letterSpacing: "0.5em" },
      {
        autoAlpha: 1,
        letterSpacing: "0.15em",
        duration: 1.6,
        ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 60%" },
      },
    );
  });

  const words = SENTENCE.split(" ");

  return (
    <section ref={root} className={styles.statement} data-scene data-bg="#E9DED2" aria-labelledby="statement-title">
      <div ref={pin} className={styles.pin}>
        <span className={styles.starSpin}>
          <Sparkle className={styles.star} />
        </span>
        <p className={`label ${styles.kicker}`}>(01) — What this is</p>
        <h2 id="statement-title" className={styles.text} data-skew>
          {words.map((w, i) => {
            const em = w.includes("*");
            const pop = popOf(w);
            return (
              <span key={i}>
                <span
                  className={`${styles.word} ${em ? styles.em : ""} ${pop ? styles.key : ""}`}
                  data-pop={pop}
                >
                  {w.replace(/\*/g, "")}
                </span>{" "}
              </span>
            );
          })}
        </h2>
      </div>
      <div ref={popLayer} className={styles.pops} aria-hidden>
        {Object.entries(POPS).map(([key, { item, note, tilt }]) => (
          <figure key={key} className={styles.card} data-card={key} data-tilt={tilt}>
            <span className={styles.cardImg} style={{ aspectRatio: item.aspect }}>
              <Image src={item.src!} alt="" fill sizes="220px" loading="eager" />
            </span>
            <figcaption>
              <span className={styles.cardNote}>{note}</span>
              <span className={styles.cardBy}>
                {item.artist}, {item.year}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
