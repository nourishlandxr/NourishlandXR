NOURISHLAND — DEMO REFINEMENT & IMPLEMENTATION BRIEF
For: Codex / Development Team
Scope: Complete demo experience, onboarding, controller interactions, virtual hands, hand tracking, Zinnia interactions, and closing sequence
Priority: Demo readiness, interaction precision, and user experience

1. Overall Objective
Refine the entire Nourishland demo into a seamless, intuitive, and polished experience from beginning to end.

The demo must showcase three different interaction methods through practical activities:

Physical controllers: Interactive orb and controller familiarisation.
Virtual hands: Brush painting and fruit manipulation.
Hand tracking: Tic-tac-toe without physical controllers.
Do not explain all three methods at the beginning. Allow users to discover each method through an activity, then summarise what they have experienced at the end.

Global requirements
Reduce unnecessary steps, interruptions, and repetitive instructions.
Improve the speed and naturalness of Zinnia's dialogue.
Eliminate visible loading sequences that make the experience feel unfinished.
Ensure accurate collisions, gripping, object positioning, and interaction feedback.
Keep the tabletop environment clean and remove objects when they are no longer needed.
Use the newly installed Meta SDK methods wherever applicable, ensuring compatibility with the project's current SDK version.
Preserve existing working functionality unless a change is specifically requested.
Prioritise interaction quality over unnecessary animations or visual complexity.
2. Opening Scene — Frame and Background Loading
Current issue
The opening frame appears first, followed by the background film or screen. This makes the loading process appear fragmented.

Required changes
Load the opening frame and its background screen/film together as one visual unit.
Do not reveal either component until both are fully ready.
If the two assets require different loading times, keep the opening hidden until both are prepared.
Once the complete visual unit is visible, introduce the opening text.
Avoid visual popping, delayed textures, or staggered asset appearance.
Expected result: The opening scene appears complete and intentional, followed by the text animation.

3. Table Placement — Glowing Outline and Freeform Positioning
Current issue
The table positioning outline looks like a static line rather than an interactive object. Grabbing and adjusting it does not feel sufficiently responsive.

Required changes
Visual appearance

Give the table outline a subtle but clearly visible glow.
The glow should communicate that the outline is an active, adjustable object.
Maintain clear visibility against the mixed-reality environment.
Interaction

The outline must attach reliably to the user's controller or hand when grabbed.
Once grabbed, it must remain attached until the user intentionally releases it.
Allow freeform positioning in three dimensions.
Support horizontal movement, vertical movement, height adjustment, and rotation, including vertical orientation.
Do not unnecessarily constrain the table to a horizontal plane during positioning.
Ensure smooth, stable movement without jumping or unexpected detachment.
Expected result: The user can confidently grab and position the table outline anywhere appropriate, with immediate visual feedback.

4. Zinnia — Natural Voice Conversation
Current issue
Voice recognition is functioning, but conversations remain repetitive and sometimes fail to produce a useful outcome.

Required changes
Make Zinnia's conversational responses shorter, more natural, and context-aware.
Reduce unnecessary back-and-forth exchanges.
Avoid restarting conversations when a response is unclear.
Maintain conversational context between questions and answers.
Improve recognition and handling of names, confirmations, and short replies.
Use natural clarification requests instead of technical error messages.
When a user response is ambiguous, attempt an appropriate contextual clarification.
Avoid endless retry loops; provide a helpful fallback when recognition repeatedly fails.
Keep the tutorial progressing whenever user intent is sufficiently clear.
Example interaction
Zinnia: "What's your name?"

User: "Andrea."

Zinnia: "Nice to meet you, Andrea!"

If recognition fails:

Zinnia: "Sorry, could you repeat that?"

If still unclear:

Zinnia: "I didn't quite catch your name. Could you say it once more?"

Avoid robotic statements such as "I could not hear that."

Implementation considerations
Improve speech recognition state handling.
Prevent overlapping listening and speaking states.
Avoid premature timeouts and duplicate responses.
Maintain dialogue context.
Use appropriate confidence handling and fallback logic.
Ensure successful recognition immediately advances the conversation.
Expected result: A sharper, friendlier, more human conversation that helps users progress through the demo.

