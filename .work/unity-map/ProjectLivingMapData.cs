using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed class ProjectMapNode
    {
        public string Key, Parent, Label, Kind, SiteId, AreaId, RecordId;
        public JObject Record;
        public Vector2 Point;
    }

    // Local presentation state only: never a physical anchor or a publishing source.
    public sealed class ProjectMapLayout
    {
        private readonly Dictionary<string, Dictionary<string, int>> groups = new Dictionary<string, Dictionary<string, int>>();
        public Vector2 Point(string parent, string key)
        {
            if (!groups.TryGetValue(parent, out var slots)) groups[parent] = slots = new Dictionary<string, int>();
            if (!slots.TryGetValue(key, out var slot)) slots[key] = slot = slots.Count == 0 ? 0 : slots.Values.Max() + 1;
            if (slot == 0) return Vector2.zero;
            int ring = 1, offset = slot - 1;
            while (offset >= ring * 6) { offset -= ring * 6; ring++; }
            float angle = offset * Mathf.PI * 2 / (ring * 6);
            return new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * ring * .30f;
        }
        public string Save() => JsonConvert.SerializeObject(groups);
        public static ProjectMapLayout Load(string json)
        {
            var layout = new ProjectMapLayout();
            if (string.IsNullOrEmpty(json)) return layout;
            try
            {
                var saved = JsonConvert.DeserializeObject<Dictionary<string, Dictionary<string, int>>>(json);
                if (saved != null) foreach (var group in saved)
                    if (group.Value != null && group.Value.Values.All(v => v >= 0 && v < 100000) && group.Value.Values.Distinct().Count() == group.Value.Count)
                        layout.groups[group.Key] = group.Value;
            }
            catch (JsonException) { /* A corrupt layout cache cannot prevent opening project content. */ }
            return layout;
        }
    }

    public sealed class ProjectLivingMapData
    {
        public string ProjectId, Title, Revision;
        public bool LocalDraft;
        public readonly List<ProjectMapNode> Nodes = new List<ProjectMapNode>();
        public static string Key(params string[] parts) => new JArray(parts).ToString(Formatting.None);
        public IEnumerable<ProjectMapNode> Areas => Nodes.Where(n => n.Kind == "area");
        public IEnumerable<ProjectMapNode> Children(string area) => Nodes.Where(n => n.Parent == area);
        private void Add(ProjectMapLayout layout, ProjectMapNode node)
        {
            node.Point = layout.Point(node.Parent ?? Key(ProjectId), node.Key);
            Nodes.Add(node);
        }
        public static ProjectLivingMapData Published(SharedProjectSnapshot snapshot, ProjectMapLayout layout)
        {
            var map = new ProjectLivingMapData { ProjectId = (string)snapshot.Project["id"], Title = (string)snapshot.Project["name"], Revision = snapshot.Revision };
            foreach (var area in snapshot.Areas.OfType<JObject>().OrderBy(a => (string)a["siteId"], StringComparer.Ordinal).ThenBy(a => (string)a["id"], StringComparer.Ordinal))
            {
                string site = (string)area["siteId"], id = (string)area["id"];
                var siteName = snapshot.Sites.OfType<JObject>().First(s => (string)s["id"] == site)["name"];
                map.Add(layout, new ProjectMapNode { Key = Key(map.ProjectId, site, id), Label = (string)area["name"] + (snapshot.Sites.Count > 1 ? " · " + siteName : ""), Kind = "area", SiteId = site, AreaId = id });
            }
            foreach (var record in snapshot.Records.OfType<JObject>().OrderBy(r => (string)r["id"], StringComparer.Ordinal))
            {
                string kind = (string)record["kind"];
                map.Add(layout, new ProjectMapNode { Key = (string)record["id"], Parent = Key(map.ProjectId, (string)record["siteId"], (string)record["areaId"]),
                    Kind = kind == "plant" ? "orb" : kind == "area_checkpoint" || kind == "totem" || kind == "sub_checkpoint" && ((string)record["title"] ?? "").EndsWith("totem", StringComparison.OrdinalIgnoreCase) ? "totem" : "note",
                    Label = (string)record["title"], SiteId = (string)record["siteId"], AreaId = (string)record["areaId"], RecordId = (string)record["recordId"], Record = record });
            }
            return map;
        }
        public static ProjectLivingMapData Draft(PrototypeProject project, ProjectMapLayout layout)
        {
            var map = new ProjectLivingMapData { ProjectId = project.id, Title = project.name, LocalDraft = true };
            foreach (var area in project.areas.OrderBy(a => a.id, StringComparer.Ordinal))
            {
                string parent = Key(project.id, project.siteId, area.id);
                map.Add(layout, new ProjectMapNode { Key = parent, Kind = "area", Label = area.name, SiteId = project.siteId, AreaId = area.id });
                foreach (var plant in area.plants.OrderBy(p => p.instanceId, StringComparer.Ordinal))
                {
                    var document = KnowledgeLibrary.Documents.FirstOrDefault(d => d.plantId == plant.plantId);
                    map.Add(layout, new ProjectMapNode { Key = Key(project.id, project.siteId, area.id, plant.instanceId), Parent = parent, Kind = "orb", RecordId = plant.instanceId,
                        SiteId = project.siteId, AreaId = area.id, Label = string.IsNullOrWhiteSpace(plant.label) ? document?.identity.commonName ?? plant.plantId : plant.label });
                }
                if (area.experiences.Contains("note")) map.Add(layout, new ProjectMapNode { Key = Key(project.id, project.siteId, area.id, "area-note"), Parent = parent, Kind = "note", Label = "Area Note", SiteId = project.siteId, AreaId = area.id });
            }
            return map;
        }
    }
}
