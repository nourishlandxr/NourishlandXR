// Use the same feedback contract in the actual XR scene and its preview.
export function playWelcomePracticeFeedback(feedback,kind,source,intensity=1){
    if(!feedback)return;
    if(kind==='paint' || kind==='paint-stop'){if(feedback.painting)feedback.painting(source,kind==='paint');else if(source)feedback.pulse(source,kind==='paint'?.04:0,140);return;}
    if(kind==='basket-contact'){if(source)feedback.pulse(source,.18,45);return;}
    if(kind==='magic-charge'){if(source)feedback.pulse(source,Math.min(.9,.55+.35*intensity),105);return;}
    if(kind==='magic' || kind==='transform'){
        feedback.sound('practice-magic');if(source)feedback.pulse(source,.95,190);return;
    }
    const step=kind==='step',reward=step || ['lesson','plant','collect','open','harvest','ring','land','zinnia'].includes(kind);
    feedback.sound(step?'practice-success':reward?'practice-reward':kind==='control' || kind==='point'?'practice-press':kind==='water'?'practice-water':kind==='impact'?'dice':'placement');
    if(source && (reward || ['control','point','water','grab','release','paint'].includes(kind)))feedback.pulse(source,step?.45:reward?.65:.25,step?65:reward?120:40);
}
