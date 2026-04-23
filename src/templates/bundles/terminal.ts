import type { TemplateBundle } from '../registry';

// "Terminal" — developer portfolio / CLI-inspired. JetBrains-ish monospace
// everywhere, dark slate background, phosphor-green accent, flat edges, no
// rounded corners. Targets generic semantic elements.
const styles = `:root {
  --sf-font-heading: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace;
  --sf-font-body: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace;
  --terminal-bg: #0b0f14;
  --terminal-panel: #10161d;
  --terminal-ink: #d7e0ea;
  --terminal-muted: #98a3b5;
  --terminal-accent: #7dd957;
  --terminal-accent-dim: #4e9e35;
  --terminal-border: #1f2a36;
  --pico-primary-500: var(--terminal-accent);
  --pico-primary-600: var(--terminal-accent-dim);
  --pico-primary-focus: rgba(125, 217, 87, 0.2);
  --pico-color: var(--terminal-ink);
  --pico-background-color: var(--terminal-bg);
}

html, body { background: var(--terminal-bg); }
body {
  color: var(--terminal-ink);
  font-family: var(--sf-font-body);
  line-height: 1.65;
  margin: 0;
  font-size: 15px;
}

header {
  border-bottom: 1px solid var(--terminal-border);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--terminal-accent);
  margin: 0;
  letter-spacing: 0;
}
header h1::before, header h2::before, header .brand::before {
  content: "$ ";
  color: var(--terminal-muted);
}
header nav, header ul {
  display: flex;
  gap: 1.25rem;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
  font-size: 0.85rem;
}
header a {
  color: var(--terminal-muted);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
}
header a:hover {
  color: var(--terminal-accent);
  border-bottom-color: var(--terminal-accent);
}

main {
  max-width: 760px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 5rem;
  background: transparent;
}

main h1, main h2, main h3 {
  font-family: var(--sf-font-heading);
  color: var(--terminal-ink);
  letter-spacing: 0;
}
main h1 {
  font-weight: 700;
  font-size: 1.8rem;
  margin: 0 0 0.5rem;
}
main h1::before {
  content: "# ";
  color: var(--terminal-accent);
}
main h2 {
  font-weight: 600;
  font-size: 1.3rem;
  margin-top: 2.25rem;
}
main h2::before {
  content: "## ";
  color: var(--terminal-accent-dim);
}
main h3 {
  font-weight: 600;
  font-size: 1.05rem;
  margin-top: 1.5rem;
}
main h3::before {
  content: "### ";
  color: var(--terminal-muted);
}
main p { margin: 0 0 1rem; color: var(--terminal-ink); }
main a {
  color: var(--terminal-accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--terminal-accent-dim);
}
main a:hover { border-bottom-style: solid; }
main ul, main ol { padding-left: 1.25rem; }
main ul li::marker { content: "> "; color: var(--terminal-accent-dim); }
main img {
  max-width: 100%;
  border: 1px solid var(--terminal-border);
  margin: 1rem 0;
  image-rendering: auto;
}
main article, main section {
  background: var(--terminal-panel);
  border: 1px solid var(--terminal-border);
  padding: 1.5rem;
  margin: 1rem 0;
  border-radius: 0;
}
main code {
  background: var(--terminal-panel);
  border: 1px solid var(--terminal-border);
  padding: 0.1rem 0.4rem;
  font-size: 0.9em;
  color: var(--terminal-accent);
}
main pre {
  background: var(--terminal-panel);
  border: 1px solid var(--terminal-border);
  color: var(--terminal-ink);
  padding: 1rem;
  overflow-x: auto;
  border-radius: 0;
}
main pre code {
  background: transparent;
  border: 0;
  padding: 0;
  color: inherit;
}
main blockquote {
  border-left: 3px solid var(--terminal-accent);
  background: rgba(125, 217, 87, 0.05);
  padding: 0.5rem 0 0.5rem 1rem;
  margin: 1.25rem 0;
  color: var(--terminal-muted);
}

footer {
  border-top: 1px solid var(--terminal-border);
  padding: 1.25rem 1.5rem;
  margin-top: 3rem;
  color: var(--terminal-muted);
  font-size: 0.8rem;
  text-align: center;
}
footer a { color: var(--terminal-accent-dim); }
`;

export const terminalTemplate: TemplateBundle = {
  id: 'terminal',
  name: 'Terminal',
  description:
    'CLI-inspired dev portfolio. Monospace throughout, dark slate background, phosphor-green accent, flat borders. Good for developer portfolios, side projects, and docs that want a hacker aesthetic.',
  files: {
    'styles.css': styles,
  },
};
