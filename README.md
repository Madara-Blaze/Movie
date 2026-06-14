[README.md](https://github.com/user-attachments/files/28927562/README.md)
# Filmnyt AI

A cinematic movie/show **decision engine**. Answer eight quick questions about your mood
and the night you want, and Filmnyt commits to **one decisive pick** (plus two alternates)
with a human-readable reason and a confidence score.

The working front-end + recommendation engine ships as a single streaming Design
Component: **`Filmnyt AI.dc.html`** (open it directly in a browser). This README and the
accompanying config describe the production deployment around that core.

---

## What's in the box

- **`Filmnyt AI.dc.html`** — the full flow: cinematic landing (drifting 3D posters,
  parallax, particle dust) → 8-scene interview → "thinking" beat → 3D verdict reveal →
  refine (re-roll / adjust / swap alternates) → watchlist + verdict history (persisted).
- **`ARCHITECTURE.md`** — entities, data flow, scoring contract, schema, threat model,
  scaling and observability notes.
- **Deploy scaffold** — `vercel.json`, `.env.example`, `.github/workflows/ci.yml`,
  `.gitignore`.

The recommendation engine is **deterministic and explainable** — see the scoring table in
`ARCHITECTURE.md §5`. It runs in-app against a seeded ~45-title corpus so the experience
works with zero backend; in production the same engine reads its candidate set from the
title repository (TMDB-backed, cached, seeded fallback).

---

## Run the prototype

No build step. Open `Filmnyt AI.dc.html` in a modern browser (or serve the folder):

```bash
npx serve .
# then open the printed URL and click Filmnyt AI.dc.html
```

Watchlist and verdict history persist to `localStorage` under the `filmnyt_v1` key.

## Production stack (target)

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind |
| Motion / 3D | Framer Motion + React Three Fiber (lazy, reduced-motion aware) |
| Data | TMDB (proxied server-side) → Postgres → Redis cache |
| Auth | NextAuth or Supabase Auth (guest + email/OAuth) |
| Hosting | Vercel |
| Tests | Vitest + Testing Library + Playwright |

## Getting started (production app)

```bash
cp .env.example .env.local      # fill in TMDB_API_KEY, DATABASE_URL, NEXTAUTH_SECRET
npm install
npm run dev                     # http://localhost:3000
```

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit + component |
| `npm run test:e2e` | Playwright happy-path |
| `npm run build` | Production build |

## Deploy (Vercel)

1. Push to GitHub; import the repo in Vercel.
2. Add env vars from `.env.example` in **Project → Settings → Environment Variables**
   (set `TMDB_API_KEY` as a **server** secret — never `NEXT_PUBLIC_*`).
3. Deploy. `vercel.json` pins the region and sets security headers.
4. Verify `GET /api/health` returns `200` post-deploy.

## Security

The TMDB key and database credentials are **server-only** and proxied through `/api/*` —
nothing secret ships to the client. All interview input is validated and sanitized
server-side, and `/api/recommend` sits behind a per-session rate limiter. See
`ARCHITECTURE.md §10`.

## Accessibility & degradation

Keyboard-navigable, ARIA-labelled, focus-managed; honors `prefers-reduced-motion` with a
flat equivalent; and completes a verdict even if 3D, data, or network fails.

## Note on this repo

Streaming availability and a few curated `mood`/`energy` tags in the seed data are
**illustrative** (region-agnostic) for the prototype. In production these come from the
title repository — TMDB for facts/artwork, Filmnyt's own tags for mood/energy.
