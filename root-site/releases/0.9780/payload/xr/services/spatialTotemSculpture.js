import {craftedTotemPoint,craftedCrownPoint} from './craftedTotemGeometry.js';
import {GRAPHICS_PRESETS,currentGraphicsQuality} from './spatialVisualSettings.js';
import { SPATIAL_OBJECT_VISUALS } from './spatialObjectVisuals.js';
import {SECONDARY_TOTEM_IDS,createSecondaryTotemGeometry} from './secondaryTotemGeometry.js';
import {createCraftedTimberCanvas,createCraftedStoneCanvas} from './craftedSurfaceTextures.js';
import {appendCraftedTotemDetails} from './craftedTotemDetails.js';
const VERTEX_ATTRIBUTES=Object.freeze([['position',0,3],['normal',12,3],['uv',24,2]]);
const ceramicCrownPoint=craftedCrownPoint;

// One reusable mesh and one small, mipmapped material per WebGL context.
// Shape is part of the mesh, so it remains sculptural without extra effects.
export function totemSculpturePoint(t, angle, style='carved') {
    if(style==='organic'){
        const radius=.62+.19*Math.exp(-t*24)+.025*Math.cos(t*Math.PI*2);
        return [Math.cos(angle)*radius,t*2-1,Math.min(Math.sin(angle)*radius,radius*.91)];
    }
    return craftedTotemPoint(t,angle,style);
}

// Immutable source meshes are shared by the native renderer, sign-surface
// queries and the website adapter. Reopening a model does not recarve it.
const geometryCache=new Map();
export function createTotemSculptureGeometry(radial=48,vertical=32,style='carved'){
    const key=style+':'+radial+':'+vertical;
    if(geometryCache.has(key))return geometryCache.get(key);
    const mesh=buildTotemSculptureGeometry(radial,vertical,style);
    if(geometryCache.size>=24)geometryCache.delete(geometryCache.keys().next().value);
    geometryCache.set(key,mesh);return mesh;
}
function buildTotemSculptureGeometry(radial = 48, vertical = 32, style='carved') {
    if(SECONDARY_TOTEM_IDS.includes(style))return appendCraftedTotemDetails(createSecondaryTotemGeometry(style,Math.min(48,radial)),style,radial);
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
    if(style==='basic' || style==='organic' || style==='botanical' || style==='carved'){
        // Crown is part of the cached mesh: no additional draw calls or textures.
        const rows=style==='organic'?16:Math.max(16,Math.floor(vertical*.75)),start=vertices.length/8;
        for(let row=0;row<=rows;row++)for(let column=0;column<=radial;column++){
            const a=column/radial*Math.PI*2,b=row/rows*Math.PI*2;
            let p,n;
            if(style==='organic'){
                const tube=Math.cos(b)*.31;
                p=[Math.cos(a)*(1.85+tube),1.29+Math.sin(a)*(.29+tube*.155),-Math.sin(b)*.38];
                n=[Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b)/.155,-Math.sin(b)/1.22];
            }else{
                // Turned, fluted ceramic crown with a closed, softly rolled lip.
                // The inner return closes the profile without additional meshes.
                const t=row/rows;p=ceramicCrownPoint(t,a,style);
                const lo=ceramicCrownPoint(Math.max(0,t-.0001),a,style),hi=ceramicCrownPoint(Math.min(1,t+.0001),a,style),next=ceramicCrownPoint(t,a+.0001,style);
                const u=hi.map((v,i)=>v-lo[i]),v=next.map((value,i)=>value-p[i]);
                n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
            }
            const length=Math.hypot(...n);vertices.push(...p,...n.map(value=>value/length),column/radial,1.1+row/rows*.8);
            if(row<rows && column<radial){const i=start+row*(radial+1)+column;indices.push(i,i+radial+1,i+1,i+1,i+radial+1,i+radial+2);}
        }
    }
    return appendCraftedTotemDetails({vertices:new Float32Array(vertices),indices:new Uint16Array(indices)},style,radial);
}

