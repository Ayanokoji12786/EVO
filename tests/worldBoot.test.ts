import { describe, expect, it } from 'vitest';
import { createResumeFrames, hasGodHint, flavorLine } from '../src/ui/Opening/worldBoot';

describe('world boot history', () => {
  it('builds a chronological resume sequence from actual evolution events', () => {
    const frames = createResumeFrames([
      { id: 1, tick: 0, generation: 0, category: 'natural', message: 'Life begins.' },
      { id: 2, tick: 120, generation: 42, category: 'evolutionary', message: 'Generation 42 — A new species emerged: Velora.' },
      { id: 3, tick: 210, generation: 87, category: 'extinction', message: 'Generation 87 — Velora minor became extinct.' },
    ], 100);

    expect(frames).toEqual([
      { generation: 0, title: 'LIFE BEGINS' },
      { generation: 42, title: 'SPECIATION DETECTED' },
      { generation: 87, title: 'MASS EXTINCTION' },
      { generation: 100, title: 'PRESENT DAY' },
    ]);
  });

  it('makes the God Mode hint deterministic for a given world seed', () => {
    expect(hasGodHint('7F3A')).toBe(hasGodHint('7F3A'));
  });
});

describe('world-conditioned boot flavor line', () => {
  it('picks cold over scarcity/abundance when the world is cold', () => {
    expect(flavorLine({ climate: 'cold', foodAbundance: 1.8 })).toBe('LIFE LEARNS TO ENDURE.');
  });

  it('picks scarcity for a dry world regardless of climate type', () => {
    expect(flavorLine({ climate: 'temperate', foodAbundance: 0.5 })).toBe('WAITING FOR RAIN.');
    expect(flavorLine({ climate: 'hot', foodAbundance: 0.6 })).toBe('WAITING FOR RAIN.');
  });

  it('picks abundance for a fertile world', () => {
    expect(flavorLine({ climate: 'temperate', foodAbundance: 1.6 })).toBe('ABUNDANCE INVITES CHANGE.');
  });

  it('falls back to a neutral line for an unremarkable temperate world', () => {
    expect(flavorLine({ climate: 'temperate', foodAbundance: 1 })).toBe('LIFE BEGINS WITH A SINGLE POSSIBILITY.');
  });
});
