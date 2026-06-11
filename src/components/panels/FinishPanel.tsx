import { useStore } from "../../store";
import { Field, Slider } from "../controls";

export function FinishPanel() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.update);

  return (
    <div className="panel">
      <p className="hint" style={{ marginTop: 0 }}>
        Finishing passes applied over the whole collage — the difference
        between a screenshot and a poster.
      </p>

      <Field label="Vignette" trailing={`${settings.vignette}%`}>
        <Slider
          value={settings.vignette}
          min={0}
          max={100}
          onChange={(v) => update({ vignette: v })}
        />
      </Field>
      <p className="hint subtle">Darkens the corners to draw the eye inward.</p>

      <Field label="Edge fade" trailing={`${settings.edgeFade}%`}>
        <Slider
          value={settings.edgeFade}
          min={0}
          max={100}
          onChange={(v) => update({ edgeFade: v })}
        />
      </Field>
      <p className="hint subtle">
        Feathers the collage into the background — ideal for wallpapers.
      </p>

      <Field label="Film grain" trailing={`${settings.grain}%`}>
        <Slider
          value={settings.grain}
          min={0}
          max={100}
          onChange={(v) => update({ grain: v })}
        />
      </Field>
      <p className="hint subtle">
        Adds an analog texture that pairs well with Vintage and Noir.
      </p>
    </div>
  );
}
