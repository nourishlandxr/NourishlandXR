const action = (id, label) => Object.freeze({ id, label });

const step = value => Object.freeze({
    ...value,
    actions: Object.freeze(value.actions.map(item => action(item.id, item.label))),
    ...(value.checkpoints ? { checkpoints: Object.freeze(value.checkpoints.map(item => Object.freeze({ ...item }))) } : {})
});

/** Shared, voice-free copy and stable stage IDs for the beginner Creator setup flow. */
export const CREATOR_PROJECT_TUTORIAL = Object.freeze({
    id: 'creator-project-setup-v1',
    title: 'Create your first project',
    introduction: 'Give your project a purpose, place it on the map, then add a place and something to discover.',
    steps: Object.freeze([
        step({
            id: 'project-identity',
            heading: 'Give your project a purpose',
            body: 'Name this project and tell us what you want to grow, care for, learn about, or share.',
            note: 'You can change the name and purpose later.',
            actions: [{ id: 'save-identity', label: 'Save name and purpose' }],
            completion: 'Project name and purpose are saved to this draft.'
        }),
        step({
            id: 'geographic-origin',
            heading: 'Choose one geographic origin',
            body: 'Set one starting location for the project. It gives the map broad geographic context; it does not place individual records in physical space.',
            note: 'Your browser asks for location permission only after you choose device location. You can also enter coordinates manually.',
            permissionDenied: 'Location was not shared. Enter coordinates manually to set the project origin without enabling location access.',
            distinction: 'This single project origin is separate from placing an individual record with an XR spatial anchor or linking a printed ArUco tag. Those can be set later for each record.',
            actions: [
                { id: 'use-device-location', label: 'Use device location' },
                { id: 'enter-origin-coordinates', label: 'Enter coordinates manually' },
                { id: 'save-origin', label: 'Save project origin' }
            ],
            completion: 'One project geographic origin is saved.'
        }),
        step({
            id: 'load-map-information',
            heading: 'Load map information',
            body: 'Use the project origin to load map information for this place. Check that it is the right location, then continue.',
            actions: [{ id: 'load-map', label: 'Load map information' }],
            unavailable: 'Map information could not load. Your project origin and finished steps stay in place. Retry the map or continue with the place name.',
            completion: 'Map information is visible, or the map service is clearly marked as unavailable.'
        }),
        step({
            id: 'first-area',
            heading: 'Set up your first Area',
            body: 'An Area is a meaningful place inside your project, such as an orchard, nursery, or north garden. Areas organise the records you add there.',
            existingArea: 'A default Home Area may already be set up as project scaffolding. It is not your first working Area. Choose an existing working Area or create one for this project.',
            actions: [{ id: 'save-first-area', label: 'Save first Area' }],
            completion: 'A working Area is selected or created for the learner\'s work.'
        }),
        step({
            id: 'first-record',
            heading: 'Add your first record',
            body: 'Add a plant, note, or other project element to this Area. It will remain the same record when you change views.',
            emptyProject: 'There are no records yet. Add one to see how a record belongs to an Area.',
            existingExample: 'A Pigeon Pea example may already be included as reference content. It does not complete your first-record step. Add your own record in a working Area, and do not duplicate the sample.',
            actions: [{ id: 'add-first-record', label: 'Add first record' }],
            completion: 'The learner\'s own record is saved inside that working Area.'
        }),
        step({
            id: 'save-reopen-and-switch-views',
            heading: 'Save, return, and explore',
            body: 'Save this as a draft project. Reopen it from your projects, then switch between the Flat map and Interactive Map to explore the same work.',
            note: 'Saved does not mean published. Visitors cannot see this draft until you publish it.',
            identityRule: 'The Flat map and Interactive Map use the same project and record identities. Switching views must not copy or recreate your project or records.',
            resume: 'You can go back, leave setup, and resume from the last completed step.',
            checkpoints: [
                { id: 'draft-saved', label: 'Save the draft and wait for server confirmation.' },
                { id: 'project-reopened', label: 'Reopen the same project from your project list.' },
                { id: 'flat-view-opened', label: 'Open the project in the flat view.' },
                { id: 'imap-view-opened', label: 'Open the same project in IMAP.' }
            ],
            actions: [
                { id: 'save-draft', label: 'Save draft' },
                { id: 'reopen-project', label: 'Reopen project' },
                { id: 'open-flat-view', label: 'Open flat view' },
                { id: 'open-imap-view', label: 'Open IMAP' }
            ],
            completion: 'The same saved draft reopens and appears in both views with stable identities.'
        })
    ]),
    navigation: Object.freeze({
        back: 'Back to the previous step. Completed details remain in this draft.',
        resume: 'Continue setup from the last completed step.',
        retry: 'Try again using the same project draft. Do not create a second project after a timeout.',
        savePending: 'The project server has not confirmed this save yet. Keep your details here and retry when connected.',
        saveFailed: 'Your project was not confirmed as saved. Keep the same draft open and retry; do not mark it complete or published.',
        permissionDenied: 'Enter coordinates manually to set the same single project origin.',
        mapUnavailable: 'Map information is unavailable right now. Keep the origin and continue by place name, or retry the map.',
        projectUnavailable: 'The project service is unavailable. Keep this setup open and retry the same draft when the service returns.'
    })
});

export const CREATOR_PROJECT_TUTORIAL_STEP_IDS = Object.freeze(
    CREATOR_PROJECT_TUTORIAL.steps.map(item => item.id)
);
