import type { SimulationController } from '../../state/simulationController';
import { useSimStore } from '../../state/simStore';

export function BottomTimeline({ controller, onOpen }: { controller: SimulationController; onOpen: () => void }) {
  const stats = useSimStore((s) => s.stats);
  const snapshots = controller.world.history.snapshots;
  const firstTick = snapshots[0]?.tick ?? 0;
  const currentTick = controller.world.tick;
  const span = Math.max(1, currentTick - firstTick);
  const events = useSimStore((s) => s.events).filter((event) => event.tick >= firstTick);
  const marker = (category: string, message: string) => {
    if (/drought/i.test(message)) return '▲';
    if (/meteor/i.test(message)) return '☄';
    if (category === 'evolutionary') return '🧬';
    if (category === 'extinction' || /extinction/i.test(message)) return '☠';
    if (/plague/i.test(message)) return '☣';
    return '•';
  };

  return (
    <button
      onClick={onOpen}
      className="glass"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '8px 18px',
        width: '100%',
        maxWidth: 520,
        border: 'none',
        cursor: 'pointer',
      }}
      title="Open Time Machine"
    >
        <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          Gen 0
        </span>
        <div style={{ position: 'relative', flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              background: 'linear-gradient(90deg, var(--accent-dim), var(--accent))',
              borderRadius: 2,
              opacity: 0.5,
            }}
          />
          {events.map((event) => (
            <div
              key={event.id}
              title={`${event.message} · Generation ${event.generation}`}
              style={{
                position: 'absolute',
                left: `${Math.min(99, ((event.tick - firstTick) / span) * 100)}%`,
                top: -17,
                color: event.category === 'extinction' ? 'var(--danger)' : 'var(--accent)',
                fontSize: 12,
                textShadow: '0 0 8px currentColor',
                transform: 'translateX(-50%)',
              }}
            >{marker(event.category, event.message)}</div>
          ))}
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: -3,
              width: 10,
              height: 10,
              marginLeft: -5,
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 10px var(--accent-glow)',
            }}
          />
        </div>
        <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          Gen {stats?.generation ?? 0}
        </span>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
        {snapshots.length} snapshots · ⏱
      </span>
    </button>
  );
}
