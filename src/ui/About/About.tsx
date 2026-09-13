import { Overlay } from '../TimeMachine/TimeMachine';

export function About({ onClose }: { onClose: () => void }) {
  return (
    <Overlay title="ℹ About This Simulation" onClose={onClose}>
      <div className="scroll-thin" style={{ padding: 24, overflowY: 'auto', maxWidth: 760, margin: '0 auto', lineHeight: 1.6, fontSize: 13 }}>
        <p>
          EVO is an artificial-life sandbox: organisms carry a genome of ~20 numeric traits plus a small evolvable
          neural network, sense only their local surroundings, and act, eat, fight, and reproduce accordingly.
          Nothing here calculates "fitness" and picks winners — whatever combination of traits leaves more
          surviving, reproducing descendants simply becomes more common over time. That is the entire mechanism.
        </p>

        <h3>What it demonstrates</h3>
        <ul>
          <li>Heritable variation, mutation, and selection acting on a population without a designed target.</li>
          <li>Trade-offs (size vs. upkeep, speed vs. energy cost, litter size vs. offspring energy) that make no
            single genome universally optimal.</li>
          <li>Genetic drift and lineage divergence leading to automatically detected speciation.</li>
          <li>How environmental pressure (scarcity, climate, predation) reshapes a population's trait
            distribution over generations — without ever telling organisms what to become.</li>
        </ul>

        <h3>What is simplified</h3>
        <ul>
          <li><strong>Speciation</strong> is approximated by genetic distance from a lineage's founder genome, not
            true reproductive isolation — it will not catch two separated sub-populations that happen to
            converge on similar traits.</li>
          <li><strong>Reproduction</strong> is currently asexual with mutation only; the genome and inheritance
            code is structured so sexual recombination could be added without changing the rest of the engine.</li>
          <li><strong>The neural "brain"</strong> is a single hidden-layer network with a fixed, small set of
            senses and actions — real nervous systems are vastly richer.</li>
          <li><strong>Time Machine snapshots</strong> store a capped sample of the population (not every
            organism) to keep memory bounded, so scrubbing history shows a representative sample rather than a
            byte-perfect replay.</li>
          <li><strong>Combat</strong> resolves as a single probabilistic roll from relative size/aggression/diet,
            not a physical simulation.</li>
        </ul>

        <h3>Assumptions the model makes</h3>
        <ul>
          <li>Energy is the universal currency: movement, vision, camouflage, temperature stress, and
            reproduction all cost it, and it is the only thing that kills an organism besides old age, disease,
            or violence.</li>
          <li>Mutation rate, mutation strength, and rare "jump" mutations are themselves genome parameters (or
            Divine Genetics settings), so the pace of evolution is emergent, not fixed.</li>
          <li>All world seeds are deterministic given identical settings and identical player intervention — but
            once you use God Mode, your own actions become part of the "seed" of what happens next.</li>
        </ul>

        <h3>Why runs differ</h3>
        <p>
          Two worlds with the same seed and no player intervention play out identically. Any divergence you see
          between runs comes from a setting you changed, a God Mode action you took, or simply because you
          started a different seed — the simulation itself has no hidden randomness once a seed is fixed. This
          is also why the Experiment Mode's "Split Timeline" holds the seed constant and changes exactly one
          variable: it isolates that variable's effect from ordinary run-to-run noise.
        </p>

        <h3>Scientific basis</h3>
        <p>
          A few mechanics are direct, but deliberately scoped, nods to specific findings in the evolutionary-
          biology and digital-evolution literature. None of these are claimed as faithful reproductions of the
          full model in the cited paper — each is a small, testable mechanic inspired by the paper's core idea.
        </p>
        <ul>
          <li>
            <strong>Connection pruning/restoration in the neural "brain"</strong> (Stanley &amp; Miikkulainen, 2002,
            <em> Evolving Neural Networks through Augmenting Topologies</em>): NEAT evolves both weights and
            network topology, starting minimal and complexifying over generations. EVO's brain keeps a fixed-size
            weight array (not a growable graph with historical markings/crossover like real NEAT) but a
            structural mutation can silence a connection to exactly zero or reactivate a silenced one — effective
            connectivity still evolves, just within a bounded array rather than a dynamic one.
          </li>
          <li>
            <strong>The <code>wingDevelopment</code> gene</strong> (Lenski, Ofria, Pennock &amp; Adami, 2003,
            <em> The Evolutionary Origin of Complex Features</em>): that paper evolved complex digital-organism
            logic functions through neutral/near-neutral stepping stones rather than direct selection the whole
            way. Here, an unlockable "flight" trait provides zero benefit — pure upkeep cost — below a threshold,
            so it can only accumulate via drift/linkage until a lineage crosses into the payoff region. It is a
            single-trait illustration of the idea, not a reproduction of Avida's logic-gate evolution.
          </li>
          <li>
            <strong>Active dispersal</strong> (Bocedi et al., 2014, <em>RangeShifter</em>; Landguth et al., 2017,
            <em> CDMetaPOP</em>): both are full individual-based, spatially-explicit landscape-genetics platforms
            modeling dispersal kernels and gene flow across habitat patches. EVO takes one idea from that family —
            a heritable <code>dispersalTendency</code> gene that occasionally triggers a long-range jump instead
            of local wandering — without patch-based connectivity graphs or explicit gene-flow tracking between
            named populations.
          </li>
          <li>
            <strong>Phenotypic plasticity</strong> (Canino-Koning, Wiser &amp; Ofria, 2019,
            <em> Fluctuating Environments Select for Short-Term Phenotypic Variation</em>; see also the
            evolvability-under-environmental-change literature): a heritable <code>plasticity</code> gene lets an
            organism's acclimated temperature preference drift toward locally experienced conditions within its
            own lifetime, at a rate the gene controls. The acclimated state itself is never inherited — only the
            capacity to acclimate is.
          </li>
          <li>
            <strong>Scavenging / carcasses</strong> (loosely motivated by the ecological-network-fragility
            literature, e.g. Sanders et al., 2016, <em>Environmental Change Makes Robust Ecological Networks
            Fragile</em>): every death leaves a body-mass-sized, decaying food item any organism can eat (more
            efficiently if its diet leans carnivorous). This is a minimal decomposer/scavenger trophic link, not a
            modeled multi-species interaction network — EVO does not build or analyze an explicit food web graph.
          </li>
          <li>
            <strong>Population size, mutation rate &amp; standing genetic variation</strong> (Elena, Wilke, Ofria
            &amp; Lenski, 2007, <em>Effects of Population Size and Mutation Rate on the Evolution of Mutational
            Robustness</em>; Misevic et al., <em>The Effects of Low-Impact Mutations in Digital Organisms</em>;
            Frank et al., 2021, <em>An Interplay of Resource Availability, Population Size and Mutation Rate</em>):
            these papers found that smaller populations and higher mutation rates tend to erode standing genetic
            variation and mutational robustness, while abundant resources and larger populations sustain more of
            it. EVO exposes a live per-trait standard-deviation stat so you can watch this relationship for
            yourself using God Mode's population/mutation-rate/food controls — the simulation does not hard-code
            the relationship, it just gives you the dial and the readout.
          </li>
        </ul>
        <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
          Not modeled: Lenski/Avida-style evolvable logic-gate tasks, full NEAT crossover with historical gene
          markings, RangeShifter/CDMetaPOP's explicit habitat-patch connectivity and gene-flow statistics, and any
          explicit food-web/interaction-network graph or fragility analysis. These are genuinely different (and
          in several cases much larger) pieces of software; EVO borrows one mechanic or one measurable
          relationship from each rather than reimplementing the paper.
        </p>
      </div>
    </Overlay>
  );
}
