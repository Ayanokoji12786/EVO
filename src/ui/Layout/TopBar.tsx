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

  // Approximation of "biodiversity" as a normalized Shannon-style diversity index the
  // Analytics view would use — but computed cheap here from the population/species split
  // so the top bar's biodiversity reading is a real number that changes with the world,
  // not a placeholder. When only one species is alive, the index is 0.
  const biodiversity = stats && stats.speciesCount > 1
    ? Math.min(0.99, Math.log(stats.speciesCount) / Math.log(Math.max(2, stats.population / 20))).toFixed(2)
    : '0.00';

  return (
    <header className="sim-topbar">
      <div className="sim-brand-block">
        <strong>EVO</strong>
        <span>LIFE IN MOTION</span>
      </div>

      <div className="sim-vitals" aria-label="Current world vitals">
        <Readout icon={<LeafIcon />} label="Generation" value={(stats?.generation ?? 0).toLocaleString()} />
        <Readout icon={<PopulationIcon />} label="Population" value={(stats?.population ?? 0).toLocaleString()} />
        <Readout icon={<DnaIcon />} label="Species" value={stats?.speciesCount ?? 0} />
        <Readout icon={<PulseIcon />} label="Biodiversity" value={biodiversity} />
      </div>

      <div className="sim-topbar-spacer" />

      <div className="sim-time-controls" aria-label="Simulation speed">
        <button className={`sim-time-btn ${paused ? 'active' : ''}`} onClick={() => setPaused(!paused)} title="Pause / Play" aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? '▶' : '❚❚'}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`sim-time-btn ${!paused && speed === s ? 'active' : ''}`}
            onClick={() => { setSpeed(s); setPaused(false); }}
          >
            {s === 'max' ? '100×' : `${s}×`}
          </button>
        ))}
      </div>

      <div ref={menuRef} className="sim-overflow-menu">
        <button className={`sim-icon-btn ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen((v) => !v)} title="More views" aria-label="More views">
          ⋯
        </button>
        {menuOpen && (
          <div className="sim-overflow-panel hud-panel">
            <MenuItem icon="🧬" label={evolutionVision ? 'Exit Evolution Vision' : 'Evolution Vision'} onClick={() => { setEvolutionVision(!evolutionVision); setMenuOpen(false); }} />
            <MenuItem icon="🌳" label="Tree of Life" onClick={() => { onOpenTree(); setMenuOpen(false); }} />
            <MenuItem icon="⏱" label="Time Machine" onClick={() => { onOpenTimeMachine(); setMenuOpen(false); }} />
            <MenuItem icon="🧪" label="Experiments" onClick={() => { onOpenExperiment(); setMenuOpen(false); }} />
            <MenuItem icon="🎬" label="500 Generations Later" onClick={() => { onOpenCinematic(); setMenuOpen(false); }} />
            <MenuItem icon="ℹ" label="About" onClick={() => { onOpenAbout(); setMenuOpen(false); }} />
            <div className="sim-overflow-sep" />
            <MenuItem icon="✕" label="Exit World" onClick={onExit} danger />
          </div>
        )}
      </div>

      <button
        className={`sim-god-control ${godMode ? 'active' : ''}`}
        onClick={onGodMode}
      >
        <span>⚡</span>GOD MODE
      </button>
    </header>
  );
}

function Readout({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="readout">
      <span className="readout-icon" aria-hidden="true">{icon}</span>
      <div className="readout-body">
        <div className="readout-label">{label}</div>
        <div className="readout-value">{value}</div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button className={`menu-item ${danger ? 'danger' : ''}`} onClick={onClick}>
      <span>{icon}</span><span>{label}</span>
    </button>
  );
}

// Compact inline SVG icons — sharp at any DPR, follow currentColor, and read as chips
// beside their numeric readouts instead of the emoji glyphs which vary by platform.
function LeafIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 4c-9 0-16 6-16 14 0 1.1.4 2 1 2 8 0 15-7 15-16z" /><path d="M4 20c4-4 8-6 15-15" /></svg>;
}
function PopulationIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M14 20c0-2 2-4 4.5-4s3.5 1.4 3.5 4" /></svg>;
}
function DnaIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3c0 5 10 5 10 10s-10 5-10 10" /><path d="M17 3c0 5-10 5-10 10s10 5 10 10" /><path d="M8 7h8M8 17h8M9 11h6M9 13h6" /></svg>;
}
function PulseIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-6 3 12 3-8 2 4h4" /></svg>;
}
