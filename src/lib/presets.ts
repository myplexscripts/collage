import type { CollageSettings, EffectId, LayoutId } from "./types";

export interface CanvasPreset {
  id: string;
  label: string;
  hint: string;
  width: number;
  height: number;
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: "square", label: "Square", hint: "2048 × 2048", width: 2048, height: 2048 },
  { id: "landscape", label: "Desktop 4K", hint: "3840 × 2160", width: 3840, height: 2160 },
  { id: "fhd", label: "Desktop HD", hint: "1920 × 1080", width: 1920, height: 1080 },
  { id: "phone", label: "Phone", hint: "1290 × 2796", width: 1290, height: 2796 },
  { id: "portrait", label: "Poster 2:3", hint: "2000 × 3000", width: 2000, height: 3000 },
  { id: "ultrawide", label: "Ultrawide", hint: "3440 × 1440", width: 3440, height: 1440 },
  { id: "banner", label: "Banner", hint: "3000 × 1000", width: 3000, height: 1000 },
  { id: "print", label: "Print A3", hint: "3508 × 4961", width: 3508, height: 4961 },
];

export interface GradientPreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "midnight", label: "Midnight", from: "#12141c", to: "#05060a" },
  { id: "charcoal", label: "Charcoal", from: "#1b1d24", to: "#0c0d11" },
  { id: "gold", label: "Plex Gold", from: "#332205", to: "#100a02" },
  { id: "ocean", label: "Ocean", from: "#0d2438", to: "#050b12" },
  { id: "velvet", label: "Velvet", from: "#2c1233", to: "#0d0614" },
  { id: "crimson", label: "Crimson", from: "#3c0e14", to: "#130407" },
  { id: "forest", label: "Forest", from: "#122b1d", to: "#060e09" },
  { id: "slate", label: "Slate", from: "#26303b", to: "#10151b" },
  { id: "cream", label: "Cream", from: "#f6f0e3", to: "#e6dac4" },
  { id: "paper", label: "Paper", from: "#fbfbfb", to: "#e9e9ec" },
];

export const TITLE_FONTS = [
  { id: "Bebas Neue", label: "Bebas Neue" },
  { id: "Archivo Black", label: "Archivo" },
  { id: "Playfair Display", label: "Playfair" },
  { id: "Space Grotesk", label: "Grotesk" },
  { id: "Caveat", label: "Caveat" },
];

export const LAYOUTS: { id: LayoutId; label: string; blurb: string }[] = [
  { id: "grid", label: "Grid", blurb: "Clean rows & columns" },
  { id: "mosaic", label: "Mosaic", blurb: "Featured 2× tiles" },
  { id: "masonry", label: "Masonry", blurb: "Staggered columns" },
  { id: "polaroid", label: "Polaroid", blurb: "Scattered snapshots" },
  { id: "hex", label: "Honeycomb", blurb: "Hexagonal tiles" },
  { id: "filmstrip", label: "Filmstrip", blurb: "Cinema reels" },
];

export const EFFECTS: { id: EffectId; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "vivid", label: "Vivid" },
  { id: "faded", label: "Faded" },
  { id: "vintage", label: "Vintage" },
  { id: "sepia", label: "Sepia" },
  { id: "grayscale", label: "Mono" },
  { id: "noir", label: "Noir" },
];

export const EFFECT_FILTERS: Record<EffectId, string> = {
  none: "none",
  vivid: "saturate(1.45) contrast(1.06)",
  faded: "saturate(0.72) brightness(1.08) contrast(0.92)",
  vintage: "sepia(0.42) contrast(0.96) brightness(1.04) saturate(0.85)",
  sepia: "sepia(0.85)",
  grayscale: "grayscale(1)",
  noir: "grayscale(1) contrast(1.28) brightness(0.94)",
};

export const DEFAULT_SETTINGS: CollageSettings = {
  layout: "grid",
  canvasPreset: "landscape",
  canvasWidth: 3840,
  canvasHeight: 2160,
  autoColumns: true,
  columns: 9,
  gap: 6,
  padding: 36,
  fullBleed: true,
  cornerRadius: 10,
  borderEnabled: false,
  borderColor: "#e5a00d",
  borderWidth: 3,
  shadow: true,
  effect: "none",
  bgMode: "gradient",
  bgColor: "#13151d",
  bgColor2: "#05060a",
  bgAngle: 135,
  bgDim: 58,
  vignette: 22,
  edgeFade: 0,
  grain: 0,
  titleEnabled: false,
  titleText: "MY COLLECTION",
  titleFont: "Bebas Neue",
  titleSize: 72,
  titleColor: "#ffffff",
  titlePosition: "center",
  titleUppercase: true,
  titleLetterSpacing: 8,
  titleScrim: true,
  polaroidCaptions: true,
  sort: "added",
  seed: 1,
  limit: 60,
  genreFilter: [],
  yearMin: null,
  yearMax: null,
  unwatchedOnly: false,
  minRating: 0,
};

