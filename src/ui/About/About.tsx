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
      </div>
    </Overlay>
  );
}
