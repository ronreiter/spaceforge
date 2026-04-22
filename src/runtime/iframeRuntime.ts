import picoClasslessCss from '@picocss/pico/css/pico.classless.min.css?raw';
import { isTemplate, renderTemplate, outputPath } from './nunjucksRender';
import { isMarkdown, renderMarkdownPage } from './markdownRender';

export const NAV_RUNTIME_MARKER = '/*spaceforge:nav-runtime*/';
export const FRAMEWORK_STYLE_MARKER = 'data-spaceforge-framework';
export const FONTS_LINK_MARKER = 'data-spaceforge-fonts';
export const ICONS_LINK_MARKER = 'data-spaceforge-icons';

const TABLER_ICONS_URL =
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css';

// Google Fonts that ship with every preview. The model picks a palette and
// sets --sf-font-heading / --sf-font-body in styles.css. Keep this list in
// sync with the palette menu in src/model/systemPrompt.*.ts.
const FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Inter:wght@400;500;600;700' +
  '&family=Playfair+Display:wght@400;600;700' +
  '&family=Lora:wght@400;600' +
  '&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700' +
  '&family=Space+Grotesk:wght@400;500;700' +
  '&display=swap';

// Base rules that apply the chosen fonts via CSS variables. Default is Inter.
// Pico's own `--pico-font-family*` vars are overridden too so its inputs,
// buttons, etc. pick up the body font.
const BASE_FONT_CSS = `
:root {
  --sf-font-body: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  --sf-font-heading: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  --pico-font-family-sans-serif: var(--sf-font-body);
  --pico-font-family: var(--sf-font-body);
}
body, button, input, select, textarea { font-family: var(--sf-font-body); }
h1, h2, h3, h4, h5, h6 {
  font-family: var(--sf-font-heading);
  letter-spacing: -0.01em;
}
`.trim();

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

// Pico.css classless — styles raw semantic HTML (h1, p, main, nav, article,
// form, table, etc.) with modern typography, spacing and theming. The model
// writes plain semantic HTML and the preview looks polished by default.
// Injected first so any user <link>/<style> further down can override it.

function normalizeLocalRef(ref: string): string {
  return ref.replace(/^\.?\/+/, '');
}

function isLocalRef(href: string): boolean {
  if (!href) return false;
  return !/^(https?:|data:|blob:|mailto:|tel:|\/\/)/i.test(href);
}

// Render the raw page source into the HTML string that will be fed to the
// iframe. For a .md page we parse front matter, render markdown, then apply
// its Nunjucks layout. For a .njk page we run Nunjucks against the full file
// map so {% extends %}/{% include %} can resolve _layout.njk and friends.
// For a .html file this is just the file contents.
export function resolvePage(path: string, files: Record<string, string>): string {
  if (isMarkdown(path)) return renderMarkdownPage(path, files);
  if (isTemplate(path)) return renderTemplate(path, files);
  return files[path] ?? '';
}

// Maps a link target (e.g. `about.html`) to the file in storage that should
// be navigated to. Tries `.md` first, then `.njk`, so generated HTML with flat
// .html hrefs keeps working whether the source is markdown or a template.
export function resolveRoute(
  href: string,
  files: Record<string, string>,
): string | null {
  const clean = normalizeLocalRef(href).split('#')[0];
  if (!clean) return null;
  if (clean in files) return clean;
  const asMd = clean.replace(/\.html?$/, '.md');
  if (asMd in files) return asMd;
  const asNjk = clean.replace(/\.html?$/, '.njk');
  if (asNjk in files) return asNjk;
  return null;
}

export { outputPath };

// Inject framework styles (Pico classless, Google Fonts, Tabler icons) into a
// rendered HTML page WITHOUT adding the preview-only nav-runtime script and
// without inlining local stylesheets/scripts — the zip export ships the raw
// CSS/JS files as siblings, so the inlining used in the iframe would just
// duplicate bytes. Exported pages stand alone when opened directly.
export function injectFrameworkForExport(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const head = doc.head ?? doc.documentElement;

  const framework = doc.createElement('style');
  framework.setAttribute(FRAMEWORK_STYLE_MARKER, 'pico-classless');
  framework.textContent = (picoClasslessCss as string) + '\n' + BASE_FONT_CSS;
  head.insertBefore(framework, head.firstChild);

  const fontsLink = doc.createElement('link');
  fontsLink.setAttribute('rel', 'stylesheet');
  fontsLink.setAttribute('href', FONTS_URL);
  fontsLink.setAttribute(FONTS_LINK_MARKER, 'google');
  head.insertBefore(fontsLink, head.firstChild);

  const iconsLink = doc.createElement('link');
  iconsLink.setAttribute('rel', 'stylesheet');
  iconsLink.setAttribute('href', TABLER_ICONS_URL);
  iconsLink.setAttribute(ICONS_LINK_MARKER, 'tabler');
  head.insertBefore(iconsLink, head.firstChild);

  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}

export function renderPage(html: string, files: Record<string, string>): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('link[rel="stylesheet"][href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!isLocalRef(href)) return;
    const key = normalizeLocalRef(href);
    const content = files[key];
    if (content === undefined) return;
    const style = doc.createElement('style');
    style.setAttribute('data-spaceforge-inlined', href);
    style.textContent = content;
    link.replaceWith(style);
  });

  doc.querySelectorAll('script[src]').forEach((script) => {
    const src = script.getAttribute('src') || '';
    if (!isLocalRef(src)) return;
    const key = normalizeLocalRef(src);
    const content = files[key];
    if (content === undefined) return;
    const s = doc.createElement('script');
    s.setAttribute('data-spaceforge-inlined', src);
    const type = script.getAttribute('type');
    if (type) s.setAttribute('type', type);
    s.textContent = content;
    script.replaceWith(s);
  });

  const head = doc.head ?? doc.documentElement;
  const runtimeFragment = new DOMParser().parseFromString(NAV_RUNTIME_SCRIPT, 'text/html');
  const runtimeScript = runtimeFragment.querySelector('script');
  if (runtimeScript) {
    const imported = doc.importNode(runtimeScript, true);
    head.insertBefore(imported, head.firstChild);
  }

  const framework = doc.createElement('style');
  framework.setAttribute(FRAMEWORK_STYLE_MARKER, 'pico-classless');
  framework.textContent = (picoClasslessCss as string) + '\n' + BASE_FONT_CSS;
  head.insertBefore(framework, head.firstChild);

  const fontsLink = doc.createElement('link');
  fontsLink.setAttribute('rel', 'stylesheet');
  fontsLink.setAttribute('href', FONTS_URL);
  fontsLink.setAttribute(FONTS_LINK_MARKER, 'google');
  head.insertBefore(fontsLink, head.firstChild);

  const iconsLink = doc.createElement('link');
  iconsLink.setAttribute('rel', 'stylesheet');
  iconsLink.setAttribute('href', TABLER_ICONS_URL);
  iconsLink.setAttribute(ICONS_LINK_MARKER, 'tabler');
  head.insertBefore(iconsLink, head.firstChild);

  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
