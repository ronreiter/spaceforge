import type { TemplateBundle } from '../registry';

// "Botanical" — earthy forest green + cream. Lora body for calm reading,
// Fraunces headings, deep forest accent. Contrast checked: body text
// #1a2e1f on #f7f3e8 (~13:1), accent #2d5a3d on cream passes AA.
const styles = `:root {
  --sf-font-heading: 'Fraunces', 'Playfair Display', Georgia, serif;
  --sf-font-body: 'Lora', Georgia, serif;
  --bot-bg: #f7f3e8;
  --bot-panel: #fffdf5;
  --bot-ink: #1a2e1f;
  --bot-muted: #4a5a4f;
  --bot-accent: #2d5a3d;
  --bot-accent-deep: #1a3d26;
  --bot-moss: #7a9a7e;
  --bot-border: #dcd6c1;
  --pico-primary-500: var(--bot-accent);
  --pico-primary-600: var(--bot-accent-deep);
  --pico-primary-focus: rgba(45, 90, 61, 0.2);
  --pico-color: var(--bot-ink);
  --pico-background-color: var(--bot-bg);
}

html, body { background: var(--bot-bg); }
body {
  color: var(--bot-ink);
  font-family: var(--sf-font-body);
  line-height: 1.7;
  margin: 0;
  font-size: 17px;
}

header {
  padding: 1.5rem 1.5rem;
  border-bottom: 1px solid var(--bot-border);
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 600;
  font-size: 1.5rem;
  color: var(--bot-accent-deep);
  margin: 0;
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
  letter-spacing: 0.05em;
}
header a {
  color: var(--bot-muted);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
}
header a:hover {
  color: var(--bot-accent);
  border-bottom-color: var(--bot-accent);
}

main {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
  background: transparent;
}

main h1, main h2, main h3 {
  font-family: var(--sf-font-heading);
  color: var(--bot-ink);
  letter-spacing: -0.005em;
}
main h1 {
  font-weight: 600;
  font-size: 2.5rem;
  margin: 0 0 0.5rem;
  line-height: 1.15;
}
main h2 {
  font-weight: 600;
  font-size: 1.7rem;
  margin: 2rem 0 0.5rem;
  color: var(--bot-accent);
}
main h2::before {
  content: "";
  display: inline-block;
  width: 14px;
  height: 2px;
  background: var(--bot-accent);
  vertical-align: middle;
  margin-right: 0.75rem;
}
main h3 {
  font-weight: 600;
  font-size: 1.25rem;
  margin: 1.75rem 0 0.5rem;
}
main p { margin: 0 0 1.1rem; color: var(--bot-ink); }
main a {
  color: var(--bot-accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
main a:hover { color: var(--bot-accent-deep); }
main ul, main ol { padding-left: 1.5rem; }
main ul li::marker { color: var(--bot-moss); }
main img {
  max-width: 100%;
  border-radius: 6px;
  margin: 1.25rem 0;
  box-shadow: 0 2px 12px rgba(26, 46, 31, 0.1);
}
main article, main section {
  background: var(--bot-panel);
  border: 1px solid var(--bot-border);
  padding: 1.75rem;
  margin: 1.25rem 0;
  border-radius: 8px;
}
main blockquote {
  border-left: 3px solid var(--bot-moss);
  padding: 0.5rem 0 0.5rem 1.25rem;
  margin: 1.5rem 0;
  color: var(--bot-muted);
  font-style: italic;
}
main code {
  background: var(--bot-panel);
  border: 1px solid var(--bot-border);
  color: var(--bot-accent-deep);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: ui-monospace, monospace;
}

footer {
  padding: 2rem 1.25rem;
  margin-top: 3rem;
  border-top: 1px solid var(--bot-border);
  color: var(--bot-muted);
  font-size: 0.85rem;
  text-align: center;
  font-style: italic;
}
footer a { color: var(--bot-accent); }
`;

export const botanicalTemplate: TemplateBundle = {
  id: 'botanical',
  name: 'Botanical',
  description:
    'Earthy garden / herbal. Fraunces headings, Lora body, forest green + cream palette, quiet decorative rule before h2. Good for florists, apothecaries, naturopaths, plant shops, farm-to-table restaurants.',
  files: {
    'styles.css': styles,
  },
};
