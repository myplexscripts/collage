import { EFFECT_FILTERS } from "../lib/presets";
import { mulberry32 } from "../lib/random";
import type { CollageSettings, PlexItem } from "../lib/types";
import { computeLayout, type Tile } from "./layouts";

export type ImageMap = Map<string, HTMLImageElement>;

type Drawable = HTMLImageElement | HTMLCanvasElement;

/**
 * Chromium drops drawImage calls when ctx.filter is combined with a clip
 * path, so color effects are baked into an offscreen copy of each poster
 * once and the plain copy is drawn inside clips. Also much faster: the
 * filter runs once per poster instead of once per tile per render.
 */
const filterCache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

function applyEffect(img: HTMLImageElement, filter: string): Drawable {
  if (filter === "none") return img;
  let perImage = filterCache.get(img);
  if (!perImage) {
    perImage = new Map();
    filterCache.set(img, perImage);
  }
  let canvas = perImage.get(filter);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = filter;
    ctx.drawImage(img, 0, 0);
    perImage.set(filter, canvas);
  }
  return canvas;
}

function sourceSize(img: Drawable): { w: number; h: number } {
  return img instanceof HTMLImageElement
    ? { w: img.naturalWidth, h: img.naturalHeight }
    : { w: img.width, h: img.height };
}

