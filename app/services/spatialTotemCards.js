import { drawSpatialSphere } from './spatialSphereRenderer.js';
import { drawSpatialPrism } from './spatialPrismRenderer.js';
import { totemSculpturePoint } from './spatialTotemSculpture.js';
import { currentTotemModel, currentInfoOpacity } from './spatialVisualSettings.js';
import { totemHeightPreset, renderedTotemStyle } from './totemAppearance.js';
import { SPATIAL_OBJECT_VISUALS, spatialTransitionProgress } from './spatialObjectVisuals.js';

const TOTEM_BUTTON_WIDTH = .104;
const TOTEM_BUTTON_RADIUS = .052;
const TOTEM_BUTTON_FACE_RADIUS = .046;
const TOTEM_TEXT_RESOLUTION = Object.freeze({ plaque:[2048,512], header:[2048,1024], detail:[2048,1024], control:[1024,1024] });

export function textureSupportsMipmaps(source) {
    const powerOfTwo=value=>Number.isInteger(value) && value>0 && (value & (value-1))===0;
    return powerOfTwo(source?.width) && powerOfTwo(source?.height);
}

export function spatialCardTextureContent(card) {
    if(card.element)return JSON.stringify({language:currentNxrLanguage(),id:card.id,title:card.title,revision:card.revision,resolution:card.resolution,height:card.height});
    // Quantise only the painted fade. Geometry, input and aim remain full cadence.
    return JSON.stringify({language:currentNxrLanguage(),content:card.media?{...card,imageFade:Math.round(card.imageFade*24)/24}:card});
}

function totemFaceDepth(y, bodyHalfDepth = .035, bodyHalfHeight = .69, topTaper = .9, style=currentTotemModel()) {
    // Place both the visible control and its text/hit surface on the carved face.
    const t=Math.max(0,Math.min(1,y/(bodyHalfHeight*2)));
    if(style==='basic')return bodyHalfDepth*(1-(1-topTaper)*t);
    const twist=(SPATIAL_OBJECT_VISUALS.totem[style] || SPATIAL_OBJECT_VISUALS.totem.carved).twist*Math.sin(t*Math.PI-.6);
    return bodyHalfDepth*totemSculpturePoint(t,Math.PI/2-twist,style)[2];
}

