import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nourishland-pim-persistence-'));
const projectId = 'public_garden';
const siteId = 'main';
const placeId = 'orchard';
const markerId = 'pigeon_pea';
let serverProcess;
let baseUrl;

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function reservePort() {
    return new Promise((resolve, reject) => {
        const server = http.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

function waitForServer(child) {
    return new Promise((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(() => reject(new Error(`Server did not start:\n${output}`)), 10000);
        const capture = chunk => {
            output += chunk;
            if (output.includes('Persistence server listening')) {
                clearTimeout(timeout);
                resolve();
            }
        };
        child.stdout.on('data', capture);
        child.stderr.on('data', capture);
        child.once('exit', code => {
            clearTimeout(timeout);
            reject(new Error(`Server exited with code ${code}:\n${output}`));
        });
    });
}

before(async () => {
    const markerDir = path.join(workspaceDir, projectId, 'sites', siteId, 'places', placeId, 'markers', markerId);
    writeJson(path.join(workspaceDir, projectId, 'project.json'), { id: projectId, name: 'Public Garden', visibility: 'public' });
    writeJson(path.join(workspaceDir, projectId, 'sites', siteId, 'site.json'), { id: siteId, name: 'Main', visibility: 'public' });
    writeJson(path.join(workspaceDir, projectId, 'sites', siteId, 'places', placeId, 'place.json'), { id: placeId, name: 'Orchard', visibility: 'public' });
    writeJson(path.join(markerDir, 'marker.json'), { id: markerId, name: 'Pigeon Pea', type: 'plant', visibility: 'public' });
    writeJson(path.join(markerDir, 'plant_profile.json'), {
        common_name: 'Pigeon Pea',
        scientific_name: 'Cajanus cajan',
        pim: {
            schemaVersion: 1,
            importQueue: [{ id: 'pending-import' }],
            nodes: [
                { id: 'food-forest', parentId: '', title: 'Food Forest', status: 'published' },
                { id: 'nitrogen-fixer', parentId: 'food-forest', title: 'Nitrogen Fixer', status: 'published' },
                { id: 'private-draft', parentId: 'food-forest', title: 'Draft finding', status: 'draft' },
                { id: 'pending-review', parentId: 'food-forest', title: 'Review finding', status: 'published', reviewStatus: 'needs_review' }
            ]
        }
    });
    const port = await reservePort();
    baseUrl = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, ['tools/persistence-server.mjs'], {
        cwd: repositoryRoot,
        env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), NOURISHLAND_WORKSPACE_DIR: workspaceDir },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    await waitForServer(serverProcess);
});

after(async () => {
    if (serverProcess && !serverProcess.killed) await new Promise(resolve => { serverProcess.once('exit', resolve); serverProcess.kill(); });
    fs.rmSync(workspaceDir, { recursive: true, force: true });
});

const profilePath = `/api/projects/${projectId}/sites/${siteId}/places/${placeId}/markers/${markerId}/plant-profile`;

test('visitor PIM responses publish only reviewed nodes and hide the import queue', async () => {
    const creatorResponse = await fetch(`${baseUrl}${profilePath}`);
    const creator = await creatorResponse.json();
    assert.equal(creator.pim.nodes.length, 4);
    assert.equal(creator.pim.importQueue.length, 1);

    const visitorResponse = await fetch(`${baseUrl}${profilePath}?view=visitor`);
    const visitor = await visitorResponse.json();
    assert.equal(visitorResponse.status, 200);
    assert.deepEqual(visitor.pim.nodes.map(node => node.id), ['food-forest', 'nitrogen-fixer']);
    assert.equal('importQueue' in visitor.pim, false);
});

test('PIM-only saves preserve plant identity fields', async () => {
    const original = await (await fetch(`${baseUrl}${profilePath}`)).json();
    const response = await fetch(`${baseUrl}${profilePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pim: { ...original.pim, explorationVersion: 2 } })
    });
    const saved = await response.json();
    assert.equal(response.status, 200);
    assert.equal(saved.common_name, 'Pigeon Pea');
    assert.equal(saved.scientific_name, 'Cajanus cajan');
    assert.equal(saved.pim.explorationVersion, 2);
});

test('visitor deep reads enforce the full public hierarchy', async () => {
    writeJson(path.join(workspaceDir, projectId, 'sites', siteId, 'places', placeId, 'place.json'), { id: placeId, name: 'Orchard', visibility: 'draft' });
    const response = await fetch(`${baseUrl}${profilePath}?view=visitor`);
    assert.equal(response.status, 404);
});
