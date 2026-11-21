// Leonida Trophy Guide, a gta6-trophy-guide-01 entry (Node 22, standard library only):
// the guide is this directory's app/ folder — plain static files a browser opens at
// app/index.html (ES module, CSS, no build step), offline: it loads nothing over the
// network, and its trophy list and guides are app/data/trophies.json. The program hands
// it in: it copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads (your screenshots, the first load's
// files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for
// byte what its own copy writes.
//
// Before copying, the program checks the entry's own gate rules on the trophy file:
// app/data/trophies.json must parse and name all 55 official trophies, each with a
// non-blank guide. A missing trophy or a blank guide stops the run with a clear error
// instead of handing in an entry the gate would refuse.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const trophiesPath = join(here, 'app', 'data', 'trophies.json');
const trophiesDoc = JSON.parse(readFileSync(trophiesPath, 'utf8'));
const trophies = trophiesDoc.trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  throw new Error(`app/data/trophies.json must hold 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'none'}`);
}
const unguided = trophies.filter((t) => typeof t.guide !== 'string' || t.guide.trim() === '');
if (unguided.length > 0) {
  throw new Error(`trophies without a guide: ${unguided.map((t) => t.name).join(', ')}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
// Revision from the test runs: fail early with a named file when a screenshot is over the
// 256 KiB cap, instead of letting buildDossier throw a bare size error after copying.
const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  for (const shot of readdirSync(shotsDir)) {
    const shotSize = statSync(join(shotsDir, shot)).size;
    if (shotSize > 262144) throw new Error(`screenshots/${shot} is ${shotSize} bytes, over the 256 KiB cap`);
  }
}
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
// Revision from the test runs: print a one-line summary so the build's result is visible
// without inspecting the output directory by hand.
const appEntries = readdirSync(join(out, 'app'), { recursive: true }).length;
const shotCount = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')).length : 0;
console.log(`wrote ${out}: ${appEntries} app entries, ${shotCount} screenshots, dossier.json ${statSync(join(out, 'dossier.json')).size} bytes`);
