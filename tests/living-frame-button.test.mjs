import test from 'node:test';
import assert from 'node:assert/strict';
import {drawLivingFrameButton,applyLivingFrameButtonSampling} from '../app/services/livingFrameButton.js';

test('button uses two filled edges and no stroke or text blur',()=>{
    const calls=[];
    const ctx={createLinearGradient:()=>({addColorStop(){}}),clearRect:(...a)=>calls.push(['clear',...a]),save(){},restore(){},scale:(...a)=>calls.push(['scale',...a]),beginPath(){},roundRect:(...a)=>calls.push(['rect',...a]),fill:()=>calls.push(['fill']),fillText:(...a)=>calls.push(['text',...a]),measureText:text=>({width:text.length*40})};
    drawLivingFrameButton(ctx,'Start the demo');
    assert.equal(ctx.shadowBlur,0);assert.equal(ctx.shadowColor,'transparent');
    assert.equal(calls.filter(call=>call[0]==='fill').length,2);
    assert.deepEqual(calls[0],['clear',0,0,2048,1024]);
    assert.deepEqual(calls.find(call=>call[0]==='text'),['text','Start the demo',450,180,780]);
    assert.equal(ctx.fillStyle,'#f5faef');
});

test('button anisotropy is capped and safely optional',()=>{
    const extension={MAX_TEXTURE_MAX_ANISOTROPY_EXT:1,TEXTURE_MAX_ANISOTROPY_EXT:2},calls=[];
    const gl={TEXTURE_2D:3,getExtension:()=>extension,getParameter:()=>16,texParameterf:(...args)=>calls.push(args)};
    applyLivingFrameButtonSampling(gl);assert.deepEqual(calls,[[3,2,8]]);
    gl.getParameter=()=>4;applyLivingFrameButtonSampling(gl);assert.deepEqual(calls[1],[3,2,4]);
    gl.getExtension=()=>null;applyLivingFrameButtonSampling(gl);assert.equal(calls.length,2);
});
