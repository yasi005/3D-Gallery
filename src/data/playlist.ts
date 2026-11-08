/**
 * Songs for the 3D room's playlist.
 *
 * Put audio in `public/music/` and list it here. Missing files are skipped at
 * runtime (ambient tracks fill in), and `public/music/*` is gitignored so
 * personal recordings stay off GitHub / Vercel.
 *
 * `start` is where playback begins (seconds); a single song loops from there.
 */
export type Song = { name: string; artist: string; file: string; start?: number };

export const SONGS: Song[] = [
  { name: "Like a Tattoo", artist: "Sade", file: "/music/Like-a-Tattoo.m4a", start: 40 },
];
