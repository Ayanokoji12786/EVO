import type { Genome } from '../genetics/genome';

export type TerrainType = 'grass' | 'forest' | 'desert' | 'tundra' | 'water' | 'mountain' | 'fertile' | 'toxic';

export interface WorldConfig {
  seed: string;
  worldSize: number; // world is worldSize x worldSize units
  gridResolution: number; // terrain/food grid cells per axis
  initialPopulation: number;
  foodAbundance: number; // 0..2 multiplier
  mutationRate: number; // initial average multiplier baked into starting genomes' rate gene range
  climate: 'temperate' | 'hot' | 'cold' | 'variable';
}

export interface FoodItem {
  id: number;
  x: number;
  y: number;
  energy: number;
  maxEnergy: number;
  kind: 'plant' | 'hardShell' | 'carcass';
  growth: number; // 0..1 regrowth progress
  expiresAtTick?: number; // carcasses decay if not scavenged in time
}

export interface Organism {
  id: number;
  parentId: number | null;
  generation: number;
  speciesId: number;
  genome: Genome;
  x: number;
  y: number;
  heading: number; // radians
  speed: number; // current speed
  energy: number;
  maxEnergy: number;
  age: number; // in simulated days
  health: number; // 0..1, separate from energy — disease/injury track
  alive: boolean;
  causeOfDeath: string | null;
  birthTick: number;
  deathTick: number | null;
  foodEaten: number;
  distanceTravelled: number;
  kills: number;
  escapes: number;
  offspringIds: number[];
  reproductionCooldown: number;
  infected: boolean;
  infectionTimer: number;
  immune: boolean;
  immortal: boolean; // Hand of God
  protectedFromThreats: boolean;
  name: string;
  // Phenotypic plasticity (Canino-Koning et al. 2019 / evolvability under fluctuating
  // environments): a runtime-only acclimation of temperature preference, drifting toward
  // locally experienced conditions during the organism's lifetime at a rate set by the
  // heritable `plasticity` gene. Never written back to the genome — only the capacity to
  // acclimate is inherited, not the acclimated state itself.
  acclimatedTempCenter: number;
}

export interface DiseaseState {
  active: boolean;
  transmissionRate: number;
  mortality: number;
  incubationPeriod: number;
  recoveryChance: number;
  mutationRate: number;
}

export interface ClimateState {
  baseTemperature: number; // normalized -1..1
  season: number; // 0..1 progress through year
  seasonLength: number; // ticks per season cycle (full year = 4x this)
  dayNightProgress: number; // 0..1
  dayLength: number; // ticks per full day
  rainfall: number; // 0..2 multiplier on plant growth
  windX: number;
  windY: number;
  disasterCooldown: number;
}

export interface DivineLaws {
  movementEnergyCost: number;
  visionEnergyCost: number;
  foodEnergyGain: number;
  agingRate: number;
  reproductionCostMultiplier: number;
  predationEffectiveness: number;
  plantGrowthRate: number;
  carryingCapacity: number;
}

export const DEFAULT_LAWS: DivineLaws = {
  movementEnergyCost: 1,
  visionEnergyCost: 1,
  foodEnergyGain: 1,
  agingRate: 1,
  reproductionCostMultiplier: 1,
  predationEffectiveness: 1,
  plantGrowthRate: 1,
  carryingCapacity: 4000,
};

export interface SpeciesRecord {
  id: number;
  name: string;
  founderOrganismId: number;
  parentSpeciesId: number | null;
  originGeneration: number;
  originTick: number;
  extinctTick: number | null;
  representativeGenome: Genome;
  peakPopulation: number;
  population: number;
}

export type EventCategory = 'natural' | 'divine' | 'evolutionary' | 'extinction' | 'environmental';

export interface HistoryEvent {
  id: number;
  tick: number;
  generation: number;
  category: EventCategory;
  message: string;
}

export interface TrophicComposition {
  herbivoreFraction: number;
  omnivoreFraction: number;
  carnivoreFraction: number;
}

export interface StatsSnapshot {
  tick: number;
  generation: number;
  population: number;
  births: number;
  deaths: number;
  foodAbundance: number;
  speciesCount: number;
  avg: Record<string, number>;
  // Standard deviation per trait — a simple standing-genetic-variation / mutational-robustness
  // proxy (Elena et al. 2007; "Interplay of Resource Availability, Population Size and
  // Mutation Rate", Frank et al. 2021): narrows under strong selection or small population,
  // widens with abundant resources, larger populations, or higher mutation rate.
  stdDev: Record<string, number>;
  trophic: TrophicComposition;
}
