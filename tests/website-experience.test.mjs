import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {assembleWebsite,replaceSection} from '../root-site/tools/assemble-website.mjs';
import {PLACE_EXAMPLES,createIllustrativePlaceModel} from '../root-site/source/place-showcase.js';
test('assembled website preserves every public route and the existing story graphics',()=>{
 const html=assembleWebsite(),routes=JSON.parse(fs.readFileSync('root-site/routes.json'));
 for(const key of Object.keys(routes))assert.equal((html.match(new RegExp(`data-route="${key}"`,'g'))||[]).length,1,key);
 assert(html.includes('data-open-orb'));assert(html.includes('creator-showcase-template'));assert(html.includes('data-totem-journey'));
 assert(html.includes('food-forest-story.js'));assert(html.includes('forest-system.js'));
 assert(html.includes('data-discovery-die'));assert(html.includes('data-forest-wheel'));
});
test('route replacement respects nested sections and adjacent content',()=>{
 assert.equal(replaceSection('<main><section id="a"><section><p>inner</p></section></section><section id="b">keep</section></main>','a','<section id="a">new</section>'),'<main><section id="a">new</section><section id="b">keep</section></main>');
 assert.throws(()=>replaceSection('<section id="a">','a','new'),/Unbalanced/);
});
test('three place examples distinguish source-derived terrain from illustrative models',()=>{
 assert.deepEqual(PLACE_EXAMPLES.map(p=>p.title),['Border Ranges','Mount Warning · Uki','Hillyards Food Forest']);
 for(const id of ['uki','hillyards']){const model=createIllustrativePlaceModel(id),grid=model.elevationGrid;
  assert.equal(grid.heights.length,grid.size**2);assert.equal(grid.size,grid.segments+1);assert(Math.abs(grid.step*grid.segments-grid.radius*2)<1e-9);assert(grid.heights.every(Number.isFinite));assert(model.elements.every(e=>e.points?e.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)):Number.isFinite(e.x)&&Number.isFinite(e.z)));
 }
});
