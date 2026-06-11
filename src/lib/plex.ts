import type {
  PlexConnection,
  PlexItem,
  PlexLibrary,
  PlexServer,
  PlexUser,
} from "./types";

export const PRODUCT = "Poster Studio";
const CID_KEY = "posterstudio.cid";

export function clientId(): string {
  let cid = localStorage.getItem(CID_KEY);
  if (!cid) {
    cid =
      crypto.randomUUID?.() ??
      `ps-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CID_KEY, cid);
  }
  return cid;
}

function plexTvParams(token?: string): string {
  const p = new URLSearchParams({
    "X-Plex-Product": PRODUCT,
    "X-Plex-Client-Identifier": clientId(),
    "X-Plex-Platform": "Web",
    "X-Plex-Device": "Browser",
  });
  if (token) p.set("X-Plex-Token", token);
  return p.toString();
}

const JSON_HEADERS = { Accept: "application/json" };

/** Thrown when Plex rejects the token (401/403) so the app can re-auth. */
export class AuthError extends Error {
  constructor(message = "Your Plex session expired. Please sign in again.") {
    super(message);
    this.name = "AuthError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch with a timeout, exponential-backoff retries for transient failures,
 * and typed auth errors. Auth failures (401/403) are never retried.
 */
async function apiFetch(
  url: string,
  opts: { timeoutMs?: number; retries?: number; method?: string } = {},
): Promise<Response> {
  const { timeoutMs = 12000, retries = 3, method = "GET" } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: JSON_HEADERS,
        signal: ctrl.signal,
      });
      if (res.status === 401 || res.status === 403) throw new AuthError();
      if (res.status >= 500 && attempt < retries) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      return res;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      lastErr = e;
      if (attempt < retries) await sleep(400 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Network request failed. Check your connection.");
}

export interface PlexPin {
  id: number;
  code: string;
}

export async function createPin(): Promise<PlexPin> {
  const res = await fetch(
    `https://plex.tv/api/v2/pins?strong=true&${plexTvParams()}`,
    { method: "POST", headers: JSON_HEADERS },
  );
  if (!res.ok) throw new Error(`Failed to create login PIN (${res.status})`);
  const data = await res.json();
  return { id: data.id, code: data.code };
}

export function authAppUrl(pin: PlexPin): string {
  const ctx = encodeURIComponent(PRODUCT);
  return (
    `https://app.plex.tv/auth#?clientID=${encodeURIComponent(clientId())}` +
    `&code=${encodeURIComponent(pin.code)}` +
    `&context%5Bdevice%5D%5Bproduct%5D=${ctx}`
  );
}

