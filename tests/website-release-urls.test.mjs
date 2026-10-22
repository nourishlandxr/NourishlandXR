import test from 'node:test';import assert from 'node:assert/strict';
import {versionModuleImports} from '../root-site/tools/release-module-urls.mjs';
test('release refreshes static and lazy dependencies without rewriting content or external URLs',()=>{
 const source=`import './shared.js?v=old';export {thing} from '../other.mjs';const p=()=>import('./lazy.js');import {BUILD_INFO} from '/xr/services/buildInfo.js';const prose="import('./example.js')";import 'https://example.com/module.js';`;
 const next=versionModuleImports(source,'0.9782');
 for(const file of ['./shared.js','../other.mjs','./lazy.js','/xr/services/buildInfo.js'])assert(next.includes('"'+file+'?v=0.9782"'));
 assert(next.includes('const prose="import(\'./example.js\')"'));assert(next.includes("import 'https://example.com/module.js'"));assert(!next.includes('?v=old'));
 assert.equal(versionModuleImports(next,'0.9782'),next);
});
