import * as sdk from '../../iwsdk/uiSdk.js';
import source from '../../iwsdk/public/ui/tutorial-wrist.uikitml?raw';
import {createTutorialUIOwner} from './iwsdkTutorialUI.js';

export async function createNlxrTutorialUI(runtime,options){
    const id='nlxr-tutorial-wrist';
    sdk.AssetManager.registerManifest({[id]:{type:sdk.AssetType.UIKitML,url:'data:text/plain;charset=utf-8,'+encodeURIComponent(source)}});
    const panel=await sdk.loadUIKitMLAsset(id,{kit:'horizon'});
    return createTutorialUIOwner(runtime,sdk,panel,options);
}
