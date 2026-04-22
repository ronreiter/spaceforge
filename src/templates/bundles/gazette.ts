import type { TemplateBundle } from '../registry';

// "Gazette" — editorial / literary magazine. Playfair Display headlines,
// Lora body, warm off-white background, serif typography throughout.
// Targets generic semantic elements so it works with any layout.
const styles = `:root {
  --sf-font-heading: 'Playfair Display', Georgia, serif;
  --sf-font-body: 'Lora', Georgia, serif;
  --pico-primary-500: #7c2d12;
  --pico-primary-600: #5a1f0c;
  --pico-primary-focus: rgba(124, 45, 18, 0.15);
  --pico-color: #2a2420;
  --pico-background-color: #faf7f1;
  --gazette-paper: #faf7f1;
  --gazette-ink: #2a2420;
  --gazette-rule: #c4a389;
}

html, body { background: var(--gazette-paper); }
body {
  color: var(--gazette-ink);
  font-family: var(--sf-font-body);
  line-height: 1.65;
  margin: 0;
  font-size: 17px;
}

header {
  text-align: center;
  padding: 2.5rem 1.5rem 1rem;
  border-bottom: 3px double var(--gazette-rule);
  margin: 0 0 2.5rem;
}
header h1, header h2, header .brand {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 3rem;
  letter-spacing: -0.01em;
  line-height: 1;
  margin: 0;
  color: var(--gazette-ink);
}
header p { font-style: italic; color: #7a6a5f; margin: 0.5rem 0 0.75rem; font-size: 0.95rem; }
header nav, header ul {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
header a {
  color: var(--gazette-ink);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
}
header a:hover { border-bottom-color: var(--pico-primary-500); }

main {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 1.25rem 3rem;
  background: transparent;
  box-shadow: none;
  border: 0;
}

main h1 {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 2.6rem;
  line-height: 1.1;
  margin: 0 0 0.75rem;
  letter-spacing: -0.015em;
}
main h2 {
  font-family: var(--sf-font-heading);
  margin: 2.25rem 0 0.5rem;
  font-size: 1.6rem;
}
main h3 {
  font-family: var(--sf-font-heading);
  margin: 1.75rem 0 0.5rem;
  font-size: 1.25rem;
}
main > p:first-of-type::first-letter,
main > article > p:first-of-type::first-letter,
main > section > p:first-of-type::first-letter {
  font-family: var(--sf-font-heading);
  float: left;
  font-size: 3.8rem;
  line-height: 0.9;
  margin: 0.35rem 0.5rem 0 0;
  color: var(--pico-primary-500);
  font-weight: 700;
}
main p { margin: 0 0 1.1rem; }
main a {
  color: var(--pico-primary-500);
  text-decoration: underline;
  text-decoration-thickness: 1px;
}
main blockquote {
  border-left: 3px solid var(--gazette-rule);
  padding: 0.25rem 0 0.25rem 1.25rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: #5a4d44;
}
main img { max-width: 100%; margin: 1.25rem 0; }
main ul, main ol { padding-left: 1.5rem; }
main code {
  background: #efe8da;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 0.9em;
}

footer {
  text-align: center;
  padding: 2rem 1rem;
  margin-top: 3rem;
  border-top: 1px solid #d8cbbb;
  color: #8a7b6f;
  font-size: 0.85rem;
  font-style: italic;
}
footer a { color: var(--pico-primary-500); }
`;

export const gazetteTemplate: TemplateBundle = {
  id: 'gazette',
  name: 'Gazette',
  description:
    'Editorial magazine. Playfair Display headlines, Lora body, warm paper background, drop-cap opening. Good for essays, long-form writing, restaurants, and editorial content.',
  files: {
    'styles.css': styles,
  },
};
