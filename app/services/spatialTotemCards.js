import { drawSpatialSphere } from './spatialSphereRenderer.js';
import { totemHeightPreset } from './totemAppearance.js';

const TOTEM_BUTTON_WIDTH = .104;
const TOTEM_BUTTON_RADIUS = .052;
const TOTEM_BUTTON_FACE_RADIUS = .046;

function totemFaceDepth(y, bodyHalfDepth = .035, bodyHalfHeight = .69, topTaper = .9) {
    const localY = Math.max(-1, Math.min(1, (y - bodyHalfHeight) / bodyHalfHeight));
    const t = Math.max(0, Math.min(1, (localY + .35) / 1.35));
    const eased = t * t * (3 - 2 * t);
    return bodyHalfDepth * (1 - (1 - topTaper) * eased);
}

export function totemControlButtonLayout(position, right, { bodyHalfDepth = .035, bodyHalfHeight = .69, topTaper = .9 } = {}) {
    const front = { x: -right.z, y: 0, z: right.x };
    const rotationY = Math.atan2(-right.z, right.x);
    return [
        { id: '__signs', y: .78, symbol: '↔', title: 'SIGNS' },
        { id: '__fade', y: .47, symbol: '◐', title: 'FADE' }
    ].map(button => {
        const face = totemFaceDepth(button.y, bodyHalfDepth, bodyHalfHeight, topTaper);
        const centerOffset = face + .002;
        const faceOffset = face + .014;
        const point = offset => ({
            x: position.x + front.x * offset,
            y: position.y + button.y,
            z: position.z + front.z * offset
        });
        return {
            ...button,
            right,
            front,
            rotationY,
            radius: TOTEM_BUTTON_RADIUS,
            faceRadius: TOTEM_BUTTON_FACE_RADIUS,
            center: point(centerOffset),
            faceCenter: point(faceOffset),
            width: TOTEM_BUTTON_WIDTH,
            height: TOTEM_BUTTON_WIDTH
        };
    });
}

export function drawSpatialTotemButtons(gl, renderer, projectionMatrix, viewMatrix, position, rotationY = Math.PI / 7, state = {}) {
    const right = { x: Math.cos(rotationY), y: 0, z: -Math.sin(rotationY) };
    const bodyHalfWidth = Number(state.bodyHalfWidth) || .07;
    const bodyHalfDepth = Number(state.bodyHalfDepth) || bodyHalfWidth * .5;
    const bodyHalfHeight = Number(state.bodyHalfHeight) || .69;
    const layout = totemControlButtonLayout(position, right, { bodyHalfDepth, bodyHalfHeight });
    const opacity = (state.faded ? .18 : 1) * (Number.isFinite(state.arrivalOpacity) ? state.arrivalOpacity : 1);
    for (const button of layout) {
        const pressed = button.id === '__signs' ? Boolean(state.signsVisible && !state.faded) : Boolean(state.faded);
        drawSpatialSphere(gl, renderer, projectionMatrix, viewMatrix, button.center, button.radius, {
            color: [.14, .15, .16], alpha: opacity, emissive: .015,
            scale: { x: 1, y: 1, z: .25 }, rotationY
        });
        const faceCenter = {
            x: button.center.x + button.front.x * .004,
            y: button.center.y,
            z: button.center.z + button.front.z * .004
        };
        drawSpatialSphere(gl, renderer, projectionMatrix, viewMatrix, faceCenter, button.faceRadius, {
            color: pressed ? [.79, .72, .60] : [.61, .64, .62], alpha: opacity, emissive: .025,
            scale: { x: 1, y: 1, z: .25 }, rotationY
        });
    }
}

