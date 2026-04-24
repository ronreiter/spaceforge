import type { TemplateBundle } from '../registry';

// "Paper" — weddings, events, soft personal sites. Warm cream background,
// handwritten-adjacent serif display, rounded corners, soft shadows. Feels
// like an invitation you'd actually open.
const styles = `:root {
  --sf-font-display: 'Playfair Display', 'Fraunces', Georgia, serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --sf-ink: #3b2f2a;
  --sf-cream: #faf4ea;
  --sf-blush: #e4b8a0;
  --pico-primary-500: #8c6a54;
  --pico-primary-600: #6b4f3d;
  --pico-color: var(--sf-ink);
  --pico-background-color: var(--sf-cream);
}

html, body { background: var(--sf-cream); }
body {
  max-width: 720px; margin: 0 auto; padding: 3rem 1.25rem 5rem;
  color: var(--sf-ink); line-height: 1.75; font-size: 17px;
  font-family: var(--sf-font-body);
}

header {
  text-align: center; margin-bottom: 3rem;
  padding-bottom: 2rem; border-bottom: 1px dashed var(--sf-blush);
}
header nav, header ul {
  display: flex; justify-content: center; gap: 1.5rem;
  list-style: none; padding: 0; margin: 0.75rem 0 0;
}
header a {
  color: var(--sf-ink); text-decoration: none;
  font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase;
}
header a:hover { color: #8c6a54; }
header h1, header .brand {
  font-family: var(--sf-font-display); font-weight: 400;
  font-size: 2.25rem; letter-spacing: 0.02em; color: var(--sf-ink); margin: 0;
  font-style: italic;
}

main { text-align: center; }
main h1 {
  font-family: var(--sf-font-display); font-weight: 400; font-style: italic;
  font-size: 2.75rem; line-height: 1.1;
  margin: 0 0 0.75rem; color: var(--sf-ink);
}
main h2 {
  font-family: var(--sf-font-display); font-weight: 400; font-style: italic;
  font-size: 1.75rem; margin-top: 3rem; color: var(--sf-ink);
}
main h3 { font-family: var(--sf-font-body); font-weight: 500; font-size: 1.1rem; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2rem; color: #8c6a54; }

main p { margin: 0 0 1.15rem; text-align: center; max-width: 58ch; margin-left: auto; margin-right: auto; }
main a { color: #8c6a54; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
main a:hover { color: var(--sf-ink); }

main img {
  max-width: 100%; border-radius: 4px; margin: 2rem auto;
  box-shadow: 0 6px 24px rgba(59, 47, 42, 0.12);
}

main hr, main .ornament {
  border: 0; text-align: center; margin: 2rem 0; color: var(--sf-blush);
}
main hr::after { content: "✦"; font-size: 1.2rem; }

.ti { color: var(--sf-blush); }

footer {
  margin-top: 5rem; padding-top: 2rem;
  border-top: 1px dashed var(--sf-blush);
  color: #8c6a54; font-size: 0.85rem; text-align: center;
  letter-spacing: 0.05em;
}
footer a { color: #8c6a54; }
`;

export const paperTemplate: TemplateBundle = {
  id: 'paper',
  name: 'Paper',
  description:
    'Warm, romantic, invitation-style. Playfair Display italics, cream background, blush accent, centered layout. For weddings, events, and soft personal pages.',
  files: {
    'styles.css': styles,
  },
};
