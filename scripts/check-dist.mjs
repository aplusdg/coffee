import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
assert(!html.includes('/src/main.js'), 'Deploy the Vite build, not the source HTML');
const assets = [...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g)].map(match => match[1]);
assert(assets.some(path => path.endsWith('.js')), 'Missing compiled JavaScript');
assert(assets.some(path => path.endsWith('.css')), 'Missing compiled stylesheet');
for (const path of assets) {
  assert(path.startsWith('./assets/'), `Asset must work under the Pages subpath: ${path}`);
  assert(existsSync(new URL(`../dist/${path}`, import.meta.url)), `Missing asset: ${path}`);
}
console.log('Built JavaScript and CSS exist and use relative URLs for GitHub Pages.');
