using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using Nourishland.XR;

int checks = 0;
void Check(bool value, string reason) { checks++; if (!value) throw new Exception(reason); }
var root = new PrototypeProject { id = "draft", siteId = "site", name = "Draft" };
var layout = new ProjectMapLayout();
Check(ProjectLivingMapData.Draft(root, layout).Nodes.Count == 0, "Empty project invented nodes");
var area = new PrototypeArea { id = "b", name = "First" }; root.areas.Add(area);
var first = ProjectLivingMapData.Draft(root, layout); var position = first.Areas.Single().Point;
root.areas.Add(new PrototypeArea { id = "a", name = "Added later" });
area.plants.Add(new PrototypePlant { instanceId = "one", plantId = "species" });
area.plants.Add(new PrototypePlant { instanceId = "two", plantId = "species" });
var grown = ProjectLivingMapData.Draft(root, layout);
Check(grown.Areas.Single(a => a.AreaId == "b").Point == position, "Growth moved first Area");
Check(grown.Nodes.Count(n => n.Kind == "orb") == 2 && grown.Nodes.Select(n => n.Key).Distinct().Count() == 4, "Repeated species merged");
Check(!grown.Nodes.Any(n => n.Kind == "totem"), "Created fictional Totem");
var restored = ProjectLivingMapData.Draft(root, ProjectMapLayout.Load(layout.Save()));
Check(restored.Nodes.All(n => n.Point == grown.Nodes.Single(g => g.Key == n.Key).Point), "Layout reload drift");
var survivor = grown.Nodes.Single(n => n.RecordId == "two").Point;
area.plants.RemoveAt(0);
var removed = ProjectLivingMapData.Draft(root, layout);
Check(removed.Nodes.Count == 3 && removed.Nodes.All(n => n.RecordId != "one"), "Removed record retained");
Check(removed.Nodes.Single(n => n.RecordId == "two").Point == survivor, "Removal moves survivor");
area.plants[0].label = "Changed label";
Check(ProjectLivingMapData.Draft(root, layout).Nodes.Single(n => n.RecordId == "two").Label == "Changed label", "Rename ignored");
root.areas[1].plants.Add(area.plants[0]); area.plants.Clear();
var moved = ProjectLivingMapData.Draft(root, layout);
Check(moved.Nodes.Single(n => n.RecordId == "two").AreaId == "a" && moved.Nodes.Count(n => n.RecordId == "two") == 1, "Reassignment duplicated Orb");
var payload = JObject.Parse(File.ReadAllText("C:/FILES/Projects/NLXRunity/Documentation/shared-project-reference.json"));
var snapshot = SharedProjectSnapshot.Parse(payload, "p");
var published = ProjectLivingMapData.Published(snapshot, new ProjectMapLayout());
Check(!published.LocalDraft && published.Nodes.Count == snapshot.Areas.Count + snapshot.Records.Count, "Snapshot membership lost");
Check(published.Nodes.Where(n => n.Record != null).All(n => n.Key == (string)n.Record["id"]), "Canonical identity changed");
var extraSite = (JObject)payload["sites"][0].DeepClone(); extraSite["id"] = "another"; ((JArray)payload["sites"]).Add(extraSite);
var extraArea = (JObject)payload["areas"][0].DeepClone(); extraArea["siteId"] = "another"; ((JArray)payload["areas"]).Add(extraArea);
var multi = ProjectLivingMapData.Published(SharedProjectSnapshot.Parse(payload, "p"), new ProjectMapLayout());
Check(multi.Areas.Select(n => n.Key).Distinct().Count() == multi.Areas.Count(), "Duplicate Area IDs across sites collide");
var publicRecord = (JObject)payload["records"][0]; publicRecord["kind"] = "area_checkpoint";
Check(ProjectLivingMapData.Published(SharedProjectSnapshot.Parse(payload, "p"), new ProjectMapLayout()).Nodes.Single(n => n.Key == (string)publicRecord["id"]).Kind == "totem", "Totem not recognized");
publicRecord["kind"] = "sub_checkpoint"; publicRecord["title"] = "Observation checkpoint";
Check(ProjectLivingMapData.Published(SharedProjectSnapshot.Parse(payload, "p"), new ProjectMapLayout()).Nodes.Single(n => n.Key == (string)publicRecord["id"]).Kind == "note", "Checkpoint mislabeled as Totem");
var baseKey = ProjectLivingMapData.Key("draft", "site", "a");
var slots = new ProjectMapLayout(); var all = Enumerable.Range(0, 200).Select(i => slots.Point(baseKey, i.ToString())).ToArray();
Check(all.Distinct().Count() == 200, "Dense map slots collide");
Check(ProjectMapLayout.Load("broken").Point("group", "key") == UnityEngine.Vector2.zero, "Corrupt layout blocks project");
area.experiences.Add("note");
Check(ProjectLivingMapData.Draft(root, layout).Children(ProjectLivingMapData.Key(root.id, root.siteId, area.id)).Single().Kind == "note", "Area note missing");
var result = new JObject { ["passed"] = true, ["checks"] = checks, ["scope"] = "Production map data and shared parser, standalone .NET with numeric and local-draft type shims", ["renderedAcceptance"] = false, ["physicalDeviceAcceptance"] = false, ["hostedAcceptance"] = false };
File.WriteAllText(Path.Combine(AppContext.BaseDirectory, "../../../model-checks.json"), result.ToString());
Console.WriteLine(result);

namespace UnityEngine
{
    public struct Vector2 : IEquatable<Vector2>
    {
        public float x, y; public Vector2(float x, float y) { this.x=x; this.y=y; }
        public static Vector2 zero => new Vector2(0,0);
        public static Vector2 operator *(Vector2 v, float s) => new Vector2(v.x*s,v.y*s);
        public static bool operator ==(Vector2 a, Vector2 b) => a.Equals(b);
        public static bool operator !=(Vector2 a, Vector2 b) => !a.Equals(b);
        public bool Equals(Vector2 v) => x==v.x && y==v.y;
        public override bool Equals(object o) => o is Vector2 v && Equals(v);
        public override int GetHashCode() => HashCode.Combine(x,y);
    }
    public static class Mathf { public const float PI = (float)Math.PI; public static float Cos(float v)=>(float)Math.Cos(v); public static float Sin(float v)=>(float)Math.Sin(v); }
}
namespace Nourishland.XR
{
    public sealed class PrototypeProject { public string id, siteId, name; public List<PrototypeArea> areas = new List<PrototypeArea>(); }
    public sealed class PrototypeArea { public string id, name; public List<PrototypePlant> plants = new List<PrototypePlant>(); public List<string> experiences = new List<string>(); }
    public sealed class PrototypePlant { public string instanceId, plantId, label; }
    public sealed class HarnessIdentity { public string commonName; }
    public sealed class HarnessDocument { public string plantId; public HarnessIdentity identity; }
    public static class KnowledgeLibrary { public static HarnessDocument[] Documents = Array.Empty<HarnessDocument>(); }
}
