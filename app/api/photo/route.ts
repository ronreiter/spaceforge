import { fetchPhotoResponse, parsePhotoQuery } from '../../../src/lib/unsplashPhoto';

// Photo proxy: accepts ?q=<keywords>&seed=<n>&w=<w>&h=<h> and streams an
// Unsplash-sourced image. The access key stays server-side — browsers see
// only the image bytes.
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = parsePhotoQuery(url.searchParams);
  const key = process.env.UNSPLASH_ACCESS_KEY ?? '';
  return fetchPhotoResponse(q, key);
}