export async function checkPin(pin: PlexPin): Promise<string | null> {
  const res = await fetch(
    `https://plex.tv/api/v2/pins/${pin.id}?${plexTvParams()}`,
    { headers: JSON_HEADERS },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.authToken || null;
}

export async function fetchUser(token: string): Promise<PlexUser> {
  const res = await apiFetch(`https://plex.tv/api/v2/user?${plexTvParams(token)}`);
  if (!res.ok) throw new AuthError();
  return res.json();
}

export async function fetchServers(token: string): Promise<PlexServer[]> {
  const res = await apiFetch(
    `https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1&${plexTvParams(token)}`,
  );
  if (!res.ok) throw new Error(`Could not load your servers (${res.status})`);
  const data = await res.json();
  return (data as any[])
    .filter((r) => (r.provides || "").includes("server"))
    .map((r) => ({
      name: r.name,
      clientIdentifier: r.clientIdentifier,
      accessToken: r.accessToken,
      owned: !!r.owned,
      platform: r.platform,
      productVersion: r.productVersion,
      connections: (r.connections || []) as PlexConnection[],
    }));
}

async function testConnection(
  uri: string,
  token: string,
  timeoutMs: number,
): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${uri}/identity?X-Plex-Token=${token}`, {
      headers: JSON_HEADERS,
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Find the best reachable connection: prefer secure non-relay connections,
 * fall back to the relay. Direct candidates race in parallel.
 */
export async function resolveBaseUri(server: PlexServer): Promise<string> {
  const direct = server.connections.filter((c) => !c.relay);
  const relays = server.connections.filter((c) => c.relay);

  const winner = await new Promise<string | null>((resolve) => {
    let pending = direct.length;
    if (pending === 0) return resolve(null);
    let done = false;
    for (const c of direct) {
      testConnection(c.uri, server.accessToken, 6000).then((ok) => {
        if (ok && !done) {
          done = true;
          resolve(c.uri);
        } else if (--pending === 0 && !done) {
          resolve(null);
        }
      });
    }
  });
  if (winner) return winner;

  for (const c of relays) {
    if (await testConnection(c.uri, server.accessToken, 10000)) return c.uri;
  }
  throw new Error(`Could not reach "${server.name}" from this browser.`);
}

export async function fetchLibraries(
  baseUri: string,
  token: string,
): Promise<PlexLibrary[]> {
  const res = await apiFetch(`${baseUri}/library/sections?X-Plex-Token=${token}`);
  if (!res.ok) throw new Error(`Could not load libraries (${res.status})`);
  const data = await res.json();
  return ((data.MediaContainer?.Directory || []) as any[])
    .filter((d) => d.type === "movie" || d.type === "show")
    .map((d) => ({ key: String(d.key), title: d.title, type: d.type }));
}

const PAGE_SIZE = 400;
const MAX_ITEMS = 6000;

function parseMetadata(page: any[], library: PlexLibrary): PlexItem[] {
  const items: PlexItem[] = [];
  for (const m of page) {
    if (!m.thumb) continue;
    items.push({
      ratingKey: String(m.ratingKey),
      title: m.title,
      year: m.year,
      thumb: m.thumb,
      art: m.art,
      addedAt: m.addedAt,
      lastViewedAt: m.lastViewedAt,
      viewCount: m.viewCount,
      leafCount: m.leafCount,
      viewedLeafCount: m.viewedLeafCount,
      rating: m.rating,
      audienceRating: m.audienceRating,
      userRating: m.userRating,
      contentRating: m.contentRating,
      type: library.type,
      libraryKey: library.key,
      genres: ((m.Genre || []) as any[]).map((g) => g.tag).filter(Boolean),
    });
  }
  return items;
}

export async function fetchLibraryItems(
  baseUri: string,
  token: string,
  library: PlexLibrary,
): Promise<PlexItem[]> {
  const type = library.type === "movie" ? 1 : 2;

  async function fetchPage(start: number) {
    const url =
      `${baseUri}/library/sections/${library.key}/all?type=${type}` +
      `&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PAGE_SIZE}` +
      `&X-Plex-Token=${token}`;
    const res = await apiFetch(url, { timeoutMs: 20000 });
    if (!res.ok)
      throw new Error(`Could not load "${library.title}" (${res.status})`);
    const mc = (await res.json()).MediaContainer || {};
    return {
      metadata: (mc.Metadata || []) as any[],
      total: (mc.totalSize ?? mc.size ?? 0) as number,
    };
  }

  // First page tells us the total; the rest load in parallel.
  const first = await fetchPage(0);
  const items = parseMetadata(first.metadata, library);
  const total = Math.min(first.total || first.metadata.length, MAX_ITEMS);
  if (total > PAGE_SIZE) {
    const starts: number[] = [];
    for (let s = PAGE_SIZE; s < total; s += PAGE_SIZE) starts.push(s);
    const pages = await Promise.all(starts.map(fetchPage));
    for (const p of pages) items.push(...parseMetadata(p.metadata, library));
  }
  return items;
}

/** Poster image URL via the server's photo transcoder (CORS-friendly). */
export function posterUrl(
  baseUri: string,
  token: string,
  thumb: string,
  width: number,
): string {
  const height = Math.round(width * 1.5);
  return (
    `${baseUri}/photo/:/transcode?width=${width}&height=${height}` +
    `&minSize=1&upscale=1&url=${encodeURIComponent(thumb)}` +
    `&X-Plex-Token=${token}`
  );
}

export function avatarUrl(user: PlexUser): string {
  return user.thumb || "";
}
