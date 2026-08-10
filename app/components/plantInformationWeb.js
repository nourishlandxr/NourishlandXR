import { PIM_COMPASS, PIM_COMPASS_BY_ID } from '../services/pimCompass.js';
import * as PimModel from '../services/pimModel.js';
import * as PimImportReview from '../services/pimImportReview.js';

const GROUPS = Object.freeze([
    { id: 'relationship', label: 'Relationship', question: 'How this plant belongs in living systems' },
    { id: 'agency', label: 'Agency', question: 'What people can make, practise and share' },
    { id: 'certainty', label: 'Certainty', question: 'What is documented and established' },
    { id: 'process', label: 'Process', question: 'How plants begin, grow and receive care' }
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

const USE_INFORMATION_TEMPLATES = Object.freeze([
    ['root', 'Root', 'Root use or observation'],
    ['leaves', 'Leaves', 'Leaf use or observation'],
    ['pods', 'Pods', 'Pod use or observation'],
    ['fruit', 'Fruit', 'Fruit use or observation'],
    ['beans', 'Beans', 'Bean use or preparation'],
    ['seeds', 'Seeds', 'Seed use or preparation'],
    ['bark', 'Bark', 'Bark use or material']
]);

const HISTORICAL_INFORMATION_TEMPLATES = Object.freeze([
    ['country-of-origin', 'Country of origin', 'Select a country'],
    ['scripture-traditional-links', 'Scripture & traditional links', 'Attributed cultural links']
]);

const FOOD_FOREST_INFORMATION_TEMPLATES = Object.freeze([
    ['function', 'Function', 'Ecological or food-forest role']
]);

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

const USE_TEMPLATE_PARENT_IDS = new Set(['culinary', 'medicinal', 'craft']);

const templatesForParent = parentId => USE_TEMPLATE_PARENT_IDS.has(parentId)
    ? USE_INFORMATION_TEMPLATES
    : parentId === 'historical-data'
        ? HISTORICAL_INFORMATION_TEMPLATES
        : parentId === 'food-forest'
            ? FOOD_FOREST_INFORMATION_TEMPLATES
            : [];

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
    return isRoot ? 'Information growing' : 'Open this topic';
}

function evidenceLabel(value) {
    return EVIDENCE_STATES.find(([id]) => id === value)?.[1] || titleCase(value || 'needs_review');
}

function categoryFor(node) {
    return PIM_COMPASS_BY_ID[node?.primaryCategory || node?.id] || PIM_COMPASS[0];
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
        viewMode: state.viewMode === 'list' ? 'list' : 'compass',
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
    const expansion = expandable
        ? ` aria-expanded="${open}" aria-controls="${panelId}"`
        : ' aria-haspopup="dialog"';
    return `<button class="pim-web-node-button${open ? ' is-open' : ''}${highlighted ? ' is-highlighted' : ''}" type="button" data-pim-node-id="${attribute(node.id)}" data-pim-node-path="${attribute(node.path)}" data-pim-depth="${depth}"${expansion} style="--pim-category:${attribute(category.color)}">
        <span class="pim-web-category-marker" aria-hidden="true"></span>
        <span class="pim-web-node-copy"><strong>${escapeHtml(node.title)}</strong><small>${escapeHtml(preview)}</small></span>
        <span class="pim-web-node-kind">${escapeHtml(category.title)}</span>
        <span class="pim-web-expansion-indicator" aria-hidden="true">${expandable ? open ? '−' : '+' : '→'}</span>
    </button>`;
}

function addInformationMarkup(parent, options, suffix) {
    if (!options.editable) return '';
    return `<button class="pim-web-add-information" type="button" data-pim-add-parent-id="${attribute(parent.id)}" data-pim-add-parent-path="${attribute(parent.path)}" data-pim-surface="${attribute(suffix)}"><span aria-hidden="true">+</span> Add information</button>`;
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
    return `<article class="pim-web-node${primary ? ' pim-web-node--primary' : ''}" data-pim-node-container-id="${attribute(node.id)}" data-pim-node-container-path="${attribute(node.path)}" style="--pim-category:${attribute(categoryFor(node).color)}">${nodeButtonMarkup(document, node, state, options, 'visual', depth)}${panel}</article>`;
}

function groupMarkup(document, group, state, options) {
    const entries = PIM_COMPASS.filter(entry => entry.compassGroup === group.id);
    const roots = entries.map(entry => nodeById(document, entry.id)).filter(Boolean);
    return `<section class="pim-web-sector pim-web-sector--${attribute(group.id)}" data-pim-group="${attribute(group.id)}" aria-labelledby="pim-web-group-${attribute(group.id)}">
        <header class="pim-web-sector-heading"><p>${escapeHtml(group.label)}</p><span>${escapeHtml(group.question)}</span></header>
        <div class="pim-web-sector-branches">${roots.map(root => visualNodeMarkup(document, root, state, options)).join('')}</div>
    </section>`;
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
    const directionPanelId = `pim-web-directions-${token}`;
    return `<section class="pim-web-identity" aria-labelledby="pim-web-identity-title-${token}">
        <div class="pim-web-identity-topline">
        <button class="pim-web-centre" type="button" data-pim-centre aria-expanded="${state.centerOpen}" aria-controls="pim-web-sectors-${token}">
            <span class="pim-web-plant-visual">${identity.image ? `<img src="${attribute(identity.image)}" alt="${attribute(commonName)}" />` : '<span aria-hidden="true">🌿</span>'}</span>
            <span class="pim-web-identity-copy"><strong id="pim-web-identity-title-${token}">${escapeHtml(commonName)}</strong><em>${escapeHtml(scientificName)}</em><small>${escapeHtml(statement)}</small></span>
            <span class="pim-web-centre-action">${state.centerOpen ? 'Close plant knowledge' : 'Open plant knowledge'}</span>
        </button>
        <button class="pim-web-direction-info" type="button" data-pim-directions-info aria-expanded="false" aria-controls="${directionPanelId}" aria-label="About plant knowledge directions">i</button>
        </div>
        <div class="pim-web-direction-key" id="${directionPanelId}" aria-label="Plant knowledge directions" hidden><span><b>Top</b> Relationship</span><span><b>Left</b> Agency</span><span><b>Right</b> Certainty</span><span><b>Bottom</b> Process</span></div>
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
    return `<div class="pim-web-standalone-directions"><button class="pim-web-direction-info" type="button" data-pim-directions-info aria-expanded="false" aria-controls="${panelId}" aria-label="About plant knowledge directions">i</button><div class="pim-web-direction-key" id="${panelId}" aria-label="Plant knowledge directions" hidden><span><b>Top</b> Relationship</span><span><b>Left</b> Agency</span><span><b>Right</b> Certainty</span><span><b>Bottom</b> Process</span></div></div>`;
}

function accessibleNodeMarkup(document, node, state, options, depth = 1, seen = new Set()) {
    if (seen.has(node.id)) return '';
    const nextSeen = new Set(seen).add(node.id);
    const children = childrenOf(document, node.id);
    const primary = !node.parentId;
    const open = state.openNodeIds.includes(node.id);
    const expandable = primary || children.length > 0;
    const panelId = `pim-web-children-${domToken(document.plantId)}-${domToken(node.id)}-list`;
    return `<li data-pim-list-item-id="${attribute(node.id)}" data-pim-list-item-path="${attribute(node.path)}">${nodeButtonMarkup(document, node, state, options, 'list', depth)}${expandable ? `<div id="${panelId}" class="pim-web-list-children"${open ? '' : ' hidden'}><ul>${children.map(child => accessibleNodeMarkup(document, child, state, options, depth + 1, nextSeen)).join('')}</ul>${children.length ? '' : '<p class="pim-web-empty-state">Information growing.</p>'}${addInformationMarkup(node, options, 'list')}</div>` : ''}</li>`;
}

function accessibleListMarkup(document, state, options) {
    const roots = PIM_COMPASS.map(entry => nodeById(document, entry.id)).filter(Boolean);
    return `<section class="pim-web-accessible-list" data-pim-list-view aria-labelledby="pim-web-list-title"${state.viewMode === 'list' && state.centerOpen ? '' : ' hidden'}><h2 id="pim-web-list-title">Complete Plant Information Mesh</h2><p>Explore the same knowledge in a structured expandable list.</p><ul class="pim-web-tree">${roots.map(root => accessibleNodeMarkup(document, root, state, options)).join('')}</ul></section>`;
}

function detailMarkup(document, state, options) {
    const node = nodeById(document, state.detailNodeId);
    if (!node) return '';
    const category = categoryFor(node);
    const sources = unique(node.sourceIds);
    const provenance = asList(node.provenance).filter(Boolean);
    const media = asList(node.media).filter(Boolean);
    return `<aside class="pim-web-detail" role="dialog" aria-modal="false" aria-labelledby="pim-web-detail-title-${attribute(node.id)}" data-pim-detail-id="${attribute(node.id)}" data-pim-detail-path="${attribute(node.path)}" style="--pim-category:${attribute(category.color)}">
        <header><div><span>${escapeHtml(category.title)} · ${escapeHtml(evidenceLabel(node.evidenceStatus))}</span><h2 id="pim-web-detail-title-${attribute(node.id)}">${escapeHtml(node.title)}</h2><p>${escapeHtml(plantInformationWebPath(document, node.id))}</p></div><button type="button" data-pim-close-detail aria-label="Close ${attribute(node.title)} details">×</button></header>
        <div class="pim-web-detail-body">${node.body ? `<p>${escapeHtml(node.body).replace(/\n/g, '<br />')}</p>` : '<p>Detailed information is still growing.</p>'}
            <dl><div><dt>Information type</dt><dd>${escapeHtml(titleCase(node.informationType))}</dd></div><div><dt>Evidence</dt><dd>${escapeHtml(evidenceLabel(node.evidenceStatus))}</dd></div>${node.countryOfOrigin ? `<div><dt>Country of origin</dt><dd>${escapeHtml(node.countryOfOrigin)}</dd></div>` : ''}${node.region ? `<div><dt>Region</dt><dd>${escapeHtml(node.region)}</dd></div>` : ''}${node.climateContext ? `<div><dt>Climate context</dt><dd>${escapeHtml(node.climateContext)}</dd></div>` : ''}${node.attribution ? `<div><dt>Attribution</dt><dd>${escapeHtml(node.attribution)}</dd></div>` : ''}</dl>
            ${node.safetyNote ? `<section class="pim-web-safety-note" aria-label="Safety note"><strong>Safety note</strong><p>${escapeHtml(node.safetyNote)}</p></section>` : ''}
            ${sources.length ? `<section><h3>Sources</h3><ul>${sources.map(source => `<li>${escapeHtml(source)}</li>`).join('')}</ul></section>` : ''}
            ${provenance.length ? `<section><h3>Provenance</h3><ul>${provenance.map(item => `<li>${escapeHtml(item.sourceDatabase || item.source || 'Source')}${item.licence ? ` · ${escapeHtml(item.licence)}` : ''}${item.retrievalDate ? ` · ${escapeHtml(item.retrievalDate)}` : ''}</li>`).join('')}</ul></section>` : ''}
            ${media.length ? `<section><h3>Media</h3><ul>${media.map(item => `<li>${escapeHtml(typeof item === 'string' ? item : item.alt || item.url || 'Media item')}</li>`).join('')}</ul></section>` : ''}
        </div>
        <footer><button type="button" data-pim-save-field-note="${attribute(node.id)}">Save to Field Notes</button><button type="button" data-pim-compare="${attribute(node.id)}">Compare with another plant</button>${options.editable ? `<button type="button" data-pim-edit-node-id="${attribute(node.id)}" data-pim-edit-node-path="${attribute(node.path)}">Edit information</button>` : ''}</footer>
    </aside>`;
}

function inputValue(value) {
    return attribute(Array.isArray(value) ? value.join(', ') : value || '');
}

function selectMarkup(name, label, values, selected, required = false) {
    return `<label>${escapeHtml(label)}<select name="${attribute(name)}"${required ? ' required' : ''}>${values.map(([value, text]) => `<option value="${attribute(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(text)}</option>`).join('')}</select></label>`;
}

function informationTemplateMarkup(parent, state) {
    if (state.editorMode !== 'add') return '';
    const templates = templatesForParent(parent?.id);
    if (!templates.length) return '';
    const heading = USE_TEMPLATE_PARENT_IDS.has(parent?.id) ? 'Start with a plant part' : 'Start with a knowledge block';
    return `<section class="pim-web-template-palette" aria-labelledby="pim-web-template-title">
        <div><strong id="pim-web-template-title">${heading}</strong><small>Choose a starter or create a custom information block.</small></div>
        <div class="pim-web-template-options">${templates.map(([id, title, preview]) => `<button type="button" data-pim-template-id="${attribute(id)}" data-pim-template-title="${attribute(title)}" data-pim-template-preview="${attribute(preview)}">${escapeHtml(title)}</button>`).join('')}<button type="button" class="is-custom" data-pim-template-id="custom">Custom</button></div>
    </section>`;
}

function countryOfOriginMarkup(parent, state, seed) {
    const countryTemplate = parent?.id === 'historical-data' && (state.editorSeed?.templateId === 'country-of-origin' || seed.countryOfOrigin);
    if (!countryTemplate) return '';
    return `<label class="pim-web-country-picker">Country of origin<select name="countryOfOrigin" required><option value="">Choose a country</option>${COUNTRY_OPTIONS.map(([value, label]) => `<option value="${attribute(label)}"${label === seed.countryOfOrigin ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label>`;
}

function editorMarkup(document, state, options) {
    if (!options.editable || !state.editorMode) return '';
    const editing = state.editorMode === 'edit' ? nodeById(document, state.editorNodeId) : null;
    const seed = { ...(state.editorSeed || {}), ...(editing || {}) };
    const parent = editing ? nodeById(document, editing.parentId) : nodeById(document, state.editorParentId);
    if (!parent && !editing) return '';
    const category = categoryFor(editing || parent);
    const title = editing ? `Edit ${editing.title}` : `Add information to ${parent.title}`;
    const provenance = asList(seed.provenance)[0] || {};
    return `<aside class="pim-web-editor" role="dialog" aria-modal="true" aria-labelledby="pim-web-editor-title">
        <form data-pim-editor-form data-pim-editor-mode="${attribute(state.editorMode)}" data-pim-editor-node-id="${attribute(editing?.id || '')}" data-pim-editor-parent-id="${attribute(parent?.id || '')}">
            <header><div><span>Structured PIM editor</span><h2 id="pim-web-editor-title">${escapeHtml(title)}</h2></div><button type="button" data-pim-cancel-editor aria-label="Close information editor">×</button></header>
            ${informationTemplateMarkup(parent, state)}
            <div class="pim-web-editor-context" aria-label="Information location"><span>Plant <strong>${escapeHtml(document.identity?.commonName || document.plantId)}</strong></span><span>Parent <strong>${escapeHtml(parent?.title || editing?.parentId || '')}</strong></span><span>Category <strong>${escapeHtml(category.title)}</strong></span></div>
            <input type="hidden" name="plantId" value="${inputValue(document.plantId)}" readonly />
            <input type="hidden" name="parentId" value="${inputValue(parent?.id || editing?.parentId)}" readonly />
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
    const { items } = importItems(document, options);
    if (!items.length) return '';
    return `<section class="pim-web-import-review" aria-labelledby="pim-web-import-title"><header><div><span>Editor review</span><h2 id="pim-web-import-title">Staged plant data</h2><p>Imported information remains unpublished until it is reviewed.</p></div><strong>${items.length}</strong></header><div class="pim-web-import-list">${items.map((item, index) => {
        const id = item.id || item.itemId || `import-${index + 1}`;
        const node = item.node || item.mappedNode || item.proposedNode || {};
        const rawDestination = item.destination || node.path || node.primaryCategory || item.primaryCategory || 'Needs mapping';
        const destination = typeof rawDestination === 'object'
            ? [rawDestination.primaryCategory, ...asList(rawDestination.parentChain).map(segment => segment?.title || segment?.id)].filter(Boolean).join(' → ')
            : String(rawDestination);
        const status = item.reviewStatus || item.status || 'pending';
        return `<article data-pim-import-id="${attribute(id)}" data-pim-import-destination="${attribute(destination)}"><div><span>${escapeHtml(item.sourceDatabase || item.source?.name || 'External source')}</span><h3>${escapeHtml(node.title || item.title || 'Imported information')}</h3><p>${escapeHtml(node.preview || item.normalizedValue || item.originalValue || 'Review this proposed block.')}</p><small>${escapeHtml(destination)} · ${escapeHtml(titleCase(status))}${item.conflict ? ' · Conflict detected' : ''}</small></div><footer><button type="button" data-pim-import-decision="approve" data-pim-import-id="${attribute(id)}">Approve</button><button type="button" data-pim-import-decision="reject" data-pim-import-id="${attribute(id)}">Reject</button><button type="button" data-pim-import-decision="modify" data-pim-import-id="${attribute(id)}">Modify</button></footer></article>`;
    }).join('')}</div><p role="status" aria-live="polite">${escapeHtml(state.importMessage)}</p></section>`;
}

export function plantInformationWebMarkup(document, state = {}, options = {}) {
    const source = normalizeDocument(document);
    const current = normalizedState(state);
    const renderOptions = { ...options, editable: options.editable === true };
    const showIdentity = options.showIdentity !== false;
    const visualIdentity = showIdentity ? identityMarkup(source, current, 'visual', renderOptions) : '';
    const listIdentity = showIdentity ? identityMarkup(source, current, 'list', renderOptions) : '';
    const standaloneDirections = showIdentity ? '' : directionsInfoMarkup(source);
    const groups = GROUPS.map(group => groupMarkup(source, group, current, renderOptions)).join('');
    return `<article class="pim-web${current.centerOpen ? ' is-open' : ' is-collapsed'}" data-pim-web data-pim-plant-id="${attribute(source.plantId)}" data-pim-schema-version="${attribute(source.schemaVersion || '')}">
        <header class="pim-web-heading"><div><p>Plant Information Mesh</p><h1>Plant knowledge</h1></div><div class="pim-web-heading-tools">${standaloneDirections}<div class="pim-web-view-switch" role="group" aria-label="Plant information view"><button type="button" data-pim-view="compass" aria-pressed="${current.viewMode === 'compass'}">Diagram view</button><button type="button" data-pim-view="list" aria-pressed="${current.viewMode === 'list'}">Accessible list</button></div></div></header>
        <div class="pim-web-compass-shell" data-pim-compass-view${current.viewMode === 'compass' ? '' : ' hidden'}>${visualIdentity}<div class="pim-web-sectors" id="pim-web-sectors-${domToken(source.plantId)}-visual"${current.centerOpen ? '' : ' hidden'}>${groups}</div></div>
        ${showIdentity && current.viewMode === 'list' ? `<div class="pim-web-list-identity">${listIdentity}<span id="pim-web-sectors-${domToken(source.plantId)}-list"${current.centerOpen ? '' : ' hidden'}></span></div>` : ''}
        ${accessibleListMarkup(source, current, renderOptions)}
        ${detailMarkup(source, current, renderOptions)}
        ${editorMarkup(source, current, renderOptions)}
        ${importReviewMarkup(source, current, renderOptions)}
    </article>`;
}

function editorPayload(form, document) {
    const values = Object.fromEntries(new FormData(form).entries());
    const split = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
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
        plantId: document.plantId,
        parentId: values.parentId,
        primaryCategory: values.primaryCategory,
        knowledgeMode: values.knowledgeMode,
        informationType: values.informationType,
        title: String(values.title || '').trim(),
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
            [...candidates].find(button => button.dataset.pimNodeId === nodeId && !button.closest('[hidden]'))?.focus();
        });
    };
    const render = focusId => {
        container.innerHTML = plantInformationWebMarkup(document, state, { ...options, editable, importReview });
        focusNode(focusId);
    };
    const commit = (nextState, focusId = '', route = true) => {
        state = normalizedState(nextState);
        render(focusId);
        if (route) notifyRoute();
    };

    container.addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button || !container.contains(button)) return;
        if (button.matches('[data-pim-node-id]')) {
            const next = togglePlantInformationWebNode(document, state, button.dataset.pimNodeId);
            commit(next, button.dataset.pimNodeId);
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
            return;
        }
        if (button.matches('[data-pim-view]')) {
            commit({ ...state, viewMode: button.dataset.pimView === 'list' ? 'list' : 'compass' }, '', false);
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
            const informationType = templateId === 'scripture-traditional-links'
                ? 'traditional_knowledge'
                : templateId === 'country-of-origin'
                    ? 'historical_record'
                    : templateId === 'function'
                        ? 'fact'
                        : 'practice';
            const editorSeed = template
                ? { ...existingSeed, templateId, informationType, title: template[1], preview: template[2], body: templateId === 'country-of-origin' ? '' : existingSeed.body || '', countryOfOrigin: templateId === 'country-of-origin' ? existingSeed.countryOfOrigin || '' : '' }
                : { ...existingSeed, templateId: '', title: '', preview: '', body: '', countryOfOrigin: '' };
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
                : document.nodes.find(node => node.parentId === payload.parentId && node.title === payload.title)?.id;
            commit({ ...state, editorMode: '', editorNodeId: '', editorParentId: '', editorSeed: null, editorMessage: '', openNodeIds: unique([...state.openNodeIds, payload.parentId]), highlightedNodeId: nodeId || payload.parentId }, nodeId || payload.parentId);
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
