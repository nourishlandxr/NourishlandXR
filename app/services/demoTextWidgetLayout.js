export const NOTE_WIDGET_FOOTPRINT_SCALE=Math.SQRT1_2;
export const NOTE_WIDGET_LAYOUT=Object.freeze({main:{width:.86,height:.336},compact:{width:.70*NOTE_WIDGET_FOOTPRINT_SCALE,height:.264*NOTE_WIDGET_FOOTPRINT_SCALE}});
export const IDENTITY_GLYPH_Y_SCALE=.43/.28;

export function wrapMeasuredText(value,maxWidth,measure,maxLines=Infinity){
    const words=String(value || '').trim().split(/\s+/).filter(Boolean),lines=[];let line='';
    for(const word of words){
        const next=line?`${line} ${word}`:word;
        if(line && measure(next)>maxWidth){lines.push(line);line=word;}else line=next;
    }
    if(line)lines.push(line);
    if(lines.length>maxLines){lines.length=maxLines;const last=lines.length-1;let clipped=lines[last];while(clipped && measure(`${clipped}…`)>maxWidth)clipped=clipped.slice(0,-1).trimEnd();lines[last]=`${clipped}…`;}
    return lines;
}

export function identityTextLayout({title,scientific,roles,body},measure){
    const bands={
        title:{top:82,bottom:178,width:396,font:31,lineHeight:48,maxLines:2,baseline:130},
        scientific:{top:188,bottom:220,width:408,font:18,lineHeight:30,maxLines:1,baseline:204},
        roles:{top:223,bottom:290,width:408,font:19,lineHeight:32,maxLines:2,baseline:239},
        body:{top:296,bottom:412,width:408,font:18,lineHeight:28.5,maxLines:4,baseline:310}
    };
    const values={title,scientific,roles,body},result={};
    for(const [key,band] of Object.entries(bands)){
        const lines=wrapMeasuredText(values[key],band.width,measure[key],band.maxLines);
        const first=key==='title'?band.baseline-(lines.length-1)*band.lineHeight/2:band.baseline;
        result[key]={...band,glyphScale:IDENTITY_GLYPH_Y_SCALE,lines,baselines:lines.map((_,index)=>first+index*band.lineHeight)};
    }
    return result;
}

export function identityGlyphBounds(region,index){
    const baseline=region.baselines[index],halfHeight=region.font*region.glyphScale/2;
    return {baseline,top:baseline-halfHeight,bottom:baseline+halfHeight};
}
