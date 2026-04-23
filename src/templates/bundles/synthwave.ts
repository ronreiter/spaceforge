import type { TemplateBundle } from '../registry';

// "Synthwave" — 80s neon retro. Space Grotesk, deep purple-black
// background, magenta + cyan accents, glowing outlines. Contrast checked:
// body #f0e6ff on #0f0a1f (~15:1), cyan #47e0ff on deep purple passes AA.
const styles = `:root {
  --sf-font-heading: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --sw-bg: #0f0a1f;
  --sw-panel: #1a1233;
  --sw-ink: #f0e6ff;
  --sw-muted: #a090c0;
  --sw-magenta: #ff4ddb;
  --sw-cyan: #47e0ff;
  --sw-border: #352858;
  --pico-primary-500: var(--sw-magenta);
  --pico-primary-600: #e03fc0;
  --pico-primary-focus: rgba(255, 77, 219, 0.25);
  --pico-color: var(--sw-ink);
  --pico-background-color: var(--sw-bg);
}

html, body { background: var(--sw-bg); }
body {
  color: var(--sw-ink);
  font-family: var(--sf-font-body);
  line-height: 1.65;
  margin: 0;
  font-size: 16px;
  background-image:
    linear-gradient(180deg, rgba(71, 224, 255, 0.04) 0%, transparent 40%),
    linear-gradient(0deg, rgba(255, 77, 219, 0.06) 0%, transparent 30%);
  background-attachment: fixed;
}

header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--sw-border);
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--sw-cyan);
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-shadow: 0 0 12px rgba(71, 224, 255, 0.5);
}
header nav, header ul {
  display: flex;
  gap: 1.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
header a {
  color: var(--sw-muted);
  text-decoration: none;
  padding-bottom: 2px;
  border-bottom: 1px solid transparent;
}
header a:hover {
  color: var(--sw-magenta);
  border-bottom-color: var(--sw-magenta);
  text-shadow: 0 0 8px rgba(255, 77, 219, 0.6);
}

main {
  max-width: 760px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
  background: transparent;
}

main h1, main h2, main h3 {
  font-family: var(--sf-font-heading);
  letter-spacing: -0.01em;
}
main h1 {
  font-weight: 700;
  font-size: 2.6rem;
  margin: 0 0 0.75rem;
  line-height: 1.1;
  color: var(--sw-ink);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: linear-gradient(90deg, var(--sw-magenta), var(--sw-cyan));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
main h2 {
  font-weight: 600;
  font-size: 1.6rem;
  margin: 2.25rem 0 0.5rem;
  color: var(--sw-cyan);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
main h3 {
  font-weight: 600;
  font-size: 1.2rem;
  margin: 1.5rem 0 0.5rem;
  color: var(--sw-magenta);
}
main p { margin: 0 0 1.1rem; color: var(--sw-ink); }
main a {
  color: var(--sw-cyan);
  text-decoration: none;
  border-bottom: 1px dashed var(--sw-cyan);
  padding-bottom: 1px;
}
main a:hover {
  color: var(--sw-magenta);
  border-bottom-color: var(--sw-magenta);
  border-bottom-style: solid;
}
main ul, main ol { padding-left: 1.5rem; }
main ul li::marker { color: var(--sw-magenta); }
main img {
  max-width: 100%;
  margin: 1.25rem 0;
  border: 1px solid var(--sw-border);
  border-radius: 8px;
  box-shadow: 0 0 24px rgba(71, 224, 255, 0.12);
}
main article, main section {
  background: var(--sw-panel);
  border: 1px solid var(--sw-border);
  padding: 1.75rem;
  margin: 1.25rem 0;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(255, 77, 219, 0.08);
}
main blockquote {
  border-left: 3px solid var(--sw-magenta);
  background: rgba(255, 77, 219, 0.06);
  padding: 0.75rem 1.25rem;
  margin: 1.5rem 0;
  color: var(--sw-ink);
  border-radius: 0 8px 8px 0;
}
main code {
  background: var(--sw-panel);
  border: 1px solid var(--sw-border);
  color: var(--sw-cyan);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: ui-monospace, monospace;
}
main pre {
  background: var(--sw-panel);
  border: 1px solid var(--sw-border);
  color: var(--sw-ink);
  padding: 1rem;
  overflow-x: auto;
  border-radius: 8px;
}
main pre code { background: transparent; border: 0; padding: 0; color: inherit; }

footer {
  border-top: 1px solid var(--sw-border);
  padding: 1.5rem;
  margin-top: 3rem;
  color: var(--sw-muted);
  font-size: 0.8rem;
  text-align: center;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
footer a { color: var(--sw-cyan); }
`;

export const synthwaveTemplate: TemplateBundle = {
  id: 'synthwave',
  name: 'Synthwave',
  description:
    '80s neon retro. Space Grotesk uppercase headings with magenta→cyan gradient, deep purple-black background, glowing outlines, dashed cyan links. Good for music projects, game studios, electronic brands, experimental tech.',
  files: {
    'styles.css': styles,
  },
};
