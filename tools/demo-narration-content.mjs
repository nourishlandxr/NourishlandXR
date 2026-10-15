import fs from 'node:fs';
import {createRequire} from 'node:module';
import {DEMO_GUIDED_STEPS,DEMO_RETURN_WELCOME_PARAGRAPHS} from '../app/features/ar-demo/demoJourneyContent.js';
import {normalizeNarrationText} from '../app/services/projectNarration.js';
import {livingMapPlacementCopy} from '../app/services/demoLivingMapPresentation.js';
import {ZINNIA_PLANT_COPY} from '../app/services/zinniaPlantDiscovery.js';
import {DEMO_NATIVE_PLANTS} from '../app/services/demoNativePlants.js';
import {livingMapPreviewRecords} from '../app/services/developerLabFixtures.js';
const require=createRequire(import.meta.url);
const {parse}=require('acorn');

// Audit narrative bodies rather than titles, controls, plant reference data,
// tutorial lessons or visitor-authored conversations.
export function demoNarrationContent(){
 const texts=new Set();
 const add=value=>{for(const part of String(value || '').split(/\n\n+/)){const text=normalizeNarrationText(part);if(text.split(/\s+/).length>=3 && !/[<>{}]|https?:/.test(text) && /[.!?]/.test(text))texts.add(text);}};
 for(const step of DEMO_GUIDED_STEPS)add(step.main);
 DEMO_RETURN_WELCOME_PARAGRAPHS.forEach(add);
 add(ZINNIA_PLANT_COPY);for(let count=0;count<=5;count++)add(livingMapPlacementCopy(count));
 const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'}),bindings=new Map(),roots=[];
 function walk(node,visit){if(!node || typeof node!=='object')return;visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>walk(child,visit));else if(value && typeof value==='object')walk(value,visit);}
 walk(tree,node=>{
  if(node.type==='VariableDeclarator' && node.id.type==='Identifier' && node.init){const entries=bindings.get(node.id.name)||[];entries.push(node.init);bindings.set(node.id.name,entries);}
  if(node.type==='CallExpression' && node.callee.type==='Identifier' && node.callee.name==='showIntroBoard' && node.start<source.indexOf('export async function startTemporaryArDemo('))roots.push(node.arguments[1]);
  if(node.type==='CallExpression' && node.callee.type==='Identifier' && node.callee.name==='showGuidedChoice' && node.arguments[0]?.type==='Literal')for(const match of String(node.arguments[0].value).matchAll(/<p[^>]*>([^<]+)<\/p>/g))add(match[1]);
  if(node.type==='CallExpression' && node.callee.type==='Identifier' && node.callee.name==='showGuidedChoice' && node.arguments[0]?.type==='TemplateLiteral'){
   const template=node.arguments[0];
   if(template.expressions.length===1 && source.slice(template.expressions[0].start,template.expressions[0].end)==="record?.name || 'This plant'"){
    const names=new Set(['This plant',...livingMapPreviewRecords().filter(record=>record.demoType==='plant').map(record=>record.name),...DEMO_NATIVE_PLANTS.map(plant=>plant.name)]);
    for(const name of names)for(const match of (template.quasis[0].value.cooked+name+template.quasis[1].value.cooked).matchAll(/<p[^>]*>([^<]+)<\/p>/g))add(match[1]);
   }
  }
  if(node.type==='Property' && ['body','paragraphs'].includes(node.key.name || node.key.value))roots.push(node.value);
  if(node.type==='AssignmentExpression' && node.left.name==='introBoardBody')roots.push(node.right);
 });
 const seen=new Set();
 function collect(node){if(!node || seen.has(node))return;seen.add(node);
  if(node.type==='Literal' && typeof node.value==='string'){add(node.value);return;}
  if(node.type==='Identifier'){for(const value of bindings.get(node.name)||[])collect(value);return;}
  if(node.type==='MemberExpression'){if(node.object.type==='Identifier')for(const value of bindings.get(node.object.name)||[])collect(value);return;}
  if(node.type==='CallExpression'){if(node.callee.type==='MemberExpression')collect(node.callee.object);else for(const arg of node.arguments)collect(arg);return;}
  if(node.type==='ConditionalExpression'){collect(node.consequent);collect(node.alternate);return;}
  if(node.type==='Property'){collect(node.value);return;}
  if(node.type==='TemplateLiteral' && !node.expressions.length){add(node.quasis.map(q=>q.value.cooked).join(''));return;}
  if(['ArrayExpression','ObjectExpression','BinaryExpression','AssignmentExpression'].includes(node.type))for(const value of Object.values(node))if(Array.isArray(value))value.forEach(collect);else if(value && typeof value==='object')collect(value);
 }
 roots.forEach(collect);for(const value of bindings.get('DEMO_QUICK_ACCESS_COPY')||[])collect(value);
 return [...texts];
}
