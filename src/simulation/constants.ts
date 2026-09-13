export const TICKS_PER_DAY = 50;
export const STATS_INTERVAL_TICKS = 20;
export const REBUILD_HASH_CELL_FRACTION = 40; // worldSize / this = spatial hash cell size

export const ENERGY = {
  baseUpkeep: 0.32,
  sizeUpkeepFactor: 0.35,
  movementCostFactor: 0.55,
  visionCostFactor: 0.5,
  camouflageCostFactor: 0.6,
  tempStressFactor: 1.6,
  eatGainMultiplier: 1.15,
};

export const COMBAT = {
  baseAttackerAdvantage: 1.0,
  energyStealFraction: 0.55,
};
