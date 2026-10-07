// Soft glass button rendered to the existing high-resolution XR texture.
// Logical coordinates match the existing button surface and ray-hit bounds.
export function drawLivingFrameButton(ctx, labelText, aimed=false,disabled=false) {
    ctx.clearRect(0,0,2048,1024);
    ctx.save();ctx.scale(2048/900,1024/360);
    ctx.shadowBlur=0;ctx.shadowColor='transparent';
    ctx.fillStyle=disabled?'rgba(31,49,44,.48)':aimed?'rgba(176,218,197,.34)':'rgba(24,53,45,.42)';
    ctx.beginPath();ctx.roundRect(16,16,868,328,48);ctx.fill();
    const glass=ctx.createLinearGradient(0,24,0,336);glass.addColorStop(0,aimed?'rgba(231,255,242,.28)':'rgba(218,246,231,.16)');glass.addColorStop(.16,aimed?'rgba(134,190,163,.24)':'rgba(119,169,146,.13)');glass.addColorStop(.52,'rgba(17,43,36,.32)');glass.addColorStop(1,'rgba(7,24,22,.55)');ctx.fillStyle=glass;
    ctx.beginPath();ctx.roundRect(24,24,852,312,40);ctx.fill();
    ctx.strokeStyle=disabled?'rgba(207,224,215,.24)':aimed?'rgba(239,255,244,.78)':'rgba(213,244,226,.48)';ctx.lineWidth=3;
    ctx.beginPath();ctx.roundRect(26,26,848,308,38);ctx.stroke();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=disabled?'rgba(236,242,238,.62)':'#ffffff';
    const text=String(labelText || 'Continue');
    let size=112;ctx.font=`650 ${size}px Manrope, system-ui, sans-serif`;
    while(size>84 && ctx.measureText(text).width>800){size-=2;ctx.font=`650 ${size}px Manrope, system-ui, sans-serif`;}
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
