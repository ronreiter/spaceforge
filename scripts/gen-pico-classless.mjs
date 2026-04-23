#!/usr/bin/env node
// Regenerate src/runtime/picoClassless.generated.ts from the installed Pico
// classless stylesheet. Run this after `npm install` or when Pico is
// upgraded. Tracked in git so next build/typecheck works without a network
// round-trip to node_modules.

import { readFileSync, writeFileSync } from 'node:fs';

const src = 'node_modules/@picocss/pico/css/pico.classless.min.css';
const dest = 'src/runtime/picoClassless.generated.ts';

const css = readFileSync(src, 'utf8');
const out =
  `// AUTO-GENERATED from @picocss/pico/css/pico.classless.min.css.\n` +
  `// Run: node scripts/gen-pico-classless.mjs to regenerate.\n` +
  `// eslint-disable-next-line\n` +
  `export const picoClasslessCss: string = ${JSON.stringify(css)};\n`;
writeFileSync(dest, out);
console.log(`Wrote ${dest} (${css.length} bytes)`);
