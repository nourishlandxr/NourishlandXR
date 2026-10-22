using System;
using System.Collections;
using System.Globalization;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Networking;
#if UNITY_ANDROID && !UNITY_EDITOR
using UnityEngine.Android;
#endif

namespace Nourishland.XR
{
    public sealed partial class NativeJourney
    {
        private static readonly string[] CreatorSetupSteps =
        {
            "project-identity", "geographic-origin", "load-map-information",
            "first-area", "first-record", "save-reopen-and-switch-views", "complete"
        };

        private void CreatorProjectSetupGuide()
        {
            CreatorSetupPage(RecentCreatorProject());
        }

        private void StartNewCreatorProject()
        {
            CreatorSetupPage(null);
        }

        private void CreatorSetupPage(PrototypeProject project, string message = null)
        {
            practiceMode = false;
            LeaveScene(); route = "creator-setup"; shell.Close(); panel.gameObject.SetActive(true); DrawModeNavigation();
            int step = project == null ? 0 : Mathf.Clamp(Array.IndexOf(CreatorSetupSteps, project.creatorTutorialStepId), 0, CreatorSetupSteps.Length - 1);
            string title = step >= CreatorSetupSteps.Length - 1 ? "Project setup complete" : CreatorSetupHeading(step);
            panel.Begin(title, project == null ? "Creator project setup · Step 1 of 6" : "" + project.name + " · Step " + (step + 1) + " of 6 · local draft");
            if (!string.IsNullOrWhiteSpace(message)) panel.Text(message, new Vector3(0, .63f, -.04f), 2.08f, .16f, .31f);

            if (step == 0)
            {
                panel.Text("Name the project and describe what you want to grow, care for, learn about, or share. You can edit both later.",
                    new Vector3(0, .29f, -.04f), 2.08f, .33f, .39f);
                panel.Button(project == null ? "Create project" : "Save name and purpose", new Vector3(0, -.12f, -.04f), 2.12f,
                    () => CreatorIdentity(project), .22f);
                if (project != null) panel.Button("Keep this identity", new Vector3(0, -.43f, -.04f), 2.12f,
                    () => SetCreatorSetupStep(project, "geographic-origin"), .19f);
                panel.Button("Back", new Vector3(0, -.79f, -.04f), 2.12f, () => CreateHub(), .17f);
            }
            else if (step == 1) DrawCreatorOriginStep(project);
            else if (step == 2) DrawCreatorMapStep(project);
            else if (step == 3) DrawCreatorAreaStep(project);
            else if (step == 4) DrawCreatorRecordStep(project);
            else if (step == 5) DrawCreatorFinishStep(project);
            else
            {
                panel.Text("Your first Area and record are saved in this device-local draft. The same project identity was opened in the flat workspace and IMAP. It has not been synced or published.",
                    new Vector3(0, .25f, -.04f), 2.08f, .48f, .40f);
                panel.Button("Open project", new Vector3(0, -.37f, -.04f), 2.12f, () => ProjectWorkspace(project), .21f);
                panel.Button("Tutorials", new Vector3(0, -.70f, -.04f), 2.12f, TutorialsPage, .17f);
            }
        }

        private static string CreatorSetupHeading(int step)
        {
            switch (step)
            {
                case 0: return "Give your project a purpose";
                case 1: return "Choose one geographic origin";
                case 2: return "Load map information";
                case 3: return "Set up your first Area";
                case 4: return "Add your first record";
                case 5: return "Save, return, and explore";
                default: return "Project setup complete";
            }
        }

        private void CreatorIdentity(PrototypeProject existing)
        {
            Keyboard(existing == null ? "Name your project" : "Project name", existing?.name ?? "", name =>
            {
                name = (name ?? "").Trim(); if (name.Length == 0) { CreatorSetupPage(existing, "A project name is required."); return; }
                Keyboard("Project purpose", existing?.purpose ?? "", purpose =>
                {
                    purpose = (purpose ?? "").Trim();
                    if (purpose.Length == 0) { CreatorSetupPage(existing, "Add a short purpose so the project has a clear focus."); return; }
                    if (existing == null)
                    {
                        var created = drafts.Create(name, purpose);
                        PlayerPrefs.SetString(LastCreatorProjectKey, created.id); PlayerPrefs.Save();
                        CreatorSetupPage(created);
                    }
                    else
                    {
                        existing.name = name.Substring(0, Math.Min(60, name.Length));
                        existing.purpose = purpose.Substring(0, Math.Min(500, purpose.Length));
                        SetCreatorSetupStep(existing, "geographic-origin");
                    }
                });
            });
        }

