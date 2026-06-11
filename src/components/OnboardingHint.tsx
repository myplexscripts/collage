import { useState } from "react";

const KEY = "posterstudio.onboarded";

/** A one-time, dismissible welcome shown the first time the studio opens. */
export function OnboardingHint() {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(KEY));
  if (dismissed) return null;

  function close() {
    localStorage.setItem(KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="onboard" role="dialog" aria-label="Welcome">
      <button className="onboard-x icon-btn" onClick={close} aria-label="Dismiss">
        ✕
      </button>
      <div className="onboard-title">Welcome to your studio ✨</div>
      <ul className="onboard-list">
        <li>
          <b>Quick Ideas</b> on the Layout tab are one-tap starting points.
        </li>
        <li>
          Press <kbd>S</kbd> to reshuffle, <kbd>D</kbd> for your saved designs,
          <kbd>1</kbd>–<kbd>6</kbd> to jump between tabs.
        </li>
        <li>
          <b>Finish</b> adds the vignette, edge-fade and grain that make it feel
          like a poster.
        </li>
      </ul>
      <button className="btn-primary" onClick={close}>
        Start designing
      </button>
    </div>
  );
}
