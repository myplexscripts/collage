import { create } from "zustand";
import {
  fetchLibraries,
  fetchLibraryItems,
  fetchServers,
  fetchUser,
  resolveBaseUri,
} from "./lib/plex";
import { DEFAULT_SETTINGS } from "./lib/presets";
import { mulberry32 } from "./lib/random";
import type {
  CollageSettings,
  PlexItem,
  PlexLibrary,
  PlexServer,
  PlexUser,
} from "./lib/types";

const TOKEN_KEY = "posterstudio.token";
const SETTINGS_KEY = "posterstudio.settings";

export type Phase = "boot" | "login" | "setup" | "studio";

interface State {
  phase: Phase;
  token: string | null;
  user: PlexUser | null;
  servers: PlexServer[];
  serversLoading: boolean;
  server: PlexServer | null;
  baseUri: string | null;
  connecting: string | null; // clientIdentifier currently connecting
  libraries: PlexLibrary[];
  selectedLibraryKeys: string[];
  items: PlexItem[];
  itemsLoading: boolean;
  excluded: Set<string>;
  settings: CollageSettings;
  error: string | null;

  boot: () => Promise<void>;
  loginSuccess: (token: string) => Promise<void>;
  logout: () => void;
  pickServer: (server: PlexServer) => Promise<void>;
  toggleLibrary: (key: string) => void;
  enterStudio: () => Promise<void>;
  reloadItems: () => Promise<void>;
  backToSetup: () => void;
  update: (patch: Partial<CollageSettings>) => void;
  applyPreset: (patch: Partial<CollageSettings>) => void;
  shuffle: () => void;
  toggleExcluded: (ratingKey: string) => void;
  clearExcluded: () => void;
  setError: (msg: string | null) => void;
}

function loadSettings(): CollageSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: CollageSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export const useStore = create<State>((set, get) => ({
  phase: "boot",
  token: null,
  user: null,
  servers: [],
  serversLoading: false,
  server: null,
  baseUri: null,
  connecting: null,
  libraries: [],
  selectedLibraryKeys: [],
  items: [],
  itemsLoading: false,
  excluded: new Set<string>(),
  settings: loadSettings(),
  error: null,

  boot: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ phase: "login" });
      return;
    }
    try {
      const user = await fetchUser(token);
      set({ token, user, phase: "setup", serversLoading: true });
      const servers = await fetchServers(token);
      set({ servers, serversLoading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ phase: "login", token: null, user: null });
    }
  },

  loginSuccess: async (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, error: null });
    try {
      const user = await fetchUser(token);
      set({ user, phase: "setup", serversLoading: true });
      const servers = await fetchServers(token);
      set({ servers, serversLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, serversLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      phase: "login",
      token: null,
      user: null,
      servers: [],
      server: null,
      baseUri: null,
      libraries: [],
      selectedLibraryKeys: [],
      items: [],
      excluded: new Set(),
    });
  },

  pickServer: async (server) => {
    set({ connecting: server.clientIdentifier, error: null });
    try {
      const baseUri = await resolveBaseUri(server);
      const libraries = await fetchLibraries(baseUri, server.accessToken);
      set({
        server,
        baseUri,
        libraries,
        selectedLibraryKeys: libraries.slice(0, 1).map((l) => l.key),
        connecting: null,
      });
    } catch (e) {
      set({ connecting: null, error: (e as Error).message });
    }
  },

  toggleLibrary: (key) => {
    const cur = get().selectedLibraryKeys;
    set({
      selectedLibraryKeys: cur.includes(key)
        ? cur.filter((k) => k !== key)
        : [...cur, key],
    });
  },

  enterStudio: async () => {
    set({ phase: "studio", excluded: new Set() });
    await get().reloadItems();
  },

  reloadItems: async () => {
    const { baseUri, server, libraries, selectedLibraryKeys } = get();
    if (!baseUri || !server) return;
    set({ itemsLoading: true, error: null });
    try {
      const selected = libraries.filter((l) =>
        selectedLibraryKeys.includes(l.key),
      );
      const results = await Promise.all(
        selected.map((lib) =>
          fetchLibraryItems(baseUri, server.accessToken, lib),
        ),
      );
      set({ items: results.flat(), itemsLoading: false });
    } catch (e) {
      set({ itemsLoading: false, error: (e as Error).message });
    }
  },

  backToSetup: () => set({ phase: "setup" }),

  update: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },

  applyPreset: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },

  shuffle: () => {
    get().update({ seed: Math.floor(Math.random() * 1e9) });
  },

  toggleExcluded: (ratingKey) => {
    const next = new Set(get().excluded);
    if (next.has(ratingKey)) next.delete(ratingKey);
    else next.add(ratingKey);
    set({ excluded: next });
  },

  clearExcluded: () => set({ excluded: new Set() }),

  setError: (msg) => set({ error: msg }),
}));

/** Filter + sort + limit the library into the final poster list. */
export function selectCollageItems(
  items: PlexItem[],
  excluded: Set<string>,
  s: CollageSettings,
): PlexItem[] {
  let list = items.filter((it) => !excluded.has(it.ratingKey));
  if (s.genreFilter.length) {
    const wanted = new Set(s.genreFilter);
    list = list.filter((it) => it.genres.some((g) => wanted.has(g)));
  }
  if (s.yearMin != null) list = list.filter((it) => (it.year ?? 0) >= s.yearMin!);
  if (s.yearMax != null)
    list = list.filter((it) => (it.year ?? 9999) <= s.yearMax!);
  if (s.unwatchedOnly) {
    list = list.filter((it) =>
      it.type === "movie"
        ? !it.viewCount
        : (it.viewedLeafCount ?? 0) < (it.leafCount ?? 1),
    );
  }
  if (s.minRating > 0) {
    list = list.filter(
      (it) => (it.userRating ?? it.audienceRating ?? it.rating ?? 0) >= s.minRating,
    );
  }

  const rating = (it: PlexItem) =>
    it.userRating ?? it.audienceRating ?? it.rating ?? 0;
  switch (s.sort) {
    case "added":
      list = list.slice().sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
      break;
    case "lastViewed":
      list = list
        .filter((it) => it.lastViewedAt)
        .sort((a, b) => (b.lastViewedAt ?? 0) - (a.lastViewedAt ?? 0));
      break;
    case "rating":
      list = list.slice().sort((a, b) => rating(b) - rating(a));
      break;
    case "year":
      list = list.slice().sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      break;
    case "title":
      list = list.slice().sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "random": {
      // seeded shuffle keeps the collage stable until the user reshuffles
      const rng = mulberry32(s.seed);
      list = list
        .map((it) => ({ it, k: rng() }))
        .sort((a, b) => a.k - b.k)
        .map((x) => x.it);
      break;
    }
  }
  return list.slice(0, s.limit);
}
