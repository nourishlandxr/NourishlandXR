import * as THREE from '../vendor/three.module.min.js';
import {createForestSculpture} from './foodForestSculpture.js';

export const FOOD_FOREST_FOUNDATIONS=Object.freeze([
    {id:'edge-control',title:'Edge control',role:'Hold a boundary',examples:['Vetiver','Lemongrass','Low living edge'],note:'A long, low piece that reads as a planted boundary, not another tree.'},
    {id:'nitrogen-fixer',title:'Legumes & nitrogen fixers',role:'Feed the soil system',examples:['Pigeon pea','Wattle','Ice-cream bean','Gliricidia'],note:'Compound leaves, pods and varied shrub-to-tree forms; the role stays a hypothesis until locally checked.'},
    {id:'perennial-food',title:'Perennial greens & tubers',role:'Return edible harvests',examples:['Longevity spinach','Chaya','Ginger','Turmeric','Arrowroot'],note:'Above-ground leafy forms pair with visible rhizome or tuber cues below the board.'},
    {id:'fruit-and-shrub',title:'Fruit trees & edible shrubs',role:'Anchor the food forest',examples:['Mango','Avocado','Mulberry','Guava','Jaboticaba'],note:'Tree crowns and multi-stem berry shrubs have different silhouettes and footprints.'},
    {id:'herb-spice',title:'Herbs & spices',role:'Aromatic small-scale plants',examples:['Garlic chives','Galangal','Lemongrass','Allspice','Cinnamon'],note:'Distinct leaf habits and spice harvest cues make small pieces easy to recognize.'}
]);

export const FOOD_FOREST_FOUNDATION_VARIANTS=Object.freeze({
    'edge-control':['Upright vetiver fans','Lemongrass clumps','Low hedge ribbon','Creeping edge mat'],
    'nitrogen-fixer':['Pigeon pea shrub','Open wattle crown','Pod-bearing canopy','Coppice stool'],
    'perennial-food':['Broadleaf rosette','Upright leafy clump','Ginger rhizome','Arrowroot tuber crown'],
    'fruit-and-shrub':['Rounded fruit tree','Open orchard tree','Berry shrub','Multi-stem fruit shrub'],
    'herb-spice':['Culinary leaf rosette','Aromatic grass fan','Golden rhizome','Flowering spice shrub']
});

const COLORS={leaf:'#5b8252',leafLight:'#a7b779',leafDark:'#365842',bark:'#805b40',wood:'#b68c5e',fruit:'#d69448',berry:'#8d5975',pod:'#8e9a58',soil:'#786247',soilLight:'#a18a66',root:'#c9a86e',glass:'#a6cabb'};

function roundedBase(kit,planted,wide=1){
    const y=planted?.018:.08;
    kit.part(new THREE.CylinderGeometry(.205,.224,.075,24),COLORS.soil,0,y-.01,0,wide,1,.88);
    kit.part(new THREE.CylinderGeometry(.205,.205,.012,24),COLORS.soilLight,0,y+.03,0,wide,1,.88);
    kit.part(new THREE.TorusGeometry(.203,.004,4,28),COLORS.glass,0,y+.037,0,wide,1,.88).rotation.x=Math.PI/2;
    return y+.037;
}

