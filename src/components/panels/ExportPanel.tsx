import { useState } from "react";
import { renderCollage } from "../../render/draw";
import { loadPosters, widthBucket } from "../../render/images";
import { selectCollageItems, useStore } from "../../store";
import { Field, Segmented, Slider } from "../controls";

type Format = "png" | "jpeg";

export function ExportPanel() {
  const settings = useStore((s) => s.settings);
  const items = useStore((s) => s.items);
  const excluded = useStore((s) => s.excluded);
  const baseUri = useStore((s) => s.baseUri);
  const server = useStore((s) => s.server);
  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function doExport() {
    if (!baseUri || !server) return;
    setBusy(true);
    setError(null);
    try {
      const selection = selectCollageItems(items, excluded, settings);
      if (selection.length === 0) throw new Error("Nothing to export — adjust your filters.");

      // fetch posters at a resolution matched to the export tile size
      const tilePx = settings.canvasWidth / Math.max(3, settings.columns);
      const bucket = widthBucket(tilePx);
      setProgress("Fetching full-res posters…");
      const images = await loadPosters(
        baseUri,
        server.accessToken,
        selection,
        bucket,
        (done, total) => setProgress(`Fetching posters ${done}/${total}`),
      );

      setProgress("Rendering…");
      await document.fonts.ready;
      const canvas = document.createElement("canvas");
      renderCollage(canvas, { settings, items: selection, images });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          format === "png" ? "image/png" : "image/jpeg",
          quality / 100,
        ),
      );
      if (!blob) throw new Error("Export failed while encoding the image.");

      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = URL.createObjectURL(blob);
      a.download = `collage-${settings.layout}-${date}.${format === "png" ? "png" : "jpg"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const mp = (settings.canvasWidth * settings.canvasHeight) / 1e6;

  return (
    <div className="panel">
      <Field label="Format">
        <Segmented<Format>
          value={format}
          options={[
            { value: "png", label: "PNG (lossless)" },
            { value: "jpeg", label: "JPEG (smaller)" },
          ]}
          onChange={setFormat}
        />
      </Field>

      {format === "jpeg" && (
        <Field label="Quality" trailing={`${quality}%`}>
          <Slider value={quality} min={50} max={100} onChange={setQuality} />
        </Field>
      )}

      <div className="export-summary">
        <div>
          <strong>
            {settings.canvasWidth} × {settings.canvasHeight}
          </strong>
          <span> · {mp.toFixed(1)} MP</span>
        </div>
        <p className="hint">
          Change the resolution from the Layout tab’s canvas presets.
        </p>
      </div>

      <button className="btn-primary big" onClick={doExport} disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" /> {progress || "Exporting…"}
          </>
        ) : (
          <>⬇ Download collage</>
        )}
      </button>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
