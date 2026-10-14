import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/u, '');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('IWSDK migration uses NLXR content and native near-hand grab', () => {
  const scene = JSON.parse(read('iwsdk/public/scenes/main.iwsdk.scene.json'));
  const config = JSON.parse(read('iwsdk/iwsdk.config.json'));
  const pod = scene.nodes.find(({ id }) => id === 'pigeon-pea-pod');
  assert.ok(pod);
  assert.equal(pod.content.asset, 'pigeon-pea-pod');
  assert.ok(pod.components.OneHandGrabbable);
  assert.equal(pod.components.DistanceGrabbable, undefined);
  assert.equal(config.world.xr.features.handTracking, true);
  assert.equal(config.world.features.grabbing.useHandPinchForGrab, true);
  assert.ok(existsSync(join(root, 'iwsdk/public/models/pigeon_pea_fresh_pod.glb')));
  assert.ok(!scene.nodes.some(({ id }) => id === 'robot' || id === 'plant-sansevieria'));
  assert.match(read('iwsdk/public/ui/welcome.uikitml'), /Pigeon Pea \/ PIMO/u);
});

test('hosted IWSDK route is opt-in and preserves the normal build', () => {
  const build = read('tools/build-hosted.mjs');
  const pkg = JSON.parse(read('package.json'));
  assert.match(build, /process\.argv\.includes\('--with-iwsdk'\)/u);
  assert.match(build, /path\.join\(webDist, 'iwsdk'\)/u);
  assert.match(build, /assertSafeFrontendTree\(iwsdkDist\)/u);
  assert.match(pkg.scripts['build:iwsdk-preview'], /--with-iwsdk/u);
  assert.doesNotMatch(pkg.scripts.build, /--with-iwsdk/u);
});

test('IWSDK PIMO browser is bound to all canonical Pigeon Pea roots and cells', () => {
  const scene = JSON.parse(read('iwsdk/public/scenes/main.iwsdk.scene.json'));
  const ui = read('iwsdk/public/ui/welcome.uikitml');
  const system = read('iwsdk/src/panel.js');
  const roots = PIGEON_PEA_PIM.nodes.filter(({ parentId }) => parentId === null);
  assert.equal(roots.length, 6);
  for (const root of roots) {
    assert.ok(ui.includes(`id="root-${root.id}"`), `missing UI control for ${root.id}`);
  }
  assert.equal((ui.match(/<Button id="root-/gu) || []).length, 6);
  assert.match(ui, /class="root-glyph">01</u);
  assert.match(ui, /border-radius: 18px/u);
  assert.match(system, /getElementById\(`root-\$\{root\.id\}`\)/u);
  assert.equal(PIGEON_PEA_PIM.nodes.length, 92);
  assert.match(system, /PIGEON_PEA_PIM\.sources\.find/u);
  assert.match(system, /cell\.safetyNote/u);
  assert.match(system, /removeEventListener/u);
  assert.ok(scene.nodes.find(({ id }) => id === 'welcome-panel')?.components.RayInteractable);
  assert.match(ui, /Check the plant, season and conditions in this real place/u);
  const exported = JSON.parse(read('iwsdk/src/pigeonPeaPim.data.json'));
  assert.deepEqual(exported.nodes.map(({ id }) => id), PIGEON_PEA_PIM.nodes.map(({ id }) => id));
  assert.ok(exported.nodes.every(({ media }) => media.length === 0));
  assert.equal(exported.identity.image, '');
  assert.match(read('tools/sync-iwsdk-pimo.mjs'), /PIGEON_PEA_PIM/u);
});
