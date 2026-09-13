import { useEffect, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore, type PendingGodAction } from '../../state/simStore';
import type { TerrainType } from '../../simulation/types';

type Category = 'weather' | 'life' | 'evolution' | 'destruction' | 'terraform' | 'disease' | 'predators' | 'laws';

const ROOT_ACTIONS: { id: Category; icon: string; label: string; hint: string }[] = [
  { id: 'weather', icon: '🌧', label: 'WEATHER', hint: 'Command the sky' },
  { id: 'life', icon: '🌱', label: 'LIFE', hint: 'Seed new life' },
  { id: 'evolution', icon: '🧬', label: 'EVOLUTION', hint: 'Rewrite possibility' },
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

export function GodPanel({ controller, anchor, onClose }: { controller: SimulationController; anchor: { x: number; y: number }; onClose: () => void }) {
  const [layer, setLayer] = useState<Category | null>(null);
  const setPending = useSimStore((s) => s.setPendingGodAction);
  const stats = useSimStore((s) => s.stats);
  const seed = useSimStore((s) => s.seedDisplay);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const choose = (id: Category) => {
    if (id === 'weather') return setLayer('weather');
    if (id === 'disease') {
      controller.god.createPlague(controller.world, { transmissionRate: 0.55, mortality: 0.32, incubationPeriod: 10, recoveryChance: 0.4, mutationRate: 0.02 });
      return onClose();
    }
    const armed: Partial<Record<Category, PendingGodAction>> = {
      destruction: { kind: 'meteor', radius: 120 },
      terraform: { kind: 'terraform', terrainType: 'fertile' as TerrainType, radius: 70 },
      life: { kind: 'placeCreature', traits: { size: 0.9, maxSpeed: 1.3, visionRadius: 90, aggression: 0.2 } },
      predators: { kind: 'introducePredator' },
    };
    if (armed[id]) setPending(armed[id]);
    if (id === 'evolution') setPending({ kind: 'mutate' });
    if (id === 'laws') controller.god.setLaw(controller.world, 'plantGrowthRate', Math.min(3, controller.world.laws.plantGrowthRate + 0.25));
    onClose();
  };

  const weather = (kind: (typeof WEATHER)[number][0]) => {
    if (kind === 'rain') setPending({ kind: 'rainfall', radius: 100, intensity: 0.78, duration: 900 });
    if (kind === 'storm') { controller.god.setRainfall(controller.world, Math.min(2.5, controller.world.climate.rainfall + 0.85)); controller.god.triggerFoodBoom(controller.world, 260); }
    if (kind === 'drought') controller.god.triggerDrought(controller.world, 0.65);
    if (kind === 'snow') controller.god.setTemperature(controller.world, Math.max(-1, controller.world.climate.baseTemperature - 0.25));
    if (kind === 'heat') controller.god.triggerHeatWave(controller.world, 0.5);
    if (kind === 'ice') controller.god.triggerIceAge(controller.world, 0.65);
    onClose();
  };

  const entries = layer === 'weather' ? WEATHER.map(([id, icon, label]) => ({ id, icon, label })) : ROOT_ACTIONS;
  const radius = layer === 'weather' ? 144 : 178;
  const safeX = Math.max(210, Math.min(window.innerWidth - 210, anchor.x));
  const safeY = Math.max(210, Math.min(window.innerHeight - 210, anchor.y));

  return (
    <div className="god-radial-backdrop" onMouseDown={onClose}>
      <div className="god-radial" style={{ left: safeX, top: safeY }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="god-radial-center">
          <span>{layer === 'weather' ? '🌦' : '✦'}</span>
          <strong>{layer === 'weather' ? 'WEATHER' : 'DIVINE WILL'}</strong>
          <small>{layer === 'weather' ? 'CHOOSE AN OMEN' : 'RIGHT-CLICK TO COMMAND'}</small>
        </div>
        {entries.map((item, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / entries.length;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return <button key={item.id} className="god-radial-action" style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }} onMouseEnter={() => layer === null && item.id === 'weather' && setLayer('weather')} onClick={() => layer === 'weather' ? weather(item.id as (typeof WEATHER)[number][0]) : choose(item.id as Category)} title={'hint' in item ? item.hint : item.label}><span className="god-radial-icon">{item.icon}</span><span>{item.label}</span></button>;
        })}
        <div className="god-radial-status">WORLD {seed || '7F3A'} · GENERATION {(stats?.generation ?? 0).toLocaleString()}</div>
      </div>
    </div>
  );
}
