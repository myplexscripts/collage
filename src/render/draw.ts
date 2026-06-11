import { EFFECT_FILTERS } from "../lib/presets";
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
    return;
  }
  // posterBlur: a poster blown up, blurred and dimmed
  ctx.fillStyle = "#0a0a0e";
  ctx.fillRect(0, 0, W, H);
  if (firstImage) {
    ctx.save();
    ctx.filter = `blur(${Math.round(W / 40)}px) brightness(0.42) saturate(1.15)`;
    drawImageCover(ctx, firstImage, -W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
    ctx.restore();
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
  g.addColorStop(0, "rgba(255,255,255,0.07)");
  g.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

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
    const pad = w * 0.07;
    const bottom = w * 0.24;
    const fx = x - pad;
    const fy = y - pad;
    const fw = w + pad * 2;
    const fh = h + pad + bottom;
    if (s.shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = w * 0.12;
      ctx.shadowOffsetY = w * 0.04;
      ctx.fillStyle = "#fdfcf7";
      roundRectPath(ctx, fx, fy, fw, fh, w * 0.015);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = "#fdfcf7";
      roundRectPath(ctx, fx, fy, fw, fh, w * 0.015);
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (img) {
      drawImageCover(ctx, applyEffect(img, filter), x, y, w, h);
    } else {
      placeholderTile(ctx, x, y, w, h);
    }
    ctx.restore();
    if (s.polaroidCaptions && item) {
      ctx.fillStyle = "#3a3630";
      const size = w * 0.13;
      ctx.font = `600 ${size}px Caveat, cursive`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let label = item.title;
      if (ctx.measureText(label).width > fw * 0.9) {
        while (label.length > 4 && ctx.measureText(label + "…").width > fw * 0.9) {
          label = label.slice(0, -1);
        }
        label += "…";
      }
      ctx.fillText(label, x + w / 2, y + h + bottom * 0.52);
    }
    ctx.restore();
    return;
  }

  if (tile.kind === "hex") {
    const r = h / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const shrink = 1 - u(s, W, s.gap) / Math.max(1, w);
    ctx.save();
    hexPath(ctx, cx, cy, r * shrink);
    if (s.shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = w * 0.08;
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();
    }
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
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // rect & filmstrip frame
  if (s.shadow && tile.kind === "rect") {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = u(s, W, 8);
    ctx.shadowOffsetY = u(s, W, 3);
    ctx.fillStyle = "#000";
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  roundRectPath(ctx, x, y, w, h, tile.kind === "frame" ? w * 0.04 : radius);
  ctx.clip();
  if (img) {
    drawImageCover(ctx, applyEffect(img, filter), x, y, w, h);
  } else {
    placeholderTile(ctx, x, y, w, h);
  }
  ctx.restore();
  if (s.borderEnabled) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, tile.kind === "frame" ? w * 0.04 : radius);
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
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = u(s, W, 10);
      ctx.shadowOffsetY = u(s, W, 4);
    }
    ctx.fillStyle = "#101013";
    roundRectPath(ctx, st.x, st.y, st.w, st.h, st.h * 0.03);
    ctx.fill();
    ctx.shadowColor = "transparent";
    // sprocket holes
    const band = st.h * 0.16 * (1 / 1.32);
    const hole = band * 0.52;
    const step = hole * 2.4;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (let hx = st.x + step; hx < st.x + st.w - step / 2; hx += step) {
      roundRectPath(ctx, hx, st.y + band * 0.45, hole * 1.3, hole, hole * 0.3);
      ctx.fill();
      roundRectPath(
        ctx,
        hx,
        st.y + st.h - band * 0.45 - hole,
        hole * 1.3,
        hole,
        hole * 0.3,
      );
      ctx.fill();
    }
    ctx.restore();
  }
}

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
  if (s.titlePosition === "top") cy = H * 0.1 + size * 0.2;
  else if (s.titlePosition === "bottom") cy = H * 0.9 - size * 0.2;
  else cy = H / 2;

  if (s.titleScrim) {
    const bandH = size * 2.2;
    const g = ctx.createLinearGradient(0, cy - bandH / 2, 0, cy + bandH / 2);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.62)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, cy - bandH / 2, W, bandH);
  }

  ctx.fillStyle = s.titleColor;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
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
  drawTitle(ctx, s, W, H);
  ctx.restore();
}
