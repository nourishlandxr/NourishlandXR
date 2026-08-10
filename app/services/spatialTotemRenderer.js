const TOTEM_STYLES = new Set(['basic', 'organic', 'flat-disc']);

function normalizeVector(x, y, z) {
    const length = Math.hypot(x, y, z) || 1;
    return [x / length, y / length, z / length];
}

function pushTriangle(vertices, a, b, c, normal) {
    [a, b, c].forEach(point => vertices.push(point[0], point[1], point[2], normal[0], normal[1], normal[2]));
}

export function createLatheGeometry(profile, radialSegments = 18, options = {}) {
    const rings = profile
        .map(point => ({ y: Number(point?.y), radius: Math.max(0, Number(point?.radius)) }))
        .filter(point => Number.isFinite(point.y) && Number.isFinite(point.radius));
    const segments = Math.max(8, Math.min(32, Math.floor(radialSegments)));
    if (rings.length < 2) return new Float32Array();
    const vertices = [];
    const ringPoints = rings.map((ring, ringIndex) => {
        const previous = rings[Math.max(0, ringIndex - 1)];
        const next = rings[Math.min(rings.length - 1, ringIndex + 1)];
        const dy = next.y - previous.y || 1;
        const dr = next.radius - previous.radius;
        const points = [];
        for (let segment = 0; segment < segments; segment += 1) {
            const angle = segment / segments * Math.PI * 2;
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);
            const offsetX = typeof options.offsetX === 'function' ? Number(options.offsetX(ring.y)) || 0 : 0;
            const offsetZ = typeof options.offsetZ === 'function' ? Number(options.offsetZ(ring.y)) || 0 : 0;
            points.push({
                position: [ring.radius * cosine + offsetX, ring.y, ring.radius * sine + offsetZ],
                normal: normalizeVector(cosine * dy, -dr, sine * dy)
            });
        }
        return points;
    });
    for (let ringIndex = 0; ringIndex < ringPoints.length - 1; ringIndex += 1) {
        const current = ringPoints[ringIndex];
        const next = ringPoints[ringIndex + 1];
        for (let segment = 0; segment < segments; segment += 1) {
            const following = (segment + 1) % segments;
            const a = current[segment];
            const b = current[following];
            const c = next[segment];
            const d = next[following];
            pushTriangle(vertices, a.position, b.position, c.position, a.normal);
            pushTriangle(vertices, c.position, b.position, d.position, c.normal);
        }
    }
    const addCap = (ring, normalY, reverse = false) => {
        if (ring.radius <= 0) return;
        const center = [0, ring.y, 0];
        for (let segment = 0; segment < segments; segment += 1) {
            const next = (segment + 1) % segments;
            const a = ring[segment].position;
            const b = ring[next].position;
            const normal = [0, normalY, 0];
            pushTriangle(vertices, reverse ? center : a, reverse ? a : center, reverse ? b : b, normal);
        }
    };
    addCap(ringPoints[0], -1, true);
    addCap(ringPoints[ringPoints.length - 1], 1, false);
    return new Float32Array(vertices);
}

export function createTotemDiskGeometry(radius = .22, thickness = .06, segments = 24, centerY = .76) {
    const segmentCount = Math.max(12, Math.min(36, Math.floor(segments)));
    const vertices = [];
    const frontZ = thickness / 2;
    const backZ = -frontZ;
    for (let segment = 0; segment < segmentCount; segment += 1) {
        const next = (segment + 1) % segmentCount;
        const angle = segment / segmentCount * Math.PI * 2;
        const nextAngle = next / segmentCount * Math.PI * 2;
        const centerFront = [0, centerY, frontZ];
        const centerBack = [0, centerY, backZ];
        const frontA = [radius * Math.cos(angle), centerY + radius * Math.sin(angle), frontZ];
        const frontB = [radius * Math.cos(nextAngle), centerY + radius * Math.sin(nextAngle), frontZ];
        const backA = [radius * Math.cos(angle), centerY + radius * Math.sin(angle), backZ];
        const backB = [radius * Math.cos(nextAngle), centerY + radius * Math.sin(nextAngle), backZ];
        pushTriangle(vertices, centerFront, frontA, frontB, [0, 0, 1]);
        pushTriangle(vertices, centerBack, backB, backA, [0, 0, -1]);
        const edgeNormalA = normalizeVector(Math.cos(angle), Math.sin(angle), 0);
        const edgeNormalB = normalizeVector(Math.cos(nextAngle), Math.sin(nextAngle), 0);
        pushTriangle(vertices, frontA, backA, frontB, edgeNormalA);
        pushTriangle(vertices, frontB, backA, backB, edgeNormalB);
    }
    return new Float32Array(vertices);
}

