import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { drawPlantInformationHoneycomb } from '../app/services/plantInformationMeshCanvas.js';
import { plantInformationMeshMarkup } from '../app/services/plantInformationMeshView.js';
import { PIGEON_PEA_AR_KNOWLEDGE } from '../app/services/pigeonPeaExample.js';

function capturePimCanvas(cellOpacity) {
    const events = [];
    const saved = [];
    const context = {
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        save() { saved.push({ globalAlpha: this.globalAlpha, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle }); },
        restore() { Object.assign(this, saved.pop()); },
        beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() { events.push({ type: 'stroke', style: this.strokeStyle, alpha: this.globalAlpha }); }, clearRect() {}, fillRect() {},
        setLineDash() {}, strokeText() {},
        createRadialGradient() { return { addColorStop() {} }; },
        measureText(value) { return { width: String(value).length * 8 }; },
        fill() { events.push({ type: 'fill', style: this.fillStyle, alpha: this.globalAlpha }); },
        fillText(value) { events.push({ type: 'text', value, alpha: this.globalAlpha }); }
    };
    drawPlantInformationHoneycomb(context, { width: 1440, height: 1080 }, PIGEON_PEA_AR_KNOWLEDGE, [], { cellOpacity });
    assert.equal(saved.length, 0, 'canvas state remains balanced');
    return events;
}

test('Quest PIMO opacity changes dark glass while labels remain fully readable', () => {
    for (const level of [0, .25, .5, 1]) {
        const events = capturePimCanvas(level);
        const hex = events.find(event => event.type === 'fill' && String(event.style).includes('65%, 17%, 0.7'));
        const core = events.find(event => event.type === 'fill' && event.style === 'rgba(22,35,55,.82)');
        const outline = events.find(event => event.type === 'stroke' && String(event.style).includes('80%, 65%'));
        const coreOutline = events.find(event => event.type === 'stroke' && event.style === 'rgba(137,165,213,.82)');
        const labels = events.filter(event => event.type === 'text');
        assert.ok(hex, 'primary cell has an actual filled body');
        assert.ok(core, 'centre cell has an actual filled body');
        assert.ok(outline, 'primary cell keeps a visible outline');
        assert.ok(coreOutline, 'centre cell keeps a visible outline');
        assert.ok(labels.length > 6, 'PIMO labels are drawn');
        assert.equal(hex.alpha, level);
        assert.equal(core.alpha, level);
        assert.equal(outline.alpha, 1);
        assert.equal(coreOutline.alpha, 1);
        assert.ok(labels.every(event => event.alpha === 1), 'text stays readable at every glass opacity');
    }
});

test('simulated PIMO receives the same opacity without changing cell identity or hit markup', () => {
    const full = plantInformationMeshMarkup(PIGEON_PEA_AR_KNOWLEDGE, [], { cellOpacity: 1 });
    const quarter = plantInformationMeshMarkup(PIGEON_PEA_AR_KNOWLEDGE, [], { cellOpacity: .25 });
    assert.match(full, /--pim-cell-opacity:1/);
    assert.match(quarter, /--pim-cell-opacity:0\.25/);
    assert.deepEqual([...full.matchAll(/data-pim-node-id="([^"]+)"/g)].map(match => match[1]),
        [...quarter.matchAll(/data-pim-node-id="([^"]+)"/g)].map(match => match[1]));
    const styles = readFileSync(new URL('../app/style.css', import.meta.url), 'utf8');
    assert.match(styles, /\.plant-knowledge-cell::after \{[\s\S]*?background: hsl\(var\(--pim-hue,112\) 31% 12% \/ \.82\);[\s\S]*?opacity: var\(--pim-cell-opacity, 1\)/);
    assert.match(styles, /\.plant-knowledge-cell::before \{[\s\S]*?opacity: 1;/);
    assert.match(styles, /\.plant-knowledge-cell \{[\s\S]*?opacity: 1;[\s\S]*?isolation: isolate/);
    assert.match(styles, /@keyframes pim-cell-fade-in \{[\s\S]*?to \{ opacity: 1;/);
    const demo = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    assert.match(demo, /function demoPlantKnowledgeMarkup[\s\S]*?cellOpacity: demoCellOpacity/);
});


test('native glass opacity uses draw uniforms without invalidating cached text or body artwork',async()=>{
 const {knowledgeSurfaceLayer,curiositySurfaceOpacity}=await import('../app/services/knowledgeSpatialRenderer.js');
 const {spatialCardTextureContent,createSpatialTotemCards}=await import('../app/services/spatialTotemCards.js');
 const calls=[];
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getExtension:()=>null,getAttribLocation:()=>0},{get(target,key){return key in target?target[key]:key.startsWith('create')?()=>({}):typeof key==='string' && key===key.toUpperCase()?key:(...args)=>calls.push([key,...args]);}});
 let surface={card:{id:'child',child:true,branchColour:'#37ad88',title:'Fresh peas',infoOpacity:1},opacity:1,center:{x:0,y:0,z:-1},right:{x:1,y:0,z:0},width:1,height:1};
 const baseInk=spatialCardTextureContent(knowledgeSurfaceLayer(surface).card),baseBody=spatialCardTextureContent(knowledgeSurfaceLayer(surface,true).card);
 const renderer=createSpatialTotemCards(gl,{canvas:()=>({width:512,height:512}),surfaces:()=>[knowledgeSurfaceLayer(surface,true)]});
 const matrix=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),view={projectionMatrix:matrix,transform:{inverse:{matrix}}};
 for(const level of [1,.75,.5,.25,0]){
  surface={...surface,card:{...surface.card,infoOpacity:level}};
  const ink=knowledgeSurfaceLayer(surface),body=knowledgeSurfaceLayer(surface,true);
  assert.equal(ink.opacity,1);assert.equal(body.opacity,level);
  assert.equal(spatialCardTextureContent(ink.card),baseInk);assert.equal(spatialCardTextureContent(body.card),baseBody);
  renderer.begin();renderer.draw(view,{id:'plant'},surface.center,[surface.card]);renderer.draw(view,{id:'plant'},surface.center,[surface.card]);renderer.end();
 }
 assert.equal(calls.filter(call=>call[0]==='texImage2D').length,1,'one upload reused through every opacity and both eyes');
 assert.equal(calls.filter(call=>call[0]==='texSubImage2D').length,0,'dragging opacity never repaints cell textures');
 assert.equal(calls.filter(call=>call[0]==='generateMipmap').length,1);
 renderer.destroy();assert.equal(curiositySurfaceOpacity(-1),0);assert.equal(curiositySurfaceOpacity(2),1);
});

test('live native cell opacity does not repaint the Living Frame or reconcile plant content',()=>{
 const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 const callback=source.slice(source.indexOf('onCellOpacity:value=>'),source.indexOf('onMove:refreshSimulatedPlacementAim',source.indexOf('onCellOpacity:value=>')));
 assert.doesNotMatch(callback,/paintWelcomeLayer|updateSimulatedMarkers/);
 assert.match(callback,/if\(!knowledgeRenderer\)/);
 const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
 assert.match(panel,/value===meshCellOpacity\)return/);
});
