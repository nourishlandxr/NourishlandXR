// Shared tuning for the custom WebGL Totem and Plant Orb renderers.
// Values are intentionally local to these objects, not full-screen effects.
export const SPATIAL_OBJECT_VISUALS = Object.freeze({
    totem: Object.freeze({
        postLift: .105,
        postContrast: .91,
        boardWood: Object.freeze([.47,.32,.21]),
        boardWoodEdge: Object.freeze([.70,.54,.36]),
        boardHeader: Object.freeze([.30,.40,.45]),
        boardHeaderEdge: Object.freeze([.58,.68,.70]),
        aimTint: Object.freeze([.94,.84,.62]),
        signTransitionMs: 380,
        fadeTransitionMs: 460
    }),
    orb: Object.freeze({
        shellRoughness: .38,
        shellMetalness: .06,
        idleRimAlpha: .78,
        targetRimAlpha: .96,
        selectedRimAlpha: 1,
        targetHaloAlpha: .20,
        selectedHaloAlpha: .25,
        movingHaloAlpha: .34,
        haloScale: 1.14,
        rimWidth: .038
    })
});

export function spatialTransitionProgress(now, startedAt, duration, reducedMotion=false) {
    if(reducedMotion || !Number.isFinite(startedAt))return 1;
    const t=Math.max(0,Math.min(1,(now-startedAt)/duration));
    return t*t*(3-2*t);
}
