import type { TemplateBundle } from '../registry';

// "Orbit" — modern tech / SaaS product marketing. Space Grotesk for
// headings, Inter for body. Wide layout, subtle accent color, gradient
// border on the header. Inspired by Vercel and Linear's marketing pages.
const layout = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title or "Orbit" }}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  {% include "_header.njk" %}
  <main class="shell">
    {% if title %}
      <section class="hero">
        <h1>{{ title }}</h1>
        {% if description %}<p class="hero-sub">{{ description }}</p>{% endif %}
      </section>
    {% endif %}
    <article class="body">
      {{ content | safe }}
    </article>
  </main>
  {% include "_footer.njk" %}
</body>
</html>
`;

const header = `<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="index.html">
      <span class="brand-dot"></span> Orbit
    </a>
    <nav class="nav-links">
      <a href="index.html">Home</a>
      <a href="about.html">About</a>
    </nav>
  </div>
</header>
`;

const footer = `<footer class="foot">
  <div class="foot-inner">
    <span>&copy; {{ "now" | date("%Y") }} Orbit</span>
    <span class="foot-meta">Built with Spaceforge</span>
  </div>
</footer>
`;

const styles = `:root {
  --sf-font-heading: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --sf-font-body: 'Inter', system-ui, sans-serif;
  --orbit-accent: #6366f1;
  --orbit-accent-600: #4f46e5;
  --orbit-ink: #0f172a;
  --orbit-muted: #475569;
  --orbit-surface: #ffffff;
  --orbit-sheet: #f8fafc;
  --pico-primary-500: var(--orbit-accent);
  --pico-primary-600: var(--orbit-accent-600);
  --pico-primary-focus: rgba(99,102,241,0.18);
}

html { background: var(--orbit-sheet); }
body {
  color: var(--orbit-ink);
  background: var(--orbit-sheet);
  line-height: 1.6;
  margin: 0;
  font-size: 16px;
}

.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
}
.nav-inner {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0.9rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.nav .brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--orbit-ink);
  text-decoration: none;
  letter-spacing: -0.01em;
}
.nav .brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--orbit-accent) 0%, #a855f7 100%);
  box-shadow: 0 0 12px rgba(99,102,241,0.5);
}
.nav-links { display: flex; gap: 1.5rem; }
.nav-links a {
  color: var(--orbit-muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}
.nav-links a:hover { color: var(--orbit-ink); }

main.shell {
  max-width: 820px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
}

.hero {
  margin: 0 0 2.5rem;
  padding: 2.5rem 2rem;
  background: var(--orbit-surface);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.02), 0 4px 20px rgba(15,23,42,0.04);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: "";
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, var(--orbit-accent), #a855f7, var(--orbit-accent));
  border-radius: 18px;
  z-index: -1;
  opacity: 0.15;
  pointer-events: none;
}
.hero h1 {
  font-family: var(--sf-font-heading);
  font-weight: 700;
  font-size: 2.4rem;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.hero-sub {
  color: var(--orbit-muted);
  font-size: 1.1rem;
  margin: 0;
  max-width: 48ch;
}

.body {
  background: var(--orbit-surface);
  padding: 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}
.body h1, .body h2, .body h3 {
  font-family: var(--sf-font-heading);
  letter-spacing: -0.01em;
}
.body h2 { margin-top: 2rem; font-size: 1.5rem; }
.body h3 { margin-top: 1.5rem; font-size: 1.2rem; }
.body p { margin: 0 0 1rem; }
.body a { color: var(--orbit-accent-600); text-decoration: none; font-weight: 500; }
.body a:hover { text-decoration: underline; }
.body ul, .body ol { padding-left: 1.25rem; }
.body code {
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
}
.body pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
}
.body blockquote {
  border-left: 3px solid var(--orbit-accent);
  padding: 0.25rem 0 0.25rem 1rem;
  margin: 1rem 0;
  color: var(--orbit-muted);
}

.foot {
  border-top: 1px solid #e2e8f0;
  background: var(--orbit-surface);
  padding: 1.5rem;
  margin-top: 3rem;
}
.foot-inner {
  max-width: 1040px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  color: var(--orbit-muted);
  font-size: 0.85rem;
}
.foot-meta { opacity: 0.7; }
`;

export const orbitTemplate: TemplateBundle = {
  id: 'orbit',
  name: 'Orbit',
  description:
    'Modern tech / SaaS marketing. Space Grotesk headings, Inter body, indigo accent, sticky glassy nav and elevated cards. Great for product landing pages, startups, and developer tools.',
  files: {
    '_layout.njk': layout,
    '_header.njk': header,
    '_footer.njk': footer,
    'styles.css': styles,
  },
};