// Small independent text surfaces: no full-scene screenshot or per-frame repaint.
export function totemCardSurfaces(position, right, cards, selectedId = '', state = {}) {
    const front={x:-right.z,y:0,z:right.x};
    const bodyHalfDepth = Number(state?.bodyHalfDepth) || .035;
    const bodyHalfWidth = Number(state?.bodyHalfWidth) || .07;
    const boardWidth = Number(state?.boardWidth) || (bodyHalfWidth >= .16 ? .72 : .58);
    const boardHeight = Number(state?.boardHeight) || (bodyHalfWidth >= .16 ? .18 : .22);
    const boardAttach = bodyHalfWidth + boardWidth / 2 - .014;
    const place = (x,y,width,height,card,detail=false,offset=bodyHalfDepth+.018) => ({
        center:{x:position.x+right.x*x+front.x*offset,y:position.y+y,z:position.z+right.z*x+front.z*offset},
        right, width,height,card,detail
    });
    const legacySimplified=typeof state==='boolean' ? state : false;
    const signsVisible=typeof state==='object' ? Boolean(state.signsVisible) : !legacySimplified;
    const faded=typeof state==='object' ? Boolean(state.faded) : false;
    const signs={id:'__signs',title:'SIGNS',symbol:'↔',control:true,pressed:signsVisible && !faded};
    const fade={id:'__fade',title:faded?'WAKE':'FADE',symbol:'◐',control:true,pressed:faded};
    const bodyHalfHeight = Number(state?.bodyHalfHeight) || .69;
    const buttons = totemControlButtonLayout(position, right, { bodyHalfDepth, bodyHalfHeight });
    const signBoard = (card, side, y) => ({
        ...place(side * boardAttach, y, boardWidth, boardHeight, {
            ...card,
            boardStyle:'attached-sign',
            boardSide:side < 0 ? 'left' : 'right'
        }),
        boardSide:side < 0 ? 'left' : 'right'
    });
    const headerSelected=selectedId===cards[0]?.id;
    const headerBoard = cards[0] ? {
        ...place(0, 1.58, Math.max(.84, boardWidth + .12), .34, {...cards[0],boardStyle:headerSelected?'header-detail':'header',stats:headerSelected?undefined:cards[0].stats},headerSelected),
        boardStyle:'header'
    } : null;
    const signCards=cards.slice(1,bodyHalfWidth>=.16 ? 5 : 3);
    const surfaces=[
        ...buttons.map((button,index)=>({center:button.faceCenter,right,width:button.width,height:button.height,card:index===0?signs:fade,detail:false,opacity:faded ? .18 : 1})),
        ...(signsVisible && !faded ? [
            headerBoard,
            ...signCards.map((card,index)=>signBoard(card,card.boardSide==='left'?-1:card.boardSide==='right'?1:index%2?-1:1,Number.isFinite(card.signHeight)?card.signHeight:1.1-index*.25))
        ].filter(Boolean) : [])
    ];
    const selected=cards.find(card=>card.id===selectedId);
    if(selected && selected.id!==cards[0]?.id && signsVisible && !faded) surfaces.push(place(0,2.04,1.18,.58,{...selected,boardStyle:'header-detail'},true));
    return surfaces;
}

