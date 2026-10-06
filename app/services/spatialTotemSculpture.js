import {GRAPHICS_PRESETS,currentGraphicsQuality} from './spatialVisualSettings.js';
import { SPATIAL_OBJECT_VISUALS } from './spatialObjectVisuals.js';
const VERTEX_ATTRIBUTES=Object.freeze([['position',0,3],['normal',12,3],['uv',24,2]]);

// One reusable mesh and one small, mipmapped material per WebGL context.
// Shape is part of the mesh, so it remains sculptural without extra effects.
export function totemSculpturePoint(t, angle, style='carved') {
    const form=SPATIAL_OBJECT_VISUALS.totem[style] || SPATIAL_OBJECT_VISUALS.totem.carved;
    const twist = form.twist * Math.sin(t * Math.PI - .6);
    const a = angle + twist;
    const waist = .73 + form.waist * Math.cos(t * Math.PI * 3.2 + .2);
    const root = .10 * Math.exp(-t * 18);
    const flutes = 1 + form.flutes * Math.cos(angle * 3 + t * 1.8);
    const radius = (waist + root) * flutes;
    return [.035 * Math.sin(t * Math.PI * 2) + Math.cos(a) * radius,
        t * 2 - 1, Math.sin(a) * radius];
}

export function createTotemSculptureGeometry(radial = 48, vertical = 32, style='carved') {
    const vertices = [], indices = [];
    for (let row = 0; row <= vertical; row++) {
        const t = row / vertical;
        for (let column = 0; column <= radial; column++) {
            const a = column / radial * Math.PI * 2;
            const p = totemSculpturePoint(t, a, style);
            const dt1 = totemSculpturePoint(Math.min(1, t + .001), a, style);
            const dt0 = totemSculpturePoint(Math.max(0, t - .001), a, style);
            const da1 = totemSculpturePoint(t, a + .001, style);
            const da0 = totemSculpturePoint(t, a - .001, style);
            const u = dt1.map((v,i) => v - dt0[i]), v = da1.map((n,i) => n - da0[i]);
            const normal = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
            const length = Math.hypot(...normal);
            vertices.push(...p, ...normal.map(n => n / length), column / radial, t);
            if (row < vertical && column < radial) {
                const index = row * (radial + 1) + column;
                indices.push(index,index+radial+1,index+1,index+1,index+radial+1,index+radial+2);
            }
        }
    }
    for (const t of [0,1]) {
        const center = vertices.length / 8;
        vertices.push(0,t*2-1,0,0,t ? 1 : -1,0,.5,t);
        for (let i=0;i<radial;i++) {
            const edge=vertices.length / 8;
            for (const a of [i,(i+1)]) vertices.push(...totemSculpturePoint(t,a/radial*Math.PI*2,style),0,t ? 1 : -1,0,a/radial,t);
            indices.push(...(t ? [center,edge+1,edge] : [center,edge,edge+1]));
        }
    }
    return { vertices:new Float32Array(vertices), indices:new Uint16Array(indices) };
}

function materialCanvas(scale=1) {
    const canvas=document.createElement('canvas');canvas.width=512*scale;canvas.height=1024*scale;
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
    ctx.fillStyle='#a68b6a';ctx.fillRect(0,0,512,1024);
    // Deterministic, seamless growth lines; no noisy pixel stippling.
    for(let i=-6;i<134;i++) {
        const phase=i*2.399, x=i*4;
        ctx.beginPath();
        for(let y=0;y<=1024;y+=8) {
            const px=x+Math.sin(y*.005+phase)*3.2+Math.sin(y*.018+phase*.3)*.8;
            if(y===0)ctx.moveTo(px,y);else ctx.lineTo(px,y);
        }
        ctx.strokeStyle=i%7===0?'rgba(50,28,14,.18)':'rgba(59,34,20,.08)';
        ctx.lineWidth=i%7===0?1.8:.75;ctx.stroke();
    }
    if(scale>1){
        // Fine secondary grain is below the broad timber lines, never a noisy overlay.
        ctx.strokeStyle='rgba(42,29,18,.055)';ctx.lineWidth=.28;
        for(let i=0;i<256;i++){
            const x=i*2+1,phase=i*2.399;ctx.beginPath();
            for(let y=0;y<=1024;y+=6){const px=x+Math.sin(y*.007+phase)*1.5;if(y===0)ctx.moveTo(px,y);else ctx.lineTo(px,y);}ctx.stroke();
        }
    }
    // Front-facing botanical inlay: fern/leaf marks, contained below the boards.
    const x=102,y=550;
    ctx.save();ctx.translate(x,y);ctx.rotate(-.10);
    const stem=new Path2D('M0 125 C-6 48 14 -20 2 -130');
    ctx.shadowColor='rgba(33,20,10,.6)';ctx.shadowBlur=2;ctx.shadowOffsetY=2;
    ctx.strokeStyle='#786040';ctx.lineWidth=3;ctx.stroke(stem);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#c7aa72';ctx.lineWidth=1.5;ctx.stroke(stem);
    for(let i=0;i<7;i++)for(const side of [-1,1]) {
        const ly=78-i*28, reach=(26-i*2)*side;
        ctx.beginPath();ctx.moveTo(1,ly);ctx.bezierCurveTo(reach*.5,ly-2,reach,ly-20,reach,ly-33);
        ctx.bezierCurveTo(reach*.25,ly-25,0,ly-15,1,ly);
        ctx.fillStyle=i%2?'#ad8b55':'#c1a16a';ctx.fill();
        ctx.strokeStyle='#6d5438';ctx.lineWidth=.8;ctx.stroke();
    }
    ctx.restore();return canvas;
}