5. Physical Controllers — Orb Introduction
Purpose
Introduce users to the physical controllers through a simple interactive orb activity.

Required changes
Place the interactive orb directly on the table.
The orb should begin in a free-moving state.
It should behave like a small remote-controlled ball moving across the tabletop.
Do not begin with the orb floating in the air.
Make the interaction playful and immediately understandable.
Important clarification
The demo orb is specifically designed to demonstrate controller functionality.

In the actual Nourishland platform, the orb used in menus will normally be a static floating object rather than a freely playable ball.

This distinction must be clear so users do not assume that all platform orbs behave like the demo version.

Suggested Zinnia dialogue
"Let's explore your controllers using this little orb. For this demo, you can move it around the table."

6. Controller Buttons — One Continuous Tutorial
Current issue
The controller button sequence is divided into separate A/B and X/Y stages, making the experience longer than necessary.

Required changes
Combine A, B, X, and Y into one continuous tutorial section.
Do not interrupt the sequence between controller sides.
Keep the instructions short.
Recognise each button press immediately.
Advance smoothly when the required inputs are completed.
Avoid unnecessary pauses and repeated dialogue.
Information balloons
Improve the controller information balloons:

Use round or circular balloon shapes.
Increase the font size slightly.
Apply subtle transparency.
Keep the balloons readable and visually lightweight.
Position them higher, closer to the user's natural viewing area.
Align each balloon with its corresponding controller.
Position the right controller's balloon towards the upper-right/northeast area.
Position the left controller's balloon towards the upper-left/northwest area.
Keep the balloons within close visual proximity to the controllers.
Avoid making users look excessively downwards to read instructions.
Ensure the balloons do not obscure the buttons or hands.
Expected result: A single, quick, intuitive controller familiarisation sequence.

7. Orb Movement — Collision and Feedback
Required changes
The orb should behave like a small remote-controlled ball travelling across the table.

Movement

Left and right controller inputs should create understandable directional movement.
Keep movement smooth and responsive.
Maintain the orb's contact with the tabletop.
Prevent unexpected floating, clipping, or unstable motion.
Collision detection

Ensure accurate collision boundaries around the orb.
Precisely detect contact with table edges.
Precisely detect contact with Zinnia's pot.
Avoid premature collision triggers caused by oversized colliders.
Feedback

When the orb collides with an edge or Zinnia's pot, provide:

An appropriate sound effect.
Controller haptic vibration.
Immediate physical/visual response to the collision.
Use subtle, consistent feedback rather than exaggerated effects.

Expected result: The orb feels physically connected to the tabletop and responds convincingly to its surroundings.

8. Settings Introduction
Sequence
Once the controller button and orb activities are complete:

Remove the orb from the table.
Transition into the Settings demonstration.
Highlight the relevant Settings interface.
Briefly showcase examples of available settings and what users can adjust.
Keep this introduction concise.
Transition to the next controller demonstration.
Important
Do not leave the orb on the table during Settings. It becomes a distraction once its tutorial purpose has ended.

When Settings or other menu navigation is demonstrated, highlight the relevant icons so users clearly understand where to look and what to select.

9. Specialised Controllers — RC Bug and Paint Brush
Current issue
Users are being asked to select controller types through menus, adding unnecessary steps.

Required changes
Automatically load both the RC Bug controller and Paint Brush controller onto the table.
Do not require users to navigate a menu to load them.
Display both objects together as examples of different specialised controllers.
Explain briefly that Nourishland supports different controllers for different activities.
Focus this demo on the Paint Brush controller.
Suggested Zinnia dialogue
"In Nourishland, you can use different tools for different activities. Here's a controller for an RC bug, and here's one for painting. Let's try the brush."

Interaction sequence
Both specialised controllers appear on the table.
Zinnia introduces their different purposes.
The user is invited to pick up the brush.
Once the brush is successfully picked up, fade out the RC Bug controller.
Begin the painting activity.
Brush gripping issue
The brush currently does not align correctly with the virtual hand.

Fix the brush's grip attachment and orientation so that:

The brush sits naturally in the user's hand.
The grip point aligns with the intended holding position.
The brush does not appear offset or incorrectly rotated.
The brush follows hand/controller movement consistently.
Painting input corresponds accurately to the brush tip.
Expected result: A simple demonstration of specialised tools followed by a convincing painting interaction.

