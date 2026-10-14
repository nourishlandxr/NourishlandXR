import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WELCOME_NARRATION_BANK} from '../app/services/welcomeNarrationBank.js';
import {ZINNIA_VOICE_PROFILE,ZINNIA_VOICE_DELIVERY} from './zinniaVoiceServer.mjs';

const serverArg=process.argv.find(value=>value.startsWith('--server='));
const server=serverArg?new URL(serverArg.slice(9)):null;
if(server && server.protocol!=='https:' && !['127.0.0.1','localhost'].includes(server.hostname))throw Error('Use HTTPS for a remote speech server.');
if(process.argv.includes('--plan')){
    console.log(JSON.stringify({voice:ZINNIA_VOICE_PROFILE.voice,model:ZINNIA_VOICE_PROFILE.model,delivery:ZINNIA_VOICE_DELIVERY,clips:7,paidGeneration:true,output:WELCOME_NARRATION_BANK.base},null,2));
    process.exit(0);
}
if(!server && !process.env.OPENAI_API_KEY)throw Error('Configure OPENAI_API_KEY locally, or pass the approved HTTPS speech server with --server=.');

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputDir=path.resolve(root,'app',WELCOME_NARRATION_BANK.base);
const catalogue=[
    ['micro-fruit-favorite-prefix',"That's my favorite fruit too!"],
    ['micro-fruit-mango-description','Mango is a pocket of golden sunshine.'],
    ['micro-fruit-peach-description','A fuzzy little jacket hides a juicy surprise.'],
    ['micro-fruit-fig-description','A tiny secret garden is hiding inside.'],
    ['micro-fruit-pomegranate-description','It is a jewel box that forgot to close.'],
    ['micro-fruit-apple-description','It packs a crunchy little drum solo.'],
    ['micro-fruit-carambola-description','Slice it open and there is a star inside.'],
    ['micro-fruit-banana-description','It comes in its own peel-away travel case.']
].map(([id,text])=>({id,text}));
await fs.mkdir(outputDir,{recursive:true});
const manifest={provider:'OpenAI',voice:ZINNIA_VOICE_PROFILE.voice,model:ZINNIA_VOICE_PROFILE.model,delivery:ZINNIA_VOICE_DELIVERY,base:WELCOME_NARRATION_BANK.base,clips:{}};
for(const [index,clip] of catalogue.entries()){
    const target=path.join(outputDir,clip.id+'.mp3');
    try{
        if((await fs.stat(target)).size>1000){
            manifest.clips[clip.id]={text:clip.text,file:path.posix.join(WELCOME_NARRATION_BANK.base,clip.id+'.mp3')};
            console.log('Kept existing '+clip.id);continue;
        }
    }catch{}
    let bytes;
    for(let attempt=0;attempt<3;attempt++){
        const endpoint=server?server.href.replace(/\/$/,'')+'/zinnia/speech':'https://api.openai.com/v1/audio/speech';
        const headers=server?{Origin:server.origin,'Content-Type':'application/json'}:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'};
        const body=server?{text:clip.text,delivery:ZINNIA_VOICE_DELIVERY}:{...ZINNIA_VOICE_PROFILE,input:clip.text};
        const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
        if(response.ok){
            if(server && response.headers.get('X-Zinnia-Delivery')!==ZINNIA_VOICE_DELIVERY)throw Error('Hosted delivery profile does not match; no clip was accepted.');
            bytes=Buffer.from(await response.arrayBuffer());break;
        }
        if(![429,500,502,503,504].includes(response.status) || attempt===2)throw Error('Speech provider returned HTTP '+response.status+'.');
        await new Promise(resolve=>setTimeout(resolve,response.status===429?30000:2000*(attempt+1)));
    }
    if(!bytes || bytes.length<1000)throw Error('Incomplete audio for '+clip.id+'.');
    await fs.writeFile(target+'.partial',bytes);await fs.rename(target+'.partial',target);
    manifest.clips[clip.id]={text:clip.text,file:path.posix.join(WELCOME_NARRATION_BANK.base,clip.id+'.mp3')};
    console.log('Recorded '+clip.id+' ('+bytes.length+' bytes)');
    if(server && index<catalogue.length-1)await new Promise(resolve=>setTimeout(resolve,5200));
}
await fs.writeFile(path.join(root,'app/assets/welcome-practice/micro-fruits/voice-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Saved the seven micro-fruit replies and their manifest.');
