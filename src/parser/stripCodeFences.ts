// Some models wrap file bodies in a markdown code fence, e.g.:
//   ```html
//   <!doctype html>...
//   ```
// The fence is noise — it ends up rendered literally in the preview.
// Strip a single leading fence line and a single trailing fence line
// when they clearly bookend the content. Anything else (inline
// backticks, fences in the middle of the file) is left alone.

const LEADING_FENCE = /^\s*```[^\n`]*\n/;
const TRAILING_FENCE = /\n?```[ \t]*\s*$/;

export function stripCodeFences(body: string): string {
  let out = body.replace(LEADING_FENCE, '');
  if (out !== body) {
    // Only strip a trailing fence if we stripped a leading one —
    // otherwise a stray ``` at the end of an unwrapped file is
    // probably intentional (e.g. markdown content).
    out = out.replace(TRAILING_FENCE, '');
  }
  return out;
}
