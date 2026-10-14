// Photorealistic tutorial basket. Original downloads are preserved separately.
const collection=(id,label,extent,colour,remark)=>({label,url:`../assets/welcome-practice/fruit-collection/${id}.glb`,halfUrl:`../assets/welcome-practice/fruit-collection/${id}-half.glb`,extent,colour,remark});
export const WELCOME_FRUIT_ASSETS=Object.freeze({
    peach:collection('peach','peach',.11,'#e7ac79','A peach! Look at the stone nestled inside.'),
    fig:collection('fig','fig',.085,'#826083','A fig! Look at that colourful centre.'),
    mango:collection('mango','mango',.13,'#e3b957','Mango! That golden flesh looks lovely.'),
    pomegranate:collection('pomegranate','pomegranate',.11,'#b86164','A pomegranate! Look at all those little jewels.'),
    apple:{label:'apple',url:'../assets/welcome-practice/interactive-fruit/apple-whole.glb',halfUrl:'../assets/welcome-practice/interactive-fruit/apple-half.glb',biteUrls:['../assets/welcome-practice/interactive-fruit/apple-bitten.glb','../assets/welcome-practice/interactive-fruit/apple-eaten-2.glb','../assets/welcome-practice/interactive-fruit/apple-eaten-3.glb'],normalized:true,extent:.10,colour:'#b64e4b',remark:'An apple! Have a look at the seeds inside.'},
    carambola:collection('carambola','carambola',.12,'#dac968','Carambola! Look at the star hiding inside.'),
    banana:{label:'banana',url:'../assets/welcome-practice/interactive-fruit/banana-peel.glb',normalized:true,peel:true,extent:.19,colour:'#e6d298',remark:'Hold your banana with one hand and peel downward with the other.'}
});
export const WELCOME_INITIAL_FRUITS=Object.freeze(['peach','fig','mango','pomegranate','apple','carambola','banana']);
export const WELCOME_TROPICAL_FRUITS=Object.freeze(['mango','carambola']);
