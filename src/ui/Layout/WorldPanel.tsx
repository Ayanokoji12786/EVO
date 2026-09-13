import { useState } from 'react';
import { StatsPanel } from '../Dashboard/StatsPanel';
import { EventLogPanel } from '../EventLog/EventLogPanel';
import { useSimStore } from '../../state/simStore';

type Tab = 'overview' | 'history';

export function WorldPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const stats = useSimStore((s) => s.stats);

  if (!open) {
    return (
      <button className="hud-pill" onClick={() => setOpen(true)}>
        🌍 World
        <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)', textTransform: 'none' }}>
          {stats?.population ?? 0} alive
        </span>
      </button>
    );
  }

  return (
    <div className="hud-panel" style={{ width: 340, maxHeight: '60vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <TabButton label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
          <TabButton label="History" active={tab === 'history'} onClick={() => setTab('history')} />
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn pill" onClick={() => setOpen(false)} title="Collapse">
          ▾
        </button>
      </div>
      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'overview' && <StatsPanel embedded />}
        {tab === 'history' && <EventLogPanel embedded />}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-dim)',
        border: 'none',
        borderRadius: 8,
        padding: '5px 12px',
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        fontWeight: active ? 700 : 400,
      }}
    >
      {label}
    </button>
  );
}
