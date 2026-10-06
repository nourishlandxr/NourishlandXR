import {ORB_MODELS,GRAPHICS_PRESETS,currentGraphicsQuality,currentGraphicsPreset,currentOrbModel} from './spatialVisualSettings.js';
import { SPATIAL_OBJECT_VISUALS } from './spatialObjectVisuals.js';

const DEFAULT_MARKER_COLOR = Object.freeze([0.39, 0.48, 0.23]);
const DEFAULT_PLANT_COLOR = Object.freeze([0.42, 0.72, 0.34]);
const PLANT_RING_COLOR = Object.freeze([0.88, 0.8, 0.56]);

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Unknown sphere shader error.';
        gl.deleteShader(shader);
        throw new Error(message);
    }
    return shader;
}

export function createUvSphereGeometry(latitudeBands = 12, longitudeBands = 16) {
    const latitudes = Math.max(4, Math.floor(latitudeBands));
    const longitudes = Math.max(6, Math.floor(longitudeBands));
    const vertices = [];
    const indices = [];

    for (let latitude = 0; latitude <= latitudes; latitude += 1) {
        const v = latitude / latitudes;
        const phi = v * Math.PI;
        const y = Math.cos(phi);
        const ring = Math.sin(phi);
        for (let longitude = 0; longitude <= longitudes; longitude += 1) {
            const u = longitude / longitudes;
            const theta = u * Math.PI * 2;
            const x = ring * Math.cos(theta);
            const z = ring * Math.sin(theta);
            vertices.push(x, y, z, x, y, z);
        }
    }

    const row = longitudes + 1;
    for (let latitude = 0; latitude < latitudes; latitude += 1) {
        for (let longitude = 0; longitude < longitudes; longitude += 1) {
            const first = latitude * row + longitude;
            const next = first + row;
            indices.push(first, first + 1, next);
            indices.push(next, first + 1, next + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices),
        stride: 6,
        latitudeBands: latitudes,
        longitudeBands: longitudes
    };
}

// Each model has its own reusable geometry, with the same interaction centre.
export function createPlantOrbGeometry(model='improved',quality='medium') {
    const budget=GRAPHICS_PRESETS[quality] || GRAPHICS_PRESETS.medium;
    const geometry=createUvSphereGeometry(budget.orbLatitude,budget.orbLongitude);
    if(model!=='advanced')return geometry;
    const surface=(phi,theta)=>{
        const sin=Math.sin(phi),radial=.82+.10*sin*sin+.05*sin*sin*Math.cos(theta*6+.12*Math.sin(phi));
        return [radial*sin*Math.cos(theta),Math.cos(phi)*.985,radial*sin*Math.sin(theta)];
    };
    const {vertices,latitudeBands:lat,longitudeBands:lon}=geometry;
    for(let i=0;i<=lat;i++)for(let j=0;j<=lon;j++){
        const phi=i*Math.PI/lat,theta=j*Math.PI*2/lon,p=surface(phi,theta),a=surface(Math.min(Math.PI,phi+.001),theta),b=surface(phi,theta+.001);
        const u=a.map((v,k)=>v-p[k]),v=b.map((n,k)=>n-p[k]);
        let normal=[v[1]*u[2]-v[2]*u[1],v[2]*u[0]-v[0]*u[2],v[0]*u[1]-v[1]*u[0]],length=Math.hypot(...normal);
        if(length<.0000001){normal=[0,i<lat/2?1:-1,0];length=1;}
        const offset=(i*(lon+1)+j)*6;
        vertices.set([...p,...normal.map(n=>n/length)],offset);
    }
    return geometry;
}

export function createOrbSepalGeometry(){
    const vertices=[],indices=[];
    for(let leaf=0;leaf<6;leaf++){
        const angle=leaf*Math.PI/3,base=vertices.length/6;
        for(let step=0;step<=8;step++)for(const side of [-1,1]){
            const t=step/8,r=.52+.42*t,w=Math.sin(t*Math.PI)*.14*side;
            vertices.push(Math.cos(angle)*r-Math.sin(angle)*w,-.42-.19*t+Math.sin(t*Math.PI)*.055,Math.sin(angle)*r+Math.cos(angle)*w,Math.cos(angle)*.45,.75,Math.sin(angle)*.45);
        }
        for(let step=0;step<8;step++){const a=base+step*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}

export function sphereModelMatrix(position, radius, scale = {}, rotationY = 0) {
    const scaleX = Number.isFinite(Number(scale?.x)) ? Number(scale.x) : 1;
    const scaleY = Number.isFinite(Number(scale?.y)) ? Number(scale.y) : 1;
    const scaleZ = Number.isFinite(Number(scale?.z)) ? Number(scale.z) : 1;
    const angle = Number.isFinite(Number(rotationY)) ? Number(rotationY) : 0;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return new Float32Array([
        radius * scaleX * cosine, 0, -radius * scaleX * sine, 0,
        0, radius * scaleY, 0, 0,
        radius * scaleZ * sine, 0, radius * scaleZ * cosine, 0,
        Number(position?.x) || 0,
        Number(position?.y) || 0,
        Number(position?.z) || 0,
        1
    ]);
}

export function createOrbCrownGeometry(width=SPATIAL_OBJECT_VISUALS.orb.rimWidth) {
    const vertices = [], indices = [];
    // A complete, fine perimeter gives the Plant Orb enough contrast to remain
    // legible against foliage without adding another bright object inside it.
    const band=(radius,width,from,to,steps)=>{for(let i=0;i<steps;i++){
        const a=from+(to-from)*i/steps,b=from+(to-from)*(i+1)/steps,start=vertices.length/6;
        for(const [angle,r] of [[a,radius-width],[a,radius+width],[b,radius+width],[b,radius-width]])vertices.push(Math.cos(angle)*r,Math.sin(angle)*r,.04,0,0,1);
        indices.push(start,start+1,start+2,start,start+2,start+3);
    }};
    band(1.16,width,0,Math.PI*2,96);
    return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}

export function createSpatialSphereRenderer(gl) {
    const vertexSource = `
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 projection;
        uniform mat4 modelView;
        varying vec3 surfaceNormal;
        varying vec3 viewDirection;
        varying vec3 localPosition;
        void main() {
            localPosition = position;
            vec4 viewPosition = modelView * vec4(position, 1.0);
            surfaceNormal = normalize((modelView * vec4(normal, 0.0)).xyz);
            viewDirection = normalize(-viewPosition.xyz);
            gl_Position = projection * viewPosition;
        }
    `;
    const fragmentSource = `
        precision mediump float;
        varying vec3 surfaceNormal;
        varying vec3 viewDirection;
        varying vec3 localPosition;
        uniform vec3 color;
        uniform float alpha;
        uniform float emissive;
        uniform float haloPass;
        uniform float livingTime;
        uniform float roughness;
        uniform float metalness;
        uniform float botanicalDetail;
        void main() {
            if(haloPass > .5){
                float angle=atan(localPosition.y,localPosition.x);
                float light=.9+.06*sin(angle*2.-livingTime*.25);
                vec3 ink=mix(color,vec3(.97,.94,.78),.3)*light;
                gl_FragColor=vec4(ink,alpha);return;
            }
            vec3 normal = normalize(surfaceNormal);
            vec3 viewer = normalize(viewDirection);
            vec3 lightDirection = normalize(vec3(-0.42, 0.72, 0.56));
            float diffuse = max(dot(normal, lightDirection), 0.0);
            float facing = max(dot(normal, viewer), 0.0);
            float rim = pow(1.0 - facing, 2.4);
            float highlight = pow(max(dot(reflect(-lightDirection, normal), viewer), 0.0), mix(42.0, 8.0, roughness));
            float pearl = 0.5 + 0.5 * sin(normal.y * 4.2 + normal.x * 2.6);
            vec3 shaded = color * (0.62 + diffuse * 0.36);
            shaded = mix(shaded, mix(color, vec3(0.88, 0.94, 0.9), 0.42), pearl * 0.09);
            shaded += mix(vec3(.26),color*.55+vec3(.14),metalness) * highlight;
            shaded = mix(shaded, vec3(0.93, 0.98, 0.9), emissive * (0.1 + diffuse * 0.18));
            shaded += mix(color, vec3(0.82, 0.91, 0.82), 0.55) * rim * 0.23;
            if(botanicalDetail > .5){
                float softRim=pow(1.0-facing,3.0);
                shaded += vec3(.13,.18,.12)*softRim;
                shaded=mix(shaded,vec3(.74,.82,.64),highlight*.12);
            }
            if(botanicalDetail > 1.5){
                float petal=.5+.5*cos(atan(localPosition.z,localPosition.x)*6.0+.12*sin(localPosition.y*3.0));
                float vein=pow(petal,9.0)*(1.0-localPosition.y*localPosition.y);
                shaded=mix(shaded,color*.68,petal*.12);
                shaded+=vec3(.16,.21,.10)*vein*.3;
            }
            gl_FragColor = vec4(shaded, alpha);
        }
    `;
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program) || 'Unknown sphere program error.';
        gl.deleteProgram(program);
        throw new Error(message);
    }

    const geometry = createUvSphereGeometry(24, 32);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    const modelBuffers={};
    for(const quality of Object.keys(GRAPHICS_PRESETS))for(const model of ['basic','improved','advanced']){
        const shape=createPlantOrbGeometry(model,quality),vertices=gl.createBuffer(),indices=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,shape.vertices,gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,shape.indices,gl.STATIC_DRAW);
        const rim=createOrbCrownGeometry(model==='advanced'?.018:.022),crownVertices=gl.createBuffer(),crownIndices=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,crownVertices);gl.bufferData(gl.ARRAY_BUFFER,rim.vertices,gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,crownIndices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,rim.indices,gl.STATIC_DRAW);
        modelBuffers[model+':'+quality]={vertexBuffer:vertices,indexBuffer:indices,indexCount:shape.indices.length,crownVertexBuffer:crownVertices,crownIndexBuffer:crownIndices,crownIndexCount:rim.indices.length};
    }
    const sepals=createOrbSepalGeometry(),sepalVertices=gl.createBuffer(),sepalIndices=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,sepalVertices);gl.bufferData(gl.ARRAY_BUFFER,sepals.vertices,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,sepalIndices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,sepals.indices,gl.STATIC_DRAW);
    modelBuffers.sepals={vertexBuffer:sepalVertices,indexBuffer:sepalIndices,indexCount:sepals.indices.length};
    const crown = createOrbCrownGeometry();
    const crownVertexBuffer = gl.createBuffer(), crownIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, crownVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, crown.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, crownIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, crown.indices, gl.STATIC_DRAW);

    return {
        program,
        modelBuffers,
        vertexBuffer,
        indexBuffer,
        indexCount: geometry.indices.length,
        crownVertexBuffer, crownIndexBuffer, crownIndexCount:crown.indices.length,
        positionLocation: gl.getAttribLocation(program, 'position'),
        normalLocation: gl.getAttribLocation(program, 'normal'),
        projectionLocation: gl.getUniformLocation(program, 'projection'),
        modelViewLocation: gl.getUniformLocation(program, 'modelView'),
        colorLocation: gl.getUniformLocation(program, 'color'),
        alphaLocation: gl.getUniformLocation(program, 'alpha'),
        emissiveLocation: gl.getUniformLocation(program, 'emissive'),
        haloLocation:gl.getUniformLocation(program,'haloPass'),timeLocation:gl.getUniformLocation(program,'livingTime'),
        detailLocation:gl.getUniformLocation(program,'botanicalDetail'),roughnessLocation:gl.getUniformLocation(program,'roughness'),metalnessLocation:gl.getUniformLocation(program,'metalness')
    };
}

