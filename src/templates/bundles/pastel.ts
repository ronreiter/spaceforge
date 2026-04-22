import type { TemplateBundle } from '../registry';

// "Pastel" — soft cottagecore / zine. Fraunces display headings, Inter
// body, lavender and peach palette, rounded cards, dotted underlines, warm
// feminine energy. Targets generic semantic elements.
const styles = `:root {
  --sf-font-heading: 'Fraunces', 'Playfair Display', Georgia, serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --pastel-bg: #fdf3ef;
  --pastel-panel: #ffffff;
  --pastel-ink: #3d2b3a;
  --pastel-muted: #6d5468;
  --pastel-accent: #b07cc0;
  --pastel-accent-deep: #7a4a8c;
  --pastel-peach: #f4c4b6;
  --pastel-border: #ead7d1;
  --pico-primary-500: var(--pastel-accent);
  --pico-primary-600: var(--pastel-accent-deep);
  --pico-primary-focus: rgba(176, 124, 192, 0.2);
  --pico-color: var(--pastel-ink);
  --pico-background-color: var(--pastel-bg);
}

html, body { background: var(--pastel-bg); }
body {
  color: var(--pastel-ink);
  font-family: var(--sf-font-body);
  line-height: 1.7;
  margin: 0;
  font-size: 16px;
}

header {
  background: var(--pastel-panel);
  padding: 1.25rem 1.75rem;
  margin: 0;
  border-bottom: 1px solid var(--pastel-border);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 600;
  font-size: 1.4rem;
  color: var(--pastel-accent-deep);
  margin: 0;
  font-style: italic;
  letter-spacing: -0.01em;
}
header nav, header ul {
  display: flex;
  gap: 1.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
  font-size: 0.9rem;
}
header a {
  color: var(--pastel-muted);
  text-decoration: none;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  transition: background 120ms;
}
header a:hover {
  background: var(--pastel-peach);
  color: var(--pastel-ink);
}

main {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
  background: transparent;
}

main h1, main h2, main h3 {
  font-family: var(--sf-font-heading);
  color: var(--pastel-ink);
  letter-spacing: -0.01em;
}
main h1 {
  font-weight: 600;
  font-size: 2.6rem;
  margin: 0 0 0.75rem;
  line-height: 1.1;
  font-style: italic;
}
main h2 {
  font-weight: 600;
  font-size: 1.6rem;
  margin: 2rem 0 0.5rem;
  color: var(--pastel-accent-deep);
}
main h3 {
  font-weight: 600;
  font-size: 1.2rem;
  margin: 1.5rem 0 0.5rem;
}
main p { margin: 0 0 1.1rem; }
main a {
  color: var(--pastel-accent-deep);
  text-decoration: underline dotted;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
main a:hover { text-decoration-style: solid; }
main ul, main ol { padding-left: 1.5rem; }
main ul li::marker { color: var(--pastel-accent); }
main img {
  max-width: 100%;
  border-radius: 18px;
  margin: 1.25rem 0;
}
main article, main section {
  background: var(--pastel-panel);
  border: 1px solid var(--pastel-border);
  padding: 1.75rem;
  margin: 1.25rem 0;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(176, 124, 192, 0.08);
}
main blockquote {
  border-left: 4px solid var(--pastel-accent);
  background: var(--pastel-panel);
  padding: 0.75rem 1.25rem;
  margin: 1.5rem 0;
  color: var(--pastel-muted);
  font-style: italic;
  border-radius: 0 12px 12px 0;
}
main code {
  background: var(--pastel-peach);
  color: var(--pastel-ink);
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
  font-size: 0.9em;
}

footer {
  text-align: center;
  padding: 2rem 1rem;
  margin-top: 3rem;
  color: var(--pastel-muted);
  font-size: 0.85rem;
  font-style: italic;
}
footer a { color: var(--pastel-accent-deep); }
`;

export const pastelTemplate: TemplateBundle = {
  id: 'pastel',
  name: 'Pastel',
  description:
    'Soft cottagecore zine. Fraunces italic display headings, Inter body, lavender + peach palette, rounded cards, dotted underlines. Good for lifestyle blogs, florists, indie brands, creative portfolios.',
  files: {
    'styles.css': styles,
  },
};