function buildFoundation(kit,id,variant,ground){
    const {branch,leaf,leafCell,fruit,blossom,part,random}=kit;
    const stem=(pts,r=.018,color=COLORS.bark)=>branch(pts,r,color);
    const leafFan=(x,z,n=5,len=.2,w=.032,height=.12,baseColor=COLORS.leaf)=>{
        for(let i=0;i<n;i++){const a=i/n*Math.PI*2+random()*.2;leaf([x,ground,z],[x+Math.sin(a)*len,ground+height+random()*.045,z+Math.cos(a)*len],w,i%3===0?COLORS.leafLight:baseColor);}
    };
    const compound=(x,y,z,spread=.18)=>{
        const ends=[];for(let side of[-1,1])for(let i=0;i<2;i++){const px=x+side*spread*(.35+i*.35),py=y+.04+Math.sin(i/2*Math.PI)*.04,pz=z+(i%2?-.018:.018);leaf([x,y,z],[px,py,pz],.026,i===1?COLORS.leafLight:COLORS.leaf);ends.push([px,py,pz]);}
        stem([[x,y-.08,z],[x,y,z],ends[2]],.006,COLORS.wood);
    };

    if(id==='edge-control'){
        if(variant===0||variant===1){
            const clumps=variant===0?3:2;
            for(let c=0;c<clumps;c++){const x=(c-(clumps-1)/2)*.13;for(let i=0;i<(variant===0?5:7);i++){const a=(i/(variant===0?5:7))*Math.PI*2,reach=variant===0?.085:.115;leaf([x,ground,0],[x+Math.sin(a)*reach,ground+.16+(i%3)*.045,Math.cos(a)*reach],variant===0?.016:.021,i%3?COLORS.leaf:COLORS.leafLight);}}
        }else if(variant===2){
            for(let i=0;i<6;i++){const x=(i-2.5)*.06,h=.20+(i%3)*.025;stem([[x,ground,0],[x+.012,h*.55,.015],[x,h,.01]],.009);compound(x,h,.01,.085);}
            for(let i=0;i<4;i++)fruit((i-1.5)*.08,.19,.02,.018,.022,.018,COLORS.berry);
        }else{
            for(let i=0;i<8;i++){const x=(i-3.5)*.045,z=(i%2-.5)*.09;leafCell([x,ground,z],[x+.018,ground+.045,z+.045],.045,i%2?COLORS.leaf:COLORS.leafLight);}
        }
        for(let x of[-.18,0,.18])stem([[x,ground-.005,0],[x,ground-.045,.015],[x+.02,ground-.09,.025]],.005,COLORS.root);
        return;
    }

    if(id==='nitrogen-fixer'){
        const height=[.32,.49,.62,.38][variant],trunks=variant===3?3:variant===0?2:1;
        for(let t=0;t<trunks;t++){
            const x=trunks===1?0:(t-(trunks-1)/2)*.075,z=(t%2)*.025;
            stem([[x,ground,z],[x-.01,height*.47,z],[x,height*.78,z]],variant===1?.018:.013);
            const spread=variant===1?.2:variant===2?.23:.14;
            for(let j=0;j<(variant===2?4:2);j++){
                const yy=height*(.52+j*.14),side=(j%2?1:-1),tx=x+side*(.08+j*.025),tz=z+(j%2?.05:-.04);
                stem([[x,yy-.03,z],[tx*.55+x*.45,yy+.02,tz*.5],[tx,yy+.045,tz]],.009,COLORS.wood);
                compound(tx,yy+.045,tz,spread*.45);
                if((variant===0||variant===2||variant===3)&&j===1)for(let k=0;k<2;k++){
                    const px=tx+(k?-.035:.035);stem([[tx,yy+.015,tz],[px,yy-.035,tz+.015]],.008,COLORS.pod);
                    fruit(px,yy-.06,tz+.015,.014,.055,.012,COLORS.pod,1);
                }
            }
        }
        if(variant===1||variant===2){for(let i=0;i<4;i++){const a=i*Math.PI/2;stem([[0,ground,0],[Math.sin(a)*.08,ground-.045,Math.cos(a)*.08],[Math.sin(a)*.15,ground-.085,Math.cos(a)*.15]],.005,COLORS.root);}}
        return;
    }

    if(id==='perennial-food'){
        if(variant===0||variant===1){
            const n=variant===0?9:7;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,len=variant===0?.21:.15,h=variant===0?.19:.29;leaf([0,ground,0],[Math.sin(a)*len,ground+h+(i%3)*.025,Math.cos(a)*len],variant===0?.05:.035,i%3?COLORS.leaf:COLORS.leafLight);}
            if(variant===0)for(let i=0;i<3;i++)blossom([(i-1)*.06,ground+.2,.02],.025,COLORS.leafLight,COLORS.fruit);
        }else{
            for(let i=0;i<7;i++){const a=i/7*Math.PI*2;leaf([0,ground,0],[Math.sin(a)*.13,ground+.31+(i%2)*.035,Math.cos(a)*.13],.026,i%2?COLORS.leaf:COLORS.leafLight);}
            // Rhizomes and tubers are deliberately visible below the soil-glass lip.
            for(let i=0;i<4;i++){const x=(i-1.5)*.065,y=ground-.07-(i%2)*.02,z=.025;stem([[0,ground-.012,0],[x*.55,ground-.035,z],[x,y,z]],.009,COLORS.root);fruit(x,y,z,.031,.056,.026,variant===2?'#c59154':'#bb9564',2);}
            part(new THREE.TorusGeometry(.135,.006,4,24),COLORS.glass,0,ground-.015,0,1,.7,.8).rotation.x=Math.PI/2;
        }
        return;
    }

    if(id==='fruit-and-shrub'){
        if(variant<2){
            const tall=variant===1,height=tall?.67:.49;stem([[0,ground,0],[.015,height*.48,0],[0,height,0]],.035);
            const limbs=tall?4:3;for(let i=0;i<limbs;i++){const a=i/limbs*Math.PI*2,x=Math.sin(a)*.21,z=Math.cos(a)*.18,y=height*(.76+(i%2)*.16);stem([[0,height*.47,0],[x*.55,y*.84,z*.55],[x,y,z]],.017);leafCell([x,y-.045,z],[x+.025,y+.14,z+.025],.11,i%2?COLORS.leaf:COLORS.leafLight);fruit(x*.86,y-.06,z,.036,.042,.034,i%2?COLORS.fruit:'#ce7250',i%2);}
            leafCell([0,height,0],[0,height+.17,0],.14,COLORS.leaf);
        }else{
            const stems=variant===2?5:4;for(let i=0;i<stems;i++){const a=i/stems*Math.PI*2,x=Math.sin(a)*.115,z=Math.cos(a)*.1,h=(variant===2?.31:.43)+(i%3)*.035;stem([[0,ground,0],[x*.4,h*.5,z*.4],[x,h,z]],.012);leafFan(x,z,4,.07,.022,.045);for(let j=0;j<2;j++)fruit(x+(j-.5)*.035,h-.035,z+.02,.019,.022,.018,j%2?COLORS.fruit:COLORS.berry);}
        }
        return;
    }

    if(id==='herb-spice'){
        if(variant===0){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;leaf([0,ground,0],[Math.sin(a)*.14,ground+.12+(i%3)*.025,Math.cos(a)*.14],.035,i%2?COLORS.leaf:COLORS.leafLight);}}
        if(variant===1){for(let c=-1;c<=1;c++)for(let i=0;i<5;i++){const a=i/5*Math.PI*2;leaf([c*.1,ground,0],[c*.1+Math.sin(a)*.055,ground+.2+(i%2)*.04,Math.cos(a)*.055],.014,i%2?COLORS.leaf:COLORS.leafLight);}}
        if(variant===2){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;leaf([0,ground,0],[Math.sin(a)*.1,ground+.27+(i%2)*.025,Math.cos(a)*.1],.024,i%2?COLORS.leaf:COLORS.leafLight);}for(let i=0;i<3;i++){const x=(i-1)*.06;stem([[x-.04,ground-.04,0],[x,ground-.055,.02],[x+.05,ground-.055,0]],.016,'#c69548');}}
        if(variant===3){for(let i=0;i<5;i++){const a=i/5*Math.PI*2,x=Math.sin(a)*.07,z=Math.cos(a)*.07,h=.32+(i%2)*.04;stem([[0,ground,0],[x*.4,h*.55,z*.4],[x,h,z]],.01);leaf([x,h*.62,z],[x+.09,h*.72,z+.02],.025,COLORS.leafLight);blossom([x,h,z],.035,i%2?COLORS.berry:'#d0b867',COLORS.fruit);}}
        return;
    }
}

export function createFoodForestFoundationPiece(foundationId,{variant=0,size=1,planted=false,seed=''}={}){
    const foundation=FOOD_FOREST_FOUNDATIONS.find(item=>item.id===foundationId);
    if(!foundation)throw new RangeError(`Unknown food forest foundation: ${foundationId}`);
    variant=Math.max(0,Math.min(3,Math.floor(Number(variant)||0)));
    const kit=createForestSculpture({seed:seed||`${foundationId}:${variant}`});
    const ground=roundedBase(kit,planted,foundationId==='edge-control'?1.5:1);
    buildFoundation(kit,foundationId,variant,ground);
    const piece=kit.finish({planted,size});
    piece.group.name=`${foundation.title} · ${FOOD_FOREST_FOUNDATION_VARIANTS[foundationId][variant]}`;
    piece.group.userData={foundation:foundationId,variant,planted,craft:'foundational-game-piece-v7'};
    piece.definition=foundation;
    return piece;
}
