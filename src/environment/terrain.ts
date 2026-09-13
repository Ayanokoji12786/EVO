import type { RNG } from '../simulation/rng';
import type { TerrainType, WorldConfig } from '../simulation/types';

export const TERRAIN_TYPES: TerrainType[] = ['grass', 'forest', 'desert', 'tundra', 'water', 'mountain', 'fertile', 'toxic'];
export const TERRAIN_ID: Record<TerrainType, number> = Object.fromEntries(
  TERRAIN_TYPES.map((t, i) => [t, i]),
) as Record<TerrainType, number>;

export interface TerrainProps {
  speedMultiplier: number;
  fertility: number; // baseline plant growth rate multiplier
  tempBias: number; // -1..1 added to local temperature
  passable: boolean;
  visualBase: string; // CSS color
}

export const TERRAIN_PROPS: Record<TerrainType, TerrainProps> = {
  grass: { speedMultiplier: 1.0, fertility: 1.0, tempBias: 0, passable: true, visualBase: '#2f5233' },
  forest: { speedMultiplier: 0.8, fertility: 1.2, tempBias: -0.05, passable: true, visualBase: '#1f3d24' },
  desert: { speedMultiplier: 0.9, fertility: 0.15, tempBias: 0.45, passable: true, visualBase: '#a68a5b' },
  tundra: { speedMultiplier: 0.75, fertility: 0.3, tempBias: -0.55, passable: true, visualBase: '#5c6b73' },
  water: { speedMultiplier: 0.35, fertility: 0.05, tempBias: -0.1, passable: true, visualBase: '#123a52' },
  mountain: { speedMultiplier: 0.45, fertility: 0.1, tempBias: -0.25, passable: true, visualBase: '#4a4642' },
  fertile: { speedMultiplier: 1.05, fertility: 1.8, tempBias: 0.05, passable: true, visualBase: '#3d6b2f' },
  toxic: { speedMultiplier: 0.85, fertility: 0.4, tempBias: 0.1, passable: true, visualBase: '#4a2f52' },
};

export interface TerrainGrid {
  resolution: number;
  worldSize: number;
  cellSize: number;
  type: Uint8Array;
}

// Simple hash-based value noise (no external deps), layered at a few octaves.
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t: number) {
  return t * t * (3 - 2 * t);
}
function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = smooth(x - x0);
  const sy = smooth(y - y0);
  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x1, y0, seed);
  const n01 = hash2(x0, y1, seed);
  const n11 = hash2(x1, y1, seed);
  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  return ix0 + (ix1 - ix0) * sy;
}
function fbm(x: number, y: number, seed: number, octaves: number): number {
  let total = 0;
  let amp = 0.5;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(x * freq, y * freq, seed + i * 101) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / max;
}

export function generateTerrain(config: WorldConfig, rng: RNG): TerrainGrid {
  const resolution = config.gridResolution;
  const type = new Uint8Array(resolution * resolution);
  const seed = rng.int(1_000_000);
  const climateShift = config.climate === 'hot' ? 0.35 : config.climate === 'cold' ? -0.35 : 0;

  for (let gy = 0; gy < resolution; gy++) {
    for (let gx = 0; gx < resolution; gx++) {
      const nx = gx / resolution;
      const ny = gy / resolution;
      const elevation = fbm(nx * 4, ny * 4, seed, 4);
      const moisture = fbm(nx * 4 + 50, ny * 4 + 50, seed + 999, 4);
      const latitude = Math.abs(ny - 0.5) * 2; // 0 at equator (center), 1 at poles (edges)
      const coldness = latitude * 0.8 - climateShift;

      let t: TerrainType;
      if (elevation > 0.72) t = 'mountain';
      else if (elevation < 0.32 && moisture > 0.55) t = 'water';
      else if (coldness > 0.55) t = 'tundra';
      else if (moisture < 0.28 && coldness < 0.3) t = 'desert';
      else if (moisture > 0.68) t = 'forest';
      else if (moisture > 0.5 && elevation > 0.4 && elevation < 0.6) t = 'fertile';
      else t = 'grass';

      type[gy * resolution + gx] = TERRAIN_ID[t];
    }
  }

  return { resolution, worldSize: config.worldSize, cellSize: config.worldSize / resolution, type };
}

export function terrainAt(grid: TerrainGrid, x: number, y: number): TerrainType {
  const gx = Math.min(grid.resolution - 1, Math.max(0, Math.floor(x / grid.cellSize)));
  const gy = Math.min(grid.resolution - 1, Math.max(0, Math.floor(y / grid.cellSize)));
  return TERRAIN_TYPES[grid.type[gy * grid.resolution + gx]];
}

export function paintTerrain(grid: TerrainGrid, x: number, y: number, radius: number, terrainType: TerrainType) {
  const id = TERRAIN_ID[terrainType];
  const cellRadius = Math.ceil(radius / grid.cellSize);
  const cgx = Math.floor(x / grid.cellSize);
  const cgy = Math.floor(y / grid.cellSize);
  for (let dy = -cellRadius; dy <= cellRadius; dy++) {
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      const gx = cgx + dx;
      const gy = cgy + dy;
      if (gx < 0 || gy < 0 || gx >= grid.resolution || gy >= grid.resolution) continue;
      const wx = (gx + 0.5) * grid.cellSize;
      const wy = (gy + 0.5) * grid.cellSize;
      if (Math.hypot(wx - x, wy - y) <= radius) {
        grid.type[gy * grid.resolution + gx] = id;
      }
    }
  }
}
