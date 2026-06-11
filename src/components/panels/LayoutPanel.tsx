import { CANVAS_PRESETS, IDEA_PRESETS, LAYOUTS } from "../../lib/presets";
import { Field, Slider, Toggle } from "../controls";
import { useStore } from "../../store";

export function LayoutPanel() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.update);
  const applyPreset = useStore((s) => s.applyPreset);

  return (
    <div className="panel">
      <Field label="Quick ideas">
        <div className="idea-row">
          {IDEA_PRESETS.map((p) => (
            <button
              key={p.id}
              className="idea-chip"
              onClick={() => applyPreset(p.apply)}
              title={p.label}
            >
              <span className="idea-emoji">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Layout">
        <div className="layout-grid">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              className={`layout-card ${settings.layout === l.id ? "active" : ""}`}
              onClick={() => update({ layout: l.id })}
            >
              <LayoutThumb id={l.id} />
              <span className="layout-name">{l.label}</span>
              <span className="layout-blurb">{l.blurb}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Canvas size">
        <div className="canvas-presets">
          {CANVAS_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset-chip ${settings.canvasPreset === p.id ? "active" : ""}`}
              onClick={() =>
                update({
                  canvasPreset: p.id,
                  canvasWidth: p.width,
                  canvasHeight: p.height,
                })
              }
            >
              <span>{p.label}</span>
              <small>{p.hint}</small>
            </button>
          ))}
        </div>
      </Field>

      <Toggle
        label="Auto columns"
        checked={settings.autoColumns}
        onChange={(v) => update({ autoColumns: v })}
      />
      {!settings.autoColumns && (
        <Field label="Columns" trailing={String(settings.columns)}>
          <Slider
            value={settings.columns}
            min={2}
            max={20}
            onChange={(v) => update({ columns: v })}
          />
        </Field>
      )}

      <Field label="Gap" trailing={String(settings.gap)}>
        <Slider
          value={settings.gap}
          min={0}
          max={40}
          onChange={(v) => update({ gap: v })}
        />
      </Field>

      {!settings.fullBleed && (
        <Field label="Margin" trailing={String(settings.padding)}>
          <Slider
            value={settings.padding}
            min={0}
            max={140}
            onChange={(v) => update({ padding: v })}
          />
        </Field>
      )}

      <Toggle
        label="Full bleed (fill edge to edge)"
        checked={settings.fullBleed}
        onChange={(v) => update({ fullBleed: v })}
      />
    </div>
  );
}

/** Tiny inline SVG sketches of each layout */
function LayoutThumb({ id }: { id: string }) {
  const f = "currentColor";
  const common = { rx: 1, fill: f } as const;
  switch (id) {
    case "grid":
      return (
        <svg viewBox="0 0 48 32" className="layout-thumb">
          {[0, 1, 2, 3].map((c) =>
            [0, 1].map((r) => (
              <rect key={`${c}${r}`} x={1 + c * 12} y={1 + r * 16} width={10} height={14} {...common} />
            )),
          )}
        </svg>
      );
    case "mosaic":
      return (
        <svg viewBox="0 0 48 32" className="layout-thumb">
          <rect x={1} y={1} width={22} height={30} {...common} />
          <rect x={25} y={1} width={10} height={14} {...common} />
          <rect x={37} y={1} width={10} height={14} {...common} />
          <rect x={25} y={17} width={10} height={14} {...common} />
          <rect x={37} y={17} width={10} height={14} {...common} />
        </svg>
      );
    case "masonry":
      return (
        <svg viewBox="0 0 48 32" className="layout-thumb">
          <rect x={1} y={1} width={10} height={14} {...common} />
          <rect x={1} y={17} width={10} height={14} {...common} />
          <rect x={13} y={-6} width={10} height={14} {...common} />
          <rect x={13} y={10} width={10} height={14} {...common} />
          <rect x={13} y={26} width={10} height={14} {...common} />
          <rect x={25} y={1} width={10} height={14} {...common} />
          <rect x={25} y={17} width={10} height={14} {...common} />
          <rect x={37} y={-6} width={10} height={14} {...common} />
          <rect x={37} y={10} width={10} height={14} {...common} />
          <rect x={37} y={26} width={10} height={14} {...common} />
        </svg>
      );
    case "polaroid":
      return (
        <svg viewBox="0 0 48 32" className="layout-thumb">
          <rect x={4} y={4} width={14} height={20} {...common} transform="rotate(-8 11 14)" />
          <rect x={18} y={6} width={14} height={20} {...common} opacity={0.7} transform="rotate(6 25 16)" />
          <rect x={32} y={3} width={14} height={20} {...common} opacity={0.45} transform="rotate(-4 39 13)" />
        </svg>
      );
    case "hex":
      return (
        <svg viewBox="0 0 48 32" className="layout-thumb">
          {[
            [10, 8],
            [24, 8],
            [38, 8],
            [17, 22],
            [31, 22],
          ].map(([cx, cy], i) => (
            <polygon
              key={i}
              points={hexPoints(cx, cy, 7.4)}
              fill={f}
              opacity={i % 2 ? 0.6 : 1}
            />
          ))}
        </svg>
      );
    case "filmstrip":
      return (
        <svg viewBox="0 0 48 32" className="layout-thumb">
          <rect x={0} y={2} width={48} height={12} rx={1} fill={f} opacity={0.35} />
          <rect x={0} y={18} width={48} height={12} rx={1} fill={f} opacity={0.35} />
          {[3, 14, 25, 36].map((x) => (
            <rect key={x} x={x} y={4.5} width={8} height={7} rx={0.5} fill={f} />
          ))}
          {[6, 17, 28, 39].map((x) => (
            <rect key={x} x={x} y={20.5} width={8} height={7} rx={0.5} fill={f} />
          ))}
        </svg>
      );
    default:
      return null;
  }
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}
