import type { WorldState } from '../simulation/worldState';
import type { Organism, TerrainType } from '../simulation/types';
import { applyDroughtToFood } from '../environment/food';
import { paintTerrain } from '../environment/terrain';
import { forceMutation } from '../genetics/mutation';
import { cloneGenome, randomGenome } from '../genetics/genome';
import { createOrganism, allocateOrganismId } from '../organisms/organism';
import { recordBirth, killOrganism } from '../simulation/genealogy';

function logDivine(state: WorldState, message: string) {
  state.divineInterventions++;
  state.interferedThisGeneration = true;
  state.events.add('divine', message, state.tick, state.maxGenerationSeen);
}

// --- Weather / climate ---

export function setRainfall(state: WorldState, value: number) {
  state.climate.rainfall = Math.max(0, Math.min(2.5, value));
  logDivine(state, `God set rainfall to ${state.climate.rainfall.toFixed(2)}x.`);
}

export function setTemperature(state: WorldState, normalizedTemp: number) {
  state.climate.baseTemperature = Math.max(-1, Math.min(1, normalizedTemp));
  logDivine(state, `God set base temperature to ${state.climate.baseTemperature.toFixed(2)}.`);
}

export function triggerDrought(state: WorldState, severity = 0.6) {
  state.climate.rainfall = Math.max(0.05, state.climate.rainfall * (1 - severity));
  applyDroughtToFood(state.food, severity * 0.5, state.rng);
  logDivine(state, `God initiated a drought (severity ${(severity * 100).toFixed(0)}%).`);
}

export function triggerIceAge(state: WorldState, magnitude = 0.5) {
  state.climate.baseTemperature = Math.max(-1, state.climate.baseTemperature - magnitude);
  logDivine(state, `God triggered an ice age (Δtemp -${magnitude.toFixed(2)}).`);
}

export function triggerHeatWave(state: WorldState, magnitude = 0.5) {
  state.climate.baseTemperature = Math.min(1, state.climate.baseTemperature + magnitude);
  logDivine(state, `God triggered a global heat wave (Δtemp +${magnitude.toFixed(2)}).`);
}

/** Returns the boom duration (ticks); the caller is responsible for reverting rainfall after it elapses. */
export function triggerFoodBoom(state: WorldState, duration = 400): number {
  state.climate.rainfall = Math.min(2.5, state.climate.rainfall * 1.8);
  logDivine(state, `God triggered a food boom.`);
  return duration;
}

/** Paints a local rainfall cell. Repeated brush strokes reinforce the same weather system
 * instead of spawning an unbounded number of overlapping clouds. */
export function paintRainfall(state: WorldState, x: number, y: number, radius: number, intensity: number, duration: number) {
  const existing = state.activeStorms.find((storm) => Math.hypot(storm.x - x, storm.y - y) < Math.min(storm.radius, radius) * 0.7);
  if (existing) {
    existing.x = (existing.x + x) / 2;
    existing.y = (existing.y + y) / 2;
    existing.radius = Math.max(existing.radius, radius);
    existing.intensity = Math.min(1, existing.intensity + intensity * 0.25);
    existing.ttl = Math.max(existing.ttl, duration);
  } else {
    state.activeStorms.push({ x, y, radius, intensity, ttl: duration });
    logDivine(state, `🌧 God painted rainfall over the land.`);
  }
}

// --- Disasters ---

export function triggerMeteor(state: WorldState, x: number, y: number, radius: number) {
  let killed = 0;
  for (const org of state.organisms.values()) {
    if (!org.alive || org.immortal) continue;
    const dist = Math.hypot(org.x - x, org.y - y);
    if (dist <= radius) {
      const deathChance = 1 - dist / radius;
      if (state.rng.bool(deathChance)) {
        killOrganism(state, org, 'meteor impact');
        killed++;
      }
    }
  }
  paintTerrain(state.terrain, x, y, radius * 0.6, 'toxic');
  for (const [id, item] of state.food.items) {
    if (Math.hypot(item.x - x, item.y - y) <= radius) state.food.items.delete(id);
  }
  logDivine(state, `☄️ METEOR struck (${killed} organisms killed).`);
}

