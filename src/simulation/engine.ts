import { createRNG, seedFromString } from './rng';
import type { WorldConfig, Organism } from './types';
import { DEFAULT_LAWS } from './types';
import type { WorldState } from './worldState';
import { generateTerrain } from '../environment/terrain';
import { createFoodField, rebuildFoodHash, stepFoodGrowth, removeFood } from '../environment/food';
import { createClimate, stepClimate, seasonalFactor } from '../environment/climate';
import { randomGenome } from '../genetics/genome';
import { DEFAULT_MUTATION_SETTINGS } from '../genetics/mutation';
import { createOrganism, allocateOrganismId } from '../organisms/organism';
import { senseAndDecide, plantEfficiency, huntEfficiency, hardShellEfficiency } from '../organisms/behavior';
import { reproduceAsexual } from '../genetics/inheritance';
import { SpeciesRegistry } from '../species/classification';
import { EventLog } from '../history/eventLog';
import { HistoryStore } from '../statistics/historyStore';
import { SpatialHash } from './spatialHash';
import { computeStats } from '../statistics/stats';
import { TICKS_PER_DAY, ENERGY, COMBAT, STATS_INTERVAL_TICKS, REBUILD_HASH_CELL_FRACTION } from './constants';
import { recordBirth, killOrganism } from './genealogy';

export function createWorld(config: WorldConfig): WorldState {
  const seedNum = seedFromString(config.seed);
  const rng = createRNG(seedNum);
  let nextOrganismId = 1;

  const terrain = generateTerrain(config, rng.fork());
  const food = createFoodField(config.worldSize);
  const climate = createClimate(config);
  const species = new SpeciesRegistry();
  const organisms = new Map<number, Organism>();

  // The whole starting cohort is treated as a single founding species — true speciation
  // only emerges later as lineages drift apart (see SpeciesRegistry.classifyNewborn).
  let founderSpeciesId: number | null = null;
  for (let i = 0; i < config.initialPopulation; i++) {
    const genome = randomGenome(rng);
    genome.traits.mutationRate = Math.max(genome.traits.mutationRate, config.mutationRate);
    const x = rng.next() * config.worldSize;
    const y = rng.next() * config.worldSize;
    const org = createOrganism(nextOrganismId++, genome, x, y, rng, { generation: 0, birthTick: 0 });
    if (founderSpeciesId === null) founderSpeciesId = species.createFounderSpecies(org, 0);
    org.speciesId = founderSpeciesId;
    organisms.set(org.id, org);
  }

  const genealogy = new Map();
  for (const org of organisms.values()) {
    genealogy.set(org.id, {
      id: org.id,
      name: org.name,
      parentId: null,
      generation: 0,
      speciesId: org.speciesId,
      birthTick: 0,
      deathTick: null,
      causeOfDeath: null,
      traits: { ...org.genome.traits },
    });
  }

  const state: WorldState = {
    config,
    rng,
    tick: 0,
    simDay: 0,
    nextOrganismId,
    organisms,
    terrain,
    food,
    climate,
    laws: { ...DEFAULT_LAWS },
    mutationSettings: { ...DEFAULT_MUTATION_SETTINGS },
    disease: { active: false, transmissionRate: 0, mortality: 0, incubationPeriod: 0, recoveryChance: 0, mutationRate: 0 },
    species,
    events: new EventLog(),
    history: new HistoryStore(),
    genealogy,
    orgHash: new SpatialHash<Organism>(config.worldSize, config.worldSize / REBUILD_HASH_CELL_FRACTION, (o) => o),
    births: 0,
    deaths: 0,
    totalBirths: 0,
    totalDeaths: 0,
    divineInterventions: 0,
    naturalGenerations: 0,
    interferedGenerations: 0,
    interferedThisGeneration: false,
    maxGenerationSeen: 0,
    paused: false,
    speedMultiplier: 1,
    unlockedGenes: new Set(),
    overlays: { vision: false, genetics: false, species: false, energy: false, food: false, ancestry: null },
    activeStorms: [],
    activeVolcanoes: [],
    activeFires: [],
  };

  state.events.add('natural', 'Life begins.', 0, 0);
  return state;
}

function livingOrganisms(state: WorldState): Organism[] {
  const arr: Organism[] = [];
  for (const o of state.organisms.values()) if (o.alive) arr.push(o);
  return arr;
}

