#!/usr/bin/env node
/**
 * Downloads every image referenced by content/site.json from the old WordPress
 * site into public/wp-content/uploads, keeping the original paths so old image
 * URLs (indexed by Google Images) keep working on the new site.
 *
 * Run this BEFORE the WordPress server is shut down:
 *   WP_MEDIA_ORIGIN=https://www.stamp2go.co.il npm run media:download
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ORIGIN = (process.env.WP_MEDIA_ORIGIN || 'https://www.stamp2go.co.il').replace(/\/$/, '');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/media-manifest.json'), 'utf8'));

let ok = 0;
let skipped = 0;
const failed = [];

async function fetchOne(rel) {
  const target = path.join(ROOT, 'public', decodeURI(rel));
  if (fs.existsSync(target)) {
    skipped++;
    return;
  }
  const res = await fetch(ORIGIN + encodeURI(decodeURI(rel)));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  ok++;
}

const queue = [...manifest];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const rel = queue.shift();
      try {
        await fetchOne(rel);
      } catch (e) {
        failed.push(`${rel} (${e.message})`);
      }
    }
  }),
);

console.log(`Downloaded ${ok}, already present ${skipped}, failed ${failed.length}`);
if (failed.length) {
  console.log(failed.join('\n'));
  process.exitCode = 1;
}
