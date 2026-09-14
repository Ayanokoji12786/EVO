import { useEffect, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore, type PendingGodAction } from '../../state/simStore';
import type { TerrainType } from '../../simulation/types';

export type GodCategory = 'weather' | 'life' | 'evolution' | 'destruction' | 'terraform' | 'disease' | 'predators' | 'laws';
type Category = GodCategory;

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

export function GodPanel({ controller, anchor, initialLayer, onClose }: { controller: SimulationController; anchor: { x: number; y: number }; initialLayer?: Category | null; onClose: () => void }) {
  const [layer, setLayer] = useState<Category | null>(initialLayer ?? null);
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

  const radius = 150;
  const menuScale = Math.min(1, (window.innerWidth - 24) / 420, (window.innerHeight - 24) / 420);
  const margin = 210 * menuScale;
  const safeX = Math.max(margin, Math.min(window.innerWidth - margin, anchor.x));
  const safeY = Math.max(margin, Math.min(window.innerHeight - margin, anchor.y));

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
      {layer === 'weather' && (
        <div className="god-weather-list" style={{ left: safeX + 168 * menuScale, top: safeY - 108 * menuScale }} onMouseDown={(event) => event.stopPropagation()}>
          {WEATHER.map(([id, icon, label]) => (
            <button key={id} className={id === 'rain' ? 'is-active' : ''} onClick={() => weather(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
