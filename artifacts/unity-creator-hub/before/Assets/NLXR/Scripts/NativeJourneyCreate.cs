using System;
using System.Linq;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed partial class NativeJourney
    {
        private const string LastCreatorProjectKey = "NLXR.Creator.LastProjectId";

        private void CreateHub(int index = 0)
        {
            practiceMode = false;
            LeaveScene(); route = "create-menu"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("Create", "Local device projects · saved here, not published or synced.");
            panel.Button("Create project", new Vector3(0, .17f, -.04f), 2.12f,
                StartNewCreatorProject, .22f);

            var recent = RecentCreatorProject();
            if (recent != null)
            {
                panel.Button("Continue · " + recent.name, new Vector3(0, -.12f, -.04f), 2.12f,
                    () => ProjectWorkspace(recent), .20f);
            }
            var available = recent == null ? drafts.projects : drafts.projects.Where(project => project.id != recent.id).ToList();
            int pages = Math.Max(1, (available.Count + 3) / 4); index = Mathf.Clamp(index, 0, pages - 1);
            float listTop = recent == null ? -.12f : -.39f;
            for (int i = index * 4; i < Math.Min(available.Count, index * 4 + 4); i++)
            {
                var project = available[i]; int slot = i % 4;
                float y = listTop - slot / 2 * .22f;
                panel.Button(project.name, new Vector3(slot % 2 == 0 ? -.56f : .56f, y, -.04f), 1.04f,
                    () => ProjectWorkspace(project), .18f);
            }
            if (drafts.projects.Count == 0) panel.Text("Create a project, add an Area, then choose plants and experiences.", new Vector3(0, -.22f, -.04f), 2.12f, .36f, .43f);
            else if (recent != null && available.Count == 0) panel.Text("Your draft is saved on this device.", new Vector3(0, -.40f, -.04f), 2.12f, .22f, .34f);
            if (pages > 1) panel.Button("More projects", new Vector3(0, recent == null ? -.63f : -.82f, -.04f), 2.12f, () => CreateHub((index + 1) % pages));
            panel.Button("Main menu", new Vector3(0, recent == null ? -.87f : -.96f, -.04f), 2.12f, ShowEntry);
        }
        private void ProjectWorkspace(PrototypeProject project, int index = 0)
        {
            if (project != null)
            {
                PlayerPrefs.SetString(LastCreatorProjectKey, project.id);
                PlayerPrefs.Save();
            }
            practiceMode = false;
            LeaveScene(); route = "project-workspace"; shell.Close(); panel.gameObject.SetActive(true); DrawModeNavigation();
            panel.Begin(project.name, "Local draft · " + project.areas.Count + " Areas · saved on this device");
            ProjectMapIcon("Open IMAP", "map", new Vector3(.99f, .67f, -.04f), () => DraftProjectLivingMap(project));
            panel.Button("Create Area", new Vector3(-.56f, .17f, -.04f), 1.04f,
                () => Keyboard("Name the Area", "", name =>
                {
                    if (string.IsNullOrWhiteSpace(name)) return;
                    AreaWorkspace(project, drafts.AddArea(project, name));
                }), .22f);
            int pages = Math.Max(1, (project.areas.Count + 3) / 4); index = Mathf.Clamp(index, 0, pages - 1);
            for (int i = index * 4; i < Math.Min(project.areas.Count, index * 4 + 4); i++)
            {
                var area = project.areas[i]; int slot = i % 4;
                panel.Button(area.name, new Vector3(slot % 2 == 0 ? -.56f : .56f, -.12f - slot / 2 * .25f, -.04f), 1.04f, () => AreaWorkspace(project, area), .19f);
            }
            if (project.areas.Count == 0) panel.Text("An Area groups plants, Notes and experiences around a real place.", new Vector3(0, -.22f, -.04f), 2.12f, .36f, .43f);
            if (pages > 1) panel.Button("More Areas", new Vector3(0, -.53f, -.04f), 2.12f, () => ProjectWorkspace(project, (index + 1) % pages), .12f);
            panel.Button("Rename project", new Vector3(.56f, -.70f, -.04f), 1.04f, () => Keyboard("Project name", project.name,
                name => { if (string.IsNullOrWhiteSpace(name)) return; project.name = name.Trim().Substring(0, Math.Min(60, name.Trim().Length)); drafts.Save(); ProjectWorkspace(project); }), .16f);
            panel.Button("Projects", new Vector3(0, -.91f, -.04f), 2.12f, () => CreateHub());
            panel.Button("Export draft", new Vector3(-.56f, -.70f, -.05f), 1.04f, () => ExportDraftPage(project), .16f);
        }

        private PrototypeProject RecentCreatorProject()
        {
            var id = PlayerPrefs.GetString(LastCreatorProjectKey, "");
            return string.IsNullOrEmpty(id) ? null : drafts.projects.FirstOrDefault(project => project.id == id);
        }
        private void AreaWorkspace(PrototypeProject project, PrototypeArea area)
        {
            practiceMode = false;
            LeaveScene(); route = "area-workspace"; shell.Close(); panel.gameObject.SetActive(true); DrawModeNavigation();
            panel.Begin(area.name, project.name + " · local prototype Area");
            ProjectMapIcon("Open IMAP", "map", new Vector3(.99f, .67f, -.04f), () => DraftProjectLivingMap(project, () => AreaWorkspace(project, area)));
            panel.Text(area.plants.Count + " plant specimens · " + area.experiences.Count + " experiences\nLocal device draft · placement is not calibrated.",
                new Vector3(0, .17f, -.04f), 2.12f, .24f, .42f);
            panel.Button("Specimen inspector", new Vector3(-.56f, -.10f, -.04f), 1.04f, () => DraftSpecimens(project, area, 0), .18f);
            panel.Button("Rename Area", new Vector3(.56f, -.10f, -.04f), 1.04f, () => Keyboard("Area name", area.name,
                name => { if (string.IsNullOrWhiteSpace(name)) return; area.name = name.Trim().Substring(0, Math.Min(60, name.Trim().Length)); drafts.Save(); AreaWorkspace(project, area); }), .18f);
            panel.Button("Tag a plant", new Vector3(-.56f, -.37f, -.04f), 1.04f, () => DraftPlantPicker(project, area, 0), .20f);
            panel.Button("Add experience", new Vector3(.56f, -.37f, -.04f), 1.04f, () => DraftExperiences(project, area), .20f);
            panel.Button("Preview Area", new Vector3(-.56f, -.63f, -.04f), 1.04f, () => PreviewDraftArea(project, area), .20f);
            panel.Button("Preview in VR", new Vector3(.56f, -.63f, -.04f), 1.04f, () => LaunchPractice(() => PreviewDraftArea(project, area)), .20f);
            panel.Button("Project", new Vector3(0, -.89f, -.04f), 2.12f, () => ProjectWorkspace(project));
        }
        private void DraftPlantPicker(PrototypeProject project, PrototypeArea area, int index, Action afterAdd = null)
        {
            LeaveScene(); route = "draft-plant-picker"; shell.Close(); panel.gameObject.SetActive(true);
            var documents = KnowledgeLibrary.Documents; int pages = (documents.Length + 5) / 6; index = Mathf.Clamp(index, 0, pages - 1);
            panel.Begin("Tag a plant", "Packaged profiles · " + (index + 1) + "/" + pages);
            for (int i = index * 6; i < Math.Min(documents.Length, index * 6 + 6); i++)
            {
                var document = documents[i]; int slot = i % 6;
                panel.Button(document.identity.commonName, new Vector3(slot % 2 == 0 ? -.56f : .56f, .14f - slot / 2 * .25f, -.04f), 1.04f,
                    () => { drafts.AddPlant(area, document.plantId); if (afterAdd != null) afterAdd(); else AreaWorkspace(project, area); }, .19f);
            }
            panel.Button("More plants", new Vector3(-.56f, -.66f, -.04f), 1.04f, () => DraftPlantPicker(project, area, (index + 1) % pages));
            panel.Button("Area", new Vector3(.56f, -.66f, -.04f), 1.04f, () => AreaWorkspace(project, area));
        }
        private void DraftExperiences(PrototypeProject project, PrototypeArea area)
        {
            LeaveScene(); route = "draft-experiences"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("Add an experience", "Local Area choices · uses the existing native features.");
            string[] kinds = { "note", "fruit", "map" }, labels = { "Spatial Note", "Fruit Discovery", "Living Map Experience" };
            for (int i = 0; i < kinds.Length; i++)
            {
                var kind = kinds[i]; bool added = area.experiences.Contains(kind);
                panel.Button(labels[i] + (added ? " · added" : ""), new Vector3(0, .15f - i * .29f, -.04f), 2.12f,
                    () => { if (!area.experiences.Contains(kind)) { area.experiences.Add(kind); drafts.Save(); } DraftExperiences(project, area); }, .22f);
            }
            panel.Button("Checklist", new Vector3(.56f, -.65f, -.04f), 1.04f, () => ChecklistEditor(project, area), .16f);
            if (area.experiences.Contains("note")) panel.Button("Edit Area Note", new Vector3(-.56f, -.65f, -.04f), 1.04f,
                () => Keyboard("Area Note", area.noteText ?? "", value => SaveAreaNote(project, area, value)), .16f);
            panel.Button("Area", new Vector3(0, -.81f, -.04f), 2.12f, () => AreaWorkspace(project, area));
        }
        private void PreviewDraftArea(PrototypeProject project, PrototypeArea area)
        {
            LeaveScene(); route = "draft-preview"; shell.Close(); panel.gameObject.SetActive(true); DrawModeNavigation();
            panel.Begin(area.name, "Local preview · not a calibrated physical Area");
            ProjectMapIcon("Open IMAP", "map", new Vector3(.99f, .67f, -.04f), () => DraftProjectLivingMap(project, () => PreviewDraftArea(project, area)));
            panel.Text(area.plants.Count + " saved plant specimens. Select an Orb to open its canonical Tag; close grip placement saves in this draft.",
                new Vector3(0, .13f, -.04f), 2.12f, .33f, .42f);
            var group = DemoObject("Local Area preview", Vector3.zero);
            var totemObject = new GameObject("Draft Area Totem"); totemObject.transform.SetParent(group.transform, false);
            totemObject.transform.localPosition = new Vector3(1.0f, 0, 2.5f);
            var totem = totemObject.AddComponent<NativeAreaTotem>(); totem.Initialize(area.id, area.name, shell.unlit, shell.font);
            foreach (var specimen in area.plants)
            {
                var doc = KnowledgeLibrary.Documents.FirstOrDefault(item => item.plantId == specimen.plantId); if (doc == null) continue;
                var go = new GameObject("Draft specimen " + specimen.instanceId); go.transform.SetParent(group.transform, false);
                go.transform.localPosition = new Vector3(specimen.x, specimen.y, specimen.z);
                go.transform.localRotation = Quaternion.Euler(0, specimen.yaw, 0); go.transform.localScale = Vector3.one * specimen.scale;
                var orb = go.AddComponent<NativePlantOrb>(); orb.Initialize(shell.unlit, shell.font, specimen.instanceId,
                    string.IsNullOrWhiteSpace(specimen.label) ? doc.identity.commonName : specimen.label);
                orb.selected = () => OpenDraftKnowledge(doc, group.transform);
                orb.placed = () =>
                {
                    var before = new Vector3(specimen.x, specimen.y, specimen.z); var after = go.transform.localPosition;
                    if ((after - before).sqrMagnitude < .000001f) return;
                    try {
                        DraftHistory(area).Execute("Place specimen", () => { specimen.x = after.x; specimen.y = after.y; specimen.z = after.z; },
                            () => { specimen.x = before.x; specimen.y = before.y; specimen.z = before.z; });
                        DraftReturnNavigation(project, area);
                    } catch (Exception error) {
                        go.transform.localPosition = before;
                        Debug.LogWarning("Local placement was restored after save failure: " + error.Message);
                    }
                };
            }
            if (area.experiences.Contains("note"))
            {
                var go = new GameObject("Draft Area Note"); go.transform.SetParent(group.transform, false); go.transform.localPosition = new Vector3(.70f, 1.05f, 1.65f);
                go.AddComponent<NativeSpatialNote>().Initialize(shell.unlit, shell.font, area.id + "-note", area.name,
                    string.IsNullOrWhiteSpace(area.noteText) ? "This Area Note has no text yet. Edit it in Add experience." : area.noteText);
            }
            if (area.experiences.Contains("fruit")) panel.Button("Open Fruit Discovery", new Vector3(-.56f, -.25f, -.04f), 1.04f, () => { plant = area.plants.Count > 0 ? KnowledgeLibrary.Documents.First(item => item.plantId == area.plants[0].plantId) : KnowledgeDocument.Load(); FruitWindow(); DraftReturnNavigation(project, area); });
            if (area.experiences.Contains("map")) panel.Button("Play Living Map Experience", new Vector3(.56f, -.25f, -.04f), 1.04f, () => { LivingMap(); DraftReturnNavigation(project, area); });
            panel.Button("Edit Area", new Vector3(0, -.66f, -.04f), 2.12f, () => AreaWorkspace(project, area), .20f);
            panel.Text("Printed tags, physical anchors, account sync and publication remain pending.", new Vector3(0, -.86f, -.04f), 2.12f, .14f, .30f);
            DraftReturnNavigation(project, area);
            AddPracticeEnvironment();
        }
        private void OpenDraftKnowledge(KnowledgeDocument document, Transform parent)
        {
            var existing = parent.GetComponentInChildren<SpatialKnowledgeMesh>();
            if (existing) { existing.gameObject.SetActive(false); Destroy(existing.gameObject); }
            plant = document; shell.Bind(document); shell.Open(); panel.gameObject.SetActive(false);
            var go = new GameObject("Draft preview Tag"); go.transform.SetParent(parent, false); go.transform.localPosition = new Vector3(0, 1.45f, 2.25f);
            var mesh = go.AddComponent<SpatialKnowledgeMesh>(); mesh.document = document; mesh.material = shell.unlit; mesh.font = shell.font;
            mesh.tagMode = true; mesh.selected = shell.Select;
        }
        private void DraftReturnNavigation(PrototypeProject project, PrototypeArea area)
        {
            navigation.Begin(project.name, "Local draft preview");
            navigation.Button("Edit Area", new Vector3(0, .14f, -.04f), 2.12f, () => AreaWorkspace(project, area), .24f);
            navigation.Button("Preview Area", new Vector3(0, -.20f, -.04f), 2.12f, () => PreviewDraftArea(project, area), .24f);
            var history = DraftHistory(area);
            if (history.CanUndo) navigation.Button("Undo placement/edit", new Vector3(-.56f, -.48f, -.04f), 1.04f,
                () => { history.Undo(); PreviewDraftArea(project, area); }, .16f);
            if (history.CanRedo) navigation.Button("Redo placement/edit", new Vector3(.56f, -.48f, -.04f), 1.04f,
                () => { history.Redo(); PreviewDraftArea(project, area); }, .16f);
            if (!string.IsNullOrEmpty(area.checklistJson)) navigation.Button("Preview checklist", new Vector3(0, -.69f, -.04f), 2.12f,
                () => ChecklistPreview(project, area, 0), .16f);
            navigation.Button("Main menu", new Vector3(0, -.91f, -.04f), 2.12f, ShowEntry, .16f);
        }
    }
}
