import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../app/screens/biomeWheelXR.js',import.meta.url),'utf8');

test('biome wheel is gated behind immersive device support and session start',()=>{
 assert.match(source,/navigator\.xr\.isSessionSupported/);
 assert.match(source,/if\(!support\[selected\]\|\|session\)return/);
 const request=source.indexOf('navigator.xr.requestSession');
 const load=source.indexOf('await loadWheel()',request);
 assert.ok(request>0&&load>request,'model load follows successful session request');
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
