import { loadMarkerAnchor, loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces, saveMarkerAnchor } from '../services/persistence.js';
import { loadResolvedPlantsForPlace, searchGlobalPlants } from '../services/plantDataService.js';
import { openGlobalPlantProfile } from './fieldMarker.js';
import { PLANT_SEARCH_SOURCE_LABEL } from '../services/plantSearchProviders.js';
import { rankPlantSearchResults } from '../services/plantSearchRelevance.js';
import { DEFAULT_HOME_AREA_NAME, areaIcon, isDefaultHomeArea } from '../services/arExperienceConfig.js';
import { DEFAULT_TOTEM_COLOR } from '../services/totemAppearance.js';
import { physicalMarkerLabel } from '../services/physicalAnchor.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
const webHubIcon = name => {
    const paths = {
        leaf: '<path d="M19.5 4.5C10 4.7 5.2 8.2 5.2 14.1c0 3.2 2.2 5.4 5.4 5.4 5.9 0 8.4-4.8 8.9-15Z"/><path d="M4.5 20.5c2.9-3.8 6.4-6.2 10.7-8.2"/>',
        area: '<path d="M4 5.5h6l2 2h8v11H4z"/><path d="M4 9h16"/>',
        map: '<path d="m4 5 5-2 6 2 5-2v16l-5 2-6-2-5 2z"/><path d="M9 3v16M15 5v16"/>',
        layers: '<path d="m12 4 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/>',
        anchor: '<path d="M12 4v12M8 8h8M7 16a5 5 0 0 0 10 0"/><path d="M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>',
        chevron: '<path d="m8 5 7 7-7 7"/>'
    };
    return `<svg class="webhub-icon webhub-icon-${name}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.leaf}</svg>`;
};
const plantCapability = plant => {
    const storedPim = plant?.pim_document || plant?.pim;
    const hasPim = Boolean(
        (storedPim && typeof storedPim === 'object' && (!Array.isArray(storedPim.nodes) || storedPim.nodes.length > 0))
        || (Array.isArray(plant?.pim_nodes) && plant.pim_nodes.length > 0)
        || (Array.isArray(plant?.pim_categories) && plant.pim_categories.length > 0)
    );
    if (hasPim) return { id: 'pim', label: 'PIM', symbol: '✦', description: 'Plant Information Mesh enabled' };
    if (plant?.profile_enabled === true || plant?.spm_enabled === true) return { id: 'advanced', label: 'Advanced', symbol: '◆', description: 'Advanced plant profile enabled' };
    return { id: 'basic', label: 'Basic', symbol: '●', description: 'Basic plant record' };
};
const plantCapabilityMarkup = plant => {
    const capability = plantCapability(plant);
    return `<span class="field-guide-plant-capability field-guide-plant-capability--${capability.id}" title="${escapeHtml(capability.description)}" aria-label="${escapeHtml(capability.description)}"><span aria-hidden="true">${capability.symbol}</span>${capability.label}</span>`;
};
const scientificNameMarkup = value => {
    const scientificName = String(value || '').trim();
    return scientificName ? `<small><em>${escapeHtml(scientificName)}</em></small>` : '';
};
let currentGuide = null;
let currentGuidePlaceId = '';
let globalGuideSearchTimer = null;
let globalSearchQuery = '';

const GLOBAL_FACT_DESTINATIONS = Object.freeze({
    common_name: ['Plant identity', 'Identity & taxonomy'], scientific_name: ['Scientific Information', 'Taxonomy'],
    canonical_name: ['Scientific Information', 'Taxonomy'], family: ['Scientific Information', 'Classification'],
    kingdom: ['Scientific Information', 'Classification'], rank: ['Scientific Information', 'Classification'],
    image: ['Plant profile', 'Reference image'], description: ['Scientific Information', 'Description'],
    growth_form: ['Scientific Information', 'Form & dimensions'], height: ['Scientific Information', 'Form & dimensions'],
    climate: ['Cultivation', 'Climate & tolerances'], sun: ['Cultivation', 'Sun, water & soil'],
    water: ['Cultivation', 'Sun, water & soil'], soil: ['Cultivation', 'Sun, water & soil'],
    cultivation: ['Cultivation', 'Cultivation'], propagation: ['Propagation', 'Propagation'],
    edible_uses: ['Uses', 'Culinary'], useful_parts: ['Uses', 'Useful parts'],
    ecological_relationships: ['Food Forest', 'Ecological relationships'], food_forest_roles: ['Food Forest', 'Functions'],
    distribution: ['Historical Data', 'Distribution & history'], warnings: ['Scientific Information', 'Warnings']
});
const GLOBAL_FACT_SECONDARY_DESTINATIONS = Object.freeze({
    height: ['Food Forest', 'Layer'], growth_form: ['Food Forest', 'Layer'], climate: ['Food Forest', 'Site placement'],
    soil: ['Food Forest', 'Relationships'], sun: ['Food Forest', 'Site placement'], water: ['Food Forest', 'Site placement'],
    life_cycle: ['Food Forest', 'Layer'], evergreen_deciduous: ['Food Forest', 'Layer'],
    flower_characteristics: ['Propagation', 'Pollination'], reproductive_traits: ['Propagation', 'Pollination'],
    traditional_use: ['Historical Data', 'Traditional knowledge'], traditional_uses: ['Historical Data', 'Traditional knowledge'],
    ecological_function: ['Scientific Information', 'Observed relationships']
});
const factDestinations = key => [GLOBAL_FACT_DESTINATIONS[key] || ['Unassigned', 'Review and choose destination'], ...(GLOBAL_FACT_SECONDARY_DESTINATIONS[key] ? [GLOBAL_FACT_SECONDARY_DESTINATIONS[key]] : [])];
const destinationCategoryId = value => ({ 'Plant identity': 'plant-identity', 'Scientific Information': 'scientific-information', Uses: 'uses', 'Food Forest': 'food-forest', Cultivation: 'cultivation', Propagation: 'propagation', 'Historical Data': 'historical-data', Unassigned: 'unassigned' }[value] || String(value || '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-'));
const PIM_ALLOCATION_CATEGORIES = Object.freeze([
    { id: 'scientific-information', label: 'Scientific Information', fallbackCell: 'Imported facts' },
    { id: 'uses', label: 'Uses', fallbackCell: 'Imported uses' },
    { id: 'food-forest', label: 'Food Forest', fallbackCell: 'Imported ecological information' },
    { id: 'cultivation', label: 'Cultivation', fallbackCell: 'Imported growing information' },
    { id: 'propagation', label: 'Propagation', fallbackCell: 'Imported propagation information' },
    { id: 'historical-data', label: 'Historical Data', fallbackCell: 'Imported history' }
]);
const PIM_ALLOCATION_CATEGORY_IDS = new Set(PIM_ALLOCATION_CATEGORIES.map(category => category.id));
const PROFILE_ONLY_FACTS = new Set(['common_name', 'alternative_names', 'image']);
const pimAllocationCategory = fact => {
    const suggested = destinationCategoryId(fact?.destination?.[0]);
    if (PIM_ALLOCATION_CATEGORY_IDS.has(suggested)) return suggested;
    const key = String(fact?.key || '').toLocaleLowerCase();
    if (/(origin|native|distribution|range|history|traditional|heritage)/.test(key)) return 'historical-data';
    if (/(climate|sun|light|water|soil|cultivat|grow|height|temperature|hardiness)/.test(key)) return 'cultivation';
    if (/(propagat|seed|flower|reproduct|pollinat)/.test(key)) return 'propagation';
    if (/(use|edible|culinary|medicin|craft|toxic|warning)/.test(key)) return 'uses';
    if (/(ecolog|nitrogen|guild|function|relationship|habitat|layer)/.test(key)) return 'food-forest';
    return 'scientific-information';
};
const pimAllocationCategoryById = id => PIM_ALLOCATION_CATEGORIES.find(category => category.id === id) || PIM_ALLOCATION_CATEGORIES[0];
const pimAllocationCell = (fact, categoryId) => {
    const suggested = pimAllocationCategory(fact);
    return suggested === categoryId && fact?.destination?.[1]
        ? fact.destination[1]
        : pimAllocationCategoryById(categoryId).fallbackCell;
};