export function stableTotemCardRight(record, viewerRight) {
    if (!record) return viewerRight;
    if (!record.spatialCardRight) record.spatialCardRight={x:viewerRight.x,y:0,z:viewerRight.z};
    return record.spatialCardRight;
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
    const canvas=document.createElement('canvas');canvas.width=card.control ? 400 : 768;canvas.height=detail ? 560 : 400;
    const ctx=canvas.getContext('2d');
    if(card.control){
        const face=ctx.createRadialGradient(142,116,18,200,200,176);face.addColorStop(0,'rgba(191,184,168,.98)');face.addColorStop(.58,'rgba(103,91,78,.98)');face.addColorStop(1,'rgba(48,42,38,.99)');
        ctx.fillStyle='rgba(22,19,18,.64)';ctx.beginPath();ctx.arc(200,214,160,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=face;ctx.beginPath();ctx.arc(200,194,154,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=card.pressed?'#f0d49a':'rgba(231,220,202,.72)';ctx.lineWidth=card.pressed?10:6;ctx.stroke();
        ctx.fillStyle='#f8f1e4';ctx.font='700 116px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(card.symbol || '●',200,194,230);
        return canvas;
    }
    const boardStyle=card.boardStyle || (detail ? 'header-detail' : 'card');
    if(boardStyle==='attached-sign'){
        const left=card.boardSide==='left';
        const gradient=ctx.createLinearGradient(left?760:0,0,left?0:760,canvas.height);
        gradient.addColorStop(0,'rgba(236,226,193,.96)');gradient.addColorStop(.18,'rgba(156,128,84,.98)');gradient.addColorStop(1,'rgba(68,55,42,.96)');
        ctx.shadowColor='rgba(10,17,15,.46)';ctx.shadowBlur=18;ctx.shadowOffsetY=8;
        ctx.fillStyle=gradient;ctx.strokeStyle='rgba(255,244,205,.88)';ctx.lineWidth=6;ctx.beginPath();
        if(left){ctx.moveTo(728,66);ctx.lineTo(122,66);ctx.lineTo(32,200);ctx.lineTo(122,334);ctx.lineTo(728,334);}else{ctx.moveTo(40,66);ctx.lineTo(646,66);ctx.lineTo(736,200);ctx.lineTo(646,334);ctx.lineTo(40,334);}
        ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowColor='transparent';
        ctx.fillStyle='rgba(37,36,31,.72)';ctx.fillRect(left?704:40,72,24,256);
        ctx.fillStyle='#42382e';[128,272].forEach(y=>{ctx.beginPath();ctx.arc(left?716:52,y,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(249,241,211,.72)';ctx.beginPath();ctx.arc((left?716:52)-3,y-3,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#42382e';});
        ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='rgba(47,39,31,.78)';ctx.font='700 23px system-ui';ctx.fillText(card.eyebrow,384,92,500);
        ctx.fillStyle='#fff9e8';ctx.font='700 39px system-ui';wrapped(ctx,card.title,384,130,500,43,2);
        ctx.fillStyle='rgba(255,248,225,.88)';ctx.font='400 29px system-ui';wrapped(ctx,card.summary,384,236,500,35,2);
        return canvas;
    }
    if(boardStyle==='header' || boardStyle==='header-detail'){
        const gradient=ctx.createLinearGradient(0,0,768,canvas.height);gradient.addColorStop(0,'rgba(45,83,101,.96)');gradient.addColorStop(.55,'rgba(33,60,84,.94)');gradient.addColorStop(1,'rgba(20,37,57,.91)');
        ctx.shadowColor='rgba(7,19,29,.52)';ctx.shadowBlur=22;ctx.shadowOffsetY=8;ctx.fillStyle=gradient;ctx.strokeStyle='rgba(220,239,209,.9)';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(22,28,724,344,42);ctx.fill();ctx.stroke();ctx.shadowColor='transparent';
        ctx.fillStyle='rgba(223,199,132,.82)';ctx.fillRect(84,42,600,7);
        ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#d8efda';ctx.font='700 22px system-ui';ctx.fillText(card.eyebrow,384,68,620);
        ctx.fillStyle='#f7ffe9';ctx.font='700 40px system-ui';wrapped(ctx,card.title,384,104,620,44,2);
        if(Array.isArray(card.stats)){
            const stats=card.stats.slice(0,3),width=190;stats.forEach((stat,index)=>{const x=180+index*204;ctx.fillStyle='rgba(170,221,191,.18)';ctx.strokeStyle='rgba(214,244,214,.56)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-width/2,210,width,82,17);ctx.fill();ctx.stroke();ctx.fillStyle='#fff3c9';ctx.font='800 31px system-ui';ctx.fillText(String(stat.value),x,220,165);ctx.fillStyle='#cae8d0';ctx.font='700 17px system-ui';ctx.fillText(String(stat.label),x,264,170);});
        }else{ctx.fillStyle='#e4f2e3';ctx.font='400 28px system-ui';wrapped(ctx,detail ? card.body : card.summary,384,210,620,35,3);}
        if(card.summary && Array.isArray(card.stats)){ctx.fillStyle='rgba(230,245,226,.82)';ctx.font='400 21px system-ui';ctx.fillText(card.summary,384,326,640);}
        return canvas;
    }
    const gradient=ctx.createLinearGradient(0,0,768,canvas.height);
    if(detail){gradient.addColorStop(0,'rgba(63,88,99,.96)');gradient.addColorStop(1,'rgba(18,38,49,.95)');}
    else {const tones=[['rgba(91,120,91,.86)','rgba(26,55,39,.82)'],['rgba(112,116,82,.84)','rgba(50,52,31,.82)'],['rgba(73,111,101,.84)','rgba(20,50,45,.82)']][Math.abs(String(card.id||'').split('').reduce((sum,value)=>sum+value.charCodeAt(0),0))%3];gradient.addColorStop(0,tones[0]);gradient.addColorStop(1,tones[1]);}
    ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(8,8,752,canvas.height-16,32);ctx.fill();
    ctx.strokeStyle=selected ? '#e5eac0' : 'rgba(218,242,224,.8)';ctx.lineWidth=selected ? 4 : 2;ctx.stroke();
    ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#d2e8c6';ctx.font='600 25px system-ui';
    ctx.fillText(card.eyebrow,38,28,692);
    ctx.fillStyle='#f4faef';ctx.font='600 44px system-ui';wrapped(ctx,card.title,38,68,692,50,2);
    ctx.font='400 34px system-ui';ctx.fillStyle='#e0eadd';wrapped(ctx,detail ? card.body : card.summary,38,180,692,detail ? 43 : 42,detail ? 6 : 2);
    ctx.fillStyle='#d2e8c6';ctx.font='500 22px system-ui';ctx.fillText(detail ? 'Select this note to close' : 'Select to explore',38,canvas.height-46);
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
            const isTotem=record?.demoType==='zone' || record?.marker?.type==='area_checkpoint';
            const towardViewerX=m[12]-position.x,towardViewerZ=m[14]-position.z;
            const viewerYaw=Math.atan2(towardViewerX,towardViewerZ);
            const storedRotation=Number(record?.rotationY);
            const rotationY=isTotem && Number.isFinite(storedRotation)
                ? storedRotation
                : isTotem && options.faceTotemToViewer && Number.isFinite(viewerYaw)
                    ? viewerYaw
                    : (Number(record?.rotationDegrees) || 24)*Math.PI/180;
            const right=isTotem
                ? {x:Math.cos(rotationY),y:0,z:-Math.sin(rotationY)}
                : stableTotemCardRight(record,{x:m[0]/rightLength,y:0,z:m[8]/rightLength});
            const size=record?.marker?.appearance?.size || record?.appearance?.size || 'medium';
            const sizeFactor=({tiny:.58,small:.76,medium:1,large:1.34,huge:1.82})[size] || 1;
            const halfWidth=record?.demoType==='zone' ? .20 : .07*sizeFactor;
            const bodyHalfHeight=record?.demoType==='zone'
                ? .82
                : Math.max(.12,totemHeightPreset(record?.marker || record).halfHeightMetres*sizeFactor-halfWidth*.35);
            const layout=options.surfaces ? options.surfaces(position,right,cards,selectedId) : totemCardSurfaces(position,right,cards,selectedId,{
                signsVisible:Boolean(record?.demoTotemSignsVisible),faded:Boolean(record?.demoTotemFaded),
                bodyHalfWidth:halfWidth,bodyHalfDepth:record?.demoType==='zone' ? .14 : halfWidth*.5,bodyHalfHeight
            });
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
                    entry={texture,content,started:entry?.started ?? performance.now(),fadeDuration:entry?.fadeDuration ?? surface.card.fadeDuration ?? 450};textures.set(key,entry);
                }
                used.add(key);surfaces.push({...surface,record});
                gl.uniform3f(locations.center,surface.center.x,surface.center.y,surface.center.z);gl.uniform3f(locations.right,surface.right.x,surface.right.y || 0,surface.right.z);
                const up=surface.up || {x:0,y:1,z:0};gl.uniform3f(locations.up,up.x,up.y,up.z);
                gl.uniform2f(locations.size,surface.width,surface.height);
                const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
                const fadeOpacity = Number.isFinite(surface.opacity) ? surface.opacity : 1;
                const arrival=record?.demoArriveAt ? Math.min(1,Math.max(0,(performance.now()-record.demoArriveAt)/900)) : 1;
                gl.uniform1f(locations.opacity,(reduced ? 1 : Math.min(1,(performance.now()-entry.started)/entry.fadeDuration))*fadeOpacity*arrival);
                gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.uniform1i(locations.artwork,0);gl.drawArrays(gl.TRIANGLES,0,6);
            }
            gl.depthMask(true);
        },
        end(){for(const [key,entry] of textures)if(!used.has(key)){gl.deleteTexture(entry.texture);textures.delete(key);}},
        hit(ray){return hitTotemSurface(ray,surfaces);},
        destroy(){for(const entry of textures.values())gl.deleteTexture(entry.texture);textures.clear();gl.deleteBuffer(buffer);gl.deleteProgram(program);surfaces=[];}
    };
}
