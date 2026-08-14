export const DEMO_TUTORIAL_STEPS = Object.freeze({
    WELCOME: 'welcome',
    GUIDED: 'guided',
    PLACEMENT: 'placement',
    PIM: 'pim',
    LIVE_TAG: 'live-tag',
    WEB_MODE: 'web-mode',
    HIDDEN: 'hidden'
});

/**
 * Keep tutorial action visibility deterministic and independent of animation
 * timing. Skip and Close are persistent safety controls; the Live Tag action
 * exists only for the one step that introduces it.
 */
export function demoTutorialControlsForStep(step) {
    const tutorialStep = Object.values(DEMO_TUTORIAL_STEPS).includes(step)
        ? step
        : DEMO_TUTORIAL_STEPS.GUIDED;
    return Object.freeze({
        step: tutorialStep,
        showOpenPlantLiveTag: tutorialStep === DEMO_TUTORIAL_STEPS.LIVE_TAG,
        showPersistentControls: tutorialStep !== DEMO_TUTORIAL_STEPS.WEB_MODE
            && tutorialStep !== DEMO_TUTORIAL_STEPS.HIDDEN
    });
}
