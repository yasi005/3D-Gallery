# Sable

A small gallery of quiet things.

Soft light, slow rooms, paintings that ask you to linger. Scroll through an editorial sequence of frames, then step into a walkable 3D room — footsteps on hard floors, ambient sound in the plaster, placards you can lean in to read.

Built as a short, warm experience rather than a catalog.

---

## Run it locally

Node **20.9** or newer.

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). Scroll gently.

```bash
npm run build && npm start   # production
npm run lint
```

---

## Deploy

This is a standard Next.js app. Import the repo on [Vercel](https://vercel.com/new), keep the Next.js preset, and deploy. No environment variables are required for the demo as it stands.

---

## What’s inside

| | |
|---|---|
| **Scroll scenes** | Hero frames, a distortion gallery, a horizontal strip, a feature card |
| **The room** | A first-person gallery you can walk — inspect works, open doors, change the light |
| **Sound** | Generative ambient tracks, footsteps, soft UI chimes |
| **Motion** | GSAP + Lenis, with reduced-motion respected |

Stack: Next.js 16, React 19, React Three Fiber, GSAP, Lenis.

---

## Making it yours

**Images** live in `src/data/gallery.ts`. The sample set is public-domain painting via Wikimedia Commons — fine for a demo; for something lasting, drop files into `public/images/` and point `src` there.

**Music** is optional. Add licensed audio under `public/music/` and list it in `src/data/playlist.ts`. That folder is gitignored on purpose — don’t commit recordings you don’t have the rights to share. With an empty playlist, the room keeps its built-in ambient pieces.

---

## Layout

```
src/app/          routes & global styles
src/components/   page sections & UI
src/data/         gallery + playlist
src/lib/          scroll & audio
src/webgl/        the 3D room
public/images/    your own artwork (optional)
public/music/     your own audio (optional, ignored by git)
```

---

## License

<<<<<<< HEAD
Source code is MIT — see [LICENSE](./LICENSE). Sample images remain under their original public-domain status via Wikimedia Commons. 

=======
Code is [MIT](./LICENSE).

The sample paintings remain public domain, via Wikimedia Commons. Any audio you add keeps whatever license it arrived with — that part is on you.
>>>>>>> b59445e (update read me)
