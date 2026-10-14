import {ZINNIA_VOICE_PROFILE,ZINNIA_VOICE_DELIVERY} from './zinniaVoiceServer.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {WELCOME_PRACTICE_LESSONS,WELCOME_PRACTICE_RESPONSES} from '../app/services/welcomePracticeContent.js';
import {WELCOME_NARRATION_BANK as previousBank} from '../app/services/welcomeNarrationBank.js';
import {WELCOME_FRUIT_ASSETS} from '../app/services/welcomePracticeFruitAssets.js';
import {tutorialFruitPrompt} from '../app/services/tutorialFruitInteraction.js';

const serverArg=process.argv.find(a=>a.startsWith('--server='));
const server=serverArg?new URL(serverArg.slice(9)):null;
if(server && server.protocol!=='https:' && !['127.0.0.1','localhost'].includes(server.hostname))throw new Error('Use HTTPS for a remote speech server.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const profile=ZINNIA_VOICE_PROFILE;
const requestGap=Math.max(5200,Number(process.argv.find(arg=>arg.startsWith('--gap-ms='))?.slice(9)) || 5200);
const onlyArg=process.argv.find(arg=>arg.startsWith('--only='));
const only=onlyArg?new Set(onlyArg.slice(7).split(',')):null;
const authoredClips=[...WELCOME_PRACTICE_LESSONS,...WELCOME_PRACTICE_RESPONSES,...Object.entries(WELCOME_FRUIT_ASSETS).flatMap(([id,fruit])=>[
    {id:'fruit-name-'+id,spoken:fruit.label},
    {id:'fruit-pick-'+id,spoken:tutorialFruitPrompt(fruit,Boolean(fruit.halfUrl))},
    ...(fruit.halfUrl?[{id:'fruit-open-'+id,spoken:fruit.remark+' Place it on the plate.'}]:[])
])].filter(c=>c.spoken && !c.silent);
if(only && [...only].some(id=>!authoredClips.some(clip=>clip.id===id)))throw new Error('Unknown requested narration ID');
const clips=only?[...new Map([...Object.entries(previousBank.catalog).map(([id,clip])=>[id,{id,spoken:clip.text}]),...authoredClips.filter(clip=>only.has(clip.id)).map(clip=>[clip.id,clip])]).values()]:authoredClips;
const hash=createHash('sha256').update(JSON.stringify({profile,clips:clips.map(({id,spoken})=>({id,spoken})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)})).digest('hex').slice(0,16);
const bankName='openai-'+hash,relative='assets/welcome-practice/'+bankName+'/',directory=path.join(root,'app',relative);
if(process.argv.includes('--plan')){console.log(JSON.stringify({provider:'OpenAI',voice:profile.voice,clips:clips.length,characters:clips.reduce((n,c)=>n+c.spoken.length,0),bank:relative,requires:'OPENAI_API_KEY',activation:'Only after all clips have been generated'},null,2));process.exit(0);}
if(!server && !process.env.OPENAI_API_KEY)throw new Error('Configure OPENAI_API_KEY locally before recording. Do not put it in source files or chat.');
await fs.mkdir(directory,{recursive:true});
for(const clip of clips){
    if(!/^[a-z0-9-]+$/.test(clip.id))throw new Error('Invalid clip ID');
    const target=path.join(directory,clip.id+'.mp3');
    try{if((await fs.stat(target)).size>1000){console.log('Saved: '+clip.id);continue;}}catch{}
    if(previousBank.voice===profile.voice && previousBank.delivery===ZINNIA_VOICE_DELIVERY && previousBank.instructions===profile.instructions && previousBank.catalog?.[clip.id]?.text===clip.spoken){
        const saved=path.join(root,'app',previousBank.base,clip.id+'.mp3');
        if((await fs.stat(saved)).size>1000){await fs.copyFile(saved,target);console.log('Reused: '+clip.id);continue;}
    }
    let bytes;
    for(let attempt=0;attempt<3;attempt++){
        const endpoint=server?server.href.replace(/\/$/,'')+'/zinnia/speech':'https://api.openai.com/v1/audio/speech';
        const headers=server?{'Content-Type':'application/json',Origin:server.origin}:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'};
        const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(server?{text:clip.spoken,delivery:ZINNIA_VOICE_DELIVERY}:{...profile,input:clip.spoken}),signal:AbortSignal.timeout(120000)});
        if(response.ok){if(server && response.headers.get('X-Zinnia-Delivery')!==ZINNIA_VOICE_DELIVERY)throw new Error('Hosted delivery profile does not match. Existing bank preserved.');bytes=Buffer.from(await response.arrayBuffer());break;}
        if(![429,500,502,503,504].includes(response.status) || attempt===2)throw new Error('Speech provider returned HTTP '+response.status+'. The existing audio bank has not been replaced.');
        await new Promise(resolve=>setTimeout(resolve,response.status===429?30000:2000*(attempt+1)));
    }
    if(!bytes || bytes.length<1000)throw new Error('Incomplete recording: '+clip.id);
    await fs.writeFile(target+'.partial',bytes);await fs.rename(target+'.partial',target);console.log('Recorded: '+clip.id);
    if(server)await new Promise(resolve=>setTimeout(resolve,requestGap));
}
const bank={provider:'OpenAI',voice:profile.voice,model:profile.model,delivery:ZINNIA_VOICE_DELIVERY,instructions:profile.instructions,base:relative,clips:clips.map(c=>c.id),catalog:Object.fromEntries(clips.map(c=>[c.id,{text:c.spoken,file:c.id+'.mp3'}]))};
// Favourite-fruit reply recordings share the player's bank but have their own manifest.
const replyManifestPath=path.join(root,'app/assets/welcome-practice/micro-fruits/voice-manifest.json');
const replyManifest=JSON.parse(await fs.readFile(replyManifestPath,'utf8'));
for(const clip of Object.values(replyManifest.clips)){
    const filename=path.basename(clip.file);
    if(path.join(root,'app',clip.file)!==path.join(directory,filename))await fs.copyFile(path.join(root,'app',clip.file),path.join(directory,filename));
    clip.file=relative+filename;
}
replyManifest.base=relative;
await fs.writeFile(replyManifestPath,JSON.stringify(replyManifest,null,2)+'\n');
await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(bank,null,2));
await fs.writeFile(path.join(directory,'CREDITS.md'),'# Zinnia narration\n\nAI-generated voice: OpenAI '+profile.voice+' using '+profile.model+'.\nDelivery: '+ZINNIA_VOICE_DELIVERY+'; natural American English, normal rate, smoother word endings and joins.\nSaved recordings for offline playback; generated by tools/record-zinnia-narration.mjs.\n');
const source=path.join(root,'app/services/welcomeNarrationBank.js');
await fs.writeFile(source+'.partial','// Generated only after the complete audio bank is saved.\nexport const WELCOME_NARRATION_BANK = Object.freeze('+JSON.stringify(bank)+');\n');
await fs.rename(source+'.partial',source);
console.log('Complete bank activated. Increment the app version, build, and review playback before deployment.');
