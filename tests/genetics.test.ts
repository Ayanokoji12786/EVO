import { describe, it, expect } from 'vitest';
import { createRNG } from '../src/simulation/rng';
import { randomGenome, geneticDistance, cloneGenome } from '../src/genetics/genome';
import { mutateGenome, DEFAULT_MUTATION_SETTINGS } from '../src/genetics/mutation';
import { TRAIT_SPECS, clampTrait } from '../src/genetics/traits';

describe('genome creation', () => {
  it('creates traits within their declared init ranges', () => {
    const rng = createRNG(1);
    const genome = randomGenome(rng);
    for (const spec of TRAIT_SPECS) {
      expect(genome.traits[spec.key]).toBeGreaterThanOrEqual(spec.initMin);
      expect(genome.traits[spec.key]).toBeLessThanOrEqual(spec.initMax);
    }
  });

  it('cloneGenome produces an independent copy (mutating the clone does not affect the original)', () => {
    const rng = createRNG(2);
    const genome = randomGenome(rng);
    const clone = cloneGenome(genome);
    clone.traits.size = 999;
    clone.brain[0] = 999;
    expect(genome.traits.size).not.toBe(999);
    expect(genome.brain[0]).not.toBe(999);
  });
});

describe('geneticDistance', () => {
  it('is zero for an identical genome', () => {
    const rng = createRNG(3);
    const genome = randomGenome(rng);
    expect(geneticDistance(genome, cloneGenome(genome))).toBeCloseTo(0, 10);
  });

  it('increases as a trait moves further from the original', () => {
    const rng = createRNG(4);
    const genome = randomGenome(rng);
    const near = cloneGenome(genome);
    near.traits.size = clampTrait('size', genome.traits.size + 0.05);
    const far = cloneGenome(genome);
    far.traits.size = clampTrait('size', genome.traits.size + 0.8);
    expect(geneticDistance(genome, far)).toBeGreaterThan(geneticDistance(genome, near));
  });
});

describe('mutateGenome', () => {
  it('never produces a trait outside its declared [min, max] bounds, even with extreme settings', () => {
    const rng = createRNG(5);
    const parent = randomGenome(rng);
    let child = parent;
    const extremeSettings = { ...DEFAULT_MUTATION_SETTINGS, mutationRateMultiplier: 20, mutationStrengthMultiplier: 20, rareMutationProbability: 1 };
    for (let i = 0; i < 50; i++) {
      child = mutateGenome(child, rng, extremeSettings);
      for (const spec of TRAIT_SPECS) {
        expect(child.traits[spec.key]).toBeGreaterThanOrEqual(spec.min);
        expect(child.traits[spec.key]).toBeLessThanOrEqual(spec.max);
      }
    }
  });

  it('with mutationRateMultiplier 0, traits are unchanged (no mutation applied)', () => {
    const rng = createRNG(6);
    const parent = randomGenome(rng);
    const zeroSettings = { ...DEFAULT_MUTATION_SETTINGS, mutationRateMultiplier: 0, neuralMutationRate: 0 };
    const child = mutateGenome(parent, rng, zeroSettings);
    for (const spec of TRAIT_SPECS) {
      expect(child.traits[spec.key]).toBe(parent.traits[spec.key]);
    }
  });

  it('is deterministic given the same starting RNG state', () => {
    const parent = randomGenome(createRNG(7));
    const childA = mutateGenome(parent, createRNG(100), DEFAULT_MUTATION_SETTINGS);
    const childB = mutateGenome(parent, createRNG(100), DEFAULT_MUTATION_SETTINGS);
    expect(childA.traits).toEqual(childB.traits);
    expect(Array.from(childA.brain)).toEqual(Array.from(childB.brain));
  });
});
