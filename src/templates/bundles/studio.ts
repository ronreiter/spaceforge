import type { TemplateBundle } from '../registry';

// "Studio" — creative agency / boutique product. Bold Space Grotesk display,
// chunky buttons, generous whitespace, a single orange accent. Works well
// for portfolios, small SaaS landing pages, and one-off project sites.
const styles = `:root {
  --sf-font-heading: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --sf-accent: #ff5b26;
  --sf-ink: #0b0b0c;
  --pico-primary-500: var(--sf-ink);
  --pico-primary-600: var(--sf-ink);
  --pico-color: var(--sf-ink);
  --pico-background-color: #fdfcf9;
}

html, body { background: #fdfcf9; }
body {
  max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem;
  color: var(--sf-ink); line-height: 1.6; font-size: 17px;
  font-family: var(--sf-font-body);
}

header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 2rem; margin-bottom: 3.5rem;
  border-bottom: 2px solid var(--sf-ink);
}
header nav, header ul {
  display: flex; gap: 1.5rem; list-style: none; padding: 0; margin: 0;
}
header a {
  color: var(--sf-ink); text-decoration: none;
  font-family: var(--sf-font-heading); font-weight: 500;
}
header a:hover { color: var(--sf-accent); }
header h1, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 700; font-size: 1.35rem; letter-spacing: -0.02em; margin: 0;
}

main h1 {
  font-family: var(--sf-font-heading);
  font-size: clamp(2.25rem, 6vw, 4rem); line-height: 1.02;
  font-weight: 700; letter-spacing: -0.035em; margin: 0 0 1.5rem;
}
main h1 em { color: var(--sf-accent); font-style: normal; }
main h2 {
  font-family: var(--sf-font-heading);
  font-size: 1.75rem; font-weight: 600; letter-spacing: -0.02em;
  margin-top: 3rem;
}
main h3 { font-family: var(--sf-font-heading); font-size: 1.2rem; font-weight: 600; margin-top: 2rem; }

main p { margin: 0 0 1.15rem; max-width: 62ch; }
main a {
  color: var(--sf-ink);
  text-decoration-color: var(--sf-accent); text-decoration-thickness: 2px; text-underline-offset: 4px;
}
main a:hover { background: var(--sf-accent); color: #fff; text-decoration-color: transparent; padding: 0 0.15em; }

main .cta, main a.cta, a.button {
  display: inline-block; background: var(--sf-ink); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 2px;
  text-decoration: none; font-family: var(--sf-font-heading); font-weight: 500;
  margin: 0.5rem 0;
}
main .cta:hover, main a.cta:hover, a.button:hover { background: var(--sf-accent); color: #fff; }

main img { max-width: 100%; border-radius: 2px; margin: 1.5rem 0; }

.ti { color: var(--sf-accent); }

footer {
  margin-top: 5rem; padding-top: 2rem; border-top: 2px solid var(--sf-ink);
  color: var(--sf-ink); font-family: var(--sf-font-heading);
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
}
footer a { color: var(--sf-ink); text-decoration: none; }
footer a:hover { color: var(--sf-accent); }
`;

export const studioTemplate: TemplateBundle = {
  id: 'studio',
  name: 'Studio',
  description:
    'Creative agency + portfolio. Space Grotesk display, bold orange accent, chunky CTAs. Good for design studios, portfolios, small SaaS.',
  files: {
    'styles.css': styles,
  },
};
