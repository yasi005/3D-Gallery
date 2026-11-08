"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { roomExhibit, type GalleryItem } from "@/data/gallery";
import { motion, onReady, wake } from "@/lib/lenis";
import { roomAudio } from "@/lib/roomAudio";
import { useDomRect, type GlTarget } from "@/lib/useDomRect";
import type { Layer } from "./Scene";

// A walkable gallery hall. You enter at +z and look toward -z. A freestanding
// wall splits the hall; works hang on every wall; the exit door is in the
// entrance wall behind you. Units are roughly metres.
//
// Performance notes: there are no real-time lights apart from one hemisphere
// and one ambient light, and walls use Lambert shading. Each work's "spotlight"
// is a painted pool of light (an additive gradient on the wall and floor), and
// the paintings themselves are unlit images. Textures decode off the main
// thread and upload one per frame.
const WIDTH = 14;
const HEIGHT = 5.4;
const BACK = 3; // entrance wall z
const END = -21; // far wall z
const LENGTH = BACK - END;
const MID_Z = (BACK + END) / 2;
const EYE = 1.65;
const HANG = 2.05; // centre line of the works
const BODY = 0.35; // visitor radius for collisions

const WALK = 2.2;
const RUN = 4.4;
const LOOK_SENS = 0.0022;
/** how quickly the view catches up with the mouse (per second) */
const LOOK_SMOOTH = 18;

// Palette: warm charcoal walls, dark walnut floor, ivory mats.
const WALL = "#5A4E45";
const CEILING = "#2B2521";
const FLOOR = "#5A3F2E";
const FRAME = "#151210";
const MAT = "#F2ECE3";
const BENCH = "#4A3A30";
const BENCH_TOP = "#6E4B35";
const FOG = "#171412";
const LIGHT = "#FFDDB8";

// painted light pools: resting / looked-at strength
const POOL_IDLE = 0.42;
const POOL_LOOK = 0.78;
const FLOOR_IDLE = 0.14;
const FLOOR_LOOK = 0.26;
// paintings: resting / looked-at brightness
const ART_IDLE = 0.86;
const ART_LOOK = 1;

// Render the room a little softer than the rest of the page: it fills the
// whole screen and is redrawn every frame.
const ROOM_DPR = 1.2;

// freestanding wall in the middle of the hall
const DIVIDER = { x: 0, z: -9.5, w: 7, h: 4.1, d: 0.4 };

// exit door, centred in the entrance wall
const DOOR = { w: 1.7, h: 2.7 };
const DOOR_CENTER = new THREE.Vector3(0, DOOR.h / 2, BACK);
const DOOR_NORMAL = new THREE.Vector3(0, 0, -1);

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
type BoxMesh = { pos: [number, number, number]; size: [number, number, number] };

const BENCHES: BoxMesh[] = [
  { pos: [0, 0.23, -5.6], size: [2.8, 0.46, 0.7] },
  { pos: [0, 0.23, -15.8], size: [0.7, 0.46, 2.8] },
];

const OBSTACLES: Box[] = [
  {
    minX: DIVIDER.x - DIVIDER.w / 2,
    maxX: DIVIDER.x + DIVIDER.w / 2,
    minZ: DIVIDER.z - DIVIDER.d / 2,
    maxZ: DIVIDER.z + DIVIDER.d / 2,
  },
  ...BENCHES.map(({ pos, size }) => ({
    minX: pos[0] - size[0] / 2,
    maxX: pos[0] + size[0] / 2,
    minZ: pos[2] - size[2] / 2,
    maxZ: pos[2] + size[2] / 2,
  })),
];

type Spot = {
  position: THREE.Vector3;
  rotationY: number;
  /** largest artwork box allowed on this spot (image only, metres) */
  maxH: number;
  maxW: number;
  /** direction the artwork faces */
  normal: THREE.Vector3;
};

function spot(x: number, z: number, rotationY: number, maxH: number, maxW: number): Spot {
  return {
    position: new THREE.Vector3(x, HANG, z),
    rotationY,
    maxH,
    maxW,
    normal: new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY)),
  };
}

