# AGENTS.md

Guide for coding agents working in the Spaceforge repo. Start here before making changes.

## What this project is

Spaceforge is a **browser-local website builder**. A small LLM (Gemma or Qwen, ONNX-quantized) runs entirely in desktop Chrome via WebGPU using `@huggingface/transformers`. The user chats; the model emits **Markdown content** plus **Nunjucks layouts/partials** (11ty conventions); a streaming parser writes them into `localStorage`; the right pane either previews the site in a sandboxed iframe, opens a Monaco editor, or shows the template selector. A single Vercel Edge function (`api/photo.ts`) proxies Unsplash server-side so the API key never hits the client. Everything else is static.

No backend model hosting. No bundler for the generated site. Flat file layout (no subdirectories). Markdown is rendered through its Nunjucks layout at preview time and at zip-export time.

## Tech stack

- React 19 + TypeScript + Vite 8
- Mantine v9 (UI), Tabler icons, Monaco editor
- `@huggingface/transformers` 4.x (WebGPU + ONNX)
- Pico.css (classless, injected at preview time — never written into user files)
- Nunjucks (in-memory templating — see "Templating")
- markdown-it + front-matter (11ty-style Markdown content pipeline)
- JSZip (zip export)
- Vitest + happy-dom (tests)
- Vercel (static + Edge function); COOP/COEP headers required for WebGPU

## Repo layout

```
src/
  App.tsx                  — root orchestrator: model load state machine, generation, tab switching
  main.tsx                 — React bootstrap + Mantine theme
  model/
    loader.ts              — transformers.js pipeline wrapper (text-generation, WebGPU)
    registry.ts            — catalog of Gemma + Qwen models with sizes, dtype, family
    generate.ts            — builds messages, runs generator, feeds tokens to StreamParser
    systemPrompt.gemma.ts  — system prompt for Gemma family
    systemPrompt.qwen.ts   — system prompt for Qwen family
  parser/
    streamParser.ts        — state-machine parser for ===FILE:/===END=== and markdown fallback
    stripCodeFences.ts     — strips leading/trailing ``` fences some models wrap files in
  runtime/
    iframeRuntime.ts       — renderPage(): inlines local css/js, injects nav runtime + framework styles
    nunjucksRender.ts      — in-memory Nunjucks env; MemoryLoader reads from the file map; outputPath(.md|.njk)→.html
    markdownRender.ts      — front-matter parse + markdown-it render + Nunjucks layout application
  storage/
    files.ts               — SiteState type (incl. templateId), load/save/write/delete against localStorage
    paths.ts               — sanitizePath (flat, no ..), isAllowedPath (extension whitelist incl. .md/.njk)
    zip.ts                 — buildZip + triggerDownload; renders .md & .njk pages through their layouts
  templates/
    registry.ts            — TEMPLATES list, overlayFiles(), isTemplateOwnedPath(), CUSTOM_TEMPLATE_ID
  lib/
    unsplashPhoto.ts       — shared photo-proxy logic used by both api/photo.ts and Vite dev middleware
  ui/
    TopBar.tsx, Chat.tsx, Preview.tsx, Source.tsx, Templates.tsx, ModelSelector.tsx, BrowserGate.tsx
api/
  photo.ts                 — Vercel Edge function: Unsplash proxy
