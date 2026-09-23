const template = (id, label, title, description, color, topics = []) => Object.freeze({
    id,
    label,
    title,
    description,
    color,
    topics: Object.freeze(topics.map(topic => Object.freeze({ ...topic })))
});

export const DEFAULT_SPATIAL_NOTE_TEMPLATE = 'observation';

export const SPATIAL_NOTE_TEMPLATES = Object.freeze([
    template(
        'welcome',
        'Welcome',
        'Welcome to my garden',
        'Pause here, look around and enjoy the living place that is growing around you.',
        '#58765f'
    ),
    template(
        'pollinators',
        'Pollinators & bees',
        'Pollinators at work',
        'Bees and other pollinators help flowers become fruit and seed while supporting the wider garden web.',
        '#667850',
        [
            { id: 'pollinator-benefit', title: 'Why they matter', body: 'Pollination supports fruit, seed and genetic diversity across the garden.' },
            { id: 'pollinator-habitat', title: 'Offer habitat', body: 'Grow flowers across seasons and leave safe nesting and water opportunities.' },
            { id: 'pollinator-care', title: 'Garden gently', body: 'Avoid spraying active flowers and observe which visitors use this place.' }
        ]
    ),
    template(
        'snake-warning',
        'Snake awareness',
        'Snake country · tread gently',
        'Snakes may be present. Stay on the path, give wildlife space and never reach where you cannot see.',
        '#765b45',
        [
            { id: 'snake-pause', title: 'Pause', body: 'Stop, stay calm and allow the animal a clear way to leave.' },
            { id: 'snake-distance', title: 'Keep distance', body: 'Do not approach, touch or attempt to move a snake.' },
            { id: 'snake-care', title: 'Look after others', body: 'Let nearby visitors know quietly and contact the site team when needed.' }
        ]
    ),
    template(
        'observation',
        'Observation',
        'A note from this place',
        'Record a small observation, seasonal change or detail worth noticing here.',
        '#506d68'
    )
]);

export function spatialNoteTemplate(value) {
    const id = typeof value === 'string'
        ? value
        : value?.appearance?.note_template || value?.note_template;
    return SPATIAL_NOTE_TEMPLATES.find(candidate => candidate.id === id)
        || SPATIAL_NOTE_TEMPLATES.find(candidate => candidate.id === DEFAULT_SPATIAL_NOTE_TEMPLATE);
}

export function spatialNoteTemplateOptions(selected = DEFAULT_SPATIAL_NOTE_TEMPLATE) {
    return SPATIAL_NOTE_TEMPLATES.map(item => ({ ...item, selected: item.id === selected }));
}

export function applySpatialNoteTemplate(marker, templateId, { preserveCustomText = false } = {}) {
    const selected = spatialNoteTemplate(templateId);
    const appearance = marker?.appearance || {};
    const previousLive = appearance.live_note || {};
    return {
        ...marker,
        name: preserveCustomText && String(marker?.name || '').trim() ? marker.name : selected.title,
        description: preserveCustomText && String(marker?.description || marker?.notes || '').trim()
            ? marker.description || marker.notes
            : selected.description,
        notes: preserveCustomText && String(marker?.notes || marker?.description || '').trim()
            ? marker.notes || marker.description
            : selected.description,
        appearance: {
            ...appearance,
            note_template: selected.id,
            color: selected.color,
            opacity: Math.min(.78, Math.max(.38, Number(appearance.opacity) || .64)),
            surface: 'outline',
            live_note: {
                ...previousLive,
                enabled: selected.topics.length > 0,
                topics: selected.topics.map(topic => ({ ...topic }))
            }
        }
    };
}
