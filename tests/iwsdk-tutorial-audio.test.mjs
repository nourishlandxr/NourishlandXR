import test from 'node:test';
import assert from 'node:assert/strict';
import {createTutorialAudioOwner,tutorialSoundUrl} from '../app/services/iwsdkTutorialAudio.js';
import * as sdk from '../iwsdk/audioSdk.js';

const param=()=>({value:0,setTargetAtTime(value){this.value=value;},setValueAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;}});
function node(){return {gain:param(),positionX:param(),positionY:param(),positionZ:param(),orientationX:param(),orientationY:param(),orientationZ:param(),playbackRate:param(),
    connect(){},disconnect(){},start(){this.started=true;},stop(){this.started=false;},setPosition(){},setOrientation(){}};}
for(const scope of ['tutorial','demo'])test(`actual SDK AudioSystem positions ${scope} sources, preserves narration and stops on mute/pause/end`,async()=>{
    const savedProgress=globalThis.ProgressEvent;globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,values);}};
    const context={currentTime:0,state:'running',destination:node(),listener:{positionX:param(),positionY:param(),positionZ:param(),forwardX:param(),forwardY:param(),forwardZ:param(),upX:param(),upY:param(),upZ:param()},
        createGain:node,createPanner:node,createBufferSource:node,decodeAudioData:(bytes,onLoad)=>{const buffer={duration:1};onLoad?.(buffer);return Promise.resolve(buffer);},resume:async()=>{}};
    let endpoint=null;const voice={context,setSpatialOutput(output){endpoint=output;output?.connect(node());}};
    const owner=await createTutorialAudioOwner({backend:'iwsdk'},voice,undefined,{scope});
    const pose=new sdk.Matrix4().makeTranslation(.2,1.6,0).elements;
    const frame={viewer:pose,zinnia:{x:.4,y:1,z:-1},water:{x:.8,y:1,z:-.4},insect:{x:-.5,y:1.5,z:-.8},watering:true,flying:true};
    try{
        owner.update(.02,0,frame);await Promise.resolve();owner.update(.02,.02,frame);
        assert.ok(endpoint);assert.ok(owner.snapshot().connected);
        assert.deepEqual(owner.snapshot().playing,scope==='demo'?['bee']:['water','insect']);
        const entities=[...owner.system.queries.audioEntities.entities];
        assert.equal(entities.length,scope==='demo'?1:3);
        for(const entity of entities){
            assert.ok(entity.getValue(sdk.AudioSource,'_loaded'),'actual source asset is decoded by SDK');
            if(entity.getValue(sdk.AudioSource,'loop')===false){assert.equal(sdk.AudioUtils.isPlaying(entity),false,'sparkle never autoplays');continue;}
            assert.ok(sdk.AudioUtils.isPlaying(entity),'actual SDK pool owns playback');
            const instances=entity.getValue(sdk.AudioSource,'_pool').getAllInstances();
            assert.ok(instances.some(audio=>audio.isPlaying));assert.ok(instances[0] instanceof sdk.PositionalAudio);
            assert.ok(Number.isFinite(instances[0].panner.positionX.value),'SDK emitter updates the Web Audio panner');
        }
        assert.equal(owner.system.listener.parent.position.x,.2);
        if(scope==='tutorial'){
            assert.equal(owner.sparkle({x:-.3,y:1.1,z:-.5}),true);await Promise.resolve();owner.update(.02,.03,frame);
            const chime=entities.find(entity=>entity.getValue(sdk.AudioSource,'loop')===false);
            assert.ok(sdk.AudioUtils.isPlaying(chime),'one-shot chime uses the official SDK audio pool');assert.equal(chime.object3D.position.x,-.3);
        }
        owner.update(.02,.04,{...frame,muted:true});assert.deepEqual(owner.snapshot().playing,[]);
        assert.equal(owner.sparkle({x:0,y:1,z:0}),false,'mute suppresses the chime');
        owner.update(.02,.06,frame);owner.update(.02,.08,{...frame,paused:true});assert.deepEqual(owner.snapshot().playing,[]);
        owner.dispose();owner.dispose();assert.equal(endpoint,null);assert.deepEqual(owner.snapshot().playing,[]);
    }finally{owner.dispose();globalThis.ProgressEvent=savedProgress;}
});
test('scene sound buffers are deterministic PCM WAVs rather than altered narration',()=>{
    for(const kind of ['water','insect','sparkle']){
        const url=tutorialSoundUrl(kind);assert.equal(url,tutorialSoundUrl(kind));
        const bytes=Buffer.from(url.split(',')[1],'base64');assert.equal(bytes.toString('ascii',0,4),'RIFF');
        assert.equal(bytes.readUInt32LE(24),16000);assert.equal(bytes.readUInt16LE(22),1);
    }
});
