import type { RNG } from './rng';
import type { Organism, WorldConfig, ClimateState, DivineLaws, DiseaseState } from './types';
import type { TerrainGrid } from '../environment/terrain';
import type { FoodField } from '../environment/food';
import type { MutationSettings } from '../genetics/mutation';
import { SpeciesRegistry } from '../species/classification';
import { EventLog } from '../history/eventLog';
import { HistoryStore } from '../statistics/historyStore';
import { SpatialHash } from './spatialHash';
import type { GenealogyRecord } from './genealogy';

export interface OverlayState {
  vision: boolean;
  genetics: boolean;
  species: boolean;
  energy: boolean;
  food: boolean;
  ancestry: number | null; // organism id whose descendants to highlight
}

export interface WorldState {
  config: WorldConfig;
  rng: RNG;
  tick: number;
  simDay: number;
  nextOrganismId: number;
  organisms: Map<number, Organism>;
  terrain: TerrainGrid;
  food: FoodField;
  climate: ClimateState;
  laws: DivineLaws;
  mutationSettings: MutationSettings;
  disease: DiseaseState;
  species: SpeciesRegistry;
  events: EventLog;
  history: HistoryStore;
  genealogy: Map<number, GenealogyRecord>;
  orgHash: SpatialHash<Organism>;
  births: number;
  deaths: number;
  totalBirths: number;
  totalDeaths: number;
  divineInterventions: number;
  naturalGenerations: number;
  interferedGenerations: number;
  interferedThisGeneration: boolean;
  maxGenerationSeen: number;
  paused: boolean;
  speedMultiplier: number;
  unlockedGenes: Set<string>;
  overlays: OverlayState;
  activeStorms: Array<{ x: number; y: number; radius: number; ttl: number }>;
  activeVolcanoes: Array<{ x: number; y: number; nextEruption: number }>;
  activeFires: Array<{ x: number; y: number; intensity: number }>;
}
