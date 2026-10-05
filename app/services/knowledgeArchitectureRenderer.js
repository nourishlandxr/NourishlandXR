import * as THREE from '../vendor/three.module.min.js';
import {createKnowledgeArchitectureGeometry,architectureRegionAmount,KNOWLEDGE_CONTEXT_REGION} from './knowledgeArchitectureGeometry.js';
import {getSpatialVisualSettings} from './spatialVisualSettings.js';

const motionPreference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
function architectureAtlas(object){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2048;
    const ctx=canvas.getContext('2d');
    for(let slot=0;slot<32;slot++){
        const face=slot===KNOWLEDGE_CONTEXT_REGION ? object.contextFace : object.faces?.[slot];
        const domain=slot<6 ? object.regions?.[slot] : object.regions?.[Math.floor((slot-6)/3)];
        const accent=new THREE.Color(face?.accent || domain?.accent || '#b7cbbb');
        const base=slot===KNOWLEDGE_CONTEXT_REGION ? new THREE.Color('#d8deca') : accent.clone().lerp(new THREE.Color('#a3b9ad'),.6);
        const x=slot%4*256,y=Math.floor(slot/4)*256;ctx.save();ctx.translate(x,y);
        ctx.fillStyle='#'+base.getHexString();ctx.globalAlpha=slot===KNOWLEDGE_CONTEXT_REGION?.72:domain?.opened?.32:.15;ctx.fillRect(0,0,256,256);ctx.globalAlpha=1;
        const visible=slot===KNOWLEDGE_CONTEXT_REGION || (slot<6 ? Boolean(face) : domain?.opened && Boolean(face));
        if(visible){
            if(domain?.opened && slot!==KNOWLEDGE_CONTEXT_REGION){
                ctx.strokeStyle=face?.selected?'#edf1bf':'#'+accent.getHexString();ctx.lineWidth=face?.selected?7:2;ctx.strokeRect(12,12,232,232);
            }
            const tip=slot<6 && domain?.opened,fontSize=slot===KNOWLEDGE_CONTEXT_REGION?40:tip?24:slot<6?32:34,lineHeight=tip?28:40,textWidth=tip?148:210;
            ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${fontSize}px Manrope,system-ui`;
            const lines=[];let line='';
            for(const word of String(face?.title || '').split(/\s+/)){
                const next=line?line+' '+word:word;
                if(ctx.measureText(next).width>textWidth && line){lines.push(line);line=word;}else line=next;
            }
            if(line)lines.push(line);
            ctx.fillStyle='#f5f9ea';ctx.shadowColor='#163b2c';ctx.shadowBlur=4;ctx.shadowOffsetY=1;
            lines.slice(0,3).forEach((text,i)=>ctx.fillText(text+(i===2 && lines.length>3?'…':''),128,128+(i-(Math.min(lines.length,3)-1)/2)*lineHeight,textWidth));
            ctx.shadowBlur=0;ctx.shadowOffsetY=0;
            if(slot<6 && domain?.level>1){ctx.font='600 16px Manrope,system-ui';ctx.fillText(domain.level>=3?'Hub':'Developed',128,175,128);}
        }
        ctx.restore();
    }
    return canvas;
}

export function createKnowledgeArchitectureRenderer(gl){
    const caches=new Map(),buffers=[];
    function compile(type,source){
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(error);}return shader;
    }
    const vertex=compile(gl.VERTEX_SHADER,`attribute vec3 position,normal;attribute vec2 uv;attribute float region;
        uniform mat4 mvp,model;varying vec3 n;varying vec2 t;varying float regionId;
        void main(){n=normalize(mat3(model)*normal);t=uv;regionId=region;gl_Position=mvp*vec4(position,1.);}`);
    const fragment=compile(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 n;varying vec2 t;varying float regionId;
        uniform sampler2D atlas;uniform float opacity,lineMode,cellOpacity,pressRegion,pressProgress;
        void main(){vec4 art=texture2D(atlas,t);float light=.74+.26*max(0.,dot(normalize(n),normalize(vec3(-.3,.7,1.))));
        vec3 colour=mix(art.rgb*light,vec3(.30,.39,.36),lineMode);
        float alpha=art.a>.8?1.:art.a*cellOpacity;alpha=mix(alpha,.85,lineMode);
        if(lineMode<.5 && abs(regionId-pressRegion)<.1){colour=mix(colour,vec3(.83,.91,.68),pressProgress*.38);alpha=max(alpha,pressProgress*.48);}
        gl_FragColor=vec4(colour,alpha*opacity);}`);
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw Error(error);}
    const attributes=Object.fromEntries(['position','normal','uv','region'].map(name=>[name,gl.getAttribLocation(program,name)]));
    const uniforms=Object.fromEntries(['mvp','model','atlas','opacity','lineMode','cellOpacity','pressRegion','pressProgress'].map(name=>[name,gl.getUniformLocation(program,name)]));
    function buffer(){const value=gl.createBuffer();buffers.push(value);return value;}
    function upload(target,data){gl.bindBuffer(gl.ARRAY_BUFFER,target);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);}
    function attribute(name,target,size){gl.bindBuffer(gl.ARRAY_BUFFER,target);gl.enableVertexAttribArray(attributes[name]);gl.vertexAttribPointer(attributes[name],size,gl.FLOAT,false,0,0);}
    function prepare(object,time){
        let cache=caches.get(object);
        if(!cache){cache={position:buffer(),normal:buffer(),uv:buffer(),region:buffer(),edges:buffer(),texture:gl.createTexture()};caches.set(object,cache);}
        // The architecture is a low-poly learning object. Rebuilding and
        // re-uploading its buffers for every transition tick caused a large
        // third-stage frame-time spike on Quest. Four visible growth steps
        // keep the opening legible while limiting GPU/GC work to a handful of
        // uploads per interaction.
        const growthSteps=(object.regions || []).map(region=>Math.round(architectureRegionAmount(region,time,motionPreference?.matches)*4)/4);
        const key=JSON.stringify([object.seedRadius || .16,growthSteps]);
        if(key!==cache.geometryKey){
            cache.geometry?.dispose();
            cache.geometry=createKnowledgeArchitectureGeometry(object.seedRadius || .16,object.regions,time,motionPreference?.matches);
            const edges=new THREE.EdgesGeometry(cache.geometry,2);
            upload(cache.position,cache.geometry.attributes.position.array);upload(cache.normal,cache.geometry.attributes.normal.array);upload(cache.uv,cache.geometry.attributes.uv.array);upload(cache.region,cache.geometry.attributes.region.array);upload(cache.edges,edges.attributes.position.array);
            cache.edgeCount=edges.attributes.position.count;edges.dispose();cache.geometryKey=key;
        }
        const artworkKey=JSON.stringify([object.faces?.map(face=>face?[face.title,face.accent,face.selected]:null),object.contextFace?.title,(object.regions || []).map(region=>[region.opened,region.level,region.accent])]);
        if(artworkKey!==cache.artworkKey){
            const active=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0);const prior=gl.getParameter(gl.TEXTURE_BINDING_2D);
            gl.bindTexture(gl.TEXTURE_2D,cache.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,architectureAtlas(object));
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D,prior);gl.activeTexture(active);cache.artworkKey=artworkKey;
        }
        return cache;
    }
    return {
        draw(view,model,object,opacity=1,time=performance.now()){
            const cache=prepare(object,time),geometry=cache.geometry;
            const depth=gl.isEnabled(gl.DEPTH_TEST),cull=gl.isEnabled(gl.CULL_FACE),blend=gl.isEnabled(gl.BLEND),mask=gl.getParameter(gl.DEPTH_WRITEMASK),active=gl.getParameter(gl.ACTIVE_TEXTURE);
            gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.useProgram(program);
            gl.activeTexture(gl.TEXTURE0);const prior=gl.getParameter(gl.TEXTURE_BINDING_2D);gl.bindTexture(gl.TEXTURE_2D,cache.texture);
            const mvp=new THREE.Matrix4().fromArray(view.projectionMatrix).multiply(new THREE.Matrix4().fromArray(view.transform.inverse.matrix)).multiply(model);
            gl.uniformMatrix4fv(uniforms.model,false,model.elements);gl.uniformMatrix4fv(uniforms.mvp,false,mvp.elements);gl.uniform1i(uniforms.atlas,0);gl.uniform1f(uniforms.opacity,opacity);
            gl.uniform1f(uniforms.cellOpacity,Math.max(0,Math.min(1,Number(getSpatialVisualSettings().cellOpacity) || 0)));gl.uniform1f(uniforms.lineMode,0);
            gl.uniform1f(uniforms.pressRegion,object.pressFaceIndex ?? -1);gl.uniform1f(uniforms.pressProgress,object.pressProgress || 0);
            attribute('position',cache.position,3);attribute('normal',cache.normal,3);attribute('uv',cache.uv,2);attribute('region',cache.region,1);gl.drawArrays(gl.TRIANGLES,0,geometry.attributes.position.count);
            attribute('position',cache.edges,3);gl.disableVertexAttribArray(attributes.normal);gl.vertexAttrib3f(attributes.normal,0,0,1);gl.disableVertexAttribArray(attributes.uv);gl.vertexAttrib2f(attributes.uv,0,0);gl.disableVertexAttribArray(attributes.region);gl.vertexAttrib1f(attributes.region,-1);gl.uniform1f(uniforms.lineMode,1);gl.drawArrays(gl.LINES,0,cache.edgeCount);
            gl.bindTexture(gl.TEXTURE_2D,prior);gl.activeTexture(active);gl.depthMask(mask);if(!depth)gl.disable(gl.DEPTH_TEST);if(!cull)gl.disable(gl.CULL_FACE);if(!blend)gl.disable(gl.BLEND);
            return geometry;
        },
        destroy(){for(const cache of caches.values()){cache.geometry?.dispose();gl.deleteTexture(cache.texture);}caches.clear();buffers.forEach(value=>gl.deleteBuffer(value));gl.deleteProgram(program);}
    };
}
