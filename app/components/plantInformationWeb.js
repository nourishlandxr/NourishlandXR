import { PIM_COMPASS, PIM_COMPASS_BY_ID } from '../services/pimCompass.js';
import * as PimModel from '../services/pimModel.js';
import * as PimImportReview from '../services/pimImportReview.js';

const GROUPS = Object.freeze([
    { id: 'relationship', label: 'Relationship', question: 'How this plant belongs in living systems' },
    { id: 'agency', label: 'Agency', question: 'What people can make, practise and share' },
    { id: 'certainty', label: 'Certainty', question: 'What is documented and established' },
    { id: 'process', label: 'Process', question: 'How plants begin, grow and receive care' }
]);

const ACCESSIBLE_ROOT_ORDER = Object.freeze([
    'scientific-information',
    'uses',
    'food-forest',
    'cultivation',
    'propagation',
    'historical-data'
]);

const DIRECTION_ITEMS = Object.freeze([
    ['Top', 'Relationship'],
    ['Left', 'Agency'],
    ['Right', 'Certainty'],
    ['Bottom', 'Process']
]);

const INFORMATION_TYPES = Object.freeze([
    ['fact', 'Fact'],
    ['guidance', 'Guidance'],
    ['traditional_knowledge', 'Traditional knowledge'],
    ['local_observation', 'Local observation'],
    ['practice', 'Practice'],
    ['activity', 'Activity'],
    ['historical_record', 'Historical record']
]);

const EVIDENCE_STATES = Object.freeze([
    ['verified', 'Verified'],
    ['sourced', 'Sourced'],
    ['community_contributed', 'Community contributed'],
    ['local_observation', 'Local observation'],
    ['draft', 'Draft'],
    ['needs_review', 'Needs review']
]);

const PUBLICATION_STATES = Object.freeze([
    ['draft', 'Draft'],
    ['published', 'Published'],
    ['archived', 'Archived']
]);

const PIM_CHILD_LIBRARY = Object.freeze({
    uses: ['Food', 'Medicine', 'Materials', 'Fuel', 'Animal use', 'Household use', 'Commercial use', 'Other / custom'],
    'food-forest': ['Layer', 'Roles', 'Relationships', 'Function', 'Companion plants', 'Wildlife relationships', 'Pollinator support', 'Site placement', 'Other / custom'],
    cultivation: ['Climate requirements', 'Soil requirements', 'Sun / light', 'Water', 'Temperature', 'Frost tolerance', 'Drought tolerance', 'Planting', 'Spacing', 'Maintenance', 'Pruning', 'Feeding', 'Pests and diseases', 'Harvest', 'Other / custom'],
    propagation: ['Seed', 'Cutting', 'Grafting', 'Division', 'Layering', 'Pollination', 'Germination', 'Establishment', 'Other / custom'],
    'scientific-information': ['Taxonomy', 'Scientific name', 'Accepted / common names', 'Family', 'Growth form', 'Height and spread', 'Life cycle', 'Evergreen / deciduous', 'Flower characteristics', 'Reproductive traits', 'Fruit and seed', 'Native habitat', 'Observed tolerances', 'Other / custom'],
    'historical-data': ['Country of origin (country or region)', 'Predominant parts of the world', 'Distribution history', 'Introduction history', 'Traditional knowledge', 'Religious connections', 'Scripture & traditional links', 'Cultural connections', 'Historical uses', 'Other / custom'],
    culinary: ['Root', 'Leaves', 'Pods', 'Fruit', 'Beans', 'Seeds', 'Bark'],
    medicinal: ['Root', 'Leaves', 'Pods', 'Fruit', 'Beans', 'Seeds', 'Bark'],
    craft: ['Root', 'Leaves', 'Pods', 'Fruit', 'Beans', 'Seeds', 'Bark']
});

const COUNTRY_OPTIONS = Object.freeze([
    ['AU', 'Australia'],
    ['BD', 'Bangladesh'],
    ['BR', 'Brazil'],
    ['CN', 'China'],
    ['ET', 'Ethiopia'],
    ['GH', 'Ghana'],
    ['ID', 'Indonesia'],
    ['IN', 'India'],
    ['KE', 'Kenya'],
    ['MM', 'Myanmar'],
    ['MX', 'Mexico'],
    ['NG', 'Nigeria'],
    ['PK', 'Pakistan'],
    ['LK', 'Sri Lanka'],
    ['TZ', 'Tanzania'],
    ['US', 'United States'],
    ['OTHER', 'Other / not documented']
]);

const templateId = title => String(title).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const templatesForParent = parentId => (PIM_CHILD_LIBRARY[parentId] || []).map(title => [templateId(title), title, `Add information about ${title.toLocaleLowerCase()}`]);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

