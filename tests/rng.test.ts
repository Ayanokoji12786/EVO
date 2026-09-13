import { describe, it, expect } from 'vitest';
import { createRNG, seedFromString } from '../src/simulation/rng';

describe('seeded RNG', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = createRNG(12345);
    const b = createRNG(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRNG(1);
    const b = createRNG(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('keeps every draw within [0, 1)', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('seedFromString is deterministic for the same string', () => {
    expect(seedFromString('hello-world')).toBe(seedFromString('hello-world'));
  });

  it('seedFromString differs for different strings (no accidental collision on common inputs)', () => {
    expect(seedFromString('824719')).not.toBe(seedFromString('824718'));
  });

  it('fork() produces a child stream that does not repeat the parent sequence', () => {
    const parent = createRNG(999);
    const parentNext = parent.next();
    const parent2 = createRNG(999);
    parent2.next(); // consume the same draw so fork happens at the same point
    const child = parent2.fork();
    const childNext = child.next();
    expect(childNext).not.toBe(parentNext);
  });
});
