import { Group } from './nlxr/vendor/three.module.min.js';

// Andre's selected opening view, 17 October 2026. Depth is zero-based internally.
export const LANDING_VIEW = Object.freeze({ pitch: -62.5, yaw: -2.3, roll: 20.3, depth: 2 });
// Tilt and turn stay locked. Horizontal input changes Roll Z and distance only.
export const LOCKED_VIEW = Object.freeze({
  pitch: LANDING_VIEW.pitch * Math.PI / 180,
  yaw: LANDING_VIEW.yaw * Math.PI / 180,
  roll: LANDING_VIEW.roll * Math.PI / 180
});

// V5 terrain aperture: midpoint of its inner front and rear boundary bounds.
// This is the empty opening's pivot, rather than the overall model origin.
export const WHEEL_OPENING = Object.freeze({ x: 0.1249999851, y: 0.2416666783, z: -0.0201408537 });

export function createWheelPivot() {
  const wheel = new Group();
  const model = new Group();
  model.position.set(-WHEEL_OPENING.x, -WHEEL_OPENING.y, -WHEEL_OPENING.z);
  wheel.add(model);
  return { wheel, model };
}

// A full turn takes about 17 minutes; 100 mouse pixels adds only 4.3 degrees.
export const AMBIENT_ROLL_SPEED = 0.006;

export function rollView(roll, deltaX, pointerType = 'mouse') {
  return roll + deltaX * (pointerType === 'touch' ? 0.0009 : 0.00075);
}

// Screenshot-approved framing: Forest worlds is farthest, Understory is closest.
export const HERO_ZOOM_LIMITS = Object.freeze({ farDepth: 1, nearDepth: 3, far: 5.25, near: 2.24 });

export function depthDistance(distance, wholeDistance) {
  return Math.max(HERO_ZOOM_LIMITS.near, Math.min(HERO_ZOOM_LIMITS.far, distance)) * wholeDistance / 7.5;
}

// Continuous exponential zoom: every wheel/trackpad delta contributes, with hard bounds.
export function zoomView(distance, deltaY, deltaMode = 0, height = 800, wholeDistance = 8.8) {
  if (!Number.isFinite(deltaY)) return distance;
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? height : 1);
  const next = distance * Math.exp(-Math.max(-1000, Math.min(1000, pixels)) * 0.0008);
  return Math.max(depthDistance(HERO_ZOOM_LIMITS.near, wholeDistance), Math.min(depthDistance(HERO_ZOOM_LIMITS.far, wholeDistance), next));
}
