# Spaceforge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-browser website builder where a local WebGPU LLM (Gemma 4 E2B by default, with larger Gemma/Qwen-Coder options) generates multi-page HTML/CSS/JS sites, files live in localStorage, and the user previews them in a sandboxed iframe navigator.

**Architecture:** Vite + React + TypeScript SPA. transformers.js loads ONNX models over WebGPU and streams tokens into a `===FILE/END===` parser that writes files into localStorage. A sandboxed iframe with a fake address bar renders the site; link clicks are intercepted via `postMessage`. Monaco edits files in-place. JSZip exports. No backend.

**Tech Stack:** Vite, React 18, TypeScript, `@huggingface/transformers`, `@monaco-editor/react`, JSZip, Vitest + happy-dom.

---

## Reference spec

Spec lives at `docs/superpowers/specs/2026-04-21-spaceforge-design.md`. Re-read it before starting — tasks below assume that context.

## File structure produced by this plan

```
spaceforge/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── vercel.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── model/
│   │   ├── registry.ts
│   │   ├── loader.ts
│   │   ├── generate.ts
│   │   ├── systemPrompt.gemma.ts
│   │   └── systemPrompt.qwen.ts
│   ├── parser/
│   │   └── streamParser.ts
│   ├── storage/
│   │   ├── paths.ts
│   │   ├── files.ts
│   │   └── zip.ts
│   ├── runtime/
│   │   └── iframeRuntime.ts
│   └── ui/
│       ├── BrowserGate.tsx
│       ├── Chat.tsx
│       ├── Preview.tsx
│       ├── Source.tsx
│       ├── ModelSelector.tsx
│       └── TopBar.tsx
└── tests/
    ├── paths.test.ts
    ├── files.test.ts
    ├── streamParser.test.ts
    ├── iframeRuntime.test.ts
    └── zip.test.ts
```

---

## Task 1: Project bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore`

- [ ] **Step 1: Initialize git and scaffold Vite React-TS project**

```bash
cd /Users/ronreiter/GitHub/spaceforge
git init
pnpm create vite@latest . --template react-ts --yes 2>/dev/null || npm create vite@latest . -- --template react-ts --yes
```

If the scaffold command complains the directory isn't empty, use this manual scaffold instead:

`package.json`:
```json
{
  "name": "spaceforge",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add react react-dom @huggingface/transformers @monaco-editor/react monaco-editor jszip
pnpm add -D typescript @types/react @types/react-dom @types/node vite @vitejs/plugin-react vitest happy-dom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    headers: {
      // Required for transformers.js WebGPU + cross-origin isolation
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
dist
.vercel
.DS_Store
*.log
```

- [ ] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spaceforge — browser-local website builder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `src/main.tsx` and a stub `src/App.tsx`**

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

`src/App.tsx`:
```tsx
export default function App() {
  return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Spaceforge bootstrap</div>;
}
```

- [ ] **Step 8: Verify dev server boots**

Run: `pnpm dev` in a separate shell, browse to http://localhost:5173.
Expected: "Spaceforge bootstrap" text renders.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: bootstrap vite + react + ts project"
```

---

## Task 2: Vitest setup

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/smoke.test.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 2: Write `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Write `tests/smoke.test.ts` (failing → passing to prove setup works)**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs a test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: vitest + happy-dom setup"
```

---

## Task 3: Path sanitization (pure logic, TDD)

**Files:**
- Create: `src/storage/paths.ts`
- Test: `tests/paths.test.ts`

Constraint from spec: paths are flat/single-level, no `..`, no leading `/`, allowed extensions `.html .css .js .svg .json .txt .md`.

- [ ] **Step 1: Write failing tests**

`tests/paths.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sanitizePath, isAllowedPath } from '../src/storage/paths';

describe('sanitizePath', () => {
  it('strips leading slashes', () => {
    expect(sanitizePath('/index.html')).toBe('index.html');
  });
  it('rejects parent references', () => {
    expect(sanitizePath('../secret.html')).toBeNull();
    expect(sanitizePath('foo/../bar.html')).toBeNull();
  });
  it('flattens nested paths to basename', () => {
    expect(sanitizePath('pages/about.html')).toBe('about.html');
  });
  it('trims whitespace', () => {
    expect(sanitizePath('  index.html  ')).toBe('index.html');
  });
  it('returns null for empty input', () => {
    expect(sanitizePath('')).toBeNull();
    expect(sanitizePath('   ')).toBeNull();
  });
});

