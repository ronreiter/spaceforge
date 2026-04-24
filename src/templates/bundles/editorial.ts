import type { TemplateBundle } from '../registry';

// "Editorial" — longform magazine. Serif body, tight heading hierarchy,
// drop-caps-adjacent first letter. Designed for essays, journals, and
// features that want to feel like print.
const styles = `:root {
  --sf-font-heading: 'Fraunces', 'Playfair Display', 'Lora', Georgia, serif;
  --sf-font-body: 'Lora', Georgia, 'Times New Roman', serif;
  --pico-primary-500: #1f1a14;
  --pico-primary-600: #0c0a07;
  --pico-color: #1b1b1a;
  --pico-background-color: #fbfaf5;
}

html, body { background: #fbfaf5; }
body {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 5rem;
  color: #1b1b1a;
  line-height: 1.75;
  font-size: 17px;
  font-family: var(--sf-font-body);
}

header {
  margin-bottom: 3.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #d6ccb5;
}
header nav, header ul {
  display: flex; justify-content: space-between; align-items: baseline;
  list-style: none; padding: 0; margin: 0; gap: 1.25rem; flex-wrap: wrap;
}
header a { color: #5e554a; text-decoration: none; font-size: 0.9rem; font-family: var(--sf-font-heading); letter-spacing: 0.08em; text-transform: uppercase; }
header a:hover { color: #0c0a07; }
header h1, header .brand {
  font-family: var(--sf-font-heading); font-weight: 700;
  font-size: 1.2rem; letter-spacing: -0.01em; color: #0c0a07; margin: 0;
}

main h1 {
  font-family: var(--sf-font-heading);
  font-weight: 700; font-size: 2.75rem; line-height: 1.05;
  margin: 0 0 0.75rem; letter-spacing: -0.02em;
}
main h2 {
  font-family: var(--sf-font-heading);
  font-weight: 600; font-size: 1.65rem; margin-top: 2.75rem;
  letter-spacing: -0.01em;
}
main h3 { font-family: var(--sf-font-heading); font-weight: 600; font-size: 1.25rem; margin-top: 2rem; }

main p { margin: 0 0 1.15rem; }
main > p:first-of-type::first-letter {
  font-family: var(--sf-font-heading);
  float: left; font-size: 3.4rem; line-height: 0.9; padding: 0.25rem 0.6rem 0 0;
  color: #0c0a07; font-weight: 700;
}
main a { color: #0c0a07; text-decoration: underline; text-decoration-color: #b89f6d; text-underline-offset: 3px; }
main a:hover { text-decoration-color: #0c0a07; }

main blockquote {
  border-left: 3px solid #b89f6d;
  padding: 0.2rem 0 0.2rem 1rem; margin: 1.5rem 0;
  color: #5e554a; font-style: italic; font-size: 1.05rem;
}
main img { max-width: 100%; border-radius: 2px; margin: 1.5rem 0; }
main figure figcaption { color: #5e554a; font-size: 0.85rem; font-style: italic; text-align: center; margin-top: 0.4rem; }

.ti { color: #b89f6d; }

footer {
  margin-top: 5rem; padding-top: 1rem;
  border-top: 1px solid #d6ccb5;
  color: #5e554a; font-size: 0.85rem; text-align: center;
  font-family: var(--sf-font-heading); letter-spacing: 0.05em;
}
footer a { color: #5e554a; }
`;

export const editorialTemplate: TemplateBundle = {
  id: 'editorial',
  name: 'Editorial',
  description:
    'Longform magazine. Fraunces + Lora serifs, drop-cap opening paragraph, warm cream background. Strong fit for essays, features, interviews.',
  files: {
    'styles.css': styles,
  },
};
