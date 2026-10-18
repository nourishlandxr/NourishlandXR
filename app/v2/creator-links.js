// Website handoff only. This module never creates a project or writes platform data.
export const CREATOR_TARGETS = Object.freeze({
  hosted: Object.freeze({base:'https://nourishland.org/xr/',entry:'index.html',label:'Hosted development platform',onboarding:false}),
  deployed: Object.freeze({base:'https://nourishland.org/xr/',entry:'',label:'Deployed Creator tutorial · testing',onboarding:true}),
  local: Object.freeze({base:'http://127.0.0.1:8342/app/',entry:'',label:'Local isolated Creator QA · port 8342',onboarding:true})
});
export const CREATOR_MODES = Object.freeze(['desktop','field','spatial']);

export function creatorTargetForPreview({testing='',platform=''}={}) {
  if(testing!=='1')return 'hosted';
  return Object.hasOwn(CREATOR_TARGETS,platform)?platform:'deployed';
}

export function creatorLaunch({target='hosted',mode='desktop',project='',site='',record=''}={}) {
  const destination=CREATOR_TARGETS[target];
  if(!Object.hasOwn(CREATOR_TARGETS,target))throw new Error('This platform destination has not been verified.');
  if(!CREATOR_MODES.includes(mode))throw new Error('Choose Studio, Field or the browser spatial preview.');
  const context={project:String(project).trim(),site:String(site).trim(),record:String(record).trim()};
  for(const value of Object.values(context))if(value.length>512||/[\u0000-\u001f\u007f]/.test(value))throw new Error('Use the project context copied from Creator.');
  if(!context.project&&(context.site||context.record))throw new Error('A project ID is required to keep Site or record context.');
  const url=new URL(destination.entry,destination.base);
  const guided=destination.onboarding;
  if(guided){url.searchParams.set('workspace',mode);url.searchParams.set('onboarding','1');}
  else if(context.project)url.searchParams.set('workspace',mode);
  else url.searchParams.set('creator','1');
  if(context.project){url.searchParams.set('project',context.project);if(context.site)url.searchParams.set('site',context.site);if(context.record)url.searchParams.set('record',context.record);}
  const projectsUrl=new URL('index.html',destination.base);projectsUrl.searchParams.set('creator','1');
  return {href:url.href,projectsHref:projectsUrl.href,target,mode,context,guided,chooser:!guided&&!context.project};
}
