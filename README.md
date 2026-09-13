# EVO

**Evolution, one mutation at a time.**

EVO is a browser-based artificial-life evolution simulator. Hundreds of organisms with
their own genome (~20 heritable traits plus a small evolvable neural network) forage,
flee, fight, and reproduce on a procedurally generated world. Nothing picks winners —
whatever combination of traits leaves more surviving, reproducing descendants simply
becomes more common. Watch it run, or step in as God and reshape the pressures that
drive natural selection.

## Running it

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run test     # run the vitest suite
```

## What's implemented

- **World**: procedurally generated terrain (grass/forest/desert/tundra/water/mountain/
  fertile/toxic), day/night cycle, seasons, renewable food that grows back per-terrain,
  temperature gradients.
- **Genetics**: ~20 trade-off traits (size, speed, vision, metabolism, diet, aggression,
  camouflage, temperature tolerance, litter size, mutation rate, ...) plus a small
  evolvable feed-forward neural network that turns senses (nearest food/organism
  bearing & distance, energy, age, temperature) into actions (steer, throttle, eat,
  reproduce, fight-or-flee).
- **Reproduction & mutation**: asexual reproduction with per-gene mutation (small drift,
  occasional large jumps), architected so sexual recombination could be added later.
- **Natural selection**: emergent — no fitness function, just energy, death, and
  reproduction.
- **Speciation**: automatic, based on genetic divergence from a lineage's founder
  genome; a Tree of Life view visualizes species origin, divergence, and extinction.
- **Live stats dashboard**: population, births/deaths, generation, per-trait averages,
  selectable trait graphs.
- **Creature Inspector**: click any organism to see its genome, life stats, ancestry
  chain (with mutated genes highlighted), and follow it with the camera until it dies.
- **Time controls**: pause/play/2×/5×/10×/max speed, periodic world snapshots, a Time
  Machine to scrub through history and compare generations, and a "500 Generations
  Later" cinematic fast-forward with a data-derived before/after summary.
- **God Mode**: weather & climate control, terraforming, resource control, divine
  genetics (mutation rate, unlockable genes), disasters (meteor, volcano, flood,
  wildfire, lightning, ice age, heat wave), plague creation, Hand of God actions
  (bless/smite/mutate/clone/teleport/protect lineage/make immortal), custom creature
  creation, evolutionary-pressure shortcuts, and God's-eye overlays (vision, species,
  genetics, energy, ancestry). Every intervention is logged and counted separately from
  natural generations.
- **Experiment Mode**: "Split Timeline" — clone the current seed into a control and an
  experiment world, change exactly one variable, run both, and compare results
  (with CSV/JSON export).
- **World seeds**: deterministic seeded RNG — the same seed and settings (and no
  intervention) reproduce the same run.
- **Natural History log**: automatic milestone detection (population thresholds, new
  species, extinctions, mass die-offs, significant trait shifts) rather than a raw
  event firehose.

See the in-app **About** panel for what's simplified and why runs can differ between
sessions.

## Architecture

The simulation engine (`src/simulation`, `src/genetics`, `src/organisms`,
`src/environment`, `src/species`, `src/statistics`, `src/history`, `src/god`,
`src/experiments`) is plain, framework-free TypeScript — no React or DOM dependency —
so it can be tested in isolation (see `tests/`) and is straightforward to move into a
Web Worker later. Rendering (`src/rendering`) is Canvas 2D, decoupled from the
simulation's fixed-tick step. The UI (`src/ui`, `src/state`) is React + Zustand, reading
the engine's mutable world state imperatively on each animation frame rather than
piping every tick through React state.
