import {currentInfoOpacity} from './spatialVisualSettings.js';
// Soft glass button rendered to the existing high-resolution XR texture.
// Logical coordinates match the existing button surface and ray-hit bounds.
export function drawLivingFrameButton(ctx, labelText, aimed=false,disabled=false,backgroundOpacity=currentInfoOpacity()) {
    ctx.clearRect(0,0,2048,1024);
    ctx.save();ctx.scale(2048/900,1024/360);
    ctx.shadowBlur=0;ctx.shadowColor='transparent';
    const opacity=Math.max(0,Math.min(1,backgroundOpacity))*.45;
    const glass=ctx.createLinearGradient(0,24,0,336);glass.addColorStop(0,`rgba(${aimed?'30,56,55':'15,29,34'},${opacity})`);glass.addColorStop(.46,`rgba(9,23,29,${opacity})`);glass.addColorStop(1,`rgba(6,17,23,${opacity})`);ctx.fillStyle=glass;
    ctx.beginPath();ctx.roundRect(24,24,852,312,40);ctx.fill();
    if(aimed && !disabled){ctx.shadowColor='#b9ffe1';ctx.shadowBlur=20;}
    ctx.strokeStyle=disabled?'rgba(207,224,215,.24)':aimed?'#effff4':'rgba(213,244,226,.78)';ctx.lineWidth=aimed?7:3;
    ctx.beginPath();ctx.roundRect(26,26,848,308,38);ctx.stroke();
    ctx.shadowBlur=0;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=disabled?'rgba(236,242,238,.62)':'#ffffff';
    const text=String(labelText || 'Continue');
    let size=112;ctx.font=`600 ${size}px Manrope, "Segoe UI Variable", Inter, system-ui, sans-serif`;
    while(size>84 && ctx.measureText(text).width>800){size-=2;ctx.font=`600 ${size}px Manrope, "Segoe UI Variable", Inter, system-ui, sans-serif`;}
    const lines=[];let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line && ctx.measureText(next).width>800){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.slice(0,3).forEach((value,index)=>ctx.fillText(value,450,180+(index-(Math.min(lines.length,3)-1)/2)*92,780));
    ctx.restore();
}

export function applyLivingFrameButtonSampling(gl) {
    const extension=gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if(extension){
        const maximum=gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(gl.TEXTURE_2D,extension.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,maximum));
    }
}
