import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeTicTacToe,ticWinner,ticReplyMove} from '../app/services/welcomeTicTacToe.js';
test('game enforces turns and occupied cells, wins and draws',()=>{
 const root=new THREE.Group(),game=createWelcomeTicTacToe(root);root.updateMatrixWorld(true);
 try{const piece=()=>game.pieces.find(p=>p.mark==='X' && p.cell===null);assert.equal(game.place(0,piece()),true);assert.equal(game.place(1,piece()),false);for(let i=0;i<12;i++)game.update(.06);assert.equal(game.snapshot().cells[4],'O');assert.equal(game.place(0,piece()),false);assert.equal(game.place(8,piece()),true);for(let i=0;i<12;i++)game.update(.06);assert.equal(game.snapshot().turn,'X');game.reset();assert.equal(game.snapshot().cells.filter(Boolean).length,0);
 assert.equal(ticWinner(['X','X','X',null,null,null,null,null,null]),'X');assert.equal(ticReplyMove(['O','O',null,'X','X',null,null,null,null]),2);assert.equal(ticReplyMove(['X','X',null,null,'O',null,null,null,null]),2);assert.equal(ticWinner(['X','O','X','X','O','O','O','X','X']),null);
 }finally{game.destroy();}
});
test('tracked pinch carries a piece, releases once into the board and recovers on tracking loss',()=>{
 const root=new THREE.Group(),game=createWelcomeTicTacToe(root),source={handedness:'left',hand:{}};root.position.set(1,.8,-2);root.rotation.y=.5;root.updateMatrixWorld(true);
 const piece=game.pieces[0],input={source,trigger:false,matrix:null};
 const move=(point,down)=>{root.updateMatrixWorld(true);input.matrix=new THREE.Matrix4().makeTranslation(...root.localToWorld(point.clone()).toArray()).elements;input.trigger=down;game.update(.05,[input]);};
 try{move(piece.home,false);move(piece.home,true);assert.equal(game.snapshot().held,1);move(new THREE.Vector3(-.135,.07,-.035),true);move(new THREE.Vector3(-.135,.07,-.035),false);assert.equal(game.snapshot().cells[0],'X');game.update(.05,[input]);assert.equal(game.snapshot().cells.filter(Boolean).length,1);
 for(let i=0;i<15;i++)game.update(.05,[]);move(game.pieces[1].home,false);move(game.pieces[1].home,true);assert.equal(game.snapshot().held,1);game.update(.05,[]);assert.equal(game.snapshot().held,0);assert.ok(game.pieces[1].mesh.position.distanceTo(game.pieces[1].home)<1e-6);
 }finally{game.destroy();}
});
test('rotating the board carries already placed pieces without changing cells',()=>{
 const root=new THREE.Group(),game=createWelcomeTicTacToe(root);root.updateMatrixWorld(true);try{game.place(0,game.pieces[0]);const before=game.pieces[0].mesh.getWorldPosition(new THREE.Vector3());game.board.rotation.y=Math.PI/2;root.updateMatrixWorld(true);const after=game.pieces[0].mesh.getWorldPosition(new THREE.Vector3());assert.ok(before.distanceTo(after)>.2);assert.equal(game.snapshot().cells[0],'X');assert.equal(game.pieces[0].mesh.parent,game.board);}finally{game.destroy();}
});
