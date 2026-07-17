export function renderLaunchScreen(app) {
    app.innerHTML = `
        <div class="screen launch-screen intro-launch">
            <div class="page-header intro-heading">
                <img class="launch-brand-art" src="./assets/herov2.png" alt="" aria-hidden="true" />
                <div><h1>NOURISH LAND<span>XR</span></h1><p class="subtitle">Plant literacy · spatial learning</p></div>
            </div>

            <section class="intro-copy" aria-labelledby="demoWelcomeTitle">
                <div class="welcome-label">NOURISHLAND XR · DEMO V0.8</div>
                <h2 id="demoWelcomeTitle">Observe. Explore. Learn in place.</h2>
                <p><strong>Nourishland XR</strong> turns real gardens and landscapes into interactive learning experiences, helping people discover the plants, stories and natural relationships found around them.</p>
                <p>Using a suitable device—such as your phone—you can map and explore plant-rich places, including home gardens, food forests, community gardens, farms and native forests. Add plants, mark important locations, create relationships, record observations and create information that others can discover while visiting the landscape.</p>
            </section>

            <section class="role-choice" aria-labelledby="roleChoiceTitle">
                <h2 id="roleChoiceTitle">What would you like to do?</h2>
                <div class="role-grid">
                    <button class="menu-card role-card creator-role" onclick="window.renderDemoProjects()">
                        <strong>Create &amp; Manage</strong>
                        <span>Build and manage locations, content and visitor experiences.</span>
                    </button>
                    <button class="menu-card role-card visitor-role" onclick="window.renderV1Explorer()">
                        <strong>Explore a Place</strong>
                        <span>Discover plants and stories using Explorer or the Field Guide.</span>
                    </button>
                </div>
                <button class="menu-card role-card ar-demo-role" onclick="window.openTemporaryArDemoWindow()">
                    <strong>TRY IT NOW <span aria-hidden="true">↗</span></strong>
                    <span>Experience how NourishlandXR brings plants and places to life. No account or project setup required.</span>
                </button>
            </section>

            <nav class="platform-landing-nav" aria-label="Platform navigation">
                <button onclick="window.renderPlatformComingSoon('About This Experience', 'launch')"><strong>About This Experience</strong></button>
                <button onclick="window.renderPlatformComingSoon('Settings', 'launch')"><strong>Settings</strong></button>
                <button onclick="window.renderPlatformComingSoon('Account', 'launch')"><strong>Account</strong></button>
            </nav>

            <p class="collaboration-credit">A collaboration between <strong>Nourishland</strong> and <strong>CyberLotus</strong>, combining regenerative education with immersive technology to transform real landscapes into interactive learning experiences through spatial computing and augmented reality.</p>
        </div>`;
}


