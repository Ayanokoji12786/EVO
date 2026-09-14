import * as THREE from 'three';

// The logical camera model stays a simple (x, y, zoom) — the same shape the whole app
// already reasons about (pan, zoom, radius-scales-with-zoom, etc.) — but it now drives a
// real perspective camera looking down at an angle, instead of a flat 2D affine transform.
// worldToScreen/screenToWorld do genuine 3D projection/raycasting so clicks, the God Mode
// radial menu, and creature picking all line up with what's actually rendered.

const PITCH = THREE.MathUtils.degToRad(58); // angle below horizontal the camera looks from
const BASE_DISTANCE = 1400; // world units of camera distance at zoom = 1

export interface Camera {
  x: number; // world-space look-at point (ground level)
  y: number;
  zoom: number; // higher = closer; same semantic range as before (0.15..8)
  viewportW: number;
  viewportH: number;
  followId: number | null;
  three: THREE.PerspectiveCamera;
}

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const scratchVec3 = new THREE.Vector3();
const scratchVec2 = new THREE.Vector2();

function syncThree(cam: Camera) {
  const dist = BASE_DISTANCE / cam.zoom;
  const height = dist * Math.sin(PITCH);
  const back = dist * Math.cos(PITCH);
  cam.three.position.set(cam.x, height, cam.y + back);
  cam.three.up.set(0, 1, 0);
  cam.three.lookAt(cam.x, 0, cam.y);
  cam.three.aspect = cam.viewportW / Math.max(1, cam.viewportH);
  cam.three.near = Math.max(1, dist * 0.02);
  cam.three.far = dist * 8 + 4000;
  cam.three.updateProjectionMatrix();
}

export function createCamera(worldSize: number, viewportW: number, viewportH: number): Camera {
  // Don't force the whole world into view — a large ecosystem is meant to be explored by
  // panning/zooming. Default to showing a fixed, readable span (creatures stay a visible
  // size) and let the world extend beyond the initial viewport.
  const targetSpan = Math.min(worldSize, 1400);
  const three = new THREE.PerspectiveCamera(42, viewportW / Math.max(1, viewportH), 1, 20000);
  const cam: Camera = {
    x: worldSize / 2,
    y: worldSize / 2,
    zoom: BASE_DISTANCE / targetSpan,
    viewportW,
    viewportH,
    followId: null,
    three,
  };
  syncThree(cam);
  return cam;
}

export function worldToScreen(cam: Camera, x: number, y: number, worldHeight = 0): [number, number] {
  syncThree(cam);
  scratchVec3.set(x, worldHeight, y).project(cam.three);
  return [((scratchVec3.x + 1) / 2) * cam.viewportW, ((1 - scratchVec3.y) / 2) * cam.viewportH];
}

export function screenToWorld(cam: Camera, sx: number, sy: number): [number, number] {
  syncThree(cam);
  scratchVec2.x = (sx / cam.viewportW) * 2 - 1;
  scratchVec2.y = -(sy / cam.viewportH) * 2 + 1;
  raycaster.setFromCamera(scratchVec2, cam.three);
  const hit = raycaster.ray.intersectPlane(groundPlane, scratchVec3);
  if (!hit) return [cam.x, cam.y];
  return [hit.x, hit.z];
}

export function panCamera(cam: Camera, dx: number, dy: number) {
  // Panning drags the *ground* under the cursor, so convert the screen delta into a
  // ground-plane delta at the current distance rather than treating it as flat pixels.
  const [wx0, wy0] = screenToWorld(cam, cam.viewportW / 2, cam.viewportH / 2);
  const [wx1, wy1] = screenToWorld(cam, cam.viewportW / 2 - dx, cam.viewportH / 2 - dy);
  cam.x += wx1 - wx0;
  cam.y += wy1 - wy0;
  cam.followId = null;
}

export function zoomCamera(cam: Camera, factor: number, aroundScreenX?: number, aroundScreenY?: number) {
  const newZoom = Math.max(0.15, Math.min(8, cam.zoom * factor));
  if (aroundScreenX !== undefined && aroundScreenY !== undefined) {
    const [wx, wy] = screenToWorld(cam, aroundScreenX, aroundScreenY);
    cam.zoom = newZoom;
    syncThree(cam);
    const [wx2, wy2] = screenToWorld(cam, aroundScreenX, aroundScreenY);
    cam.x += wx - wx2;
    cam.y += wy - wy2;
  } else {
    cam.zoom = newZoom;
  }
  syncThree(cam);
}

export function syncCamera(cam: Camera) {
  syncThree(cam);
}
