import { describe, expect, it } from 'vitest';
import { createResumeFrames, hasGodHint } from '../src/ui/Opening/worldBoot';

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