const humanFactLabel = key => String(key || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const decodeSourceMarkup = value => String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' · ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&middot;|&#183;|&bull;|&#8226;/gi, ' · ')
    .replace(/&amp;|&#38;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;|&#60;/gi, '<')
    .replace(/&gt;|&#62;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
const TECHNICAL_SOURCE_KEY = /(?:^|_)(?:id|ids|key|guid|url|uri|flag|flags|score|scores|active|level|ancestor|ancestors|iconic_taxon|taxon_id|georeferenced_count|occurrence_count|match|matches|api|raw|metadata|dataset)(?:$|_)/i;
const SOURCE_FIELD_ALIASES = Object.freeze({
    name: 'scientific_name', scientific_name: 'scientific_name', canonical_name: 'scientific_name', botanical_name: 'scientific_name',
    vernacular_name: 'common_name', preferred_common_name: 'common_name', common_name: 'common_name',
    matched_names: 'alternative_names', common_name_matches: 'alternative_names',
    taxonomic_rank: 'rank', rank_string: 'rank', image_url: 'image', thumbnail_url: 'image',
    image_attribution: 'attribution', image_license: 'attribution'
});
const factGroup = key => {
    if (['common_name', 'alternative_names', 'description', 'image'].includes(key)) return 'Essential';
    if (['distribution', 'origin', 'native_range', 'range'].includes(key)) return 'Distribution';
    if (['source', 'attribution'].includes(key)) return 'Sources';
    if (['price', 'availability', 'currency', 'category'].includes(key)) return 'Retail';
    return 'Taxonomy';
};
const recommendedFact = key => new Set([
    'common_name', 'scientific_name', 'alternative_names', 'rank', 'family', 'genus', 'species',
    'description', 'distribution', 'image', 'source', 'attribution', 'category', 'price', 'availability'
]).has(key);
const usefulFactValue = value => {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) {
        const values = value.map(usefulFactValue).filter(Boolean);
        return [...new Map(values.flatMap(item => item.split(/\s*(?:;|\||•)\s*/).filter(Boolean).map(part => [part.toLocaleLowerCase(), part]))).values()].join(' · ');
    }
    if (typeof value === 'object') return '';
    return decodeSourceMarkup(value);
};
const isTechnicalSourceKey = key => TECHNICAL_SOURCE_KEY.test(String(key || '').replace(/([a-z])([A-Z])/g, '$1_$2').toLocaleLowerCase());
const sourceFacts = result => {
    const raw = result?.rawSourceData && typeof result.rawSourceData === 'object' ? result.rawSourceData : {};
    const preferred = {
        common_name: result?.commonName, scientific_name: result?.scientificName, canonical_name: result?.canonicalName,
        family: result?.family, kingdom: result?.kingdom, rank: result?.rank, image: result?.thumbnailUrl ? 'Reference image available' : '',
        description: result?.description, category: result?.category, price: result?.price,
        availability: result?.availability, currency: result?.currency,
        source: result?.sourceLabel, attribution: result?.imageAttribution
    };
    const facts = new Map();
    Object.entries({ ...raw, ...preferred }).forEach(([key, value]) => {
        const rawKey = String(key).replace(/([a-z])([A-Z])/g, '$1_$2').toLocaleLowerCase();
        const normalizedKey = SOURCE_FIELD_ALIASES[rawKey] || rawKey;
        if (isTechnicalSourceKey(rawKey) || rawKey.startsWith('@') || ['kingdom', 'source_url', 'source_id'].includes(rawKey)) return;
        const normalizedValue = usefulFactValue(value);
        if (!normalizedValue || normalizedValue.length > 1200) return;
        const destinations = factDestinations(normalizedKey);
        const existing = facts.get(normalizedKey);
        const displayValue = ['common_name', 'alternative_names'].includes(normalizedKey)
            ? usefulFactValue([normalizedValue])
            : normalizedValue;
        const mergedValue = normalizedKey === 'alternative_names'
            ? usefulFactValue([existing?.value || '', displayValue])
            : displayValue;
        facts.set(normalizedKey, {
            key: normalizedKey,
            label: normalizedKey === 'alternative_names' ? 'Alternative names' : humanFactLabel(normalizedKey),
            value: mergedValue,
            group: factGroup(normalizedKey),
            recommended: recommendedFact(normalizedKey),
            destination: destinations[0],
            destinations
        });
    });
    return [...facts.values()];
};
const technicalSourceFacts = result => {
    const raw = result?.rawSourceData && typeof result.rawSourceData === 'object' ? result.rawSourceData : {};
    return Object.entries(raw).filter(([key, value]) => isTechnicalSourceKey(key) && usefulFactValue(value)).slice(0, 14).map(([key, value]) => ({
        key, label: humanFactLabel(key), value: usefulFactValue(value)
    }));
};

async function loadAreaPlants(projectId, siteId, placeId, visitor) {
    const [resolved, markers] = await Promise.all([
        loadResolvedPlantsForPlace(projectId, siteId, placeId, visitor),
        loadPlaceMarkers(projectId, siteId, placeId, visitor).catch(() => [])
    ]);
    const markerById = new Map(markers.map(marker => [marker.id, marker]));
    const representedMarkers = new Set(resolved.map(plant => plant.markerId).filter(Boolean));
    const markerPlants = await Promise.all(markers.filter(marker => marker.type === 'plant' && !representedMarkers.has(marker.id)).map(async marker => {
        let profile = marker.plant_profile || {};
        if (marker.plant_profile_path) {
            profile = await loadPlantProfile(projectId, siteId, placeId, marker.id, visitor).catch(() => profile);
        }
        return {
            ...profile,
            instanceId: marker.plantInstanceId || `marker-${marker.id}`,
            markerId: marker.id,
            plantId: marker.plantId || '',
            placeId,
            commonName: profile.common_name || marker.name || 'Unnamed plant',
            scientificName: profile.scientific_name || '',
            family: profile.family || '',
            origin: profile.origin || '',
            plantType: profile.plant_type || '',
            layer: profile.layer || '',
            uses: profile.uses || '',
            propagation: profile.propagation || '',
            status: marker.status || '',
            localNotes: marker.notes || marker.description || profile.overview || '',
            summary: profile.overview || marker.description || '',
            physicalAnchor: marker.physicalAnchor || null,
            virtualTagEnabled: profile.virtual_tag_enabled === true
        };
    }));
    const resolvedPlants = await Promise.all(resolved.map(async plant => {
        if (!plant.markerId) return { ...plant, virtualTagEnabled: false };
        const profile = await loadPlantProfile(projectId, siteId, placeId, plant.markerId, visitor).catch(() => ({}));
        return { ...plant, physicalAnchor: markerById.get(plant.markerId)?.physicalAnchor || null, virtualTagEnabled: profile.virtual_tag_enabled === true };
    }));
    return [...resolvedPlants, ...markerPlants];
}

async function loadAreaGuideGroup(projectId, siteId, place, visitor) {
    const [plants, markers] = await Promise.all([
        loadAreaPlants(projectId, siteId, place.id, visitor),
        loadPlaceMarkers(projectId, siteId, place.id, visitor).catch(() => [])
    ]);
    const anchorStates = await Promise.all(markers.map(marker => loadMarkerAnchor(projectId, siteId, place.id, marker.id, visitor).catch(() => null)));
    const markerAnchorItems = markers.map((marker, index) => ({ marker, anchor: anchorStates[index] }));
    const placedItems = markerAnchorItems.filter(item => item.anchor?.type === 'spatial');
    const anchoredItems = markerAnchorItems.filter(item => String(item.marker?.physicalAnchor?.markerId ?? '').trim() !== '');
    return {
        place,
        plants,
        markerCount: markers.length,
        placedCount: placedItems.length,
        placedItems,
        anchoredCount: anchoredItems.length,
        anchoredItems,
        totems: markers.filter(marker => marker.type === 'area_checkpoint' || marker.semantic_type === 'area_checkpoint'),
        hasTotem: markers.some(marker => marker.type === 'area_checkpoint' || marker.semantic_type === 'area_checkpoint'),
        hasStartingPoint: markers.some(marker => marker.type === 'intro_checkpoint')
    };
}

async function loadGuide(projectId) {
    const project = (await loadProjects(true)).find(item => item.id === projectId);
    if (!project) throw new Error('This location is not public.');
    const sites = await loadProjectSites(project.id, true);
    const siteGroups = await Promise.all(sites.map(async site => {
        const places = await loadSitePlaces(project.id, site.id, true).catch(() => []);
        const placeGroups = await Promise.all(places.map(place => loadAreaGuideGroup(project.id, site.id, place, true)));
        return { site, placeGroups };
    }));
    const plants = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.plants.map(plant => ({ ...plant, siteId: group.site.id, siteName: group.site.name, placeName: placeGroup.place.name }))));
    const totems = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.totems.map(totem => ({ ...totem, siteId: group.site.id, siteName: group.site.name, placeId: placeGroup.place.id, placeName: placeGroup.place.name }))));
    currentGuide = { project, siteGroups, plants, totems, creator: false };
    return currentGuide;
}

export async function renderFieldGuideProjects(app) {
    const projects = (await loadProjects(true)).filter(project => !['plant-library', 'Banyula'].includes(project.id));
    app.innerHTML = `<div class="screen field-guide"><div class="page-header"><button class="ghost" onclick="window.renderV1Explorer()">Back</button><p class="welcome-label">Field Guide</p><h1>Choose a location</h1><p class="subtitle">Browse plants, maps and information.</p></div><div class="menu-stack">${projects.map(project => `<button class="menu-card" onclick="window.renderFieldGuide('${encoded(project.id)}')"><strong>${escapeHtml(project.name)} Field Guide</strong><span>Location notebook and plant records</span></button>`).join('') || '<div class="panel"><p>No public locations are available.</p></div>'}</div></div>`;
}

