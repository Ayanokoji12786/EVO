// Central definition of every heritable trait: its valid range and default
// random-init range. Keeping this as one table makes trade-offs auditable
// and lets "unlockable genes" (God Mode) extend the set at runtime.

export interface TraitSpec {
  key: string;
  min: number;
  max: number;
  initMin: number;
  initMax: number;
  description: string;
}

export const TRAIT_SPECS: TraitSpec[] = [
  { key: 'size', min: 0.4, max: 2.2, initMin: 0.7, initMax: 1.3, description: 'Body scale. Bigger = more max energy & combat power, but higher upkeep.' },
  { key: 'maxSpeed', min: 0.3, max: 3.2, initMin: 0.6, initMax: 1.6, description: 'Top movement speed. Costs energy quadratically with speed used.' },
  { key: 'acceleration', min: 0.2, max: 3.0, initMin: 0.5, initMax: 1.5, description: 'How quickly the organism reaches its target speed.' },
  { key: 'visionRadius', min: 20, max: 260, initMin: 60, initMax: 140, description: 'How far the organism can sense food and other organisms.' },
  { key: 'fieldOfView', min: 40, max: 340, initMin: 120, initMax: 260, description: 'Angular width of vision, in degrees.' },
  { key: 'metabolism', min: 0.5, max: 2.6, initMin: 0.8, initMax: 1.3, description: 'Multiplier on all baseline energy upkeep costs.' },
  { key: 'energyStorage', min: 0.5, max: 1.8, initMin: 0.8, initMax: 1.3, description: 'Multiplier on max energy capacity (combines with size).' },
  { key: 'lifespan', min: 40, max: 240, initMin: 80, initMax: 160, description: 'Maximum age in simulated days before death from old age.' },
  { key: 'reproductionThreshold', min: 0.45, max: 0.95, initMin: 0.55, initMax: 0.85, description: 'Fraction of max energy required before reproduction is attempted.' },
  { key: 'reproductionCost', min: 0.15, max: 0.65, initMin: 0.25, initMax: 0.5, description: 'Fraction of max energy spent per reproduction event.' },
  { key: 'mutationRate', min: 0.001, max: 0.35, initMin: 0.01, initMax: 0.08, description: 'Per-gene probability of mutation in offspring.' },
  { key: 'diet', min: 0, max: 1, initMin: 0, initMax: 1, description: '0 = strict herbivore, 1 = strict carnivore. Omnivores are less efficient at both.' },
  { key: 'aggression', min: 0, max: 1, initMin: 0, initMax: 0.4, description: 'Tendency to attack other organisms rather than avoid them.' },
  { key: 'fearResponse', min: 0, max: 1, initMin: 0.2, initMax: 0.8, description: 'Sensitivity that triggers fleeing from larger/aggressive organisms.' },
  { key: 'explorationTendency', min: 0, max: 1, initMin: 0.2, initMax: 0.8, description: 'Bias toward wandering vs. directed foraging.' },
  { key: 'offspringCount', min: 1, max: 5, initMin: 1, initMax: 2, description: 'Litter size. Energy is split between offspring.' },
  { key: 'camouflage', min: 0, max: 1, initMin: 0, initMax: 0.3, description: 'Reduces detection distance by others; small upkeep cost.' },
  { key: 'colorHue', min: 0, max: 360, initMin: 0, initMax: 360, description: 'Visual hue; drifts with mutation (cosmetic + lineage marker).' },
  { key: 'tempToleranceCenter', min: -1, max: 1, initMin: -0.6, initMax: 0.6, description: 'Preferred normalized temperature.' },
  { key: 'tempToleranceRange', min: 0.15, max: 1.4, initMin: 0.3, initMax: 0.7, description: 'Width of comfortable temperature band. Wider = generalist, costs baseline energy.' },
  {
    key: 'plasticity',
    min: 0,
    max: 1,
    initMin: 0.05,
    initMax: 0.4,
    description:
      'How fast temperature preference acclimates within a lifetime toward locally experienced conditions (phenotypic plasticity). High plasticity hedges against fluctuating environments; low plasticity commits to a fixed strategy that is cheaper when conditions are stable.',
  },
  {
    key: 'dispersalTendency',
    min: 0,
    max: 1,
    initMin: 0,
    initMax: 0.25,
    description:
      'Probability per day of an active long-distance dispersal jump instead of local movement — colonizes new terrain and avoids local crowding/inbreeding, at an energy cost.',
  },
  {
    key: 'wingDevelopment',
    min: 0,
    max: 1,
    initMin: 0,
    initMax: 0,
    description:
      "A complex trait that only pays off past a threshold (~0.6): partial development is pure upkeep cost with no benefit, so it can only accumulate via drift or linkage until a lineage crosses the threshold and gains a real evasion/movement-efficiency payoff. Models how complex features evolve through non-adaptive 'stepping stones' rather than direct selection the whole way (Lenski et al. 2003). Stays at 0 unless God Mode unlocks 'flight'.",
  },
];

export const TRAIT_KEYS = TRAIT_SPECS.map((t) => t.key);

export function traitSpec(key: string): TraitSpec {
  const spec = TRAIT_SPECS.find((t) => t.key === key);
  if (!spec) throw new Error(`Unknown trait: ${key}`);
  return spec;
}

export function clampTrait(key: string, value: number): number {
  const spec = traitSpec(key);
  return Math.min(spec.max, Math.max(spec.min, value));
}