        private void DrawCreatorOriginStep(PrototypeProject project)
        {
            var origin = CreatorProjectGeography.ReadSiteMap(project)["geographicOrigin"] as JObject;
            string saved = origin == null ? "No project origin yet." : "Saved origin · " + ((double)origin["latitude"]).ToString("F5", CultureInfo.InvariantCulture) + ", " +
                ((double)origin["longitude"]).ToString("F5", CultureInfo.InvariantCulture) + " · broad map context only.";
            panel.Text("Set one project starting location. This gives the IMAP broad geographic context; it does not place a Plant Orb or XR anchor.\n" + saved,
                new Vector3(0, .30f, -.04f), 2.10f, .40f, .38f);
            panel.Button("Use device location", new Vector3(-.56f, -.16f, -.04f), 1.04f, () => StartCoroutine(CaptureCreatorDeviceLocation(project)), .17f);
            panel.Button("Enter coordinates", new Vector3(.56f, -.16f, -.04f), 1.04f, () => EnterCreatorCoordinates(project), .17f);
            panel.Text("Location permission is requested only after you choose device location. If it is denied or unavailable, enter coordinates instead.",
                new Vector3(0, -.45f, -.04f), 2.08f, .24f, .33f);
            if (origin != null) panel.Button("Continue", new Vector3(0, -.78f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "load-map-information"), .18f);
            panel.Button("Back", new Vector3(-.56f, -.78f, -.04f), 1.04f,
                () => { if (project == null) CreateHub(); else SetCreatorSetupStep(project, "project-identity"); }, .16f);
        }

        private void EnterCreatorCoordinates(PrototypeProject project)
        {
            Keyboard("Project latitude", "", latitudeText =>
            {
                double latitude;
                if (!double.TryParse((latitudeText ?? "").Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out latitude))
                { CreatorSetupPage(project, "Enter a valid latitude between -90 and 90."); return; }
                Keyboard("Project longitude", "", longitudeText =>
                {
                    double longitude;
                    if (!double.TryParse((longitudeText ?? "").Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out longitude))
                    { CreatorSetupPage(project, "Enter a valid longitude between -180 and 180."); return; }
                    try
                    {
                        CreatorProjectGeography.SetOrigin(project, CreatorProjectGeography.NormalizeOrigin(latitude, longitude));
                        drafts.Save(); SetCreatorSetupStep(project, "load-map-information");
                    }
                    catch (Exception error) { CreatorSetupPage(project, error.Message); }
                });
            });
        }

        private IEnumerator CaptureCreatorDeviceLocation(PrototypeProject project)
        {
            route = "creator-location";
            panel.Begin("Checking location", "The app will request permission only for this action.");
#if UNITY_ANDROID && !UNITY_EDITOR
            if (!Permission.HasUserAuthorizedPermission(Permission.FineLocation))
            {
                Permission.RequestUserPermission(Permission.FineLocation);
                float waited = 0;
                while (waited < 12 && !Permission.HasUserAuthorizedPermission(Permission.FineLocation))
                { waited += Time.unscaledDeltaTime; yield return null; }
                if (!Permission.HasUserAuthorizedPermission(Permission.FineLocation))
                { CreatorSetupPage(project, "Location was not shared. Enter coordinates to set the project origin without location access."); yield break; }
            }
#endif
            if (!Input.location.isEnabledByUser)
            { CreatorSetupPage(project, "Device location is unavailable. Enter coordinates to continue."); yield break; }
            Input.location.Start(10f, 0f);
            float timeout = 12f;
            while (Input.location.status == LocationServiceStatus.Initializing && timeout > 0)
            { timeout -= Time.unscaledDeltaTime; yield return null; }
            if (Input.location.status != LocationServiceStatus.Running)
            {
                Input.location.Stop(); CreatorSetupPage(project, "Device location could not be read. Enter coordinates to continue."); yield break;
            }
            var reading = Input.location.lastData;
            try
            {
                CreatorProjectGeography.SetOrigin(project, CreatorProjectGeography.NormalizeOrigin(reading.latitude, reading.longitude, "device", reading.horizontalAccuracy));
                drafts.Save(); Input.location.Stop(); SetCreatorSetupStep(project, "load-map-information");
            }
            catch (Exception error) { Input.location.Stop(); CreatorSetupPage(project, error.Message); }
        }