function applyCreatorContentCopy(app, renderTarget = app) {
    const header = app.querySelector('.field-guide-header');
    header?.querySelector('.field-guide-header-subtitle')?.remove();
    const snapshotTitle = app.querySelector('#fieldGuideEssentialsTitle');
    if (snapshotTitle) snapshotTitle.textContent = 'Content';
    const areasTitle = app.querySelector('#fieldGuideAreasTitle');
    if (areasTitle) areasTitle.textContent = 'Areas';
    const searchTitle = app.querySelector('#fieldGuidePlantSearchTitle');
    if (searchTitle) searchTitle.textContent = 'Plant Search';
    const searchLabel = app.querySelector('label[for="fieldGuideSearch"]');
    if (searchLabel) searchLabel.textContent = 'Search all plants';
    const creativeTitle = app.querySelector('#fieldGuideCreativeToolsTitle');
    if (creativeTitle) creativeTitle.textContent = 'Creative Features';
    const anchorsTitle = app.querySelector('#fieldGuideAnchorsTitle');
    if (anchorsTitle) anchorsTitle.textContent = 'Anchored Elements';
    const overview = app.querySelector('.field-guide-essentials');
    const creationActions = overview?.querySelector('.field-guide-creation-actions');
    if (overview && creationActions) {
        const actionSection = document.createElement('section');
        actionSection.className = 'field-guide-primary-actions';
        actionSection.setAttribute('aria-label', 'Add to project');
        actionSection.append(creationActions);
        overview.after(actionSection);
    }
    const plantList = app.querySelector('.field-guide-plant-grid');
    app.querySelector('#fieldGuideCount')?.remove();

    const searchHeading = searchTitle?.closest('.field-guide-section-heading');
    const searchDeck = app.querySelector('.field-guide-search-deck');
    const searchInput = app.querySelector('#fieldGuideSearch');
    const searchField = searchInput?.closest('.field');
    if (!searchHeading || !searchDeck || !searchInput || !searchField || !plantList) return;

    const plantListSection = plantList.parentNode;
    const allPlants = document.createElement('details');
    allPlants.className = 'field-guide-all-plants';
    allPlants.innerHTML = '<summary><span class="field-guide-all-plants-heading"><strong>All plants</strong><small>Saved plant records in this project</small></span><span id="fieldGuideCount" class="field-guide-all-plants-count"></span></summary>';
    allPlants.append(plantList);
    plantListSection.append(allPlants);

    const searchLegend = document.createElement('fieldset');
    searchLegend.className = 'field-guide-global-match-legend';
    searchLegend.setAttribute('aria-label', 'Filter plant search result colours');
    searchLegend.innerHTML = '<legend>Filter results</legend><label class="field-guide-global-legend-option field-guide-global-legend-local"><input type="checkbox" data-field-guide-tone-filter="local" checked /><span class="field-guide-global-legend-swatch" aria-hidden="true"></span><span><strong>Blue</strong><small>Local plants</small></span></label><label class="field-guide-global-legend-option field-guide-global-legend-exact"><input type="checkbox" data-field-guide-tone-filter="exact" checked /><span class="field-guide-global-legend-swatch" aria-hidden="true"></span><span><strong>Green</strong><small>Exact match</small></span></label><label class="field-guide-global-legend-option field-guide-global-legend-related"><input type="checkbox" data-field-guide-tone-filter="related" checked /><span class="field-guide-global-legend-swatch" aria-hidden="true"></span><span><strong>Yellow</strong><small>Same genus / related</small></span></label><label class="field-guide-global-legend-option field-guide-global-legend-caution"><input type="checkbox" data-field-guide-tone-filter="caution" checked /><span class="field-guide-global-legend-swatch" aria-hidden="true"></span><span><strong>Red</strong><small>Check species</small></span></label>';
    searchHeading.append(searchLegend);
    searchLegend.querySelectorAll('input[data-field-guide-tone-filter]').forEach(input => input.addEventListener('change', () => applyFieldGuideFilter(currentGuidePlaceId)));

    const globalPanel = document.createElement('div');
    globalPanel.className = 'field-guide-global-search';
    globalPanel.hidden = true;
    globalPanel.innerHTML = '<p id="fieldGuideGlobalSearchStatus" class="meta"></p><div class="field-guide-global-results" data-field-guide-global-results></div>';
    plantListSection.insertBefore(globalPanel, allPlants);

    const globalStatus = globalPanel.querySelector('#fieldGuideGlobalSearchStatus');
    const globalResults = globalPanel.querySelector('[data-field-guide-global-results]');
    let openGlobalProfile = null;
    let globalImportStep = 'select';
    const globalExtractionFields = result => new Set(Array.isArray(result?.extractionFields) && result.extractionFields.length
        ? result.extractionFields
        : sourceFacts(result).filter(fact => fact.recommended).map(fact => fact.key));
    const importProgress = (step, title) => `<div class="field-guide-import-progress" aria-label="Import progress"><span class="${step === 'select' || step === 'review' || step === 'setup' ? 'is-active' : ''}">1 Select facts</span><span class="${step === 'review' || step === 'setup' ? 'is-active' : ''}">2 Review + plant setup</span></div><p class="field-guide-import-step">Step ${step === 'select' ? 1 : 2} of 2 · ${escapeHtml(title)}</p>`;
    const importIdentityMarkup = (result, label = 'External source') => {
        const displayName = result.commonName || result.canonicalName || result.scientificName || 'Unnamed plant';
        return `<div class="field-guide-import-identity"><span class="field-guide-import-thumbnail">${result.thumbnailUrl ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="" loading="lazy" />` : '<span aria-hidden="true">🌿</span>'}</span><span><strong>${escapeHtml(displayName)}</strong>${scientificNameMarkup(result.scientificName)}<small>${escapeHtml(label)} · ${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}</small></span></div>`;
    };
    const valueMarkup = fact => fact.value.length > 110
        ? `<details class="field-guide-fact-value"><summary>${escapeHtml(fact.value.slice(0, 104))}…</summary><span>${escapeHtml(fact.value)}</span></details>`
        : `<small>${escapeHtml(fact.value)}</small>`;
    const focusImportPanel = heading => {
        globalResults?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
        heading?.setAttribute('tabindex', '-1');
        requestAnimationFrame(() => heading?.focus());
    };
    const legacyReferenceProfileMarkup = result => {
        const extraction = globalExtractionFields(result);
        const displayName = result.commonName || result.canonicalName || result.scientificName || 'Unnamed plant';
        return `<article class="field-guide-global-profile" aria-labelledby="fieldGuideGlobalProfileTitle">
            <header class="field-guide-global-profile-heading"><div><span class="field-guide-global-profile-kicker">GLOBAL REFERENCE PROFILE</span><h3 id="fieldGuideGlobalProfileTitle">${escapeHtml(displayName)}</h3>${scientificNameMarkup(result.scientificName || result.canonicalName)}</div><button type="button" class="ghost" data-global-profile-back>Back to results</button></header>
            <div class="field-guide-global-profile-body">${result.thumbnailUrl ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="" loading="lazy" />` : '<span class="field-guide-global-profile-placeholder" aria-hidden="true">🌿</span>'}<dl><div><dt>Scientific name</dt><dd><i>${escapeHtml(result.scientificName || 'Not supplied')}</i></dd></div><div><dt>Family</dt><dd>${escapeHtml(result.family || 'Not supplied')}</dd></div><div><dt>Rank</dt><dd>${escapeHtml(result.rank || 'Taxon')}</dd></div><div><dt>Source</dt><dd>${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}</dd></div></dl></div>
            <p class="field-guide-global-profile-note">This is the source record as returned by the global plant databases. It is not added to your project until you choose what to extract.</p>
            <section class="field-guide-global-profile-extract" aria-labelledby="fieldGuideGlobalExtractTitle"><div><h4 id="fieldGuideGlobalExtractTitle">Convert selected content</h4><p>Choose only the facts that belong in your NLXR Plant Profile and PIM. The source citation is kept automatically.</p></div><fieldset><legend>Content to bring into NLXR</legend><label><input type="checkbox" data-global-extract-field="common_name" ${extraction.has('common_name') ? 'checked' : ''} /> <span><strong>Display name</strong><small>Plant identity</small></span></label><label><input type="checkbox" data-global-extract-field="scientific_name" ${extraction.has('scientific_name') ? 'checked' : ''} /> <span><strong>Accepted scientific name</strong><small>Scientific Information · taxonomy</small></span></label>${result.family ? `<label><input type="checkbox" data-global-extract-field="family" ${extraction.has('family') ? 'checked' : ''} /> <span><strong>Family</strong><small>Scientific Information · classification</small></span></label>` : ''}${result.thumbnailUrl ? `<label><input type="checkbox" data-global-extract-field="image" ${extraction.has('image') ? 'checked' : ''} /> <span><strong>Reference image</strong><small>Plant profile image</small></span></label>` : ''}</fieldset><p class="field-guide-global-profile-status" data-global-profile-status role="status" aria-live="polite"></p><button type="button" class="primary" data-global-profile-convert>Convert selected content</button></section>
        </article>`;
    };
    const referenceProfileMarkup = result => {
        const extraction = globalExtractionFields(result);
        const facts = sourceFacts(result);
        const groupedFacts = facts.reduce((groups, fact) => ((groups[fact.group] ||= []).push(fact), groups), {});
        return `<article class="field-guide-global-profile field-guide-import-view" aria-labelledby="fieldGuideGlobalProfileTitle">
            ${importProgress('select', 'Select facts')}
            <header class="field-guide-global-profile-heading"><div><span class="field-guide-global-profile-kicker">GLOBAL PLANT IMPORT</span><h3 id="fieldGuideGlobalProfileTitle" tabindex="-1">Select facts</h3><p>Choose useful plant information to bring into NLXR.</p></div></header>
            ${importIdentityMarkup(result)}
            <section class="field-guide-global-profile-extract" aria-labelledby="fieldGuideGlobalExtractTitle"><div class="field-guide-extract-heading"><div><h4 id="fieldGuideGlobalExtractTitle">Facts to import</h4><p>Recommended facts are selected. Technical database fields stay out of the PIM.</p></div><button type="button" class="ghost" data-global-select-recommended>Select recommended</button></div><div class="field-guide-fact-groups">${['Essential', 'Taxonomy', 'Distribution', 'Retail', 'Sources'].map(group => groupedFacts[group]?.length ? `<section class="field-guide-fact-group"><h4>${group}</h4><div>${groupedFacts[group].map(fact => `<label class="field-guide-extract-row"><input type="checkbox" data-global-extract-field="${escapeHtml(fact.key)}" ${extraction.has(fact.key) ? 'checked' : ''} /><span><strong>${escapeHtml(fact.label)}</strong>${valueMarkup(fact)}${fact.recommended ? '<em class="field-guide-recommended">Recommended</em>' : ''}</span></label>`).join('')}</div></section>` : '').join('')}</div></section>
            <details class="field-guide-technical-source"><summary>Technical source data</summary><p>Kept as private import metadata for attribution, deduplication and future syncing.</p><dl>${technicalSourceFacts(result).map(fact => `<div><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`).join('') || '<p class="meta">No technical fields supplied.</p>'}</dl></details>
            <p class="field-guide-global-profile-status" data-global-profile-status role="status" aria-live="polite"></p>
            <nav class="field-guide-import-actions" aria-label="Import navigation"><button type="button" class="ghost" data-global-profile-back>Back</button><button type="button" class="primary" data-global-profile-review>Review</button></nav>
        </article>`;
    };
    const researchProfileMarkup = result => {
        const extraction = globalExtractionFields(result);
        const facts = sourceFacts(result);
        const displayName = result.commonName || result.canonicalName || result.scientificName || 'Unnamed plant';
        const sections = facts.reduce((groups, fact) => {
            const heading = fact.destination[0] === 'Plant identity' ? 'Identity & taxonomy' : fact.destination[1];
            (groups[heading] ||= []).push(fact);
            return groups;
        }, {});
        return `<article class="field-guide-global-profile field-guide-research-workspace" aria-labelledby="fieldGuideGlobalProfileTitle">
            <header class="field-guide-global-profile-heading"><div><span class="field-guide-global-profile-kicker">GLOBAL SOURCE PROFILE</span><h3 id="fieldGuideGlobalProfileTitle">${escapeHtml(displayName)}</h3>${result.scientificName ? `<em title="${escapeHtml(result.scientificName)}">${escapeHtml(result.scientificName)}</em>` : ''}</div><button type="button" class="ghost" data-global-profile-back>Back to results</button></header>
            <div class="field-guide-global-profile-body">${result.thumbnailUrl ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="${escapeHtml(displayName)} reference" loading="lazy" />` : '<span class="field-guide-global-profile-placeholder" aria-hidden="true">🌿</span>'}<dl><div><dt>Source</dt><dd title="${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}">${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}</dd></div><div><dt>Source record</dt><dd title="${escapeHtml(result.externalId || '')}">${escapeHtml(result.externalId || 'Not supplied')}</dd></div></dl></div>
            <div class="field-guide-research-sections">${Object.entries(sections).map(([title, items]) => `<section><h4>${escapeHtml(title)}</h4><dl>${items.map(fact => `<div><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`).join('')}</dl></section>`).join('')}</div>
            <section class="field-guide-global-profile-extract" aria-labelledby="fieldGuideGlobalExtractTitle"><div class="field-guide-extract-heading"><div><h4 id="fieldGuideGlobalExtractTitle">Choose facts to extract</h4><p>Select the source facts you want to bring into NLXR. Their smart category suggestions can be changed on the next step.</p></div><div><button type="button" class="ghost" data-global-select-all>Select all</button><button type="button" class="ghost" data-global-clear-all>Clear</button></div></div><fieldset><legend>Content to bring into NLXR</legend>${facts.map(fact => `<div class="field-guide-extract-row"><label class="field-guide-extract-fact"><input type="checkbox" data-global-extract-field="${escapeHtml(fact.key)}" ${extraction.has(fact.key) ? 'checked' : ''} /><span><strong>${escapeHtml(fact.label)}</strong><small title="${escapeHtml(fact.value)}">${escapeHtml(fact.value)}</small></span></label><span class="field-guide-extract-suggestion"><small>Smart suggestion</small><strong>${escapeHtml(PROFILE_ONLY_FACTS.has(fact.key) ? 'Plant profile' : pimAllocationCategoryById(pimAllocationCategory(fact)).label)}</strong></span></div>`).join('')}</fieldset><p class="field-guide-global-profile-status" data-global-profile-status role="status" aria-live="polite"></p><button type="button" class="primary" data-global-profile-convert>Review allocation</button></section>
        </article>`;
    };
    const legacyAllocationReviewMarkup = (result, facts) => {
        const displayName = result.commonName || result.canonicalName || result.scientificName || 'Unnamed plant';
        const profileFacts = facts.filter(fact => PROFILE_ONLY_FACTS.has(fact.key));
        const pimFacts = facts.filter(fact => !PROFILE_ONLY_FACTS.has(fact.key));
        return `<article class="field-guide-global-profile field-guide-research-workspace" aria-labelledby="fieldGuideAllocationTitle">
            <header class="field-guide-global-profile-heading"><div><span class="field-guide-global-profile-kicker">PIM ALLOCATION PREVIEW</span><h3 id="fieldGuideAllocationTitle">Where should this information go?</h3><em>${escapeHtml(displayName)}</em></div><button type="button" class="ghost" data-global-profile-back>Back to results</button></header>
            <section class="field-guide-allocation-intro"><strong>${facts.length} source fact${facts.length === 1 ? '' : 's'} selected</strong><p>NLXR has made a first-pass allocation from the field meaning. Review the six main categories below and change any destination before creating the plant.</p></section>
            ${profileFacts.length ? `<section class="field-guide-allocation-group"><h4>Plant profile</h4><p class="meta">Identity and image stay with the profile automatically.</p>${profileFacts.map(fact => `<div class="field-guide-allocation-fixed"><strong>${escapeHtml(fact.label)}</strong><span>${escapeHtml(fact.value)}</span><em>Plant profile</em></div>`).join('')}</section>` : ''}
            <fieldset class="field-guide-allocation-group field-guide-allocation-list"><legend>Six PIM categories</legend>${pimFacts.length ? pimFacts.map(fact => `<div class="field-guide-allocation-row"><div class="field-guide-allocation-fact"><strong>${escapeHtml(fact.label)}</strong><small title="${escapeHtml(fact.value)}">${escapeHtml(fact.value)}</small></div><label>Destination<select data-global-allocation="${escapeHtml(fact.key)}">${PIM_ALLOCATION_CATEGORIES.map(category => `<option value="${category.id}" ${pimAllocationCategory(fact) === category.id ? 'selected' : ''}>${category.label}</option>`).join('')}</select></label><span class="field-guide-allocation-smart">Suggested</span></div>`).join('') : '<p class="meta">No PIM facts selected yet. Go back and select at least one category fact.</p>'}</fieldset>
            <p class="field-guide-global-profile-status" data-global-profile-status role="status" aria-live="polite"></p><div class="field-guide-allocation-actions"><button type="button" class="ghost" data-global-allocation-back>Back to fact selection</button><button type="button" class="primary" data-global-allocation-continue>Continue to plant setup</button></div>
        </article>`;
    };
    const allocationReviewMarkup = (result, facts) => {
        const profileFacts = facts.filter(fact => PROFILE_ONLY_FACTS.has(fact.key));
        const pimFacts = facts.filter(fact => !PROFILE_ONLY_FACTS.has(fact.key));
        const groups = [...new Set(pimFacts.map(fact => pimAllocationCategory(fact)))].map(categoryId => ({ categoryId, facts: pimFacts.filter(fact => pimAllocationCategory(fact) === categoryId) }));
        return `<article class="field-guide-global-profile field-guide-research-workspace field-guide-import-view" aria-labelledby="fieldGuideAllocationTitle">
            ${importProgress('review', 'Review')}
            <header class="field-guide-global-profile-heading"><div><span class="field-guide-global-profile-kicker">GLOBAL PLANT IMPORT</span><h3 id="fieldGuideAllocationTitle" tabindex="-1">Review</h3><p>Confirm the proposed PIM destinations before plant setup.</p></div></header>
            ${importIdentityMarkup(result)}
            <section class="field-guide-allocation-intro"><strong>${facts.length} selected fact${facts.length === 1 ? '' : 's'}</strong><p>Facts are grouped by destination. Change a complete group once, or open one fact for an individual override.</p></section>
            ${profileFacts.length ? `<section class="field-guide-allocation-group" data-global-allocation-group="profile"><div class="field-guide-allocation-group-heading"><div><h4>Plant profile · ${profileFacts.length} fact${profileFacts.length === 1 ? '' : 's'}</h4><span>Suggested mapping · Plant profile</span></div></div>${profileFacts.map(fact => `<div class="field-guide-allocation-row" data-global-allocation-fact="${escapeHtml(fact.key)}"><div class="field-guide-allocation-fact"><strong>${escapeHtml(fact.label)}</strong>${valueMarkup(fact)}</div><button type="button" class="ghost" data-global-remove-fact>Remove</button></div>`).join('')}</section>` : ''}
            ${groups.map(group => { const category = pimAllocationCategoryById(group.categoryId); return `<section class="field-guide-allocation-group" data-global-allocation-group="${group.categoryId}"><div class="field-guide-allocation-group-heading"><div><h4>${escapeHtml(category.label)} · ${group.facts.length} fact${group.facts.length === 1 ? '' : 's'}</h4><span>Suggested mapping</span></div><label>Change category<select data-global-group-category="${group.categoryId}">${PIM_ALLOCATION_CATEGORIES.map(option => `<option value="${option.id}" ${option.id === group.categoryId ? 'selected' : ''}>${option.label}</option>`).join('')}</select></label></div>${group.facts.map(fact => `<div class="field-guide-allocation-row" data-global-allocation-fact="${escapeHtml(fact.key)}"><div class="field-guide-allocation-fact"><strong>${escapeHtml(fact.label)}</strong>${valueMarkup(fact)}</div><details class="field-guide-allocation-options"><summary>Options</summary><label>Individual override<select data-global-allocation="${escapeHtml(fact.key)}"><option value="">Use group category</option>${PIM_ALLOCATION_CATEGORIES.map(option => `<option value="${option.id}">${option.label}</option>`).join('')}</select></label></details><button type="button" class="ghost" data-global-remove-fact>Remove</button></div>`).join('')}</section>`; }).join('')}
            <p class="field-guide-global-profile-status" data-global-profile-status role="status" aria-live="polite"></p><nav class="field-guide-import-actions" aria-label="Import navigation"><button type="button" class="ghost" data-global-allocation-back>Back</button><button type="button" class="primary" data-global-allocation-continue>Continue to plant setup</button></nav>
        </article>`;
    };
    const renderGlobalResults = results => {
        if (!globalResults) return;
        const rankedResults = rankPlantSearchResults(results, globalSearchQuery);
        globalResults.innerHTML = rankedResults.map((result, index) => { const match = result.searchMatch || {}; return `<article class="field-guide-global-result field-guide-global-result--${escapeHtml(match.tone || 'caution')}" data-field-guide-search-tone="${escapeHtml(match.tone || 'caution')}">${result.thumbnailUrl ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="" loading="lazy" />` : '<span class="field-guide-global-result-placeholder" aria-hidden="true">🌿</span>'}<span><strong title="${escapeHtml(result.commonName || result.canonicalName || result.scientificName || 'Unnamed plant')}">${escapeHtml(result.commonName || result.canonicalName || result.scientificName || 'Unnamed plant')}</strong>${scientificNameMarkup(result.scientificName || result.canonicalName)}${result.family ? `<small title="${escapeHtml(result.family)}">${escapeHtml(result.family)}</small>` : ''}${result.price || result.availability ? `<small class="field-guide-global-commercial">${escapeHtml([result.price, result.availability].filter(Boolean).join(' · '))}</small>` : ''}<small title="${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}">${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}</small>${result.sourceUrl ? `<a class="field-guide-global-source-link" href="${escapeHtml(result.sourceUrl)}" target="_blank" rel="noopener noreferrer">View source</a>` : ''}</span><button type="button" class="primary field-guide-global-open" data-global-plant-index="${index}">Open profile</button></article>`; }).join('') || `<p class="meta">No plant matches found across ${PLANT_SEARCH_SOURCE_LABEL}.</p>`;
        applyFieldGuideFilter(currentGuidePlaceId);
        globalResults.querySelectorAll('[data-global-plant-index]').forEach(button => button.addEventListener('click', async () => {
            const result = rankedResults[Number(button.dataset.globalPlantIndex)];
            if (!result) return;
            const { searchMatch, searchResultIndex, ...sourceResult } = result;
            openGlobalProfile = result;
            const siteGroup = currentGuide?.siteGroups?.find(group => currentGuidePlaceId && group.placeGroups.some(placeGroup => placeGroup.place.id === currentGuidePlaceId)) || currentGuide?.siteGroups?.[0];
            if (!siteGroup?.site?.id || !currentGuide?.creator) {
                if (globalStatus) globalStatus.textContent = 'Open this from a project Content workspace to create an NLXR plant profile.';
                return;
            }
            button.textContent = 'Opening import page…';
            button.disabled = true;
            try {
                const facts = sourceFacts(result);
                const importDefaults = {
                    project: currentGuide.project.id,
                    site: siteGroup.site.id,
                    place: currentGuidePlaceId || '__unassigned__',
                    returnAction: `window.renderFieldGuide('${encoded(currentGuide.project.id)}', true)`,
                    sites: [siteGroup.site],
                    places: siteGroup.placeGroups.map(placeGroup => placeGroup.place),
                    existingPlants: currentGuide.plants,
                    globalPlant: {
                        ...sourceResult,
                        importFacts: facts,
                        extractionFields: facts.filter(fact => fact.recommended).map(fact => fact.key)
                    }
                };
                await Promise.race([
                    openGlobalPlantProfile(renderTarget || app, importDefaults),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('The import page took too long to open. Please try again.')), 8000))
                ]);
            } catch (error) {
                button.disabled = false;
                button.textContent = 'Open profile';
                if (globalStatus) globalStatus.textContent = `Could not open the plant import page: ${error.message}`;
            }
            return;
            const renderExtractionStep = () => {
                globalImportStep = 'select';
                globalResults.innerHTML = referenceProfileMarkup(result);
                focusImportPanel(globalResults.querySelector('#fieldGuideGlobalProfileTitle'));
                globalResults.querySelector('[data-global-profile-back]')?.addEventListener('click', () => {
                    openGlobalProfile = null;
                    renderGlobalResults(results);
                    if (globalStatus) globalStatus.textContent = `${results.length} plant record${results.length === 1 ? '' : 's'} found across ${PLANT_SEARCH_SOURCE_LABEL}. Select one to open its profile.`;
                });
                const profileStatus = globalResults.querySelector('[data-global-profile-status]');
                globalResults.querySelector('[data-global-select-recommended]')?.addEventListener('click', () => {
                    const recommended = new Set(sourceFacts(result).filter(fact => fact.recommended).map(fact => fact.key));
                    globalResults.querySelectorAll('[data-global-extract-field]').forEach(input => { input.checked = recommended.has(input.dataset.globalExtractField); });
                });
                globalResults.querySelector('[data-global-profile-review]')?.addEventListener('click', () => {
                    const selectedFields = [...globalResults.querySelectorAll('[data-global-extract-field]:checked')].map(input => input.dataset.globalExtractField).filter(Boolean);
                    if (!selectedFields.length) {
                        if (profileStatus) profileStatus.textContent = 'Select at least one fact to continue.';
                        return;
                    }
                    result.extractionFields = selectedFields;
                    const factsByKey = new Map(sourceFacts(result).map(fact => [fact.key, fact]));
                    const selectedFacts = selectedFields.map(key => factsByKey.get(key)).filter(Boolean);
                    globalImportStep = 'review';
                    globalResults.innerHTML = allocationReviewMarkup(result, selectedFacts);
                    focusImportPanel(globalResults.querySelector('#fieldGuideAllocationTitle'));
                    const allocationStatus = globalResults.querySelector('[data-global-profile-status]');
                    globalResults.querySelector('[data-global-allocation-back]')?.addEventListener('click', renderExtractionStep);
                    globalResults.querySelectorAll('[data-global-remove-fact]').forEach(removeButton => removeButton.addEventListener('click', () => {
                        removeButton.closest('[data-global-allocation-fact]')?.remove();
                        globalResults.querySelectorAll('[data-global-allocation-group]').forEach(group => {
                            if (!group.querySelector('[data-global-allocation-fact]')) group.remove();
                        });
                        result.extractionFields = [...globalResults.querySelectorAll('[data-global-allocation-fact]')].map(row => row.dataset.globalAllocationFact).filter(Boolean);
                    }));
                    globalResults.querySelector('[data-global-allocation-continue]')?.addEventListener('click', async event => {
                        if (!siteGroup?.site?.id || !currentGuide?.creator) {
                            if (allocationStatus) allocationStatus.textContent = 'Open this from a project Content workspace to create an NLXR plant profile.';
                            return;
                        }
                        const visibleRows = [...globalResults.querySelectorAll('[data-global-allocation-fact]')];
                        const visibleFacts = visibleRows.map(row => factsByKey.get(row.dataset.globalAllocationFact)).filter(Boolean);
                        const extractedFacts = visibleRows.map(row => {
                            const fact = factsByKey.get(row.dataset.globalAllocationFact);
                            if (!fact) return null;
                            if (PROFILE_ONLY_FACTS.has(fact.key)) {
                                return { ...fact, confirmedDestinations: [], sourceDatabase: result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL, sourceRecordId: result.externalId || '', sourceUrl: result.sourceUrl || '', retrievalDate: new Date().toISOString(), confidence: 'profile', reviewStatus: 'pending' };
                            }
                            const group = row.closest('[data-global-allocation-group]');
                            const groupCategory = group?.querySelector('[data-global-group-category]')?.value;
                            const individualCategory = row.querySelector('[data-global-allocation]')?.value;
                            const categoryId = individualCategory || groupCategory || pimAllocationCategory(fact);
                            const category = pimAllocationCategoryById(categoryId);
                            const cell = pimAllocationCell(fact, categoryId);
                            return { ...fact, destination: [category.label, cell], confirmedDestinations: [[categoryId, cell]], sourceDatabase: result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL, sourceRecordId: result.externalId || '', sourceUrl: result.sourceUrl || '', retrievalDate: new Date().toISOString(), confidence: categoryId === pimAllocationCategory(fact) ? 'suggested' : 'confirmed', reviewStatus: 'pending' };
                        }).filter(Boolean);
                        result.extractionFields = visibleFacts.map(fact => fact.key);
                        if (!extractedFacts.length) {
                            if (allocationStatus) allocationStatus.textContent = 'Keep at least one fact before continuing.';
                            return;
                        }
                        globalImportStep = 'setup';
                        event.currentTarget.disabled = true;
                        event.currentTarget.textContent = 'Opening plant setup';
                        try {
                            await openGlobalPlantProfile(renderTarget || app, {
                                project: currentGuide.project.id,
                                site: siteGroup.site.id,
                                place: currentGuidePlaceId || '__unassigned__',
                                existingPlants: currentGuide.plants,
                                globalPlant: { ...result, extractionFields: selectedFacts.map(fact => fact.key), extractedFacts }
                            });
                        } catch (error) {
                            event.currentTarget.disabled = false;
                            event.currentTarget.textContent = 'Continue to plant setup';
                            if (allocationStatus) allocationStatus.textContent = `Could not open the NLXR profile: ${error.message}`;
                        }
                    });
                });
            };
            renderExtractionStep();
            return;
            /* Legacy direct conversion flow retained below for compatibility. */
            if (false) {
            button.textContent = 'Opening profile…';
            try {
                await openGlobalPlantProfile(renderTarget || app, {
                    project: currentGuide.project.id,
                    site: siteGroup.site.id,
                    place: currentGuidePlaceId || '__unassigned__',
                    globalPlant: result
                });
            } catch (error) {
                button.disabled = false;
                button.textContent = 'Convert to NLXR profile';
                if (globalStatus) globalStatus.textContent = `Could not open the plant profile: ${error.message}`;
            }
            }
        }));
    };
    const searchGlobal = value => {
        clearTimeout(globalGuideSearchTimer);
        const query = String(value || '').trim();
        globalSearchQuery = query;
        if (globalResults) globalResults.innerHTML = '';
        openGlobalProfile = null;
        if (query.length < 2) {
            globalPanel.hidden = true;
            if (globalStatus) globalStatus.textContent = 'Type at least 2 letters.';
            return;
        }
        globalPanel.hidden = false;
        if (globalStatus) globalStatus.textContent = 'Searching the global plant list…';
        globalGuideSearchTimer = setTimeout(async () => {
            try {
                const results = await searchGlobalPlants(query);
                if (searchInput.value.trim() !== query) return;
                renderGlobalResults(results);
                if (globalStatus) globalStatus.textContent = results.length ? `${results.length} plant record${results.length === 1 ? '' : 's'} found across ${PLANT_SEARCH_SOURCE_LABEL}. Select one to open its profile.` : `No plant matches found across ${PLANT_SEARCH_SOURCE_LABEL}.`;
            } catch (error) {
                if (searchInput.value.trim() !== query) return;
                if (globalStatus) globalStatus.textContent = 'Global plant databases unavailable. Local results remain available.';
            }
        }, 300);
    };
    searchInput.addEventListener('input', event => {
        allPlants.open = true;
        applyFieldGuideFilter(currentGuidePlaceId);
        searchGlobal(event.target.value);
    });
}

