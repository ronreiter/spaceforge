// Rewrite a CSS stylesheet so all its rules only apply inside a given
// wrapper selector. Handles the subset our templates use: top-level rules,
// :root/html/body selectors collapsed onto the wrapper, @media blocks kept
// whole with their inner selectors scoped. Deliberately lossy — @font-face,
// @keyframes, and @import are emitted at the top unchanged (those targets
// are global by design).
//
// Not a full CSS parser. Good enough for the preview canvas in the WYSIWYG
// editor. The cost of missing edge cases is cosmetic: styles might not
// apply to the editor; they never leak out, because every rule goes through
// the wrapper.

const ROOT_ALIASES = new Set([':root', 'html', 'body', 'html body', 'body html']);

function scopeSelector(selector: string, scope: string): string {
  return selector
    .split(',')
    .map((part) => {
      const s = part.trim();
      if (!s) return '';
      if (ROOT_ALIASES.has(s.toLowerCase())) return scope;
      // The selector matches the scope wrapper itself (e.g. the wrapper is
      // `.sf-canvas` and the rule is `.sf-canvas h1`) — leave it alone.
      if (s.startsWith(scope)) return s;
      return `${scope} ${s}`;
    })
    .filter(Boolean)
    .join(', ');
}

// Walk a CSS source string, splitting into rules and at-rules. Handles one
// level of at-rule nesting (@media, @supports) which is all our templates
// need.
type Block =
  | { kind: 'rule'; selector: string; body: string }
  | { kind: 'at-nested'; prelude: string; inner: string }
  | { kind: 'at-flat'; text: string };

function splitBlocks(src: string): Block[] {
  const out: Block[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    // Skip whitespace / comments.
    while (i < n && /\s/.test(src[i])) i++;
    if (i < n && src[i] === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (i >= n) break;

    // Capture prelude up to `{` or `;`.
    const start = i;
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === '{') break;
      if (c === ';' && depth === 0) break;
      i++;
    }
    const prelude = src.slice(start, i).trim();

    if (i < n && src[i] === ';') {
      // Flat at-rule (e.g. @import, @charset).
      out.push({ kind: 'at-flat', text: `${prelude};` });
      i++;
      continue;
    }
    if (i >= n || src[i] !== '{') break;

    // Balanced body.
    i++;
    const bodyStart = i;
    depth = 1;
    while (i < n && depth > 0) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      if (depth > 0) i++;
    }
    const body = src.slice(bodyStart, i);
    if (i < n && src[i] === '}') i++;

    if (prelude.startsWith('@')) {
      const head = prelude.slice(1).split(/\s/)[0].toLowerCase();
      if (head === 'keyframes' || head === 'font-face' || head === 'page') {
        out.push({ kind: 'at-flat', text: `${prelude} { ${body} }` });
      } else {
        out.push({ kind: 'at-nested', prelude, inner: body });
      }
    } else if (prelude) {
      out.push({ kind: 'rule', selector: prelude, body });
    }
  }
  return out;
}

export function scopeCss(css: string, scope: string): string {
  if (!css.trim()) return '';
  const blocks = splitBlocks(css);
  const out: string[] = [];

  for (const b of blocks) {
    if (b.kind === 'at-flat') {
      out.push(b.text);
    } else if (b.kind === 'rule') {
      out.push(`${scopeSelector(b.selector, scope)} { ${b.body.trim()} }`);
    } else {
      // Nested at-rule: scope inner rules.
      const innerBlocks = splitBlocks(b.inner);
      const innerOut: string[] = [];
      for (const ib of innerBlocks) {
        if (ib.kind === 'rule') {
          innerOut.push(`${scopeSelector(ib.selector, scope)} { ${ib.body.trim()} }`);
        } else if (ib.kind === 'at-flat') {
          innerOut.push(ib.text);
        } else {
          // Second-level nesting collapsed to flat (rare in our templates).
          innerOut.push(`${ib.prelude} { ${ib.inner} }`);
        }
      }
      out.push(`${b.prelude} { ${innerOut.join('\n')} }`);
    }
  }
  return out.join('\n');
}
