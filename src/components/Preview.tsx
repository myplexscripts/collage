import { useEffect, useMemo, useRef, useState } from "react";
import { renderCollage } from "../render/draw";
import { loadPosters, widthBucket } from "../render/images";
import { selectCollageItems, useStore } from "../store";

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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fit, setFit] = useState({ w: 800, h: 450 });

  const selection = useMemo(
    () => selectCollageItems(items, excluded, settings),
    [items, excluded, settings],
  );

  // fit the canvas display box to its container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = 48;
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
    const timer = window.setTimeout(async () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const outW = Math.min(fit.w * dpr, 2200);
      if (selection.length === 0) {
        renderCollage(canvas, { settings, items: [], images: new Map() }, outW);
        return;
      }
      setProgress({ done: 0, total: selection.length });
      const images = await loadPosters(
        baseUri,
        server.accessToken,
        selection,
        480,
        (done, total) => {
          if (renderToken.current === token) setProgress({ done, total });
        },
      );
      if (renderToken.current !== token) return;
      setProgress(null);
      await document.fonts.ready;
      if (renderToken.current !== token) return;
      renderCollage(canvas, { settings, items: selection, images }, outW);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [settings, selection, fit, baseUri, server]);

  return (
    <div className="preview-wrap" ref={wrapRef}>
      <div
        className="canvas-frame"
        style={{ width: fit.w, height: fit.h }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
        {(itemsLoading || progress) && (
          <div className="preview-overlay">
            <span className="spinner big" />
            <span>
              {itemsLoading
                ? "Loading your library…"
                : `Fetching posters ${progress!.done}/${progress!.total}`}
            </span>
          </div>
        )}
        {!itemsLoading && !progress && selection.length === 0 && (
          <div className="preview-overlay">
            <span style={{ fontSize: 32 }}>🎬</span>
            <span>No posters match your filters.</span>
          </div>
        )}
      </div>
      <div className="preview-caption">
        {settings.canvasWidth} × {settings.canvasHeight} ·{" "}
        {Math.min(selection.length, settings.limit)} posters
      </div>
    </div>
  );
}
