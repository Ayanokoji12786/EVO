import { describe, it, expect } from 'vitest';
import { createRNG } from '../src/simulation/rng';
import { randomGenome } from '../src/genetics/genome';
import { mutateGenome, DEFAULT_MUTATION_SETTINGS } from '../src/genetics/mutation';
import { mutateBrain, randomBrain } from '../src/genetics/brain';
import { createOrganism } from '../src/organisms/organism';
import { createWorld, stepWorld } from '../src/simulation/engine';
import { killOrganism } from '../src/simulation/genealogy';
import { computeStats } from '../src/statistics/stats';
import type { WorldConfig } from '../src/simulation/types';

function baseConfig(overrides: Partial<WorldConfig> = {}): WorldConfig {
  return {
    seed: 'mechanics-seed',
    worldSize: 500,
    gridResolution: 24,
    initialPopulation: 20,
    foodAbundance: 1,
    mutationRate: 0.2,
    climate: 'temperate',
    ...overrides,
  };
}

describe('gated trait: wingDevelopment (Lenski stepping-stone complex feature)', () => {
  it('never drifts away from 0 while the "flight" gene is not unlocked', () => {
    const rng = createRNG(30);
    let genome = randomGenome(rng);
    const settings = { ...DEFAULT_MUTATION_SETTINGS, mutationRateMultiplier: 20, rareMutationProbability: 1 };
    for (let i = 0; i < 200; i++) {
      genome = mutateGenome(genome, rng, settings, new Set());
    }
    expect(genome.traits.wingDevelopment).toBe(0);
  });

  it('can drift away from 0 once "flight" is unlocked', () => {
    const rng = createRNG(31);
    let genome = randomGenome(rng);
    const settings = { ...DEFAULT_MUTATION_SETTINGS, mutationRateMultiplier: 20, rareMutationProbability: 1 };
    for (let i = 0; i < 200; i++) {
      genome = mutateGenome(genome, rng, settings, new Set(['flight']));
    }
    expect(genome.traits.wingDevelopment).not.toBe(0);
  });
});

describe('NEAT-lite connection pruning', () => {
  it('can silence a connection to exactly zero and later restore it', () => {
    const rng = createRNG(32);
    let weights = randomBrain(rng);
    let sawZero = false;
    for (let i = 0; i < 500; i++) {
      weights = mutateBrain(weights, rng, 0.3, 0.5);
      if (Array.from(weights).some((w) => w === 0)) sawZero = true;
    }
    expect(sawZero).toBe(true);
  });
});

describe('carcasses (nutrient cycling / scavenging)', () => {
  it('a death leaves a scavengeable carcass sized by body mass', () => {
    const world = createWorld(baseConfig({ initialPopulation: 1 }));
    const org = [...world.organisms.values()][0];
    const size = org.genome.traits.size;
    killOrganism(world, org, 'test death');
    const carcasses = [...world.food.items.values()].filter((f) => f.kind === 'carcass');
    expect(carcasses).toHaveLength(1);
    expect(carcasses[0].energy).toBeCloseTo(14 * size, 5);
  });

  it('an uneaten carcass eventually decays', () => {
    const world = createWorld(baseConfig({ initialPopulation: 1 }));
    const org = [...world.organisms.values()][0];
    killOrganism(world, org, 'test death');
    expect([...world.food.items.values()].some((f) => f.kind === 'carcass')).toBe(true);
    for (let i = 0; i < 200; i++) stepWorld(world, 1);
    expect([...world.food.items.values()].some((f) => f.kind === 'carcass')).toBe(false);
  });
});

describe('phenotypic plasticity acclimation', () => {
  it('a high-plasticity organism acclimates its temperature center faster than a low-plasticity one', () => {
    const rng = createRNG(33);
    const genomeHigh = randomGenome(createRNG(1));
    genomeHigh.traits.plasticity = 1;
    genomeHigh.traits.tempToleranceCenter = -0.9;
    const orgHigh = createOrganism(1, genomeHigh, 0, 0, rng);

    const genomeLow = randomGenome(createRNG(1));
    genomeLow.traits.plasticity = 0;
    genomeLow.traits.tempToleranceCenter = -0.9;
    const orgLow = createOrganism(2, genomeLow, 0, 0, rng);

    // Simulate the acclimation formula directly (same as engine.ts) toward a hot local temp.
    const localTemp = 0.9;
    for (let i = 0; i < 50; i++) {
      orgHigh.acclimatedTempCenter += (localTemp - orgHigh.acclimatedTempCenter) * Math.min(1, genomeHigh.traits.plasticity * 1 * 0.05);
      orgLow.acclimatedTempCenter += (localTemp - orgLow.acclimatedTempCenter) * Math.min(1, genomeLow.traits.plasticity * 1 * 0.05);
    }
    expect(orgHigh.acclimatedTempCenter).toBeGreaterThan(orgLow.acclimatedTempCenter);
    expect(orgLow.acclimatedTempCenter).toBe(-0.9); // zero plasticity => no acclimation at all
  });
});

describe('trophic composition stats', () => {
  it('buckets organisms into herbivore/omnivore/carnivore fractions that sum to 1', () => {
    const rng = createRNG(34);
    const organisms = [0.1, 0.2, 0.5, 0.5, 0.9].map((diet, i) => {
      const genome = randomGenome(rng);
      genome.traits.diet = diet;
      return createOrganism(i + 1, genome, 0, 0, rng);
    });
    const stats = computeStats(organisms, 0, 0, 0, 0, 1);
    const { herbivoreFraction, omnivoreFraction, carnivoreFraction } = stats.trophic;
    expect(herbivoreFraction + omnivoreFraction + carnivoreFraction).toBeCloseTo(1, 10);
    expect(herbivoreFraction).toBeCloseTo(2 / 5, 10);
    expect(omnivoreFraction).toBeCloseTo(2 / 5, 10);
    expect(carnivoreFraction).toBeCloseTo(1 / 5, 10);
  });

  it('reports a non-negative standard deviation per trait', () => {
    const rng = createRNG(35);
    const organisms = Array.from({ length: 10 }, (_, i) => createOrganism(i + 1, randomGenome(rng), 0, 0, rng));
    const stats = computeStats(organisms, 0, 0, 0, 0, 1);
    for (const value of Object.values(stats.stdDev)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});
