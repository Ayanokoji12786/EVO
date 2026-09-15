import { useState, type ReactNode } from 'react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { SimulationController } from '../../state/simulationController';
import { TRAIT_SPECS } from '../../genetics/traits';
import { traitPercentChange } from '../../statistics/stats';
import { useSimStore } from '../../state/simStore';
import worldAtlas from '../../assets/world-atlas.png';
import specimenPortrait from '../../assets/specimen-portrait.png';
import cosmos from '../../assets/genesis-cosmos.png';
import { ReferenceIcon } from '../shared/ReferenceIcon';
import './TimeMachine.css';

export function TimeMachine({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  useSimStore((state) => state.stats?.tick);
  const events = useSimStore((state) => state.events);
  const snapshots = controller.world.history.snapshots;
  const [selectedTick, setSelectedTick] = useState<number | null>(null);
  const [compareTick, setCompareTick] = useState<number | null>(null);
  const [tab, setTab] = useState<'timeline'|'comparison'>('timeline');
  const nearest = (tick: number | null, latest: boolean) => tick === null ? snapshots[latest ? snapshots.length - 1 : 0] : snapshots.reduce((closest,item) => Math.abs(item.tick-tick) < Math.abs(closest.tick-tick) ? item : closest, snapshots[0]);
  const snap = snapshots.length ? nearest(selectedTick,true) : null;
  const compare = snapshots.length ? nearest(compareTick,false) : null;
  const selectedIndex = snap ? snapshots.findIndex((item) => item.tick === snap.tick) : 0;
  const deltas = snap && compare ? TRAIT_SPECS.map((trait) => ({ key:trait.key, before:compare.stats.avg[trait.key] ?? 0, after:snap.stats.avg[trait.key] ?? 0, pct:traitPercentChange(trait.key, compare.stats.avg[trait.key] ?? 0, snap.stats.avg[trait.key] ?? 0) })).sort((a,b) => Math.abs(b.pct)-Math.abs(a.pct)) : [];
  const featured = events.filter((event) => ['evolutionary','environmental','extinction','divine'].includes(event.category)).slice(-8);
  const worldSize = controller.world.config.worldSize;

  return <Overlay title="TIME MACHINE" onClose={onClose}>
    <p className="reference-subtitle">EVERY GENERATION LEAVES A TRACE.</p>
    <nav className="reference-tabs"><button className={tab==='timeline'?'is-active':''} onClick={() => setTab('timeline')}>Timeline & Events</button><button className={tab==='comparison'?'is-active':''} onClick={() => setTab('comparison')}>Species Comparison</button></nav>
    {!snap || !compare ? <div className="reference-empty"><img src={cosmos} alt="First life forming" /><h3>THE FIRST CHAPTER IS FORMING</h3><p>Historical snapshots are recorded every 300 ticks. Keep the world running to explore its evolution.</p></div> : <div className="time-content scroll-thin">
      <div className="time-selectors"><label>EARLIER RECORD<select aria-label="Earlier snapshot" value={compare.tick} onChange={(event) => setCompareTick(Number(event.target.value))}>{snapshots.map((item) => <option key={item.tick} value={item.tick}>Generation {item.generation} · Tick {item.tick.toLocaleString()}</option>)}</select></label><span>→</span><label>SELECTED RECORD<select aria-label="Selected snapshot" value={selectedTick===null?'latest':snap.tick} onChange={(event) => setSelectedTick(event.target.value==='latest'?null:Number(event.target.value))}><option value="latest">Latest available record</option>{snapshots.map((item) => <option key={item.tick} value={item.tick}>Generation {item.generation} · Tick {item.tick.toLocaleString()}</option>)}</select></label></div>
      {tab==='timeline' ? <>
        <div className="time-layout"><div className="time-map reference-card"><div className="time-map-heading"><small>RECONSTRUCTED SNAPSHOT</small><h3>Generation {snap.generation.toLocaleString()}</h3><span>Tick {snap.tick.toLocaleString()} · {snap.stats.population.toLocaleString()} organisms</span></div><svg viewBox={`0 0 ${worldSize} ${worldSize}`} role="img" aria-label="Sampled historical organism locations over illustrative terrain"><defs><clipPath id="timeDisc"><circle cx={worldSize/2} cy={worldSize/2} r={worldSize*.49} /></clipPath></defs><g clipPath="url(#timeDisc)"><image href={worldAtlas} width={worldSize} height={worldSize} opacity=".7" />{snap.sampleOrganisms.map((organism) => <circle key={organism.id} cx={organism.x} cy={organism.y} r={Math.max(9,organism.traits.size*10)} fill={organism.traits.diet>=.62?'#ffc577':`hsl(${(organism.speciesId*137.508)%360},80%,70%)`} stroke="#e3f9ff" strokeWidth="2" />)}</g><circle cx={worldSize/2} cy={worldSize/2} r={worldSize*.49} fill="none" stroke="#7edcf2" strokeWidth="5" /></svg><p>{snap.sampleOrganisms.length} sampled organisms · terrain artwork is illustrative</p></div>
        <aside className="time-summary reference-card"><small>WHAT CHANGED?</small><h3>The living record</h3><div className="time-summary-numbers"><p><span>Population</span><b>{compare.stats.population.toLocaleString()} → {snap.stats.population.toLocaleString()}</b></p><p><span>Species</span><b>{compare.stats.speciesCount} → {snap.stats.speciesCount}</b></p></div>{deltas.slice(0,5).map((delta) => <div className="time-delta" key={delta.key}><span>{traitLabel(delta.key)}</span><b className={delta.pct<0?'negative':'positive'}>{delta.pct>=0?'+':''}{delta.pct.toFixed(1)}%</b></div>)}<p className="reference-note">Full-population averages at the selected records. Near-zero traits use percentage of trait range.</p><button className="reference-primary" onClick={() => setTab('comparison')}>COMPARE EVOLUTION →</button></aside></div>
        <div className="time-population reference-card"><div><small>POPULATION THROUGH TIME</small><b>{snap.stats.population.toLocaleString()}</b></div><ResponsiveContainer width="100%" height={145}><AreaChart data={snapshots.map((item) => ({tick:item.tick,population:item.stats.population}))} margin={{left:-10,right:10,top:12,bottom:0}}><CartesianGrid stroke="#143542" /><XAxis dataKey="tick" tick={{fontSize:9,fill:'#7ca3b5'}} /><YAxis width={50} tick={{fontSize:9,fill:'#7ca3b5'}} /><Tooltip contentStyle={{background:'#031925',border:'1px solid #4fa9c5',fontSize:11}} /><Area dataKey="population" stroke="#6fd9f7" fill="#236a8433" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
        <div className="time-event-track">{featured.length ? featured.map((event) => <button key={event.id} onClick={() => setSelectedTick(event.tick)}><img src={/extinct|drought|meteor/.test(event.message.toLowerCase())?cosmos:worldAtlas} alt="" /><ReferenceIcon kind={event.category==='extinction'?'destruction':'evolution'} size={16} /><span>Gen {event.generation.toLocaleString()}</span><p>{event.message.replace(/^Generation \d+\s+—\s*/,'')}</p></button>) : <p className="reference-note">Major evolutionary and environmental events will appear here as they happen.</p>}</div>
      </> : <div className="species-comparison reference-card"><SpecimenRecord title="EARLIER GENERATION" generation={compare.generation} tick={compare.tick} population={compare.stats.population} /><div className="comparison-deltas"><small>EVOLUTION IN MOTION</small>{deltas.slice(0,8).map((delta) => <div key={delta.key}><span>{traitLabel(delta.key)}</span><b className={delta.pct<0?'negative':'positive'}>{delta.pct>=0?'+':''}{delta.pct.toFixed(1)}%</b><p>{delta.before.toFixed(2)} → {delta.after.toFixed(2)}</p></div>)}<p className="reference-note">Concept portraits · comparisons use recorded whole-world trait averages, not a single species.</p></div><SpecimenRecord title="LATER GENERATION" generation={snap.generation} tick={snap.tick} population={snap.stats.population} /></div>}
      <label className="time-scrubber">SCRUB THE WORLD RECORD<input aria-label="Historical snapshot" type="range" min={0} max={Math.max(0,snapshots.length-1)} value={selectedIndex} onChange={(event) => setSelectedTick(snapshots[Number(event.target.value)].tick)} /><span>Tick {snapshots[0].tick.toLocaleString()} <b>{snapshots.length} retained snapshots</b> Tick {snapshots.at(-1)!.tick.toLocaleString()}</span></label>
    </div>}
  </Overlay>;
}

function SpecimenRecord({title,generation,tick,population}:{title:string;generation:number;tick:number;population:number}) { return <div className="comparison-specimen"><small>{title}</small><h3>Generation {generation.toLocaleString()}</h3><img src={specimenPortrait} alt="Concept specimen portrait" /><p>Tick {tick.toLocaleString()}</p><b>{population.toLocaleString()} organisms</b></div>; }
export function traitLabel(key:string) { return key.replace(/([A-Z])/g,' $1').replace(/^./,(letter) => letter.toUpperCase()); }
export function Overlay({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) { return <section className="reference-overlay" aria-label={title}><header className="reference-overlay-header"><h2>{title}</h2><button aria-label={`Close ${title}`} onClick={onClose}>×</button></header>{children}</section>; }
