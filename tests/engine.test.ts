import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld } from '../src/simulation/engine';
import type { WorldConfig } from '../src/simulation/types';

function baseConfig(overrides: Partial<WorldConfig> = {}): WorldConfig {
  return {
    seed: 'test-seed-1',
    worldSize: 600,
    gridResolution: 32,
    initialPopulation: 40,
    foodAbundance: 1,
    mutationRate: 0.05,
    climate: 'temperate',
    ...overrides,
  };
}

describe('deterministic seeded simulation', () => {
  it('produces an identical trajectory for two worlds created from the same seed and config', () => {
    const worldA = createWorld(baseConfig());
    const worldB = createWorld(baseConfig());

    for (let i = 0; i < 100; i++) {
      stepWorld(worldA, 1);
      stepWorld(worldB, 1);
    }

    expect(worldA.organisms.size).toBe(worldB.organisms.size);
    expect(worldA.totalBirths).toBe(worldB.totalBirths);
    expect(worldA.totalDeaths).toBe(worldB.totalDeaths);
    expect(worldA.food.items.size).toBe(worldB.food.items.size);

    const orgsA = [...worldA.organisms.values()].sort((a, b) => a.id - b.id);
    const orgsB = [...worldB.organisms.values()].sort((a, b) => a.id - b.id);
    for (let i = 0; i < orgsA.length; i++) {
      expect(orgsA[i].x).toBeCloseTo(orgsB[i].x, 8);
      expect(orgsA[i].y).toBeCloseTo(orgsB[i].y, 8);
      expect(orgsA[i].energy).toBeCloseTo(orgsB[i].energy, 8);
    }
  });

  it('produces a different trajectory for a different seed', () => {
    const worldA = createWorld(baseConfig({ seed: 'seed-one' }));
    const worldB = createWorld(baseConfig({ seed: 'seed-two' }));
    for (let i = 0; i < 50; i++) {
      stepWorld(worldA, 1);
      stepWorld(worldB, 1);
    }
    const posA = [...worldA.organisms.values()].map((o) => o.x + o.y);
    const posB = [...worldB.organisms.values()].map((o) => o.x + o.y);
    expect(posA).not.toEqual(posB);
  });
});

describe('energy dynamics', () => {
  it('an organism with no reproduction and no food nearby steadily loses energy from upkeep', () => {
    const world = createWorld(baseConfig({ initialPopulation: 1, foodAbundance: 0 }));
    const org = [...world.organisms.values()][0];
    const startEnergy = org.energy;
    stepWorld(world, 1);
    const afterOne = world.organisms.get(org.id)?.energy ?? org.energy;
    // Either it ate something and gained energy, or (far more likely with foodAbundance 0) it spent upkeep.
    // Run a few more ticks without food to make the drain unambiguous.
    for (let i = 0; i < 10; i++) stepWorld(world, 1);
    const stillAlive = world.organisms.get(org.id);
    if (stillAlive) {
      expect(stillAlive.energy).toBeLessThan(startEnergy);
    } else {
      // Starved and was removed — also a valid confirmation that upkeep drains energy over time.
      expect(world.totalDeaths).toBeGreaterThan(0);
    }
    expect(afterOne).toBeLessThanOrEqual(startEnergy);
  });

  it('the whole population never exceeds the sum of energy it could plausibly hold (no energy created from nothing on eating)', () => {
    const world = createWorld(baseConfig({ initialPopulation: 20 }));
    for (let i = 0; i < 30; i++) stepWorld(world, 1);
    for (const org of world.organisms.values()) {
      expect(org.energy).toBeLessThanOrEqual(org.maxEnergy + 1e-6);
    }
  });
});

describe('reproduction over time', () => {
  it('a population with ample food and starting energy produces births within a reasonable number of ticks', () => {
    const world = createWorld(baseConfig({ initialPopulation: 60, foodAbundance: 1.4 }));
    for (const org of world.organisms.values()) org.energy = org.maxEnergy; // guarantee some can afford to reproduce
    for (let i = 0; i < 400; i++) stepWorld(world, 1);
    expect(world.totalBirths).toBeGreaterThan(0);
  });
});
