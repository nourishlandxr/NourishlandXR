// Review candidate only. Never activates or replaces a tutorial/demo bank.
import fs from 'node:fs/promises';
const profile={model:'gpt-4o-mini-tts',voice:'coral',response_format:'mp3',instructions:'Speak as a warm, confident adult female guide in natural American English. Use a light, clear conversational voice and normal speaking speed. Connect words and clauses smoothly. Let punctuation shape short natural breaths; do not insert a deliberate pause after every sentence. Avoid a heavy low register, breathy theatrical delivery, sing-song pitch, exaggerated cheerfulness, stretched vowels and choppy clipped word endings. Sound like a person explaining something to a nearby listener, with quiet interest and gentle assurance.'};
const text="Welcome to Nourishland XR. Before we begin exploring, let's get comfortable with a few simple movements. Take a moment to look around, and find the ball in front of you. First, point toward it. When you're ready, reach closer and pick it up, move it gently, then let it go. You can try that again as often as you like. We'll take this one step at a time.";
if(process.argv.includes('--plan')){console.log(JSON.stringify({profile,text,output:'.tmp/zinnia-voice-review/openai-v10-candidate.mp3',activatesBank:false},null,2));process.exit(0);}
const serverArg=process.argv.find(a=>a.startsWith('--server=')),server=serverArg?new URL(serverArg.slice(9)):null;
if(server && server.protocol!=='https:')throw Error('Use HTTPS for hosted recording.');
if(!server && !process.env.OPENAI_API_KEY)throw Error('OPENAI_API_KEY is not available in this process. Do not paste it into chat.');
const response=await fetch(server?server.href.replace(/\/$/,'')+'/zinnia/speech':'https://api.openai.com/v1/audio/speech',{method:'POST',headers:server?{Origin:server.origin,'Content-Type':'application/json'}:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(server?{text,delivery:'v10'}:{...profile,input:text}),signal:AbortSignal.timeout(60000)});
if(!response.ok)throw Error('Speech request returned HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1000)throw Error('Incomplete audio');
await fs.mkdir('.tmp/zinnia-voice-review',{recursive:true});
await fs.writeFile('.tmp/zinnia-voice-review/openai-v10-candidate.mp3',bytes);
await fs.writeFile('.tmp/zinnia-voice-review/profile.json',JSON.stringify({profile,text},null,2));
console.log('Saved candidate. Existing banks are unchanged.');
