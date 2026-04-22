import type { TemplateBundle } from '../registry';

// "Sunset" — warm cafe / wellness. Fraunces display + Inter body, peach +
// coral palette on a soft cream background, rounded corners everywhere.
// Contrast checked: body text #3d1f0a on #fef3ec (~14:1), accent #c44522
// on cream passes AA for body text.
const styles = `:root {
  --sf-font-heading: 'Fraunces', 'Playfair Display', Georgia, serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --sunset-bg: #fef3ec;
  --sunset-panel: #ffffff;
  --sunset-ink: #3d1f0a;
  --sunset-muted: #6b4a38;
  --sunset-accent: #c44522;
  --sunset-accent-deep: #8c2e14;
  --sunset-peach: #f7c9a8;
  --sunset-border: #f1dfd2;
  --pico-primary-500: var(--sunset-accent);
  --pico-primary-600: var(--sunset-accent-deep);
  --pico-primary-focus: rgba(196, 69, 34, 0.18);
  --pico-color: var(--sunset-ink);
  --pico-background-color: var(--sunset-bg);
}

html, body { background: var(--sunset-bg); }
body {
  color: var(--sunset-ink);
  font-family: var(--sf-font-body);
  line-height: 1.65;
  margin: 0;
  font-size: 16px;
}

header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--sunset-border);
  background: var(--sunset-bg);
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
  color: var(--sunset-accent-deep);
  margin: 0;
  font-style: italic;
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
  color: var(--sunset-muted);
  text-decoration: none;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
}
header a:hover {
  background: var(--sunset-peach);
  color: var(--sunset-ink);
}

main {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
  background: transparent;
}

main h1, main h2, main h3 {
  font-family: var(--sf-font-heading);
  color: var(--sunset-ink);
  letter-spacing: -0.01em;
}
main h1 {
  font-weight: 600;
  font-size: 2.6rem;
  margin: 0 0 0.75rem;
  line-height: 1.1;
}
main h2 {
  font-weight: 600;
  font-size: 1.7rem;
  margin: 2rem 0 0.5rem;
  color: var(--sunset-accent-deep);
}
main h3 {
  font-weight: 600;
  font-size: 1.25rem;
  margin: 1.5rem 0 0.5rem;
}
main p { margin: 0 0 1.1rem; color: var(--sunset-ink); }
main a {
  color: var(--sunset-accent);
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
main a:hover { color: var(--sunset-accent-deep); }
main ul, main ol { padding-left: 1.5rem; }
main ul li::marker { color: var(--sunset-accent); }
main img { max-width: 100%; border-radius: 12px; margin: 1.25rem 0; }
main article, main section {
  background: var(--sunset-panel);
  border: 1px solid var(--sunset-border);
  padding: 1.5rem;
  margin: 1rem 0;
  border-radius: 14px;
}
main blockquote {
  border-left: 4px solid var(--sunset-accent);
  background: var(--sunset-panel);
  padding: 0.75rem 1.25rem;
  margin: 1.5rem 0;
  color: var(--sunset-muted);
  font-style: italic;
  border-radius: 0 12px 12px 0;
}
main code {
  background: var(--sunset-peach);
  color: var(--sunset-ink);
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
  font-size: 0.9em;
}

footer {
  text-align: center;
  padding: 2rem 1.25rem;
  margin-top: 3rem;
  border-top: 1px solid var(--sunset-border);
  color: var(--sunset-muted);
  font-size: 0.85rem;
}
footer a { color: var(--sunset-accent-deep); }
`;

export const sunsetTemplate: TemplateBundle = {
  id: 'sunset',
  name: 'Sunset',
  description:
    'Warm cafe / wellness. Fraunces italic display, Inter body, peach + coral palette on cream, rounded panels. Good for cafes, bakeries, wellness studios, lifestyle brands.',
  files: {
    'styles.css': styles,
  },
};
