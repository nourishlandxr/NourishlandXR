import { PIGEON_PEA_EXAMPLE } from './pigeonPeaExample.js';
import { PIGEON_PEA_PIM } from './pigeonPeaPim.js';

const clone = value => {
    if (value === undefined) return undefined;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
};

export const PIGEON_PEA_TEMPLATE_ID = 'pigeon-pea-reference';

// Keep the legacy profile fields populated as well as the canonical PIM
// document so older editors and the shared Web/AR renderers have a useful,
// editable template when a project is first opened.
export function createPigeonPeaTemplateProfile(plantId = PIGEON_PEA_PIM.plantId) {
    const document = clone(PIGEON_PEA_PIM);
    document.plantId = String(plantId || PIGEON_PEA_PIM.plantId);
    document.identity = { ...document.identity, plantId: document.plantId };
    return {
        common_name: PIGEON_PEA_EXAMPLE.commonName,
        scientific_name: PIGEON_PEA_EXAMPLE.scientificName,
        family: PIGEON_PEA_EXAMPLE.family,
        plant_type: PIGEON_PEA_EXAMPLE.plantType,
        overview: PIGEON_PEA_EXAMPLE.shortProfile,
        identification: 'Upright branching legume shrub with trifoliate leaves, yellow flowers and edible pods. Confirm identification locally before use.',
        edible_uses: 'Green peas and mature dried seeds are used as food. Mature dry peas should be cooked before eating.',
        propagation: 'Direct sowing is the primary reference method. Nursery sowing and careful seed saving can also be recorded.',
        growing_conditions: 'Warm conditions, full sun, suitable drainage and moisture during establishment. Local climate and season guide management.',
        notes: PIGEON_PEA_EXAMPLE.introduction,
        references: 'NourishlandXR reference template. Review, attribute and localise every claim before publication.',
        spm_enabled: true,
        profile_enabled: true,
        info_mesh_enabled: true,
        is_template: true,
        template_id: PIGEON_PEA_TEMPLATE_ID,
        pim_document: document
    };
}

