import { useMemo, useState } from "react";
import { posterUrl } from "../lib/plex";
import { useStore } from "../store";

/** Modal grid for hand-hiding posters from the collage. */
export function PosterPicker({ onClose }: { onClose: () => void }) {
  const items = useStore((s) => s.items);
  const excluded = useStore((s) => s.excluded);
  const toggleExcluded = useStore((s) => s.toggleExcluded);
  const baseUri = useStore((s) => s.baseUri);
  const server = useStore((s) => s.server);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter((it) => it.title.toLowerCase().includes(q))
      : items;
    return base.slice(0, 400);
  }, [items, query]);

  if (!baseUri || !server) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Hand-pick posters</h3>
          <input
            className="text-input"
            placeholder="Search titles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="hint">
          Click a poster to hide it from the collage. {excluded.size} hidden.
        </p>
        <div className="picker-grid">
          {filtered.map((it) => {
            const hidden = excluded.has(it.ratingKey);
            return (
              <button
                key={it.ratingKey}
                className={`picker-cell ${hidden ? "hidden" : ""}`}
                onClick={() => toggleExcluded(it.ratingKey)}
                title={`${it.title}${it.year ? ` (${it.year})` : ""}`}
              >
                {it.thumb && (
                  <img
                    src={posterUrl(baseUri, server.accessToken, it.thumb, 240)}
                    loading="lazy"
                    alt={it.title}
                  />
                )}
                <span className="picker-mark">{hidden ? "🚫" : "✓"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
