export function diceShadowAppearance(position,floor,radius=.19){
    const height=Math.max(0,position.y-floor-radius);
    return {radius:radius*(1.7+Math.min(1.2,height*.55)),opacity:.38/(1+height*2.5)};
}
// A single soft contact decal, not a shadow map or a second scene render.
export function createDiceGroundShadow(gl){
    function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
    const vs=compile(gl.VERTEX_SHADER,'attribute vec2 p;uniform mat4 projection,view;uniform vec3 center;uniform float radius;varying vec2 uv;void main(){uv=p;gl_Position=projection*view*vec4(center+vec3(p.x*radius,0.,p.y*radius),1.);}'),fs=compile(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 uv;uniform float opacity,impact;void main(){float r=length(uv);float a=impact<0.?(1.-smoothstep(.05,1.,r))*opacity:(1.-smoothstep(.015,.055,abs(r-(.15+.70*impact))))*opacity;if(a<.005)discard;gl_FragColor=vec4(impact<0.?vec3(.025,.035,.03):vec3(.80,.90,.75),a);}');
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);
    const p=gl.getAttribLocation(program,'p'),uniforms=Object.fromEntries(['projection','view','center','radius','opacity','impact'].map(name=>[name,gl.getUniformLocation(program,name)]));
    function draw(view,position,floor,radius,opacity,impact=-1){
        const depth=gl.isEnabled(gl.DEPTH_TEST),blend=gl.isEnabled(gl.BLEND),cull=gl.isEnabled(gl.CULL_FACE),mask=gl.getParameter(gl.DEPTH_WRITEMASK);
        gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
        gl.uniformMatrix4fv(uniforms.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(uniforms.view,false,view.transform.inverse.matrix);gl.uniform3f(uniforms.center,position.x,floor+.004,position.z);gl.uniform1f(uniforms.radius,radius);gl.uniform1f(uniforms.opacity,opacity);gl.uniform1f(uniforms.impact,impact);gl.drawArrays(gl.TRIANGLES,0,6);
        gl.depthMask(mask);if(!depth)gl.disable(gl.DEPTH_TEST);if(!blend)gl.disable(gl.BLEND);if(cull)gl.enable(gl.CULL_FACE);
    }
    return {draw(view,position,floor,opacity=1){const shadow=diceShadowAppearance(position,floor);draw(view,position,floor,shadow.radius,shadow.opacity*opacity);},drawImpact(view,position,floor,progress){draw(view,position,floor,.55,.30*(1-progress),progress);},destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
