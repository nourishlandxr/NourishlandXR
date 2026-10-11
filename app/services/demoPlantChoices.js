import {DEMO_NATIVE_PLANTS,chooseDemoNativePlant} from './demoNativePlants.js';
import {demoNeighbourPim} from './demoNeighbourPim.js';
import {FRUIT_WINDOW_LIBRARY} from './fruitWindowInteraction.js';
import {resolvePlantPim} from './pimLegacyAdapter.js';
import {pimToArKnowledge} from './pimModel.js';

const fruit=(id,name,colour,symbol)=>{const entry=FRUIT_WINDOW_LIBRARY.find(p=>p.id===id);return {id,name,colour,symbol,scientific:entry.scientific,image:entry.image};};
export const DEMO_PLANT_CHOICES=Object.freeze([
 fruit('carambola','Carambola','#e5ba64','✦'),
 {id:'vetiver',name:'Vetiver grass',colour:'#839c76',symbol:'♧'},
 fruit('african_peach','African Peach','#db8969','●'),
 fruit('mamey_sapote','Mamey Sapote','#c590a5','◒'),
 ...DEMO_NATIVE_PLANTS.map(p=>({...p,symbol:p.id==='blue-quandong'?'●':p.id==='finger-lime'?'◐':'❧'}))
]);
export function chooseDemoPlant(record,id){
 if(DEMO_NATIVE_PLANTS.some(p=>p.id===id))return chooseDemoNativePlant(record,id);
 const choice=DEMO_PLANT_CHOICES.find(p=>p.id===id);if(!choice || record?.tutorialStage!=='plant2')return false;
 const profile=id==='vetiver'?{common_name:choice.name,pim:demoNeighbourPim('vetiver')}:{common_name:choice.name,scientific_name:choice.scientific,pim:{schemaVersion:1,plantId:id,identity:{commonName:choice.name,scientificName:choice.scientific,image:choice.image,identityStatement:'A sample plant to explore through observation.'},sources:[],metadata:{demonstrationProfile:true},nodes:[
 {id:'observe',parentId:null,title:'Look closely',body:'Look at the leaves, fruit and growth form. What do you notice?',informationType:'activity',evidenceStatus:'local_observation',status:'published'},
 {id:'place',parentId:null,title:'Explore its place',body:'Imagine this plant in a real garden. What would you want to learn before choosing its position?',informationType:'activity',evidenceStatus:'local_observation',status:'published'}]}};
 Object.assign(record,{name:choice.name,demoPlantPreset:id,demoKnowledgeProfile:profile,demoKnowledgeProjection:pimToArKnowledge(resolvePlantPim(profile)),demoNativeChoice:id,demoNativeChoicePending:false,demoOrbColor:choice.colour,demoExpanded:false,demoInteractive:true,demoAlive:true,awaitingProfileReveal:true});return true;
}
export function demoPlantOrbColor(record){
 const chosen=record.demoOrbColor || ({pigeonpea:'#76b692','pigeon-pea':'#76b692',vetiver:'#839c76',acacia:'#d2b36d',jackfruit:'#b7a56d',lychee:'#c58c9b'})[record.demoPlantPreset] || ['#83b7ac','#c69b84','#9d9bbd','#b1bc7d'][Math.abs(String(record.id).split('').reduce((n,c)=>n+c.charCodeAt(0),0))%4];
 return [1,3,5].map(i=>parseInt(chosen.slice(i,i+2),16)/255);
}
export function livingFramePlantButtons(){return DEMO_PLANT_CHOICES.map((p,i)=>({...p,x:300+(i%2)*410,y:460+Math.floor(i/2)*88,width:380,height:72}));}
const plantIcons=new Map();
export function drawLivingFramePlantChoices(ctx,onReady=()=>{}){
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f3faf5';ctx.font='500 54px Manrope, sans-serif';ctx.fillText('Choose a plant',700,352);
 ctx.font='500 25px Manrope, sans-serif';ctx.fillStyle='#c9dbd0';ctx.fillText('Give your Orb its own living story',700,412);
 for(const b of livingFramePlantButtons()){
  ctx.fillStyle='rgba(15,36,29,.88)';ctx.beginPath();ctx.roundRect(b.x,b.y,b.width,b.height,22);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=b.colour;ctx.stroke();
  if(b.image && !plantIcons.has(b.id)){const image=new Image();plantIcons.set(b.id,image);image.onload=onReady;image.src=b.image;}
  const icon=plantIcons.get(b.id);if(icon?.complete && icon.naturalWidth){ctx.save();ctx.beginPath();ctx.roundRect(b.x+10,b.y+10,52,52,14);ctx.clip();const side=Math.min(icon.naturalWidth,icon.naturalHeight);ctx.drawImage(icon,(icon.naturalWidth-side)/2,(icon.naturalHeight-side)/2,side,side,b.x+10,b.y+10,52,52);ctx.restore();}
  else if(b.id==='vetiver'){ctx.strokeStyle=b.colour;ctx.lineWidth=2.5;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(b.x+36,b.y+58);ctx.quadraticCurveTo(b.x+36+i*3,b.y+28,b.x+36+i*6,b.y+14+Math.abs(i)*5);ctx.stroke();}}
  else {ctx.fillStyle=b.colour;ctx.font='600 30px sans-serif';ctx.fillText(b.symbol,b.x+35,b.y+36);}ctx.fillStyle='#ffffff';ctx.font='500 27px Manrope, sans-serif';ctx.fillText(b.name,b.x+b.width/2+16,b.y+36,b.width-86);
 }ctx.restore();
}
