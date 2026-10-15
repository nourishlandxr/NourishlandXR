using System;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using TMPro;
using UnityEditor;
using UnityEngine;

namespace Nourishland.XR.Editor
{
    [InitializeOnLoad]
    public static class ProjectLivingMapVerification
    {
        private const string Pending = "NLXR.ProjectLivingMapVerification";
        static ProjectLivingMapVerification() { if (SessionState.GetBool(Pending, false)) EditorApplication.update += Tick; }
        [MenuItem("Nourishland/Verify project Living Map")]
        public static void Run()
        {
            SessionState.SetBool(Pending, true);
            EditorApplication.update -= Tick; EditorApplication.update += Tick;
            EditorApplication.EnterPlaymode();
        }
        private static void Tick()
        {
            if (!EditorApplication.isPlaying || EditorApplication.isCompiling) return;
            EditorApplication.update -= Tick; SessionState.SetBool(Pending, false);
            try { Verify(); Finish(0); }
            catch (Exception error) { Debug.LogException(error); Finish(1); }
        }
        private static void Finish(int code) { if (Application.isBatchMode) EditorApplication.Exit(code); else EditorApplication.ExitPlaymode(); }
        private static void Verify()
        {
            Directory.CreateDirectory("Evidence"); int checks = 0;
            void Check(bool value, string message) { checks++; if (!value) throw new Exception(message); }
            var project = new PrototypeProject { id = "map-test", siteId = "site", name = "Map test" };
            var layout = new ProjectMapLayout();
            Check(ProjectLivingMapData.Draft(project, layout).Nodes.Count == 0, "Empty project invents content");
            project.areas.Add(new PrototypeArea { id = "area-a", name = "First Area" });
            var first = ProjectLivingMapData.Draft(project, layout); var point = first.Areas.Single().Point;
            project.areas.Add(new PrototypeArea { id = "area-0", name = "New Area" });
            project.areas[0].plants.Add(new PrototypePlant { instanceId = "one", plantId = "cajanus-cajan" });
            project.areas[0].plants.Add(new PrototypePlant { instanceId = "two", plantId = "cajanus-cajan" });
            var grown = ProjectLivingMapData.Draft(project, layout);
            Check(grown.Areas.Single(a => a.AreaId == "area-a").Point == point, "New Area moves existing Area");
            Check(grown.Nodes.Count(n => n.Kind == "orb") == 2 && grown.Nodes.Select(n => n.Key).Distinct().Count() == grown.Nodes.Count, "Repeated species merged");
            Check(grown.Nodes.All(n => n.Kind != "totem"), "Draft map fabricates a Totem");
            var restored = ProjectLivingMapData.Draft(project, ProjectMapLayout.Load(layout.Save()));
            Check(restored.Nodes.All(n => n.Point == grown.Nodes.Single(g => g.Key == n.Key).Point), "Layout changes after reload");
            var survivor = grown.Nodes.Single(n => n.RecordId == "two").Point;
            project.areas[0].plants.RemoveAt(0);
            var removed = ProjectLivingMapData.Draft(project, layout);
            Check(removed.Nodes.All(n => n.RecordId != "one") && removed.Nodes.Single(n => n.RecordId == "two").Point == survivor, "Removal retains stale object or moves survivor");
            project.areas[0].plants[0].label = "Renamed Orb";
            Check(ProjectLivingMapData.Draft(project, layout).Nodes.Single(n => n.RecordId == "two").Label == "Renamed Orb", "Renaming not reflected");
            var publicSnapshot = SharedProjectSnapshot.Parse(JObject.Parse(File.ReadAllText("Documentation/shared-project-reference.json")), "p");
            var published = ProjectLivingMapData.Published(publicSnapshot, new ProjectMapLayout());
            Check(!published.LocalDraft && published.Nodes.Count == publicSnapshot.Areas.Count + publicSnapshot.Records.Count, "Published map drops records");
            Check(published.Nodes.Where(n => n.Record != null).All(n => n.Key == (string)n.Record["id"]), "Published identities rewritten");
            var go = new GameObject("Project map verification"); Material material = null;
            try
            {
                material = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
                var map = go.AddComponent<NativeProjectLivingMap>();
                map.Initialize(material, AssetDatabase.LoadAssetAtPath<TMP_FontAsset>("Assets/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF.asset"), true);
                map.SetData(grown); Check(map.VisibleCount == 2, "Area overview missing");
                map.FocusArea(grown.Areas.Single(a => a.AreaId == "area-a").Key);
                Check(map.VisibleCount == 2, "Area detail does not show specimens");
                var action = go.GetComponentsInChildren<KnowledgeAction>().First(a => a.name.StartsWith("Map orb:"));
                string selected = null; map.Selected = node => selected = node.RecordId; action.Activate();
                Check(selected == "one" || selected == "two", "Orb selection disconnected");
                var retained = go.GetComponentsInChildren<KnowledgeAction>().First(a => a.name.StartsWith("Map orb:"));
                map.SetData(grown); Check(go.GetComponentsInChildren<KnowledgeAction>().Contains(retained), "Unchanged refresh rebuilds objects");
                map.SetData(removed); Check(map.VisibleCount == 1, "Removal leaves map object active");
                for (int i = 0; i < 40; i++) project.areas[0].plants.Add(new PrototypePlant { instanceId = "many-" + i, plantId = "cajanus-cajan" });
                map.SetData(ProjectLivingMapData.Draft(project, layout));
                Check(map.VisibleCount == NativeProjectLivingMap.PageSize && map.Pages == 4, "Large Area not bounded");
                map.NextPage(); Check(map.Page == 1 && map.VisibleCount == NativeProjectLivingMap.PageSize, "Page navigation fails");
                map.Overview(); Check(map.VisibleCount == 2 && map.AreaKey == null, "Overview navigation fails");
            }
            finally { UnityEngine.Object.DestroyImmediate(go); if (material) UnityEngine.Object.DestroyImmediate(material); }
            File.WriteAllText("Evidence/project-living-map-editor-result.json", new JObject { ["passed"] = true, ["checks"] = checks,
                ["version"] = Application.version, ["synthetic"] = true, ["physicalDeviceAcceptance"] = false, ["hostedAcceptance"] = false }.ToString());
            Debug.Log("NLXR_PROJECT_LIVING_MAP: " + checks + " checks passed");
        }
    }
}
