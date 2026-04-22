import type { TemplateBundle } from '../registry';

// "Noir" — luxury fashion / editorial at night. Playfair Display on
// near-black, gold accents, wide letter-spacing, thin rules, refined
// feminine-luxury energy. Targets generic semantic elements.
const styles = `:root {
  --sf-font-heading: 'Playfair Display', Georgia, serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --noir-bg: #0d0d0e;
  --noir-panel: #131315;
  --noir-ink: #f5f1e6;
  --noir-muted: #b8b0a0;
  --noir-gold: #c9a86a;
  --noir-gold-deep: #9f8245;
  --noir-border: #26241f;
  --pico-primary-500: var(--noir-gold);
  --pico-primary-600: var(--noir-gold-deep);
  --pico-primary-focus: rgba(201, 168, 106, 0.2);
  --pico-color: var(--noir-ink);
  --pico-background-color: var(--noir-bg);
}

html, body { background: var(--noir-bg); }
body {
  color: var(--noir-ink);
  font-family: var(--sf-font-body);
  line-height: 1.7;
  margin: 0;
  font-size: 16px;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

header {
  padding: 2rem 1.5rem 1rem;
  border-bottom: 1px solid var(--noir-border);
  text-align: center;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 400;
  font-size: 2rem;
  color: var(--noir-ink);
  margin: 0;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}
header nav, header ul {
  display: flex;
  justify-content: center;
  gap: 2.5rem;
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  flex-wrap: wrap;
  font-size: 0.75rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
}
header a {
  color: var(--noir-muted);
  text-decoration: none;
  padding-bottom: 4px;
  border-bottom: 1px solid transparent;
  transition: color 120ms, border-color 120ms;
}
header a:hover {
  color: var(--noir-gold);
  border-bottom-color: var(--noir-gold);
}

main {
  max-width: 720px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 5rem;
  background: transparent;
}

main h1, main h2, main h3 {
  font-family: var(--sf-font-heading);
  color: var(--noir-ink);
}
main h1 {
  font-weight: 400;
  font-size: 3rem;
  line-height: 1.1;
  margin: 0 0 0.5rem;
  letter-spacing: 0.02em;
  text-align: center;
}
main h1::after {
  content: "";
  display: block;
  width: 48px;
  height: 1px;
  background: var(--noir-gold);
  margin: 1.25rem auto 0;
}
main h2 {
  font-weight: 400;
  font-size: 1.7rem;
  margin: 2.5rem 0 0.75rem;
  letter-spacing: 0.05em;
  color: var(--noir-gold);
}
main h3 {
  font-weight: 500;
  font-size: 1.2rem;
  margin: 1.75rem 0 0.5rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--noir-ink);
}
main p { margin: 0 0 1.2rem; font-weight: 400; }
main a {
  color: var(--noir-gold);
  text-decoration: none;
  border-bottom: 1px solid var(--noir-gold-deep);
  padding-bottom: 1px;
}
main a:hover { border-bottom-color: var(--noir-gold); }
main ul, main ol { padding-left: 1.5rem; }
main ul li::marker { color: var(--noir-gold); }
main img {
  max-width: 100%;
  margin: 1.5rem 0;
  display: block;
}
main article, main section {
  background: var(--noir-panel);
  border: 1px solid var(--noir-border);
  padding: 2rem;
  margin: 1.5rem 0;
  border-radius: 0;
}
main blockquote {
  border: 0;
  border-top: 1px solid var(--noir-gold);
  border-bottom: 1px solid var(--noir-gold);
  padding: 1.25rem 0;
  margin: 2rem 0;
  color: var(--noir-ink);
  font-family: var(--sf-font-heading);
  font-style: italic;
  font-size: 1.15rem;
  text-align: center;
  font-weight: 400;
}
main code {
  background: var(--noir-panel);
  border: 1px solid var(--noir-border);
  color: var(--noir-gold);
  padding: 0.1rem 0.4rem;
  font-size: 0.9em;
  font-family: ui-monospace, monospace;
}
main pre {
  background: var(--noir-panel);
  border: 1px solid var(--noir-border);
  color: var(--noir-ink);
  padding: 1rem;
  overflow-x: auto;
}
main pre code { background: transparent; border: 0; padding: 0; color: inherit; }

footer {
  border-top: 1px solid var(--noir-border);
  padding: 2rem 1rem;
  margin-top: 3rem;
  text-align: center;
  color: var(--noir-muted);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
footer a { color: var(--noir-gold); }
`;

export const noirTemplate: TemplateBundle = {
  id: 'noir',
  name: 'Noir',
  description:
    'Luxury editorial at night. Playfair Display on near-black, gold accents, wide tracked uppercase nav, thin rules. Good for fashion, jewelry, perfumery, fine dining, boutique hotels.',
  files: {
    'styles.css': styles,
  },
};
