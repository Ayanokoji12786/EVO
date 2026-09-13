import type { RNG } from '../simulation/rng';
import type { FoodItem, DivineLaws } from '../simulation/types';
import type { TerrainGrid } from './terrain';
import { TERRAIN_PROPS, TERRAIN_TYPES, terrainAt } from './terrain';
import { SpatialHash } from '../simulation/spatialHash';

export interface FoodField {
  items: Map<number, FoodItem>;
  nextId: number;
  hash: SpatialHash<FoodItem>;
  hardShellUnlocked: boolean;
}

export function createFoodField(worldSize: number): FoodField {
  const hash = new SpatialHash<FoodItem>(worldSize, Math.max(20, worldSize / 60), (f) => f);
  return { items: new Map(), nextId: 1, hash, hardShellUnlocked: false };
}

export function rebuildFoodHash(field: FoodField) {
  field.hash.insertAll(field.items.values());
}

const LOCAL_DENSITY_RADIUS = 24;
const MAX_LOCAL_DENSITY = 3;

export function stepFoodGrowth(
  field: FoodField,
  terrain: TerrainGrid,
  worldSize: number,
  foodAbundance: number,
  rainfall: number,
  seasonGrowthMultiplier: number,
  laws: DivineLaws,
  rng: RNG,
  dt: number,
) {
  const globalCap = worldSize * worldSize * 0.0007 * foodAbundance;
  if (field.items.size >= globalCap) return;

  const attempts = Math.round(worldSize * worldSize * 0.000022 * foodAbundance * laws.plantGrowthRate * dt);
  for (let i = 0; i < attempts; i++) {
    const x = rng.next() * worldSize;
    const y = rng.next() * worldSize;
    const terrainType = terrainAt(terrain, x, y);
    const props = TERRAIN_PROPS[terrainType];
    if (props.fertility <= 0.02 || terrainType === 'water') continue;
    const growthChance = props.fertility * rainfall * seasonGrowthMultiplier;
    if (!rng.bool(Math.min(1, growthChance))) continue;

    let nearby = 0;
    field.hash.queryRadius(x, y, LOCAL_DENSITY_RADIUS, () => {
      nearby++;
    });
    if (nearby >= MAX_LOCAL_DENSITY) continue;

    const kind: FoodItem['kind'] = field.hardShellUnlocked && rng.bool(0.12) ? 'hardShell' : 'plant';
    const maxEnergy = kind === 'hardShell' ? 34 : 18;
    const item: FoodItem = { id: field.nextId++, x, y, energy: maxEnergy, maxEnergy, kind, growth: 1 };
    field.items.set(item.id, item);
  }
}

export function removeFood(field: FoodField, id: number) {
  field.items.delete(id);
}

/** Spawns a scavengeable carcass (nutrient cycling / decomposer trophic link). */
export function spawnCarcass(field: FoodField, x: number, y: number, energy: number, expiresAtTick: number) {
  const item: FoodItem = {
    id: field.nextId++,
    x,
    y,
    energy,
    maxEnergy: energy,
    kind: 'carcass',
    growth: 1,
    expiresAtTick,
  };
  field.items.set(item.id, item);
}

/** Removes carcasses that decayed before being scavenged. */
export function decayCarcasses(field: FoodField, tick: number) {
  for (const [id, item] of field.items) {
    if (item.kind === 'carcass' && item.expiresAtTick !== undefined && tick >= item.expiresAtTick) {
      field.items.delete(id);
    }
  }
}

export function totalFoodEnergy(field: FoodField): number {
  let total = 0;
  for (const f of field.items.values()) total += f.energy;
  return total;
}

export function applyDroughtToFood(field: FoodField, fractionToRemove: number, rng: RNG) {
  for (const [id] of field.items) {
    if (rng.bool(fractionToRemove)) field.items.delete(id);
  }
}

export const ALL_TERRAIN_TYPES = TERRAIN_TYPES;
