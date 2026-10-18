import {CREATOR_TARGETS,creatorLaunch,creatorTargetForPreview} from './creator-links.js';
const query=new URLSearchParams(location.search);
const workspace=document.querySelector('#creator-workspace');
const project=document.querySelector('#creator-project-id');
const site=document.querySelector('#creator-site-id');
const record=document.querySelector('#creator-record-key');
const target=document.querySelector('#creator-target');
const launch=document.querySelector('[data-creator-launch]');
const status=document.querySelector('#creator-launch-status');
const context=document.querySelector('#creator-context');
const projectsLink=document.querySelector('[data-creator-projects]');
for(const [key,value] of Object.entries(CREATOR_TARGETS)){const option=document.createElement('option');option.value=key;option.textContent=value.label;target.append(option);}
target.value=creatorTargetForPreview({testing:query.get('testing'),platform:query.get('platform')});
if([...workspace.options].some(option=>option.value===query.get('workspace')))workspace.value=query.get('workspace');
for(const [field,key] of [[project,'project'],[site,'site'],[record,'record']])field.value=query.get(key)||'';
document.querySelector('[data-context-fields]').open=Boolean(project.value||site.value||record.value);
document.querySelector('[data-testing-setup]').hidden=query.get('testing')!=='1';
function refreshLaunch(){
  try{
    const route=creatorLaunch({target:target.value,mode:workspace.value,project:project.value,site:site.value,record:record.value});
    launch.href=route.href;launch.removeAttribute('aria-disabled');
    projectsLink.href=route.projectsHref;
    launch.firstElementChild.textContent=route.guided?(route.context.project?'Resume guided project':'Open guided project setup'):route.chooser?'Open Creator · choose New project':'Open this project in Creator';
    status.textContent=route.guided?(route.target==='local'?'Isolated local QA tutorial. ':'Deployed tutorial for testing; author sign-in and API availability apply. ')+'Start a new draft or resume saved setup. Creator may reopen the last remembered draft. Use Return to projects in Creator to open its chooser.':route.chooser?'This opens the existing Creator project chooser. Author access is required. Guided onboarding is available through this preview’s explicit testing mode.':'This opens the selected browser workspace with your project context. Author access is required. Guided onboarding is available through this preview’s explicit testing mode.';
    context.textContent=route.context.project?'Continue project: '+route.context.project+(route.context.site?' · Site: '+route.context.site:'')+(route.context.record?' · Record selected':''):'Choose a new or saved project in Creator. This website creates no project data.';
  }catch(error){launch.removeAttribute('href');launch.setAttribute('aria-disabled','true');status.textContent=error.message;context.textContent='Check the project context before continuing.';}
}
launch.addEventListener('click',event=>{if(launch.getAttribute('aria-disabled')==='true')event.preventDefault();});
for(const field of [workspace,target,project,site,record])field.addEventListener('input',refreshLaunch);
refreshLaunch();
