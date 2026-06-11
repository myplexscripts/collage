import { useState } from "react";
import { useStore } from "../store";
import { Preview } from "./Preview";
import { ContentPanel } from "./panels/ContentPanel";
import { ExportPanel } from "./panels/ExportPanel";
import { LayoutPanel } from "./panels/LayoutPanel";
import { StylePanel } from "./panels/StylePanel";
import { TextPanel } from "./panels/TextPanel";

type Tab = "layout" | "content" | "style" | "text" | "export";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "layout", label: "Layout", icon: "▦" },
  { id: "content", label: "Posters", icon: "🎬" },
  { id: "style", label: "Style", icon: "🎨" },
  { id: "text", label: "Text", icon: "Aa" },
  { id: "export", label: "Export", icon: "⬇" },
];

export function Studio() {
  const [tab, setTab] = useState<Tab>("layout");
  const user = useStore((s) => s.user);
  const server = useStore((s) => s.server);
  const shuffle = useStore((s) => s.shuffle);
  const backToSetup = useStore((s) => s.backToSetup);
  const logout = useStore((s) => s.logout);
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);

  return (
    <div className="studio">
      <header className="topbar">
        <div className="logo-row">
          <div className="logo-mark small">
            <span className="logo-bar a" />
            <span className="logo-bar b" />
            <span className="logo-bar c" />
          </div>
          <span className="wordmark">Poster Studio</span>
        </div>
        <button className="chip" onClick={backToSetup} title="Change server or libraries">
          🖥️ {server?.name}
        </button>
        <div className="topbar-spacer" />
        <button className="btn-secondary" onClick={shuffle} title="Reshuffle scatter & random order">
          🎲 Shuffle
        </button>
        <button
          className="btn-primary"
          onClick={() => setTab("export")}
        >
          Export
        </button>
        <div className="user-chip">
          {user?.thumb && <img src={user.thumb} alt="" />}
          <button className="link-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="studio-body">
        <nav className="tabbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <aside className="sidebar">
          {tab === "layout" && <LayoutPanel />}
          {tab === "content" && <ContentPanel />}
          {tab === "style" && <StylePanel />}
          {tab === "text" && <TextPanel />}
          {tab === "export" && <ExportPanel />}
        </aside>

        <main className="stage">
          <Preview />
        </main>
      </div>

      {error && (
        <div className="toast" role="alert">
          {error}
          <button className="icon-btn" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
