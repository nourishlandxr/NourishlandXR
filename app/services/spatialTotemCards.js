// Small independent text surfaces: no full-scene screenshot or per-frame repaint.
export function totemCardSurfaces(position, right, cards, selectedId = '') {
    const layout = [[-.61,1.58],[.61,1.12],[-.61,.64]];
    const place = (x,y,width,height,card,detail=false) => ({
        center:{x:position.x+right.x*x,y:position.y+y,z:position.z+right.z*x},
        right, width,height,card,detail
    });
    const surfaces=cards.slice(0,3).map((card,i)=>place(...layout[i],.86,.4,card));
    const selected=cards.find(card=>card.id===selectedId);
    if(selected) surfaces.push(place(-1.57,1.16,.82,1.08,selected,true));
    return surfaces;
}

export function hitTotemSurface(ray, surfaces) {
    if(!ray?.origin || !ray.direction)return null;
    const hits=[];
    for(const surface of surfaces) {
        const {center,width,height}=surface, right={y:0,...surface.right}, up=surface.up || {x:0,y:1,z:0};
        const normal=surface.normal || {x:right.y*up.z-right.z*up.y,y:right.z*up.x-right.x*up.z,z:right.x*up.y-right.y*up.x};
        const denominator=ray.direction.x*normal.x+ray.direction.y*normal.y+ray.direction.z*normal.z;
        if(Math.abs(denominator)<1e-6)continue;
        const distance=((center.x-ray.origin.x)*normal.x+(center.y-ray.origin.y)*normal.y+(center.z-ray.origin.z)*normal.z)/denominator;
        if(distance<=0)continue;
        const point={x:ray.origin.x+ray.direction.x*distance,y:ray.origin.y+ray.direction.y*distance,z:ray.origin.z+ray.direction.z*distance};
        const offset={x:point.x-center.x,y:point.y-center.y,z:point.z-center.z};
        const x=offset.x*right.x+offset.y*right.y+offset.z*right.z;
        const y=offset.x*up.x+offset.y*up.y+offset.z*up.z;
        if(Math.abs(x)<=width/2 && Math.abs(y)<=height/2)hits.push({...surface,distance,point,position:point,localX:x,localY:y});
    }
    return hits.sort((a,b)=>a.distance-b.distance)[0]||null;
}

function shader(gl,type,source) {
    const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);
    if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(result);gl.deleteShader(result);throw Error(error);}
    return result;
}

function wrapped(ctx,text,x,y,width,lineHeight,maxLines) {
    const lines=[];let line='';
    for(const paragraph of String(text||'').split('\n')) {
        for(const word of paragraph.split(/\s+/)) {
            const candidate=(line ? line+' ' : '')+word;
            if(line && ctx.measureText(candidate).width>width){lines.push(line);line=word;}else line=candidate;
        }
        if(line)lines.push(line);line='';
    }
    lines.slice(0,maxLines).forEach((value,index)=>ctx.fillText(value+(index===maxLines-1 && lines.length>maxLines ? '…' : ''),x,y+index*lineHeight,width));
}

function cardCanvas(card, detail, selected) {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=detail ? 960 : 400;
    const ctx=canvas.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,768,canvas.height);
    gradient.addColorStop(0,'rgba(83,113,92,.82)');gradient.addColorStop(1,'rgba(15,44,35,.78)');
    ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(8,8,752,canvas.height-16,32);ctx.fill();
    ctx.strokeStyle=selected ? '#e5eac0' : 'rgba(218,242,224,.8)';ctx.lineWidth=selected ? 4 : 2;ctx.stroke();
    ctx.textBaseline='top';ctx.fillStyle='#d2e8c6';ctx.font='600 25px system-ui';
    ctx.fillText(card.eyebrow,38,34,692);
    ctx.fillStyle='#f4faef';ctx.font='600 48px system-ui';wrapped(ctx,card.title,38,78,692,54,2);
    ctx.font=detail ? '400 34px system-ui' : '400 42px system-ui';ctx.fillStyle='#e0eadd';
    wrapped(ctx,detail ? card.body : card.summary,38,204,692,detail ? 43 : 50,detail ? 15 : 2);
    ctx.fillStyle='#d2e8c6';ctx.font='500 22px system-ui';
    ctx.fillText(detail ? 'Select this note to close' : 'Select to explore',38,canvas.height-46);
    return canvas;
}

export function createSpatialTotemCards(gl, options = {}) {
    const vs=shader(gl,gl.VERTEX_SHADER,'attribute vec2 p;uniform mat4 projection;uniform mat4 view;uniform vec3 center;uniform vec3 right;uniform vec3 up;uniform vec2 size;varying vec2 uv;void main(){uv=vec2(p.x+.5,.5-p.y);vec3 world=center+right*p.x*size.x+up*p.y*size.y;gl_Position=projection*view*vec4(world,1.0);}');
    const fs=shader(gl,gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D artwork;uniform float opacity;varying vec2 uv;void main(){vec4 c=texture2D(artwork,uv);if(c.a<.01)discard;gl_FragColor=vec4(c.rgb,c.a*opacity);}');
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),gl.STATIC_DRAW);
    const locations=Object.fromEntries(['projection','view','center','right','up','size','artwork','opacity'].map(name=>[name,gl.getUniformLocation(program,name)]));
    const p=gl.getAttribLocation(program,'p'),textures=new Map(),used=new Set();
    let surfaces=[];
    return {
        begin(){surfaces=[];used.clear();},
        draw(view, record, position, cards, selectedId) {
            const m=view.transform.inverse.matrix,rightLength=Math.hypot(m[0],m[8])||1;
            const right={x:m[0]/rightLength,y:0,z:m[8]/rightLength};
            const layout=options.surfaces ? options.surfaces(position,right,cards,selectedId) : totemCardSurfaces(position,right,cards,selectedId);
            gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
            gl.uniformMatrix4fv(locations.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(locations.view,false,m);
            gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.depthMask(false);
            for(const surface of layout) {
                const key=String(record.marker?.id || record.id)+':'+surface.card.id+':'+surface.detail;
                const content=JSON.stringify([surface.card,selectedId===surface.card.id]),cached=textures.get(key);
                let entry=cached;
                if(!entry || entry.content!==content) {
                    if(entry)gl.deleteTexture(entry.texture);
                    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
                    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,(options.canvas || cardCanvas)(surface.card,surface.detail,selectedId===surface.card.id));
                    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
                    entry={texture,content,started:performance.now()};textures.set(key,entry);
                }
                used.add(key);surfaces.push({...surface,record});
                gl.uniform3f(locations.center,surface.center.x,surface.center.y,surface.center.z);gl.uniform3f(locations.right,surface.right.x,surface.right.y || 0,surface.right.z);
                const up=surface.up || {x:0,y:1,z:0};gl.uniform3f(locations.up,up.x,up.y,up.z);
                gl.uniform2f(locations.size,surface.width,surface.height);
                const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
                gl.uniform1f(locations.opacity,reduced ? 1 : Math.min(1,(performance.now()-entry.started)/450));
                gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.uniform1i(locations.artwork,0);gl.drawArrays(gl.TRIANGLES,0,6);
            }
            gl.depthMask(true);
        },
        end(){for(const [key,entry] of textures)if(!used.has(key)){gl.deleteTexture(entry.texture);textures.delete(key);}},
        hit(ray){return hitTotemSurface(ray,surfaces);},
        destroy(){for(const entry of textures.values())gl.deleteTexture(entry.texture);textures.clear();gl.deleteBuffer(buffer);gl.deleteProgram(program);surfaces=[];}
    };
}
