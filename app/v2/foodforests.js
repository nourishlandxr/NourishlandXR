const layerContent={
  canopy:['Canopy','Upper-storey trees can capture sunlight, shape shade and shelter, and create a high framework for other life. Their suitability depends on mature size, climate, water and the space available.'],
  primary:['Primary trees','Mid-storey and fruit trees can provide harvest, structure and varied habitats. Their spacing and eventual canopy affect light and conditions below.'],
  shrub:['Shrubs','Shrubs add fruit, flowers, shelter and varied structure. Some can help cover soil or support wildlife; choose them for the conditions and their relationships with nearby plants.'],
  herbaceous:['Herbaceous layer','Herbs and other non-woody plants can supply food, medicine, flowers, ground cover or biomass. Their seasonal growth makes change visible.'],
  surface:['Soil surface','Ground covers and fallen plant material protect the soil surface, influence moisture and create habitat. Keep an eye on competition and access as the system grows.'],
  root:['Root layer','Roots occupy different depths, hold soil and interact with fungi and microorganisms. Different root patterns can help use space and cycle nutrients.'],
  climber:['Vines & climbers','Climbers use vertical structure to reach light and add harvest or habitat. They need suitable supports and management so they do not overwhelm their hosts.']
};
const layerButtons=[...document.querySelectorAll('[data-layer]')];
function selectLayer(button){const [name,description]=layerContent[button.dataset.layer];layerButtons.forEach(item=>{const selected=item===button;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;});document.querySelector('#layer-name').textContent=name;document.querySelector('#layer-description').textContent=description;}
layerButtons.forEach((button,index)=>{button.addEventListener('click',()=>selectLayer(button));button.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%layerButtons.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index-1+layerButtons.length)%layerButtons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=layerButtons.length-1;else return;event.preventDefault();selectLayer(layerButtons[next]);layerButtons[next].focus();});});

const learning=[
  ['What','Imagine the possibilities','What could a food forest become?','An ornamental sanctuary. A productive farm. A sensory garden. A source of favourite ingredients, rare fruit, herbs, medicine or seasonal abundance. A biodiversity refuge, a livelihood or a legacy. Many landscapes combine several purposes.'],
  ['Why','Name what matters to you','Why do people feel called to begin?','To grow food with meaning. To soften harsh conditions and rebuild living soil. To reduce dependence, create beauty or build resilience. Motivation can be practical and emotional at the same time.'],
  ['How','Let learning unfold through practice','How does understanding grow?','Through observation and small experiments. Learn to read light, wind, water, slope and succession. Confidence builds slowly; understanding deepens with time.'],
  ['Who','There is no single kind of learner','Who steps into this path?','Gardeners, farmers, designers, families, educators and curious beginners. No special identity is needed to begin—only openness to learning from a place.'],
  ['When','Begin where you are','When can you start?','With a new property or a single tree; after years of farming or at the first spark of awareness. Food forests are long relationships, and early observation can change later choices.']
];
let learningIndex=0;
function showLearning(index){learningIndex=(index+learning.length)%learning.length;const [tab,kicker,heading,copy]=learning[learningIndex];document.querySelectorAll('[data-learning]').forEach(button=>{const selected=button.dataset.learning===tab.toLowerCase();button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});document.querySelector('#learning-kicker').textContent=kicker;document.querySelector('#learning-heading').textContent=heading;document.querySelector('#learning-copy').textContent=copy;document.querySelector('#learning-count').textContent=`${String(learningIndex+1).padStart(2,'0')} / ${String(learning.length).padStart(2,'0')}`;}
document.querySelectorAll('[data-learning]').forEach(button=>button.addEventListener('click',()=>showLearning(learning.findIndex(item=>item[0].toLowerCase()===button.dataset.learning))));
document.querySelectorAll('[data-learning-step]').forEach(button=>button.addEventListener('click',()=>showLearning(learningIndex+Number(button.dataset.learningStep))));

