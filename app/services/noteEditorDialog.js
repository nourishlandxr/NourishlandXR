import {mountNoteWidgetEditor} from './noteWidgetEditor.js';
import {escapeNote as e} from './noteWidgets.js';
export function mountSpatialNoteEditor(root,marker,{onSave=async()=>{},onClose=()=>{},widgetId='',objectLabel='Note'}={}){
    root.className='creator-ar-knowledge-workspace note-edit-workspace';
    const isNote=objectLabel==='Note';
    root.innerHTML=`<form><header><h2>✎ Edit ${e(objectLabel)}</h2><button type="button" data-note-cancel>Back to AR</button></header><label>${e(objectLabel)} title<input name="title" value="${e(marker.name)}" required></label><label>${e(objectLabel)} information<textarea name="content" rows="4">${e(marker.description || marker.notes)}</textarea></label>${isNote?'<fieldset data-note-configuration></fieldset>':''}<button type="submit">Save ${e(objectLabel)}</button><p role="status"></p></form>`;
    const form=root.querySelector('form'),editor=isNote?mountNoteWidgetEditor(root.querySelector('[data-note-configuration]'),marker,{onStarter:starter=>{form.elements.title.value=starter.title;form.elements.content.value=starter.content;}}):null;
    const submit=async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{await onSave({...marker,name:form.elements.title.value.trim(),description:form.elements.content.value,notes:form.elements.content.value,appearance:{...marker.appearance,...(editor?{spatial_note:editor.value()}:{})}});onClose();}catch(error){form.querySelector('[role=status]').textContent=error.message;button.disabled=false;}};
    form.addEventListener('submit',submit);root.querySelector('[data-note-cancel]').onclick=onClose;
    const target=widgetId?[...root.querySelectorAll('[data-widget-edit]')].find(item=>item.dataset.widgetEdit===widgetId):null;if(target){target.open=true;target.querySelector('input')?.focus();}else form.elements.title.focus();
    return {close:onClose,destroy(){editor?.destroy();form.removeEventListener('submit',submit);root.replaceChildren();}};
}
