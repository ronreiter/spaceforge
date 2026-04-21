# Spaceforge — Design

**Date:** 2026-04-21
**Status:** Draft, ready for implementation planning

## Summary

Spaceforge is an in-browser website builder. A user describes the site they
want in a chat pane; a small LLM running locally in the browser via WebGPU
emits HTML/CSS/JS files; a live browser-navigator pane renders and lets the
user click through the pages. All code lives in `localStorage` and is
editable in Monaco, downloadable per-file or as a `.zip`. No backend.

Reference point: <https://teamchong.github.io/turboquant-wasm/draw.html>,
which runs `onnx-community/gemma-4-E2B-it-ONNX` via transformers.js + WebGPU
to generate Excalidraw diagrams. Spaceforge reuses the same model-loading
pattern but generates multi-file websites instead of a single diagram.

## Goals

- One-shot: user describes a site, gets a working multi-page site back.
- Iterate: subsequent chat messages edit only the files that need changing.
- Everything local: no server, no API key, works offline after first model load.
- Source-editable: user can open any file in Monaco and edit by hand.
- Exportable: download any file or the whole site as `.zip`.
- Vercel-deployable as a static SPA.

## Non-goals (v1)

- Image / binary asset support (localStorage limits + model can't produce them).
- Multi-project switcher (single active site only; users archive by downloading).
- Undo / per-file history.
- TurboQuant KV-cache compression (long conversations truncate oldest turns).
- Monaco diff view, find-in-all-files.
- Mobile / Safari / Firefox support — desktop Chrome 134+ only, gated hard.

## Stack

- **Vite + React + TypeScript** SPA.
- **transformers.js** (`@huggingface/transformers`) for model inference with
  `device: 'webgpu'`.
- **Monaco Editor** via `@monaco-editor/react` for source editing.
- **JSZip** for the zip export.
- **No backend.** Vercel hosts the static build; model weights come straight
  from the Hugging Face CDN into the browser's Cache Storage.

## Architecture overview

Three top-level UI regions:

1. **Top bar** — app title, model selector, model status (`loading` /
   `ready` / `error`), current token speed indicator.
2. **Left pane (~380 px)** — chat: message history, prompt textarea, send
   button, inline status for the current generation.
3. **Right pane (flex)** — tab bar with two tabs:
   - **Preview** — fake-address-bar + back/forward/reload + sandboxed iframe.
   - **Source** — file tree + Monaco editor.

   Tab bar also hosts **Download .zip** and **Start fresh** buttons.

### Browser gate

On mount:

1. Check `'gpu' in navigator`.
2. `await navigator.gpu.requestAdapter()` and verify the adapter reports
   `shader-f16` and subgroups features — Gemma 4 needs them.

If either check fails, render a full-page block explaining "Desktop Chrome
134+ with WebGPU required" and do not mount the rest of the app. Users on
unsupported browsers must not be allowed to start a multi-GB model download.

### File storage

Single JSON blob in `localStorage["spaceforge:site"]`:

```ts
type SiteState = {
  files: Record<string, string>;     // relative path -> contents
  chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[];
  model: ModelId;                    // last-used model id
  createdAt: number;
  updatedAt: number;
};
```

Constraints:

- Paths are flat / single-level under the virtual site root.
  Allowed extensions: `.html .css .js .svg .json .txt .md`.
- Paths containing `..` or leading `/` are sanitized on write.
- LocalStorage (~5–10 MB/origin) is enough for text; images are disallowed.

Model selection also has its own key `localStorage["spaceforge:model"]` so
the choice is remembered even after "Start fresh".

## Generation loop

### Wire format (model output)

Each turn, the model emits a short plain-prose summary followed by zero or
more file blocks:

```
<short summary of what I'm changing>

===FILE: styles.css===
body { ... }
===END===

===FILE: about.html===
<!doctype html>...
===END===
```

- Prose above the first `===FILE:` becomes the chat bubble.
- Each `FILE/END` pair writes to `files[name]`.
- Files not mentioned stay untouched.

### Streaming parser

As tokens stream in via transformers.js `TextStreamer`, a state machine
tracks three states: `prose`, `file-header`, `file-body`. When an `===END===`
fires, the file is committed to React state and the iframe reloads if it is
showing in Preview. This gives progressive rendering — the user sees pages
appear as generation continues instead of waiting for the full turn.

### System prompt (per-model file)

Because the `===FILE/END===` protocol's reliability varies with model
family, each model gets its own tuned prompt file: `systemPrompt.gemma.ts`,
`systemPrompt.qwen.ts`, and so on. Common rules in every prompt:

- The site's current files and contents are injected in every turn.
- "Emit only files you need to change. Do not re-emit unchanged files."
- "Use relative paths between pages (`href=\"about.html\"`). No external
  JS frameworks."
- "Do not reference images unless the user uploaded one."
- Output format is strictly `===FILE: <path>===` / `===END===` blocks
  bracketed by a short prose summary.

### Errors and recovery

- **Truncated file (no `===END===`).** On stream end, if a file is still
  open, discard the partial content and show "Generation was cut off" in
  the chat bubble. User can retry.
- **Unsafe path.** Reject paths containing `..`; strip leading `/`; drop
  disallowed extensions with a chat warning.
- **Conversation too long for KV cache.** Truncate the oldest turns in the
  chat history (keeping the system prompt) until it fits.

## Right pane

### Preview tab

- **Iframe.** `<iframe sandbox="allow-scripts">` — no `allow-same-origin`
  and no `allow-top-navigation`, so scripts run in an opaque null origin
  and cannot touch spaceforge's `localStorage` / DOM.
- **Address bar.** Shows virtual URL `spaceforge://site/<path>`. User can
  type a path and press enter.
- **History.** In-memory stack (separate from the parent browser's history)
  powers back / forward / reload.

#### Link interception

Before writing a page's HTML into `srcdoc`, the parent injects a tiny
runtime script at the top of `<head>`:

```html
<script>
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (/^(https?:|mailto:|#)/.test(href)) return; // external / anchor
    e.preventDefault();
    parent.postMessage({ type: 'spaceforge:nav', href }, '*');
  }, true);
</script>
```

The parent listens for `spaceforge:nav`, resolves `href` against
`files`, and swaps `srcdoc`. Same-page anchor links (`#section`) pass
through. Form submits and `window.location = ...` are out of scope for v1.

#### Inlining local assets

Before writing `srcdoc`, the parent walks the DOM and inlines any
`<link rel="stylesheet" href="...">` and `<script src="...">` that refer to
local files. `https://...` references pass through untouched so users can
pull in fonts / CDN libraries.

### Source tab

- **File tree** (~200 px) on the left. Context menu: new file, rename,
  delete, download-single-file.
- **Monaco** on the right, full editing. Edits save back to `files` on
  change (debounced 500 ms). If Preview is visible, the iframe reloads on
  debounced save.

### Empty-site onboarding

When `files` is empty, Preview shows a centered prompt suggesting what to
type, plus a few suggestion chips in the chat pane (mirroring the reference
site's style).

## Model loading and selection

### Selector

A dropdown in the top bar, next to the status indicator. Each row shows
`name · size · downloaded|not downloaded`. Tooltip shows RAM requirement.
Switching models triggers a background download-and-init; already-cached
models swap instantly. The current choice persists in
`localStorage["spaceforge:model"]`.

### Lineup

| Tier     | Model                                  | Download | RAM  |
|----------|----------------------------------------|---------:|-----:|
| Default  | `onnx-community/gemma-4-E2B-it-ONNX`   | ~2.0 GB  | ~3 GB |
| Mid      | `onnx-community/gemma-4-E4B-it-ONNX`   | ~4.5 GB  | ~6 GB |
| Pro-code | `onnx-community/Qwen2.5-Coder-3B-Instruct-ONNX` | ~2.3 GB | ~4 GB |
| Heavy    | `onnx-community/Qwen2.5-Coder-7B-Instruct-ONNX` | ~5.5 GB | ~9 GB |

Sizes are approximate and depend on chosen dtype (`q4f16` is the default
target — best speed/size on WebGPU).

### Custom model ID

A text field "Custom model ID" lets power users paste any
`onnx-community/...` repo and try it. We show a warning ("this model may
not follow the `===FILE/END===` format") and fall back to the Gemma system
prompt.

### Adapter capability check

Before enabling heavier tiers we query the WebGPU adapter:
`limits.maxBufferSize`, `maxStorageBufferBindingSize`. If an adapter's
limits are below a tier's threshold, that row is disabled with a tooltip.

### First-run progress

`from_pretrained` receives a `progress_callback` that feeds a prominent
progress bar (downloaded MB / total MB). Chat input is disabled until
`ready`. After first load the model stays in Cache Storage — subsequent
sessions are instant.

## Export

- **Zip.** JSZip walks `files`, adds each at its path, triggers a blob
  download as `spaceforge-site-YYYYMMDD-HHMM.zip`.
- **Single file.** Right-click in the file tree → download as a single
  file blob.
- **Start fresh.** Confirms ("This wipes the current site and chat
  history. Download first?"), clears `localStorage["spaceforge:site"]`,
  resets React state. The model stays loaded.

## Deployment

- Standard Vite build (`pnpm build`).
- `vercel.json` with SPA rewrites (all paths → `index.html`).
- No server functions, no env vars, no secrets.

## Directory layout

```
spaceforge/
├── src/
│   ├── App.tsx                   # three-pane layout
│   ├── model/
│   │   ├── loader.ts             # gemma/qwen load + progress
│   │   ├── generate.ts           # streaming generate loop
│   │   ├── systemPrompt.gemma.ts
│   │   └── systemPrompt.qwen.ts
│   ├── storage/
│   │   ├── files.ts              # localStorage site read/write + sanitize
│   │   └── zip.ts                # JSZip export
│   ├── parser/
│   │   └── streamParser.ts       # ===FILE/END=== state machine
│   ├── ui/
│   │   ├── Chat.tsx
│   │   ├── Preview.tsx           # iframe + address bar + history
│   │   ├── Source.tsx            # file tree + Monaco
│   │   ├── ModelSelector.tsx
│   │   └── BrowserGate.tsx
│   └── runtime/
│       └── iframeRuntime.ts      # nav interception + local-asset inlining
├── public/
├── vercel.json
└── package.json
```

## Open risks worth naming

- **Small-model format compliance.** A 2B Gemma will sometimes ignore the
  `===FILE/END===` protocol. The streaming parser must fail gracefully
  (prose-only turn becomes a chat bubble; no files written). We'll tune
  the system prompt and keep a few-shot example in it.
- **KV cache pressure.** Long conversations eventually OOM the GPU.
  Oldest-first truncation is the v1 mitigation.
- **Iframe sandbox edge cases.** Some generated sites will use
  `window.location = ...` or form POSTs and will simply not navigate —
  we flag this in the system prompt and accept it as a v1 limitation.
- **Model availability.** Qwen Coder 7B ONNX builds may not always be
  present on the ONNX community mirror. If a selected model fails to
  load we fall back to Gemma 4 E2B and surface the error in the UI.
