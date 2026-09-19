import { useState } from 'react';
import { Overlay } from '../TimeMachine/TimeMachine';
import worldAtlas from '../../assets/world-atlas.png';
import specimen from '../../assets/specimen-portrait.png';
import { ReferenceIcon } from '../shared/ReferenceIcon';
import './About.css';

type Tab='model'|'limits'|'science';
const PAPERS=[
  ['Lenski et al. · 2003','The evolutionary origin of complex features','Complex traits and stepping-stone evolution'],
  ['Lindsey et al. · 2013','Evolutionary rescue from extinction is contingent on a lower rate of environmental change','Adaptation depends on both magnitude and speed of change'],
  ['Franks, Sim & Weis · 2007','Rapid evolution of flowering time by an annual plant in response to a climate fluctuation','Heritable seasonal timing'],
  ['Canino-Koning, Wiser & Ofria · 2019','Fluctuating environments select for short-term phenotypic variation','Evolving phenotypic plasticity'],
  ['Stanley & Miikkulainen · 2002','Evolving neural networks through augmenting topologies','Mutable behavioural network connections'],
  ['Elena et al. · 2007','Effects of population size and mutation rate on the evolution of mutational robustness','Population size, mutation and standing variation'],
];

export function About({onClose}:{onClose:()=>void}) {
  const [tab,setTab]=useState<Tab>('model');
  return <Overlay title="ABOUT EVO" onClose={onClose}>
    <p className="reference-subtitle">AN ARTIFICIAL-LIFE LABORATORY · LIFE IN MOTION.</p>
    <nav className="reference-tabs about-tabs"><button className={tab==='model'?'is-active':''} onClick={()=>setTab('model')}>The Model</button><button className={tab==='limits'?'is-active':''} onClick={()=>setTab('limits')}>What Is Simplified</button><button className={tab==='science'?'is-active':''} onClick={()=>setTab('science')}>Scientific Grounding</button></nav>
    <div className="about-content scroll-thin">
      <aside className="about-hero reference-card"><img src={tab==='limits'?specimen:worldAtlas} alt={tab==='limits'?'Illustrative specimen portrait':'Illustrative EVO world'} /><div><small>{tab==='limits'?'CONCEPT PORTRAIT':'A LIVING WORLD'}</small><h3>Life does not<br />follow a script.</h3><p>Organisms sense locally, spend energy, reproduce with mutation, and leave descendants. There is no prescribed evolutionary goal.</p></div></aside>
      {tab==='model'&&<section className="about-main"><header><small>HOW EVO WORKS</small><h3>Selection emerges from survival.</h3><p>Every population change comes from simulated organisms acting under the same world rules.</p></header><div className="about-card-grid"><Info icon="evolution" title="HERITABLE GENOMES">More than twenty numeric traits and a compact neural network pass to offspring with mutation.</Info><Info icon="life" title="ENERGY & REPRODUCTION">Movement, sensing, temperature stress, combat and reproduction all draw from a shared energy budget.</Info><Info icon="predators" title="ECOLOGICAL INTERACTION">Diet, aggression, fear and scavenging create real herbivore, omnivore and predator pressures.</Info><Info icon="weather" title="A CHANGING WORLD">Rainfall, seasons, temperature, terrain and divine interventions reshape selection through time.</Info><Info icon="globe" title="DETERMINISTIC SEEDS">Identical seeds and settings reproduce the same history until the player intervenes.</Info><Info icon="analytics" title="RECORDED EVIDENCE">The timeline, analytics, experiments and insights read from the world’s actual retained history.</Info></div></section>}
      {tab==='limits'&&<section className="about-main"><header><small>HONEST BOUNDARIES</small><h3>A model of evolution, not a replica of nature.</h3><p>EVO deliberately compresses biology so causes and trade-offs remain observable.</p></header><div className="about-limits"><Limit n="01" title="Asexual inheritance">Offspring currently inherit from one parent with mutation; sexual recombination is not simulated.</Limit><Limit n="02" title="Operational species">Speciation uses genetic distance from a founder, not demonstrated reproductive isolation.</Limit><Limit n="03" title="Compact nervous systems">Brains use a small fixed sensor/action network, not a biological nervous system.</Limit><Limit n="04" title="Sampled history">Time Machine locations retain a bounded population sample, not a frame-perfect historical replay.</Limit><Limit n="05" title="Stylized anatomy">The live 3D creatures encode size, diet and motion, while cinematic portraits remain clearly labelled concept artwork.</Limit><Limit n="06" title="Association is not cause">Analytics reports correlations and co-occurring events. Ask the Universe never treats them as proof of causation.</Limit></div></section>}
      {tab==='science'&&<section className="about-main"><header><small>RESEARCH-INSPIRED MECHANICS</small><h3>Ideas translated into testable systems.</h3><p>These papers inspire scoped mechanics; EVO does not claim to reproduce each full experimental model.</p></header><div className="about-papers">{PAPERS.map(([authors,title,use])=><article key={title}><span>{authors}</span><h4>{title}</h4><p>{use}</p></article>)}</div><p className="reference-note">Full paper citations and the exact mechanic mappings remain documented in the project source. Simulation results are educational model outputs, not biological predictions.</p></section>}
    </div>
  </Overlay>;
}
function Info({icon,title,children}:{icon:string;title:string;children:React.ReactNode}) { return <article className="reference-card about-info"><ReferenceIcon kind={icon}/><div><h4>{title}</h4><p>{children}</p></div></article>; }
function Limit({n,title,children}:{n:string;title:string;children:React.ReactNode}) { return <article><b>{n}</b><div><h4>{title}</h4><p>{children}</p></div></article>; }
