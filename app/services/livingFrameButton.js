// Raster artwork with a filled silhouette, not a fragile translucent stroke.
// Logical coordinates match the existing button surface and ray-hit bounds.
export function drawLivingFrameButton(ctx, labelText, aimed=false) {
    ctx.clearRect(0,0,2048,1024);
    ctx.save();ctx.scale(2048/900,1024/360);
    ctx.shadowBlur=0;ctx.shadowColor='transparent';
    ctx.fillStyle=aimed?'#f3ffe9':'#bdd2c5';
    ctx.beginPath();ctx.roundRect(16,16,868,328,48);ctx.fill();
    ctx.fillStyle=aimed?'#28483d':'#142d26';
    ctx.beginPath();ctx.roundRect(24,24,852,312,40);ctx.fill();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f5faef';
    const text=String(labelText || 'Continue');
    let size=100;ctx.font=`600 ${size}px system-ui, sans-serif`;
    while(size>44 && ctx.measureText(text).width>780){size-=2;ctx.font=`600 ${size}px system-ui, sans-serif`;}
    ctx.fillText(text,450,180,780);
    ctx.restore();
}

export function applyLivingFrameButtonSampling(gl) {
    const extension=gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if(extension){
        const maximum=gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(gl.TEXTURE_2D,extension.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,maximum));
    }
}
