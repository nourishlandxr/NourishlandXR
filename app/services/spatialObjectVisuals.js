// Shared tuning for the custom WebGL Totem and Plant Orb renderers.
// Values are intentionally local to these objects, not full-screen effects.
export const SPATIAL_OBJECT_VISUALS = Object.freeze({
    totem: Object.freeze({
        controlHeights: Object.freeze([.96,.80]),
        carved: Object.freeze({twist:.52,waist:.18,flutes:.16}),
        botanical: Object.freeze({twist:.18,waist:.07,flutes:.12}),
        sculptureTint: Object.freeze([.66,.48,.30]),
        controlBronze: Object.freeze([.56,.42,.24]),
        controlActive: Object.freeze([.82,.71,.48]),
        postLift: .055,
        postContrast: .84,
        boardWood: Object.freeze([.34,.24,.16]),
        boardWoodEdge: Object.freeze([.53,.40,.26]),
        boardHeader: Object.freeze([.23,.34,.30]),
        boardHeaderEdge: Object.freeze([.46,.57,.46]),
        woodGrain: .8,
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
