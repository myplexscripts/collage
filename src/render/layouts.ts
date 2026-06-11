import { mulberry32 } from "../lib/random";
import type { CollageSettings } from "../lib/types";

export interface Tile {
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  /** rotation pivot; defaults to the tile's own center */
  pivotX?: number;
  pivotY?: number;
  kind: "rect" | "hex" | "polaroid" | "frame";
  /** index into the selected item list (cycled when a layout needs extras) */
  itemIndex: number;
}

export interface LayoutResult {
  tiles: Tile[];
  /** filmstrip strips drawn behind their frames */
  strips?: { x: number; y: number; w: number; h: number; rot: number }[];
}

const ASPECT = 1.5; // poster height / width

/**
 * All layout math runs in "virtual canvas" coordinates (the real export
 * resolution). Settings sizes are stored per-mille of canvas width.
 */
function unit(s: CollageSettings, W: number, v: number): number {
  return (v / 1000) * W;
}

export function computeLayout(
  s: CollageSettings,
  W: number,
  H: number,
  count: number,
): LayoutResult {
  if (count === 0) return { tiles: [] };
  switch (s.layout) {
    case "grid":
      return gridLayout(s, W, H, count, false);
    case "mosaic":
      return mosaicLayout(s, W, H, count);
    case "masonry":
      return masonryLayout(s, W, H, count);
    case "polaroid":
      return polaroidLayout(s, W, H, count);
    case "hex":
      return hexLayout(s, W, H, count);
    case "filmstrip":
      return filmstripLayout(s, W, H, count);
  }
}

function gridLayout(
  s: CollageSettings,
  W: number,
  H: number,
  count: number,
  forceBleed: boolean,
): LayoutResult {
  const bleed = forceBleed || s.fullBleed;
  const P = bleed ? 0 : unit(s, W, s.padding);
  const G = unit(s, W, s.gap);
  const C = Math.max(1, s.columns);
  const w = (W - 2 * P - (C - 1) * G) / C;
  const h = w * ASPECT;

  let rows: number;
  if (bleed) {
    rows = Math.max(1, Math.ceil((H + G) / (h + G)));
  } else {
    rows = Math.max(1, Math.floor((H - 2 * P + G) / (h + G)));
  }
  // Don't render more cells than we can fill with at least one full row.
  const maxRows = Math.max(1, Math.ceil(count / C));
  rows = Math.min(rows, maxRows);

  const totalH = rows * h + (rows - 1) * G;
  const y0 = bleed ? (H - totalH) / 2 : P + Math.max(0, (H - 2 * P - totalH) / 2);

  const tiles: Tile[] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < C; c++) {
      tiles.push({
        x: P + c * (w + G),
        y: y0 + r * (h + G),
        w,
        h,
        kind: "rect",
        itemIndex: i++ % count,
      });
    }
  }
  return { tiles };
}

function mosaicLayout(
  s: CollageSettings,
  W: number,
  H: number,
  count: number,
): LayoutResult {
  const P = s.fullBleed ? 0 : unit(s, W, s.padding);
  const G = unit(s, W, s.gap);
  const C = Math.max(2, s.columns);
  const w = (W - 2 * P - (C - 1) * G) / C;
  const h = w * ASPECT;
  const rows = Math.max(
    2,
    s.fullBleed
      ? Math.ceil((H + G) / (h + G))
      : Math.floor((H - 2 * P + G) / (h + G)),
  );
  const totalH = rows * h + (rows - 1) * G;
  const y0 = s.fullBleed ? (H - totalH) / 2 : P + Math.max(0, (H - 2 * P - totalH) / 2);

  const rng = mulberry32(s.seed * 7919 + 13);
  const occupied: boolean[][] = Array.from({ length: rows }, () =>
    new Array(C).fill(false),
  );
  const tiles: Tile[] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < C; c++) {
      if (occupied[r][c]) continue;
      const canBig =
        r + 1 < rows &&
        c + 1 < C &&
        !occupied[r][c + 1] &&
        !occupied[r + 1][c] &&
        !occupied[r + 1][c + 1];
      const big = canBig && rng() < 0.16;
      if (big) {
        occupied[r][c + 1] = occupied[r + 1][c] = occupied[r + 1][c + 1] = true;
      }
      occupied[r][c] = true;
      tiles.push({
        x: P + c * (w + G),
        y: y0 + r * (h + G),
        w: big ? w * 2 + G : w,
        h: big ? h * 2 + G : h,
        kind: "rect",
        itemIndex: i++ % count,
      });
    }
  }
  return { tiles };
}

