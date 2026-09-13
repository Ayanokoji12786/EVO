import type { Organism, FoodItem, ClimateState } from '../simulation/types';
import type { TerrainGrid } from '../environment/terrain';
import { localTemperature } from '../environment/climate';
import { TERRAIN_PROPS, terrainAt } from '../environment/terrain';
import { SpatialHash } from '../simulation/spatialHash';
import {
  brainForward,
  OUTPUT_TURN,
  OUTPUT_THROTTLE,
  OUTPUT_EAT_INTENT,
  OUTPUT_REPRODUCE_INTENT,
  OUTPUT_AGGRESSION_MOD,
} from '../genetics/brain';

const inputBuf = new Float32Array(10);

export interface Decision {
  turn: number; // radians this tick, already scaled
  targetSpeedFraction: number; // 0..1 of maxSpeed
  nearestFoodId: number | null;
  nearestFoodDist: number;
  wantsToEat: boolean;
  wantsToReproduce: boolean;
  interactionTargetId: number | null;
  interactionDist: number;
  wantsToAttack: boolean;
}

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function plantEfficiency(diet: number): number {
  return Math.max(0.05, Math.min(1, 1 - diet * 1.3));
}
export function huntEfficiency(diet: number): number {
  return Math.max(0.05, Math.min(1, diet * 1.3 - 0.15));
}
export function hardShellEfficiency(size: number): number {
  return Math.max(0, Math.min(1, size - 0.6));
}

export function senseAndDecide(
  org: Organism,
  foodHash: SpatialHash<FoodItem>,
  orgHash: SpatialHash<Organism>,
  terrain: TerrainGrid,
  climate: ClimateState,
): Decision {
  const t = org.genome.traits;
  const vision = t.visionRadius * (1 - org.genome.traits.camouflage * 0) * (org.health);
  const fovRad = (t.fieldOfView * Math.PI) / 180;

  let nearestFoodId: number | null = null;
  let nearestFoodDist = Infinity;
  let nearestFoodAngle = 0;
  foodHash.queryRadius(org.x, org.y, vision, (food) => {
    const dx = food.x - org.x;
    const dy = food.y - org.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= nearestFoodDist) return;
    const angleTo = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angleTo, org.heading)) > fovRad / 2) return;
    nearestFoodDist = dist;
    nearestFoodId = food.id;
    nearestFoodAngle = angleTo;
  });

  let nearestOrgId: number | null = null;
  let nearestOrgDist = Infinity;
  let nearestOrgAngle = 0;
  let nearestOrgRelSize = 0;
  orgHash.queryRadius(org.x, org.y, vision, (other) => {
    if (other.id === org.id || !other.alive) return;
    const dx = other.x - org.x;
    const dy = other.y - org.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= nearestOrgDist) return;
    const angleTo = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angleTo, org.heading)) > fovRad / 2) return;
    nearestOrgDist = dist;
    nearestOrgId = other.id;
    nearestOrgAngle = angleTo;
    nearestOrgRelSize = other.genome.traits.size / t.size;
  });

  const foodBearing = nearestFoodId !== null ? angleDiff(nearestFoodAngle, org.heading) : 0;
  const orgBearing = nearestOrgId !== null ? angleDiff(nearestOrgAngle, org.heading) : 0;
  const localTemp = localTemperature(climate, terrain, org.x, org.y);
  const tempDiff = (localTemp - t.tempToleranceCenter) / Math.max(0.1, t.tempToleranceRange);

  inputBuf[0] = nearestFoodId !== null ? Math.sin(foodBearing) : 0;
  inputBuf[1] = nearestFoodId !== null ? Math.cos(foodBearing) : 0;
  inputBuf[2] = nearestFoodId !== null ? 1 - Math.min(1, nearestFoodDist / vision) : 0;
  inputBuf[3] = nearestOrgId !== null ? Math.sin(orgBearing) : 0;
  inputBuf[4] = nearestOrgId !== null ? Math.cos(orgBearing) : 0;
  inputBuf[5] = nearestOrgId !== null ? 1 - Math.min(1, nearestOrgDist / vision) : 0;
  inputBuf[6] = nearestOrgId !== null ? Math.max(-1, Math.min(1, nearestOrgRelSize - 1)) : 0;
  inputBuf[7] = org.energy / org.maxEnergy;
  inputBuf[8] = org.age / t.lifespan;
  inputBuf[9] = Math.max(-1, Math.min(1, tempDiff));

  const out = brainForward(org.genome.brain, inputBuf);

  const explorationJitter = (Math.sin(org.id * 12.9898 + org.age * 78.233) * 0.5) * t.explorationTendency;
  const turn = (out[OUTPUT_TURN] * 2 - 1) * 0.35 + explorationJitter * 0.15;
  const targetSpeedFraction = out[OUTPUT_THROTTLE];
  const eatIntent = out[OUTPUT_EAT_INTENT];
  const reproduceIntent = out[OUTPUT_REPRODUCE_INTENT];
  const aggressionMod = out[OUTPUT_AGGRESSION_MOD];

  const canReproduce = org.energy >= t.reproductionThreshold * org.maxEnergy && org.reproductionCooldown <= 0;
  const wantsToReproduce = canReproduce && reproduceIntent > 0.5;

  const eatRange = 6 + t.size * 3;
  const wantsToEat = nearestFoodId !== null && nearestFoodDist <= eatRange && eatIntent > 0.3;

  const interactRange = 8 + t.size * 4;
  const combinedAggression = (t.aggression * 0.7 + aggressionMod * 0.3);
  const wantsToAttack =
    nearestOrgId !== null && nearestOrgDist <= interactRange && combinedAggression > 0.5 && nearestOrgRelSize < 1.3;

  const terrainType = terrainAt(terrain, org.x, org.y);
  const terrainSpeedMul = TERRAIN_PROPS[terrainType].speedMultiplier;

  return {
    turn,
    targetSpeedFraction: targetSpeedFraction * terrainSpeedMul,
    nearestFoodId,
    nearestFoodDist,
    wantsToEat,
    wantsToReproduce,
    interactionTargetId: nearestOrgId,
    interactionDist: nearestOrgDist,
    wantsToAttack,
  };
}
