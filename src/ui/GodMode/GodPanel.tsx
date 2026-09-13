import { useState, type ReactNode } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore, type PendingGodAction } from '../../state/simStore';
import type { TerrainType } from '../../simulation/types';
import type { EvolutionaryPressureGoal } from '../../god/godActions';

const TABS = ['Weather', 'Terraform', 'Resources', 'Genetics', 'Disasters', 'Plague', 'Create Life', 'Pressure', 'Laws'] as const;
type Tab = (typeof TABS)[number];

const TERRAIN_OPTIONS: { type: TerrainType; icon: string }[] = [
  { type: 'grass', icon: '🌱' },
  { type: 'forest', icon: '🌲' },
  { type: 'desert', icon: '🏜' },
  { type: 'tundra', icon: '❄️' },
  { type: 'water', icon: '🌊' },
  { type: 'mountain', icon: '⛰' },
  { type: 'fertile', icon: '🟫' },
  { type: 'toxic', icon: '☠️' },
];

export function GodPanel({ controller }: { controller: SimulationController }) {
  const [tab, setTab] = useState<Tab>('Weather');
  const pending = useSimStore((s) => s.pendingGodAction);
  const setPending = useSimStore((s) => s.setPendingGodAction);
  const divineInterventions = useSimStore((s) => s.divineInterventions);
  const naturalGenerations = useSimStore((s) => s.naturalGenerations);
  const interferedGenerations = useSimStore((s) => s.interferedGenerations);
  const overlays = useSimStore((s) => s.overlays);
  const setOverlay = useSimStore((s) => s.setOverlay);
  const selectedId = useSimStore((s) => s.selectedId);

  const arm = (action: PendingGodAction) => setPending(pending?.kind === action.kind ? null : action);

  return (
    <div
      className="glass scroll-thin"
      style={{ position: 'absolute', top: 76, left: 12, width: 320, maxHeight: 'calc(100% - 100px)', overflowY: 'auto', padding: 16, zIndex: 10 }}
    >
      <div style={{ color: 'var(--divine)', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>YOU ARE NOW INTERFERING WITH NATURAL SELECTION</div>
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-dim)', marginBottom: 12, fontFamily: 'var(--mono)' }}>
        <span>DIVINE {divineInterventions}</span>
        <span>NATURAL GEN {naturalGenerations}</span>
        <span>INTERFERED GEN {interferedGenerations}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
        {TABS.map((t) => (
          <button key={t} className={`btn ${tab === t ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {pending && (
        <div style={{ background: 'var(--divine-dim)', border: '1px solid var(--divine)', borderRadius: 8, padding: 8, fontSize: 11, marginBottom: 10 }}>
          Click the world to place: <strong>{pending.kind}</strong>
        </div>
      )}

      {tab === 'Weather' && (
        <>
          <Slider label="Rainfall" min={0} max={2.5} step={0.05} value={controller.world.climate.rainfall} onChange={(v) => controller.god.setRainfall(controller.world, v)} />
          <Slider
            label="Base temperature"
            min={-1}
            max={1}
            step={0.05}
            value={controller.world.climate.baseTemperature}
            onChange={(v) => controller.god.setTemperature(controller.world, v)}
          />
          <Row2>
            <button className="btn" onClick={() => controller.god.triggerDrought(controller.world)}>
              🌵 DROUGHT
            </button>
            <button className="btn" onClick={() => controller.god.triggerFoodBoom(controller.world)}>
              🌾 FOOD BOOM
            </button>
            <button className="btn" onClick={() => controller.god.triggerIceAge(controller.world)}>
              ❄️ ICE AGE
            </button>
            <button className="btn" onClick={() => controller.god.triggerHeatWave(controller.world)}>
              ☀️ HEAT WAVE
            </button>
            <button className="btn" onClick={() => controller.god.triggerDarkAge(controller.world)}>
              🌑 DARK AGE
            </button>
          </Row2>
        </>
      )}

      {tab === 'Terraform' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>Select a terrain, then click the world to paint (radius 60).</div>
          <Row2>
            {TERRAIN_OPTIONS.map((t) => (
              <button
                key={t.type}
                className={`btn ${pending?.kind === 'terraform' && pending.terrainType === t.type ? 'active' : ''}`}
                onClick={() => arm({ kind: 'terraform', terrainType: t.type, radius: 60 })}
              >
                {t.icon} {t.type}
              </button>
            ))}
          </Row2>
        </>
      )}

      {tab === 'Resources' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
            Food currently on the map: {controller.world.food.items.size}
          </div>
          <Row2>
            <button
              className="btn"
              onClick={() => {
                controller.world.food.hardShellUnlocked = !controller.world.food.hardShellUnlocked;
              }}
            >
              🥥 Toggle Hard-Shell Food
            </button>
            <button className="btn" onClick={() => controller.god.triggerFoodBoom(controller.world, 200)}>
              🌱 Fertile Burst
            </button>
          </Row2>
        </>
      )}

      {tab === 'Genetics' && (
        <>
          <Slider
            label="Mutation rate multiplier"
            min={0}
            max={6}
            step={0.1}
            value={controller.world.mutationSettings.mutationRateMultiplier}
            onChange={(v) => controller.god.setMutationRateMultiplier(controller.world, v)}
          />
          <div style={{ fontSize: 11, color: 'var(--text-dim)', margin: '10px 0 6px' }}>Unlock new possible mutations</div>
          <Row2>
            {['flight', 'venom', 'armor', 'nightVision', 'aquaticAdaptation', 'packBehavior', 'diseaseResistance'].map((gene) => (
              <button
                key={gene}
                className={`btn ${controller.world.unlockedGenes.has(gene) ? 'active' : ''}`}
                onClick={() => controller.god.unlockGene(controller.world, gene)}
              >
                🔓 {gene}
              </button>
            ))}
          </Row2>
        </>
      )}

      {tab === 'Disasters' && (
        <Row2>
          <button className={`btn ${pending?.kind === 'lightning' ? 'active' : ''}`} onClick={() => arm({ kind: 'lightning' })}>
            ⚡ Lightning
          </button>
          <button className={`btn ${pending?.kind === 'meteor' ? 'active' : ''}`} onClick={() => arm({ kind: 'meteor', radius: 120 })}>
            ☄️ Meteor
          </button>
          <button className={`btn ${pending?.kind === 'volcano' ? 'active' : ''}`} onClick={() => arm({ kind: 'volcano' })}>
            🌋 Volcano
          </button>
          <button className={`btn ${pending?.kind === 'flood' ? 'active' : ''}`} onClick={() => arm({ kind: 'flood', radius: 150 })}>
            🌊 Flood
          </button>
          <button className={`btn ${pending?.kind === 'wildfire' ? 'active' : ''}`} onClick={() => arm({ kind: 'wildfire', radius: 100 })}>
            🔥 Wildfire
          </button>
        </Row2>
      )}

      {tab === 'Plague' && <PlaguePanel controller={controller} />}

      {tab === 'Create Life' && (
        <CreateLifePanel
          armed={pending?.kind === 'placeCreature'}
          onArm={(traits) => arm({ kind: 'placeCreature', traits })}
          onIntroducePredator={() => arm({ kind: 'introducePredator' })}
          predatorArmed={pending?.kind === 'introducePredator'}
        />
      )}

      {tab === 'Pressure' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
            Shifts conditions likely to favor a trait. Evolution decides the rest.
          </div>
          <Row2>
            {(['speed', 'smallSize', 'largeSize', 'camouflage', 'efficiency', 'coldResistance', 'intelligence'] as EvolutionaryPressureGoal[]).map((g) => (
              <button key={g} className="btn" onClick={() => controller.god.applyEvolutionaryPressure(controller.world, g)}>
                🎯 Favor {g}
              </button>
            ))}
          </Row2>
        </>
      )}

      {tab === 'Laws' && (
        <>
          {(
            [
              ['movementEnergyCost', 0, 3],
              ['visionEnergyCost', 0, 3],
              ['foodEnergyGain', 0.2, 3],
              ['agingRate', 0.2, 3],
              ['reproductionCostMultiplier', 0.2, 3],
              ['predationEffectiveness', 0, 3],
              ['plantGrowthRate', 0, 3],
            ] as const
          ).map(([key, min, max]) => (
            <Slider
              key={key}
              label={key}
              min={min}
              max={max}
              step={0.05}
              value={controller.world.laws[key]}
              onChange={(v) => controller.god.setLaw(controller.world, key, v)}
            />
          ))}
        </>
      )}

      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>God's-Eye Overlays</div>
        <Row2>
          <button className={`btn ${overlays.vision ? 'active' : ''}`} onClick={() => setOverlay('vision', !overlays.vision)}>
            👁️ Vision
          </button>
          <button className={`btn ${overlays.species ? 'active' : ''}`} onClick={() => setOverlay('species', !overlays.species)}>
            🧬 Species
          </button>
          <button className={`btn ${overlays.genetics ? 'active' : ''}`} onClick={() => setOverlay('genetics', !overlays.genetics)}>
            🧪 Genetics
          </button>
          <button className={`btn ${overlays.energy ? 'active' : ''}`} onClick={() => setOverlay('energy', !overlays.energy)}>
            🔋 Energy
          </button>
          <button
            className={`btn ${overlays.ancestry !== null ? 'active' : ''}`}
            disabled={selectedId === null}
            onClick={() => setOverlay('ancestry', overlays.ancestry !== null ? null : selectedId)}
          >
            🌳 Ancestry
          </button>
        </Row2>
      </div>
    </div>
  );
}

function PlaguePanel({ controller }: { controller: SimulationController }) {
  const [transmissionRate, setTransmissionRate] = useState(0.5);
  const [mortality, setMortality] = useState(0.3);
  const [incubationPeriod, setIncubationPeriod] = useState(10);
  const [recoveryChance, setRecoveryChance] = useState(0.4);

  return (
    <>
      <Slider label="Transmission rate" min={0} max={1} step={0.05} value={transmissionRate} onChange={setTransmissionRate} />
      <Slider label="Mortality" min={0} max={1} step={0.05} value={mortality} onChange={setMortality} />
      <Slider label="Incubation period" min={1} max={40} step={1} value={incubationPeriod} onChange={setIncubationPeriod} />
      <Slider label="Recovery chance" min={0} max={1} step={0.05} value={recoveryChance} onChange={setRecoveryChance} />
      <button
        className="btn danger"
        style={{ width: '100%', marginTop: 8 }}
        onClick={() =>
          controller.god.createPlague(controller.world, { transmissionRate, mortality, incubationPeriod, recoveryChance, mutationRate: 0.02 })
        }
      >
        🦠 RELEASE
      </button>
    </>
  );
}

function CreateLifePanel({
  armed,
  onArm,
  onIntroducePredator,
  predatorArmed,
}: {
  armed: boolean;
  onArm: (traits: Partial<Record<string, number>>) => void;
  onIntroducePredator: () => void;
  predatorArmed: boolean;
}) {
  const [size, setSize] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [vision, setVision] = useState(100);
  const [aggression, setAggression] = useState(0.3);

  return (
    <>
      <Slider label="Size" min={0.4} max={2.2} step={0.05} value={size} onChange={setSize} />
      <Slider label="Speed" min={0.3} max={3.2} step={0.05} value={speed} onChange={setSpeed} />
      <Slider label="Vision" min={20} max={260} step={5} value={vision} onChange={setVision} />
      <Slider label="Aggression" min={0} max={1} step={0.05} value={aggression} onChange={setAggression} />
      <button
        className={`btn divine ${armed ? 'active' : ''}`}
        style={{ width: '100%', marginTop: 8 }}
        onClick={() => onArm({ size, maxSpeed: speed, visionRadius: vision, aggression })}
      >
        🧬 PLACE CREATURE
      </button>
      <button className={`btn ${predatorArmed ? 'active' : ''}`} style={{ width: '100%', marginTop: 8 }} onClick={onIntroducePredator}>
        🐺 Introduce Predator
      </button>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>
        Max stats everywhere isn't automatically best — energy cost scales with size, speed and vision.
      </div>
    </>
  );
}

function Row2({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>{children}</div>;
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      {label} <span className="value">{value.toFixed(2)}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
