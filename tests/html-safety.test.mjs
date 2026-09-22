import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { renderPlaceDetails } from '../app/components/placeDetails.js';
import { renderAssetWorkspace } from '../app/screens/assetWorkspace.js';
import { escapeHtml, inlineJson } from '../app/services/htmlSafety.js';

const root = path.resolve(import.meta.dirname, '..');

test('HTML safety helpers escape text and JSON used in handler attributes', () => {
    const dangerous = '\"><img src=x onerror=alert(1)>';
    assert.equal(escapeHtml(dangerous), '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
    const encoded = inlineJson({ name: dangerous });
    assert.doesNotMatch(encoded, /[<>]/);
    assert.match(encoded, /&quot;/);
});

test('legacy workspace renderers do not emit executable stored markup', () => {
    const dangerous = '\"><img src=x onerror=alert(1)>';
    const site = { id: 'site', name: dangerous };
    const place = { id: 'area', name: dangerous, description: dangerous, notes: dangerous, assets: [] };
    const asset = { id: 'plant', type: 'plant', name: dangerous, category: dangerous };
    const app = { innerHTML: '' };
    renderAssetWorkspace(app, site, place, asset);
    assert.doesNotMatch(app.innerHTML, /<img/i);
    assert.doesNotMatch(renderPlaceDetails(site, place), /<img/i);
});

test('deployed headers deny framing and active embedded objects', () => {
    const headers = fs.readFileSync(path.join(root, 'deploy', 'xr.htaccess'), 'utf8');
    assert.match(headers, /X-Frame-Options "DENY"/);
    assert.match(headers, /Content-Security-Policy "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"/);
});
