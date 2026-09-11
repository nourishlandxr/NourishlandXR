import { mountPlantInformationWeb } from '../components/plantInformationWeb.js';
import { resolvePlantPim } from './pimLegacyAdapter.js';
import { normalizePimDocument, pimAncestors } from './pimModel.js';
const loadPlantProfile = async (...args) => (await import('./persistence.js')).loadPlantProfile(...args);
const savePlantProfile = async (...args) => (await import('./persistence.js')).savePlantProfile(...args);
import { html } from './productExperience.js';

export function creatorKnowledgeDocument(record) {
    const marker = record.marker || {};
    return resolvePlantPim(record.plantProfile || marker.plant_profile || {}, {
        id: marker.plantId || marker.id, plantId: marker.plantId || marker.id,
        commonName: record.plantProfile?.common_name || marker.name || 'Plant',
        scientificName: record.plantProfile?.scientific_name || ''
    });
}

export function creatorKnowledgeState(document, { path = '', observation = false, edit = false, state = {} } = {}) {
    const node = document.nodes.find(item => item.path === path || item.id === path);
    const ancestors = node ? pimAncestors(document, node.id) : [];
    const branch = ancestors[0]?.id || (node && !node.parentId ? node.id : state.outlineBranchId) || 'food-forest';
    return { ...state, viewMode: 'list', ...(node ? { highlightedNodeId: node.id,
        openNodeIds: [...new Set([...(state.openNodeIds || []), ...ancestors.map(item => item.id), node.id])],
        outlineBranchId: branch, detailNodeId: node.parentId ? node.id : '' } : {}),
        ...(edit && node ? {editorMode:'edit',editorNodeId:node.id,editorParentId:'',editorSeed:null} : {}),
        ...(observation ? { detailNodeId: '', editorMode: 'add', editorParentId: branch,
            editorSeed: { templateId: 'custom', informationType: 'local_observation', knowledgeScope: 'specimen', status: 'draft' } } : {}) };
}

// Preserve fresh non-PIM profile fields and reject a detected competing PIM edit.
// This is a client-side conflict guard; the existing API is not an atomic revision store.
export function createCreatorPimSave({ context, profile, load = loadPlantProfile, save = savePlantProfile, onSaved = () => {} }) {
    let baseline = JSON.stringify([profile?.pim_document ?? null, profile?.pim_import_review ?? null]);
    return async (document, review) => {
        const fresh = await load(...context);
        if (JSON.stringify([fresh?.pim_document ?? null, fresh?.pim_import_review ?? null]) !== baseline)
            throw new Error('This plant’s knowledge changed elsewhere. Close and reopen knowledge before saving your changes.');
        const next = { ...fresh, spm_enabled: true, profile_enabled: true,
            pim_document: normalizePimDocument(document),
            ...(review ? { pim_import_review: review } : {}) };
        await save(...context, next);
        baseline = JSON.stringify([next.pim_document ?? null, next.pim_import_review ?? null]);
        onSaved(next);
        return next.pim_document;
    };
}

export function mountCreatorArKnowledge(root, { record, context, path = '', observation = false, edit = false, onClose = () => {}, onSaved = () => {}, persistence = {} }) {
    const document = creatorKnowledgeDocument(record);
    const specimenId = context.join('/');
    let state = creatorKnowledgeState(document, { path, observation, edit, state: record.arKnowledgeState || {} });
    if (observation) state.editorSeed.specimenId = specimenId;
    root.classList.add('creator-ar-knowledge-workspace');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `${document.identity.commonName || 'Plant'} knowledge`);
    root.innerHTML = `<header class="creator-ar-knowledge-header"><div><small>CREATOR · KNOWLEDGE IN PLACE</small><h2>${html(document.identity.commonName || record.marker.name)}</h2><p>${html(record.areaName || context[2])} · ${html(record.marker.id)}</p></div><button type="button" data-knowledge-close>Back to AR</button></header><nav class="creator-ar-knowledge-nav" aria-label="Knowledge workspace"><button type="button" data-knowledge-observation>Add observation</button></nav><p class="creator-ar-knowledge-message" role="status" data-knowledge-message></p><div class="creator-ar-knowledge-content" data-knowledge-mount></div>`;
    const message = root.querySelector('[data-knowledge-message]');
    const controller = mountPlantInformationWeb(root.querySelector('[data-knowledge-mount]'), {
        document, editable: true, embedded: true, showSearch: true, showIdentity: true, specimenId,
        importReview: record.plantProfile?.pim_import_review, initialState: state,
        onSaveDocument: createCreatorPimSave({context, profile: record.plantProfile, ...persistence, onSaved: profile => {
            record.plantProfile = profile; onSaved(profile); message.textContent = 'Knowledge saved. Publication remains a separate decision.';
        }})
    });
    const close = () => {
        if (controller.isSaving()) { message.textContent = 'Saving knowledge. Please wait before returning to AR.'; return false; }
        if (controller.getState().editorMode) { message.textContent = 'Save or cancel the open information editor before returning to AR.'; return false; }
        record.arKnowledgeState = controller.getState(); onClose(); return true;
    };
    const navigate = next => {
        if(controller.isSaving() || controller.getState().editorMode) {message.textContent='Save or cancel the open editor before changing topics.';return;}
        controller.setState(next); root.scrollTop=0;
    };
    root.querySelector('[data-knowledge-observation]').addEventListener('click',()=>navigate({detailNodeId:'',editorMode:'add',editorParentId:controller.getState().outlineBranchId || 'food-forest',editorSeed:{templateId:'custom',informationType:'local_observation',knowledgeScope:'specimen',specimenId,status:'draft'}}));
    root.querySelector('[data-knowledge-close]').addEventListener('click', close);
    const onKey = event => {
        if(event.defaultPrevented) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
        if (event.key !== 'Tab') return;
        const controls = [...root.querySelectorAll('button,input,textarea,select,a[href],summary,[tabindex="0"]')].filter(item => !item.disabled && item.getClientRects().length && !item.closest('[hidden]'));
        if (!controls.length) return;
        if (event.shiftKey && documentGlobal().activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
        else if (!event.shiftKey && documentGlobal().activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    root.addEventListener('keydown', onKey);
    root.querySelector('[data-knowledge-close]').focus({preventScroll:true});
    return { controller, close, destroy() { record.arKnowledgeState = controller.getState(); controller.destroy(); root.removeEventListener('keydown', onKey); root.replaceChildren(); } };
}
const documentGlobal = () => globalThis.document;
