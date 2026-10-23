import { addPimoCell, connectPimoCells, removePimoCell, arrangePimoGraph, pimoSuggestions, validatePimoGraph,pimoCoreCell } from "./pimoGraph.js?v=0.9794";
import { createPimoTemplate } from "./pimoGraphTemplates.js?v=0.9794";
import { applyPimoDesign } from "./pimoGraphDesigns.js?v=0.9794";

const copy = value => structuredClone(value);
export const PIMO_XR_FIELDS = { title: 160, body: 6000, sourceUrl: 2000, attribution: 500, mapTitle: 160, label: 300 };

// Commands share Desktop Studio's document, history and persistence. No XR-only copy.
export function createPimoXRWorkbench(api) {
    const state = { page: 'cell', mode: 'select', edit: null, shift: false, symbols: false, status: 'Point at a cell to begin.', libraryPage: 0 };
    const selected = () => api.getGraph().nodes.find(node => node.id === api.getSelected());
    const edge = () => api.getGraph().edges.find(item => item.id === api.getSelectedEdge());
    function status(value) { state.status = value; return value; }
    function commit(next, selection) {
        const valid = validatePimoGraph(next);
        if (!valid.valid) { status(valid.errors[0]); return false; }
        const ok = api.onCommit(next, selection);
        status(ok ? 'Saved on this device.' : 'Change could not be saved.'); return ok;
    }
    function grow(title = 'New idea', position, parent = api.getSelected()) {
        const graph = api.getGraph(), layout = graph.layout.nodes[parent];
        const count = graph.edges.filter(item => item.from === parent).length;
        const angle = count * 1.15 - .5;
        const result = addPimoCell(graph, { title, parentId: parent || '', color: layout?.color, ...(position || { x: (layout?.x || 0) + Math.cos(angle) * 280, y: (layout?.y || 0) + Math.sin(angle) * 280 }) });
        if (!commit(result.graph, { cell: result.id })) return '';
        state.page = 'cell'; return result.id;
    }
    function update(field, value, id = api.getSelected(), edgeId = api.getSelectedEdge()) {
        const next = copy(api.getGraph());
        if (field === 'mapTitle') next.identity.title = String(value).trim();
        else if (edgeId && ['kind', 'label'].includes(field)) { const item = next.edges.find(item => item.id === edgeId); if (!item) return false; item[field] = value; }
        else { const node = next.nodes.find(node => node.id === id); if (!node) return false;
            if (['color', 'shape'].includes(field)) next.layout.nodes[id][field] = value;
            else if (['title', 'body', 'informationType', 'sourceUrl', 'attribution'].includes(field)) node[field] = String(value).trim();
            else return false;
        }
        return commit(next);
    }
    function beginEdit(field) {
        if (!(field in PIMO_XR_FIELDS)) return false;
        const owner = field === 'mapTitle' ? api.getGraph().identity : field === 'label' ? edge() : selected();
        if (!owner) return false;
        const value = String(owner[field === 'mapTitle' ? 'title' : field] || '');
        state.edit = { field, value, initial: value, caret: value.length, limit: PIMO_XR_FIELDS[field], cellId: api.getSelected(), edgeId: api.getSelectedEdge() };
        state.shift = false; state.symbols = field === 'sourceUrl'; return true;
    }
    function key(key) {
        const edit = state.edit; if (!edit) return;
        if (key === 'shift') { state.shift = !state.shift; return; }
        if (key === 'symbols') { state.symbols = !state.symbols; return; }
        if (key === 'left' || key === 'right') { edit.caret = Math.max(0, Math.min(edit.value.length, edit.caret + (key === 'left' ? -1 : 1))); return; }
        if (key === 'home' || key === 'end') { edit.caret = key === 'home' ? 0 : edit.value.length; return; }
        if (key === 'backspace') { if (edit.caret) { const previous = [...edit.value.slice(0, edit.caret)].at(-1); edit.value = edit.value.slice(0, edit.caret - previous.length) + edit.value.slice(edit.caret); edit.caret -= previous.length; } return; }
        if (key === 'delete') { const char = [...edit.value.slice(edit.caret)][0]; if (char) edit.value = edit.value.slice(0, edit.caret) + edit.value.slice(edit.caret + char.length); return; }
        if (key === 'clear') { edit.value = ''; edit.caret = 0; return; }
        let text = key === 'space' ? ' ' : key === 'newline' ? (edit.field === 'body' ? '\n' : ' ') : key;
        if (state.shift && text.length === 1) text = text.toUpperCase();
        text = text.slice(0, edit.limit - edit.value.length); edit.value = edit.value.slice(0, edit.caret) + text + edit.value.slice(edit.caret); edit.caret += text.length;
    }
    function saveEdit() {
        const edit = state.edit; if (!edit) return false;
        if (['title', 'mapTitle'].includes(edit.field) && !edit.value.trim()) { status('Give this idea a title.'); return false; }
        if (!update(edit.field, edit.value, edit.cellId, edit.edgeId)) return false;
        state.edit = null; return true;
    }
    function connect(from, to, waypoints = []) {
        try { const result = connectPimoCells(api.getGraph(), from, to, { waypoints }); return commit(result.graph, { cell: '', edge: result.id }) ? result.id : ''; }
        catch (error) { status(error.message); return ''; }
    }
    function remove() {
        const graph = api.getGraph();
        if (edge()) { const next = copy(graph); next.edges = next.edges.filter(item => item.id !== edge().id); return commit(next, { cell: '', edge: '' }); }
        if(selected()&&pimoCoreCell(graph,selected().id)){status('Keep the original families. Edit or grow their content.');return false;}
        if (selected()) return commit(removePimoCell(graph, selected().id), { cell: '', edge: '' });
        return false;
    }
    function duplicate() {
        const node = selected(); if (!node) return '';
        const graph = api.getGraph(), layout = graph.layout.nodes[node.id], { id, ...content } = copy(node);
        const result = addPimoCell(graph, { ...content, parentId: '', title: `${node.title} copy`, x: layout.x + 220, y: layout.y + 130, color: layout.color, shape: layout.shape, outline: copy(layout.outline) });
        Object.assign(result.graph.layout.nodes[result.id], { width: layout.width, height: layout.height });
        return commit(result.graph, { cell: result.id }) ? result.id : '';
    }
    return { state, selected, edge, status, grow, connect, update, beginEdit, key, saveEdit, remove, duplicate,
        cancelEdit() { state.edit = null; status('Edit cancelled.'); },
        suggestions: () => pimoSuggestions(api.getGraph(), api.getSelected()),
        design(id) { return commit(applyPimoDesign(api.getGraph(), id)); },
        template(id) { state.edit = null; api.onReplace(createPimoTemplate(id, { design: api.getGraph().layout.design || 'organic' })); state.page = 'cell'; status('New map planted. Your other maps are saved.'); },
        arrange() { return commit(arrangePimoGraph(api.getGraph())); },
        history(direction) { state.edit = null; api.onHistory(direction); status(direction === 'undo' ? 'Undone.' : 'Restored.'); }
    };
}

// A held button at session start/reconnect cannot accidentally open a menu.
export function createPimoXRButtonLatch() {
    const values = new Map();
    return { poll(id, pressed) { const previous = values.get(id); values.set(id, !!pressed); return previous === false && !!pressed; }, reset() { values.clear(); } };
}
