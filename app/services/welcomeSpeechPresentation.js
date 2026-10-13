// Caption pages follow the decoded clip's playback clock, including pause/resume.
// Sentence timing is distributed over the clip; it is not word-level ASR timing.
const pages=new Map();
export function welcomeSpeechPages(text){
    if(pages.has(text))return pages.get(text);
    const result=[];
    for(const sentence of String(text || '').match(/[^.!?]+[.!?]*\s*/g) || []){
        const words=sentence.trim().split(/\s+/);
        for(let i=0;i<words.length;i+=24){const part=words.slice(i,i+24);result.push({text:part.join(' '),weight:part.reduce((sum,word)=>sum+Math.max(1,word.length/5),0)+1});}
    }
    if(pages.size>40)pages.delete(pages.keys().next().value);
    pages.set(text,result);return result;
}
export function welcomeSpeechCaption(state,fallback=''){
    if(!state || state.loading===undefined)return fallback;
    if(state.loading)return '';
    if(!state.hasPlayed)return fallback;
    const parts=welcomeSpeechPages(state.text),total=parts.reduce((sum,part)=>sum+part.weight,0);
    const progress=Math.max(0,Math.min(1,(state.elapsed || 0)/Math.max(.001,state.duration || 0)));
    let end=0;for(const part of parts){end+=part.weight/total;if(progress<end)return part.text;}
    return parts.at(-1)?.text || fallback;
}

export function welcomePracticeTablePose(viewer,frame,height){
    let x=frame?.center.x-viewer[12],z=frame?.center.z-viewer[14];
    if(!Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x,z)<.1){x=-viewer[8];z=-viewer[10];}
    const length=Math.hypot(x,z) || 1;x/=length;z/=length;
    return {x:viewer[12]+x*.65,y:height,z:viewer[14]+z*.65,yaw:Math.atan2(-x,-z)};
}
