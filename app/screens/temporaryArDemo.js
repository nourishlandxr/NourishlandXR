/**
 * TRY IT NOW — a deliberately small, self-contained AR placement demo.
 * It never opens a dashboard or a draggable window before placement.
 */
import { spatialPosition } from '../services/spatialPlacement.js';
import { createMinimalMarkerDraft, relateMinimalMarkers } from '../services/markerWorkflow.js';

let appRoot = null;
let session = null;
let canvas = null;
let gl = null;
let referenceSpace = null;
let hitTestSource = null;
let viewerMatrix = null;
let hitMatrix = null;
let marker = null;
let markerType = 'marker';
let markers = [];
let simulatedMode = false;
let program = null;
let buffer = null;
let ending = false;
let demoStage = 'plant';
let boardTypingTimer = null;
const DEMO_SEQUENCE = ['plant', 'note', 'zone'];
const DEMO_CONTENT = Object.freeze({
    plant: { title: 'Plant · Lemon Myrtle', accent: '#b7e895', lines: ['CLIMATE  Warm temperate · sheltered', 'USES  Tea · aroma · habitat', 'RELATIONSHIPS  Pollinators · understory'] },
    note: { title: 'Focus Point · Seasonal observation', accent: '#f0cf70', lines: ['STORY  New growth after summer rain', 'MEDIA  Sound · animation · images', 'ACTION  Revisit · compare · update'] },
    zone: { title: 'Area · Citrus Guild', accent: '#89c8ef', lines: ['BOUNDARY  One defined place', 'USE  Guild · microclimate · crop', 'FLOW  Loads this Area’s markers and stories'] }
});
const NOTE_TEMPLATES = Object.freeze({
    poi: { title: 'Point of Interest · Seasonal observation', accent: '#f0cf70', lines: ['PURPOSE  Draw attention to this place', 'MEDIA  Sound · animation · images', 'ACTION  Revisit · compare · update'] },
    warning: { title: 'Warning Note · DON’T GO HERE', accent: '#ef9b78', lines: ['WARNING  Do not enter this place', 'GUIDANCE  Explain the risk or boundary', 'FUTURE  Sound · alerts · animation'] }
});

function clearSessionState() {
    hitTestSource?.cancel?.();
    hitTestSource = null;
    referenceSpace = null;
    viewerMatrix = null;
    hitMatrix = null;
    marker = null;
    markerType = 'marker';
    demoStage = 'plant';
    clearTimeout(boardTypingTimer);
    boardTypingTimer = null;
    markers.forEach(record => {
        if (record.texture) gl?.deleteTexture(record.texture);
        if (record.boundaryTexture) gl?.deleteTexture(record.boundaryTexture);
    });
    markers = [];
    program = null;
    buffer = null;
    canvas?.remove();
    canvas = null;
    gl = null;
}

function returnToWelcome() {
    const active = session;
    ending = true;
    session = null;
    clearSessionState();
    active?.end().catch(() => {});
    window.renderLaunchScreen();
}

function setGuide(message) {
    const guide = appRoot?.querySelector('[data-tryit-guide]');
    if (guide) guide.textContent = message;
}

function showDemoAction(label, nextStage) {
    const messages = {
        note: ['Plant profile complete', 'The Lemon Myrtle profile now lives in this space. Next, place a second Marker somewhere nearby.'],
        zone: ['Focus Point complete', 'This Note can grow into sound, animation, images or alerts. Next, create the checkpoint for an Area.']
    };
    const [title, text] = messages[nextStage] || ['Continue the journey', 'Move to the next tutorial step.'];
    showGuidedChoice(`<h2>${title}</h2><p>${text}</p><button type="button" data-demo-choice="continue">${label}</button>`, choice => {
        if (choice === 'continue') armDemoPlacement(nextStage);
    });
}

function demoContentFor(record) {
    return record.demoContent || DEMO_CONTENT[record.demoType || record.type];
}

