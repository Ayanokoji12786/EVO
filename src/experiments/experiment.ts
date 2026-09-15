import { createWorld, stepWorld } from '../simulation/engine';
import type { WorldConfig } from '../simulation/types';
import type { WorldState } from '../simulation/worldState';
import { TRAIT_SPECS } from '../genetics/traits';
import { traitPercentChange } from '../statistics/stats';

export interface ExperimentVariable {
  path: 'config.foodAbundance' | 'config.mutationRate' | 'climate.rainfall' | 'climate.baseTemperature' | 'laws.predationEffectiveness';
  controlValue: number;
  experimentValue: number;
}

export interface ExperimentPair {
  question: string;
  variable: ExperimentVariable;
  control: WorldState;
  experimentWorld: WorldState;
}

function applyVariable(state: WorldState, path: ExperimentVariable['path'], value: number) {
  if (path === 'config.foodAbundance') state.config.foodAbundance = value;
  else if (path === 'config.mutationRate') {
    state.config.mutationRate = value;
    // World creation copies the configured rate into individual genomes. Updating the
    // config alone after creation made this experiment a no-op.
    for (const organism of state.organisms.values()) organism.genome.traits.mutationRate = value;
  }
  else if (path === 'climate.rainfall') state.climate.rainfall = value;
  else if (path === 'climate.baseTemperature') state.climate.baseTemperature = value;
  else if (path === 'laws.predationEffectiveness') state.laws.predationEffectiveness = value;
}

export function createExperimentPair(baseConfig: WorldConfig, question: string, variable: ExperimentVariable): ExperimentPair {
  // Each world must get its own config object — createWorld stores the reference as-is,
  // so passing the same object to both would make the second applyVariable() call
  // silently overwrite the first (both worlds ending up on the experiment's value).
  const control = createWorld({ ...baseConfig });
  const experimentWorld = createWorld({ ...baseConfig }); // same seed => identical starting conditions
  applyVariable(control, variable.path, variable.controlValue);
  applyVariable(experimentWorld, variable.path, variable.experimentValue);
  return { question, variable, control, experimentWorld };
}

export function runTicks(state: WorldState, ticks: number, dt = 1) {
  const steps = Math.round(ticks / dt);
  for (let i = 0; i < steps; i++) {
    if (state.organisms.size === 0) break;
    stepWorld(state, dt);
  }
}

export interface ExperimentComparisonRow {
  trait: string;
  control: number;
  experiment: number;
  deltaPct: number;
}

export interface ExperimentResult {
  question: string;
  variable: ExperimentVariable;
  ticksRun: number;
  control: { population: number; speciesCount: number; generation: number; avg: Record<string, number> };
  experimentWorld: { population: number; speciesCount: number; generation: number; avg: Record<string, number> };
  comparison: ExperimentComparisonRow[];
}

export function compareResults(pair: ExperimentPair): ExperimentResult {
  const c = pair.control;
  const e = pair.experimentWorld;
  const cStats = c.history.latest()?.stats;
  const eStats = e.history.latest()?.stats;
  const cAvg = cStats?.avg ?? {};
  const eAvg = eStats?.avg ?? {};

  const comparison: ExperimentComparisonRow[] = TRAIT_SPECS.map((spec) => {
    const cv = cAvg[spec.key] ?? 0;
    const ev = eAvg[spec.key] ?? 0;
    const deltaPct = traitPercentChange(spec.key, cv, ev);
    return { trait: spec.key, control: cv, experiment: ev, deltaPct };
  });

  return {
    question: pair.question,
    variable: pair.variable,
    ticksRun: c.tick,
    control: { population: c.organisms.size, speciesCount: c.species.living().length, generation: c.maxGenerationSeen, avg: cAvg },
    experimentWorld: { population: e.organisms.size, speciesCount: e.species.living().length, generation: e.maxGenerationSeen, avg: eAvg },
    comparison,
  };
}

export function exportResultAsJSON(result: ExperimentResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportResultAsCSV(result: ExperimentResult): string {
  const header = 'trait,control,experiment,deltaPct';
  const rows = result.comparison.map((r) => `${r.trait},${r.control},${r.experiment},${r.deltaPct.toFixed(2)}`);
  return [header, ...rows].join('\n');
}
