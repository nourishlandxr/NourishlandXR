function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Unknown triangle shader error.';
        gl.deleteShader(shader);
        throw new Error(message);
    }
    return shader;
}

export function createTrianglePrismGeometry() {
    const vertices = [];
    const face = (normal, corners) => {
        const indices = corners.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3];
        indices.forEach(index => vertices.push(...corners[index], ...normal));
    };
    face([0, 0, 1], [[-1, -1, 1], [1, -1, 1], [0, 1, 1]]);
    face([0, 0, -1], [[1, -1, -1], [-1, -1, -1], [0, 1, -1]]);
    face([0, -0.707, 0.707], [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]]);
    face([0.707, 0.707, 0], [[1, -1, 1], [0, 1, 1], [0, 1, -1], [1, -1, -1]]);
    face([-0.707, 0.707, 0], [[0, 1, 1], [-1, -1, 1], [-1, -1, -1], [0, 1, -1]]);
    return new Float32Array(vertices);
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

function trianglePrismModelMatrix(position, dimensions = {}, rotationY = Math.PI / 7) {
    const halfWidth = Number(dimensions.halfWidth) || .12;
    const halfHeight = Number(dimensions.halfHeight) || .12;
    const halfDepth = Number(dimensions.halfDepth) || halfWidth * .62;
    const cosine = Math.cos(rotationY);
    const sine = Math.sin(rotationY);
    return new Float32Array([
        cosine * halfWidth, 0, -sine * halfWidth, 0,
        0, halfHeight, 0, 0,
        sine * halfDepth, 0, cosine * halfDepth, 0,
        Number(position?.x) || 0,
        (Number(position?.y) || 0) + halfHeight,
        Number(position?.z) || 0,
        1
    ]);
}

export function createSpatialTriangleRenderer(gl) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
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
    `);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec3 surfaceNormal;
        varying vec3 viewDirection;
        uniform vec3 color;
        uniform vec3 topColor;
        uniform float alpha;
        void main() {
            vec3 normal = normalize(surfaceNormal);
            vec3 viewer = normalize(viewDirection);
            vec3 lightDirection = normalize(vec3(-0.5, 0.82, 0.42));
            float diffuse = max(dot(normal, lightDirection), 0.0);
            float facing = max(dot(normal, viewer), 0.0);
            float topFace = smoothstep(0.72, 0.94, normal.y);
            float sideShade = 0.42 + diffuse * 0.48 + facing * 0.08;
            vec3 shaded = color * sideShade;
            shaded = mix(shaded, topColor, topFace);
            gl_FragColor = vec4(shaded, alpha);
        }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program) || 'Unknown triangle program error.';
        gl.deleteProgram(program);
        throw new Error(message);
    }
    const geometry = createTrianglePrismGeometry();
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);
    return {
        program,
        vertexBuffer,
        vertexCount: geometry.length / 6,
        positionLocation: gl.getAttribLocation(program, 'position'),
        normalLocation: gl.getAttribLocation(program, 'normal'),
        projectionLocation: gl.getUniformLocation(program, 'projection'),
        modelViewLocation: gl.getUniformLocation(program, 'modelView'),
        colorLocation: gl.getUniformLocation(program, 'color'),
        topColorLocation: gl.getUniformLocation(program, 'topColor'),
        alphaLocation: gl.getUniformLocation(program, 'alpha')
    };
}

export function drawSpatialTriangle(gl, renderer, view, position, options = {}) {
    if (!renderer || !view?.projectionMatrix || !view?.transform?.inverse?.matrix || !position) return;
    const model = trianglePrismModelMatrix(position, options, Number.isFinite(options.rotationY) ? options.rotationY : Math.PI / 7);
    const modelView = multiplyMatrices(view.transform.inverse.matrix, model);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);
    gl.useProgram(renderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
    gl.enableVertexAttribArray(renderer.positionLocation);
    gl.vertexAttribPointer(renderer.positionLocation, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(renderer.normalLocation);
    gl.vertexAttribPointer(renderer.normalLocation, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix4fv(renderer.projectionLocation, false, view.projectionMatrix);
    gl.uniformMatrix4fv(renderer.modelViewLocation, false, modelView);
    gl.uniform3fv(renderer.colorLocation, options.color || [.34, .78, .7]);
    gl.uniform3fv(renderer.topColorLocation, options.topColor || [.68, .95, .87]);
    gl.uniform1f(renderer.alphaLocation, Number.isFinite(options.alpha) ? options.alpha : .96);
    gl.drawArrays(gl.TRIANGLES, 0, renderer.vertexCount);
    gl.disable(gl.CULL_FACE);
}

export function destroySpatialTriangleRenderer(gl, renderer) {
    if (!gl || !renderer) return;
    gl.deleteBuffer(renderer.vertexBuffer);
    gl.deleteProgram(renderer.program);
}
