import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../app/screens/biomeWheelXR.js',import.meta.url),'utf8');

test('biome wheel is gated behind immersive device support and prepared before session start',()=>{
 assert.match(source,/navigator\.xr\.isSessionSupported/);
 assert.match(source,/if\(!support\[selected\]\|\|session\)return/);
 const prepare=source.indexOf('async function prepareWheel');
 const load=source.indexOf('loadWheel()',prepare);
 const request=source.indexOf('navigator.xr.requestSession');
 assert.ok(prepare>0&&load>prepare&&request>load,'model preparation precedes immersive session request');
 assert.match(source,/renderer\.compile\(scene,camera\)/);
 assert.match(source,/renderer\.render\(scene,camera\)/);
});

test('biome wheel keeps the visitor fixed and exposes required controls',()=>{
 assert.match(source,/requiredFeatures:\['local-floor'\]/);
 assert.doesNotMatch(source,/locomotion|teleport|moveForward/);
 assert.match(source,/data-xr-mode="immersive-vr"/);
 assert.match(source,/data-xr-mode="immersive-ar"/);
 assert.match(source,/data-xr-light/);
 assert.match(source,/data-xr-exit/);
 assert.match(source,/dense-forest-tree-placement/);
});