export function totemControlButtonLayout(position, right, { bodyHalfDepth = .035, bodyHalfHeight = .69, topTaper = .9, style=currentTotemModel() } = {}) {
    const front = { x: -right.z, y: 0, z: right.x };
    const rotationY = Math.atan2(-right.z, right.x);
    return [
        { id: '__signs', y: Math.min(SPATIAL_OBJECT_VISUALS.totem.controlHeights[0],bodyHalfHeight*1.50), symbol: '↔', title: 'SIGNS' },
        { id: '__fade', y: Math.min(SPATIAL_OBJECT_VISUALS.totem.controlHeights[1],bodyHalfHeight*1.26), symbol: '◐', title: 'FADE' }
    ].map(button => {
        const face = totemFaceDepth(button.y, bodyHalfDepth, bodyHalfHeight, topTaper,style);
        const centerOffset = face + .001;
        const faceOffset = face + (style==='basic'?.014:.002);
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
    if((state.style || currentTotemModel())!=='basic')return; // The carved controls are rendered inside the post material.
    const right = { x: Math.cos(rotationY), y: 0, z: -Math.sin(rotationY) };
    const bodyHalfWidth = Number(state.bodyHalfWidth) || .07;
    const bodyHalfDepth = Number(state.bodyHalfDepth) || bodyHalfWidth * .5;
    const bodyHalfHeight = Number(state.bodyHalfHeight) || .69;
    const layout = totemControlButtonLayout(position, right, { bodyHalfDepth, bodyHalfHeight,style:state.style || currentTotemModel() });
    const opacity = (Number.isFinite(state.fadeOpacity) ? state.fadeOpacity : state.faded ? .78 : 1) * (Number.isFinite(state.arrivalOpacity) ? state.arrivalOpacity : 1);
    for (const button of layout) {
        const pressed = button.id === '__signs' ? Boolean(state.signsVisible && !state.faded) : Boolean(state.faded);
        drawSpatialSphere(gl, renderer, projectionMatrix, viewMatrix, button.center, button.radius, {
            color: SPATIAL_OBJECT_VISUALS.totem.controlBronze, alpha: opacity, emissive: .015,roughness:.48,metalness:.42,
            scale: { x: .64, y: .78, z: .14 }, rotationY
        });
        const faceCenter = {
            x: button.center.x + button.front.x * .004,
            y: button.center.y,
            z: button.center.z + button.front.z * .004
        };
        drawSpatialSphere(gl, renderer, projectionMatrix, viewMatrix, faceCenter, button.faceRadius, {
            color: pressed ? SPATIAL_OBJECT_VISUALS.totem.controlActive : [.25,.29,.23], alpha: opacity, emissive: .025,roughness:.42,metalness:.48,
            scale: { x: .64, y: .78, z: .14 }, rotationY
        });
    }
}

// Small independent text surfaces: no full-scene screenshot or per-frame repaint.
export function totemCardSurfaces(position, right, cards, selectedId = '', state = {}) {
    const front={x:-right.z,y:0,z:right.x};
    const bodyHalfDepth = Number(state?.bodyHalfDepth) || .035;
    const bodyHalfWidth = Number(state?.bodyHalfWidth) || .07;
    const demoZone=Boolean(state?.demoZone);
    const demoScale=(Number(state?.bodyHalfHeight) || (demoZone ? 1 : .69))/.82;
    const boardWidth = Number(state?.boardWidth) || (demoZone ? .52 : .58);
    const boardHeight = Number(state?.boardHeight) || (demoZone ? .12 : .16);
    const boardAttach=bodyHalfWidth+boardWidth/2-.035;
    const place = (x,y,width,height,card,detail=false,offset=bodyHalfDepth+.018) => ({
        center:{x:position.x+right.x*x+front.x*offset,y:position.y+y,z:position.z+right.z*x+front.z*offset},
        right, width,height,card,detail
    });
    const legacySimplified=typeof state==='boolean' ? state : false;
    const signsVisible=typeof state==='object' ? Boolean(state.signsVisible) : !legacySimplified;
    const faded=typeof state==='object' ? Boolean(state.faded) : false;
    const signs={id:'__signs',title:'SIGNS',symbol:'↔',control:true,pressed:signsVisible && !faded};
    const fade={id:'__fade',title:faded?'WAKE':'FADE',symbol:'◐',control:true,pressed:faded};
    const bodyHalfHeight = Number(state?.bodyHalfHeight) || (demoZone ? 1 : .69);
    const buttons = totemControlButtonLayout(position, right, { bodyHalfDepth, bodyHalfHeight,style:state.style || currentTotemModel() });
    const signBoard = (card, index, count) => {
        const side=card.boardSide==='left'?-1:card.boardSide==='right'?1:0;
        return {
            ...place(side*boardAttach, bodyHalfHeight*(.80+(count-1-index)*.24), boardWidth, boardHeight, {
                ...card,
                glassOpacity:currentInfoOpacity(),
                boardStyle:'attached-sign',
                boardSide:card.boardSide || '',
                directional:Boolean(card.navigation?.reliable),selected:card.id===selectedId
            }),
            opacity:card.id===selectedId && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches? .9+.1*Math.sin(performance.now()/260):1,
            boardSide:card.boardSide || ''
        };
    };
    const titleBottom=buttons[0].faceCenter.y-position.y+.075;
    const titleHeight=Math.max(.025,Math.min(.18,1.88*bodyHalfHeight-titleBottom-.015));
    const headerBoard = cards[0] ? {
        ...place(0,bodyHalfHeight*2+.12,demoZone ? .46 : .68,.11,{...cards[0],glassOpacity:0,freeText:true,boardStyle:'header-compact',stats:undefined}),
        boardStyle:'header'
    } : null;
    const signCards=cards.slice(1,5);
    const signOpacity=typeof state==='object' && Number.isFinite(state.signOpacity) ? state.signOpacity : 1;
    const signInteractive=typeof state==='object' ? state.signInteractive!==false : true;
    const surfaces=[
        ...buttons.map((button,index)=>({center:button.faceCenter,right,width:Math.min(.14,bodyHalfWidth*1.8),height:.12,card:index===0?signs:fade,detail:false,opacity:faded ? .82 : 1})),
        ...(signsVisible && !faded ? [
            headerBoard,
            ...signCards.map((card,index)=>signBoard(card,index,signCards.length))
        ].filter(Boolean).map(surface=>({...surface,opacity:signOpacity*(surface.opacity ?? 1),interactive:signInteractive})) : [])
    ];
    const selected=cards.find(card=>card.id===selectedId);
    if(selected && signsVisible && !faded) surfaces.push({...place(0,Math.max(bodyHalfHeight*2+.30,2.04*demoScale),.90,.42,{...selected,freeText:true,body:selected.id===cards[0]?.id ? selected.welcomeBody || selected.body : selected.body,boardStyle:'header-detail'},true),opacity:signOpacity,interactive:signInteractive});
    return surfaces;
}

export function totemLayoutForRecord(record, position, cards, selectedId = '', rotationY = 0) {
    const right={x:Math.cos(rotationY),y:0,z:-Math.sin(rotationY)};
    const size=record?.marker?.appearance?.size || record?.appearance?.size || 'medium';
    const sizeFactor=({tiny:.58,small:.76,medium:1,large:1.34,huge:1.82})[size] || 1;
    const bodyHalfWidth=record?.demoType==='zone' ? .095 : .07*sizeFactor;
    const bodyHalfHeight=record?.demoType==='zone'
        ? Number(record.demoHalfHeight) || 1
        : Math.max(.12,totemHeightPreset(record?.marker || record).halfHeightMetres*sizeFactor-bodyHalfWidth*.35);
    const now=performance.now(),visual=SPATIAL_OBJECT_VISUALS.totem;
    const signProgress=spatialTransitionProgress(now,record?.demoSignsChangedAt,visual.signTransitionMs,globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    const signsVisible=Boolean(record?.demoTotemSignsVisible);
    const closing=!signsVisible && Number.isFinite(record?.demoSignsChangedAt) && now-record.demoSignsChangedAt<visual.signTransitionMs;
    const faded=Boolean(record?.demoTotemFaded);
    const fadeProgress=spatialTransitionProgress(now,record?.demoTotemFadeStartedAt,visual.fadeTransitionMs,globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    const fadeAlpha=faded?1-fadeProgress:fadeProgress;
    return totemCardSurfaces(position,right,cards,selectedId,{
        signsVisible:signsVisible || closing,faded:faded && fadeProgress>=1,
        signOpacity:(signsVisible ? signProgress : 1-signProgress)*fadeAlpha,signInteractive:signsVisible && !faded,
        style:renderedTotemStyle(record?.marker || record),
        bodyHalfWidth,bodyHalfDepth:record?.demoType==='zone' ? .075 : bodyHalfWidth*.5,bodyHalfHeight,demoZone:record?.demoType==='zone'
    });
}

export function resolveTotemNavigation(record, partner, facingRotation=record?.rotationY) {
    const rotation=Number(facingRotation);
    const dx=Number(partner?.position?.x)-Number(record?.position?.x);
    const dz=Number(partner?.position?.z)-Number(record?.position?.z);
    if(!partner || !Number.isFinite(rotation) || !Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx,dz)<=.05) {
        return {reliable:false,side:'',arrow:''};
    }
    const right={x:Math.cos(rotation),z:-Math.sin(rotation)};
    const side=dx*right.x+dz*right.z<0 ? 'left' : 'right';
    return {reliable:true,side,arrow:side==='left'?'←':'→'};
}

export function drawSpatialTotemPlaques(gl, prismRenderer, sphereRenderer, view, surfaces, opacity = 1) {
    for(const surface of surfaces) {
        // Glass backgrounds and outlines live in the text texture. An opaque
        // timber backing would defeat the shared opacity preference.
        if(surface.card?.control || Number.isFinite(surface.card?.glassOpacity))continue;
        const style=surface.card?.boardStyle || surface.boardStyle;
        const header=style==='header' || style==='header-detail' || style==='header-compact';
        const right=surface.right,front={x:-right.z,y:0,z:right.x};
        const rotationY=Math.atan2(-right.z,right.x),halfDepth=header ? .014 : .009;
        const centerDepth={x:surface.center.x-front.x*(halfDepth+.003),z:surface.center.z-front.z*(halfDepth+.003)};
        const visual=SPATIAL_OBJECT_VISUALS.totem;
        const colour=header ? visual.boardHeader : visual.boardWood;
        const highlight=header ? visual.boardHeaderEdge : visual.boardWoodEdge;
        drawSpatialPrism(gl,prismRenderer,view,{x:centerDepth.x,y:surface.center.y-surface.height/2,z:centerDepth.z},{
            halfWidth:surface.width/2,halfHeight:surface.height/2,halfDepth,
            color:colour,topColor:highlight,woodGrain:visual.woodGrain,grainDirection:1,topTaper:header ? .96 : .975,alpha:opacity*(surface.opacity ?? 1),rotationY
        });
        const fixingOffsets=header ? [-surface.height*.27,surface.height*.27] : [0];
        for(const yOffset of fixingOffsets) {
            const fixingCenter={
                x:surface.center.x+front.x*.006,
                y:surface.center.y+yOffset,
                z:surface.center.z+front.z*.006
            };
            drawSpatialSphere(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,fixingCenter,.009,{
                color:[.44,.40,.30],alpha:opacity*(surface.opacity ?? 1),emissive:.018,roughness:.4,metalness:.55,scale:{x:1,y:1,z:.32},rotationY
            });
        }
    }
}

export function stableTotemCardRight(record, viewerRight) {
    if (!record) return viewerRight;
    if (!record.spatialCardRight) record.spatialCardRight={x:viewerRight.x,y:0,z:viewerRight.z};
    return record.spatialCardRight;
}

export function hitTotemPoint(point,surfaces,{front=.055,back=.025,padding=0}={}){
    if(!point)return null;
    let nearest=null;
    for(const surface of surfaces){
        if(surface.interactive===false)continue;
        const {center,width,height}=surface,right={y:0,...surface.right},up=surface.up || {x:0,y:1,z:0};
        const normal=surface.normal || {x:right.y*up.z-right.z*up.y,y:right.z*up.x-right.x*up.z,z:right.x*up.y-right.y*up.x};
        const offset={x:point.x-center.x,y:point.y-center.y,z:point.z-center.z};
        const distance=offset.x*normal.x+offset.y*normal.y+offset.z*normal.z;
        if(distance>front || distance < -back)continue;
        const x=offset.x*right.x+offset.y*right.y+offset.z*right.z,y=offset.x*up.x+offset.y*up.y+offset.z*up.z;
        if(Math.abs(x)>width/2+padding || Math.abs(y)>height/2+padding)continue;
        if(!nearest || Math.abs(distance)<Math.abs(nearest.signedDistance))nearest={...surface,signedDistance:distance,distance:Math.abs(distance),localX:x,localY:y,point};
    }
    return nearest;
}

export function hitTotemSurface(ray, surfaces) {
    if(!ray?.origin || !ray.direction)return null;
    const hits=[];
    for(const surface of surfaces) {
        if(surface.interactive===false)continue;
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
    for(const paragraph of String(translateNxrText(text)||'').split('\n')) {
        for(const word of paragraph.split(/\s+/)) {
            const candidate=(line ? line+' ' : '')+word;
            if(line && ctx.measureText(candidate).width>width){lines.push(line);line=word;}else line=candidate;
        }
        if(line)lines.push(line);line='';
    }
    lines.slice(0,maxLines).forEach((value,index)=>ctx.fillText(value+(index===maxLines-1 && lines.length>maxLines ? '…' : ''),x,y+index*lineHeight,width));
}

function cardCanvas(card, detail) {
    const boardStyle=card.boardStyle || (detail ? 'header-detail' : 'card');
    const resolution=card.control ? TOTEM_TEXT_RESOLUTION.control
        : detail ? TOTEM_TEXT_RESOLUTION.detail
            : boardStyle==='header' || boardStyle==='header-detail' || boardStyle==='header-compact' ? TOTEM_TEXT_RESOLUTION.header : TOTEM_TEXT_RESOLUTION.plaque;
    const canvas=document.createElement('canvas');canvas.width=resolution[0];canvas.height=resolution[1];
    const ctx=localizedCanvasContext(canvas.getContext('2d'));
    // Preserve the existing logical type layout while rasterizing at double density.
    ctx.scale(2,2);
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='rgba(5,10,8,.72)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    const face='Manrope, "Segoe UI", system-ui, sans-serif';
    if(Number.isFinite(card.glassOpacity) && !card.freeText){
        const width=canvas.width/2,height=canvas.height/2;
        ctx.save();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
        ctx.beginPath();
        if(boardStyle==='attached-sign' && card.boardSide){const left=card.boardSide==='left',tip=left?7:width-7,edge=left?70:width-70;ctx.moveTo(tip,height/2);ctx.lineTo(edge,7);ctx.lineTo(left?width-7:7,7);ctx.lineTo(left?width-7:7,height-7);ctx.lineTo(edge,height-7);ctx.closePath();}
        else ctx.roundRect(7,7,width-14,height-14,boardStyle==='header-compact'?height/2:24);
        ctx.fillStyle=card.selected?`rgba(6,36,62,${Math.max(.5,card.glassOpacity)})`:boardStyle==='header-compact'?`rgba(37,48,43,${card.glassOpacity})`:`rgba(8,30,28,${card.glassOpacity})`;ctx.fill();
        ctx.strokeStyle='rgba(213,232,207,.84)';ctx.lineWidth=5;ctx.stroke();ctx.restore();
    }
    if(card.control){
        ctx.fillStyle='#f8f1e4';ctx.font=`650 146px ${face}`;ctx.fillText(card.symbol || '●',256,218,250);
        ctx.shadowBlur=2;ctx.fillStyle='rgba(249,244,234,.92)';ctx.font=`750 46px ${face}`;ctx.fillText(card.title,256,386,390);
        return canvas;
    }
    if(boardStyle==='attached-sign'){
        ctx.shadowColor='rgba(3,15,12,.85)';ctx.shadowBlur=0;ctx.shadowOffsetY=1;
        if(card.directional){
            const left=card.boardSide==='left',title=String(card.title || '').replace(/^[←→]\s*|\s*[←→]$/g,'');
            ctx.fillStyle='#f0cb7c';ctx.font=`750 108px ${face}`;ctx.textAlign=left?'left':'right';ctx.fillText(left?'←':'→',left?36:988,128,130);
            ctx.textAlign='center';ctx.font=`750 72px ${face}`;ctx.fillText(title,512,128,700);
        }else {ctx.fillStyle='#fffdf2';ctx.font=`750 ${String(card.title||'').length>26?62:76}px ${face}`;ctx.fillText(card.title,512,128,900);}
        return canvas;
    }
    if(boardStyle==='header-compact'){
        ctx.shadowBlur=2;ctx.shadowOffsetY=1;ctx.fillStyle='#f5faf7';ctx.font=`550 ${String(card.title || '').length>20?112:138}px ${face}`;wrapped(ctx,card.title,512,220,900,145,2);
        return canvas;
    }
    if(boardStyle==='header-detail'){
        ctx.fillStyle='#d7e0d3';ctx.font=`650 30px ${face}`;ctx.fillText(String(card.eyebrow || 'WELCOME').toUpperCase(),512,35,890);
        ctx.fillStyle='#f7f3e7';ctx.font=`600 62px ${face}`;wrapped(ctx,card.title,512,98,890,64,2);
        ctx.fillStyle='#e9eee4';ctx.font=`500 40px ${face}`;wrapped(ctx,card.body,512,218,880,44,6);
        return canvas;
    }
    if(boardStyle==='header' || boardStyle==='header-detail'){
        ctx.fillStyle='rgba(232,240,240,.88)';ctx.font=`750 38px ${face}`;ctx.fillText(String(card.eyebrow || 'ZONE').toUpperCase(),512,92,850);
        ctx.fillStyle='#f7f5eb';ctx.font=`650 76px ${face}`;wrapped(ctx,card.title,512,174,890,80,2);
        ctx.fillStyle='rgba(235,241,240,.86)';ctx.font=`550 42px ${face}`;
        wrapped(ctx,boardStyle==='header-detail' ? card.body : card.summary,512,365,880,50,2);
        return canvas;
    }
    ctx.textAlign='left';ctx.fillStyle='rgba(232,240,235,.88)';ctx.font=`750 38px ${face}`;ctx.fillText(card.eyebrow,54,66,916);
    ctx.fillStyle='#fbfaf1';ctx.font=`650 66px ${face}`;wrapped(ctx,card.title,54,142,916,72,2);
    ctx.font=`500 45px ${face}`;ctx.fillStyle='#e4ebe5';wrapped(ctx,detail ? card.body : card.summary,54,276,916,54,detail ? 4 : 2);
    return canvas;
}

export function createSpatialTotemCards(gl, options = {}) {
    const vs=shader(gl,gl.VERTEX_SHADER,'attribute vec2 p;uniform mat4 projection;uniform mat4 view;uniform vec3 center;uniform vec3 right;uniform vec3 up;uniform vec2 size;varying vec2 uv;void main(){uv=vec2(p.x+.5,.5-p.y);vec3 world=center+right*p.x*size.x+up*p.y*size.y;gl_Position=projection*view*vec4(world,1.0);}');
    const fs=shader(gl,gl.FRAGMENT_SHADER,'precision highp float;uniform sampler2D artwork;uniform float opacity;uniform float feedback,isControl,pressProgress;uniform vec3 feedbackColor;varying vec2 uv;void main(){vec4 c=texture2D(artwork,uv);float edge=1.0-smoothstep(.015,.06,min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y)));float accent=feedback*edge*.42*(1.0-isControl);float a=max(c.a,accent);if(a<.01)discard;vec3 ink=c.a>.01?c.rgb:feedbackColor;ink=mix(ink,feedbackColor,feedback*isControl*.38);ink=mix(ink,feedbackColor,step(1.0-pressProgress,uv.y)*step(.001,pressProgress)*.22);gl_FragColor=vec4(ink,a*opacity);}');
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),gl.STATIC_DRAW);
    const locations=Object.fromEntries(['projection','view','center','right','up','size','artwork','opacity','feedback','feedbackColor','isControl','pressProgress'].map(name=>[name,gl.getUniformLocation(program,name)]));
    const p=gl.getAttribLocation(program,'p'),textures=new Map(),used=new Set();
    const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
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
            const layout=options.surfaces ? options.surfaces(position,right,cards,selectedId) : totemLayoutForRecord(record,position,cards,selectedId,rotationY);
            const aimed=(options.hitSurface || hitTotemSurface)(options.ray?.(),layout);
            const now=performance.now(),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
            gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
            gl.uniformMatrix4fv(locations.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(locations.view,false,m);
            gl.uniform3fv(locations.feedbackColor,SPATIAL_OBJECT_VISUALS.totem.aimTint);
            gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.depthMask(false);
            for(const surface of layout) {
                const key=String(record.marker?.id || record.id)+':'+surface.card.id+':'+surface.detail;
                const content=spatialCardTextureContent(surface.card),cached=textures.get(key);
                let entry=cached;
                if(!entry || entry.content!==content) {
                    const texture=entry?.texture || gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
                    const artwork=(options.canvas || cardCanvas)(surface.card,surface.detail);
                    if(entry?.width===artwork.width && entry?.height===artwork.height)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,artwork);
                    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,artwork);
                    const mipmapped=textureSupportsMipmaps(artwork);
                    if(mipmapped)gl.generateMipmap(gl.TEXTURE_2D);
                    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mipmapped?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
                    if(mipmapped && anisotropy){const maximum=gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT);gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,maximum));}
                    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
                    entry={texture,content,width:artwork.width,height:artwork.height,started:entry?.started ?? now,fadeDuration:entry?.fadeDuration ?? surface.card.fadeDuration ?? SPATIAL_OBJECT_VISUALS.totem.signTransitionMs};textures.set(key,entry);
                }
                used.add(key);surfaces.push({...surface,record});
                gl.uniform3f(locations.center,surface.center.x,surface.center.y,surface.center.z);gl.uniform3f(locations.right,surface.right.x,surface.right.y || 0,surface.right.z);
                const up=surface.up || {x:0,y:1,z:0};gl.uniform3f(locations.up,up.x,up.y,up.z);
                gl.uniform2f(locations.size,surface.width,surface.height);
                const fadeOpacity = Number.isFinite(surface.opacity) ? surface.opacity : 1;
                const arrival=record?.demoArriveAt ? Math.min(1,Math.max(0,(now-record.demoArriveAt)/900)) : 1;
                gl.uniform1f(locations.opacity,(reduced || entry.fadeDuration<=0 ? 1 : Math.min(1,(now-entry.started)/entry.fadeDuration))*fadeOpacity*arrival);
                gl.uniform1f(locations.isControl,surface.card.control || options.containedFeedback?1:0);
                gl.uniform1f(locations.pressProgress,Math.max(0,Math.min(1,surface.pressProgress || 0)));
                gl.uniform1f(locations.feedback,surface.card.freeText?0:selectedId===surface.card.id ? 1 : (aimed?.card?.id===surface.card.id || record.handHoverCardId===surface.card.id ? .55 : 0));
                gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.uniform1i(locations.artwork,0);gl.drawArrays(gl.TRIANGLES,0,6);
            }
            gl.depthMask(true);
        },
        end(){for(const [key,entry] of textures)if(!used.has(key)){gl.deleteTexture(entry.texture);textures.delete(key);}},
        hit(ray){return hitTotemSurface(ray,surfaces);},
        hitPoint(point,options){return hitTotemPoint(point,surfaces,options);},
        destroy(){for(const entry of textures.values())gl.deleteTexture(entry.texture);textures.clear();gl.deleteBuffer(buffer);gl.deleteProgram(program);surfaces=[];}
    };
}
import {translateNxrText,localizedCanvasContext,currentNxrLanguage} from './i18n.js';
