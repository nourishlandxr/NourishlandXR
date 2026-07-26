import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { renderProjectEntry } from '../app/components/projectEntry.js';
import { renderLaunchScreen } from '../app/screens/launch.js';

const root = path.resolve(import.meta.dirname, '..');

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
    assert.match(source, />Start AR Mode</);
    assert.match(source, />Go Back</);
});

test('creator dashboard prioritizes Areas and Open AR while optional features stay quiet', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const entrySource = fs.readFileSync(path.join(root, 'app/components/projectEntry.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    assert.match(entrySource, />OPEN AR</);
    assert.doesNotMatch(entrySource, /Journey Bag|Unplaced Bag/);
    assert.doesNotMatch(entrySource, /Add Starting Point/);
    assert.match(entrySource, />\+ CREATE AREA</);
    assert.match(entrySource, /config\.createAreaAction \|\| ''/);
    assert.match(entrySource, /Home Base/);
    assert.match(entrySource, /Trail Entrance/);
    assert.match(entrySource, /living-map-progress/);
    assert.match(entrySource, /escapeAttribute\(growth\.nextDescription\)/);
    assert.match(entrySource, /growth\.optionalFeature\.showHome/);
    assert.match(entrySource, /growth\.optionalFeature\.showTrail/);
    assert.doesNotMatch(entrySource, /Choose what to add and where it belongs/);
    assert.doesNotMatch(entrySource, /dashboard-vital-notice/);
    assert.ok(entrySource.indexOf('dashboard-location-footer') > entrySource.indexOf('latest-entries-section'));
    assert.match(styles, /\.dashboard-ar-path \{ display: grid; grid-template-columns:/);
    assert.doesNotMatch(entrySource, />Work Mode</);
    assert.doesNotMatch(entrySource, />Quick Access</);
    assert.match(source, /openArAction/);
    assert.match(source, /addUnplacedAction/);
    assert.match(source, /renderContentMode/);
    assert.match(source, /Field Guide/);
    assert.match(source, /Stories &amp; Checkpoints/);
    assert.match(source, /Organizer Folder/);
    assert.match(source, /Add without AR/);
    assert.match(source, /Stories and Focus Elements/);
    assert.match(source, /Project Settings/);
    assert.match(source, /Home & Entrances/);
    assert.match(source, /Optional Home Base and guided Trail Entrance features/);
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
    assert.match(entrySource, /dashboard-identity/);
    assert.doesNotMatch(entrySource, /dashboard-introduction/);
    assert.match(entrySource, /tutorial-spotlight-callout/);
    assert.match(entrySource, /tutorial-spotlight-shield/);
    assert.match(entrySource, /contextual-guidance/);
    assert.match(entrySource, /First-use guidance/);
    assert.match(entrySource, /Skip this step/);
    assert.match(entrySource, />See all</);
    assert.match(entrySource, /No entries have been added yet/);
    assert.match(entrySource, />Date</);
    assert.match(entrySource, />Added by</);
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
    assert.match(dashboardHtml, /onclick="window\.createArea\(\)">\+ CREATE AREA/);
    assert.doesNotMatch(dashboardHtml, /onclick="undefined"/);
});

test('fresh projects begin with a simple Area and can place its Totem now or later', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    assert.match(mainSource, /window\.renderProjectDashboard\(encodeURIComponent\(created\.id\)\)/);
    assert.match(dashboardSource, /Your space is ready to grow/);
    assert.match(dashboardSource, /CREATE YOUR FIRST AREA/);
    assert.match(dashboardSource, /Name your Area/);
    assert.match(dashboardSource, /Area \$\{nextAreaNumber\}/);
    assert.match(dashboardSource, /Examples: Orchard · Vegetable Garden · Creek Bank · Front Bed/);
    assert.match(dashboardSource, /data-area-next="later"/);
    assert.match(dashboardSource, /Create now, place later/);
    assert.match(dashboardSource, /data-area-next="place"/);
    assert.match(dashboardSource, /Place its Totem in AR/);
    assert.match(dashboardSource, /event\.submitter\?\.dataset\.areaNext === 'place'/);
    assert.match(dashboardSource, /await window\.startArMode\(projectId, area\.id, '', 'area_checkpoint', '', intent\)/);
    assert.match(dashboardSource, /if \(started\) return/);
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
    assert.match(dashboardSource, /A Home Base is simply a reference to your main Area/);
    assert.match(dashboardSource, /A Trail Entrance belongs to the Area where a guided journey begins/);
    assert.match(dashboardSource, /area_explained/);
    assert.match(dashboardSource, /first_area_created_or_selected/);
    assert.match(dashboardSource, /meaningful section inside a Location/);
    assert.match(dashboardSource, /placedTotemAreaIds/);
    assert.match(dashboardSource, /missingTotemArea/);
    assert.match(dashboardSource, /allAreasHavePlacedTotems/);
    assert.match(dashboardSource, /effectiveMarkerType/);
    assert.match(dashboardSource, /const homeArea = areas\.find/);
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
    assert.match(dashboardSource, /action: `window\.openProjectAreaAr\('\$\{encoded\(project\.id\)\}', '\$\{encoded\(missingTotemArea\.id\)\}', '', 'area_checkpoint'\)`/);
    assert.match(dashboardSource, /action: `window\.openProjectAreaAr\('\$\{encoded\(project\.id\)\}', '\$\{encoded\(firstArea\.id\)\}'\)`/);
    assert.match(areaDashboardSource, /onclick="window\.openProjectAreaAr\('\$\{encoded\(context\.project\.id\)\}', '\$\{encoded\(context\.area\.id\)\}', '\$\{encoded\(checkpoint\.marker\.id\)\}'\)">Open this Area in AR/);
    assert.match(areaDashboardSource, /onclick="window\.openProjectAreaAr\('\$\{encoded\(context\.project\.id\)\}', '\$\{encoded\(context\.area\.id\)\}', '', 'area_checkpoint'\)">Place its Totem in AR/);
    assert.match(areaDashboardSource, /id="projectAreaArStatus" class="meta" aria-live="polite"/);
    assert.doesNotMatch(areaDashboardSource, /onclick="window\.startArMode\([^)]*\)">(?:Open this Area in AR|Place its Totem in AR)/);
});

test('Organizer Folder excludes compatibility Area Totems by semantic type', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const unplacedSource = dashboardSource.slice(
        dashboardSource.indexOf('export async function renderUnplacedContent'),
        dashboardSource.indexOf('export async function renderStoriesAndFocus')
    );
    assert.match(unplacedSource, /\['plant', 'note', 'sub_checkpoint'\]\.includes\(effectiveMarkerType\(entry\.marker\)\)/);
    assert.match(unplacedSource, /const markerType = effectiveMarkerType\(marker\)/);
    assert.doesNotMatch(unplacedSource, /\.includes\(entry\.marker\.type\)/);
});

