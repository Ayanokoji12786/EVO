import type { TerrainGrid } from '../environment/terrain';
import { TERRAIN_PROPS, TERRAIN_TYPES } from '../environment/terrain';

export class TerrainTexture {
  canvas: HTMLCanvasElement;
  dirty = true;
  private sourceResolution = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  invalidate() {
    this.dirty = true;
  }

  ensure(grid: TerrainGrid) {
    if (!this.dirty && this.sourceResolution === grid.resolution) return;
    // Render a small, blended terrain atlas instead of magnifying the simulation's cell
    // IDs directly. The terrain is still completely sourced from the real grid, but the
    // observatory reads as a living landscape rather than a board of hard pixel squares.
    const scale = 3;
    this.canvas.width = grid.resolution * scale;
    this.canvas.height = grid.resolution * scale;
    const ctx = this.canvas.getContext('2d')!;
    const imgData = ctx.createImageData(this.canvas.width, this.canvas.height);
    const colors = TERRAIN_TYPES.map((type) => hexToRgb(TERRAIN_PROPS[type].visualBase));
    const colorAt = (x: number, y: number) => {
      const gx = Math.min(grid.resolution - 1, Math.max(0, x));
      const gy = Math.min(grid.resolution - 1, Math.max(0, y));
      return colors[grid.type[gy * grid.resolution + gx]];
    };

    for (let py = 0; py < this.canvas.height; py++) {
      const gy = py / scale - 0.5;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      for (let px = 0; px < this.canvas.width; px++) {
        const gx = px / scale - 0.5;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const nw = colorAt(x0, y0); const ne = colorAt(x0 + 1, y0);
        const sw = colorAt(x0, y0 + 1); const se = colorAt(x0 + 1, y0 + 1);
        const nearestType = TERRAIN_TYPES[grid.type[Math.min(grid.resolution - 1, Math.max(0, Math.round(gy))) * grid.resolution + Math.min(grid.resolution - 1, Math.max(0, Math.round(gx)))]];
        const grain = terrainGrain(px, py) - 0.5;
        const ripple = nearestType === 'water' ? Math.sin(px * 0.13 + py * 0.09) * 4 : 0;
        const canopy = nearestType === 'forest' || nearestType === 'fertile' ? grain * 16 : grain * 7;
        const contour = nearestType === 'mountain' ? Math.sin((px * 0.16 + py * 0.11)) * 5 : 0;
        const index = (py * this.canvas.width + px) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const north = nw[channel] + (ne[channel] - nw[channel]) * fx;
          const south = sw[channel] + (se[channel] - sw[channel]) * fx;
          const base = north + (south - north) * fy;
          imgData.data[index + channel] = Math.max(0, Math.min(255, base + canopy + ripple + contour));
        }
        imgData.data[index + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    this.sourceResolution = grid.resolution;
    this.dirty = false;
  }
}

function terrainGrain(x: number, y: number): number {
  let value = Math.imul(x + 31, 374761393) ^ Math.imul(y + 17, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