export function triggerVolcano(state: WorldState, x: number, y: number) {
  state.activeVolcanoes.push({ x, y, nextEruption: 0 });
  paintTerrain(state.terrain, x, y, 30, 'mountain');
  logDivine(state, `🌋 God created a volcano.`);
}

export function triggerFlood(state: WorldState, x: number, y: number, radius: number) {
  paintTerrain(state.terrain, x, y, radius, 'water');
  for (const org of state.organisms.values()) {
    if (org.alive && Math.hypot(org.x - x, org.y - y) <= radius * 0.3 && !org.immortal) {
      if (state.rng.bool(0.3)) killOrganism(state, org, 'flood');
    }
  }
  logDivine(state, `🌊 God flooded the region.`);
}

export function triggerWildfire(state: WorldState, x: number, y: number, radius: number) {
  state.activeFires.push({ x, y, intensity: 1 });
  for (const [id, item] of state.food.items) {
    if (Math.hypot(item.x - x, item.y - y) <= radius) state.food.items.delete(id);
  }
  for (const org of state.organisms.values()) {
    if (org.alive && Math.hypot(org.x - x, org.y - y) <= radius * 0.5 && !org.immortal && state.rng.bool(0.25)) {
      killOrganism(state, org, 'wildfire');
    }
  }
  logDivine(state, `🔥 Wildfire swept through the region.`);
}

export function triggerLightning(state: WorldState, x: number, y: number) {
  for (const org of state.organisms.values()) {
    if (org.alive && Math.hypot(org.x - x, org.y - y) <= 12 && !org.immortal) {
      killOrganism(state, org, 'lightning strike');
    }
  }
  logDivine(state, `⚡ Lightning struck.`);
}

export function triggerDarkAge(state: WorldState) {
  state.climate.rainfall *= 0.4;
  logDivine(state, `🌑 God dimmed the sun (Dark Age).`);
}

// --- Terraforming ---

export function terraformBrush(state: WorldState, x: number, y: number, radius: number, terrainType: TerrainType) {
  paintTerrain(state.terrain, x, y, radius, terrainType);
  logDivine(state, `🌍 God terraformed a region into ${terrainType}.`);
}

// --- Genetics / laws ---

export function setMutationRateMultiplier(state: WorldState, value: number) {
  state.mutationSettings.mutationRateMultiplier = Math.max(0, value);
  logDivine(state, `🧬 God set mutation rate multiplier to ${value.toFixed(2)}x.`);
}

export function unlockGene(state: WorldState, geneName: string) {
  state.unlockedGenes.add(geneName);
  logDivine(state, `🔓 God unlocked a new possible mutation: ${geneName}.`);
}

export function setLaw(state: WorldState, key: keyof WorldState['laws'], value: number) {
  state.laws[key] = value;
  logDivine(state, `⚖️ God changed a Law of Nature: ${key} → ${value.toFixed(2)}.`);
}

// --- Disease ---

export function createPlague(
  state: WorldState,
  params: { transmissionRate: number; mortality: number; incubationPeriod: number; recoveryChance: number; mutationRate: number },
) {
  state.disease = { active: true, ...params };
  const patientsZero = [...state.organisms.values()].filter((o) => o.alive);
  const count = Math.max(1, Math.round(patientsZero.length * 0.01));
  for (let i = 0; i < count; i++) {
    const org = state.rng.pick(patientsZero);
    org.infected = true;
    org.infectionTimer = params.incubationPeriod;
  }
  logDivine(state, `🦠 God released a plague (${count} patient(s) zero).`);
}

export function endPlague(state: WorldState) {
  state.disease.active = false;
}

