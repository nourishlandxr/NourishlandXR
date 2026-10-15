using System;
using System.Linq;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed partial class NativeJourney
    {
        private NativeProjectLivingMap projectLivingMap;
        private string projectMapCacheKey;
        private void ProjectMapIcon(string name, string icon, Vector3 at, Action action)
        {
            var button = panel.Box(name, at, new Vector3(.25f, .24f, .02f), new Color(.08f, .22f, .20f));
            var target = button.AddComponent<KnowledgeAction>(); target.invoke = action;
            var hint = panel.Text(name, at + new Vector3(0, -.20f, -.03f), .65f, .14f, .28f);
            target.highlightRenderer = hint.GetComponent<Renderer>(); target.highlightRenderer.enabled = false;
            if (icon == "back" || icon == "refresh")
            {
                void Stroke(Vector2 a, Vector2 b)
                {
                    var d = b - a; var mid = (a + b) * .5f;
                    var line = panel.Box(name + " icon", at + new Vector3(mid.x, mid.y, -.02f), new Vector3(d.magnitude, .012f, .004f), Color.white, false);
                    line.transform.localRotation = Quaternion.Euler(0, 0, Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg);
                }
                Stroke(new Vector2(-.06f, 0), new Vector2(.06f, 0)); Stroke(new Vector2(-.06f, 0), new Vector2(-.015f, .045f)); Stroke(new Vector2(-.06f, 0), new Vector2(-.015f, -.045f));
                if (icon == "refresh") { Stroke(new Vector2(.06f, 0), new Vector2(.06f, -.06f)); Stroke(new Vector2(.06f, -.06f), new Vector2(-.035f, -.06f)); }
            }
            else panel.Icon("explore", at + Vector3.back * .02f, .15f, Color.white);
        }
        private ProjectMapLayout LoadProjectMapLayout(string projectId, bool local)
        {
            projectMapCacheKey = "NLXR.ProjectMapLayout." + (local ? "draft." : "public.") + projectId;
            return ProjectMapLayout.Load(PlayerPrefs.GetString(projectMapCacheKey, ""));
        }
        private void SaveProjectMapLayout(ProjectMapLayout layout)
        { PlayerPrefs.SetString(projectMapCacheKey, layout.Save()); PlayerPrefs.Save(); }

        // Reusable entry point for project welcome areas, Explorer and local Creator drafts.
        private void ShowProjectLivingMap(Func<ProjectLivingMapData> read, Action back, Action<ProjectMapNode> select, Action refresh)
        {
            LeaveScene(); route = "project-living-map"; shell.Close(); panel.gameObject.SetActive(true); DrawModeNavigation();
            var data = read();
            var go = TestObjectInFront("Project Living Map", 1.25f);
            if (Camera.main) go.transform.position = new Vector3(go.transform.position.x, Camera.main.transform.position.y - .48f, go.transform.position.z);
            projectLivingMap = go.AddComponent<NativeProjectLivingMap>();
            projectLivingMap.Initialize(shell.unlit, shell.font, journal.reducedMotion);
            projectLivingMap.Selected = select;
            projectLivingMap.ViewChanged = () =>
            {
                if (!projectLivingMap) return;
                data = projectLivingMap.Data;
                var area = data.Areas.FirstOrDefault(a => a.Key == projectLivingMap.AreaKey);
                panel.Begin(area?.Label ?? data.Title, data.LocalDraft ? "Local draft · saved on this device" : SharedHint);
                panel.Text(area == null ? "Select an Area to discover its Totems, Orbs and Notes." : "Select an object to explore it.", new Vector3(0, .16f, -.04f), 2.1f, .28f, .42f);
                panel.Text(data.Areas.Count() + " Areas · " + data.Nodes.Count(n => n.Kind == "totem") + " Totems · " + data.Nodes.Count(n => n.Kind == "orb") + " Orbs",
                    new Vector3(0, -.13f, -.04f), 2.1f, .19f, .36f);
                bool empty = area == null ? !data.Areas.Any() : !data.Children(area.Key).Any();
                panel.Text(empty ? (area == null ? "No Areas yet." : "This Area has no objects yet.") : "Project overview · layout is conceptual",
                    new Vector3(0, -.36f, -.04f), 2.1f, .19f, .33f);
                ProjectMapIcon("Back", "back", new Vector3(-.86f, -.68f, -.04f), back);
                ProjectMapIcon("Refresh project map", "refresh", new Vector3(.86f, -.68f, -.04f), refresh);
                if (area != null) panel.Button("All Areas", new Vector3(0, -.65f, -.04f), 1.1f, () => projectLivingMap.Overview(), .19f);
                if (projectLivingMap.Pages > 1) panel.Button("More " + (projectLivingMap.Page + 1) + "/" + projectLivingMap.Pages,
                    new Vector3(0, -.88f, -.04f), 1.1f, () => projectLivingMap.NextPage(), .17f);
            };
            projectLivingMap.SetData(data);
        }
        private void PublishedProjectLivingMap()
        {
            var layout = LoadProjectMapLayout(sharedProjectId, false);
            ShowProjectLivingMap(() => { var data = ProjectLivingMapData.Published(sharedProject, layout); SaveProjectMapLayout(layout); return data; },
                () => { LeaveScene(); DrawSharedSites(0); },
                node => { LeaveScene(); panel.gameObject.SetActive(true); route = "shared-project"; DrawSharedRecord(node.Record, node.SiteId, node.AreaId); },
                () => SharedProject(sharedProjectId, true));
        }
        private void DraftProjectLivingMap(PrototypeProject project)
        {
            var layout = LoadProjectMapLayout(project.id, true);
            ProjectLivingMapData Read() { var data = ProjectLivingMapData.Draft(project, layout); SaveProjectMapLayout(layout); return data; }
            ShowProjectLivingMap(Read, () => ProjectWorkspace(project), node =>
            {
                var area = project.areas.FirstOrDefault(a => a.id == node.AreaId);
                if (area == null) return;
                var specimen = area.plants.FirstOrDefault(p => p.instanceId == node.RecordId);
                if (specimen != null) DraftSpecimen(project, area, specimen); else AreaWorkspace(project, area);
            }, () => { if (projectLivingMap) projectLivingMap.SetData(Read()); });
        }
    }
}
