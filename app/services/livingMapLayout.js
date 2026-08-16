export const SAFE_BOUNDS = Object.freeze({ left: 12, right: 88, top: 14, bottom: 86 });

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const isHomeArea = area => area?.systemKey === 'home' || ['home', 'unassigned'].includes(String(area?.name || '').trim().toLocaleLowerCase());

/**
 * Stable conceptual positions for the Living Map. These are deliberately not
 * derived from GPS or visual proximity: a conceptual map is an organiser, not
 * a claim about geographic truth.
 */
export function calculateConceptualLayout(areas) {
    const homeIndex = areas.findIndex(isHomeArea);
    const otherIndexes = areas.map((_, index) => index).filter(index => index !== homeIndex);
    const count = otherIndexes.length;
    const presets = {
        0: [],
        1: [[50, 40]],
        2: [[35, 40], [65, 40]],
        3: [[25, 38], [50, 32], [75, 38]],
        4: [[32, 30], [68, 30], [32, 55], [68, 55]]
    }[count];
    const points = new Map();
    otherIndexes.forEach((areaIndex, order) => {
        let x; let y;
        if (presets?.[order]) [x, y] = presets[order];
        else {
            const angle = -Math.PI / 2 + (order * (Math.PI * 2 / Math.max(count, 1)));
            const radiusX = count > 8 ? 30 : 34;
            const radiusY = count > 8 ? 25 : 29;
            x = 50 + Math.cos(angle) * radiusX;
            y = 44 + Math.sin(angle) * radiusY;
        }
        points.set(areaIndex, { x: clamp(x, SAFE_BOUNDS.left, SAFE_BOUNDS.right), y: clamp(y, SAFE_BOUNDS.top, SAFE_BOUNDS.bottom), positionSource: 'auto', locked: false });
    });
    if (homeIndex >= 0) points.set(homeIndex, { x: 50, y: 78, positionSource: 'auto', locked: false });
    if (homeIndex < 0 && areas.length) points.set(0, { x: 50, y: 42, positionSource: 'auto', locked: false });
    return areas.map((_, index) => points.get(index) || { x: 50, y: 42, positionSource: 'auto', locked: false });
}
