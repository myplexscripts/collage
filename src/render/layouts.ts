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
  /** relative draw weight; bigger tiles get a touch more shadow */
  feature?: boolean;
  kind: "rect" | "hex" | "polaroid" | "frame";
  /** index into the selected item list — always unique, never cycled */
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

/**
 * Pick the column count. When autoColumns is on we choose the count whose
 * cells best match the poster aspect ratio (so posters are barely cropped)
 * AND that leaves the tidiest final row — searching a small window around
 * the mathematically ideal value.
 */
function resolveColumns(s: CollageSettings, W: number, H: number, n: number): number {
  if (!s.autoColumns) return Math.max(1, Math.min(40, Math.round(s.columns)));
  const ar = W / H;
  const ideal = Math.sqrt(n * ar * ASPECT);
  const lo = Math.max(2, Math.floor(ideal) - 2);
  const hi = Math.ceil(ideal) + 2;
  let best = Math.max(2, Math.round(ideal));
  let bestScore = Infinity;
  for (let c = lo; c <= hi; c++) {
    const rows = Math.ceil(n / c);
    const remainder = n - (rows - 1) * c; // tiles in the last row
    // penalise sparse last rows and drifting far from the ideal aspect
    const rowPenalty = remainder === c ? 0 : (c - remainder) / c;
    const aspectPenalty = Math.abs(c - ideal) / ideal;
    const score = rowPenalty * 1.4 + aspectPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
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
      return gridLayout(s, W, H, count);
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

/**
 * Grid — every selected poster shown exactly once.
 *  • Full bleed: the C×rows grid fills the canvas edge to edge (posters
 *    cover-crop to their cells); a partial final row is centred.
 *  • Gallery: tiles keep the true 2:3 poster aspect and the block is
 *    centred inside the padding.
 */
function gridLayout(
  s: CollageSettings,
  W: number,
  H: number,
  n: number,
): LayoutResult {
  const G = unit(s, W, s.gap);
  const C = Math.min(resolveColumns(s, W, H, n), n);
  const rows = Math.ceil(n / C);
  const tiles: Tile[] = [];

  if (s.fullBleed) {
    const cellW = (W - (C - 1) * G) / C;
    const cellH = (H - (rows - 1) * G) / rows;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / C);
      const inRow = Math.min(C, n - r * C);
      const rowW = inRow * cellW + (inRow - 1) * G;
      const x0 = (W - rowW) / 2; // centre partial rows
      const c = i - r * C;
      tiles.push({
        x: x0 + c * (cellW + G),
        y: r * (cellH + G),
        w: cellW,
        h: cellH,
        kind: "rect",
        itemIndex: i,
      });
    }
    return { tiles };
  }

  // gallery: fit 2:3 tiles within the padded frame
  const P = unit(s, W, s.padding);
  const availW = W - 2 * P;
  const availH = H - 2 * P;
  let cellW = (availW - (C - 1) * G) / C;
  let cellH = cellW * ASPECT;
  const blockH = rows * cellH + (rows - 1) * G;
  if (blockH > availH) {
    const scale = availH / blockH;
    cellW *= scale;
    cellH *= scale;
  }
  const oy = (H - (rows * cellH + (rows - 1) * G)) / 2;
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / C);
    const inRow = Math.min(C, n - r * C);
    const rowW = inRow * cellW + (inRow - 1) * G;
    const x0 = (W - rowW) / 2; // centre partial rows
    const c = i - r * C;
    tiles.push({
      x: x0 + c * (cellW + G),
      y: oy + r * (cellH + G),
      w: cellW,
      h: cellH,
      kind: "rect",
      itemIndex: i,
    });
  }
  return { tiles };
}

/**
 * Mosaic — a fully-packed grid where a balanced, non-adjacent subset of tiles
 * are promoted to 2×2 features. Every cell is filled (no holes), the grid is
 * cover-scaled to fill the canvas edge to edge, and posters are never
 * repeated — promoting a feature simply shows a few fewer of them.
 */
