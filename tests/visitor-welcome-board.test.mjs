import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

globalThis.window = { location: { pathname: '/app/' } };
const { visitorPlaceWelcomeMarkup, visitorPlaceWelcomeModel } = await import('../app/screens/visitorExperience.js');

const root = 'C:/FILES/Projects/website/github/NourishlandXR';
const anchoredTotem = {
    id: 'creek-totem',
    name: 'Creek Totem',
    type: 'area_checkpoint',
    physicalAnchor: { enabled: true, markerId: 4, markerFamily: 'aruco-original-5x5' }
};
const guide = {
    project: { id: 'regeneration-creek', name: 'Regeneration Creek', description: 'Follow water, shade and the plants restoring this creek.', projectStatus: 'ready' },
    plants: [
        { siteId: 'main', placeId: 'home', instanceId: 'p1', commonName: 'Pigeon Pea', scientificName: 'Cajanus cajan', placeName: 'Home Area' },
        { siteId: 'main', placeId: 'creek', instanceId: 'p2', commonName: 'River Oak', scientificName: 'Casuarina cunninghamiana', placeName: 'Creek Bank' }
    ],
    siteGroups: [{
        site: { id: 'main', name: 'Main landscape' },
        placeGroups: [
            { place: { id: 'home', name: 'Home Area' }, plants: [{}], totems: [] },
            { place: { id: 'creek', name: 'Creek Bank' }, plants: [{}], totems: [anchoredTotem] }
        ]
    }]
};

test('place welcome chooses the Area with a real published ArUco entrance', () => {
    const model = visitorPlaceWelcomeModel(guide);
    assert.equal(model.status.label, 'Ready to explore');
    assert.equal(model.areaCount, 2);
    assert.equal(model.plantCount, 2);
    assert.equal(model.anchoredAreaCount, 1);
    assert.equal(model.entrance.name, 'Creek Bank');
    assert.equal(model.entrance.markerLabel, 'NL-004');
    assert.match(model.entrance.markerSvg, /NL-004 ArUco marker/);
});

test('place welcome board introduces the place and teases its Areas and Plants', () => {
    const markup = visitorPlaceWelcomeMarkup(guide);
    assert.match(markup, /Welcome to/);
    assert.match(markup, /Regeneration Creek/);
    assert.match(markup, /Current state <strong>Ready to explore/);
    assert.match(markup, /Scan NL-004 to start/);
    assert.match(markup, /connects the AR experience to Creek Bank/);
    assert.match(markup, /A glimpse of this place/);
    assert.match(markup, /Pigeon Pea/);
    assert.match(markup, /River Oak/);
    assert.match(markup, /data-area-filter/);
});

test('place welcome never invents an ArUco assignment', () => {
    const withoutAnchor = structuredClone(guide);
    withoutAnchor.siteGroups[0].placeGroups[1].totems[0].physicalAnchor.enabled = false;
    const model = visitorPlaceWelcomeModel(withoutAnchor);
    const markup = visitorPlaceWelcomeMarkup(withoutAnchor);
    assert.equal(model.entrance.markerId, null);
    assert.equal(model.entrance.markerSvg, '');
    assert.match(markup, /entrance marker has not been published yet/);
    assert.doesNotMatch(markup, /Scan NL-/);
});

test('production visitor route uses the completed welcome board and responsive styles', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/visitorExperience.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'app/product-v2.css'), 'utf8');
    assert.match(source, /visitorPlaceWelcomeMarkup\(guide\)/);
    assert.match(source, /physicalMarkerSvg/);
    assert.match(styles, /\.v2-place-welcome-board/);
    assert.match(styles, /@media\(max-width:420px\)/);
});
