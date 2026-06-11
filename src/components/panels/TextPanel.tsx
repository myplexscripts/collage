import { TITLE_FONTS } from "../../lib/presets";
import type { TitlePosition } from "../../lib/types";
import { useStore } from "../../store";
import { ColorInput, Field, Segmented, Slider, Toggle } from "../controls";

export function TextPanel() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.update);

  return (
    <div className="panel">
      <Toggle
        label="Title overlay"
        checked={settings.titleEnabled}
        onChange={(v) => update({ titleEnabled: v })}
      />

      {settings.titleEnabled && (
        <>
          <Field label="Text">
            <input
              className="text-input"
              type="text"
              value={settings.titleText}
              maxLength={60}
              placeholder="MY COLLECTION"
              onChange={(e) => update({ titleText: e.target.value })}
            />
          </Field>

          <Field label="Font">
            <div className="font-row">
              {TITLE_FONTS.map((f) => (
                <button
                  key={f.id}
                  className={`font-chip ${settings.titleFont === f.id ? "active" : ""}`}
                  style={{ fontFamily: `"${f.id}", sans-serif` }}
                  onClick={() => update({ titleFont: f.id })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Position">
            <Segmented<TitlePosition>
              value={settings.titlePosition}
              options={[
                { value: "top", label: "Top" },
                { value: "center", label: "Center" },
                { value: "bottom", label: "Bottom" },
              ]}
              onChange={(v) => update({ titlePosition: v })}
            />
          </Field>

          <Field label="Size" trailing={String(settings.titleSize)}>
            <Slider
              value={settings.titleSize}
              min={20}
              max={200}
              onChange={(v) => update({ titleSize: v })}
            />
          </Field>

          <Field label="Letter spacing" trailing={String(settings.titleLetterSpacing)}>
            <Slider
              value={settings.titleLetterSpacing}
              min={0}
              max={40}
              onChange={(v) => update({ titleLetterSpacing: v })}
            />
          </Field>

          <Field label="Color">
            <ColorInput
              value={settings.titleColor}
              onChange={(v) => update({ titleColor: v })}
            />
          </Field>

          <Toggle
            label="UPPERCASE"
            checked={settings.titleUppercase}
            onChange={(v) => update({ titleUppercase: v })}
          />
          <Toggle
            label="Darkened band behind text"
            checked={settings.titleScrim}
            onChange={(v) => update({ titleScrim: v })}
          />
        </>
      )}

      {settings.layout === "polaroid" && (
        <Toggle
          label="Handwritten captions on polaroids"
          checked={settings.polaroidCaptions}
          onChange={(v) => update({ polaroidCaptions: v })}
        />
      )}
    </div>
  );
}
