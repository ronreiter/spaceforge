# Spaceforge

A browser-local website builder. A small language model (Gemma 4 E2B by
default; larger Gemma and Qwen-Coder tiers available) runs in desktop
Chrome via WebGPU and writes your site's HTML/CSS/JS files into
`localStorage`. Preview the site in a sandboxed iframe, edit any file in
Monaco, download individual files or the whole site as a `.zip`.

No backend. No API keys. After the first multi-GB model download, it
all runs offline.

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
4. The right pane either renders the site in a sandboxed iframe (link
   clicks are intercepted and routed back through the parent) or shows
   the file tree + Monaco editor.

## Scripts

```bash
npm install
npm run dev        # local dev server
npm run test       # unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run preview    # serve the production build locally
```

## Deploy

Static build hosted on Vercel. COOP/COEP headers in `vercel.json` are
required for WebGPU in production.