function mosaicLayout(
  s: CollageSettings,
  W: number,
  H: number,
  n: number,
): LayoutResult {
  const G = unit(s, W, s.gap);
  const C = Math.max(3, Math.min(resolveColumns(s, W, H, n), n));
  // rows chosen to match the canvas aspect, capped so every cell gets a
  // unique poster (cells ≤ n)
  const aspectRows = Math.max(2, Math.round((C * H) / (W * 1.5)));
  const rows = Math.max(2, Math.min(aspectRows, Math.floor(n / C) || 1));

  const rng = mulberry32(s.seed * 7919 + 13);
  const occ = Array.from({ length: rows }, () => new Array(C).fill(false));
  const placements: { r: number; c: number; big: boolean }[] = [];
  let lastBigRow = -2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < C; c++) {
      if (occ[r][c]) continue;
      const canBig =
        c + 1 < C &&
        r + 1 < rows &&
        !occ[r][c + 1] &&
        !occ[r + 1][c] &&
        !occ[r + 1][c + 1];
      const big = canBig && r !== lastBigRow && rng() < 0.16;
      if (big) {
        occ[r][c] = occ[r][c + 1] = true;
        occ[r + 1][c] = occ[r + 1][c + 1] = true;
        placements.push({ r, c, big: true });
        lastBigRow = r;
      } else {
        occ[r][c] = true;
        placements.push({ r, c, big: false });
      }
    }
  }

  const cellW = (W - (C - 1) * G) / C;
  const cellH = cellW * 1.32; // gently tall; cover-crop fits the posters
  const gridW = C * cellW + (C - 1) * G;
  const gridH = rows * cellH + (rows - 1) * G;
  const P = s.fullBleed ? 0 : unit(s, W, s.padding);
  const scale = s.fullBleed
    ? Math.max(W / gridW, H / gridH)
    : Math.min((W - 2 * P) / gridW, (H - 2 * P) / gridH);
  const cw = cellW * scale;
  const ch = cellH * scale;
  const g = G * scale;
  const ox = (W - (C * cw + (C - 1) * g)) / 2;
  const oy = (H - (rows * ch + (rows - 1) * g)) / 2;

  const tiles: Tile[] = placements.map((p, i) => ({
    x: ox + p.c * (cw + g),
    y: oy + p.r * (ch + g),
    w: p.big ? cw * 2 + g : cw,
    h: p.big ? ch * 2 + g : ch,
    feature: p.big,
    kind: "rect",
    itemIndex: i,
  }));
  return { tiles };
}

/**
 * Masonry — classic shortest-column packing with gently varied poster
 * heights. Always fills the shortest column next, so the bottom edge stays
 * even and every poster appears once.
 */
function masonryLayout(
  s: CollageSettings,
  W: number,
  H: number,
  n: number,
): LayoutResult {
  const G = unit(s, W, s.gap);
  const P = s.fullBleed ? 0 : unit(s, W, s.padding);
  const C = Math.max(2, Math.min(resolveColumns(s, W, H, n), n));
  const colW = (W - 2 * P - (C - 1) * G) / C;
  const rng = mulberry32(s.seed * 60013 + 5);

  // size tiles so a typical column of n/C posters fills the height — slight
  // overflow when full bleed so the bottom edge is never starved
  const perCol = Math.max(1, n / C);
  const avail = s.fullBleed ? H * 1.08 : H - 2 * P;
  const baseH = Math.max(colW * 1.05, (avail - (perCol - 1) * G) / perCol);
  const top = s.fullBleed ? -baseH * 0.3 : P;
  const cursors = Array.from({ length: C }, () =>
    top - (s.fullBleed ? rng() * baseH * 0.32 : 0),
  );

  const tiles: Tile[] = [];
  for (let i = 0; i < n; i++) {
    // always grow the currently-shortest column → even bottom edge
    let col = 0;
    for (let k = 1; k < C; k++) if (cursors[k] < cursors[col]) col = k;
    const h = baseH * (0.82 + rng() * 0.42); // varied heights for texture
    const x = P + col * (colW + G);
    tiles.push({ x, y: cursors[col], w: colW, h, kind: "rect", itemIndex: i });
    cursors[col] += h + G;
  }
  return { tiles };
}

/**
 * Polaroid — a tidy scattered pile. Each poster gets its own jittered cell
 * with a small rotation; drawn top-to-bottom so lower snapshots rest over
 * the ones above for a natural stack.
 */
function polaroidLayout(
  s: CollageSettings,
  W: number,
  H: number,
  n: number,
): LayoutResult {
  const rng = mulberry32(s.seed * 104729 + 7);
  const margin = W * 0.04;
  const aw = W - margin * 2;
  const ah = H - margin * 2;
  // cols×rows grid that roughly matches the canvas, one polaroid per cell
  const cols = Math.max(1, Math.round(Math.sqrt((n * aw) / (ah * ASPECT))));
  const rows = Math.max(1, Math.ceil(n / cols));
  const cellW = aw / cols;
  const cellH = ah / rows;
  // size the photo so neighbours overlap just a little (a pile, not chaos)
  const base = Math.min(cellW / 1.04, cellH / (ASPECT * 1.04));

  const tiles: Tile[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const rowOffset = (cols - inRow) * cellW * 0.5; // centre short last row
    const w = base * (0.9 + rng() * 0.16);
    const h = w * ASPECT;
    const cx = margin + rowOffset + (c + 0.5) * cellW + (rng() - 0.5) * cellW * 0.3;
    const cy = margin + (r + 0.5) * cellH + (rng() - 0.5) * cellH * 0.22;
    tiles.push({
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      rot: (rng() - 0.5) * 0.22, // ±6.3°
      kind: "polaroid",
      itemIndex: i,
    });
  }
  // draw top rows first so lower photos overlap on top
  tiles.sort((a, b) => a.y - b.y);
  return { tiles };
}