// Same order as `roomExhibit`.
function hang(): Spot[] {
  const L = -WIDTH / 2 + 0.01;
  const R = WIDTH / 2 - 0.01;
  const front = DIVIDER.z + DIVIDER.d / 2 + 0.01;
  const back = DIVIDER.z - DIVIDER.d / 2 - 0.01;
  const end = END + 0.01;
  const entrance = BACK - 0.01;
  const side = Math.PI / 2;
  return [
    spot(0, front, 0, 2.7, 4.6),
    spot(L, -3, side, 2.6, 3.6),
    spot(R, -3, -side, 2.6, 3.6),
    spot(L, -9.5, side, 2.6, 3.8),
    spot(R, -9.5, -side, 2.6, 3.6),
    spot(0, back, Math.PI, 2.6, 5),
    spot(L, -16, side, 2.6, 3.6),
    spot(R, -16, -side, 2.6, 3.8),
    spot(-4.7, end, 0, 2.6, 3),
    spot(0, end, 0, 2.6, 4),
    spot(4.7, end, 0, 2.6, 3),
    spot(4.6, entrance, Math.PI, 2.4, 2.6),
    spot(-4.6, entrance, Math.PI, 2.4, 2.6),
  ];
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function canvasTexture(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Soft round light falloff, shared by every pool. */
function poolTexture() {
  const { c, ctx } = canvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(0.7, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function fonts() {
  const css = getComputedStyle(document.documentElement);
  return {
    serif: `${css.getPropertyValue("--font-serif").trim() || "Georgia"}, Georgia, serif`,
    sans: `${css.getPropertyValue("--font-sans").trim() || "system-ui"}, system-ui, sans-serif`,
  };
}

/** Museum label: title, artist and year drawn onto a small canvas. */
function placardTexture(item: GalleryItem, index: number) {
  const { c, ctx } = canvas(512, 300);
  const { serif, sans } = fonts();
  ctx.fillStyle = "#F4EFE8";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#8A7B70";
  ctx.font = `500 22px ${sans}`;
  ctx.fillText(String(index + 1).padStart(2, "0"), 36, 56);
  ctx.fillStyle = "#211B17";
  ctx.font = `italic 46px ${serif}`;
  // wrap the title onto up to two lines
  const words = (item.caption ?? item.alt).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > c.width - 72 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 36, 118 + i * 50));
  ctx.fillStyle = "#4A3F38";
  ctx.font = `400 26px ${sans}`;
  const by = [item.artist, item.year].filter(Boolean).join(", ");
  if (by) ctx.fillText(by, 36, lines.length > 1 ? 236 : 186);
  return canvasTexture(c);
}

/** Lit "EXIT" sign above the door. */
function exitSignTexture() {
  const { c, ctx } = canvas(512, 160);
  const { sans } = fonts();
  ctx.fillStyle = "#14110F";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "rgba(255,221,184,0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.fillStyle = "#FFE6C8";
  ctx.font = `500 64px ${sans}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "18px";
  ctx.fillText("EXIT  →", c.width / 2 + 9, c.height / 2 + 2);
  return canvasTexture(c);
}

/** Push a circle (x, z, r) out of an axis-aligned box. */
function pushOut(p: THREE.Vector3, b: Box, r: number) {
  const cx = THREE.MathUtils.clamp(p.x, b.minX, b.maxX);
  const cz = THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ);
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    p.x = cx + (dx / d) * r;
    p.z = cz + (dz / d) * r;
  } else {
    // centre inside the box: leave by the nearest side
    const left = p.x - b.minX + r;
    const right = b.maxX - p.x + r;
    const near = p.z - b.minZ + r;
    const far = b.maxZ - p.z + r;
    const m = Math.min(left, right, near, far);
    if (m === left) p.x = b.minX - r;
    else if (m === right) p.x = b.maxX + r;
    else if (m === near) p.z = b.minZ - r;
    else p.z = b.maxZ + r;
  }
}

const has = (keys: Set<string>, ...codes: string[]) => codes.some((c) => keys.has(c));
const MOVE = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/** shortest signed angle from a to b */
function angleTo(a: number, b: number) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

const ease = (delta: number, rate: number) => 1 - Math.exp(-delta * rate);

export default function Room({ target, layer }: { target: GlTarget; layer: RefObject<Layer | null> }) {
  // `rect` follows the preview box (used to start loading early); the live
  // room always draws full screen into `full`.
  const { rect, update } = useDomRect(target.el);
  const full = useMemo(() => ({ x: 0, y: 0, width: 1, height: 1, visible: false, near: true }), []);
  const sizeVec = useMemo(() => new THREE.Vector2(), []);
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const scene = useMemo(() => {
    const s = new THREE.Scene();
    s.background = new THREE.Color(FOG);
    s.fog = new THREE.Fog(FOG, 14, 42);
    return s;
  }, []);
  const camera = useMemo(() => {
    const c = new THREE.PerspectiveCamera(60, 1, 0.05, 80);
    c.rotation.order = "YXZ";
    return c;
  }, []);
  const [near, setNear] = useState(false);
  // Don't wait for the visitor to scroll near: start loading the room in idle
  // time shortly after the page appears, so it's ready long before section 04.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idle: number | undefined;
    const off = onReady(() => {
      timer = setTimeout(() => {
        const go = () => setNear(true);
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(go, { timeout: 3000 });
        else go();
      }, 1800);
    });
    return () => {
      off();
      clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, []);

  // Shared geometry / materials: everything is a scaled unit box or plane.
  const shared = useMemo(() => {
    const placeholder = new THREE.DataTexture(new Uint8Array([84, 72, 63, 255]), 1, 1);
    placeholder.colorSpace = THREE.SRGBColorSpace;
    placeholder.needsUpdate = true;
    return {
      box: new THREE.BoxGeometry(1, 1, 1),
      plane: new THREE.PlaneGeometry(1, 1),
      frame: new THREE.MeshLambertMaterial({ color: FRAME }),
      mat: new THREE.MeshLambertMaterial({ color: MAT }),
      pool: poolTexture(),
      placeholder,
    };
  }, []);

  const frames = useMemo(() => {
    const spots = hang();
    return roomExhibit.slice(0, spots.length).map((item, i) => {
      const spot = spots[i];
      const height = Math.min(spot.maxH, spot.maxW / item.aspect);
      const width = height * item.aspect;
      return {
        item,
        spot,
        width,
        height,
        // unlit, so the painting keeps its true colours; starts on the
        // placeholder so swapping in the real image never recompiles
        art: new THREE.MeshBasicMaterial({ map: shared.placeholder, toneMapped: false }),
        wallPool: new THREE.MeshBasicMaterial({
          map: shared.pool,
          color: LIGHT,
          transparent: true,
          opacity: POOL_IDLE,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
        floorPool: new THREE.MeshBasicMaterial({
          map: shared.pool,
          color: LIGHT,
          transparent: true,
          opacity: FLOOR_IDLE,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
        glow: 0,
        /** 0 → 1 as the image fades in */
        loaded: 0,
        hasImage: false,
        index: i,
      };
    });
  }, [shared]);
  const DOOR_INDEX = frames.length;

  // Placards and the exit sign need the page fonts: build them on the client.
  const [labels, setLabels] = useState<{ placards: THREE.CanvasTexture[]; exit: THREE.CanvasTexture } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const build = () => {
      if (cancelled) return;
      const next = { placards: frames.map((f, i) => placardTexture(f.item, i)), exit: exitSignTexture() };
      setLabels((old) => {
        old?.placards.forEach((t) => t.dispose());
        old?.exit.dispose();
        return next;
      });
    };
    build();
    document.fonts?.ready.then(build);
    return () => {
      cancelled = true;
    };
  }, [frames]);
  useEffect(() => {
    if (labels) {
      motion.roomPoster.dirty = true;
      wake(0.3);
    }
  }, [labels]);
  const placardMats = useMemo(
    () =>
      labels?.placards.map((map) => new THREE.MeshBasicMaterial({ map, color: "#D9D3CB", toneMapped: false })) ?? [],
    [labels],
  );
  const exitMat = useMemo(
    () => (labels ? new THREE.MeshBasicMaterial({ map: labels.exit, toneMapped: false }) : null),
    [labels],
  );
  useEffect(
    () => () => {
      placardMats.forEach((m) => m.dispose());
      exitMat?.dispose();
    },
    [placardMats, exitMat],
  );

  // Load the paintings off the main thread, nearest-first, once the room is
  // close. Uploads to the GPU happen one per frame (see useFrame).
  const uploads = useRef<{ index: number; texture: THREE.Texture }[]>([]);
  const textures = useRef<THREE.Texture[]>([]);
  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    const loader = new THREE.ImageBitmapLoader();
    loader.setCrossOrigin("anonymous");
    loader.setOptions({ imageOrientation: "flipY" });
    (async () => {
      for (const f of frames) {
        if (cancelled) return;
        if (!f.item.src || f.hasImage) continue;
        try {
          const bitmap = await loader.loadAsync(f.item.src);
          if (cancelled) return;
          const texture = new THREE.Texture(bitmap as unknown as HTMLImageElement);
          texture.flipY = false; // already flipped while decoding
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
          texture.needsUpdate = true;
          uploads.current.push({ index: f.index, texture });
          wake(0.3);
        } catch {
          /* keep the placeholder */
        }
      }
      if (!cancelled) {
        ready.current.loadedAll = true;
        wake(0.3);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [near, frames, gl]);

  // Compile every shader before the room scrolls into view.
  const compiled = useRef(false);
  const ready = useRef({ compiled: false, uploaded: 0, loadedAll: false });
  useEffect(() => {
    if (!near || compiled.current) return;
    compiled.current = true;
    const r = gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
    const done = () => {
      ready.current.compiled = true;
      wake(0.3);
    };
    if (r.compileAsync) r.compileAsync(scene, camera).then(done, done);
    else {
      r.compile(scene, camera);
      done();
    }
  }, [near, gl, scene, camera]);

  useEffect(() => {
    layer.current = { scene, camera, visible: false, rect: full };
    return () => {
      layer.current = null;
      motion.roomVisible = false;
    };
  }, [layer, scene, camera, full]);

  useEffect(
    () => () => {
      frames.forEach((f) => {
        f.art.dispose();
        f.wallPool.dispose();
        f.floorPool.dispose();
      });
      textures.current.forEach((t) => t.dispose());
      Object.values(shared).forEach((v) => (v as { dispose?: () => void }).dispose?.());
    },
    [frames, shared],
  );

  const labelPos = useMemo(() => new THREE.Vector3(), []);
  const toTarget = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const wish = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  const leftLeaf = useRef<THREE.Group>(null);
  const rightLeaf = useRef<THREE.Group>(null);
  const doorPool = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef({
    pos: new THREE.Vector3(0, EYE, BACK - 1.3),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0.02,
    /** where the mouse wants the view; yaw/pitch glide to it every frame */
    aimYaw: 0,
    aimPitch: 0.02,
    bob: 0,
    lastStep: 0,
    time: 0,
    active: -1,
    focus: -1,
    /** 0 = walking, 1 = fully in front of the focused work */
    focusMix: 0,
    focusYaw: 0,
    focusPitch: 0,
    door: 0,
    doorGlow: 0,
    /** time at which to leave through the open door (-1 = not leaving) */
    leaveAt: -1,
    roomDpr: false,
    slow: 0,
    lowered: false,
  });

  /**
   * Render one still of the hall from the entrance and hand it to the page as
   * a JPEG. Drawn into the corner of the main canvas and copied out in the
   * same task; the regular frame render that follows paints over it, so it
   * never shows on screen.
   */
  const shoot = () => {
    motion.roomPoster.dirty = false;
    const aspect = motion.roomPoster.aspect;
    const W = sizeVec.x;
    const H = sizeVec.y;
    let w = W;
    let h = W / aspect;
    if (h > H) {
      h = H;
      w = H * aspect;
    }
    // a poster doesn't need the full screen: cap it (cheaper render + readback)
    const cap = Math.min(1, 1280 / (w * gl.getPixelRatio()));
    w = Math.floor(w * cap);
    h = Math.floor(h * cap);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.position.set(0, EYE, BACK - 1.3);
    camera.rotation.set(0.03, 0, 0);
    camera.updateMatrixWorld();
    gl.setScissorTest(false);
    gl.setViewport(0, 0, w, h);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    const pr = gl.getPixelRatio();
    const sw = Math.floor(w * pr);
    const sh = Math.floor(h * pr);
    const outW = sw;
    const outH = Math.round(outW / aspect);
    const { c, ctx } = canvas(outW, outH);
    ctx.drawImage(gl.domElement, 0, gl.domElement.height - sh, sw, sh, 0, 0, outW, outH);
    gl.setViewport(0, 0, W, H);
    c.toBlob((blob) => blob && motion.onRoomPoster?.(URL.createObjectURL(blob)), "image/jpeg", 0.88);
  };

  const endFocus = () => {
    const st = state.current;
    if (st.focus < 0) return;
    st.focus = -1;
    motion.onRoomFocus?.(-1);
    roomAudio.chime(false);
  };

  useFrame((_, rawDelta) => {
    update();
    if (rect.near && !near) setNear(true);
    const st = state.current;

    // Only the walk-through is live. Until you step in, the room costs nothing
    // per frame: the box on the page shows a still (see `shoot`).
    const live = motion.explore.active;
    gl.getSize(sizeVec);
    full.width = sizeVec.x;
    full.height = sizeVec.y;
    full.visible = live;
    motion.roomVisible = live;
    if (layer.current) layer.current.visible = live;

    // Live room → render the whole canvas a little softer; restore after.
    if (live !== st.roomDpr) {
      st.roomDpr = live;
      const cap = st.lowered ? 1 : live ? ROOM_DPR : 1.5;
      setDpr(Math.min(window.devicePixelRatio || 1, cap));
    }

    // One texture upload per frame, so arriving images never stack up.
    const next = Math.abs(motion.velocity) < 0.06 ? uploads.current.shift() : undefined;
    if (next) {
      const f = frames[next.index];
      gl.initTexture(next.texture);
      f.art.map = next.texture;
      f.hasImage = true;
      textures.current.push(next.texture);
      if (!live) {
        f.loaded = 1;
        f.art.color.setScalar(ART_IDLE);
      }
      ready.current.uploaded++;
      if (uploads.current.length) wake(0.2);
    }

    if (!live) {
      // One still, once everything is hung (and again only if the box changes shape).
      const r = ready.current;
      if (motion.roomPoster.dirty && r.compiled && r.loadedAll && !uploads.current.length && labels && Math.abs(motion.velocity) < 0.06) {
        shoot();
      } else if (r.loadedAll && uploads.current.length) wake(0.2);
      return;
    }

    const aspect = full.width / full.height;
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    const delta = Math.min(rawDelta, 0.1);
    st.time += delta;

    // If frames are still slow, drop to 1x pixel density once.
    if (!st.lowered) {
      st.slow = delta > 1 / 45 ? st.slow + 1 : Math.max(0, st.slow - 1);
      if (st.slow > 40) {
        st.lowered = true;
        setDpr(1);
      }
    }

    const input = motion.explore;
    const k = input.keys;
    if (!input.active && st.focus >= 0) endFocus();

    // Click: open the door, inspect the work you're looking at, or step back.
    if (input.click) {
      input.click = false;
      if (st.focus >= 0) endFocus();
      else if (st.active === DOOR_INDEX && st.leaveAt < 0) {
        st.leaveAt = st.time + 0.85;
        roomAudio.door();
        motion.onRoomLeave?.();
      } else if (st.active >= 0 && st.active < DOOR_INDEX) {
        const fr = frames[st.active];
        st.focus = st.active;
        // Stand far enough back for the whole work to fill most of the view,
        // leaving the right-hand third for the info panel.
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const fit = Math.max(fr.height / 0.7, (fr.width + 0.5) / 0.6 / camera.aspect) / 2 / tanHalf;
        const dist = THREE.MathUtils.clamp(fit + 0.06, 1.4, 6);
        // step to the right of centre so the work sits left of the panel
        const shift = dist * tanHalf * camera.aspect * 0.3;
        side.set(Math.cos(fr.spot.rotationY), 0, -Math.sin(fr.spot.rotationY));
        goal.copy(fr.spot.position).addScaledVector(fr.spot.normal, dist).addScaledVector(side, shift).setY(EYE);
        st.focusYaw = Math.atan2(fr.spot.normal.x, fr.spot.normal.z);
        st.focusPitch = Math.atan2(HANG - EYE, dist);
        motion.onRoomFocus?.(st.focus);
        roomAudio.chime(true);
      }
    }
    // Any movement key steps back out of inspect mode.
    if (st.focus >= 0 && (input.back || MOVE.some((c) => k.has(c)))) endFocus();
    input.back = false;

    // Leaving: the doors swing open, then the section takes over.
    if (st.leaveAt >= 0 && st.time >= st.leaveAt) {
      st.leaveAt = -1;
      motion.onRoomExit?.();
      // next visit starts back at the entrance
      st.pos.set(0, EYE, BACK - 1.3);
      st.vel.set(0, 0, 0);
      st.yaw = st.aimYaw = 0;
      st.pitch = st.aimPitch = 0.02;
    }
    st.door += ((st.leaveAt >= 0 ? 1 : 0) - st.door) * ease(delta, st.leaveAt >= 0 ? 4 : 2);
    if (leftLeaf.current) leftLeaf.current.rotation.y = -1.25 * st.door;
    if (rightLeaf.current) rightLeaf.current.rotation.y = 1.25 * st.door;

    st.focusMix += ((st.focus >= 0 ? 1 : 0) - st.focusMix) * ease(delta, 3);

    // Mouse look (ignored while inspecting): the mouse moves an aim point and
    // the view glides to it — fast enough to feel direct, smooth enough that
    // uneven frames and jittery mouse events don't show as steps.
    if (st.focus < 0) {
      st.aimYaw -= input.look.x * LOOK_SENS;
      st.aimPitch = THREE.MathUtils.clamp(st.aimPitch - input.look.y * LOOK_SENS, -1.2, 1.2);
      const e = ease(delta, LOOK_SMOOTH);
      st.yaw += (st.aimYaw - st.yaw) * e;
      st.pitch += (st.aimPitch - st.pitch) * e;
    }
    input.look.x = 0;
    input.look.y = 0;

    if (st.focus >= 0) {
      // glide to the viewing spot in front of the work
      const e = ease(delta, 3.2);
      st.pos.lerp(goal, e);
      st.yaw += angleTo(st.yaw, st.focusYaw) * e;
      st.pitch += (st.focusPitch - st.pitch) * e;
      // stepping back resumes from here, without a jump
      st.aimYaw = st.yaw;
      st.aimPitch = st.pitch;
      st.vel.set(0, 0, 0);
    } else {
      // Walk: accelerate toward the held direction, glide to a stop on release.
      const walking = input.active && st.leaveAt < 0;
      const f = walking ? +has(k, "KeyW", "ArrowUp") - +has(k, "KeyS", "ArrowDown") : 0;
      const r = walking ? +has(k, "KeyD", "ArrowRight") - +has(k, "KeyA", "ArrowLeft") : 0;
      const sin = Math.sin(st.yaw);
      const cos = Math.cos(st.yaw);
      wish.set(-sin * f + cos * r, 0, -cos * f - sin * r);
      if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(has(k, "ShiftLeft", "ShiftRight") ? RUN : WALK);
      st.vel.lerp(wish, ease(delta, wish.lengthSq() > 0 ? 8 : 6));
      if (st.vel.lengthSq() < 1e-6) st.vel.set(0, 0, 0);
      st.pos.addScaledVector(st.vel, delta);

      // Collide with the walls, the divider and the benches.
      st.pos.x = THREE.MathUtils.clamp(st.pos.x, -WIDTH / 2 + BODY, WIDTH / 2 - BODY);
      st.pos.z = THREE.MathUtils.clamp(st.pos.z, END + BODY, BACK - BODY);
      for (const b of OBSTACLES) pushOut(st.pos, b, BODY);
    }

    // Head bob + footsteps while moving, a slow breath while standing.
    const speed = Math.hypot(st.vel.x, st.vel.z);
    st.bob += delta * speed * 4.2;
    const step = Math.min(speed / WALK, 1);
    const stepIndex = Math.floor(st.bob / Math.PI);
    if (stepIndex !== st.lastStep) {
      st.lastStep = stepIndex;
      if (speed > 0.6) roomAudio.step(Math.min(1, 0.45 + speed / RUN / 1.5));
    }
    const still = 1 - st.focusMix;
    camera.position.set(
      st.pos.x,
      st.pos.y + (Math.sin(st.bob) * 0.035 * step + Math.sin(st.time * 0.7) * 0.01) * still,
      st.pos.z,
    );
    camera.rotation.set(
      st.pitch + Math.sin(st.time * 0.5) * 0.004 * still,
      st.yaw + Math.cos(st.bob * 0.5) * 0.004 * step,
      0,
    );
    camera.updateMatrixWorld();

    // Active target = the nearest work (or the door) you're close to and facing.
    camera.getWorldDirection(forward);
    let active = -1;
    let best = Infinity;
    const consider = (i: number, center: THREE.Vector3, normal: THREE.Vector3, size: number, range: number) => {
      toTarget.subVectors(center, camera.position);
      const dist = toTarget.length();
      if (dist > range || dist >= best) return;
      // must be in front of it, not behind its wall
      if (-toTarget.dot(normal) < 0.25 * dist) return;
      // looking within its own extent (bigger targets are easier to hit)
      const reach = Math.max(0.82, Math.cos(Math.atan2(size * 0.45, dist)));
      if (toTarget.divideScalar(dist).dot(forward) < reach) return;
      best = dist;
      active = i;
    };
    frames.forEach((fr, i) => consider(i, fr.spot.position, fr.spot.normal, Math.max(fr.width, fr.height), 7));
    consider(DOOR_INDEX, DOOR_CENTER, DOOR_NORMAL, DOOR.h, 5);
    if (st.focus >= 0) active = st.focus;
    if (active !== st.active) {
      st.active = active;
      motion.roomActive = active;
      motion.onRoomActive?.(active);
      if (active >= 0 && input.active && st.focus < 0) roomAudio.hover();
    }

    // Looked-at feedback: the light pool swells and the painting brightens.
    frames.forEach((fr, i) => {
      fr.glow += ((i === active ? 1 : 0) - fr.glow) * ease(delta, 5);
      if (fr.hasImage && fr.loaded < 1) fr.loaded = Math.min(1, fr.loaded + delta / 1.1);
      fr.wallPool.opacity = POOL_IDLE + (POOL_LOOK - POOL_IDLE) * fr.glow;
      fr.floorPool.opacity = FLOOR_IDLE + (FLOOR_LOOK - FLOOR_IDLE) * fr.glow;
      const b = (ART_IDLE + (ART_LOOK - ART_IDLE) * fr.glow) * (fr.hasImage ? 0.35 + 0.65 * fr.loaded : 1);
      fr.art.color.setScalar(b);
    });
    st.doorGlow += ((active === DOOR_INDEX ? 1 : 0) + st.door - st.doorGlow) * ease(delta, 5);
    if (doorPool.current) doorPool.current.opacity = 0.3 + 0.35 * Math.min(1, st.doorGlow);

    // Float the DOM label above the active target.
    const label = motion.roomLabel;
    if (label && active >= 0) {
      if (active === DOOR_INDEX) labelPos.set(0, DOOR.h + 0.75, BACK);
      else {
        const fr = frames[active];
        labelPos.copy(fr.spot.position).setY(HANG + fr.height / 2 + 0.36);
      }
      labelPos.project(camera);
      const x = (labelPos.x * 0.5 + 0.5) * rect.width;
      const y = (-labelPos.y * 0.5 + 0.5) * rect.height;
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${Math.max(70, y).toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  });

  const { box, plane } = shared;
  const wall = <meshLambertMaterial color={WALL} />;

  return createPortal(
    <>
      <hemisphereLight args={["#FFE9D6", "#3A2C22", 1.6]} />
      <ambientLight intensity={0.5} color="#FFF1E4" />

      {/* floor, ceiling, walls */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, MID_Z]} scale={[WIDTH, LENGTH, 1]} geometry={plane}>
        <meshLambertMaterial color={FLOOR} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, HEIGHT, MID_Z]} scale={[WIDTH, LENGTH, 1]} geometry={plane}>
        <meshBasicMaterial color={CEILING} />
      </mesh>
      {/* recessed cove light along the top of both long walls */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (WIDTH / 2 - 0.02), HEIGHT - 0.35, MID_Z]}
          rotation-y={(-s * Math.PI) / 2}
          scale={[LENGTH, 0.06, 1]}
          geometry={plane}
        >
          <meshBasicMaterial color="#E8C29C" />
        </mesh>
      ))}
      {/* track rails */}
      {[-WIDTH / 2 + 2.3, 0, WIDTH / 2 - 2.3].map((x) => (
        <mesh key={`rail${x}`} position={[x, HEIGHT - 0.04, MID_Z]} scale={[0.05, 0.05, LENGTH - 2]} geometry={box}>
          <meshBasicMaterial color="#0E0C0B" />
        </mesh>
      ))}
      <mesh rotation-y={Math.PI / 2} position={[-WIDTH / 2, HEIGHT / 2, MID_Z]} scale={[LENGTH, HEIGHT, 1]} geometry={plane}>
        {wall}
      </mesh>
      <mesh rotation-y={-Math.PI / 2} position={[WIDTH / 2, HEIGHT / 2, MID_Z]} scale={[LENGTH, HEIGHT, 1]} geometry={plane}>
        {wall}
      </mesh>
      <mesh position={[0, HEIGHT / 2, END]} scale={[WIDTH, HEIGHT, 1]} geometry={plane}>
        {wall}
      </mesh>
      <mesh rotation-y={Math.PI} position={[0, HEIGHT / 2, BACK]} scale={[WIDTH, HEIGHT, 1]} geometry={plane}>
        {wall}
      </mesh>
      {/* skirting */}
      {[-1, 1].map((s) => (
        <mesh key={`sk${s}`} position={[s * (WIDTH / 2 - 0.015), 0.06, MID_Z]} scale={[0.03, 0.12, LENGTH]} geometry={box}>
          <meshBasicMaterial color="#15110F" />
        </mesh>
      ))}
      {/* freestanding divider */}
      <mesh position={[DIVIDER.x, DIVIDER.h / 2, DIVIDER.z]} scale={[DIVIDER.w, DIVIDER.h, DIVIDER.d]} geometry={box}>
        {wall}
      </mesh>
      {/* benches: dark base, walnut top */}
      {BENCHES.map((b, i) => (
        <group key={i} position={b.pos}>
          <mesh position-y={-0.04} scale={[b.size[0] - 0.3, b.size[1] - 0.08, b.size[2] - 0.3]} geometry={box}>
            <meshLambertMaterial color={BENCH} />
          </mesh>
          <mesh position-y={b.size[1] / 2 - 0.04} scale={[b.size[0], 0.08, b.size[2]]} geometry={box}>
            <meshLambertMaterial color={BENCH_TOP} />
          </mesh>
        </group>
      ))}

      {/* exit door: faces into the room (local +z = world -z) */}
      <group position={[0, 0, BACK - 0.005]} rotation-y={Math.PI}>
        {/* warm light beyond, seen when the doors open */}
        <mesh position={[0, DOOR.h / 2, 0.004]} scale={[DOOR.w, DOOR.h, 1]} geometry={plane}>
          <meshBasicMaterial color="#FFE9D0" toneMapped={false} />
        </mesh>
        {/* architrave */}
        {[
          [-(DOOR.w / 2 + 0.07), DOOR.h / 2, 0.14, DOOR.h + 0.14],
          [DOOR.w / 2 + 0.07, DOOR.h / 2, 0.14, DOOR.h + 0.14],
          [0, DOOR.h + 0.07, DOOR.w + 0.28, 0.14],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.05]} scale={[w, h, 0.1]} geometry={box} material={shared.frame} />
        ))}
        {/* two leaves, hinged at the outer edges */}
        {[
          { ref: leftLeaf, x: -DOOR.w / 2, dir: 1 },
          { ref: rightLeaf, x: DOOR.w / 2, dir: -1 },
        ].map(({ ref, x, dir }) => (
          <group key={dir} ref={ref} position={[x, 0, 0.03]}>
            <mesh position={[(dir * DOOR.w) / 4, DOOR.h / 2, 0]} scale={[DOOR.w / 2 - 0.01, DOOR.h - 0.02, 0.05]} geometry={box}>
              <meshLambertMaterial color="#5C3E2C" />
            </mesh>
            {/* inset panels */}
            {[0.62, 1.82].map((y) => (
              <mesh
                key={y}
                position={[(dir * DOOR.w) / 4, y, 0.027]}
                scale={[DOOR.w / 2 - 0.22, y < 1 ? 0.9 : 1.2, 1]}
                geometry={plane}
              >
                <meshLambertMaterial color="#4A3122" />
              </mesh>
            ))}
            {/* brass pull */}
            <mesh position={[dir * (DOOR.w / 2 - 0.12), 1.05, 0.06]} scale={[0.03, 0.34, 0.03]} geometry={box}>
              <meshBasicMaterial color="#C9A46A" />
            </mesh>
          </group>
        ))}
        {/* sign + its glow */}
        {exitMat && (
          <mesh position={[0, DOOR.h + 0.42, 0.03]} scale={[0.72, 0.225, 1]} geometry={plane} material={exitMat} />
        )}
        <mesh position={[0, DOOR.h + 0.2, 0.01]} scale={[3.4, 3.2, 1]} geometry={plane}>
          <meshBasicMaterial
            ref={doorPool}
            map={shared.pool}
            color={LIGHT}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {frames.map((f, i) => (
        <group key={f.item.id} position={f.spot.position} rotation-y={f.spot.rotationY}>
          {/* painted spotlight: a pool on the wall, and a fainter one on the floor */}
          <mesh
            position={[0, 0.3, 0.003]}
            scale={[Math.max(f.width, f.height) + 2.6, f.height + 3.4, 1]}
            geometry={plane}
            material={f.wallPool}
          />
          <mesh
            position={[0, 0.012 - HANG, 1.5]}
            rotation-x={-Math.PI / 2}
            scale={[f.width + 2, 2.8, 1]}
            geometry={plane}
            material={f.floorPool}
          />
          {/* slim black frame, ivory mat, the work */}
          <mesh position-z={0.045} scale={[f.width + 0.5, f.height + 0.5, 0.09]} geometry={box} material={shared.frame} />
          <mesh position-z={0.091} scale={[f.width + 0.4, f.height + 0.4, 1]} geometry={plane} material={shared.mat} />
          <mesh position-z={0.093} scale={[f.width, f.height, 1]} geometry={plane} material={f.art} />
          {/* placard, to the right of the work */}
          {placardMats[i] && (
            <mesh
              position={[f.width / 2 + 0.62, 1.45 - HANG, 0.012]}
              scale={[0.42, 0.246, 1]}
              geometry={plane}
              material={placardMats[i]}
            />
          )}
        </group>
      ))}
    </>,
    scene,
  );
}