10. Virtual Hands — Fruit Interaction Activity
Purpose
Demonstrate how virtual hands allow users to interact with objects in Nourishland.

Environment redesign
Replace the current fruit basket experience.

New layout

Load a wooden board on the right-hand side of the table.
Arrange the fruits neatly across the wooden board.
Place a small plate near the centre of the table, in front of Zinnia.
Ensure each fruit is clearly visible and accessible.
Keep enough spacing between objects for comfortable grabbing and manipulation.
Context explanation
Explain that these interactions represent activities available throughout Nourishland, including the main platform, activity experiences, and Creator Mode.

Mention that the fruit interaction demonstrates the kind of functionality used with Nourishland fruit boxes and related activities.

Suggested Zinnia dialogue
"Now let's try interacting with some fruit. You'll use activities like these across Nourishland, including in Creator Mode."

Activity sequence
The user should be able to:

Pick up fruits from the wooden board.
Cut the applicable fruits.
Peel the banana.
Take a bite from the apple.
Eat approximately half of the banana by bringing it to the mouth.
Place the remaining fruit portions onto the plate.
The intended final result is a plate containing approximately half of each fruit, reducing clutter while demonstrating several interaction types.

Critical collision fixes
Current issue: Some fruits, especially the apple, have collision areas extending significantly beyond their visible geometry.

This creates inaccurate contact, premature interactions, and buggy grabbing behaviour.

Required fixes:

Review collision geometry for every fruit.
Fit collision boundaries closely to the visible fruit surfaces.
Where appropriate, allow a very small inward tolerance rather than oversized outward collision zones.
Ensure accurate contact for grabbing, cutting, peeling, eating, and placement.
Prevent fruits from colliding with hands before visible contact occurs.
Validate each fruit individually.
Cutting and object persistence
Current issue: Cutting a fruit can leave one piece attached to the hand while the other piece floats or behaves incorrectly.

Required fixes:

Both fruit portions must remain physically stable after cutting.
If one portion remains held, the other must settle naturally onto the board, table, or plate.
Prevent detached fruit pieces from hovering.
Ensure both portions can subsequently be grabbed and moved.
Preserve consistent object states after cutting, peeling, and eating.
Ensure objects placed on the plate remain there.
Eating interactions
Apple: allow a clear bite interaction that visibly removes an appropriate portion.
Banana: bringing the peeled banana to the mouth should consume approximately half.
Remaining portions must have accurate geometry and collision behaviour.
Avoid creating excessive loose objects.
Expected result: A precise, enjoyable, and convincing virtual-hand interaction that demonstrates real object manipulation.

11. Virtual Hand Visual Transition
Current issue
Virtual hands currently appear through a wrist-up covering or build-up effect.

Required changes
Replace this with a cleaner transition:

Apply a brief glow effect.
Fade out or remove the visible controllers.
Reveal the complete virtual hands directly.
Avoid constructing or covering the hands progressively from the wrists.
Use the existing NES-style effect as the visual reference, as this already works well.

The transition should feel immediate, polished, and consistent with the Nourishland visual language.

Expected result: Controllers disappear and complete virtual hands appear through a short glow transition.

12. Laser Pointers — Zinnia Leaf Interaction
Purpose
Provide a short demonstration of how laser pointers enable interaction with objects at a distance.

Current issues
Leaf contact regions are too small or irregular.
Pointer connections can detach too easily.
The interaction is too brief.
Zinnia's movement does not always respond convincingly.
Required changes
Targeting

Increase the usable contact area on Zinnia's leaves slightly.
Keep the enlarged interaction region visually consistent with the leaf geometry.
Highlight leaves when targeted.
Provide clear feedback when the pointer has a valid target.
Grip and connection

Pressing Grip while targeting a leaf should establish a persistent connection.
The laser must remain linked to the selected leaf while Grip is held.
Moving the user's hand away should not accidentally break the connection.
Release should occur intentionally when Grip is released or through the defined interaction-ending behaviour.
Keep the laser endpoint attached to the leaf as Zinnia moves.
Movement

