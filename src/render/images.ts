import { posterUrl } from "../lib/plex";
import type { PlexItem } from "../lib/types";

const cache = new Map<string, Promise<HTMLImageElement>>();

function loadOne(url: string): Promise<HTMLImageElement> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`image failed: ${url}`));
      img.src = url;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** Pick a transcode width bucket so exports stay sharp without overfetching. */
export function widthBucket(tilePx: number): number {
  if (tilePx <= 220) return 240;
  if (tilePx <= 420) return 480;
  if (tilePx <= 760) return 800;
  return 1280;
}

export async function loadPosters(
  baseUri: string,
  token: string,
  items: PlexItem[],
  bucket: number,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, HTMLImageElement>> {
  const out = new Map<string, HTMLImageElement>();
  let done = 0;
  const total = items.length;
  const queue = items.slice();
  const CONCURRENCY = 12;

  async function worker() {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      if (item.thumb) {
        try {
          const img = await loadOne(
            posterUrl(baseUri, token, item.thumb, bucket),
          );
          out.set(item.ratingKey, img);
        } catch {
          // skip broken posters; the tile renders a placeholder instead
        }
      }
      done++;
      onProgress?.(done, total);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, total) }, worker),
  );
  return out;
}
