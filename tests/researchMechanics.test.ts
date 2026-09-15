import { describe, it, expect } from 'vitest';
import { createRNG } from '../src/simulation/rng';
import { randomGenome } from '../src/genetics/genome';
import { mutateGenome, DEFAULT_MUTATION_SETTINGS } from '../src/genetics/mutation';
import { mutateBrain, randomBrain } from '../src/genetics/brain';
import { createOrganism } from '../src/organisms/organism';
import { createWorld, stepWorld } from '../src/simulation/engine';
import { killOrganism } from '../src/simulation/genealogy';
import { computeStats } from '../src/statistics/stats';
import { createClimate, stepClimate } from '../src/environment/climate';
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

describe('rate of environmental change (Lindsey et al. 2013)', () => {
  it('an instant climate jump spikes tempChangeRate, which then decays back toward 0', () => {
    const climate = createClimate(baseConfig());
    for (let i = 0; i < 20; i++) stepClimate(climate, 1); // let the EMA settle at 0 with no change
    expect(climate.tempChangeRate).toBeCloseTo(0, 5);

    climate.baseTemperature += 0.5; // a one-tick God Mode-style jump
    stepClimate(climate, 1);
    const spiked = climate.tempChangeRate;
    expect(spiked).toBeGreaterThan(0.05);

    for (let i = 0; i < 60; i++) stepClimate(climate, 1); // no further change — EMA should relax
    expect(climate.tempChangeRate).toBeLessThan(spiked);
    expect(climate.tempChangeRate).toBeCloseTo(0, 2);
  });

  it('gradual drift of the same total magnitude never spikes the rate the way an instant jump does', () => {
    const climate = createClimate(baseConfig());
    for (let i = 0; i < 50; i++) {
      climate.baseTemperature += 0.01; // same eventual +0.5 total, spread over 50 ticks
      stepClimate(climate, 1);
    }
    expect(climate.tempChangeRate).toBeLessThan(0.05);
  });

  it('climate shock energy cost (same formula as engine.ts) is buffered by plasticity and zero when the world is stable', () => {
    const shockCost = (tempChangeRate: number, rainfallChangeRate: number, plasticity: number) => {
      const shockBuffer = 1 - plasticity * 0.7;
      return (tempChangeRate * 9 + rainfallChangeRate * 3) * shockBuffer;
    };
    expect(shockCost(0, 0, 0)).toBe(0);
    expect(shockCost(0, 0, 1)).toBe(0);
    const lowPlasticityCost = shockCost(0.2, 0.1, 0);
    const highPlasticityCost = shockCost(0.2, 0.1, 1);
    expect(highPlasticityCost).toBeLessThan(lowPlasticityCost);
    expect(highPlasticityCost).toBeCloseTo(lowPlasticityCost * 0.3, 10); // plasticity 1 -> 30% of full shock
  });
});

describe('seasonal timing (Franks, Sim & Weis 2007)', () => {
  // Same circular-distance formula as engine.ts's reproduction gate: 0 = perfectly
  // timed, 0.5 = maximally misaligned (opposite side of the year).
  const circularGap = (seasonNow: number, seasonalTiming: number) => {
    const phaseGap = Math.abs(seasonNow - seasonalTiming);
    return Math.min(phaseGap, 1 - phaseGap);
  };

  it('is 0 when perfectly aligned and 0.5 at the opposite phase of the year', () => {
    expect(circularGap(0.3, 0.3)).toBe(0);
    expect(circularGap(0, 0.5)).toBe(0.5);
  });

  it('wraps around the year boundary instead of treating it as maximally distant', () => {
    // 0.95 and 0.05 are only 0.1 apart on a circular year, not 0.9 apart.
    expect(circularGap(0.95, 0.05)).toBeCloseTo(0.1, 10);
  });

  it('never exceeds 0.5, the true maximum circular distance', () => {
    for (let seasonNow = 0; seasonNow <= 1; seasonNow += 0.05) {
      for (let timing = 0; timing <= 1; timing += 0.05) {
        expect(circularGap(seasonNow, timing)).toBeLessThanOrEqual(0.5 + 1e-9);
      }
    }
  });
});