export function stepWorld(state: WorldState, dt: number) {
  state.tick += dt;
  state.simDay = state.tick / TICKS_PER_DAY;
  stepClimate(state.climate, dt);

  const living = livingOrganisms(state);
  state.orgHash.insertAll(living);
  rebuildFoodHash(state.food);

  const season = seasonalFactor(state.climate);
  const seasonGrowth = 0.5 + season; // winter ~0.5x, summer ~1.5x
  stepFoodGrowth(state.food, state.terrain, state.config.worldSize, state.config.foodAbundance, state.climate.rainfall, seasonGrowth, state.laws, state.rng, dt);

  stepStorms(state, dt);
  stepDisease(state, living, dt);

  const consumedFood = new Set<number>();
  const resolvedAttackers = new Set<number>();
  const killedThisTick = new Set<number>();
  const newborns: Organism[] = [];

  for (const org of living) {
    if (!org.alive) continue;
    const decision = senseAndDecide(org, state.food.hash, state.orgHash, state.terrain, state.climate);

    // Steering + movement
    org.heading += decision.turn * dt;
    const t = org.genome.traits;
    const targetSpeed = decision.targetSpeedFraction * t.maxSpeed;
    const accel = t.acceleration * dt;
    if (org.speed < targetSpeed) org.speed = Math.min(targetSpeed, org.speed + accel);
    else org.speed = Math.max(targetSpeed, org.speed - accel);

    const dx = Math.cos(org.heading) * org.speed * dt;
    const dy = Math.sin(org.heading) * org.speed * dt;
    org.x = Math.max(0, Math.min(state.config.worldSize, org.x + dx));
    org.y = Math.max(0, Math.min(state.config.worldSize, org.y + dy));
    org.distanceTravelled += Math.hypot(dx, dy);

    // Energy costs
    const metabolism = t.metabolism;
    let cost = 0;
    cost += ENERGY.baseUpkeep * (0.4 + ENERGY.sizeUpkeepFactor * t.size) * metabolism * dt;
    cost += ENERGY.movementCostFactor * (org.speed * org.speed) * t.size * 0.03 * metabolism * state.laws.movementEnergyCost * dt;
    cost += ENERGY.visionCostFactor * (t.visionRadius / 150) * (t.fieldOfView / 180) * 0.02 * state.laws.visionEnergyCost * dt;
    cost += ENERGY.camouflageCostFactor * t.camouflage * 0.015 * dt;

    const localTempInput = decisionLocalTemp(state, org);
    const tempDiff = Math.max(0, Math.abs(localTempInput - t.tempToleranceCenter) - t.tempToleranceRange);
    cost += ENERGY.tempStressFactor * tempDiff * tempDiff * dt;
    cost += (t.tempToleranceRange - 0.15) * 0.01 * dt; // wide tolerance has a small baseline upkeep

    org.energy -= cost;
    org.age += dt / TICKS_PER_DAY;
    if (org.reproductionCooldown > 0) org.reproductionCooldown -= dt;

    // Eating
    if (decision.wantsToEat && decision.nearestFoodId !== null && !consumedFood.has(decision.nearestFoodId)) {
      const foodItem = state.food.items.get(decision.nearestFoodId);
      if (foodItem) {
        let efficiency = foodItem.kind === 'hardShell' ? hardShellEfficiency(t.size) : plantEfficiency(t.diet);
        const gained = foodItem.energy * efficiency * ENERGY.eatGainMultiplier * state.laws.foodEnergyGain;
        org.energy = Math.min(org.maxEnergy, org.energy + gained);
        org.foodEaten++;
        consumedFood.add(decision.nearestFoodId);
        removeFood(state.food, decision.nearestFoodId);
      }
    }

    // Combat
    if (
      decision.wantsToAttack &&
      decision.interactionTargetId !== null &&
      !resolvedAttackers.has(org.id) &&
      !killedThisTick.has(decision.interactionTargetId)
    ) {
      const target = state.organisms.get(decision.interactionTargetId);
      if (target && target.alive && !target.protectedFromThreats) {
        resolvedAttackers.add(org.id);
        const attackerPower = t.size * (0.4 + t.aggression) * huntEfficiency(t.diet) * COMBAT.baseAttackerAdvantage * state.laws.predationEffectiveness;
        const defenderPower = target.genome.traits.size * (0.5 + target.genome.traits.fearResponse * 0.3) * (1 - target.genome.traits.camouflage * 0.2);
        const successChance = attackerPower / (attackerPower + defenderPower + 0.001);
        if (state.rng.bool(Math.max(0.02, Math.min(0.95, successChance)))) {
          killedThisTick.add(target.id);
          killOrganism(state, target, `killed by ${org.name}`);
          org.kills++;
          const gained = target.energy * COMBAT.energyStealFraction * huntEfficiency(t.diet);
          org.energy = Math.min(org.maxEnergy, org.energy + Math.max(0, gained));
        } else {
          target.escapes++;
        }
      }
    }

    // Reproduction
    if (decision.wantsToReproduce && org.alive) {
      const kids = reproduceAsexual(org, state.rng, state.mutationSettings, state.tick, () => allocateOrganismId(state));
      for (const kid of kids) {
        kid.speciesId = state.species.classifyNewborn(kid, org.speciesId, state.tick);
        newborns.push(kid);
      }
      state.births += kids.length;
      state.totalBirths += kids.length;
      if (org.generation + 1 > state.maxGenerationSeen) {
        state.maxGenerationSeen = org.generation + 1;
        if (state.interferedThisGeneration) state.interferedGenerations++;
        else state.naturalGenerations++;
        state.interferedThisGeneration = false;
      }
    }

    // Death checks
    if (org.alive) {
      if (org.energy <= 0) {
        killOrganism(state, org, 'starvation');
      } else if (!org.immortal && org.age >= t.lifespan * state.laws.agingRate) {
        killOrganism(state, org, 'old age');
      } else if (org.infected && org.health <= 0) {
        killOrganism(state, org, 'disease');
      }
    }
  }

  // Commit deaths + newborns
  let deathsThisTick = 0;
  for (const org of living) {
    if (!org.alive) {
      deathsThisTick++;
    }
  }
  state.deaths += deathsThisTick;
  state.totalDeaths += deathsThisTick;
  for (const kid of newborns) {
    state.organisms.set(kid.id, kid);
    recordBirth(state, kid);
  }

  // Periodic stats + species bookkeeping
  if (Math.floor(state.tick) % STATS_INTERVAL_TICKS < dt) {
    const livingNow = livingOrganisms(state);
    const extinctSpecies = state.species.recount(livingNow, state.tick);
    const speciesCount = state.species.living().length;
    const prevStats = state.history.statHistory[state.history.statHistory.length - 1] ?? null;
    const stats = computeStats(livingNow, state.tick, state.births, state.deaths, state.food.items.size, speciesCount);
    state.history.pushStats(stats);
    state.history.maybeSnapshot(state.tick, stats, livingNow);
    const newSpecies = state.species.all().filter((s) => s.originTick === state.tick);
    state.events.detect(prevStats, stats, newSpecies, extinctSpecies);
    state.births = 0;
    state.deaths = 0;
  }

  // Remove the dead from the live map; their genealogy record (with cause/age of death) persists in state.genealogy.
  for (const [id, org] of state.organisms) {
    if (!org.alive) state.organisms.delete(id);
  }
}