function masonryLayout(
  s: CollageSettings,
  W: number,
  H: number,
  count: number,
): LayoutResult {
  const G = unit(s, W, s.gap);
  const P = s.fullBleed ? 0 : unit(s, W, s.padding);
  const C = Math.max(2, s.columns);
  const w = (W - 2 * P - (C - 1) * G) / C;
  const h = w * ASPECT;

  const tiles: Tile[] = [];
  let i = 0;
  for (let c = 0; c < C; c++) {
    // every other column shifts up half a tile for the brick-stagger look
    let y = (c % 2 === 0 ? 0 : -(h + G) / 2) + (s.fullBleed ? -h * 0.25 : P);
    const x = P + c * (w + G);
    const yEnd = s.fullBleed ? H : H - P;
    while (y < yEnd) {
      tiles.push({ x, y, w, h, kind: "rect", itemIndex: i++ % count });
      y += h + G;
    }
  }
  return { tiles };
}

function polaroidLayout(
  s: CollageSettings,
  W: number,
  H: number,
  count: number,
): LayoutResult {
  const rng = mulberry32(s.seed * 104729 + 7);
  const n = count;
  const cols = Math.max(2, Math.round(Math.sqrt((n * W) / H / ASPECT) * 1.25));
  const rows = Math.max(1, Math.ceil(n / cols));
  const cellW = W / cols;
  const cellH = H / rows;
  const base = Math.min(cellW, cellH / ASPECT) * 1.18;

  const tiles: Tile[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const w = base * (0.82 + rng() * 0.36);
    const h = w * ASPECT;
    const cx = (c + 0.5) * cellW + (rng() - 0.5) * cellW * 0.55;
    const cy = (r + 0.5) * cellH + (rng() - 0.5) * cellH * 0.45;
    tiles.push({
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      rot: (rng() - 0.5) * 0.42, // ±12°
      kind: "polaroid",
      itemIndex: i,
    });
  }
  // shuffle draw order so overlap winners vary
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return { tiles };
}

function hexLayout(
  s: CollageSettings,
  W: number,
  H: number,
  count: number,
): LayoutResult {
  const C = Math.max(3, s.columns);
  const w = W / (C - 0.5); // odd rows offset half a hex, so allow the bleed
  const r = w / Math.sqrt(3);
  const stepY = 1.5 * r;
  const rows = Math.ceil(H / stepY) + 1;

  const tiles: Tile[] = [];
  let i = 0;
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 1 ? w / 2 : 0;
    for (let col = 0; col <= C; col++) {
      const cx = col * w + offset - w / 4;
      const cy = row * stepY;
      tiles.push({
        x: cx - w / 2,
        y: cy - r,
        w,
        h: 2 * r,
        kind: "hex",
        itemIndex: i++ % count,
      });
    }
  }
  return { tiles };
}

function filmstripLayout(
  s: CollageSettings,
  W: number,
  H: number,
  count: number,
): LayoutResult {
  const C = Math.max(3, s.columns);
  const G = unit(s, W, Math.max(4, s.gap));
  const frameW = (W * 1.06) / C;
  const frameH = frameW * 1.35;
  const band = frameH * 0.16;
  const stripH = frameH + 2 * band;
  const stripGap = unit(s, W, s.gap * 2 + 14);
  const rows = Math.max(1, Math.ceil((H + stripH) / (stripH + stripGap)));
  const totalH = rows * stripH + (rows - 1) * stripGap;
  const y0 = (H - totalH) / 2;

  const tiles: Tile[] = [];
  const strips: LayoutResult["strips"] = [];
  let i = 0;
  for (let row = 0; row < rows; row++) {
    const rot = (row % 2 === 0 ? 1 : -1) * 0.022; // ±1.3°
    const sy = y0 + row * (stripH + stripGap);
    const xShift = (row % 2 === 0 ? -0.4 : -0.7) * frameW;
    const pivotX = W / 2;
    const pivotY = sy + stripH / 2;
    strips.push({ x: -W * 0.05, y: sy, w: W * 1.1, h: stripH, rot });
    for (let col = 0; col <= C + 1; col++) {
      tiles.push({
        x: xShift + col * (frameW + G),
        y: sy + band,
        w: frameW - G,
        h: frameH,
        rot,
        pivotX,
        pivotY,
        kind: "frame",
        itemIndex: i++ % count,
      });
    }
  }
  return { tiles, strips };
}
