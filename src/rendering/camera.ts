export interface Camera {
  x: number; // world-space center
  y: number;
  zoom: number; // screen px per world unit
  viewportW: number;
  viewportH: number;
  followId: number | null;
}

export function createCamera(worldSize: number, viewportW: number, viewportH: number): Camera {
  return {
    x: worldSize / 2,
    y: worldSize / 2,
    zoom: Math.min(viewportW, viewportH) / worldSize,
    viewportW,
    viewportH,
    followId: null,
  };
}

export function worldToScreen(cam: Camera, x: number, y: number): [number, number] {
  return [(x - cam.x) * cam.zoom + cam.viewportW / 2, (y - cam.y) * cam.zoom + cam.viewportH / 2];
}

export function screenToWorld(cam: Camera, sx: number, sy: number): [number, number] {
  return [(sx - cam.viewportW / 2) / cam.zoom + cam.x, (sy - cam.viewportH / 2) / cam.zoom + cam.y];
}

export function panCamera(cam: Camera, dx: number, dy: number) {
  cam.x -= dx / cam.zoom;
  cam.y -= dy / cam.zoom;
  cam.followId = null;
}

export function zoomCamera(cam: Camera, factor: number, aroundScreenX?: number, aroundScreenY?: number) {
  const prevZoom = cam.zoom;
  const newZoom = Math.max(0.15, Math.min(8, cam.zoom * factor));
  if (aroundScreenX !== undefined && aroundScreenY !== undefined) {
    const [wx, wy] = screenToWorld(cam, aroundScreenX, aroundScreenY);
    cam.zoom = newZoom;
    const [nsx, nsy] = worldToScreen(cam, wx, wy);
    cam.x += (nsx - aroundScreenX) / cam.zoom;
    cam.y += (nsy - aroundScreenY) / cam.zoom;
  } else {
    cam.zoom = newZoom;
  }
  void prevZoom;
}
