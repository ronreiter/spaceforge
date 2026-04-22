import { parseHTML } from 'linkedom';
import {
  FRAMEWORK_STYLE_MARKER,
  FONTS_LINK_MARKER,
  ICONS_LINK_MARKER,
  stripPicoLayoutConstraints,
} from '../../src/runtime/iframeRuntime';
import { picoClasslessCss } from '../../src/runtime/picoClassless.generated';

// Server-side equivalent of src/runtime/iframeRuntime.ts :
// injectFrameworkForExport. The browser version uses DOMParser, which
// isn't available in Node; linkedom gives us a compatible API.
//
// Why we don't import that function directly: iframeRuntime.ts pulls in
// window-specific code paths (MessageEvent plumbing, etc). This module
// is the minimal server build.

const FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Inter:wght@400;500;600;700' +
  '&family=Playfair+Display:wght@400;600;700' +
  '&family=Lora:wght@400;600' +
  '&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700' +
  '&family=Space+Grotesk:wght@400;500;700' +
  '&display=swap';

const TABLER_ICONS_URL =
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css';

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

const PICO_CLASSLESS = stripPicoLayoutConstraints(picoClasslessCss);

export function injectFrameworkServer(html: string): string {
  const { document } = parseHTML(html);
  if (document.documentElement) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  const head = document.head ?? document.documentElement;

  const framework = document.createElement('style');
  framework.setAttribute(FRAMEWORK_STYLE_MARKER, 'pico-classless');
  framework.textContent = PICO_CLASSLESS + '\n' + BASE_FONT_CSS;
  head.insertBefore(framework, head.firstChild);

  const fontsLink = document.createElement('link');
  fontsLink.setAttribute('rel', 'stylesheet');
  fontsLink.setAttribute('href', FONTS_URL);
  fontsLink.setAttribute(FONTS_LINK_MARKER, 'google');
  head.insertBefore(fontsLink, head.firstChild);

  const iconsLink = document.createElement('link');
  iconsLink.setAttribute('rel', 'stylesheet');
  iconsLink.setAttribute('href', TABLER_ICONS_URL);
  iconsLink.setAttribute(ICONS_LINK_MARKER, 'tabler');
  head.insertBefore(iconsLink, head.firstChild);

  return '<!doctype html>\n' + document.documentElement.outerHTML;
}
