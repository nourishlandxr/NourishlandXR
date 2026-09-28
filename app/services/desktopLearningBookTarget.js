import { isQuestHeadsetBrowser } from './webxrSession.js';

// A desktop book is a separate reading experience, never a simulated XR
// layout. Touch-first devices and headsets retain their existing AR flow.
export function isDesktopLearningBookTarget({
    finePointer = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches ?? false,
    mobileBrowser = Boolean(globalThis.navigator?.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(globalThis.navigator?.userAgent || '')),
    headset = isQuestHeadsetBrowser()
} = {}) {
    return Boolean(finePointer && !mobileBrowser && !headset);
}
