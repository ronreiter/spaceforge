# Spaceforge

A browser-local website builder. A small language model (Gemma 4 E2B by
default; larger Gemma and Qwen-Coder tiers available) runs in desktop
Chrome via WebGPU and writes your site's HTML/CSS/JS files into
`localStorage`. Preview the site in a sandboxed iframe, edit any file in
Monaco, download individual files or the whole site as a `.zip`.

No backend for the model itself. One tiny Vercel Edge function
(`api/photo.ts`) proxies Unsplash server-side so the API key never
reaches the client bundle. After the first multi-GB model download the
LLM runs entirely offline.

## Requirements

- Desktop Chrome 134+ with WebGPU (`shader-f16` feature).
- ~3 GB free RAM for the default model; more for larger tiers.
- ~2 GB of free disk space for the first-time model cache.

## How it works

1. **transformers.js** loads an ONNX-quantized Gemma/Qwen model via WebGPU.
2. Your chat messages are streamed through the model. The output uses a
   simple `===FILE: path===` / `===END===` protocol so the model emits
   whole files, not diffs.
3. A streaming parser writes each completed file into `localStorage`.
4. The site is authored in **11ty-style conventions**: Markdown pages
   (`index.md`, `about.md`) with YAML front matter, Nunjucks layouts
   and partials (`_layout.njk`, `_header.njk`, `_footer.njk`). The
   preview renders `.md` through its layout on the fly; the zip export
   bakes everything to `.html`.
5. Three tabs on the right:
   - **Preview** — sandboxed iframe; link clicks are intercepted and
     routed back through the parent.
   - **Source** — file tree + Monaco editor.
   - **Template** — swap between "Custom (AI-generated)" (default; the
     model writes its own layout + styles) and pre-existing template
     bundles that override those files. Overlay is non-destructive —
     switching back restores the generated files.

## Scripts

```bash
npm install
npm run dev        # local dev server
npm run test       # unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run preview    # serve the production build locally
```

## Environment variables

The photo proxy at `/api/photo` needs one env var:

- `UNSPLASH_ACCESS_KEY` — your Unsplash app's **Access Key** (not the
  Secret Key; the secret isn't used and should not be set).

For local dev, copy `.env.example` to `.env.local` and fill in the key.
Vite's dev server picks it up and uses it server-side via middleware in
`vite.config.ts`. In production, set the same var in the Vercel
dashboard → Project → Settings → Environment Variables.

## Deploy

Static build hosted on Vercel. COOP/COEP headers in `vercel.json` are
required for WebGPU in production. The `api/` folder is auto-deployed
as Vercel Edge functions.
