import { useEffect, useState } from "react";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useStore } from "../store";
import { DesignsModal } from "./DesignsModal";
import { OnboardingHint } from "./OnboardingHint";
import { Preview } from "./Preview";
import { ContentPanel } from "./panels/ContentPanel";
import { ExportPanel } from "./panels/ExportPanel";
import { FinishPanel } from "./panels/FinishPanel";
import { LayoutPanel } from "./panels/LayoutPanel";
import { StylePanel } from "./panels/StylePanel";
import { TextPanel } from "./panels/TextPanel";

type Tab = "layout" | "content" | "style" | "text" | "finish" | "export";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "layout", label: "Layout", icon: "▦" },
  { id: "content", label: "Posters", icon: "🎬" },
  { id: "style", label: "Style", icon: "🎨" },
  { id: "text", label: "Text", icon: "Aa" },
  { id: "finish", label: "Finish", icon: "✨" },
  { id: "export", label: "Export", icon: "⬇" },
];

function Panel({ tab }: { tab: Tab }) {
  switch (tab) {
    case "layout":
      return <LayoutPanel />;
    case "content":
      return <ContentPanel />;
    case "style":
      return <StylePanel />;
    case "text":
      return <TextPanel />;
    case "finish":
      return <FinishPanel />;
    case "export":
      return <ExportPanel />;
  }
}

export function Studio() {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [tab, setTab] = useState<Tab | null>(() =>
    window.matchMedia("(max-width: 900px)").matches ? null : "layout",
  );
  const [designsOpen, setDesignsOpen] = useState(false);
  const user = useStore((s) => s.user);
  const server = useStore((s) => s.server);
  const shuffle = useStore((s) => s.shuffle);
  const backToSetup = useStore((s) => s.backToSetup);
  const logout = useStore((s) => s.logout);
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);
  const notice = useStore((s) => s.notice);
  const setNotice = useStore((s) => s.setNotice);

  useEffect(() => {
    if (!isMobile) setTab((t) => t ?? "layout");
  }, [isMobile]);

  // auto-dismiss success notices
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  // keyboard shortcuts (ignored while typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        if (designsOpen) setDesignsOpen(false);
        else if (isMobile) setTab(null);
        return;
      }
      if (e.key === "s" || e.key === "S") {
        shuffle();
      } else if (e.key === "d" || e.key === "D") {
        setDesignsOpen((v) => !v);
      } else if (e.key >= "1" && e.key <= "6") {
        const idx = Number(e.key) - 1;
        if (TABS[idx]) setTab(TABS[idx].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shuffle, designsOpen, isMobile]);

  const logo = (
    <div className="logo-mark small">
      <span className="logo-bar a" />
      <span className="logo-bar b" />
      <span className="logo-bar c" />
    </div>
  );

  const toasts = (
    <>
      {notice && (
        <div className="toast success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="toast" role="alert">
          {error}
          <button className="icon-btn" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  );

  if (isMobile) {
    const activeLabel = TABS.find((t) => t.id === tab)?.label;
    return (
      <div className="studio mobile">
        <header className="topbar">
          <div className="logo-row">{logo}</div>
          <button className="chip" onClick={backToSetup}>
            🖥️ {server?.name}
          </button>
          <div className="topbar-spacer" />
          <button
            className="icon-btn"
            onClick={() => setDesignsOpen(true)}
            title="My designs"
            aria-label="My designs"
          >
            🗂️
          </button>
          <button className="icon-btn" onClick={shuffle} title="Shuffle" aria-label="Shuffle">
            🎲
          </button>
        </header>

        <main className="stage">
          <Preview />
        </main>

        {tab && <div className="sheet-backdrop" onClick={() => setTab(null)} />}
        {tab && (
          <div className="sheet" role="dialog" aria-label={activeLabel}>
            <button
              className="sheet-handle"
              onClick={() => setTab(null)}
              aria-label="Close panel"
            />
            <div className="sheet-head">
              <span>{activeLabel}</span>
              <button className="icon-btn" onClick={() => setTab(null)}>
                ✕
              </button>
            </div>
            <div className="sheet-body">
              <Panel tab={tab} />
            </div>
          </div>
        )}

        <nav className="tabbar mobile-tabbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(tab === t.id ? null : t.id)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {designsOpen && <DesignsModal onClose={() => setDesignsOpen(false)} />}
        <OnboardingHint />
        {toasts}
      </div>
    );
  }

  const deskTab = tab ?? "layout";
  return (
    <div className="studio">
      <header className="topbar">
        <div className="logo-row">
          {logo}
          <span className="wordmark">Poster Studio</span>
        </div>
        <button className="chip" onClick={backToSetup} title="Change server or libraries">
          🖥️ {server?.name}
        </button>
        <div className="topbar-spacer" />
        <button
          className="btn-secondary"
          onClick={() => setDesignsOpen(true)}
          title="Save & open designs (D)"
        >
          🗂️ Designs
        </button>
        <button
          className="btn-secondary"
          onClick={shuffle}
          title="Reshuffle scatter & random order (S)"
        >
          🎲 Shuffle
        </button>
        <button className="btn-primary" onClick={() => setTab("export")}>
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
              className={`tab-btn ${deskTab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <aside className="sidebar">
          <Panel tab={deskTab} />
        </aside>

        <main className="stage">
          <Preview />
        </main>
      </div>

      {designsOpen && <DesignsModal onClose={() => setDesignsOpen(false)} />}
      <OnboardingHint />
      {toasts}
    </div>
  );
}
