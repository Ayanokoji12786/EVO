import type { ClimateState, WorldConfig } from '../simulation/types';
import type { TerrainGrid } from './terrain';
import { TERRAIN_PROPS, terrainAt } from './terrain';

export function createClimate(config: WorldConfig): ClimateState {
  const base = config.climate === 'hot' ? 0.4 : config.climate === 'cold' ? -0.4 : config.climate === 'variable' ? 0 : 0;
  return {
    baseTemperature: base,
    season: 0,
    seasonLength: 600,
    dayNightProgress: 0,
    dayLength: 120,
    rainfall: 1,
    windX: 0,
    windY: 0,
    disasterCooldown: 0,
  };
}

/** Returns a smooth 0..1..0..1 seasonal cycle (0=winter, 0.5=summer peak). */
export function seasonalFactor(climate: ClimateState): number {
  return (Math.sin((climate.season / (climate.seasonLength * 4)) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
}

export function isDaytime(climate: ClimateState): boolean {
  return climate.dayNightProgress < 0.5;
}

export function sunlightFactor(climate: ClimateState): number {
  // Smooth day/night curve, peaks at midday, dims to a floor at night.
  const t = climate.dayNightProgress;
  const wave = Math.sin(t * Math.PI * 2 - Math.PI / 2);
  return 0.35 + 0.65 * Math.max(0, wave);
}

export function stepClimate(climate: ClimateState, dt: number) {
  climate.season = (climate.season + dt) % (climate.seasonLength * 4);
  climate.dayNightProgress = ((climate.dayNightProgress * climate.dayLength + dt) % climate.dayLength) / climate.dayLength;
  if (climate.disasterCooldown > 0) climate.disasterCooldown = Math.max(0, climate.disasterCooldown - dt);
}

/** Local normalized temperature (-1..1) at a world point, combining global, seasonal, terrain and latitude effects. */
export function localTemperature(climate: ClimateState, terrain: TerrainGrid, x: number, y: number): number {
  const season = seasonalFactor(climate); // 0 winter .. 1 summer
  const seasonalSwing = (season - 0.5) * 0.6;
  const latitude = Math.abs(y / terrain.worldSize - 0.5) * 2;
  const latitudeBias = -latitude * 0.5;
  const terrainType = terrainAt(terrain, x, y);
  const terrainBias = TERRAIN_PROPS[terrainType].tempBias;
  const t = climate.baseTemperature + seasonalSwing + latitudeBias + terrainBias;
  return Math.max(-1, Math.min(1, t));
}