Allow the user to maintain the interaction for approximately eight seconds.
When the user pulls left or right, Zinnia should respond naturally.
Under appropriate movement conditions, her body should follow the leaf interaction slightly.
Prevent exaggerated or physically implausible stretching.
Expected result
A short but convincing demonstration of pointer-based interaction, with reliable attachment, highlighted targets, and subtle responsive movement.

13. Hand Tracking — Tic-Tac-Toe Activity
Purpose
Demonstrate interaction without holding physical controllers.

This should be the final major interactive activity.

Transition
After the controller and virtual-hand activities:

Invite the user to put down the physical controllers.
Activate Meta hand tracking.
Transition into the hand-tracking presentation.
Load the tic-tac-toe experience.
Board design
Increase the board size so that all nine squares are comfortably usable.
Position the board on the table in front of Zinnia.
Arrange the playing pieces around the board, within comfortable reach.
Ensure the pieces can be picked up and placed using tracked hands.
Prevent pieces from overlapping or colliding unintentionally.
Gameplay
The user plays first.
Zinnia takes the second turn.
Alternate turns correctly until the game ends.
Ensure valid moves and correct win/draw detection.
Support a natural board rotation or orientation adjustment where needed for the interaction.
Prevent rotation from disrupting pieces already placed.
Replay
At the end of the game, Zinnia asks:

"Would you like to play again?"

If the user says yes, reset the board and begin another round.

If the user says no, proceed to the closing sequence.

Technical requirements
Repair the existing tic-tac-toe functionality.
Ensure reliable hand-tracking input.
Use stable grip/pinch interactions as appropriate.
Prevent accidental multiple placements.
Ensure each piece snaps correctly into its intended square.
Prevent invalid or occupied-square placements.
Maintain correct turn order.
Handle hand-tracking loss and recovery gracefully.
Expected result: A simple, enjoyable game that clearly demonstrates hand tracking without controllers.

14. Closing Sequence — Summarise the Three Interaction Methods
Important change
Do not introduce or explain all three interaction modes in detail before the activities.

The user should first experience them.

Only at the end should Zinnia briefly explain what has been demonstrated.

Suggested closing dialogue
"Great job! You've now explored three ways to interact in Nourishland: using your controllers, using virtual hands, and using hand tracking.

There's so much more to discover. Thank you for exploring with me!"

Final interface
Transition smoothly to the appropriate main menu or end-of-demo interface.
Highlight the relevant activity or game icon when explaining where users can explore further.
Ensure users can identify where to go next.
Avoid introducing another lengthy tutorial.
15. Proposed End-to-End Demo Sequence
The following is the intended overall flow.

Stage	Experience	Main objective
1	Opening scene	Frame and background load together
2	Table positioning	Glowing, freely adjustable outline
3	Zinnia introduction	Natural voice conversation
4	Orb introduction	Orb appears on tabletop
5	Controller familiarisation	A, B, X, Y in one continuous sequence
6	Orb movement	Remote-control movement and collision feedback
7	Settings	Brief menu and settings demonstration
8	Specialised tools	RC Bug and Paint Brush introduced
9	Painting	Pick up brush and paint
10	Virtual hands	Clean glow transition
11	Fruit activity	Cut, peel, eat, and plate fruits
12	Laser pointers	Connect to and interact with Zinnia's leaves
13	Hand tracking	Put down controllers and activate tracking
14	Tic-tac-toe	Play against Zinnia
15	Closing	Summarise three interaction methods
16	Final navigation	Highlight where to explore next
Note: The laser-pointer section should use the interaction mode and input bindings supported by the existing implementation. Its placement should preserve a logical transition from controller-based interaction into hand tracking.

16. Technical Implementation Requirements
Meta SDK
Use the newly installed Meta SDK implementation and its current supported APIs.

Before modifying functionality:

Identify the installed SDK version and available interaction components.
Verify current controller input bindings.
Verify hand-tracking and interaction APIs.
Verify haptic feedback support.
Check relevant SDK deprecations or changed methods.
Avoid mixing obsolete interaction methods with newer implementations.
Do not assume API names or behaviours without checking the installed project dependencies.

Interaction reliability
Prioritise:

