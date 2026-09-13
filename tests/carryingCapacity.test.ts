import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld } from '../src/simulation/engine';
import type { WorldConfig } from '../src/simulation/types';

function baseConfig(overrides: Partial<WorldConfig> = {}): WorldConfig {
  return {
    seed: 'capacity-seed',
    worldSize: 500,
    gridResolution: 24,
    initialPopulation: 30,
    foodAbundance: 2,
    mutationRate: 0.05,
    climate: 'temperate',
    ...overrides,
  };
}

describe('carrying capacity (density-dependent regulation)', () => {
  it('a population held artificially far above carrying capacity experiences extra energy drain', () => {
    const world = createWorld(baseConfig({ initialPopulation: 50 }));
    world.laws.carryingCapacity = 5; // every organism is now "overshooting" capacity 10x
    for (const org of world.organisms.values()) org.energy = org.maxEnergy;
    const before = [...world.organisms.values()][0].energy;
    stepWorld(world, 1);
    const after = world.organisms.get([...world.organisms.keys()][0])?.energy;
    // Compare against a population held at/under capacity with everything else equal.
    const relaxedWorld = createWorld(baseConfig({ initialPopulation: 50 }));
    relaxedWorld.laws.carryingCapacity = 10_000;
    for (const org of relaxedWorld.organisms.values()) org.energy = org.maxEnergy;
    stepWorld(relaxedWorld, 1);
    const relaxedAfter = relaxedWorld.organisms.get([...relaxedWorld.organisms.keys()][0])?.energy;

    expect(after).toBeDefined();
    expect(relaxedAfter).toBeDefined();
    expect(before).toBeGreaterThan(after!);
    // Crowded organisms should lose strictly more energy per tick than uncrowded ones.
    expect(after!).toBeLessThan(relaxedAfter!);
  });

  it('does not penalize a population at or under its carrying capacity', () => {
    const world = createWorld(baseConfig({ initialPopulation: 20 }));
    world.laws.carryingCapacity = 10_000;
    for (let i = 0; i < 50; i++) stepWorld(world, 1);
    expect(world.organisms.size).toBeGreaterThan(0);
  });
});
