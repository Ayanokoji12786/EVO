import { useState } from 'react';
import type { WorldConfig } from '../../simulation/types';

function randomSeed(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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

  if (!showSettings) return <div className="opening-hero"><div className="opening-life" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="opening-copy"><h1>EVO</h1><h2>Life doesn't follow a script.</h2><p>An artificial-life laboratory for exploring evolution through natural selection.</p><button className="opening-cta" onClick={()=>setShowSettings(true)}>CREATE UNIVERSE</button><button className="opening-replay" onClick={()=>onStart(buildConfig())}>Replay World {seed} — a new evolutionary record</button></div></div>;

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
              onClick={() => onStart(buildConfig())}
            >
              CREATE UNIVERSE
            </button>
            <button
              className="btn"
              style={{ padding: '12px 18px' }}
              onClick={() => onStart(buildConfig())}
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
