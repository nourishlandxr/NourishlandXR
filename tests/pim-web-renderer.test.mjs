import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPimDocument, pimNodeById } from '../app/services/pimModel.js';
import {
    applyPlantInformationWebEdit,
    createPlantInformationWebNodeId,
    createPlantInformationWebState,
    plantInformationWebMarkup,
    searchPlantInformationWeb,
    togglePlantInformationWebCentre,
    togglePlantInformationWebNode
} from '../app/components/plantInformationWeb.js';

const rendererSource = readFileSync(new URL('../app/components/plantInformationWeb.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/pim.css', import.meta.url), 'utf8');

function referenceDocument() {
    return createPimDocument({
        plantId: 'pigeon-pea',
        identity: {
            commonName: 'Pigeon Pea',
            scientificName: 'Cajanus cajan',
            identityStatement: 'A productive support shrub for food forests.',
            image: '/plants/pigeon-pea.jpg',
            synonyms: ['Congo pea'],
            regionalNames: ['Gungo pea']
        },
        nodes: [
            {
                id: 'ecological-functions',
                parentId: 'food-forest',
                title: 'Ecological Functions',
                preview: 'Supports soil and neighbours',
                body: 'Pigeon Pea contributes biomass, shelter and biological nitrogen fixation.',
                informationType: 'fact',
                evidenceStatus: 'sourced',
                status: 'published',
                tags: ['soil', 'food forest'],
                sourceIds: ['source-ecology']
            },
            {
                id: 'nitrogen-fixer',
                parentId: 'ecological-functions',
                title: 'Nitrogen Fixer',
                preview: 'Supports soil nitrogen',
                body: 'Root-nodule bacteria can fix atmospheric nitrogen in suitable conditions.',
                informationType: 'fact',
                evidenceStatus: 'verified',
                status: 'published',
                tags: ['nitrogen', 'soil'],
                sourceIds: ['source-nitrogen']
            },
            {
                id: 'culinary',
                parentId: 'uses',
                title: 'Culinary',
                preview: 'Fresh and dried peas',
                body: 'Seeds and young pods are prepared in several food traditions.',
                informationType: 'practice',
                evidenceStatus: 'sourced',
                status: 'published'
            },
            {
                id: 'direct-sowing',
                parentId: 'propagation',
                title: 'Direct Sowing',
                preview: 'Sow into warm soil',
                body: 'Local results vary with soil moisture, temperature and seed quality.',
                informationType: 'guidance',
                evidenceStatus: 'sourced',
                status: 'published',
                safetyNote: 'Use locally appropriate planting guidance.'
            }
        ]
    });
}

test('Web PIM renders the six stable categories as a rectangular plant knowledge diagram', () => {
    const document = referenceDocument();
    const markup = plantInformationWebMarkup(document, createPlantInformationWebState(document, { viewMode: 'compass' }));
    assert.match(markup, /class="pim-web-compass-shell"/);
    assert.match(markup, /data-pim-group="relationship"/);
    assert.match(markup, /data-pim-group="agency"/);
    assert.match(markup, /data-pim-group="certainty"/);
    assert.match(markup, /data-pim-group="process"/);
    for (const id of ['food-forest', 'uses', 'propagation', 'scientific-information', 'historical-data', 'cultivation']) {
        assert.match(markup, new RegExp(`data-pim-node-id="${id}"`));
    }
    assert.match(markup, /Pigeon Pea/);
    assert.match(markup, /<em>Cajanus cajan<\/em>/);
    assert.match(markup, /Plant knowledge/);
    assert.match(markup, /data-pim-directions-info/);
    assert.match(markup, /aria-label="Plant knowledge directions" hidden/);
    assert.doesNotMatch(markup, /Knowledge Compass/);
    assert.doesNotMatch(`${rendererSource}\n${styles}`, /hexagon|honeycomb|clip-path:\s*polygon/i);
    for (const id of ['food-forest', 'uses', 'propagation', 'scientific-information', 'historical-data', 'cultivation']) {
        assert.equal((markup.match(new RegExp(`data-pim-node-id="${id}"`, 'g')) || []).length, 1);
    }
});

