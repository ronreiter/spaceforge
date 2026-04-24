import { TEMPLATES, CUSTOM_TEMPLATE_ID } from '../../src/templates/registry';
import type { FileEntry } from '../sites/files';
import type { PlannedFile } from './types';

// System prompts for the three model roles. Kept in one place so changes
// stay coherent: planner lists files + picks a template, executor writes
// one file at a time, critic reviews site-so-far between iterations.
//
// Visual conventions baked into every prompt:
//   - Pre-made templates are the default aesthetic. The planner picks one;
//     the executor writes content that matches the chosen look. Only fall
//     back to "custom" when the brief truly asks for a bespoke style.
//   - Pages should use Tabler icons liberally (nav, buttons, list items,
//     CTAs) and stock photography from the /api/photo endpoint (hero,
//     section breakers, product shots). The runtime injects the Tabler
//     webfont automatically, so `<i class="ti ti-home"></i>` Just Works.

const TEMPLATE_CATALOG = TEMPLATES.filter((t) => t.id !== CUSTOM_TEMPLATE_ID)
  .map((t) => `  - ${t.id}: ${t.description}`)
  .join('\n');

// Canonical Tabler icon names. Keep this list tight — the Tabler set has
// thousands of icons, but giving the model a guided palette produces more
// coherent UIs than letting it guess names that may not exist.
const ICON_PALETTE =
  'home, menu-2, x, plus, check, arrow-right, arrow-left, external-link, ' +
  'mail, phone, map-pin, map, calendar, clock, user, users, ' +
  'search, shopping-cart, credit-card, star, heart, bookmark, ' +
  'camera, photo, video, music, book, coffee, cake, bread, wine, pizza, ' +
  'leaf, sun, moon, flame, snowflake, ' +
  'brand-github, brand-x, brand-instagram, brand-linkedin, brand-facebook, brand-youtube';

export const PLANNER_SYSTEM = `You are planning the file structure of a static website.

Given the user's description, return:
  1. A one-paragraph summary of the site.
  2. The id of the pre-made visual template that best fits the brief.
  3. An ordered list of files to generate.

Available templates (ALWAYS prefer one of these over "custom"):
${TEMPLATE_CATALOG}
  - custom: fallback only — use when the user explicitly asks for a bespoke visual style or truly none of the above come close.

Template selection:
  - Pick the single best-fitting template. A reasonable fit beats custom every time.
  - Match the aesthetic: editorial/journal for writing; studio/brutalist for agency/SaaS; paper for weddings/events; riviera for café/restaurant/travel; vault/noir for photography; orbit/synthwave/terminal for tech; sunset/pastel/botanical for lifestyle; zine/gazette for alt/punk/news.

File planning rules:
  - Content pages are .md with YAML front-matter.
  - Layouts and partials are .njk and start with underscore (_layout.njk, _header.njk, _footer.njk).
  - Every site needs an index.md and a _layout.njk. Include _header.njk and _footer.njk if _layout.njk references them.
  - When a pre-made template is chosen, DO NOT plan styles.css — the template provides it.
  - Only plan styles.css when templateId is "custom".
  - Order files so dependencies come first: partials → _layout.njk → .md pages → styles.css (only if custom).
  - Keep the plan tight: 4 to 8 files covers most sites. Don't pad with pages the user didn't ask for.`.trim();