test('quick access creation is minimal and separates Area assignment from placement', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/fieldMarker.js'), 'utf8');
    assert.match(source, /<label for="fieldArea">Area<\/label>/);
    assert.match(source, /Find a plant/);
    assert.match(source, /Unassigned — decide later/);
    assert.match(source, /Create a new Area/);
    assert.match(source, /Placement status:<\/strong> Not yet placed/);
    assert.doesNotMatch(source, /<label>Project<\/label>/);
    assert.doesNotMatch(source, /<label>Location<\/label>/);
    assert.doesNotMatch(source, /<label>Site<\/label>/);
    assert.doesNotMatch(source, /<label>Marker Type<\/label>/);
});

test('temporary AR demo guides three Marker purposes without saving', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/temporaryArDemo.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    assert.match(source, /Place a Marker/);
    assert.doesNotMatch(source, /works like a game/);
    assert.match(source, /place three simple Markers/i);
    assert.match(source, /const DEMO_SEQUENCE = \['plant', 'note', 'zone'\]/);
    assert.doesNotMatch(source, /Every place holds more than we first see/);
    assert.match(source, /Area · Citrus Guild/);
    assert.match(source, /function createSpatialKnowledgeTexture/);
    assert.match(source, /record\.demoExpanded/);
    assert.match(source, /See how Areas work/);
    assert.match(source, /markers\.length >= 3/);
    assert.match(source, /createMinimalMarkerDraft/);
    assert.match(source, /relateMinimalMarkers/);
    assert.match(source, /Use Lemon Myrtle preset/);
    assert.match(source, /createBoundaryTexture/);
    assert.match(styles, /tryit-sim-marker-zone\.is-expanded::before/);
    assert.match(source, /Search plant presets<input value="Lemon Myrtle" readonly>/);
    assert.doesNotMatch(source, /tryit-panel/);
    assert.match(styles, /\.tryit-demo\.is-immersive \.tryit-sim-marker \{ display: none !important;/);
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
    assert.match(source, /spatialPosition\(hitMatrix, viewerMatrix/);
    assert.doesNotMatch(source, /persistence|apiFetch|fetch\(/);
});

test('new location asks only for core details and supported templates', () => {
    const form = fs.readFileSync(path.join(root, 'app/components/siteForm.js'), 'utf8');
    const templates = fs.readFileSync(path.join(root, 'app/templates/projectTemplates.js'), 'utf8');
    const sites = fs.readFileSync(path.join(root, 'app/screens/sites.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    assert.match(form, /Location name/);
    assert.match(form, /Description \(optional\)/);
    assert.match(form, /projectTemplate/);
    assert.doesNotMatch(form, /projectCoverImage|Suggested Locations/);
    for (const label of ['Blank', 'Food Forest', 'Native Forest', 'Orchard', 'Home Garden', 'Kitchen Garden', 'Plant Nursery', 'Stock Inventory']) {
        assert.match(templates, new RegExp(label));
    }
    assert.match(form, /templateKey = 'empty'/);
    assert.match(sites, /let selectedTemplate = 'empty'/);
    assert.ok(templates.indexOf('empty:') < templates.indexOf('food_forest:'));
    assert.match(dashboard, /projectSettingsCoverImage/);
    assert.match(dashboard, /Cover image \(optional\)/);
});

test('new projects offer friendly mode by default and an explicit Expert Mode', () => {
    const formSource = fs.readFileSync(path.join(root, 'app/components/siteForm.js'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    assert.match(formSource, /<strong>Expert Mode<\/strong>/);
    assert.match(mainSource, /projectExpertMode'\)\?\.checked === true/);
    assert.match(mainSource, /restartProjectTutorial\(created\.id\)/);
    assert.match(mainSource, /if \(expertMode\) setProjectTutorialMode\(created\.id, false\)/);
    assert.match(dashboardSource, /const expertMode = project\.expertMode === true/);
    assert.match(dashboardSource, /setProjectTutorialMode\(projectId, !enabled\)/);
    assert.match(dashboardSource, /Show themes, technical guidance, diagnostics/);
    assert.match(dashboardSource, /if \(project\.expertMode === true\) return renderProjectDashboard/);
    assert.match(dashboardSource, /const growthJourney = project\.expertMode === true \? null/);
    assert.match(dashboardSource, /const guidance = project\.expertMode === true \? null/);
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
