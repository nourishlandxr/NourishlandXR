import test from 'node:test';
import assert from 'node:assert/strict';
import {demoHardwareAccess} from '../app/services/demoHardwareAccess.js';

test('immersive demo needs a secure context and confirmed session support',async()=>{
    assert.equal(await demoHardwareAccess({secure:true,xr:undefined}),false);
    assert.equal(await demoHardwareAccess({secure:false,xr:{isSessionSupported:async()=>true}}),false);
    assert.equal(await demoHardwareAccess({secure:true,xr:{isSessionSupported:async()=>false}}),false);
    for(const supported of ['immersive-ar','immersive-vr'])assert.equal(await demoHardwareAccess({secure:true,xr:{isSessionSupported:async mode=>mode===supported}}),true);
    assert.equal(await demoHardwareAccess({secure:true,xr:{isSessionSupported:async mode=>{if(mode==='immersive-ar')throw Error('Unsupported mode');return true;}}}),true);
    assert.equal(await demoHardwareAccess({secure:true,xr:{isSessionSupported:async()=>{throw Error('Unavailable');}}}),false);
});