describe('isAllowedPath', () => {
  it.each([
    ['index.html', true],
    ['styles.css', true],
    ['script.js', true],
    ['logo.svg', true],
    ['data.json', true],
    ['notes.md', true],
    ['readme.txt', true],
    ['hack.php', false],
    ['photo.jpg', false],
    ['no-ext', false],
  ])('%s -> %s', (path, expected) => {
    expect(isAllowedPath(path)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

Run: `pnpm test paths`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/storage/paths.ts`**

```ts
const ALLOWED_EXT = new Set(['.html', '.css', '.js', '.svg', '.json', '.txt', '.md']);

export function sanitizePath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('..')) return null;
  const stripped = trimmed.replace(/^\/+/, '');
  const segments = stripped.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  const base = segments[segments.length - 1];
  return base;
}

export function isAllowedPath(path: string): boolean {
  const dot = path.lastIndexOf('.');
  if (dot <= 0) return false;
  const ext = path.slice(dot).toLowerCase();
  return ALLOWED_EXT.has(ext);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test paths`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(storage): path sanitization + extension allowlist"
```

---

## Task 4: Site state + localStorage layer (TDD)

**Files:**
- Create: `src/storage/files.ts`
- Test: `tests/files.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/files.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSite, saveSite, writeFile, deleteFile, emptySite, type SiteState } from '../src/storage/files';

beforeEach(() => localStorage.clear());

describe('loadSite / saveSite', () => {
  it('loads empty site when nothing stored', () => {
    const s = loadSite();
    expect(s.files).toEqual({});
    expect(s.chatHistory).toEqual([]);
  });
  it('round-trips a saved site', () => {
    const s: SiteState = {
      ...emptySite(),
      files: { 'index.html': '<p>hi</p>' },
      chatHistory: [{ role: 'user', content: 'hello' }],
    };
    saveSite(s);
    const loaded = loadSite();
    expect(loaded.files['index.html']).toBe('<p>hi</p>');
    expect(loaded.chatHistory).toEqual([{ role: 'user', content: 'hello' }]);
  });
});

describe('writeFile', () => {
  it('writes sanitized paths', () => {
    const s = emptySite();
    const next = writeFile(s, '/foo/bar.html', '<p>hi</p>');
    expect(next.files['bar.html']).toBe('<p>hi</p>');
  });
  it('rejects disallowed extensions', () => {
    const s = emptySite();
    expect(() => writeFile(s, 'evil.php', '<?php')).toThrow(/extension/);
  });
  it('rejects parent-references', () => {
    const s = emptySite();
    expect(() => writeFile(s, '../x.html', '')).toThrow(/invalid/i);
  });
  it('updates updatedAt', () => {
    const s = emptySite();
    const next = writeFile(s, 'index.html', 'hi');
    expect(next.updatedAt).toBeGreaterThanOrEqual(s.updatedAt);
  });
});

describe('deleteFile', () => {
  it('removes a file', () => {
    const s = writeFile(emptySite(), 'a.html', 'a');
    const next = deleteFile(s, 'a.html');
    expect(next.files['a.html']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

Run: `pnpm test files`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/storage/files.ts`**

```ts
import { sanitizePath, isAllowedPath } from './paths';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export type SiteState = {
  files: Record<string, string>;
  chatHistory: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
};

const KEY = 'spaceforge:site';

export function emptySite(): SiteState {
  const now = Date.now();
  return { files: {}, chatHistory: [], model: '', createdAt: now, updatedAt: now };
}

export function loadSite(): SiteState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return emptySite();
  try {
    const parsed = JSON.parse(raw) as SiteState;
    return { ...emptySite(), ...parsed };
  } catch {
    return emptySite();
  }
}

export function saveSite(state: SiteState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function writeFile(state: SiteState, rawPath: string, contents: string): SiteState {
  const path = sanitizePath(rawPath);
  if (!path) throw new Error(`invalid path: ${rawPath}`);
  if (!isAllowedPath(path)) throw new Error(`extension not allowed: ${path}`);
  return {
    ...state,
    files: { ...state.files, [path]: contents },
    updatedAt: Date.now(),
  };
}

export function deleteFile(state: SiteState, path: string): SiteState {
  if (!(path in state.files)) return state;
  const { [path]: _, ...rest } = state.files;
  return { ...state, files: rest, updatedAt: Date.now() };
}

export function clearSite(): void {
  localStorage.removeItem(KEY);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test files`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(storage): site state + localStorage persistence"
```

---

## Task 5: Streaming parser (TDD)

**Files:**
- Create: `src/parser/streamParser.ts`
- Test: `tests/streamParser.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/streamParser.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { StreamParser, type ParserEvent } from '../src/parser/streamParser';

function collect(chunks: string[]): ParserEvent[] {
  const events: ParserEvent[] = [];
  const p = new StreamParser((e) => events.push(e));
  for (const c of chunks) p.feed(c);
  p.end();
  return events;
}

describe('StreamParser', () => {
  it('emits prose only when no file blocks', () => {
    expect(collect(['hello world'])).toEqual([
      { type: 'prose', text: 'hello world' },
    ]);
  });

  it('emits a file block in one chunk', () => {
    const ev = collect(['say hi\n\n===FILE: index.html===\n<p>hi</p>\n===END===\n']);
    expect(ev).toEqual([
      { type: 'prose', text: 'say hi\n\n' },
      { type: 'file-start', path: 'index.html' },
      { type: 'file-chunk', path: 'index.html', text: '<p>hi</p>\n' },
      { type: 'file-end', path: 'index.html' },
    ]);
  });

  it('emits file chunks incrementally across chunks', () => {
    const ev = collect([
      '===FILE: a.html===\n',
      '<p>he',
      'llo</p>',
      '\n===END===',
    ]);
    expect(ev).toEqual([
      { type: 'file-start', path: 'a.html' },
      { type: 'file-chunk', path: 'a.html', text: '<p>he' },
      { type: 'file-chunk', path: 'a.html', text: 'llo</p>' },
      { type: 'file-end', path: 'a.html' },
    ]);
  });

  it('handles multiple files in one stream', () => {
    const ev = collect([
      '===FILE: a.html===\naaa\n===END===\n',
      '===FILE: b.css===\nbbb\n===END===\n',
    ]);
    expect(ev.filter((e) => e.type === 'file-start').length).toBe(2);
    expect(ev.filter((e) => e.type === 'file-end').length).toBe(2);
  });

  it('emits file-truncated when stream ends mid-file', () => {
    const ev = collect(['===FILE: x.html===\npartial conte']);
    expect(ev.some((e) => e.type === 'file-truncated' && e.path === 'x.html')).toBe(true);
  });

  it('splits markers across chunk boundaries', () => {
    const ev = collect(['===FI', 'LE: a.html', '===\nhi\n===', 'END===']);
    expect(ev.find((e) => e.type === 'file-start')).toEqual({ type: 'file-start', path: 'a.html' });
    expect(ev.find((e) => e.type === 'file-end')).toEqual({ type: 'file-end', path: 'a.html' });
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

Run: `pnpm test streamParser`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/parser/streamParser.ts`**

```ts
export type ParserEvent =
  | { type: 'prose'; text: string }
  | { type: 'file-start'; path: string }
  | { type: 'file-chunk'; path: string; text: string }
  | { type: 'file-end'; path: string }
  | { type: 'file-truncated'; path: string };

const FILE_START_RE = /===FILE:\s*([^\s=]+)\s*===\n?/;
const FILE_END = '===END===';
const START_PARTIAL_PREFIX = '===FILE:'; // worst-case holdback length
const END_PARTIAL_PREFIX = '===END===';

export class StreamParser {
  private buffer = '';
  private inFile: string | null = null;

  constructor(private emit: (ev: ParserEvent) => void) {}

  feed(chunk: string): void {
    this.buffer += chunk;
    while (this.step()) {
      /* loop until no more events can be emitted from buffer */
    }
  }

  end(): void {
    if (this.inFile === null) {
      if (this.buffer) this.emit({ type: 'prose', text: this.buffer });
    } else {
      this.emit({ type: 'file-truncated', path: this.inFile });
    }
    this.buffer = '';
    this.inFile = null;
  }

  private step(): boolean {
    if (this.inFile === null) {
      const m = this.buffer.match(FILE_START_RE);
      if (!m) {
        // Emit prose up to safe holdback (length of START_PARTIAL_PREFIX).
        const safeEnd = Math.max(0, this.buffer.length - START_PARTIAL_PREFIX.length);
        if (safeEnd > 0) {
          const head = this.buffer.slice(0, safeEnd);
          this.buffer = this.buffer.slice(safeEnd);
          this.emit({ type: 'prose', text: head });
        }
        return false;
      }
      const idx = m.index!;
      if (idx > 0) this.emit({ type: 'prose', text: this.buffer.slice(0, idx) });
      const path = m[1];
      this.inFile = path;
      this.emit({ type: 'file-start', path });
      this.buffer = this.buffer.slice(idx + m[0].length);
      return true;
    } else {
      const idx = this.buffer.indexOf(FILE_END);
      if (idx === -1) {
        // Emit body up to safe holdback.
        const safeEnd = Math.max(0, this.buffer.length - END_PARTIAL_PREFIX.length);
        if (safeEnd > 0) {
          const body = this.buffer.slice(0, safeEnd);
          this.buffer = this.buffer.slice(safeEnd);
          this.emit({ type: 'file-chunk', path: this.inFile, text: body });
        }
        return false;
      }
      const body = this.buffer.slice(0, idx);
      if (body) this.emit({ type: 'file-chunk', path: this.inFile, text: body });
      this.emit({ type: 'file-end', path: this.inFile });
      this.inFile = null;
      this.buffer = this.buffer.slice(idx + FILE_END.length);
      return true;
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test streamParser`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(parser): streaming ===FILE/END=== state machine"
```

---

## Task 6: Iframe runtime (link interception + local-asset inlining, TDD)

**Files:**
- Create: `src/runtime/iframeRuntime.ts`
- Test: `tests/iframeRuntime.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/iframeRuntime.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderPage, NAV_RUNTIME_MARKER } from '../src/runtime/iframeRuntime';

const files = {
  'index.html': '<!doctype html><html><head><link rel="stylesheet" href="styles.css"><script src="script.js"></script></head><body><a href="about.html">About</a></body></html>',
  'styles.css': 'body { color: teal; }',
  'script.js': 'console.log("hi");',
  'about.html': '<!doctype html><html><body>About</body></html>',
};

describe('renderPage', () => {
  it('injects nav runtime marker in head', () => {
    const out = renderPage('<!doctype html><html><head></head><body></body></html>', files);
    expect(out).toContain(NAV_RUNTIME_MARKER);
  });

  it('inlines local stylesheet references', () => {
    const out = renderPage(files['index.html'], files);
    expect(out).toContain('body { color: teal; }');
    expect(out).not.toMatch(/<link[^>]+href=["']styles\.css["']/);
  });

  it('inlines local script references', () => {
    const out = renderPage(files['index.html'], files);
    expect(out).toContain('console.log("hi");');
    expect(out).not.toMatch(/<script[^>]+src=["']script\.js["']/);
  });

  it('leaves external http(s) references intact', () => {
    const html = '<html><head><link rel="stylesheet" href="https://example.com/x.css"><script src="https://example.com/x.js"></script></head><body></body></html>';
    const out = renderPage(html, files);
    expect(out).toContain('https://example.com/x.css');
    expect(out).toContain('https://example.com/x.js');
  });

  it('preserves anchor links', () => {
    const out = renderPage(files['index.html'], files);
    expect(out).toContain('href="about.html"');
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

Run: `pnpm test iframeRuntime`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/runtime/iframeRuntime.ts`**

```ts
export const NAV_RUNTIME_MARKER = '/*spaceforge:nav-runtime*/';

const NAV_RUNTIME_SCRIPT = `
<script>${NAV_RUNTIME_MARKER}
(function(){
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href) return;
    if (/^(https?:|mailto:|tel:|#)/.test(href)) return;
    e.preventDefault();
    try { parent.postMessage({ type: 'spaceforge:nav', href: href }, '*'); } catch(_){}
  }, true);
})();
</script>
`.trim();

function isLocalRef(href: string): boolean {
  if (!href) return false;
  return !/^(https?:|data:|mailto:|tel:|\/\/)/.test(href);
}

export function renderPage(html: string, files: Record<string, string>): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Inline local <link rel="stylesheet">.
  doc.querySelectorAll('link[rel="stylesheet"][href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!isLocalRef(href)) return;
    const content = files[href.replace(/^\.?\/?/, '')];
    if (content === undefined) return;
    const style = doc.createElement('style');
    style.setAttribute('data-spaceforge-inlined', href);
    style.textContent = content;
    link.replaceWith(style);
  });

  // Inline local <script src>.
  doc.querySelectorAll('script[src]').forEach((script) => {
    const src = script.getAttribute('src') || '';
    if (!isLocalRef(src)) return;
    const content = files[src.replace(/^\.?\/?/, '')];
    if (content === undefined) return;
    const s = doc.createElement('script');
    s.setAttribute('data-spaceforge-inlined', src);
    // Preserve type attr if set (e.g., module).
    const type = script.getAttribute('type');
    if (type) s.setAttribute('type', type);
    s.textContent = content;
    script.replaceWith(s);
  });

  // Inject nav runtime at top of <head>.
  const head = doc.head ?? doc.documentElement;
  const runtimeFragment = new DOMParser().parseFromString(NAV_RUNTIME_SCRIPT, 'text/html');
  const runtimeScript = runtimeFragment.querySelector('script');
  if (runtimeScript) head.insertBefore(runtimeScript, head.firstChild);

  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test iframeRuntime`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(runtime): iframe asset inlining + link interception"
```

---

## Task 7: Zip export (TDD)

**Files:**
- Create: `src/storage/zip.ts`
- Test: `tests/zip.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/zip.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildZip } from '../src/storage/zip';

describe('buildZip', () => {
  it('produces a zip containing every file', async () => {
    const blob = await buildZip({ 'index.html': '<p>a</p>', 'styles.css': 'body{}' });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(['index.html', 'styles.css']);
    expect(await zip.files['index.html'].async('string')).toBe('<p>a</p>');
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pnpm test zip`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/storage/zip.ts`**

```ts
import JSZip from 'jszip';

export async function buildZip(files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: 'blob' });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test zip`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(storage): zip export + download helper"
```

---

## Task 8: Model registry + system prompts

**Files:**
- Create: `src/model/registry.ts`, `src/model/systemPrompt.gemma.ts`, `src/model/systemPrompt.qwen.ts`

Registry lists the available models, their labels, sizes, RAM tiers, and which system-prompt family they use. It is the single source of truth consumed by the selector UI and the loader.

- [ ] **Step 1: Write `src/model/registry.ts`**

```ts
export type PromptFamily = 'gemma' | 'qwen';

export type ModelEntry = {
  id: string;                 // HF repo id, e.g. 'onnx-community/gemma-4-E2B-it-ONNX'
  label: string;              // human-readable
  sizeGB: number;             // approx download
  ramGB: number;              // approx peak RAM
  dtype: 'q4f16' | 'fp16' | 'q4';
  family: PromptFamily;
};

export const MODELS: ModelEntry[] = [
  {
    id: 'onnx-community/gemma-4-E2B-it-ONNX',
    label: 'Gemma 4 E2B (default)',
    sizeGB: 2.0, ramGB: 3, dtype: 'q4f16', family: 'gemma',
  },
  {
    id: 'onnx-community/gemma-4-E4B-it-ONNX',
    label: 'Gemma 4 E4B',
    sizeGB: 4.5, ramGB: 6, dtype: 'q4f16', family: 'gemma',
  },
  {
    id: 'onnx-community/Qwen2.5-Coder-3B-Instruct-ONNX',
    label: 'Qwen 2.5 Coder 3B',
    sizeGB: 2.3, ramGB: 4, dtype: 'q4f16', family: 'qwen',
  },
  {
    id: 'onnx-community/Qwen2.5-Coder-7B-Instruct-ONNX',
    label: 'Qwen 2.5 Coder 7B',
    sizeGB: 5.5, ramGB: 9, dtype: 'q4f16', family: 'qwen',
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;
export const MODEL_STORAGE_KEY = 'spaceforge:model';

export function getModel(id: string): ModelEntry | undefined {
  return MODELS.find((m) => m.id === id);
}
```

- [ ] **Step 2: Write `src/model/systemPrompt.gemma.ts`**

```ts
import type { SiteState } from '../storage/files';

export function buildGemmaSystemPrompt(state: SiteState): string {
  const manifest = Object.keys(state.files).sort().join('\n') || '(no files yet)';
  return `You are Spaceforge, a website builder running locally in the user's browser. The user describes a website; you emit the files that make it real.

RULES:
- Produce only static HTML, CSS, and JS. No frameworks, no bundlers.
- Pages link to each other with relative anchors, e.g. <a href="about.html">.
- Do not reference images unless the user uploaded them. Use CSS or SVG for visuals.
- When you change the site, emit ONLY the files that change, inside delimited blocks:

<short prose summary of what you are changing>

===FILE: <path>===
<full file contents>
===END===

- Repeat the FILE/END block for each file you want to write.
- Do not re-emit files you did not change.
- Every site must contain an index.html as the entry point.
- Keep file paths flat (e.g. index.html, styles.css, about.html). No directories.

CURRENT SITE FILES:
${manifest}
`;
}
```

- [ ] **Step 3: Write `src/model/systemPrompt.qwen.ts`**

```ts
import type { SiteState } from '../storage/files';

export function buildQwenSystemPrompt(state: SiteState): string {
  const manifest = Object.keys(state.files).sort().join('\n') || '(no files yet)';
  return `You are Spaceforge, a website builder that runs entirely in the user's browser. Your job is to write static HTML, CSS, and JavaScript files that render a multi-page site.

STRICT OUTPUT PROTOCOL:
1. Start with one short prose paragraph describing what you are changing (max 2 sentences).
2. Then emit one or more file blocks, each exactly in this format:

===FILE: <relative-path>===
<complete file contents>
===END===

3. Only emit files that changed. Every site must contain an index.html entry point. Paths are flat (no subdirectories).
4. Do not wrap the protocol in backticks or Markdown. Do not add commentary between file blocks.
5. Use relative anchor links (<a href="about.html">) for inter-page navigation. No frameworks, no external JS.

CURRENT SITE FILES:
${manifest}

Write idiomatic, clean HTML5 and modern CSS. Prefer semantic tags.`;
}
```

- [ ] **Step 4: Verify tsc compiles**

Run: `pnpm build`
Expected: build succeeds (no type errors). If the app shell chokes on unused imports, skip the build and run `pnpm tsc --noEmit` instead.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(model): model registry + per-family system prompts"
```

---

## Task 9: Model loader (transformers.js wrapper)

**Files:**
- Create: `src/model/loader.ts`

No unit test — this is a thin wrapper around an external library and is best verified in the browser end-to-end. Task 19 covers manual verification.

- [ ] **Step 1: Write `src/model/loader.ts`**

```ts
import { pipeline, TextStreamer, env } from '@huggingface/transformers';
import type { ModelEntry } from './registry';

// Force remote-only — no local model server.
env.allowLocalModels = false;

export type ProgressInfo = {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  file?: string;
  loaded?: number;
  total?: number;
};

export type Generator = {
  generate: (
    messages: { role: string; content: string }[],
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
};

export async function loadModel(
  model: ModelEntry,
  onProgress: (p: ProgressInfo) => void,
): Promise<Generator> {
  const generator = await pipeline('text-generation', model.id, {
    device: 'webgpu',
    dtype: model.dtype,
    progress_callback: (p: ProgressInfo) => onProgress(p),
  });

  return {
    async generate(messages, onToken, signal) {
      const streamer = new TextStreamer((generator as any).tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => onToken(text),
      });

      await (generator as any)(messages, {
        max_new_tokens: 4096,
        do_sample: true,
        temperature: 0.6,
        top_p: 0.9,
        streamer,
        // AbortSignal support depends on transformers.js version; best-effort.
        signal,
      });
    },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: passes. If transformers.js types complain, cast with `as any` as above — the library's TS types are in flux.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(model): transformers.js loader with webgpu + streaming"
```

---

## Task 10: Generation orchestrator

**Files:**
- Create: `src/model/generate.ts`

Wires loader + parser + storage + React-state callbacks. No unit test — complex async orchestration, easiest to verify live.

- [ ] **Step 1: Write `src/model/generate.ts`**

```ts
import { StreamParser, type ParserEvent } from '../parser/streamParser';
import type { Generator } from './loader';
import { buildGemmaSystemPrompt } from './systemPrompt.gemma';
import { buildQwenSystemPrompt } from './systemPrompt.qwen';
import type { ModelEntry } from './registry';
import type { SiteState, ChatMessage } from '../storage/files';

export type GenerateHandlers = {
  onProse: (chunk: string) => void;         // appended to current assistant message
  onFileStart: (path: string) => void;
  onFileChunk: (path: string, text: string) => void;
  onFileEnd: (path: string) => void;
  onFileTruncated: (path: string) => void;
  onComplete: () => void;
  onError: (err: Error) => void;
};

export async function runGeneration(
  generator: Generator,
  model: ModelEntry,
  state: SiteState,
  userMessage: string,
  handlers: GenerateHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const systemPrompt =
    model.family === 'gemma' ? buildGemmaSystemPrompt(state) : buildQwenSystemPrompt(state);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...state.chatHistory,
    { role: 'user', content: userMessage },
  ];

  const parser = new StreamParser((e: ParserEvent) => {
    switch (e.type) {
      case 'prose': handlers.onProse(e.text); break;
      case 'file-start': handlers.onFileStart(e.path); break;
      case 'file-chunk': handlers.onFileChunk(e.path, e.text); break;
      case 'file-end': handlers.onFileEnd(e.path); break;
      case 'file-truncated': handlers.onFileTruncated(e.path); break;
    }
  });

  try {
    await generator.generate(messages, (token) => parser.feed(token), signal);
    parser.end();
    handlers.onComplete();
  } catch (err) {
    handlers.onError(err as Error);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(model): generation orchestrator wiring parser to generator"
```

---

## Task 11: Browser-gate component

**Files:**
- Create: `src/ui/BrowserGate.tsx`

- [ ] **Step 1: Write `src/ui/BrowserGate.tsx`**

```tsx
import { useEffect, useState } from 'react';

type GateState = 'checking' | 'ok' | 'no-webgpu' | 'no-features';

export function BrowserGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    (async () => {
      if (!('gpu' in navigator)) { setState('no-webgpu'); return; }
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) { setState('no-webgpu'); return; }
        const hasF16 = adapter.features?.has?.('shader-f16') ?? false;
        const hasSubgroups = adapter.features?.has?.('subgroups') ?? true; // may not report in all browsers
        if (!hasF16 || !hasSubgroups) { setState('no-features'); return; }
        setState('ok');
      } catch {
        setState('no-webgpu');
      }
    })();
  }, []);

  if (state === 'checking') {
    return <div style={center}>Checking browser support…</div>;
  }

  if (state !== 'ok') {
    return (
      <div style={{ ...center, flexDirection: 'column', padding: 32, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 16 }}>Desktop Chrome 134+ required</h1>
        <p style={{ color: '#7d8590', marginBottom: 16 }}>
          Spaceforge runs a multi-gigabyte language model locally via WebGPU with
          the <code>shader-f16</code> and <code>subgroups</code> features. Safari,
          mobile browsers, and older Chromes don't expose these yet.
        </p>
        <p style={{ color: '#7d8590' }}>
          Please re-open this page in desktop Chrome 134 or newer.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

const center: React.CSSProperties = {
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#e6edf3',
  background: '#0d1117',
  fontFamily: 'system-ui, sans-serif',
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): WebGPU browser gate"
```

---

## Task 12: Chat UI component

**Files:**
- Create: `src/ui/Chat.tsx`

This is a presentational component. Parent owns the conversation state and generation lifecycle; Chat just renders messages and captures input.

- [ ] **Step 1: Write `src/ui/Chat.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../storage/files';

export type ChatProps = {
  messages: ChatMessage[];
  disabled: boolean;
  statusLine?: string;
  tokensPerSecond?: number;
  onSend: (text: string) => void;
};

export function Chat({ messages, disabled, statusLine, tokensPerSecond, onSend }: ChatProps) {
  const [input, setInput] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text || disabled) return;
    onSend(text);
    setInput('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', color: '#e6edf3' }}>
      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ color: '#7d8590', fontSize: 13 }}>
            Describe the site you want, e.g. <em>"A one-page portfolio for a landscape photographer named Ana"</em>.
          </div>
        )}
        {messages.filter(m => m.role !== 'system').map((m, i) => (
          <div key={i} style={{
            background: m.role === 'user' ? '#1f6feb' : '#161b22',
            color: m.role === 'user' ? '#fff' : '#e6edf3',
            padding: '8px 12px',
            borderRadius: 8,
            maxWidth: '90%',
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            {m.content || (m.role === 'assistant' ? <span style={{opacity:0.5}}>…</span> : null)}
          </div>
        ))}
        {statusLine && (
          <div style={{ color: '#7d8590', fontSize: 12, fontStyle: 'italic' }}>
            {statusLine}{tokensPerSecond ? ` · ${tokensPerSecond.toFixed(1)} tok/s` : ''}
          </div>
        )}
      </div>
      <div style={{ padding: 12, borderTop: '1px solid #30363d' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? 'Model is loading…' : 'Message Spaceforge…'}
          disabled={disabled}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(); }}
          style={{
            width: '100%', height: 80, background: '#161b22', color: '#e6edf3',
            border: '1px solid #30363d', borderRadius: 6, padding: 8, fontSize: 13,
            resize: 'vertical', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={submit}
          disabled={disabled || !input.trim()}
          style={{
            marginTop: 8, width: '100%', padding: 8,
            background: disabled ? '#30363d' : '#238636',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14,
          }}
        >
          Send (⌘⏎)
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): Chat pane"
```

---

## Task 13: Preview UI (iframe + address bar + history)

**Files:**
- Create: `src/ui/Preview.tsx`

- [ ] **Step 1: Write `src/ui/Preview.tsx`**

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { renderPage } from '../runtime/iframeRuntime';

export type PreviewProps = {
  files: Record<string, string>;
};

export function Preview({ files }: PreviewProps) {
  const [history, setHistory] = useState<string[]>(['index.html']);
  const [cursor, setCursor] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentPath = history[cursor];
  const hasIndex = 'index.html' in files;

  // Whenever files change, if the current file vanished, snap back to index.html.
  useEffect(() => {
    if (currentPath && !(currentPath in files) && hasIndex) {
      setHistory(['index.html']);
      setCursor(0);
    }
  }, [files, currentPath, hasIndex]);

  // Render current page into iframe via srcdoc.
  useEffect(() => {
    if (!iframeRef.current) return;
    const html = files[currentPath];
    if (html === undefined) return;
    iframeRef.current.srcdoc = renderPage(html, files);
  }, [currentPath, files]);

  // Listen for nav events from the sandboxed iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'spaceforge:nav') return;
      const href = String(e.data.href).replace(/^\.?\/?/, '').split('#')[0];
      if (!href || !(href in files)) return;
      navigate(href);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useCallback((path: string) => {
    setHistory((h) => [...h.slice(0, cursor + 1), path]);
    setCursor((c) => c + 1);
  }, [cursor]);

  const back = () => setCursor((c) => Math.max(0, c - 1));
  const forward = () => setCursor((c) => Math.min(history.length - 1, c + 1));
  const reload = () => {
    if (iframeRef.current && files[currentPath] !== undefined) {
      iframeRef.current.srcdoc = renderPage(files[currentPath], files);
    }
  };

  const [addressInput, setAddressInput] = useState(currentPath);
  useEffect(() => setAddressInput(currentPath), [currentPath]);

  function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    const path = addressInput.trim().replace(/^spaceforge:\/\/site\//, '');
    if (path in files) navigate(path);
  }

  if (!hasIndex) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8590', padding: 24, textAlign: 'center', background: '#0d1117' }}>
        Ask the assistant to create a site. The preview will appear here once there's an <code>index.html</code>.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      <div style={{ display: 'flex', gap: 6, padding: 8, borderBottom: '1px solid #30363d', alignItems: 'center' }}>
        <button onClick={back} disabled={cursor === 0} style={navBtn}>←</button>
        <button onClick={forward} disabled={cursor === history.length - 1} style={navBtn}>→</button>
        <button onClick={reload} style={navBtn}>⟳</button>
        <form onSubmit={submitAddress} style={{ flex: 1 }}>
          <input
            value={`spaceforge://site/${addressInput}`}
            onChange={(e) => setAddressInput(e.target.value.replace(/^spaceforge:\/\/site\//, ''))}
            style={{
              width: '100%', background: '#161b22', color: '#e6edf3',
              border: '1px solid #30363d', borderRadius: 6, padding: '6px 10px',
              fontSize: 12, fontFamily: 'SF Mono, Cascadia Code, monospace',
            }}
          />
        </form>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ flex: 1, border: 'none', background: '#fff' }}
        title="Preview"
      />
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: '#161b22', color: '#e6edf3', border: '1px solid #30363d',
  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 13,
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): Preview iframe + fake address bar + nav history"
```

---

## Task 14: Source UI (file tree + Monaco)

**Files:**
- Create: `src/ui/Source.tsx`

- [ ] **Step 1: Write `src/ui/Source.tsx`**

```tsx
import { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { triggerDownload } from '../storage/zip';

export type SourceProps = {
  files: Record<string, string>;
  onFileChange: (path: string, contents: string) => void;
  onFileDelete: (path: string) => void;
  onFileCreate: (path: string, contents: string) => void;
};

function languageFor(path: string): string {
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.svg')) return 'xml';
  return 'plaintext';
}

export function Source({ files, onFileChange, onFileDelete, onFileCreate }: SourceProps) {
  const paths = useMemo(() => Object.keys(files).sort(), [files]);
  const [selected, setSelected] = useState<string | null>(paths[0] ?? null);

  // Keep a valid selection as files appear/disappear.
  useEffect(() => {
    if (!paths.length) { setSelected(null); return; }
    if (!selected || !(selected in files)) setSelected(paths[0]);
  }, [paths, selected, files]);

  const active = selected && files[selected] !== undefined ? selected : null;

  function onNewFile() {
    const name = prompt('New file name (e.g. about.html):')?.trim();
    if (!name) return;
    if (name in files) { alert('file already exists'); return; }
    try { onFileCreate(name, ''); setSelected(name); }
    catch (e) { alert(String(e instanceof Error ? e.message : e)); }
  }

  function onDownload(path: string) {
    const blob = new Blob([files[path] ?? ''], { type: 'text/plain' });
    triggerDownload(blob, path);
  }

  function onDelete(path: string) {
    if (!confirm(`Delete ${path}?`)) return;
    onFileDelete(path);
  }

  return (
    <div style={{ height: '100%', display: 'flex', background: '#0d1117', color: '#e6edf3' }}>
      <div style={{ width: 220, borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 8, borderBottom: '1px solid #30363d', display: 'flex', gap: 6 }}>
          <button onClick={onNewFile} style={treeBtn}>+ new</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
          {paths.map((p) => (
            <div
              key={p}
              onClick={() => setSelected(p)}
              style={{
                padding: '6px 8px', borderRadius: 4, cursor: 'pointer',
                background: p === active ? '#1f6feb' : 'transparent',
                fontSize: 12, fontFamily: 'SF Mono, Cascadia Code, monospace',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>{p}</span>
              <span style={{ display: 'flex', gap: 4 }}>
                <button onClick={(e) => { e.stopPropagation(); onDownload(p); }} style={miniBtn} title="Download">↓</button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(p); }} style={{...miniBtn, color:'#f85149'}} title="Delete">×</button>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {active ? (
          <Editor
            path={active}
            defaultLanguage={languageFor(active)}
            language={languageFor(active)}
            value={files[active]}
            theme="vs-dark"
            options={{ fontSize: 13, minimap: { enabled: false }, wordWrap: 'on' }}
            onChange={(v) => onFileChange(active, v ?? '')}
          />
        ) : (
          <div style={{ padding: 24, color: '#7d8590' }}>No files yet.</div>
        )}
      </div>
    </div>
  );
}

const treeBtn: React.CSSProperties = {
  background: '#238636', color: '#fff', border: 'none',
  borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
};
const miniBtn: React.CSSProperties = {
  background: 'transparent', color: '#e6edf3', border: 'none',
  cursor: 'pointer', fontSize: 12, padding: '0 4px',
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): Source tab with file tree + Monaco editor"
```

---

## Task 15: Model selector UI

**Files:**
- Create: `src/ui/ModelSelector.tsx`

- [ ] **Step 1: Write `src/ui/ModelSelector.tsx`**

```tsx
import { useState } from 'react';
import { MODELS } from '../model/registry';

export type ModelSelectorProps = {
  value: string;           // current model id
  downloaded: Set<string>; // ids that appear to be cached
  onChange: (id: string) => void;
};

export function ModelSelector({ value, downloaded, onChange }: ModelSelectorProps) {
  const [custom, setCustom] = useState('');

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        value={MODELS.some((m) => m.id === value) ? value : '__custom__'}
        onChange={(e) => { if (e.target.value !== '__custom__') onChange(e.target.value); }}
        style={selectStyle}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} · {m.sizeGB} GB {downloaded.has(m.id) ? '· cached' : ''}
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </select>
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        placeholder="onnx-community/…"
        style={{
          background: '#161b22', color: '#e6edf3', border: '1px solid #30363d',
          borderRadius: 6, padding: '4px 8px', fontSize: 12, width: 220,
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && custom.trim()) onChange(custom.trim());
        }}
        title="Paste any ONNX model repo id and press Enter"
      />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: '#161b22', color: '#e6edf3', border: '1px solid #30363d',
  borderRadius: 6, padding: '4px 8px', fontSize: 12,
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): model selector dropdown + custom model id"
```

---

## Task 16: Top bar

**Files:**
- Create: `src/ui/TopBar.tsx`

- [ ] **Step 1: Write `src/ui/TopBar.tsx`**

```tsx
import { ModelSelector } from './ModelSelector';

export type TopBarProps = {
  modelId: string;
  downloaded: Set<string>;
  onModelChange: (id: string) => void;
  status: string;
  statusKind: 'loading' | 'ready' | 'error';
  onStartFresh: () => void;
  onDownloadZip: () => void;
};

export function TopBar(p: TopBarProps) {
  const color = p.statusKind === 'ready' ? '#3fb950' : p.statusKind === 'error' ? '#f85149' : '#58a6ff';
  return (
    <div style={{
      padding: '10px 16px', borderBottom: '1px solid #30363d', display: 'flex',
      alignItems: 'center', gap: 16, background: '#0d1117', color: '#e6edf3',
    }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>
        Spaceforge <span style={{ color: '#7d8590', fontWeight: 400 }}>· browser-local website builder</span>
      </div>
      <ModelSelector value={p.modelId} downloaded={p.downloaded} onChange={p.onModelChange} />
      <div style={{ flex: 1, color, fontSize: 12, fontFamily: 'SF Mono, Cascadia Code, monospace' }}>{p.status}</div>
      <button onClick={p.onDownloadZip} style={btn('#1f6feb')}>Download .zip</button>
      <button onClick={p.onStartFresh} style={btn('#da3633')}>Start fresh</button>
    </div>
  );
}

const btn = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '6px 12px', cursor: 'pointer', fontSize: 12,
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): top bar with selector + status + actions"
```

---

## Task 17: App shell — wire everything

**Files:**
- Modify: `src/App.tsx`

This is the largest task but it's mostly glue. Take it slowly — wire one concern at a time.

- [ ] **Step 1: Rewrite `src/App.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserGate } from './ui/BrowserGate';
import { TopBar } from './ui/TopBar';
import { Chat } from './ui/Chat';
import { Preview } from './ui/Preview';
import { Source } from './ui/Source';
import {
  loadSite, saveSite, writeFile, deleteFile, clearSite,
  type SiteState, type ChatMessage, emptySite,
} from './storage/files';
import { buildZip, triggerDownload } from './storage/zip';
import { loadModel, type Generator, type ProgressInfo } from './model/loader';
import { runGeneration } from './model/generate';
import { DEFAULT_MODEL_ID, MODEL_STORAGE_KEY, MODELS, getModel } from './model/registry';

type StatusKind = 'loading' | 'ready' | 'error';

function useSiteState() {
  const [state, setState] = useState<SiteState>(() => loadSite());
  useEffect(() => { saveSite(state); }, [state]);
  return [state, setState] as const;
}

export default function App() {
  return (
    <BrowserGate>
      <AppInner />
    </BrowserGate>
  );
}

function AppInner() {
  const [site, setSite] = useSiteState();
  const [tab, setTab] = useState<'preview' | 'source'>('preview');

  // Model state
  const [modelId, setModelId] = useState<string>(() =>
    localStorage.getItem(MODEL_STORAGE_KEY) ?? site.model ?? DEFAULT_MODEL_ID);
  const [generator, setGenerator] = useState<Generator | null>(null);
  const [status, setStatus] = useState<string>('Loading model…');
  const [statusKind, setStatusKind] = useState<StatusKind>('loading');
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [tokensPerSec, setTps] = useState<number>(0);

  // Load/swap model whenever modelId changes.
  useEffect(() => {
    const entry = getModel(modelId) ?? { id: modelId, label: modelId, sizeGB: 0, ramGB: 0, dtype: 'q4f16' as const, family: 'gemma' as const };
    localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    setStatusKind('loading');
    setStatus(`Loading ${entry.label}…`);
    setGenerator(null);
    let cancelled = false;
    loadModel(entry, (p: ProgressInfo) => {
      if (cancelled) return;
      if (p.status === 'progress' && p.loaded && p.total) {
        const pct = Math.round((p.loaded / p.total) * 100);
        setStatus(`Downloading ${entry.label}: ${pct}%`);
      } else if (p.status === 'done' && p.file) {
        setStatus(`Preparing ${entry.label}…`);
      } else if (p.status === 'ready') {
        setStatus(`${entry.label} ready`);
      }
    })
      .then((g) => {
        if (cancelled) return;
        setGenerator(g);
        setStatusKind('ready');
        setStatus(`${entry.label} ready`);
        setDownloaded((s) => new Set(s).add(modelId));
      })
      .catch((err) => {
        if (cancelled) return;
        setStatusKind('error');
        setStatus(`Failed to load: ${err.message}`);
      });
    return () => { cancelled = true; };
  }, [modelId]);

  // Keep site.model in sync with selector.
  useEffect(() => { setSite((s) => ({ ...s, model: modelId })); }, [modelId, setSite]);

  async function onSend(text: string) {
    if (!generator || busy) return;
    setBusy(true);

    // Push user message + empty assistant bubble.
    const userMsg: ChatMessage = { role: 'user', content: text };
    setSite((s) => ({ ...s, chatHistory: [...s.chatHistory, userMsg, { role: 'assistant', content: '' }] }));

    // Live token accounting.
    let tokens = 0;
    const t0 = performance.now();
    const tick = setInterval(() => {
      const sec = (performance.now() - t0) / 1000;
      setTps(sec > 0 ? tokens / sec : 0);
    }, 250);

    // Seed a working state snapshot used by the generator (new user msg not yet echoed back).
    const snapshot: SiteState = { ...site, chatHistory: [...site.chatHistory, userMsg] };

    await runGeneration(
      generator,
      getModel(modelId) ?? { id: modelId, label: modelId, sizeGB: 0, ramGB: 0, dtype: 'q4f16', family: 'gemma' },
      snapshot,
      text,
      {
        onProse: (chunk) => {
          tokens += chunk.length / 4; // rough token proxy
          setSite((s) => {
            const h = [...s.chatHistory];
            const last = h[h.length - 1];
            if (last && last.role === 'assistant') h[h.length - 1] = { ...last, content: last.content + chunk };
            return { ...s, chatHistory: h };
          });
        },
        onFileStart: () => { /* no-op; we commit on end */ },
        onFileChunk: () => { /* buffered in parser state; final write on end */ },
        onFileEnd: (path) => {
          setSite((s) => {
            // Recompose file contents by collecting prose chunks from parser — but parser
            // emits chunks; we need to buffer them here. Use a mutable sidecar keyed by path.
            const buf = (fileBuffers.current[path] ?? '');
            delete fileBuffers.current[path];
            try { return writeFile(s, path, buf); } catch { return s; }
          });
        },
        onFileTruncated: (path) => {
          delete fileBuffers.current[path];
          setSite((s) => {
            const h = [...s.chatHistory];
            const last = h[h.length - 1];
            if (last && last.role === 'assistant') h[h.length - 1] = { ...last, content: last.content + `\n[file "${path}" was cut off]` };
            return { ...s, chatHistory: h };
          });
        },
        onComplete: () => { setBusy(false); clearInterval(tick); setTps(0); },
        onError: (err) => {
          setBusy(false);
          clearInterval(tick);
          setTps(0);
          setSite((s) => ({ ...s, chatHistory: [...s.chatHistory, { role: 'assistant', content: `Error: ${err.message}` }] }));
        },
      },
    );
  }

  // Per-path file-chunk accumulator (kept as a ref so it's not part of React state churn).
  const fileBuffers = useRef<Record<string, string>>({});
  // Wire the buffer: intercept onFileChunk to append here. We couldn't assign in the inline
  // handlers object above because fileBuffers is declared below — move accumulation via a
  // wrapper handler here:
  //
  // Instead: we re-route by wrapping runGeneration — simpler fix is to fold onFileChunk into
  // the inline object. See Step 2 patch.

  const onFileChange = (path: string, contents: string) => setSite((s) => {
    try { return writeFile(s, path, contents); } catch { return s; }
  });
  const onFileDelete = (path: string) => setSite((s) => deleteFile(s, path));
  const onFileCreate = (path: string, contents: string) => setSite((s) => {
    try { return writeFile(s, path, contents); } catch (e) { alert(String(e instanceof Error ? e.message : e)); return s; }
  });

  async function onDownloadZip() {
    const blob = await buildZip(site.files);
    const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
    triggerDownload(blob, `spaceforge-site-${ts}.zip`);
  }

  function onStartFresh() {
    if (!confirm('This wipes the current site and chat history. Download first if you want to keep it. Continue?')) return;
    clearSite();
    setSite(emptySite());
    fileBuffers.current = {};
  }

  const statusLine = busy ? 'Generating…' : undefined;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      <TopBar
        modelId={modelId}
        downloaded={downloaded}
        onModelChange={setModelId}
        status={status}
        statusKind={statusKind}
        onDownloadZip={onDownloadZip}
        onStartFresh={onStartFresh}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 380, minWidth: 300, borderRight: '1px solid #30363d' }}>
          <Chat
            messages={site.chatHistory}
            disabled={busy || statusKind !== 'ready'}
            statusLine={statusLine}
            tokensPerSecond={tokensPerSec}
            onSend={onSend}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 4, padding: 8, borderBottom: '1px solid #30363d' }}>
            <button onClick={() => setTab('preview')} style={tabBtn(tab === 'preview')}>Preview</button>
            <button onClick={() => setTab('source')} style={tabBtn(tab === 'source')}>Source</button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {tab === 'preview'
              ? <Preview files={site.files} />
              : <Source files={site.files} onFileChange={onFileChange} onFileDelete={onFileDelete} onFileCreate={onFileCreate} />}
          </div>
        </div>
      </div>
    </div>
  );
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  background: active ? '#1f6feb' : 'transparent',
  color: active ? '#fff' : '#e6edf3',
  border: '1px solid #30363d', borderRadius: 6, padding: '4px 14px',
  cursor: 'pointer', fontSize: 12,
});
```

- [ ] **Step 2: Patch `onFileChunk` to accumulate into `fileBuffers`**

The inline handlers object references `fileBuffers` before the ref is declared. In `src/App.tsx`, replace the `onFileStart`, `onFileChunk`, and `onFileEnd` entries inside the `runGeneration(...)` call with these (keep the rest unchanged):

```ts
onFileStart: (path) => { fileBuffers.current[path] = ''; },
onFileChunk: (path, chunk) => { fileBuffers.current[path] = (fileBuffers.current[path] ?? '') + chunk; },
onFileEnd: (path) => {
  const buf = fileBuffers.current[path] ?? '';
  delete fileBuffers.current[path];
  setSite((s) => {
    try { return writeFile(s, path, buf); } catch { return s; }
  });
},
```

Also move the `const fileBuffers = useRef<...>({})` declaration to the top of `AppInner()`, above `onSend`, so it's in scope by the time the handlers object closes over it. Delete the trailing "Per-path file-chunk accumulator" comment block that I left as a guide.

- [ ] **Step 3: Type-check + run dev**

Run: `pnpm tsc --noEmit`
Expected: passes.

Run: `pnpm dev`, open http://localhost:5173 in Chrome 134+.
Expected: UI renders, model starts downloading, progress bar advances.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(app): wire all panes, model lifecycle, and file mutations"
```

---

## Task 18: Vercel config

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

These COOP/COEP headers match `vite.config.ts` dev and are required for transformers.js to run WebGPU pipelines in production.

- [ ] **Step 2: Verify the production build boots**

```bash
pnpm build
pnpm preview
```

Browse to http://localhost:4173 in Chrome 134+.
Expected: same behavior as dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(deploy): vercel config with COOP/COEP headers"
```

---

## Task 19: End-to-end manual verification + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write a minimal `README.md`**

```md
# Spaceforge

Browser-local website builder. A small LLM (Gemma 4 E2B or larger) runs in
desktop Chrome via WebGPU and writes your site's HTML/CSS/JS into
localStorage. Preview the site in a sandboxed iframe, edit any file in
Monaco, download individual files or the whole site as a `.zip`.

No backend. No API keys. After the first multi-GB model download, everything
runs offline.

## Requirements

- Desktop Chrome 134+ with WebGPU (`shader-f16` + subgroups).
- ~3 GB free RAM for the default model; more for larger tiers.

## Local dev

```bash
pnpm install
pnpm dev
```

## Deploy

`vercel` — the static `dist/` is served with COOP/COEP headers (see
`vercel.json`).
```

- [ ] **Step 2: End-to-end manual verification**

Run: `pnpm preview` (or `pnpm dev`). In desktop Chrome 134+:

  1. Page loads; browser gate passes.
  2. Model progress bar advances to 100% on first load.
  3. Ask: *"Build a one-page portfolio for a landscape photographer named Ana. Include an About page."*
  4. Verify prose appears in the chat pane as tokens arrive.
  5. Verify `index.html` and `about.html` appear in Source → file tree during/after generation.
  6. Switch to Preview → the site renders.
  7. Click the "About" link inside the iframe → address bar updates to `spaceforge://site/about.html` → about page renders.
  8. Edit `styles.css` in Source → Preview updates within ~500 ms.
  9. Click "Download .zip" → a `spaceforge-site-<timestamp>.zip` downloads and contains all files.
  10. Click "Start fresh" → confirm → site wipes to empty.
  11. Reload the page → model loads from cache instantly; empty site persists.

Note any issues in the `docs/superpowers/plans/2026-04-21-spaceforge.md` file's
"Known issues" section.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: README + manual verification checklist"
```

- [ ] **Step 4: Push to GitHub and deploy to Vercel** (owner runs manually)

```bash
# Once a remote exists:
# git remote add origin <user>/spaceforge
# git push -u origin main
# vercel --prod
```

---

## Self-review notes

- **Spec coverage:** browser gate ✅ (Task 11), model selector + custom id ✅ (Task 15), per-family prompts ✅ (Task 8), stream parser ✅ (Task 5), iframe runtime ✅ (Task 6), source editor ✅ (Task 14), preview navigator ✅ (Task 13), storage + sanitization ✅ (Tasks 3-4), zip export ✅ (Task 7), start fresh ✅ (Task 17), Vercel config ✅ (Task 18).
- **Adapter capability check for heavy models** is described in the spec but lives implicitly in Task 11 (browser gate). v1 leaves per-model capability gating to Task 17's try/catch around `loadModel` — if a model fails to init on a weak adapter, the error surfaces in the top-bar status. If stricter gating is wanted, that's a follow-up.
- **Progress bar UI** is rendered as status text in Task 16/17 rather than a dedicated progress component. Good enough for v1.
