# Sable — a small gallery

A scroll-driven art gallery built with Next.js, React Three Fiber, GSAP, and Lenis. Includes a walkable 3D room with generative ambient audio.

## Stack

- Next.js 16 (App Router)
- React 19 + Three.js (`@react-three/fiber` / `drei`)
- GSAP + Lenis for scroll motion

## Local development

Requirements: **Node.js 20.9+**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # serve the build
npm run lint
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Leave the framework preset as **Next.js** (auto-detected).
4. No environment variables are required for the default demo.
5. Deploy.

Optional: install the [Vercel CLI](https://vercel.com/docs/cli) and run `vercel` from the project root.

## Content & licensing

### Images

Sample artworks are **public-domain** paintings hotlinked from Wikimedia Commons (see `src/data/gallery.ts` and `next.config.ts`). Credits appear in the outro.

For a production site, prefer downloading the files you need and serving them from `public/images/` (or a CDN) instead of hotlinking.

### Music

The room falls back to **generative ambient tracks** when no song files are present.

To add your own playlist:

1. Put licensed audio in `public/music/` (that folder is gitignored except `.gitkeep`).
2. List tracks in `src/data/playlist.ts`.

**Do not commit or deploy copyrighted recordings** unless you have redistribution rights.

## Project layout

```
src/
  app/           # Next.js routes & global styles
  components/    # UI + page sections
  data/          # gallery images & playlist
  lib/           # scroll, audio helpers
  webgl/         # Three.js scene
public/
  images/        # optional local artwork
  music/         # optional licensed audio (gitignored)
```

## License

Source code is MIT — see [LICENSE](./LICENSE). Sample images remain under their original public-domain status via Wikimedia Commons. 

