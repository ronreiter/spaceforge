import type { TemplateBundle } from '../registry';

// "Journal" — minimalist single-column blog. Inter everywhere, generous
// line height, neutral grey palette, understated links. Works on ANY
// `_layout.njk` the model produces — we target semantic elements only.
const styles = `:root {
  --sf-font-heading: 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --pico-primary-500: #111111;
  --pico-primary-600: #000000;
  --pico-primary-focus: rgba(0, 0, 0, 0.1);
  --pico-color: #1a1a1a;
  --pico-background-color: #ffffff;
}

html, body { background: #ffffff; }
body {
  max-width: 680px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  color: #1a1a1a;
  line-height: 1.75;
  font-size: 16px;
  font-family: var(--sf-font-body);
}

header {
  margin-bottom: 3rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eaeaea;
}
header nav, header ul {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 1.25rem;
  flex-wrap: wrap;
}
header a {
  color: #555;
  text-decoration: none;
  font-size: 0.9rem;
}
header a:hover { color: #000; }
header h1, header h2, header .brand {
  font-weight: 600;
  font-size: 1.1rem;
  letter-spacing: -0.01em;
  color: #1a1a1a;
  margin: 0;
}

main, article, section {
  background: transparent;
  box-shadow: none;
  border: 0;
  padding: 0;
}

main h1 { font-weight: 700; font-size: 2rem; margin: 0 0 0.5rem; letter-spacing: -0.01em; }
main h2 { margin-top: 2.5rem; font-size: 1.4rem; font-weight: 600; letter-spacing: -0.005em; }
main h3 { margin-top: 1.75rem; font-size: 1.15rem; font-weight: 600; }
main p  { margin: 0 0 1.1rem; }
main a  { color: #1a1a1a; text-decoration: underline; text-decoration-color: #bbb; text-underline-offset: 3px; }
main a:hover { text-decoration-color: #1a1a1a; }
main ul, main ol { padding-left: 1.25rem; }
main img { max-width: 100%; border-radius: 4px; margin: 1rem 0; }
main blockquote {
  border-left: 3px solid #1a1a1a;
  padding: 0.1rem 0 0.1rem 1rem;
  margin: 1.25rem 0;
  color: #555;
  font-style: italic;
}
main code {
  background: #f4f4f4;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 0.9em;
}

footer {
  margin-top: 4rem;
  padding-top: 1rem;
  border-top: 1px solid #eaeaea;
  color: #888;
  font-size: 0.85rem;
  text-align: center;
}
footer a { color: #555; }
`;

export const journalTemplate: TemplateBundle = {
  id: 'journal',
  name: 'Journal',
  description:
    'Minimalist single-column blog. Inter typography, neutral greys, ample whitespace. Good for writing, personal sites, and slow-reading content.',
  files: {
    'styles.css': styles,
  },
};
