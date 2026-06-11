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

**Content controls** — multiple libraries (movies + TV) at once, sort by
recently added / recently watched / top rated / newest / A–Z / seeded
shuffle, genre, year-range, minimum-rating and unwatched-only filters,
poster count, plus a hand-pick modal to hide specific posters.

**Style controls** — gap, margin, full bleed, corner radius, drop shadows,
borders, 7 color effects (Vivid, Faded, Vintage, Sepia, Mono, Noir),
backgrounds (10 gradient presets, custom two-color gradient with angle,
solid, or a blurred-poster backdrop).

**Title overlay** — 5 display fonts, position, size, letter spacing,
uppercase, color, and an optional darkened band behind the text.

**Quick ideas** — one-tap presets that bundle everything: Poster Wall,
Year Wrapped, Film Noir, Scrapbook, Gold Hive, Phone Wallpaper.

**Export** — PNG or JPEG at canvas presets from Full HD to 4K, phone
(1290×2796), ultrawide, banner and A3 print. Poster art is re-fetched at a
resolution bucket matched to the export tile size so it stays sharp.

Settings persist in `localStorage`, the random seed is stable until you hit
**Shuffle**, and the live preview renders at screen resolution while exports
render at full size.

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
