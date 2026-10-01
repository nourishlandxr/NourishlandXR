const PLANT_ILLUSTRATIONS = {
    'pigeon-pea': {
        plantName: 'Pigeon pea',
        roots: {
            'food-forest': { title: 'Food Forest', image: new URL('../assets/pimo-cell-illustrations/pigeon-pea-food-forest.jpg', import.meta.url).href, description: 'a branching pigeon-pea shrub in a layered planting' },
            uses: { title: 'Uses', image: new URL('../assets/pimo-cell-illustrations/pigeon-pea-uses.jpg', import.meta.url).href, description: 'pigeon-pea pods, seeds and useful plant material' },
            propagation: { title: 'Propagation', image: new URL('../assets/pimo-cell-illustrations/pigeon-pea-propagation.jpg', import.meta.url).href, description: 'pigeon-pea seeds and seedling establishment' },
            'scientific-information': { title: 'Scientific Information', image: new URL('../assets/pimo-cell-illustrations/pigeon-pea-scientific-information.jpg', import.meta.url).href, description: 'pigeon-pea leaves, flowers, pods and seeds' },
            'historical-data': { title: 'Historical Data', image: new URL('../assets/pimo-cell-illustrations/pigeon-pea-historical-data.jpg', import.meta.url).href, description: 'pigeon-pea botanical records and seed provenance' },
            cultivation: { title: 'Cultivation', image: new URL('../assets/pimo-cell-illustrations/pigeon-pea-cultivation.jpg', import.meta.url).href, description: 'pigeon-pea cultivation and pruning' }
        }
    },
    moringa: {
        plantName: 'Moringa',
        roots: {
            'food-forest': { title: 'Food Forest', image: new URL('../assets/pimo-cell-illustrations/moringa-food-forest.jpg', import.meta.url).href, description: 'a moringa tree in a layered planting' },
            uses: { title: 'Uses', image: new URL('../assets/pimo-cell-illustrations/moringa-uses.jpg', import.meta.url).href, description: 'moringa leaves, flowers, pods, seeds and garden material' },
            propagation: { title: 'Propagation', image: new URL('../assets/pimo-cell-illustrations/moringa-propagation.jpg', import.meta.url).href, description: 'moringa winged seeds, seedling and stem cutting' },
            'scientific-information': { title: 'Scientific Information', image: new URL('../assets/pimo-cell-illustrations/moringa-scientific-information.jpg', import.meta.url).href, description: 'moringa compound leaves, flowers, pod and winged seeds' },
            'historical-data': { title: 'Historical Data', image: new URL('../assets/pimo-cell-illustrations/moringa-historical-data.jpg', import.meta.url).href, description: 'moringa plant material and a field-record notebook' },
            cultivation: { title: 'Cultivation', image: new URL('../assets/pimo-cell-illustrations/moringa-cultivation.jpg', import.meta.url).href, description: 'moringa pruning, regrowth and surface mulch' }
        }
    }
};

export function attachPimCellIllustrations(document, plantKey) {
    const configuration = PLANT_ILLUSTRATIONS[plantKey];
    if (!configuration || !Array.isArray(document?.nodes)) return document;

    const byId = new Map(document.nodes.map(node => [node.id, node]));
    const rootFor = node => {
        let current = node;
        const visited = new Set();
        while (current && !visited.has(current.id)) {
            visited.add(current.id);
            if (!current.parentId) return current.id;
            current = byId.get(current.parentId);
        }
        return '';
    };

    return {
        ...document,
        nodes: document.nodes.map(node => {
            const root = configuration.roots[rootFor(node)];
            if (!root) return node;
            const mediaId = `nlxr-pimo-branch-art-${plantKey}-${rootFor(node)}`;
            const illustration = {
                id: mediaId,
                image: root.image,
                alt: `${node.title}. ${configuration.plantName}: ${root.description}.`,
                caption: `${root.title} · ${node.title}`,
                kind: 'illustration'
            };
            const media = (node.media || []).filter(item => item?.id !== mediaId);
            return { ...node, media: [...media, illustration] };
        })
    };
}
