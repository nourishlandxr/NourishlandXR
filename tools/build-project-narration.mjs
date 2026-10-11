import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let parse;try{({parse}=require('acorn'));}catch{({parse}=require('../.tmp/narration-tools/node_modules/acorn'));}
import {DEMO_GUIDED_STEPS} from '../app/features/ar-demo/demoJourneyContent.js';
const normalize=s=>String(s||'').replace(/[’‘]/g,"'").replace(/[–—]/g,', ').replace(/\s+/g,' ').trim();
const key=s=>{let h=2166136261;for(const c of normalize(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return 'z-'+(h>>>0).toString(16);};
const clips=new Map();
function add(text){for(const part of String(text||'').split(/\n\n+/)){const t=normalize(part);if(t.split(' ').length<7 || !/[.!?]/.test(t) || /[<>{}]|https?:|function|querySelector/.test(t))continue;const id=key(t);if(clips.has(id)&&clips.get(id).text!==t)throw Error('Narration collision');clips.set(id,{id,text:t,spoken:t.replace(/NourishlandXR/g,'Nourishland XR').replace(/\bPIMO\b/g,'plant information').replace(/\bLIMO\b/g,'learning pathway').replace(/\bXR\b/g,'X R')});}}
for(const step of DEMO_GUIDED_STEPS)add(step.main);
for(const file of ['app/screens/temporaryArDemo.js','app/services/demoLivingMapPresentation.js','app/services/demoNativePlants.js']){
 const source=fs.readFileSync(file,'utf8'),tree=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 function walk(node){if(!node || typeof node!=='object')return;
  if(node.type==='Literal' && typeof node.value==='string')add(node.value);
  if(node.type==='TemplateLiteral' && !node.expressions.length){const html=node.quasis.map(q=>q.value.cooked).join('');for(const match of html.matchAll(/<p[^>]*>([^<]+)<\/p>/g))add(match[1]);}
  for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(walk);else if(value && typeof value==='object')walk(value);}
 }walk(tree);
}
fs.mkdirSync('.tmp/project-narration',{recursive:true});fs.writeFileSync('.tmp/project-narration/catalog.json',JSON.stringify([...clips.values()],null,2));
console.log('Narration paragraphs:',clips.size);
