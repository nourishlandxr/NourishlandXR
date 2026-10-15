import fs from 'node:fs';
import {DEMO_GUIDED_STEPS} from '../app/features/ar-demo/demoJourneyContent.js';
import {DEMO_NARRATION_BANK as bank} from '../app/services/demoNarrationBank.js';
import {demoNarrationContent} from './demo-narration-content.mjs';
import {normalizeNarrationText,projectNarrationSegments} from '../app/services/projectNarration.js';
const paragraphs=demoNarrationContent(),failures=[];
for(const text of paragraphs){const segments=projectNarrationSegments(text,{demo:true});if(segments.length!==1 || !segments[0].recorded){failures.push({text,error:'Missing complete recording'});continue;}const clip=bank.catalog[segments[0].id];if(clip.text!==text || clip.spoken!==text)failures.push({text,error:'Recording script differs from displayed body'});const file=new URL('../app/'+bank.base+clip.file,import.meta.url);if(!fs.existsSync(file)||fs.statSync(file).size<1000)failures.push({text,error:'Missing audio file'});}
const stages=DEMO_GUIDED_STEPS.map(step=>({id:step.id,paragraphs:step.main.split(/\n\n+/).map(text=>{const normalized=normalizeNarrationText(text);return {text:normalized,clip:projectNarrationSegments(normalized,{demo:true})[0]?.id};})}));
console.log(JSON.stringify({bank:bank.base,stageCount:stages.length,runtimeParagraphCount:paragraphs.length,exactScriptMatch:failures.length===0,failures,stages},null,2));if(failures.length)process.exitCode=1;
