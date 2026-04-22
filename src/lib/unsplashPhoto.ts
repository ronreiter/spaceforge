// Shared logic for the photo proxy. Used by the Vercel Edge function in
// api/photo.ts (production) and the Vite dev middleware in vite.config.ts
// (local dev). The caller supplies the Unsplash access key — it is NEVER
// read from import.meta.env here, so the key stays out of the client bundle.

export type PhotoQuery = {
  query: string;
  seed?: string;
  width?: number;
  height?: number;
};

export type PhotoResult =
  | { kind: 'url'; url: string }
  | { kind: 'error'; status: number; message: string };

const MAX_RESULTS = 30;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function resolvePhoto(
  q: PhotoQuery,
  accessKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<PhotoResult> {
  const query = (q.query || '').trim();
  if (!query) return { kind: 'error', status: 400, message: 'missing q' };
  if (!accessKey) {
    return { kind: 'error', status: 500, message: 'UNSPLASH_ACCESS_KEY is not set' };
  }

  const apiUrl =
    `https://api.unsplash.com/search/photos?` +
    `query=${encodeURIComponent(query)}&per_page=${MAX_RESULTS}&orientation=landscape&content_filter=high`;

  const resp = await fetchFn(apiUrl, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  });
  if (!resp.ok) {
    return { kind: 'error', status: 502, message: `unsplash ${resp.status}` };
  }
  const data = (await resp.json()) as { results?: Array<{ urls?: { raw?: string } }> };
  const photos = data.results ?? [];
  if (photos.length === 0) {
    return { kind: 'error', status: 404, message: `no results for "${query}"` };
  }

  const pickIndex = q.seed ? hashSeed(q.seed) % photos.length : 0;
  const raw = photos[pickIndex]?.urls?.raw;
  if (!raw) {
    return { kind: 'error', status: 502, message: 'unsplash response missing urls.raw' };
  }

  const w = q.width ?? 1200;
  const h = q.height ?? 800;
  // Unsplash's raw URL supports imgix params for on-the-fly resizing.
  const dest = `${raw}&w=${w}&h=${h}&fit=crop&auto=format&q=80`;
  return { kind: 'url', url: dest };
}

// Fetch the resolved Unsplash image and return a Response the caller can
// hand straight back to the browser. Streams bytes so we never buffer the
// whole image, and sets CORP/CORS headers so COEP: require-corp pages
// (needed for WebGPU) don't block the load.
export async function fetchPhotoResponse(
  q: PhotoQuery,
  accessKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const resolved = await resolvePhoto(q, accessKey, fetchFn);
  if (resolved.kind === 'error') {
    return new Response(resolved.message, {
      status: resolved.status,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const img = await fetchFn(resolved.url);
  if (!img.ok || !img.body) {
    return new Response('upstream image fetch failed', { status: 502 });
  }
  const headers = new Headers();
  headers.set('content-type', img.headers.get('content-type') ?? 'image/jpeg');
  const len = img.headers.get('content-length');
  if (len) headers.set('content-length', len);
  headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
  headers.set('cross-origin-resource-policy', 'cross-origin');
  headers.set('access-control-allow-origin', '*');
  return new Response(img.body, { status: 200, headers });
}

export function parsePhotoQuery(params: URLSearchParams): PhotoQuery {
  return {
    query: params.get('q') ?? '',
    seed: params.get('seed') ?? undefined,
    width: params.get('w') ? Number(params.get('w')) : undefined,
    height: params.get('h') ? Number(params.get('h')) : undefined,
  };
}