function hideGuidedChoice() {
    const panel = appRoot?.querySelector('[data-tryit-guided-choice]');
    if (panel) {
        panel.hidden = true;
        panel.innerHTML = '';
    }
}

function showGuidedChoice(html, onClick) {
    const panel = appRoot?.querySelector('[data-tryit-guided-choice]');
    if (!panel) return;
    panel.innerHTML = html;
    panel.hidden = false;
    clearTimeout(boardTypingTimer);
    const paragraph = panel.querySelector('p');
    const fullText = paragraph?.textContent || '';
    const revealTargets = [...panel.querySelectorAll('button, label, .tryit-guided-grid')];
    revealTargets.forEach(target => target.classList.add('is-awaiting-text'));
    let typedLength = 0;
    let typing = Boolean(paragraph && fullText);
    const finishTyping = () => {
        clearTimeout(boardTypingTimer);
        if (paragraph) paragraph.textContent = fullText;
        typing = false;
        revealTargets.forEach(target => target.classList.remove('is-awaiting-text'));
        panel.classList.remove('is-typing');
    };
    const typeNextCharacter = () => {
        if (!typing || !paragraph) return;
        typedLength += 1;
        paragraph.textContent = fullText.slice(0, typedLength);
        if (typedLength >= fullText.length) return finishTyping();
        boardTypingTimer = setTimeout(typeNextCharacter, 22);
    };
    if (typing) {
        paragraph.textContent = '';
        panel.classList.add('is-typing');
        typeNextCharacter();
    } else {
        finishTyping();
    }
    panel.onclick = event => {
        if (typing) {
            finishTyping();
            return;
        }
        const choice = event.target.closest('[data-demo-choice]')?.dataset.demoChoice;
        if (choice) onClick(choice);
    };
}

function guidePlantConversion(record) {
    setGuide('Marker placed. Now give it a purpose.');
    showGuidedChoice('<h2>Marker placed</h2><p>Make this a Plant Marker.</p><button type="button" data-demo-choice="plant">Make it a Plant</button>', choice => {
        if (choice !== 'plant') return;
        record.type = 'plant';
        record.demoType = 'plant';
        refreshDemoRecord(record);
        showGuidedChoice('<h2>Choose a plant preset</h2><p>The plant database can recommend matching profiles. For this guided example, use Lemon Myrtle.</p><label>Search plant presets<input value="Lemon Myrtle" readonly></label><button type="button" data-demo-choice="lemon-myrtle">Use Lemon Myrtle preset</button>', preset => {
            if (preset !== 'lemon-myrtle') return;
            record.name = 'Lemon Myrtle';
            record.demoExpanded = true;
            record.revealTitle = true;
            record.revealLines = 3;
            refreshDemoRecord(record);
            hideGuidedChoice();
            setGuide('Lemon Myrtle profile loaded. Its climate, uses and relationships now live in this place.');
            showDemoAction('Place another Marker →', 'note');
        });
    });
}

function guideNoteConversion(record) {
    setGuide('A second Marker is ready. Turn it into a Focus Point.');
    showGuidedChoice('<h2>What kind of Marker is this?</h2><p>Make it a Note, then choose a useful starting template.</p><button type="button" data-demo-choice="note">Make it a Note</button>', choice => {
        if (choice !== 'note') return;
        record.type = 'note';
        record.demoType = 'note';
        refreshDemoRecord(record);
        showGuidedChoice('<h2>Choose a Note template</h2><p>Notes can become stories, warnings, media and interactive Focus Points.</p><div class="tryit-guided-grid"><button type="button" data-demo-choice="poi">Point of Interest</button><button type="button" data-demo-choice="warning">Warning note<br><small>DON’T GO HERE</small></button></div>', template => {
            if (!NOTE_TEMPLATES[template]) return;
            record.demoContent = NOTE_TEMPLATES[template];
            record.name = template === 'warning' ? 'DON’T GO HERE' : 'Point of Interest';
            record.demoExpanded = true;
            record.revealTitle = true;
            record.revealLines = 3;
            refreshDemoRecord(record);
            hideGuidedChoice();
            setGuide('This Focus Point can later include sound, animation, images, alerts and changing observations.');
            showDemoAction('See how Areas work →', 'zone');
        });
    });
}

