export const TICKS_PER_DAY = 50;
export const STATS_INTERVAL_TICKS = 20;
export const REBUILD_HASH_CELL_FRACTION = 40; // worldSize / this = spatial hash cell size

// Per-tick simulation cost scales roughly with population squared (every organism's
// vision query revisits every nearby organism/food item), so an unbounded population can
// silently degrade the frame rate long before any render-side instance cap is hit. This
// is a hard backstop on top of the existing soft crowding cost below — reproduction simply
// stops past this multiple of carrying capacity, the same way a real habitat runs out of
// space, rather than the simulation grinding to a halt.
export const HARD_POPULATION_CEILING_FACTOR = 1.3;

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
