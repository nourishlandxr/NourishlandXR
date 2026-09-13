// Original AR welcome glass, shared by the showcase and scrolling welcome.
export function drawArWelcomePanel(ctx) {
    // Keep the welcome note readable but subordinate to the surrounding LIM.
    // The canvas translation and text coordinates remain unchanged so the
    // tutorial copy and its spatial anchor are not redesigned in this phase.
    const noteGradient = ctx.createLinearGradient(250, 300, 1150, 800);
    noteGradient.addColorStop(0, 'rgba(74,122,91,.64)');
    noteGradient.addColorStop(.48, 'rgba(24,70,48,.54)');
    noteGradient.addColorStop(1, 'rgba(8,32,21,.42)');
    ctx.fillStyle = noteGradient;
    ctx.strokeStyle = 'rgba(239,255,229,.82)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(250, 300, 900, 500, [52, 42, 56, 46]);
    ctx.fill();
    ctx.stroke();
    const glassLight = ctx.createRadialGradient(360, 290, 20, 470, 350, 420);
    glassLight.addColorStop(0, 'rgba(255,255,255,.2)');
    glassLight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glassLight;
    ctx.beginPath();
    ctx.roundRect(256, 306, 888, 488, [48, 38, 50, 42]);
    ctx.fill();
}
