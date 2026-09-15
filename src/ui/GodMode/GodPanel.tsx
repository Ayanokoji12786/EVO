import { useEffect, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore, type PendingGodAction } from '../../state/simStore';
import type { TerrainType } from '../../simulation/types';
import type { EvolutionaryPressureGoal } from '../../god/godActions';
import worldAtlas from '../../assets/world-atlas.png';
import { ReferenceIcon } from '../shared/ReferenceIcon';
import './GodPanel.css';

export type GodCategory = 'weather' | 'life' | 'evolution' | 'destruction' | 'terraform' | 'disease' | 'predators' | 'laws';
type Category = GodCategory;

const ROOT_ACTIONS: { id: Category; icon: string; label: string; hint: string }[] = [
  { id: 'weather', icon: '🌧', label: 'WEATHER', hint: 'Command the sky' },
  { id: 'life', icon: '🌱', label: 'LIFE', hint: 'Seed new life' },
  { id: 'evolution', icon: '🧬', label: 'EVOLUTION', hint: 'Steer selective pressure' },
  { id: 'destruction', icon: '🔥', label: 'DESTRUCTION', hint: 'Unmake the world' },
  { id: 'terraform', icon: '🌍', label: 'TERRAFORM', hint: 'Shape the land' },
  { id: 'disease', icon: '🦠', label: 'DISEASE', hint: 'Release a plague' },
  { id: 'predators', icon: '🐺', label: 'PREDATORS', hint: 'Create a hunter' },
  { id: 'laws', icon: '⚙', label: 'LAWS OF NATURE', hint: 'Alter the rules' },
];

const WEATHER = [
  ['rain', '🌧', 'RAIN'], ['storm', '⛈', 'STORM'], ['drought', '☀', 'DROUGHT'],
  ['snow', '❄', 'SNOW'], ['heat', '🔥', 'HEAT WAVE'], ['ice', '🧊', 'ICE AGE'],
] as const;
const WEATHER_ICONS: Record<string, string> = { rain: 'weather', storm: 'storm', drought: 'sun', snow: 'snow', heat: 'sun', ice: 'snow' };

// Every option here reaches a real backend function — none of this is decorative. Most of
// these (volcano/flood/wildfire/lightning, evolutionary pressure, law tuning) already
// existed in god/godActions.ts but had no UI path to them at all.
const DESTRUCTION = [
  ['meteor', '☄', 'METEOR STRIKE'], ['volcano', '🌋', 'VOLCANO'], ['flood', '🌊', 'FLOOD'],
  ['wildfire', '🔥', 'WILDFIRE'], ['lightning', '⚡', 'LIGHTNING STRIKE'], ['darkage', '🌑', 'DARK AGE (GLOBAL)'],
] as const;

const EVOLUTION_PRESSURE: { id: EvolutionaryPressureGoal; icon: string; label: string }[] = [
  { id: 'speed', icon: '💨', label: 'FAVOR SPEED' },
  { id: 'smallSize', icon: '🐁', label: 'FAVOR SMALL SIZE' },
  { id: 'largeSize', icon: '🦣', label: 'FAVOR LARGE SIZE' },
  { id: 'camouflage', icon: '🍃', label: 'FAVOR CAMOUFLAGE' },
  { id: 'efficiency', icon: '⚡', label: 'FAVOR EFFICIENCY' },
  { id: 'coldResistance', icon: '❄', label: 'FAVOR COLD RESISTANCE' },
  { id: 'intelligence', icon: '🧠', label: 'FAVOR INTELLIGENCE' },
];

const PREDATORS = [
  ['one', '🐺', 'INTRODUCE ONE'],
  ['swarm', '🐺🐺🐺', 'PREDATOR SWARM (20%)'],
] as const;

const LAWS = [
  ['plantGrowth', '🌱', 'BOOST PLANT GROWTH'],
  ['predation', '🐾', 'HARSHER PREDATION'],
  ['agingFast', '⏳', 'ACCELERATE AGING'],
  ['agingSlow', '🕰', 'SLOW AGING'],
  ['mutation', '🧬', 'RAISE MUTATION RATE'],
  ['capacity', '🌍', 'EXPAND CARRYING CAPACITY'],
] as const;

