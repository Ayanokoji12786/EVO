import { useSimStore } from '../../state/simStore';
import type { EventCategory } from '../../simulation/types';

const ICONS: Record<EventCategory, string> = {
  natural: '🌿',
  divine: '⚡',
  evolutionary: '🧬',
  extinction: '☠️',
  environmental: '🌎',
};

export function EventLogPanel() {
  const events = useSimStore((s) => s.events);
  const recent = events.slice(-60).reverse();

  return (
    <div className="glass scroll-thin" style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 13, letterSpacing: 1, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        Natural History
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recent.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>Nothing notable has happened yet.</div>}
        {recent.map((e) => (
          <div key={e.id} style={{ fontSize: 12, display: 'flex', gap: 8, lineHeight: 1.4 }}>
            <span>{ICONS[e.category]}</span>
            <span style={{ color: e.category === 'divine' ? 'var(--divine)' : 'var(--text)' }}>{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
