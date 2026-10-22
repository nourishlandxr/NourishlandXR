using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed partial class NativeJourney
    {
        private IEnumerator MainMenuChecks(List<string> errors, Action<int> count)
        {
            int checks = 0;
            void Check(bool value, string message) { checks++; if (!value) errors.Add(message); }
            void Click(NativePanel source, string label)
            {
                var action = source.GetComponentsInChildren<KnowledgeAction>().FirstOrDefault(item => item.name == label);
                Check(action, "Missing menu action " + label); if (action) action.Activate();
            }
            ShowEntry(); yield return new WaitForSeconds(.6f);
            var names = navigation.GetComponentsInChildren<KnowledgeAction>().Select(action => action.name).Where(name => !name.StartsWith("Utility ")).OrderBy(name => name).ToArray();
            Check(names.SequenceEqual(new[] { "Create", "Developer", "Explore", "Settings", "Try the WebXR Introduction" }) && !demoActive && route == "entry", "Startup is not the shared-platform hub");
            Check(!includeTutorial && !tutorialThenDemo && !practiceMode, "Startup enables tutorial or immersion without a choice");
            var backdrop = sceneObjects.FirstOrDefault(item => item && item.GetComponent<NativeMenuShowcase>());
            Check(journal.hideMenuBackground || backdrop, "Startup XR background is missing");
            if (backdrop)
            {
                var display = backdrop.GetComponent<NativeMenuShowcase>(); float deadline = Time.realtimeSinceStartup + 40;
                while (!display.Ready && Time.realtimeSinceStartup < deadline) yield return null;
                Check(display.Ready, "Menu Living Frame or Moon Totem failed to load");
                Check(display.Peek && display.Peek.Ready && display.Peek.World.GetComponentsInChildren<Renderer>().Length > 0, "Menu Peek has no 3D artwork");
                Check(display.Frame.ApertureRadius > .75f && display.Peek.World && display.Peek.World.name.Contains("SunGarden"), "Showcase frame does not contain the Sun Garden");
                Check(display.Moon.transform.position.y < display.Frame.transform.position.y &&
                    Vector3.Distance(display.Moon.transform.position, display.Frame.transform.position) < 1.5f,
                    "Moon Totem is not directly below the Living Frame");
                Check(!display.GetComponentInChildren<SpatialKnowledgeMesh>(true) &&
                    !display.GetComponentInChildren<NativeLivingOrbVisual>(true), "PIMO or Orb remains in the startup identity display");
                Check(display.AssetsReady && display.Pavilion && display.Pavilion.name.Contains("Pavilion") && display.TabletopMap &&
                    display.TabletopMap.Data != null && display.TabletopMapInteractive && display.TabletopMapTargetCount > 0 && display.OakVisible &&
                    !display.ForestVisible && display.ForestTreeCount >= 12, "AR launch stage is missing its pavilion or oak/VR forest mode is wrong");
                var tableRenderers = display.Table ? display.Table.GetComponentsInChildren<Renderer>(true) : Array.Empty<Renderer>();
                float tableTop = tableRenderers.Length > 0 ? tableRenderers.Max(renderer => renderer.bounds.max.y) : float.PositiveInfinity;
                Check(display.TabletopMap && tableTop < Camera.main.transform.position.y - .35f &&
                    display.TabletopMap.transform.position.y > tableTop + .04f,
                    "Pavilion table hides the IMAP from the starting eye height");
                Check(!backdrop.GetComponentsInChildren<Collider>().Any(collider => collider.enabled && !collider.transform.IsChildOf(display.TabletopMap.transform)) &&
                    !backdrop.GetComponentsInChildren<KnowledgeAction>(true).Any(action => !action.transform.IsChildOf(display.TabletopMap.transform)) &&
                    !backdrop.GetComponentsInChildren<GrabTarget>(true).Any(), "Startup display has input targets outside the tabletop map");
                var camera = Camera.main; var head = camera.transform.position; var rotation = camera.transform.rotation;
                var fromFrameToUser = Vector3.ProjectOnPlane(head - display.Frame.transform.position, Vector3.up).normalized;
                Check(Vector3.ProjectOnPlane(head - backdrop.transform.position, Vector3.up).magnitude < .12f &&
                    Mathf.Abs((head.y - backdrop.transform.position.y) - 1.55f) < .18f,
                    "User does not start inside the centre of the pavilion");
                Check(Vector3.Dot(-display.Frame.transform.forward, fromFrameToUser) > .95f,
                    "Menu Peek frame is not facing the user in the circular composition");
                var displayPosition = backdrop.transform.position; var menuPosition = navigation.transform.position;
                float originalDistance = Vector3.Distance(head, menuPosition), originalSize = navigation.transform.localScale.x;
                camera.transform.position = Vector3.Lerp(head, menuPosition, .15f); camera.transform.Rotate(0, 25, 0); yield return null;
                float closerDistance = Vector3.Distance(camera.transform.position, menuPosition);
                Check(Vector3.Distance(backdrop.transform.position, displayPosition) < .001f && Vector3.Distance(navigation.transform.position, menuPosition) < .001f, "Walking or turning makes the menu display follow the viewer");
                Check(Mathf.Abs(navigation.transform.localScale.x / closerDistance - originalSize / originalDistance) < .01f, "Normal leaning changes the main menu's apparent proportions");
                camera.transform.position = display.Frame.transform.position - display.Frame.transform.forward * .35f; yield return null;
                Check(Vector3.Distance(backdrop.transform.position, displayPosition) < .001f && navigation.transform.localScale.x <= .438f, "Close inspection pulls the display or grows the menu without a bound");
                display.Peek.ApplyView(display.Peek.transform.TransformPoint(new Vector3(0, 0, .10f)), .08f);
                Check(display.Peek.Entry.Inside && display.Peek.World.gameObject.activeSelf, "Menu Peek disappears on head crossing");
                display.Peek.ApplyView(display.Peek.transform.TransformPoint(new Vector3(0, 0, -.10f)), .08f);
                Check(!display.Peek.Entry.Inside && display.Peek.Entry.MaskVisible, "Returning through menu Peek does not restore aperture masking");
                camera.transform.SetPositionAndRotation(head, rotation); yield return null;
            }
            foreach (var text in navigation.GetComponentsInChildren<TMPro.TextMeshPro>()) text.ForceMeshUpdate();
            Check(navigation.GetComponentsInChildren<TMPro.TextMeshPro>().All(text => text.textBounds.size.x <= text.rectTransform.sizeDelta.x + .01f && text.textBounds.size.y <= text.rectTransform.sizeDelta.y + .01f), "Main-menu text exceeds its bounds");
#if UNITY_EDITOR
            CaptureMainMenu();
            CapturePavilionImap();
#endif
            var utilityLayers = UnityEngine.Object.FindObjectsByType<OVRPassthroughLayer>(FindObjectsInactive.Include);
            var layerState = utilityLayers.Select(layer => layer.hidden).ToArray();
            var displayPose = backdrop ? backdrop.transform.position : Vector3.zero;
            Click(navigation, "Utility AR"); yield return null;
            Check(immersiveMode && immersiveEnvironment && utilityLayers.All(layer => layer.hidden), "VR utility does not hide passthrough");
            if (backdrop)
            {
                var display = backdrop.GetComponent<NativeMenuShowcase>();
                Check(!display.OakVisible && display.ForestVisible, "VR launch stage does not replace the AR oak with the fantasy forest");
            }
            Check(!backdrop || Vector3.Distance(backdrop.transform.position, displayPose) < .001f, "AR/VR switching moves the life-sized showcase");
            Click(navigation, "Utility VR"); yield return null;
            Check(!immersiveMode && !immersiveEnvironment && utilityLayers.Select(layer => layer.hidden).SequenceEqual(layerState), "AR utility fails to restore passthrough");
            if (backdrop)
            {
                var display = backdrop.GetComponent<NativeMenuShowcase>();
                Check(display.OakVisible && !display.ForestVisible, "Returning to AR does not restore the oak garden stage");
            }
            Click(navigation, "Utility ME"); yield return null;
            Check(route == "account" && !demoActive, "Account utility is unreachable");
            ShowEntry(); Click(navigation, "Utility INFO"); yield return null;
            Check(route == "disclaimer", "Disclaimer utility is unreachable");
            ShowEntry(); Click(navigation, "Utility ABOUT"); yield return null;
            Check(route == "about", "About utility is unreachable");
            ShowEntry(); Click(navigation, "Utility LANG"); yield return null;
            Check(route == "language" && panel.GetComponentsInChildren<KnowledgeAction>().Length == 4, "Language choices are missing");
            ShowEntry(); bool exitRequested = false; var originalExit = exitApplication;
            try
            {
                exitApplication = () => exitRequested = true;
                Click(navigation, "Utility EXIT"); yield return null;
                Check(route == "exit" && !exitRequested, "Exit utility quits before confirmation");
                Click(panel, "Exit application"); Check(exitRequested, "Confirmed Exit does not dispatch");
            }
            finally { exitApplication = originalExit; }
            ShowEntry();
            Click(navigation, "Explore"); yield return null;
            Check(route == "explore-menu" && entryMode == EntryMode.Run && !demoActive && !backdrop, "Explore retains startup scene or starts a demo");
            Check(panel.GetComponentsInChildren<KnowledgeAction>().Any(action => action.name == "Published projects"), "Explore has no real public-project entry");
            Click(navigation, "Utility AR"); yield return null;
            Check(immersiveMode && route == "explore-menu", "VR switch resets the current route");
            Home(); yield return null;
            Check(immersiveMode && immersiveEnvironment, "Main-menu return loses the selected VR background");
            MainSection(ExplorePage); Click(navigation, "Return to AR"); yield return null;
            Check(!immersiveMode && route == "entry" && utilityLayers.Select(layer => layer.hidden).SequenceEqual(layerState), "Return to AR fails to restore the room");
            Home(); yield return null;
            Check(route == "entry", "User Home does not return to the main menu");
            string dispatched = null; var browser = externalBrowser;
            try
            {
                externalBrowser = url => dispatched = url;
                Click(navigation, "Try the WebXR Introduction"); yield return null;
                Check(route == "web-introduction" && dispatched == null && !voice.Busy, "External introduction launches without an explicit choice or leaves narration running");
                Click(panel, "Open in browser"); yield return null;
                Check(dispatched == WebIntroductionUrl && route == "web-introduction" && !demoActive, "Introduction does not dispatch the external browser URL separately");
                externalBrowser = url => throw new InvalidOperationException("Synthetic launch failure");
                Click(panel, "Open in browser"); yield return null;
                Check(panel.GetComponentsInChildren<TMPro.TextMeshPro>().Any(text => text.text.Contains("Browser launch failed")), "Browser launch exception gives no feedback");
            }
            finally { externalBrowser = browser; }
            ShowEntry();
            BeginTest(); testPage = 3; DrawModeNavigation(); Click(navigation, "Native tutorials"); yield return null;
            Check(route == "tutorials-menu" && !voice.Busy, "Tutorials auto-starts a lesson");
            TutorialPicker(0); yield return null;
            Check(route == "tutorial-picker" && panel.GetComponentsInChildren<KnowledgeAction>().Any(action => action.name == "arrival"), "Tutorial lesson picker is not connected");
            Home(); testPage = 3; DrawModeNavigation(); Click(navigation, "Native demos"); yield return null;
            Check(route == "demos-menu" && !includeTutorial && !demoActive, "Demos ignores the default optional tutorial setting");
            Click(panel, "Start demo"); yield return null;
            Check(demoActive && route == "guided" && demoIndex == 0 && !tutorialThenDemo, "Starting without tutorial does not go directly to demo");
            Home(); MainSection(DemosPage); Click(panel, "Include tutorial: off"); Click(panel, "Start demo"); yield return null;
            Check(route == "tutorial" && tutorialThenDemo && !demoActive && lessonIndex == WelcomeStartIndex(), "Demo tutorial option does not enter the welcome first");
            Click(navigation, "Skip tutorial → Demo"); yield return null;
            Check(route == "guided" && demoActive && !tutorialThenDemo, "Skip tutorial does not begin the demo directly");
            Home(); MainSection(DemosPage); LaunchDemo(); yield return null;
            Tutorial(content.lessons.Length - 1); yield return null;
            Click(panel, "Skip this task"); yield return null;
            Check(route == "guided" && !tutorialThenDemo && demoActive, "Tutorial completion does not hand off to demo");
            ShowEntry(); includeTutorial = false;
            Click(navigation, "Settings"); yield return null;
            Check(route == "settings" && panel.GetComponentsInChildren<KnowledgeAction>().Any(action => action.name == "Preparation"), "Settings lacks the preparation entry");
            Click(panel, "Preparation"); yield return null;
            Check(route == "preparation" && preparationState && preparationState.text.Contains("unverified"), "Editor readiness falsely claims headset acceptance");
            Home(); Click(navigation, "Developer"); yield return null;
            Check(entryMode == EntryMode.Test && route == "home" && navigation.GetComponentsInChildren<KnowledgeAction>().Any(action => action.name == "Reset scene"), "Developer lost feature test/reset access");
            testPage = 4; DrawModeNavigation(); Click(navigation, "3D Peek"); yield return null;
            Check(route == "painting" && portal && portal.Ready, "Developer cannot open Peek directly");
            Click(navigation, "LIMO experiment"); yield return null;
            Check(route == "limo", "Developer LIMO entry opens the wrong experience");
            testPage = 2; DrawModeNavigation(); yield return null;
            Check(navigation.GetComponentsInChildren<KnowledgeAction>().Any(action => action.name == "Control Panel") && navigation.GetComponentsInChildren<KnowledgeAction>().Any(action => action.name == "VR practice"), "Developer lacks standalone panel or VR practice");
            Click(navigation, "Plant Orb"); yield return null;
            Check(route == "orb-test" && world.GetComponentsInChildren<NativePlantOrb>().Length == 1, "Developer cannot test the Orb independently");
            Click(navigation, "Living Frame"); yield return null;
            Check(route == "frame-test" && world.GetComponentInChildren<NativeLivingFrame>(), "Developer cannot test the Frame independently");
            PracticePage(); yield return null;
            // Inactive real SDK components exercise both initial hidden values without invoking a device overlay.
            var fixtureVisible = new GameObject("Menu fixture visible passthrough"); fixtureVisible.SetActive(false);
            var fixtureHidden = new GameObject("Menu fixture hidden passthrough"); fixtureHidden.SetActive(false);
            fixtureVisible.AddComponent<OVRPassthroughLayer>().hidden = false;
            fixtureHidden.AddComponent<OVRPassthroughLayer>().hidden = true;
            var layers = UnityEngine.Object.FindObjectsByType<OVRPassthroughLayer>(FindObjectsInactive.Include);
            var previous = layers.Select(layer => layer.hidden).ToArray();
            LaunchPractice(ControlPanelTest); yield return null; yield return null;
            Check(practiceMode && sceneObjects.Any(item => item && item.GetComponent<NativePracticeEnvironment>()?.Immersive == true), "VR practice does not create an immersive environment");
            Check(layers.All(layer => layer.hidden), "Immersive route does not hide the existing passthrough layers");
            Check(sceneObjects.Where(item => item && item.GetComponent<NativePracticeEnvironment>()).All(item => !item.GetComponentsInChildren<Collider>().Any(collider => collider.enabled)), "Decorative VR environment blocks sample pointers");
            Home(); yield return null;
            Check(!practiceMode && sceneObjects.Count == 0 && layers.Select(layer => layer.hidden).SequenceEqual(previous), "Leaving VR does not restore passthrough and release scenery");
            Destroy(fixtureVisible); Destroy(fixtureHidden); yield return null;
            ShowEntry(); Click(navigation, "Create"); yield return null;
            Check(route == "shared-create", "Create bypasses the native authorisation boundary");
            BeginTest(); testPage = 3; DrawModeNavigation(); Click(navigation, "Local draft Creator"); yield return null;
            Check(route == "create-menu" && panel.GetComponentsInChildren<TMPro.TextMeshPro>().Any(text => text.text.Contains("not published")), "Create hides its local-draft scope");
            int original = drafts.projects.Count;
            var project = drafts.Create("  Menu fixture  "); var area = drafts.AddArea(project, "Sample Area");
            var one = drafts.AddPlant(area, "cajanus-cajan"); var two = drafts.AddPlant(area, "cajanus-cajan");
            Check(project.name == "Menu fixture" && area.plants.Count == 2 && one.plantId == two.plantId && one.instanceId != two.instanceId, "Local creation merges specimens or loses the canonical plant profile");
            SaveSpecimenDetail(project, area, one, "  North bed plant  ", false);
            SaveSpecimenDetail(project, area, one, "  New leaves after rain.  ", true);
            Check(one.label == "North bed plant" && one.observation == "New leaves after rain." && string.IsNullOrEmpty(two.label), "Specimen details leak into another plant");
            var detailStore = PrototypeProjects.Load().projects.Single(item => item.id == project.id).areas.Single(item => item.id == area.id).plants.First();
            Check(detailStore.label == one.label && detailStore.observation == one.observation && detailStore.instanceId == one.instanceId, "Specimen details lose identity after reopen");
            AreaWorkspace(project, area); DraftExperiences(project, area); Click(panel, "Spatial Note"); Click(panel, "Spatial Note · added");
            Check(area.experiences.SequenceEqual(new[] { "note" }), "Adding the same experience duplicates the Area record");
            SaveAreaNote(project, area, "  Notice the new growth.  "); yield return null;
            Check(area.noteText == "Notice the new growth.", "Area Note editing loses supplied content");
            SaveChecklist(area, PortableChecklist.Create(project.id, project.siteId, area.id, "Observe plants", "Look at the new leaves."));
            var checklist = PortableChecklist.Parse(area.checklistJson); string checklistId = (string)checklist["id"];
            ((Newtonsoft.Json.Linq.JArray)checklist["steps"]).Add(PortableChecklist.Activity("Compare their shapes."));
            SaveChecklist(area, checklist);
            checklist = PortableChecklist.Parse(area.checklistJson);
            Check((long)checklist["revision"] == 2 && (string)checklist["id"] == checklistId && checklist["steps"].Count() == 2,
                "Checklist edits lose identity, revision or activities");
            ChecklistEditor(project, area); Click(panel, "Next activity"); Click(panel, "Activity tools"); Click(panel, "Move earlier");
            checklist = PortableChecklist.Parse(area.checklistJson);
            Check((string)checklist["steps"][0]["instructions"] == "Compare their shapes." && (long)checklist["revision"] == 3,
                "Checklist reordering loses content or monotonic revision");
            ChecklistEditor(project, area); Click(panel, "Preview"); Click(panel, "Done · next activity"); Click(panel, "Finish preview");
            Check(route == "draft-checklist" && area.checklistJson == checklist.ToString(), "Preview changes the authored checklist");
            ChecklistActivityTools(project, area, 0); Click(panel, "Plant references");
            Click(panel, "cajanus-cajan #1");
            checklist = PortableChecklist.Parse(area.checklistJson);
            Check((string)checklist["steps"][0]["contentRefs"][0]["id"] == one.instanceId, "Checklist reference loses specimen identity");
            ChecklistActivityTools(project, area, 1); Click(panel, "Remove activity…"); Click(panel, "Cancel");
            Check(PortableChecklist.Parse(area.checklistJson)["steps"].Count() == 2, "Cancel removes an activity");
            ChecklistActivityTools(project, area, 1); Click(panel, "Remove activity…"); Click(panel, "Remove activity");
            checklist = PortableChecklist.Parse(area.checklistJson);
            Check(checklist["steps"].Count() == 1 && (string)checklist["id"] == checklistId && (string)checklist["steps"][0]["contentRefs"][0]["id"] == one.instanceId,
                "Removal changes the remaining identity/reference");
            System.IO.File.WriteAllText(System.IO.Path.Combine(Application.dataPath, "../Evidence/native-checklist-export.json"), area.checklistJson);
            var exported = Newtonsoft.Json.Linq.JObject.Parse(ExportDraftJson(project));
            Check((string)exported["publication"] == "local-draft" && (string)exported["project"]["id"] == project.id &&
                (string)exported["project"]["areas"][0]["plants"][0]["instanceId"] == one.instanceId && (string)exported["project"]["areas"][0]["noteText"] == area.noteText,
                "Draft export loses identity/content or implies publication");
            var restored = PrototypeProjects.Load();
            Check(restored.projects.Single(item => item.id == project.id).areas.Single(item => item.id == area.id).plants.Count == 2, "Project/Area drafts do not survive disk round trip");
            Check(restored.projects.Single(item => item.id == project.id).areas.Single(item => item.id == area.id).noteText == area.noteText, "Area Note is lost after reopen");
            float beforeX = one.x;
            DraftSpecimen(project, area, one); Click(panel, "Move right 10 cm"); yield return null;
            Check(Mathf.Abs(one.x - beforeX - .1f) < .001f && one.instanceId != two.instanceId, "Inspector move merges specimen identity or loses placement");
            var moved = PrototypeProjects.Load().projects.Single(item => item.id == project.id).areas.Single(item => item.id == area.id).plants.Single(item => item.instanceId == one.instanceId);
            Check(Mathf.Abs(moved.x - one.x) < .001f, "Inspector move does not persist");
            DraftSpecimens(project, area, 0); Click(panel, "Undo last edit"); yield return null;
            Check(Mathf.Abs(one.x - beforeX) < .001f, "Inspector undo does not restore placement");
            DraftSpecimen(project, area, one); Click(panel, "Remove specimen…"); yield return null;
            Check(area.plants.Count == 2 && route == "draft-remove-specimen", "Removal occurs before confirmation");
            Click(panel, "Remove from Area"); yield return null;
            Check(area.plants.Count == 1 && area.plants[0].instanceId == two.instanceId, "Removal changes the wrong specimen");
            ChecklistLinkedContent(project, area, 0);
            Check(panel.GetComponentsInChildren<TMPro.TextMeshPro>().Any(text => text.text.Contains("Missing specimen")), "Deleted checklist specimen is silently replaced");
            DraftSpecimens(project, area, 0);
            Click(panel, "Undo last edit"); yield return null;
            Check(area.plants.Count == 2 && area.plants[0].instanceId == one.instanceId, "Removal undo loses the original specimen/order");
            Check(ChecklistReferenceLabel(area, PortableChecklist.Parse(area.checklistJson)["steps"][0]["contentRefs"][0]).Contains(one.instanceId), "Undo does not restore linked specimen resolution");
            Click(panel, "Redo last edit"); yield return null;
            Check(area.plants.Count == 1, "Removal redo is not available");
            Click(panel, "Undo last edit"); yield return null;
            DraftPlacementTools(project, area, one); Click(panel, "Rotate 15°"); Click(panel, "Resize +10%"); yield return null;
            Check(Mathf.Abs(one.yaw - 15) < .001f && Mathf.Abs(one.scale - 1.1f) < .001f, "Rotation/size edits fail");
            var transformed = PrototypeProjects.Load().projects.Single(item => item.id == project.id).areas.Single(item => item.id == area.id).plants.Single(item => item.instanceId == one.instanceId);
            Check(Mathf.Abs(transformed.yaw - one.yaw) < .001f && Mathf.Abs(transformed.scale - one.scale) < .001f, "Rotation/size are lost on reopen");
            DraftSpecimens(project, area, 0); Click(panel, "Undo last edit"); Click(panel, "Undo last edit"); yield return null;
            Check(one.yaw == 0 && one.scale == 1, "Multi-edit transform undo fails");
            float unsnappedX = one.x, unsnappedY = one.y, unsnappedZ = one.z;
            DraftAlignmentTools(project, area, one); Click(panel, "Snap to 10 cm grid");
            Check(Mathf.Abs(one.x / .1f - Mathf.Round(one.x / .1f)) < .001f && Mathf.Abs(one.y / .1f - Mathf.Round(one.y / .1f)) < .001f && Mathf.Abs(one.z / .1f - Mathf.Round(one.z / .1f)) < .001f,
                "Grid snap does not align every axis");
            Click(panel, "Undo last edit");
            Check(one.x == unsnappedX && one.y == unsnappedY && one.z == unsnappedZ, "Grid undo loses the original position");
            DraftPlacementTools(project, area, one); Click(panel, "Resize +10%");
            DraftAlignmentTools(project, area, one); Click(panel, "Reset size to 1×");
            Check(one.scale == 1, "Reset size fails"); Click(panel, "Undo last edit");
            Check(Mathf.Abs(one.scale - 1.1f) < .001f, "Reset size undo loses previous size");
            Click(panel, "Undo last edit");
            DraftSpecimen(project, area, one); Click(panel, "Duplicate specimen"); yield return null;
            Check(area.plants.Count == 3 && area.plants.Last().plantId == one.plantId && area.plants.Last().instanceId != one.instanceId, "Duplicate conflates species and specimen identity");
            DraftSpecimens(project, area, 0); Click(panel, "Undo last edit"); yield return null;
            Check(area.plants.Count == 2, "Duplicate undo leaves an extra specimen");
            AreaWorkspace(project, area); Click(panel, "Preview in VR"); yield return null;
            Check(practiceMode && route == "draft-preview" && world.GetComponentInChildren<NativePracticeEnvironment>(), "Local Areas cannot be previewed in the shared VR practice space");
            AreaWorkspace(project, area); yield return null;
            Check(!practiceMode && !world.GetComponentInChildren<NativePracticeEnvironment>(), "Editing an Area does not leave immersive preview");
            PreviewDraftArea(project, area); yield return null; yield return null;
            Check(route == "draft-preview" && sceneObjects.Any(item => item && item.GetComponentsInChildren<NativePlantOrb>().Length == 2) &&
                sceneObjects.Any(item => item && item.GetComponentInChildren<NativeSpatialNote>()), "Area preview ignores saved specimens or experiences");
            var previewOrb = world.GetComponentsInChildren<NativePlantOrb>().First();
            float previewBefore = one.x;
            previewOrb.transform.localPosition += new Vector3(.2f, 0, 0); previewOrb.placed();
            Check(Mathf.Abs(one.x - previewBefore - .2f) < .001f, "Preview placement does not save");
            Click(navigation, "Undo placement/edit"); yield return null;
            Check(one.x == previewBefore && Mathf.Abs(world.GetComponentsInChildren<NativePlantOrb>().First().transform.localPosition.x - previewBefore) < .001f,
                "Preview undo does not restore rendered placement");
            Click(navigation, "Redo placement/edit"); yield return null;
            Check(Mathf.Abs(one.x - previewBefore - .2f) < .001f, "Preview redo loses placement");
            Click(navigation, "Preview checklist"); yield return null;
            Check(route == "checklist-preview", "Area preview cannot open its authored checklist");
            PreviewDraftArea(project, area);
            previewOrb = world.GetComponentsInChildren<NativePlantOrb>().First(); previewOrb.Selection.Activate(); yield return null;
            Check(world.GetComponentInChildren<NativeSpatialNote>().GetComponentsInChildren<TMPro.TextMeshPro>(true).Any(text => text.text == area.noteText), "Preview ignores edited Area Note content");
            var longNoteObject = DemoObject("Long Note fixture", Vector3.zero);
            var longNote = longNoteObject.AddComponent<NativeSpatialNote>();
            longNote.Initialize(shell.unlit, shell.font, "fixture-long-note", "Long Note", new string('a', 170) + " " + new string('b', 170));
            longNote.SetOpen(true);
            var nextNotePage = longNote.GetComponentsInChildren<KnowledgeAction>().FirstOrDefault(action => action.name == "Next");
            Check(nextNotePage, "Long Note has no paging action"); if (nextNotePage) nextNotePage.Activate(); yield return null;
            Check(longNote.GetComponentsInChildren<TMPro.TextMeshPro>().Any(text => text.text == new string('b', 170)), "Long Note cannot reveal later saved text");
            longNote.SetOpen(false);
            Check(shell.IsPanelOpen && plant.plantId == one.plantId && world.GetComponentsInChildren<SpatialKnowledgeMesh>().Single().tagMode, "Draft Orb does not open its canonical Tag");
            ProjectWorkspace(project); yield return null;
            Check(route == "project-workspace" && !shell.IsPanelOpen && sceneObjects.Count == 0, "Leaving draft preview leaks its knowledge or sample owners");
            drafts.projects.Remove(project); drafts.Save();
            Check(drafts.projects.Count == original, "Menu fixture leaves a generated project draft behind");
            for (int i = 0; i < 3; i++) { ShowEntry(); MainSection(ExplorePage); yield return null; }
            Home(); yield return null;
            Check(route == "entry" && sceneObjects.Count == (journal.hideMenuBackground ? 0 : 1), "Repeated hub entry accumulates startup backgrounds");
#if UNITY_EDITOR
            int sharedUiChecks = 0; yield return SharedProjectUiChecks(errors, value => sharedUiChecks = value); checks += sharedUiChecks;
            int publishedChecks = 0; yield return PublishedChecklistChecks(errors, value => publishedChecks = value); checks += publishedChecks;
#endif
            count(checks);
        }
#if UNITY_EDITOR
        private void CaptureMainMenu()
        {
            var camera = Camera.main; var position = camera.transform.position; var rotation = camera.transform.rotation;
            float fieldOfView = camera.fieldOfView, aspect = camera.aspect;
            var target = new RenderTexture(1600, 1000, 24); target.Create(); var previous = RenderTexture.active;
            try
            {
                foreach (var label in navigation.GetComponentsInChildren<TMPro.TextMeshPro>()) label.ForceMeshUpdate();
                var garden = world.GetComponentInChildren<NativeMenuShowcase>();
                var focus = garden ? Vector3.Lerp(navigation.transform.position, garden.transform.position + Vector3.up * .55f, .42f) : navigation.transform.position;
                camera.transform.LookAt(focus); camera.fieldOfView = 80; camera.aspect = 1.6f;
                UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(camera, new UnityEngine.Rendering.Universal.UniversalRenderPipeline.SingleCameraRequest { destination = target });
                RenderTexture.active = target; var image = new Texture2D(1600, 1000, TextureFormat.RGB24, false);
                image.ReadPixels(new Rect(0, 0, 1600, 1000), 0, 0); image.Apply();
                System.IO.File.WriteAllBytes("Evidence/main-menu-preview.png", image.EncodeToPNG()); Destroy(image);
            }
            finally { RenderTexture.active = previous; camera.transform.SetPositionAndRotation(position, rotation); camera.fieldOfView = fieldOfView; camera.aspect = aspect; target.Release(); Destroy(target); }
        }
        private void CapturePavilionImap()
        {
            var garden = world.GetComponentInChildren<NativeMenuShowcase>();
            if (!garden || !garden.TabletopMap) return;
            var camera = Camera.main; var position = camera.transform.position; var rotation = camera.transform.rotation;
            float fieldOfView = camera.fieldOfView, aspect = camera.aspect;
            var target = new RenderTexture(1600, 1000, 24); target.Create(); var previous = RenderTexture.active;
            try
            {
                camera.transform.LookAt(garden.TabletopMap.transform.position + Vector3.up * .04f);
                camera.fieldOfView = 65; camera.aspect = 1.6f;
                UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(camera,
                    new UnityEngine.Rendering.Universal.UniversalRenderPipeline.SingleCameraRequest { destination = target });
                RenderTexture.active = target; var image = new Texture2D(1600, 1000, TextureFormat.RGB24, false);
                image.ReadPixels(new Rect(0, 0, 1600, 1000), 0, 0); image.Apply();
                System.IO.File.WriteAllBytes("Evidence/pavilion-imap-v2-preview.png", image.EncodeToPNG()); Destroy(image);
            }
            finally { RenderTexture.active = previous; camera.transform.SetPositionAndRotation(position, rotation);
                camera.fieldOfView = fieldOfView; camera.aspect = aspect;
                target.Release(); Destroy(target); }
        }
#endif
    }
}
