import { create } from 'zustand';
import type { StatsSnapshot, HistoryEvent, WorldConfig, SpeciesRecord } from '../simulation/types';
import type { OverlayState } from '../simulation/worldState';
import type { ExperimentResult } from '../experiments/experiment';
import type { TerrainType } from '../simulation/types';

export type PendingGodAction =
  | { kind: 'meteor'; radius: number }
  | { kind: 'volcano' }
  | { kind: 'flood'; radius: number }
  | { kind: 'wildfire'; radius: number }
  | { kind: 'lightning' }
  | { kind: 'terraform'; terrainType: TerrainType; radius: number }
  | { kind: 'placeCreature'; traits: Partial<Record<string, number>> }
  | { kind: 'introducePredator' }
  | { kind: 'teleportSelected' };

export type SpeedSetting = 0 | 1 | 2 | 5 | 10 | 'max';

export interface InspectorData {
  id: number;
  name: string;
  speciesName: string;
  generation: number;
  age: number;
  lifespanCap: number;
  parentId: number | null;
  offspringCount: number;
  traits: Record<string, number>;
  energy: number;
  maxEnergy: number;
  foodEaten: number;
  distanceTravelled: number;
  kills: number;
  escapes: number;
  ancestryChain: { id: number; name: string; traits: Record<string, number> }[];
  mutatedFromParent: string[];
  alive: boolean;
  causeOfDeath: string | null;
}

interface SimStoreState {
  phase: 'opening' | 'running';
  worldConfig: WorldConfig | null;
  seedDisplay: string;
  stats: StatsSnapshot | null;
  statsHistory: StatsSnapshot[];
  events: HistoryEvent[];
  species: SpeciesRecord[];
  population: number;
  speed: SpeedSetting;
  paused: boolean;
  selectedId: number | null;
  followId: number | null;
  inspector: InspectorData | null;
  godMode: boolean;
  overlays: OverlayState;
  divineInterventions: number;
  naturalGenerations: number;
  interferedGenerations: number;
  deathToast: { name: string; age: number; cause: string } | null;
  experimentResult: ExperimentResult | null;
  experimentRunning: boolean;
  timeMachineOpen: boolean;
  pendingGodAction: PendingGodAction | null;

  setPhase: (p: SimStoreState['phase']) => void;
  setWorldConfig: (c: WorldConfig, seedDisplay: string) => void;
  pushStats: (s: StatsSnapshot, history: StatsSnapshot[], species: SpeciesRecord[]) => void;
  pushEvents: (events: HistoryEvent[]) => void;
  setSpeed: (s: SpeedSetting) => void;
  setPaused: (p: boolean) => void;
  select: (id: number | null) => void;
  setFollow: (id: number | null) => void;
  setInspector: (i: InspectorData | null) => void;
  setGodMode: (g: boolean) => void;
  setOverlay: (key: keyof OverlayState, value: OverlayState[keyof OverlayState]) => void;
  setDivineCounters: (divine: number, natural: number, interfered: number) => void;
  setDeathToast: (t: SimStoreState['deathToast']) => void;
  setExperimentResult: (r: ExperimentResult | null) => void;
  setExperimentRunning: (r: boolean) => void;
  setTimeMachineOpen: (v: boolean) => void;
  setPendingGodAction: (a: PendingGodAction | null) => void;
}

export const useSimStore = create<SimStoreState>((set) => ({
  phase: 'opening',
  worldConfig: null,
  seedDisplay: '',
  stats: null,
  statsHistory: [],
  events: [],
  species: [],
  population: 0,
  speed: 1,
  paused: false,
  selectedId: null,
  followId: null,
  inspector: null,
  godMode: false,
  overlays: { vision: false, genetics: false, species: false, energy: false, food: false, ancestry: null },
  divineInterventions: 0,
  naturalGenerations: 0,
  interferedGenerations: 0,
  deathToast: null,
  experimentResult: null,
  experimentRunning: false,
  timeMachineOpen: false,
  pendingGodAction: null,

  setPhase: (phase) => set({ phase }),
  setWorldConfig: (worldConfig, seedDisplay) => set({ worldConfig, seedDisplay }),
  pushStats: (stats, statsHistory, species) => set({ stats, statsHistory, species, population: stats.population }),
  pushEvents: (events) => set({ events }),
  setSpeed: (speed) => set({ speed }),
  setPaused: (paused) => set({ paused }),
  select: (selectedId) => set({ selectedId }),
  setFollow: (followId) => set({ followId }),
  setInspector: (inspector) => set({ inspector }),
  setGodMode: (godMode) => set({ godMode }),
  setOverlay: (key, value) => set((s) => ({ overlays: { ...s.overlays, [key]: value } })),
  setDivineCounters: (divineInterventions, naturalGenerations, interferedGenerations) =>
    set({ divineInterventions, naturalGenerations, interferedGenerations }),
  setDeathToast: (deathToast) => set({ deathToast }),
  setExperimentResult: (experimentResult) => set({ experimentResult }),
  setExperimentRunning: (experimentRunning) => set({ experimentRunning }),
  setTimeMachineOpen: (timeMachineOpen) => set({ timeMachineOpen }),
  setPendingGodAction: (pendingGodAction) => set({ pendingGodAction }),
}));
