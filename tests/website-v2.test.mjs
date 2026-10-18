import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../app/v2/', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('website v2 has the approved entry navigation and complete hero assets', async () => {
  const [html, navigation, hero, model] = await Promise.all([
    read('index.html'),
    read('site-navigation.js'),
    read('biome-hero.js'),
    stat(new URL('assets/hero-wheel-biome-surface.glb', root))
  ]);

  assert.match(html, /href="#pathways">Education<\/a>/);
  assert.match(html, /href="#explore">Platform<\/a>/);
  assert.match(html, /<span class="menu-toggle-label">MENU<\/span>/);
  assert.match(html, /Explore Nourishland/);
  assert.match(html, /Create account/);
  assert.match(html, /About Nourishland/);
  assert.match(navigation, /nourishland:navigation-state/);
  assert.match(navigation, /data-navigation-open/);
  assert.match(hero, /LOCKED_VIEW\.pitch, LOCKED_VIEW\.yaw, state\.roll/);
  assert.match(hero, /setDistance\(zoomView\(targetState\.distance, dy/);
  assert.ok(model.size > 30_000_000, 'the coated biome model is present');
});

test('website v2 keeps every local module and media reference resolvable', async () => {
  const html = await read('index.html');
  const files = new Set([
    ...html.matchAll(/(?:href|src)="((?!https?:|mailto:|#)[^"]+)"/g)
  ].map(match => match[1].split('?')[0]));
  for (const file of files) await stat(new URL(file, root));
});
