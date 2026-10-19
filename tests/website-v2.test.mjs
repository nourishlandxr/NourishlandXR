import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../app/v2/', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('website v2 starts with the live central world and retains explicit fallback media', async () => {
  const [html, navigation, hero, video, mp4, poster, full3d] = await Promise.all([
    read('index.html'),
    read('site-navigation.js'),
    read('homepage-hero.js'),
    stat(new URL('assets/hero-v17-central-day.webm', root)),
    stat(new URL('assets/hero-v17-central-day.mp4', root)),
    stat(new URL('assets/hero-v17-central-day-poster-mp4.webp', root)),
    stat(new URL('full-3d/Nourishland-Hero-Living-v17.html', root))
  ]);

  assert.match(html, /href="#pathways">Education<\/a>/);
  assert.match(html, /href="#explore">Platform<\/a>/);
  assert.match(html, /<span class="menu-toggle-label">MENU<\/span>/);
  assert.match(html, /Explore Nourishland/);
  assert.match(html, /Create account/);
  assert.match(html, /About Nourishland/);
  assert.match(navigation, /nourishland:navigation-state/);
  assert.match(navigation, /data-navigation-open/);
  assert.match(hero, /Explore Nourishland/);
  assert.match(hero, /nl-cinematic-iframe/);
  assert.match(hero, /\?embed=1&central=1/);
  assert.match(hero, /loadLiveWorld\(\);/);
  assert.match(hero, /child\.heroInspection\.setCentral\(\)/);
  assert.match(hero, /heroInspection\.setUnlocked\(true\)/);
  assert.match(hero, /data-return-central/);
  assert.match(hero, /function playVideoFallback\(\)/);
  assert.doesNotMatch(hero, /<video/);
  assert.doesNotMatch(hero, /mountBiomeHero/);
  assert.ok(video.size > 1_000_000 && video.size < 35_000_000, 'the optional VP9 fallback stays within the V17 review budget');
  assert.ok(mp4.size > 500_000 && mp4.size < 16_000_000, 'the 24-second MP4 compatibility fallback stays within the V17 test budget');
  assert.ok(poster.size > 50_000 && poster.size < 2_500_000, 'the exact-frame poster stays within the V17 test budget');
  assert.ok(full3d.size > 60_000_000, 'the complete wheel remains available behind explicit intent');
});

test('website v2 keeps every local module and media reference resolvable', async () => {
  const html = await read('index.html');
  const files = new Set([
    ...html.matchAll(/(?:href|src)="((?!https?:|mailto:|#)[^"]+)"/g)
  ].map(match => match[1].split('?')[0]));
  for (const file of files) await stat(new URL(file, root));
});
