import type { CollageSettings, SavedDesign } from "./types";

const DESIGNS_KEY = "posterstudio.designs";

/**
 * The live preview canvas registers itself here so "Save design" can grab a
 * thumbnail of exactly what the user sees without re-rendering.
 */
let livePreview: HTMLCanvasElement | null = null;
export function registerPreviewCanvas(canvas: HTMLCanvasElement | null) {
  livePreview = canvas;
}

function makeThumbnail(maxW = 420): string {
  if (!livePreview || !livePreview.width) return "";
  const ar = livePreview.height / livePreview.width;
  const w = Math.min(maxW, livePreview.width);
  const h = Math.round(w * ar);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(livePreview, 0, 0, w, h);
  try {
    return c.toDataURL("image/jpeg", 0.72);
  } catch {
    return "";
  }
}

export function loadDesigns(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(DESIGNS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedDesign[];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function persist(list: SavedDesign[]) {
  try {
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(list));
  } catch (e) {
    // most likely the thumbnail blew the storage quota — retry without it
    try {
      localStorage.setItem(
        DESIGNS_KEY,
        JSON.stringify(list.map((d) => ({ ...d, thumbnail: "" }))),
      );
    } catch {
      throw new Error("Out of browser storage — delete a saved design first.");
    }
  }
}

function uid(): string {
  return (
    crypto.randomUUID?.() ??
    `d-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function saveDesign(name: string, settings: CollageSettings): SavedDesign[] {
  const list = loadDesigns();
  const now = Date.now();
  const trimmed = name.trim() || "Untitled design";
  const existing = list.find(
    (d) => d.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    existing.settings = { ...settings };
    existing.thumbnail = makeThumbnail();
    existing.updatedAt = now;
  } else {
    list.unshift({
      id: uid(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      thumbnail: makeThumbnail(),
      settings: { ...settings },
    });
  }
  // cap stored designs so we never balloon localStorage
  const capped = list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 60);
  persist(capped);
  return capped;
}

export function duplicateDesign(id: string): SavedDesign[] {
  const list = loadDesigns();
  const src = list.find((d) => d.id === id);
  if (!src) return list;
  const now = Date.now();
  list.unshift({
    ...src,
    id: uid(),
    name: `${src.name} copy`,
    createdAt: now,
    updatedAt: now,
    settings: { ...src.settings },
  });
  const capped = list.slice(0, 60);
  persist(capped);
  return capped;
}

export function deleteDesign(id: string): SavedDesign[] {
  const list = loadDesigns().filter((d) => d.id !== id);
  persist(list);
  return list;
}

export function renameDesign(id: string, name: string): SavedDesign[] {
  const list = loadDesigns();
  const d = list.find((x) => x.id === id);
  if (d) {
    d.name = name.trim() || d.name;
    d.updatedAt = Date.now();
  }
  persist(list);
  return list;
}
