import { describe, it, expect } from 'vitest';
import { traitPercentChange } from '../src/statistics/stats';

describe('traitPercentChange', () => {
  it('matches a plain relative percent change for a baseline well away from 0', () => {
    // visionRadius: 20..260, a baseline of 100 is nowhere near the 2%-of-range threshold.
    expect(traitPercentChange('visionRadius', 100, 150)).toBeCloseTo(50, 5);
    expect(traitPercentChange('visionRadius', 100, 50)).toBeCloseTo(-50, 5);
  });

  it('falls back to a range-relative percent instead of blowing up near a zero baseline', () => {
    // tempToleranceCenter: -1..1 (range 2). A baseline of -0.02 is well inside the 2%-of-range
    // (0.04) threshold, so a small absolute shift must not read as several hundred percent.
    const pct = traitPercentChange('tempToleranceCenter', -0.02, -0.09);
    expect(Math.abs(pct)).toBeLessThan(20);
    expect(pct).toBeLessThan(0); // still correctly signed (decreased)
  });

  it('reports a real shift even when the baseline is exactly 0, instead of hiding it as 0%', () => {
    // diet: 0..1 — an all-herbivore control population can have an exact 0 average.
    const pct = traitPercentChange('diet', 0, 0.3);
    expect(pct).toBeGreaterThan(0);
  });

  it('in the near-zero regime, the same absolute shift gives the same percent regardless of baseline', () => {
    // Range-relative percent depends only on the absolute delta, not on exactly where
    // within the near-zero band the baseline sits — unlike plain relative percent, which
    // would give wildly different results for baselines of -0.001 vs -0.03.
    const a = traitPercentChange('tempToleranceCenter', -0.001, 0.049);
    const b = traitPercentChange('tempToleranceCenter', -0.03, 0.02);
    expect(a).toBeCloseTo(b, 5);
  });
});