function shader(gl,type,source) {
    const value=gl.createShader(type);gl.shaderSource(value,source);gl.compileShader(value);
    if(!gl.getShaderParameter(value,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(value);gl.deleteShader(value);throw new Error(error);}
    return value;
}

export function createSpatialTotemSculpture(gl) {
    const vertex=shader(gl,gl.VERTEX_SHADER,`
        attribute vec3 position;attribute vec3 normal;attribute vec2 uv;
        uniform mat4 projection,modelView;uniform vec3 inverseScale;
        varying vec3 n,eye;varying vec2 tex;
        void main(){vec4 p=modelView*vec4(position,1.);n=normalize((modelView*vec4(normal*inverseScale*inverseScale,0.)).xyz);eye=normalize(-p.xyz);tex=uv;gl_Position=projection*p;}
    `);
    const fragment=shader(gl,gl.FRAGMENT_SHADER,`
        precision mediump float;varying vec3 n,eye;varying vec2 tex;
        uniform sampler2D timber;uniform vec3 tint,notificationColour;uniform float alpha,aim,twist,controlOpacity,signsActive,fadeActive,form,notificationStrength;uniform vec2 dimensions,controls;
        void main(){
            vec3 normal=normalize(n),light=normalize(vec3(-.55,.7,.65)),viewer=normalize(eye);
            vec3 wood=texture2D(timber,tex).rgb;
            float collar=smoothstep(.79,.815,tex.y);
            float foot=1.-smoothstep(.025,.07,tex.y);
            vec3 base=wood*mix(vec3(.69,.51,.35),tint,.36);
            base=mix(base,vec3(.13,.16,.13),foot*.62);
            base=mix(base,vec3(.92,.96,.9),collar*.88);
            // Flush incisions are part of the timber material, never floating meshes.
            float front=.25-twist*sin(tex.y*3.14159265-.6)/6.2831853;
            float du=mod(tex.x-front+.5,1.)-.5;
            vec2 q0=vec2(du*6.2831853*dimensions.x,(tex.y-controls.x)*dimensions.y);
            vec2 q1=vec2(du*6.2831853*dimensions.x,(tex.y-controls.y)*dimensions.y);
            float d0=length(q0),d1=length(q1),d=min(d0,d1);
            float recess=1.-smoothstep(.025,.030,d);
            float edge=smoothstep(.025,.027,d)*(1.-smoothstep(.030,.033,d));
            float active=d0<d1?signsActive:fadeActive;
            base=mix(base,base*.53,recess*.8);
            base=mix(base,vec3(.53,.39,.20)+vec3(.13,.11,.06)*active,edge*.82);
            base=mix(base,base*vec3(.74,.82,.76),form*.5);
            float diffuse=max(dot(normal,light),0.);
            float spec=pow(max(dot(normal,normalize(light+viewer)),0.),36.);
            vec3 shaded=base*(.64+.40*diffuse);
            shaded+=vec3(.92,.81,.58)*spec*(.055+collar*.13);
            shaded+=vec3(.60,.68,.48)*pow(1.-max(dot(normal,viewer),0.),3.)*.045;
            shaded=mix(shaded,shaded+vec3(.09,.065,.025),aim);
            float glassGrain=.5+.5*sin(tex.x*90.+sin(tex.y*110.)*.65);
            vec3 glass=notificationColour*(.72+.18*glassGrain)+vec3(.74,.93,.88)*spec*.9+vec3(.24,.37,.33)*pow(1.-max(dot(normal,viewer),0.),3.);
            shaded=mix(shaded,glass+notificationColour*notificationStrength*1.5,collar);
            gl_FragColor=vec4(shaded,max(alpha,(1.-smoothstep(.031,.034,d))*controlOpacity*.90));
        }
    `);
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw new Error(error);}
    const meshes={};
    for(const [quality,budget] of Object.entries(GRAPHICS_PRESETS))for(const style of ['carved','botanical']){
        const geometry=createTotemSculptureGeometry(budget.totemRadial,budget.totemVertical,style),buffer=gl.createBuffer(),indexBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,geometry.vertices,gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geometry.indices,gl.STATIC_DRAW);
        meshes[style+':'+quality]={buffer,indexBuffer,count:geometry.indices.length};
    }
    // Material atlases are uploaded once on first use of each tier.
    const textures={};
    const attributes=Object.fromEntries(['position','normal','uv'].map(key=>[key,gl.getAttribLocation(program,key)]));
    const uniforms=Object.fromEntries(['projection','modelView','inverseScale','timber','tint','alpha','aim','twist','controlOpacity','signsActive','fadeActive','form','dimensions','controls','notificationColour','notificationStrength'].map(key=>[key,gl.getUniformLocation(program,key)]));
    return {program,meshes,textures,attributes,uniforms,model:new Float32Array(16),modelView:new Float32Array(16),inverseScale:new Float32Array(3)};
}

