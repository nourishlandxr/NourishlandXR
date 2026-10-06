// Shared geometry for DOM and XR controls: headings are not interactive.
export function spatialControlLayout(actions){
    if(!actions.some(item=>item.group))return actions.map((item,i)=>({...item,x:22+i%2*484,y:62+Math.floor(i/2)*66,width:464,height:54}));
    const groups=new Map();for(const item of actions){const key=item.group || 'Tools';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    const result=[];let y=62;
    for(const [label,items] of groups){
        result.push({id:'heading:'+label,kind:'heading',label,disabled:true,x:22,y,width:940,height:24});y+=32;
        const columns=Math.min(4,items.length),width=(940-(columns-1)*16)/columns;
        items.forEach((item,i)=>result.push({...item,x:22+i%columns*(width+16),y:y+Math.floor(i/columns)*66,width,height:54}));
        y+=Math.ceil(items.length/columns)*66+12;
    }
    return result;
}
