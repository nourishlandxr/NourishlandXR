# Nourishland XR Project Summary

## 1. Current architecture

The project is currently a lightweight prototype for a spatial learning platform. The visible application is a static browser experience built with plain HTML, CSS, and JavaScript in the app folder. The UI is split into a simple launch experience and a Studio-oriented workspace, with the Platform treated as a placeholder for future development.

The overall product direction is clearly defined by the project guidance:
- Platform = visitor-facing experience
- Studio = designer-facing authoring tool
- The Studio should be built first
- The engine should remain reusable and data-driven
- Site-specific logic should not be hard-coded into the engine

The repository is organized around a content-first structure, but much of the runtime engine and shared content services are still placeholders.

## 2. Folder structure

- app/ - browser entry point and current UI prototype
  - app.js - main screen rendering logic and navigation
  - index.html - page shell
  - style.css - styling layer
- content/ - intended shared content storage, currently empty
- engine/ - intended shared runtime/engine layer, currently empty
- examples/ - sample demo projects and reference content
- media/ - shared media assets
- schemas/ - JSON schema definitions for the data model, currently empty
- sites/ - actual site content and data for deployed examples
  - frankendael/ - sample site content
  - hillyards/ - primary demonstration site
- templates/ - reusable templates for different site types
  - botanical_garden/
  - food_forest/
  - museum/
  - public_park/
  - university/
- tools/ - utilities and project tooling
- docs/ - documentation space, currently empty

## 3. Existing screens

The current app includes a small set of prototype screens:

- Launch screen
  - Presents the project as “Nourishland XR”
  - Offers two entry points: Platform and Studio
- Studio overview
  - Shows high-level design areas such as Projects, Sites, Locations, Objects, Experiences, and Publish
- Sites list screen
  - Displays a list of known sites, including Hillyards Food Forest and Frankendael Park
- Placeholder interactions
  - The Platform button shows a “coming soon” alert
  - The New Site action is also a placeholder

There is no fully implemented user flow beyond these early screens.

## 4. Current navigation flow

The current navigation is simple and manual:

1. The application loads the launch screen.
2. Selecting “Launch Studio” switches to the Studio overview.
3. Selecting the Sites card moves to the Sites screen.
4. Back buttons return to the previous screen.
5. Other actions remain placeholders and do not yet navigate to real functionality.

Navigation is currently handled through inline event handlers and direct DOM replacement rather than a routing system.

## 5. Existing data model

The repository already hints at a hierarchical content model:

- Project
  - Site
    - Location
      - Asset/Object
        - Experience
          - Content

This structure is reflected in the repository organization and example content.

Current examples include:
- Site configuration in sites/hillyards/settings/site.json
- Object metadata in sites/hillyards/location/2R1/objects/lemon_drop/metadata/object.json
- Object content in sites/hillyards/location/2R1/objects/lemon_drop/content/introduction.md

The intended data model also includes relationships, quizzes, stories, and media attached to locations and objects, based on the folder structure under the Hillyards example.

The schema files exist, but they are currently empty, so the data model is only partially formalized.

## 6. Suggestions for improving the architecture

The current structure is promising, but the architecture would benefit from stronger separation between content, runtime, and authoring concerns.

Recommended improvements:
- Introduce a proper frontend architecture for the Studio and Platform, rather than relying on inline HTML string rendering.
- Create a shared engine layer that can load content from the filesystem or JSON data sources and render experiences consistently.
- Move from hard-coded UI content to data-driven screens and configuration.
- Define the schemas fully and validate content against them.
- Separate Studio authoring workflows from Platform rendering logic to avoid mixing concerns.
- Introduce reusable components for screens, cards, forms, and data editors.
- Add a simple state-management approach for navigation, selection, and editing context.

## 7. Technical debt

The project has several clear areas of technical debt:

- The app is still a prototype and relies heavily on inline JavaScript rendering.
- Navigation is not real routing and is effectively hard-coded in the UI.
- The site list is hard-coded in app.js rather than loaded from data.
- The engine, content, and docs folders are not yet implemented.
- The schema files are empty, so data contracts are not enforced.
- The project does not yet have a formal persistence layer for Studio edits.
- Styling is intentionally deferred, so the UI is not yet robust or scalable.
- There is no visible test or validation workflow yet.

## 8. Next recommended milestone

The next milestone should be to implement the first usable Studio workflow for content authoring.

A practical target would be:
- Build a working Sites management flow in the Studio
- Allow a designer to create, open, and edit a site from structured data
- Persist site and location data as JSON files
- Validate entries against the planned schemas
- Connect the first example site to a basic Platform preview

That milestone would move the project from a static prototype toward a real authoring and rendering pipeline while staying aligned with the project’s stated goal of building the Studio first.