export function drawTotemSculpture(gl,renderer,view,position,options={}) {
    if(!renderer || !view?.transform?.inverse?.matrix)return;
    const model=renderer.model,inverse=view.transform.inverse.matrix,out=renderer.modelView;
    const width=options.halfWidth || .095,height=options.halfHeight || .56,depth=options.halfDepth || .075;
    const rotation=options.rotationY ?? 0,c=Math.cos(rotation),s=Math.sin(rotation);
    model.fill(0);model[0]=c*width;model[2]=-s*width;model[5]=height;
    model[8]=s*depth;model[10]=c*depth;model[12]=position.x;model[13]=position.y+height;model[14]=position.z;model[15]=1;
    renderer.inverseScale[0]=1/width;renderer.inverseScale[1]=1/height;renderer.inverseScale[2]=1/depth;
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)out[c*4+r]=inverse[r]*model[c*4]+inverse[4+r]*model[c*4+1]+inverse[8+r]*model[c*4+2]+inverse[12+r]*model[c*4+3];
    const alpha=options.alpha ?? 1,style=options.style || 'carved',mesh=renderer.meshes[style+':'+currentGraphicsQuality()] || renderer.meshes['carved:medium'],visual=SPATIAL_OBJECT_VISUALS.totem;
    const signsY=Math.min(visual.controlHeights[0],height*1.50),fadeY=Math.min(visual.controlHeights[1],height*1.26);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(alpha>=.95);
    gl.useProgram(renderer.program);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indexBuffer);
    for(const [key,offset,size] of VERTEX_ATTRIBUTES){gl.enableVertexAttribArray(renderer.attributes[key]);gl.vertexAttribPointer(renderer.attributes[key],size,gl.FLOAT,false,32,offset);}
    const u=renderer.uniforms;gl.uniformMatrix4fv(u.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(u.modelView,false,out);
    gl.uniform3fv(u.notificationColour,options.notification?.colour || [1,1,1]);gl.uniform1f(u.notificationStrength,options.notification?.strength || 0);
    gl.uniform3fv(u.inverseScale,renderer.inverseScale);
    gl.activeTexture(gl.TEXTURE0);
    const quality=currentGraphicsQuality();
    if(!renderer.textures[quality]){
        const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,materialCanvas(GRAPHICS_PRESETS[quality].textureScale));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);
        const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
        if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(quality==='high'?8:2,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        renderer.textures[quality]=texture;
    }
    gl.bindTexture(gl.TEXTURE_2D,renderer.textures[quality]);gl.uniform1i(u.timber,0);
    gl.uniform3fv(u.tint,options.color || SPATIAL_OBJECT_VISUALS.totem.sculptureTint);gl.uniform1f(u.alpha,alpha);gl.uniform1f(u.aim,options.highlighted?1:0);
    gl.uniform1f(u.twist,(visual[style] || visual.carved).twist);gl.uniform2f(u.dimensions,width,height*2);gl.uniform2f(u.controls,signsY/(height*2),fadeY/(height*2));
    gl.uniform1f(u.signsActive,options.signsVisible?1:0);gl.uniform1f(u.fadeActive,options.faded?1:0);gl.uniform1f(u.controlOpacity,options.controlOpacity ?? 1);gl.uniform1f(u.form,style==='botanical'?1:0);
    gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);gl.depthMask(true);gl.disable(gl.CULL_FACE);
}

export function destroySpatialTotemSculpture(gl,renderer) {
    if(!gl || !renderer)return;
    for(const mesh of Object.values(renderer.meshes)){gl.deleteBuffer(mesh.buffer);gl.deleteBuffer(mesh.indexBuffer);}for(const texture of Object.values(renderer.textures))gl.deleteTexture(texture);gl.deleteProgram(renderer.program);
}
