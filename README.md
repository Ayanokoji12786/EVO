# EVO

**Evolution, one mutation at a time.**

EVO is a browser-based artificial-life evolution simulator. Hundreds to thousands of
organisms — rendered as small procedural pixel-art creatures, not plain dots — with
their own genome (~23 heritable traits plus a small evolvable neural network) forage,
flee, fight, scavenge, and reproduce on a large procedurally generated world. Nothing
picks winners — whatever combination of traits leaves more surviving, reproducing
descendants simply becomes more common. Watch it run, or step in as God and reshape the
pressures that drive natural selection.

## Running it

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run test     # run the vitest suite
```

## Deploying for anyone to use

This repository includes a GitHub Pages workflow. In the GitHub repository, open
**Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**
once. Every subsequent push to `main` builds and publishes the app automatically.

For this repository, the public address will be:

```
https://ayanokoji12786.github.io/EVO/
```

Use the **Actions** tab to watch the first `Deploy EVO to GitHub Pages` run. GitHub will
show the same URL in the successful deployment details. The workflow configures Vite's
repository base path during the deploy build, so assets work at the Pages URL while
local development continues to work at `http://localhost:5173/`.

## What's implemented

- **World**: large procedurally generated terrain (grass/forest/desert/tundra/water/
  mountain/fertile/toxic), day/night cycle, seasons, renewable food that grows back
  per-terrain, temperature gradients, and decaying scavengeable carcasses left behind by
  every death (a minimal decomposer/scavenger trophic link).
- **Creatures**: each organism is a procedurally generated pixel-art sprite (original
  retro-game-style design, not any specific copyrighted artwork) — outfit color follows
  species identity, headband color follows diet (herbivore/omnivore/carnivore), skin tone
  follows climate adaptation, and it walks, turns, and flips to face its movement
  direction.
- **Genetics**: ~23 trade-off traits (size, speed, vision, metabolism, diet, aggression,
  camouflage, temperature tolerance & plasticity, dispersal tendency, litter size,
  mutation rate, an unlockable "wing development" complex trait, ...) plus a small
  evolvable feed-forward neural network that turns senses (nearest food/organism
  bearing & distance, energy, age, temperature) into actions (steer, throttle, eat,
  reproduce, fight-or-flee). A NEAT-inspired (Stanley & Miikkulainen 2002) structural
  mutation can prune or restore individual connections, evolving effective network
  complexity over generations.
- **Reproduction & mutation**: asexual reproduction with per-gene mutation (small drift,
  occasional large jumps), architected so sexual recombination could be added later.
- **Natural selection**: emergent — no fitness function, just energy, death, crowding
  (density-dependent carrying-capacity regulation), and reproduction.
- **Speciation**: automatic, based on genetic divergence from a lineage's founder
  genome; a Tree of Life view visualizes species origin, divergence, and extinction.
- **Live stats dashboard**: population, births/deaths, generation, per-trait averages and
  standard deviations (a standing-genetic-variation proxy), trophic composition
  (herbivore/omnivore/carnivore split), selectable trait graphs.
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

## Architecture

The simulation engine (`src/simulation`, `src/genetics`, `src/organisms`,
`src/environment`, `src/species`, `src/statistics`, `src/history`, `src/god`,
`src/experiments`) is plain, framework-free TypeScript — no React or DOM dependency —
so it can be tested in isolation (see `tests/`) and is straightforward to move into a
Web Worker later. Rendering (`src/rendering`) is Canvas 2D, decoupled from the
simulation's fixed-tick step. The UI (`src/ui`, `src/state`) is React + Zustand, reading
the engine's mutable world state imperatively on each animation frame rather than
piping every tick through React state.