export function executorSystem(opts: {
  siteSummary: string;
  templateId: string;
  manifest: FileEntry[];
  feedback: string[];
}): string {
  const manifestSummary =
    opts.manifest.length === 0
      ? '(no files yet)'
      : opts.manifest.map((f) => `- ${f.path} (${f.size} bytes)`).join('\n');
  const feedbackBlock =
    opts.feedback.length === 0
      ? ''
      : `\n\nCritic feedback from prior iterations:\n${opts.feedback
          .map((f, i) => `${i + 1}. ${f}`)
          .join('\n')}`;

  const tpl =
    opts.templateId === CUSTOM_TEMPLATE_ID
      ? `No pre-made template — you own the full visual language. Write styles.css to match the brief.`
      : describeTemplate(opts.templateId);

  return `You are writing ONE file for a static website. Return only the file's raw contents — no code fences, no prose, no commentary.

Site summary: ${opts.siteSummary}

Visual template: ${tpl}

Files already written:
${manifestSummary}${feedbackBlock}

General conventions:
- Markdown pages start with YAML front-matter (---\\ntitle: ...\\nlayout: _layout.njk\\n---) then the body.
- Nunjucks partials/layouts use {% include "_header.njk" %}, {{ content | safe }}, etc. Do NOT prefix .njk files with YAML front-matter.
- Internal links in .md use .html targets (e.g. href="about.html") so the published site resolves cleanly.
- Do not repeat or rewrite existing files. Only output the file you were asked for.

YAML front-matter — STRICT: never put a colon (\`:\`) inside a value. A second colon on the same line breaks YAML parsing and the page fails to render.
  WRONG:  title: Sprout: Smart Plant Care
  RIGHT:  title: Sprout — Smart Plant Care
  RIGHT:  title: Sprout - Smart Plant Care
Use a dash (em-dash \`—\` or hyphen \`-\`) instead of a colon in title/description/subtitle and every other field. If a colon is unavoidable, wrap the value in double quotes ("..."), but prefer the dash.

Icons — USE THEM LIBERALLY:
- Tabler icons, inline HTML: <i class="ti ti-home"></i>. No extra classes or wrappers needed — the Tabler webfont is injected automatically at publish time.
- Pair icons with their label: nav items, buttons, bullet-point lists, contact blocks, stat badges.
- Names to draw from: ${ICON_PALETTE}
- Example hero CTA: <a href="menu.html" class="cta"><i class="ti ti-arrow-right"></i> See the menu</a>
- Example contact block: <p><i class="ti ti-mail"></i> hello@example.com &nbsp;&nbsp; <i class="ti ti-map-pin"></i> 12 Main St</p>

Brand logo — REQUIRED in every _header.njk:
- The brand link must begin with a Tabler icon next to the site name. Never plain text only, never an emoji, never an <img>. Pick an icon that matches the business.
- Canonical: <a class="brand" href="index.html"><i class="ti ti-bread"></i> Site Name</a>

No emojis — ANYWHERE:
- Do not use Unicode emoji characters (🍞, ☕, 🎉, ✨, ✅, →, …) in any file — not in headings, nav, buttons, lists, titles, footers, or content.
- Use a Tabler icon as a replacement: 🍞 → ti-bread, ☕ → ti-coffee, ✅ → ti-check, → → ti-arrow-right, ★ → ti-star.
- Applies to .md bodies, .njk partials, page titles, and alt text alike.

Collections — for blog-style content place pages under posts/, projects/, recipes/, events/, notes/, or docs/ (one level deep, no deeper). Every .md under a collection directory is auto-grouped and exposed to Nunjucks via \`collections.<dir>\` — each entry has .title, .date, .url, .excerpt plus any custom front-matter. Iterate with \`{% for post in collections.posts %}\`. Sorted by date desc.

Favicon — do NOT write a <link rel="icon"> tag. After finishing a site, add a one-line "Suggested favicon: ti-<name>" hint in your chat output (not in any file) so the user can apply it via the Favicon picker. Pick from ti-bread (bakery), ti-coffee (cafe), ti-code (dev), ti-rocket (tech/SaaS), ti-plant (wellness), ti-camera (studio), ti-music (band), etc.

Forms — if the site needs one:
- <form action="/api/forms/{{ site.slug }}/contact" method="post"> (replace "contact" with a short name fitting the form: signup / feedback / rsvp).
- {{ site.slug }} is auto-filled at publish time — emit the literal Nunjucks expression, don't guess a slug.
- Include a hidden honeypot: <input type="text" name="_company" style="display:none" tabindex="-1" autocomplete="off">
- Every input needs <label for="id"> and the right type (email, tel, …). Mark required fields required.

Stock photography — USE IT HEAVILY:
- Server-side Unsplash proxy at /api/photo. Shape: /api/photo?q=<keywords>&seed=<n>&w=<w>&h=<h>.
  Rules: 2-3 SPECIFIC keywords comma-separated, a DIFFERENT integer seed per image on the page, always supply width+height, always supply meaningful alt text.
- Every page should have at least one image — a hero at minimum, plus one or more section breaks when the content is long.
- Markdown: ![Fresh sourdough loaves](/api/photo?q=sourdough,bread&seed=1&w=1200&h=600)
- HTML: <img src="/api/photo?q=latte,coffee&seed=2&w=600&h=400" alt="Latte art">
- Gallery-style layouts: drop a <div class="grid"> with several <img>s — the vault template styles it natively; other templates fall back cleanly.`.trim();
}

export function executorPrompt(file: PlannedFile): string {
  return `Write ${file.path}.\n\nIntent: ${file.intent}`;
}

export function criticSystem(siteSummary: string): string {
  return `You are reviewing a static website being built file-by-file.

You see the user's original intent, the files written so far, and the file that was just written.
Decide:
  complete = true if the site is finished — every page renders standalone, every include/link resolves, every content page has icons + at least one image, and the content matches the chosen template's aesthetic.
  complete = false otherwise. Set feedback to a short specific note the next executor step will see, and optionally add_files with any missing pieces.

Specifically flag in feedback when any of these are missing or wrong:
  - The _header.njk brand link doesn't start with a Tabler icon (<a class="brand">…<i class="ti ti-*"></i> Name…</a>).
  - Any Unicode emoji character (🍞, ☕, 🎉, ✨, ✅, →, …) appears in a .md or .njk file — all emojis must be replaced with <i class="ti ti-*"></i>.
  - No <i class="ti ti-*"></i> icons in nav, CTAs, or key list items.
  - No /api/photo images on a content page that would benefit from a hero.
  - A partial included by _layout.njk that doesn't exist yet.
  - A link to a page that wasn't planned or written.

Be strict but brief. Don't invent requirements the user didn't ask for.

Site summary: ${siteSummary}`.trim();
}

export function criticPrompt(opts: {
  manifest: FileEntry[];
  lastWritten: { path: string; content: string } | null;
  queueRemaining: PlannedFile[];
}): string {
  const manifest = opts.manifest.map((f) => `- ${f.path} (${f.size} bytes)`).join('\n');
  const queue =
    opts.queueRemaining.length === 0
      ? '(queue empty — the planner considered this complete)'
      : opts.queueRemaining.map((f) => `- ${f.path}: ${f.intent}`).join('\n');
  const last = opts.lastWritten
    ? `\n\nJust written (${opts.lastWritten.path}):\n\`\`\`\n${truncate(opts.lastWritten.content, 2000)}\n\`\`\``
    : '\n\nNo file was written this iteration (queue was empty).';
  return `Manifest:
${manifest}

Queue remaining:
${queue}${last}`;
}

function describeTemplate(id: string): string {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) {
    return `id="${id}" (unknown — treat as custom: you own the full visual language)`;
  }
  return `id="${t.id}" — ${t.description}`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}\n… (${s.length - max} more bytes)`;
}
