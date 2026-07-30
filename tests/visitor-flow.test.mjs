import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { renderProjectEntry } from '../app/components/projectEntry.js';
import { renderLaunchScreen } from '../app/screens/launch.js';
import { scopedMarkerStorageId } from '../app/services/markerWorkflow.js';

const root = path.resolve(import.meta.dirname, '..');

test('matching Totem names remain independent across projects', () => {
    const firstId = scopedMarkerStorageId('Community Garden', 'Main Site', 'Orchard', 'area-totem');
    const secondId = scopedMarkerStorageId('School Garden', 'Main Site', 'Orchard', 'area-totem');
    assert.equal(firstId, 'community_garden_main_site_orchard_area_totem');
    assert.equal(secondId, 'school_garden_main_site_orchard_area_totem');
    assert.notEqual(firstId, secondId);

    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const arSource = fs.readFileSync(path.join(root, 'app/screens/arMode.js'), 'utf8');
    assert.match(dashboardSource, /scopedMarkerStorageId\(projectId, context\.site\.id, areaId, 'area-totem'\)/);
    assert.match(arSource, /scopedMarkerStorageId\(operation\.projectId, operation\.siteId, operation\.areaId, 'area-totem'\)/);
});

test('welcome keeps primary roles separate and pairs About with the existing AR demo', () => {
    const app = { innerHTML: '' };
    renderLaunchScreen(app);
    assert.match(app.innerHTML, /Create &amp; Manage/);
    assert.match(app.innerHTML, /Build and manage locations, content and visitor experiences/);
    assert.match(app.innerHTML, /Explore a Place/);
    assert.match(app.innerHTML, /welcome-complementary-grid/);
    assert.match(app.innerHTML, /About This Tool/);
    assert.match(app.innerHTML, /Understand what NourishlandXR is and what it can help you build/);
    assert.match(app.innerHTML, /TRY IT NOW/);
    const header = app.innerHTML.slice(app.innerHTML.indexOf('intro-heading'), app.innerHTML.indexOf('</div>', app.innerHTML.indexOf('intro-heading')) + 6);
    assert.match(header, /Plant literacy/);
    assert.match(header, /welcome-version-badge/);
    assert.match(header, /· DEMO/);
    assert.doesNotMatch(app.innerHTML, /welcome-label">DEMO/);
    assert.match(app.innerHTML, /A quick introduction to spatial stories, Markers and Areas/);
    assert.match(app.innerHTML, /openTemporaryArDemoWindow/);
    assert.ok(app.innerHTML.indexOf('welcome-complementary-grid') > app.innerHTML.indexOf('role-grid'));
    assert.doesNotMatch(app.innerHTML, /assets\/herov2\.png/);
});

test('About This Tool explains the concept without tutorial instructions', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const aboutStart = source.indexOf("if (feature === 'About This Tool')");
    const aboutEnd = source.indexOf("if (feature === 'Help Guide')", aboutStart);
    const aboutSource = source.slice(aboutStart, aboutEnd);
    assert.match(aboutSource, /What is NourishlandXR\?/);
    assert.match(aboutSource, /place-based tool that connects information directly to real environments/);
    assert.match(aboutSource, /How it works/);
    assert.match(aboutSource, /Built for food literacy/);
    assert.match(aboutSource, /turns knowledge about a place into something you can see, edit and share/);
    assert.doesNotMatch(aboutSource, /Choose your path|Select a location|Explore with AR|Demo note/);
    assert.doesNotMatch(aboutSource, /<ol>|<li>/);
});

test('visitor project selection opens the welcome page without a repeated card action', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/explorer.js'), 'utf8');
    assert.doesNotMatch(source, /<span>Explore this location<\/span>/i);
    assert.match(source, /renderVisitorLocationIntro/);
    assert.match(source, /Explore in AR/);
    assert.match(source, /Browse Content/);
    assert.match(source, /const projects = \(await loadProjects\(\)\)/);
    assert.match(source, /Under construction/);
    assert.match(source, /projectStatus\(project\) !== 'hidden'/);
    assert.match(source, /More info/);
    assert.match(source, /Notify me when ready · Coming soon/);
    assert.match(source, /privatePreview = creatorPreview \|\| explorePreview/);
    assert.match(source, /This experience is not open yet/);
});

