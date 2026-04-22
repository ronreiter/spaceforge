import { fetchPhotoResponse, parsePhotoQuery } from '../src/lib/unsplashPhoto';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = parsePhotoQuery(url.searchParams);
  const key = process.env.UNSPLASH_ACCESS_KEY ?? '';
  return fetchPhotoResponse(q, key);
}