tests/                     — Vitest; happy-dom for DOM-touching tests
vercel.json                — COOP/COEP headers + SPA rewrite
vite.config.ts             — photoProxyPlugin mirrors api/photo.ts during dev
Taskfile.yml               — wraps vercel CLI for deploys
```

## Generation flow (end-to-end)

1. User types a message in `Chat.tsx`.
2. `App.runPrompt()` builds the message list and calls `runGeneration()` (`src/model/generate.ts`).
3. System prompt is chosen by `model.family` (`gemma` vs `qwen`); the prompt injects the current file manifest so the model knows what already exists.
4. `generator.generate(messages, onToken, signal)` streams tokens into a `StreamParser`.
5. Parser emits events: `prose | file-start | file-chunk | file-end | file-truncated`.
6. App buffers file chunks, runs `stripCodeFences()` on `file-end`, then `writeFile(state, path, contents)` into localStorage.
7. Preview re-renders the iframe via `renderPage()` whenever files change.

## The file protocol (sacred)

The model emits files in delimited blocks. The parser accepts two formats:

**Canonical (preferred):**
```
===FILE: index.md===
<full file contents>
===END===
```

**Markdown fallback** (some models default to it):
~~~
### FILE: index.md
```markdown
<full file contents>
```
~~~

Rules enforced by the system prompt and storage layer:
- Flat paths only (no `/subdir/`). `sanitizePath()` strips directories.
- Whitelisted extensions only: `.html .css .js .svg .json .txt .md .njk`.
- **Every site must have `index.md`** as the entry point (strict after the 11ty pivot).
- In *Custom* template mode, the site must also include `_layout.njk`, `_header.njk`, `_footer.njk`, `styles.css`.
- The model should only re-emit files that changed — not the whole site each turn.

If you change the protocol, update **all three**: `streamParser.ts`, both `systemPrompt.*.ts` files, and the parser tests.

## 11ty-style content pipeline

**Content = Markdown.** Pages are `.md` files with YAML front matter:
```
---
layout: _layout.njk
title: About
---
# About
We bake bread every morning…
```

**Layouts = Nunjucks.** `_layout.njk` owns `<!DOCTYPE>`/`<head>`/`<body>`, includes partials, and injects the rendered markdown into `{{ content | safe }}`. Any filename starting with `_` is a partial — never rendered standalone.

**Rendering order** (`src/runtime/markdownRender.ts` → `renderMarkdownPage`):
1. `parseFrontMatter(src)` splits YAML from body.
2. `renderMarkdown(body)` → HTML string.
3. Pick the layout from `data.layout` (default `_layout.njk`).
4. Render the layout through Nunjucks with context `{ ...frontMatter, content, page: { path, url } }`.
5. If the layout is missing, fall back to a minimal wrapper doc with an inline note.

**`outputPath()`** in `nunjucksRender.ts` maps both `.md` → `.html` and `.njk` → `.html` — used by `resolveRoute()` (inter-page links) and the zip export.

## Templates

Bundled templates live in `src/templates/registry.ts` as `TemplateBundle[]`:
```ts
{ id, name, description, files: Record<string, string> }
```

A template "owns" a set of files (typically `_layout.njk`, `_header.njk`, `_footer.njk`, `styles.css`, optionally `scripts.js`). `SiteState.templateId` records the active selection.

**Overlay semantics (non-destructive):**
- `overlayFiles(siteFiles, templateId)` merges the template's files on top of the stored file map.
- At preview + zip-export, the overlayed map is what the renderer sees; generated files of the same name are **shadowed**.
- Source tab edits operate on the raw stored map — switching back to *Custom* re-exposes the generated files unchanged.

**V1 state:** the registry contains only the *Custom* entry (`CUSTOM_TEMPLATE_ID = 'custom'`, empty `files`). The Templates tab renders the single card plus a "coming soon" placeholder. To add a template in a later version: add an entry to `TEMPLATES` — no other wiring needed.

## Iframe preview (`src/runtime/iframeRuntime.ts`)

`renderPage(html, files)` does four things before handing the HTML to the iframe via `srcdoc`:

1. **Inline local assets** — `<link href="styles.css">` → `<style data-spaceforge-inlined="styles.css">…</style>`; same for `<script src="script.js">`. External URLs (`https://`, `data:`, `blob:`) are left alone.
2. **Inject navigation runtime** — intercepts `<a>` clicks, posts `{type: 'spaceforge:nav', href}` to the parent. Multi-page nav is simulated in React state; no real page loads.
3. **Inject framework styles** — Pico.css classless + base font CSS variables (`--sf-font-heading`, `--sf-font-body`).
4. **Inject fonts + Tabler icons** — Google Fonts (Inter, Playfair Display, Lora, Fraunces, Space Grotesk) + Tabler icons webfont.

All injections are marked with `data-spaceforge-*` attributes or the `/*spaceforge:nav-runtime*/` marker so we don't duplicate on re-render.

**Never write these into the generated files themselves** — they are preview-only. The zip export gets its own handling.

## Templating (Nunjucks, in-memory)

`src/runtime/nunjucksRender.ts` is a Nunjucks environment with a custom `MemoryLoader` that reads template sources from the `Record<string, string>` file map:

- `.njk` files are templates; `outputPath('index.njk')` → `'index.html'` (same mapping for `.md`).
- Files starting with `_` (e.g. `_layout.njk`, `_header.njk`) are partials, not rendered directly.
- Both preview and zip-export use the same environment — `renderTemplate(path, files, context)` for `.njk` pages, `renderMarkdownPage(path, files)` for `.md` pages.