export async function renderFieldGuide(app, encodedProjectId, creator = false, renderTarget = app) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const guide = creator ? await loadCreatorGuide(projectId) : await loadGuide(projectId);
        const backAction = creator ? `window.renderProjectDashboard('${encoded(projectId)}')` : `window.renderVisitorLocationIntro('${encoded(projectId)}')`;
        const guideTitle = creator ? 'Content' : 'Field Guide';
        const allPlaces = guide.siteGroups.flatMap(group => group.placeGroups.map(placeGroup => ({ ...placeGroup.place, siteName: group.site.name, siteId: group.site.id, count: placeGroup.plants.length, markerCount: placeGroup.markerCount, placedCount: placeGroup.placedCount, placedItems: placeGroup.placedItems, anchoredCount: placeGroup.anchoredCount, anchoredItems: placeGroup.anchoredItems, totems: placeGroup.totems, hasTotem: placeGroup.hasTotem, hasStartingPoint: placeGroup.hasStartingPoint })));
        const homePlace = allPlaces.find(isDefaultHomeArea) || null;
        const places = allPlaces;
        const orderedPlaces = [...places].sort((first, second) => Number(isDefaultHomeArea(second)) - Number(isDefaultHomeArea(first)));
        const homeCount = guide.plants.filter(plant => isDefaultHomeArea(allPlaces.find(place => place.id === plant.placeId))).length;
        const unassignedCount = homeCount; // Compatibility alias for the existing summary template.
        guide.plants.forEach(plant => {
            if (isDefaultHomeArea(plant.placeName)) plant.placeName = DEFAULT_HOME_AREA_NAME;
        });
        const areaCards = places.map(place => {
            const symbols = `${place.hasStartingPoint ? '<i class="field-guide-starting-symbol" aria-label="Trail Entrance"></i>' : ''}${place.hasTotem ? '<i class="field-guide-totem-symbol" aria-label="Totem Marker"></i>' : ''}`;
            const action = creator
                ? `window.renderProjectAreaDashboard('${encoded(guide.project.id)}','${encoded(place.id)}')`
                : `window.filterFieldGuidePlace('${escapeHtml(place.id)}')`;
            const icon = `<i class="field-guide-fireplace-symbol" aria-label="Open Area">${areaIcon(place)}</i>${creator ? '' : symbols}`;
            return `<button class="field-guide-area-card${creator ? ' is-creator-area' : ''}" onclick="${action}"><span class="field-guide-area-symbols" aria-hidden="false">${icon}</span><span><strong>${escapeHtml(place.name)}</strong><small>${place.count} plant${place.count === 1 ? '' : 's'}${place.hasTotem ? ' · Totem' : ''}${place.hasStartingPoint ? ' · Trail Entrance' : ''}</small></span></button>`;
        }).join('');
        const totemLinks = places.flatMap(place => (Array.isArray(place.totem_links) ? place.totem_links : []).map(link => ({ from: place, to: places.find(candidate => candidate.id === link.target_area_id), ...link }))).filter(link => link.to);
        const totemDiagram = `<section><h2 class="project-section-title">Totem connections</h2><div class="totem-connection-diagram">${places.filter(place => place.hasTotem).map(place => `<span class="totem-node">${escapeHtml(place.name)}</span>`).join('')}${totemLinks.map(link => `<span class="totem-link">${escapeHtml(link.from.name)} → ${escapeHtml(link.to.name)}${link.distance_m ? ` · ${escapeHtml(link.distance_m)} m` : ''}${link.steps ? ` · ${escapeHtml(link.steps)} steps` : ''}</span>`).join('') || '<p class="meta">Totems are shown here as they are placed. Walked-path connections can be added without tying the data to one headset.</p>'}</div></section>`;
        const totemCards = guide.totems.map(totem => {
            const information = Array.isArray(totem.information_bubbles) ? totem.information_bubbles : Array.isArray(totem.text_boxes) ? totem.text_boxes : [];
            const summary = totem.description || totem.notes || information.map(item => typeof item === 'string' ? item : item?.text || item?.content || '').filter(Boolean).join(' ');
            const body = `<span class="field-guide-card-icon field-guide-totem-icon" aria-hidden="true">⌖</span><span><strong>${escapeHtml(totem.name || `${totem.placeName} Totem`)}</strong><small>${escapeHtml(totem.placeName)} · Area checkpoint</small><small>${escapeHtml(summary || 'Information board ready for content.')}</small></span>`;
            return creator
                ? `<button class="field-guide-totem-card" data-field-guide-totem data-place="${escapeHtml(totem.placeId)}" data-search="${escapeHtml([totem.name, totem.placeName, summary].join(' ').toLowerCase())}" type="button" onclick="window.renderAreaCheckpointForm('${encoded(guide.project.id)}','${encoded(totem.placeId)}')">${body}</button>`
                : `<article class="field-guide-totem-card" data-field-guide-totem data-place="${escapeHtml(totem.placeId)}" data-search="${escapeHtml([totem.name, totem.placeName, summary].join(' ').toLowerCase())}">${body}</article>`;
        }).join('');
        const layers = [...new Set(guide.plants.map(plant => String(plant.layer || '').trim()).filter(Boolean))].sort();
        const virtualTags = creator ? guide.plants.filter(plant => plant.virtualTagEnabled === true || plant.virtual_tag_enabled === true) : [];
        const virtualTagRows = virtualTags.map(plant => {
            let markerLabel = 'Profile selected · no ArUco linked';
            try {
                if (plant.physicalAnchor?.enabled) markerLabel = `Live · ${physicalMarkerLabel(plant.physicalAnchor.markerId)}`;
            } catch {}
            return `<button type="button" class="field-guide-virtual-tag-row${plant.physicalAnchor?.enabled ? ' is-live' : ''}" onclick="window.openFieldGuidePlant('${encoded(plant.instanceId)}')"><span class="field-guide-virtual-tag-symbol" aria-hidden="true">▦</span><span><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong><small>${escapeHtml(plant.placeName || plant.placeId)} · ${escapeHtml(markerLabel)}</small></span><b>${plant.physicalAnchor?.enabled ? 'LIVE' : 'Open'}</b></button>`;
        }).join('');
        const virtualTagsSection = creator ? `<details class="field-guide-preparation field-guide-virtual-tags field-guide-management-row"><summary><span class="field-guide-management-row-icon">${webHubIcon('leaf')}</span><span class="field-guide-management-row-content"><strong>Plant Live Tags</strong><small>${virtualTags.length} selected · ${virtualTags.filter(plant => plant.physicalAnchor?.enabled).length} live</small></span><b class="field-guide-management-row-action">Manage</b></summary><div class="field-guide-virtual-tags-body"><p>Plant Live Tags become live when an ArUco marker is linked from the Plant profile.</p><p>Scan a Plant Live Tag to discover the plant, its stories and its relationships with the surrounding ecosystem.</p>${virtualTagRows || '<p class="meta">No Plant profiles are selected yet.</p>'}</div></details>` : '';
        currentGuidePlaceId = '';
        const creationBoard = '';
        const placedCount = allPlaces.reduce((sum, place) => sum + place.placedCount, 0);
        const placedByArea = allPlaces.filter(place => place.placedCount > 0).map(place => `<span class="field-guide-element-chip"><strong>${place.placedCount}</strong> ${escapeHtml(place.name)}</span>`).join('');
        const elementSummary = creator ? `<section class="field-guide-preparation field-guide-elements-summary" aria-labelledby="fieldGuideElementsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideElementsTitle">Elements</h2><p>Global summary of placed items, grouped by Area.</p></div></div><details class="field-guide-anchor-readiness" open><summary><span aria-hidden="true">⌖</span><div><strong>${placedCount} placed element${placedCount === 1 ? '' : 's'}</strong><p>Plant records remain in the list below.</p></div></summary><div class="field-guide-element-chips">${placedByArea || '<p>No placed elements yet.</p>'}</div></details></section>` : '';
        const anchoredCount = allPlaces.reduce((sum, place) => sum + place.anchoredCount, 0);
        const anchoredItems = allPlaces.flatMap(place => place.anchoredItems.map(item => ({ ...item, place })));
        const anchoredRows = anchoredItems.map(({ marker, anchor, place }) => {
            const action = marker.type === 'area_checkpoint' || marker.semantic_type === 'area_checkpoint'
                ? `window.renderAreaCheckpointForm('${encoded(guide.project.id)}','${encoded(place.id)}')`
                : marker.type === 'intro_checkpoint'
                    ? `window.renderStartingPointForm('${encoded(guide.project.id)}','${encoded(place.id)}','field-guide')`
                    : `window.openProjectEntry('${encoded(guide.project.id)}','${encoded(marker.id)}',false,'field-guide')`;
            return `<button type="button" onclick="${action}"><span><strong>${escapeHtml(marker.name || 'Anchored item')}</strong><small>${escapeHtml(place.name)} · ${escapeHtml(String(anchor.type).toUpperCase())}</small></span><b>Edit</b></button>`;
        }).join('');
            const preparationTools = creator ? `<section class="field-guide-preparation field-guide-visual-guide" aria-labelledby="fieldGuideVisualGuideTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideVisualGuideTitle">Visual Guide</h2><p>See Areas and their spatial organisation on a map.</p></div></div><div class="field-guide-preparation-grid is-single-action"><button type="button" onclick="window.renderLocationMap('${encoded(guide.project.id)}',true,'field-guide')"><strong>Map</strong><span>View the landscape and its Areas visually.</span></button></div></section><section class="field-guide-preparation field-guide-creative-tools" aria-labelledby="fieldGuideCreativeToolsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideCreativeToolsTitle">Creative Features</h2><p>Shape how visitors discover and experience this place.</p></div></div><div class="field-guide-preparation-grid"><button type="button" onclick="window.renderStartingPoints('${encoded(guide.project.id)}')"><strong>Visitor Entrances</strong><span>Create a guided beginning for visitors.</span></button><details class="field-guide-special-elements"><summary><strong>Special Elements</strong><span>Preview future capabilities.</span></summary><div class="field-guide-special-copy"><p>Special Elements are planned for a future release, bringing richer ways to tell stories in place.</p><ul><li>Videos and moving image</li><li>3D models and spatial objects</li><li>Voice guidance and sound</li><li>More interactive visitor features</li></ul></div></details></div></section><section class="field-guide-preparation" aria-labelledby="fieldGuideAnchorsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideAnchorsTitle">Physical Anchors</h2><p>Only elements successfully connected to physical space appear here.</p></div></div><details class="field-guide-anchor-readiness" open><summary><span aria-hidden="true">⌖</span><div><strong>${anchoredCount} anchored element${anchoredCount === 1 ? '' : 's'}</strong><p>Review or edit successful physical-space connections.</p></div></summary><div class="field-guide-anchored-list">${anchoredRows || '<p>No elements are anchored yet.</p>'}</div></details></section>` : '';
        const locationResetAction = creator && homePlace
            ? `window.filterFieldGuidePlace('${escapeHtml(homePlace.id)}')`
            : "window.filterFieldGuidePlace('')";
        if (creator) {
            const creatorAreaCards = orderedPlaces.map(place => {
                const totem = place.totems?.[0];
                const totemColor = /^#[0-9a-f]{6}$/i.test(totem?.appearance?.color || '') ? totem.appearance.color : DEFAULT_TOTEM_COLOR;
                const action = `window.renderProjectAreaDashboard('${encoded(guide.project.id)}','${encoded(place.id)}')`;
                const searchText = [place.name, place.siteName, 'area'].join(' ').toLowerCase();
                const totemMarkup = place.hasTotem
                    ? `<span class="field-guide-area-totem" style="--area-totem-color:${totemColor}" aria-label="Totem Marker" title="Totem Marker">&#x2316;</span>`
                    : '<span class="field-guide-area-totem is-empty" aria-label="No Totem Marker">&#x25CB;</span>';
                const areaMeta = `<b>${place.count}</b> plant${place.count === 1 ? '' : 's'}${isDefaultHomeArea(place) ? ' &#x00B7; Home workspace' : place.hasTotem ? ' &#x00B7; Totem' : ''}`;
                const areaLabel = isDefaultHomeArea(place) ? DEFAULT_HOME_AREA_NAME : place.name;
                return `<button class="field-guide-area-card is-creator-area${isDefaultHomeArea(place) ? ' is-home-area' : ''}" data-field-guide-area data-place="${escapeHtml(place.id)}" data-search="${escapeHtml(searchText)}" type="button" aria-label="${escapeHtml(`${areaLabel}${place.siteName ? `, ${place.siteName}` : ''}`)}" onclick="${action}"><span class="field-guide-area-icon" aria-hidden="true">${areaIcon(place)}</span><span class="field-guide-area-copy"><strong>${escapeHtml(areaLabel)}</strong><small>${areaMeta}</small></span><span class="field-guide-area-arrow" aria-hidden="true">${webHubIcon('chevron')}</span></button>`;
            }).join('');
            const plantRows = guide.plants.map(plant => `<button class="analog-plant-row field-guide-plant-card" data-field-guide-plant data-field-guide-search-tone="local" data-place="${escapeHtml(plant.placeId)}" data-layer="${escapeHtml(String(plant.layer || '').toLowerCase())}" data-search="${escapeHtml([plant.commonName, plant.scientificName, plant.family, plant.origin, plant.plantType, plant.layer, Array.isArray(plant.uses) ? plant.uses.join(' ') : plant.uses, plant.propagation, plant.localNotes, plant.summary, plant.placeId, plant.placeName].join(' ').toLowerCase())}" type="button" onclick="window.openFieldGuidePlant('${encoded(plant.instanceId)}')"><span class="field-guide-card-icon" aria-hidden="true">&#x1F33F;</span><span><span class="field-guide-plant-card-heading"><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong>${plantCapabilityMarkup(plant)}</span>${scientificNameMarkup(plant.scientificName)}<small>${escapeHtml(isDefaultHomeArea(plant.placeName) ? DEFAULT_HOME_AREA_NAME : plant.placeName || plant.placeId)}${plant.layer ? ` &#x00B7; ${escapeHtml(plant.layer)}` : ''}</small></span></button>`).join('') || '<div class="panel"><p>No plants yet.</p></div>';
            const creatorPreparationTools = `<section class="field-guide-preparation field-guide-creative-tools" aria-labelledby="fieldGuideCreativeToolsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideCreativeToolsTitle">Creative Features</h2></div></div><div class="field-guide-preparation-grid"><button type="button" onclick="window.renderStartingPoints('${encoded(guide.project.id)}')"><strong>Visitor Entrances</strong><span>Guided beginning.</span></button><details class="field-guide-special-elements"><summary><strong>Special Elements</strong><span>Future capabilities.</span></summary><div class="field-guide-special-copy"><p>Planned place-based tools.</p><ul><li>Videos and moving image</li><li>3D models and spatial objects</li><li>Voice guidance and sound</li><li>More interactive visitor features</li></ul></div></details></div></section><section class="field-guide-preparation" aria-labelledby="fieldGuideAnchorsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideAnchorsTitle">Anchored Elements</h2></div></div><details class="field-guide-anchor-readiness"><summary><span aria-hidden="true">&#x2316;</span><div><strong>${anchoredCount} anchored element${anchoredCount === 1 ? '' : 's'}</strong><p>Only successful physical-space connections.</p></div></summary><div class="field-guide-anchored-list">${anchoredRows || '<p>No elements are anchored yet.</p>'}</div></details></section>`;
            app.innerHTML = `<div class="screen field-guide field-guide-hub field-guide-tool analog-print-page"><div class="page-header field-guide-header"><p class="print-kicker">${escapeHtml(guide.project.name).toUpperCase()}</p><h1>Web Hub</h1></div><section class="field-guide-essentials" aria-labelledby="fieldGuideEssentialsTitle"><div class="field-guide-essentials-heading"><h2 id="fieldGuideEssentialsTitle">Project overview</h2><button class="field-guide-map-action" type="button" onclick="window.renderLocationMap('${encoded(guide.project.id)}',true,'field-guide')">Map</button></div><div class="field-guide-summary"><span><strong>${places.length}</strong> Areas</span><span><strong>${guide.plants.length}</strong> Plants</span><span><strong>${guide.totems.length}</strong> Totems</span><span><strong>${placedCount}</strong> Elements</span><span><strong>${anchoredCount}</strong> Anchored</span></div><div class="field-guide-creation-actions"><button type="button" onclick="window.renderLocationFieldMarker('${encoded(guide.project.id)}','plant','without-ar',true)"><strong>+ Plant</strong></button><button type="button" onclick="window.renderProjectAreaForm('${encoded(guide.project.id)}','field-guide')"><strong>+ Area</strong></button></div></section><section class="field-guide-areas-board" aria-labelledby="fieldGuideAreasTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideAreasTitle">Areas</h2></div><button type="button" onclick="${locationResetAction}">All</button></div><div class="field-guide-place-cloud field-guide-area-grid">${creatorAreaCards || '<p class="meta">No Areas are available yet.</p>'}</div></section><section class="field-guide-plant-search" aria-labelledby="fieldGuidePlantSearchTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuidePlantSearchTitle">Search</h2></div></div><div class="field-guide-search-deck"><div class="field"><label for="fieldGuideSearch">Search plants</label><input id="fieldGuideSearch" type="search" placeholder="Name, scientific name, use or Area" /></div></div><p id="fieldGuideCount">${guide.plants.length} plant${guide.plants.length === 1 ? '' : 's'}</p><div class="analog-plant-list field-guide-plant-grid">${plantRows}</div></section>${creatorPreparationTools}${virtualTagsSection}<details class="field-guide-area-help"><summary aria-label="About Areas">?</summary><p>Each Area keeps its own Plants and spatial markers. Home is the unassigned starting space.</p></details><div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button><button class="ghost analog-navigation" onclick="${backAction}">Back</button></div></div>`;
            const creatorSpatialSetup = `<section class="field-guide-spatial-setup" aria-labelledby="fieldGuideSpatialSetupTitle">
                <div class="field-guide-section-heading"><div><p class="field-guide-section-kicker">Spatial workspace</p><h2 id="fieldGuideSpatialSetupTitle">Spatial setup</h2></div></div>
                <div class="field-guide-spatial-list field-guide-management-list">
                    <details class="field-guide-management-row field-guide-spatial-row"><summary><span class="field-guide-management-row-icon">${webHubIcon('layers')}</span><span class="field-guide-management-row-content"><strong>Elements</strong><small>${placedCount} placed</small></span><b class="field-guide-management-row-action">Manage</b></summary><div class="field-guide-element-chips">${placedByArea || '<p class="meta">No placed elements yet.</p>'}</div></details>
                    <details class="field-guide-management-row field-guide-spatial-row"><summary><span class="field-guide-management-row-icon">${webHubIcon('area')}</span><span class="field-guide-management-row-content"><strong>Totems</strong><small>${guide.totems.length} configured</small></span><b class="field-guide-management-row-action">Manage</b></summary><div class="field-guide-totem-list">${totemCards || '<p class="meta">No Totem Markers yet.</p>'}</div></details>
                    <details class="field-guide-management-row field-guide-spatial-row"><summary><span class="field-guide-management-row-icon">${webHubIcon('anchor')}</span><span class="field-guide-management-row-content"><strong>Anchors</strong><small>${anchoredCount} connected</small></span><b class="field-guide-management-row-action">Manage</b></summary><div class="field-guide-anchored-list">${anchoredRows || '<p class="meta">No physical anchors yet.</p>'}</div></details>
                </div>
            </section>`;
            const creatorCreativeSetup = `<section class="field-guide-secondary-tools" aria-labelledby="fieldGuideCreativeToolsTitle">
                <div class="field-guide-section-heading"><div><p class="field-guide-section-kicker">Optional tools</p><h2 id="fieldGuideCreativeToolsTitle">Creative Features</h2><p>Prepare how visitors discover and experience this place.</p></div></div>
                <div class="field-guide-secondary-tool-list field-guide-management-list">
                    <button class="field-guide-management-row" type="button" onclick="window.renderStartingPoints('${encoded(guide.project.id)}')"><span class="field-guide-management-row-icon">${webHubIcon('area')}</span><span class="field-guide-management-row-content"><strong>Visitor Entrances</strong><small>Guided beginning for visitors.</small></span><b class="field-guide-management-row-action">Manage <span class="field-guide-management-row-chevron" aria-hidden="true">${webHubIcon('chevron')}</span></b></button>
                    <div class="field-guide-management-row is-disabled field-guide-special-elements" aria-disabled="true" aria-label="Special Elements, coming in a future release. Planned capabilities include videos, 3D models and spatial objects, voice guidance and sound."><span class="field-guide-management-row-icon">${webHubIcon('layers')}</span><span class="field-guide-management-row-content"><strong>Special Elements</strong><small>Additional creative content.</small></span><em class="field-guide-management-row-badge">Coming later</em></div>
                </div>
            </section>`;
            app.innerHTML = `<div class="screen field-guide field-guide-hub field-guide-tool field-guide-hub-redesign analog-print-page">
                <header class="page-header field-guide-header"><div><p class="print-kicker">PROJECT</p><h1>${escapeHtml(guide.project.name)}</h1></div></header>
                <nav class="nlxr-db-v2-mode-nav field-guide-dashboard-nav" aria-label="Dashboard views"><button type="button" onclick="window.renderProjectDashboard('${encoded(guide.project.id)}')"><span aria-hidden="true">✦</span> Overview</button><button type="button" onclick="window.renderLocationMap('${encoded(guide.project.id)}',true,'field-guide')"><span aria-hidden="true">▧</span> Map</button><button type="button" class="is-active" aria-current="page"><span aria-hidden="true">☰</span> Content</button></nav>
                <main class="field-guide-workspace">
                    <section class="field-guide-content-create" aria-labelledby="fieldGuideCreateTitle"><div class="field-guide-content-create-heading"><h2 id="fieldGuideCreateTitle">Create</h2></div><div class="field-guide-creation-actions"><button type="button" onclick="window.renderLocationFieldMarker('${encoded(guide.project.id)}','plant','without-ar',true)"><span class="field-guide-creation-action-icon" aria-hidden="true">＋</span><strong>Plant</strong></button><button type="button" onclick="window.renderProjectAreaForm('${encoded(guide.project.id)}','field-guide')"><span class="field-guide-creation-action-icon" aria-hidden="true">▧</span><strong>Area</strong></button></div></section>
                    <section class="field-guide-areas-board" aria-labelledby="fieldGuideAreasTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideAreasTitle">Areas</h2></div>${places.length > 1 ? `<button class="field-guide-view-all" type="button" onclick="window.filterFieldGuidePlace('')">View all</button>` : ''}</div><div class="field-guide-place-cloud field-guide-area-grid">${creatorAreaCards || '<p class="meta">No Areas are available yet.</p>'}</div></section>
                    <section class="field-guide-plant-search" aria-labelledby="fieldGuidePlantSearchTitle"><div class="field-guide-section-heading field-guide-plant-search-heading"><div><p class="field-guide-section-kicker">Plant library</p><h2 id="fieldGuidePlantSearchTitle">Plant Search</h2><p>Search saved and reference plants together.</p></div><span class="field-guide-search-badge">LOCAL + GLOBAL</span></div><div class="field-guide-search-deck field-guide-search-deck--prominent"><div class="field field-guide-plant-search-field"><label for="fieldGuideSearch">Search all plants</label><div class="field-guide-search-input"><span aria-hidden="true">⌕</span><input id="fieldGuideSearch" type="search" placeholder="Name, scientific name, use or Area" /></div><small>Search your saved plants and global sources together.</small></div></div><p id="fieldGuideCount">${guide.plants.length} plant${guide.plants.length === 1 ? '' : 's'}</p><div class="analog-plant-list field-guide-plant-grid">${plantRows}</div></section>
                    ${creatorSpatialSetup}
                    ${creatorCreativeSetup}
                    ${virtualTagsSection}
                    <details class="field-guide-area-help"><summary aria-label="About Areas">?</summary><p>Each Area keeps its own Plants and spatial markers. Home is the unassigned starting space.</p></details>
                </main>
                <footer class="analog-print-footer field-guide-redesign-footer"><button class="ghost analog-navigation" type="button" onclick="${backAction}">Back to Overview</button></footer>
            </div>`;
            // Keep the footer navigation in the Content workspace. Only the print action
            // is removed from the live screen; removing its parent footer
            // leaves users with no route back to the project dashboard.
            app.querySelectorAll('.analog-print-button').forEach(button => button.remove());
            applyCreatorContentCopy(app, renderTarget);
            applyFieldGuideFilter('');
            return;
        }
        app.innerHTML = `<div class="screen field-guide field-guide-hub analog-print-page"><div class="page-header field-guide-header"><p class="print-kicker">${escapeHtml(guide.project.name).toUpperCase()}</p><h1>${guideTitle}</h1><p class="subtitle">${creator ? 'Manage Home, Plants, Areas, Totem Markers and their spatial information.' : 'Find, filter and open Plants, Areas and Totem Markers.'}</p><div class="field-guide-summary"><span><strong>${guide.plants.length}</strong> Plants</span><span><strong>${places.length}</strong> Areas</span><span><strong>${guide.totems.length}</strong> Totem Markers</span>${unassignedCount ? `<span class="is-unassigned"><strong>${unassignedCount}</strong> In Unassigned Folder</span>` : ''}</div></div>${creationBoard}<section class="field-guide-search-deck"><div class="field"><label for="fieldGuideSearch">Deep search</label><input id="fieldGuideSearch" type="search" placeholder="Plants, Totem Markers, Areas, layers, uses or notes…" oninput="window.applyFieldGuideFilter()" /></div><div class="field"><label for="fieldGuideLayer">Forest layer</label><select id="fieldGuideLayer" onchange="window.applyFieldGuideFilter()"><option value="">All layers</option>${layers.map(layer => `<option value="${escapeHtml(layer.toLowerCase())}">${escapeHtml(layer)}</option>`).join('')}</select></div></section><section><div class="field-guide-section-heading"><div><h2>Areas</h2><p>${creator ? 'Home is the default. Open a named Area to work in its saved layout.' : 'Choose an Area to filter its records below.'}</p></div><button type="button" onclick="${locationResetAction}">${creator ? DEFAULT_HOME_AREA_NAME : 'Show all'}</button></div><div class="field-guide-place-cloud">${areaCards || '<p class="meta">No Areas are available yet.</p>'}</div></section>${totemCards ? `<section><div class="field-guide-section-heading"><div><h2>Totem Markers</h2><p>Area markers and their information boards.</p></div></div><div class="field-guide-totem-grid">${totemCards}</div></section>` : ''}${totemLinks.length || places.some(place => place.hasTotem) ? totemDiagram : ''}<section><div class="field-guide-section-heading"><div><h2>Plant records</h2><p id="fieldGuideCount">${creator ? homeCount : guide.plants.length} plant${(creator ? homeCount : guide.plants.length) === 1 ? '' : 's'}</p></div></div><div class="analog-plant-list field-guide-plant-grid">${guide.plants.map(plant => `<button class="analog-plant-row field-guide-plant-card" data-field-guide-plant data-place="${escapeHtml(plant.placeId)}" data-layer="${escapeHtml(String(plant.layer || '').toLowerCase())}" data-search="${escapeHtml([plant.commonName, plant.scientificName, plant.family, plant.origin, plant.plantType, plant.layer, Array.isArray(plant.uses) ? plant.uses.join(' ') : plant.uses, plant.propagation, plant.localNotes, plant.summary, plant.placeId, plant.placeName].join(' ').toLowerCase())}" onclick="window.openFieldGuidePlant('${encoded(plant.instanceId)}')"><span class="field-guide-card-icon" aria-hidden="true">🌿</span><span><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong>${scientificNameMarkup(plant.scientificName)}<small>${escapeHtml(plant.placeName === 'Unassigned' ? 'Unassigned Folder · Area not assigned' : plant.placeName || plant.placeId)}${plant.layer ? ` · ${escapeHtml(plant.layer)}` : ''}</small></span></button>`).join('') || '<div class="panel"><p>No plant records yet.</p></div>'}</div></section><div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button><button class="ghost analog-navigation" onclick="${backAction}">Back</button></div></div>`;
        // Keep the footer navigation in the Content workspace. Only the print action is
        // removed from the live screen so Back remains available.
        app.querySelectorAll('.analog-print-button').forEach(button => button.remove());
        app.querySelectorAll('.field-guide-area-card').forEach((card, index) => {
            const place = places[index];
            if (!place) return;
            card.dataset.fieldGuideArea = '';
            card.dataset.place = place.id;
            card.dataset.search = [place.name, place.siteName, 'area'].join(' ').toLowerCase();
        });
        const homeSummary = app.querySelector('.field-guide-summary .is-unassigned');
        if (homeSummary) homeSummary.lastChild.textContent = ` In ${DEFAULT_HOME_AREA_NAME}`;
        const searchDeck = app.querySelector('.field-guide-search-deck');
        if (searchDeck) app.querySelector('.field-guide-header')?.after(searchDeck);
        if (creator) {
            app.querySelector('.analog-print-footer')?.insertAdjacentHTML('beforebegin', elementSummary + preparationTools);
            const physicalAnchorsHeading = app.querySelector('#fieldGuideAnchorsTitle');
            if (physicalAnchorsHeading) {
                physicalAnchorsHeading.textContent = 'Anchored Elements';
                physicalAnchorsHeading.nextElementSibling.textContent = 'Only elements linked to physical markers in real space appear here.';
                physicalAnchorsHeading.closest('details')?.removeAttribute('open');
            }
            const footer = app.querySelector('.analog-print-footer');
            const summary = app.querySelector('.field-guide-summary');
            if (summary && footer) footer.before(summary);
            const creationBoard = app.querySelector('.field-guide-creation-board');
            const elementsSummary = app.querySelector('.field-guide-elements-summary');
            if (creationBoard && elementsSummary) elementsSummary.before(creationBoard);
            summary?.insertAdjacentHTML('beforeend', `<span><strong>${placedCount}</strong> Elements</span><span><strong>${anchoredCount}</strong> Anchored Elements</span>`);
            applyFieldGuideFilter(currentGuidePlaceId);
        }
        const advancedField = document.getElementById('fieldGuideLayer')?.closest('.field');
        if (searchDeck && advancedField) {
            const searchLabel = document.querySelector('label[for="fieldGuideSearch"]');
            if (searchLabel) searchLabel.textContent = 'Search';
            const advanced = document.createElement('details');
            advanced.className = 'field-guide-advanced-search';
            advanced.innerHTML = '<summary>Advanced search options</summary>';
            advanced.appendChild(advancedField);
            searchDeck.appendChild(advanced);
        }
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="${creator ? `window.renderProjectDashboard('${encoded(projectId)}')` : 'window.renderFieldGuideProjects()'}">Back</button><h1>${creator ? 'Content' : 'Field Guide'} unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

async function loadCreatorGuide(projectId) {
    const project = (await loadProjects()).find(item => item.id === projectId);
    if (!project) throw new Error('Location not found.');
    const sites = await loadProjectSites(project.id);
    const siteGroups = await Promise.all(sites.map(async site => {
        const places = await loadSitePlaces(project.id, site.id).catch(() => []);
        const placeGroups = await Promise.all(places.map(place => loadAreaGuideGroup(project.id, site.id, place, false)));
        return { site, placeGroups };
    }));
    const plants = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.plants.map(plant => ({ ...plant, siteId: group.site.id, siteName: group.site.name, placeName: placeGroup.place.name }))));
    const totems = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.totems.map(totem => ({ ...totem, siteId: group.site.id, siteName: group.site.name, placeId: placeGroup.place.id, placeName: placeGroup.place.name }))));
    currentGuide = { project, siteGroups, plants, totems, creator: true };
    return currentGuide;
}

