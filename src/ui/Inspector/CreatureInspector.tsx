import type { ReactNode } from 'react';
import { useSimStore } from '../../state/simStore';
import type { SimulationController } from '../../state/simulationController';

export function CreatureInspector({ controller }: { controller: SimulationController }) {
  const inspector = useSimStore((s) => s.inspector);
  const followId = useSimStore((s) => s.followId);
  const godMode = useSimStore((s) => s.godMode);

  if (!inspector) return null;

  const isFollowing = followId === inspector.id;

  return (
    <div
      className="glass scroll-thin"
      style={{ position: 'absolute', top: 76, right: 12, width: 300, maxHeight: 'calc(100% - 100px)', overflowY: 'auto', padding: 16, zIndex: 10 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{inspector.name}</h3>
        <button className="btn" style={{ padding: '2px 8px' }} onClick={() => controller.select(null)}>
          ✕
        </button>
      </div>
      {!inspector.alive && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
          {inspector.name} died at age {inspector.age}. Cause: {inspector.causeOfDeath}.
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{inspector.speciesName}</div>

      <Section title="Identity">
        <Row label="Generation" value={inspector.generation} />
        <Row label="Age" value={`${inspector.age} / ${inspector.lifespanCap}`} />
        <Row label="Parent" value={inspector.parentId ?? '—'} />
        <Row label="Children" value={inspector.offspringCount} />
      </Section>

      <Section title="Life">
        <Row label="Energy" value={`${Math.round(inspector.energy)} / ${Math.round(inspector.maxEnergy)}`} />
        <Row label="Food eaten" value={inspector.foodEaten} />
        <Row label="Distance travelled" value={inspector.distanceTravelled} />
        <Row label="Kills / Escapes" value={`${inspector.kills} / ${inspector.escapes}`} />
      </Section>

      <Section title="Genome">
        {Object.entries(inspector.traits).map(([key, value]) => (
          <Row
            key={key}
            label={key}
            value={typeof value === 'number' ? value.toFixed(key === 'colorHue' || key === 'visionRadius' || key === 'fieldOfView' ? 0 : 3) : String(value)}
            highlight={inspector.mutatedFromParent.includes(key)}
          />
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

      {inspector.alive && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          <button
            className={`btn ${isFollowing ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => controller.follow(isFollowing ? null : inspector.id)}
          >
            {isFollowing ? '◉ Following' : '🎥 FOLLOW CREATURE'}
          </button>
        </div>
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
