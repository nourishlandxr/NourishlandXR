export function createMeshRepository() {
    const relationships=new Map(),variants=new Map(),derivedNodes=new Map();
    return {
        getRelationship(id){return relationships.get(id) || null;},
        getRelationshipBySignature(signature){return [...relationships.values()].find(item=>item.signature===signature) || null;},
        putRelationship(value){if(!relationships.has(value.id))relationships.set(value.id,value);return relationships.get(value.id);},
        getVariant(id){return variants.get(id) || null;},
        getVariantFor(relationshipId,contextFingerprint){return [...variants.values()].find(item=>item.relationshipId===relationshipId && item.contextFingerprint===contextFingerprint) || null;},
        putVariant(value){variants.set(value.id,value);return value;},
        getDerivedNode(id){return derivedNodes.get(id) || null;},
        putDerivedNode(value){if(!derivedNodes.has(value.id))derivedNodes.set(value.id,value);return derivedNodes.get(value.id);},
        listRelationships(){return [...relationships.values()];},
        listVariants(){return [...variants.values()];},
        listDerivedNodes(){return [...derivedNodes.values()];}
    };
}
