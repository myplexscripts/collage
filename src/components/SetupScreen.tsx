import { useStore } from "../store";

export function SetupScreen() {
  const {
    user,
    servers,
    serversLoading,
    server,
    libraries,
    selectedLibraryKeys,
    connecting,
    error,
    pickServer,
    toggleLibrary,
    enterStudio,
    logout,
  } = useStore();

  return (
    <div className="setup-screen">
      <header className="setup-header">
        <div className="logo-row">
          <div className="logo-mark small">
            <span className="logo-bar a" />
            <span className="logo-bar b" />
            <span className="logo-bar c" />
          </div>
          <span className="wordmark">Poster Studio</span>
        </div>
        <div className="user-chip">
          {user?.thumb && <img src={user.thumb} alt="" />}
          <span>{user?.title || user?.username}</span>
          <button className="link-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="setup-main">
        <section>
          <h2>
            <span className="step-num">1</span> Choose a server
          </h2>
          {serversLoading && (
            <div className="loading-row">
              <span className="spinner" /> Finding your servers…
            </div>
          )}
          {!serversLoading && servers.length === 0 && (
            <p className="empty-note">
              No Plex Media Servers found on this account.
            </p>
          )}
          <div className="server-grid">
            {servers.map((sv) => (
              <button
                key={sv.clientIdentifier}
                className={`server-card ${
                  server?.clientIdentifier === sv.clientIdentifier ? "active" : ""
                }`}
                onClick={() => pickServer(sv)}
                disabled={connecting !== null}
              >
                <span className="server-icon">🖥️</span>
                <span className="server-name">{sv.name}</span>
                <span className="server-meta">
                  {sv.owned ? "Owned" : "Shared"}
                  {sv.productVersion ? ` · v${sv.productVersion}` : ""}
                </span>
                {connecting === sv.clientIdentifier && (
                  <span className="spinner" />
                )}
              </button>
            ))}
          </div>
        </section>

        {server && (
          <section>
            <h2>
              <span className="step-num">2</span> Pick libraries
            </h2>
            {libraries.length === 0 ? (
              <p className="empty-note">No movie or TV libraries found.</p>
            ) : (
              <div className="library-grid">
                {libraries.map((lib) => (
                  <button
                    key={lib.key}
                    className={`library-card ${
                      selectedLibraryKeys.includes(lib.key) ? "active" : ""
                    }`}
                    onClick={() => toggleLibrary(lib.key)}
                  >
                    <span className="lib-icon">
                      {lib.type === "movie" ? "🎬" : "📺"}
                    </span>
                    <span>{lib.title}</span>
                    <span className="check">✓</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {error && <p className="error-text">{error}</p>}

        <button
          className="btn-primary big"
          disabled={!server || selectedLibraryKeys.length === 0}
          onClick={enterStudio}
        >
          Open the studio →
        </button>
      </main>
    </div>
  );
}
