import {BUILD_INFO} from './buildInfo.js';

const STORAGE_KEY='nourishland-xr-quest-tutorial-capture';

export function questTutorialCaptureEnabled(){
    if(new URLSearchParams(location.search).get('questPerf')==='1')return true;
    try{return JSON.parse(localStorage.getItem('nourishland-xr-settings') || '{}').developerDiagnostics===true;}
    catch{return false;}
}

export function savedQuestTutorialReport(){
    try{return localStorage.getItem(STORAGE_KEY) || '';}
    catch{return '';}
}

function percentile(histogram,total,ratio){
    if(!total)return 0;
    const target=Math.ceil(total*ratio);let seen=0;
    for(let i=0;i<histogram.length;i++){seen+=histogram[i];if(seen>=target)return i;}
    return histogram.length-1;
}

function segmentFor(phase,time,rate,practice){
    return {phase,startedAt:time,endedAt:time,rate,frames:0,intervals:0,intervalTotal:0,cpuTotal:0,
        missed:0,intervalHistogram:Array(201).fill(0),cpuHistogram:Array(201).fill(0),steps:new Map(),
        rebuildStart:practice?.rendererRebuilds ?? null,rebuildEnd:practice?.rendererRebuilds ?? null,
        sourceMeshes:practice?.renderer?.sourceMeshes ?? null,instanceBatches:practice?.renderer?.instanceBatches ?? null,
        inputBackend:practice?.inputBackend || null};
}

function summarize(segment){
    const stepCosts=[...segment.steps].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,ms])=>[name,Math.round(ms/segment.frames*10)/10]);
    const duration=Math.max(.001,(segment.endedAt-segment.startedAt)/1000);
    return {lesson:segment.phase,seconds:Math.round(duration*10)/10,frames:segment.frames,
        callbackFps:segment.intervalTotal?Math.round(segment.intervals*10000/segment.intervalTotal)/10:0,targetHz:segment.rate,
        frameMeanMs:segment.intervals?Math.round(segment.intervalTotal/segment.intervals*10)/10:0,
        frameP95Ms:percentile(segment.intervalHistogram,segment.intervals,.95),
        frameP99Ms:percentile(segment.intervalHistogram,segment.intervals,.99),
        lateFrames:segment.missed,cpuMeanMs:segment.frames?Math.round(segment.cpuTotal/segment.frames*10)/10:0,
        cpuP95Ms:percentile(segment.cpuHistogram,segment.frames,.95),
        rendererRebuilds:segment.rebuildStart===null?null:Math.max(0,segment.rebuildEnd-segment.rebuildStart),
        sourceMeshes:segment.sourceMeshes,instanceBatches:segment.instanceBatches,
        inputBackend:segment.inputBackend,topCpuSteps:stepCosts};
}

export function createQuestTutorialCapture(session){
    if(!questTutorialCaptureEnabled())return null;
    const startedAt=new Date().toISOString(),segments=[];
    let current=null,lastFrameTime=null,lastSaved=0,lastRendererRebuilds=null,ended=false,visibleFrames=0;
    const pendingSteps=new Map();
    const device=navigator.userAgent;
    function report(){
        const all=[...segments,current].filter(Boolean).map(summarize);
        return JSON.stringify({kind:'Quest tutorial performance',version:BUILD_INFO.version,startedAt,
            savedAt:new Date().toISOString(),device,mode:session?.mode || 'immersive',
            note:'WebXR callback cadence and JavaScript timing; GPU/compositor time is not measured.',
            visibleFrames,lessons:all},null,2);
    }
    function save(){try{localStorage.setItem(STORAGE_KEY,report());}catch{}}
    function frame(time,phase,cpuMs,practice){
        if(ended || !phase)return;
        if(session?.visibilityState==='visible-blurred'){pause();return;}
        const rate=session?.frameRate || 72;
        if(current?.phase!==phase){if(current)segments.push(current);current=segmentFor(phase,time,rate,practice);
            if(lastRendererRebuilds!==null)current.rebuildStart=lastRendererRebuilds;
            lastFrameTime=null;}
        current.endedAt=time;current.rate=rate;current.frames++;visibleFrames++;
        for(const [name,ms] of pendingSteps)current.steps.set(name,(current.steps.get(name) || 0)+ms);
        pendingSteps.clear();
        current.cpuTotal+=cpuMs;current.cpuHistogram[Math.min(200,Math.max(0,Math.floor(cpuMs)))]++;
        if(lastFrameTime!==null){const dt=time-lastFrameTime;if(dt>0 && dt<1000){current.intervals++;current.intervalTotal+=dt;
            current.intervalHistogram[Math.min(200,Math.floor(dt))]++;
            if(dt>1500/rate)current.missed++;}}
        lastFrameTime=time;
        if(practice){current.rebuildEnd=practice.rendererRebuilds;lastRendererRebuilds=practice.rendererRebuilds;
            current.sourceMeshes=practice.renderer?.sourceMeshes ?? current.sourceMeshes;
            current.instanceBatches=practice.renderer?.instanceBatches ?? current.instanceBatches;
            current.inputBackend=practice.inputBackend || current.inputBackend;}
        if(!lastSaved)lastSaved=time;
        else if(time-lastSaved>10000){lastSaved=time;save();}
    }
    function step(name,ms){pendingSteps.set(name,(pendingSteps.get(name) || 0)+ms);}
    function pause(){lastFrameTime=null;pendingSteps.clear();}
    function finish(){if(ended)return;ended=true;if(!visibleFrames)return;save();showQuestTutorialReport();}
    return {frame,step,pause,finish,report};
}