export function applyFieldGuideFilter(placeId = currentGuidePlaceId) {
    currentGuidePlaceId = String(placeId || '');
    const query = document.getElementById('fieldGuideSearch')?.value.trim().toLocaleLowerCase() || '';
    const queryTerms = query.split(/\s+/).filter(Boolean);
    const layer = document.getElementById('fieldGuideLayer')?.value || '';
    const areaScope = query ? '' : currentGuidePlaceId;
    const enabledTones = new Set([...document.querySelectorAll('input[data-field-guide-tone-filter]:checked')].map(input => input.dataset.fieldGuideToneFilter));
    let visible = 0;
    document.querySelectorAll('[data-field-guide-plant]').forEach(row => {
        const searchable = String(row.dataset.search || '').toLocaleLowerCase();
        const matchesQuery = !queryTerms.length || queryTerms.every(term => searchable.includes(term));
        const matchesTone = !enabledTones.size || enabledTones.has(row.dataset.fieldGuideSearchTone);
        row.hidden = Boolean(!matchesQuery || !matchesTone || (layer && row.dataset.layer !== layer) || (areaScope && String(row.dataset.place).toLowerCase() !== areaScope.toLowerCase()));
        if (!row.hidden) visible += 1;
    });
    document.querySelectorAll('.field-guide-global-results [data-field-guide-search-tone]').forEach(row => {
        row.hidden = Boolean(enabledTones.size && !enabledTones.has(row.dataset.fieldGuideSearchTone));
    });
    document.querySelectorAll('[data-field-guide-totem]').forEach(row => {
        row.hidden = Boolean((query && !(row.dataset.search || '').includes(query)) || layer || (areaScope && String(row.dataset.place).toLowerCase() !== areaScope.toLowerCase()));
    });
    document.querySelectorAll('[data-field-guide-area]').forEach(row => {
        row.hidden = Boolean(query && !(row.dataset.search || '').includes(query));
    });
    const matchingPlaces = new Set([...document.querySelectorAll('[data-field-guide-plant]:not([hidden])')].map(row => String(row.dataset.place || '').toLowerCase()).filter(Boolean));
    document.querySelectorAll('[data-field-guide-area]').forEach(row => {
        const placeId = String(row.dataset.place || '').toLowerCase();
        row.classList.toggle('is-search-match', Boolean(query && matchingPlaces.has(placeId)));
        row.classList.toggle('is-search-dimmed', Boolean(query && matchingPlaces.size && !matchingPlaces.has(placeId)));
    });
    const count = document.getElementById('fieldGuideCount');
    if (count) count.textContent = `${visible} plant${visible === 1 ? '' : 's'}`;
}

