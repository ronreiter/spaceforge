import type { TemplateBundle } from '../registry';

// "Vault" — dark minimal gallery. Near-black background, tight grid for
// thumbnails, subtle amber accent on links. Built for photographers,
// designers, and anyone whose work should carry the page.
const styles = `:root {
  --sf-font-heading: 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --sf-bg: #0d0d0f;
  --sf-surface: #17171a;
  --sf-ink: #ececea;
  --sf-amber: #d7a84c;
  --pico-primary-500: var(--sf-amber);
  --pico-primary-600: #b48629;
  --pico-color: var(--sf-ink);
  --pico-background-color: var(--sf-bg);
}

html, body { background: var(--sf-bg); color: var(--sf-ink); }
body {
  max-width: 1080px; margin: 0 auto; padding: 2rem 1.5rem 5rem;
  color: var(--sf-ink); line-height: 1.6; font-size: 16px;
  font-family: var(--sf-font-body);
}

header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 1.25rem; margin-bottom: 3rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
header nav, header ul {
  display: flex; gap: 1.5rem; list-style: none; padding: 0; margin: 0;
}
header a {
  color: var(--sf-ink); text-decoration: none; font-weight: 400;
  font-size: 0.85rem; letter-spacing: 0.14em; text-transform: uppercase;
  opacity: 0.75;
}
header a:hover { color: var(--sf-amber); opacity: 1; }
header h1, header .brand {
  font-weight: 500; font-size: 1rem; letter-spacing: 0.24em;
  text-transform: uppercase; color: var(--sf-ink); margin: 0;
}

main h1 {
  font-weight: 300; font-size: clamp(2.25rem, 5vw, 3.5rem); line-height: 1.1;
  margin: 0 0 1rem; letter-spacing: -0.01em; color: var(--sf-ink);
}
main h2 { font-weight: 400; font-size: 1.6rem; margin-top: 3rem; color: var(--sf-ink); }
main h3 { font-weight: 500; font-size: 0.85rem; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 2rem; color: var(--sf-amber); }

main p { margin: 0 0 1.15rem; max-width: 64ch; color: rgba(236,236,234,0.85); }
main a { color: var(--sf-amber); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
main a:hover { color: #ffc872; }

main img {
  max-width: 100%; margin: 1.5rem 0;
  box-shadow: 0 12px 32px rgba(0,0,0,0.5);
}

/* Gallery-style image grid — drop a <div class="grid"> in your markup. */
main .grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem; margin: 2rem 0;
}
main .grid img { margin: 0; aspect-ratio: 1 / 1; object-fit: cover; }

main blockquote {
  border-left: 2px solid var(--sf-amber); padding-left: 1rem;
  margin: 1.5rem 0; color: rgba(236,236,234,0.7); font-style: italic;
}

.ti { color: var(--sf-amber); }

footer {
  margin-top: 5rem; padding-top: 2rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  color: rgba(236,236,234,0.6); font-size: 0.8rem;
  letter-spacing: 0.12em; text-transform: uppercase;
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
}
footer a { color: rgba(236,236,234,0.85); text-decoration: none; }
footer a:hover { color: var(--sf-amber); }
`;

export const vaultTemplate: TemplateBundle = {
  id: 'vault',
  name: 'Vault',
  description:
    'Dark minimal gallery. Near-black background, amber accent, image grid built-in. Ideal for photographers, designers, archives, single-artist portfolios.',
  files: {
    'styles.css': styles,
  },
};
