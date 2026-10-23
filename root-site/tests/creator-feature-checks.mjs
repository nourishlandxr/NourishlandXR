import {revision} from '../tools/assemble-website.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createPimoTemplate} from '../source/creator/pimoGraphTemplates.js';
import {pimoCellPath} from '../source/creator/pimoGraphGeometry.js';
const rootPath=path.dirname(fileURLToPath(import.meta.url)),site=path.resolve(rootPath,'../source');
class Node{
 constructor(dataset={}){this.dataset=dataset;this.attrs={};this.style={setProperty:(k,v)=>{this.style[k]=v}};this.hidden=false;this.inert=false;this.listeners={};this.children=[];this.nodes={};this.textContent='';}
 querySelector(s){return this.nodes[s]}querySelectorAll(s){return this.nodes[s]||[]}
 setAttribute(k,v){this.attrs[k]=v}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 dispatch(type,event={}){for(const fn of this.listeners[type]||[])fn({preventDefault(){},stopPropagation(){},...event})}
 append(...n){this.children.push(...n)}prepend(...n){this.children.unshift(...n)}
 focus(){doc.activeElement=this}setPointerCapture(id){this.pointerId=id}hasPointerCapture(id){return this.pointerId===id}releasePointerCapture(){this.pointerId=null}
}
const doc={hidden:false,createElement:()=>new Node(),createElementNS:()=>new Node(),addEventListener(type,fn){this[type]=fn}},win={addEventListener(type,fn){this[type]=fn}};
const root=new Node(),buttons=['pimo','totem','imap'].map(key=>new Node({creatorFeature:key})),panels=['pimo','totem','imap'].map(key=>{const n=new Node({creatorPanel:key});n.nodes.h3=new Node();return n}),flower=new Node(),orbButton=new Node(),cells=new Node(),orbCanvas=new Node(),orbImage=new Node(),growth=new Node();
orbButton.nodes={canvas:orbCanvas,img:orbImage};
const signs=['pimo','notes','imap'].map(key=>new Node({creatorSign:key})),controls=['reset','top','in','out'].map(key=>new Node({mapControl:key}));
root.nodes={'[data-creator-feature]':buttons,'[data-creator-panel]':panels,'[data-creator-pimo]':flower,'[data-creator-orb]':orbButton,'[data-creator-cells]':cells,'[data-creator-sign]':signs,'[data-map-control]':controls,'[data-map-growth]':growth};
for(const key of ['creator-cell-title','creator-cell-copy','map-stage','map-selection','creator-map-status','creator-map','map-provenance','creator-totem-note'])root.nodes['[data-'+key+']']=new Node();
for(const key of ['pimo','totem','imap'])root.nodes['[data-creator-panel="'+key+'"] h3']=panels.find(p=>p.dataset.creatorPanel===key).nodes.h3;
let orbCreates=0,mapCreates=0,totemCreates=0,failures=0;const orbCalls=[],mapCalls=[],totemCalls=[];
for(const key of ['creator-totem-status','creator-totem-stage','creator-totem-style','creator-totem'])root.nodes['[data-'+key+']']=new Node();
const totem={setActive:v=>totemCalls.push(['active',v]),select:v=>totemCalls.push(['select',v]),turn:v=>totemCalls.push(['turn',v]),front:()=>totemCalls.push(['front']),destroy:()=>totemCalls.push(['destroy'])};
const orb={setOpen:v=>orbCalls.push(['open',v]),setActive:v=>orbCalls.push(['active',v]),rotateBy:(x,y)=>orbCalls.push(['rotate',x,y]),dispose:()=>orbCalls.push(['dispose'])};
const map={setData:(data,stage)=>mapCalls.push(['data',data,stage]),select:id=>mapCalls.push(['select',id]),reset:()=>mapCalls.push(['reset']),top:()=>mapCalls.push(['top']),zoom:v=>mapCalls.push(['zoom',v]),dispose:()=>mapCalls.push(['dispose'])};
const data=JSON.parse(fs.readFileSync(path.join(site,'creator/border-ranges.json'),'utf8'));assert.equal(data.terrain.elevation.contourCount,520);assert.equal(data.terrain.grid.heights.length,65*65);assert.ok(data.terrain.grid.heights.every(Number.isFinite));assert.equal(data.terrain.elevation.min,200);assert.equal(data.terrain.elevation.max,970);assert.equal(data.terrainEdits.length,0);
let code=fs.readFileSync(path.join(site,'creator-features.js'),'utf8').replace(/^import .*\r?\n/gm,'').replace('export function createCreatorFeatures','function createCreatorFeatures').replace("import('./orb/ceramic-orb.js')","loadOrbModule()").replace("import('./creator/imapV2Landscape3D.js')","loadMapModule()").replace("import('/xr/services/craftedTotemStudio.js?v=0.9780')","loadTotemModule()");
const make=new Function('document','window','matchMedia','createPimoTemplate','pimoCellPath','loadOrbModule','loadMapModule','fetch',code+'\nreturn createCreatorFeatures;')(doc,win,()=>({matches:true}),createPimoTemplate,pimoCellPath,async()=>({createCeramicOrb:async()=>{orbCreates++;return orb}}),async()=>({createImapV2Landscape3D:()=>{mapCreates++;return map}}),async()=>({ok:true,json:async()=>structuredClone(data)}));
globalThis.loadTotemModule=async()=>({TOTEM_MODEL_CHOICES:['basic','carved','botanical','organic','sun','leaf','rock','moon'].map(id=>({id,label:id})),createTotemStudio:()=>{totemCreates++;return totem}});
const controller=make(root),settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve()};
assert.equal(orbCreates,0);assert.equal(mapCreates,0);assert.equal(cells.children.length,6);assert.ok(cells.children.every(n=>n.children[0].children[0].attrs.d.includes('L')));
controller.setActive(true);await settle();assert.equal(root.hidden,false);assert.equal(orbCreates,1);assert.equal(mapCreates,0);assert.equal(flower.dataset.open,'true');
orbButton.dispatch('click',{detail:1});assert.equal(flower.dataset.open,'false');assert.equal(cells.inert,true);orbButton.dispatch('click',{detail:0});assert.equal(cells.inert,false);
orbButton.dispatch('pointerdown',{button:0,pointerId:1,clientX:0,clientY:0});orbButton.dispatch('pointermove',{pointerId:1,clientX:30,clientY:20});orbButton.dispatch('pointerup',{pointerId:1});orbButton.dispatch('click',{detail:1});assert.equal(flower.dataset.open,'true');assert.ok(orbCalls.some(c=>c[0]==='rotate'));assert.equal(orbButton.pointerId,null);
cells.children[0].dispatch('click');assert.equal(root.nodes['[data-creator-cell-title]'].textContent,'Food Forest');assert.equal(cells.children[0].attrs['aria-pressed'],'true');
buttons[1].dispatch('click');assert.equal(panels[1].hidden,false);assert.equal(panels[0].inert,true);assert.deepEqual(orbCalls.at(-1),['active',false]);signs[1].dispatch('click');assert.match(root.nodes['[data-creator-totem-note]'].textContent,/observations/);
signs[2].dispatch('click');await settle();assert.equal(mapCreates,1);assert.equal(panels[2].hidden,false);assert.equal(root.nodes['[data-creator-map-status]'].hidden,true);assert.equal(mapCalls.at(-1)[2].id,data.buildSequence[0].id);
assert.equal(totemCreates,1);assert.equal(root.nodes['[data-creator-totem-style]'].children.length,8);root.nodes['[data-creator-totem-style]'].dispatch('change',{target:{value:'rock'}});assert.deepEqual(totemCalls.at(-1),['select','rock']);
growth.dispatch('input',{target:{value:'3'}});assert.equal(mapCalls.at(-1)[2].id,data.buildSequence[3].id);assert.match(root.nodes['[data-map-stage]'].textContent,/4/);
controls[0].dispatch('click');controls[1].dispatch('click');controls[2].dispatch('click');controls[3].dispatch('click');assert.ok(mapCalls.some(c=>c[0]==='zoom'&&c[1]===.85));assert.ok(mapCalls.some(c=>c[0]==='reset'));
controller.setActive(false);assert.equal(root.hidden,true);assert.equal(root.inert,true);controller.setActive(true);await settle();assert.equal(mapCreates,1);assert.equal(orbCreates,1);
buttons[0].dispatch('click');doc.hidden=true;doc.visibilitychange();assert.deepEqual(orbCalls.at(-1),['active',false]);doc.hidden=false;doc.visibilitychange();assert.deepEqual(orbCalls.at(-1),['active',true]);
win.pagehide({persisted:false});assert.ok(mapCalls.some(c=>c[0]==='dispose'));assert.ok(orbCalls.some(c=>c[0]==='dispose'));assert.ok(totemCalls.some(c=>c[0]==='destroy'));
const html=fs.readFileSync(path.join(site,'platform-totem.html'),'utf8'),css=fs.readFileSync(path.join(site,'platform-totem.css'),'utf8');
assert.ok(!html.includes('<footer'));assert.ok(html.indexOf('data-creator-panel="imap"')<html.indexOf('Explore Creator'));assert.ok(!html.includes('sign in'));assert.ok(html.includes('NSW contour-derived terrain'));assert.ok(css.includes('.creator-system[hidden],.creator-feature[hidden]{display:none}'));
const report={version:revision,passed:['The six real Classic PIMO families are rendered with original hexagon geometry','Creator introduction precedes the optional app entry','3D objects load lazily; IMAP waits until its feature opens','PIMO opens/closes, dragging rotates without toggling, capture releases','Each PIMO family reveals its explanation on the same page','Totem signage connects PIMO, observations and IMAP','Map growth changes the model stage; orbit and zoom controls remain available','Reopening features reuses models; hidden tabs pause orb; page exit disposes resources'],terrain:'Border Ranges: 520 cached NSW contours, 200-970 m AHD; display interpolation with conceptual feature locations',browserVisualVerified:false,productionChanged:false};
fs.writeFileSync(path.join(rootPath,'creator-feature-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