        private void DrawCreatorMapStep(PrototypeProject project)
        {
            var siteMap = CreatorProjectGeography.ReadSiteMap(project);
            var origin = siteMap["geographicOrigin"] as JObject;
            var mapData = siteMap["mapData"] as JObject;
            if (origin == null)
            {
                panel.Text("Set a project origin before loading location-based map information.", new Vector3(0, .25f, -.04f), 2.08f, .30f, .38f);
                panel.Button("Choose origin", new Vector3(0, -.24f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "geographic-origin"), .20f);
            }
            else
            {
                string status = mapData == null ? "Map information has not been loaded." :
                    (string)mapData["status"] == "sourced" ? "Sourced map contours are saved for this project origin." : "Map service unavailable · " + ((string)mapData["message"] ?? "You can continue with the place name.");
                panel.Text("Load the same geographic map package the IMAP uses. The origin stays saved if the map provider is unavailable.\n" + status,
                    new Vector3(0, .29f, -.04f), 2.10f, .40f, .37f);
                panel.Button("Load map information", new Vector3(0, -.18f, -.04f), 2.12f, () => StartCoroutine(LoadCreatorMapInformation(project)), .19f);
                if (mapData != null && (string)mapData["status"] == "unavailable")
                    panel.Button("Continue by place name", new Vector3(0, -.49f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "first-area"), .17f);
                if (mapData != null && (string)mapData["status"] == "sourced")
                    panel.Button("Continue", new Vector3(0, -.49f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "first-area"), .17f);
            }
            panel.Button("Back", new Vector3(0, -.82f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "geographic-origin"), .16f);
        }

        private IEnumerator LoadCreatorMapInformation(PrototypeProject project)
        {
            var siteMap = CreatorProjectGeography.ReadSiteMap(project);
            var origin = siteMap["geographicOrigin"] as JObject;
            if (origin == null) { CreatorSetupPage(project, "Set the project origin before loading map information."); yield break; }
            JObject result;
            var bounds = CreatorProjectGeography.Bounds(origin);
            bool unsupported = (double)bounds["xmin"] < 140 || (double)bounds["xmax"] > 154.5 || (double)bounds["ymin"] < -38.5 || (double)bounds["ymax"] > -27.5;
            if (unsupported)
            {
                result = CreatorProjectGeography.Unavailable(origin, "The current contour provider covers NSW only. Your location is saved; continue building or retry with a supported location.");
            }
            else
            {
                panel.Begin("Loading map information", "Fetching read-only terrain contours for the saved project origin.");
                using (var request = UnityWebRequest.Get(CreatorProjectGeography.TerrainUrl(bounds)))
                {
                    request.timeout = 20;
                    yield return request.SendWebRequest();
                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        try { result = CreatorProjectGeography.Sourced(origin, JObject.Parse(request.downloadHandler.text)); }
                        catch (Exception error) { result = CreatorProjectGeography.Unavailable(origin, "Map information could not be read. " + error.Message); }
                    }
                    else result = CreatorProjectGeography.Unavailable(origin, "Map information is unavailable. Your project can still be edited. " + request.error);
                }
            }
            try
            {
                CreatorProjectGeography.SetMapData(project, result); drafts.Save();
                if ((string)result["status"] == "sourced") SetCreatorSetupStep(project, "first-area");
                else CreatorSetupPage(project, (string)result["message"]);
            }
            catch (Exception error) { CreatorSetupPage(project, error.Message); }
        }

        private void DrawCreatorAreaStep(PrototypeProject project)
        {
            panel.Text("An Area is a meaningful place in your project, such as an orchard, nursery, or north garden. It groups the records you add there.",
                new Vector3(0, .30f, -.04f), 2.08f, .36f, .39f);
            if (project.areas.Count > 0)
            {
                var area = project.areas[0];
                panel.Text("Starting Area already available: " + area.name, new Vector3(0, -.11f, -.04f), 2.08f, .18f, .36f);
                panel.Button("Use this Area", new Vector3(0, -.45f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "first-record"), .19f);
            }
            else panel.Button("Create first Area", new Vector3(0, -.26f, -.04f), 2.12f, () => Keyboard("Name your first Area", "Garden", name =>
            {
                if (string.IsNullOrWhiteSpace(name)) { CreatorSetupPage(project, "An Area name is required."); return; }
                drafts.AddArea(project, name); SetCreatorSetupStep(project, "first-record");
            }), .19f);
            panel.Button("Back", new Vector3(0, -.82f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "load-map-information"), .16f);
        }

