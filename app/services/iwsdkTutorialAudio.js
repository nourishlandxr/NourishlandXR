import * as AudioSDK from '../../iwsdk/audioSdk.js';

// Deterministic quiet scene sounds, not narration replacements/recordings.
export function tutorialSoundUrl(kind){
    const rate=16000,count=rate,bytes=new Uint8Array(44+count*2),view=new DataView(bytes.buffer);
    const word=(offset,text)=>{for(let i=0;i<text.length;i++)bytes[offset+i]=text.charCodeAt(i);};
    word(0,'RIFF');view.setUint32(4,bytes.length-8,true);word(8,'WAVE');word(12,'fmt ');
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);
    view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,count*2,true);
    let seed=771,filtered=0;
    for(let i=0;i<count;i++){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;filtered=.9*filtered+.1*(seed/4294967296*2-1);
        const t=i/rate,fade=Math.min(1,i/160,(count-i)/160),value=kind==='water'?filtered*.7:Math.sin(t*Math.PI*2*165)*.12+Math.sin(t*Math.PI*2*330)*.035;
        view.setInt16(44+i*2,Math.round(value*fade*32767),true);
    }
    let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    return 'data:audio/wav;base64,'+btoa(binary);
}

export async function createTutorialAudioOwner(runtime,voice,sdk=AudioSDK,{scope='tutorial'}={}){
    const context=voice?.context;if(!context || !runtime)return null;
    const {InteractionWorld,AudioSystem,AudioSource,AudioUtils,AssetManager,AudioAssetLoader,LoadingManager,Scene,Group,EventDispatcher,AudioContext,PositionalAudio,Matrix4}=sdk;
    AudioContext.setContext(context);
    AudioAssetLoader.init(new LoadingManager());
    const sounds=scope==='demo'?{bee:tutorialSoundUrl('insect')}:{water:tutorialSoundUrl('water'),insect:tutorialSoundUrl('insect')};
    await Promise.all(Object.values(sounds).map(url=>AssetManager.loadAudio(url)));
    const world=new InteractionWorld({entityCapacity:8});world.scene=new Scene();
    const head=new Group();world.scene.add(head);world.player={head};world.renderer={xr:new EventDispatcher()};
    world.registerComponent(AudioSource);world.registerSystem(AudioSystem);
    const system=world.getSystem(AudioSystem),speech=new PositionalAudio(system.listener);
    speech.setRefDistance(1);speech.setRolloffFactor(.35);speech.setMaxDistance(20);world.scene.add(speech);
    const records=new Map(),matrix=new Matrix4();let disposed=false,connected=false;
    for(const [id,src]of Object.entries(sounds)){
        const mesh=new Group();world.scene.add(mesh);const entity=world.createEntity();entity.object3D=mesh;
        entity.addComponent(AudioSource,{src,positional:true,loop:true,autoplay:false,volume:id==='water'?.10:.035,refDistance:.5,rolloffFactor:1.2,maxDistance:8});
        records.set(id,{mesh,entity,playing:false});
    }
    const releaseSpeech=voice.setSpatialOutput?.({connect(node){if(disposed)return;speech.setNodeSource(node);connected=true;}});
    const suspend=()=>{for(const record of records.values()){AudioUtils.stop(record.entity);record.playing=false;}world.update(0,0);};
    return {
        backend:'iwsdk-spatial-audio',world,system,
        update(dt,time,{viewer,zinnia,water,insect,watering=false,flying=false,paused=false,muted=false,visible=true}={}){
            if(disposed)return;
            if(viewer)matrix.fromArray(viewer).decompose(head.position,head.quaternion,head.scale);
            if(zinnia)speech.position.copy(zinnia);
            for(const [id,record]of records){
                const position=id==='water'?water:insect;if(position)record.mesh.position.copy(position);
                const playing=visible && !paused && !muted && (id==='water'?watering:flying);
                if(playing!==record.playing){playing?AudioUtils.play(record.entity):AudioUtils.stop(record.entity);record.playing=playing;}
            }
            world.scene.updateMatrixWorld(true);world.update(dt,time);
        },
        suspend,
        snapshot:()=>({backend:'iwsdk-spatial-audio',connected,playing:[...records].filter(([,record])=>record.playing).map(([id])=>id)}),
        dispose(){if(disposed)return;suspend();disposed=true;releaseSpeech?releaseSpeech():voice.setSpatialOutput?.(null);speech.disconnect();speech.removeFromParent();
            for(const record of records.values()){AudioUtils.stop(record.entity);record.entity.getValue(AudioSource,'_pool')?.dispose();record.entity.destroy();}
            records.clear();world.unregisterSystem(AudioSystem);system.listener?.removeFromParent();world.scene.clear();}
    };
}
