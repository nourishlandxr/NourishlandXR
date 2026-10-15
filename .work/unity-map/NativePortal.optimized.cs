using System;
using UnityEngine;
namespace Nourishland.XR
{
    public sealed class NativePortal : MonoBehaviour
    {
        public bool Ready {get;private set;}
        public bool Paused;
        public readonly PortalEntry Entry=new PortalEntry();
        public NativeLivingFrame Frame {get;private set;}
        public Transform World {get;private set;}
        public Camera Viewer;
        public float AnimationTime => animationTime;
        private Renderer[] renderers;
        private MaterialPropertyBlock block;
        private bool allowEntry;
        private float elapsed,animationTime;
        private Transform core,disk;
        private Matrix4x4 lastPortalMatrix; private float lastOpacity = -1; private bool lastUnmasked;
        private readonly Transform[] shimmer=new Transform[3];
        public void Initialize(Camera viewer,bool painting=false,bool enterPainting=false)
        {
            Viewer=viewer;allowEntry=!painting||enterPainting;block=new MaterialPropertyBlock();
            var prefab=Resources.Load<GameObject>("NLXR/Portal/"+(painting?"PaintingRelief":"SunGarden"));if(!prefab)throw new Exception("Original Portal artwork missing");
            World=Instantiate(prefab,transform).transform;World.localPosition=Vector3.zero;World.localRotation=Quaternion.identity;
            if(painting)World.localScale=Vector3.one*(PortalRules.Radius/.832f);
            renderers=World.GetComponentsInChildren<Renderer>();
            foreach(var child in World.GetComponentsInChildren<Transform>())
            {if(child.name=="core")core=child;if(child.name=="sunDisk")disk=child;for(var i=0;i<3;i++)if(child.name=="shimmer"+i)shimmer[i]=child;}
            var rim=new GameObject("Original mature Living Frame rim");rim.transform.SetParent(transform,false);rim.transform.localPosition=new Vector3(0,-.016f,-.012f);
            Frame=rim.AddComponent<NativeLivingFrame>();Frame.Load(false,true,0);Frame.Paused=true;
            Entry.Reset();Ready=true;ApplyView(viewer.transform.position,viewer.nearClipPlane+.04f);
        }
        public void ApplyView(Vector3 headCentre,float nearDistance)
        {
            if(!Ready)return;Entry.Update(SpatialCoordinates.FromWebPoint(transform.InverseTransformPoint(headCentre)),PortalRules.Radius,allowEntry,nearDistance);
            World.gameObject.SetActive(Entry.Visible);
            var opacity=Mathf.Clamp01((elapsed-.35f)/.5f);
            var portalMatrix=transform.worldToLocalMatrix; bool changed=lastOpacity!=opacity || lastUnmasked!=Entry.Unmasked || lastPortalMatrix!=portalMatrix;
            foreach(var renderer in renderers)
            {
                bool animated=renderer.transform==disk; for(var i=0;i<3;i++)animated|=renderer.transform==shimmer[i]; if(!changed&&!animated)continue;
                block.Clear();block.SetMatrix("_PortalWorldToLocal",portalMatrix);block.SetFloat("_Unmasked",Entry.Unmasked?1:0);block.SetFloat("_Radius",PortalRules.Radius);block.SetFloat("_Opacity",opacity);
                if(renderer.transform==disk)block.SetColor("_BaseColor",new Color(1,.87f+Mathf.Sin(animationTime*.6f)*.018f,.65f+Mathf.Sin(animationTime*.6f)*.025f));
                for(var i=0;i<3;i++)if(renderer.transform==shimmer[i])block.SetColor("_BaseColor",Hsl(.105f,.65f,.77f+Mathf.Sin(animationTime*.8f+i*2)*.055f));
                renderer.SetPropertyBlock(block);
            }
            lastOpacity=opacity;lastUnmasked=Entry.Unmasked;lastPortalMatrix=portalMatrix;
        }
        private static Color Hsl(float h,float s,float l)
        {
            var a=s*Mathf.Min(l,1-l);
            float Component(float n){var k=(n+h*12)%12;return l-a*Mathf.Max(-1,Mathf.Min(Mathf.Min(k-3,9-k),1));}
            return new Color(Component(0),Component(8),Component(4));
        }
        private void Update()
        {
            if(!Ready)return;if(!Paused){elapsed+=Time.unscaledDeltaTime;animationTime+=Mathf.Min(Time.unscaledDeltaTime,.05f);}
            if(core){core.localRotation=Quaternion.AngleAxis(-animationTime*.025f*Mathf.Rad2Deg,Vector3.forward);core.localScale=Vector3.one*(1+Mathf.Sin(animationTime*.45f)*.008f);}
            for(var i=0;i<3;i++)if(shimmer[i]){shimmer[i].localRotation=Quaternion.AngleAxis(-animationTime*(i%2==1?-.018f:.012f)*(1+i*.3f)*Mathf.Rad2Deg,Vector3.forward);shimmer[i].localScale=Vector3.one*(1+Mathf.Sin(animationTime*.55f+i*2)*.022f);}
            if(Viewer)ApplyView(Viewer.transform.position,Viewer.nearClipPlane+.04f);
        }
    }
}