const orientations={
  efficient:{mood:'Orderly · low-input · systems-led',name:'Efficient',look:'Clear spacing, access paths and defined growing areas. Plants are selected for resilience and function in a system designed to be maintainable and adaptable.',priority:'Long-term stability, labour efficiency and self-regulation over unnecessary intervention.',strength:'A legible system that can age well and help people notice ecological functions.'},
  productive:{mood:'Fruitful · harvest-led · abundant',name:'Productive',look:'Denser planting of high-yield species and clear places to gather harvests.',priority:'Food production, reliable harvests and nutritional or livelihood value.',strength:'A tangible harvest that feeds people and makes the purpose visible.'},
  ornamental:{mood:'Sensory · immersive · human-centred',name:'Ornamental',look:'Flowers, colour, scent and texture woven into layered abundance and paths for wandering.',priority:'Human experience, emotional connection, pollinators and biodiversity.',strength:'A welcoming place that draws people in, builds care and invites learning.'}
};
const orientationButtons=[...document.querySelectorAll('[data-orientation]')];
function showOrientation(button){const data=orientations[button.dataset.orientation];orientationButtons.forEach(item=>{const selected=item===button;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;});for(const key of ['mood','name','look','priority','strength'])document.querySelector(`#orientation-${key}`).textContent=data[key];}
orientationButtons.forEach(button=>button.addEventListener('click',()=>showOrientation(button)));

for(const tabs of [document.querySelectorAll('[data-learning]'),orientationButtons]){const list=[...tabs];list.forEach((button,index)=>{button.tabIndex=button.getAttribute('aria-selected')==='true'?0:-1;button.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%list.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index-1+list.length)%list.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=list.length-1;else return;event.preventDefault();list[next].click();list[next].focus();});});}

const teachers=[
  {name:'Masanobu Fukuoka',role:'Natural farming · observation and restraint',image:'https://nourishland.org/wp-content/uploads/2026/01/fukuokahigh.png',theme:'Begin with observation. Reduce disturbance where it is useful, and ask what the land is already doing.'},
  {name:'Bill Mollison',role:'Permaculture · patterns and relationships',image:'https://nourishland.org/wp-content/uploads/2026/01/Bill.png',theme:'Step back far enough to see connections: energy, water, useful cycles and relationships between parts.'},
  {name:'Sepp Holzer',role:'Landscape design · terrain and microclimates',image:'https://nourishland.org/wp-content/uploads/2026/01/sepp-holzer.jpg',theme:'Read slopes, stones, water and microclimates as features to understand and work with.'},
  {name:'Geoff Lawton',role:'Permaculture education · learning on the land',image:'https://nourishland.org/wp-content/uploads/2026/01/geoff-1.png',theme:'Take principles into real places, where seasons, mistakes and long-term change can be observed.'},
  {name:'Ernst Götsch',role:'Syntropic agroforestry · succession and time',image:'https://nourishland.org/wp-content/uploads/2026/03/ernst-e1773739790880.png',theme:'Work with succession, pruning and biomass as ways to guide a landscape through time.'}
];
let teacherIndex=0;
function showTeacher(index){teacherIndex=(index+teachers.length)%teachers.length;const person=teachers[teacherIndex];const image=document.querySelector('#teacher-image');image.src=person.image;image.alt=`Portrait of ${person.name}`;document.querySelector('#teacher-name').textContent=person.name;document.querySelector('#teacher-role').textContent=person.role;document.querySelector('#teacher-theme').textContent=person.theme;document.querySelector('#teacher-count').textContent=`${String(teacherIndex+1).padStart(2,'0')} / ${String(teachers.length).padStart(2,'0')}`;}
document.querySelectorAll('[data-teacher-step]').forEach(button=>button.addEventListener('click',()=>showTeacher(teacherIndex+Number(button.dataset.teacherStep))));