Models trained on Jinja2/Python generalize to Nunjucks almost perfectly — keep the prompt examples Jinja-ish.

## Storage + paths

- `SiteState` is `{ files, chatHistory, model, createdAt, updatedAt }` — persisted under `localStorage['spaceforge:site']`.
- `writeFile()` always calls `sanitizePath` + `isAllowedPath` — do not bypass this. These are the only security boundary between model output and the browser's origin.
- `clearSite()` nukes everything; `App.tsx` exposes this as "Start fresh".

## Model system

- `src/model/registry.ts` lists 11 models across Gemma and Qwen families, each with `sizeGB`, `ramGB`, `dtype`, `family`. Default is Gemma E2B.
- `loadModel()` uses `pipeline('text-generation', id, { device: 'webgpu', dtype })`. Detects missing chat templates and fetches a sidecar `chat_template.jinja` if the repo has one.
- Progress is reported per-shard and aggregated in `App.tsx`.
- `model.family` (`'gemma' | 'qwen'`) selects the system prompt. Keep prompts in sync when changing output protocol.

## Dev / build / deploy

```bash
npm install
npm run dev        # Vite on :5173; photo proxy middleware reads UNSPLASH_ACCESS_KEY from .env.local
npm run test       # Vitest (happy-dom)
npm run typecheck  # tsc --noEmit
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build with COOP/COEP

task deploy:preview  # vercel deploy (requires vercel CLI)
task deploy          # vercel deploy --prod
```

**WebGPU requires COOP/COEP headers.** Set in both `vercel.json` and `vite.config.ts`. Breaking either breaks model loading in prod/dev respectively.

## Environment variables

- `UNSPLASH_ACCESS_KEY` — Unsplash **Access Key** (not the Secret). Used by `api/photo.ts` in prod and `photoProxyPlugin` in dev. Never exposed to the client. Copy `.env.example` → `.env.local` for local work; set in Vercel dashboard for prod.

## Conventions and gotchas

- **Do not add features "just in case."** This repo follows tight-scope additions — don't introduce abstractions, backwards-compat shims, or speculative helpers unless the task asks for them.
- **No subdirectories in generated sites** — flat paths only. If you're tempted to add nested paths, update `sanitizePath` with intent, the system prompts, and tests together.
- **Framework CSS/JS is preview-only.** Never write Pico or Google Fonts links into user files. They are injected by `iframeRuntime.ts`.
- **Keep system prompts tight.** Long prompts eat tokens that should go to file bodies, especially on small models. `<think>` blocks are capped to ~100 words in the prompt for a reason.
- **Parser must handle split markers across chunk boundaries.** Don't "simplify" `streamParser.ts` without running the incremental-chunk tests — the buffer holdback logic is load-bearing.
- **Test with happy-dom**, not JSDOM. Vitest config is set up accordingly.
- **Don't add a bundler for generated sites.** Spaceforge's value is that output is plain HTML/CSS/JS the user can drop anywhere.

## When making changes

- Touching the file protocol? Update `streamParser.ts`, both system prompts, and parser tests together.
- Touching preview injection? Check `iframeRuntime.test.ts` and that markers don't duplicate on re-render.
- Adding a model? Add to `model/registry.ts` with accurate `sizeGB`/`ramGB`/`dtype`, set `family`, and test that its chat template loads (some HF repos omit it).
- Adding a file extension? Update `paths.ts` allowlist AND the system prompts so the model knows it's usable.
- Adding a runtime asset (font, icon set)? Inject via `iframeRuntime.ts` with a `data-spaceforge-*` marker; do not pollute user files.
- Adding a pre-existing template? Add a `TemplateBundle` entry to `src/templates/registry.ts` with its `_layout.njk`, `_header.njk`, `_footer.njk`, `styles.css`, (optionally `scripts.js`). The Templates tab and the overlay logic pick it up automatically. Update the system prompts' manifest/template section if the new template needs special instructions to the model.

## What NOT to do

- Don't amend commits or force-push — create new commits.
- Don't introduce a framework (Next, Astro, etc.) to host the generated site. Static output is the product.
- Don't let the API key reach the client bundle under any circumstance. Photo access is always proxied.
- Don't ship changes that break COOP/COEP — you'll silently lose WebGPU.