export function drawSpatialSphere(gl, renderer, projectionMatrix, viewMatrix, position, radius, material = {}) {
    if (!renderer || !projectionMatrix || !viewMatrix || !position || !Number.isFinite(Number(radius))) return;
    const model = sphereModelMatrix(position, Number(radius), material.scale, material.rotationY);
    if (material.billboard) {
        for (let column=0;column<3;column++) for (let row=0;row<3;row++) model[column*4+row]=viewMatrix[row*4+column]*radius;
    }
    if(material.billboard && material.rotation){const a=material.rotation,c=Math.cos(a),s=Math.sin(a);for(let row=0;row<3;row++){const x=model[row],y=model[4+row];model[row]=x*c+y*s;model[4+row]=y*c-x*s;}}
    const modelView = multiplyMatrices(viewMatrix, model);
    gl.useProgram(renderer.program);
    const buffers=renderer.modelBuffers[material.orbModel] || renderer.modelBuffers[material.orbModel+':'+currentGraphicsQuality()] || renderer;
    gl.bindBuffer(gl.ARRAY_BUFFER, material.crown ? buffers.crownVertexBuffer : buffers.vertexBuffer);
    gl.enableVertexAttribArray(renderer.positionLocation);
    gl.vertexAttribPointer(renderer.positionLocation, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(renderer.normalLocation);
    gl.vertexAttribPointer(renderer.normalLocation, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, material.crown ? buffers.crownIndexBuffer : buffers.indexBuffer);
    gl.uniformMatrix4fv(renderer.projectionLocation, false, projectionMatrix);
    gl.uniformMatrix4fv(renderer.modelViewLocation, false, modelView);
    gl.uniform3fv(renderer.colorLocation, material.color || DEFAULT_MARKER_COLOR);
    const opacity = Number.isFinite(material.opacity) ? Math.max(0, Math.min(1, material.opacity)) : 1;
    gl.uniform1f(renderer.alphaLocation, (Number.isFinite(material.alpha) ? material.alpha : 0.64) * opacity);
    gl.uniform1f(renderer.emissiveLocation, Number.isFinite(material.emissive) ? material.emissive : 0.12);
    gl.uniform1f(renderer.haloLocation,material.halo ? 1 : 0);
    gl.uniform1f(renderer.timeLocation,material.time || 0);
    gl.uniform1f(renderer.roughnessLocation,Number.isFinite(material.roughness)?material.roughness:.6);
    gl.uniform1f(renderer.detailLocation,material.detail || 0);
    gl.uniform1f(renderer.metalnessLocation,Number.isFinite(material.metalness)?material.metalness:.04);
    gl.drawElements(gl.TRIANGLES, material.crown ? buffers.crownIndexCount : buffers.indexCount, gl.UNSIGNED_SHORT, 0);
}

export function drawSpatialOrb(gl, renderer, view, position, radius, options = {}) {
    if (!view?.projectionMatrix || !view?.transform?.inverse?.matrix) return;
    const plant = options.type === 'plant';
    const sourceColor = options.color || (plant ? DEFAULT_PLANT_COLOR : DEFAULT_MARKER_COLOR);
    const ringColor = options.ringColor || PLANT_RING_COLOR;
    const visual=SPATIAL_OBJECT_VISUALS.orb;
    const model=plant?(ORB_MODELS[options.model]?options.model:currentOrbModel()):'basic';
    const appearance=ORB_MODELS[model];
    const shellColor=model==='basic'?sourceColor:sourceColor.map((value,i)=>value*(model==='advanced'?.78:.87)+[.025,.065,.07][i]);
    const selected=Boolean(options.selected || options.knowledge?.state==='expanded');
    const moving=Boolean(options.held),targeted=Boolean(options.highlighted || options.grabReady);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);

    drawSpatialSphere(
        gl,
        renderer,
        view.projectionMatrix,
        view.transform.inverse.matrix,
        position,
        radius,
        { color: shellColor, alpha: plant ? .98 : .94, emissive: moving ? .65 : selected ? .53 : targeted ? .43 : plant ? .27 : .24,
            orbModel:model,detail:Math.min(appearance.detail,currentGraphicsPreset().detail),roughness:appearance.roughness,metalness:appearance.metalness,opacity: options.opacity }
    );

    if(plant && model==='advanced' && currentGraphicsPreset().detail>0){
        gl.disable(gl.CULL_FACE);
        drawSpatialSphere(gl,renderer,view.projectionMatrix,view.transform.inverse.matrix,position,radius,{orbModel:'sepals',color:[.22,.38,.25],alpha:.98,roughness:.6,emissive:.12,opacity:options.opacity});
        gl.enable(gl.CULL_FACE);
    }
    if (plant) {
        gl.depthMask(false);
        const still=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        const time=still ? 0 : (options.time ?? performance.now()/1000);
        if(options.placementHighlight){
            const fade=Math.min(1,Math.max(0,(options.placementAge || 0)/600)),pulse=still?.5:.5+.5*Math.sin(time*2.8);
            drawSpatialSphere(gl,renderer,view.projectionMatrix,view.transform.inverse.matrix,position,radius*(1.75+pulse*.16),{crown:true,orbModel:'basic',billboard:true,halo:true,time:0,color:[.76,.95,.79],alpha:(.55+pulse*.25)*fade,emissive:.35});
        }
        drawSpatialSphere(gl, renderer,
            view.projectionMatrix, view.transform.inverse.matrix, position,
            radius * (selected ? 1.04 : 1), {
                crown:true,orbModel:model,billboard:true, halo:true, time, rotation:0, color:options.knowledge?.draftOnly ? [.72,.61,.38] : ringColor,
                alpha:moving || selected ? visual.selectedRimAlpha : targeted ? visual.targetRimAlpha : visual.idleRimAlpha,
                emissive:.2, opacity:options.opacity
            });
        if(model==='advanced' && currentGraphicsPreset().detail>1)drawSpatialSphere(gl,renderer,view.projectionMatrix,view.transform.inverse.matrix,position,radius*.9,{
            crown:true,orbModel:model,billboard:true,halo:true,time,color:[.49,.64,.44],alpha:targeted?.65:.36,opacity:options.opacity
        });
        gl.depthMask(true);
    }

    // Draw the halo after the opaque shell and without writing depth. Drawing
    // it first caused the larger transparent sphere to occlude the marker,
    // which made a hovered Quest marker look faded instead of selected.
    if (moving || selected || targeted) {
        gl.depthMask(false);
        drawSpatialSphere(gl, renderer, view.projectionMatrix, view.transform.inverse.matrix, position, radius * visual.haloScale, {
            color:moving ? [.62,1,.52] : options.grabReady ? [.55,.86,1] : plant ? [.92,.83,.58] : [.82,1,.28],
            alpha:moving ? visual.movingHaloAlpha : selected ? visual.selectedHaloAlpha : visual.targetHaloAlpha,
            emissive:.75,opacity:options.opacity
        });
        gl.depthMask(true);
    }

    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
}

export function destroySpatialSphereRenderer(gl, renderer) {
    if (!gl || !renderer) return;
    gl.deleteBuffer(renderer.vertexBuffer);
    gl.deleteBuffer(renderer.indexBuffer);
    gl.deleteBuffer(renderer.crownVertexBuffer);
    gl.deleteBuffer(renderer.crownIndexBuffer);
    for(const buffers of Object.values(renderer.modelBuffers || {})){gl.deleteBuffer(buffers.vertexBuffer);gl.deleteBuffer(buffers.indexBuffer);if(buffers.crownVertexBuffer)gl.deleteBuffer(buffers.crownVertexBuffer);if(buffers.crownIndexBuffer)gl.deleteBuffer(buffers.crownIndexBuffer);}
    gl.deleteProgram(renderer.program);
}

function multiplyMatrices(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
        for (let row = 0; row < 4; row += 1) {
            out[column * 4 + row] = a[row] * b[column * 4]
                + a[4 + row] * b[column * 4 + 1]
                + a[8 + row] * b[column * 4 + 2]
                + a[12 + row] * b[column * 4 + 3];
        }
    }
    return out;
}
