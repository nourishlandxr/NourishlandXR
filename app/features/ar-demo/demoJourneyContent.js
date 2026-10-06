// Guided narration from the reviewed demo.docx. Interaction handlers retain their existing mechanics.
export const DEMO_GUIDED_STEPS = Object.freeze([
    {
        "id": "INTRO 1.1",
        "act": "Introduce the tool",
        "title": "Knowledge connected to place",
        "main": "NourishlandXR brings information, knowledge and observations into the places they belong.\n\nA plant can share its story. Something noticed today can be left for someone to discover later. Information can connect what you see with what you want to understand.\n\nAs more is added, a place becomes richer with knowledge that can be explored, shared and built on over time.",
        "panel": "Hidden.",
        "hint": "See how it works.",
        "art": "opening"
    },
    {
        "id": "INTRO 1.2",
        "act": "Introduce the tool",
        "title": "Try the tools with sample content",
        "main": "NourishlandXR is for curious visitors, teachers and learners, and people who care for land and want to share their knowledge.\n\nFor this demo, we’ve prepared a few simple examples. No experience is needed — just take your time and follow your curiosity.",
        "panel": "Hidden. A real garden project is a separate experience after the sample demo.",
        "hint": "Start the demo.",
        "art": "opening"
    },
    {
        "id": "SPACE 1.1",
        "act": "Meet the panel",
        "title": "Your Control Panel",
        "main": "The Control Panel keeps information and useful actions close by as you explore. We’ll introduce more of it naturally along the way.",
        "panel": "A compact panel with its companion image visible. Media, Controls and Settings are initially closed.",
        "hint": "Continue to the first sample.",
        "art": null
    },
    {
        "id": "SPACE 1.2",
        "act": "Place a sample",
        "title": "Something catches your attention",
        "main": "Imagine you come across a tree or plant and wonder — what is it? Is it edible? How does it grow? What role could it play here?\n\nYou can add that plant and place a Plant Orb beside it, creating a starting point for its information, observations and discoveries.\n\nYou can choose from plants already available, or create your own.",
        "panel": "Keep the companion image available without repeating the main message.",
        "hint": "Place the sample marker in front of you.",
        "art": "curiosity"
    },
    {
        "id": "ELEMENTS 1.5",
        "act": "Place a sample",
        "title": "Place the first Plant Orb",
        "main": "Place the Pigeon Pea Orb in a comfortable spot in front of you. In a real place, its Orb would sit beside the plant.",
        "panel": "Existing placement controls; media closed.",
        "hint": "Aim at an open space and use the placement control.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.6",
        "act": "Open a profile",
        "title": "Your first plant to explore",
        "main": "Let’s begin with Pigeon Pea — a versatile shrub grown in many parts of the world for food, soil improvement and its many roles in the garden.\n\nIts Plant Orb is now in place. Select it and start discovering what makes this plant interesting.",
        "panel": "Selected plant identity. Curiosity is the standard presentation.",
        "hint": "Select the Pigeon Pea Orb.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.7",
        "act": "Open a profile",
        "title": "The compact Tag view",
        "main": "Tag shows the essentials. Use Controls to return to Curiosity when you want the information cells, or continue the demo.",
        "panel": "Optional compact view, not a required lesson.",
        "hint": "Curiosity is the standard view.",
        "art": null
    },
    {
        "id": "PIMO 1.2",
        "act": "Find a useful detail",
        "title": "There’s more to discover",
        "main": "There are many ways to get to know a plant. You might wonder how it grows, what it can provide, how it supports other life, or why it suits a particular place.\n\nLet’s follow one of those questions and see where it leads.",
        "panel": "Plant profile in Curiosity; keep only the relevant branch in focus.",
        "hint": "Select Uses.",
        "art": null
    },
    {
        "id": "PIMO 1.2a",
        "act": "Find a useful detail",
        "title": "Follow Uses",
        "main": "Select Culinary to discover the food examples.",
        "panel": "Uses information and its immediate child cells.",
        "hint": "Select Culinary.",
        "art": null
    },
    {
        "id": "PIMO 1.2b",
        "act": "Find a useful detail",
        "title": "Explore one use",
        "main": "Select Fresh peas to see one way Pigeon Pea can be used.",
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
        "main": "Want a closer look? The Image panel shows the image connected to your selection. Its label and the Control panel label are highlighted so you can find them. Use the Image button on the Control panel to show or hide the picture.",
        "panel": "Open the selected cell or plant’s authored image. Media is a panel opener, visually distinct from demo progression actions.",
        "hint": "Review the image, then continue.",
        "art": null
    },
    {
        "id": "PANEL 1.2",
        "act": "Meet the panel tools",
        "title": "Different ways to see information",
        "main": "Sometimes you want a quick answer. Other times, you might want to explore a plant more deeply.\n\nTag gives you the essentials at a glance, while Curiosity lets you follow different branches of knowledge.",
        "panel": "Show the available view choices in Controls without opening Settings. Explain Tag, Curiosity and optional Explorer there. Continuing closes Controls and restores Curiosity.",
        "hint": "Review the panels, then continue. Changing views is optional.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.9",
        "act": "Compare profiles",
        "title": "Another plant, another story",
        "main": "Every plant brings a different story. Add Moringa beside Pigeon Pea and explore what it can share.",
        "panel": "Keep the first sample and its information available.",
        "hint": "Add the Moringa sample.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.11",
        "act": "Compare profiles",
        "title": "Add Moringa",
        "main": "Place Moringa beside Pigeon Pea. Each plant keeps its own information, ready for you to explore.",
        "panel": "Existing placement controls; media closed.",
        "hint": "Place the Moringa Orb.",
        "art": null
    },
    {
        "id": "ELEMENTS 1.12",
        "act": "Compare profiles",
        "title": "Explore another story",
        "main": "Select Moringa to open its information. You can return to Pigeon Pea whenever you like.",
        "panel": "Selected plant information only; Curiosity remains standard.",
        "hint": "Select Moringa, or continue to add a sample Note.",
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
        "main": "Place this example Note beside the plants. In a real place, you could leave a seasonal observation or a useful message for the next visitor.",
        "panel": "Existing Note placement controls. Prepared message: Two sample plant profiles are available here. Select either Orb to explore.",
        "hint": "Choose a location and place the Note.",
        "art": "note"
    },
    {
        "id": "ELEMENTS 1.17",
        "act": "Leave a message",
        "title": "A message connected to place",
        "main": "Select the Note to read it. Someone visiting later can discover the message where it belongs.",
        "panel": "Selected Note content and existing Note controls.",
        "hint": "Select the Note, then continue to organise the area.",
        "art": null
    },
    {
        "id": "SPACE 1.4",
        "act": "Organise an area",
        "title": "Bring the pieces together",
        "main": "So far, we have explored plants, knowledge and a local message. In a real place, many of these pieces can grow together. An Area keeps them organised, with a Totem as its welcome point.",
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
        "hint": "Try the controls if you like, then create Second Area.",
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
        "main": "Select the Second Area sign on My area. Its arrow points toward the destination, helping you see where to go next.",
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
        "title": "Explore, learn and plan",
        "main": "Plants, Notes and Areas can connect knowledge to any land — from school gardens and university campuses to farms and public landscapes.",
        "panel": "Visitors can discover the plants along a public trail. School students can observe a garden through the seasons. University groups can connect field studies to a site. People caring for land can explore planting possibilities. The same tools support different questions and purposes.",
        "hint": "Play the map to see two gardens connect. Pause or replay whenever you choose, then discover learning before planting.",
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
        "main": "Want to see how this can become a learning experience? Open Learning Pathways, or choose Finish without learning example in the Control Panel.",
        "panel": "Four uniform starting cells grow from the Living Frame. Learning Pathways is the final feature.",
        "hint": "Open the learning example.",
        "art": "connection"
    },
    {
        "id": "LEARNING 1.7",
        "act": "Learning pathways",
        "title": "A question to explore",
        "main": "Explore a starting topic, or follow the Uses example to connect plant information with a learning activity.",
        "panel": "Selected learning cell information and authored image. No need to find a nested target before starting the guided connection.",
        "hint": "Try a starting topic, or connect the sample plant.",
        "art": "pathways"
    },
    {
        "id": "LEARNING 1.8",
        "act": "Learning pathways",
        "title": "Build on what you discovered",
        "main": "Connect Pigeon Pea Uses to Uses and Making. One plant detail can become the starting point for a question or activity.",
        "panel": "Uses is the guided default. Other prepared connection examples remain optional.",
        "hint": "Show the source and target together.",
        "art": null
    },
    {
        "id": "LEARNING 1.9",
        "act": "Learning pathways",
        "panel": "The existing source and target remain visible together.",
        "hint": "Select Uses.",
        "art": null,
        "title": "Choose the plant information",
        "main": "Select Uses in Pigeon Pea to choose the information for this learning example."
    },
    {
        "id": "LEARNING 1.10",
        "act": "Learning pathways",
        "panel": "Preserve the existing deliberate target hold.",
        "hint": "Hold Uses and Making.",
        "art": null,
        "title": "Connect a learning question",
        "main": "Hold Uses and Making until the connection completes."
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
        "main": "You have explored a small example. In a real place, plants, observations and local knowledge can grow together over time, creating something others can explore, learn from and contribute to.\n\nReturn to the welcome screen to discover a separate real garden project.",
        "panel": "Finish the sample cleanly. Any available published project is a separate choice after returning to welcome.",
        "hint": "Finish the sample demo.",
        "art": null
    }
]);

export const DEMO_GUIDED_COPY = Object.freeze(Object.fromEntries(DEMO_GUIDED_STEPS.map(step=>[step.id,step.main])));
export const guidedDemoStep = id => DEMO_GUIDED_STEPS.find(step=>step.id===id);
