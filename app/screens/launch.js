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
                <div class="welcome-complementary-grid">
                    <button class="menu-card role-card welcome-complementary-card" onclick="window.renderPlatformComingSoon('About This Experience', 'launch')">
                        <strong>About This Experience</strong>
                        <span>Understand what NourishlandXR is and what it can help you build.</span>
                    </button>
                    <button class="menu-card role-card welcome-complementary-card" onclick="window.openTemporaryArDemoWindow()">
                        <strong>Try It Now</strong>
                        <span>Experience a quick demonstration of information appearing within a real place.</span>
                    </button>
                </div>
            </section>

            <nav class="platform-landing-nav" aria-label="Platform navigation">
                <button onclick="window.renderPlatformComingSoon('Settings', 'launch')"><strong>Settings</strong></button>
                <button onclick="window.renderPlatformComingSoon('Account', 'launch')"><strong>Account</strong></button>
            </nav>

            <p class="collaboration-credit"><strong>NourishlandXR</strong> is a collaboration between <strong>Nourishland</strong> and <strong>CyberLotus</strong>, combining regenerative education with immersive technology to transform real landscapes into interactive learning experiences through spatial computing and augmented reality.</p>
            <p class="collaboration-credit"><strong>Nourishland</strong> is committed to providing educational tools and hands-on solutions that help green our planet, growing more sustainable and engaging food systems for the world around us. Through food forests, plant literacy, and immersive learning experiences, we bring people closer to how food is grown, cared for, and shared — making sustainability something practical, adaptable, and genuinely enjoyable to be part of.</p>
        </div>`;
}

