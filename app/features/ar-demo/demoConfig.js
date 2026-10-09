import { AR_WELCOME_REDUCED_OPENING_MS } from '../../services/arWelcomeShowcase.js';
import { PIM_SPATIAL_CONFIG } from '../../services/plantInformationMesh.js';

export const AR_PHONE_COMFORT = Object.freeze({
    pointerOffsetCss: '3.5cm',
    pointerOffsetPixels: 132.3,
    // Give the left-side reading panel room in the spatial view.
    boardPosition: [0.42, 0.82, -2.8],
    boardScale: [5.6, 10.8]
});

// Keep the primary trigger on the central screen rather than floating beneath it.
// It sits slightly in front of the screen so the texture remains crisp and the
// shared ray hit target can still resolve it independently from LIM cells.
export const INTRO_CONTROL_POSITION = Object.freeze([0.42, 0.16, -2.755]);
export const INTRO_CONTROL_SCALE = Object.freeze([1, 1]);
export const DEMO_QUEST_ORB_SCALE = 0.62;

// The shared demo quad is .4 m by .16 m before model scaling. These values
// produce the configured 1.44 m by 1.08 m transparent PIM interaction wall.
export const DEMO_SHARED_QUAD_SIZE = Object.freeze({ width: .4, height: .16 });
export const DEMO_PIM_IMMERSIVE_SCALE = Object.freeze({
    x: PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres / DEMO_SHARED_QUAD_SIZE.width,
    y: PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres / DEMO_SHARED_QUAD_SIZE.height
});

// Creator Mode's medium Note is 1.88 m x .69 m on the shared quad. The demo
// keeps the same real-world proportions at 88% so it reads as a nearby Note.
export const DEMO_NOTE_IMMERSIVE_SCALE = Object.freeze({ x: 2.15, y: 1.65 });
export const DEMO_TOTEM_HALF_HEIGHT_METRES = 1;
export const DEMO_STABLE_EYE_HEIGHT_METRES = 1.55;
export const DEMO_PRESENTATION_FONT = '"Manrope", "Segoe UI Variable", Inter, system-ui, sans-serif';
// Chez is used when the licensed face is installed. Fraunces is the bundled
// page's organic display fallback; body copy keeps its clear sans-serif face.
export const DEMO_HEADING_FONT = '"Bauhaus Chez", "Fraunces", Georgia, serif';
export const DEMO_HEADING_SIZE = 72;

export const DEMO_WELCOME_OPENING_MS = 12000;
export const DEMO_WELCOME_TITLE_HOLD_MS = 2800;
export const DEMO_WELCOME_DESCRIPTION_HOLD_MS = 10000;
export const DEMO_WELCOME_CONTINUE_MS = 12000;
export const DEMO_ARCHETYPE_START_MS = 20500;
export const DEMO_ARCHETYPE_INTERVAL_MS = 2500;
export const DEMO_ARCHETYPE_REVEAL_MS = 1400;

// Canvas texture uploads are expensive on phones. Coalesce the continuously
// changing welcome copy/mesh so the XR frame loop remains free to render.
export const DEMO_TEXT_TEXTURE_INTERVAL_MS = 48;
export const DEMO_LIM_TEXTURE_INTERVAL_MS = 64;
export const DEMO_LIM_SURFACE_CANVAS = Object.freeze({ width: 2500, height: 2100 });
export const AR_WELCOME_SETTLED_MS = 64000;
export const DEMO_PLANT_ORB_HOLD_DELAY_MS = 800;

// A suspended timer must never leave the final characters and Continue stuck.
export const DEMO_BOARD_TYPING_SAFETY_MS = 30000;
export const DEMO_SEQUENCE = Object.freeze(['plant', 'plant2', 'note', 'totem']);

export const welcomeAutoAdvanceReady = (elapsed, reducedMotion = false) =>
    elapsed >= (reducedMotion ? AR_WELCOME_REDUCED_OPENING_MS : DEMO_WELCOME_CONTINUE_MS) + 2500;

export const demoRainProgress = elapsed =>
    Math.max(0, Math.min(1, (elapsed - DEMO_WELCOME_CONTINUE_MS) / 5000));
