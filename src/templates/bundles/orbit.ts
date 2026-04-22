import type { TemplateBundle } from '../registry';

// "Orbit" — modern tech / SaaS marketing. Space Grotesk headings, Inter
// body, indigo accent, elevated card surfaces over a slate background.
// Targets generic semantic elements only.
const styles = `:root {
  --sf-font-heading: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --orbit-accent: #6366f1;
  --orbit-accent-600: #4f46e5;
  --orbit-ink: #0f172a;
  --orbit-muted: #475569;
  --orbit-surface: #ffffff;
  --orbit-sheet: #f8fafc;
  --orbit-border: #e2e8f0;
  --pico-primary-500: var(--orbit-accent);
  --pico-primary-600: var(--orbit-accent-600);
  --pico-primary-focus: rgba(99, 102, 241, 0.18);
  --pico-color: var(--orbit-ink);
  --pico-background-color: var(--orbit-sheet);
}

html, body { background: var(--orbit-sheet); }
body {
  color: var(--orbit-ink);
  font-family: var(--sf-font-body);
  line-height: 1.6;
  margin: 0;
  font-size: 16px;
}

header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--orbit-border);
  padding: 0.9rem 1.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--orbit-ink);
  letter-spacing: -0.01em;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
header h1::before, header h2::before, header .brand::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--orbit-accent) 0%, #a855f7 100%);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
  display: inline-block;
}
header nav, header ul {
  display: flex;
  gap: 1.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
}
header a {
  color: var(--orbit-muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}
header a:hover { color: var(--orbit-ink); }

main {
  max-width: 820px;
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
  font-size: 2.4rem;
  margin: 0 0 0.5rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
main h2 { margin-top: 2rem; font-size: 1.5rem; font-weight: 600; }
main h3 { margin-top: 1.5rem; font-size: 1.2rem; font-weight: 600; }
main p { margin: 0 0 1rem; color: var(--orbit-ink); }
main a { color: var(--orbit-accent-600); text-decoration: none; font-weight: 500; }
main a:hover { text-decoration: underline; }
main ul, main ol { padding-left: 1.25rem; }
main img { max-width: 100%; border-radius: 12px; margin: 1rem 0; }
main article, main section {
  background: var(--orbit-surface);
  padding: 2rem;
  margin: 1rem 0;
  border: 1px solid var(--orbit-border);
  border-radius: 16px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02), 0 4px 20px rgba(15, 23, 42, 0.04);
}
main code {
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
}
main pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
}
main pre code { background: transparent; padding: 0; color: inherit; }
main blockquote {
  border-left: 3px solid var(--orbit-accent);
  padding: 0.25rem 0 0.25rem 1rem;
  margin: 1rem 0;
  color: var(--orbit-muted);
}

footer {
  border-top: 1px solid var(--orbit-border);
  background: var(--orbit-surface);
  padding: 1.5rem;
  margin-top: 3rem;
  color: var(--orbit-muted);
  font-size: 0.85rem;
  text-align: center;
}
footer a { color: var(--orbit-accent-600); }
`;

export const orbitTemplate: TemplateBundle = {
  id: 'orbit',
  name: 'Orbit',
  description:
    'Modern tech / SaaS. Space Grotesk headings, Inter body, indigo accent, sticky glassy header and elevated card surfaces. Good for product landing pages, startups, and developer tools.',
  files: {
    'styles.css': styles,
  },
};
