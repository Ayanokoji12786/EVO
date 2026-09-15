import { useState } from 'react';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { useSimStore } from '../../state/simStore';
import { TRAIT_SPECS } from '../../genetics/traits';
import type { StatsSnapshot } from '../../simulation/types';
import './StatsPanel.css';

type GraphSource = 'stats' | 'avg' | 'stdDev';
interface GraphOption { id: string; key: string; label: string; source: GraphSource; description?: string }
const label = (key:string)=>key.replace(/([A-Z])/g,' $1').replace(/^./,(c)=>c.toUpperCase());
const GRAPHABLE: GraphOption[] = [
  { id: 'stats:population', key: 'population', label: 'Population', source: 'stats' },
  { id: 'stats:speciesCount', key: 'speciesCount', label: 'Species', source: 'stats' },
  { id: 'stats:foodAbundance', key: 'foodAbundance', label: 'Food items', source: 'stats' },
  ...TRAIT_SPECS.map((t)=>({ id:`avg:${t.key}`, key:t.key, label:label(t.key), source:'avg' as GraphSource, description:t.description })),
  ...['size','maxSpeed','visionRadius','mutationRate'].map((key)=>({ id:`stdDev:${key}`, key, label:`${label(key)} variation (σ)`, source:'stdDev' as GraphSource })),
];
function readValue(s:StatsSnapshot,opt:GraphOption) { return opt.source==='stats' ? (s as unknown as Record<string,number>)[opt.key] : s[opt.source][opt.key]; }
const COLORS=['#79d9e8','#c097e9','#e5ac76','#89dca2'];

export function StatsPanel({embedded=false,onAsk}:{embedded?:boolean;onAsk?:()=>void}) {
  const stats=useSimStore((s)=>s.stats);
  const history=useSimStore((s)=>s.statsHistory);
  const [selected,setSelected]=useState(['avg:size','avg:maxSpeed','avg:visionRadius','avg:metabolism']);
  const trophic=stats?.trophic;
  const selectedOptions=selected.map((id)=>GRAPHABLE.find((g)=>g.id===id)!);
  const toggle=(id:string)=>setSelected((cur)=>cur.includes(id)?cur.filter((k)=>k!==id):cur.length<4?[...cur,id]:cur);
  return <section className={`trait-observatory ${embedded?'is-embedded':'scroll-thin'}`} aria-label="Trait Observatory">
    <header><div><small>HERITABLE VARIATION</small><h3>THE TRAIT OBSERVATORY</h3><p>Whole-world averages and standing variation, recorded through time.</p></div>{onAsk&&<button className="reference-primary" onClick={onAsk}>ASK THE UNIVERSE →</button>}</header>
    {trophic&&<div className="trait-foodweb"><small>THE FOOD WEB · CURRENT POPULATION</small><div className="trait-foodweb-bar"><i style={{width:`${trophic.herbivoreFraction*100}%`,background:'#80d999'}}/><i style={{width:`${trophic.omnivoreFraction*100}%`,background:'#e2b17f'}}/><i style={{width:`${trophic.carnivoreFraction*100}%`,background:'#ee927e'}}/></div><p><span>Herbivores <b>{(trophic.herbivoreFraction*100).toFixed(1)}%</b></span><span>Omnivores <b>{(trophic.omnivoreFraction*100).toFixed(1)}%</b></span><span>Predators <b>{(trophic.carnivoreFraction*100).toFixed(1)}%</b></span></p></div>}
    <div className="trait-chart-grid">{selectedOptions.map((option,index)=><article className="reference-card" key={option.id}><div><h4>{option.label}</h4><b>{stats ? (readValue(stats,option)??0).toLocaleString(undefined,{maximumFractionDigits:2}) : '—'}</b></div><small>{option.source==='avg'?'POPULATION MEAN':option.source==='stdDev'?'STANDARD DEVIATION':'RECORDED COUNT'}</small><ResponsiveContainer width="100%" height={155}><AreaChart data={history.slice(-300).map((s)=>({tick:s.tick,value:readValue(s,option)}))} margin={{top:12,right:5,left:-12,bottom:0}}><CartesianGrid stroke="#17404e" strokeOpacity={.6}/><XAxis dataKey="tick" minTickGap={50} tick={{fontSize:8,fill:'#80adbd'}}/><YAxis width={48} tick={{fontSize:8,fill:'#80adbd'}}/><Tooltip labelFormatter={(tick)=>`Tick ${tick}`} contentStyle={{background:'#031c2a',border:'1px solid #59aeca',fontSize:10}}/><Area dataKey="value" name={option.label} stroke={COLORS[index]} fill={COLORS[index]} fillOpacity={.1} strokeWidth={1.6} isAnimationActive={false}/></AreaChart></ResponsiveContainer></article>)}</div>
    {selected.length===0&&<p className="reference-note">Choose a trait below to display its history.</p>}
    <small>CHOOSE UP TO FOUR GRAPHS · EACH USES ITS OWN SCALE</small>
    <div className="trait-options">{GRAPHABLE.map((g)=><button key={g.id} aria-pressed={selected.includes(g.id)} title={g.description} disabled={selected.length===4&&!selected.includes(g.id)} onClick={()=>toggle(g.id)}>{g.label}</button>)}</div>
  </section>;
}