function guideAreaConversion(record) {
    setGuide('The final Marker can become the checkpoint for one defined Area.');
    showGuidedChoice('<h2>Why create an Area?</h2><p>An Area groups nearby plants and Focus Points. Entering its checkpoint can load only the knowledge belonging to that place.</p><button type="button" data-demo-choice="area">Convert to Area Checkpoint</button>', choice => {
        if (choice !== 'area') return;
        record.type = 'sub_checkpoint';
        record.demoType = 'zone';
        record.name = 'Citrus Guild';
        record.demoExpanded = true;
        record.isBoundary = true;
        record.revealTitle = true;
        record.revealLines = 3;
        refreshDemoRecord(record);
        setGuide('Area defined. Its use, microclimate and connected markers can now load together.');
        showGuidedChoice('<h2>Your first spatial story is ready</h2><p>You placed three Markers: a Plant profile, a Focus Point, and an Area checkpoint that can load the knowledge belonging to this place.</p><div class="tryit-guided-grid"><button type="button" data-demo-choice="reset">Try again</button><button type="button" data-demo-choice="finish">Finish demo</button></div>', action => {
            if (action === 'finish') returnToWelcome();
            if (action === 'reset') {
                markers.forEach(item => item.texture && gl?.deleteTexture(item.texture));
                markers = [];
                marker = null;
                demoStage = 'plant';
                renderInterface(simulatedMode);
            }
        });
    });
}

function armDemoPlacement(type) {
    if (markers.some(record => record.tutorialStage === type)) return;
    demoStage = type;
    const place = appRoot?.querySelector('[data-tryit-place]');
    place?.removeAttribute('hidden');
    const label = place?.querySelector('strong');
    if (label) label.textContent = 'Place a Marker';
    const instructions = {
        plant: 'Choose a new spot and place a Marker.',
        note: 'Choose another spot in your physical space for a Marker.',
        zone: 'Choose the central checkpoint for this Area.'
    };
    setGuide(instructions[type]);
    showGuidedChoice(`<h2>${type === 'plant' ? 'Place your first Marker' : type === 'note' ? 'Place a second Marker' : 'Place the Area checkpoint'}</h2><p>${instructions[type]} Keep this board open as your guide, then tap the breathing circle.</p>`, () => {});
}

function advanceDemo() {
    const nextStage = appRoot?.querySelector('[data-tryit-action]')?.dataset.nextStage;
    appRoot?.querySelector('[data-tryit-action]')?.setAttribute('hidden', '');
    if (nextStage === 'finish') return returnToWelcome();
    if (nextStage === 'reset') {
        markers.forEach(record => record.texture && gl?.deleteTexture(record.texture));
        markers = [];
        marker = null;
        markerType = 'marker';
        demoStage = 'plant';
        renderInterface(simulatedMode);
        if (simulatedMode) viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        return;
    }
    armDemoPlacement(nextStage || 'plant');
}

function updateSimulatedMarkers() {
    const layer = appRoot?.querySelector('[data-tryit-sim-markers]');
    if (!layer || !simulatedMode) return;
    layer.innerHTML = markers.map((record, index) => {
        const content = demoContentFor(record);
        const lines = content?.lines.slice(0, record.revealLines ?? content.lines.length) || [];
        return `<span class="tryit-sim-marker tryit-sim-marker-${record.demoType || record.type}${record.demoExpanded ? ' is-expanded' : ''}" style="--marker-index:${index}">${content && record.demoExpanded ? `<strong>${record.revealTitle === false ? '' : content.title}</strong>${lines.map(line => `<small>${line}</small>`).join('')}` : '·'}</span>`;
    }).join('');
}

