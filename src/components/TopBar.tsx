"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger, gsap } from "@/lib/lenis";
import styles from "./TopBar.module.css";

/** Fixed top bar + scene counter (`03 / 07`) with a thin progress line. */
export default function TopBar() {
  const line = useRef<HTMLSpanElement>(null);
  const [{ scene, total }, setState] = useState({ scene: 1, total: 7 });

  useEffect(() => {
    const sections = gsap.utils.toArray<HTMLElement>("[data-scene]");
    const triggers = sections.map((section, i) =>
      ScrollTrigger.create({
        trigger: section,
        start: "top 55%",
        end: "bottom 55%",
        refreshPriority: -1, // after the pins above have been measured
        onToggle: (self) => self.isActive && setState({ scene: i + 1, total: sections.length }),
      }),
    );
    const setLine = line.current ? gsap.quickSetter(line.current, "scaleX") : null;
    const page = ScrollTrigger.create({
      start: 0,
      end: "max",
      refreshPriority: -1,
      onUpdate: (self) => setLine?.(self.progress),
    });
    return () => {
      triggers.forEach((t) => t.kill());
      page.kill();
    };
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <header className={styles.bar}>
        <a href="#top" className={`label ${styles.name}`}>
          Yazmin<span className={styles.mark}>✦</span>
        </a>
        <a href="https://yazmin.dev" target="_blank" rel="noopener" className={`label ${styles.link}`}>
          Say hello
        </a>
      </header>
      <div className={styles.progress} aria-hidden>
        <span className="label">
          {pad(scene)} / {pad(total)}
        </span>
        <span className={styles.track}>
          <span ref={line} className={styles.line} />
        </span>
      </div>
    </>
  );
}
