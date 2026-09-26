import { canonicalMeshRef, meshRefKey } from './meshReferences.js';

export function createMeshCompositionState(){
    let state={activeRef:null,compositionRefs:[],mode:'idle',resolvedRelationshipId:null,resolvedVariantId:null,error:null};
    const listeners=new Set();
    const publish=()=>{const snapshot=api.get();listeners.forEach(listener=>listener(snapshot));return snapshot;};
    const api={
        get(){return {...state,compositionRefs:[...state.compositionRefs]};},
        subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
        setActiveRef(ref){state={...state,activeRef:ref?canonicalMeshRef(ref):null,error:null};return publish();},
        add(ref=state.activeRef){if(!ref)return api.get();const value=canonicalMeshRef(ref),key=meshRefKey(value);if(!state.compositionRefs.some(item=>meshRefKey(item)===key))state={...state,compositionRefs:[...state.compositionRefs,value],mode:'composing',resolvedRelationshipId:null,resolvedVariantId:null,error:null};return publish();},
        remove(ref){const key=meshRefKey(ref);const compositionRefs=state.compositionRefs.filter(item=>meshRefKey(item)!==key);state={...state,compositionRefs,mode:compositionRefs.length?'composing':'idle',resolvedRelationshipId:null,resolvedVariantId:null,error:null};return publish();},
        clear(){state={...state,compositionRefs:[],mode:'idle',resolvedRelationshipId:null,resolvedVariantId:null,error:null};return publish();},
        resolving(){state={...state,mode:'resolving',error:null};return publish();},
        display(result){state={...state,activeRef:result.derivedRef,mode:'displaying',resolvedRelationshipId:result.relationship.id,resolvedVariantId:result.variant.id,error:null};return publish();},
        fail(error){state={...state,mode:state.compositionRefs.length?'composing':'idle',error:String(error?.message || error)};return publish();}
    };
    return api;
}
