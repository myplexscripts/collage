# Poster Studio 🎬

Turn your Plex library into beautiful poster collages — desktop wallpapers,
phone lock screens, year-end "wrapped" mosaics, film-noir strips, scrapbook
polaroid walls and more.

Runs **entirely in your browser**: it talks straight to plex.tv and your own
Plex Media Server. No backend, no database — your Plex token never leaves
your machine.

## Features

**Sign in with Plex** — official PIN-based OAuth flow in a popup, with
automatic server discovery and connection testing (direct connections
preferred, relay fallback).

**Six layouts**

| Layout | Vibe |
| --- | --- |
| Grid | Clean rows & columns, optional full-bleed |
| Mosaic | Featured 2×2 tiles scattered through the grid |
| Masonry | Brick-staggered columns |
| Polaroid | Scattered snapshots with handwritten captions |
| Honeycomb | Hexagonal tiles |
| Filmstrip | Tilted cinema reels with sprocket holes |

Every layout shows each selected poster exactly once (no duplicate filler),
packs cleanly with **auto-column** sizing matched to the canvas aspect, and
fills the frame edge to edge.

**Content controls** — multiple libraries (movies + TV) at once, sort by
recently added / recently watched / top rated / newest / A–Z / seeded
shuffle, genre, year-range, minimum-rating and unwatched-only filters,
poster count, plus a hand-pick modal to hide specific posters.

**Style controls** — auto or manual columns, gap, margin, full bleed, corner
radius, drop shadows, borders, 7 color effects (Vivid, Faded, Vintage,
Sepia, Mono, Noir), backgrounds (10 gradient presets, custom two-color
gradient with angle, solid, or a blurred-poster backdrop with adjustable
dim).

**Finishing passes** — vignette, edge-fade (feathers the collage into the
background, ideal for wallpapers) and film grain — the difference between a
screenshot and a poster.

**Saved designs** — name and save any collage with a thumbnail, then open,
duplicate or delete it later. Stored in your browser.

**Keyboard shortcuts** — `S` shuffle, `D` designs, `1`–`6` switch tabs,
`Esc` to close. A one-time welcome introduces them.

**Title overlay** — 5 display fonts, position, size, letter spacing,
uppercase, color, and an optional darkened band behind the text.

**Quick ideas** — one-tap presets that bundle everything: Poster Wall,
Year Wrapped, Film Noir, Scrapbook, Gold Hive, Phone Wallpaper.

**Export** — PNG or JPEG at canvas presets from Full HD to 4K, phone
(1290×2796), ultrawide, banner and A3 print. Poster art is re-fetched at a
resolution bucket matched to the export tile size so it stays sharp. On
phones a native **Share** button hands the image straight to your apps.

**Desktop & mobile** — desktops get a three-pane studio (tab rail, control
sidebar, live canvas); phones get a full-screen preview with a bottom tab
bar and slide-up control sheets, safe-area aware with touch-sized targets.

Settings persist in `localStorage`, the random seed is stable until you hit
**Shuffle**, and the live preview renders at screen resolution while exports
render at full size.

## Performance

- **Progressive preview** — the collage paints immediately and posters
  stream in as they download (16 in parallel), with a non-blocking
  progress pill instead of a loading wall.
- **Adaptive resolution** — preview fetches posters at a transcode width
  matched to the actual on-screen tile size; exports re-fetch at the
  bucket the output resolution needs.
- **Stale-while-revalidate library** — re-entering the studio shows your
  collage instantly from cached items while the library refreshes silently.
- **Parallel everything** — library pages, user profile + server discovery,
  and multi-library fetches all run concurrently; server connections race
  and the fastest direct route wins.
- **Render once, reuse forever** — poster images and effect-filtered
  copies are cached for the whole session.
- **Resilience** — Plex requests retry with backoff on transient failures,
  expired tokens route cleanly back to sign-in, and a shimmering skeleton
  fills the canvas while the first posters stream in.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

Stack: Vite, React 18, TypeScript, zustand. The collage itself is pure
Canvas 2D (`src/render/`); layouts are computed in virtual export
coordinates so preview and export are pixel-identical.

### Notes

- Poster images are loaded through the Plex photo transcoder with
  `crossOrigin="anonymous"` so the canvas stays untainted for export.
- Color effects are pre-baked onto offscreen copies of each poster —
  Chromium drops `drawImage` calls that combine `ctx.filter` with a clip
  path, and it's faster anyway.
- If your server is only reachable over the Plex relay, large libraries
  may load posters slowly the first time; they're cached after that.
