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
    let end=0;const shown=[];for(const part of parts){shown.push(part.text);end+=part.weight/total;if(progress<end)break;}
    return shown.join('\n\n') || fallback;
}

// Authored teaching copy remains readable while narration is loading. Paragraphs
// accumulate without scrolling away; the screen layout measures their full height.
export function welcomeLessonCaption(lesson,visibleAge=0){
    const paragraphs=lesson.paragraphs || [lesson.caption || ''];
    return paragraphs.slice(0,Math.min(paragraphs.length,1+Math.floor(Math.max(0,visibleAge)/3))).join('\n\n');
}
export function drawWelcomeText(ctx,{title='',layoutTitle=title,caption='',width=1160,center=700,top=220,bottom=820,titleSize=88,bodySize=54}={}){
    const wrap=(text,size)=>{ctx.font=`500 ${size}px system-ui`;return String(text).split(/\n\s*\n/).flatMap((paragraph,index)=>{const lines=[''];for(const word of paragraph.trim().split(/\s+/)){const i=lines.length-1,next=lines[i]?lines[i]+' '+word:word;if(ctx.measureText(next).width>width && lines[i])lines.push(word);else lines[i]=next;}return index?['',...lines]:lines;});};
    ctx.textAlign='center';ctx.textBaseline='middle';let heading=title?wrap(title,titleSize):[],size=bodySize,lines=wrap(caption,size);
    const reservedHeading=(layoutTitle || title)?wrap(layoutTitle || title,titleSize):[];
    const headingHeight=reservedHeading.length*(titleSize*1.12),gap=reservedHeading.length?54:0;
    while(size>30 && headingHeight+gap+lines.length*size*1.35>bottom-top){size-=2;lines=wrap(caption,size);}
    let y=top+titleSize/2;ctx.font=`500 ${titleSize}px system-ui`;for(const line of heading){ctx.fillText(line,center,y);y+=titleSize*1.12;}
    y=top+headingHeight+gap+size/2;ctx.font=`500 ${size}px system-ui`;for(const line of lines){if(line)ctx.fillText(line,center,y);y+=size*1.35;}
    return y;
}

export function welcomePracticeTablePose(viewer,frame,height){
    let x=frame?.center.x-viewer[12],z=frame?.center.z-viewer[14];
    if(!Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x,z)<.1){x=-viewer[8];z=-viewer[10];}
    const length=Math.hypot(x,z) || 1;x/=length;z/=length;
    // A little more space from the visitor's body, while keeping the near edge
    // reachable. Leave clearance behind the tabletop when a frame is nearby.
    const frameDistance=frame?Math.hypot(frame.center.x-viewer[12],frame.center.z-viewer[14]):Infinity;
    const distance=Math.max(.65,Math.min(.85,frameDistance-.85));
    return {x:viewer[12]+x*distance,y:height,z:viewer[14]+z*distance,yaw:Math.atan2(-x,-z)};
}
