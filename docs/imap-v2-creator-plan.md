# IMAP V2 · circular Interactive Map

The spatial IMAP is the circular disc used in Demo Utility 1.1. Creator's flat Project Map remains the detailed planning surface. The V2 disc should auto-generate from project Sites, Areas, Totems, Orbs and Notes, while Creator may eventually offer optional presentation controls for the disc.

The first model lives in `app/services/imapV2DiscModel.js`. It keeps stable canonical keys, pages Areas by Site, counts hidden record markers, and separates schematic disc coordinates from physical XR anchors. It does not supply unverified paths, slope, elevation or water facts. The current demo disc is still an authored sample; model-to-renderer and demo flow integration is separate work.

Next renderer work: remove hard-coded three-Area and placed-Totem assumptions from `demoLivingMapScene.js`, render the generated disc model with detail limits, retain rim gripping/rotation/tilt and the Living Frame dissolve, then add correct Area/Orb selection and return context. Validate in desktop preview, then Quest; treat frame-rate and interaction checks as separate gates.