test('Plant Profile can use a compact PIM surface without the Web search field', () => {
    const document = referenceDocument();
    const markup = plantInformationWebMarkup(document, createPlantInformationWebState(document), { showSearch: false });
    assert.doesNotMatch(markup, /data-pim-search-form/);
    assert.match(markup, /data-pim-directions-info/);
    assert.match(markup, /aria-label="Plant knowledge directions" hidden/);
});

test('Plant Information Mesh opens in the accessible list by default', () => {
    const document = referenceDocument();
    const state = createPlantInformationWebState(document);
    const markup = plantInformationWebMarkup(document, state, { showSearch: false });
    assert.equal(state.viewMode, 'list');
    assert.match(markup, /data-pim-list-view[^>]*>/);
    assert.doesNotMatch(markup, /data-pim-list-view[^>]* hidden/);
    assert.match(markup, /data-pim-view="list"[^>]*aria-pressed="true"/);
    assert.match(markup, /data-pim-view="compass"[^>]*aria-pressed="false"/);
});

test('Diagram view remains an explicit compact overview mode', () => {
    const document = referenceDocument();
    const state = createPlantInformationWebState(document, { viewMode: 'compass' });
    const markup = plantInformationWebMarkup(document, state, { showSearch: false });
    assert.doesNotMatch(markup, /data-pim-compass-view[^>]* hidden/);
    assert.match(styles, /grid-template-areas:\s*"identity identity"/);
    assert.match(styles, /\.pim-web-sector \{[\s\S]*border: 1px solid/);
});

test('Plant Profile can omit the repeated PIM identity card while retaining the mesh', () => {
    const document = referenceDocument();
    const markup = plantInformationWebMarkup(document, createPlantInformationWebState(document), { showSearch: false, showIdentity: false });
    assert.match(markup, /class="pim-web-accessible-list"/);
    assert.match(markup, /data-pim-list-item-id="scientific-information"/);
    assert.match(markup, /data-pim-directions-info/);
    assert.doesNotMatch(markup, /pim-web-plant-visual|<em>Cajanus cajan<\/em>/);
});

test('open-node state keeps multiple branches and closes only a selected branch with descendants', () => {
    const document = referenceDocument();
    let state = createPlantInformationWebState(document);
    state = togglePlantInformationWebNode(document, state, 'food-forest');
    state = togglePlantInformationWebNode(document, state, 'uses');
    state = togglePlantInformationWebNode(document, state, 'ecological-functions');
    assert.deepEqual(new Set(state.openNodeIds), new Set(['food-forest', 'uses', 'ecological-functions']));

    state = togglePlantInformationWebNode(document, state, 'food-forest');
    assert.equal(state.openNodeIds.includes('food-forest'), false);
    assert.equal(state.openNodeIds.includes('ecological-functions'), false);
    assert.equal(state.openNodeIds.includes('nitrogen-fixer'), false);
    assert.equal(state.openNodeIds.includes('uses'), true);

    state = togglePlantInformationWebNode(document, state, 'culinary');
    assert.equal(state.detailNodeId, 'culinary');
    assert.equal(state.openNodeIds.includes('uses'), true);
});

test('the central plant closes the whole PIM and reopens the primary compass', () => {
    const document = referenceDocument();
    let state = createPlantInformationWebState(document, { openNodeIds: ['food-forest', 'uses'], detailNodeId: 'culinary' });
    state = togglePlantInformationWebCentre(document, state);
    assert.equal(state.centerOpen, false);
    assert.deepEqual(state.openNodeIds, []);
    assert.equal(state.detailNodeId, '');
    state = togglePlantInformationWebCentre(document, state);
    assert.equal(state.centerOpen, true);
    assert.deepEqual(state.openNodeIds, []);
    const markup = plantInformationWebMarkup(document, state);
    assert.match(markup, /data-pim-node-id="food-forest"/);
});

test('search opens the complete ancestry, highlights the topic and reports its path', () => {
    const document = referenceDocument();
    const state = searchPlantInformationWeb(document, createPlantInformationWebState(document), 'nitrogen');
    assert.equal(state.highlightedNodeId, 'nitrogen-fixer');
    assert.equal(state.openNodeIds.includes('food-forest'), true);
    assert.equal(state.openNodeIds.includes('ecological-functions'), true);
    assert.match(state.searchPath, /Pigeon Pea/);
    assert.match(state.searchPath, /Food Forest/);
    assert.match(state.searchPath, /Nitrogen Fixer/);
    const markup = plantInformationWebMarkup(document, state);
    assert.match(markup, /data-pim-node-id="nitrogen-fixer"[^>]*is-highlighted|is-highlighted[^>]*data-pim-node-id="nitrogen-fixer"/);
    assert.match(markup, /role="status" aria-live="polite"/);
});

test('semantic controls expose expansion state, controlled branches and a complete list view', () => {
    const document = referenceDocument();
    let state = createPlantInformationWebState(document);
    state = togglePlantInformationWebNode(document, state, 'food-forest');
    state = { ...state, viewMode: 'list' };
    const markup = plantInformationWebMarkup(document, state);
    assert.match(markup, /data-pim-list-view/);
    assert.match(markup, /Complete Plant Information Mesh/);
    assert.match(markup, /<ul class="pim-web-tree">/);
    assert.match(markup, /aria-expanded="true" aria-controls="pim-web-children-pigeon-pea-food-forest-list"/);
    assert.match(markup, /data-pim-node-path="food-forest\/ecological-functions\/nitrogen-fixer"/);
    assert.match(markup, /type="button" data-pim-node-id=/);
});

test('specific topics open a non-destructive detail surface with evidence and safety context', () => {
    const document = referenceDocument();
    let state = createPlantInformationWebState(document);
    state = togglePlantInformationWebNode(document, state, 'direct-sowing');
    const markup = plantInformationWebMarkup(document, state);
    assert.match(markup, /class="pim-web-detail" role="dialog" aria-modal="false"/);
    assert.match(markup, /data-pim-detail-id="direct-sowing"/);
    assert.match(markup, /AR PIM mini info/);
    assert.match(markup, /Connected cells/);
    assert.match(markup, /data-pim-related-node-id="propagation"/);
    assert.match(markup, /Evidence/);
    assert.match(markup, /Safety note/);
    assert.doesNotMatch(markup, /Save to Field Notes/);
    assert.doesNotMatch(markup, /Compare with another plant/);
    assert.equal(state.openNodeIds.includes('propagation'), true);
});

test('adding a child cell starts with a compact template or custom choice', () => {
    const document = referenceDocument();
    const markup = plantInformationWebMarkup(document, createPlantInformationWebState(document, { editorMode: 'add', editorParentId: 'uses' }), { editable: true, showSearch: false });
    assert.match(markup, /Add new cell/);
    assert.match(markup, /data-pim-template-id="food"/);
    assert.match(markup, /data-pim-template-id="custom"/);
    assert.match(markup, /Choose a template above/);
    assert.match(markup, /is-awaiting-template/);
});

test('editing adds a structured child without mutating or deleting legacy document content', () => {
    const document = { ...referenceDocument(), legacy: { overview: 'Preserve this legacy description.' } };
    const next = applyPlantInformationWebEdit(document, 'add', '', {
        parentId: 'uses',
        informationType: 'practice',
        title: 'Seed Sharing',
        preview: 'Share locally adapted seed',
        body: 'Keep provenance and local adaptation notes with shared seed.',
        tags: ['seed', 'sharing'],
        region: 'Local',
        climateContext: 'Warm climates',
        sourceIds: ['community-workshop'],
        attribution: 'Community seed savers',
        evidenceStatus: 'community_contributed',
        safetyNote: '',
        media: [],
        displayOrder: 4,
        status: 'draft',
        provenance: []
    });
    assert.equal(pimNodeById(next, 'seed-sharing').parentId, 'uses');
    assert.equal(pimNodeById(next, 'seed-sharing').primaryCategory, 'uses');
    assert.equal(next.legacy.overview, 'Preserve this legacy description.');
    assert.equal(pimNodeById(document, 'seed-sharing'), null);
});

test('editing and import review controls appear only for editable Creator profiles', () => {
    const document = referenceDocument();
    const initial = createPlantInformationWebState(document, { editorMode: 'add', editorParentId: 'uses' });
    const staging = {
        items: [{
            id: 'import-family',
            sourceDatabase: 'Trusted Plant Database',
            destination: 'scientific-information/classification',
            reviewStatus: 'pending',
            proposedNode: { title: 'Family', preview: 'Fabaceae legume family', parentId: 'scientific-information' }
        }]
    };
    const creator = plantInformationWebMarkup(document, initial, { editable: true, importReview: staging });
    assert.match(creator, /Structured PIM editor/);
    for (const field of ['parentId', 'primaryCategory', 'knowledgeMode', 'informationType', 'title', 'preview', 'body', 'tags', 'region', 'climateContext', 'sourceIds', 'authorOrganisation', 'attribution', 'publicationDate', 'retrievalDate', 'evidenceStatus', 'safetyNote', 'media', 'displayOrder', 'status']) {
        assert.match(creator, new RegExp(`name="${field}"`));
    }
    assert.match(creator, /Staged plant data/);
    assert.match(creator, /pim-web-import-count/);
    assert.match(creator, /pim-web-import-message/);
    assert.match(creator, /data-pim-import-decision="approve"/);
    assert.match(creator, /data-pim-import-decision="reject"/);
    assert.match(creator, /data-pim-import-decision="modify"/);

    const visitor = plantInformationWebMarkup(document, initial, { editable: false, importReview: staging });
    assert.doesNotMatch(visitor, /Structured PIM editor|Add information|Staged plant data|Edit information/);
});

test('Uses children use compact plant-part templates without rendering empty information boxes', () => {
    const document = referenceDocument();
    const state = createPlantInformationWebState(document, { editorMode: 'add', editorParentId: 'culinary' });
    const markup = plantInformationWebMarkup(document, state, { editable: true, showSearch: false, showIdentity: false });
    assert.match(markup, /pim-web-template-palette/);
    for (const part of ['Root', 'Leaves', 'Pods', 'Fruit', 'Beans', 'Seeds', 'Bark', 'Custom']) {
        assert.match(markup, new RegExp(`data-pim-template-id="[^"]*"[^>]*>${part}<`));
    }
    assert.match(markup, /pim-web-editor-fields--essential/);
    assert.match(markup, /pim-web-editor-advanced/);
    assert.match(markup, /Sources, evidence and display settings/);
    assert.doesNotMatch(markup, /Full content/);
});

test('Historical Data and Food Forest expose focused parent-specific starters', () => {
    const document = referenceDocument();
    const historical = plantInformationWebMarkup(document, createPlantInformationWebState(document, { editorMode: 'add', editorParentId: 'historical-data' }), { editable: true, showSearch: false, showIdentity: false });
    assert.match(historical, /Country of origin/);
    assert.match(historical, /Scripture &amp; traditional links/);
    assert.doesNotMatch(historical, /Root|Leaves|Pods/);

    const country = plantInformationWebMarkup(document, createPlantInformationWebState(document, { editorMode: 'add', editorParentId: 'historical-data', editorSeed: { templateId: 'country-of-origin', title: 'Country of origin', preview: 'Select a country' } }), { editable: true, showSearch: false, showIdentity: false });
    assert.match(country, /name="countryOfOrigin"/);
    assert.match(country, /value="India"/);

    const foodForest = plantInformationWebMarkup(document, createPlantInformationWebState(document, { editorMode: 'add', editorParentId: 'food-forest' }), { editable: true, showSearch: false, showIdentity: false });
    assert.match(foodForest, /data-pim-template-id="function"/);
    assert.match(foodForest, />Function</);
    assert.match(foodForest, />Custom</);
});

test('PIM starter cells remain repeatable and receive unique ids', () => {
    const document = referenceDocument();
    const firstId = createPlantInformationWebNodeId(document, 'scientific-information', 'Taxonomy');
    const first = applyPlantInformationWebEdit(document, 'add', '', {
        id: firstId,
        parentId: 'scientific-information',
        informationType: 'fact',
        title: 'Taxonomy',
        preview: 'Scientific classification',
        body: 'Fabaceae.',
        evidenceStatus: 'draft',
        status: 'draft',
        provenance: []
    });
    const secondId = createPlantInformationWebNodeId(first, 'scientific-information', 'Taxonomy');
    const second = applyPlantInformationWebEdit(first, 'add', '', {
        id: secondId,
        parentId: 'scientific-information',
        informationType: 'fact',
        title: 'Taxonomy',
        preview: 'Updated classification',
        body: 'A second reviewed classification note.',
        evidenceStatus: 'draft',
        status: 'draft',
        provenance: []
    });
    assert.equal(firstId, 'scientific-information-taxonomy');
    assert.equal(secondId, 'scientific-information-taxonomy-2');
    assert.equal(pimNodeById(second, firstId).title, 'Taxonomy');
    assert.equal(pimNodeById(second, secondId).title, 'Taxonomy');
    const palette = plantInformationWebMarkup(document, createPlantInformationWebState(document, { editorMode: 'add', editorParentId: 'scientific-information' }), { editable: true, showSearch: false, showIdentity: false });
    assert.match(palette, /data-pim-template-id="taxonomy"/);
});

test('Web PIM save action stays available while the compact editor scrolls', () => {
    assert.match(styles, /\.pim-web-editor form > footer \{[\s\S]*position: sticky;[\s\S]*bottom: 0;/);
    assert.match(styles, /\.pim-web-editor-context/);
    assert.match(styles, /\.pim-web-template-options/);
});

test('Web PIM CSS reflows to ordered mobile groups without horizontal scrolling', () => {
    assert.match(styles, /grid-template-areas:\s*"identity identity"[\s\S]*"relationship agency"[\s\S]*"certainty process"/);
    assert.match(styles, /@media \(max-width: 760px\)/);
    assert.match(styles, /\.pim-web-identity \{ order: 1;/);
    assert.match(styles, /\.pim-web-sector--relationship \{ order: 2;/);
    assert.match(styles, /\.pim-web-sector--agency \{ order: 3;/);
    assert.match(styles, /\.pim-web-sector--certainty \{ order: 4;/);
    assert.match(styles, /\.pim-web-sector--process \{ order: 5;/);
    assert.match(styles, /overflow-x: clip/);
    assert.match(styles, /min-height: 44px/);
    assert.match(styles, /max\(11px,/);
    assert.match(styles, /220ms/);
    assert.match(styles, /prefers-reduced-motion: reduce/);
});

test('mount contract keeps explicit state and exposes routing, persistence and import callbacks', () => {
    assert.match(rendererSource, /export function mountPlantInformationWeb\(container, options = \{\}\)/);
    assert.match(rendererSource, /options\.onRouteChange\?\.\(publicState\(\), selectedNode\(\)\)/);
    assert.match(rendererSource, /options\.onSaveDocument\?\.\(nextDocument\)/);
    assert.match(rendererSource, /options\.onApproveImport/);
    assert.match(rendererSource, /options\.onRejectImport/);
    assert.match(rendererSource, /options\.onModifyImport/);
    assert.match(rendererSource, /openNodeIds/);
    assert.match(rendererSource, /data-pim-node-id/);
    assert.match(rendererSource, /data-pim-node-path/);
});