/**
 * Honeycomb — a centred block of N hexes. Columns and rows are chosen to
 * match the canvas; the block is scaled to fill when full bleed, otherwise
 * centred with breathing room. Last row is centred.
 */
function hexLayout(
  s: CollageSettings,
  W: number,
  H: number,
  n: number,
): LayoutResult {
  const ar = W / H;
  const cols = Math.max(2, Math.min(Math.round(Math.sqrt(n * ar * 1.15)), n));
  const rows = Math.ceil(n / cols);
  const gap = unit(s, W, s.gap);

  // pointy-top hexes interlock: horizontal pitch = flat width, vertical pitch
  // = 1.5×circumradius. Odd rows shift half a step, needing +0.5 of width.
  let hstep = W / (cols + 0.5);
  let width = hstep - gap; // flat-to-flat
  let r = width / Math.sqrt(3); // circumradius
  let vstep = 1.5 * r + gap * 0.4;

  let blockH = (rows - 1) * vstep + 2 * r;
  const blockW = (cols + 0.5) * hstep; // ≈ W
  const scale = s.fullBleed
    ? Math.max(1, H / blockH) // fill height, bleed off the sides
    : Math.min((0.94 * W) / blockW, (0.94 * H) / blockH);
  hstep *= scale;
  width *= scale;
  r *= scale;
  vstep *= scale;

  blockH = (rows - 1) * vstep + 2 * r;
  const oy = (H - blockH) / 2 + r;
  const ox = (W - (cols + 0.5) * hstep) / 2 + hstep / 2;

  const tiles: Tile[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, n - row * cols);
    const offset = (row % 2) * (hstep / 2);
    const centerShift = inRow < cols ? ((cols - inRow) * hstep) / 2 : 0;
    const cx = ox + centerShift + col * hstep + offset;
    const cy = oy + row * vstep;
    tiles.push({
      x: cx - width / 2,
      y: cy - r,
      w: width,
      h: 2 * r,
      kind: "hex",
      itemIndex: i,
    });
  }
  return { tiles };
}

/**
 * Filmstrip — horizontal reels of frames. Exactly N frames are distributed
 * across as many strips as the canvas height allows; a final short strip is
 * centred. Slight alternating tilt for a hand-laid feel.
 */
function filmstripLayout(
  s: CollageSettings,
  W: number,
  H: number,
  n: number,
): LayoutResult {
  // frames per strip scale with how many columns the canvas wants
  const perStrip = Math.max(3, Math.round(resolveColumns(s, W, H, n) * 0.82));
  const strips = Math.max(1, Math.ceil(n / perStrip));

  const frameW = (W * 0.92) / perStrip;
  const frameH = frameW * 1.32;
  const band = frameH * 0.15;
  const stripH = frameH + 2 * band;
  const stripGap = unit(s, W, Math.max(10, s.gap)) + frameH * 0.18;
  const totalH = strips * stripH + (strips - 1) * stripGap;
  const y0 = (H - totalH) / 2;
  const frameGap = frameW * 0.06;

  const tiles: Tile[] = [];
  const stripRects: LayoutResult["strips"] = [];
  let idx = 0;
  for (let row = 0; row < strips; row++) {
    const inStrip = Math.min(perStrip, n - row * perStrip);
    const rot = (row % 2 === 0 ? 1 : -1) * 0.012;
    const sy = y0 + row * (stripH + stripGap);
    const stripContentW = inStrip * frameW + (inStrip - 1) * frameGap;
    // strip background spans a touch wider than its frames
    const sx = (W - stripContentW) / 2 - frameW * 0.16;
    const sw = stripContentW + frameW * 0.32;
    const pivotX = W / 2;
    const pivotY = sy + stripH / 2;
    stripRects.push({ x: sx, y: sy, w: sw, h: stripH, rot });
    const fx0 = (W - stripContentW) / 2;
    for (let k = 0; k < inStrip; k++) {
      tiles.push({
        x: fx0 + k * (frameW + frameGap),
        y: sy + band,
        w: frameW,
        h: frameH,
        rot,
        pivotX,
        pivotY,
        kind: "frame",
        itemIndex: idx++,
      });
    }
  }
  return { tiles, strips: stripRects };
}
