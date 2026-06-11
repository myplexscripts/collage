import type { ReactNode } from "react";

export function Field({
  label,
  children,
  trailing,
}: {
  label: string;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">{label}</span>
        {trailing && <span className="field-trailing">{trailing}</span>}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      className="slider"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={`seg-btn ${o.value === value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        className={`toggle ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="knob" />
      </button>
    </label>
  );
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <span className="color-input">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <code>{value}</code>
    </span>
  );
}
