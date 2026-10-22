const fs=require('node:fs'),file='artifacts/creator-game-browser-qa.mjs';let s=fs.readFileSync(file,'utf8');
s=s.replace("await page.screenshot({path:'artifacts/creator-game-desktop.png',fullPage:true});",`const contrast=await page.locator('button.hub-tool').first().evaluate(button=>{
 const fg=getComputedStyle(button.querySelector('strong')).color.match(/[0-9.]+/g).slice(0,3).map(Number);
 const bgs=[...getComputedStyle(button).backgroundImage.matchAll(/rgba?\\(([^)]+)\\)/g)].map(m=>m[1].split(',').slice(0,3).map(Number));
 const l=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
 return Math.min(...bgs.map(bg=>(Math.max(l(fg),l(bg))+.05)/(Math.min(l(fg),l(bg))+.05)));
 });assert(contrast>=4.5,'Creator tool labels fail normal text contrast');
 await page.screenshot({path:'artifacts/creator-game-desktop.png',fullPage:true,animations:'disabled'});`);
s=s.replace("await xr.locator('[data-hub-records]').waitFor();await xr.locator", "await xr.locator('[data-hub-records]').waitFor();await xr.locator('.creator-brand-mark img').evaluate(img=>img.decode());await xr.screenshot({path:'artifacts/creator-game-xr-menu.png',fullPage:true});await xr.locator");
fs.writeFileSync(file,s);
