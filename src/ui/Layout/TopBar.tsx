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
    <header className="sim-topbar">
      <div className="sim-brand-block">
        <strong>EVO</strong>
        <span>SEED {seedDisplay}</span>
      </div>

      <div className="sim-vitals" aria-label="Current world vitals">
        <Readout icon="🌿" label="Generation" value={stats?.generation ?? 0} />
        <Readout icon="👥" label="Population" value={(stats?.population ?? 0).toLocaleString()} />
        <Readout icon="🧬" label="Biodiversity" value={stats?.speciesCount ?? 0} />
      </div>

      <div className="time-controls sim-time-controls" aria-label="Simulation speed">
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

      <div className="sim-topbar-spacer" />

      <div ref={menuRef} className="sim-overflow-menu">
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
        className={`btn divine sim-god-control ${godMode ? 'active' : ''}`}
        onClick={onGodMode}
      >
        <span>⚡</span>{godMode ? 'GOD MODE' : 'GOD MODE'}
      </button>
    </header>
  );
}

function Readout({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="readout" style={{ flexShrink: 0 }}>
      <span className="readout-icon" aria-hidden="true">{icon}</span>
      <div>
        <div className="readout-value">{value}</div>
        <div className="readout-label">{label}</div>
      </div>
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
