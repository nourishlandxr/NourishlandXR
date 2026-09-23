# LIM physical-device test checklist

Use this checklist on a real Android phone after enabling the normal developer
diagnostics setting when a technical trace is needed. Record the device,
browser, orientation and exact reproduction steps for every problem.

## Android phone

- [ ] Open the NourishlandXR demo in portrait.
- [ ] Confirm all eight parent faces are visible and readable.
- [ ] Aim at a LIM cell; confirm its bright hover outline appears immediately.
- [ ] Select it once; confirm its stable accent tint appears and the Control panel opens.
- [ ] Select cells from several different faces.
- [ ] Confirm the companion panel shows the selected cell's content and accent.
- [ ] Confirm previously revealed cells remain visible and do not move.
- [ ] Type into every available editable field and check responsiveness.
- [ ] Use the Selected topic and Plant views and confirm their content remains separate.
- [ ] Use Back, Continue, Skip and Close.
- [ ] Reposition and customise the companion panel.
- [ ] Rotate into landscape, then return to portrait.
- [ ] Confirm the LIM does not jump, shrink, overlap or clip at either orientation.
- [ ] Test hero-wheel dragging and momentum separately from LIM interaction.
- [ ] If a problem occurs, record the device, browser, viewport, orientation,
      pointer type, selected cell and exact reproduction steps.

## Optional devices

- [ ] Samsung S25, if available.
- [ ] Xiaomi device running Android 11, if available.
- [ ] Meta Quest 3, if available: verify tracked-pointer selection, anchored
      LIM placement, companion-panel readability and panel repositioning.

## Diagnostic capture

When developer diagnostics are enabled, capture the available trace after a
reproduction. It should include device and viewport, orientation, pointer type,
AR session start, LIM root placement, rendered-cell count, selected and hit
target IDs, companion-panel position, layout recalculation notices and
JavaScript errors. Diagnostics remain hidden during ordinary use.