export function openFieldGuidePlant(app, encodedInstanceId) {
    const instanceId = decodeURIComponent(encodedInstanceId);
    const plant = currentGuide?.plants.find(item => item.instanceId === instanceId);
    if (!plant) throw new Error('Plant is unavailable.');
    // Creator Content plant links use the unified Plant Profile. The old
    // printable Field Guide page is visitor-facing only; leaving it in the
    // creator path produced the ghost "FIELD GUIDE" surface with dead boxes.
    if (currentGuide.creator && plant.markerId && typeof window.openProjectEntry === 'function') {
        return window.openProjectEntry(
            encoded(currentGuide.project.id),
            encoded(plant.markerId),
            false,
            'webhub'
        );
    }
    const fields = [['Scientific name', plant.scientificName], ['Family', plant.family], ['Origin', plant.origin], ['Plant type', plant.plantType], ['Layer', plant.layer], ['Uses', Array.isArray(plant.uses) ? plant.uses.join(', ') : plant.uses], ['Propagation', Array.isArray(plant.propagation) ? plant.propagation.join(', ') : plant.propagation], ['Area', plant.placeName || plant.placeId], ['Local status', plant.status], ['Notes', plant.localNotes || plant.summary]];
    const positionAction = currentGuide.creator && plant.markerId ? `<section class="panel analog-navigation"><h2>Manage Plant</h2><div class="button-row"><button class="primary" onclick="window.openProjectEntry('${encoded(currentGuide.project.id)}','${encoded(plant.markerId)}')">Rename, move or edit profile</button><button onclick="window.positionFieldGuidePlant('${encoded(plant.instanceId)}')">Update current position</button></div><p id="fieldGuidePositionStatus" class="meta">${Number.isFinite(Number(plant.map?.latitude)) ? `${Number(plant.map.latitude).toFixed(6)}, ${Number(plant.map.longitude).toFixed(6)}` : 'No position saved.'}</p></section>` : '';
    app.innerHTML = `<div class="screen field-guide analog-print-page"><div class="page-header"><button class="ghost analog-navigation" onclick="window.renderFieldGuide('${encoded(currentGuide.project.id)}', ${currentGuide.creator})">Back</button><p class="print-kicker">${escapeHtml(currentGuide.project.name).toUpperCase()} FIELD GUIDE</p><h1>${escapeHtml(plant.commonName || 'Unnamed plant')}</h1><p class="subtitle"><em>${escapeHtml(plant.scientificName || '')}</em></p></div><dl class="analog-profile-grid">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value || 'Not entered.')}</dd></div>`).join('')}</dl>${positionAction}<div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button></div></div>`;
}

export function positionFieldGuidePlant(encodedInstanceId) {
    const instanceId = decodeURIComponent(encodedInstanceId);
    const plant = currentGuide?.creator && currentGuide.plants.find(item => item.instanceId === instanceId);
    const status = document.getElementById('fieldGuidePositionStatus');
    if (!plant?.markerId || !navigator.geolocation) { if (status) status.textContent = 'Current location is unavailable.'; return; }
    status.textContent = 'Capturing current position…';
    navigator.geolocation.getCurrentPosition(async position => {
        try {
            const anchor = await saveMarkerAnchor(currentGuide.project.id, plant.siteId, plant.placeId, plant.markerId, { type: 'gps', latitude: position.coords.latitude, longitude: position.coords.longitude, altitude: position.coords.altitude ?? '', accuracy: position.coords.accuracy, captured_at: new Date(position.timestamp).toISOString() });
            plant.map = { ...(plant.map || {}), latitude: anchor.latitude, longitude: anchor.longitude };
            status.textContent = `Position saved: ${Number(anchor.latitude).toFixed(6)}, ${Number(anchor.longitude).toFixed(6)} · accuracy ${Math.round(Number(anchor.accuracy))} m`;
        } catch (error) { status.textContent = `Position could not be saved: ${error.message}`; }
    }, error => { status.textContent = error.code === 1 ? 'Location permission was denied.' : 'Current position could not be captured.'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
}
