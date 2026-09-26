const keys=sources=>new Set(sources.map(source=>source.ref.nodeId));
const has=(set,...ids)=>ids.every(id=>set.has(id));

export function createPlaceholderKnowledgeGenerator(){
    let callCount=0;
    return {
        get callCount(){return callCount;},
        generate({sources,contextSelector}){
            callCount+=1;
            const ids=keys(sources),contextual=contextSelector.mode==='contextual';
            if(has(ids,'pruning','lim-food-forest','lim-pin'))return {
                title:'Observing the Effects of Pruning',
                summary:'Exploring how pruning Pigeon Pea may influence the surrounding landscape and what changes can be observed over time.'
            };
            if(has(ids,'lim-food-forest','lim-pin'))return {
                title:'Reading Landscape Change',
                summary:'Exploring how observation can reveal changes within a living landscape.'
            };
            if(has(ids,'pruning','lim-food-forest'))return contextual ? {
                title:`Pruning as Biomass Cycling at ${contextSelector.scope.areaId}`,
                summary:`Exploring how pruning Pigeon Pea relates to biomass cycling in ${contextSelector.scope.projectId} · ${contextSelector.scope.areaId}.`
            } : {
                title:'Pruning as Biomass Cycling',
                summary:'Exploring how pruning Pigeon Pea relates to its role within a living landscape.'
            };
            if(sources.some(source=>source.title==='Pruning as Biomass Cycling') && ids.has('lim-wildlife-relationships'))return {
                title:'Biomass Cycling as Wildlife Habitat',
                summary:'Exploring how pruning-derived biomass may shape shelter, food and movement for wildlife within a living landscape.'
            };
            if(sources.some(source=>source.title==='Pruning as Biomass Cycling') && ids.has('lim-pin'))return {
                title:'Watch What Changes',
                summary:'After pruning, look at what changes around the plant. Notice regrowth, where cut material settles, ground coverage, decomposition and responses from neighbouring plants.'
            };
            const titles=sources.map(source=>source.title);
            return {title:`Connecting ${titles.join(' + ')}`,summary:`Exploring the relationship between: ${titles.join(', ')}.`};
        }
    };
}
