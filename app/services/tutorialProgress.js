const STORAGE_KEY = 'nourishland-xr-tutorial-progress-v1';

export const TUTORIAL_FEATURES = [
    'dashboardWelcome',
    'arMode',
    'contentMode',
    'quickAccess',
    'area',
    'unplacedContent',
    'startingPoint',
    'visitorPreview'
];

const EVENT_RULES = {
    ar_mode_introduced: ['arMode', 'learning'],
    ar_mode_launched: ['arMode', 'understood'],
    content_mode_introduced: ['contentMode', 'learning'],
    content_mode_opened: ['contentMode', 'understood'],
    quick_access_introduced: ['quickAccess', 'learning'],
    dashboard_opened: ['dashboardWelcome', 'learning'],
    first_item_created: ['quickAccess', 'understood'],
    area_explained: ['area', 'learning'],
    first_area_created_or_selected: ['area', 'understood'],
    unplaced_content_explained: ['unplacedContent', 'learning'],
    first_unplaced_item_saved: ['unplacedContent', 'understood'],
    starting_point_explained: ['startingPoint', 'learning'],
    starting_point_configured: ['startingPoint', 'understood'],
    visitor_preview_opened: ['visitorPreview', 'understood']
};

function emptyRoot() {
    return {
        version: 1,
        creator: {
            tutorialMode: true,
            features: {},
            arTutorial: { state: 'not_started', step: 0, showHints: true },
            arDashboardTutorial: { state: 'not_started', step: 0 }
        },
        projects: {}
    };
}

function resolveStorage(storage) {
    return storage || globalThis.localStorage;
}

function readRoot(storage) {
    try {
        const parsed = JSON.parse(resolveStorage(storage).getItem(STORAGE_KEY) || 'null');
        return {
            ...emptyRoot(),
            ...(parsed && typeof parsed === 'object' ? parsed : {}),
            creator: {
                tutorialMode: true,
                features: {},
                arTutorial: { state: 'not_started', step: 0, showHints: true },
                arDashboardTutorial: { state: 'not_started', step: 0 },
                ...(parsed?.creator || {}),
                arTutorial: {
                    state: 'not_started',
                    step: 0,
                    showHints: true,
                    ...(parsed?.creator?.arTutorial || {})
                },
                arDashboardTutorial: {
                    state: 'not_started',
                    step: 0,
                    ...(parsed?.creator?.arDashboardTutorial || {})
                }
            },
            projects: parsed?.projects && typeof parsed.projects === 'object' ? parsed.projects : {}
        };
    } catch {
        return emptyRoot();
    }
}

function writeRoot(root, storage) {
    resolveStorage(storage).setItem(STORAGE_KEY, JSON.stringify(root));
    return root;
}

function projectState(root, projectId) {
    return root.projects[projectId] || { tutorialMode: true, features: {}, events: {} };
}

export function getTutorialStage(projectId, feature, storage) {
    const root = readRoot(storage);
    const project = projectState(root, projectId);
    if (!root.creator.tutorialMode || !project.tutorialMode) return 'understood';
    return project.features?.[feature] || root.creator.features?.[feature] || 'new';
}

export function isProjectTutorialEnabled(projectId, storage) {
    const root = readRoot(storage);
    return root.creator.tutorialMode && projectState(root, projectId).tutorialMode;
}

export function recordTutorialEvent(projectId, event, storage) {
    const rule = EVENT_RULES[event];
    if (!rule || !projectId) return null;
    const [feature, stage] = rule;
    const root = readRoot(storage);
    const project = projectState(root, projectId);
    project.features = { ...(project.features || {}), [feature]: stage };
    project.events = { ...(project.events || {}), [event]: new Date().toISOString() };
    root.projects[projectId] = project;
    if (stage === 'understood') {
        root.creator.features = { ...(root.creator.features || {}), [feature]: 'understood' };
    }
    writeRoot(root, storage);
    return { event, feature, stage };
}

export function dismissTutorialFeature(projectId, feature, storage) {
    if (!TUTORIAL_FEATURES.includes(feature)) return;
    const root = readRoot(storage);
    const project = projectState(root, projectId);
    project.features = { ...(project.features || {}), [feature]: 'understood' };
    root.projects[projectId] = project;
    writeRoot(root, storage);
}

export function recallTutorialFeatures(projectId, features, storage) {
    const root = readRoot(storage);
    const project = projectState(root, projectId);
    project.tutorialMode = true;
    project.features = {
        ...(project.features || {}),
        ...Object.fromEntries(features.filter(feature => TUTORIAL_FEATURES.includes(feature)).map(feature => [feature, 'new']))
    };
    root.projects[projectId] = project;
    writeRoot(root, storage);
}

export function setProjectTutorialMode(projectId, enabled, storage) {
    const root = readRoot(storage);
    const project = projectState(root, projectId);
    project.tutorialMode = Boolean(enabled);
    root.projects[projectId] = project;
    writeRoot(root, storage);
}

export function restartProjectTutorial(projectId, storage) {
    const root = readRoot(storage);
    root.projects[projectId] = {
        tutorialMode: true,
        features: Object.fromEntries(TUTORIAL_FEATURES.map(feature => [feature, 'new'])),
        events: {}
    };
    writeRoot(root, storage);
}

export function resetLearningTips(storage) {
    const root = readRoot(storage);
    root.creator = {
        tutorialMode: true,
        features: {},
        arTutorial: { state: 'not_started', step: 0, showHints: true },
        arDashboardTutorial: { state: 'not_started', step: 0 }
    };
    root.projects = {};
    writeRoot(root, storage);
}

export function getArTutorialProgress(storage) {
    const root = readRoot(storage);
    return { ...root.creator.arTutorial };
}

export function setArTutorialProgress(state, step = 0, storage) {
    if (!['not_started', 'in_progress', 'completed', 'skipped'].includes(state)) return getArTutorialProgress(storage);
    const root = readRoot(storage);
    root.creator.arTutorial = {
        ...(root.creator.arTutorial || {}),
        state,
        step: Math.max(0, Number(step) || 0)
    };
    writeRoot(root, storage);
    return { ...root.creator.arTutorial };
}

export function replayArTutorial(storage) {
    return setArTutorialProgress('not_started', 0, storage);
}

export function setArHintsEnabled(enabled, storage) {
    const root = readRoot(storage);
    root.creator.arTutorial = {
        state: 'not_started',
        step: 0,
        ...(root.creator.arTutorial || {}),
        showHints: Boolean(enabled)
    };
    writeRoot(root, storage);
    return { ...root.creator.arTutorial };
}

export function resetArLearningTips(storage) {
    const root = readRoot(storage);
    root.creator.arTutorial = {
        state: 'not_started',
        step: 0,
        showHints: root.creator.arTutorial?.showHints !== false
    };
    root.creator.arDashboardTutorial = { state: 'not_started', step: 0 };
    writeRoot(root, storage);
    return { ...root.creator.arTutorial };
}

export function getArDashboardTutorialProgress(storage) {
    const root = readRoot(storage);
    return { ...root.creator.arDashboardTutorial };
}

export function setArDashboardTutorialProgress(state, step = 0, storage) {
    if (!['not_started', 'in_progress', 'completed', 'skipped'].includes(state)) return getArDashboardTutorialProgress(storage);
    const root = readRoot(storage);
    root.creator.arDashboardTutorial = { state, step: Math.max(0, Number(step) || 0) };
    writeRoot(root, storage);
    return { ...root.creator.arDashboardTutorial };
}

export function readTutorialProgress(storage) {
    return JSON.parse(JSON.stringify(readRoot(storage)));
}
