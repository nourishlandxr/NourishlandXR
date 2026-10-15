import * as sdk from '../../iwsdk/uiSdk.js';
import sourceV1 from '../../iwsdk/public/ui/tutorial-wrist.uikitml?raw';
import sourceV2 from '../../iwsdk/public/ui/tutorial-wrist-v2.uikitml?raw';
import {createTutorialUIOwner} from './iwsdkTutorialUI.js';

export async function createNlxrTutorialUI(runtime,options){
    const v2=options?.variant==='wrist-v2',id=v2?'nlxr-tutorial-wrist-v2':'nlxr-tutorial-wrist';
    sdk.AssetManager.registerManifest({[id]:{type:sdk.AssetType.UIKitML,url:'data:text/plain;charset=utf-8,'+encodeURIComponent(v2?sourceV2:sourceV1)}});
    const panel=await sdk.loadUIKitMLAsset(id,{kit:'horizon'});
    return createTutorialUIOwner(runtime,sdk,panel,options);
}
