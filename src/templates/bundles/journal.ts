import type { TemplateBundle } from '../registry';

// "Journal" — minimalist single-column blog. Inter for everything. Generous
// line height. Neutral gray palette with a subtle black accent. Inspired by
// bearblog.dev and Herman Martinus's personal-site style.
const layout = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title or "Journal" }}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  {% include "_header.njk" %}
  <main>
    {% if title %}<h1 class="page-title">{{ title }}</h1>{% endif %}
    {% if description %}<p class="page-lede">{{ description }}</p>{% endif %}
    <article class="post">
      {{ content | safe }}
    </article>
  </main>
  {% include "_footer.njk" %}
</body>
</html>
`;

const header = `<header class="site-header">
  <nav>
    <a class="brand" href="index.html">Journal</a>
    <div class="links">
      <a href="index.html">Home</a>
      <a href="about.html">About</a>
    </div>
  </nav>
</header>
`;

const footer = `<footer class="site-footer">
  <p>&copy; {{ "now" | date("%Y") }} Journal &middot; Built with Spaceforge.</p>
</footer>
`;

const styles = `:root {
  --sf-font-heading: 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --pico-primary-500: #111111;
  --pico-primary-600: #000000;
  --pico-primary-focus: rgba(0,0,0,0.1);
}

body {
  max-width: 680px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  line-height: 1.7;
  color: #1a1a1a;
  font-size: 16px;
}

.site-header {
  border-bottom: 1px solid #eee;
  margin-bottom: 3rem;
  padding-bottom: 1rem;
}
.site-header nav {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.site-header .brand {
  font-weight: 600;
  font-size: 1.1rem;
  text-decoration: none;
  color: #1a1a1a;
}
.site-header .links { display: flex; gap: 1.25rem; }
.site-header .links a {
  text-decoration: none;
  color: #555;
  font-size: 0.9rem;
}
.site-header .links a:hover { color: #000; }

main { padding: 0; }
.page-title { font-weight: 700; font-size: 2rem; margin: 0 0 0.25rem; letter-spacing: -0.01em; }
.page-lede  { color: #777; margin: 0 0 2rem; font-size: 1.05rem; }

.post h1, .post h2, .post h3 { letter-spacing: -0.01em; }
.post h2 { margin-top: 2.5rem; font-size: 1.4rem; }
.post h3 { margin-top: 1.75rem; font-size: 1.15rem; }
.post p { margin: 0 0 1.1rem; }
.post a { color: #1a1a1a; text-decoration: underline; text-decoration-color: #bbb; }
.post a:hover { text-decoration-color: #1a1a1a; }
.post ul, .post ol { padding-left: 1.25rem; }
.post img { max-width: 100%; border-radius: 4px; margin: 1rem 0; }
.post blockquote {
  border-left: 3px solid #1a1a1a;
  padding: 0.1rem 0 0.1rem 1rem;
  margin: 1.25rem 0;
  color: #555;
  font-style: italic;
}

.site-footer {
  margin-top: 4rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  color: #888;
  font-size: 0.85rem;
  text-align: center;
}
`;

export const journalTemplate: TemplateBundle = {
  id: 'journal',
  name: 'Journal',
  description:
    'Minimalist single-column blog. Inter typography, neutral greys, ample whitespace. Great for writing, personal sites, and slow-reading content.',
  files: {
    '_layout.njk': layout,
    '_header.njk': header,
    '_footer.njk': footer,
    'styles.css': styles,
  },
};