        private void DrawCreatorRecordStep(PrototypeProject project)
        {
            if (project.areas.Count == 0)
            { SetCreatorSetupStep(project, "first-area"); return; }
            var area = project.areas[0];
            panel.Text("Add a plant or a Note to this Area. The record keeps its identity when you open the project in another view.",
                new Vector3(0, .29f, -.04f), 2.08f, .34f, .38f);
            bool hasRecord = area.plants.Count > 0 || !string.IsNullOrWhiteSpace(area.noteText);
            if (hasRecord)
            {
                panel.Text("This Area already has a starting record. Use it to continue without creating a duplicate.", new Vector3(0, -.10f, -.04f), 2.08f, .21f, .34f);
                panel.Button("Use existing record", new Vector3(0, -.43f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "save-reopen-and-switch-views"), .18f);
            }
            else
            {
                panel.Button("Add a plant record", new Vector3(-.56f, -.13f, -.04f), 1.04f,
                    () => DraftPlantPicker(project, area, 0, () => SetCreatorSetupStep(project, "save-reopen-and-switch-views")), .17f);
                panel.Button("Add an Area Note", new Vector3(.56f, -.13f, -.04f), 1.04f, () => Keyboard("Write a first Area Note", "", value =>
                {
                    if (string.IsNullOrWhiteSpace(value)) { CreatorSetupPage(project, "Add a short Note, or choose a plant record."); return; }
                    area.noteText = value.Substring(0, Math.Min(500, value.Length));
                    if (!area.experiences.Contains("note")) area.experiences.Add("note");
                    drafts.Save(); SetCreatorSetupStep(project, "save-reopen-and-switch-views");
                }), .17f);
            }
            panel.Button("Back", new Vector3(0, -.82f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "first-area"), .16f);
        }

        private void DrawCreatorFinishStep(PrototypeProject project)
        {
            panel.Text("Save this as a device-local draft, reopen the same project, then open its flat workspace and Richie’s Interactive Map (IMAP). Saving does not publish or sync it.",
                new Vector3(0, .31f, -.04f), 2.08f, .34f, .37f);
            var actions = project.creatorTutorialCompletedActions ?? (project.creatorTutorialCompletedActions = new System.Collections.Generic.List<string>());
            panel.Button(CheckAction(actions, "draft-saved", "Save local draft"), new Vector3(-.56f, -.10f, -.04f), 1.04f,
                () => { try { drafts.Save(); MarkCreatorSetupAction(project, "draft-saved"); } catch (Exception error) { CreatorSetupPage(project, "Save failed. " + error.Message); } }, .16f);
            panel.Button(CheckAction(actions, "project-reopened", "Reopen same project"), new Vector3(.56f, -.10f, -.04f), 1.04f, () =>
            {
                try
                {
                    var reloaded = PrototypeProjects.Load(); var same = reloaded.projects.FirstOrDefault(item => item.id == project.id);
                    if (same == null) { CreatorSetupPage(project, "The saved project could not be reopened. The current draft is still available to retry."); return; }
                    drafts = reloaded; project = same; MarkCreatorSetupAction(project, "project-reopened");
                }
                catch (Exception error) { CreatorSetupPage(project, "Reopen failed. " + error.Message); }
            }, .16f);
            panel.Button(CheckAction(actions, "flat-view-opened", "Open flat workspace"), new Vector3(-.56f, -.39f, -.04f), 1.04f, () =>
            { MarkCreatorSetupAction(project, "flat-view-opened"); ProjectWorkspace(project); }, .16f);
            panel.Button(CheckAction(actions, "imap-view-opened", "Open IMAP"), new Vector3(.56f, -.39f, -.04f), 1.04f,
                () => DraftProjectLivingMap(project, () => { MarkCreatorSetupAction(project, "imap-view-opened"); CreatorSetupPage(project); }), .16f);
            panel.Text("Same project ID · saved on this device · not published", new Vector3(0, -.70f, -.04f), 2.08f, .16f, .31f);
            panel.Button("Back", new Vector3(0, -.91f, -.04f), 2.12f, () => SetCreatorSetupStep(project, "first-record"), .15f);
        }

        private static string CheckAction(System.Collections.Generic.List<string> actions, string id, string label)
        { return actions.Contains(id) ? "Done · " + label : label; }

        private void MarkCreatorSetupAction(PrototypeProject project, string actionId)
        {
            if (project.creatorTutorialCompletedActions == null) project.creatorTutorialCompletedActions = new System.Collections.Generic.List<string>();
            if (!project.creatorTutorialCompletedActions.Contains(actionId)) project.creatorTutorialCompletedActions.Add(actionId);
            bool complete = new[] { "draft-saved", "project-reopened", "flat-view-opened", "imap-view-opened" }
                .All(id => project.creatorTutorialCompletedActions.Contains(id));
            project.creatorTutorialStepId = complete ? "complete" : "save-reopen-and-switch-views";
            try { drafts.Save(); } catch (Exception error) { CreatorSetupPage(project, "Progress could not be saved. " + error.Message); return; }
            CreatorSetupPage(project);
        }

        private void SetCreatorSetupStep(PrototypeProject project, string id)
        {
            project.creatorTutorialStepId = CreatorSetupSteps.Contains(id) ? id : "project-identity";
            try { drafts.Save(); CreatorSetupPage(project); }
            catch (Exception error) { CreatorSetupPage(project, "Progress could not be saved. " + error.Message); }
        }
    }
}
