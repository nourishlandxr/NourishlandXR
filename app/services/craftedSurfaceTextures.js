// Baked once, shared by the table and the native XR Totem renderer.
// All variation is deterministic; there is no texture generation in the frame loop.
const timberCanvases=new Map();
export function createCraftedTimberCanvas({width=512,height=1024,pale=false,horizontal=false}={}){
    const key=[width,height,pale,horizontal].join(':');
    if(timberCanvases.has(key))return timberCanvases.get(key);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');ctx.fillStyle=pale?'#d8b789':'#9d6435';ctx.fillRect(0,0,width,height);
    const image=ctx.createImageData(width,height);if(!image?.data)return canvas;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const u=horizontal?y/height:x/width,v=horizontal?x/width:y/height;
        const bend=Math.sin(v*8.1+u*5.3)*.009+Math.sin(v*17.7-u*9.1)*.003;
        const knotX=(u-.66)*2.4,knotY=(v-.38)*.48;
        const knot=Math.exp(-(knotX*knotX*55+knotY*knotY*90));
        const grainU=u+bend+.024*knot*Math.sin(Math.atan2(knotY,knotX)*2);
        const growth=Math.sin(grainU*168+Math.sin(grainU*39)*2.6);
        const fibre=Math.sin(grainU*1050+Math.sin(v*13.1+u*37)*3);
        const broad=Math.sin(u*24+Math.sin(v*4)*.5)*.035+Math.sin(u*57-v*.7)*.018;
        const pore=Math.pow(.5+.5*fibre,18)*(.5+.5*Math.sin(v*320+u*84));
        const noise=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
        const tone=broad+growth*.022+fibre*.007-pore*.022-knot*.035+noise*.004;
        const base=pale?[216,183,137]:[157,100,53],index=(y*width+x)*4;
        image.data[index]=base[0]+tone*255;image.data[index+1]=base[1]+tone*225;image.data[index+2]=base[2]+tone*175;image.data[index+3]=255;
    }
    ctx.putImageData(image,0,0);timberCanvases.set(key,canvas);return canvas;
}
