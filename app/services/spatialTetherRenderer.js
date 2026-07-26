function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Unknown tether shader error.';
        gl.deleteShader(shader);
        throw new Error(message);
    }
    return shader;
}

function subtract(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    };
}

function add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    };
}

function scale(vector, amount) {
    return {
        x: vector.x * amount,
        y: vector.y * amount,
        z: vector.z * amount
    };
}

function normalize(vector, fallback = { x: 1, y: 0, z: 0 }) {
    const length = Math.hypot(vector.x, vector.y, vector.z);
    return length > 0.00001 ? scale(vector, 1 / length) : fallback;
}

function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

function quadraticPoint(start, control, end, t) {
    const inverse = 1 - t;
    return {
        x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
        y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
        z: inverse * inverse * start.z + 2 * inverse * t * control.z + t * t * end.z
    };
}

export function createTetherRibbonGeometry(start, end, cameraPosition, options = {}) {
    const segments = Math.max(4, Math.min(24, Math.floor(options.segments || 10)));
    const width = Math.max(0.001, Number(options.width) || 0.005);
    const midpoint = scale(add(start, end), 0.5);
    const horizontal = normalize(
        { x: cameraPosition.x - midpoint.x, y: 0, z: cameraPosition.z - midpoint.z },
        { x: 1, y: 0, z: 0 }
    );
    const control = {
        x: midpoint.x + horizontal.x * (Number(options.curve) || 0.035),
        y: midpoint.y + (Number(options.lift) || 0.055),
        z: midpoint.z + horizontal.z * (Number(options.curve) || 0.035)
    };
    const points = Array.from(
        { length: segments + 1 },
        (_, index) => quadraticPoint(start, control, end, index / segments)
    );
    const edges = points.map((point, index) => {
        const previous = points[Math.max(0, index - 1)];
        const next = points[Math.min(points.length - 1, index + 1)];
        const tangent = normalize(subtract(next, previous), { x: 0, y: 1, z: 0 });
        const towardCamera = normalize(subtract(cameraPosition, point), { x: 0, y: 0, z: 1 });
        const side = normalize(cross(tangent, towardCamera), { x: 1, y: 0, z: 0 });
        const taper = 0.68 + Math.sin(Math.PI * index / segments) * 0.32;
        const halfWidth = width * taper;
        return {
            left: add(point, scale(side, halfWidth)),
            right: add(point, scale(side, -halfWidth))
        };
    });
    const vertices = [];
    for (let index = 0; index < segments; index += 1) {
        const current = edges[index];
        const next = edges[index + 1];
        [
            current.left, current.right, next.left,
            next.left, current.right, next.right
        ].forEach(point => vertices.push(point.x, point.y, point.z));
    }
    return new Float32Array(vertices);
}

export function createSpatialTetherRenderer(gl) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
        attribute vec3 position;
        uniform mat4 projection;
        uniform mat4 viewMatrix;
        void main() {
            gl_Position = projection * viewMatrix * vec4(position, 1.0);
        }
    `);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform vec4 tetherColor;
        void main() {
            gl_FragColor = tetherColor;
        }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program) || 'Unknown tether program error.';
        gl.deleteProgram(program);
        throw new Error(message);
    }
    return {
        program,
        buffer: gl.createBuffer(),
        positionLocation: gl.getAttribLocation(program, 'position'),
        projectionLocation: gl.getUniformLocation(program, 'projection'),
        viewLocation: gl.getUniformLocation(program, 'viewMatrix'),
        colorLocation: gl.getUniformLocation(program, 'tetherColor')
    };
}

export function drawSpatialTether(gl, renderer, view, start, end, options = {}) {
    if (!renderer || !view?.projectionMatrix || !view?.transform?.inverse?.matrix || !start || !end) return;
    const transform = view.transform.matrix;
    const cameraPosition = transform
        ? { x: transform[12], y: transform[13], z: transform[14] }
        : { x: 0, y: 1.5, z: 0 };
    const vertices = createTetherRibbonGeometry(start, end, cameraPosition, options);
    gl.useProgram(renderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(renderer.positionLocation);
    gl.vertexAttribPointer(renderer.positionLocation, 3, gl.FLOAT, false, 12, 0);
    gl.uniformMatrix4fv(renderer.projectionLocation, false, view.projectionMatrix);
    gl.uniformMatrix4fv(renderer.viewLocation, false, view.transform.inverse.matrix);
    gl.uniform4fv(renderer.colorLocation, options.color || [0.84, 0.93, 0.76, 0.27]);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
    gl.depthMask(true);
}

export function destroySpatialTetherRenderer(gl, renderer) {
    if (!gl || !renderer) return;
    gl.deleteBuffer(renderer.buffer);
    gl.deleteProgram(renderer.program);
}
