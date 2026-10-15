// Guided narration from the reviewed demo.docx. Interaction handlers retain their existing mechanics.
export const DEMO_RETURN_WELCOME_PARAGRAPHS = Object.freeze([
    'I’m up here now, beside the Living Frame. Welcome to NourishlandXR.',
    'We’ll explore a few Creator tools with prepared examples. The frame will show each action as we go.'
]);
export const DEMO_GUIDED_STEPS = Object.freeze([
    {
        "id": "INTRO 1.1",
        "act": "Introduce the tool",
        "title": "Take a moment to look around",
        "main": "A leaf catching the light. An insect moving between flowers. The shade beneath a tree.",
        "panel": "Hidden.",
        "hint": "",
        "art": "opening"
    },
    {
        "id": "INTRO 1.2",
        "act": "Introduce the tool",
        "title": "Look closer with NourishlandXR",
        "main": "Technology shapes where we place our attention. What if it helped us notice more of the living world?\n\nNourishlandXR helps us explore and learn through real places. Augmented reality brings useful information into your surroundings.",
        "panel": "Hidden. A real garden project is a separate experience after the sample demo.",
        "hint": "",
        "art": "opening"
    },
    {
        "id": "SPACE 1.1",
        "act": "Meet the panel",
        "title": "Get comfortable in this space",
        "main": "In this demo, we’ll explore Creator mode tools for building a learning place. The Living Frame will guide you through prepared examples.",
        "panel": "A compact panel with its companion image visible. Media, Controls and Settings are initially closed.",
        "hint": "",
        "art": null
    },
    {
        "id": "SPACE 1.2",
        "act": "Place a sample",
        "title": "Imagine a place to learn",
        "main": "A garden can become an outdoor classroom. A walk can reveal connections between plants, wildlife and the people who care for a place.\n\nCreator tools let you attach discoveries, observations and learning questions to that place.",
        "panel": "Keep the companion image available without repeating the main message.",
        "hint": "",
        "art": "curiosity"
    },
    {
        "id": "SPACE 1.3",
        "act": "Place a sample",
        "title": "Begin with one small discovery",
        "main": "A Plant Orb connects a discovery to a position in your surroundings. Let’s give the first one a place.",
        "panel": "Keep the image panel closed. Reveal the prepared Pigeon Pea image after placement at ELEMENTS 1.6.",
        "hint": "Choose an open space in front of you, then place the sample Plant Orb.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.5",
        "act": "Place a sample",
        "title": "Place the first Plant Orb",
        "main": "In a real place, this Orb would sit beside the plant it describes.",
        "panel": "Existing placement controls; media closed.",
        "hint": "Aim at an open space and use the placement control.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.6",
        "act": "Open a profile",
        "title": "Your first plant to explore",
        "main": "Your first Orb represents Pigeon Pea, a shrub grown for food and for its useful roles in a garden. Its information begins with a compact Tag and opens into Curiosity.",
        "panel": "Selected plant identity. Curiosity is the standard presentation.",
        "hint": "Select the Pigeon Pea Orb to open its Tag, then unfold Curiosity.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.7",
        "act": "Open a profile",
        "title": "The compact Tag view",
        "main": "Tag gives you the plant’s identity at a glance. Curiosity reveals the connected information behind it.",
        "panel": "Optional compact view, not a required lesson.",
        "hint": "Continue to Curiosity.",
        "art": null
    },
    {
        "id": "PIMO 1.2",
        "act": "Find a useful detail",
        "title": "There’s more to discover",
        "main": "There are many ways to get to know a plant. You might wonder how it grows, what it can provide, how it supports other life, or why it suits a particular place.\n\nLet’s follow one of those questions and see where it leads.",
        "panel": "Plant profile in Curiosity; keep only the relevant branch in focus.",
        "hint": "Point at a large parent PIMO cell and press the trigger to open it. Try Uses.",
        "art": null
    },
    {
        "id": "PIMO 1.2a",
        "act": "Find a useful detail",
        "title": "Follow Uses",
        "main": "The Uses branch includes ways people use this plant for food.",
        "panel": "Uses information and its immediate child cells.",
        "hint": "Select Culinary.",
        "art": null
    },
    {
        "id": "PIMO 1.2b",
        "act": "Find a useful detail",
        "title": "Explore one use",
        "main": "Fresh peas is one example of how Pigeon Pea can be used.",
        "panel": "Culinary information and its child cells.",
        "hint": "Select Fresh peas.",
        "art": null
    },
    {
        "id": "PIMO 1.2c",
        "act": "Find a useful detail",
        "title": "A detail you can return to",
        "main": "You can keep exploring, or take a closer look at the related image.",
        "panel": "Authored Fresh peas information, breadcrumb and matching media if available.",
        "hint": "Continue to see the Image panel.",
        "art": null
    },
    {
        "id": "PANEL 1.1",
        "act": "Meet the panel tools",
        "title": "A closer look",
        "main": "The Image panel shows the picture connected to what you selected. You can open it whenever you want a closer look.",
        "panel": "Open the selected cell or plant’s authored image. Media is a panel opener, visually distinct from demo progression actions.",
        "hint": "Use Image in the Control Panel to show or hide the picture.",
        "art": null
    },
    {
        "id": "PANEL 1.2",
        "act": "Meet the panel tools",
        "title": "Keep the space clear",
        "main": "You have explored Tag, Curiosity and the Fruit Discovery Window. The Orbs are tucked away for now, but the Control Panel can bring them back.\n\nAs you meet more elements, their controls will appear here too.",
        "panel": "Demonstrate the growing visibility footer and the contextual Controls sub-panel after the automatic PIMO and FDW showcase. Keep all plant profiles closed.",
        "hint": "Select ORB to show Orbs again. Controls opens options for a selected object.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.9",
        "act": "Compare profiles",
        "title": "Another plant, another story",
        "main": "Every plant brings a different story. This time, you can choose which plant the Orb represents.",
        "panel": "Keep the first sample and its information available.",
        "hint": "Place a second Plant Orb.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.11",
        "act": "Compare profiles",
        "title": "Place another Plant Orb",
        "main": "This second Orb begins without a plant identity. Choose one, and its information can grow from there.",
        "panel": "Existing placement controls; media closed.",
        "hint": "Place the second Orb. Say a common or scientific plant name into the microphone, or type it in the Living Frame.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.12",
        "act": "Compare profiles",
        "title": "Thousands of plants. Thousands of stories.",
        "main": "Thousands of plants, thousands of living stories. Zinnia can find a plant you’re curious about and open a starting point for discovery. Its information can grow as more knowledge is added.",
        "panel": "Selected plant information only; Curiosity remains standard.",
        "hint": "Name a plant for Zinnia, confirm the species, then explore its photograph and starter Plant cells.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.14",
        "act": "Leave a message",
        "title": "Leave something behind",
        "main": "A plant profile tells part of a story. A Note lets someone leave an observation, a reminder or a message for another person to discover later.",
        "panel": "No invented observation or typing task.",
        "hint": "Add the prepared Note.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.16",
        "act": "Leave a message",
        "title": "Leave a message here",
        "main": "A Note can hold a seasonal observation or a useful message for the next visitor.",
        "panel": "Existing Note placement controls. Prepared message: Two sample plant profiles are available here. Select either Orb to explore.",
        "hint": "Choose a location and place the Note.",
        "art": "note"
    },
    {
        "id": "ELEMENTS 1.17",
        "act": "Leave a message",
        "title": "A message connected to place",
        "main": "Someone visiting later can discover this message right where it belongs.",
        "panel": "Selected Note content and existing Note controls.",
        "hint": "Select the Note to read it.",
        "art": null
    },
    {
        "id": "SPACE 1.4",
        "act": "Organise an area",
        "title": "Bring the pieces together",
        "main": "So far, we have explored plants, knowledge and a local message.\n\nIn a real place, these pieces can grow together.\n\nAn Area keeps them organised, with a Totem as its welcome point.",
        "panel": "Keep the sample plants and Note visible.",
        "hint": "Show the first Totem.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.18",
        "act": "Organise an area",
        "title": "A welcome point for My area",
        "main": "This Totem belongs to My area. Its signs help visitors find the plants and messages that belong here.",
        "panel": "Totem example and preloaded signage. Floor adjustment remains in Settings.",
        "hint": "Show the My area Totem.",
        "art": "totem"
    },
    {
        "id": "ELEMENTS 1.19",
        "act": "Organise an area",
        "title": "Find what belongs here",
        "main": "The Totem names the Area. Its signs point toward nearby plants and Notes, giving visitors a way to find what they want to explore.",
        "panel": "Existing Signs and Fade/Wake controls. Signs are already visible on arrival.",
        "hint": "",
        "art": "totem"
    },
    {
        "id": "AREA 1.2",
        "act": "Connect areas",
        "title": "Connect another area",
        "main": "A larger place can hold several Areas, each with its own stories. Add Second Area to see how visitors can find their way between them.",
        "panel": "My area and its content remain visible.",
        "hint": "Create the Second Area Totem.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.20",
        "act": "Connect areas",
        "title": "Give visitors a direction",
        "main": "Connect the Totems so each Area can point toward the other. Their plants and messages remain connected to their own locations.",
        "panel": "Second Area and local content. No remote destination sign until the link is created.",
        "hint": "Select Connect the Totems.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.21",
        "act": "Connect areas",
        "title": "Follow the direction",
        "main": "A sign on My area points toward the next destination, helping visitors find their way.",
        "panel": "Remote Totem notification uses its existing white strip. No surrounding destination outline.",
        "hint": "Select the Second Area sign.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.22",
        "act": "Connect areas",
        "title": "A place that can grow with knowledge",
        "main": "Plants, observations and directions can become part of one connected place. Next, see how this can support exploring, learning and planning on any land.",
        "panel": "Keep local information available without repeating the full main message.",
        "hint": "Continue to Utility: explore, learn and plan.",
        "art": "connectedAreas"
    },
    {
        "id": "UTILITY 1.1",
        "act": "Explore, learn and plan",
        "title": "Your Interactive Map · IMAP",
        "main": "Plants, Notes and Areas can connect knowledge to any land — from school gardens and university campuses to farms and public landscapes.",
        "panel": "Visitors can discover the plants along a public trail. School students can observe a garden through the seasons. University groups can connect field studies to a site. People caring for land can explore planting possibilities. The same tools support different questions and purposes.",
        "hint": "Grip the map centre to move it; use the joystick to turn or adjust distance. Release to place it. Set Totems on the pulsing entrance, forest and swale circles.",
        "art": null
    },
    {
        "id": "UTILITY 1.2",
        "act": "Learn before planting",
        "title": "Learn before planting",
        "main": "Explore what could grow here before anything is planted.\n\nCompare what to plant, the light, water, soil and climate each plant needs, and what it can provide — food, shade, habitat or support for the soil.\n\nVisitors, teachers and students can use these questions to learn about a place. People planning a planting can use that knowledge to make informed choices.",
        "panel": "Try three questions: What could grow here? What conditions would it need? What could it contribute? A school class could compare plants for a garden; a university group could investigate a site's conditions; a visitor could discover why a plant suits its surroundings.",
        "hint": "Continue to Learning Pathways to follow a question.",
        "art": null
    },
    {
        "id": "LEARNING 1.6",
        "act": "Learning pathways",
        "title": "An optional learning discovery",
        "main": "Learning Pathways turn discoveries into questions people can explore together. Here is an optional example.",
        "panel": "Six starting questions surround the Living Frame. LIMO is the final feature.",
        "hint": "Open Learning Pathways, or choose Finish without learning example in the Control Panel.",
        "art": "connection"
    },
    {
        "id": "LEARNING 1.7",
        "act": "Learning pathways",
        "title": "A question to explore",
        "main": "Explore a starting question, then connect two related LIMO cells. A new discovery opens between their ideas and can connect again to develop a deeper story.",
        "panel": "Selected learning question. The connection catalogue contains ten authored combinations.",
        "hint": "",
        "art": "pathways"
    },
    {
        "id": "LEARNING 1.8",
        "act": "Learning pathways",
        "title": "Build on what you discovered",
        "main": "When two questions connect, a new discovery can appear between them. That discovery can become the start of another question.",
        "panel": "Both source cells remain visible. The new discovery and its strings follow the orbit around the Living Frame.",
        "hint": "Connect Sun & shade with Plants & forest layers. Then connect Who shades whom? with First steps & later roles.",
        "art": null
    },
    {
        "id": "LEARNING 1.9",
        "act": "Learning pathways",
        "panel": "The existing source and target remain visible together.",
        "hint": "Select Uses.",
        "art": null,
        "title": "Choose the plant information",
        "main": "A learning question can connect to information about a real plant."
    },
    {
        "id": "LEARNING 1.10",
        "act": "Learning pathways",
        "panel": "Preserve the existing deliberate target hold.",
        "hint": "Hold Uses and Making.",
        "art": null,
        "title": "Connect a learning question",
        "main": "Hold the plant detail and learning question together to make their connection."
    },
    {
        "id": "LEARNING 1.11",
        "act": "Learning pathways",
        "panel": "Show the actual connected source, target and matching image.",
        "hint": "Finish the example.",
        "art": null,
        "title": "A detail becomes a learning activity",
        "main": "A teacher could ask which plant part is used and what preparation is recorded. The connected plant detail gives learners a source to return to."
    },
    {
        "id": "CLOSURE 1.1",
        "act": "Finish the sample",
        "title": "Knowledge grows with a place",
        "main": "You have explored a small example. In a real place, plants, observations and local knowledge can grow together over time, creating something others can explore, learn from and contribute to.",
        "panel": "Finish the sample cleanly. Any available published project is a separate choice after returning to welcome.",
        "hint": "",
        "art": null
    }
]);

export const DEMO_GUIDED_COPY = Object.freeze(Object.fromEntries(DEMO_GUIDED_STEPS.map(step=>[step.id,step.main])));
export const guidedDemoStep = id => DEMO_GUIDED_STEPS.find(step=>step.id===id);

// The demonstration is illustrative. Describe v2 as planned until the Creator
// projection, customization and Explorer loading path have shipped together.
export const DEMO_IMAP_INTRO_PARAGRAPHS=Object.freeze([
    'This is the Interactive Map, or IMAP. It brings Areas, Totems and Plant Orbs into one view. Let’s explore this example.',
    'We’re developing IMAP version two for Creator mode: a map that grows automatically as you add to your project.',
    'The plan is to let you customize its layout and choose an Area or Orb to explore. This demonstration shows the idea; those Creator features are still being developed.'
]);