test('AR entry is gated by preparation and only Start AR Mode launches AR', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/explorer.js'), 'utf8');
    assert.match(source, /NourishlandXR uses your phone’s camera/);
    assert.match(source, /When prompted, please allow access to your camera and location/);
    assert.match(source, />START AR MODE</);
    assert.match(source, />Go Back</);
});

test('creator dashboard prioritizes Areas and Open AR while optional features stay quiet', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const entrySource = fs.readFileSync(path.join(root, 'app/components/projectEntry.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    assert.match(entrySource, />OPEN AR</);
    assert.doesNotMatch(entrySource, /Journey Bag|Unplaced Bag/);
    assert.doesNotMatch(entrySource, /Add Starting Point/);
    assert.doesNotMatch(entrySource, />\+ CREATE AREA</);
    assert.doesNotMatch(entrySource, /Home Base/);
    assert.match(entrySource, /Trail Entrance/);
    assert.match(entrySource, /living-map-progress/);
    assert.match(entrySource, /growth\.starterActions\.map/);
    assert.match(entrySource, /Why begin here\?/);
    assert.match(entrySource, /See your knowledge come alive in the place it belongs/);
    assert.match(source, /Add first Plant/);
    assert.match(source, /Create first Area/);
    assert.match(source, /Create first Totem/);
    assert.match(source, /Create first Plant Profile/);
    assert.match(source, /tutorial-totem/);
    assert.match(source, /\['arMode', 'arPath'\]/);
    assert.doesNotMatch(source, /\['contentMode', 'contentModes'\]/);
    assert.match(source, /projectTutorial: 'projectTutorial'/);
    assert.match(source, /helpGuide: 'helpGuide'/);
    assert.match(source, /\['area', 'areas'\]/);
    assert.match(entrySource, /tutorial-task-list/);
    assert.match(entrySource, /step\.complete \? '✓' : '○'/);
    assert.match(source, /Create 2 Plant Profiles/);
    assert.match(source, /plantProfileCount >= 2/);
    assert.match(source, /growthCompleted === growthSteps\.length/);
    assert.match(source, /Create a Plant Profile/);
    assert.doesNotMatch(entrySource, /Choose what to add and where it belongs/);
    assert.doesNotMatch(entrySource, /dashboard-vital-notice/);
    assert.ok(entrySource.indexOf('dashboard-location-footer') > entrySource.indexOf('latest-entries-section'));
    assert.match(styles, /\.dashboard-ar-path \{ display: grid; grid-template-columns:/);
    assert.doesNotMatch(entrySource, />Work Mode</);
    assert.doesNotMatch(entrySource, />Quick Access</);
    assert.match(entrySource, /'WEB HUB'/);
    assert.match(source, /openArAction/);
    assert.match(source, /addUnplacedAction/);
    assert.match(source, /renderContentMode/);
    assert.match(source, /Field Guide/);
    assert.match(source, /Stories &amp; Checkpoints/);
    assert.match(source, /Organizer Folder/);
    assert.match(source, /Add without AR/);
    assert.match(source, /Stories &amp; Checkpoints/);
    assert.match(source, /Project Settings/);
    assert.match(source, /Visitor Entrances/);
    assert.match(source, /Organizer Folder/);
    assert.match(source, /createAreaAction: `window\.renderProjectAreaForm/);
    assert.match(source, /growthJourney/);
    assert.match(source, /Change Theme/);
    assert.match(source, /LIGHT \(White\)/);
    assert.match(source, /DARK \(Black\)/);
    assert.match(source, /FOREST DARK \(Green\)/);
    assert.match(source, /FOREST LIGHT/);
    assert.match(source, /CYBER \(Gray \/ Purple\)/);
    assert.match(source, /projectThemeSaveQueues/);
    assert.match(source, /requestedProjectThemes/);
    assert.match(source, /Applying \$\{theme\.replace/);
    assert.match(source, /style\.colorScheme/);
    assert.match(source, /Backup Project to File/);
    assert.match(source, /Exports a configuration file containing all project data/);
    assert.match(source, /Coming Soon/);
    assert.match(source, /deleteProjectFromSettings/);
    assert.match(source, /window\.confirm/);
    assert.match(source, /deleteProjectFromSettings\('\$\{encoded\(project\.id\)\}', '\$\{encoded\(project\.name\)\}'\)/);
    const deleteSource = source.slice(source.indexOf('export async function deleteProjectFromSettings'), source.indexOf('export async function renderBrowseContent'));
    assert.match(deleteSource, /pendingThemeSave/);
    assert.match(deleteSource, /deleteProjectOnDisk\(projectId\)/);
    assert.doesNotMatch(deleteSource, /projectById/);
    assert.match(source, /Restart Tutorial for This Project/);
    assert.match(source, /Reset Learning Tips/);
    assert.match(source, /Tutorial Mode/);
    assert.match(source, /recordTutorialEvent/);
    assert.match(entrySource, /dashboard-open-ar/);
    assert.match(entrySource, />OPEN AR</);
    assert.doesNotMatch(entrySource, /Journey Bag|Unplaced Bag/);
    assert.doesNotMatch(entrySource, />Quick Access</);
    assert.doesNotMatch(entrySource, /Add content to this location/);
    assert.doesNotMatch(entrySource, /<strong>Add \$\{item\.label\}<\/strong>/);
    assert.match(entrySource, /project-areas-section/);
    assert.match(entrySource, /project-area-link/);
    assert.match(source, /areas: areaLinks/);
    assert.match(source, /renderProjectAreaDashboard/);
    assert.match(entrySource, />Search</);
    assert.match(entrySource, /Search this project/);
    assert.match(entrySource, /data-project-search-item/);
    assert.match(source, /buildProjectSearchItems/);
    assert.match(source, /loadPlantLibrary/);
    assert.match(source, /loadPlantProfile/);
    assert.match(source, /filterProjectSearch/);
    assert.match(entrySource, /Unplaced/);
    assert.match(entrySource, /Project Status/);
    assert.doesNotMatch(entrySource, /dashboard-identity/);
    assert.match(entrySource, /<p>Dashboard<\/p>/);
    assert.doesNotMatch(entrySource, /dashboard-introduction/);
    assert.match(entrySource, /tutorial-spotlight-callout/);
    assert.match(entrySource, /tutorial-spotlight-shield/);
    assert.match(entrySource, /role="dialog" aria-modal="true"/);
    assert.match(entrySource, /contextual-guidance/);
    assert.match(entrySource, /First-use guidance/);
    assert.match(entrySource, /Close tutorial/);
    assert.match(entrySource, /config\.guidance\?\.target === 'projectTutorial' \? ' open' : ''/);
    assert.match(entrySource, />See all</);
    assert.match(entrySource, /No entries have been added yet/);
    assert.doesNotMatch(entrySource, />Date</);
    assert.doesNotMatch(entrySource, />Added by</);
    assert.match(entrySource, /recent-record-line/);
    assert.match(entrySource, /Location:/);
    assert.match(source, /renderAllProjectEntries/);
    assert.match(source, /filterAllProjectEntries/);
    assert.match(source, /Search entries/);
    assert.match(source, /entryCreatorLabel/);
    const changesRowSource = entrySource.slice(entrySource.indexOf('function latestEntryRow'), entrySource.indexOf('export function renderProjectEntry'));
    assert.doesNotMatch(changesRowSource, /\$\{item\.area\}|entry-status-/);

    const dashboardHtml = renderProjectEntry({
        locationId: 'garden',
        locationName: 'Garden',
        siteName: 'Backyard',
        openArAction: 'window.openAr()',
        createAreaAction: 'window.createArea()',
        fieldGuideAction: 'window.fieldGuide()',
        mapAction: 'window.siteMap()',
        storiesAction: 'window.stories()',
        unplacedAction: 'window.unplaced()',
        backAction: 'window.exitProject()',
        viewAllAction: 'window.viewAll()',
        status: { entries: '0', unplaced: '0', areas: '0', lastUpdated: 'No edits yet' },
        tools: [],
        growthJourney: null
    });
    assert.doesNotMatch(dashboardHtml, /\+ CREATE AREA/);
    assert.doesNotMatch(dashboardHtml, /onclick="undefined"/);
});

test('Create and Manage opens saved projects while each project owns its Web Hub', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    const fieldGuideSource = fs.readFileSync(path.join(root, 'app/screens/fieldGuide.js'), 'utf8');
    assert.match(dashboardSource, /<h1>Home<\/h1>/);
    assert.match(dashboardSource, /project-selection-list/);
    assert.match(dashboardSource, /window\.renderProjectDashboard/);
    assert.match(dashboardSource, /window\.renderProjectForm/);
    assert.doesNotMatch(dashboardSource, /export async function renderWebHubHome/);
    assert.doesNotMatch(mainSource, /window\.renderWebHubHome/);
    assert.match(dashboardSource, /<strong>Web Hub<\/strong>/);
    assert.match(fieldGuideSource, /const guideTitle = creator \? 'Web Hub' : 'Field Guide'/);
    assert.match(fieldGuideSource, /loadSitePlaces\(project\.id, site\.id\)\.catch\(\(\) => \[\]\)/);
    assert.match(fieldGuideSource, /web-context-beacon is-home/);
    assert.match(fieldGuideSource, /<strong data-web-hub-location>HOME<\/strong>/);
    assert.match(fieldGuideSource, /currentGuidePlaceId = creator \? String\(homePlace\?\.id \|\| ''\) : ''/);
    assert.match(fieldGuideSource, /applyFieldGuideFilter\(currentGuidePlaceId\)/);
    assert.match(fieldGuideSource, /field-guide-creation-board/);
    assert.match(fieldGuideSource, /<strong>\+ Plant<\/strong>/);
    assert.match(fieldGuideSource, /<strong>\+ Area<\/strong>/);
    assert.doesNotMatch(fieldGuideSource, /field-guide-add-plant/);
    assert.match(fieldGuideSource, /<strong>Map<\/strong>/);
    assert.match(fieldGuideSource, /Area Totems/);
    assert.match(fieldGuideSource, /Plant records/);
});

test('Home owns no-Area experiments while named Areas remain isolated', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const arSource = fs.readFileSync(path.join(root, 'app/screens/arMode.js'), 'utf8');
    assert.match(dashboardSource, /isDefaultHomeArea\(area\)/);
    assert.match(dashboardSource, /displayAreaName\(place\)/);
    assert.match(arSource, /activeAreaMarkers\(\)/);
    assert.match(arSource, /activateArea\(selected\)/);
    assert.match(arSource, /activateArea\(null\)/);
});

test('fresh projects begin with a simple Area and can place its Totem now or later', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    assert.match(mainSource, /window\.renderProjectDashboard\(encodeURIComponent\(created\.id\)\)/);
    assert.match(dashboardSource, /Your space is ready/);
    assert.match(dashboardSource, /CREATE YOUR FIRST AREA/);
    assert.match(dashboardSource, /Name your Area/);
    assert.match(dashboardSource, /Area \$\{nextAreaNumber\}/);
    assert.match(dashboardSource, /Examples: Orchard · Vegetable Garden · Creek Bank · Front Bed/);
    assert.match(dashboardSource, /<strong>Create Area<\/strong>/);
    assert.match(dashboardSource, /Save the Area first\. You can add and place its Totem from the Area afterwards\./);
    assert.doesNotMatch(dashboardSource, /data-area-next="place"/);
    assert.doesNotMatch(dashboardSource, /event\.submitter\?\.dataset\.areaNext === 'place'/);
    assert.match(dashboardSource, /resumeAreaCreationFlow/);
    assert.match(dashboardSource, /renderLocationFieldMarker\(encoded\(projectId\), type, placementMode, false, encoded\(areaId\)\)/);
    assert.match(dashboardSource, /createAreaRecord\(projectId, site\.id/);
    const areaWorkflowSource = fs.readFileSync(path.join(root, 'app/services/areaWorkflow.js'), 'utf8');
    assert.match(areaWorkflowSource, /export async function createAreaRecord/);
    const setupSource = dashboardSource.slice(
        dashboardSource.indexOf('export async function renderNewLocationSetup'),
        dashboardSource.indexOf('export async function renderAddToLocation')
    );
    assert.doesNotMatch(setupSource, /Place Starting Point|Use current GPS|Enter coordinates/);
    assert.match(dashboardSource, /renderAreaRequired/);
    assert.match(dashboardSource, /ensureProjectLocation/);
    assert.match(dashboardSource, /Main Location/);
    assert.match(dashboardSource, />Create Area</);
    assert.doesNotMatch(dashboardSource, /Is this where your Starting Point will be/);
    assert.match(dashboardSource, /Continue in Home/);
    assert.doesNotMatch(dashboardSource, /A Home Base is simply a reference to your main Area/);
    assert.match(dashboardSource, /A Trail Entrance belongs to the Area where a guided journey begins/);
    assert.match(dashboardSource, /area_explained/);
    assert.match(dashboardSource, /first_area_created_or_selected/);
    assert.match(dashboardSource, /meaningful section inside a Location/);
    assert.match(dashboardSource, /placedTotemAreaIds/);
    assert.match(dashboardSource, /missingTotemArea/);
    assert.match(dashboardSource, /allAreasHavePlacedTotems/);
    assert.match(dashboardSource, /effectiveMarkerType/);
    assert.match(dashboardSource, /const areas = places\.filter\(place => !isDefaultHomeArea\(place\)\)/);
    assert.match(dashboardSource, /const startingPoints = entries\.filter\(entry => entry\.marker\.type === 'intro_checkpoint'\)/);
    assert.match(dashboardSource, /window\.startExistingMarkerPlacement/);
    assert.doesNotMatch(dashboardSource, /savedMarker = await updatePlaceMarker\(projectId, context\.site\.id, place\.id, savedMarker\.id, data\)/);
});

test('Area AR actions fall back to the Area dashboard when WebXR cannot start', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    const helperSource = dashboardSource.slice(
        dashboardSource.indexOf('export async function openProjectAreaAr'),
        dashboardSource.indexOf('export async function renderProjectAreaDashboard')
    );
    const areaDashboardSource = dashboardSource.slice(
        dashboardSource.indexOf('export async function renderProjectAreaDashboard'),
        dashboardSource.indexOf('export async function renderProjectAreaLocationForm')
    );
    assert.match(helperSource, /started = await window\.startArMode\?\.\(projectId, areaId, checkpointId, initialPlacementType, '', 'dashboard'\)/);
    assert.match(helperSource, /if \(started\) return true;\s*await renderProjectAreaDashboard\(app, encoded\(projectId\), encoded\(areaId\)\);[\s\S]*projectAreaArStatus[\s\S]*AR could not start\. Check camera permission and WebXR support[\s\S]*return false;/);
    assert.match(mainSource, /window\.openProjectAreaAr = \(projectId, areaId, checkpointId = '', initialPlacementType = ''\) => openProjectAreaAr\(app, projectId, areaId, checkpointId, initialPlacementType\)/);
    assert.match(dashboardSource, /action: `window\.renderProjectAreaForm/);
    assert.match(dashboardSource, /action: `window\.renderLocationFieldMarker/);
    assert.match(areaDashboardSource, /OPEN AREA IN AR/);
    assert.match(areaDashboardSource, /is-totem-entry/);
    assert.match(areaDashboardSource, /window\.openProjectAreaAr\('\$\{encoded\(context\.project\.id\)\}', '\$\{encoded\(context\.area\.id\)\}', '', 'area_checkpoint'\)">PLACE IN AR/);
    assert.match(areaDashboardSource, /id="projectAreaArStatus" class="meta" aria-live="polite"/);
    assert.match(areaDashboardSource, /encoded\(checkpoint\?\.marker\.id/);
});

test('Organizer Folder excludes compatibility Area Totems by semantic type', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const unplacedSource = dashboardSource.slice(
        dashboardSource.indexOf('export async function renderUnplacedContent'),
        dashboardSource.indexOf('export async function renderStoriesAndFocus')
    );
    assert.match(unplacedSource, /\['plant', 'note', 'sub_checkpoint'\]\.includes\(effectiveMarkerType\(entry\.marker\)\)/);
    assert.match(unplacedSource, /isDefaultHomeArea\(entry\.place\)/);
    assert.match(unplacedSource, /const markerType = effectiveMarkerType\(marker\)/);
    assert.doesNotMatch(unplacedSource, /\.includes\(entry\.marker\.type\)/);
});

test('quick access creation is minimal and separates Area assignment from placement', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/fieldMarker.js'), 'utf8');
    assert.match(source, /<label for="fieldArea">Area<\/label>/);
    assert.match(source, /Use existing/);
    assert.match(source, /Home — assign later/);
    assert.match(source, /Create new Area/);
    assert.match(source, /Not yet placed · can be placed later/);
    assert.doesNotMatch(source, /<label>Project<\/label>/);
    assert.doesNotMatch(source, /<label>Location<\/label>/);
    assert.doesNotMatch(source, /<label>Site<\/label>/);
    assert.doesNotMatch(source, /<label>Marker Type<\/label>/);
});

test('Try It Now guides two Plants and a Note without turning an orb into a Totem', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/temporaryArDemo.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    assert.match(source, /placementPointerMarkup\(''\)/);
    assert.doesNotMatch(source, /works like a game/);
    assert.match(source, /Press Continue to load your pointer/);
    assert.match(source, /Press the aiming circle to place the example Plant orb/);
    assert.doesNotMatch(source, /CREATE A PLANT ORB|Show aim/);
    assert.match(source, /const DEMO_SEQUENCE = \['plant', 'plant2', 'note'\]/);
    assert.doesNotMatch(source, /Every place holds more than we first see/);
    assert.doesNotMatch(source, /Area · Citrus Guild/);
    assert.match(source, /function createSpatialKnowledgeTexture/);
    assert.match(source, /record\.demoExpanded/);
    assert.match(source, /<h2>Add a Note<\/h2>/);
    assert.match(source, /const directType = type === 'note' \? 'note' : 'sub_checkpoint'/);
    assert.doesNotMatch(source, /record\.type = 'note'/);
    assert.match(source, /markers\.length >= DEMO_SEQUENCE\.length/);
    assert.match(source, /createMinimalMarkerDraft/);
    assert.match(source, /relateMinimalMarkers/);
    assert.match(source, /const plantName = moringa \? 'Moringa Tree' : PIGEON_PEA_EXAMPLE\.commonName/);
    assert.doesNotMatch(source, /Inspirational plaque/);
    assert.match(source, /createBoundaryTexture/);
    assert.doesNotMatch(source, /function guideAreaConversion/);
    assert.doesNotMatch(source, /showDemoAction\('zone'\)/);
    assert.match(source, /Totems belong to Areas and are created separately in Creator Mode/);
    assert.doesNotMatch(source, /Name your Plant|Plant name<input/);
    assert.match(source, /runKnowledgeTour/);
    assert.match(source, /navigator\.vibrate/);
    assert.doesNotMatch(source, /tryit-panel/);
    assert.match(styles, /\.tryit-demo\.is-immersive \.tryit-sim-marker,[\s\S]*\.tryit-demo\.is-immersive \.tryit-sim-plant-tether \{ display: none !important;/);
    assert.match(source, /function placeMarker/);
    assert.match(source, /function createMarkerTexture/);
    assert.doesNotMatch(source, /Loading Dashboard|Place Your Dashboard|draggable-window/);
    assert.match(source, /isSessionSupported\('immersive-ar'\)/);
    assert.match(source, /makeXRCompatible/);
    assert.match(source, /new XRWebGLLayer/);
    assert.match(source, /requestAnimationFrame\(draw\)/);
    assert.match(source, /requiredFeatures: \['dom-overlay', 'hit-test'\]/);
    assert.match(source, /requestHitTestSource/);
    assert.match(source, /TEXTURE_WRAP_S, gl\.CLAMP_TO_EDGE/);
    assert.match(source, /TEXTURE_WRAP_T, gl\.CLAMP_TO_EDGE/);
    assert.match(source, /Finish demo/);
    assert.match(source, /spatialPosition\(null, matrix, 0\)/);
    assert.doesNotMatch(source, /persistence|apiFetch|fetch\(/);
});

test('new location asks only for core details and supported templates', () => {
    const form = fs.readFileSync(path.join(root, 'app/components/siteForm.js'), 'utf8');
    const templates = fs.readFileSync(path.join(root, 'app/templates/projectTemplates.js'), 'utf8');
    const fieldMarker = fs.readFileSync(path.join(root, 'app/screens/fieldMarker.js'), 'utf8');
    const server = fs.readFileSync(path.join(root, 'tools/persistence-server.mjs'), 'utf8');
    const sites = fs.readFileSync(path.join(root, 'app/screens/sites.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    assert.match(form, /Location name/);
    assert.match(form, /Description \(optional\)/);
    assert.match(form, /projectTemplate/);
    assert.doesNotMatch(form, /projectCoverImage|Suggested Locations/);
    for (const label of ['Blank', 'Food Forest', 'Native Forest', 'Orchard', 'Home Garden', 'Kitchen Garden', 'Plant Nursery', 'Stock Inventory']) {
        assert.match(templates, new RegExp(label));
    }
    assert.match(templates, /Inventory & Exhibitions · Non-plant/);
    assert.match(form, /type="checkbox"/);
    assert.match(form, /Non-plant project/);
    assert.match(form, /collections, libraries, offices or exhibitions/);
    assert.match(fieldMarker, /content_domain: 'nonplant'/);
    assert.match(fieldMarker, /marker_kind: 'np_marker'/);
    assert.match(fieldMarker, /dynamic_marker: true/);
    assert.match(server, /content_domain: data\.content_domain \|\| undefined/);
    assert.match(server, /marker_kind: data\.marker_kind \|\| undefined/);
    assert.match(form, /templateKey = 'empty'/);
    assert.match(sites, /let selectedTemplate = 'empty'/);
    assert.ok(templates.indexOf('empty:') < templates.indexOf('food_forest:'));
    assert.match(dashboard, /projectSettingsCoverImage/);
    assert.match(dashboard, /Cover image \(optional\)/);
});

test('new projects separate guided tutorial choice from advanced controls', () => {
    const formSource = fs.readFileSync(path.join(root, 'app/components/siteForm.js'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    assert.match(formSource, /<strong>Include guided tutorial<\/strong>/);
    assert.match(formSource, /<strong>Show advanced controls<\/strong>/);
    assert.match(mainSource, /projectExpertMode'\)\?\.checked === true/);
    assert.match(mainSource, /restartProjectTutorial\(created\.id\)/);
    assert.match(mainSource, /setProjectTutorialMode\(created\.id, tutorialEnabled && !expertMode\)/);
    assert.match(dashboardSource, /const expertMode = project\.expertMode === true/);
    assert.match(dashboardSource, /setProjectTutorialMode\(projectId, !enabled\)/);
    assert.match(dashboardSource, /Show themes, technical guidance, diagnostics/);
    assert.match(dashboardSource, /if \(project\.expertMode === true\) return renderProjectDashboard/);
    assert.match(dashboardSource, /const tutorialComplete = growthCompleted === growthSteps\.length/);
    assert.match(dashboardSource, /if \(tutorialWasEnabled && tutorialComplete\) \{\s*setProjectTutorialMode\(project\.id, false\)/);
    assert.match(dashboardSource, /const growthJourney = project\.expertMode === true\s*\|\| !tutorialEnabled/);
    assert.match(dashboardSource, /const guidance = project\.expertMode === true \|\| !tutorialEnabled/);
    assert.match(dashboardSource, /Add 1 Area complete/);
    assert.match(dashboardSource, /What should visitors call this entrance\?/);
    assert.match(dashboardSource, /What should they know or feel when they arrive\?/);
    assert.match(dashboardSource, /Advanced Trail Entrance options/);
});

test('project publishing can hide a project from Explorer', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const serverSource = fs.readFileSync(path.join(root, 'tools/persistence-server.mjs'), 'utf8');
    assert.match(dashboardSource, /value="hidden".*Hidden from Explorer/);
    assert.match(dashboardSource, /\['hidden', 'under_construction'\]\.includes\(projectStatus\)/);
    assert.match(serverSource, /\['hidden', 'under_construction', 'demo', 'ready'\]/);
});