export interface IdeaPreset {
  id: string;
  label: string;
  emoji: string;
  apply: Partial<CollageSettings>;
}

/** One-tap starting points that bundle layout + style + content settings. */
export const IDEA_PRESETS: IdeaPreset[] = [
  {
    id: "wall",
    label: "Poster Wall",
    emoji: "🧱",
    apply: {
      layout: "grid", fullBleed: true, gap: 5, cornerRadius: 8, autoColumns: true,
      effect: "none", bgMode: "gradient", bgColor: "#13151d", bgColor2: "#05060a",
      bgAngle: 135, vignette: 28, edgeFade: 0, grain: 0,
      titleEnabled: false, shadow: true, sort: "added", limit: 96,
    },
  },
  {
    id: "wrapped",
    label: "Year Wrapped",
    emoji: "🎁",
    apply: {
      layout: "mosaic", fullBleed: true, gap: 8, cornerRadius: 16, autoColumns: true,
      effect: "vivid", bgMode: "gradient", bgColor: "#3a2607", bgColor2: "#0d0802",
      bgAngle: 145, vignette: 34, edgeFade: 0, grain: 6,
      titleEnabled: true, titleText: "2026 WRAPPED", titleFont: "Archivo Black",
      titleSize: 96, titlePosition: "center", titleScrim: true, titleColor: "#ffffff",
      titleUppercase: true, titleLetterSpacing: 4, sort: "lastViewed", limit: 64,
    },
  },
  {
    id: "noir",
    label: "Film Noir",
    emoji: "🎞️",
    apply: {
      layout: "filmstrip", effect: "noir", bgMode: "solid", bgColor: "#08080a",
      vignette: 46, edgeFade: 0, grain: 24, autoColumns: true,
      titleEnabled: true, titleText: "NOW SHOWING", titleFont: "Bebas Neue",
      titleSize: 84, titlePosition: "center", titleScrim: false, titleColor: "#f3e9d2",
      titleUppercase: true, titleLetterSpacing: 14, shadow: true, sort: "rating", limit: 48,
    },
  },
  {
    id: "scrapbook",
    label: "Scrapbook",
    emoji: "📌",
    apply: {
      layout: "polaroid", effect: "vintage", bgMode: "gradient",
      bgColor: "#efe6d2", bgColor2: "#d9c8a8", bgAngle: 160,
      vignette: 30, edgeFade: 0, grain: 14, autoColumns: true,
      polaroidCaptions: true, titleEnabled: false, sort: "random", limit: 28, shadow: true,
    },
  },
  {
    id: "hive",
    label: "Gold Hive",
    emoji: "🐝",
    apply: {
      layout: "hex", fullBleed: true, gap: 7, autoColumns: true, effect: "none",
      bgMode: "gradient", bgColor: "#3a2607", bgColor2: "#0d0802", bgAngle: 135,
      vignette: 36, edgeFade: 0, grain: 0,
      titleEnabled: false, sort: "rating", limit: 96,
    },
  },
  {
    id: "wallpaper",
    label: "Phone Wallpaper",
    emoji: "📱",
    apply: {
      layout: "masonry", canvasPreset: "phone", canvasWidth: 1290, canvasHeight: 2796,
      fullBleed: true, gap: 7, cornerRadius: 16, autoColumns: true, effect: "faded",
      bgMode: "posterBlur", bgDim: 64, vignette: 30, edgeFade: 34, grain: 8,
      titleEnabled: false, shadow: true, sort: "random", limit: 60,
    },
  },
  {
    id: "minimal",
    label: "Minimal Frame",
    emoji: "🖼️",
    apply: {
      layout: "grid", fullBleed: false, padding: 70, gap: 10, cornerRadius: 6,
      autoColumns: true, effect: "none", bgMode: "solid", bgColor: "#0c0d11",
      vignette: 0, edgeFade: 0, grain: 0, shadow: true,
      borderEnabled: false, titleEnabled: false, sort: "rating", limit: 30,
    },
  },
  {
    id: "spotlight",
    label: "Spotlight",
    emoji: "✨",
    apply: {
      layout: "mosaic", fullBleed: true, gap: 6, cornerRadius: 10, autoColumns: true,
      effect: "none", bgMode: "posterBlur", bgDim: 60, vignette: 40, edgeFade: 20,
      grain: 0, titleEnabled: false, shadow: true, sort: "rating", limit: 70,
    },
  },
];
