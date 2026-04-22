import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { fetchPhotoResponse, parsePhotoQuery } from './src/lib/unsplashPhoto';

// Mirrors api/photo.ts during `vite dev`, reading the key from .env.local.
// Never expose the key to the client — only the dev server process touches it.
function photoProxyPlugin(accessKey: string): Plugin {
  return {
    name: 'spaceforge-photo-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/photo')) return next();
        try {
          const url = new URL(req.url, 'http://localhost');
          const response = await fetchPhotoResponse(
            parsePhotoQuery(url.searchParams),
            accessKey,
          );
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Readable.fromWeb(response.body as any).pipe(res);
          } else {
            res.end();
          }
        } catch (err) {
          res.statusCode = 500;
          res.end(err instanceof Error ? err.message : String(err));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const accessKey = env.UNSPLASH_ACCESS_KEY ?? '';
  return {
    plugins: [react(), photoProxyPlugin(accessKey)],
    optimizeDeps: {
      exclude: ['@huggingface/transformers'],
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  };
});