export function showQuestTutorialReport(){
    if(!savedQuestTutorialReport() || document.querySelector('[data-quest-performance-report]'))return;
    const panel=document.createElement('aside');panel.dataset.questPerformanceReport='';
    panel.setAttribute('aria-label','Quest tutorial performance report');
    panel.style.cssText='position:fixed;z-index:2147483647;bottom:16px;left:16px;right:16px;max-width:520px;margin:auto;padding:14px 16px;border-radius:12px;background:#142c25;color:#fff;box-shadow:0 8px 28px #0008;font:14px/1.4 system-ui';
    const message=document.createElement('span');message.textContent='Quest tutorial measurement saved. Copy the report and send it for diagnosis.';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Copy report';copy.setAttribute('aria-label','Copy Quest tutorial performance report');
    copy.style.cssText='margin:8px 8px 0 0;padding:9px 12px;border:1px solid #a9dcc5;border-radius:8px;background:#eef8f1;color:#142c25;cursor:pointer';
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(savedQuestTutorialReport());message.textContent='Report copied. Paste it into this chat.';}catch{message.textContent='Copy failed. Open Developer Diagnostics and select Copy Diagnostics.';}};
    const close=document.createElement('button');close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close Quest tutorial performance report');
    close.style.cssText='margin-top:8px;padding:9px 12px;border:1px solid #a9dcc5;border-radius:8px;background:transparent;color:#fff;cursor:pointer';close.onclick=()=>panel.remove();
    panel.append(message,document.createElement('br'),copy,close);document.body.append(panel);
}

export function renderQuestTutorialReport(root){
    const report=savedQuestTutorialReport();
    root.innerHTML=`<section class="screen settings-screen" data-quest-report style="max-width:760px;margin:0 auto;padding:24px">
        <header class="page-header"><button type="button" class="icon-control" data-report-back aria-label="Back to welcome" title="Back to welcome">←</button><h1>Quest performance report</h1></header>
        <div class="panel"><p data-report-status role="status"></p><button type="button" data-report-copy>Copy report</button><textarea readonly aria-label="Saved Quest performance report" style="display:block;width:100%;min-height:320px;margin-top:16px;box-sizing:border-box"></textarea></div>
    </section>`;
    const status=root.querySelector('[data-report-status]'),copy=root.querySelector('[data-report-copy]'),field=root.querySelector('textarea');
    field.value=report;
    if(!report){status.textContent='No Quest report is saved in this browser. Use the same Quest Browser profile that ran the tutorial.';copy.disabled=true;field.hidden=true;}
    else status.textContent='Your saved tutorial measurement is ready. Copy it and paste it into the chat.';
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(field.value);status.textContent='Report copied. Paste it into the chat.';}
        catch{field.focus();field.select();status.textContent='Clipboard access was blocked. The report is selected below; use the Browser copy command.';}});
    root.querySelector('[data-report-back]').addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.delete('questPerf');location.href=url.href;});
}
