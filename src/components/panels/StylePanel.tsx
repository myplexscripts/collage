import { EFFECTS, GRADIENT_PRESETS } from "../../lib/presets";
import type { BackgroundMode } from "../../lib/types";
import { useStore } from "../../store";
import { ColorInput, Field, Segmented, Slider, Toggle } from "../controls";

export function StylePanel() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.update);

  return (
    <div className="panel">
      <Field label="Color effect">
        <div className="effect-row">
          {EFFECTS.map((e) => (
            <button
              key={e.id}
              className={`chip ${settings.effect === e.id ? "active" : ""}`}
              onClick={() => update({ effect: e.id })}
            >
              {e.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Corner radius" trailing={String(settings.cornerRadius)}>
        <Slider
          value={settings.cornerRadius}
          min={0}
          max={60}
          onChange={(v) => update({ cornerRadius: v })}
        />
      </Field>

      <Toggle
        label="Drop shadows"
        checked={settings.shadow}
        onChange={(v) => update({ shadow: v })}
      />

      <Toggle
        label="Poster borders"
        checked={settings.borderEnabled}
        onChange={(v) => update({ borderEnabled: v })}
      />
      {settings.borderEnabled && (
        <>
          <Field label="Border color">
            <ColorInput
              value={settings.borderColor}
              onChange={(v) => update({ borderColor: v })}
            />
          </Field>
          <Field label="Border width" trailing={String(settings.borderWidth)}>
            <Slider
              value={settings.borderWidth}
              min={1}
              max={12}
              onChange={(v) => update({ borderWidth: v })}
            />
          </Field>
        </>
      )}

      <Field label="Background">
        <Segmented<BackgroundMode>
          value={settings.bgMode}
          options={[
            { value: "gradient", label: "Gradient" },
            { value: "solid", label: "Solid" },
            { value: "posterBlur", label: "Poster blur" },
          ]}
          onChange={(v) => update({ bgMode: v })}
        />
      </Field>

      {settings.bgMode === "gradient" && (
        <>
          <div className="gradient-grid">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g.id}
                title={g.label}
                className={`gradient-swatch ${
                  settings.bgColor === g.from && settings.bgColor2 === g.to
                    ? "active"
                    : ""
                }`}
                style={{
                  background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                }}
                onClick={() => update({ bgColor: g.from, bgColor2: g.to })}
              />
            ))}
          </div>
          <Field label="Custom colors">
            <div className="color-pair">
              <ColorInput
                value={settings.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                value={settings.bgColor2}
                onChange={(v) => update({ bgColor2: v })}
              />
            </div>
          </Field>
          <Field label="Angle" trailing={`${settings.bgAngle}°`}>
            <Slider
              value={settings.bgAngle}
              min={0}
              max={360}
              step={5}
              onChange={(v) => update({ bgAngle: v })}
            />
          </Field>
        </>
      )}

      {settings.bgMode === "solid" && (
        <Field label="Color">
          <ColorInput
            value={settings.bgColor}
            onChange={(v) => update({ bgColor: v })}
          />
        </Field>
      )}

      {settings.bgMode === "posterBlur" && (
        <p className="hint">
          The first poster in your selection is blown up, blurred and dimmed
          behind the collage.
        </p>
      )}
    </div>
  );
}
