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
npm run dev        # Next.js dev server on :3000
npm run test       # unit tests (vitest)
npm run typecheck  # tsc --noEmit
npm run build      # Next.js production build
npm run start      # serve the production build locally
```

## Local dev environment

Spaceforge runs end-to-end locally with no cloud dependencies. One-shot:

```bash
npm install
npm run dev:local:setup   # docker compose up -d + db:migrate + db:seed:dev
npm run dev:local         # Next.js on :3000 with AUTH_DRIVER=dev + FsBlobDriver
```

Open http://localhost:3000 — you're auto-signed in as the seeded dev
user and land on the dashboard. Create a site, edit it, etc.

Driver toggles (set via env, defaults shown):

- `AUTH_DRIVER=dev` — fixed fake user, no Clerk required. Set to
  `clerk` to use real auth (needs keys in `.env.local`).
- `BLOB_DRIVER=fs` — writes to `.spaceforge-local/blob/`. No network,
  no Docker, no token. Set to `vercel` for real Vercel Blob in
  preview/production.

Useful sub-scripts:

- `docker compose up -d` — just start Postgres.
- `npm run db:migrate` — apply Drizzle migrations.
- `npm run db:seed:dev` — ensure the dev user/team rows exist.
- `npm run db:studio` — browse the DB in Drizzle Studio.

## Environment variables

See `.env.example` for the canonical list. At minimum for the photo
proxy:

- `UNSPLASH_ACCESS_KEY` — your Unsplash app's **Access Key** (not the
  Secret Key).

Phase 1+ also needs `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`.

## Deploy

Next.js on Vercel. COOP/COEP headers (required for WebGPU) are set in
`next.config.ts`. Route handlers under `app/api/` are auto-deployed as
Vercel Functions (Fluid Compute).
