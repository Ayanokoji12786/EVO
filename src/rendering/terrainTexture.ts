import type { TerrainGrid } from '../environment/terrain';
import { TERRAIN_PROPS, TERRAIN_TYPES } from '../environment/terrain';

export class TerrainTexture {
  canvas: HTMLCanvasElement;
  dirty = true;

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  invalidate() {
    this.dirty = true;
  }

  ensure(grid: TerrainGrid) {
    if (!this.dirty && this.canvas.width === grid.resolution) return;
    this.canvas.width = grid.resolution;
    this.canvas.height = grid.resolution;
    const ctx = this.canvas.getContext('2d')!;
    const imgData = ctx.createImageData(grid.resolution, grid.resolution);
    for (let i = 0; i < grid.type.length; i++) {
      const type = TERRAIN_TYPES[grid.type[i]];
      const color = TERRAIN_PROPS[type].visualBase;
      const [r, g, b] = hexToRgb(color);
      imgData.data[i * 4] = r;
      imgData.data[i * 4 + 1] = g;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    this.dirty = false;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
