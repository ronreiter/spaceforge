import type { TemplateBundle } from '../registry';

// "Brutalist" — harsh grid, oversized Space Grotesk headlines, chunky black
// borders on every block, electric-yellow accent. No rounded corners, no
// box-shadows. Good for design studios, indie agencies, and manifestos.
const styles = `:root {
  --sf-font-heading: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --brut-bg: #f5f1e8;
  --brut-ink: #0a0a0a;
  --brut-accent: #ffe500;
  --brut-accent-contrast: #0a0a0a;
  --pico-primary-500: var(--brut-ink);
  --pico-primary-600: #000;
  --pico-primary-focus: rgba(255, 229, 0, 0.35);
  --pico-color: var(--brut-ink);
  --pico-background-color: var(--brut-bg);
}

html, body { background: var(--brut-bg); }
body {
  color: var(--brut-ink);
  font-family: var(--sf-font-body);
  line-height: 1.55;
  margin: 0;
  font-size: 17px;
}

header {
  background: var(--brut-ink);
  color: var(--brut-bg);
  padding: 1rem 1.5rem;
  border-bottom: 4px solid var(--brut-ink);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 1.4rem;
  color: var(--brut-bg);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}
header nav, header ul {
  display: flex;
  gap: 1.25rem;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
header a {
  color: var(--brut-bg);
  text-decoration: none;
  padding: 0.15rem 0.35rem;
  border: 2px solid transparent;
}
header a:hover {
  background: var(--brut-accent);
  color: var(--brut-accent-contrast);
  border-color: var(--brut-bg);
}

main {
  max-width: 820px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
  background: transparent;
}

main h1, main h2, main h3 {
  font-family: var(--sf-font-heading);
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--brut-ink);
}
main h1 {
  font-weight: 700;
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  margin: 0 0 1rem;
  text-transform: uppercase;
  background: var(--brut-accent);
  display: inline-block;
  padding: 0.15em 0.3em;
  border: 3px solid var(--brut-ink);
}
main h2 {
  font-weight: 700;
  font-size: 1.8rem;
  margin: 2.5rem 0 0.75rem;
  text-transform: uppercase;
}
main h3 {
  font-weight: 600;
  font-size: 1.25rem;
  margin: 1.75rem 0 0.5rem;
  text-transform: uppercase;
}
main p {
  margin: 0 0 1.1rem;
  line-height: 1.6;
}
main a {
  color: var(--brut-ink);
  text-decoration: none;
  background: var(--brut-accent);
  padding: 0 0.2em;
  border-bottom: 2px solid var(--brut-ink);
}
main a:hover {
  background: var(--brut-ink);
  color: var(--brut-accent);
}
main ul, main ol { padding-left: 1.5rem; }
main li { margin-bottom: 0.35rem; }
main img {
  max-width: 100%;
  margin: 1.25rem 0;
  border: 3px solid var(--brut-ink);
  display: block;
}
main article, main section {
  background: #fff;
  border: 3px solid var(--brut-ink);
  padding: 1.5rem;
  margin: 1.25rem 0;
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--brut-ink);
}
main code {
  background: var(--brut-ink);
  color: var(--brut-accent);
  padding: 0.1rem 0.4rem;
  font-size: 0.9em;
  font-family: ui-monospace, monospace;
}
main pre {
  background: var(--brut-ink);
  color: var(--brut-bg);
  padding: 1rem;
  overflow-x: auto;
  border: 3px solid var(--brut-ink);
}
main pre code { background: transparent; color: inherit; }
main blockquote {
  border-left: 6px solid var(--brut-ink);
  background: var(--brut-accent);
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
  font-weight: 500;
  color: var(--brut-ink);
}

footer {
  border-top: 4px solid var(--brut-ink);
  background: var(--brut-ink);
  color: var(--brut-bg);
  padding: 1.5rem;
  margin-top: 3rem;
  text-align: center;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
footer a {
  color: var(--brut-accent);
  text-decoration: underline;
}
`;

export const brutalistTemplate: TemplateBundle = {
  id: 'brutalist',
  name: 'Brutalist',
  description:
    'Loud grid, oversized Space Grotesk headlines, electric-yellow accent, chunky black borders, hard offset shadows. Good for design studios, agencies, and opinionated indie sites.',
  files: {
    'styles.css': styles,
  },
};
