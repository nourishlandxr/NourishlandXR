const placementCopy=Object.freeze([
    'Place the first Totem at the entrance. It will give visitors a starting point to explore this place.',
    'An entrance and starting point has been added. Visitors can begin here and follow the connected Totems through the landscape.',
    'A checkpoint with information about this Area has been added. Its plant Orbs help visitors discover what grows here and how the plants connect.',
    'A checkpoint has been added at the swale entrance. Visitors can follow the route to learn about water, planting and the work taking place in this Area.'
]);
export const livingMapPlacementCopy=count=>placementCopy[Math.max(0,Math.min(3,count))];
export function resetDemoPlantForMap(record){
    if(record.demoType!=='plant')return false;
    record.demoExpanded=false;record.demoActiveBranch='';record.demoSelectedNodeId='';
    record.demoExpandedNodeIds=[];record.demoExpandedBranches=[];record.pimClosingNodePaths=[];
    record.pimBloomPath='';record.pimBloomStarted=0;record.pimPressPath='';record.pimPressProgress=0;
    record.informationPose=null;record.informationPosition=null;
    delete record.knowledgeExplorer;delete record.explorerMolecule;
    return true;
}
