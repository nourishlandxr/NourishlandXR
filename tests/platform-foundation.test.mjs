import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createPublicContentClient, areaContentRecords } from '../app/services/platformPublicContent.js';
import { FIELD_JOURNAL_KEY, readJournal, saveJournalDraft, journalExport } from '../app/services/fieldJournal.js';

const root = path.resolve(import.meta.dirname, '..');
const storage = () => {
    const data = new Map();
    return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('content and field entry dependency graph cannot load tutorial scripts or styles', () => {
    const entry = fs.readFileSync(path.join(root, 'app/platform.html'), 'utf8');
    assert.deepEqual([...entry.matchAll(/href="([^"?]+\.css)/g)].map(match => match[1]), ['platform.css']);
    const seen = new Set();
    function visit(file) {
        if (seen.has(file)) return;
        seen.add(file);
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.\.?\/[^'"]+)\1/g)) visit(path.resolve(path.dirname(file), match[2]));
    }
    visit(path.join(root, 'app/platform.js'));
    assert.ok([...seen].some(file=>file.endsWith('checklistContract.js')));
    assert.ok([...seen].every(file => !/main\.js|temporaryArDemo|welcomePractice|features[\\/]ar-demo|webxrSession|productExperience/.test(file)));
    const router = fs.readFileSync(path.join(root, 'app/entry.js'), 'utf8');
    assert.ok(router.indexOf("params.get('interface')") < router.indexOf("import('./main.js')"));
    assert.match(router, /location\.replace\(target\.href\)/);
    const legacy = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    assert.match(legacy, /params\.get\('creator'\) === '1'\) \{ await window\.renderDemoProjects\(\); return; \}/);
});

test('public client encodes IDs and always uses visitor GET requests', async () => {
    const requests = [];
    const client = createPublicContentClient({ apiBase: '/api', fetcher: async (url, options) => {
        requests.push({ url, options });
        const data = url.includes('/sites/') ? [{ id: 'area', name: 'Area' }] : url.includes('/sites?') ? [{ id: 'site' }] : { id: 'a/b' };
        return { ok: true, json: async () => data };
    } });
    await client.project('a/b');
    const areas = await client.areas('a/b');
    assert.equal(areas[0].siteId, 'site');
    assert.equal(requests[0].url, '/api/projects/a%2Fb?view=visitor');
    assert.ok(requests.every(({ url, options }) => url.endsWith('?view=visitor') && options.method === 'GET'));
});

test('failed permissions and malformed responses are never converted to usable cached content', async () => {
    const denied = createPublicContentClient({ apiBase: '/api', fetcher: async () => ({ ok: false, status: 403, json: async () => ({ error: 'Private project' }) }) });
    await assert.rejects(denied.project('private'), /Private project/);
    const malformed = createPublicContentClient({ apiBase: '/api', fetcher: async () => ({ ok: true, json: async () => ({ projects: [] }) }) });
    await assert.rejects(malformed.projects(), /invalid list/);
    const html = createPublicContentClient({ apiBase: '/api', fetcher: async () => ({ ok: true, json: async () => { throw Error('HTML'); } }) });
    await assert.rejects(html.projects(), /did not return JSON/);
});

test('species references are shared while specimens, projects and legacy markers keep separate identities', () => {
    const plants = [1, 2].map(n => ({ instanceId: `specimen-${n}`, markerId: `marker-${n}`, plantId: 'species-1', commonName: 'Same plant' }));
    const markers = [{ id: 'marker-1', type: 'plant' }, { id: 'legacy-plant', type: 'plant', name: 'Legacy' }, { id: 'totem', type: 'area_checkpoint' }];
    const records = areaContentRecords('project-a', 'site', 'area', plants, markers);
    assert.equal(records.length, 4);
    assert.equal(records[0].knowledgeId, records[1].knowledgeId);
    assert.notEqual(records[0].id, records[1].id);
    assert.notEqual(records[0].id, areaContentRecords('project-b', 'site', 'area', plants, [])[0].id);
    assert.ok(records.some(record => record.recordId === 'legacy-plant'));
    assert.ok(records.some(record => record.kind === 'area_checkpoint'));
});

test('journal drafts reopen with scope and export without authoring or submission state', () => {
    const local = storage();
    const first = saveJournalDraft({ text: '  Flowering observed  ', projectId: 'p', siteId: 's', areaId: 'a', targetId: 'specimen-1' }, local);
    saveJournalDraft({ text: 'Another observation' }, local);
    assert.equal(readJournal(local).length, 2);
    assert.equal(readJournal(local)[0].text, 'Flowering observed');
    assert.equal(readJournal(local)[0].targetId, 'specimen-1');
    assert.equal(first.status, 'local-draft');
    assert.deepEqual(JSON.parse(journalExport(local)).drafts, readJournal(local));
});

test('missing species or specimen identities are rejected instead of creating ambiguous records', () => {
    assert.throws(() => areaContentRecords('p', 's', 'a', [{ plantId: 'species' }], []), /stable identity/);
    assert.throws(() => areaContentRecords('p', 's', 'a', [{ instanceId: 'specimen' }], []), /stable identity/);
    assert.throws(() => areaContentRecords('p', 's', 'a', [], [{ name: 'Unnamed record' }]), /stable identity/);
});

test('corrupt or unsupported journal data is preserved instead of overwritten', () => {
    const local = storage();
    for (const raw of ['broken JSON', '{"schemaVersion":2,"drafts":[]}', '{"schemaVersion":1,"drafts":[{}]}']) {
        local.setItem(FIELD_JOURNAL_KEY, raw);
        assert.throws(() => saveJournalDraft({ text: 'new' }, local));
        assert.equal(local.getItem(FIELD_JOURNAL_KEY), raw);
    }
});

test('blank/oversized drafts and quota failures preserve previously saved drafts', () => {
    const local = storage(); saveJournalDraft({ text: 'Saved earlier' }, local);
    const previous = local.getItem(FIELD_JOURNAL_KEY);
    for (const text of [' ', 'x'.repeat(4001)]) assert.throws(() => saveJournalDraft({ text }, local));
    const full = { ...local, setItem() { throw Error('Quota exceeded'); } };
    assert.throws(() => saveJournalDraft({ text: 'not saved' }, full), /Quota exceeded/);
    assert.equal(local.getItem(FIELD_JOURNAL_KEY), previous);
});