// --- Hand of God (direct creature intervention) ---

export function bless(state: WorldState, orgId: number) {
  const org = state.organisms.get(orgId);
  if (!org) return;
  org.energy = org.maxEnergy;
  org.health = 1;
  logDivine(state, `✨ God blessed ${org.name}.`);
}

export function smite(state: WorldState, orgId: number) {
  const org = state.organisms.get(orgId);
  if (!org) return;
  killOrganism(state, org, 'smitten by God');
  logDivine(state, `⚡ God smote ${org.name}.`);
}

export function forceMutate(state: WorldState, orgId: number) {
  const org = state.organisms.get(orgId);
  if (!org) return;
  org.genome = forceMutation(org.genome, state.rng);
  logDivine(state, `🧬 God forced a mutation in ${org.name}.`);
}

export function editGenome(state: WorldState, orgId: number, traitKey: string, value: number) {
  const org = state.organisms.get(orgId);
  if (!org) return;
  org.genome.traits[traitKey] = value;
  logDivine(state, `✏️ God edited ${org.name}'s genome: ${traitKey} → ${value.toFixed(2)}.`);
}

export function makeImmortal(state: WorldState, orgId: number) {
  const org = state.organisms.get(orgId);
  if (!org) return;
  org.immortal = true;
  logDivine(state, `♾️ God made ${org.name} immortal.`);
}

export function cloneCreature(state: WorldState, orgId: number): Organism | null {
  const org = state.organisms.get(orgId);
  if (!org) return null;
  const genome = cloneGenome(org.genome);
  const clone = createOrganism(allocateOrganismId(state), genome, org.x + 10, org.y + 10, state.rng, {
    parentId: org.id,
    generation: org.generation,
    speciesId: org.speciesId,
    birthTick: state.tick,
  });
  state.organisms.set(clone.id, clone);
  recordBirth(state, clone);
  logDivine(state, `🧬 God cloned ${org.name} → ${clone.name}.`);
  return clone;
}

export function teleport(state: WorldState, orgId: number, x: number, y: number) {
  const org = state.organisms.get(orgId);
  if (!org) return;
  org.x = Math.max(0, Math.min(state.config.worldSize, x));
  org.y = Math.max(0, Math.min(state.config.worldSize, y));
  logDivine(state, `🌀 God teleported ${org.name}.`);
}

export function protectLineage(state: WorldState, orgId: number) {
  const org = state.organisms.get(orgId);
  if (!org) return;
  org.protectedFromThreats = true;
  logDivine(state, `🛡️ God protected ${org.name}'s lineage.`);
}

export interface CustomCreatureSpec {
  traits: Partial<Record<string, number>>;
}

export function placeCreature(state: WorldState, spec: CustomCreatureSpec, x: number, y: number): Organism {
  const genome = randomGenome(state.rng.fork());
  Object.assign(genome.traits, spec.traits);
  const org = createOrganism(allocateOrganismId(state), genome, x, y, state.rng, { generation: 0, birthTick: state.tick });
  org.speciesId = state.species.createFounderSpecies(org, state.tick);
  state.organisms.set(org.id, org);
  recordBirth(state, org);
  logDivine(state, `🧬 God created a new lifeform: ${org.name}.`);
  return org;
}

// A God-spawned predator still runs through exactly the same engine rules as every other
// organism — same aging, energy, hunting, and reproduction code path, nothing
// special-cased. What's tuned here is only its *starting genome*: diet/aggression/speed/
// size make it a credible apex hunter, and reproductionThreshold/reproductionCost/
// offspringCount/cooldown are deliberately conservative so a spawned pack doesn't
// immediately out-breed the population it's meant to hunt — a fresh predator arrives at
// 75% energy (see createOrganism) with only a 5-15 tick cooldown by default, which for a
// hunter that refuels fast off kills reads as "reproduces insanely fast".
function predatorGenome(state: WorldState) {
  const genome = randomGenome(state.rng.fork());
  genome.traits.diet = 0.9;
  genome.traits.aggression = 0.8;
  genome.traits.maxSpeed = Math.max(genome.traits.maxSpeed, 1.6);
  genome.traits.size = Math.max(genome.traits.size, 1.2);
  genome.traits.reproductionThreshold = 0.88;
  genome.traits.reproductionCost = 0.5;
  genome.traits.offspringCount = 1;
  return genome;
}

