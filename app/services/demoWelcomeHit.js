import { WELCOME_SHAPE } from './arWelcomePanel.js';
import { WELCOME_PANEL_DRAW_OFFSET } from './arWelcomeShowcase.js';
import { spatialDashboardRayHit } from './spatialDashboardMirror.js';

// LIMO cells occupy the entire shared texture. Only the central welcome note
// has the inset polygon boundary; clipping the quad loses all four pathways.
export function demoWelcomeSurfaceHit(ray,panel,{width=2500,height=2100,panelOnly=false}={}){
    const hit=spatialDashboardRayHit(ray,panel,{width,height});
    if(!hit || !panelOnly || width!==2500 || height!==2100)return hit;
    const centerX=WELCOME_PANEL_DRAW_OFFSET.x+WELCOME_SHAPE.cx;
    const centerY=WELCOME_PANEL_DRAW_OFFSET.y+WELCOME_SHAPE.cy;
    const px=hit.pixelX-centerX,py=hit.pixelY-centerY;
    const angle=Math.atan2(py,px),step=Math.PI*2/WELCOME_SHAPE.sides;
    const vertexAngle=-Math.PI/2+Math.round((angle+Math.PI/2)/step)*step;
    const edgeAngle=vertexAngle+step/2;
    const apothem=(WELCOME_SHAPE.radius-22)*Math.cos(step/2);
    return Math.hypot(px,py)*Math.cos(angle-edgeAngle)>apothem?null:hit;
}