function decisionLocalTemp(state: WorldState, org: Organism): number {
  // Re-derive without importing localTemperature to avoid an extra call site in behavior.ts;
  // kept identical to the formula used during sensing for consistency.
  const climate = state.climate;
  const season = seasonalFactor(climate);
  const seasonalSwing = (season - 0.5) * 0.6;
  const latitude = Math.abs(org.y / state.terrain.worldSize - 0.5) * 2;
  const latitudeBias = -latitude * 0.5;
  return Math.max(-1, Math.min(1, climate.baseTemperature + seasonalSwing + latitudeBias));
}

function stepStorms(state: WorldState, dt: number) {
  state.activeStorms = state.activeStorms.filter((s) => (s.ttl -= dt) > 0);
}

function stepDisease(state: WorldState, living: Organism[], dt: number) {
  if (!state.disease.active) return;
  const d = state.disease;
  for (const org of living) {
    if (org.infected) {
      org.infectionTimer -= dt;
      if (org.infectionTimer <= 0) {
        if (state.rng.bool(d.recoveryChance)) {
          org.infected = false;
          org.immune = true;
          org.health = 1;
        } else if (state.rng.bool(d.mortality * dt * 0.02)) {
          org.health -= 0.34 * dt;
        }
      }
    }
  }
  // Transmission via spatial proximity
  for (const org of living) {
    if (!org.infected || org.infectionTimer > 0) continue;
    state.orgHash.queryRadius(org.x, org.y, 14, (other) => {
      if (other.id === org.id || other.infected || other.immune || !other.alive) return;
      if (state.rng.bool(d.transmissionRate * dt * 0.05)) {
        other.infected = true;
        other.infectionTimer = d.incubationPeriod;
      }
    });
  }
}
