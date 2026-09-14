import { useEffect, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore, type PendingGodAction } from '../../state/simStore';
import type { TerrainType } from '../../simulation/types';
import type { EvolutionaryPressureGoal } from '../../god/godActions';

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

export function GodPanel({ controller, anchor, initialLayer, onClose, onAction }: { controller: SimulationController; anchor: { x: number; y: number }; initialLayer?: Category | null; onClose: () => void; onAction?: (message: string) => void }) {
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
    onAction?.(message);
    onClose();
  };

  const choose = (id: Category) => {
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

  const radius = 150;
  const menuScale = Math.min(1, (window.innerWidth - 24) / 420, (window.innerHeight - 24) / 420);
  const margin = 210 * menuScale;
  const safeX = Math.max(margin, Math.min(window.innerWidth - margin, anchor.x));
  const safeY = Math.max(margin, Math.min(window.innerHeight - margin, anchor.y));

  const sideList = layer === 'weather' ? { title: null, items: WEATHER.map(([id, icon, label]) => ({ id, icon, label })), onPick: (id: string) => weather(id as (typeof WEATHER)[number][0]) }
    : layer === 'destruction' ? { title: null, items: DESTRUCTION.map(([id, icon, label]) => ({ id, icon, label })), onPick: (id: string) => destruction(id as (typeof DESTRUCTION)[number][0]) }
    : layer === 'evolution' ? { title: null, items: EVOLUTION_PRESSURE.map((e) => ({ id: e.id, icon: e.icon, label: e.label })), onPick: (id: string) => evolution(id as EvolutionaryPressureGoal) }
    : layer === 'laws' ? { title: null, items: LAWS.map(([id, icon, label]) => ({ id, icon, label })), onPick: (id: string) => laws(id as (typeof LAWS)[number][0]) }
    : layer === 'predators' ? { title: null, items: PREDATORS.map(([id, icon, label]) => ({ id, icon, label })), onPick: (id: string) => predators(id as (typeof PREDATORS)[number][0]) }
    : null;

  return (
    <div className="god-radial-backdrop" onMouseDown={onClose}>
      <div className="god-mode-heading" style={{ left: Math.max(24, safeX - 330 * menuScale), top: Math.max(88, safeY - 240 * menuScale) }}>
        <b><span aria-hidden="true">⚡</span> GOD MODE</b>
        <small>SHAPE. TEST. OBSERVE. REPEAT.</small>
      </div>
      <div className="god-radial" style={{ left: safeX, top: safeY, transform: `scale(${menuScale})` }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="god-radial-center">
          <span>✦</span>
        </div>
        {ROOT_ACTIONS.map((item, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / ROOT_ACTIONS.length;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <button
              key={item.id}
              className={`god-radial-action ${layer === item.id ? 'is-active' : ''}`}
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
              onClick={() => choose(item.id)}
              title={item.hint}
            >
              <span className="god-radial-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          );
        })}
        <div className="god-radial-status">WORLD {seed || '7F3A'} · GENERATION {(stats?.generation ?? 0).toLocaleString()}</div>
      </div>
      {sideList && (
        <div className="god-weather-list" style={{ left: safeX + 168 * menuScale, top: safeY - 108 * menuScale }} onMouseDown={(event) => event.stopPropagation()}>
          {sideList.items.map((item) => (
            <button key={item.id} onClick={() => sideList.onPick(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