export function GodPanel({ controller, initialLayer, onClose, onAction }: { controller: SimulationController; anchor: { x: number; y: number }; initialLayer?: Category | null; onClose: () => void; onAction?: (message: string) => void }) {
  const [layer, setLayer] = useState<Category | null>(initialLayer ?? null);
  const setPending = useSimStore((s) => s.setPendingGodAction);
  const stats = useSimStore((s) => s.stats);
  const seed = useSimStore((s) => s.seedDisplay);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const finishInstant = (message: string) => {
    setPending(null);
    onAction?.(message);
    onClose();
  };

  const choose = (id: Category) => {
    setPending(null);
    if (id === 'weather' || id === 'destruction' || id === 'evolution' || id === 'laws' || id === 'predators') { setLayer(id); return; }
    if (id === 'disease') {
      controller.god.createPlague(controller.world, { transmissionRate: 0.55, mortality: 0.32, incubationPeriod: 10, recoveryChance: 0.4, mutationRate: 0.02 });
      return finishInstant('🦠 A plague has been released into the population.');
    }
    const armed: Partial<Record<Category, PendingGodAction>> = {
      terraform: { kind: 'terraform', terrainType: 'fertile' as TerrainType, radius: 70 },
      life: { kind: 'placeCreature', traits: { size: 0.9, maxSpeed: 1.3, visionRadius: 90, aggression: 0.2 } },
    };
    if (armed[id]) setPending(armed[id]);
    onClose();
  };

  const predators = (kind: (typeof PREDATORS)[number][0]) => {
    if (kind === 'one') { setPending({ kind: 'introducePredator' }); return onClose(); }
    if (kind === 'swarm') { setPending({ kind: 'predatorPack', radius: 160 }); return onClose(); }
  };

  const weather = (kind: (typeof WEATHER)[number][0]) => {
    if (kind === 'rain') { setPending({ kind: 'rainfall', radius: 100, intensity: 0.78, duration: 900 }); return onClose(); }
    if (kind === 'storm') { controller.god.setRainfall(controller.world, Math.min(2.5, controller.world.climate.rainfall + 0.85)); controller.god.triggerFoodBoom(controller.world, 260); return finishInstant('⛈ A storm rolls in, swelling rivers and food growth.'); }
    if (kind === 'drought') { controller.god.triggerDrought(controller.world, 0.65); return finishInstant('☀ Drought grips the land — food growth slows sharply.'); }
    if (kind === 'snow') { controller.god.setTemperature(controller.world, Math.max(-1, controller.world.climate.baseTemperature - 0.25)); return finishInstant('❄ The world grows colder.'); }
    if (kind === 'heat') { controller.god.triggerHeatWave(controller.world, 0.5); return finishInstant('🔥 A heat wave rolls across the world.'); }
    if (kind === 'ice') { controller.god.triggerIceAge(controller.world, 0.65); return finishInstant('🧊 An ice age begins.'); }
  };

  const destruction = (kind: (typeof DESTRUCTION)[number][0]) => {
    if (kind === 'meteor') { setPending({ kind: 'meteor', radius: 120 }); return onClose(); }
    if (kind === 'volcano') { setPending({ kind: 'volcano' }); return onClose(); }
    if (kind === 'flood') { setPending({ kind: 'flood', radius: 140 }); return onClose(); }
    if (kind === 'wildfire') { setPending({ kind: 'wildfire', radius: 100 }); return onClose(); }
    if (kind === 'lightning') { setPending({ kind: 'lightning' }); return onClose(); }
    if (kind === 'darkage') { controller.god.triggerDarkAge(controller.world); return finishInstant('🌑 The sun dims across the entire world.'); }
  };

  const evolution = (goal: EvolutionaryPressureGoal) => {
    controller.god.applyEvolutionaryPressure(controller.world, goal);
    const labels: Record<EvolutionaryPressureGoal, string> = {
      speed: 'speed', smallSize: 'small size', largeSize: 'large size', camouflage: 'camouflage',
      efficiency: 'energy efficiency', coldResistance: 'cold resistance', intelligence: 'intelligence',
    };
    finishInstant(`🧬 Selective pressure now favors ${labels[goal]} — evolution still has to do the work.`);
  };

  const laws = (kind: (typeof LAWS)[number][0]) => {
    const w = controller.world;
    if (kind === 'plantGrowth') controller.god.setLaw(w, 'plantGrowthRate', Math.min(3, w.laws.plantGrowthRate + 0.25));
    if (kind === 'predation') controller.god.setLaw(w, 'predationEffectiveness', Math.min(3, w.laws.predationEffectiveness + 0.3));
    if (kind === 'agingFast') controller.god.setLaw(w, 'agingRate', Math.min(3, w.laws.agingRate + 0.3));
    if (kind === 'agingSlow') controller.god.setLaw(w, 'agingRate', Math.max(0.2, w.laws.agingRate - 0.3));
    if (kind === 'mutation') controller.god.setMutationRateMultiplier(w, w.mutationSettings.mutationRateMultiplier + 0.5);
    if (kind === 'capacity') controller.god.setLaw(w, 'carryingCapacity', Math.round(w.laws.carryingCapacity * 1.5));
    finishInstant(`⚖️ A Law of Nature has been rewritten world-wide.`);
  };

  const sideList = layer === 'weather' ? { title: null, items: WEATHER.map(([id, icon, label]) => ({ id, icon, label })), onPick: (id: string) => weather(id as (typeof WEATHER)[number][0]) }
    : layer === 'destruction' ? { title: null, items: DESTRUCTION.map(([id, icon, label]) => ({ id, icon, label })), onPick: (id: string) => destruction(id as (typeof DESTRUCTION)[number][0]) }
    : layer === 'evolution' ? { title: null, items: EVOLUTION_PRESSURE.map((e) => ({ id: e.id, icon: e.icon, label: e.label })), onPick: (id: string) => evolution(id as EvolutionaryPressureGoal) }
    : layer === 'laws' ? { title: null, items: LAWS.map(([id, icon, label]) => ({ id, icon, label })), onPick: (id: string) => laws(id as (typeof LAWS)[number][0]) }
    : layer === 'predators' ? { title: null, items: PREDATORS.map(([id, icon, label]) => ({ id, icon, label })), onPick: (id: string) => predators(id as (typeof PREDATORS)[number][0]) }
    : null;

  const ordered = ['weather', 'life', 'terraform', 'predators', 'laws', 'disease', 'destruction', 'evolution'].map((id) => ROOT_ACTIONS.find((item) => item.id === id)!);
  const current = ROOT_ACTIONS.find((item) => item.id === layer);
  return <section className={`reference-god${sideList ? ' has-layer' : ''}`} aria-label="God Mode" onMouseDown={onClose}>
    <header className="reference-god-heading"><h1><span>ϟ</span> GOD MODE</h1><p>SHAPE. TEST. OBSERVE. REPEAT.</p></header>
    <button className="reference-god-close" onClick={onClose} aria-label="Close God Mode">×</button>
    <div className="reference-god-workspace" onMouseDown={(event) => event.stopPropagation()}>
      <div className="reference-god-orbit">
        <div className="reference-god-globe" style={{ backgroundImage: `url(${worldAtlas})` }}><span>WORLD {seed}</span></div>
        {ordered.map((item, index) => {
          const angle = -Math.PI / 2 + Math.PI * 2 * index / ordered.length;
          return <button key={item.id} className={`reference-god-power power-${item.id}${layer === item.id ? ' is-active' : ''}`} style={{ left: `${50 + Math.cos(angle) * 36}%`, top: `${50 + Math.sin(angle) * 36}%` }} onClick={() => choose(item.id)} aria-pressed={layer === item.id} title={item.hint}>
            <ReferenceIcon kind={item.id} size={32} /><strong>{item.label}</strong><small>{item.hint}</small>
          </button>;
        })}
      </div>
      {sideList && <nav className="reference-god-options" aria-label={`${current?.label} tools`}>
        <span>{current?.label} TOOLS</span>
        {sideList.items.map((item) => <button key={item.id} onClick={() => sideList.onPick(item.id)}><ReferenceIcon kind={layer === 'weather' ? WEATHER_ICONS[item.id] ?? 'weather' : layer ?? 'globe'} size={23} />{item.label}<i>→</i></button>)}
      </nav>}
    </div>
    <aside className="reference-god-context" onMouseDown={(event) => event.stopPropagation()}><span>CURRENT WORLD</span><h2>{current?.label ?? 'Laws of nature'}</h2><p>{current?.hint ?? 'A world of possibilities. Choose a force and observe how life responds.'}</p><dl><div><dt>Generation</dt><dd>{(stats?.generation ?? 0).toLocaleString()}</dd></div><div><dt>Living organisms</dt><dd>{(stats?.population ?? 0).toLocaleString()}</dd></div><div><dt>Rainfall</dt><dd>{controller.world.climate.rainfall.toFixed(2)}×</dd></div></dl><p className="reference-god-note">Every intervention changes the conditions for natural selection.</p></aside>
    <blockquote className="reference-god-quote">“A little change can create a very different tomorrow.”<cite>— EVO</cite></blockquote>
  </section>;
}
