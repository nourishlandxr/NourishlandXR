import fs from 'node:fs';
import {WELCOME_PRACTICE_LESSONS,WELCOME_PRACTICE_RESPONSES} from '../app/services/welcomePracticeContent.js';
import {WELCOME_FRUIT_ASSETS} from '../app/services/welcomePracticeFruitAssets.js';
const directory=new URL('../.tmp/welcome-narration/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const clips=[...WELCOME_PRACTICE_LESSONS,...WELCOME_PRACTICE_RESPONSES,...Object.entries(WELCOME_FRUIT_ASSETS).map(([id,fruit])=>({id:'fruit-name-'+id,spoken:fruit.label}))].filter(c=>c.spoken);
fs.writeFileSync(new URL('catalog.json',directory),JSON.stringify(clips,null,2));
console.log(`Exported ${clips.length} Zinnia clips. Render with tools/render-welcome-narration.py.`);
