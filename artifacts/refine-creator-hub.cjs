const fs=require('node:fs');
function edit(file,fn){const s=fs.readFileSync(file,'utf8');fs.writeFileSync(file,fn(s));}
edit('app/services/creatorXrWorklist.js',s=>s.replace('<button type="button" data-close>Close</button>','${onOpenTool?\'<button type="button" data-hub-back aria-label="Creator hub">←</button>\':\'\'}<button type="button" data-close aria-label="Close Area elements">×</button>').replace('No elements in this Area. Prepare records in Desktop Studio first.','No elements in this Area. Add records from Creator hub.'));
edit('app/screens/creatorSpatialWorkspace.js',s=>s.replace(/(root\.querySelector\('\[data-paint\]'\)\.disabled=!state.areaId;\s*){2}/,'root.querySelector(\'[data-paint]\').disabled=!state.areaId;\n        '));
for(const file of ['app/screens/creatorDesktopWorkspace.js','app/screens/creatorFieldWorkspace.js','app/screens/creatorSpatialWorkspace.js']){
 edit(file,s=>{const marker="root.querySelectorAll('.workspace-mode-picker a:not([data-guided-project-setup])')";const at=s.indexOf(marker);if(at<0)throw Error(file);const mode=file.includes('Desktop')?'mode':file.includes('Field')?"'field'":"'spatial'";return s.slice(0,at)+`root.querySelector('[data-creator-hub-link]').href=workspaceUrl(projectId,{mode:${mode},siteId:state.siteId,recordKey:state.selected,view:'hub'}).href;\n        `+s.slice(at);});
}
