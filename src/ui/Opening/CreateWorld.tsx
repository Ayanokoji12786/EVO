import { useState } from 'react';
import type { WorldConfig } from '../../simulation/types';
import orbitalHero from '../../assets/evo-orbital-hero.png';
import worldAtlas from '../../assets/world-atlas.png';
import worldCrisis from '../../assets/world-crisis.png';
import worldSpace from '../../assets/world-space.png';
import './CreateWorld.css';

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
  const [foodAbundance, setFoodAbundance] = useState(1);
  const [mutationRate, setMutationRate] = useState(0.04);
  const [climate, setClimate] = useState<WorldConfig['climate']>('temperate');
  const [worldSize, setWorldSize] = useState(3200);
  const [tab, setTab] = useState<'world'|'life'|'evolution'|'advanced'>('world');
  const [temperature,setTemperature] = useState(15);
  const [rainfall,setRainfall] = useState(1);
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
      initialTemperatureC:temperature,
      initialRainfall:rainfall,
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

  return <main className={`universe-settings ${closing?'is-closing':''}`} style={{backgroundImage:`url(${worldSpace})`}}>
    <header className="universe-brand"><span>E V O</span><small>ARTIFICIAL LIFE LAB</small></header>
    <div className="universe-config reference-card">
      <div className="universe-config-heading"><div><small>EVERY WORLD BEGINS WITH A POSSIBILITY</small><h1>CREATE A UNIVERSE</h1></div><button aria-label="Back to launch" onClick={()=>setShowSettings(false)}>×</button></div>
      <nav className="universe-tabs" aria-label="World setup sections">{(['world','life','evolution','advanced'] as const).map(section=><button key={section} aria-pressed={tab===section} className={tab===section?'is-active':''} onClick={()=>setTab(section)}>{section.replace(/^./,letter=>letter.toUpperCase())}</button>)}</nav>
      <div className="universe-config-body">
        <div className="universe-fields">
          {tab==='world' && <>
            <span className="universe-field-label">CLIMATE PRESET</span>
            <div className="universe-presets">{(['temperate','hot','cold','variable'] as const).map(preset=><button key={preset} aria-pressed={climate===preset} className={`climate-${preset} ${climate===preset?'is-active':''}`} onClick={()=>{setClimate(preset);setTemperature(preset==='hot'?23:preset==='cold'?10:15);}}><img src={preset==='hot'?worldCrisis:worldAtlas} alt="" /><span>{preset}</span></button>)}</div>
            <SetupSlider label="World diameter" value={worldSize} display={`${worldSize.toLocaleString()} m`} min={1200} max={6000} step={200} onChange={setWorldSize} />
            <SetupSlider label="Initial base temperature" value={temperature} display={`${temperature}°C`} min={3} max={27} step={1} onChange={setTemperature} />
            <SetupSlider label="Initial rainfall" value={rainfall} display={`${rainfall.toFixed(2)}×`} min={.2} max={2.5} step={.05} onChange={setRainfall} />
            <p className="universe-note">Explore a circular world of mountains, shores and evolving ecosystems. Climate thumbnails are illustrative.</p>
          </>}
          {tab==='life' && <><h2>A beginning, not a blueprint.</h2><p className="universe-note">Organisms start with random inherited traits. Survival and reproduction shape what follows.</p><div className="universe-population-presets">{[200,400,800].map(value=><button key={value} className={population===value?'is-active':''} onClick={()=>setPopulation(value)}>{value} organisms</button>)}</div><SetupSlider label="Starting organisms" value={population} display={population.toLocaleString()} min={10} max={4000} step={10} onChange={setPopulation} /><SetupSlider label="Food abundance" value={foodAbundance} display={`${foodAbundance.toFixed(2)}×`} min={.2} max={2} step={.05} onChange={setFoodAbundance} /></>}
          {tab==='evolution' && <><h2>Small changes. Infinite forms.</h2><p className="universe-note">Mutation creates heritable variation. There is no prescribed evolutionary goal: the environment selects through survival.</p><SetupSlider label="Initial mutation rate" value={mutationRate} display={`${(mutationRate*100).toFixed(1)}%`} min={.005} max={.2} step={.005} onChange={setMutationRate} /><div className="universe-evolution-note"><span>HERITABLE VARIATION</span><p>Higher rates introduce more variation, but can also disrupt successful traits.</p></div></>}
          {tab==='advanced' && <><h2>Make the world your own.</h2><label className="universe-seed">WORLD SEED<div><input aria-label="World seed" maxLength={100} value={seed} onChange={event=>setSeed(event.target.value)} /><button aria-label="Generate random seed" onClick={()=>setSeed(randomSeed())}>↻</button></div></label><p className="universe-note">An identical seed and settings reproduce the same natural history. Interventions change its course.</p><div className="universe-resolution"><span>TERRAIN RESOLUTION</span><b>{buildConfig().gridResolution} × {buildConfig().gridResolution}</b><p>Scales with world size to retain landscape detail.</p></div></>}
        </div>
        <aside className="universe-preview"><div className="universe-preview-globe" style={{backgroundImage:`url(${worldAtlas})`}} /><small>WORLD {shortWorldId(seed)}</small><h2>{climate.replace(/^./,letter=>letter.toUpperCase())} world</h2><dl><div><dt>Diameter</dt><dd>{worldSize.toLocaleString()} m</dd></div><div><dt>Organisms</dt><dd>{population.toLocaleString()}</dd></div><div><dt>Temperature</dt><dd>{temperature}°C base</dd></div><div><dt>Rainfall</dt><dd>{rainfall.toFixed(2)}×</dd></div><div><dt>Mutation</dt><dd>{(mutationRate*100).toFixed(1)}%</dd></div></dl></aside>
      </div>
      <footer className="universe-config-footer"><span>LIFE DOESN'T FOLLOW A SCRIPT.</span><button disabled={closing || !seed.trim()} onClick={()=>launch(buildConfig())}>CREATE WORLD →</button></footer>
    </div>
  </main>;
}

function SetupSlider({label,value,display,min,max,step,onChange}:{label:string;value:number;display:string;min:number;max:number;step:number;onChange:(value:number)=>void}) { return <label className="universe-slider"><span>{label}</span><input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={event=>onChange(Number(event.target.value))} /><b>{display}</b></label>; }
