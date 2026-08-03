const compassEntries = [
    {
        id: 'food-forest',
        title: 'Food Forest',
        direction: 'top',
        compassGroup: 'relationship',
        knowledgeMode: 'relationship',
        knowledgeModes: ['relationship'],
        question: 'Where does this plant fit into the broader living system?',
        color: '#2f7d4a',
        order: 0
    },
    {
        id: 'uses',
        title: 'Uses',
        direction: 'upper-left',
        compassGroup: 'agency',
        knowledgeMode: 'agency',
        knowledgeModes: ['agency'],
        question: 'What can people do, make or participate in with this plant?',
        color: '#a96400',
        order: 1
    },
    {
        id: 'propagation',
        title: 'Propagation',
        direction: 'lower-left',
        compassGroup: 'agency',
        knowledgeMode: 'agency',
        knowledgeModes: ['agency', 'process'],
        question: 'How can people create new plants?',
        color: '#087f8c',
        order: 2
    },
    {
        id: 'scientific-information',
        title: 'Scientific Information',
        direction: 'upper-right',
        compassGroup: 'certainty',
        knowledgeMode: 'certainty',
        knowledgeModes: ['certainty'],
        question: 'What is scientifically established about this plant?',
        color: '#2563a6',
        order: 3
    },
    {
        id: 'historical-data',
        title: 'Historical Data',
        direction: 'lower-right',
        compassGroup: 'certainty',
        knowledgeMode: 'certainty',
        knowledgeModes: ['certainty'],
        depthMode: 'historical',
        question: 'What has been documented about this plant through time?',
        color: '#7048a8',
        order: 4
    },
    {
        id: 'cultivation',
        title: 'Cultivation',
        direction: 'bottom',
        compassGroup: 'process',
        knowledgeMode: 'process',
        knowledgeModes: ['process'],
        question: 'How does this plant grow, and how can people responsibly support it?',
        color: '#b85c18',
        order: 5
    }
];

function freezeEntry(entry) {
    return Object.freeze({
        ...entry,
        mode: entry.knowledgeMode,
        modes: Object.freeze([...entry.knowledgeModes]),
        colour: entry.color,
        knowledgeModes: Object.freeze([...entry.knowledgeModes])
    });
}

// This is the single directional contract for every renderer. Web may reflow
// it into a vertical mobile explorer and AR may project it into a honeycomb,
// but neither renderer is allowed to redefine the categories or directions.
export const PIM_COMPASS = Object.freeze(compassEntries.map(freezeEntry));

export const PIM_COMPASS_BY_ID = Object.freeze(Object.fromEntries(
    PIM_COMPASS.map(entry => [entry.id, entry])
));