function refreshDemoRecord(record) {
    if (record.texture) gl?.deleteTexture(record.texture);
    record.texture = createMarkerTexture(record);
    updateSimulatedMarkers();
}

function placementPosition() {
    return spatialPosition(hitMatrix, viewerMatrix, .14);
}

function placeMarker() {
    if (marker || markers.length >= 3 || markers.some(record => record.tutorialStage === demoStage)) return;
    const position = placementPosition();
    if (!position) {
        setGuide('Move your phone briefly, then tap the circle again.');
        return;
    }
    const type = demoStage;
    const sample = createMinimalMarkerDraft('sub_checkpoint', {
        name: type === 'plant' ? 'A living plant' : type === 'note' ? 'A small observation' : 'New Area',
        description: type === 'note' ? 'A small observation can become useful knowledge over time.' : ''
    });
    marker = { ...sample, position, type: 'marker', demoType: 'marker', tutorialStage: type, demoExpanded: false, revealTitle: true, revealLines: 3, texture: null };
    if (markers.length) marker = relateMinimalMarkers(marker, markers[0]?.id || 'demo-plant', 'part-of-story');
    marker.texture = createMarkerTexture(marker);
    markers.push(marker);
    const placedRecord = marker;
    appRoot?.querySelector('[data-tryit-place]')?.setAttribute('hidden', '');
    updateSimulatedMarkers();
    marker = null;
    if (type === 'plant') guidePlantConversion(placedRecord);
    else if (type === 'note') guideNoteConversion(placedRecord);
    else guideAreaConversion(placedRecord);
}

function renderInterface(simulated) {
    simulatedMode = simulated;
    appRoot.innerHTML = `<div class="tryit-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div class="tryit-stage"><button class="tryit-exit" type="button" data-tryit-exit>Finish demo</button><button class="tryit-place" type="button" data-tryit-place aria-label="Place a Marker" hidden><span aria-hidden="true"></span><strong>Place a Marker</strong></button><button class="tryit-demo-action" type="button" data-tryit-action hidden></button><section class="tryit-guided-choice tryit-tutorial-board" data-tryit-guided-choice aria-live="polite"></section><div class="tryit-final-actions" data-tryit-final-actions hidden><button type="button" data-tryit-reset>Try again</button><button type="button" data-tryit-finish>Finish demo</button></div><p class="tryit-guide" data-tryit-guide aria-live="polite">Welcome to TRY IT NOW.</p><div data-tryit-sim-markers></div></div></div>`;
    appRoot.querySelector('[data-tryit-exit]').addEventListener('click', returnToWelcome);
    appRoot.querySelector('[data-tryit-place]').addEventListener('click', placeMarker);
    appRoot.querySelector('[data-tryit-action]').addEventListener('click', advanceDemo);
    appRoot.querySelector('[data-tryit-reset]').addEventListener('click', () => { appRoot.querySelector('[data-tryit-action]').dataset.nextStage = 'reset'; advanceDemo(); });
    appRoot.querySelector('[data-tryit-finish]').addEventListener('click', returnToWelcome);
    showGuidedChoice('<h2>Welcome to TRY IT NOW</h2><p>This short spatial journey works like a game. You will place three Markers: a Plant, a Focus Point, and the checkpoint for an Area.</p><button type="button" data-demo-choice="continue">Press to continue</button>', choice => {
        if (choice === 'continue') armDemoPlacement('plant');
    });
}

function multiply(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
        out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
    }
    return out;
}

function billboardMatrix(position, scaleX = 1, scaleY = 1) {
    const camera = viewerMatrix || new Float32Array(16);
    let x = camera[12] - position.x;
    let z = camera[14] - position.z;
    const length = Math.hypot(x, z) || 1;
    x /= length; z /= length;
    return new Float32Array([z * scaleX, 0, -x * scaleX, 0, 0, scaleY, 0, 0, x, 0, z, 0, position.x, position.y, position.z, 1]);
}

