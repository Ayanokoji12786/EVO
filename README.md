# EVO

**Evolution, one mutation at a time.**

EVO is a browser-based artificial-life laboratory. Hundreds to thousands of organisms —
each with its own genome (~26 heritable traits plus a small evolvable neural network) —
forage, flee, fight, scavenge, and reproduce on a large procedurally generated 3D world.
Nothing picks winners. There is no fitness function anywhere in the codebase — whatever
combination of traits leaves more surviving, reproducing descendants simply becomes more
common over time. Watch it run, scrub through its history, or step in as a god and
reshape the pressures that drive natural selection.

**Live demo:** **https://evo-two-theta.vercel.app/**

## Running it locally

```bash
npm install
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check + production build
npm run test     # run the vitest suite
npm run lint     # oxlint
```

## Deploying

The live demo above is deployed on **Vercel** — the repository needs zero configuration
for it (Vercel auto-detects the Vite preset: build command `npm run build`, output
`dist/`). Importing the repo at [vercel.com](https://vercel.com) and clicking Deploy is
enough; every push to `main` redeploys automatically.

A GitHub Pages workflow is also included (`.github/workflows/deploy.yml`). To use it,
open **Settings → Pages** in the GitHub repository and set **Build and deployment →
Source** to **GitHub Actions** once; every push to `main` then builds and publishes to
`https://<owner>.github.io/EVO/` as well. Vite's `base` path is set automatically
depending on which environment builds it, so both deployments work without edits.

## What's implemented

- **World**: a large procedurally generated 3D terrain (grass / forest / desert / tundra
  / water / mountain / fertile / toxic biomes) rendered with a real heightmap and texture
  in Three.js/WebGL, with a day/night cycle, seasons, renewable food that grows back
  per-terrain, temperature gradients, weather (rainfall that visibly grows food fields,
  droughts, storms, ice ages, heat waves), and decaying scavengeable carcasses left
  behind by every death — a minimal decomposer/scavenger trophic link.
- **Creatures**: rendered at population scale as instanced 3D meshes (colored by
  species, genetic similarity, energy, or a live "evolution vision" overlay depending on
  the active view), with a detailed animated 2D portrait sprite for whichever organism is
  currently selected in the Creature Inspector — full per-population 3D detail isn't
  tractable at thousands of organisms, so the close-up view carries the visual detail
  instead.
- **Genetics**: 26 trade-off traits (size, speed, acceleration, vision radius & field of
  view, metabolism, energy storage, lifespan, reproduction threshold/cost, mutation rate,
  diet, aggression, fear response, exploration tendency, litter size, camouflage, color,
  temperature tolerance & plasticity, dispersal tendency, an unlockable "wing
  development" complex trait, ...) plus a small evolvable feed-forward neural network
  (10 inputs → 8 hidden → 5 outputs) that turns senses (nearest food/organism bearing &
  distance, energy, age, temperature) into actions (steer, throttle, eat, reproduce,
  fight-or-flee). A NEAT-inspired (Stanley & Miikkulainen 2002) structural mutation can
  prune or restore individual connections, evolving effective network complexity over
  generations.
- **Reproduction & mutation**: asexual reproduction with per-gene mutation (small drift,
  occasional large jumps), architected so sexual recombination could be added later
  without touching the rest of the engine.
- **Natural selection**: fully emergent — no fitness function, just energy, death,
  density-dependent carrying-capacity regulation (crowding raises upkeep cost, and a hard
  ceiling above capacity stops reproduction outright so a population boom can't also
  become a performance cliff), and reproduction.
- **Speciation**: automatic, based on genetic divergence from a lineage's founder genome.
  A radial **Tree of Life** view visualizes every lineage's origin, divergence, and
  extinction, with real per-species stats and a milestone list pulled from the world's
  own event log.
- **World Analytics dashboard**: Overview / Population / Species / Environment / Traits /
  Events tabs. Nine live-trending metric cards (population, species count, a genetic
  diversity index, average body size/speed/metabolism, food abundance, births, biomass),
  a major-events feed, and a real Pearson-correlation panel (e.g. food abundance ↔
  population) — every number is computed from the world's actual recorded history.
- **Creature Inspector**: click (or God Mode's Life tool) any organism to see its genome,
  life stats, ancestry chain, and follow it with the camera until it dies.
- **Time controls**: pause/1×/5×/100× speed, periodic world snapshots, a **Time Machine**
  to scrub through history and compare any two generations trait-by-trait, and a
  "500 Generations Later" cinematic fast-forward with a data-derived before/after summary.
- **God Mode**: a radial wheel (opened from the World/Life/Evolution/Terrain/Weather
  sections of the left rail) with eight branches, several of them themselves sub-menus of
  world-wide "mass manipulation" options rather than a single click each:
  - **Weather** — rain (paint a live brush that grows a real food field), storm, drought,
    snow, heat wave, ice age.
  - **Destruction** — meteor strike, volcano, flood, wildfire, and lightning (all
    targeted), plus a world-wide Dark Age.
  - **Evolution** — seven environmental-pressure options (favor speed / small size /
    large size / camouflage / efficiency / cold resistance / intelligence) that reshape
    selection pressure for the *entire* population without ever touching a genome
    directly, plus a targeted force-mutate.
  - **Laws of Nature** — six world-wide rule changes (plant growth rate, predation
    effectiveness, aging rate ±, mutation rate, carrying capacity).
  - **Terraform**, **Life** (place a custom organism), **Predators** (introduce a
    hunter), and **Disease** (release a plague) round out the wheel.
  - Every God Mode action is logged to the world's real event log and counted separately
    from natural generations; instant (non-targeted) actions also surface a brief
    confirmation toast.
- **Experiment Mode**: "Split Timeline" — clone the current seed into a control and an
  experiment world, change exactly one variable, run both, and compare results side by
  side (with CSV/JSON export).
- **World seeds**: a deterministic seeded RNG (mulberry32) — the same seed and settings,
  with no intervention, reproduce the exact same run.
- **Natural History log**: automatic milestone detection (population thresholds, new
  species, extinctions, mass die-offs, significant trait shifts) rather than a raw event
  firehose.

See the in-app **About** panel (gear menu) for what's simplified and why runs can differ
between sessions.

## Architecture

The codebase is split cleanly into a **framework-free simulation engine** and a
**React/Three.js presentation layer** that reads it — the engine has no idea React or a
canvas exists, which is what makes it independently unit-testable (see `tests/`) and
would let it move into a Web Worker later without a rewrite.

### Simulation engine (`src/simulation`, `src/genetics`, `src/organisms`,
`src/environment`, `src/species`, `src/statistics`, `src/history`, `src/god`,
`src/experiments`)

- **`simulation/worldState.ts`** defines `WorldState` — one plain object holding
  everything about a running world: the organism map, terrain grid, food field, climate,
  the "Laws of Nature" (tunable global rates), species registry, event log, snapshot
  history, and a spatial hash for neighbor queries.
- **`simulation/engine.ts`**'s `stepWorld()` is the fixed-tick simulation step: rebuild
  the spatial hash, let every organism sense its surroundings and decide (via
  `organisms/behavior.ts`'s `senseAndDecide`, which runs the neural net), resolve eating/
  combat/reproduction, age and cull the dead, then commit newborns — gated by the hard
  population ceiling described above.
- **`genetics/`** holds the trait table (`traits.ts`), the small feed-forward brain
  (`brain.ts`), mutation logic (`mutation.ts`), and inheritance (`inheritance.ts`).
- **`environment/`** generates and steps terrain, food, and climate independently of any
  organism.
- **`species/classification.ts`** does the (documented, simplified — see the About panel)
  speciation check: a newborn diverging far enough from its species' representative
  genome founds a new species.
- **`god/godActions.ts`** is the entire "God Mode" surface as plain functions —
  everything from `paintRainfall` to `applyEvolutionaryPressure` — called by both the UI
  and the test suite the same way.
- **`simulation/rng.ts`** is a deterministic mulberry32 PRNG used everywhere instead of
  `Math.random`, with a `.fork()` method for parallel-safe branching (used heavily by
  Experiment Mode's control/experiment split).

### Rendering (`src/rendering3d`, `src/rendering`)

The world view is real Three.js/WebGL, not a 2D canvas: `rendering3d/worldRenderer.ts`
owns the scene graph — a heightmapped terrain mesh textured from the same biome data the
simulation uses (`rendering3d/terrainMesh.ts`), and `THREE.InstancedMesh` fields for both
creatures and food (`rendering3d/creatures.ts`, `rendering3d/food.ts`) so the draw-call
count stays flat regardless of population size. `rendering/camera.ts` preserves a simple
legacy `(x, y, zoom)` camera model translated into a real perspective camera at a fixed
pitch. The one 2D-canvas holdout is `rendering/creatureSprite.ts`, which draws the
detailed, genome-driven hero portrait used by the Creature Inspector — per-genome 3D
models at population scale isn't tractable, so the close-up view is where the visual
detail lives instead.

### State (`src/state`)

`state/simulationController.ts`'s `SimulationController` owns the `requestAnimationFrame`
loop, ticks the engine, drives the renderer, and exposes imperative methods (`select`,
`pan`, `zoom`, `applyPendingGodAction`, ...) that the UI calls directly — the running
simulation is not piped through React state every tick, only the *derived* stats needed
for display are pushed into a Zustand store (`state/simStore.ts`) on a throttled
interval. This keeps thousands of organisms updating at full speed without React
re-rendering on every tick.

### UI (`src/ui`)

React components read `SimulationController`/the Zustand store and render the HUD: a
persistent top bar and left rail (`ui/Layout`), the God Mode radial wheel
(`ui/GodMode`), the Creature Inspector (`ui/Inspector`), Tree of Life
(`ui/TreeOfLife`), World Analytics (`ui/Analytics`), Time Machine (`ui/TimeMachine`),
Experiment Mode (`ui/Experiments`), the opening/world-creation flow and cinematic boot
sequence (`ui/Opening`), and the "500 Generations Later" replay (`ui/Cinematic`).

## Scientific grounding

A handful of mechanics are scoped, explicitly-documented nods to specific papers, not
claims of full fidelity to them:

1. Lenski, Ofria, Pennock & Adami (2003), *The Evolutionary Origin of Complex Features* —
   motivates the `wingDevelopment` gene: pure upkeep cost below a threshold, so it can
   only accumulate via drift until a lineage crosses into a functional payoff.
2. Stanley & Miikkulainen (2002), *Evolving Neural Networks through Augmenting
   Topologies (NEAT)* — motivates the brain's prune/restore structural mutation.
3. Bocedi et al. (2014), *RangeShifter*, and 4. Landguth et al. (2017), *CDMetaPOP* —
   motivate the heritable `dispersalTendency` gene (occasional long-range jumps).
5–6. The evolvability-under-environmental-change / fluctuating-environments literature
   (e.g. Canino-Koning et al.) — motivates the heritable `plasticity` gene (in-lifetime,
   non-heritable acclimation of temperature preference).
7–9. Elena et al. (2007); the low-impact-mutations-in-digital-organisms line of work; and
   the resource/population-size/mutation-rate interplay literature — motivate exposing a
   live per-trait standard-deviation stat, so the population-size/mutation-rate/food
   relationship to standing genetic variation is observable rather than asserted.
10. The ecological-network-fragility literature (e.g. Sanders et al., *Environmental
   Change Makes Robust Ecological Networks Fragile*) — loosely motivates the
   carcass/scavenging trophic link.

The in-app About panel spells out exactly what is and isn't modeled from each.

## Testing

The simulation engine's framework-free design means its core rules are covered by plain
Vitest unit tests in `tests/` — determinism (`rng.test.ts`), reproduction and mutation
(`reproduction.test.ts`, `genetics.test.ts`), speciation (`species.test.ts`), the
carrying-capacity ceiling (`carryingCapacity.test.ts`), God Mode actions
(`godMode.test.ts`), Experiment Mode's control/experiment split
(`experiment.test.ts`), the event log (`eventLog.test.ts`), the boot sequence
(`worldBoot.test.ts`), and the research-paper-motivated mechanics
(`researchMechanics.test.ts`) — with no rendering or DOM involved.

## Tech stack

TypeScript, React 19, Vite, Zustand, Three.js (world rendering), Canvas2D (creature
portrait sprite), Recharts (Analytics dashboard), Vitest.

---

**Live demo:** https://evo-two-theta.vercel.app/
