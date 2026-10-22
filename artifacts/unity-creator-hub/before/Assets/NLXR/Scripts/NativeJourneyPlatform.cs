using System;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed partial class NativeJourney
    {
        private const string WebIntroductionUrl = "https://nourishland.org/xr/?experience=webxr-demo";
        // Fixture injection records dispatch without opening a browser during unattended checks.
        private Action<string> externalBrowser = Application.OpenURL;

        private void SharedCreatePage()
        {
            LeaveScene(); route = "shared-create"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("Creator workspace", "Plants · Areas · experiences");
            panel.Text("Prepare a local project and preview its layout. Shared project editing and publishing need native sign-in and project permissions.",
                new Vector3(0, .10f, -.04f), 2.12f, .32f, .43f);
            panel.Button("Local draft workspace", new Vector3(0, -.22f, -.04f), 2.12f, () => CreateHub(), .20f);
            panel.Button("Browse shared projects", new Vector3(-.56f, -.49f, -.04f), 1.04f, ExplorePage, .20f);
            panel.Button("Account & access", new Vector3(.56f, -.49f, -.04f), 1.04f, AccountPage, .20f);
            panel.Button("Main menu", new Vector3(0, -.80f, -.04f), 2.12f, ShowEntry, .18f);
        }

        private void WebIntroductionPage(bool requested = false)
        {
            LeaveScene(); route = "web-introduction"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("Try the WebXR Introduction", requested ? "Browser launch requested" : "External browser experience");
            panel.Text("Open the demo directly in Quest Browser, then use its Start button to enter XR. Unity pauses while you use it. To return, leave the browser's XR session and reopen Nourishland XR from the Quest app menu.",
                new Vector3(0, .03f, -.04f), 2.12f, .58f, .42f);
            panel.Button("Open in browser", new Vector3(0, -.49f, -.04f), 2.12f, () =>
            {
                WebIntroductionPage(true);
                try { externalBrowser(WebIntroductionUrl); }
                catch (Exception error)
                {
                    panel.Text("Browser launch failed: " + error.Message, new Vector3(0, -.23f, -.06f), 2.12f, .20f, .36f);
                }
            }, .22f);
            panel.Button("Main menu", new Vector3(0, -.80f, -.04f), 2.12f, ShowEntry, .18f);
        }
    }
}
