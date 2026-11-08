"use client";

import Image from "next/image";
import { useSyncExternalStore, type CSSProperties } from "react";
import type { GalleryItem } from "@/data/gallery";
import { placeholderFor } from "@/lib/placeholder";
import { motion, subscribeWebgl } from "@/lib/lenis";
import styles from "./Frame.module.css";

type Props = {
  item: GalleryItem;
  sizes: string;
  className?: string;
  priority?: boolean;
  /**
   * The image is drawn by a WebGL plane on top of this box; the DOM only
   * shows it if WebGL is unavailable.
   */
  gl?: boolean;
};

const getWebgl = () => motion.webgl;
const getServerWebgl = () => "pending" as const;

/** An image slot: next/image when `src` is set, a warm placeholder otherwise. */
export default function Frame({ item, sizes, className, priority, gl }: Props) {
  const webgl = useSyncExternalStore(subscribeWebgl, getWebgl, getServerWebgl);
  const ph = placeholderFor(item.id);
  const showImage = !!item.src && (!gl || webgl === "off");
  const style = {
    "--ph-a": ph.a,
    "--ph-b": ph.b,
    "--ph-angle": `${ph.angle}deg`,
  } as CSSProperties;

  return (
    <div
      className={`${styles.frame} ${className ?? ""}`}
      style={style}
      data-gl={gl ? "" : undefined}
      role={showImage ? undefined : "img"}
      aria-label={showImage ? undefined : item.alt}
    >
      {showImage ? (
        <Image src={item.src!} alt={item.alt} fill sizes={sizes} priority={priority} className={styles.img} />
      ) : (
        !item.src && (
          <span className={styles.tag} aria-hidden>
            {ph.label}
          </span>
        )
      )}
    </div>
  );
}
