# Project release rule

For every completed code edit, bug fix, feature update, or content update, increment `VERSION` in `app/services/buildInfo.js` by `0.0001` before handoff. Build and verify that the welcome screen displays the new version.

# Global interface design rule

Use compact, recognizable icons as the default for common actions across desktop, mobile and XR interfaces. Avoid pill-shaped text buttons for standard controls such as microphone, audio, playback, close, back, settings and repeat. Use consistent circular or compact square icon controls, generous input targets, and clear active, disabled and focused states. Keep accessible names for every action; provide hover/focus labels on desktop and brief aim/focus hints where appropriate in XR. Never rely on color alone to communicate state.

Keep text labels for unfamiliar or ambiguous actions, lesson answers, and consequential choices whose meaning an icon cannot communicate clearly. Do not add persistent explanatory button labels throughout the experience. Apply this rule to new and updated interfaces; preserve unrelated flows during focused fixes.