function groundMatrix(position, scale = 1) {
    return new Float32Array([scale, 0, 0, 0, 0, 0, -scale, 0, 0, scale, 0, 0, position.x, position.y - .12, position.z, 1]);
}

function setupRenderer() {
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex, 'attribute vec3 p;attribute vec2 uv;uniform mat4 mvp;varying vec2 v;void main(){gl_Position=mvp*vec4(p,1.);v=uv;}');
    gl.compileShader(vertex);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment, 'precision mediump float;varying vec2 v;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,v);}');
    gl.compileShader(fragment);
    program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.20,-.08,0,0,1, .20,-.08,0,1,1, .20,.08,0,1,0, -.20,-.08,0,0,1, .20,.08,0,1,0, -.20,.08,0,0,0]), gl.STATIC_DRAW);
}

function unusedLegacyMarkerTexture() {
    if (!gl) return;
    const label = document.createElement('canvas');
    label.width = 360; label.height = 112;
    const ctx = label.getContext('2d');
    const type = { plant: 'Plant', note: 'Note', poi: 'Point of interest', marker: 'Marker' }[markerType];
    ctx.fillStyle = 'rgba(17,58,32,.92)'; ctx.beginPath(); ctx.roundRect(0, 0, 360, 112, 18); ctx.fill();
    ctx.fillStyle = '#dcef95'; ctx.beginPath(); ctx.arc(36, 56, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#173522'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('•', 36, 64);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(markerName, 68, 48);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '14px sans-serif'; ctx.fillText(type, 68, 75);
    texture ||= gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function drawWrappedTextureText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(word => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((value, index) => {
        const lastVisibleLine = index === maxLines - 1 && lines.length > maxLines;
        let visible = value;
        if (lastVisibleLine) {
            while (visible && ctx.measureText(`${visible}…`).width > maxWidth) visible = visible.slice(0, -1);
            visible += '…';
        }
        ctx.fillText(visible, x, y + index * lineHeight);
    });
}

function createSpatialKnowledgeTexture(record) {
    const content = demoContentFor(record);
    if (!gl || !content) return null;
    const label = document.createElement('canvas');
    label.width = 1120;
    label.height = 720;
    const ctx = label.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, label.width, label.height);
    gradient.addColorStop(0, 'rgba(10,32,21,.72)');
    gradient.addColorStop(1, 'rgba(16,42,30,.40)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(18, 18, 1084, 684, 52);
    ctx.fill();
    ctx.strokeStyle = `${content.accent}b8`;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = content.accent;
    ctx.beginPath();
    ctx.arc(82, 88, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    if (record.revealTitle !== false) {
        ctx.fillStyle = '#fff';
        ctx.font = '650 43px system-ui, sans-serif';
        drawWrappedTextureText(ctx, content.title, 130, 102, 900, 50, 2);
    }
    content.lines.slice(0, record.revealLines ?? content.lines.length).forEach((line, index) => {
        const split = line.indexOf('  ');
        const rowY = 232 + index * 150;
        ctx.fillStyle = content.accent;
        ctx.font = '750 27px system-ui, sans-serif';
        ctx.fillText(line.slice(0, split), 62, rowY);
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        ctx.font = '31px system-ui, sans-serif';
        drawWrappedTextureText(ctx, line.slice(split + 2), 62, rowY + 42, 990, 38, 2);
    });
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createBoundaryTexture() {
    if (!gl) return null;
    const label = document.createElement('canvas');
    label.width = 512; label.height = 512;
    const ctx = label.getContext('2d');
    ctx.strokeStyle = 'rgba(137,200,239,.78)';
    ctx.lineWidth = 9;
    ctx.setLineDash([22, 14]);
    ctx.beginPath();
    ctx.ellipse(256, 256, 218, 142, 0, 0, Math.PI * 2);
    ctx.stroke();
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createMarkerTexture(record) {
    if (!gl) return null;
    if (record.demoExpanded) return createSpatialKnowledgeTexture(record);
    const label = document.createElement('canvas');
    label.width = 512;
    label.height = 128;
    const ctx = label.getContext('2d');
    if (record.type === 'plant') {
        ctx.fillStyle = '#4f8d3f';
        ctx.beginPath();
        ctx.arc(256, 64, 58, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '54px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌱', 256, 84);
    } else if (record.type === 'marker' || record.type === 'sub_checkpoint') {
        ctx.fillStyle = '#365342';
        ctx.beginPath();
        ctx.arc(256, 64, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 42px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◆', 256, 80);
    } else {
        ctx.fillStyle = record.type === 'note' ? '#d6a928' : '#357fc4';
        ctx.beginPath();
        ctx.roundRect(8, 10, 496, 108, 28);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 35px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(record.type === 'note' ? '✎  Note' : '◆  Area', 256, 77);
    }
    const markerTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, markerTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return markerTexture;
}

function drawMarker(view) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const p = gl.getAttribLocation(program, 'p'); const uv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    markers.forEach(record => {
        if (!record.texture) return;
        const compact = !record.demoExpanded;
        const model = billboardMatrix(record.position, compact ? .38 : 2.75, compact ? .38 : 4.25);
        const mvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, record.texture);
        gl.uniform1i(gl.getUniformLocation(program, 't'), 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (record.isBoundary) {
            record.boundaryTexture ||= createBoundaryTexture();
            const boundaryMvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, groundMatrix(record.position, 4.6)));
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, boundaryMvp);
            gl.bindTexture(gl.TEXTURE_2D, record.boundaryTexture);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    });
}

async function startImmersive() {
    if (!navigator.xr || !window.isSecureContext || !await navigator.xr.isSessionSupported('immersive-ar')) return false;
    try {
        session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['dom-overlay', 'hit-test'], optionalFeatures: ['local-floor'], domOverlay: { root: appRoot } });
        canvas = document.createElement('canvas'); canvas.className = 'tryit-xr-canvas'; document.body.append(canvas);
        gl = canvas.getContext('webgl', { alpha: true, antialias: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: true }) });
        try { referenceSpace = await session.requestReferenceSpace('local-floor'); } catch { referenceSpace = await session.requestReferenceSpace('local'); }
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        setupRenderer();
        session.addEventListener('select', () => { if (!marker) placeMarker(); });
        session.addEventListener('end', () => { const shouldReturn = !ending; session = null; clearSessionState(); if (shouldReturn) window.renderLaunchScreen(); ending = false; });
        const draw = (_time, frame) => {
            if (!session || frame.session !== session || !gl) return;
            session.requestAnimationFrame(draw);
            const pose = frame.getViewerPose(referenceSpace);
            viewerMatrix = pose ? Float32Array.from(pose.transform.matrix) : null;
            const hit = hitTestSource && frame.getHitTestResults(hitTestSource)[0];
            const hitPose = hit?.getPose(referenceSpace);
            hitMatrix = hitPose ? Float32Array.from(hitPose.transform.matrix) : null;
            const layer = frame.session.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            for (const view of pose?.views || []) { const viewport = layer.getViewport(view); gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height); drawMarker(view); }
        };
        session.requestAnimationFrame(draw);
        return true;
    } catch {
        const active = session; session = null; clearSessionState(); active?.end().catch(() => {});
        return false;
    }
}

export function openTemporaryArDemoWindow(app) {
    return startTemporaryArDemo(app);
}

export async function startTemporaryArDemo(app) {
    appRoot = app;
    clearSessionState();
    const immersive = await startImmersive();
    renderInterface(!immersive);
    if (!immersive) viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
