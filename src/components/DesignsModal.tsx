import { useEffect, useState } from "react";
import { LAYOUTS } from "../lib/presets";
import { useStore } from "../store";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function DesignsModal({ onClose }: { onClose: () => void }) {
  const savedDesigns = useStore((s) => s.savedDesigns);
  const refreshDesigns = useStore((s) => s.refreshDesigns);
  const saveCurrentDesign = useStore((s) => s.saveCurrentDesign);
  const applyDesign = useStore((s) => s.applyDesign);
  const removeDesign = useStore((s) => s.removeDesign);
  const duplicateSavedDesign = useStore((s) => s.duplicateSavedDesign);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    refreshDesigns();
  }, [refreshDesigns]);

  function save() {
    saveCurrentDesign(name);
    setName("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal designs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>My Designs</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="save-row">
          <input
            className="text-input"
            placeholder="Name this design…"
            value={name}
            maxLength={48}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button className="btn-primary" onClick={save}>
            ＋ Save current
          </button>
        </div>

        {savedDesigns.length === 0 ? (
          <div className="designs-empty">
            <span style={{ fontSize: 34 }}>🗂️</span>
            <p>No saved designs yet.</p>
            <p className="hint">
              Tune a collage you love, give it a name, and save it here to come
              back to any time. Designs live in this browser.
            </p>
          </div>
        ) : (
          <div className="designs-grid">
            {savedDesigns.map((d) => {
              const layout = LAYOUTS.find((l) => l.id === d.settings.layout);
              return (
                <div key={d.id} className="design-card">
                  <button
                    className="design-thumb"
                    onClick={() => {
                      applyDesign(d);
                      onClose();
                    }}
                    title={`Open “${d.name}”`}
                  >
                    {d.thumbnail ? (
                      <img src={d.thumbnail} alt={d.name} />
                    ) : (
                      <span className="design-noimg">{layout?.label ?? "Design"}</span>
                    )}
                    <span className="design-open">Open</span>
                  </button>
                  <div className="design-meta">
                    <div className="design-name" title={d.name}>
                      {d.name}
                    </div>
                    <div className="design-sub">
                      {layout?.label} · {timeAgo(d.updatedAt)}
                    </div>
                  </div>
                  <div className="design-actions">
                    <button
                      className="link-btn"
                      onClick={() => duplicateSavedDesign(d.id)}
                    >
                      Duplicate
                    </button>
                    {confirmDelete === d.id ? (
                      <button
                        className="link-btn danger"
                        onClick={() => {
                          removeDesign(d.id);
                          setConfirmDelete(null);
                        }}
                      >
                        Confirm?
                      </button>
                    ) : (
                      <button
                        className="link-btn danger"
                        onClick={() => setConfirmDelete(d.id)}
                        onBlur={() => setConfirmDelete(null)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
