/**
 * TRY IT NOW — a deliberately small, self-contained AR placement demo.
 * It never opens a dashboard or a draggable window before placement.
 */
import { spatialPosition } from '../services/spatialPlacement.js';
import { createMinimalMarkerDraft, relateMinimalMarkers } from '../services/markerWorkflow.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb } from '../services/spatialSphereRenderer.js';
import { createSpatialTetherRenderer, destroySpatialTetherRenderer, drawSpatialTether } from '../services/spatialTetherRenderer.js';

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
let sphereRenderer = null;
let tetherRenderer = null;
let ending = false;
let demoStage = 'plant';
let boardTypingTimer = null;
let aimRevealTimer = null;
let pointerPressTimer = null;
let knowledgeTourTimer = null;
let introNarrationTimer = null;
let introSceneStartedAt = 0;
let introSceneActive = true;
let introWorldAnchor = null;
let introNoteTexture = null;
let introNoteCanvas = null;
let introBoardVisibleBody = '';
let introBoardTextureDirty = true;
let introKnowledgeTexture = null;
let introTaglineVisible = true;
let introKnowledgeVisible = false;
let introBoardTitle = 'NourishLand XR - a quick AR demo';
let introBoardBody = 'A short guided demo of Plant orbs, Notes and Areas.';
let placementReady = false;
let demoHeldIndex = -1;
let suppressDemoMarkerClick = false;
let suppressSessionSelectUntil = 0;
const DEMO_SEQUENCE = ['plant', 'plant2', 'note', 'zone'];
const DEMO_ORB_MATERIALS = Object.freeze({
    red: {
        shell: [0.82, 0.15, 0.12],
        core: [1, 0.43, 0.3],
        radius: 0.07,
        style: '--demo-orb-size:52px;--demo-orb-light:#ffd8d1;--demo-orb-mid:#e65345;--demo-orb-dark:#7c1818;--demo-orb-core-light:#ffe8df;--demo-orb-core-mid:#ef6757;--demo-orb-core-dark:#8f1f1b'
    },
    green: {
        shell: [0.34, 0.72, 0.28],
        core: [0.75, 0.95, 0.42],
        radius: 0.074,
        style: '--demo-orb-size:62px;--demo-orb-light:#efffd8;--demo-orb-mid:#79ad65;--demo-orb-dark:#315d3c;--demo-orb-core-light:#f2ffd9;--demo-orb-core-mid:#b9e66f;--demo-orb-core-dark:#3f7f38'
    }
});
const BIOMAP_CATEGORIES = Object.freeze({
    FOOD: [],
    FOREST: [],
    'PLANT LITERACY': ['DWARF', 'DECIDUOUS', 'EVERGREEN', 'ANNUAL', 'PERENNIAL'],
    RELATIONSHIPS: [],
    FRUIT: [],
    FLOWER: [],
    SEED: [],
    GUILD: [],
    'MICRO CLIMATE': ['TROPICAL', 'SUBTROPICAL', 'WARM TEMPERATE', 'COOL TEMPERATE', 'MEDITERRANEAN', 'ARID'],
    USES: ['CULINARY', 'MEDICINAL', 'INDUSTRIAL'],
    PROPAGATION: ['GRAFTING', 'GERMINATION', 'MARCOTTS', 'CUTTINGS', 'CLONING'],
    LAYERS: ['CANOPY', 'LOW TREE', 'SHRUB', 'HERBACEOUS', 'GROUNDCOVER', 'RHIZOSPHERE', 'VERTICAL']
});
const INTRO_KNOWLEDGE_KEYWORDS = Object.keys(BIOMAP_CATEGORIES);
const DEMO_CONTENT = Object.freeze({
    plant: { title: 'Plant · Lemon Myrtle', accent: '#b7e895', lines: ['CLIMATE  Warm temperate · sheltered', 'USES  Tea · aroma · habitat', 'RELATIONSHIPS  Pollinators · understory'] },
    note: { title: 'Focus Point · Seasonal observation', accent: '#f0cf70', lines: ['STORY  New growth after summer rain', 'MEDIA  Sound · animation · images', 'ACTION  Revisit · compare · update'] },
    zone: { title: 'Area · Citrus Guild', accent: '#89c8ef', lines: ['BOUNDARY  One defined place', 'USE  Guild · microclimate · crop', 'FLOW  Loads this Area’s markers and stories'] }
});
const LEMON_MYRTLE_KNOWLEDGE = Object.freeze({
    title: 'Lemon Myrtle',
    left: [
        ['USES', 'Tea · spice · aromatic oils'],
        ['GROWTH', 'Warm temperate · sheltered edge'],
        ['FRUIT & FLOWER', 'Cream flowers · small nutlets']
    ],
    right: [
        ['ORIGIN', 'Subtropical eastern Australia'],
        ['SCIENTIFIC', 'Backhousia citriodora · Myrtaceae'],
        ['STORY', 'First Nations knowledge · living culture']
    ]
});
const MORINGA_KNOWLEDGE = Object.freeze({
    title: 'Moringa Tree',
    left: [
        ['USES', 'Nutritious leaves · shade · mulch'],
        ['GROWTH', 'Warm climate · sun · free drainage'],
        ['FRUIT & FLOWER', 'White flowers · long seed pods']
    ],
    right: [
        ['ORIGIN', 'South Asia · tropical regions'],
        ['SCIENTIFIC', 'Moringa oleifera · Moringaceae'],
        ['STORY', 'Food cultures · medicine · resilience']
    ]
});
const knowledgeFor = record => record.demoPlantPreset === 'moringa' ? MORINGA_KNOWLEDGE : LEMON_MYRTLE_KNOWLEDGE;
const NOTE_TEMPLATES = Object.freeze({
    poi: { title: 'Point of Interest · Seasonal observation', accent: '#f0cf70', lines: ['PURPOSE  Draw attention to this place', 'MEDIA  Sound · animation · images', 'ACTION  Revisit · compare · update'] },
    plaque: { title: 'Garden plaque · Grow gently', accent: '#f2d997', lines: ['“A garden teaches us to care for what comes next.”', 'Pause · notice · return', 'A small thought anchored to this living place'] },
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
    placementReady = false;
    demoHeldIndex = -1;
    suppressSessionSelectUntil = 0;
    clearTimeout(boardTypingTimer);
    clearTimeout(aimRevealTimer);
    clearTimeout(pointerPressTimer);
    clearTimeout(knowledgeTourTimer);
    clearTimeout(introNarrationTimer);
    boardTypingTimer = null;
    aimRevealTimer = null;
    pointerPressTimer = null;
    knowledgeTourTimer = null;
    introNarrationTimer = null;
    introSceneStartedAt = 0;
    introSceneActive = true;
    introWorldAnchor = null;
    if (introNoteTexture) gl?.deleteTexture(introNoteTexture);
    if (introKnowledgeTexture) gl?.deleteTexture(introKnowledgeTexture);
    introNoteTexture = null;
    introNoteCanvas = null;
    introBoardVisibleBody = '';
    introBoardTextureDirty = true;
    introKnowledgeTexture = null;
    introTaglineVisible = true;
    introKnowledgeVisible = false;
    markers.forEach(record => {
        if (record.texture) gl?.deleteTexture(record.texture);
        if (record.boundaryTexture) gl?.deleteTexture(record.boundaryTexture);
    });
    destroySpatialSphereRenderer(gl, sphereRenderer);
    destroySpatialTetherRenderer(gl, tetherRenderer);
    sphereRenderer = null;
    tetherRenderer = null;
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

function showDemoAction(nextStage) {
    const messages = {
        plant2: ['Add a second Plant', 'The first profile now lives in space. Let’s try Moringa in another nearby position.'],
        note: ['Two living profiles', 'Both Plants now carry their own spatial knowledge. Next, place a simple Note nearby.'],
        zone: ['Focus Point complete', 'This Note can grow into sound, animation, images or alerts. Next, create the checkpoint for an Area.']
    };
    const [title, text] = messages[nextStage] || ['Continue the journey', 'Move to the next tutorial step.'];
    showGuidedChoice(`<h2>${title}</h2><p>${text}</p><button type="button" data-demo-choice="continue">Continue</button>`, choice => {
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

function showGuidedChoice(html, onClick = () => {}, options = {}) {
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
    let completionNotified = false;
    const finishTyping = () => {
        clearTimeout(boardTypingTimer);
        if (paragraph) paragraph.textContent = fullText;
        typing = false;
        revealTargets.forEach(target => target.classList.remove('is-awaiting-text'));
        panel.classList.remove('is-typing');
        if (!completionNotified) {
            completionNotified = true;
            options.onTextComplete?.();
        }
    };
    const typeNextCharacter = () => {
        if (!typing || !paragraph) return;
        typedLength += 1;
        paragraph.textContent = fullText.slice(0, typedLength);
        if (typedLength >= fullText.length) return finishTyping();
        boardTypingTimer = setTimeout(typeNextCharacter, 46);
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

function showIntroBoard(title, body, buttonLabel, onContinue, options = {}) {
    introSceneActive = true;
    introBoardTitle = title;
    introBoardBody = body;
    introBoardVisibleBody = '';
    introBoardTextureDirty = true;
    introSceneStartedAt = performance.now();
    clearTimeout(boardTypingTimer);
    const board = appRoot?.querySelector('[data-tryit-guided-choice]');
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    let typedLength = 0;
    let typing = true;
    let completionNotified = false;
    const finishTyping = () => {
        clearTimeout(boardTypingTimer);
        introBoardVisibleBody = body;
        introBoardTextureDirty = true;
        const paragraph = board?.querySelector('p');
        if (paragraph) paragraph.textContent = body;
        board?.classList.remove('is-typing');
        typing = false;
        if (!completionNotified) {
            completionNotified = true;
            options.onTextComplete?.();
        }
    };
    const typeNextCharacter = () => {
        if (!typing) return;
        typedLength = Math.min(body.length, typedLength + 1);
        introBoardVisibleBody = body.slice(0, typedLength);
        introBoardTextureDirty = true;
        const paragraph = board?.querySelector('p');
        if (paragraph) paragraph.textContent = introBoardVisibleBody;
        if (typedLength >= body.length) return finishTyping();
        const typedCharacter = body[typedLength - 1] || '';
        const typingDelay = /[.!?]/.test(typedCharacter) ? 420 : /[,;]/.test(typedCharacter) ? 220 : 105;
        boardTypingTimer = setTimeout(typeNextCharacter, typingDelay);
    };
    if (board) {
        board.classList.add('is-welcome-board');
        board.classList.add('is-typing');
        board.classList.remove('is-entering', 'is-leaving');
        board.innerHTML = `<small>LIVE AR TUTORIAL</small><h2>${title}</h2><div class="tryit-board-text-window"><p></p></div>`;
        board.hidden = false;
        void board.offsetWidth;
        board.classList.add('is-entering');
        board.onclick = () => {
            if (typing) finishTyping();
        };
    }
    if (continueButton && buttonLabel) {
        continueButton.textContent = buttonLabel;
        continueButton.hidden = false;
        continueButton.onclick = onContinue;
    } else if (continueButton) {
        continueButton.hidden = true;
        continueButton.onclick = null;
    }
    boardTypingTimer = setTimeout(typeNextCharacter, 1100);
    setGuide(`${title}. ${body}`);
}

function finishIntroBoard() {
    clearTimeout(boardTypingTimer);
    introSceneActive = false;
    appRoot?.querySelector('[data-tryit-intro]')?.setAttribute('hidden', '');
    const board = appRoot?.querySelector('[data-tryit-guided-choice]');
    board?.classList.remove('is-welcome-board', 'is-entering', 'is-leaving');
    if (board) board.hidden = true;
    appRoot?.querySelector('[data-tryit-intro-continue]')?.setAttribute('hidden', '');
}

function runArWelcomeTutorial() {
    showIntroBoard(
        'NourishLand XR - a quick AR demo',
        'A short guided demo of Plant orbs, Notes and Areas.',
        'Continue',
        () => {
            const place = appRoot?.querySelector('[data-tryit-place]');
            place?.removeAttribute('hidden');
            requestAnimationFrame(() => place?.classList.add('is-revealing'));
            showIntroBoard(
                'INTRODUCING AIM',
                'The glowing circle is your pointer. Press it to place a Plant orb one metre ahead.',
                '',
                null,
                {
                    onTextComplete: () => {
                        clearTimeout(aimRevealTimer);
                        aimRevealTimer = setTimeout(() => armDemoPlacement('plant', { direct: true }), 900);
                    }
                }
            );
        }
    );
}

function runKnowledgeTour(record, onComplete) {
    const topics = [
        ['left-0', 'USES'],
        ['left-1', 'GROWTH CONDITIONS'],
        ['left-2', 'FRUIT & FLOWER'],
        ['right-0', 'ORIGIN'],
        ['right-1', 'SCIENTIFIC'],
        ['right-2', 'STORY']
    ];
    let index = 0;
    clearTimeout(knowledgeTourTimer);
    const revealNext = () => {
        const [branchKey, topic] = topics[index];
        record.demoActiveBranch = branchKey;
        if (!simulatedMode) {
            if (record.texture) gl?.deleteTexture(record.texture);
            record.texture = createMarkerTexture(record);
        }
        const profile = appRoot?.querySelector(`[data-demo-plant-profile="${markers.indexOf(record)}"]`);
        profile?.querySelectorAll('[data-plant-branch]').forEach(cell => {
            const open = cell.dataset.plantBranch === branchKey;
            cell.classList.toggle('is-open', open);
            cell.classList.toggle('is-guided-highlight', open);
            cell.setAttribute('aria-expanded', String(open));
            cell.querySelector('small')?.setAttribute('aria-hidden', String(!open));
        });
        setGuide(`${topic} is connected to this living Plant Profile.`);
        index += 1;
        if (index < topics.length) knowledgeTourTimer = setTimeout(revealNext, 900);
        else knowledgeTourTimer = setTimeout(onComplete, 700);
    };
    revealNext();
}

function guidePlantConversion(record) {
    const moringa = record.tutorialStage === 'plant2';
    const plantName = moringa ? 'Moringa Tree' : 'Lemon Myrtle';
    setGuide(`${moringa ? 'Your second' : 'Your first'} Plant orb is placed.`);
    const completeConversion = () => {
        record.type = 'plant';
        record.demoType = 'plant';
        record.name = plantName;
        record.demoPlantPreset = moringa ? 'moringa' : 'lemon-myrtle';
        record.demoExpanded = true;
        record.profileRevealStarted = performance.now();
        record.demoActiveBranch = '';
        record.informationPosition = plantInformationPosition(record);
        record.revealTitle = true;
        record.revealLines = 3;
        refreshDemoRecord(record);
        navigator.vibrate?.([45, 40, 75]);
        showGuidedChoice(`<h2>${moringa ? 'Moringa comes alive' : 'The profile comes alive'}</h2><p>Its information honeycomb connects uses, growing conditions, origin, scientific knowledge, and fruit or flower details. Hover or tap a cell to explore.</p>`, () => {}, {
            onTextComplete: () => runKnowledgeTour(record, () => {
                showDemoAction(moringa ? 'note' : 'plant2');
            })
        });
    };
    showIntroBoard(
        moringa ? 'A SECOND PLANT ORB' : 'A SIMPLE PLANT ORB',
        moringa
            ? 'The green Moringa orb keeps its colour as it becomes a Plant marker.'
            : 'The red orb keeps its colour as it becomes a Plant marker.',
        moringa ? 'Create Moringa profile' : 'Create Plant Profile',
        () => {
            suppressSessionSelectUntil = performance.now() + 700;
            finishIntroBoard();
            completeConversion();
        }
    );
}

function guideNoteConversion(record) {
    setGuide('Your Note is placed.');
    showGuidedChoice('<h2>Add a Note</h2><p>A Note is a soft, flat information bubble attached to its place. Use it for an observation, guidance, memory, or anything worth noticing again.</p><button type="button" data-demo-choice="continue">Continue</button>', choice => {
        if (choice !== 'continue') return;
        record.demoExpanded = true;
        record.revealTitle = true;
        record.revealLines = 3;
        refreshDemoRecord(record);
        hideGuidedChoice();
        setGuide('The new Note stays softly connected to this place and can be grabbed whenever you want to adjust it.');
        showDemoAction('zone');
    });
}

function guideAreaConversion(record) {
    setGuide('The final Marker can become the checkpoint for one defined Area.');
    showGuidedChoice('<h2>Give the Area a Totem</h2><p>A Totem is the framed information centre of an Area. Knowledge, guidance, and Plants waiting for precise placement can gather around it.</p><button type="button" data-demo-choice="continue">Continue</button>', choice => {
        if (choice !== 'continue') return;
        record.type = 'sub_checkpoint';
        record.demoType = 'zone';
        record.name = 'Citrus Guild';
        record.demoExpanded = true;
        record.demoContent = {
            title: 'Citrus Guild Totem',
            accent: '#89c8ef',
            lines: ['A living classroom for citrus, herbs and pollinators.', 'Notice how shade and moisture change across this Area.', 'Plants waiting for precise placement gather around this Totem.'],
            bubbles: ['CITRUS GUILD', 'LIVING CLASSROOM', 'SHADE + MOISTURE', 'CITRUS · HERBS · POLLINATORS', 'CONNECTED PLANTS']
        };
        record.isBoundary = false;
        record.revealTitle = true;
        record.revealLines = 3;
        refreshDemoRecord(record);
        setGuide('Area defined. Its use, microclimate and connected markers can now load together.');
        showGuidedChoice('<h2>Your spatial garden is alive</h2><p>You placed two Plants, a Note, and a framed Area Totem with three attached information bubbles.</p><div class="tryit-guided-grid"><button type="button" data-demo-choice="reset">Try again</button><button type="button" data-demo-choice="finish">Finish demo</button></div>', action => {
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

function armDemoPlacement(type, { direct = false } = {}) {
    if (markers.some(record => record.tutorialStage === type)) return;
    demoStage = type;
    placementReady = false;
    const place = appRoot?.querySelector('[data-tryit-place]');
    const simulatedAim = simulatedMode
        ? ({ plant: { x: 42, y: 52 }, plant2: { x: 62, y: 47 }, note: { x: 70, y: 62 }, zone: { x: 82, y: 42 } })[type]
        : { x: 50, y: 50 };
    if (place && simulatedAim) {
        place.dataset.aimX = String(simulatedAim.x);
        place.dataset.aimY = String(simulatedAim.y);
        place.style.setProperty('--aim-x', `${simulatedAim.x}%`);
        place.style.setProperty('--aim-y', `${simulatedAim.y}%`);
    }
    clearTimeout(aimRevealTimer);
    if (direct) {
        setGuide('Press the glowing centre pointer to place the Plant orb.');
        placementReady = true;
        place?.removeAttribute('hidden');
        place?.classList.add('is-revealing', 'is-ready');
        return;
    }
    place?.setAttribute('hidden', '');
    place?.classList.remove('is-revealing', 'is-ready');
    const label = place?.querySelector('strong');
    if (label) label.textContent = '';
    setGuide(['plant', 'plant2'].includes(type)
        ? 'Look around slowly. The centre aim will appear when you are ready.'
        : type === 'note'
            ? 'Take in the space before choosing the next position.'
            : 'Look for the natural centre of this Area.');
    const introductions = {
        plant: ['Place an example Plant', 'Look around slowly and choose a calm, clear spot. Continue when you are ready, then press the aiming circle to place the orb.'],
        plant2: ['Let’s try Moringa', 'Choose another nearby position. Continue when ready, then press the aiming circle to place its orb.'],
        note: ['Find another place', 'Move to a different nearby spot. Let the scene settle before the aiming circle appears again.'],
        zone: ['Find the heart of the Area', 'Look toward the centre of the place you want this Area to gather. The aiming circle will appear when this introduction finishes.']
    };
    const [title, introduction] = introductions[type];
    showGuidedChoice(`<h2>${title}</h2><p>${introduction}</p><button type="button" data-demo-choice="continue">Continue</button>`, choice => {
        if (choice !== 'continue') return;
        hideGuidedChoice();
        setGuide(type === 'plant'
            ? 'Press the aiming circle to place the example Plant orb.'
            : type === 'plant2'
                ? 'Press the aiming circle to place the Moringa orb.'
                : type === 'note'
                    ? 'Tap the circle to place a Note.'
                    : 'Tap the circle to place the Area Totem.');
        placementReady = true;
        place?.removeAttribute('hidden');
        requestAnimationFrame(() => place?.classList.add('is-revealing', 'is-ready'));
    });
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

function simulatedAnchorStyle(anchor) {
    return `--marker-x:${Number(anchor.x).toFixed(2)}%;--marker-y:${Number(anchor.y).toFixed(2)}%`;
}

function tetherMetrics(offset) {
    return {
        length: Math.max(8, Math.hypot(offset.x, offset.y)),
        angle: Math.atan2(offset.y, offset.x) * 180 / Math.PI
    };
}

function clampPlantPanelOffset(anchor, offset) {
    const viewportWidth = Math.max(320, window.innerWidth || 320);
    const viewportHeight = Math.max(320, window.innerHeight || 640);
    const profileWidth = Math.min(viewportWidth * 0.9, 520);
    const profileHeight = Math.min(310, Math.max(240, viewportWidth * 0.5));
    const anchorX = viewportWidth * anchor.x / 100;
    const anchorY = viewportHeight * anchor.y / 100;
    const minimumX = 16 + profileWidth / 2 - anchorX;
    const maximumX = viewportWidth - 16 - profileWidth / 2 - anchorX;
    const minimumY = 16 + profileHeight / 2 - anchorY;
    const maximumY = viewportHeight - 16 - profileHeight / 2 - anchorY;
    return {
        x: Math.min(maximumX, Math.max(minimumX, offset.x)),
        y: Math.min(maximumY, Math.max(minimumY, offset.y))
    };
}

function defaultPlantPanelOffset(anchor) {
    const viewportWidth = Math.max(320, window.innerWidth || 320);
    const viewportHeight = Math.max(320, window.innerHeight || 640);
    const profileHeight = Math.min(310, Math.max(240, viewportWidth * 0.5));
    const anchorY = viewportHeight * anchor.y / 100;
    const upwardRoom = anchorY - 72 - profileHeight / 2;
    if (upwardRoom >= 48) return clampPlantPanelOffset(anchor, { x: 0, y: -Math.min(132, upwardRoom) });
    const profileWidth = Math.min(viewportWidth * 0.9, 520);
    const anchorX = viewportWidth * anchor.x / 100;
    const rightRoom = viewportWidth - 16 - profileWidth / 2 - anchorX;
    const leftRoom = 16 + profileWidth / 2 - anchorX;
    return clampPlantPanelOffset(anchor, {
        x: Math.abs(rightRoom) >= Math.abs(leftRoom)
            ? Math.max(64, Math.min(150, rightRoom))
            : Math.min(-64, Math.max(-150, leftRoom)),
        y: 0
    });
}

function capturedSimulatedAnchor() {
    const place = appRoot?.querySelector('[data-tryit-place]');
    const x = Number(place?.dataset.aimX);
    const y = Number(place?.dataset.aimY);
    return {
        x: Number.isFinite(x) ? x : 50,
        y: Number.isFinite(y) ? y : 50
    };
}

function demoOrbStyle(record) {
    return DEMO_ORB_MATERIALS[record?.demoOrbColor]?.style || '';
}

function renderSimulatedPlant(record, index, anchor, offset) {
    const anchorVariables = simulatedAnchorStyle(anchor);
    const orbAppearance = demoOrbStyle(record);
    const orbLabel = record.demoExpanded ? `Hide ${record.name || 'Plant'} profile` : `Open ${record.name || 'Plant'} profile`;
    const anchoredOrb = `<span class="tryit-sim-marker tryit-sim-marker-plant is-demo-orb has-plant-profile${record.demoExpanded ? ' has-information' : ''}${demoHeldIndex === index ? ' is-held' : ''}" data-demo-marker-index="${index}" style="${anchorVariables};${orbAppearance};--depth-scale:${record.demoDepthScale || 1}" role="button" tabindex="0" aria-label="${orbLabel}"><span class="tryit-sim-orb is-plant" aria-hidden="true"></span></span>`;
    if (!record.demoExpanded) return anchoredOrb;
    const tether = tetherMetrics(offset);
    const profileVariables = `${anchorVariables};--panel-x:${offset.x}px;--panel-y:${offset.y}px`;
    return `${anchoredOrb}<svg class="tryit-sim-plant-tether" data-demo-plant-tether="${index}" style="${anchorVariables};--tether-length:${tether.length.toFixed(2)}px;--tether-angle:${tether.angle.toFixed(2)}deg" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true"><path d="M 0 9 C 28 2, 70 16, 100 9"></path></svg><span class="tryit-sim-plant-profile" data-demo-plant-profile="${index}" style="${profileVariables}" role="group" aria-label="${record.name || 'Plant'} information">${plantKnowledgeMarkup(knowledgeFor(record), record.demoActiveBranch)}</span>`;
}

function renderSimulatedTotem(record, index, anchor) {
    const content = demoContentFor(record);
    const bubbles = (content?.bubbles || content?.lines || []).filter(Boolean).slice(0, 5);
    return `<span class="tryit-sim-marker tryit-sim-marker-zone tryit-sim-totem-system${demoHeldIndex === index ? ' is-held' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};--depth-scale:${record.demoDepthScale || 1}" role="button" tabindex="0" aria-label="${record.name || 'Area'} Totem information"><svg class="tryit-sim-totem-branches" viewBox="0 0 360 430" preserveAspectRatio="none" aria-hidden="true"><path d="M174 166 C124 142 84 106 66 72"/><path d="M180 162 C194 124 218 92 254 70"/><path d="M188 180 C230 182 260 165 298 144"/><path d="M171 225 C128 226 92 247 48 255"/><path d="M189 225 C228 226 254 250 286 264"/></svg><span class="tryit-sim-totem-pillar" aria-hidden="true"></span>${bubbles.map((text, cardIndex) => `<span class="tryit-sim-totem-card tryit-sim-totem-card-${cardIndex + 1}">${text}</span>`).join('')}</span>`;
}

function toggleDemoPlantProfile(record) {
    if (!record || record.demoType !== 'plant') return;
    record.demoExpanded = !record.demoExpanded;
    if (record.demoExpanded) {
        record.profileRevealStarted = performance.now();
        if (!record.demoActiveBranch) record.demoActiveBranch = 'left-0';
    }
    refreshDemoRecord(record);
    setGuide(record.demoExpanded
        ? `${record.name || 'Plant'} profile opened gently. Press the living orb again to hide it.`
        : `${record.name || 'Plant'} profile hidden. The living orb remains anchored in place.`);
}

function updateSimulatedMarkers() {
    const layer = appRoot?.querySelector('[data-tryit-sim-markers]');
    if (!layer || !simulatedMode) return;
    layer.innerHTML = markers.map((record, index) => {
        const content = demoContentFor(record);
        const lines = content?.lines.slice(0, record.revealLines ?? content.lines.length) || [];
        const anchor = record.simulatedAnchor || { x: 50, y: 50 };
        if (record.demoType === 'plant') {
            const offset = record.demoPanelOffset || (record.demoPanelOffset = defaultPlantPanelOffset(anchor));
            return renderSimulatedPlant(record, index, anchor, offset);
        }
        if (record.demoType === 'zone' && record.demoExpanded) return renderSimulatedTotem(record, index, anchor);
        const defaultOffsets = { note: { x: 0, y: 0 }, zone: { x: 0, y: 0 } };
        const offset = record.demoPanelOffset || (record.demoPanelOffset = defaultOffsets[record.demoType] || { x: 0, y: 0 });
        const collapsible = record.demoExpanded ? ' role="button" tabindex="0" aria-label="Move this information panel. Tap to hide."' : '';
        const compactContent = record.demoType === 'note' && content ? `<strong>${content.title}</strong>` : '';
        const orbProjection = record.demoType === 'marker' ? '<span class="tryit-sim-orb" aria-hidden="true"></span>' : '';
        return `<span class="tryit-sim-marker tryit-sim-marker-${record.demoType || record.type}${record.demoOrbColor ? ' is-demo-orb' : ''}${record.demoExpanded ? ' is-expanded' : ''}${demoHeldIndex === index ? ' is-held' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};${demoOrbStyle(record)};--panel-x:${offset.x}px;--panel-y:${offset.y}px;--depth-scale:${record.demoDepthScale || 1}"${collapsible}>${orbProjection}${content && record.demoExpanded ? `<strong>${record.revealTitle === false ? '' : content.title}</strong>${lines.map(line => `<small>${line}</small>`).join('')}` : compactContent}</span>`;
    }).join('');
    bindSimulatedInformationPanels(layer);
}

function applyPlantPanelOffset(profile, tether, offset) {
    const metrics = tetherMetrics(offset);
    profile.style.setProperty('--panel-x', `${offset.x}px`);
    profile.style.setProperty('--panel-y', `${offset.y}px`);
    tether?.style.setProperty('--tether-length', `${metrics.length}px`);
    tether?.style.setProperty('--tether-angle', `${metrics.angle}deg`);
}

function bindSimulatedInformationPanels(layer) {
    layer.querySelectorAll('.tryit-sim-marker').forEach(compactMarker => {
        const index = Number(compactMarker.dataset.demoMarkerIndex);
        const record = markers[index];
        if (!record) return;
        let holdTimer = null;
        let holdGesture = null;
        compactMarker.addEventListener('pointerdown', event => {
            if (demoHeldIndex === index) return;
            holdGesture = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
            compactMarker.setPointerCapture?.(event.pointerId);
            compactMarker.classList.add('is-drag-ready');
            holdTimer = setTimeout(() => {
                demoHeldIndex = index;
                suppressDemoMarkerClick = true;
                record.simulatedAnchor = { x: 50, y: 50 };
                compactMarker.style.setProperty('--marker-x', '50%');
                compactMarker.style.setProperty('--marker-y', '50%');
                layer.querySelector(`[data-demo-plant-tether="${index}"]`)?.style.setProperty('--marker-x', '50%');
                layer.querySelector(`[data-demo-plant-tether="${index}"]`)?.style.setProperty('--marker-y', '50%');
                layer.querySelector(`[data-demo-plant-profile="${index}"]`)?.style.setProperty('--marker-x', '50%');
                layer.querySelector(`[data-demo-plant-profile="${index}"]`)?.style.setProperty('--marker-y', '50%');
                compactMarker.classList.add('is-held');
                const joystick = appRoot.querySelector('[data-demo-depth-joystick]');
                joystick.hidden = false;
                joystick.style.setProperty('--move-control-x', `${holdGesture.startX}px`);
                joystick.style.setProperty('--move-control-y', `${holdGesture.startY}px`);
                joystick.querySelector('strong').textContent = record.name || 'Held element';
                const readout = joystick.querySelector('[data-demo-depth-readout]');
                if (readout) readout.textContent = `${(record.demoDistance || 1).toFixed(1)} m`;
                joystick.style.setProperty('--depth-shift', '0px');
                setGuide(`Holding ${record.name || 'this element'} at the aim. Keep this finger down: slide up to push away or down to pull closer.`);
            }, 420);
        });
        compactMarker.addEventListener('pointermove', event => {
            if (demoHeldIndex !== index || event.pointerId !== holdGesture?.pointerId) return;
            const verticalTravel = holdGesture.startY - event.clientY;
            record.demoDistance = Math.max(.4, Math.min(4, 1 + verticalTravel / 120));
            record.demoDepthScale = Math.max(.55, Math.min(1.8, 1 / record.demoDistance));
            compactMarker.style.setProperty('--depth-scale', record.demoDepthScale);
            const joystick = appRoot.querySelector('[data-demo-depth-joystick]');
            const visualMotion = Math.max(-1, Math.min(1, verticalTravel / 180));
            joystick.style.setProperty('--depth-shift', `${(-visualMotion * 38).toFixed(1)}px`);
            const readout = joystick.querySelector('[data-demo-depth-readout]');
            if (readout) readout.textContent = `${record.demoDistance.toFixed(1)} m`;
        });
        const cancelHoldTimer = () => {
            clearTimeout(holdTimer);
            holdTimer = null;
            compactMarker.classList.remove('is-drag-ready');
        };
        compactMarker.addEventListener('pointerup', cancelHoldTimer);
        compactMarker.addEventListener('pointercancel', cancelHoldTimer);
        compactMarker.addEventListener('click', event => {
            if (suppressDemoMarkerClick) {
                suppressDemoMarkerClick = false;
                event.stopImmediatePropagation();
                return;
            }
            if (demoHeldIndex === index) {
                demoHeldIndex = -1;
                compactMarker.classList.remove('is-held');
                appRoot.querySelector('[data-demo-depth-joystick]').hidden = true;
                setGuide(`${record.name || 'Element'} released in its refined position.`);
                event.stopImmediatePropagation();
            }
        });
        if (record.demoType === 'plant') {
            compactMarker.addEventListener('click', () => toggleDemoPlantProfile(record));
            compactMarker.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                compactMarker.click();
            });
            return;
        }
        if (record.demoExpanded || record.demoType !== 'note') return;
        compactMarker.setAttribute('role', 'button');
        compactMarker.setAttribute('tabindex', '0');
        compactMarker.addEventListener('click', () => {
            record.demoExpanded = true;
            refreshDemoRecord(record);
        });
    });
    layer.querySelectorAll('.tryit-sim-marker.is-expanded').forEach(panel => {
        const record = markers[Number(panel.dataset.demoMarkerIndex)];
        if (!record) return;
        let start = null;
        let moved = false;
        panel.addEventListener('pointerdown', event => {
            start = { x: event.clientX, y: event.clientY, offset: record.demoPanelOffset || { x: 0, y: 0 } };
            moved = false;
            panel.setPointerCapture?.(event.pointerId);
            panel.classList.add('is-dragging');
        });
        panel.addEventListener('pointermove', event => {
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            moved ||= Math.hypot(dx, dy) > 5;
            record.demoPanelOffset = { x: start.offset.x + dx, y: start.offset.y + dy };
            panel.style.setProperty('--panel-x', `${record.demoPanelOffset.x}px`);
            panel.style.setProperty('--panel-y', `${record.demoPanelOffset.y}px`);
        });
        const finish = () => { start = null; panel.classList.remove('is-dragging'); };
        panel.addEventListener('pointerup', () => {
            finish();
            if (!moved) {
                record.demoExpanded = false;
                refreshDemoRecord(record);
            }
        });
        panel.addEventListener('pointercancel', finish);
        panel.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                record.demoExpanded = false;
                refreshDemoRecord(record);
            }
        });
    });
    layer.querySelectorAll('[data-demo-plant-profile]').forEach(profile => {
        const index = Number(profile.dataset.demoPlantProfile);
        const record = markers[index];
        const tether = layer.querySelector(`[data-demo-plant-tether="${index}"]`);
        const handle = profile.querySelector('[data-plant-profile-handle]');
        if (!record || !handle) return;
        const cells = [...profile.querySelectorAll('[data-plant-branch]')];
        const activateBranch = branchKey => {
            record.demoActiveBranch = branchKey;
            cells.forEach(candidate => {
                const open = candidate.dataset.plantBranch === branchKey;
                candidate.classList.toggle('is-open', open);
                candidate.setAttribute('aria-expanded', String(open));
                candidate.querySelector('small')?.setAttribute('aria-hidden', String(!open));
            });
        };
        cells.forEach(cell => {
            cell.addEventListener('click', event => {
                event.stopPropagation();
                const branchKey = cell.dataset.plantBranch;
                activateBranch(record.demoActiveBranch === branchKey ? '' : branchKey);
            });
            cell.addEventListener('mouseenter', () => activateBranch(cell.dataset.plantBranch));
        });
        let start = null;
        handle.addEventListener('pointerdown', event => {
            event.preventDefault();
            start = { x: event.clientX, y: event.clientY, offset: record.demoPanelOffset || { x: 0, y: 0 } };
            handle.setPointerCapture?.(event.pointerId);
            profile.classList.add('is-dragging');
        });
        handle.addEventListener('pointermove', event => {
            if (!start) return;
            record.demoPanelOffset = clampPlantPanelOffset(record.simulatedAnchor || { x: 50, y: 50 }, {
                x: start.offset.x + event.clientX - start.x,
                y: start.offset.y + event.clientY - start.y
            });
            applyPlantPanelOffset(profile, tether, record.demoPanelOffset);
        });
        const finish = () => {
            start = null;
            profile.classList.remove('is-dragging');
        };
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('keydown', event => {
            const movement = {
                ArrowLeft: { x: -12, y: 0 },
                ArrowRight: { x: 12, y: 0 },
                ArrowUp: { x: 0, y: -12 },
                ArrowDown: { x: 0, y: 12 }
            }[event.key];
            if (!movement) return;
            event.preventDefault();
            const offset = record.demoPanelOffset || { x: 0, y: 0 };
            record.demoPanelOffset = clampPlantPanelOffset(record.simulatedAnchor || { x: 50, y: 50 }, {
                x: offset.x + movement.x,
                y: offset.y + movement.y
            });
            applyPlantPanelOffset(profile, tether, record.demoPanelOffset);
        });
    });
}

function plantKnowledgeMarkup(knowledge = LEMON_MYRTLE_KNOWLEDGE, activeBranch = 'left-0') {
    const branch = (side, items) => `<span class="plant-knowledge-branch plant-knowledge-${side}">${items.map(([label, value], index) => {
        const key = `${side}-${index}`;
        const open = activeBranch === key;
        return `<button type="button" class="plant-knowledge-cell${open ? ' is-open' : ''}" data-plant-branch="${key}" aria-expanded="${open}"><b>${label}</b><small aria-hidden="${!open}">${value}</small></button>`;
    }).join('')}</span>`;
    return `<span class="plant-knowledge-map">${branch('left', knowledge.left)}<span class="plant-knowledge-core" data-plant-profile-handle tabindex="0" aria-label="Drag the ${knowledge.title} information cluster"><small>PLANT PROFILE</small><strong>${knowledge.title}</strong></span>${branch('right', knowledge.right)}</span>`;
}

function refreshDemoRecord(record) {
    if (record.texture) gl?.deleteTexture(record.texture);
    record.texture = createMarkerTexture(record);
    updateSimulatedMarkers();
}

function placementPosition() {
    return spatialPosition(null, viewerMatrix, 0);
}

function plantInformationPosition(record) {
    const position = record?.position || { x: 0, y: 0, z: -1.2 };
    const viewerY = Number(viewerMatrix?.[13]);
    const minimumY = position.y + 0.45;
    const maximumY = position.y + 1.05;
    const preferredY = Number.isFinite(viewerY) ? viewerY - 0.12 : position.y + 0.72;
    const cameraX = Number(viewerMatrix?.[12]);
    const cameraZ = Number(viewerMatrix?.[14]);
    const towardViewerX = Number.isFinite(cameraX) ? cameraX - position.x : 0;
    const towardViewerZ = Number.isFinite(cameraZ) ? cameraZ - position.z : 1;
    const horizontalDistance = Math.hypot(towardViewerX, towardViewerZ) || 1;
    return {
        x: position.x + towardViewerX / horizontalDistance * 0.14,
        y: Math.min(maximumY, Math.max(minimumY, preferredY)),
        z: position.z + towardViewerZ / horizontalDistance * 0.14
    };
}

function placeMarker() {
    if (!placementReady || marker || markers.length >= 4 || markers.some(record => record.tutorialStage === demoStage)) return;
    placementReady = false;
    const position = placementPosition();
    if (!position) {
        setGuide('Move your phone briefly, then tap the circle again.');
        return;
    }
    const type = demoStage;
    const directType = type === 'note' ? 'note' : 'sub_checkpoint';
    const sample = createMinimalMarkerDraft(directType, {
        name: ['plant', 'plant2'].includes(type) ? 'A living plant' : type === 'note' ? 'A small observation' : 'New Area',
        description: type === 'note' ? 'A small observation can become useful knowledge over time.' : ''
    });
    const simulatedAnchor = simulatedMode ? capturedSimulatedAnchor() : null;
    const panelOffsets = {
        plant: simulatedAnchor ? defaultPlantPanelOffset(simulatedAnchor) : { x: 0, y: 0 },
        plant2: simulatedAnchor ? defaultPlantPanelOffset(simulatedAnchor) : { x: 0, y: 0 },
        note: { x: 0, y: 0 },
        zone: { x: 0, y: 0 }
    };
    marker = {
        ...sample,
        position,
        type: type === 'note' ? 'note' : 'marker',
        demoType: type === 'note' ? 'note' : 'marker',
        tutorialStage: type,
        demoOrbColor: type === 'plant' ? 'red' : type === 'plant2' ? 'green' : '',
        demoExpanded: false,
        demoPanelOffset: panelOffsets[type],
        simulatedAnchor,
        informationPosition: null,
        revealTitle: true,
        revealLines: 3,
        texture: null,
        ...(type === 'note' ? { name: 'Seasonal observation', demoContent: NOTE_TEMPLATES.poi } : {})
    };
    if (markers.length) marker = relateMinimalMarkers(marker, markers[0]?.id || 'demo-plant', 'part-of-story');
    marker.texture = createMarkerTexture(marker);
    markers.push(marker);
    const placedRecord = marker;
    appRoot?.querySelector('[data-tryit-place]')?.setAttribute('hidden', '');
    updateSimulatedMarkers();
    marker = null;
    if (type === 'plant' || type === 'plant2') guidePlantConversion(placedRecord);
    else if (type === 'note') guideNoteConversion(placedRecord);
    else guideAreaConversion(placedRecord);
}

function pressPlacementPointer(event) {
    if (!placementReady || marker || pointerPressTimer) return;
    event?.stopPropagation();
    suppressSessionSelectUntil = performance.now() + 1000;
    const place = event?.currentTarget || appRoot?.querySelector('[data-tryit-place]');
    place?.classList.add('is-pressed');
    setGuide('Placing Plant orb…');
    pointerPressTimer = setTimeout(() => {
        place?.classList.remove('is-pressed');
        pointerPressTimer = null;
        placeMarker();
    }, 360);
}

function renderInterface(simulated) {
    simulatedMode = simulated;
    introSceneStartedAt = performance.now();
    introSceneActive = true;
    appRoot.innerHTML = `<div class="tryit-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div class="tryit-stage"><div class="tryit-spatial-intro" data-tryit-intro><div class="tryit-intro-knowledge" aria-label="BIOMAP interactive plant attributes">${INTRO_KNOWLEDGE_KEYWORDS.map((keyword, index) => `<span class="biomap-branch" style="--knowledge-index:${index}"><button type="button" data-biomap-category="${keyword}" aria-expanded="false">${keyword}</button>${BIOMAP_CATEGORIES[keyword].length ? `<span class="biomap-children" aria-label="${keyword} filters">${BIOMAP_CATEGORIES[keyword].map(child => `<span>${child}</span>`).join('')}</span>` : ''}</span>`).join('')}</div><div class="tryit-spatial-welcome-note"><strong>NOURISHLANDXR</strong><span data-tryit-spatial-tagline>A web of living knowledge…</span></div></div><button class="tryit-place creator-ar-placement-guide" type="button" data-tryit-place aria-label="Place item" hidden>${placementPointerMarkup('')}</button>${spatialMoveControlMarkup('demo')}<button class="tryit-demo-action" type="button" data-tryit-action hidden></button><section class="tryit-guided-choice tryit-tutorial-board" data-tryit-guided-choice aria-live="polite" hidden></section><div class="tryit-final-actions" data-tryit-final-actions hidden><button type="button" data-tryit-reset>Try again</button><button type="button" data-tryit-finish>Finish demo</button></div><p class="tryit-guide" data-tryit-guide aria-live="polite">NourishlandXR demo.</p><div data-tryit-sim-markers></div><div class="tryit-demo-footer"><p class="tryit-drag-hint">Hold and drag any element to reposition it.</p><nav class="tryit-demo-taskbar" aria-label="Demo controls"><button type="button" data-tryit-exit><strong>CLOSE DEMO</strong></button></nav></div></div></div>`;
    const introContinue = document.createElement('button');
    introContinue.className = 'tryit-intro-continue';
    introContinue.dataset.tryitIntroContinue = '';
    introContinue.type = 'button';
    introContinue.hidden = true;
    appRoot.querySelector('.tryit-stage')?.append(introContinue);
    appRoot.querySelector('.tryit-drag-hint')?.remove();
    appRoot.querySelectorAll('[data-biomap-category]').forEach(button => {
        const expand = () => {
            button.closest('.biomap-branch')?.classList.add('is-expanded');
            button.setAttribute('aria-expanded', 'true');
        };
        button.addEventListener('mouseenter', expand);
        button.addEventListener('focus', expand);
        button.addEventListener('click', expand);
    });
    appRoot.querySelector('[data-tryit-exit]').addEventListener('click', returnToWelcome);
    appRoot.querySelector('[data-tryit-place]').addEventListener('click', pressPlacementPointer);
    appRoot.querySelector('[data-demo-move-release]').addEventListener('click', () => {
        if (demoHeldIndex < 0) return;
        demoHeldIndex = -1;
        appRoot.querySelector('[data-demo-depth-joystick]').hidden = true;
        updateSimulatedMarkers();
        setGuide('Released in its refined position.');
    });
    appRoot.querySelector('[data-tryit-action]').addEventListener('click', advanceDemo);
    appRoot.querySelector('[data-tryit-reset]').addEventListener('click', () => { appRoot.querySelector('[data-tryit-action]').dataset.nextStage = 'reset'; advanceDemo(); });
    appRoot.querySelector('[data-tryit-finish]').addEventListener('click', returnToWelcome);
    clearTimeout(introNarrationTimer);
    introNarrationTimer = setTimeout(runArWelcomeTutorial, 700);
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
    gl.shaderSource(fragment, 'precision mediump float;varying vec2 v;uniform sampler2D t;uniform float opacity;void main(){vec4 sampleColor=texture2D(t,v);gl_FragColor=vec4(sampleColor.rgb,sampleColor.a*opacity);}');
    gl.compileShader(fragment);
    program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.20,-.08,0,0,1, .20,-.08,0,1,1, .20,.08,0,1,0, -.20,-.08,0,0,1, .20,.08,0,1,0, -.20,.08,0,0,0]), gl.STATIC_DRAW);
    sphereRenderer = createSpatialSphereRenderer(gl);
    tetherRenderer = createSpatialTetherRenderer(gl);
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
    label.width = record.demoType === 'zone' ? 720 : 1120;
    label.height = record.demoType === 'zone' ? 1120 : 720;
    const ctx = label.getContext('2d');
    if (record.demoType === 'plant') {
        drawPlantKnowledgeTexture(ctx, label, knowledgeFor(record), record.demoActiveBranch || 'left-0');
        return canvasTexture(label);
    }
    if (record.demoType === 'zone') {
        drawTotemKnowledgeTexture(ctx, label, content);
        return canvasTexture(label);
    }
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
    return canvasTexture(label);
}

function drawTotemKnowledgeTexture(ctx, label, content) {
    const cards = (content.bubbles || content.lines).filter(Boolean).slice(0, 5);
    const cardLayouts = [
        [24, 90, 190, 142],
        [388, 52, 292, 160],
        [476, 300, 220, 140],
        [20, 506, 172, 150],
        [392, 528, 250, 140]
    ];
    const branchEnds = [[118, 232], [534, 212], [586, 370], [106, 576], [516, 598]];
    ctx.strokeStyle = 'rgba(221,246,238,.72)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    branchEnds.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(360, 408);
        ctx.bezierCurveTo(360 + (x - 360) * .34, 386, 360 + (x - 360) * .68, y, x, y);
        ctx.stroke();
    });
    const pillar = ctx.createLinearGradient(306, 0, 414, 0);
    pillar.addColorStop(0, 'rgba(24,104,119,.98)');
    pillar.addColorStop(.24, 'rgba(100,215,216,.98)');
    pillar.addColorStop(.72, 'rgba(35,148,162,.98)');
    pillar.addColorStop(1, 'rgba(12,65,86,.98)');
    ctx.fillStyle = pillar;
    ctx.beginPath();
    ctx.roundRect(306, 390, 108, 710, [14, 14, 8, 8]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,250,247,.72)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(117,226,224,.98)';
    ctx.beginPath();
    ctx.roundRect(309, 382, 102, 24, [12, 12, 5, 5]);
    ctx.fill();
    cards.forEach((text, index) => {
        const [x, y, width, height] = cardLayouts[index];
        const balloonLight = ctx.createRadialGradient(x + width * .25, y + height * .18, 8, x + width * .5, y + height * .5, width * .7);
        balloonLight.addColorStop(0, 'rgba(73,121,104,.96)');
        balloonLight.addColorStop(.46, 'rgba(19,62,51,.94)');
        balloonLight.addColorStop(1, 'rgba(8,35,30,.94)');
        ctx.fillStyle = balloonLight;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, [34, 23, 37, 27]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(226,255,249,.8)';
        ctx.lineWidth = 5;
        ctx.stroke();
        const [attachmentX, attachmentY] = branchEnds[index];
        ctx.fillStyle = 'rgba(218,250,241,.9)';
        ctx.beginPath();
        ctx.arc(attachmentX, attachmentY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = `${index === 1 ? '850 27px' : '800 24px'} system-ui, sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,.95)';
        ctx.shadowBlur = 5;
        drawWrappedTextureText(ctx, text, x + width / 2, y + height / 2 - 16, width - 30, 30, 3);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    });
}

function canvasTexture(label, texture = null) {
    texture ||= gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createIntroNoteTexture(texture = null) {
    const label = introNoteCanvas ||= document.createElement('canvas');
    label.width = 1400;
    label.height = 900;
    const ctx = label.getContext('2d');
    ctx.clearRect(0, 0, label.width, label.height);
    const noteGradient = ctx.createLinearGradient(70, 100, 1330, 800);
    noteGradient.addColorStop(0, 'rgba(74,122,91,.64)');
    noteGradient.addColorStop(.48, 'rgba(24,70,48,.54)');
    noteGradient.addColorStop(1, 'rgba(8,32,21,.42)');
    ctx.fillStyle = noteGradient;
    ctx.strokeStyle = 'rgba(239,255,229,.82)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(48, 62, 1304, 776, [62, 48, 68, 52]);
    ctx.fill();
    ctx.stroke();
    const glassLight = ctx.createRadialGradient(280, 130, 20, 350, 190, 520);
    glassLight.addColorStop(0, 'rgba(255,255,255,.2)');
    glassLight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glassLight;
    ctx.beginPath();
    ctx.roundRect(54, 68, 1292, 764, [58, 44, 64, 48]);
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 18;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dcef95';
    ctx.font = '750 38px system-ui, sans-serif';
    ctx.fillText('LIVE AR TUTORIAL', 700, 190);
    ctx.fillStyle = '#fff';
    let titleSize = 94;
    do {
        ctx.font = `760 ${titleSize}px system-ui, sans-serif`;
        titleSize -= 4;
    } while (titleSize > 58 && ctx.measureText(introBoardTitle).width > 1120);
    drawWrappedTextureText(ctx, introBoardTitle, 700, 330, 1120, titleSize + 14, 2);
    ctx.strokeStyle = 'rgba(220,239,149,.56)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(150, 470);
    ctx.lineTo(1250, 470);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.font = '650 52px system-ui, sans-serif';
    const typedBody = introBoardVisibleBody
        ? `${introBoardVisibleBody}${introBoardVisibleBody.length < introBoardBody.length ? '▌' : ''}`
        : '▌';
    drawWrappedTextureText(ctx, typedBody, 150, 555, 1100, 68, 4);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    return canvasTexture(label, texture);
}

function createIntroKnowledgeTexture() {
    const label = document.createElement('canvas');
    label.width = 1400;
    label.height = 900;
    const ctx = label.getContext('2d');
    const cells = [
        [490, 285], [630, 285], [770, 285], [910, 285],
        [490, 615], [630, 615], [770, 615], [910, 615],
        [405, 370], [995, 370], [405, 530], [995, 530]
    ];
    cells.forEach(([x, y], index) => {
        const keyword = INTRO_KNOWLEDGE_KEYWORDS[index];
        const longLabel = keyword.length > 10;
        drawHexagon(ctx, x, y, 78, 'rgba(34,69,47,.36)', 'rgba(241,251,234,.58)', 3);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,12,5,.72)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.font = `${longLabel ? '650 21px' : '650 27px'} system-ui, sans-serif`;
        drawWrappedTextureText(ctx, keyword, x, y - (longLabel ? 18 : 14), 118, longLabel ? 24 : 28, 2);
    });
    return canvasTexture(label);
}

function introLocalPosition(matrix, [x, y, z]) {
    return {
        x: matrix[12] + matrix[0] * x + matrix[4] * y + matrix[8] * z,
        y: matrix[13] + matrix[1] * x + matrix[5] * y + matrix[9] * z,
        z: matrix[14] + matrix[2] * x + matrix[6] * y + matrix[10] * z
    };
}

function drawIntroSpatial(view) {
    if (!introSceneActive || !viewerMatrix || !program || !buffer) return;
    introWorldAnchor ||= Float32Array.from(viewerMatrix);
    if (!introNoteTexture || introBoardTextureDirty) {
        introNoteTexture = createIntroNoteTexture(introNoteTexture);
        introBoardTextureDirty = false;
    }
    introKnowledgeTexture ||= createIntroKnowledgeTexture();
    const elapsed = performance.now() - introSceneStartedAt;
    const drawTexture = (texture, position, scaleX, scaleY, opacity) => {
        const model = billboardMatrix(position, scaleX, scaleY);
        const mvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, 't'), 0);
        gl.uniform1f(gl.getUniformLocation(program, 'opacity'), opacity);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const noteProgress = Math.min(1, Math.max(0, (elapsed - 80) / 900));
    const easedNote = 1 - Math.pow(1 - noteProgress, 3);
    const knowledgeProgress = Math.min(1, Math.max(0, (elapsed - 1900) / 2800));
    const easedKnowledge = 1 - Math.pow(1 - knowledgeProgress, 3);
    if (introKnowledgeVisible) {
        drawTexture(
            introKnowledgeTexture,
            introLocalPosition(introWorldAnchor, [0, .78, -3.2]),
            9.2,
            12.4,
            easedKnowledge * .9
        );
    }
    drawTexture(
        introNoteTexture,
        introLocalPosition(introWorldAnchor, [0, .78, -3.2]),
        9.2,
        12.4,
        easedNote
    );
}

function drawHexagon(ctx, x, y, radius, fill, stroke, lineWidth = 2) {
    ctx.beginPath();
    for (let point = 0; point < 6; point++) {
        const angle = Math.PI / 3 * point;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (!point) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

function drawPlantKnowledgeTexture(ctx, label, knowledge, activeBranch = 'left-0') {
    ctx.clearRect(0, 0, label.width, label.height);
    const center = { x: label.width / 2, y: label.height / 2 };
    const cells = [
        ...knowledge.left.map((item, index) => ({
            item,
            key: `left-${index}`,
            x: [477, 394, 477][index],
            y: [216, 360, 504][index]
        })),
        ...knowledge.right.map((item, index) => ({
            item,
            key: `right-${index}`,
            x: [643, 726, 643][index],
            y: [216, 360, 504][index]
        }))
    ];
    cells.forEach(cell => {
        const open = cell.key === activeBranch;
        drawHexagon(ctx, cell.x, cell.y, 80, 'rgba(13,42,28,.72)', 'rgba(240,250,233,.68)', 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,.94)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.font = '850 20px system-ui, sans-serif';
        ctx.strokeText(cell.item[0], cell.x, cell.y + (open ? -10 : 7));
        ctx.fillText(cell.item[0], cell.x, cell.y + (open ? -10 : 7));
        if (open) {
            ctx.fillStyle = '#fff';
            ctx.font = '700 18px system-ui, sans-serif';
            ctx.shadowColor = 'rgba(0,0,0,.98)';
            ctx.shadowBlur = 6;
            drawWrappedTextureText(ctx, cell.item[1], cell.x, cell.y + 17, 126, 22, 2);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    });
    drawHexagon(ctx, center.x, center.y, 88, 'rgba(18,51,34,.76)', 'rgba(242,251,236,.72)', 3);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,.94)';
    ctx.lineWidth = 4;
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.strokeText('PLANT PROFILE', center.x, center.y - 15);
    ctx.fillText('PLANT PROFILE', center.x, center.y - 15);
    ctx.fillStyle = '#fff';
    ctx.font = '850 28px system-ui, sans-serif';
    ctx.strokeText(knowledge.title, center.x, center.y + 20);
    ctx.fillText(knowledge.title, center.x, center.y + 20);
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
    label.width = 256;
    label.height = 256;
    const ctx = label.getContext('2d');
    if (record.type === 'plant') {
        const life = ctx.createRadialGradient(102, 94, 10, 128, 128, 94);
        life.addColorStop(0, '#f5ffe8');
        life.addColorStop(.2, '#b7e895');
        life.addColorStop(.52, '#5fa34d');
        life.addColorStop(.78, 'rgba(43,112,54,.88)');
        life.addColorStop(1, 'rgba(25,75,39,.2)');
        ctx.fillStyle = life;
        ctx.beginPath();
        ctx.arc(128, 128, 88, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(239,255,226,.88)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.fillStyle = 'rgba(241,255,225,.82)';
        ctx.beginPath();
        ctx.arc(108, 105, 18, 0, Math.PI * 2);
        ctx.fill();
    } else if (record.demoType === 'zone') {
        ctx.fillStyle = 'rgba(19,67,64,.82)';
        ctx.beginPath();
        ctx.roundRect(92, 15, 108, 224, 14);
        ctx.fill();
        const post = ctx.createLinearGradient(76, 0, 180, 0);
        post.addColorStop(0, 'rgba(31,96,89,.96)');
        post.addColorStop(.48, 'rgba(103,211,194,.98)');
        post.addColorStop(1, 'rgba(24,78,73,.96)');
        ctx.fillStyle = post;
        ctx.beginPath();
        ctx.roundRect(76, 8, 104, 240, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(215,255,247,.72)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(231,255,244,.38)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(88, 24, 74, 208, 9);
        ctx.stroke();
    } else if (record.type === 'marker' || record.type === 'sub_checkpoint') {
        const glow = ctx.createRadialGradient(128, 128, 18, 128, 128, 118);
        glow.addColorStop(0, 'rgba(226,244,181,.7)');
        glow.addColorStop(.58, 'rgba(146,201,122,.48)');
        glow.addColorStop(.82, 'rgba(104,164,91,.18)');
        glow.addColorStop(1, 'rgba(104,164,91,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(128, 128, 118, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(226,244,181,.92)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(128, 128, 78, 0, Math.PI * 2);
        ctx.stroke();
    } else if (record.type === 'note') {
        ctx.fillStyle = 'rgba(30,35,32,.72)';
        ctx.beginPath();
        ctx.roundRect(12, 68, 232, 120, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245,248,243,.78)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(210, 68); ctx.lineTo(237, 68); ctx.lineTo(237, 95);
        ctx.moveTo(46, 188); ctx.lineTo(19, 188); ctx.lineTo(19, 161);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        drawWrappedTextureText(ctx, record.name || 'Note', 128, 126, 205, 27, 2);
    } else {
        ctx.fillStyle = '#357fc4';
        ctx.beginPath();
        ctx.roundRect(8, 42, 240, 172, 28);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◆  Area', 128, 139);
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
    if (!program || !buffer || !sphereRenderer || !tetherRenderer) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    markers.forEach(record => {
        const orbType = record.demoType === 'plant' ? 'plant' : record.demoType === 'marker' ? 'marker' : '';
        if (!orbType) return;
        const material = DEMO_ORB_MATERIALS[record.demoOrbColor];
        drawSpatialOrb(
            gl,
            sphereRenderer,
            view,
            record.position,
            material?.radius || (orbType === 'plant' ? .068 : .05),
            { type: orbType, color: material?.shell, coreColor: material?.core }
        );
    });

    markers.forEach(record => {
        if (record.demoType !== 'plant' || !record.demoExpanded) return;
        const informationPosition = record.informationPosition || (record.informationPosition = plantInformationPosition(record));
        drawSpatialTether(
            gl,
            tetherRenderer,
            view,
            { ...record.position, y: record.position.y + 0.07 },
            { ...informationPosition, y: informationPosition.y - 0.22 },
            { width: 0.003, color: [0.84, 0.93, 0.76, 0.25], curve: 0.035, lift: 0.05 }
        );
    });

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const p = gl.getAttribLocation(program, 'p'); const uv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    drawIntroSpatial(view);
    markers.forEach(record => {
        if (!record.texture) return;
        const orbOnly = ['marker', 'plant'].includes(record.demoType) && !record.demoExpanded;
        if (orbOnly) return;
        const compact = !record.demoExpanded;
        const totem = record.demoType === 'zone';
        const noteSign = record.demoType === 'note';
        const plantProfile = record.demoType === 'plant' && record.demoExpanded;
        const displayPosition = plantProfile
            ? record.informationPosition || (record.informationPosition = plantInformationPosition(record))
            : totem
            ? { ...record.position, y: record.position.y + 1 }
            : compact ? record.position : { ...record.position, y: record.position.y + 0.72 };
        const model = billboardMatrix(
            displayPosition,
            plantProfile ? 1.85 : totem ? 1.9 : compact && noteSign ? 1.52 : compact ? .38 : 2.35,
            plantProfile ? 2.55 : totem ? 3 : compact && noteSign ? 1.52 : compact ? .38 : 3.45
        );
        const mvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, record.texture);
        gl.uniform1i(gl.getUniformLocation(program, 't'), 0);
        const profileOpacity = plantProfile ? Math.min(1, Math.max(0, (performance.now() - (record.profileRevealStarted || 0)) / 1050)) : 1;
        gl.uniform1f(gl.getUniformLocation(program, 'opacity'), profileOpacity);
        if (plantProfile) gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (plantProfile) gl.depthMask(true);
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
        session.addEventListener('select', () => {
            if (performance.now() < suppressSessionSelectUntil) return;
            if (placementReady && !marker) {
                setGuide('Press the glowing centre pointer to place the Plant orb.');
                return;
            }
            const profiledPlant = markers.find(record => record.demoType === 'plant');
            if (profiledPlant) toggleDemoPlantProfile(profiledPlant);
        });
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
