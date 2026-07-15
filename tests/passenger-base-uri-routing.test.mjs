import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nourishland-passenger-routing-'));
const projectDir = path.join(workspaceDir, 'Hillyards');
const sitesDir = path.join(projectDir, 'sites', 'main_food_forest');
let serverProcess;
let baseUrl;

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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
    writeJson(path.join(projectDir, 'project.json'), {
        id: 'Hillyards',
        name: 'Hillyards',
        visibility: 'public'
    });
    writeJson(path.join(sitesDir, 'site.json'), {
        id: 'main_food_forest',
        name: 'Main Food Forest',
        visibility: 'public'
    });
    fs.mkdirSync(path.join(sitesDir, 'places'), { recursive: true });

    const port = await reservePort();
    baseUrl = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, ['tools/persistence-server.mjs'], {
        cwd: repositoryRoot,
        env: {
            ...process.env,
            NODE_ENV: 'production',
            HOST: '127.0.0.1',
            PORT: String(port),
            NOURISHLAND_WORKSPACE_DIR: workspaceDir,
            NOURISHLAND_CREATOR_PASSWORD: 'test-only-password',
            NOURISHLAND_SESSION_SECRET: 'test-only-session-secret-at-least-32-characters',
            NOURISHLAND_PUBLIC_ORIGIN: 'https://nourishland.org'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    await waitForServer(serverProcess);
});

after(() => {
    if (serverProcess && !serverProcess.killed) serverProcess.kill();
    fs.rmSync(workspaceDir, { recursive: true, force: true });
});

for (const requestPath of [
    '/xr-api/projects/Hillyards/sites?view=visitor',
    '/projects/Hillyards/sites?view=visitor'
]) {
    test(`serves project sites for ${requestPath}`, async () => {
        const response = await fetch(`${baseUrl}${requestPath}`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /^application\/json/);
        assert.deepEqual(await response.json(), [{
            id: 'main_food_forest',
            name: 'Main Food Forest',
            visibility: 'public',
            projectId: 'Hillyards'
        }]);
    });
}
