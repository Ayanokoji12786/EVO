import { useSimStore, type SpeedSetting } from '../../state/simStore';

const SPEEDS: SpeedSetting[] = [1, 2, 5, 10, 'max'];

export function TopBar({
  onOpenTree,
  onOpenTimeMachine,
  onOpenExperiment,
  onOpenAbout,
  onExit,
}: {
  onOpenTree: () => void;
  onOpenTimeMachine: () => void;
  onOpenExperiment: () => void;
  onOpenAbout: () => void;
  onExit: () => void;
}) {
  const speed = useSimStore((s) => s.speed);
  const paused = useSimStore((s) => s.paused);
  const godMode = useSimStore((s) => s.godMode);
  const stats = useSimStore((s) => s.stats);
  const seedDisplay = useSimStore((s) => s.seedDisplay);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const setPaused = useSimStore((s) => s.setPaused);
  const setGodMode = useSimStore((s) => s.setGodMode);

  return (
    <div
      className="glass"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 16px',
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 800, letterSpacing: 3, color: 'var(--accent)', fontSize: 16 }}>EVO</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>SEED {seedDisplay}</div>
      <div style={{ width: 1, height: 20, background: 'var(--border-strong)' }} />

      <div style={{ display: 'flex', gap: 6 }}>
        <button className={`btn ${paused ? 'active' : ''}`} onClick={() => setPaused(!paused)} title="Pause / Play">
          {paused ? '▶' : '⏸'}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`btn ${!paused && speed === s ? 'active' : ''}`}
            onClick={() => {
              setSpeed(s);
              setPaused(false);
            }}
          >
            {s === 'max' ? '⚡' : `${s}×`}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--border-strong)' }} />

      <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
        <span>POP {stats?.population ?? 0}</span>
        <span>GEN {stats?.generation ?? 0}</span>
        <span>SPECIES {stats?.speciesCount ?? 0}</span>
        <span>TICK {stats?.tick ?? 0}</span>
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn" onClick={onOpenTree}>
        🌳 Tree of Life
      </button>
      <button className="btn" onClick={onOpenTimeMachine}>
        ⏱ Time Machine
      </button>
      <button className="btn" onClick={onOpenExperiment}>
        🧪 Experiments
      </button>
      <button className="btn" onClick={onOpenAbout}>
        ℹ About
      </button>
      <button
        className={`btn ${godMode ? 'divine active' : 'divine'}`}
        onClick={() => setGodMode(!godMode)}
      >
        ⚡ GOD MODE
      </button>
      <button className="btn" onClick={onExit}>
        ✕
      </button>
    </div>
  );
}
