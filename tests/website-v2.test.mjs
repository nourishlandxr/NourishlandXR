import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../app/v2/', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('website v2 has the approved entry navigation and progressive cinematic hero assets', async () => {
  const [html, navigation, hero, video, mp4, poster, full3d] = await Promise.all([
    read('index.html'),
    read('site-navigation.js'),
    read('homepage-hero.js'),
    stat(new URL('assets/hero-wheel-v16-cinematic.webm', root)),
    stat(new URL('assets/hero-wheel-v16-cinematic.mp4', root)),
    stat(new URL('assets/hero-wheel-v16-poster.webp', root)),
    stat(new URL('full-3d/Nourishland-Hero-Living-v16.html', root))
  ]);

  assert.match(html, /href="#pathways">Education<\/a>/);
  assert.match(html, /href="#explore">Platform<\/a>/);
  assert.match(html, /<span class="menu-toggle-label">MENU<\/span>/);
  assert.match(html, /Explore Nourishland/);
  assert.match(html, /Create account/);
  assert.match(html, /About Nourishland/);
  assert.match(navigation, /nourishland:navigation-state/);
  assert.match(navigation, /data-navigation-open/);
  assert.match(hero, /preload="metadata"/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(hero, /Explore full 3D/);
  assert.doesNotMatch(hero, /mountBiomeHero/);
  assert.ok(video.size > 1_000_000 && video.size < 8_000_000, 'the cinematic loop stays within the test hero budget');
  assert.ok(mp4.size > 500_000 && mp4.size < 8_000_000, 'the MP4 compatibility fallback stays within the test hero budget');
  assert.ok(poster.size > 50_000 && poster.size < 750_000, 'the immediate poster stays lightweight');
  assert.ok(full3d.size > 60_000_000, 'the complete wheel remains available behind explicit intent');
});

test('website v2 keeps every local module and media reference resolvable', async () => {
  const html = await read('index.html');
  const files = new Set([
    ...html.matchAll(/(?:href|src)="((?!https?:|mailto:|#)[^"]+)"/g)
  ].map(match => match[1].split('?')[0]));
  for (const file of files) await stat(new URL(file, root));
});
