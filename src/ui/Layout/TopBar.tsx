import { useState, useRef, useEffect } from 'react';
import { useSimStore, type SpeedSetting } from '../../state/simStore';

const SPEEDS: SpeedSetting[] = [1, 5, 10, 'max'];

export function TopBar({
  onOpenTree,
  onOpenTimeMachine,
  onOpenExperiment,
  onOpenAbout,
  onOpenCinematic,
  onGodMode,
  onExit,
}: {
  onOpenTree: () => void;
  onOpenTimeMachine: () => void;
  onOpenExperiment: () => void;
  onOpenAbout: () => void;
  onOpenCinematic: () => void;
  onGodMode: () => void;
  onExit: () => void;
}) {
  const speed = useSimStore((s) => s.speed);
  const paused = useSimStore((s) => s.paused);
  const godMode = useSimStore((s) => s.godMode);
  const stats = useSimStore((s) => s.stats);
  const seedDisplay = useSimStore((s) => s.seedDisplay);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const setPaused = useSimStore((s) => s.setPaused);
  const evolutionVision = useSimStore((s) => s.evolutionVision);
  const setEvolutionVision = useSimStore((s) => s.setEvolutionVision);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  return (
    <div className="topbar" style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div
        className="glass scroll-thin topbar-command-deck"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          padding: '10px 18px',
          flex: 1,
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontWeight: 800, letterSpacing: 4, color: 'var(--accent)', fontSize: 17 }}>EVO</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>SEED {seedDisplay}</div>
        </div>

        <Divider />

        <Readout label="Generation" value={stats?.generation ?? 0} />
        <Readout label="Population" value={(stats?.population ?? 0).toLocaleString()} />
        <Readout label="Species" value={stats?.speciesCount ?? 0} />

        <Divider />

        <div className="time-controls" style={{ display: 'flex', gap: 4, padding: 4, flexShrink: 0 }}>
          <button className={`btn pill ${paused ? 'active' : ''}`} onClick={() => setPaused(!paused)} title="Pause / Play">
            {paused ? '▶' : '⏸'}
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`btn pill ${!paused && speed === s ? 'active' : ''}`}
              onClick={() => {
                setSpeed(s);
                setPaused(false);
              }}
            >
              {s === 'max' ? '⚡' : `${s}×`}
            </button>
          ))}
        </div>

        <div style={{ flex: '1 0 12px' }} />
      </div>

      {/* The "more views" menu and its dropdown live outside the scrollable glass bar —
          that bar needs overflow-y: hidden to clip horizontally on narrow viewports
          without spilling vertically, which would otherwise clip this dropdown too. */}
      <div ref={menuRef} className="glass" style={{ position: 'relative', flexShrink: 0, padding: 4 }}>
        <button className={`btn pill ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen((v) => !v)} title="More views">
          ⋯
        </button>
        {menuOpen && (
          <div
            className="hud-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 200,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 30,
            }}
          >
            <MenuItem
              icon="🧬"
              label={evolutionVision ? 'Exit Evolution Vision' : 'Evolution Vision'}
              onClick={() => {
                setEvolutionVision(!evolutionVision);
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon="🌳"
              label="Tree of Life"
              onClick={() => {
                onOpenTree();
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon="⏱"
              label="Time Machine"
              onClick={() => {
                onOpenTimeMachine();
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon="🧪"
              label="Experiments"
              onClick={() => {
                onOpenExperiment();
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon="🎬"
              label="500 Generations Later"
              onClick={() => {
                onOpenCinematic();
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon="ℹ"
              label="About"
              onClick={() => {
                onOpenAbout();
                setMenuOpen(false);
              }}
            />
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <MenuItem icon="✕" label="Exit World" onClick={onExit} danger />
          </div>
        )}
      </div>

      <button
        className={`btn divine godmode-toggle ${godMode ? 'active' : ''}`}
        onClick={onGodMode}
        style={{ padding: '0 22px', fontSize: 13, fontWeight: 700, letterSpacing: 1, flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        ⚡ {godMode ? 'GOD MODE' : 'ENTER GOD MODE'}
      </button>
    </div>
  );
}

function Divider() {
  return <div className="topbar-divider" style={{ width: 1, flexShrink: 0, alignSelf: 'stretch' }} />;
}

function Readout({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="readout" style={{ flexShrink: 0 }}>
      <div className="readout-value">{value}</div>
      <div className="readout-label">{label}</div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={`menu-item ${danger ? 'danger' : ''}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
