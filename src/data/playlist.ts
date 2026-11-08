/**
 * Songs for the 3D room's playlist.
 *
 * Put licensed audio files (mp3 / m4a / ogg) in `public/music/` and list them
 * here. A song only shows up once its file is present; generative ambient
 * tracks fill in when this list is empty or files are missing.
 *
 * `start` is where playback begins (seconds); a single song loops from there.
 *
 * Only commit and deploy recordings you are licensed to redistribute publicly.
 */
export type Song = { name: string; artist: string; file: string; start?: number };

export const SONGS: Song[] = [
  // Example (keep files out of git unless you own the rights):
  // { name: "Title", artist: "Artist", file: "/music/title.mp3", start: 0 },
];
