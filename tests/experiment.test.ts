import { describe, it, expect } from 'vitest';
import { createExperimentPair, runTicks } from '../src/experiments/experiment';
import type { WorldConfig } from '../src/simulation/types';

function baseConfig(): WorldConfig {
  return {
    seed: 'experiment-seed',
    worldSize: 600,
    gridResolution: 32,
    initialPopulation: 40,
    foodAbundance: 1,
    mutationRate: 0.05,
    climate: 'temperate',
  };
}

describe('Experiment Mode / Split Timeline', () => {
  it('control and experiment worlds each keep their own config (no shared-reference cross-talk)', () => {
    const pair = createExperimentPair(baseConfig(), 'does food abundance matter?', {
      path: 'config.foodAbundance',
      controlValue: 1,
      experimentValue: 0.3,
    });
    expect(pair.control.config.foodAbundance).toBe(1);
    expect(pair.experimentWorld.config.foodAbundance).toBe(0.3);
    // Mutating one world's config must never leak into the other.
    expect(pair.control.config).not.toBe(pair.experimentWorld.config);
  });

  it('a large enough difference in the changed variable produces a measurably different food supply over time', () => {
    const pair = createExperimentPair(baseConfig(), 'does food abundance matter?', {
      path: 'config.foodAbundance',
      controlValue: 1,
      experimentValue: 0.2,
    });
    runTicks(pair.control, 300);
    runTicks(pair.experimentWorld, 300);
    expect(pair.control.food.items.size).toBeGreaterThan(pair.experimentWorld.food.items.size);
  });

  it('applies a mutation-rate experiment to the organisms that actually reproduce', () => {
    const pair = createExperimentPair(baseConfig(), 'does mutation rate matter?', {
      path: 'config.mutationRate',
      controlValue: 0.02,
      experimentValue: 0.15,
    });
    expect([...pair.control.organisms.values()].every((organism) => organism.genome.traits.mutationRate === 0.02)).toBe(true);
    expect([...pair.experimentWorld.organisms.values()].every((organism) => organism.genome.traits.mutationRate === 0.15)).toBe(true);
  });
});