function woodProfile() {
    return [
        { y: 0, radius: .145 },
        { y: .035, radius: .19 },
        { y: .085, radius: .17 },
        { y: .12, radius: .12 },
        { y: .23, radius: .095 },
        { y: .48, radius: .09 },
        { y: .76, radius: .082 },
        { y: 1, radius: .07 }
    ];
}

function organicOffsetX(y) {
    return Math.sin(y * 6.4) * .018 + Math.sin(y * 15.2) * .006;
}

function organicOffsetZ(y) {
    return Math.cos(y * 5.1) * .014 + Math.sin(y * 12.6) * .005;
}

function part(name, geometry, material) {
    return { name, geometry, material };
}

export function createTotemGeometry(style = 'basic') {
    const selectedStyle = TOTEM_STYLES.has(style) ? style : 'basic';
    const base = createLatheGeometry([
        { y: 0, radius: .145 },
        { y: .028, radius: .19 },
        { y: .07, radius: .18 },
        { y: .1, radius: .13 },
        { y: .13, radius: .1 }
    ], 20);
    const body = createLatheGeometry(woodProfile(), 20, { offsetX: organicOffsetX, offsetZ: organicOffsetZ });
    const parts = [part('base', base, 'base'), part('body', body, 'wood')];
    if (selectedStyle === 'organic') {
        const bulb = createLatheGeometry([
            { y: .62, radius: .055 },
            { y: .7, radius: .12 },
            { y: .83, radius: .16 },
            { y: .94, radius: .15 },
            { y: 1, radius: .02 }
        ], 20, { offsetX: organicOffsetX, offsetZ: organicOffsetZ });
        const core = createLatheGeometry([
            { y: .69, radius: .018 },
            { y: .86, radius: .022 },
            { y: .93, radius: .012 }
        ], 12);
        parts.push(part('seedpod', bulb, 'bulb'), part('seed-core', core, 'glow'));
    } else if (selectedStyle === 'flat-disc') {
        parts.push(part('disk', createTotemDiskGeometry(.22, .055, 28, .77), 'disk'));
    }
    return parts;
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Unknown Totem shader error.';
        gl.deleteShader(shader);
        throw new Error(message);
    }
    return shader;
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

function modelMatrix(position, height, width, rotationY) {
    const cosine = Math.cos(rotationY);
    const sine = Math.sin(rotationY);
    return new Float32Array([
        cosine * width, 0, -sine * width, 0,
        0, height, 0, 0,
        sine * width, 0, cosine * width, 0,
        Number(position?.x) || 0, Number(position?.y) || 0, Number(position?.z) || 0, 1
    ]);
}

function scaledColor(color, factor) {
    return color.map(channel => Math.max(0, Math.min(1, channel * factor)));
}

