import type { TemplateBundle } from '../registry';

// "Riviera" — bright, coastal, photography-forward. Big images, sea-blue
// accent, clean sans-serif nav. Built for cafés, small restaurants,
// travel pages, boutique hotels.
const styles = `:root {
  --sf-font-heading: 'Fraunces', 'Playfair Display', Georgia, serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --sf-sea: #0a7285;
  --sf-sun: #f4a35c;
  --sf-ink: #0b2b33;
  --pico-primary-500: var(--sf-sea);
  --pico-primary-600: #076172;
  --pico-color: var(--sf-ink);
  --pico-background-color: #ffffff;
}

html, body { background: #ffffff; }
body {
  max-width: 1040px; margin: 0 auto; padding: 2rem 1.5rem 5rem;
  color: var(--sf-ink); line-height: 1.65; font-size: 17px;
  font-family: var(--sf-font-body);
}

header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 1.25rem; margin-bottom: 2.5rem;
  border-bottom: 1px solid rgba(10,114,133,0.18);
}
header nav, header ul {
  display: flex; gap: 1.5rem; list-style: none; padding: 0; margin: 0;
}
header a {
  color: var(--sf-ink); text-decoration: none; font-weight: 500;
  font-size: 0.95rem;
}
header a:hover { color: var(--sf-sea); }
header h1, header .brand {
  font-family: var(--sf-font-heading); font-style: italic;
  font-weight: 600; font-size: 1.5rem; letter-spacing: -0.01em;
  color: var(--sf-sea); margin: 0;
}

main h1 {
  font-family: var(--sf-font-heading);
  font-weight: 600; font-size: clamp(2.5rem, 6vw, 4rem); line-height: 1.05;
  margin: 0 0 1rem; letter-spacing: -0.02em; color: var(--sf-ink);
}
main h1 em { color: var(--sf-sea); font-style: italic; }
main h2 {
  font-family: var(--sf-font-heading);
  font-weight: 600; font-size: 1.8rem; margin-top: 3rem; color: var(--sf-ink);
  letter-spacing: -0.01em;
}
main h3 { font-family: var(--sf-font-body); font-weight: 600; font-size: 1.15rem; margin-top: 2rem; color: var(--sf-sea); text-transform: uppercase; letter-spacing: 0.08em; }

main p { margin: 0 0 1.15rem; max-width: 68ch; }
main a { color: var(--sf-sea); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
main a:hover { color: var(--sf-sun); }

main .cta, a.button, a.cta {
  display: inline-block; background: var(--sf-sea); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 999px;
  text-decoration: none; font-weight: 500; margin: 0.5rem 0;
}
main .cta:hover, a.button:hover, a.cta:hover { background: var(--sf-sun); color: var(--sf-ink); }

main img {
  max-width: 100%; border-radius: 8px; margin: 1.5rem 0;
  box-shadow: 0 12px 32px rgba(11, 43, 51, 0.12);
}

.ti { color: var(--sf-sun); }

footer {
  margin-top: 5rem; padding-top: 2rem;
  border-top: 1px solid rgba(10,114,133,0.18);
  color: var(--sf-ink); font-size: 0.9rem;
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
}
footer a { color: var(--sf-sea); text-decoration: none; }
footer a:hover { color: var(--sf-sun); }
`;

export const rivieraTemplate: TemplateBundle = {
  id: 'riviera',
  name: 'Riviera',
  description:
    'Bright coastal + photography-forward. Fraunces italics, sea-blue + sun-orange palette, rounded CTAs, image-heavy. For cafés, hotels, travel pages, restaurants.',
  files: {
    'styles.css': styles,
  },
};
