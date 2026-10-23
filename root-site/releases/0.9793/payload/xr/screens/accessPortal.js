import {BUILD_INFO} from "../services/buildInfo.js?v=0.9793";
import {creatorLogoMarkup} from "../services/creatorIdentity.js?v=0.9793";
import {dashboardIcon as icon} from "../services/workspaceIcons.js?v=0.9793";
import {portalUrl,websiteUrl,ensurePortalStyles} from "../services/portalRoutes.js?v=0.9793";
import {accountRequest,logoutCreatorAuthentication} from "../services/apiClient.js?v=0.9793";
import {signInMarkup,bindSignIn} from "../services/creatorSignIn.js?v=0.9793";
import {demoHardwareAccess} from "../services/demoHardwareAccess.js?v=0.9793";
import {creatorAccessCapabilities} from "../services/creatorHub.js?v=0.9793";
import {workspaceUrl,suggestedCreatorWorkspace,creatorProjectTutorialUrl} from "../services/creatorWorkspaceMode.js?v=0.9793";
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(section,query)=>html(portalUrl(section,query).href);
const website=websiteUrl();
const card=(symbol,title,copy,action,tag='')=>`<article class="access-card">${icon(symbol)}${tag?`<span class="access-tag">${html(tag)}</span>`:''}<h2>${title}</h2><p>${copy}</p>${action}</article>`;
const action=(href,label)=>`<a class="access-primary" href="${html(href)}">${label}${icon('arrow')}</a>`;
export async function renderAccessPortal(app,section='home'){
    ensurePortalStyles();document.body.dataset.experienceRole='launch';delete document.body.dataset.creatorWorkspace;
    const nav=[['demos','Demos'],['creator','Creator'],['account','Account']];
    app.innerHTML=`<div class="access-portal"><header class="access-header"><a class="access-brand" href="${html(website.href)}">${creatorLogoMarkup()}<span>nourishland</span></a><nav aria-label="Main navigation"><a href="${html(website.href)}">Website</a>${nav.map(([id,label])=>`<a href="${link(id)}"${section===id?' aria-current="page"':''}>${label}</a>`).join('')}</nav></header><main class="access-main" data-access-main></main><footer class="access-footer"><span class="welcome-version-badge">V${BUILD_INFO.version} · ${BUILD_INFO.target==='production' && BUILD_INFO.commit!=='local'?'Live':'Local preview'}</span><span>Development pilot · features vary by device</span></footer></div>`;
    const root=app.firstElementChild,main=root.querySelector('[data-access-main]'),params=new URLSearchParams(location.search),intro=(kicker,title,copy='')=>`<header class="access-intro"><p class="access-kicker">${kicker}</p><h1>${title}</h1>${copy?`<p>${copy}</p>`:''}</header>`;
    const error=message=>{const node=document.createElement('p');node.className='access-message';node.setAttribute('role','alert');node.textContent=message;main.append(node);};
    const session=async()=>accountRequest('/auth/session');
    document.title=`${{home:'Start',demos:'Demos',creator:'Creator',account:'Account',admin:'Administration'}[section]} · Nourishland`;
    if(section==='home'){
        main.innerHTML=intro('Nourishland / Access','What would you like to do?','Try a tool, work on a project, or explore a place.')+`<div class="access-grid">${card('explore','Try a demo.','Test the tools with sample content. No account needed.',action(portalUrl('demos'),'Browse demos'))}${card('tools','Create a project.','Add plants, connect knowledge and build a guided walk.',action(portalUrl('creator'),'Open Creator'))}${card('plant','Explore a place.','Read plant guides and visit published projects.',action(globalThis.NOURISHLAND_CONFIG?.hosted?new URL('/explorer/',location.origin):new URL('../platform.html',import.meta.url),'Open Explorer'))}</div><p class="access-section"><a class="access-link" href="${html(websiteUrl('education').href)}">New to Nourishland? Start here ${icon('arrow')}</a></p>`;return;
    }
    if(section==='demos'){
        const tool=params.get('tool');
        if(tool==='pimo'){
            const {renderPimoEditor}=await import("./pimoEditor.js?v=0.9793");if(!root.isConnected)return;
            const host=document.createElement('div');main.replaceChildren(host);const editor=renderPimoEditor(host,{xr:params.get('mode')==='xr'});
            const bar=document.createElement('nav');bar.className='access-pimo-return';bar.setAttribute('aria-label','Demo navigation');bar.innerHTML=`<a class="access-icon" href="${link('demos')}" aria-label="Back to demos" title="Back to demos">${icon('back')}</a><span>PIMO editor · saved on this device · export JSON to transfer</span>`;host.prepend(bar);watch(editor);return;
        }
        if(tool==='paths'){
            main.innerHTML=intro('Demos / Discovery Paths','Create a short guided walk.','1. Add a stop. 2. Write a task. 3. Preview the path.')+`<p class="access-message">Practice garden · saves in this browser. Your real projects and published content are unaffected.</p><section class="access-sandbox" data-path-sandbox></section><a class="access-link" href="${link('demos')}">${icon('back')}Back to demos</a>`;
            const [{mountCreatorTourStudio},{discoverySandboxModel,createSandboxTourRequest}]=await Promise.all([import("../services/creatorTourStudio.js?v=0.9793"),import("../services/discoveryPathSandbox.js?v=0.9793")]);if(!root.isConnected)return;
            let dirty=false;const editor=await mountCreatorTourStudio(main.querySelector('[data-path-sandbox]'),{model:discoverySandboxModel(),siteId:'sample-site',request:createSandboxTourRequest(),onDirty:value=>dirty=value});
            const guard=event=>{if(dirty && event.target.closest('a')){event.preventDefault();status('Save or discard your practice path before leaving.');}};root.addEventListener('click',guard);
            const leave=event=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',leave);watch({destroy(){editor.destroy();window.removeEventListener('beforeunload',leave);}});return;
        }
        main.innerHTML=intro('Nourishland / Demos','Choose one thing to test.','Public practice tools. No account needed.')+`<div class="access-grid demos-grid">${card('ar','Main demo','The complete plant-learning introduction, with an optional hands and controller tutorial.',`<label class="access-choice"><input type="checkbox" data-demo-tutorial checked>Include controls tutorial</label><button type="button" class="access-primary" data-start-demo="main">Start main demo ${icon('arrow')}</button>`,'Phone / headset')}${card('pin','Placement practice','Place an Orb, a Note and a Totem. Three direct steps.',`<button type="button" class="access-primary" data-start-demo="placement">Practise placement ${icon('arrow')}</button>`,'No music · no Zinnia')}${card('webhub','PIMO editor','Create cells, connect ideas and edit a knowledge map.',action(portalUrl('demos',{tool:'pimo'}),'Open PIMO editor'),'Saves on this device')}${card('checklist','Discovery Path creator','Build and preview a walk using a sample garden.',action(portalUrl('demos',{tool:'paths'}),'Create a practice path'),'Saves on this device')}</div><section class="access-section"><h2>Test your own project</h2><div class="access-grid">${card('grid','Creator interface','Sign in, choose a project and open its six tools.',action(portalUrl('creator'),'Open Creator'),'Account required')}${card('ar','XR Creator','Use your project with floating panels and left/right wrist tools.',action(portalUrl('creator',{access:'spatial'}),'Open XR Creator'),creatorAccessCapabilities().kind==='phone'?'Headset required · phone uses touch':'Compatible headset required')}${card('help','Demo chapters','Jump to an existing part of the main demo.',action(new URL('../?chapters=1',import.meta.url),'Browse chapters'),'Advanced testing')}</div></section>`;
        if(creatorAccessCapabilities().kind==='phone'){main.querySelector('[data-demo-tutorial]').checked=false;main.querySelector('[data-demo-tutorial]').disabled=true;main.querySelector('.access-choice').append(' · headset only');}
        const demoButtons=[...root.querySelectorAll('[data-start-demo]')];demoButtons.forEach(button=>button.disabled=true);
        const readyStatus=document.createElement('p');readyStatus.className='access-hint';readyStatus.setAttribute('role','status');readyStatus.textContent='Preparing demo controls…';main.querySelector('.access-intro').append(readyStatus);
        const demoReady=demoHardwareAccess().then(async supported=>{
            if(!root.isConnected || !supported){
                if(root.isConnected){readyStatus.textContent='Immersive demos require a supported AR phone or XR headset with WebXR. PIMO and Discovery Path editors work on screen.';demoButtons.forEach(button=>{button.setAttribute('aria-describedby','demo-hardware-status');});readyStatus.id='demo-hardware-status';}
                return null;
            }
            const demo=await import("./temporaryArDemo.js?v=0.9793");
            if(root.isConnected){demoButtons.forEach(button=>button.disabled=false);readyStatus.remove();}
            return demo;
        });
        demoReady.catch(failure=>{if(root.isConnected)readyStatus.textContent=`Demos could not load: ${failure.message}`;});
        demoButtons.forEach(button=>button.onclick=async()=>{
            button.disabled=true;
            try{
                const kind=button.dataset.startDemo;
                const {setWelcomeTutorialEnabled}=await import("../services/welcomeTutorialSettings.js?v=0.9793");setWelcomeTutorialEnabled(Boolean(root.querySelector('[data-demo-tutorial]')?.checked));
                // Load the existing demo under a user action; preserve its permissions and XR startup path.
                window.renderLaunchScreen=()=>{history.replaceState(null,'',portalUrl('demos'));return renderAccessPortal(app,'demos');};
                const demo=await demoReady;
                if(!demo)return;
                if(kind==='placement')await demo.startTemporaryArDemo(app,{chapter:'creator'});else demo.openTemporaryArDemoWindow(app);
            }catch(failure){button.disabled=false;error(failure.message);}
        });return;
    }
    if(section==='account'){
        main.innerHTML=intro('Nourishland / Account','Your Creator account.');
        try{
            const current=await session();if(!root.isConnected)return;
            if(current.authenticated){
                const identity=current.identity||{};main.innerHTML+=`<section class="access-message"><strong>${html(identity.name||identity.id||'Local Creator')}</strong><p>${identity.status==='pending'?'Your request is waiting for administrator approval. You can use all public demos while you wait.':identity.platformAdmin?'Administrator access. Manage accounts and projects.':'Creator access is approved.'}</p></section><div class="access-row access-section">${action(portalUrl(identity.status==='pending'?'demos':'creator'),identity.status==='pending'?'Browse demos':'Open Creator')}${identity.platformAdmin?action(portalUrl('admin'),'Administration'):''}<button type="button" class="access-icon" data-sign-out aria-label="Sign out" title="Sign out">${icon('logout')}</button></div>${current.authDisabled?'<p class="access-hint">Local testing mode: account protection is disabled on this server.</p>':''}`;
                main.querySelector('[data-sign-out]').onclick=async()=>{try{await logoutCreatorAuthentication();location.href=portalUrl('account');}catch(failure){error(failure.message);}};return;
            }
            const register=params.get('tab')==='register';
            main.innerHTML+=`<nav class="access-tabs" aria-label="Account actions"><a href="${link('account')}"${!register?' aria-current="page"':''}>Sign in</a><a href="${link('account',{tab:'register'})}"${register?' aria-current="page"':''}>Create account</a></nav><div class="access-account-layout"><div>${register?current.registrationAvailable?`<form class="access-form" data-register><label>Your name<input name="name" autocomplete="name" maxlength="120" required></label><label>Contact email<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>Username<input name="username" autocomplete="username" pattern="[a-z0-9][a-z0-9_-]{2,47}" minlength="3" maxlength="48" required></label><label>Password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="1024" required></label><label>Confirm password<input name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="1024" required></label><p class="access-hint">Use at least 12 characters. Your contact email is for the pilot; email verification and password reset are not available yet.</p><p role="status" data-register-status></p><button class="access-primary" type="submit">Request Creator account</button></form>`:`<p class="access-message">Account registration needs private storage configured on the server. The existing owner can still sign in.</p><a class="access-link" href="${link('account')}">Owner sign in</a>`:signInMarkup()}</div><aside class="access-message"><strong>${register?'Approval comes first.':'One account. Your projects.'}</strong><p>New Creator accounts need administrator approval. Public demos and Explorer do not require an account.</p></aside></div>`;
            if(!register)bindSignIn(main,result=>{location.href=portalUrl(result.identity?.status==='pending'?'account':'creator');});
            const form=main.querySelector('[data-register]');if(form)form.onsubmit=async event=>{event.preventDefault();const data=new FormData(form),message=form.querySelector('[data-register-status]'),button=form.querySelector('button');if(data.get('password')!==data.get('confirm')){message.textContent='Passwords do not match.';return;}button.disabled=true;message.textContent='Creating your request…';try{await accountRequest('/auth/register',{method:'POST',body:{username:data.get('username'),name:data.get('name'),email:data.get('email'),password:data.get('password')}});form.reset();location.href=portalUrl('account');}catch(failure){message.textContent=failure.message;}finally{button.disabled=false;}};
        }catch(failure){error(`Account service could not be reached. ${failure.message}`);}return;
    }
    if(section==='creator'){
        main.innerHTML=intro('Nourishland / Creator','Your projects.','Choose a project, then choose a tool.');
        try{
            const current=await session();if(!root.isConnected)return;
            if(!current.authenticated){main.innerHTML+=`<div class="access-row">${action(portalUrl('account'),'Sign in')}${action(portalUrl('account',{tab:'register'}),'Create account')}</div><p class="access-section">Just testing? <a href="${link('demos')}">Open the public demos.</a></p>`;return;}
            if(current.identity?.status==='pending'){main.innerHTML+='<p class="access-message">Your Creator account is awaiting approval. You can use the public demos now.</p>'+action(portalUrl('demos'),'Browse demos');return;}
            const projects=await accountRequest('/projects');if(!root.isConnected)return;
            const mode=params.get('access')==='spatial' && creatorAccessCapabilities().kind!=='phone'?'spatial':suggestedCreatorWorkspace();
            main.innerHTML+=`<p class="access-hint">${mode==='spatial'?'XR Creator · choose a project, then enter its spatial workspace.':mode==='field'?'Phone access · touch editors and field tools.':'Desktop Studio · visual editing and content tools.'}</p><div class="access-grid access-section">${projects.map(project=>card('plant',html(project.name),`${html(project.visibility==='public'?'Public project':'Private draft')}`,action(workspaceUrl(project.id,{mode,view:mode==='spatial'&&params.get('access')==='spatial'?'placement':'hub'}),'Open project'))).join('')||'<p>No projects yet. Create your first place below.</p>'}</div>${current.identity?.platformAdmin||current.identity?.creatorEnabled?`<section class="access-section"><h2>Create a project</h2><form class="access-form" data-project-create><label>Project name<input name="name" maxlength="120" required placeholder="For example: University learning garden"></label><p role="status" data-project-status></p><button class="access-primary" type="submit">Create private project</button></form></section>`:'<p class="access-message">Your administrator can assign project access.</p>'}<div class="access-row access-section"><a class="access-link" href="${link('account')}">Account</a>${current.identity?.platformAdmin?`<a class="access-link" href="${link('admin')}">Administration</a>`:''}<a class="access-link" href="${link('demos')}">Demos</a></div>`;
            const form=main.querySelector('[data-project-create]');if(form)form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{const project=await accountRequest('/projects',{method:'POST',body:{name:new FormData(form).get('name'),visibility:'draft',creatorUsername:current.identity?.name||current.identity?.id}});location.href=creatorProjectTutorialUrl(project.id,{mode});}catch(failure){form.querySelector('[data-project-status]').textContent=failure.message;button.disabled=false;}};
        }catch(failure){error(failure.message);}return;
    }
    if(section==='admin'){
        main.innerHTML=intro('Nourishland / Administration','Manage pilot access.','Approve Creator requests and assign project permissions.');
        try{
            const current=await session();if(!root.isConnected)return;
            if(!current.authenticated){main.innerHTML+=action(portalUrl('account'),'Administrator sign in');return;}
            if(!current.identity?.platformAdmin){main.innerHTML+='<p class="access-message">Only the platform administrator can open this page.</p>';return;}
            const [result,projects]=await Promise.all([accountRequest('/admin/accounts'),accountRequest('/projects')]);if(!root.isConnected)return;
            if(!result.registrationAvailable)main.innerHTML+='<p class="access-message">Connect a private account registry on the server to enable new account requests. Existing owner access remains available.</p>';
            main.innerHTML+=`<p class="access-message" role="status" data-admin-status>${result.accounts.filter(a=>a.status==='pending').length} pending requests · ${result.accounts.length} accounts</p><section>${result.accounts.map(user=>`<article class="access-admin-row" data-account="${html(user.id)}"><div><h2>${html(user.name)} <small>@${html(user.id)}</small></h2><p>${html(user.email)} · ${user.disabled?'Disabled':user.status==='pending'?'Pending approval':'Approved'}</p></div><div class="access-row">${user.status==='pending'?`<button type="button" class="access-primary" data-account-action="approve">Approve Creator</button>`:''}<button type="button" class="access-primary" data-account-action="${user.disabled?'enable':'disable'}">${user.disabled?'Enable account':'Disable account'}</button></div><p class="access-hint">Projects: ${html(Object.entries(user.projects).map(([id,role])=>`${id} (${role})`).join(', ')||'None assigned')}</p><form data-project-access><label>Project<select name="project" required><option value="">Choose a project</option>${projects.map(project=>`<option value="${html(project.id)}">${html(project.name)}</option>`).join('')}</select></label><label>Permission<select name="role"><option value="admin">Project administrator</option><option value="editor">Learning editor</option><option value="remove">Remove access</option></select></label><button class="access-primary" type="submit">Update project access</button></form></article>`).join('')||'<p class="access-section">No account requests yet.</p>'}</section><a class="access-link" href="${link('creator')}">Open projects ${icon('arrow')}</a>`;
            const run=async(user,data,button)=>{button.disabled=true;try{await accountRequest('/admin/accounts/'+encodeURIComponent(user),{method:'PUT',body:data});await renderAccessPortal(app,'admin');}catch(failure){main.querySelector('[data-admin-status]').textContent=failure.message;button.disabled=false;}};
            main.querySelectorAll('[data-account-action]').forEach(button=>button.onclick=()=>run(button.closest('[data-account]').dataset.account,{action:button.dataset.accountAction},button));
            main.querySelectorAll('[data-project-access]').forEach(form=>form.onsubmit=event=>{event.preventDefault();const user=result.accounts.find(user=>user.id===form.closest('[data-account]').dataset.account),data=new FormData(form),grants={...user.projects};if(data.get('role')==='remove')delete grants[data.get('project')];else grants[data.get('project')]=data.get('role');void run(user.id,{action:'access',projects:grants},form.querySelector('button'));});
        }catch(failure){error(failure.message);}
    }
    function status(message){let node=main.querySelector('[data-access-status]');if(!node){node=document.createElement('p');node.dataset.accessStatus='';node.className='access-message';node.setAttribute('role','status');main.prepend(node);}node.textContent=message;}
    function watch(child){const observer=new MutationObserver(()=>{if(!root.isConnected){child.destroy();observer.disconnect();}});observer.observe(app,{childList:true});}
}
