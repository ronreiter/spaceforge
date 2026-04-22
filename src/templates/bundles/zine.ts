import type { TemplateBundle } from '../registry';

// "Zine" — photocopy / DIY publication. High-contrast black on cream,
// oversized Space Grotesk headings in all caps, risograph-style splotch
// accents using filters. Contrast: body #0a0a0a on #f6f2e6 (~16:1).
const styles = `:root {
  --sf-font-heading: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --zine-bg: #f6f2e6;
  --zine-ink: #0a0a0a;
  --zine-accent: #e94f37;
  --zine-accent-ink: #0a0a0a;
  --zine-muted: #3a3a3a;
  --pico-primary-500: var(--zine-ink);
  --pico-primary-600: #000;
  --pico-primary-focus: rgba(233, 79, 55, 0.25);
  --pico-color: var(--zine-ink);
  --pico-background-color: var(--zine-bg);
}

html, body { background: var(--zine-bg); }
body {
  color: var(--zine-ink);
  font-family: var(--sf-font-body);
  line-height: 1.6;
  margin: 0;
  font-size: 16px;
}

header {
  padding: 1.25rem 1.5rem;
  border-bottom: 2px solid var(--zine-ink);
  background: var(--zine-bg);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--zine-ink);
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
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
header a {
  color: var(--zine-ink);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  padding-bottom: 2px;
}
header a:hover {
  color: var(--zine-accent);
  border-bottom-color: var(--zine-accent);
}

main {
  max-width: 740px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
  background: transparent;
}

main h1, main h2, main h3 {
  font-family: var(--sf-font-heading);
  color: var(--zine-ink);
  text-transform: uppercase;
  letter-spacing: -0.02em;
}
main h1 {
  font-weight: 700;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  line-height: 1;
  margin: 0 0 1rem;
  position: relative;
  display: inline-block;
}
main h1::after {
  content: "";
  position: absolute;
  left: -4px;
  right: -4px;
  bottom: 2px;
  height: 12px;
  background: var(--zine-accent);
  z-index: -1;
  opacity: 0.5;
}
main h2 {
  font-weight: 700;
  font-size: 1.7rem;
  margin: 2.5rem 0 0.75rem;
}
main h3 {
  font-weight: 600;
  font-size: 1.25rem;
  margin: 1.75rem 0 0.5rem;
  letter-spacing: 0.02em;
}
main p { margin: 0 0 1.1rem; color: var(--zine-ink); }
main a {
  color: var(--zine-ink);
  text-decoration: underline;
  text-decoration-color: var(--zine-accent);
  text-decoration-thickness: 3px;
  text-underline-offset: 3px;
}
main a:hover { background: var(--zine-accent); color: var(--zine-ink); }
main ul, main ol { padding-left: 1.5rem; }
main ul li::marker { color: var(--zine-accent); font-weight: 700; }
main img {
  max-width: 100%;
  margin: 1.25rem 0;
  filter: grayscale(0.3) contrast(1.1);
  border: 2px solid var(--zine-ink);
}
main article, main section {
  background: #fff;
  border: 2px solid var(--zine-ink);
  padding: 1.5rem;
  margin: 1.25rem 0;
  border-radius: 0;
}
main blockquote {
  border: 0;
  background: var(--zine-accent);
  color: var(--zine-accent-ink);
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
  font-weight: 600;
  font-family: var(--sf-font-heading);
  letter-spacing: -0.01em;
}
main code {
  background: var(--zine-ink);
  color: var(--zine-bg);
  padding: 0.1rem 0.4rem;
  font-size: 0.9em;
  font-family: ui-monospace, monospace;
}

footer {
  border-top: 2px solid var(--zine-ink);
  padding: 1.5rem;
  margin-top: 3rem;
  color: var(--zine-ink);
  font-size: 0.8rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
footer a { color: var(--zine-ink); text-decoration: underline; text-decoration-color: var(--zine-accent); text-decoration-thickness: 2px; }
`;

export const zineTemplate: TemplateBundle = {
  id: 'zine',
  name: 'Zine',
  description:
    'DIY photocopy publication. Space Grotesk all-caps headlines with risograph-red highlighter, high-contrast black on cream, bordered cards, underline-as-accent. Good for indie music, art collectives, manifestos, punk brands.',
  files: {
    'styles.css': styles,
  },
};
