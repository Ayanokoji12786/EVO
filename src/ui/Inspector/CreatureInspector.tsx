import { useState, type ReactNode } from 'react';
import { useSimStore } from '../../state/simStore';
import type { SimulationController } from '../../state/simulationController';

export function CreatureInspector({ controller }: { controller: SimulationController }) {
  const inspector = useSimStore((s) => s.inspector);
  const followId = useSimStore((s) => s.followId);
  const godMode = useSimStore((s) => s.godMode);
  const setXrayGene = useSimStore((s) => s.setXrayGene);
  const [expanded, setExpanded] = useState(true);

  if (!inspector) return null;

  const isFollowing = followId === inspector.id;

  return (
    <div
      className="hud-panel scroll-thin"
      style={{
        width: 300,
        maxHeight: expanded ? 'calc(100vh - 120px)' : undefined,
        overflowY: expanded ? 'auto' : 'visible',
        padding: 16,
        animation: 'hud-slide-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Alien life scan · lock acquired</div>
          <h3 style={{ margin: 0, fontSize: 16, letterSpacing: 1 }}>{inspector.name}</h3>
        </div>
        <button className="btn pill" onClick={() => controller.select(null)}>
          ✕
        </button>
      </div>
      {!inspector.alive && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>
          Died at age {inspector.age}. Cause: {inspector.causeOfDeath}.
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Species: {inspector.speciesName}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '14px 0' }}>
        <MiniStat label="Gen" value={inspector.generation} />
        <MiniStat label="Age" value={`${inspector.age}/${inspector.lifespanCap}`} />
        <MiniStat label="Energy" value={Math.round((inspector.energy / inspector.maxEnergy) * 100) + '%'} />
      </div>

      {inspector.alive && (
        <button
          className={`btn ${isFollowing ? 'active' : ''}`}
          style={{ width: '100%' }}
          onClick={() => controller.follow(isFollowing ? null : inspector.id)}
        >
          {isFollowing ? '◉ Following' : '🎥 Follow Creature'}
        </button>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1,
          padding: '10px 0 4px',
          textAlign: 'center',
        }}
      >
        {expanded ? '▴ Less detail' : '▾ More detail'}
      </button>

      {expanded && (
        <>
          <Section title="Identity">
            <Row label="Parent" value={inspector.parentId ?? '—'} />
            <Row label="Children" value={inspector.offspringCount} />
          </Section>

          <Section title="Life">
            <Row label="Energy" value={`${Math.round(inspector.energy)} / ${Math.round(inspector.maxEnergy)}`} />
            <Row label="Food eaten" value={inspector.foodEaten} />
            <Row label="Distance travelled" value={inspector.distanceTravelled} />
            <Row label="Kills / Escapes" value={`${inspector.kills} / ${inspector.escapes}`} />
          </Section>

          <Section title="Genome · hover for X-ray">
            {['maxSpeed', 'visionRadius', 'metabolism', 'aggression', 'tempToleranceRange', 'size', 'energyStorage', 'camouflage', 'diet', 'wingDevelopment'].filter((key) => inspector.traits[key] !== undefined).map((key) => (
              <GenomeBar key={key} label={key} value={inspector.traits[key]} mutated={inspector.mutatedFromParent.includes(key)} onHover={setXrayGene} />
            ))}
          </Section>

          {inspector.ancestryChain.length > 0 && (
            <Section title="Ancestry">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 11 }}>
                {inspector.ancestryChain.map((c, i) => (
                  <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: c.id === inspector.id ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)',
                        color: c.id === inspector.id ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      {c.name}
                    </span>
                    {i < inspector.ancestryChain.length - 1 && <span style={{ color: 'var(--text-dim)' }}>→</span>}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {godMode && inspector.alive && (
            <Section title="Hand of God">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button className="btn divine" onClick={() => controller.god.bless(controller.world, inspector.id)}>
                  ✨ Bless
                </button>
                <button className="btn danger" onClick={() => controller.god.smite(controller.world, inspector.id)}>
                  ⚡ Smite
                </button>
                <button className="btn divine" onClick={() => controller.god.forceMutate(controller.world, inspector.id)}>
                  🧬 Mutate
                </button>
                <button className="btn divine" onClick={() => controller.god.makeImmortal(controller.world, inspector.id)}>
                  ♾️ Immortal
                </button>
                <button className="btn divine" onClick={() => controller.god.cloneCreature(controller.world, inspector.id)}>
                  👥 Clone
                </button>
                <button className="btn divine" onClick={() => controller.god.protectLineage(controller.world, inspector.id)}>
                  🛡️ Protect Lineage
                </button>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

const GENOME_RANGE: Record<string, [number, number]> = { maxSpeed: [.3, 3.2], visionRadius: [20, 260], metabolism: [.5, 2.6], aggression: [0, 1], tempToleranceRange: [.15, 1.4], size: [.4, 2.2], energyStorage: [.5, 1.8], camouflage: [0, 1], diet: [0, 1], wingDevelopment: [0, 1] };
function GenomeBar({ label, value, mutated, onHover }: { label: string; value: number; mutated: boolean; onHover: (gene: string | null) => void }) {
  const [min, max] = GENOME_RANGE[label] ?? [0, 1]; const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return <div className="genome-bar" onMouseEnter={() => onHover(label)} onMouseLeave={() => onHover(null)}><span>{label.replace(/([A-Z])/g, ' $1')}</span><div><i style={{ width: `${fraction * 100}%` }} /></div><b>{value.toFixed(2)}</b>{mutated && <em>▲</em>}</div>;
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', color: highlight ? 'var(--accent)' : 'var(--text)' }}>
        {value}
        {highlight ? ' •' : ''}
      </span>
    </div>
  );
}
