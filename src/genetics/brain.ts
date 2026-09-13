// A tiny evolvable feed-forward neural network: INPUTS -> HIDDEN -> OUTPUTS.
// Weights (+biases) are a flat Float32Array so they can be cloned, mutated,
// and stored cheaply per-organism.

import type { RNG } from '../simulation/rng';

export const BRAIN_INPUTS = 10;
export const BRAIN_HIDDEN = 8;
export const BRAIN_OUTPUTS = 5;

const W1_SIZE = BRAIN_INPUTS * BRAIN_HIDDEN;
const B1_SIZE = BRAIN_HIDDEN;
const W2_SIZE = BRAIN_HIDDEN * BRAIN_OUTPUTS;
const B2_SIZE = BRAIN_OUTPUTS;
export const BRAIN_WEIGHT_COUNT = W1_SIZE + B1_SIZE + W2_SIZE + B2_SIZE;

export type BrainWeights = Float32Array;

export const OUTPUT_TURN = 0;
export const OUTPUT_THROTTLE = 1;
export const OUTPUT_EAT_INTENT = 2;
export const OUTPUT_REPRODUCE_INTENT = 3;
export const OUTPUT_AGGRESSION_MOD = 4;

function w1Index(hidden: number, input: number): number {
  return hidden * BRAIN_INPUTS + input;
}
function w2Index(output: number, hidden: number): number {
  return W1_SIZE + B1_SIZE + output * BRAIN_HIDDEN + hidden;
}
function b2Index(output: number): number {
  return W1_SIZE + B1_SIZE + W2_SIZE + output;
}

/**
 * Random init, but with a mild structured prior instead of pure noise: a
 * gen-0 population where every brain is a blank random slate overwhelmingly
 * starves before selection ever gets a chance to act (nothing points them
 * toward food). Real organisms are born with reflexes, not tabula rasa
 * nervous systems, so we seed a weak "turn toward sensed food, keep moving,
 * eat when close" instinct — still just genome values, still fully mutable
 * and can be bred away by selection if a stranger strategy pays off better.
 */
export function randomBrain(rng: RNG): BrainWeights {
  const w = new Float32Array(BRAIN_WEIGHT_COUNT);
  for (let i = 0; i < w.length; i++) w[i] = rng.gaussian(0, 0.35);

  // Hidden 0 reads the food bearing (sin component); output TURN steers toward it.
  w[w1Index(0, 0)] += 2.5;
  w[w2Index(OUTPUT_TURN, 0)] += 3;
  // Keep a baseline cruising speed instead of a coin-flip throttle.
  w[b2Index(OUTPUT_THROTTLE)] += 1.0;
  // Attempt to eat reasonably readily once food is in range.
  w[b2Index(OUTPUT_EAT_INTENT)] += 0.6;
  // Don't require a lucky roll to ever attempt reproduction once energy allows it.
  w[b2Index(OUTPUT_REPRODUCE_INTENT)] += 0.4;

  return w;
}

function tanh(x: number): number {
  return Math.tanh(x);
}
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

const scratchHidden = new Float32Array(BRAIN_HIDDEN);
export const scratchOutputs = new Float32Array(BRAIN_OUTPUTS);

/** Forward pass. Reuses a scratch output buffer (copy it if you need to hold onto it). */
export function brainForward(weights: BrainWeights, inputs: Float32Array): Float32Array {
  let idx = 0;
  for (let h = 0; h < BRAIN_HIDDEN; h++) {
    let sum = 0;
    for (let i = 0; i < BRAIN_INPUTS; i++) {
      sum += inputs[i] * weights[idx++];
    }
    scratchHidden[h] = sum;
  }
  for (let h = 0; h < BRAIN_HIDDEN; h++) {
    scratchHidden[h] = tanh(scratchHidden[h] + weights[idx++]);
  }
  for (let o = 0; o < BRAIN_OUTPUTS; o++) {
    let sum = 0;
    for (let h = 0; h < BRAIN_HIDDEN; h++) {
      sum += scratchHidden[h] * weights[idx++];
    }
    scratchOutputs[o] = sum;
  }
  for (let o = 0; o < BRAIN_OUTPUTS; o++) {
    scratchOutputs[o] = sigmoid(scratchOutputs[o] + weights[idx++]);
  }
  return scratchOutputs;
}

export function mutateBrain(weights: BrainWeights, rng: RNG, rate: number, strength: number): BrainWeights {
  const out = new Float32Array(weights.length);
  for (let i = 0; i < weights.length; i++) {
    let v = weights[i];
    if (rng.bool(rate)) {
      v += rng.gaussian(0, strength);
      if (rng.bool(0.05)) v += rng.gaussian(0, strength * 6); // rare large jump
    }
    out[i] = v;
  }
  return out;
}
