import { useEffect, useMemo, useRef, useState } from "react";
import { registerPreviewCanvas } from "../lib/designs";
import { renderCollage } from "../render/draw";
import { loadPosters, widthBucket } from "../render/images";
import { selectCollageItems, useStore } from "../store";

/** Largest backing-store width for the live preview; exports render full-res. */
const PREVIEW_MAX_W = 2200;
/** Preview never fetches posters above this transcode width. */
const PREVIEW_MAX_BUCKET = 480;

function estimateColumns(
  selectionLen: number,
  W: number,
  H: number,
  autoColumns: boolean,
  manual: number,
): number {
  if (!autoColumns) return Math.max(2, manual);
  return Math.max(3, Math.round(Math.sqrt(selectionLen * (W / H) * 1.5)));
}

export function Preview() {
  const settings = useStore((s) => s.settings);
  const items = useStore((s) => s.items);
  const excluded = useStore((s) => s.excluded);
  const itemsLoading = useStore((s) => s.itemsLoading);
  const baseUri = useStore((s) => s.baseUri);
  const server = useStore((s) => s.server);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const renderToken = useRef(0);
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const bucketsRef = useRef(new Map<string, number>());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [painted, setPainted] = useState(false);
  const [fit, setFit] = useState({ w: 800, h: 450 });

  const selection = useMemo(
    () => selectCollageItems(items, excluded, settings),
    [items, excluded, settings],
  );

  // expose the live canvas so "Save design" can thumbnail it
  useEffect(() => {
    registerPreviewCanvas(canvasRef.current);
    return () => registerPreviewCanvas(null);
  }, []);

  // fit the canvas display box to its container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = el.clientWidth < 640 ? 16 : 48;
      const cw = el.clientWidth - pad;
      const ch = el.clientHeight - pad;
      const ar = settings.canvasWidth / settings.canvasHeight;
      let w = cw;
      let h = w / ar;
      if (h > ch) {
        h = ch;
        w = h * ar;
      }
      setFit({ w: Math.max(100, w), h: Math.max(100, h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [settings.canvasWidth, settings.canvasHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseUri || !server) return;
    const token = ++renderToken.current;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const outW = Math.min(fit.w * dpr, PREVIEW_MAX_W);

    const draw = () => {
      if (renderToken.current !== token) return;
      renderCollage(
        canvas,
        { settings, items: selection, images: imagesRef.current },
        outW,
      );
    };

    const timer = window.setTimeout(async () => {
      const needsFonts =
        settings.titleEnabled ||
        (settings.layout === "polaroid" && settings.polaroidCaptions);
      if (needsFonts && document.fonts.status !== "loaded") {
        await document.fonts.ready;
        if (renderToken.current !== token) return;
      }

      draw();
      if (selection.length === 0) {
        setProgress(null);
        return;
      }

      const cols = estimateColumns(
        selection.length,
        settings.canvasWidth,
        settings.canvasHeight,
        settings.autoColumns,
        settings.columns,
      );
      const tilePx = (fit.w * dpr * 1.3) / Math.max(3, cols);
      const bucket = Math.min(widthBucket(tilePx), PREVIEW_MAX_BUCKET);
      const missing = selection.filter(
        (it) =>
          !imagesRef.current.has(it.ratingKey) ||
          (bucketsRef.current.get(it.ratingKey) ?? 0) < bucket,
      );
      if (missing.length === 0) {
        setProgress(null);
        setPainted(true);
        return;
      }

      setProgress({ done: 0, total: missing.length });
      let done = 0;
      let lastDraw = performance.now();
      await loadPosters(baseUri, server.accessToken, missing, bucket, {
        onImage: (item, img) => {
          if (renderToken.current !== token) return;
          imagesRef.current.set(item.ratingKey, img);
          bucketsRef.current.set(item.ratingKey, bucket);
          done++;
          setProgress({ done, total: missing.length });
          setPainted(true);
          const now = performance.now();
          if (now - lastDraw > 180) {
            lastDraw = now;
            draw();
          }
        },
      });
      if (renderToken.current !== token) return;
      setProgress(null);
      draw();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [settings, selection, fit, baseUri, server]);

  const showSkeleton = itemsLoading || (!painted && selection.length > 0);

  return (
    <div className="preview-wrap" ref={wrapRef}>
      <div className="canvas-frame" style={{ width: fit.w, height: fit.h }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
        {showSkeleton && <PreviewSkeleton ar={settings.canvasWidth / settings.canvasHeight} />}
        {!itemsLoading && selection.length === 0 && (
          <div className="preview-overlay">
            <span style={{ fontSize: 32 }}>🎬</span>
            <span>No posters match your filters.</span>
            <span className="hint">Loosen a filter or raise the poster count.</span>
          </div>
        )}
      </div>
      {progress && (
        <div className="progress-pill">
          <span className="spinner" />
          {itemsLoading ? "Loading library" : `${progress.done}/${progress.total}`}
        </div>
      )}
      <div className="preview-caption">
        {settings.canvasWidth} × {settings.canvasHeight} ·{" "}
        {Math.min(selection.length, settings.limit)} posters
      </div>
    </div>
  );
}

/** Shimmering placeholder tiles shown until the first posters paint. */
function PreviewSkeleton({ ar }: { ar: number }) {
  const cols = ar >= 1.4 ? 8 : ar >= 0.9 ? 6 : 4;
  const rows = Math.round(cols / ar) + 1;
  const cells = cols * rows;
  return (
    <div
      className="preview-skeleton"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {Array.from({ length: cells }, (_, i) => (
        <div key={i} className="skel-tile" style={{ animationDelay: `${(i % cols) * 60 + Math.floor(i / cols) * 30}ms` }} />
      ))}
    </div>
  );
}