function spawnPredator(state: WorldState, x: number, y: number): Organism {
  const genome = predatorGenome(state);
  const org = createOrganism(allocateOrganismId(state), genome, x, y, state.rng, { generation: 0, birthTick: state.tick });
  org.reproductionCooldown = state.rng.range(70, 110);
  state.organisms.set(org.id, org);
  recordBirth(state, org);
  return org;
}

export function introducePredator(state: WorldState, x: number, y: number): Organism {
  const org = spawnPredator(state, x, y);
  org.speciesId = state.species.createFounderSpecies(org, state.tick);
  logDivine(state, `🐺 God introduced a predator: ${org.name}.`);
  return org;
}

/** Spawns `count` predators scattered within `radius` of (x, y), all founding the same
 * new species so they read as one coordinated pack in the Tree of Life rather than N
 * unrelated lineages. Used by the "Predator Swarm" God Mode option, which arms this with
 * count = ~20% of the current living population. */
export function introducePredatorPack(state: WorldState, x: number, y: number, count: number, radius: number): Organism[] {
  const pack: Organism[] = [];
  let founderSpeciesId: number | null = null;
  for (let i = 0; i < count; i++) {
    const angle = state.rng.range(0, Math.PI * 2);
    const dist = state.rng.range(0, radius);
    const px = Math.max(0, Math.min(state.config.worldSize, x + Math.cos(angle) * dist));
    const py = Math.max(0, Math.min(state.config.worldSize, y + Math.sin(angle) * dist));
    const org = spawnPredator(state, px, py);
    if (founderSpeciesId === null) founderSpeciesId = state.species.createFounderSpecies(org, state.tick);
    org.speciesId = founderSpeciesId;
    pack.push(org);
  }
  logDivine(state, `🐺 God unleashed a predator swarm: ${pack.length} hunters.`);
  return pack;
}

export type EvolutionaryPressureGoal =
  | 'speed'
  | 'smallSize'
  | 'largeSize'
  | 'camouflage'
  | 'efficiency'
  | 'coldResistance'
  | 'intelligence';

/**
 * Applies environmental conditions likely to favor a trait — never touches
 * organism genomes directly. Evolution still has to do the work.
 */
export function applyEvolutionaryPressure(state: WorldState, goal: EvolutionaryPressureGoal) {
  switch (goal) {
    case 'speed':
      state.climate.rainfall *= 0.7; // sparser food rewards efficient foragers/hunters
      introducePredator(state, state.rng.next() * state.config.worldSize, state.rng.next() * state.config.worldSize);
      break;
    case 'smallSize':
      state.laws.carryingCapacity = Math.max(500, state.laws.carryingCapacity * 0.6);
      break;
    case 'largeSize':
      state.laws.predationEffectiveness *= 1.4;
      break;
    case 'camouflage':
      introducePredator(state, state.rng.next() * state.config.worldSize, state.rng.next() * state.config.worldSize);
      break;
    case 'efficiency':
      triggerDrought(state, 0.5);
      break;
    case 'coldResistance':
      triggerIceAge(state, 0.4);
      break;
    case 'intelligence':
      state.laws.movementEnergyCost *= 0.85; // cheaper movement rewards active, exploratory brains
      break;
  }
  logDivine(state, `🎯 Evolutionary pressure applied: favor ${goal}. The outcome is not guaranteed.`);
}
