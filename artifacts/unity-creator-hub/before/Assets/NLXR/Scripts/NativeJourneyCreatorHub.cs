using System;
using System.Linq;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed partial class NativeJourney
    {
        private void ProjectWorkspace(PrototypeProject project, int index = 0)
        {
            if (project == null) { CreateHub(); return; }
            PlayerPrefs.SetString(LastCreatorProjectKey, project.id); PlayerPrefs.Save();
            practiceMode = false;
            LeaveScene(); route = "project-workspace"; shell.Close(); panel.gameObject.SetActive(true); DrawModeNavigation();
            panel.Begin(project.name, "Creator hub · local draft · " + project.areas.Count + " Areas");
            panel.Text("Choose what to work on.", new Vector3(0, .24f, -.04f), 2.12f, .18f, .40f);
            panel.Button("Areas & objects", new Vector3(-.56f, -.01f, -.04f), 1.04f, () => ProjectAreasPage(project), .24f);
            panel.Button("PIMOs & content", new Vector3(.56f, -.01f, -.04f), 1.04f, () => CreatorHubAreas(project, "content"), .24f);
            panel.Button("Discovery Paths", new Vector3(-.56f, -.32f, -.04f), 1.04f, () => CreatorHubAreas(project, "paths"), .24f);
            panel.Button("Preview", new Vector3(.56f, -.32f, -.04f), 1.04f, () => CreatorHubAreas(project, "preview"), .24f);
            panel.Button("Open IMAP", new Vector3(-.56f, -.63f, -.04f), 1.04f, () => DraftProjectLivingMap(project), .24f);
            panel.Button("Project details", new Vector3(.56f, -.63f, -.04f), 1.04f, () => CreatorProjectDetails(project), .24f);
            ProjectMapIcon("Projects", "back", new Vector3(-.99f, -.91f, -.04f), () => CreateHub());
            panel.Text("Saved on this device · " + Application.version, new Vector3(.13f, -.88f, -.04f), 1.66f, .14f, .29f);
        }

        private void CreatorHubAreas(PrototypeProject project, string tool, int page = 0)
        {
            LeaveScene(); route = "creator-hub-areas"; shell.Close(); panel.gameObject.SetActive(true);
            string title = tool == "content" ? "PIMOs & content" : tool == "paths" ? "Discovery Paths" : "Preview";
            panel.Begin(title, project.name + " · choose an Area");
            int pages = Math.Max(1, (project.areas.Count + 3) / 4); page = Mathf.Clamp(page, 0, pages - 1);
            for (int i = page * 4; i < Math.Min(project.areas.Count, page * 4 + 4); i++)
            {
                var area = project.areas[i]; int slot = i % 4;
                panel.Button(area.name, new Vector3(0, .16f - slot * .24f, -.04f), 2.12f,
                    () => OpenCreatorHubTool(project, area, tool), .19f);
            }
            if (project.areas.Count == 0)
            {
                panel.Text("Create an Area to organise its plants, content and paths.", new Vector3(0, .15f, -.04f), 2.12f, .30f, .40f);
                panel.Button("Create first Area", new Vector3(0, -.22f, -.04f), 2.12f, () => Keyboard("Area name", "Garden", name =>
                {
                    if (string.IsNullOrWhiteSpace(name)) { CreatorHubAreas(project, tool); return; }
                    OpenCreatorHubTool(project, drafts.AddArea(project, name), tool);
                }), .21f);
            }
            if (pages > 1) panel.Button("More Areas", new Vector3(0, -.78f, -.04f), 1.44f, () => CreatorHubAreas(project, tool, (page + 1) % pages), .16f);
            ProjectMapIcon("Project hub", "back", new Vector3(-.99f, -.91f, -.04f), () => ProjectWorkspace(project));
        }

        private void OpenCreatorHubTool(PrototypeProject project, PrototypeArea area, string tool)
        {
            if (tool == "content") CreatorPimoContent(project, area);
            else if (tool == "paths") CreatorDiscoveryPaths(project, area);
            else CreatorPreviewOptions(project, area);
        }

        private void CreatorPimoContent(PrototypeProject project, PrototypeArea area)
        {
            LeaveScene(); route = "creator-pimo-content"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("PIMOs & content", project.name + " / " + area.name);
            panel.Text("Edit plant records and Notes. Open a plant Orb in Preview to read its packaged knowledge.",
                new Vector3(0, .24f, -.04f), 2.12f, .28f, .38f);
            panel.Button("Edit plant records", new Vector3(-.56f, -.11f, -.04f), 1.04f, () => DraftSpecimens(project, area, 0), .21f);
            panel.Button("Add plant record", new Vector3(.56f, -.11f, -.04f), 1.04f, () => DraftPlantPicker(project, area, 0, () => CreatorPimoContent(project, area)), .21f);
            panel.Button("Edit Area Note", new Vector3(-.56f, -.38f, -.04f), 1.04f, () => Keyboard("Area Note", area.noteText ?? "", value =>
            { SaveAreaNote(project, area, value); CreatorPimoContent(project, area); }), .21f);
            panel.Button("Preview PIMOs", new Vector3(.56f, -.38f, -.04f), 1.04f, () => PreviewDraftArea(project, area), .21f);
            panel.Text("Next: full PIMO graph and media editing in Unity.", new Vector3(0, -.67f, -.04f), 2.12f, .20f, .32f);
            ProjectMapIcon("Project hub", "back", new Vector3(-.99f, -.91f, -.04f), () => ProjectWorkspace(project));
        }

        private void CreatorDiscoveryPaths(PrototypeProject project, PrototypeArea area)
        {
            LeaveScene(); route = "creator-discovery-paths"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("Discovery Paths", project.name + " / " + area.name);
            panel.Text("Guide people through activities linked to your plants. Start with a guided checklist.",
                new Vector3(0, .24f, -.04f), 2.12f, .28f, .39f);
            panel.Button(string.IsNullOrEmpty(area.checklistJson) ? "Create a Guide" : "Edit Guide", new Vector3(0, -.10f, -.04f), 2.12f,
                () => ChecklistEditor(project, area), .23f);
            if (!string.IsNullOrEmpty(area.checklistJson)) panel.Button("Preview Guide", new Vector3(0, -.39f, -.04f), 2.12f,
                () => ChecklistPreview(project, area, 0), .20f);
            panel.Text("Hunt and Quiz: planned. Answer rules and discovery unlocks are not available yet.",
                new Vector3(0, -.67f, -.04f), 2.12f, .26f, .33f);
            ProjectMapIcon("Project hub", "back", new Vector3(-.99f, -.91f, -.04f), () => ProjectWorkspace(project));
        }

        private void CreatorPreviewOptions(PrototypeProject project, PrototypeArea area)
        {
            LeaveScene(); route = "creator-preview-options"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("Preview", project.name + " / " + area.name);
            panel.Button("Preview in AR", new Vector3(0, .12f, -.04f), 2.12f, () =>
            {
                if (immersiveMode) ToggleImmersion();
                PreviewDraftArea(project, area);
            }, .23f);
            panel.Button("Preview in VR", new Vector3(0, -.19f, -.04f), 2.12f,
                () => LaunchPractice(() => PreviewDraftArea(project, area)), .23f);
            if (!string.IsNullOrEmpty(area.checklistJson)) panel.Button("Preview Guide", new Vector3(0, -.50f, -.04f), 2.12f,
                () => ChecklistPreview(project, area, 0), .20f);
            panel.Text("Local layout preview · physical alignment is not calibrated.", new Vector3(0, -.77f, -.04f), 2.12f, .18f, .31f);
            ProjectMapIcon("Project hub", "back", new Vector3(-.99f, -.91f, -.04f), () => ProjectWorkspace(project));
        }

        private void CreatorProjectDetails(PrototypeProject project, int page = 0)
        {
            LeaveScene(); route = "creator-project-details"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("Project details", project.name + " · local draft");
            var pages = TransitionShell.Pages(string.IsNullOrWhiteSpace(project.purpose) ? "Add a purpose for this project." : project.purpose, 180);
            page = Mathf.Clamp(page, 0, pages.Count - 1);
            panel.Text(pages[page], new Vector3(0, .23f, -.04f), 2.12f, .30f, .37f);
            panel.Button("Edit name", new Vector3(-.56f, -.11f, -.04f), 1.04f, () => Keyboard("Project name", project.name, name =>
            { if (string.IsNullOrWhiteSpace(name)) return; project.name = name.Trim().Substring(0, Math.Min(60, name.Trim().Length)); drafts.Save(); CreatorProjectDetails(project); }), .20f);
            panel.Button("Edit purpose", new Vector3(.56f, -.11f, -.04f), 1.04f, () => Keyboard("Project purpose", project.purpose ?? "", value =>
            { project.purpose = (value ?? "").Trim(); project.purpose = project.purpose.Substring(0, Math.Min(500, project.purpose.Length)); drafts.Save(); CreatorProjectDetails(project); }), .20f);
            panel.Button("Guided setup", new Vector3(-.56f, -.39f, -.04f), 1.04f, () => CreatorSetupPage(project), .20f);
            panel.Button("Export draft", new Vector3(.56f, -.39f, -.04f), 1.04f, () => ExportDraftPage(project), .20f);
            if (pages.Count > 1) panel.Button("More purpose text", new Vector3(0, -.63f, -.04f), 2.12f, () => CreatorProjectDetails(project, (page + 1) % pages.Count), .16f);
            panel.Text("Account sync and publication are not connected yet.", new Vector3(0, -.78f, -.04f), 2.12f, .16f, .31f);
            ProjectMapIcon("Project hub", "back", new Vector3(-.99f, -.91f, -.04f), () => ProjectWorkspace(project));
        }
    }
}
