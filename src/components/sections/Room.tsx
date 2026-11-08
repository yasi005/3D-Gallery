"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { roomExhibit } from "@/data/gallery";
import { gsap, motion, useScrollScene, wake } from "@/lib/lenis";
import { roomAudio } from "@/lib/roomAudio";
import { useGlTarget } from "@/lib/useDomRect";
import Frame from "../Frame";
import styles from "./Room.module.css";

const MOVE_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
  "Space",
]);

const pad = (n: number) => String(n).padStart(2, "0");

function Playlist() {
  const audio = useSyncExternalStore(roomAudio.subscribe, roomAudio.getState, roomAudio.getServerState);
  const tracks = audio.tracks;
  const track = tracks[audio.track] ?? tracks[0];
  const [open, setOpen] = useState(false);
  const tap = (fn: () => void) => () => {
    fn();
    roomAudio.click();
  };

  return (
    <div className={styles.player} data-room-ui>
      {open && (
        <ol className={styles.tracks}>
          {tracks.map((t, i) => (
            <li key={t.name}>
              <button
                type="button"
                className={i === audio.track ? styles.trackOn : undefined}
                onClick={tap(() => roomAudio.select(i))}
              >
                <span className={styles.trackNum}>{pad(i + 1)}</span>
                <span className={styles.trackName}>{t.name}</span>
                <span className={styles.trackMood}>{t.mood}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className={styles.playerBar}>
        <span className={`${styles.eq} ${audio.playing && !audio.muted && !audio.musicOff ? styles.eqOn : ""}`} aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        <button type="button" className={styles.nowPlaying} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className={styles.npLabel}>
            {pad(audio.track + 1)}/{pad(tracks.length)} · playlist {open ? "▾" : "▴"}
          </span>
          <span className={styles.npName}>{track.name}</span>
        </button>
        <div className={styles.transport}>
          {tracks.length > 1 && (
          <button type="button" onClick={tap(() => roomAudio.prev())} aria-label="Previous track" title="Previous (B)">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 5h2v14H6zM20 5v14L9 12z" />
            </svg>
          </button>
          )}
          <button
            type="button"
            className={styles.playBtn}
            onClick={tap(() => roomAudio.toggle())}
            aria-label={audio.playing ? "Pause music" : "Play music"}
            title="Play / pause (P)"
          >
            {audio.playing ? (
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M7 4v16l13-8z" />
              </svg>
            )}
          </button>
          {tracks.length > 1 && (
          <button type="button" onClick={tap(() => roomAudio.next())} aria-label="Next track" title="Next (N)">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
            </svg>
          </button>
          )}
        </div>
        <button
          type="button"
          className={styles.mute}
          onClick={tap(() => roomAudio.toggleMute())}
          aria-label={audio.muted ? "Unmute" : "Mute"}
          title="Mute (M)"
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            {audio.muted ? (
              <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" fill="none" />
            ) : (
              <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" fill="none" />
            )}
          </svg>
        </button>
        <input
          className={styles.volume}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={audio.muted ? 0 : audio.volume}
          onChange={(e) => roomAudio.setVolume(Number(e.target.value))}
          aria-label="Volume"
        />
        <div className={styles.toggles}>
          <button
            type="button"
            className={audio.musicOff ? styles.toggleOff : undefined}
            onClick={tap(() => roomAudio.toggleMusic())}
            aria-pressed={!audio.musicOff}
            title={audio.musicOff ? "Turn music on" : "Turn music off"}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M9 17.5V6l10-2v11.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
              <circle cx="6.5" cy="17.5" r="2.5" />
              <circle cx="16.5" cy="15.5" r="2.5" />
            </svg>
            <span>music</span>
          </button>
          <button
            type="button"
            className={audio.fxOff ? styles.toggleOff : undefined}
            onClick={() => {
              const wasOff = audio.fxOff;
              roomAudio.toggleFx();
              if (wasOff) roomAudio.click();
            }}
            aria-pressed={!audio.fxOff}
            title={audio.fxOff ? "Turn sound effects on" : "Turn sound effects off"}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 3c.6 4.5 2.4 6.4 7 7-4.6.6-6.4 2.5-7 7-.6-4.5-2.4-6.4-7-7 4.6-.6 6.4-2.5 7-7z" />
              <path d="M19 15c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" />
            </svg>
            <span>sounds</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Room() {
  const root = useRef<HTMLElement>(null);
  // The WebGL room tracks the preview box (to know when to start loading);
  // while walking it draws full screen.
  const boxTarget = useGlTarget("room-stage", "room");
  const box = useRef<HTMLDivElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const irisEl = useRef<HTMLDivElement>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const label = useRef<HTMLDivElement>(null);
  const labelInner = useRef<HTMLDivElement>(null);
  const labelNum = useRef<HTMLSpanElement>(null);
  const labelText = useRef<HTMLSpanElement>(null);
  const labelBy = useRef<HTMLSpanElement>(null);
  const labelHint = useRef<HTMLSpanElement>(null);
  const [exploring, setExploring] = useState(false);
  const [cursorFree, setCursorFree] = useState(false);
  const [focus, setFocus] = useState(-1);
  const exitRef = useRef<() => void>(() => {});
  const lockRef = useRef<() => void>(() => {});
  const focusRef = useRef(-1);

  useScrollScene(root, ({ desktop, reduced }) => {
    const el = root.current!;

    // Mobile & reduced motion get the vertical stack instead (CSS).
    if (!desktop || reduced) {
      gsap.utils.toArray<HTMLElement>(`.${styles.stackItem}`, el).forEach((item) =>
        gsap.fromTo(
          item,
          { autoAlpha: 0, y: reduced ? 0 : 30 },
          { autoAlpha: 1, y: 0, scrollTrigger: { trigger: item, start: "top 88%" } },
        ),
      );
      return;
    }

    gsap.fromTo(
      el.querySelector(`.${styles.head}`),
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, duration: 1.4, scrollTrigger: { trigger: el, start: "top 70%" } },
    );
    gsap.fromTo(
      box.current,
      { autoAlpha: 0, y: 60, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: box.current, start: "top 85%" } },
    );

    const total = pad(roomExhibit.length);
    let shown = -1;

    // Called by the WebGL room when the visitor faces / turns away from a work.
    const show = (index: number) => {
      if (index === shown) return;
      shown = index;
      const lab = labelInner.current!;
      if (index < 0) {
        gsap.to(lab, { autoAlpha: 0, duration: 0.35, overwrite: true });
        return;
      }
      const item = roomExhibit[index];
      if (item) {
        labelNum.current!.textContent = `${pad(index + 1)} / ${total}`;
        labelText.current!.textContent = item.caption ?? item.alt;
        labelBy.current!.textContent = [item.artist, item.year].filter(Boolean).join(", ");
        labelHint.current!.textContent = "click to look closer";
      } else {
        // the exit door
        labelNum.current!.textContent = "Exit";
        labelText.current!.textContent = "Back to the page";
        labelBy.current!.textContent = "";
        labelHint.current!.textContent = "click to open the doors";
      }
      gsap.fromTo(lab, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, overwrite: true });
    };
    motion.roomLabel = label.current;
    motion.onRoomActive = show;
    // Exit door: a circle closes in on the doors while they swing open…
    const iris = { r: 0 };
    const irisFull = () => Math.hypot(window.innerWidth, window.innerHeight) / 2 + 8;
    const paintIris = () => {
      const node = irisEl.current;
      if (!node) return;
      const r = iris.r;
      node.style.background = `radial-gradient(circle at 50% 50%, transparent ${r}px, rgb(212 174 127 / 0.85) ${r + 1}px, #0d0b0a ${r + 3}px)`;
    };
    motion.onRoomLeave = () => {
      const node = irisEl.current;
      if (!node) return;
      iris.r = irisFull();
      paintIris();
      node.style.visibility = "visible";
      gsap.to(iris, { r: -4, duration: 0.8, ease: "power3.in", onUpdate: paintIris, overwrite: true });
    };
    // …then, in the dark, we leave walk mode, land back on the room box and
    // the circle opens again on it.
    motion.onRoomExit = () => {
      exitRef.current();
      const box = el.querySelector<HTMLElement>(`.${styles.box}`);
      requestAnimationFrame(() => {
        if (box) {
          const top = box.getBoundingClientRect().top + window.scrollY;
          const lenis = motion.lenis;
          if (lenis) {
            lenis.resize();
            lenis.scrollTo(top, { immediate: true, force: true });
          } else window.scrollTo(0, top);
        }
        wake(1.5);
        gsap.to(iris, {
          r: irisFull(),
          duration: 1.1,
          delay: 0.2,
          ease: "power3.out",
          onUpdate: paintIris,
          onComplete: () => {
            if (irisEl.current) irisEl.current.style.visibility = "hidden";
          },
          overwrite: true,
        });
      });
    };
    motion.onRoomFocus = (index) => {
      focusRef.current = index;
      setFocus(index);
    };

    return () => {
      motion.roomLabel = null;
      motion.onRoomActive = null;
      motion.onRoomFocus = null;
      motion.onRoomExit = null;
      motion.onRoomLeave = null;
      motion.roomActive = -1;
    };
  });

  // Preview poster: the WebGL room renders one still of the hall for the box,
  // so scrolling past it costs nothing. Re-shot when the box changes shape.
  useEffect(() => {
    motion.onRoomPoster = (url) =>
      setPoster((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    const el = box.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = el
      ? new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          if (!width || !height) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            const aspect = width / height;
            if (Math.abs(aspect - motion.roomPoster.aspect) < 0.01 && !motion.roomPoster.dirty) return;
            motion.roomPoster.aspect = aspect;
            motion.roomPoster.dirty = true;
            wake(0.3);
          }, 250);
        })
      : null;
    if (el) ro!.observe(el);
    return () => {
      motion.onRoomPoster = null;
      ro?.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Walk mode: pointer lock for mouse look (drag-to-look if it's refused),
  // WASD / arrows to walk, Shift to run, click to inspect, Esc to leave.
  useEffect(() => {
    const input = motion.explore;
    const html = document.documentElement;
    let locked = false;
    let freeing = false; // Q: let go of the mouse without leaving
    let lockFailed = false;
    let down: { moved: number } | null = null;

    const lock = () => {
      const el = stageEl.current;
      if (!el?.requestPointerLock) {
        lockFailed = true;
        return;
      }
      try {
        const p = el.requestPointerLock() as Promise<void> | undefined;
        p?.catch?.(() => {
          lockFailed = true;
          setCursorFree(true);
        });
      } catch {
        lockFailed = true;
        setCursorFree(true);
      }
    };

    const exit = () => {
      if (!input.active) return;
      input.active = false;
      input.keys.clear();
      input.look.x = input.look.y = 0;
      input.click = false;
      html.classList.remove("is-exploring");
      if (document.pointerLockElement) {
        freeing = false;
        document.exitPointerLock();
      }
      locked = false;
      roomAudio.leave();
      motion.lenis?.start();
      setExploring(false);
      setCursorFree(false);
    };
    exitRef.current = exit;
    lockRef.current = lock;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!input.active) return;
      if ((e.target as HTMLElement | null)?.closest?.("input")) return;
      switch (e.code) {
        case "Escape":
          // fallback mode: Esc closes an open work first, then leaves
          if (focusRef.current >= 0) input.click = true;
          else exit();
          return;
        case "KeyQ":
          if (locked) {
            freeing = true;
            document.exitPointerLock();
          } else if (!lockFailed) lock();
          return;
        case "KeyM":
          roomAudio.toggleMute();
          return;
        case "KeyN":
          roomAudio.next();
          return;
        case "KeyB":
          roomAudio.prev();
          return;
        case "KeyP":
          roomAudio.toggle();
          return;
        case "KeyE":
        case "Enter":
          input.click = true;
          return;
      }
      if (MOVE_KEYS.has(e.code)) {
        e.preventDefault();
        input.keys.add(e.code);
        if (focusRef.current >= 0 && !e.code.startsWith("Shift") && e.code !== "Space") input.back = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => input.keys.delete(e.code);

    const onMouseDown = (e: MouseEvent) => {
      if (!input.active || e.button !== 0) return;
      if ((e.target as HTMLElement | null)?.closest?.("[data-room-ui]")) return;
      down = { moved: 0 };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!input.active) return;
      if (down) down.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
      if (!locked && !(e.buttons & 1 && down)) return;
      input.look.x += e.movementX;
      input.look.y += e.movementY;
    };
    const onMouseUp = () => {
      if (!input.active || !down) return;
      const wasClick = down.moved < 6;
      down = null;
      if (!wasClick) return;
      if (locked || lockFailed) input.click = true; // inspect / step back
      else lock(); // cursor was freed with Q: click the room to grab it again
    };
    const onLockChange = () => {
      const isLocked = document.pointerLockElement === stageEl.current;
      if (locked && !isLocked) {
        if (freeing) setCursorFree(true);
        else exit(); // Esc under pointer lock
      }
      if (isLocked) setCursorFree(false);
      freeing = false;
      locked = isLocked;
    };
    const onLockError = () => {
      lockFailed = true;
      setCursorFree(true);
    };
    const onWheel = (e: WheelEvent) => {
      if (input.active) e.preventDefault();
    };
    const onBlur = () => input.keys.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("blur", onBlur);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);

    return () => {
      exit();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
    };
  }, []);

  const enter = () => {
    const el = stageEl.current;
    if (!el || motion.explore.active) return;
    // The stage opens full screen over the page; freeze page scroll under it.
    motion.lenis?.stop();
    motion.explore.active = true;
    // set synchronously so the stage is shown before pointer lock is requested
    document.documentElement.classList.add("is-exploring");
    wake(0.5);
    setExploring(true);
    roomAudio.enter();
    lockRef.current();
  };

  const item = focus >= 0 ? roomExhibit[focus] : null;

  return (
    <section
      ref={root}
      className={`${styles.room} ${exploring ? styles.exploring : ""} ${cursorFree ? styles.free : ""}`}
      data-scene
      data-bg="#E3D5C6"
      aria-labelledby="room-title"
    >
      <header className={styles.head}>
        <p className="label">(04) — The room</p>
        <h2 id="room-title" className={styles.title} data-skew>
          Walk <em>through</em>
        </h2>
        <p className={styles.lede}>Thirteen works, one long hall. Put your headphones on.</p>
      </header>

      {/* preview: a still of the hall; the live room only runs once you step in */}
      <div
        ref={(el) => {
          box.current = el;
          return boxTarget(el);
        }}
        className={styles.box}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob URL rendered by WebGL
          <img className={styles.poster} src={poster} alt="" aria-hidden />
        ) : (
          <div className={styles.posterLoading} aria-hidden />
        )}
        <div className={styles.boxShade} aria-hidden />
        <div className={styles.boxInner}>
          <button type="button" className={styles.enter} onClick={enter} data-cursor="enter">
            <span>Step inside</span>
            <span aria-hidden>→</span>
          </button>
          <p className={styles.keys}>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> walk · mouse look · click a work to look closer · the exit door is behind you
          </p>
        </div>
      </div>

      <div ref={irisEl} className={styles.iris} aria-hidden />
      <div ref={stageEl} className={styles.stage}>
        <div className={styles.curtain} aria-hidden />
        <div className={styles.vignette} aria-hidden />

        <div className={styles.hud} aria-hidden={!exploring}>
          <span className={`${styles.crosshair} ${focus < 0 ? "" : styles.crosshairHidden}`} />
          <div className={styles.hudBar}>
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> walk
            </span>
            <span>
              <kbd>Shift</kbd> run
            </span>
            <span>
              <kbd>Click</kbd> look closer
            </span>
            <span>
              <kbd>Q</kbd> {cursorFree ? "click room to look" : "free cursor"}
            </span>
            <button
              type="button"
              className={styles.leave}
              onClick={() => exitRef.current()}
              tabIndex={exploring ? 0 : -1}
              data-room-ui
            >
              <kbd>Esc</kbd> leave
            </button>
          </div>
          <Playlist />
        </div>

        {/* inspect panel */}
        <aside className={`${styles.inspect} ${item ? styles.inspectOn : ""}`} aria-live="polite" data-room-ui>
          {item && (
            <>
              <p className="label">
                {pad(focus + 1)} / {pad(roomExhibit.length)}
              </p>
              <h3 className={styles.inspectTitle}>{item.caption}</h3>
              <p className={styles.inspectBy}>{[item.artist, item.year].filter(Boolean).join(" · ")}</p>
              {item.note && <p className={styles.inspectNote}>{item.note}</p>}
              {item.credit && <p className={styles.inspectCredit}>{item.credit}</p>}
              <p className={styles.inspectHint}>
                <kbd>Click</kbd> or <kbd>W</kbd> to step back
              </p>
            </>
          )}
        </aside>

        {/* outer box is positioned by the WebGL room; inner one fades */}
        <div ref={label} className={styles.frameLabel}>
          <div ref={labelInner} className={styles.frameLabelInner} aria-live="polite">
            <span ref={labelNum} className="label" />
            <span ref={labelText} className={styles.frameCaption} />
            <span ref={labelBy} className={styles.frameBy} />
            <span ref={labelHint} className={styles.frameHint}>
              click to look closer
            </span>
          </div>
        </div>
        <ul className="sr-only">
          {roomExhibit.map((it) => (
            <li key={it.id}>
              {it.caption} — {it.artist}, {it.year}. {it.alt}
            </li>
          ))}
        </ul>
      </div>

      <ol className={styles.stack} aria-label="Works in the room">
        {roomExhibit.map((it, i) => (
          <li key={it.id} className={styles.stackItem}>
            <div className={styles.stackMedia} style={{ aspectRatio: it.aspect }} data-cursor="view">
              <Frame item={it} sizes="(max-width: 768px) 86vw, 50vw" />
            </div>
            <p className={styles.stackCaption}>
              <span className="label">{pad(i + 1)}</span>
              <span className={styles.frameCaption}>{it.caption}</span>
              <span className={styles.frameBy}>{[it.artist, it.year].filter(Boolean).join(", ")}</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
