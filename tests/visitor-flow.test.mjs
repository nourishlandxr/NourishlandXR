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
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
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
    assert.doesNotMatch(app.innerHTML, /Using a suitable device/);
    assert.ok(app.innerHTML.indexOf('welcome-complementary-grid') > app.innerHTML.indexOf('role-grid'));
    assert.doesNotMatch(app.innerHTML, /assets\/herov2\.png/);
    assert.match(styles, /\.intro-launch \.role-grid \{ grid-template-columns:repeat\(2/);
    assert.match(styles, /\.welcome-complementary-grid \{[\s\S]*?grid-template-columns:\s*repeat\(2/);
    assert.match(styles, /body:has\(\.intro-launch\) #app \{[\s\S]*?padding: max\(10px, env\(safe-area-inset-top\)\)/);
    assert.match(styles, /\.intro-launch \.role-grid,[\s\S]*?\.intro-launch \.welcome-complementary-grid \{ gap:6px;/);
    assert.match(styles, /\.intro-launch \.platform-landing-nav \{ display:grid; grid-template-columns:repeat\(2/);
    assert.match(styles, /body:has\(\.intro-launch\) \.collaboration-credit \{ display:none; \}/);
});

test('About This Tool explains the concept without tutorial instructions', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const aboutStart = source.indexOf("if (feature === 'About This Tool')");
    const aboutEnd = source.indexOf("if (feature === 'Help Guide')", aboutStart);
    const aboutSource = source.slice(aboutStart, aboutEnd);
    assert.match(aboutSource, /What is NourishlandXR\?/);
    assert.match(aboutSource, /place-based tool that connects information directly to real environments/);
    assert.match(aboutSource, /How it works/);
    assert.match(aboutSource, /Using the tool/);
    assert.match(aboutSource, /Using a suitable device/);
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
    const printCenterSource = fs.readFileSync(path.join(root, 'app/screens/printCenter.js'), 'utf8');
    const analogExplorerSource = fs.readFileSync(path.join(root, 'app/screens/analogExplorer.js'), 'utf8');
    const fieldGuideSource = fs.readFileSync(path.join(root, 'app/screens/fieldGuide.js'), 'utf8');
    assert.match(entrySource, /class="global-ar-action dashboard-open-ar ar-square-action"/);
    assert.match(entrySource, />AR</);
    assert.match(styles, /\.dashboard-open-ar[\s\S]{0,500}width:104px !important/);
    assert.match(styles, /\.project-entry \.project-areas-section \.section-heading-row h2,[\s\S]{0,260}\.project-entry \.project-status \.section-heading-row h2/);
    assert.doesNotMatch(entrySource, /Journey Bag|Unplaced Bag/);
    assert.doesNotMatch(entrySource, /Add Starting Point/);
    assert.doesNotMatch(entrySource, />\+ CREATE AREA</);
    assert.doesNotMatch(entrySource, /Home Base/);
    assert.match(entrySource, /PROJECT OVERVIEW/);
    assert.match(entrySource, /project-area-overview-card/);
    assert.match(entrySource, /living-map-progress/);
    assert.match(entrySource, /growth\.starterActions\.map/);
    assert.match(entrySource, /Why begin here\?/);
    assert.doesNotMatch(entrySource, /See your knowledge come alive in the place it belongs/);
    assert.match(entrySource, /toggleProjectLayoutInfo/);
    assert.match(entrySource, /class="areas-heading-actions"/);
    assert.match(entrySource, /class="project-layout-info"/);
    assert.doesNotMatch(entrySource, /<div class="project-layout-info-row">/);
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
    assert.match(entrySource, /'CONTENT'/);
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
    assert.match(entrySource, /class="global-ar-action dashboard-open-ar ar-square-action"/);
    assert.match(entrySource, />AR</);
    assert.doesNotMatch(entrySource, /Journey Bag|Unplaced Bag/);
    assert.doesNotMatch(entrySource, />Quick Access</);
    assert.doesNotMatch(entrySource, /Add content to this location/);
    assert.doesNotMatch(entrySource, /<strong>Add \$\{item\.label\}<\/strong>/);
    assert.match(entrySource, /project-areas-section|project-area-overview-copy/);
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
    assert.match(entrySource, /dashboard-frame/);
    assert.match(entrySource, /dashboard-frame-kicker/);
    assert.doesNotMatch(entrySource, /dashboard-frame-title.*Project overview/);
    assert.match(source, /label: 'Printing options'/);
    assert.match(source, /collapseRecentlyAdded/);
    assert.match(source, /placedEntries\.slice\(0, 10\)/);
    assert.match(source, /Open detailed log/);
    assert.match(source, /window\.renderPrintCenter/);
    assert.match(printCenterSource, /Print anchors/);
    assert.match(printCenterSource, /Plant Live Tags/);
    assert.match(printCenterSource, /Totem Marker tags/);
    assert.match(printCenterSource, /Plant lists/);
    assert.match(printCenterSource, /Plant profiles/);
    assert.match(printCenterSource, /window\.renderLocationMap/);
    assert.doesNotMatch(analogExplorerSource, /analog-print-button/);
    assert.match(fieldGuideSource, /analog-print-button.*remove/);
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

test('Create and Manage opens saved projects while Content belongs to the project dashboard', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    const fieldGuideSource = fs.readFileSync(path.join(root, 'app/screens/fieldGuide.js'), 'utf8');
    assert.match(dashboardSource, /<h1>Home<\/h1>/);
    assert.match(dashboardSource, /project-selection-list/);
    assert.match(dashboardSource, /window\.renderProjectDashboard/);
    assert.match(dashboardSource, /window\.renderProjectForm/);
    assert.doesNotMatch(dashboardSource, /export async function renderWebHubHome/);
    assert.doesNotMatch(mainSource, /window\.renderWebHubHome/);
    assert.match(dashboardSource, /<strong>Content<\/strong>/);
    assert.match(fieldGuideSource, /const guideTitle = creator \? 'Content' : 'Field Guide'/);
    assert.match(fieldGuideSource, /loadSitePlaces\(project\.id, site\.id\)\.catch\(\(\) => \[\]\)/);
    assert.doesNotMatch(fieldGuideSource, /WEB HUB LOCATION/);
    assert.doesNotMatch(fieldGuideSource, /ADD TO WEB HUB/);
    assert.match(fieldGuideSource, /currentGuidePlaceId = '';/);
    assert.match(fieldGuideSource, /applyFieldGuideFilter\(''\)/);
    assert.match(fieldGuideSource, /field-guide-essentials/);
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    assert.match(styles, /\.field-guide-tool \.field-guide-essentials \{[\s\S]*grid-template-columns:minmax\(145px,auto\) minmax\(0,1fr\)/);
    assert.match(styles, /\.field-guide-tool \.field-guide-summary > span \{[\s\S]*display:flex[\s\S]*min-height:32px/);
    assert.match(styles, /\.field-guide-tool \.field-guide-map-action \{[\s\S]*min-height:32px/);
    assert.match(fieldGuideSource, /field-guide-primary-actions/);
    assert.match(fieldGuideSource, /applyCreatorContentCopy/);
    assert.match(fieldGuideSource, /const creationBoard = ''/);
    assert.match(fieldGuideSource, /field-guide-dashboard-nav/);
    assert.match(fieldGuideSource, /field-guide-all-plants/);
    assert.doesNotMatch(fieldGuideSource, /<summary>Results<\/summary>/);
    assert.match(fieldGuideSource, /app\.querySelector\('#fieldGuideCount'\)\?\.remove\(\)/);
    assert.match(fieldGuideSource, /searchGlobalPlants/);
    assert.doesNotMatch(fieldGuideSource, /data-field-guide-scope-button="global"/);
    assert.doesNotMatch(fieldGuideSource, /data-field-guide-scope-button="local"/);
    assert.match(fieldGuideSource, /field-guide-global-legend-local/);
    assert.match(fieldGuideSource, /data-field-guide-tone-filter="local"/);
    assert.match(fieldGuideSource, /data-field-guide-search-tone="local"/);
    assert.match(fieldGuideSource, /plantCapabilityMarkup/);
    assert.doesNotMatch(fieldGuideSource, /Scientific name not entered/);
    assert.match(fieldGuideSource, /applyFieldGuideFilter\(currentGuidePlaceId\);\s*searchGlobal\(event\.target\.value\)/);
    assert.doesNotMatch(fieldGuideSource, /Your garden quest|Explore your garden|Bring the garden to life/);
    assert.doesNotMatch(fieldGuideSource, /CHOOSE YOUR NEXT PATCH|DISCOVER SOMETHING NEW/);
    assert.match(fieldGuideSource, /field-guide-area-grid/);
    assert.match(fieldGuideSource, /orderedPlaces\.map/);
    assert.match(fieldGuideSource, /data-field-guide-area/);
    assert.match(fieldGuideSource, /is-home-area/);
    assert.match(fieldGuideSource, /field-guide-plant-search/);
    assert.match(fieldGuideSource, /Plant Search/);
    assert.match(fieldGuideSource, /field-guide-search-input/);
    assert.doesNotMatch(fieldGuideSource, /Knowledge records/);
    assert.match(fieldGuideSource, /field-guide-area-help/);
    assert.match(fieldGuideSource, /is-search-match/);
    assert.match(fieldGuideSource, /field-guide-hub-redesign/);
    assert.match(fieldGuideSource, /field-guide-spatial-setup/);
    assert.match(fieldGuideSource, /field-guide-dashboard-nav/);
    assert.match(fieldGuideSource, /field-guide-management-row/);
    assert.doesNotMatch(fieldGuideSource, /Map · \$\{placedCount\} elements · \$\{guide\.totems\.length\} totems · \$\{anchoredCount\} anchors/);
    assert.match(fieldGuideSource, /field-guide-view-all/);
    assert.match(fieldGuideSource, /Plant Live Tags/);
    assert.match(fieldGuideSource, /Live · \$\{physicalMarkerLabel\(plant\.physicalAnchor\.markerId\)\}/);
    assert.match(fieldGuideSource, /physicalAnchor\?\.enabled/);
    assert.match(dashboardSource, /virtual_tag_enabled/);
    assert.match(dashboardSource, /Physical marker link/);
    assert.match(dashboardSource, /PRINT PLANT LIVE TAG/);
    assert.doesNotMatch(fieldGuideSource, /Add an unassigned Plant to Home/);
    assert.doesNotMatch(fieldGuideSource, /Create a separate real-world zone/);
    assert.doesNotMatch(fieldGuideSource, /field-guide-add-plant/);
    assert.match(fieldGuideSource, /<strong>Map<\/strong>/);
    assert.match(fieldGuideSource, /aria-current="page"><span aria-hidden="true">☰<\/span> Content/);
});

test('Content workspace keeps a compact mobile grid and expands into desktop columns', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/fieldGuide.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    assert.match(source, /field-guide-hub-redesign/);
    assert.match(source, /const creationBoard = ''/);
    assert.match(source, /Spatial setup/);
    assert.match(source, /field-guide-management-row-content/);
    assert.match(source, /Coming later/);
    assert.doesNotMatch(source, /field-guide-spatial-summary/);
    assert.match(styles, /\.field-guide-hub-redesign \{[\s\S]*width: calc\(100% \+ 32px\)/);
    assert.match(styles, /\.field-guide-hub-redesign \.field-guide-primary-actions \.field-guide-creation-actions[\s\S]*display: grid/);
    assert.match(styles, /@media \(min-width: 760px\)[\s\S]*grid-template-columns: minmax\(0, 1\.15fr\) minmax\(300px, \.85fr\)/);
    assert.match(styles, /\.field-guide-hub-redesign \.field-guide-map-action::before[\s\S]*content: none/);
    assert.match(styles, /\.field-guide-hub-redesign \.field-guide-plant-grid\[hidden\][\s\S]*display: none !important/);
    assert.match(styles, /\.field-guide-hub-redesign \.field-guide-global-result[\s\S]*grid-template-columns: 44px minmax\(0, 1fr\) auto/);
    assert.match(styles, /@media \(max-width: 380px\)[\s\S]*\.field-guide-hub-redesign \.field-guide-global-result[\s\S]*grid-template-columns: 44px minmax\(0, 1fr\)/);
    assert.match(styles, /\.field-guide-global-legend-local \{ background:#e4f0ff;/);
    assert.match(styles, /\.field-guide-hub-redesign \.field-guide-global-match-legend \{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(150px, 1fr\)\)/);
    assert.match(styles, /\.field-guide-hub-redesign \[data-field-guide-plant\]\[hidden\][\s\S]*display: none !important/);
});

test('creator dashboard frame stays inside the viewport with a simple border', () => {
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    assert.match(styles, /body:has\(\.project-entry\) #app \{[\s\S]*?overflow-x:hidden;/);
    assert.match(styles, /\.project-entry \.dashboard-frame \{[\s\S]*?max-width:100%;[\s\S]*?overflow:hidden;[\s\S]*?border:1px solid rgba\(43,78,52/);
    assert.match(styles, /\.project-entry \.dashboard-frame::before,[\s\S]*?display:none;/);
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
    const siteManagerSource = fs.readFileSync(path.join(root, 'app/managers/siteManager.js'), 'utf8');
    const persistenceSource = fs.readFileSync(path.join(root, 'app/services/persistence.js'), 'utf8');
    assert.match(mainSource, /window\.renderProjectDashboard\(encodeURIComponent\(created\.id\)\)/);
    assert.doesNotMatch(mainSource, /window\.renderProjectHome\(encodeURIComponent\(created\.id\)\)/);
    assert.match(siteManagerSource, /await ensureDefaultHomeAreas\(createdProject\.id\)/);
    assert.match(persistenceSource, /export async function ensureDefaultHomeArea\(projectId, siteId\)/);
    assert.match(persistenceSource, /places\.find\(isDefaultHomeArea\)/);
    assert.match(persistenceSource, /name: DEFAULT_HOME_AREA_NAME/);
    assert.match(persistenceSource, /if \(!sites\.length\)/);
    assert.match(persistenceSource, /createProjectSite\(projectId, AR_EXPERIENCE_CONFIG\.defaultSite\)/);
    assert.match(persistenceSource, /ensureDefaultPigeonPea\(projectId, sites\[0\]\.id, homes\[0\]\)/);
    assert.match(persistenceSource, /PIGEON_PEA_TEMPLATE_ID/);
    assert.match(persistenceSource, /createPigeonPeaTemplateProfile/);
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
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    const helperSource = dashboardSource.slice(
        dashboardSource.indexOf('export async function openProjectAreaAr'),
        dashboardSource.indexOf('export async function renderProjectAreaDashboard')
    );
    const areaDashboardSource = dashboardSource.slice(
        dashboardSource.indexOf('export async function renderProjectAreaDashboard'),
        dashboardSource.indexOf('export async function renderProjectAreaLocationForm')
    );
    assert.match(helperSource, /started = await window\.startArMode\?\.\(projectId, areaId, checkpointId, initialPlacementType, '', 'dashboard'\)/);
    assert.match(helperSource, /if \(started\) return true;\s*await renderProjectAreaDashboard\(app, encoded\(projectId\), encoded\(areaId\)\);[\s\S]*projectAreaArStatus[\s\S]*AR could not start\. If camera access was denied[\s\S]*return false;/);
    assert.match(mainSource, /window\.openProjectAreaAr = \(projectId, areaId, checkpointId = '', initialPlacementType = ''\) => openProjectAreaAr\(app, projectId, areaId, checkpointId, initialPlacementType\)/);
    assert.match(dashboardSource, /action: `window\.renderProjectAreaForm/);
    assert.match(dashboardSource, /action: `window\.renderLocationFieldMarker/);
    assert.match(areaDashboardSource, /<button class="global-ar-action area-go-ar-compact"[^>]*>AR<\/button>/);
    assert.match(areaDashboardSource, /projectBreadcrumbMarkup\(context\.project, context\.area\)/);
    assert.match(areaDashboardSource, /Area dashboard/);
    assert.match(areaDashboardSource, /const canonicalAreaEntries = areaEntries\.filter/);
    assert.match(areaDashboardSource, /<section class="area-totem-section"/);
    assert.match(areaDashboardSource, /Markers in this Area/);
    assert.match(dashboardSource, /Home \$\{project\.name\}/);
    assert.match(styles, /creator-ar-location-note-board\.creator-ar-totem-balloon[\s\S]*width:min\(58vw,320px\)[\s\S]*border-radius:28px 28px 28px 12px !important/);
    assert.match(styles, /\.area-go-ar-compact[\s\S]*width:58px[\s\S]*height:58px/);
    assert.doesNotMatch(styles, /BONUS PATH/);
    assert.match(dashboardSource, /is-totem-entry/);
    assert.doesNotMatch(areaDashboardSource, /window\.openProjectAreaAr\([\s\S]*area_checkpoint[\s\S]*>AR/);
    assert.match(areaDashboardSource, /totem-stat-grid/);
    assert.match(areaDashboardSource, /TEXT BALLOONS/);
    assert.match(areaDashboardSource, /LINKED/);
    assert.match(areaDashboardSource, /ANCHORED/);
    assert.match(areaDashboardSource, /DEFAULT HOME FOR CONTENT/);
    assert.match(areaDashboardSource, /data-area-about-info/);
    assert.match(areaDashboardSource, /id="projectAreaArStatus" class="meta" aria-live="polite"/);
    assert.match(areaDashboardSource, /encoded\(checkpoint\?\.marker\.id/);
    assert.match(areaDashboardSource, /areaEntryPresentation\(markerType, plantProfile\)/);
    assert.match(areaDashboardSource, /data-marker-type="\$\{escapeHtml\(markerType\)\}"/);
    assert.match(areaDashboardSource, /area-entry-icon/);
    assert.match(styles, /\.area-content-grid/);
    assert.match(styles, /\.area-content-card\.is-plant/);
    assert.match(styles, /\.area-content-card\.is-note/);
    assert.match(styles, /\.project-entry \.dashboard-frame > \.tutorial-spotlight-callout/);
    assert.match(styles, /\.tutorial-spotlight-projectTutorial \{ top:50%/);
});

test('Area dashboards use selectable icons and keep summary counts in the profile card', () => {
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    const configSource = fs.readFileSync(path.join(root, 'app/services/arExperienceConfig.js'), 'utf8');
    const fieldGuideSource = fs.readFileSync(path.join(root, 'app/screens/fieldGuide.js'), 'utf8');
    const entrySource = fs.readFileSync(path.join(root, 'app/components/projectEntry.js'), 'utf8');
    assert.match(configSource, /AREA_ICON_OPTIONS/);
    assert.match(configSource, /value: '▧'/);
    assert.match(configSource, /label: 'Zone'/);
    assert.doesNotMatch(configSource, /label: 'Leaves'/);
    assert.doesNotMatch(configSource, /label: 'Tree'/);
    assert.match(dashboardSource, /data-edit-area-icon/);
    assert.match(dashboardSource, /id="areaIcon"/);
    assert.match(dashboardSource, /icon\n?\s*\}/);
    assert.doesNotMatch(dashboardSource, /OPEN AREA IN AR<\/button><span>\$\{plantCount\}/);
    assert.match(fieldGuideSource, /areaIcon\(place\)/);
    assert.match(entrySource, /dashboardIcon\('area'\)/);
    assert.match(dashboardSource, /icon: 'settings'/);
    assert.match(dashboardSource, /icon: 'adjustments'/);
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
    assert.match(source, /markerType === 'note' \? 'Title' : 'Name'/);
    assert.match(source, /for="fieldDescription">Information<\/label>/);
    assert.match(source, /description,/);
    assert.match(source, /Not yet placed · can be placed later/);
    assert.doesNotMatch(source, /<label>Project<\/label>/);
    assert.doesNotMatch(source, /<label>Location<\/label>/);
    assert.doesNotMatch(source, /<label>Site<\/label>/);
    assert.doesNotMatch(source, /<label>Marker Type<\/label>/);
});

test('Try It Now guides two Plants, an in-place Note and a final Totem example', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/temporaryArDemo.js'), 'utf8');
    const webxrSource = fs.readFileSync(path.join(root, 'app/services/webxrSession.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'app/style.css'), 'utf8');
    assert.match(source, /placementPointerMarkup\(''\)/);
    assert.doesNotMatch(source, /works like a game/);
    assert.match(source, /To do so ,use the round pointer that will appear on your screen/);
    assert.match(source, /Press the aiming circle to place the example Plant orb/);
    assert.doesNotMatch(source, /CREATE A PLANT ORB|Show aim/);
    assert.match(source, /const DEMO_SEQUENCE = \['plant', 'plant2', 'note', 'totem'\]/);
    assert.doesNotMatch(source, /Every place holds more than we first see/);
    assert.doesNotMatch(source, /Area · Citrus Guild/);
    assert.match(source, /function createSpatialKnowledgeTexture/);
    assert.match(source, /record\.demoExpanded/);
    assert.match(source, /'Add a Note'/);
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
    assert.match(source, /function cycleDemoNoteTemplate\(record\)/);
    assert.match(source, /record\.demoExpanded = false/);
    assert.match(source, /function createDemoTotemExample\(\)/);
    assert.match(source, /Each Totem represents an Area/);
    assert.match(source, /function createDemoSecondTotem\(\)/);
    assert.match(source, /const DEMO_TOTEM_STYLES/);
    assert.match(source, /function cycleDemoTotemStyle\(record\)/);
    assert.match(source, /demoLinkVisible: true/);
    assert.match(source, /LINKED AREAS/);
    assert.match(source, /if \(record\.tutorialStage === 'plant2'\) showDemoAction\('note'\)/);
    assert.match(styles, /\.tryit-sim-totem-model-toggle/);
    assert.match(styles, /\.tryit-sim-area-link-line/);
    assert.doesNotMatch(source, /Name your Plant|Plant name<input/);
    assert.doesNotMatch(source, /runKnowledgeTour/);
    assert.match(source, /Select a cell to expand its connected knowledge/);
    assert.match(source, /navigator\.vibrate/);
    assert.doesNotMatch(source, /tryit-panel/);
    assert.doesNotMatch(styles, /\.tryit-sim-plant-tether/);
    assert.match(source, /function placeMarker/);
    assert.match(source, /function createMarkerTexture/);
    assert.doesNotMatch(source, /Loading Dashboard|Place Your Dashboard|draggable-window/);
    assert.match(webxrSource, /isSessionSupported\('immersive-ar'\)/);
    assert.match(source, /makeXRCompatible/);
    assert.match(source, /new XRWebGLLayer/);
    assert.match(source, /requestAnimationFrame\(draw\)/);
    assert.match(webxrSource, /requiredFeatures: \['hit-test'\], optionalFeatures: \['dom-overlay', 'local-floor'\]/);
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
    assert.match(form, /Every new project includes a complete Pigeon Pea example plant in Home/);
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
    assert.match(dashboard, /STARTER PLANT TEMPLATE/);
    assert.match(dashboard, /Open Plant Profile/);
    assert.match(dashboard, /type="file" accept="image\/\*"/);
    assert.match(dashboard, /projectEntryPhotoData/);
    assert.match(dashboard, /showIdentity: false/);
    assert.doesNotMatch(dashboard, /areaMarkerLayerFilter/);
    assert.match(dashboard, /data-area-marker-filter-toggle/);
    assert.match(dashboard, /areaFilterFieldset\('layer'/);
    assert.match(dashboard, /areaFilterFieldset\('climate'/);
    assert.match(dashboard, /areaFilterFieldset\('type'/);
    assert.match(dashboard, /plantProfile\?\.photo/);
    assert.match(dashboard, /isAreaTotemMarker\(entry\.marker, entry\.place\?\.name\)/);
    assert.match(dashboard, /plantPhysicalMarkerHelp/);
    assert.match(dashboard, /plantLiveTagHelp/);
});

test('new projects separate guided tutorial choice from advanced controls', () => {
    const formSource = fs.readFileSync(path.join(root, 'app/components/siteForm.js'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'app/main.js'), 'utf8');
    const dashboardSource = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    assert.match(formSource, /<strong>Include guided tutorial<\/strong>/);
    assert.match(formSource, /<strong>Show advanced controls<\/strong>/);
    assert.match(formSource, /<details class="project-advanced-options">/);
    assert.match(formSource, /<summary>Advanced options<\/summary>/);
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
