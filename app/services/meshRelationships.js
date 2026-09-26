import { canonicalMeshRef, derivedMeshRef, meshRefKey } from './meshReferences.js';

const deepFreeze=value=>{if(!value || typeof value!=='object' || Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);};
const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:value && typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`:JSON.stringify(value);
const bytesToHex=bytes=>[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
const SHA256_K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function fallbackSha256(value){
    const bytes=[...new TextEncoder().encode(String(value))],bitLength=bytes.length*8;
    bytes.push(0x80);while(bytes.length%64!==56)bytes.push(0);
    for(let shift=56;shift>=0;shift-=8)bytes.push(Math.floor(bitLength/2**shift)&255);
    const hash=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],words=new Uint32Array(64);
    const rotate=(word,bits)=>(word>>>bits)|(word<<(32-bits));
    for(let offset=0;offset<bytes.length;offset+=64){
        for(let i=0;i<16;i++)words[i]=(bytes[offset+i*4]<<24)|(bytes[offset+i*4+1]<<16)|(bytes[offset+i*4+2]<<8)|bytes[offset+i*4+3];
        for(let i=16;i<64;i++){const a=words[i-15],b=words[i-2],s0=rotate(a,7)^rotate(a,18)^(a>>>3),s1=rotate(b,17)^rotate(b,19)^(b>>>10);words[i]=(words[i-16]+s0+words[i-7]+s1)>>>0;}
        let [a,b,c,d,e,f,g,h]=hash;
        for(let i=0;i<64;i++){const s1=rotate(e,6)^rotate(e,11)^rotate(e,25),choice=(e&f)^(~e&g),t1=(h+s1+choice+SHA256_K[i]+words[i])>>>0,s0=rotate(a,2)^rotate(a,13)^rotate(a,22),majority=(a&b)^(a&c)^(b&c),t2=(s0+majority)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
        [a,b,c,d,e,f,g,h].forEach((word,index)=>hash[index]=(hash[index]+word)>>>0);
    }
    return hash.map(word=>word.toString(16).padStart(8,'0')).join('');
}

export async function meshHash(value){
    if(!globalThis.crypto?.subtle)return fallbackSha256(value);
    return bytesToHex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)))));
}

export function canonicalMeshContext(input={mode:'general'}){
    if(!input || input.mode==='general')return deepFreeze({mode:'general'});
    if(input.mode!=='contextual')throw new Error(`Unsupported mesh context mode: ${input.mode}.`);
    const projectId=String(input.scope?.projectId || '').trim(),areaId=String(input.scope?.areaId || '').trim();
    if(!projectId || !areaId)throw new Error('Contextual mesh context requires projectId and areaId.');
    return deepFreeze({mode:'contextual',scope:{projectId,areaId},material:{
        goalIds:[...new Set(input.material?.goalIds || [])].map(String).sort(),
        observationRefs:[...new Set(input.material?.observationRefs || [])].map(String).sort()
    }});
}

function validateDerivedGraph(sources,repository){
    const visiting=new Set(),visited=new Set();
    function visit(node){
        if(visiting.has(node.id))throw new Error(`Circular derived dependency detected at ${node.id}.`);
        if(visited.has(node.id))return;
        visiting.add(node.id);
        for(const sourceRef of node.provenance?.sourceRefs || [])if(sourceRef.kind==='derived'){
            const dependency=repository.getDerivedNode(sourceRef.nodeId);
            if(!dependency)throw new Error(`Unresolved derived dependency: ${sourceRef.nodeId}.`);
            visit(dependency);
        }
        visiting.delete(node.id);visited.add(node.id);
    }
    sources.filter(source=>source.derivedNode).forEach(source=>visit(source.derivedNode));
}

export function createMeshRelationshipService({repository,resolver,generator,now=()=>new Date().toISOString()}={}){
    if(!repository || !resolver || !generator)throw new Error('Mesh repository, resolver and generator are required.');
    async function resolve(inputRefs,{context={mode:'general'}}={}){
        const unique=new Map();
        for(const input of inputRefs || []){const ref=canonicalMeshRef(input);unique.set(meshRefKey(ref),ref);}
        if(unique.size<2)throw new Error('A mesh relationship requires at least two unique sources.');
        const sourceKeys=[...unique.keys()].sort(),sources=sourceKeys.map(key=>resolver.resolve(unique.get(key)));
        validateDerivedGraph(sources,repository);
        const depth=1+Math.max(0,...sources.map(source=>source.derivedNode?.provenance?.depth || 0));
        if(depth>3)throw new Error('Derived knowledge depth cannot exceed 3 generations.');
        const signature=await meshHash(stable({schemaVersion:1,sources:sourceKeys}));
        const relationshipId=`mesh-rel-${signature.slice(0,24)}`;
        const relationship=repository.getRelationshipBySignature(signature) || repository.putRelationship(deepFreeze({schemaVersion:1,id:relationshipId,signature,
            sources:sourceKeys.map(key=>unique.get(key)),origin:'user_composed',status:'active',createdAt:now()}));
        const contextSelector=canonicalMeshContext(context),contextFingerprint=await meshHash(stable(contextSelector));
        const variantId=`mesh-var-${(await meshHash(`${relationship.id}:${contextFingerprint}`)).slice(0,24)}`;
        const inputFingerprint=await meshHash(stable(sources.map(source=>({key:source.key,fingerprint:source.fingerprint}))));
        let variant=repository.getVariantFor(relationship.id,contextFingerprint);
        if(variant?.currentDerivedNodeId && variant.inputFingerprint===inputFingerprint){
            const cached=repository.getDerivedNode(variant.currentDerivedNodeId);
            if(cached)return {relationship,variant,derivedNode:cached,derivedRef:derivedMeshRef(cached.id),cached:true};
        }
        variant ||= repository.putVariant(deepFreeze({schemaVersion:1,id:variantId,relationshipId:relationship.id,contextFingerprint,contextSelector,inputFingerprint,currentDerivedNodeId:null,status:'empty'}));
        try{
            const generated=generator.generate({sources,contextSelector});
            const derivedId=`mesh-derived-${(await meshHash(`${variant.id}:${inputFingerprint}`)).slice(0,24)}`;
            const sourceRefs=relationship.sources.map(ref=>canonicalMeshRef(ref));
            const derivedNode=repository.putDerivedNode(deepFreeze({schemaVersion:1,id:derivedId,lineageId:variant.id,revision:1,relationshipId:relationship.id,variantId:variant.id,
                title:generated.title,summary:generated.summary,insights:[],observations:[],relatedRefs:sourceRefs,state:'current',
                provenance:{generator:'stage3-placeholder',generatedAt:now(),sourceRefs,sourceKeys,contextSelector,depth}}));
            variant=deepFreeze({...variant,inputFingerprint,currentDerivedNodeId:derivedNode.id,status:'ready'});
            repository.putVariant(variant);
            return {relationship,variant,derivedNode,derivedRef:derivedMeshRef(derivedNode.id),cached:false};
        }catch(error){
            repository.putVariant(deepFreeze({...variant,status:'failed'}));
            throw error;
        }
    }
    return {resolve};
}