Precise collision boundaries.
Reliable grabbing and releasing.
Correct object attachment points.
Stable object movement.
Consistent physics.
Proper scene transitions.
Accurate controller input.
Reliable hand tracking.
Natural speech state handling.
Performance and loading
Prepare dependent visual assets before revealing them.
Avoid visible asset popping.
Avoid loading unnecessary objects simultaneously.
Remove or hide tutorial objects after their section finishes.
Keep transitions short and visually consistent.
Avoid unnecessary animation delays.
Preserve stable performance on the target Meta Quest hardware.
Interaction feedback
Use visual, audio, and haptic feedback consistently where supported and appropriate.

Feedback should be:

Immediate.
Subtle.
Understandable.
Consistent.
Connected to the actual interaction event.
17. Implementation Priorities
P0 — Critical functional issues
Fix fruit collision boundaries and post-cut physics.
Fix grabbing and object attachment, including brush alignment.
Fix reliable laser attachment to Zinnia's leaves.
Repair tic-tac-toe interactions and gameplay.
Stabilise voice recognition and dialogue progression.
Validate compatibility with the installed Meta SDK.
Ensure the demo can progress from beginning to end without becoming stuck.
P1 — User experience improvements
Simplify the overall demo sequence.
Combine A/B/X/Y into one continuous tutorial.
Improve freeform table positioning.
Make the orb a tabletop remote-controlled object.
Improve information balloon placement and appearance.
Automatically introduce specialised controllers.
Replace the fruit basket with the wooden board and plate.
Improve Zinnia's natural dialogue and transitions.
P2 — Visual polish
Synchronise opening frame and background loading.
Add a glowing table outline.
Improve virtual-hand glow transitions.
Add leaf targeting highlights.
Refine sound and haptic collision effects.
Improve tutorial icon highlighting.
Polish object appearance and disappearance.
18. Instructions to Codex
Work through the existing project systematically.

Step 1 — Inspect

Review the current demo architecture, scene flow, interaction components, existing assets, dialogue system, and installed Meta SDK version.

Identify the relevant scripts, prefabs, scene objects, input bindings, and interaction dependencies.

Step 2 — Preserve

Keep working systems intact. Reuse existing components and assets wherever possible.

Do not unnecessarily rebuild functionality that can be corrected through targeted modifications.

Step 3 — Implement

Apply the changes in the order of the intended user journey, while addressing critical technical dependencies first.

Ensure each tutorial section has clear entry, interaction, completion, and exit states.

Step 4 — Validate

Test every major interaction, including:

Loading and transitions.
Controller inputs.
Voice recognition.
Object gripping.
Table positioning.
Collision accuracy.
Haptic and sound feedback.
Virtual-hand alignment.
Fruit manipulation.
Laser attachment.
Hand tracking.
Tic-tac-toe gameplay.
Replay and exit behaviour.
Step 5 — End-to-end test

Run the complete demo from the opening frame to the closing sequence.

Verify that users can complete the experience without developer intervention, unnecessary repetition, or broken transitions.

Step 6 — Report

Provide a clear implementation summary identifying:

What was changed.
Which files or components were modified.
Which issues were resolved.
Which items require additional testing.
Any SDK limitations or unresolved dependencies.
Do not claim a feature has been tested on hardware unless an actual hardware test was performed.

Final Success Criteria
The Nourishland demo is ready when a first-time user can complete the full experience naturally, without needing external explanation.

The experience should feel:

Simple. Intuitive. Responsive. Precise. Playful. Polished.

Every interaction must have a clear purpose. Every transition should feel intentional. Every physical interaction should behave convincingly.

The goal is not to showcase every feature of Nourishland. It is to give users a compelling introduction to how they can interact with the platform through controllers, virtual hands, and hand tracking.


LATEST EXPERIENCE ORDER (user clarification)
Controllers: Orb manipulation and dancing with Zinnia.
Virtual hands: Fruit, brush, and special controller interaction.
Hand tracking: Butterfly bucket and tic-tac-toe. Pinch/grab butterflies, release them to fly briefly, and let them land along the live outline of real tracked hands.
After one complete tic-tac-toe round, all three experiences unlock and are suggested as switchable throughout the rest of the demo.