export function createSpatialTotemRenderer(gl) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 projection;
        uniform mat4 modelView;
        varying vec3 surfaceNormal;
        varying vec3 localPosition;
        varying vec3 viewDirection;
        void main() {
            vec4 viewPosition = modelView * vec4(position, 1.0);
            surfaceNormal = normalize((modelView * vec4(normal, 0.0)).xyz);
            localPosition = position;
            viewDirection = normalize(-viewPosition.xyz);
            gl_Position = projection * viewPosition;
        }
    `);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec3 surfaceNormal;
        varying vec3 localPosition;
        varying vec3 viewDirection;
        uniform vec3 color;
        uniform vec3 topColor;
        uniform vec3 accentColor;
        uniform float alpha;
        uniform float glow;
        void main() {
            vec3 normal = normalize(surfaceNormal);
            vec3 viewer = normalize(viewDirection);
            vec3 lightDirection = normalize(vec3(-0.46, 0.78, 0.5));
            float diffuse = max(dot(normal, lightDirection), 0.0);
            float facing = max(dot(normal, viewer), 0.0);
            float grain = .5 + .5 * sin(localPosition.y * 37.0 + localPosition.x * 8.0 + localPosition.z * 5.0);
            vec3 wood = mix(color * .72, mix(color, topColor, .4), grain * .24);
            wood = mix(wood, topColor, pow(max(normal.y, 0.0), 5.0) * .18);
            vec3 shaded = wood * (.36 + diffuse * .54 + facing * .07);
            float edge = pow(1.0 - facing, 2.4);
            shaded += accentColor * edge * .16;
            shaded = mix(shaded, accentColor, glow * (.12 + diffuse * .2));
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
        const message = gl.getProgramInfoLog(program) || 'Unknown Totem program error.';
        gl.deleteProgram(program);
        throw new Error(message);
    }
    return {
        program,
        vertexBuffer: gl.createBuffer(),
        positionLocation: gl.getAttribLocation(program, 'position'),
        normalLocation: gl.getAttribLocation(program, 'normal'),
        projectionLocation: gl.getUniformLocation(program, 'projection'),
        modelViewLocation: gl.getUniformLocation(program, 'modelView'),
        colorLocation: gl.getUniformLocation(program, 'color'),
        topColorLocation: gl.getUniformLocation(program, 'topColor'),
        accentColorLocation: gl.getUniformLocation(program, 'accentColor'),
        alphaLocation: gl.getUniformLocation(program, 'alpha'),
        glowLocation: gl.getUniformLocation(program, 'glow')
    };
}

export function drawSpatialTotem(gl, renderer, view, position, options = {}) {
    if (!renderer || !view?.projectionMatrix || !view?.transform?.inverse?.matrix || !position) return;
    const style = TOTEM_STYLES.has(options.style) ? options.style : 'basic';
    const height = Math.max(.35, Number(options.height) || 1.36);
    const width = Math.max(.45, Number(options.width) || 1);
    const rotationY = Number.isFinite(Number(options.rotationY)) ? Number(options.rotationY) : Math.PI / 12;
    const modelView = multiplyMatrices(view.transform.inverse.matrix, modelMatrix(position, height, width, rotationY));
    const color = options.color || [.24, .36, .2];
    const topColor = options.topColor || [.52, .42, .22];
    const accentColor = options.accentColor || [.92, .72, .3];
    const alpha = Number.isFinite(Number(options.alpha)) ? Math.max(0, Math.min(1, Number(options.alpha))) : .98;
    gl.useProgram(renderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
    gl.enableVertexAttribArray(renderer.positionLocation);
    gl.enableVertexAttribArray(renderer.normalLocation);
    gl.vertexAttribPointer(renderer.positionLocation, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(renderer.normalLocation, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix4fv(renderer.projectionLocation, false, view.projectionMatrix);
    gl.uniformMatrix4fv(renderer.modelViewLocation, false, modelView);
    gl.uniform1f(renderer.alphaLocation, alpha);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);
    createTotemGeometry(style).forEach(item => {
        const material = item.material === 'base'
            ? { color: scaledColor(color, .55), topColor: scaledColor(topColor, .7), accent: accentColor, glow: .04 }
            : item.material === 'bulb'
                ? { color: scaledColor(topColor, 1.05), topColor: [.9, .7, .28], accent: [1, .86, .5], glow: .72 }
                : item.material === 'glow'
                    ? { color: [1, .68, .2], topColor: [1, .92, .62], accent: [1, .9, .6], glow: 1 }
                    : item.material === 'disk'
                        ? { color: [.065, .11, .08], topColor: [.15, .2, .14], accent: accentColor, glow: .4 }
                        : { color, topColor, accent: accentColor, glow: .08 };
        gl.bufferData(gl.ARRAY_BUFFER, item.geometry, gl.DYNAMIC_DRAW);
        gl.uniform3fv(renderer.colorLocation, material.color);
        gl.uniform3fv(renderer.topColorLocation, material.topColor);
        gl.uniform3fv(renderer.accentColorLocation, material.accent);
        gl.uniform1f(renderer.glowLocation, material.glow);
        gl.drawArrays(gl.TRIANGLES, 0, item.geometry.length / 6);
    });
    gl.disable(gl.CULL_FACE);
}

export function destroySpatialTotemRenderer(gl, renderer) {
    if (!gl || !renderer) return;
    gl.deleteBuffer(renderer.vertexBuffer);
    gl.deleteProgram(renderer.program);
}