export function createTotemMaterialCanvas(scale=1,style='carved') {
    if(style==='rock')return createCraftedStoneCanvas({width:512*scale,height:1024*scale});
    const canvas=document.createElement('canvas');canvas.width=512*scale;canvas.height=1024*scale;
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
    ctx.drawImage(createCraftedTimberCanvas({width:512*scale,height:1024*scale}),0,0,512,1024);
    // Deterministic, seamless growth lines; no noisy pixel stippling.
    for(let i=-6;i<134;i++) {
        const phase=i*2.399, x=i*4;
        ctx.beginPath();
        for(let y=0;y<=1024;y+=8) {
            const px=x+Math.sin(y*.005+phase)*3.2+Math.sin(y*.018+phase*.3)*.8;
            if(y===0)ctx.moveTo(px,y);else ctx.lineTo(px,y);
        }
        ctx.strokeStyle=i%7===0?'rgba(50,28,14,.055)':'rgba(59,34,20,.025)';
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
    // Small growth knots and hairline pores enrich close views without stippling.
    ctx.strokeStyle='rgba(62,40,23,.11)';ctx.lineWidth=.7;
    for(const [kx,ky] of [[284,240],[414,738],[38,865]])for(let ring=0;ring<5;ring++){
        ctx.beginPath();ctx.ellipse(kx,ky,3+ring*2,13+ring*6,.06,0,Math.PI*2);ctx.stroke();
    }
    // Front-facing botanical inlay: fern/leaf marks, contained below the boards.
    if(style==='basic'){return canvas;}
    const x=128,y=530;
    ctx.save();ctx.translate(x,y);ctx.rotate(-.10);
    const stem=new Path2D('M0 125 C-6 48 14 -20 2 -130');
    ctx.shadowColor='rgba(33,20,10,.6)';ctx.shadowBlur=2;ctx.shadowOffsetY=2;
    ctx.strokeStyle='#786040';ctx.lineWidth=3;ctx.stroke(stem);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#c7aa72';ctx.lineWidth=1.5;ctx.stroke(stem);
    for(let i=0;i<(style==='botanical'?9:7);i++)for(const side of [-1,1]) {
        const ly=78-i*(style==='botanical'?23:28), reach=(style==='botanical'?20-i:34-i*2)*side;
        ctx.beginPath();ctx.moveTo(1,ly);ctx.bezierCurveTo(reach*.5,ly-2,reach,ly-20,reach,ly-33);
        ctx.bezierCurveTo(reach*.25,ly-25,0,ly-15,1,ly);
    ctx.fillStyle=i%2?'#ad8b55':'#c1a16a';ctx.fill();
        ctx.strokeStyle='#6d5438';ctx.lineWidth=.8;ctx.stroke();
        ctx.beginPath();ctx.moveTo(1,ly);ctx.lineTo(reach*.72,ly-24);ctx.strokeStyle='rgba(237,211,155,.48)';ctx.lineWidth=.6;ctx.stroke();
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
            if(tex.y>2.0){
                float diffuse=max(dot(normal,light),0.);
                float spec=pow(max(dot(normal,normalize(light+viewer)),0.),30.);
                vec3 detail=tex.y<3.?vec3(.64,.43,.19):tex.y<4.?vec3(.22,.13,.07):tex.y<5.?vec3(.61,.37,.16):tex.y<6.?vec3(.50,.60,.39):vec3(.88,.83,.68);
                float metal=tex.y<3.?1.:0.;
                vec3 colour=detail*(.48+.48*diffuse)+vec3(.95,.85,.62)*spec*(.09+metal*.34);
                colour+=vec3(.20,.24,.21)*pow(1.-max(dot(normal,viewer),0.),3.)*.12;
                gl_FragColor=vec4(colour,alpha);return;
            }
            if(tex.y>1.0){
                float diffuse=max(dot(normal,light),0.),facing=max(dot(normal,viewer),0.);
                float sheen=pow(max(dot(normal,normalize(light+viewer)),0.),12.);
                float ribs=pow(.5+.5*cos(tex.x*50.2655),16.);
                vec3 ceramic=form<.5?vec3(.68,.49,.32):form<1.5?vec3(.53,.66,.48):vec3(.67,.72,.51);
                vec3 frost=mix(notificationColour,ceramic,.88);
                vec3 glass=frost*(.64+.30*diffuse)+vec3(.94,.90,.78)*sheen*.045;
                glass+=frost*notificationStrength*(form>2.5?.65:.12);
                glass=mix(glass,glass*.94,ribs*.45);
                gl_FragColor=vec4(glass,alpha);return;
            }
            vec3 wood=texture2D(timber,tex).rgb;
            if(form>2.5 && form<3.5)wood=mix(wood,vec3(dot(wood,vec3(.3,.5,.2))),.12);
            float collar=smoothstep(.975,.985,tex.y);
            if(form>2.5)collar=0.;
            float foot=1.-smoothstep(.02,.065,tex.y);
            vec3 base=wood*mix(vec3(1.08,1.02,.95),tint*1.3,.15);
            base=mix(base,vec3(.20,.11,.055),foot*.38);
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
            base=mix(base,base*vec3(.74,.82,.76),form>.5 && form<1.5?.5:0.);
            float diffuse=max(dot(normal,light),0.);
            float spec=pow(max(dot(normal,normalize(light+viewer)),0.),48.);
            vec3 shaded=base*(.69+.34*diffuse);
            shaded+=vec3(.92,.81,.58)*spec*(.035+collar*.055);
            shaded+=vec3(.60,.68,.48)*pow(1.-max(dot(normal,viewer),0.),3.)*.045;
            shaded=mix(shaded,shaded+vec3(.09,.065,.025),aim);
            float glassGrain=.5+.5*sin(tex.x*90.+sin(tex.y*110.)*.65);
            float seam=(1.-smoothstep(.001,.004,abs(tex.y-.102)))+(1.-smoothstep(.001,.004,abs(tex.y-.127)));
            shaded=mix(shaded,vec3(.76,.53,.24)*(.74+.26*diffuse),min(1.,seam)*.8);
            vec3 glass=vec3(.62,.44,.22)*(.75+.24*diffuse)+vec3(.83,.74,.51)*spec*.10;
            if(form>1.5)glass=vec3(.55,.47,.31)*(.70+.24*diffuse)+vec3(.83,.74,.51)*spec*.10;
            shaded=mix(shaded,glass+notificationColour*notificationStrength*.16,collar);
            gl_FragColor=vec4(shaded,max(alpha,(1.-smoothstep(.031,.034,d))*controlOpacity*.90));
        }
    `);
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw new Error(error);}
    const meshes={};
    function getMesh(style,quality){
        const key=style+':'+quality;
        if(meshes[key])return meshes[key];
        const budget=GRAPHICS_PRESETS[quality];
        const geometry=createTotemSculptureGeometry(budget.totemRadial,budget.totemVertical,style),buffer=gl.createBuffer(),indexBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,geometry.vertices,gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geometry.indices,gl.STATIC_DRAW);
        return meshes[key]={buffer,indexBuffer,count:geometry.indices.length};
    }
    // Material atlases are uploaded once on first use of each tier.
    const textures={};
    const attributes=Object.fromEntries(['position','normal','uv'].map(key=>[key,gl.getAttribLocation(program,key)]));
    const uniforms=Object.fromEntries(['projection','modelView','inverseScale','timber','tint','alpha','aim','twist','controlOpacity','signsActive','fadeActive','form','dimensions','controls','notificationColour','notificationStrength'].map(key=>[key,gl.getUniformLocation(program,key)]));
    return {program,meshes,getMesh,textures,attributes,uniforms,model:new Float32Array(16),modelView:new Float32Array(16),inverseScale:new Float32Array(3)};
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
    const alpha=options.alpha ?? 1,style=options.style || 'carved',mesh=renderer.getMesh(style,currentGraphicsQuality()),visual=SPATIAL_OBJECT_VISUALS.totem;
    const signsY=Math.min(visual.controlHeights[0],height*1.50),fadeY=Math.min(visual.controlHeights[1],height*1.26);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);
    if(SECONDARY_TOTEM_IDS.includes(style))gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(alpha>=.95);
    gl.useProgram(renderer.program);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indexBuffer);
    for(const [key,offset,size] of VERTEX_ATTRIBUTES){gl.enableVertexAttribArray(renderer.attributes[key]);gl.vertexAttribPointer(renderer.attributes[key],size,gl.FLOAT,false,32,offset);}
    const u=renderer.uniforms;gl.uniformMatrix4fv(u.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(u.modelView,false,out);
    gl.uniform3fv(u.notificationColour,options.notification?.colour || [.58,.78,.65]);gl.uniform1f(u.notificationStrength,options.notification?.strength || 0);
    gl.uniform3fv(u.inverseScale,renderer.inverseScale);
    gl.activeTexture(gl.TEXTURE0);
    const quality=currentGraphicsQuality();
    const textureKey=quality+':'+(['basic','carved','botanical','rock'].includes(style)?style:'carved');
    if(!renderer.textures[textureKey]){
        const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,createTotemMaterialCanvas(GRAPHICS_PRESETS[quality].textureScale,style));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);
        const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
        if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(quality==='high'?8:2,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        renderer.textures[textureKey]=texture;
    }
    gl.bindTexture(gl.TEXTURE_2D,renderer.textures[textureKey]);gl.uniform1i(u.timber,0);
    gl.uniform3fv(u.tint,options.color || SPATIAL_OBJECT_VISUALS.totem.sculptureTint);gl.uniform1f(u.alpha,alpha);gl.uniform1f(u.aim,options.highlighted?1:0);
    gl.uniform1f(u.twist,(visual[style] || visual.carved).twist);gl.uniform2f(u.dimensions,width,height*2);gl.uniform2f(u.controls,signsY/(height*2),fadeY/(height*2));
    gl.uniform1f(u.signsActive,options.signsVisible?1:0);gl.uniform1f(u.fadeActive,options.faded?1:0);gl.uniform1f(u.controlOpacity,options.controlOpacity ?? 1);gl.uniform1f(u.form,style==='rock'?3:SECONDARY_TOTEM_IDS.includes(style)?4:style==='botanical'?1:['basic','organic'].includes(style)?2:0);
    gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);gl.depthMask(true);gl.disable(gl.CULL_FACE);
}

export function destroySpatialTotemSculpture(gl,renderer) {
    if(!gl || !renderer)return;
    for(const mesh of Object.values(renderer.meshes)){gl.deleteBuffer(mesh.buffer);gl.deleteBuffer(mesh.indexBuffer);}for(const texture of Object.values(renderer.textures))gl.deleteTexture(texture);gl.deleteProgram(renderer.program);
}
