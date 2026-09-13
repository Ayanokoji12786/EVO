// Deterministic seeded PRNG (mulberry32) plus a splitmix32-based seed expander.
// Used everywhere in the simulation instead of Math.random so that a given
// world seed + settings reproduce the same evolutionary run.

export type RNG = {
  next(): number; // [0, 1)
  int(maxExclusive: number): number;
  range(min: number, max: number): number;
  gaussian(mean?: number, stdDev?: number): number;
  bool(probability?: number): boolean;
  pick<T>(arr: readonly T[]): T;
  fork(): RNG; // deterministic child stream, for parallel-safe branching
  state(): number;
};

function splitmix32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRNG(seed: number): RNG {
  let s = seed >>> 0;
  let hasSpareGaussian = false;
  let spareGaussian = 0;

  function nextRaw(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rng: RNG = {
    next: nextRaw,
    int(maxExclusive: number) {
      return Math.floor(nextRaw() * maxExclusive);
    },
    range(min: number, max: number) {
      return min + nextRaw() * (max - min);
    },
    gaussian(mean = 0, stdDev = 1) {
      if (hasSpareGaussian) {
        hasSpareGaussian = false;
        return mean + spareGaussian * stdDev;
      }
      let u = 0;
      let v = 0;
      let mag = 0;
      do {
        u = nextRaw() * 2 - 1;
        v = nextRaw() * 2 - 1;
        mag = u * u + v * v;
      } while (mag >= 1 || mag === 0);
      const mul = Math.sqrt((-2 * Math.log(mag)) / mag);
      spareGaussian = v * mul;
      hasSpareGaussian = true;
      return mean + u * mul * stdDev;
    },
    bool(probability = 0.5) {
      return nextRaw() < probability;
    },
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(nextRaw() * arr.length)];
    },
    fork(): RNG {
      const childSeed = Math.floor(nextRaw() * 4294967296);
      return createRNG(childSeed);
    },
    state() {
      return s >>> 0;
    },
  };
  return rng;
}

export function seedFromString(seedStr: string): number {
  const gen = splitmix32(hashStringToSeed(seedStr));
  return Math.floor(gen() * 4294967296);
}
