import type { FileEntry } from '../sites/files';
import type { PlannedFile } from './types';

// System prompts for the three model roles. Kept in one place so changes
// stay coherent: planner lists files, executor writes one file at a time,
// critic reviews site-so-far between iterations.

export const PLANNER_SYSTEM = `You are planning the file structure of a static website.

Given the user's description, return the ordered list of files to generate.
Rules:
- Content pages are .md (markdown with front-matter).
- Layouts and partials are .njk and start with underscore (_layout.njk, _header.njk, _footer.njk).
- Every site needs an index.md and a _layout.njk. A _header.njk and _footer.njk are required if _layout.njk includes them.
- Styles live in styles.css.
- Order files so dependencies come first: partials before the pages that include them, _layout.njk before the .md pages that reference it, styles.css last.
- Keep the plan small — 4 to 10 files is typical. Don't pad with pages the user didn't ask for.`.trim();

export function executorSystem(opts: {
  siteSummary: string;
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
  return `You are writing ONE file for a static website. Return only the file's raw contents — no code fences, no prose, no commentary.

Site summary: ${opts.siteSummary}

Files already written:
${manifestSummary}${feedbackBlock}

Conventions:
- Markdown pages start with YAML front-matter (---\\ntitle: ...\\nlayout: _layout.njk\\n---) then the body.
- Nunjucks partials/layouts use {% include "_header.njk" %}, {{ content | safe }}, etc. Do NOT prefix .njk files with YAML front-matter.
- Internal links in .md use .html targets (e.g. href="about.html") so the published site resolves cleanly.
- Keep CSS lean: rely on Pico CSS which the publish pipeline injects automatically — only override what you need.
- Do not repeat or rewrite existing files. Only output the file you were asked for.`.trim();
}

export function executorPrompt(file: PlannedFile): string {
  return `Write ${file.path}.\n\nIntent: ${file.intent}`;
}

export function criticSystem(siteSummary: string): string {
  return `You are reviewing a static website being built file-by-file.

You see the user's original intent, the files written so far, and the file that was just written.
Decide:
  complete = true if the site is finished — every page renders standalone, every include/link resolves, styles are consistent.
  complete = false otherwise. Set feedback to a short specific note the next executor step will see, and optionally add_files with any missing pieces.

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

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}\n… (${s.length - max} more bytes)`;
}
