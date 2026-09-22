import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createZipArchive, extractZipArchive } from '../tools/zipArchive.mjs';

test('project ZIP archives round-trip without platform-specific tools', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nourishland-zip-roundtrip-'));
    try {
        const source = path.join(temporaryRoot, 'sample_project');
        fs.mkdirSync(path.join(source, 'sites', 'main'), { recursive: true });
        fs.writeFileSync(path.join(source, 'project.json'), '{"id":"sample_project"}\n');
        fs.writeFileSync(path.join(source, 'sites', 'main', 'site.json'), '{"id":"main"}\n');
        const archive = path.join(temporaryRoot, 'project.zip');
        const destination = path.join(temporaryRoot, 'extracted');

        createZipArchive(source, archive);
        extractZipArchive(archive, destination, { maxFiles: 20, maxUncompressedBytes: 1024 * 1024 });

        assert.equal(fs.readFileSync(path.join(destination, 'sample_project', 'project.json'), 'utf8'), '{"id":"sample_project"}\n');
        assert.equal(fs.readFileSync(path.join(destination, 'sample_project', 'sites', 'main', 'site.json'), 'utf8'), '{"id":"main"}\n');
    } finally {
        fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
});

test('project ZIP extraction rejects traversal paths', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nourishland-zip-traversal-'));
    try {
        const source = path.join(temporaryRoot, 'safe');
        fs.mkdirSync(source, { recursive: true });
        fs.writeFileSync(path.join(source, 'file.txt'), 'safe');
        const archive = path.join(temporaryRoot, 'project.zip');
        createZipArchive(source, archive);
        const bytes = fs.readFileSync(archive);
        const originalName = Buffer.from('safe/file.txt');
        const unsafeName = Buffer.from('../x/file.txt');
        let replacementCount = 0;
        for (let offset = bytes.indexOf(originalName); offset !== -1; offset = bytes.indexOf(originalName, offset + unsafeName.length)) {
            unsafeName.copy(bytes, offset);
            replacementCount += 1;
        }
        assert.equal(replacementCount, 2);
        fs.writeFileSync(archive, bytes);

        assert.throws(
            () => extractZipArchive(archive, path.join(temporaryRoot, 'extracted')),
            /unsafe path/
        );
        assert.equal(fs.existsSync(path.join(temporaryRoot, 'x', 'file.txt')), false);
    } finally {
        fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
});
