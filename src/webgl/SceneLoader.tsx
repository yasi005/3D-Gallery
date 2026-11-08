"use client";

import dynamic from "next/dynamic";

// The canvas (and three.js) only loads in the browser, after the DOM.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function SceneLoader() {
  return <Scene />;
}
