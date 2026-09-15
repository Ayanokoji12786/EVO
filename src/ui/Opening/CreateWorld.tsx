import { useState } from 'react';
import type { WorldConfig } from '../../simulation/types';
import orbitalHero from '../../assets/evo-orbital-hero.png';

function randomSeed(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function shortWorldId(seed: string): string {
  const numericSeed = Number.parseInt(seed, 10);
  return Number.isFinite(numericSeed)
    ? numericSeed.toString(36).toUpperCase().padStart(4, '0').slice(-4)
    : seed.toUpperCase().slice(0, 4).padEnd(4, '0');
}

export function CreateWorld({ onStart }: { onStart: (config: WorldConfig) => void }) {
  const [seed, setSeed] = useState(randomSeed());
  const [population, setPopulation] = useState(400);
  const [customPop, setCustomPop] = useState(false);
  const [foodAbundance, setFoodAbundance] = useState(1);
  const [mutationRate, setMutationRate] = useState(0.04);
  const [climate, setClimate] = useState<WorldConfig['climate']>('temperate');
  const [worldSize, setWorldSize] = useState(3200);
  const [advanced, setAdvanced] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [closing, setClosing] = useState(false);

  // Fade this screen to near-black before handing off to the boot sequence, instead of
  // an instant cut — the boot sequence's own opening frame is already near-black, so this
  // reads as one continuous darkening rather than two unrelated screens.
  function launch(cfg: WorldConfig) {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => onStart(cfg), 260);
  }

  function buildConfig(): WorldConfig {
    return {
      seed,
      worldSize,
      // Keep terrain feature density roughly constant as the world grows, instead of a
      // fixed grid stretching into coarser, blander biome patches at large sizes.
      gridResolution: Math.round(Math.max(64, Math.min(200, worldSize / 18))),
      initialPopulation: population,
      foodAbundance,
      mutationRate,
      climate,
    };
  }

  if (!showSettings) {
    const worldId = shortWorldId(seed);
    return (
      <main className={`launch-screen${closing ? ' is-closing' : ''}`} aria-labelledby="launch-title">
        <div className="launch-orbital-backdrop" style={{ backgroundImage: `url(${orbitalHero})` }} aria-hidden="true" />
        <div className="launch-atmosphere" aria-hidden="true" />

        <header className="launch-header">
          <span className="launch-mark">E V O</span>
          <nav className="launch-top-nav" aria-label="EVO areas">
            <span>SIMULATE</span><i />
            <span>EXPLORE</span><i />
            <span>EXPERIMENT</span><i />
            <span>DISCOVER</span>
          </nav>
          <span className="launch-manifesto">A SMALL WORLD. INFINITE STORIES.</span>
        </header>

        <section className="launch-content">
          <h1 id="launch-title" aria-label="EVO">E V O</h1>
          <h2>LIFE DOESN&apos;T FOLLOW A SCRIPT.</h2>
          <p className="launch-description">An artificial-life laboratory<br />for exploring evolution through<br />natural selection.</p>
          <div className="launch-actions">
            <button className="launch-action launch-action-primary" onClick={() => setShowSettings(true)}>
              <span>CREATE UNIVERSE</span><b aria-hidden="true">→</b>
            </button>
            <button className="launch-action launch-action-secondary" onClick={() => launch(buildConfig())}>
              <i className="launch-continue-mark" aria-hidden="true">◉</i>
              <span><strong>QUICK START</strong><small>WORLD {worldId} · GENERATION 0</small></span><b aria-hidden="true">→</b>
            </button>
          </div>
          <div className="launch-pathways" aria-label="Ways to explore EVO">
            <article><i className="pathway-symbol">◌</i><strong>SIMULATE</strong><span>Watch life evolve</span></article>
            <article><i className="pathway-symbol">⌬</i><strong>EXPERIMENT</strong><span>Test ideas</span></article>
            <article><i className="pathway-symbol">⌁</i><strong>ANALYZE</strong><span>Find patterns</span></article>
            <article><i className="pathway-symbol">✦</i><strong>DISCOVER</strong><span>Create new worlds</span></article>
          </div>
        </section>

        <blockquote className="launch-quote">“In all things of nature<br />there is something of the marvelous.”<cite>— ARISTOTLE</cite></blockquote>
        <div className="launch-scroll-cue" aria-hidden="true"><i /><span>SCROLL TO BEGIN</span><b>⌄</b></div>
        <aside className="launch-featured" aria-label="Featured world Terra Prime">
          <div className="launch-featured-image" style={{ backgroundImage: `url(${orbitalHero})` }} />
          <div className="launch-featured-copy"><small>FEATURED WORLD</small><strong>Terra Prime</strong><span>A balanced ecosystem<br />Generation 12,847</span></div>
          <b className="launch-featured-arrow" aria-hidden="true">→</b>
          <em>“Still evolving...”</em>
        </aside>
        <div className="launch-worlds-await" aria-hidden="true"><span>MANY WORLDS AWAIT</span><i /><i /><i /></div>
      </main>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 30% 20%, rgba(94,230,197,0.08), transparent 45%), radial-gradient(circle at 75% 75%, rgba(217,140,255,0.06), transparent 50%), var(--bg)',
        transition: 'opacity .26s ease, filter .26s ease',
        opacity: closing ? 0 : 1,
        filter: closing ? 'blur(6px)' : 'none',
      }}
    >
      <div style={{ maxWidth: 560, width: '100%', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: 6, color: 'var(--accent)' }}>EVO</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>Evolution, one mutation at a time.</div>
        </div>

        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Create a World</h2>
            <button className="btn" onClick={() => setAdvanced((a) => !a)}>
              {advanced ? 'QUICK START' : 'ADVANCED WORLD SETTINGS'}
            </button>
          </div>

          <label className="field">
            Population
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[200, 400, 800].map((p) => (
                <button
                  key={p}
                  className={`btn ${!customPop && population === p ? 'active' : ''}`}
                  onClick={() => {
                    setPopulation(p);
                    setCustomPop(false);
                  }}
                >
                  {p}
                </button>
              ))}
              <button className={`btn ${customPop ? 'active' : ''}`} onClick={() => setCustomPop(true)}>
                Custom
              </button>
              {customPop && (
                <input
                  type="number"
                  min={10}
                  max={4000}
                  value={population}
                  onChange={(e) => setPopulation(Math.max(10, Math.min(4000, Number(e.target.value))))}
                  style={{ width: 90 }}
                />
              )}
            </div>
          </label>

          {advanced && (
            <>
              <label className="field">
                Food abundance <span className="value">{foodAbundance.toFixed(2)}x</span>
                <input type="range" min={0.2} max={2} step={0.05} value={foodAbundance} onChange={(e) => setFoodAbundance(Number(e.target.value))} />
              </label>
              <label className="field">
                Mutation rate <span className="value">{(mutationRate * 100).toFixed(1)}%</span>
                <input type="range" min={0.005} max={0.2} step={0.005} value={mutationRate} onChange={(e) => setMutationRate(Number(e.target.value))} />
              </label>
              <label className="field">
                World size <span className="value">{worldSize} units</span>
                <input type="range" min={1200} max={6000} step={200} value={worldSize} onChange={(e) => setWorldSize(Number(e.target.value))} />
              </label>
              <label className="field">
                Climate
                <select value={climate} onChange={(e) => setClimate(e.target.value as WorldConfig['climate'])}>
                  <option value="temperate">Temperate</option>
                  <option value="hot">Hot</option>
                  <option value="cold">Cold</option>
                  <option value="variable">Variable</option>
                </select>
              </label>
            </>
          )}

          <label className="field">
            World seed
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} style={{ flex: 1, fontFamily: 'var(--mono)' }} />
              <button className="btn" onClick={() => setSeed(randomSeed())}>
                🎲
              </button>
            </div>
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              className="btn primary"
              style={{ flex: 1, padding: '12px 0', fontSize: 14 }}
              onClick={() => launch(buildConfig())}
            >
              CREATE UNIVERSE
            </button>
            <button
              className="btn"
              style={{ padding: '12px 18px' }}
              onClick={() => launch(buildConfig())}
              title="Re-run this exact seed and settings"
            >
              REPLAY SEED
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
