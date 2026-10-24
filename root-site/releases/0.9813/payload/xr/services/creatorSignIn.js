import {accountRequest} from "./apiClient.js?v=0.9813";
import {portalUrl,ensurePortalStyles} from "./portalRoutes.js?v=0.9813";
let pending=null;
export function signInMarkup(){return `<form class="access-form" data-sign-in><label>Username<input name="username" autocomplete="username" maxlength="48"></label><p class="access-hint">For the existing owner login, leave username empty.</p><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="1024"></label><p data-auth-status role="status" aria-live="polite"></p><button class="access-primary" type="submit">Sign in</button></form>`;}
export function bindSignIn(root,onSuccess){
    const form=root.querySelector('[data-sign-in]');let busy=false;
    form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy)return;busy=true;const button=form.querySelector('[type=submit]'),status=form.querySelector('[data-auth-status]');button.disabled=true;status.textContent='Signing in…';
        const data=new FormData(form);
        try{const result=await accountRequest('/auth/login',{method:'POST',body:{username:String(data.get('username')).trim(),password:data.get('password')}});form.reset();await onSuccess(result);}
        catch(error){status.textContent=error.message;status.setAttribute('role','alert');}
        finally{busy=false;button.disabled=false;}
    });
}
export function requestCreatorSignIn(){
    if(pending)return pending;
    ensurePortalStyles();
    pending=new Promise(resolve=>{
        const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='access-dialog';
        dialog.innerHTML=`<header><h2>Sign in to Creator</h2><button class="access-icon" type="button" data-auth-close aria-label="Close sign in" title="Close">×</button></header>${signInMarkup()}<a href="${portalUrl('account',{tab:'register'})}">Create an account</a>`;document.body.append(dialog);
        const close=value=>{dialog.close();dialog.remove();pending=null;previous?.focus?.();resolve(value);};
        dialog.querySelector('[data-auth-close]').onclick=()=>close(false);dialog.addEventListener('cancel',event=>{event.preventDefault();close(false);});
        bindSignIn(dialog,result=>{if(result.identity?.status==='pending'){location.href=portalUrl('account');close(false);}else close(true);});dialog.showModal();
    });return pending;
}
