const DEFAULT_MARKER_COLOR = Object.freeze([0.57, 0.64, 0.60]);
const DEFAULT_PLANT_COLOR = Object.freeze([0.42, 0.72, 0.34]);
const PLANT_CORE_COLOR = Object.freeze([0.82, 0.96, 0.58]);

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

export function createUvSphereGeometry(latitudeBands = 18, longitudeBands = 24) {
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

export function sphereModelMatrix(position, radius) {
    return new Float32Array([
        radius, 0, 0, 0,
        0, radius, 0, 0,
        0, 0, radius, 0,
        Number(position?.x) || 0,
        Number(position?.y) || 0,
        Number(position?.z) || 0,
        1
    ]);
}

export function createSpatialSphereRenderer(gl) {
    const vertexSource = `
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 projection;
        uniform mat4 modelView;
        varying vec3 surfaceNormal;
        varying vec3 viewDirection;
        void main() {
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
        uniform vec3 color;
        uniform float alpha;
        uniform float emissive;
        uniform float time;
        uniform float motion;
        void main() {
            vec3 normal = normalize(surfaceNormal);
            vec3 viewer = normalize(viewDirection);
            vec3 lightDirection = normalize(vec3(-0.42, 0.72, 0.56));
            float diffuse = max(dot(normal, lightDirection), 0.0);
            float facing = max(dot(normal, viewer), 0.0);
            float rim = pow(1.0 - facing, 2.4);
            float highlight = pow(max(dot(reflect(-lightDirection, normal), viewer), 0.0), 38.0);
            float pearl = 0.5 + 0.5 * sin(normal.y * 4.2 + normal.x * 2.6);
            float ribbonA = .5 + .5 * sin(normal.x * 10.0 + normal.y * 7.0 + normal.z * 5.0 + time * .72);
            float ribbonB = .5 + .5 * sin(normal.z * 13.0 - normal.y * 8.0 - normal.x * 3.0 - time * .48);
            float wisps = smoothstep(.68, .96, ribbonA * .58 + ribbonB * .42);
            vec3 shaded = color * (0.4 + diffuse * 0.48);
            shaded = mix(shaded, mix(color, vec3(0.88, 0.94, 0.9), 0.42), pearl * 0.09);
            shaded += vec3(0.34) * highlight;
            shaded = mix(shaded, vec3(0.93, 0.98, 0.9), emissive * (0.1 + diffuse * 0.18));
            shaded += mix(color, vec3(0.72, 0.86, 0.76), 0.45) * rim * 0.18;
            shaded += mix(color, vec3(0.82, 0.94, 1.0), .52) * wisps * motion * .48;
            float transparentShell = mix(1.0 - rim * .22, min(1.0, .28 + rim * .72 + wisps * .64), motion);
            gl_FragColor = vec4(shaded, alpha * transparentShell);
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

    const geometry = createUvSphereGeometry();
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    return {
        program,
        vertexBuffer,
        indexBuffer,
        indexCount: geometry.indices.length,
        positionLocation: gl.getAttribLocation(program, 'position'),
        normalLocation: gl.getAttribLocation(program, 'normal'),
        projectionLocation: gl.getUniformLocation(program, 'projection'),
        modelViewLocation: gl.getUniformLocation(program, 'modelView'),
        colorLocation: gl.getUniformLocation(program, 'color'),
        alphaLocation: gl.getUniformLocation(program, 'alpha'),
        emissiveLocation: gl.getUniformLocation(program, 'emissive'),
        timeLocation: gl.getUniformLocation(program, 'time'),
        motionLocation: gl.getUniformLocation(program, 'motion')
    };
}

export function drawSpatialSphere(gl, renderer, projectionMatrix, viewMatrix, position, radius, material = {}) {
    if (!renderer || !projectionMatrix || !viewMatrix || !position || !Number.isFinite(Number(radius))) return;
    const modelView = multiplyMatrices(viewMatrix, sphereModelMatrix(position, Number(radius)));
    gl.useProgram(renderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
    gl.enableVertexAttribArray(renderer.positionLocation);
    gl.vertexAttribPointer(renderer.positionLocation, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(renderer.normalLocation);
    gl.vertexAttribPointer(renderer.normalLocation, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
    gl.uniformMatrix4fv(renderer.projectionLocation, false, projectionMatrix);
    gl.uniformMatrix4fv(renderer.modelViewLocation, false, modelView);
    gl.uniform3fv(renderer.colorLocation, material.color || DEFAULT_MARKER_COLOR);
    gl.uniform1f(renderer.alphaLocation, Number.isFinite(material.alpha) ? material.alpha : 0.64);
    gl.uniform1f(renderer.emissiveLocation, Number.isFinite(material.emissive) ? material.emissive : 0.12);
    gl.uniform1f(renderer.timeLocation, performance.now() * .001);
    gl.uniform1f(renderer.motionLocation, material.motion ? 1 : 0);
    gl.drawElements(gl.TRIANGLES, renderer.indexCount, gl.UNSIGNED_SHORT, 0);
}

export function drawSpatialOrb(gl, renderer, view, position, radius, options = {}) {
    if (!view?.projectionMatrix || !view?.transform?.inverse?.matrix) return;
    const plant = options.type === 'plant';
    const shellColor = options.color || (plant ? DEFAULT_PLANT_COLOR : DEFAULT_MARKER_COLOR);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);

    gl.depthMask(false);
    drawSpatialSphere(
        gl,
        renderer,
        view.projectionMatrix,
        view.transform.inverse.matrix,
        position,
        radius * 1.08,
        { color: shellColor, alpha: plant ? 0.22 : 0.2, emissive: 0.34, motion: true }
    );
    gl.depthMask(true);
    if (plant) {
        drawSpatialSphere(
            gl,
            renderer,
            view.projectionMatrix,
            view.transform.inverse.matrix,
            position,
            radius * 0.38,
            { color: PLANT_CORE_COLOR, alpha: 0.98, emissive: 0.82 }
        );
    }
    drawSpatialSphere(
        gl,
        renderer,
        view.projectionMatrix,
        view.transform.inverse.matrix,
        position,
        radius,
        { color: shellColor, alpha: plant ? 0.64 : 0.58, emissive: plant ? 0.38 : 0.32, motion: true }
    );

    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
}

export function destroySpatialSphereRenderer(gl, renderer) {
    if (!gl || !renderer) return;
    gl.deleteBuffer(renderer.vertexBuffer);
    gl.deleteBuffer(renderer.indexBuffer);
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
