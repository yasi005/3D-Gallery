"use client";

// Sound for the walkable room, made with the Web Audio API: your songs
// (files in public/music, see src/data/playlist.ts), generative ambient
// tracks, a gallery-sized reverb, footsteps and soft UI sounds. The context
// is created on the first user gesture.

import { SONGS } from "@/data/playlist";

export type Track = {
  /** audio file: a real song instead of a generated ambient track */
  src?: string;
  /** where the song starts (seconds) */
  start?: number;
  name: string;
  mood: string;
  /** chord progression, MIDI notes */
  chords: number[][];
  /** seconds per chord */
  chordLen: number;
  wave: OscillatorType;
  /** pad low-pass cutoff (Hz) */
  cutoff: number;
  /** notes the bells pick from */
  bells: number[];
  /** chance of a bell per half second */
  bellRate: number;
};

export const TRACKS: Track[] = [
  {
    name: "Long Gallery",
    mood: "warm, slow",
    chords: [
      [50, 57, 61, 66], // Dmaj7
      [47, 54, 61, 62], // Bm9
      [43, 50, 54, 59], // Gmaj7
      [45, 52, 59, 61], // A add9
    ],
    chordLen: 8,
    wave: "sawtooth",
    cutoff: 650,
    bells: [74, 76, 78, 81, 83, 86],
    bellRate: 0.16,
  },
  {
    name: "Nocturne in Plaster",
    mood: "dark, still",
    chords: [
      [45, 52, 55, 59, 60], // Am9-ish
      [41, 48, 52, 57], // Fmaj7
      [48, 55, 59, 64], // Cmaj7
      [40, 47, 50, 55], // Em7
    ],
    chordLen: 10,
    wave: "triangle",
    cutoff: 900,
    bells: [69, 72, 76, 79, 81],
    bellRate: 0.1,
  },
  {
    name: "Gold Leaf",
    mood: "bright, airy",
    chords: [
      [51, 58, 62, 65, 70], // Ebmaj9
      [48, 55, 58, 62, 63], // Cm9
      [44, 51, 55, 60], // Abmaj7
      [46, 53, 58, 60, 62], // Bb add9
    ],
    chordLen: 7,
    wave: "sawtooth",
    cutoff: 1100,
    bells: [75, 77, 79, 82, 84, 87],
    bellRate: 0.22,
  },
  {
    name: "Still Water",
    mood: "drone, sparse",
    chords: [
      [38, 45, 50, 57], // D5 drone
      [38, 45, 52, 57], // D sus
    ],
    chordLen: 14,
    wave: "sine",
    cutoff: 1400,
    bells: [62, 66, 69, 74, 76],
    bellRate: 0.07,
  },
];

/** Song files as tracks (the generator fields are unused for these). */
const songTracks = SONGS.map<Track>((s) => ({
  src: s.file,
  start: s.start ?? 0,
  name: s.name,
  mood: s.artist,
  chords: [],
  chordLen: 1,
  wave: "sine",
  cutoff: 0,
  bells: [],
  bellRate: 0,
}));

/** The player lists your songs; the generated tracks only fill in if none are found. */
const INITIAL_TRACKS = songTracks.length ? songTracks : TRACKS;

export type AudioState = {
  /** what the player lists: songs whose files exist, then the ambient tracks */
  tracks: Track[];
  track: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  /** music silenced (sound effects still play) */
  musicOff: boolean;
  /** sound effects silenced (footsteps, chimes, doors, clicks) */
  fxOff: boolean;
};

const STORE_KEY = "room-audio";
const SERVER_STATE: AudioState = {
  tracks: INITIAL_TRACKS,
  track: 0,
  playing: false,
  volume: 0.6,
  muted: false,
  musicOff: false,
  fxOff: false,
};
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Saved = { track?: number; name?: string; volume?: number; muted?: boolean; musicOff?: boolean; fxOff?: boolean };

function load(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Saved;
  } catch {
    return {};
  }
}

class RoomAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private reverb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextChord = 0;
  private chordIndex = 0;
  private nextBell = 0;
  private stepSide = 1;
  private listeners = new Set<() => void>();

  private song: HTMLAudioElement | null = null;
  private songBus!: GainNode;
  private pauseTimer: ReturnType<typeof setTimeout> | undefined;
  private savedName: string | undefined;

  state: AudioState = SERVER_STATE;
  private musicOut!: GainNode;
  private musicWet!: GainNode;

  constructor() {
    if (typeof window === "undefined") return;
    const saved = load();
    this.savedName = saved.name;
    const i = INITIAL_TRACKS.findIndex((t) => t.name === saved.name);
    this.state = {
      tracks: INITIAL_TRACKS,
      track: i >= 0 ? i : 0,
      playing: false,
      volume: saved.volume ?? 0.6,
      muted: saved.muted ?? false,
      musicOff: saved.musicOff ?? false,
      fxOff: saved.fxOff ?? false,
    };
    void this.findSongs();
  }

  /** Keep only the songs whose files are actually in public/music. */
  private async findSongs() {
    const found = await Promise.all(
      songTracks.map((t) =>
        fetch(t.src!, { method: "HEAD" })
          .then((r) => r.ok && !(r.headers.get("content-type") ?? "").includes("text/html"))
          .catch(() => false),
      ),
    );
    const songs = songTracks.filter((_, i) => found[i]);
    const tracks = songs.length ? songs : TRACKS;
    if (tracks.length === this.state.tracks.length && tracks.every((t, i) => t === this.state.tracks[i])) return;
    let track: number;
    if (this.state.playing) {
      // keep pointing at whatever is playing now
      track = Math.max(0, tracks.indexOf(this.current));
    } else {
      // first visit starts on the first song; otherwise resume the last pick
      const i = this.savedName ? tracks.findIndex((t) => t.name === this.savedName) : -1;
      track = i >= 0 ? i : 0;
    }
    this.state = { ...this.state, tracks, track };
    this.listeners.forEach((l) => l());
  }

  private get current() {
    return this.state.tracks[this.state.track];
  }

  // ---- state for React (useSyncExternalStore) ----
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  };
  getState = () => this.state;
  getServerState = () => SERVER_STATE;
  private set(patch: Partial<AudioState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
    try {
      const { track, volume, muted, musicOff, fxOff } = this.state;
      this.savedName = this.current?.name;
      localStorage.setItem(STORE_KEY, JSON.stringify({ track, name: this.savedName, volume, muted, musicOff, fxOff }));
    } catch {
      /* private mode */
    }
  }

  // ---- graph ----
  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.masterLevel();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 6;
    this.master.connect(limiter).connect(ctx.destination);

    // A big, soft room: 3.4 s of decaying stereo noise.
    this.reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb.connect(wet).connect(this.master);

    this.musicOut = ctx.createGain();
    this.musicOut.connect(this.master);
    this.musicWet = ctx.createGain();
    this.musicWet.connect(this.reverb);
    this.musicOut.gain.value = this.musicWet.gain.value = this.state.musicOff ? 0 : 1;

    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.musicOut);
    const musicSend = ctx.createGain();
    musicSend.gain.value = 0.7;
    this.music.connect(musicSend).connect(this.musicWet);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.state.fxOff ? 0 : 1;
    this.sfx.connect(this.master);
    const sfxSend = ctx.createGain();
    sfxSend.gain.value = 0.28;
    this.sfx.connect(sfxSend).connect(this.reverb);

    // Songs: one <audio> element through the same master (and a touch of room).
    this.songBus = ctx.createGain();
    this.songBus.gain.value = 0;
    this.songBus.connect(this.musicOut);
    const songSend = ctx.createGain();
    songSend.gain.value = 0.12;
    this.songBus.connect(songSend).connect(this.musicWet);
    const el = new Audio();
    el.preload = "auto";
    el.addEventListener("ended", () => {
      // a single song loops (from its start point); otherwise move on
      if (this.state.tracks.length === 1) {
        el.currentTime = this.current.start ?? 0;
        void el.play().catch(() => {});
      } else this.next();
    });
    el.addEventListener("error", () => {
      // unreadable file: move on rather than sit in silence
      if (this.state.playing && this.current?.src) setTimeout(() => this.next(), 400);
    });
    ctx.createMediaElementSource(el).connect(this.songBus);
    this.song = el;

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;

    return ctx;
  }

  private masterLevel() {
    return this.state.muted ? 0 : this.state.volume * 0.8;
  }

  // ---- music ----
  private pad(notes: number[], at: number, dur: number) {
    const ctx = this.ctx!;
    const t = this.current;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(t.cutoff * 0.6, at);
    filter.frequency.linearRampToValueAtTime(t.cutoff, at + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(t.cutoff * 0.7, at + dur);
    filter.Q.value = 0.4;
    const env = ctx.createGain();
    const peak = 0.07 / Math.sqrt(notes.length);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(peak, at + Math.min(3, dur * 0.35));
    env.gain.setValueAtTime(peak, at + dur * 0.6);
    env.gain.linearRampToValueAtTime(0, at + dur);
    filter.connect(env).connect(this.music);

    const play = (freq: number, type: OscillatorType, detune: number, gain = 1) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(filter);
      o.start(at);
      o.stop(at + dur + 0.1);
    };
    notes.forEach((m) => {
      play(mtof(m), t.wave, -7);
      play(mtof(m), t.wave, 7);
    });
    // soft sub under the root
    play(mtof(notes[0] - 12), "sine", 0, 1.6);
  }

  private bell(midi: number, at: number, level = 0.05, dest?: AudioNode) {
    const ctx = this.ctx!;
    const f = mtof(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(level, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 3.2);
    env.connect(dest ?? this.music);
    [
      [1, 1],
      [2.76, 0.25],
      [5.4, 0.08],
    ].forEach(([ratio, g]) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * ratio;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(env);
      o.start(at);
      o.stop(at + 3.3);
    });
  }

  private schedule = () => {
    const ctx = this.ctx;
    if (!ctx || !this.state.playing) return;
    const t = this.current;
    if (t.src) return;
    const horizon = ctx.currentTime + 1.5;
    while (this.nextChord < horizon) {
      const chord = t.chords[this.chordIndex % t.chords.length];
      this.pad(chord, this.nextChord, t.chordLen * 1.35);
      this.chordIndex++;
      this.nextChord += t.chordLen;
    }
    while (this.nextBell < horizon) {
      if (Math.random() < t.bellRate) {
        const m = t.bells[Math.floor(Math.random() * t.bells.length)];
        this.bell(m, this.nextBell + Math.random() * 0.2, 0.025 + Math.random() * 0.03);
      }
      this.nextBell += 0.5;
    }
  };

  private startMusic() {
    const ctx = this.ctx!;
    const t = this.current;
    if (t.src) {
      this.startSong(t.src);
      return;
    }
    this.fadeSong(0.8);
    const now = ctx.currentTime;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setValueAtTime(this.music.gain.value, now);
    this.music.gain.linearRampToValueAtTime(1, now + 2.5);
    this.nextChord = now + 0.05;
    this.nextBell = now + 2;
    this.chordIndex = 0;
    if (!this.timer) this.timer = setInterval(this.schedule, 250);
    this.schedule();
  }

  private startSong(src: string) {
    const ctx = this.ctx!;
    const el = this.song!;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // fade out any ambient tail
    const now = ctx.currentTime;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setValueAtTime(this.music.gain.value, now);
    this.music.gain.linearRampToValueAtTime(0, now + 1);
    clearTimeout(this.pauseTimer);
    const url = new URL(src, location.href).href;
    if (el.src !== url) {
      el.src = url;
      el.currentTime = this.current.start ?? 0;
    }
    void el.play().catch(() => {});
    this.songBus.gain.cancelScheduledValues(now);
    this.songBus.gain.setValueAtTime(this.songBus.gain.value, now);
    this.songBus.gain.linearRampToValueAtTime(1, now + 1.5);
  }

  /** Fade the song out, then pause it (keeps its position for resume). */
  private fadeSong(fade: number) {
    const ctx = this.ctx;
    if (!ctx || !this.song) return;
    const now = ctx.currentTime;
    this.songBus.gain.cancelScheduledValues(now);
    this.songBus.gain.setValueAtTime(this.songBus.gain.value, now);
    this.songBus.gain.linearRampToValueAtTime(0, now + fade);
    clearTimeout(this.pauseTimer);
    this.pauseTimer = setTimeout(() => this.song?.pause(), fade * 1000 + 50);
  }

  private stopMusic(fade = 1.2) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const ctx = this.ctx;
    if (!ctx) return;
    this.fadeSong(fade);
    const now = ctx.currentTime;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setValueAtTime(this.music.gain.value, now);
    this.music.gain.linearRampToValueAtTime(0, now + fade);
  }

  /** Swap the music bus so the old track's tail fades out on its own. */
  private freshMusicBus() {
    const ctx = this.ctx!;
    const old = this.music;
    const now = ctx.currentTime;
    old.gain.cancelScheduledValues(now);
    old.gain.setValueAtTime(old.gain.value, now);
    old.gain.linearRampToValueAtTime(0, now + 1.2);
    setTimeout(() => old.disconnect(), 5000);
    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.musicOut);
    const send = ctx.createGain();
    send.gain.value = 0.7;
    this.music.connect(send).connect(this.musicWet);
  }

  // ---- public controls ----
  /** Call from a user gesture (entering the room). */
  enter() {
    const ctx = this.ensure();
    if (!ctx) return;
    void ctx.resume();
    this.whoosh();
    this.set({ playing: true });
    this.startMusic();
  }

  leave() {
    if (!this.ctx) return;
    this.stopMusic(1.5);
    this.set({ playing: false });
  }

  toggle() {
    if (!this.ensure()) return;
    void this.ctx!.resume();
    if (this.state.playing) {
      this.stopMusic(0.8);
      this.set({ playing: false });
    } else {
      this.set({ playing: true });
      this.startMusic();
    }
  }

  select(index: number) {
    if (!this.ensure()) return;
    const n = this.state.tracks.length;
    const track = ((index % n) + n) % n;
    // a different song starts from the top
    const target = this.state.tracks[track];
    if (this.song && target !== this.current) this.song.currentTime = target.start ?? 0;
    if (this.state.playing) {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.freshMusicBus();
      this.set({ track });
      this.startMusic();
    } else {
      this.set({ track, playing: true });
      this.startMusic();
    }
  }

  next() {
    this.select(this.state.track + 1);
  }

  prev() {
    this.select(this.state.track - 1);
  }

  setVolume(volume: number) {
    this.set({ volume: Math.min(1, Math.max(0, volume)), muted: false });
    this.applyMaster();
  }

  toggleMute() {
    this.set({ muted: !this.state.muted });
    this.applyMaster();
  }

  /** Silence just the music (sound effects keep playing). */
  toggleMusic() {
    this.set({ musicOff: !this.state.musicOff });
    const ctx = this.ctx;
    if (!ctx) return;
    const v = this.state.musicOff ? 0 : 1;
    this.musicOut.gain.setTargetAtTime(v, ctx.currentTime, 0.12);
    this.musicWet.gain.setTargetAtTime(v, ctx.currentTime, 0.12);
  }

  /** Silence just the sound effects (footsteps, chimes, doors, clicks). */
  toggleFx() {
    this.set({ fxOff: !this.state.fxOff });
    const ctx = this.ctx;
    if (!ctx) return;
    this.sfx.gain.setTargetAtTime(this.state.fxOff ? 0 : 1, ctx.currentTime, 0.05);
  }

  private applyMaster() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.master.gain.setTargetAtTime(this.masterLevel(), ctx.currentTime, 0.08);
  }

  // ---- sound effects ----
  private ready() {
    return this.ctx && this.ctx.state === "running" ? this.ctx : null;
  }

  /** A footstep on a hard gallery floor. `force` 0..1 (walk ≈ 0.6, run = 1). */
  step(force = 0.6) {
    const ctx = this.ready();
    if (!ctx) return;
    const at = ctx.currentTime + 0.005;
    this.stepSide *= -1;
    const pan = ctx.createStereoPanner();
    pan.pan.value = 0.12 * this.stepSide;
    pan.connect(this.sfx);

    // heel click: a short band of noise
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700 + Math.random() * 500;
    bp.Q.value = 1.1;
    const g = ctx.createGain();
    const level = 0.22 * force;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    src.connect(bp).connect(g).connect(pan);
    src.start(at, Math.random() * 0.5, 0.15);

    // body thump
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(95 + Math.random() * 15, at);
    o.frequency.exponentialRampToValueAtTime(55, at + 0.09);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, at);
    og.gain.linearRampToValueAtTime(0.25 * force, at + 0.006);
    og.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    o.connect(og).connect(pan);
    o.start(at);
    o.stop(at + 0.14);
  }

  /** Airy swell when stepping into the room. */
  whoosh() {
    const ctx = this.ctx;
    if (!ctx) return;
    const at = ctx.currentTime + 0.02;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(180, at);
    lp.frequency.exponentialRampToValueAtTime(2400, at + 0.7);
    lp.frequency.exponentialRampToValueAtTime(220, at + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.12, at + 0.6);
    g.gain.linearRampToValueAtTime(0, at + 1.9);
    src.connect(lp).connect(g).connect(this.sfx);
    src.start(at);
    src.stop(at + 2);
  }

  /** Barely-there tick when you turn toward a work. */
  hover() {
    const ctx = this.ready();
    if (!ctx) return;
    const at = ctx.currentTime + 0.005;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(2100, at);
    o.frequency.exponentialRampToValueAtTime(1500, at + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.035, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    o.connect(g).connect(this.sfx);
    o.start(at);
    o.stop(at + 0.08);
  }

  /** Two soft bells: stepping up to a work (or back from it). */
  chime(up = true) {
    const ctx = this.ready();
    if (!ctx) return;
    const at = ctx.currentTime + 0.01;
    const [a, b] = up ? [81, 88] : [88, 81];
    this.bell(a, at, 0.06, this.sfx);
    this.bell(b, at + 0.09, 0.045, this.sfx);
  }

  /** Latch, then the heavy doors swinging open onto the street. */
  door() {
    const ctx = this.ready();
    if (!ctx) return;
    const at = ctx.currentTime + 0.01;
    // latch click
    const click = ctx.createBufferSource();
    click.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 2400;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.18, at);
    cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    click.connect(hp).connect(cg).connect(this.sfx);
    click.start(at, 0, 0.06);
    // low wooden thump
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120, at + 0.06);
    o.frequency.exponentialRampToValueAtTime(48, at + 0.3);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, at + 0.06);
    og.gain.linearRampToValueAtTime(0.3, at + 0.08);
    og.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
    o.connect(og).connect(this.sfx);
    o.start(at + 0.06);
    o.stop(at + 0.45);
    // air rushing in as they open
    const air = ctx.createBufferSource();
    air.buffer = this.noise;
    air.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(300, at + 0.1);
    lp.frequency.exponentialRampToValueAtTime(1600, at + 0.8);
    const ag = ctx.createGain();
    ag.gain.setValueAtTime(0, at + 0.1);
    ag.gain.linearRampToValueAtTime(0.09, at + 0.6);
    ag.gain.linearRampToValueAtTime(0, at + 1.6);
    air.connect(lp).connect(ag).connect(this.sfx);
    air.start(at + 0.1);
    air.stop(at + 1.7);
  }

  /** Small click for UI buttons. */
  click() {
    const ctx = this.ready();
    if (!ctx) return;
    const at = ctx.currentTime + 0.003;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    src.connect(hp).connect(g).connect(this.sfx);
    src.start(at, 0, 0.04);
  }
}

export const roomAudio = new RoomAudio();
