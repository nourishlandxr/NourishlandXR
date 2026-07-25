/**
 * The single aiming-pointer model for every placement experience.
 * Keep its structure here and its appearance in the shared
 * creator-ar-placement-* rules in style.css.
 */
export function placementPointerMarkup(label = 'Place Marker', includeGuideHook = false) {
    const guideHook = includeGuideHook ? ' data-ar-placement-guide-label' : '';
    return `<span class="creator-ar-breathing-target" aria-hidden="true"></span><span class="creator-ar-placement-pointer" aria-hidden="true"></span><span class="creator-ar-placement-guide-label"${guideHook}>${label}</span>`;
}
