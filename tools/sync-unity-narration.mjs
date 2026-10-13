import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {WELCOME_NARRATION_BANK as welcome} from '../app/services/welcomeNarrationBank.js';
import {DEMO_NARRATION_BANK as demo} from '../app/services/demoNarrationBank.js';
import {WELCOME_PRACTICE_LESSONS, WELCOME_PRACTICE_RESPONSES} from '../app/services/welcomePracticeContent.js';
import {ZINNIA_VOICE_DELIVERY,ZINNIA_VOICE_PROFILE} from './zinniaVoiceServer.mjs';

const targetArg=process.argv.find(arg=>arg.startsWith('--project='));
if(!targetArg)throw Error('Provide the existing Unity project with --project=absolute-path.');
const project=path.resolve(targetArg.slice(10)),web=path.resolve(import.meta.dirname,'..');
await fs.access(path.join(project,'ProjectSettings/ProjectVersion.txt'));
const contentPath=path.join(project,'Assets/Resources/NLXR/experience-content.json');
const manifestPath=path.join(project,'Documentation/port-content-manifest.json');
const content=JSON.parse(await fs.readFile(contentPath,'utf8'));
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const records=[],audio=[],pending=[];
// Resolve and validate the entire new set before changing Unity's mappings.
for(const [kind,bank] of [['welcome',welcome],['demo',demo]]){
    if(bank.delivery!==ZINNIA_VOICE_DELIVERY || bank.voice!==ZINNIA_VOICE_PROFILE.voice || bank.instructions!==ZINNIA_VOICE_PROFILE.instructions)throw Error('Incomplete or mismatched '+kind+' bank.');
    const bankPath=path.resolve(web,'app',bank.base);
    if(!bankPath.startsWith(path.resolve(web,'app/assets')+path.sep))throw Error('Voice bank outside bundled assets.');
    for(const id of bank.clips){
        if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid audio ID.');
        const bytes=await fs.readFile(path.join(bankPath,id+'.mp3'));
        if(bytes.length<1000)throw Error('Incomplete audio '+id);
        const resource='NLXR/Audio/'+kind+'/'+id,relative='Assets/Resources/'+resource+'.mp3';
        pending.push({bytes,target:path.join(project,relative),kind});
        audio.push({id,kind,resource,text:bank.catalog?.[id]?.text || WELCOME_PRACTICE_LESSONS.find(clip=>clip.id===id)?.spoken || WELCOME_PRACTICE_RESPONSES.find(clip=>clip.id===id)?.spoken || content.audio.find(clip=>clip.id===id && clip.kind===kind)?.text || ''});
        records.push({source:path.relative(web,path.join(bankPath,id+'.mp3')).replaceAll('\\','/'),path:relative,bytes:bytes.length,sha256:sha(bytes)});
    }
}
const metaTemplate=await fs.readFile(path.join(project,'Assets/Resources/NLXR/Audio/welcome/arrival.mp3.meta'),'utf8');
for(const file of pending){
    await fs.mkdir(path.dirname(file.target),{recursive:true});await fs.writeFile(file.target,file.bytes);
    if(sha(await fs.readFile(file.target))!==sha(file.bytes))throw Error('Unity audio copy mismatch.');
    try{await fs.access(file.target+'.meta');}catch{await fs.writeFile(file.target+'.meta',metaTemplate.replace(/guid: [a-f0-9]+/, 'guid: '+sha(path.relative(project,file.target)).slice(0,32)));}
}
content.lessons=WELCOME_PRACTICE_LESSONS;content.responses=WELCOME_PRACTICE_RESPONSES;
content.audio=[...content.audio.filter(clip=>!['welcome','demo'].includes(clip.kind)),...audio];
content.voice={provider:'OpenAI',voice:ZINNIA_VOICE_PROFILE.voice,delivery:ZINNIA_VOICE_DELIVERY};
manifest.files=[...manifest.files.filter(file=>!/^Assets\/Resources\/NLXR\/Audio\/(welcome|demo)\//.test(file.path)),...records];
manifest.voiceDelivery=ZINNIA_VOICE_DELIVERY;
await fs.writeFile(contentPath,JSON.stringify(content,null,2)+'\n');
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
for(const [kind,bank] of [['welcome',welcome],['demo',demo]]){await fs.mkdir(path.join(project,'Documentation/Voice'),{recursive:true});await fs.copyFile(path.resolve(web,'app',bank.base,'CREDITS.md'),path.join(project,'Documentation/Voice',kind+'-CREDITS.md'));}
await fs.mkdir(path.join(project,'Evidence'),{recursive:true});
await fs.writeFile(path.join(project,'Evidence/friendly-marin-sync.json'),JSON.stringify({provider:'OpenAI',voice:ZINNIA_VOICE_PROFILE.voice,delivery:ZINNIA_VOICE_DELIVERY,lessons:content.lessons.length,clips:audio.length,sha256Verified:true,files:records},null,2)+'\n');
console.log(JSON.stringify({voice:content.voice,lessons:content.lessons.length,copied:audio.length,sha256Verified:true}));
