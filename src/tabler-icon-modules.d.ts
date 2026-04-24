// @tabler/icons-react doesn't ship per-icon .d.ts files for its ESM
// build; only the barrel. lib/favicon/render.ts imports each icon's
// raw __iconNode constant directly so it can render SVG strings
// server-side without pulling React in, so we declare the wildcard
// shape here.

declare module '@tabler/icons-react/dist/esm/icons/Icon*.mjs' {
  export const __iconNode: Array<[string, Record<string, string | number>]>;
}
