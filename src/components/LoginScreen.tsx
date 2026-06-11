import { useEffect, useRef, useState } from "react";
import { authAppUrl, checkPin, createPin } from "../lib/plex";
import { useStore } from "../store";

export function LoginScreen() {
  const loginSuccess = useStore((s) => s.loginSuccess);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    },
    [],
  );

  async function startLogin() {
    setError(null);
    setBusy(true);
    try {
      const pin = await createPin();
      const popup = window.open(
        authAppUrl(pin),
        "plex-auth",
        "width=640,height=760,menubar=no,toolbar=no",
      );
      if (!popup) {
        // popup blocked — fall back to navigating this tab after a beat
        window.location.href = authAppUrl(pin);
      }
      const startedAt = Date.now();
      pollRef.current = window.setInterval(async () => {
        if (Date.now() - startedAt > 5 * 60 * 1000) {
          window.clearInterval(pollRef.current!);
          setBusy(false);
          setError("Login timed out. Try again.");
          return;
        }
        const token = await checkPin(pin).catch(() => null);
        if (token) {
          window.clearInterval(pollRef.current!);
          popup?.close();
          await loginSuccess(token);
        }
      }, 2000);
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-bg" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} className={`drift-tile t${i % 6}`} />
        ))}
      </div>
      <div className="login-card">
        <div className="logo-mark">
          <span className="logo-bar a" />
          <span className="logo-bar b" />
          <span className="logo-bar c" />
        </div>
        <h1>Poster Studio</h1>
        <p className="tagline">
          Turn your Plex library into stunning collages — wallpapers, year-end
          wraps, filmstrips, scrapbooks and more.
        </p>
        <button className="btn-plex" onClick={startLogin} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" /> Waiting for Plex…
            </>
          ) : (
            <>Sign in with Plex</>
          )}
        </button>
        {busy && (
          <p className="hint">
            Approve the sign-in in the Plex window, then come back here.
          </p>
        )}
        {error && <p className="error-text">{error}</p>}
        <p className="footnote">
          Runs entirely in your browser. Your Plex token never leaves it.
        </p>
      </div>
    </div>
  );
}