function u(s: CollageSettings, W: number, v: number): number {
  return (v / 1000) * W;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hexPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: Drawable,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const { w: iw, h: ih } = sourceSize(img);
  const ir = iw / ih;
  const tr = w / h;
  let sx = 0,
    sy = 0,
    sw = iw,
    sh = ih;
  if (ir > tr) {
    sw = sh * tr;
    sx = (iw - sw) / 2;
  } else {
    sh = sw / tr;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/* ---------- colour helpers ---------- */

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v =
    m.length === 3
      ? m.split("").map((c) => c + c).join("")
      : m.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

/** The tone the collage edges fade toward. */
function edgeColor(s: CollageSettings): string {
  if (s.bgMode === "solid") return s.bgColor;
  if (s.bgMode === "gradient") return s.bgColor2;
  return "#06070a";
}

/* ---------- background ---------- */

function drawBackground(
  ctx: CanvasRenderingContext2D,
  s: CollageSettings,
  W: number,
  H: number,
  firstImage?: HTMLImageElement,
) {
  if (s.bgMode === "solid") {
    ctx.fillStyle = s.bgColor;
    ctx.fillRect(0, 0, W, H);
    // a whisper of radial depth so flat colours don't feel dead
    const g = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, Math.hypot(W, H) * 0.6);
    g.addColorStop(0, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (s.bgMode === "gradient") {
    const a = ((s.bgAngle - 90) * Math.PI) / 180;
    const r = Math.hypot(W, H) / 2;
    const cx = W / 2;
    const cy = H / 2;
    const g = ctx.createLinearGradient(
      cx - Math.cos(a) * r,
      cy - Math.sin(a) * r,
      cx + Math.cos(a) * r,
      cy + Math.sin(a) * r,
    );
    g.addColorStop(0, s.bgColor);
    g.addColorStop(1, s.bgColor2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // soft top glow for dimensionality
    const glow = ctx.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, H * 0.9);
    glow.addColorStop(0, "rgba(255,255,255,0.06)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  // posterBlur: a poster blown up, blurred and dimmed behind the collage
  ctx.fillStyle = "#06070a";
  ctx.fillRect(0, 0, W, H);
  if (firstImage) {
    const dim = 1 - (s.bgDim ?? 58) / 100; // 0..1 brightness
    ctx.save();
    ctx.filter = `blur(${Math.round(W / 36)}px) brightness(${(0.35 + dim * 0.6).toFixed(2)}) saturate(1.2)`;
    drawImageCover(ctx, firstImage, -W * 0.12, -H * 0.12, W * 1.24, H * 1.24);
    ctx.restore();
    // darken slightly so foreground posters keep contrast
    ctx.fillStyle = `rgba(6,7,10,${(0.18 + (s.bgDim ?? 58) / 280).toFixed(2)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function placeholderTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0.015)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/* ---------- tiles ---------- */

function drawTile(
  ctx: CanvasRenderingContext2D,
  s: CollageSettings,
  W: number,
  tile: Tile,
  item: PlexItem | undefined,
  img: HTMLImageElement | undefined,
) {
  const { x, y, w, h } = tile;
  const radius = tile.kind === "hex" ? 0 : u(s, W, s.cornerRadius);
  const filter = EFFECT_FILTERS[s.effect];

  ctx.save();
  if (tile.rot) {
    const px = tile.pivotX ?? x + w / 2;
    const py = tile.pivotY ?? y + h / 2;
    ctx.translate(px, py);
    ctx.rotate(tile.rot);
    ctx.translate(-px, -py);
  }

  if (tile.kind === "polaroid") {
    const pad = w * 0.06;
    const bottom = w * 0.22;
    const fx = x - pad;
    const fy = y - pad;
    const fw = w + pad * 2;
    const fh = h + pad + bottom;
    ctx.save();
    if (s.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = w * 0.14;
      ctx.shadowOffsetY = w * 0.05;
    }
    // paper stock with a faint vertical sheen
    const paper = ctx.createLinearGradient(fx, fy, fx, fy + fh);
    paper.addColorStop(0, "#fffefb");
    paper.addColorStop(1, "#f3efe4");
    ctx.fillStyle = paper;
    roundRectPath(ctx, fx, fy, fw, fh, w * 0.02);
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, x, y, w, h, w * 0.008);
    ctx.clip();
    if (img) {
      drawImageCover(ctx, applyEffect(img, filter), x, y, w, h);
    } else {
      placeholderTile(ctx, x, y, w, h);
    }
    // subtle inner shadow on the photo
    const inner = ctx.createLinearGradient(x, y, x, y + h);
    inner.addColorStop(0, "rgba(0,0,0,0.14)");
    inner.addColorStop(0.12, "rgba(0,0,0,0)");
    ctx.fillStyle = inner;
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    if (s.polaroidCaptions && item) {
      ctx.fillStyle = "#34302a";
      const size = w * 0.135;
      ctx.font = `600 ${size}px Caveat, cursive`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let label = item.title;
      if (ctx.measureText(label).width > fw * 0.86) {
        while (label.length > 4 && ctx.measureText(label + "…").width > fw * 0.86) {
          label = label.slice(0, -1);
        }
        label += "…";
      }
      ctx.fillText(label, x + w / 2, y + h + bottom * 0.54);
    }
    ctx.restore();
    return;
  }

  if (tile.kind === "hex") {
    const r = h / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    // gap already lives in the layout pitch; just a hair of inset for clean AA
    const shrink = 0.992;
    if (s.shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.38)";
      ctx.shadowBlur = w * 0.06;
      ctx.shadowOffsetY = w * 0.015;
      hexPath(ctx, cx, cy, r * shrink);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    hexPath(ctx, cx, cy, r * shrink);
    ctx.clip();
    if (img) {
      drawImageCover(ctx, applyEffect(img, filter), cx - w / 2, cy - r, w, 2 * r);
    } else {
      placeholderTile(ctx, cx - w / 2, cy - r, w, 2 * r);
    }
    ctx.restore();
    if (s.borderEnabled) {
      ctx.save();
      hexPath(ctx, cx, cy, r * shrink);
      ctx.strokeStyle = s.borderColor;
      ctx.lineWidth = u(s, W, s.borderWidth);
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // rect & filmstrip frame
  const frameRadius = tile.kind === "frame" ? w * 0.035 : radius;
  if (s.shadow && tile.kind === "rect") {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${tile.feature ? 0.5 : 0.38})`;
    ctx.shadowBlur = u(s, W, tile.feature ? 14 : 9);
    ctx.shadowOffsetY = u(s, W, tile.feature ? 5 : 3);
    ctx.fillStyle = "#000";
    roundRectPath(ctx, x, y, w, h, frameRadius);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  roundRectPath(ctx, x, y, w, h, frameRadius);
  ctx.clip();
  if (img) {
    drawImageCover(ctx, applyEffect(img, filter), x, y, w, h);
  } else {
    placeholderTile(ctx, x, y, w, h);
  }
  ctx.restore();
  if (s.borderEnabled) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, frameRadius);
    ctx.strokeStyle = s.borderColor;
    ctx.lineWidth = u(s, W, s.borderWidth);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawStrips(
  ctx: CanvasRenderingContext2D,
  s: CollageSettings,
  W: number,
  strips: NonNullable<ReturnType<typeof computeLayout>["strips"]>,
) {
  for (const st of strips) {
    ctx.save();
    const px = W / 2;
    const py = st.y + st.h / 2;
    ctx.translate(px, py);
    ctx.rotate(st.rot);
    ctx.translate(-px, -py);
    if (s.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = u(s, W, 12);
      ctx.shadowOffsetY = u(s, W, 5);
    }
    // celluloid with a subtle sheen
    const cell = ctx.createLinearGradient(st.x, st.y, st.x, st.y + st.h);
    cell.addColorStop(0, "#16161a");
    cell.addColorStop(0.5, "#0e0e11");
    cell.addColorStop(1, "#16161a");
    ctx.fillStyle = cell;
    roundRectPath(ctx, st.x, st.y, st.w, st.h, st.h * 0.04);
    ctx.fill();
    ctx.shadowColor = "transparent";
    // sprocket holes top & bottom
    const band = st.h * 0.15 / 1.3;
    const hole = band * 0.5;
    const step = hole * 2.5;
    ctx.fillStyle = "rgba(245,245,248,0.9)";
    for (let hx = st.x + step * 0.8; hx < st.x + st.w - step * 0.6; hx += step) {
      roundRectPath(ctx, hx, st.y + band * 0.5, hole * 1.35, hole, hole * 0.3);
      ctx.fill();
      roundRectPath(ctx, hx, st.y + st.h - band * 0.5 - hole, hole * 1.35, hole, hole * 0.3);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- finishing passes ---------- */

function drawEdgeFade(
  ctx: CanvasRenderingContext2D,
  s: CollageSettings,
  W: number,
  H: number,
) {
  if (s.edgeFade <= 0) return;
  const strength = s.edgeFade / 100;
  const [r, g, b] = hexToRgb(edgeColor(s));
  const inset = Math.min(W, H) * 0.5 * strength;
  // four directional gradients feather the collage into the background
  let grad = ctx.createLinearGradient(0, 0, 0, inset); // top
  grad.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, inset);
  // bottom
  grad = ctx.createLinearGradient(0, H, 0, H - inset);
  grad.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - inset, W, inset);
  // left
  grad = ctx.createLinearGradient(0, 0, inset, 0);
  grad.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, inset, H);
  // right
  grad = ctx.createLinearGradient(W, 0, W - inset, 0);
  grad.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(W - inset, 0, inset, H);
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  s: CollageSettings,
  W: number,
  H: number,
) {
  if (s.vignette <= 0) return;
  const strength = (s.vignette / 100) * 0.7;
  const g = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.32,
    W / 2,
    H / 2,
    Math.hypot(W, H) / 2,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength.toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

let grainTile: HTMLCanvasElement | null = null;
function getGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const size = 160;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const rng = mulberry32(20260611);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(rng() * 145);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

function drawGrain(
  ctx: CanvasRenderingContext2D,
  s: CollageSettings,
  W: number,
  H: number,
) {
  if (s.grain <= 0) return;
  const pattern = ctx.createPattern(getGrainTile(), "repeat");
  if (!pattern) return;
  ctx.save();
  // scale the grain up a little so it reads as film, not pixels
  const scale = Math.max(1, W / 1600);
  ctx.globalAlpha = (s.grain / 100) * 0.5;
  ctx.globalCompositeOperation = "overlay";
  ctx.scale(scale, scale);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W / scale, H / scale);
  ctx.restore();
}

/* ---------- title ---------- */

function drawTitle(
  ctx: CanvasRenderingContext2D,
  s: CollageSettings,
  W: number,
  H: number,
) {
  if (!s.titleEnabled || !s.titleText.trim()) return;
  const text = s.titleUppercase ? s.titleText.toUpperCase() : s.titleText;
  const size = u(s, W, s.titleSize);
  const ls = u(s, W, s.titleLetterSpacing);
  ctx.save();
  ctx.font = `700 ${size}px "${s.titleFont}", sans-serif`;
  ctx.textBaseline = "middle";

  // manual letter-spacing so it works in every browser
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const totalW =
    widths.reduce((a, b) => a + b, 0) + ls * Math.max(0, text.length - 1);

  let cy: number;
  if (s.titlePosition === "top") cy = H * 0.12 + size * 0.2;
  else if (s.titlePosition === "bottom") cy = H * 0.88 - size * 0.2;
  else cy = H / 2;

  if (s.titleScrim) {
    const bandH = size * 2.4;
    const g = ctx.createLinearGradient(0, cy - bandH / 2, 0, cy + bandH / 2);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.66)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, cy - bandH / 2, W, bandH);
  }

  ctx.fillStyle = s.titleColor;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.035;
  let x = (W - totalW) / 2;
  ctx.textAlign = "left";
  [...text].forEach((ch, idx) => {
    ctx.fillText(ch, x, cy);
    x += widths[idx] + ls;
  });
  ctx.restore();
}

export interface RenderInput {
  settings: CollageSettings;
  items: PlexItem[];
  images: ImageMap;
}

/**
 * Renders the collage onto `canvas`. `outputWidth` controls real pixel
 * density; all layout math happens at the virtual export resolution.
 */
export function renderCollage(
  canvas: HTMLCanvasElement,
  input: RenderInput,
  outputWidth?: number,
) {
  const s = input.settings;
  const W = s.canvasWidth;
  const H = s.canvasHeight;
  const outW = Math.round(outputWidth ?? W);
  const outH = Math.round((outW / W) * H);
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.save();
  ctx.scale(outW / W, outH / H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const items = input.items;
  const firstImg = items.length
    ? input.images.get(items[0].ratingKey)
    : undefined;
  drawBackground(ctx, s, W, H, firstImg);

  const layout = computeLayout(s, W, H, items.length);
  if (layout.strips) drawStrips(ctx, s, W, layout.strips);
  for (const tile of layout.tiles) {
    const item = items[tile.itemIndex];
    const img = item ? input.images.get(item.ratingKey) : undefined;
    drawTile(ctx, s, W, tile, item, img);
  }

  drawEdgeFade(ctx, s, W, H);
  drawVignette(ctx, s, W, H);
  drawTitle(ctx, s, W, H);
  drawGrain(ctx, s, W, H);
  ctx.restore();
}