const attribute = value => escapeHtml(value).replace(/`/g, '&#96;');
const asList = value => Array.isArray(value) ? value : value === undefined || value === null || value === '' ? [] : [value];
const unique = values => [...new Set(asList(values).map(value => String(value || '').trim()).filter(Boolean))];
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const domToken = value => String(value || 'pim').replace(/[^a-zA-Z0-9_-]+/g, '-');
const titleCase = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function normalizeDocument(document) {
    if (typeof PimModel.normalizePimDocument === 'function') return PimModel.normalizePimDocument(document || {});
    return { ...(document || {}), identity: document?.identity || {}, nodes: asList(document?.nodes) };
}

function nodeById(document, nodeId) {
    return typeof PimModel.pimNodeById === 'function'
        ? PimModel.pimNodeById(document, nodeId)
        : asList(document?.nodes).find(node => node.id === nodeId) || null;
}

function childrenOf(document, parentId) {
    if (typeof PimModel.pimChildren === 'function') return PimModel.pimChildren(document, parentId);
    return asList(document?.nodes)
        .filter(node => (node.parentId ?? null) === (parentId ?? null))
        .sort((left, right) => Number(left.displayOrder || 0) - Number(right.displayOrder || 0));
}

function ancestorsOf(document, nodeId) {
    if (typeof PimModel.pimAncestors === 'function') return PimModel.pimAncestors(document, nodeId);
    const result = [];
    const seen = new Set();
    let node = nodeById(document, nodeId);
    while (node?.parentId && !seen.has(node.parentId)) {
        seen.add(node.parentId);
        node = nodeById(document, node.parentId);
        if (node) result.unshift(node);
    }
    return result;
}

function descendantsOf(document, nodeId) {
    const result = new Set();
    const pending = [nodeId];
    while (pending.length) {
        childrenOf(document, pending.shift()).forEach(child => {
            if (result.has(child.id)) return;
            result.add(child.id);
            pending.push(child.id);
        });
    }
    return result;
}

function concisePreview(node, isRoot = false) {
    const raw = String(node?.preview || '').trim();
    const title = String(node?.title || '').trim().toLocaleLowerCase();
    const words = raw.split(/\s+/).filter(Boolean).slice(0, 5);
    const preview = words.join(' ').replace(/[.,;:!?]+$/, '');
    if (preview && preview.toLocaleLowerCase() !== title) return preview;
    return isRoot ? 'Select to explore' : 'Open this topic';
}

function evidenceLabel(value) {
    return EVIDENCE_STATES.find(([id]) => id === value)?.[1] || titleCase(value || 'needs_review');
}

function categoryFor(node) {
    return PIM_COMPASS_BY_ID[node?.primaryCategory || node?.id] || (node?.primaryCategory === 'custom' || node?.direction === 'custom' ? { id: 'custom', title: 'Custom', knowledgeMode: 'agency', color: '#4e7d62' } : PIM_COMPASS[0]);
}

function normalizedState(state = {}) {
    return {
        centerOpen: state.centerOpen !== false,
        openNodeIds: unique(state.openNodeIds),
        detailNodeId: String(state.detailNodeId || ''),
        highlightedNodeId: String(state.highlightedNodeId || ''),
        searchQuery: String(state.searchQuery || ''),
        searchMessage: String(state.searchMessage || ''),
        searchPath: String(state.searchPath || ''),
        visitedNodeIds: unique(state.visitedNodeIds),
        outlineBranchId: String(state.outlineBranchId || 'scientific-information'),
        // The readable hierarchy is the safe first view. Diagram mode remains
        // an intentional visual exploration mode selected by the user.
        viewMode: state.viewMode === 'compass' ? 'compass' : 'list',
        editorMode: state.editorMode === 'edit' ? 'edit' : state.editorMode === 'add' ? 'add' : '',
        editorParentId: String(state.editorParentId || ''),
        editorNodeId: String(state.editorNodeId || ''),
        editorSeed: state.editorSeed && typeof state.editorSeed === 'object' ? clone(state.editorSeed) : null,
        editorMessage: String(state.editorMessage || ''),
        importMessage: String(state.importMessage || '')
    };
}

export function createPlantInformationWebState(document, initialState = {}) {
    const source = normalizeDocument(document);
    const state = normalizedState(initialState);
    const requestedPath = String(initialState.path || initialState.selectedPath || '');
    const requestedNode = source.nodes.find(node => node.path === requestedPath || node.id === requestedPath);
    if (!requestedNode) return state;
    return {
        ...state,
        centerOpen: true,
        openNodeIds: unique([...state.openNodeIds, ...ancestorsOf(source, requestedNode.id).map(node => node.id), requestedNode.id]),
        highlightedNodeId: requestedNode.id,
        outlineBranchId: requestedNode.parentId ? (ancestorsOf(source, requestedNode.id)[0]?.id || state.outlineBranchId) : requestedNode.id,
        detailNodeId: requestedNode.body ? requestedNode.id : state.detailNodeId,
        searchPath: plantInformationWebPath(source, requestedNode.id)
    };
}

export function plantInformationWebPath(document, nodeId) {
    const source = normalizeDocument(document);
    const node = nodeById(source, nodeId);
    const plant = source.identity?.commonName || source.identity?.scientificName || source.plantId || 'Plant';
    if (!node) return plant;
    return [plant, ...ancestorsOf(source, node.id).map(item => item.title), node.title].join(' → ');
}

export function togglePlantInformationWebCentre(document, state) {
    const current = normalizedState(state);
    if (current.centerOpen) {
        return {
            ...current,
            centerOpen: false,
            openNodeIds: [],
            detailNodeId: '',
            highlightedNodeId: '',
            searchPath: ''
        };
    }
    return { ...current, centerOpen: true, openNodeIds: [], detailNodeId: '', highlightedNodeId: '' };
}

export function togglePlantInformationWebNode(document, state, nodeId) {
    const source = normalizeDocument(document);
    const current = normalizedState(state);
    const node = nodeById(source, nodeId);
    if (!node) return current;
    const visitedNodeIds = unique([...current.visitedNodeIds, node.id]);
    const children = childrenOf(source, node.id);
    const primary = !node.parentId;
    if (!children.length && !primary) {
        return {
            ...current,
            centerOpen: true,
            openNodeIds: unique([...current.openNodeIds, ...ancestorsOf(source, node.id).map(item => item.id)]),
            detailNodeId: node.id,
            highlightedNodeId: node.id,
            visitedNodeIds,
            searchPath: plantInformationWebPath(source, node.id)
        };
    }

    const open = current.openNodeIds.includes(node.id);
    let openNodeIds;
    if (open) {
        const closing = descendantsOf(source, node.id);
        closing.add(node.id);
        openNodeIds = current.openNodeIds.filter(id => !closing.has(id));
    } else if (typeof PimModel.pimOpenAncestors === 'function') {
        openNodeIds = PimModel.pimOpenAncestors(source, current.openNodeIds, node.id);
    } else {
        openNodeIds = unique([...current.openNodeIds, ...ancestorsOf(source, node.id).map(item => item.id), node.id]);
    }
    const closedDetails = open && (current.detailNodeId === node.id || descendantsOf(source, node.id).has(current.detailNodeId));
    return {
        ...current,
        centerOpen: true,
        openNodeIds,
        detailNodeId: closedDetails ? '' : current.detailNodeId,
        highlightedNodeId: node.id,
        outlineBranchId: ancestorsOf(source, node.id)[0]?.id || node.id,
        visitedNodeIds,
        searchPath: plantInformationWebPath(source, node.id)
    };
}

export function searchPlantInformationWeb(document, state, query, options = {}) {
    const source = normalizeDocument(document);
    const current = normalizedState(state);
    const value = String(query || '').trim();
    if (!value) return { ...current, searchQuery: '', searchMessage: 'Enter a plant name or knowledge topic.', searchPath: '', highlightedNodeId: '' };
    const results = typeof PimModel.pimSearch === 'function' ? PimModel.pimSearch(source, value, { includeDraft: options.includeDraft !== false }) : [];
    const result = results[0];
    if (!result) return { ...current, searchQuery: value, searchMessage: `No knowledge found for “${value}”.`, searchPath: '', highlightedNodeId: '' };
    if (!result.nodeId) {
        return { ...current, centerOpen: true, searchQuery: value, searchMessage: `Found ${result.title}.`, searchPath: result.pathLabel || result.title, highlightedNodeId: '' };
    }
    const node = nodeById(source, result.nodeId);
    const path = result.pathLabel || plantInformationWebPath(source, result.nodeId);
    return {
        ...current,
        centerOpen: true,
        openNodeIds: unique([...current.openNodeIds, ...asList(result.openNodeIds), ...ancestorsOf(source, result.nodeId).map(item => item.id)]),
        detailNodeId: node?.body ? result.nodeId : current.detailNodeId,
        highlightedNodeId: result.nodeId,
        visitedNodeIds: unique([...current.visitedNodeIds, result.nodeId]),
        searchQuery: value,
        searchMessage: `1 of ${results.length} matching topic${results.length === 1 ? '' : 's'}.`,
        searchPath: path
    };
}

function nodeButtonMarkup(document, node, state, options, suffix = 'visual', depth = 1) {
    const childNodes = childrenOf(document, node.id);
    const primary = !node.parentId;
    const expandable = primary || childNodes.length > 0;
    const open = state.openNodeIds.includes(node.id);
    const category = categoryFor(node);
    const panelId = `pim-web-children-${domToken(document.plantId)}-${domToken(node.id)}-${suffix}`;
    const highlighted = state.highlightedNodeId === node.id;
    const preview = concisePreview(node, primary);
    const cellStats = primary
        ? `<small class="pim-web-node-stats">${childNodes.length} submenu${childNodes.length === 1 ? '' : 's'} · ${descendantsOf(document, node.id).size + 1} cells</small>`
        : '';
    const expansion = expandable
        ? ` aria-expanded="${open}" aria-controls="${panelId}"`
        : ' aria-haspopup="dialog"';
    return `<button class="pim-web-node-button${open ? ' is-open' : ''}${highlighted ? ' is-highlighted' : ''}" type="button" data-pim-node-id="${attribute(node.id)}" data-pim-node-path="${attribute(node.path)}" data-pim-depth="${depth}"${expansion} style="--pim-category:${attribute(category.color)}">
        <span class="pim-web-category-marker" aria-hidden="true"></span>
        <span class="pim-web-node-copy"><strong>${escapeHtml(node.title)}</strong><small class="pim-web-ar-mini-info">${escapeHtml(preview)}</small>${cellStats}</span>
        <span class="pim-web-node-kind">${escapeHtml(category.title)}</span>
        <span class="pim-web-expansion-indicator" aria-hidden="true">${expandable ? open ? '−' : '+' : '→'}</span>
    </button>`;
}

function addInformationMarkup(parent, options, suffix) {
    if (!options.editable) return '';
    return `<button class="pim-web-add-information" type="button" data-pim-add-parent-id="${attribute(parent.id)}" data-pim-add-parent-path="${attribute(parent.path)}" data-pim-surface="${attribute(suffix)}"><span aria-hidden="true">+</span> Add information</button>`;
}

function nodeActionsMarkup(node, options, selected = true) {
    if (!options.editable || !selected) return '';
    const archived = node.status === 'archived';
    return `<div class="pim-web-node-actions" aria-label="Manage ${attribute(node.title)}"><button type="button" data-pim-edit-node-id="${attribute(node.id)}" aria-label="Rename or edit ${attribute(node.title)}">Edit</button><button type="button" data-pim-move-node="up" data-pim-move-node-id="${attribute(node.id)}" aria-label="Move ${attribute(node.title)} up">↑</button><button type="button" data-pim-move-node="down" data-pim-move-node-id="${attribute(node.id)}" aria-label="Move ${attribute(node.title)} down">↓</button><button type="button" data-pim-${archived ? 'restore' : 'archive'}-node-id="${attribute(node.id)}">${archived ? 'Restore' : 'Remove'}</button></div>`;
}

function visualNodeMarkup(document, node, state, options, depth = 1, seen = new Set()) {
    if (seen.has(node.id)) return '';
    const nextSeen = new Set(seen).add(node.id);
    const childNodes = childrenOf(document, node.id);
    const primary = !node.parentId;
    const open = state.openNodeIds.includes(node.id);
    const panelId = `pim-web-children-${domToken(document.plantId)}-${domToken(node.id)}-visual`;
    const empty = childNodes.length ? '' : `<p class="pim-web-empty-state">${primary ? 'Information not yet documented.' : 'Local knowledge may be added here.'}</p>`;
    const children = childNodes.map(child => visualNodeMarkup(document, child, state, options, depth + 1, nextSeen)).join('');
    const panel = primary || childNodes.length
        ? `<div class="pim-web-node-children" id="${panelId}" data-pim-parent-id="${attribute(node.id)}" data-pim-parent-path="${attribute(node.path)}"${open ? '' : ' hidden'}><span class="pim-web-connector" aria-hidden="true"></span><div class="pim-web-child-list">${children}${empty}</div>${addInformationMarkup(node, options, 'compass')}</div>`
        : '';
    return `<article class="pim-web-node${primary ? ' pim-web-node--primary' : ''}${node.status === 'archived' ? ' is-archived' : ''}" data-pim-node-container-id="${attribute(node.id)}" data-pim-node-container-path="${attribute(node.path)}" style="--pim-category:${attribute(categoryFor(node).color)}">${nodeButtonMarkup(document, node, state, options, 'visual', depth)}${nodeActionsMarkup(node, options)}${panel}</article>`;
}

function groupMarkup(document, group, state, options) {
    const entries = PIM_COMPASS.filter(entry => entry.compassGroup === group.id);
    const roots = entries.map(entry => nodeById(document, entry.id)).filter(Boolean);
    const cellCount = roots.reduce((total, root) => total + descendantsOf(document, root.id).size + 1, 0);
    return `<section class="pim-web-sector pim-web-sector--${attribute(group.id)}" data-pim-group="${attribute(group.id)}" aria-labelledby="pim-web-group-${attribute(group.id)}">
        <header class="pim-web-sector-heading"><p id="pim-web-group-${attribute(group.id)}"><strong>${escapeHtml(group.label)}</strong><span> — ${escapeHtml(group.question)}</span><small>${roots.length} section${roots.length === 1 ? '' : 's'} · ${cellCount} cells</small></p></header>
        <div class="pim-web-sector-branches">${roots.map(root => visualNodeMarkup(document, root, state, options)).join('')}</div>
    </section>`;
}

function customRootsMarkup(document, state, options) {
    const roots = typeof PimModel.pimChildren === 'function'
        ? PimModel.pimChildren(document, null).filter(node => !PIM_COMPASS_BY_ID[node.id])
        : [];
    if (!roots.length) return '';
    return `<section class="pim-web-sector pim-web-sector--custom" data-pim-group="custom" aria-label="Custom main cells"><header class="pim-web-sector-heading"><p><strong>Custom cells</strong><span> — User-defined knowledge branches</span><small>${roots.length} main cell${roots.length === 1 ? '' : 's'}</small></p></header><div class="pim-web-sector-branches">${roots.map(root => visualNodeMarkup(document, root, state, options)).join('')}</div></section>`;
}

function identityMarkup(document, state, suffix = 'visual', options = {}) {
    const identity = document.identity || {};
    const commonName = identity.commonName || identity.scientificName || document.plantId || 'Unnamed plant';
    const scientificName = identity.scientificName || 'Scientific name not documented';
    const statement = identity.identityStatement || 'A living profile whose knowledge can grow.';
    const explored = new Set(state.visitedNodeIds.filter(id => nodeById(document, id))).size;
    const explorable = Math.max(1, document.nodes.length);
    const progress = Math.min(100, Math.round((explored / explorable) * 100));
    const token = `${domToken(document.plantId)}-${domToken(suffix)}`;
    const showSearch = options.showSearch !== false;
    return `<section class="pim-web-identity" aria-labelledby="pim-web-identity-title-${token}">
        <div class="pim-web-identity-topline">
        <button class="pim-web-centre" type="button" data-pim-centre aria-expanded="${state.centerOpen}" aria-controls="pim-web-sectors-${token}">
            <span class="pim-web-plant-visual">${identity.image ? `<img src="${attribute(identity.image)}" alt="${attribute(commonName)}" />` : '<span aria-hidden="true">🌿</span>'}</span>
            <span class="pim-web-identity-copy"><strong id="pim-web-identity-title-${token}">${escapeHtml(commonName)}</strong><em>${escapeHtml(scientificName)}</em><small>${escapeHtml(statement)}</small></span>
            <span class="pim-web-centre-action">${state.centerOpen ? 'Close plant knowledge' : 'Open plant knowledge'}</span>
        </button>
        </div>
        ${showSearch ? `<form class="pim-web-search" data-pim-search-form role="search">
            <label for="pim-web-search-${token}">Search this plant’s knowledge</label>
            <div><input id="pim-web-search-${token}" name="query" type="search" value="${attribute(state.searchQuery)}" placeholder="Try nitrogen, seed or soil" autocomplete="off" aria-describedby="pim-web-search-status-${token}" /><button type="submit">Find</button></div>
        </form>
        <p class="pim-web-search-status" id="pim-web-search-status-${token}" role="status" aria-live="polite">${escapeHtml(state.searchMessage || 'Search opens and highlights a complete knowledge path.')}${state.searchPath ? `<strong>${escapeHtml(state.searchPath)}</strong>` : ''}</p>` : ''}
        <div class="pim-web-progress"><label for="pim-web-progress-${token}">Topics explored</label><progress id="pim-web-progress-${token}" max="100" value="${progress}">${progress}%</progress><span>${explored} of ${explorable}</span></div>
    </section>`;
}

function directionsInfoMarkup(document, suffix = 'compact') {
    const token = `${domToken(document.plantId)}-${domToken(suffix)}`;
    const panelId = `pim-web-directions-${token}`;
    const items = DIRECTION_ITEMS.map(([direction, label]) => `<span><b>${direction}</b>${label}</span>`).join('');
    return `<div class="pim-web-standalone-directions"><button class="pim-web-direction-info" type="button" data-pim-directions-info aria-expanded="false" aria-controls="${panelId}" aria-label="About plant knowledge directions">i</button><aside class="pim-web-info-overlay" id="${panelId}" data-pim-directions-panel role="dialog" aria-modal="false" aria-labelledby="${panelId}-title" aria-label="Plant knowledge directions" hidden><header><div><span>Plant Information Mesh</span><h2 id="${panelId}-title">How to read the diagram</h2></div><button type="button" data-pim-directions-close aria-label="Close diagram guide">×</button></header><p>Each cell opens the next level of plant knowledge. Several branches can stay open while you explore.</p><div class="pim-web-direction-key">${items}</div></aside></div>`;
}

function accessibleNodeMarkup(document, node, state, options, depth = 1, seen = new Set()) {
    if (seen.has(node.id)) return '';
    const nextSeen = new Set(seen).add(node.id);
    const children = childrenOf(document, node.id);
    const primary = !node.parentId;
    const open = state.openNodeIds.includes(node.id);
    const expandable = primary || children.length > 0;
    const panelId = `pim-web-children-${domToken(document.plantId)}-${domToken(node.id)}-list`;
    return `<li data-pim-list-item-id="${attribute(node.id)}" data-pim-list-item-path="${attribute(node.path)}">${nodeButtonMarkup(document, node, state, options, 'list', depth)}${nodeActionsMarkup(node, options, state.highlightedNodeId === node.id)}${expandable ? `<div id="${panelId}" class="pim-web-list-children"${open ? '' : ' hidden'}><ul>${children.map(child => accessibleNodeMarkup(document, child, state, options, depth + 1, nextSeen)).join('')}</ul>${children.length ? '' : '<p class="pim-web-empty-state">Information growing.</p>'}${addInformationMarkup(node, options, 'list')}</div>` : ''}</li>`;
}

function accessibleListMarkup(document, state, options) {
    const customRoots = typeof PimModel.pimChildren === 'function' ? PimModel.pimChildren(document, null).filter(node => !PIM_COMPASS_BY_ID[node.id]) : [];
    const roots = [...ACCESSIBLE_ROOT_ORDER.map(id => nodeById(document, id)).filter(Boolean), ...customRoots];
    const activeRoot = roots.find(root => root.id === state.outlineBranchId) || roots[0];
    const rail = roots.map(root => {
        const cells = descendantsOf(document, root.id).size + 1;
        return `<button type="button" class="pim-web-outline-branch${activeRoot?.id === root.id ? ' is-selected' : ''}" data-pim-outline-branch="${attribute(root.id)}" aria-pressed="${activeRoot?.id === root.id}"><span class="pim-web-category-marker" aria-hidden="true" style="--pim-category:${attribute(categoryFor(root).color)}"></span><span><strong>${escapeHtml(root.title)}</strong><small>${cells} cell${cells === 1 ? '' : 's'}</small></span></button>`;
    }).join('');
    const addActions = activeRoot && options.editable
        ? `<div class="pim-web-outline-actions"><button type="button" data-pim-add-parent-id="${attribute(activeRoot.id)}">Add submenu</button><button type="button" data-pim-add-parent-id="${attribute(activeRoot.id)}">Add cell</button></div>`
        : '';
    return `<section id="pim-web-sectors-${domToken(document.plantId)}-list" class="pim-web-accessible-list" data-pim-list-view aria-labelledby="pim-web-list-title"${state.viewMode === 'list' && state.centerOpen ? '' : ' hidden'}><div class="pim-web-outline-intro"><div><h2 id="pim-web-list-title">Plant knowledge outline</h2><p>Complete Plant Information Mesh · choose a branch, then open its cells.</p></div>${addActions}</div><div class="pim-web-outline-layout"><nav class="pim-web-outline-rail" aria-label="Main plant knowledge branches">${rail}</nav><div class="pim-web-outline-content"><p class="pim-web-outline-selection">${activeRoot ? `<strong>${escapeHtml(activeRoot.title)}</strong><span>${escapeHtml(activeRoot.preview || 'Information branch')}</span>` : 'Plant knowledge'}</p><ul class="pim-web-tree">${roots.map(root => accessibleNodeMarkup(document, root, state, options)).join('')}</ul></div></div></section>`;
}

function detailMarkup(document, state, options) {
    const node = nodeById(document, state.detailNodeId);
    if (!node) return '';
    const category = categoryFor(node);
    const sources = unique(node.sourceIds);
    const provenance = asList(node.provenance).filter(Boolean);
    const media = asList(node.media).filter(Boolean);
    const parent = node.parentId ? nodeById(document, node.parentId) : null;
    const children = childrenOf(document, node.id);
    const parentMarkup = parent
        ? `<button type="button" data-pim-related-node-id="${attribute(parent.id)}"><span>From</span>${escapeHtml(parent.title)}</button>`
        : '<span class="pim-web-related-root"><span>From</span>Plant identity</span>';
    const childrenMarkup = children.length
        ? children.map(child => `<button type="button" data-pim-related-node-id="${attribute(child.id)}"><span>Expands to</span>${escapeHtml(child.title)}</button>`).join('')
        : '<span class="pim-web-related-empty">No connected child cells yet.</span>';
    return `<aside class="pim-web-detail" role="dialog" aria-modal="false" aria-labelledby="pim-web-detail-title-${attribute(node.id)}" data-pim-detail-id="${attribute(node.id)}" data-pim-detail-path="${attribute(node.path)}" style="--pim-category:${attribute(category.color)}">
        <header><div><span>${escapeHtml(category.title)} · ${escapeHtml(evidenceLabel(node.evidenceStatus))}</span><h2 id="pim-web-detail-title-${attribute(node.id)}">${escapeHtml(node.title)}</h2><p>${escapeHtml(plantInformationWebPath(document, node.id))}</p></div><button type="button" data-pim-close-detail aria-label="Close ${attribute(node.title)} details">×</button></header>
        <div class="pim-web-detail-body"><section class="pim-web-ar-mini-card" aria-label="AR PIM mini information"><span>AR PIM mini info</span><strong>${escapeHtml(node.title)}</strong><p>${escapeHtml(concisePreview(node))}</p></section>${node.body ? `<p>${escapeHtml(node.body).replace(/\n/g, '<br />')}</p>` : '<p class="pim-web-optional-description">Description can be added when this cell needs more detail.</p>'}
            <section class="pim-web-related-cells" aria-label="Connected information cells"><h3>Connected cells</h3><div class="pim-web-related-parent">${parentMarkup}</div><div class="pim-web-related-children">${childrenMarkup}</div></section>
            <dl><div><dt>Information type</dt><dd>${escapeHtml(titleCase(node.informationType))}</dd></div><div><dt>Evidence</dt><dd>${escapeHtml(evidenceLabel(node.evidenceStatus))}</dd></div>${node.countryOfOrigin ? `<div><dt>Country of origin</dt><dd>${escapeHtml(node.countryOfOrigin)}</dd></div>` : ''}${node.region ? `<div><dt>Region</dt><dd>${escapeHtml(node.region)}</dd></div>` : ''}${node.climateContext ? `<div><dt>Climate context</dt><dd>${escapeHtml(node.climateContext)}</dd></div>` : ''}${node.attribution ? `<div><dt>Attribution</dt><dd>${escapeHtml(node.attribution)}</dd></div>` : ''}</dl>
            ${node.safetyNote ? `<section class="pim-web-safety-note" aria-label="Safety note"><strong>Safety note</strong><p>${escapeHtml(node.safetyNote)}</p></section>` : ''}
            ${sources.length ? `<section><h3>Sources</h3><ul>${sources.map(source => `<li>${escapeHtml(source)}</li>`).join('')}</ul></section>` : ''}
            ${provenance.length ? `<section><h3>Provenance</h3><ul>${provenance.map(item => `<li>${escapeHtml(item.sourceDatabase || item.source || 'Source')}${item.licence ? ` · ${escapeHtml(item.licence)}` : ''}${item.retrievalDate ? ` · ${escapeHtml(item.retrievalDate)}` : ''}</li>`).join('')}</ul></section>` : ''}
            ${media.length ? `<section><h3>Media</h3><ul>${media.map(item => `<li>${escapeHtml(typeof item === 'string' ? item : item.alt || item.url || 'Media item')}</li>`).join('')}</ul></section>` : ''}
        </div>
        ${options.editable ? `<footer><button type="button" data-pim-edit-node-id="${attribute(node.id)}" data-pim-edit-node-path="${attribute(node.path)}">Edit information</button></footer>` : ''}
    </aside>`;
}

function inputValue(value) {
    return attribute(Array.isArray(value) ? value.join(', ') : value || '');
}

function selectMarkup(name, label, values, selected, required = false) {
    return `<label>${escapeHtml(label)}<select name="${attribute(name)}"${required ? ' required' : ''}>${values.map(([value, text]) => `<option value="${attribute(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(text)}</option>`).join('')}</select></label>`;
}

function informationTemplateMarkup(parent, state, document) {
    if (state.editorMode !== 'add') return '';
    // Starters are suggestions, not one-time slots. A parent may contain
    // several cells with the same template (for example, two medicinal
    // entries about different preparations), so keep the palette available
    // and let the save path allocate a collision-safe id.
    const templates = templatesForParent(parent?.id);
    const heading = templates.length ? 'Add new cell' : 'Add new custom cell';
    return `<section class="pim-web-template-palette" aria-labelledby="pim-web-template-title">
        <div><strong id="pim-web-template-title">${heading}</strong><small>Choose a template or add a custom information block.</small></div>
        <div class="pim-web-template-options">${templates.map(([id, title, preview]) => `<button type="button" data-pim-template-id="${attribute(id)}" data-pim-template-title="${attribute(title)}" data-pim-template-preview="${attribute(preview)}">${escapeHtml(title)}</button>`).join('')}<button type="button" class="is-custom" data-pim-template-id="custom">Custom</button></div>
    </section>`;
}

function countryOfOriginMarkup(parent, state, seed) {
    const countryTemplate = parent?.id === 'historical-data' && (state.editorSeed?.templateId === 'country-or-region-of-origin' || state.editorSeed?.templateId === 'country-of-origin' || seed.countryOfOrigin);
    if (!countryTemplate) return '';
    return `<label class="pim-web-country-picker">Country of origin<select name="countryOfOrigin" required><option value="">Choose a country</option>${COUNTRY_OPTIONS.map(([value, label]) => `<option value="${attribute(label)}"${label === seed.countryOfOrigin ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label>`;
}

function editorMarkup(document, state, options) {
    if (!options.editable || !state.editorMode) return '';
    const editing = state.editorMode === 'edit' ? nodeById(document, state.editorNodeId) : null;
    const seed = { ...(state.editorSeed || {}), ...(editing || {}) };
    const topLevel = !editing && state.editorParentId === '__top_level__';
    const parent = editing ? nodeById(document, editing.parentId) : topLevel ? null : nodeById(document, state.editorParentId);
    if (!parent && !editing && !topLevel) return '';
    const category = editing || parent || { id: 'custom', title: 'Custom main cell', knowledgeMode: 'agency', color: '#4e7d62' };
    const title = editing ? `Edit ${editing.title}` : topLevel ? 'Add a custom main cell' : `Add information to ${parent.title}`;
    const provenance = asList(seed.provenance)[0] || {};
    const editorReady = state.editorMode === 'edit' || Boolean(state.editorSeed?.templateId);
    return `<aside class="pim-web-editor${editorReady ? '' : ' is-awaiting-template'}" role="dialog" aria-modal="true" aria-labelledby="pim-web-editor-title">
        <form data-pim-editor-form data-pim-editor-mode="${attribute(state.editorMode)}" data-pim-editor-node-id="${attribute(editing?.id || '')}" data-pim-editor-parent-id="${attribute(parent?.id || '')}">
            <header><div><span>Structured PIM editor</span><h2 id="pim-web-editor-title">${escapeHtml(title)}</h2></div><button type="button" data-pim-cancel-editor aria-label="Close information editor">×</button></header>
            ${informationTemplateMarkup(parent, state, document)}
            ${editorReady ? '' : '<p class="pim-web-editor-empty">Choose a template above, or choose <strong>Custom</strong>, to open the fields for one new information cell.</p>'}
            <div class="pim-web-editor-context" aria-label="Information location"><span>Plant <strong>${escapeHtml(document.identity?.commonName || document.plantId)}</strong></span><span>Parent <strong>${escapeHtml(parent?.title || (topLevel ? 'Mesh root' : editing?.parentId || ''))}</strong></span><span>Category <strong>${escapeHtml(category.title)}</strong></span></div>
            <input type="hidden" name="plantId" value="${inputValue(document.plantId)}" readonly />
            <input type="hidden" name="parentId" value="${inputValue(parent?.id || editing?.parentId || (topLevel ? '__top_level__' : ''))}" readonly />
            <input type="hidden" name="primaryCategory" value="${inputValue(category.id)}" readonly />
            <input type="hidden" name="knowledgeMode" value="${inputValue(category.knowledgeMode)}" readonly />
            <div class="pim-web-editor-fields pim-web-editor-fields--essential">
                ${countryOfOriginMarkup(parent, state, seed)}
                ${selectMarkup('informationType', 'Information type', INFORMATION_TYPES, seed.informationType || 'fact', true)}
                <label>Title<input name="title" value="${inputValue(seed.title)}" required maxlength="120" autofocus /></label>
                <label>Short preview<input name="preview" value="${inputValue(seed.preview)}" required maxlength="80" placeholder="Two to five useful words" /></label>
                <label class="pim-web-editor-wide">Information<textarea name="body" rows="5"${state.editorSeed?.templateId === 'country-of-origin' ? '' : ' required'} placeholder="Add the useful detail that belongs in this one information block.">${escapeHtml(seed.body || '')}</textarea></label>
            </div>
            <details class="pim-web-editor-advanced"><summary>More fields <span>Sources, evidence and display settings</span></summary>
                <div class="pim-web-editor-fields pim-web-editor-fields--advanced">
                    <label>Tags<input name="tags" value="${inputValue(seed.tags)}" placeholder="soil, nitrogen, classroom" /></label>
                    <label>Region or environmental context<input name="region" value="${inputValue(seed.region)}" /></label>
                    <label>Climate context<input name="climateContext" value="${inputValue(seed.climateContext)}" /></label>
                    <label>Source<input name="sourceIds" value="${inputValue(seed.sourceIds)}" /></label>
                    <label>Author or organisation<input name="authorOrganisation" value="${inputValue(seed.authorOrganisation || provenance.authorOrganisation)}" /></label>
                    <label>Attribution<input name="attribution" value="${inputValue(seed.attribution)}" /></label>
                    <label>Publication date<input name="publicationDate" type="date" value="${inputValue(seed.publicationDate || provenance.publicationDate)}" /></label>
                    <label>Retrieved date<input name="retrievalDate" type="date" value="${inputValue(seed.retrievalDate || provenance.retrievalDate)}" /></label>
                    ${selectMarkup('evidenceStatus', 'Evidence status', EVIDENCE_STATES, seed.evidenceStatus || 'needs_review', true)}
                    <label class="pim-web-editor-wide">Safety note<textarea name="safetyNote" rows="3">${escapeHtml(seed.safetyNote || '')}</textarea></label>
                    <label>Media<input name="media" value="${inputValue(asList(seed.media).map(item => typeof item === 'string' ? item : item.url))}" placeholder="Media URLs" /></label>
                    <label>Display order<input name="displayOrder" type="number" min="0" step="1" value="${inputValue(seed.displayOrder ?? 0)}" /></label>
                    ${selectMarkup('status', 'Publication status', PUBLICATION_STATES, seed.status || 'draft', true)}
                    <fieldset class="pim-web-editor-wide"><legend>Source provenance</legend><label>Database<input name="sourceDatabase" value="${inputValue(provenance.sourceDatabase)}" /></label><label>Record ID<input name="sourceRecordId" value="${inputValue(provenance.sourceRecordId)}" /></label><label>Source URL<input name="sourceUrl" type="url" value="${inputValue(provenance.sourceUrl)}" /></label><label>Licence<input name="licence" value="${inputValue(provenance.licence)}" /></label></fieldset>
                </div>
            </details>
            <p class="pim-web-editor-status" role="status" aria-live="polite">${escapeHtml(state.editorMessage)}</p>
            <footer><button type="button" data-pim-cancel-editor>Cancel</button><button class="pim-web-primary-action" type="submit">Save information</button></footer>
        </form>
    </aside>`;
}

function importItems(document, options) {
    const staging = options.importReview || document.importReview || document.importStaging || document.imports || null;
    if (Array.isArray(staging)) return { staging, items: staging };
    return { staging, items: asList(staging?.items || staging?.reviewItems || staging?.blocks) };
}

function importReviewMarkup(document, state, options) {
    if (!options.editable) return '';
    const { items: allItems } = importItems(document, options);
    const items = allItems.filter(item => !item.reviewStatus || item.reviewStatus === 'pending');
    if (!items.length) return '';
    return `<section class="pim-web-import-review" aria-labelledby="pim-web-import-title"><header><div><span>Editor review</span><h2 id="pim-web-import-title">Staged plant data</h2><p>Imported information remains unpublished until it is reviewed.</p></div><strong class="pim-web-import-count" aria-label="${items.length} item${items.length === 1 ? '' : 's'} awaiting review">${items.length}</strong></header><div class="pim-web-import-list">${items.map((item, index) => {
        const id = item.id || item.itemId || `import-${index + 1}`;
        const node = item.node || item.mappedNode || item.proposedNode || {};
        const rawDestination = item.destination || node.path || node.primaryCategory || item.primaryCategory || 'Needs mapping';
        const destination = typeof rawDestination === 'object'
            ? [rawDestination.primaryCategory, ...asList(rawDestination.parentChain).map(segment => segment?.title || segment?.id)].filter(Boolean).join(' → ')
            : String(rawDestination);
        const status = item.reviewStatus || item.status || 'pending';
        return `<article data-pim-import-id="${attribute(id)}" data-pim-import-destination="${attribute(destination)}"><div class="pim-web-import-copy"><span>${escapeHtml(item.sourceDatabase || item.source?.name || 'External source')}</span><h3>${escapeHtml(node.title || item.title || 'Imported information')}</h3><p>${escapeHtml(node.preview || item.normalizedValue || item.originalValue || 'Review this proposed block.')}</p><small>${escapeHtml(destination)} · ${escapeHtml(titleCase(status))}${item.conflict ? ' · Conflict detected' : ''}</small></div><footer><button class="pim-web-import-approve" type="button" data-pim-import-decision="approve" data-pim-import-id="${attribute(id)}">Approve</button><button type="button" data-pim-import-decision="reject" data-pim-import-id="${attribute(id)}">Reject</button><button type="button" data-pim-import-decision="modify" data-pim-import-id="${attribute(id)}">Modify</button></footer></article>`;
    }).join('')}</div><p class="pim-web-import-message" role="status" aria-live="polite">${escapeHtml(state.importMessage)}</p></section>`;
}

export function plantInformationWebMarkup(document, state = {}, options = {}) {
    const source = normalizeDocument(document);
    const current = normalizedState(state);
    const renderOptions = { ...options, editable: options.editable === true };
    const showIdentity = options.showIdentity !== false;
    const visualIdentity = showIdentity ? identityMarkup(source, current, 'visual', renderOptions) : '';
    const listIdentity = showIdentity ? identityMarkup(source, current, 'list', renderOptions) : '';
    const standaloneDirections = directionsInfoMarkup(source);
    const groups = GROUPS.map(group => groupMarkup(source, group, current, renderOptions)).join('');
    const compassView = current.viewMode === 'compass'
        ? `<div class="pim-web-compass-shell" data-pim-compass-view>${visualIdentity}<div class="pim-web-sectors" id="pim-web-sectors-${domToken(source.plantId)}-visual"${current.centerOpen ? '' : ' hidden'}>${groups}${customRootsMarkup(source, current, renderOptions)}</div></div>`
        : '';
    const listView = current.viewMode === 'list'
        ? `${showIdentity ? `<div class="pim-web-list-identity">${listIdentity}</div>` : ''}${accessibleListMarkup(source, current, renderOptions)}`
        : '';
    return `<article class="pim-web${current.centerOpen ? ' is-open' : ' is-collapsed'}" data-pim-web data-pim-plant-id="${attribute(source.plantId)}" data-pim-schema-version="${attribute(source.schemaVersion || '')}">
        <header class="pim-web-heading"><h1>Plant Information Mesh</h1><div class="pim-web-heading-tools"><div class="pim-web-view-switch" role="group" aria-label="Plant information view"><button type="button" data-pim-view="list" aria-pressed="${current.viewMode === 'list'}">Outline</button><button type="button" data-pim-view="compass" aria-pressed="${current.viewMode === 'compass'}">Diagram</button></div>${renderOptions.editable ? '<button type="button" class="pim-web-add-main" data-pim-add-top-level>Add main cell</button>' : ''}${standaloneDirections}</div></header>
        ${compassView}
        ${listView}
        ${detailMarkup(source, current, renderOptions)}
        ${editorMarkup(source, current, renderOptions)}
        ${importReviewMarkup(source, current, renderOptions)}
    </article>`;
}

export function createPlantInformationWebNodeId(document, parentId, title) {
    const safeId = value => String(value || 'information').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'information';
    const parent = String(parentId || '');
    const baseId = parent && parent !== '__top_level__' ? `${safeId(parent)}-${safeId(title)}` : safeId(title);
    const existingIds = new Set(normalizeDocument(document).nodes.map(node => node.id));
    let id = baseId;
    let suffix = 2;
    while (existingIds.has(id) || PIM_COMPASS_BY_ID[id]) id = `${baseId}-${suffix++}`;
    return id;
}

function editorPayload(form, document) {
    const values = Object.fromEntries(new FormData(form).entries());
    const split = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
    const parentId = String(values.parentId || '');
    const title = String(values.title || '').trim();
    const newId = createPlantInformationWebNodeId(document, parentId, title);
    const countryOfOrigin = String(values.countryOfOrigin || '').trim();
    const body = String(values.body || '').trim() || (countryOfOrigin ? `Country of origin: ${countryOfOrigin}.` : '');
    const provenance = values.sourceDatabase || values.sourceRecordId || values.sourceUrl || values.licence || values.authorOrganisation || values.publicationDate || values.retrievalDate
        ? [{
            sourceDatabase: values.sourceDatabase,
            sourceRecordId: values.sourceRecordId,
            sourceUrl: values.sourceUrl,
            licence: values.licence,
            authorOrganisation: values.authorOrganisation,
            publicationDate: values.publicationDate,
            retrievalDate: values.retrievalDate,
            reviewStatus: 'reviewed'
        }]
        : [];
    return {
        id: form.dataset.pimEditorMode === 'edit' ? form.dataset.pimEditorNodeId : newId,
        plantId: document.plantId,
        parentId,
        primaryCategory: values.primaryCategory,
        knowledgeMode: values.knowledgeMode,
        informationType: values.informationType,
        title,
        preview: String(values.preview || '').trim(),
        body,
        ...(countryOfOrigin ? { countryOfOrigin } : {}),
        tags: split(values.tags),
        region: String(values.region || '').trim(),
        climateContext: String(values.climateContext || '').trim(),
        sourceIds: split(values.sourceIds),
        authorOrganisation: String(values.authorOrganisation || '').trim(),
        attribution: String(values.attribution || '').trim(),
        publicationDate: values.publicationDate,
        evidenceStatus: values.evidenceStatus,
        safetyNote: String(values.safetyNote || '').trim(),
        media: split(values.media),
        displayOrder: Number(values.displayOrder || 0),
        status: values.status,
        provenance
    };
}

export function applyPlantInformationWebEdit(document, mode, nodeId, payload) {
    if (mode === 'edit') {
        if (typeof PimModel.pimUpdateNode !== 'function') throw new Error('PIM editing is not available in this build.');
        return PimModel.pimUpdateNode(document, nodeId, payload);
    }
    if (payload.parentId === '__top_level__' && typeof PimModel.pimAddTopLevelNode === 'function') return PimModel.pimAddTopLevelNode(document, { ...payload, parentId: null, primaryCategory: 'custom' });
    if (typeof PimModel.pimAddNode !== 'function') throw new Error('PIM editing is not available in this build.');
    return PimModel.pimAddNode(document, payload);
}

export function applyPlantInformationImportReview(staging, itemId, decision, patch) {
    if (typeof PimImportReview.reviewPimImport !== 'function') throw new Error('Import review is not available in this build.');
    return PimImportReview.reviewPimImport(staging, itemId, decision, patch);
}

export function mountPlantInformationWeb(container, options = {}) {
    if (!container || typeof container.addEventListener !== 'function') throw new TypeError('A mount container is required.');
    let document = normalizeDocument(options.document || {});
    let state = createPlantInformationWebState(document, options.initialState || {});
    let importReview = options.importReview || document.importReview || document.importStaging || null;
    const editable = options.editable === true;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const listenerOptions = controller ? { signal: controller.signal } : undefined;

    const publicState = () => clone(state);
    const selectedNode = () => nodeById(document, state.detailNodeId || state.highlightedNodeId);
    const notifyRoute = () => options.onRouteChange?.(publicState(), selectedNode());
    const focusNode = nodeId => {
        if (!nodeId) return;
        requestAnimationFrame(() => {
            const candidates = container.querySelectorAll('[data-pim-node-id]');
            const target = [...candidates].find(button => button.dataset.pimNodeId === nodeId && !button.closest('[hidden]'));
            if (!target) return;
            try { target.focus({ preventScroll: true }); }
            catch { target.focus(); }
        });
    };
    const render = focusId => {
        const previousScroll = typeof window !== 'undefined' && typeof window.scrollY === 'number'
            ? { left: window.scrollX, top: window.scrollY }
            : null;
        container.innerHTML = plantInformationWebMarkup(document, state, { ...options, editable, importReview });
        focusNode(focusId);
        if (previousScroll && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => window.scrollTo({ ...previousScroll, behavior: 'instant' }));
        }
    };
    const commit = (nextState, focusId = '', route = true) => {
        state = normalizedState(nextState);
        render(focusId);
        if (route) notifyRoute();
    };

    container.addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button || !container.contains(button)) return;
        if (button.matches('[data-pim-directions-close]')) {
            const panel = button.closest('[data-pim-directions-panel]');
            const trigger = panel?.id ? container.querySelector(`[aria-controls="${panel.id}"]`) : null;
            panel?.setAttribute('hidden', '');
            trigger?.setAttribute('aria-expanded', 'false');
            trigger?.focus();
            return;
        }
        if (button.matches('[data-pim-node-id]')) {
            const next = togglePlantInformationWebNode(document, state, button.dataset.pimNodeId);
            commit(next, button.dataset.pimNodeId);
            return;
        }
        if (button.matches('[data-pim-outline-branch]')) {
            const branchId = button.dataset.pimOutlineBranch;
            const next = typeof PimModel.pimOpenAncestors === 'function'
                ? { ...state, outlineBranchId: branchId, highlightedNodeId: branchId, openNodeIds: PimModel.pimOpenAncestors(document, state.openNodeIds, branchId) }
                : { ...state, outlineBranchId: branchId, highlightedNodeId: branchId };
            commit(next, branchId, false);
            return;
        }
        if (button.matches('[data-pim-centre]')) {
            commit(togglePlantInformationWebCentre(document, state));
            return;
        }
        if (button.matches('[data-pim-directions-info]')) {
            const panelId = button.getAttribute('aria-controls');
            const panel = panelId ? container.querySelector(`#${panelId}`) : null;
            const expanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!expanded));
            panel?.toggleAttribute('hidden', expanded);
            if (!expanded) panel?.querySelector('[data-pim-directions-close]')?.focus();
            return;
        }
        if (button.matches('[data-pim-related-node-id]')) {
            const relatedId = button.dataset.pimRelatedNodeId;
            const next = togglePlantInformationWebNode(document, state, relatedId);
            commit({ ...next, detailNodeId: relatedId }, relatedId);
            return;
        }
        if (button.matches('[data-pim-view]')) {
            commit({ ...state, viewMode: button.dataset.pimView === 'list' ? 'list' : 'compass' }, '', false);
            return;
        }
        if (button.matches('[data-pim-add-top-level]')) {
            commit({ ...state, editorMode: 'add', editorParentId: '__top_level__', editorNodeId: '', editorSeed: null, editorMessage: '' }, '', false);
            return;
        }
        if (button.matches('[data-pim-move-node]')) {
            try {
                const moved = PimModel.pimMoveNode?.(document, button.dataset.pimMoveNodeId, button.dataset.pimMoveNode);
                if (moved) { document = normalizeDocument(moved); commit(state, button.dataset.pimMoveNodeId); }
            } catch (error) { commit({ ...state, editorMessage: error.message }, button.dataset.pimMoveNodeId, false); }
            return;
        }
        if (button.matches('[data-pim-archive-node-id], [data-pim-restore-node-id]')) {
            const nodeId = button.dataset.pimArchiveNodeId || button.dataset.pimRestoreNodeId;
            const node = nodeById(document, nodeId);
            const restoring = button.matches('[data-pim-restore-node-id]');
            if (!restoring && !window.confirm(`Remove “${node?.title || 'this cell'}” from the active Mesh? Its information will be kept for restore.`)) return;
            try {
                const next = restoring ? PimModel.pimRestoreNode?.(document, nodeId) : PimModel.pimArchiveNode?.(document, nodeId);
                if (next) { document = normalizeDocument(next); commit(state, nodeId); }
            } catch (error) { commit({ ...state, editorMessage: error.message }, nodeId, false); }
            return;
        }
        if (button.matches('[data-pim-close-detail]')) {
            const focusId = state.detailNodeId;
            commit({ ...state, detailNodeId: '' }, focusId);
            return;
        }
        if (button.matches('[data-pim-add-parent-id]')) {
            commit({ ...state, editorMode: 'add', editorParentId: button.dataset.pimAddParentId, editorNodeId: '', editorSeed: null, editorMessage: '' }, '', false);
            return;
        }
        if (button.matches('[data-pim-template-id]')) {
            const templateId = button.dataset.pimTemplateId;
            const template = templatesForParent(state.editorParentId).find(([id]) => id === templateId);
            const existingSeed = state.editorSeed || {};
            const informationType = templateId.includes('traditional') || templateId.includes('religious') || templateId.includes('cultural')
                ? 'traditional_knowledge'
                : templateId.includes('country') || templateId.includes('origin')
                    ? 'historical_record'
                    : templateId === 'roles'
                        ? 'fact'
                        : 'practice';
            const editorSeed = template
                ? { ...existingSeed, templateId, informationType, title: template[1], preview: template[2], body: templateId.includes('country') || templateId.includes('origin') ? '' : existingSeed.body || '', countryOfOrigin: templateId.includes('country') || templateId.includes('origin') ? existingSeed.countryOfOrigin || '' : '' }
                : { ...existingSeed, templateId: 'custom', title: '', preview: '', body: '', countryOfOrigin: '' };
            commit({ ...state, editorSeed, editorMessage: template ? `${template[1]} template selected. Add the detail for this plant.` : 'Custom information block selected.' }, '', false);
            return;
        }
        if (button.matches('[data-pim-edit-node-id]')) {
            commit({ ...state, editorMode: 'edit', editorNodeId: button.dataset.pimEditNodeId, editorParentId: '', editorSeed: null, editorMessage: '' }, '', false);
            return;
        }
        if (button.matches('[data-pim-cancel-editor]')) {
            const focusId = state.editorNodeId || state.editorParentId;
            commit({ ...state, editorMode: '', editorNodeId: '', editorParentId: '', editorSeed: null, editorMessage: '' }, focusId, false);
            return;
        }
        if (button.matches('[data-pim-save-field-note]')) {
            options.onSaveFieldNote?.(nodeById(document, button.dataset.pimSaveFieldNote), document);
            return;
        }
        if (button.matches('[data-pim-compare]')) {
            options.onCompare?.(nodeById(document, button.dataset.pimCompare), document);
            return;
        }
        if (button.matches('[data-pim-import-decision]')) {
            const decision = button.dataset.pimImportDecision;
            const id = button.dataset.pimImportId;
            const { items, staging } = importItems(document, { importReview });
            const item = items.find((candidate, index) => String(candidate.id || candidate.itemId || `import-${index + 1}`) === id);
            if (decision === 'modify') {
                options.onModifyImport?.(item, document);
                const seed = item?.node || item?.mappedNode || item?.proposedNode || item || {};
                const parentId = seed.parentId || PIM_COMPASS_BY_ID[seed.primaryCategory]?.id || PIM_COMPASS[0].id;
                commit({ ...state, editorMode: 'add', editorParentId: parentId, editorNodeId: '', editorSeed: seed, importMessage: `Modify ${seed.title || 'imported information'} before approval.` }, '', false);
                return;
            }
            try {
                const callback = decision === 'approve' ? options.onApproveImport : options.onRejectImport;
                const callbackResult = await callback?.(item, document);
                if (callbackResult?.nodes) document = normalizeDocument(callbackResult);
                else if (callbackResult?.document?.nodes) {
                    importReview = callbackResult;
                    document = normalizeDocument(callbackResult.document);
                }
                if (!callback && staging && typeof PimImportReview.reviewPimImport === 'function') {
                    importReview = PimImportReview.reviewPimImport(staging, id, decision);
                    if (importReview?.document?.nodes) {
                        document = normalizeDocument(importReview.document);
                        await options.onSaveDocument?.(document);
                    }
                }
                commit({ ...state, importMessage: `${titleCase(decision)}d ${item?.node?.title || item?.title || 'imported information'}.` }, '', false);
            } catch (error) {
                commit({ ...state, importMessage: `Import review failed: ${error.message}` }, '', false);
            }
        }
    }, listenerOptions);

    container.addEventListener('submit', async event => {
        if (event.target.matches('[data-pim-search-form]')) {
            event.preventDefault();
            const query = new FormData(event.target).get('query');
            const next = searchPlantInformationWeb(document, state, query, { includeDraft: editable });
            commit(next, next.highlightedNodeId);
            return;
        }
        if (!event.target.matches('[data-pim-editor-form]')) return;
        event.preventDefault();
        const form = event.target;
        try {
            const payload = editorPayload(form, document);
            const nextDocument = applyPlantInformationWebEdit(document, form.dataset.pimEditorMode, form.dataset.pimEditorNodeId, payload);
            const saved = await options.onSaveDocument?.(nextDocument);
            document = normalizeDocument(saved?.nodes ? saved : nextDocument);
            const nodeId = form.dataset.pimEditorMode === 'edit'
                ? form.dataset.pimEditorNodeId
                : payload.id;
            const focusId = nodeId || (payload.parentId === '__top_level__' ? '' : payload.parentId);
            commit({ ...state, editorMode: '', editorNodeId: '', editorParentId: '', editorSeed: null, editorMessage: '', openNodeIds: focusId ? unique([...state.openNodeIds, focusId]) : state.openNodeIds, highlightedNodeId: nodeId || '' }, focusId);
        } catch (error) {
            commit({ ...state, editorMessage: `Could not save: ${error.message}` }, '', false);
        }
    }, listenerOptions);

    container.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (state.editorMode) commit({ ...state, editorMode: '', editorNodeId: '', editorParentId: '', editorSeed: null }, state.editorNodeId || state.editorParentId, false);
            else if (state.detailNodeId) commit({ ...state, detailNodeId: '' }, state.detailNodeId);
            return;
        }
        const current = event.target.closest('[data-pim-node-id]');
        if (!current || !['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        const visible = [...container.querySelectorAll('[data-pim-node-id]')].filter(button => !button.closest('[hidden]'));
        const index = visible.indexOf(current);
        if (index < 0) return;
        event.preventDefault();
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : ['ArrowDown', 'ArrowRight'].includes(event.key) ? Math.min(visible.length - 1, index + 1) : Math.max(0, index - 1);
        visible[nextIndex]?.focus();
    }, listenerOptions);

    render();
    return {
        getDocument: () => clone(document),
        getState: publicState,
        setDocument(nextDocument) { document = normalizeDocument(nextDocument); state = createPlantInformationWebState(document, state); render(); },
        setState(nextState) { state = normalizedState({ ...state, ...nextState }); render(); notifyRoute(); },
        toggleNode(nodeId) { commit(togglePlantInformationWebNode(document, state, nodeId), nodeId); },
        search(query) { const next = searchPlantInformationWeb(document, state, query, { includeDraft: editable }); commit(next, next.highlightedNodeId); },
        destroy() { controller?.abort(); container.innerHTML = ''; }
    };
}
