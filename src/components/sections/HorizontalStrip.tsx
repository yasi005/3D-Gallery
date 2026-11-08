"use client";

import { useRef, type CSSProperties } from "react";
import { stripFrames } from "@/data/gallery";
import { gsap, motion, useScrollScene } from "@/lib/lenis";
import Frame from "../Frame";
import styles from "./HorizontalStrip.module.css";

const WORD = "Archive";
// per-frame height (vh) and resting tilt (deg)
const HEIGHTS = [52, 44, 58, 48, 54, 42, 56, 46];
const TILTS = [-4, 3, -2.5, 4, -3.5, 2.5, -3, 3.5];

export default function HorizontalStrip() {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLParagraphElement>(null);

  useScrollScene(root, ({ desktop, reduced }) => {
    const items = gsap.utils.toArray<HTMLElement>(`.${styles.item}`, track.current);
    const head = root.current!.querySelector(`.${styles.head}`);
    gsap.fromTo(
      head,
      { autoAlpha: 0, y: reduced ? 0 : 24 },
      { autoAlpha: 1, y: 0, scrollTrigger: { trigger: root.current, start: "top 70%" } },
    );

    // Mobile & reduced motion: a native swipeable row (see CSS).
    if (reduced) return;
    if (!desktop) {
      // Frames still straighten and lift as you swipe them to the centre.
      const row = track.current!;
      const rotate = items.map((el) => gsap.quickTo(el, "rotation", { duration: 0.5, ease: "power3.out" }));
      const lift = items.map((el) => gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" }));
      let frame = 0;
      const settle = () => {
        frame = 0;
        const center = window.innerWidth / 2;
        items.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const d = Math.min(1, Math.abs(r.left + r.width / 2 - center) / center);
          rotate[i](TILTS[i % TILTS.length] * d);
          lift[i](d * 18);
        });
      };
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(settle);
      };
      settle();
      row.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        cancelAnimationFrame(frame);
        row.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    const distance = () => track.current!.scrollWidth - window.innerWidth;
    const rotate = items.map((el) => gsap.quickSetter(el, "rotate", "deg"));
    const skew = items.map((el) => gsap.quickSetter(el, "skewX", "deg"));
    const lift = items.map((el) => gsap.quickSetter(el, "y", "px"));

    // Frames straighten and rise as they reach the centre, and lean into
    // the direction of travel with scroll speed.
    const straighten = () => {
      if (!tl.scrollTrigger?.isActive) return;
      const center = window.innerWidth / 2;
      const lean = -motion.velocity * 6;
      items.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.min(1, Math.abs(r.left + r.width / 2 - center) / center);
        rotate[i](TILTS[i % TILTS.length] * d);
        skew[i](lean);
        lift[i](d * 30);
      });
    };
    gsap.ticker.add(straighten);

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: pin.current,
        start: "top top",
        end: () => `+=${window.innerHeight * 1.0}`,
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
      onUpdate: straighten,
    });
    tl.fromTo(track.current, { x: 0 }, { x: () => -distance() }, 0)
      .fromTo(word.current, { xPercent: -10 }, { xPercent: -45 }, 0)
      // the outline word fills with colour as you travel
      .fromTo(fill.current, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }, 0);
    return () => gsap.ticker.remove(straighten);
  });

  return (
    <section ref={root} className={styles.strip} data-scene data-bg="#E3D5C6" aria-labelledby="strip-title">
      <div ref={pin} className={styles.pin}>
        <div ref={word} className={styles.wordWrap} aria-hidden>
          <p className={styles.word}>{WORD}</p>
          <p ref={fill} className={`${styles.word} ${styles.wordFill}`}>
            {WORD}
          </p>
        </div>
        <header className={styles.head}>
          <p className="label">(03) — Small archive</p>
          <h2 id="strip-title" className={styles.title} data-skew>
            Little <em>things</em>, in a row
          </h2>
          <p className={`label ${styles.swipe}`} aria-hidden>
            Swipe
          </p>
        </header>
        <ul ref={track} className={styles.track} tabIndex={0} aria-label="Archive, scroll sideways">
          {stripFrames.map((item, i) => (
            <li
              key={item.id}
              className={styles.item}
              style={
                {
                  "--h": `${HEIGHTS[i % HEIGHTS.length]}vh`,
                  "--a": item.aspect,
                  "--tilt": `${TILTS[i % TILTS.length]}deg`,
                } as CSSProperties
              }
            >
              <div className={styles.media} data-cursor="view">
                <Frame item={item} sizes="(max-width: 768px) 70vw, 30vw" />
              </div>
              {item.caption && (
                <p className={`label ${styles.caption}`}>
                  {String(i + 1).padStart(2, "0")} · {item.caption}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
