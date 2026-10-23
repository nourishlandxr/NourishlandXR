import fs from 'node:fs';import crypto from 'node:crypto';
import {routingBlock} from './canonical-pages.mjs';
export const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function writeRoutingPlan(release,version){
 const block=Buffer.from(routingBlock()),merge=fs.readFileSync('root-site/tools/merge-route-config.py');
 fs.writeFileSync(release+'/routing-block.conf',block);fs.writeFileSync(release+'/merge-route-config.py',merge);
 return {kind:'canonical-route-consolidation',version,blockSha256:hash(block),mergerSha256:hash(merge),preserveWordPressData:true,preserveApi:true};
}
export function verifyRoutingPlan(root,manifest){
 if(!manifest.routingChanged){if(manifest.routing)throw Error('Unexpected routing plan');return;}
 const plan=manifest.routing;
 if(plan?.kind!=='canonical-route-consolidation'||plan.version!==manifest.version||!plan.preserveWordPressData||!plan.preserveApi)throw Error('Invalid routing plan');
 if(hash(fs.readFileSync(root+'/routing-block.conf'))!==plan.blockSha256||hash(fs.readFileSync(root+'/merge-route-config.py'))!==plan.mergerSha256)throw Error('Routing control hash mismatch');
 if(fs.readFileSync(root+'/routing-block.conf','utf8')!==routingBlock())throw Error('Routing block differs from the reviewed canonical rules');
 if(!fs.readFileSync(root+'/merge-route-config.py').equals(fs.readFileSync('root-site/tools/merge-route-config.py')))throw Error('Routing merger differs from reviewed source');
}
