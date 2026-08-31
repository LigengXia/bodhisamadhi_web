/**
 * Copy the pdf.js worker out of `pdfjs-dist` (pinned to 5.4.296 by
 * `react-pdf@10.5.0` — Docs/3 §6.3) into `public/` so it is served from our
 * own origin at the exact version the library expects. A mismatch fails only
 * at runtime when a practice text is opened; keeping the copy build-generated
 * means it can never drift from the installed version.
 *
 * Runs before `dev` and `build`. The copy is git-ignored.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const pdfjsDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
const src = path.join(pdfjsDir, 'build', 'pdf.worker.min.mjs');
const destDir = path.join(process.cwd(), 'public');
const dest = path.join(destDir, 'pdf.worker.min.mjs');

if (!fs.existsSync(src)) {
  console.error(`pdf.js worker not found at ${src} — run npm ci first.`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);

const { version } = require('pdfjs-dist/package.json');
console.log(`copied pdf.js worker ${version} → public/pdf.worker.min.mjs`);
