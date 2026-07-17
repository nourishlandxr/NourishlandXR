import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { reconstructGpsMarker } from '../app/services/spatialPositioning.js';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nourishland-spatial-plant-'));
const projectId = 'Hillyards';
const siteId = 'current_site';
const placeId = 'current_place';
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
            if (output.includes('Persistence server listening')) { clearTimeout(timeout); resolve(); }
        };
        child.stdout.on('data', capture);
        child.stderr.on('data', capture);
        child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited with code ${code}:\n${output}`)); });
    });
}

async function startServer() {
    const port = await reservePort();
    baseUrl = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, ['tools/persistence-server.mjs'], {
        cwd: repositoryRoot,
        env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), NOURISHLAND_WORKSPACE_DIR: workspaceDir },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    await waitForServer(serverProcess);
}

async function stopServer() {
    if (!serverProcess || serverProcess.killed) return;
    await new Promise(resolve => { serverProcess.once('exit', resolve); serverProcess.kill(); });
}

async function jsonRequest(requestPath, options = {}) {
    const response = await fetch(`${baseUrl}${requestPath}`, { headers: { 'Content-Type': 'application/json' }, ...options });
    const payload = await response.json();
    assert.equal(response.status, options.expectedStatus || (options.method === 'POST' ? 201 : 200), JSON.stringify(payload));
    return payload;
}

before(async () => {
    const siteDir = path.join(workspaceDir, projectId, 'sites', siteId);
    const placeDir = path.join(siteDir, 'places', placeId);
    writeJson(path.join(workspaceDir, projectId, 'project.json'), { id: projectId, name: 'Hillyards Food Forest', visibility: 'public' });
    writeJson(path.join(siteDir, 'site.json'), { id: siteId, name: 'Current Site', visibility: 'public' });
    writeJson(path.join(placeDir, 'place.json'), { id: placeId, name: 'Current Place', type: 'Garden', visibility: 'public' });
    fs.mkdirSync(path.join(placeDir, 'markers'), { recursive: true });
    await startServer();
});

after(async () => {
    await stopServer();
    fs.rmSync(workspaceDir, { recursive: true, force: true });
});

test('create with or without position -> restart -> Field Guide -> later GPS positioning preserves linked plants', async () => {
    const createdArea = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Tutorial Area', type: 'Other', description: 'Created from guided setup.', visibility: 'draft' })
    });
    assert.equal(createdArea.name, 'Tutorial Area');
    assert.equal(createdArea.type, 'Other');
    const rejected = await fetch(`${baseUrl}/api/projects/${projectId}/sites/${siteId}/places/${placeId}/plants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commonName: 'Incomplete Plant', scientificName: 'Invalidus', latitude: -28.69, longitude: 153.00, visibility: 'public' })
    });
    assert.equal(rejected.status, 400);
    await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/markers`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Visitor Starting Point', type: 'intro_checkpoint', visibility: 'public', anchor: { type: 'gps', latitude: -28.6912, longitude: 153.0029, accuracy: 4 } })
    });
    const created = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/plants`, {
        method: 'POST',
        body: JSON.stringify({ commonName: 'Lemon Drop Garcinia', scientificName: 'Garcinia intermedia', description: 'A fruiting Garcinia at Hillyards.', latitude: -28.6911053, longitude: 153.003029, accuracy: 3.5, visibility: 'public' })
    });
    assert.equal(created.marker.plantId, created.plant.id);
    assert.equal(created.marker.plantInstanceId, created.instance.id);
    assert.equal(created.instance.markerId, created.marker.id);
    assert.equal(created.instance.placeId, placeId);
    const unpositioned = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/plants`, {
        method: 'POST',
        body: JSON.stringify({ commonName: 'Unpositioned Davidson Plum', scientificName: 'Davidsonia jerseyana', description: 'Saved before its field position is known.', visibility: 'public' })
    });
    assert.equal(unpositioned.anchor, null);
    assert.equal(unpositioned.instance.map.latitude, null);
    assert.equal(unpositioned.instance.map.longitude, null);
    const minimalDraft = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/plants`, {
        method: 'POST',
        body: JSON.stringify({ commonName: 'Desktop Seedling', visibility: 'draft' })
    });
    assert.equal(minimalDraft.anchor, null);
    assert.equal(minimalDraft.plant.scientificName, '');
    assert.equal(minimalDraft.marker.name, 'Desktop Seedling');
    const reused = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/plants`, {
        method: 'POST',
        body: JSON.stringify({ plantId: created.plant.id, visibility: 'public' })
    });
    assert.equal(reused.plant.id, created.plant.id);
    assert.notEqual(reused.instance.id, created.instance.id);
    assert.notEqual(reused.marker.id, created.marker.id);
    const draft = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/plants`, {
        method: 'POST',
        body: JSON.stringify({ commonName: 'Creator Draft Plant', scientificName: 'Draftus privatus', description: 'Must not reach Visitor AR.', latitude: -28.6913, longitude: 153.0031, accuracy: 5, visibility: 'draft' })
    });

    await stopServer();
    await startServer();

    const listedMarkers = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/markers?view=visitor`);
    const listedPlants = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/plants?view=visitor`);
    const gpsMarkers = await jsonRequest(`/api/projects/${projectId}/gps-markers?view=visitor`);
    const marker = listedMarkers.find(item => item.id === created.marker.id);
    const fieldGuidePlant = listedPlants.plants.find(item => item.instanceId === created.instance.id);
    const gpsPlant = gpsMarkers.find(item => item.marker.id === created.marker.id);

    assert.ok(marker);
    assert.equal(marker.plantId, created.plant.id);
    assert.equal(fieldGuidePlant.commonName, 'Lemon Drop Garcinia');
    assert.equal(fieldGuidePlant.summary, 'A fruiting Garcinia at Hillyards.');
    assert.equal(fieldGuidePlant.markerId, created.marker.id);
    assert.equal(gpsPlant.anchor.latitude, -28.6911053);
    assert.equal(gpsPlant.anchor.longitude, 153.003029);
    assert.equal(gpsPlant.anchor.accuracy, 3.5);
    assert.equal(gpsPlant.marker.name, 'Lemon Drop Garcinia');
    assert.equal(gpsPlant.marker.description, 'A fruiting Garcinia at Hillyards.');
    assert.equal(listedMarkers.some(item => item.id === draft.marker.id), false);
    assert.equal(listedPlants.plants.some(item => item.instanceId === draft.instance.id), false);
    assert.equal(gpsMarkers.some(item => item.marker.id === draft.marker.id), false);
    assert.ok(listedPlants.plants.some(item => item.instanceId === unpositioned.instance.id));
    assert.equal(gpsMarkers.some(item => item.marker.id === unpositioned.marker.id), false);

    await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/markers/${unpositioned.marker.id}/anchor`, {
        method: 'PUT',
        body: JSON.stringify({ type: 'gps', latitude: -28.69118, longitude: 153.00308, accuracy: 4.5 })
    });
    const positionedGpsMarkers = await jsonRequest(`/api/projects/${projectId}/gps-markers?view=visitor`);
    const positioned = positionedGpsMarkers.find(item => item.marker.id === unpositioned.marker.id);
    assert.ok(positioned);
    assert.equal(positioned.marker.plantId, unpositioned.plant.id);
    assert.equal(positioned.marker.plantInstanceId, unpositioned.instance.id);
    assert.equal(positioned.anchor.latitude, -28.69118);
    const updatedPlants = await jsonRequest(`/api/projects/${projectId}/sites/${siteId}/places/${placeId}/plants?view=visitor`);
    const updatedInstance = updatedPlants.plants.find(item => item.instanceId === unpositioned.instance.id);
    assert.equal(updatedInstance.map.latitude, -28.69118);
    assert.equal(updatedInstance.map.longitude, 153.00308);

    const starting = gpsMarkers.find(item => item.marker.type === 'intro_checkpoint');
    const initial = reconstructGpsMarker(starting.anchor, starting.anchor, gpsPlant.anchor, 0);
    const aligned = reconstructGpsMarker(starting.anchor, starting.anchor, gpsPlant.anchor, initial.bearing);
    assert.ok(Math.abs(aligned.x) < 0.05);
    assert.ok(aligned.z < 0);
    assert.equal(gpsPlant.marker.plantId, fieldGuidePlant.plantId);
    const creatorPlants = await jsonRequest(`/api/plant-library`);
    assert.equal(creatorPlants.plants.some(item => item.commonName === 'Incomplete Plant'), false);
    assert.equal(creatorPlants.plants.filter(item => item.id === created.plant.id).length, 1);
});
