import type { TemplateBundle } from '../registry';

// "Gazette" — editorial / literary magazine. Playfair Display headlines,
// Lora body, warm off-white background, serif typography throughout.
// Inspired by Literary Hub and The Paris Review's web design.
const layout = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title or "Gazette" }}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  {% include "_header.njk" %}
  <main>
    <article class="piece">
      {% if title %}<h1 class="headline">{{ title }}</h1>{% endif %}
      {% if description %}<p class="dek">{{ description }}</p>{% endif %}
      <div class="prose">
        {{ content | safe }}
      </div>
    </article>
  </main>
  {% include "_footer.njk" %}
</body>
</html>
`;

const header = `<header class="masthead">
  <div class="masthead-inner">
    <a class="wordmark" href="index.html">Gazette</a>
    <p class="strap">Dispatches, essays, and notes.</p>
  </div>
  <nav class="topnav">
    <a href="index.html">Home</a>
    <a href="about.html">About</a>
  </nav>
</header>
`;

const footer = `<footer class="colophon">
  <p>&copy; {{ "now" | date("%Y") }} Gazette. Set in Playfair Display &amp; Lora.</p>
</footer>
`;

const styles = `:root {
  --sf-font-heading: 'Playfair Display', Georgia, serif;
  --sf-font-body: 'Lora', Georgia, serif;
  --pico-primary-500: #7c2d12;
  --pico-primary-600: #5a1f0c;
  --pico-primary-focus: rgba(124,45,18,0.15);
  --gazette-paper: #faf7f1;
  --gazette-ink: #2a2420;
}

html { background: var(--gazette-paper); }
body {
  background: var(--gazette-paper);
  color: var(--gazette-ink);
  line-height: 1.65;
  margin: 0;
  font-size: 17px;
}

.masthead {
  text-align: center;
  padding: 2.5rem 1rem 1.25rem;
  border-bottom: 3px double #c4a389;
  margin: 0 1rem 2.5rem;
}
.masthead-inner .wordmark {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 3rem;
  letter-spacing: -0.01em;
  text-decoration: none;
  color: var(--gazette-ink);
  display: block;
  line-height: 1;
}
.masthead-inner .strap {
  font-style: italic;
  color: #7a6a5f;
  margin: 0.5rem 0 0.75rem;
  font-size: 0.95rem;
}
.masthead .topnav {
  display: flex;
  justify-content: center;
  gap: 2rem;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 1rem;
}
.masthead .topnav a {
  color: var(--gazette-ink);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
}
.masthead .topnav a:hover {
  border-bottom-color: var(--pico-primary-500);
}

main {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 1.25rem 3rem;
}

.piece .headline {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 2.6rem;
  line-height: 1.1;
  margin: 0 0 0.75rem;
  letter-spacing: -0.015em;
}
.piece .dek {
  font-style: italic;
  font-size: 1.15rem;
  color: #6b5e54;
  margin: 0 0 2rem;
  line-height: 1.5;
}
.piece .prose p:first-of-type::first-letter {
  font-family: var(--sf-font-heading);
  float: left;
  font-size: 3.8rem;
  line-height: 0.9;
  margin: 0.35rem 0.5rem 0 0;
  color: var(--pico-primary-500);
  font-weight: 700;
}
.piece .prose p { margin: 0 0 1.1rem; }
.piece .prose h2 {
  font-family: var(--sf-font-heading);
  margin: 2.25rem 0 0.5rem;
  font-size: 1.6rem;
}
.piece .prose h3 {
  font-family: var(--sf-font-heading);
  margin: 1.75rem 0 0.5rem;
  font-size: 1.25rem;
}
.piece .prose a {
  color: var(--pico-primary-500);
  text-decoration: underline;
  text-decoration-thickness: 1px;
}
.piece .prose blockquote {
  border-left: 3px solid #c4a389;
  padding: 0.25rem 0 0.25rem 1.25rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: #5a4d44;
}
.piece .prose img { max-width: 100%; margin: 1.25rem 0; }

.colophon {
  text-align: center;
  padding: 2rem 1rem;
  margin-top: 3rem;
  border-top: 1px solid #d8cbbb;
  color: #8a7b6f;
  font-size: 0.85rem;
  font-style: italic;
}
`;

export const gazetteTemplate: TemplateBundle = {
  id: 'gazette',
  name: 'Gazette',
  description:
    'Editorial magazine layout. Playfair Display headlines, Lora body, warm paper background, drop-cap opening. Great for essays, long-form writing, restaurants, and editorial content.',
  files: {
    '_layout.njk': layout,
    '_header.njk': header,
    '_footer.njk': footer,
    'styles.css': styles,
  },
};
