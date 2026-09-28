import test from 'node:test';
import assert from 'node:assert/strict';
import {WELCOME_ROOTS_SETTLED_MS,welcomeRootFrame,welcomeRootsAreGrowing,drawArWelcomeRoots} from '../app/services/arWelcomeRoots.js';
import {readFileSync} from 'node:fs';

const length=points=>points.slice(1).reduce((sum,point,index)=>sum+Math.hypot(point.x-points[index].x,point.y-points[index].y),0);
const inReadingArea=point=>((point.x-700)/430)**2+((point.y-550)/315)**2<1;

test('welcome roots extend continuously without changing their anchor points',()=>{
 const early=welcomeRootFrame(10000),later=welcomeRootFrame(10016),settled=welcomeRootFrame(WELCOME_ROOTS_SETTLED_MS);
 assert.equal(early.length,12);
 assert.ok(early.some(root=>root.points.length>1));
 assert.ok(early.some((root,index)=>length(later[index].points)>length(root.points)));
 for(let index=0;index<early.length;index++){
  if(early[index].points.length)assert.deepEqual(early[index].points[0],settled[index].points[0]);
  assert.ok(length(later[index].points)>=length(early[index].points));
 }
 assert.ok(settled.every(root=>root.progress===1));
});

test('visible roots begin developing on the first screen and remain undimmed on phones',()=>{
 const opening=welcomeRootFrame(12000);
 assert.ok(opening.filter(root=>root.progress>.25).length>=8);
 assert.ok(opening.some(root=>root.branches.some(branch=>branch.length>1)));
 const styles=readFileSync(new URL('../app/style.css',import.meta.url),'utf8');
 assert.match(styles,/\[data-lim-surface="true"\] \.tryit-live-welcome canvas \{ opacity:1; \}/);
});

test('roots and their smaller branches preserve a clear central reading area',()=>{
 const settled=welcomeRootFrame(WELCOME_ROOTS_SETTLED_MS);
 for(const root of settled){
  assert.ok(root.points.every(point=>Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.ok(root.points.every(point=>!inReadingArea(point)));
  for(const branch of root.branches)assert.ok(branch.every(point=>!inReadingArea(point)));
 }
});

test('reduced motion has a settled surface and no moving-tip animation',()=>{
 assert.deepEqual(welcomeRootFrame(0,true),welcomeRootFrame(100000,true));
 assert.equal(welcomeRootsAreGrowing(0,true),false);
 assert.equal(welcomeRootsAreGrowing(WELCOME_ROOTS_SETTLED_MS+1),false);
 let tipDots=0;
 const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},stroke(){},arc(){tipDots++;},fill(){}};
 drawArWelcomeRoots(ctx,0,true);
 assert.equal(tipDots,0);
});
